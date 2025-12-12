import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { findDriverByEmail } from '../utils/syncPilotosFromSheet';

function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('login'); // 'login', 'verifying_email', 'input_whatsapp', 'success', 'inscricao_manual'
    const [user, setUser] = useState(null);
    const [sheetData, setSheetData] = useState(null);
    const [whatsappInput, setWhatsappInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showWhatsAppError, setShowWhatsAppError] = useState(false);
    const [whatsappAttempts, setWhatsappAttempts] = useState(0);
    const [inscricaoEnviada, setInscricaoEnviada] = useState(false);
    const [inscricaoData, setInscricaoData] = useState({
        email: '',
        nome: '',
        gamertag: '',
        whatsapp: '',
        plataforma: 'Xbox',
        grid: 'Carreira',
        nomePiloto: ''
    });

    // 1. Verificar se já existe sessão ao carregar
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                // Se há sessão ativa, verificar se o piloto já está validado no banco
                const { data: pilotoExistente, error: pilotoError } = await supabase
                    .from('pilotos')
                    .select('*')
                    .eq('email', session.user.email.toLowerCase())
                    .single();
                
                if (pilotoExistente && pilotoExistente.whatsapp) {
                    // Piloto já validado e com sessão ativa (não fez logout), redirecionar direto
                    // Não precisa pedir WhatsApp novamente se já está logado
                    console.log('✅ Piloto já validado com sessão ativa. Redirecionando para dashboard...');
                    navigate('/dashboard');
                    return;
                }
                
                // Piloto não validado ainda ou sem WhatsApp, verificar na planilha e pedir confirmação
                checkDriverRegistration(session.user.email);
            }
        };
        checkSession();

        // Listener para mudanças de auth (login do Google)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Login - Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão');
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('✅ Login - Usuário autenticado (pode ser após logout):', session.user.email);
                setUser(session.user);
                // Aguardar um pouco para garantir que a sessão está persistida
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Quando o piloto faz login (incluindo após logout), SEMPRE verificar na planilha
                // e pedir confirmação do WhatsApp para garantir que é ele mesmo
                // Isso garante segurança mesmo que o WhatsApp já esteja no banco
                console.log('🔍 Verificando na planilha e pedindo confirmação do WhatsApp...');
                checkDriverRegistration(session.user.email);
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                console.log('🔄 Login - Token atualizado:', session.user.email);
                setUser(session.user);
                // Em refresh de token (não é novo login, apenas renovação), verificar se já está validado
                const { data: pilotoExistente } = await supabase
                    .from('pilotos')
                    .select('*')
                    .eq('email', session.user.email.toLowerCase())
                    .single();
                
                if (pilotoExistente && pilotoExistente.whatsapp) {
                    // Só redirecionar se já validou WhatsApp anteriormente (não é novo login)
                    navigate('/dashboard');
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 Login - Usuário deslogado');
                setUser(null);
                setStep('login');
                // Limpar estados ao fazer logout
                setSheetData(null);
                setWhatsappInput('');
                setErrorMsg('');
                setShowWhatsAppError(false);
                setWhatsappAttempts(0);
            }
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    // 2. Login com Google - FORÇAR SELEÇÃO DE CONTA
    const handleGoogleLogin = async () => {
        setLoading(true);
        setErrorMsg('');
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/login`,
                queryParams: {
                    prompt: 'select_account' // Força o Google a mostrar seletor de conta
                }
            }
        });
        
        if (error) {
            setErrorMsg('Erro ao conectar com Google: ' + error.message);
            setLoading(false);
        }
    };

    // Logout e tentar novamente
    const handleLogout = async () => {
        try {
            // 1. Fazer logout no Supabase
            await supabase.auth.signOut();
            
            // 2. Limpar todos os estados
            setUser(null);
            setSheetData(null);
            setWhatsappInput('');
            setErrorMsg('');
            setStep('login');
            setLoading(false);
            
            // 3. Limpar cache do Google OAuth (forçar nova seleção de conta)
            // Isso faz com que o Google peça para escolher a conta novamente
            console.log('🚪 Logout realizado. Por favor, selecione outra conta do Google ao fazer login novamente.');
            
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setErrorMsg('Erro ao deslogar. Tente recarregar a página.');
        }
    };

    // 3. Verificar se o email está na planilha
    const checkDriverRegistration = async (email) => {
        setStep('verifying_email');
        setErrorMsg('');
        
        // SEMPRE buscar na planilha e pedir confirmação do WhatsApp
        // Isso garante que o piloto sempre confirme sua identidade
        console.log('🔍 Buscando piloto na planilha CADASTRO MLF1...');
        const result = await findDriverByEmail(email);

        if (result.found) {
            setSheetData(result);
            setStep('input_whatsapp');
        } else {
            // Se não encontrou, abrir formulário de inscrição manual para admin verificar
            setStep('inscricao_manual');
            setInscricaoData(prev => ({ ...prev, email: email }));
            setErrorMsg(`❌ E-mail não encontrado na planilha CADASTRO MLF1.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.`);
        }
    };

    // 4. Validar WhatsApp
    const handleVerifyWhatsApp = async () => {
        if (!whatsappInput || !sheetData) {
            setErrorMsg('Digite o número do WhatsApp');
            return;
        }

        const cleanInput = whatsappInput.replace(/\D/g, '');
        const cleanExpected = sheetData.whatsappEsperado.replace(/\D/g, '');

        console.log('📱 Comparando WhatsApp:');
        console.log('   Digitado:', cleanInput);
        console.log('   Esperado:', cleanExpected);

        const lastDigitsInput = cleanInput.slice(-9);
        const lastDigitsExpected = cleanExpected.slice(-9);

        if (cleanInput === cleanExpected || lastDigitsInput === lastDigitsExpected) {
            console.log('✅ WhatsApp validado com sucesso!');
            // Resetar tentativas ao validar com sucesso
            setWhatsappAttempts(0);
            setShowWhatsAppError(false);
            setStep('success');
            
            try {
                console.log('💾 Salvando piloto no banco...');

                const pilotoData = {
                    email: sheetData.email,
                    nome: sheetData.nome,
                    whatsapp: sheetData.whatsappEsperado,
                    grid: sheetData.grid || 'carreira',
                    equipe: null,
                    is_steward: false
                    // Removido 'status', 'gamertag' e 'plataforma' pois não existem na tabela pilotos
                };

                console.log('📋 Dados a inserir:', pilotoData);

                const { data, error } = await supabase
                    .from('pilotos')
                    .upsert(pilotoData, { 
                        onConflict: 'email',
                        ignoreDuplicates: false
                    })
                    .select();

                if (error) {
                    console.error('❌ Erro do Supabase:', error);
                    setErrorMsg(`Erro ao salvar dados: ${error.message}`);
                    setStep('input_whatsapp');
                    return;
                }

                console.log('✅ Piloto salvo com sucesso!', data);
                
                // Verificar se a sessão está ativa antes de redirecionar
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession) {
                    console.warn('⚠️ Sessão não encontrada após salvar piloto. Aguardando...');
                    // Aguardar um pouco e verificar novamente
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (!retrySession) {
                        console.error('❌ Sessão ainda não encontrada. Redirecionando para login...');
                        setErrorMsg('Erro ao manter sessão. Por favor, faça login novamente.');
                        setStep('login');
                        return;
                    }
                }
                
                console.log('✅ Sessão confirmada. Redirecionando para /dashboard...');
                // Não marcar como inscrição enviada, é login bem-sucedido
                setInscricaoEnviada(false);
                // Redirecionar imediatamente já que a sessão está confirmada
                navigate('/dashboard');
                
            } catch (err) {
                console.error('❌ Erro inesperado:', err);
                setErrorMsg(`Erro ao salvar dados: ${err.message}`);
                setStep('input_whatsapp');
            }
        } else {
            console.log('❌ WhatsApp não confere');
            // Incrementar contador de tentativas
            const newAttempts = whatsappAttempts + 1;
            setWhatsappAttempts(newAttempts);
            
            // Se já tentou 3 vezes, oferecer reenviar inscrição
            if (newAttempts >= 3) {
                setShowWhatsAppError(false);
                setStep('inscricao_manual');
                setInscricaoData(prev => ({ 
                    ...prev, 
                    email: sheetData.email,
                    nome: sheetData.nomeCadastrado || '',
                    nomePiloto: sheetData.nome || '',
                    whatsapp: whatsappInput
                }));
                setErrorMsg('❌ Após várias tentativas, o número informado não confere com o cadastro na planilha.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
            } else {
                // Mostrar popup de erro e permitir tentar novamente
                setShowWhatsAppError(true);
                setWhatsappInput(''); // Limpar campo para nova tentativa
            }
        }
    };

    // Função para tentar novamente o WhatsApp
    const handleRetryWhatsApp = () => {
        setShowWhatsAppError(false);
        setWhatsappInput('');
        setErrorMsg('');
        // Não resetar o contador de tentativas aqui, apenas quando validar com sucesso
    };

    // Formatar WhatsApp automaticamente enquanto digita
    const formatWhatsApp = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    };

    const handleWhatsAppChange = (e) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsappInput(formatted);
        setErrorMsg(''); // Limpa erro ao digitar
    };

    // 5. Enviar formulário de inscrição manual
    const handleSubmitInscricao = async () => {
        if (!inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) {
            setErrorMsg('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            // Salvar no banco para admin verificar
            const { data, error } = await supabase
                .from('pilotos')
                .upsert({
                    email: user?.email || inscricaoData.email,
                    nome: inscricaoData.nomePiloto || inscricaoData.nome,
                    whatsapp: inscricaoData.whatsapp.replace(/\D/g, ''),
                    grid: inscricaoData.grid.toLowerCase(),
                    is_steward: false,
                    equipe: null
                    // Removido 'status', 'nome_completo', 'gamertag' e 'plataforma' pois não existem na tabela pilotos
                }, {
                    onConflict: 'email',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Erro ao salvar inscrição:', error);
                setErrorMsg(`Erro ao enviar inscrição: ${error.message}`);
                setLoading(false);
                return;
            }

            setErrorMsg('');
            setInscricaoEnviada(true);
            setStep('success');
            
            // Não redirecionar, mostrar mensagem de sucesso

        } catch (err) {
            console.error('Erro inesperado:', err);
            setErrorMsg(`Erro ao enviar inscrição: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div style={{ 
                background: 'rgba(15, 23, 42, 0.95)', 
                padding: '50px 40px', 
                borderRadius: '20px', 
                border: '1px solid rgba(6, 182, 212, 0.3)',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
                {/* Logo/Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏎️</div>
                    <h1 style={{ 
                        color: 'white', 
                        fontSize: '2.2rem', 
                        marginBottom: '8px', 
                        fontWeight: '900', 
                        fontStyle: 'italic',
                        background: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        PAINEL DO PILOTO
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>Master League F1</p>
                </div>

                {/* Mensagens de Erro com Botão de Logout */}
                {errorMsg && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#FCA5A5', 
                        padding: '15px', 
                        borderRadius: '10px', 
                        marginBottom: '25px', 
                        fontSize: '0.9rem',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        textAlign: 'left',
                        whiteSpace: 'pre-line'
                    }}>
                        {errorMsg}
                        
                        {/* Botão para tentar com outro e-mail */}
                        {user && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    marginTop: '15px',
                                    padding: '10px',
                                    background: 'transparent',
                                    color: '#FCA5A5',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.target.style.borderColor = '#EF4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.borderColor = '#FCA5A5';
                                }}
                            >
                                🔄 Tentar com outro e-mail
                            </button>
                        )}
                        
                        {/* Informações de ajuda */}
                        <div style={{ 
                            marginTop: '15px', 
                            padding: '10px', 
                            background: 'rgba(0,0,0,0.2)', 
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#CBD5E1'
                        }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>💡 Dica:</p>
                            <p style={{ margin: 0 }}>
                                Certifique-se de usar o <strong>mesmo e-mail</strong> que você cadastrou na planilha de inscrição da liga.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP: Login com Google */}
                {step === 'login' && (
                    <div>
                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '0.95rem' }}>
                            Faça login com o <strong style={{ color: '#06B6D4' }}>e-mail cadastrado</strong> na inscrição da liga.
                        </p>
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'white',
                                color: '#0F172A',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                transition: 'all 0.3s',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '24px' }} />
                            {loading ? 'Conectando...' : 'Entrar com Google'}
                        </button>
                    </div>
                )}

                {/* STEP: Verificando Email */}
                {step === 'verifying_email' && (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            border: '4px solid rgba(6, 182, 212, 0.3)',
                            borderTop: '4px solid #06B6D4',
                            borderRadius: '50%',
                            margin: '0 auto 20px',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ color: '#06B6D4', fontSize: '1.1rem', fontWeight: 'bold' }}>🔍 Verificando inscrição...</p>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '10px' }}>Consultando base de dados</p>
                    </div>
                )}

                {/* STEP: Input WhatsApp */}
                {step === 'input_whatsapp' && (
                    <div>
                        {/* Info do Piloto */}
                        <div style={{ 
                            marginBottom: '25px', 
                            padding: '20px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(6, 182, 212, 0.3)'
                        }}>
                            <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Piloto Identificado
                            </p>
                            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '900' }}>
                                {sheetData?.nome}
                            </h3>
                            <p style={{ color: '#06B6D4', fontSize: '0.85rem', margin: 0 }}>
                                {sheetData?.email}
                            </p>
                            <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '8px' }}>
                                {sheetData?.grid === 'carreira' ? '🏆 Grid Carreira' : '💡 Grid Light'} • {sheetData?.plataforma}
                            </p>
                        </div>

                        <p style={{ color: '#E2E8F0', marginBottom: '20px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Para confirmar sua identidade, informe o <strong style={{ color: '#06B6D4' }}>WhatsApp cadastrado</strong>:
                        </p>

                        <input
                            type="tel"
                            value={whatsappInput}
                            onChange={handleWhatsAppChange}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1.15rem',
                                textAlign: 'center',
                                marginBottom: '20px',
                                outline: 'none',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                transition: 'all 0.3s',
                                boxSizing: 'border-box'
                            }}
                        />

                        <button
                            onClick={handleVerifyWhatsApp}
                            disabled={whatsappInput.length < 14}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: whatsappInput.length >= 14 
                                    ? 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)' 
                                    : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: whatsappInput.length >= 14 ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                                opacity: whatsappInput.length >= 14 ? 1 : 0.5
                            }}
                        >
                            ✅ Confirmar Acesso
                        </button>
                    </div>
                )}

                {/* STEP: Formulário de Inscrição Manual */}
                {step === 'inscricao_manual' && (
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#FBBF24', fontWeight: '900' }}>
                            📝 Formulário de Inscrição
                        </h2>
                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Preencha os dados abaixo para que a administração possa verificar suas informações e liberar seu acesso.
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                E-mail (já preenchido)
                            </label>
                            <input
                                type="email"
                                value={user?.email || inscricaoData.email || ''}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#94A3B8',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.nome}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, nome: e.target.value })}
                                placeholder="Seu nome completo"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Nome do Piloto *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.nomePiloto}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, nomePiloto: e.target.value })}
                                placeholder="Nome que aparece nas transmissões"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                Gamertag/ID *
                            </label>
                            <input
                                type="text"
                                value={inscricaoData.gamertag}
                                onChange={(e) => setInscricaoData({ ...inscricaoData, gamertag: e.target.value })}
                                placeholder="Seu gamertag no jogo"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                WhatsApp *
                            </label>
                            <input
                                type="tel"
                                value={inscricaoData.whatsapp}
                                onChange={(e) => {
                                    const formatted = formatWhatsApp(e.target.value);
                                    setInscricaoData({ ...inscricaoData, whatsapp: formatted });
                                }}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Plataforma *
                                </label>
                                <select
                                    value={inscricaoData.plataforma}
                                    onChange={(e) => setInscricaoData({ ...inscricaoData, plataforma: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '2px solid rgba(6, 182, 212, 0.3)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Xbox" style={{ background: '#1E293B' }}>Xbox</option>
                                    <option value="PlayStation" style={{ background: '#1E293B' }}>PlayStation</option>
                                    <option value="PC" style={{ background: '#1E293B' }}>PC</option>
                                </select>
                            </div>

                            <div style={{ textAlign: 'left' }}>
                                <label style={{ display: 'block', color: '#E2E8F0', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Grid *
                                </label>
                                <select
                                    value={inscricaoData.grid}
                                    onChange={(e) => setInscricaoData({ ...inscricaoData, grid: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '2px solid rgba(6, 182, 212, 0.3)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Carreira" style={{ background: '#1E293B' }}>Carreira</option>
                                    <option value="Light" style={{ background: '#1E293B' }}>Light</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitInscricao}
                            disabled={loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp)
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '1.05rem',
                                cursor: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                opacity: (loading || !inscricaoData.nome || !inscricaoData.gamertag || !inscricaoData.nomePiloto || !inscricaoData.whatsapp) ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Enviando...' : '📤 Enviar para Verificação'}
                        </button>

                        <p style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '15px', textAlign: 'center' }}>
                            * Campos obrigatórios. A administração verificará suas informações e liberará seu acesso.
                        </p>
                    </div>
                )}

                {/* STEP: Success */}
                {step === 'success' && (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '3rem'
                        }}>
                            ✅
                        </div>
                        <h2 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', color: '#22C55E', fontWeight: '900' }}>
                            {inscricaoEnviada ? 'Inscrição Enviada!' : 'Acesso Liberado!'}
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
                            {inscricaoEnviada 
                                ? 'Sua solicitação foi enviada com sucesso! A administração irá analisar suas informações e retornar em breve. Você receberá uma notificação quando seu acesso for liberado.'
                                : 'Redirecionando para o painel...'}
                        </p>
                        {inscricaoEnviada && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    marginTop: '25px',
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    color: '#94A3B8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.05)';
                                    e.target.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = '#94A3B8';
                                }}
                            >
                                Voltar ao Login
                            </button>
                        )}
                    </div>
                )}

                {/* Rodapé */}
                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>
                        🔒 Sistema de autenticação segura
                    </p>
                </div>
            </div>

            {/* Animations CSS */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* POPUP: Erro WhatsApp - Fora do container principal */}
            {showWhatsAppError && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setShowWhatsAppError(false)}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.98)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '450px',
                        width: '100%',
                        border: '2px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '3rem'
                        }}>
                            ❌
                        </div>
                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 15px 0', color: '#EF4444', fontWeight: '900', textAlign: 'center' }}>
                            WhatsApp Incorreto
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', textAlign: 'center' }}>
                            O número informado não confere com o cadastro na planilha.
                            {whatsappAttempts < 3 && (
                                <><br/><br/><strong style={{color: '#E2E8F0'}}>Tentativa {whatsappAttempts} de 3</strong></>
                            )}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            {whatsappAttempts < 3 ? (
                                <>
                                    <button
                                        onClick={handleRetryWhatsApp}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            fontSize: '1.05rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        🔄 Tentar Novamente
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowWhatsAppError(false);
                                            setStep('inscricao_manual');
                                            setInscricaoData(prev => ({ 
                                                ...prev, 
                                                email: sheetData?.email || user?.email || '',
                                                nome: sheetData?.nomeCadastrado || '',
                                                nomePiloto: sheetData?.nome || '',
                                                whatsapp: whatsappInput
                                            }));
                                            setErrorMsg('❌ O número informado não confere com o cadastro na planilha.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'transparent',
                                            color: '#94A3B8',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.05)';
                                            e.target.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'transparent';
                                            e.target.style.color = '#94A3B8';
                                        }}
                                    >
                                        Ou reenviar inscrição agora
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setShowWhatsAppError(false);
                                        setStep('inscricao_manual');
                                        setInscricaoData(prev => ({ 
                                            ...prev, 
                                            email: sheetData?.email || user?.email || '',
                                            nome: sheetData?.nomeCadastrado || '',
                                            nomePiloto: sheetData?.nome || '',
                                            whatsapp: whatsappInput
                                        }));
                                        setErrorMsg('❌ Após várias tentativas, o número informado não confere com o cadastro na planilha.\n\nPreencha o formulário abaixo para que a administração possa verificar suas informações.');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '1.05rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    📝 Reenviar Inscrição
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;