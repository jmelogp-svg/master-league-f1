import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { findDriverByEmail } from '../utils/syncPilotosFromSheet';

function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('login'); // 'login', 'verifying_email', 'input_whatsapp', 'success'
    const [user, setUser] = useState(null);
    const [sheetData, setSheetData] = useState(null);
    const [whatsappInput, setWhatsappInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // 1. Verificar se já existe sessão ao carregar
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                checkDriverRegistration(session.user.email);
            }
        };
        checkSession();

        // Listener para mudanças de auth (login do Google)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                checkDriverRegistration(session.user.email);
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
        
        // Primeiro verifica se já está validado no banco (TABELA PILOTOS)
        const { data: existingDriver } = await supabase
            .from('pilotos')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .single();

        if (existingDriver?.whatsapp && existingDriver?.nome) {
            console.log('✅ Piloto já validado anteriormente');
            navigate('/dashboard');
            return;
        }

        // Se não, busca na planilha
        console.log('🔍 Buscando piloto na planilha...');
        const result = await findDriverByEmail(email);

        if (result.found) {
            setSheetData(result);
            setStep('input_whatsapp');
        } else {
            setStep('login');
            setErrorMsg(`❌ E-mail não encontrado na lista de inscritos.\n\nUse o mesmo e-mail cadastrado na planilha de inscrição.\n\nErro: ${result.error || 'Não autorizado'}`);
            await supabase.auth.signOut();
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
            setStep('success');
            
            try {
                console.log('💾 Salvando piloto no banco...');

                const pilotoData = {
                    email: sheetData.email,
                    nome: sheetData.nome,
                    whatsapp: sheetData.whatsappEsperado,
                    gamertag: sheetData.gamertag || null,
                    plataforma: sheetData.plataforma || 'Xbox',
                    grid: sheetData.grid || 'carreira',
                    equipe: null,
                    is_steward: false,
                    status: 'active' // IMPORTANTE: garantir que status seja 'active'
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
                console.log('🔀 Redirecionando para /dashboard...');
                
                setTimeout(() => navigate('/dashboard'), 1500);
                
            } catch (err) {
                console.error('❌ Erro inesperado:', err);
                setErrorMsg(`Erro ao salvar dados: ${err.message}`);
                setStep('input_whatsapp');
            }
        } else {
            console.log('❌ WhatsApp não confere');
            setErrorMsg('❌ O número informado não confere com o cadastro na planilha.\n\nVerifique se digitou corretamente o número cadastrado.');
        }
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
                            Acesso Liberado!
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>Redirecionando para o painel...</p>
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
        </div>
    );
}

export default Login;