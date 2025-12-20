// ADIADO - Sistema de narrador - Todo o código abaixo está comentado temporariamente
/*
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { requestVerificationCode, verifyCode } from '../utils/whatsappAuth';
import { usePilotosData } from '../hooks/useAnalises';
import Dashboard from './Dashboard';
import '../index.css';

function Narrador() {
    console.log('🚀 Componente Narrador montado');
    
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pilotoSelecionado, setPilotoSelecionado] = useState(null);
    const [pilotosList, setPilotosList] = useState([]);
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroEquipe, setFiltroEquipe] = useState('');
    const [filtroGrid, setFiltroGrid] = useState('');
    
    // Estados para Bio do Piloto
    const [viewMode, setViewMode] = useState('lista'); // 'lista' ou 'bio'
    const [pilotoBioSelecionado, setPilotoBioSelecionado] = useState(null);
    const [filtroBioAtivo, setFiltroBioAtivo] = useState(''); // '', 'ativo', 'inativo'
    const [filtroBioGrid, setFiltroBioGrid] = useState(''); // '', 'carreira', 'light'
    
    // Estados para primeiro acesso
    const [isPrimeiroAcesso, setIsPrimeiroAcesso] = useState(false);
    const [narradorData, setNarradorData] = useState(null);
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [codigoVerificacao, setCodigoVerificacao] = useState('');
    const [enviandoCodigo, setEnviandoCodigo] = useState(false);
    const [verificandoCodigo, setVerificandoCodigo] = useState(false);
    const [step, setStep] = useState('login'); // 'login', 'criar_senha', 'verificar_codigo'

    // Verificar se já está autenticado (login permanente até logout)
    useEffect(() => {
        const checkAuth = () => {
            const savedAuth = localStorage.getItem('ml_narrador_auth');
            const savedEmail = localStorage.getItem('ml_narrador_email');
            console.log('🔐 Verificando autenticação:', { savedAuth, savedEmail });
            if (savedAuth === 'true' && savedEmail) {
                console.log('✅ Narrador autenticado via localStorage');
                setIsAuthenticated(true);
                setEmail(savedEmail);
            } else {
                console.log('❌ Narrador não autenticado');
            }
        };
        checkAuth();
    }, []);

    // Buscar todos os pilotos da planilha Google Sheets (fonte completa)
    const { pilotos: pilotosPlanilha, loading: loadingPlanilha, error: errorPlanilha } = usePilotosData();

    // Sincronizar pilotos da planilha com a lista
    useEffect(() => {
        console.log('🔄 usePilotosData - Estado:', { 
            loading: loadingPlanilha, 
            count: pilotosPlanilha?.length || 0, 
            error: errorPlanilha 
        });

        if (pilotosPlanilha && pilotosPlanilha.length > 0) {
            console.log('📋 Processando', pilotosPlanilha.length, 'pilotos da planilha');
            
            // Converter dados da planilha para o formato esperado
            const pilotosFormatados = pilotosPlanilha.map((piloto, index) => ({
                id: piloto.email || `planilha-${index}`, // Usar email como ID se não tiver
                nome: piloto.nome || piloto.nomeCadastrado || 'Sem Nome',
                email: piloto.email || '',
                equipe: null, // Será buscado do Supabase se existir
                grid: piloto.grid || 'carreira',
                tipo_piloto: null, // Será determinado depois
                status: null,
                whatsapp: piloto.whatsapp || '',
                gamertag: piloto.gamertag || '',
                plataforma: piloto.plataforma || ''
            }));

            console.log('✅ Pilotos formatados:', pilotosFormatados.length);

            // Buscar dados adicionais do Supabase (equipe, status, etc.) e mesclar
            const carregarDadosAdicionais = async () => {
                try {
                    const emails = pilotosFormatados.map(p => p.email).filter(Boolean);
                    console.log('🔍 Buscando dados adicionais do Supabase para', emails.length, 'emails');
                    
                    const { data: pilotosSupabase, error: supabaseError } = await supabase
                        .from('pilotos')
                        .select('email, equipe, tipo_piloto, status')
                        .in('email', emails);

                    if (supabaseError) {
                        console.warn('⚠️ Erro ao buscar do Supabase (continuando com dados da planilha):', supabaseError);
                    } else {
                        console.log('✅ Dados do Supabase encontrados:', pilotosSupabase?.length || 0);
                    }

                    // Criar mapa de email -> dados Supabase
                    const mapaSupabase = {};
                    if (pilotosSupabase) {
                        pilotosSupabase.forEach(p => {
                            mapaSupabase[p.email.toLowerCase()] = p;
                        });
                    }

                    // Mesclar dados
                    const pilotosCompletos = pilotosFormatados.map(piloto => {
                        const dadosSupabase = mapaSupabase[piloto.email?.toLowerCase()] || {};
                        return {
                            ...piloto,
                            equipe: dadosSupabase.equipe || null,
                            tipo_piloto: dadosSupabase.tipo_piloto || (dadosSupabase.status === 'INATIVO' ? 'ex-piloto' : null),
                            status: dadosSupabase.status || 'ATIVO'
                        };
                    });

                    console.log('✅ Lista final de pilotos:', pilotosCompletos.length);
                    setPilotosList(pilotosCompletos);
                } catch (err) {
                    console.error('❌ Erro ao carregar dados adicionais:', err);
                    // Se der erro, usar apenas dados da planilha
                    console.log('📋 Usando apenas dados da planilha (sem Supabase)');
                    setPilotosList(pilotosFormatados);
                }
            };

            carregarDadosAdicionais();
        } else if (loadingPlanilha === false) {
            if (errorPlanilha) {
                console.error('❌ Erro ao carregar pilotos da planilha:', errorPlanilha);
                setError('Erro ao carregar lista de pilotos da planilha: ' + errorPlanilha);
            } else if (pilotosPlanilha?.length === 0) {
                console.warn('⚠️ Nenhum piloto encontrado na planilha');
                setPilotosList([]);
            }
        }
    }, [pilotosPlanilha, loadingPlanilha, errorPlanilha]);

    // Filtrar pilotos para Lista de Pilotos
    const pilotosFiltrados = pilotosList.filter(piloto => {
        const nomeMatch = !filtroNome || piloto.nome?.toLowerCase().includes(filtroNome.toLowerCase());
        const equipeMatch = !filtroEquipe || piloto.equipe?.toLowerCase().includes(filtroEquipe.toLowerCase());
        const gridMatch = !filtroGrid || piloto.grid?.toLowerCase() === filtroGrid.toLowerCase();
        return nomeMatch && equipeMatch && gridMatch;
    });

    // Filtrar pilotos para Bio do Piloto (usa apenas filtros da Bio)
    const pilotosBioFiltrados = pilotosList.filter(piloto => {
        // Filtro por grid
        const gridMatch = !filtroBioGrid || piloto.grid?.toLowerCase() === filtroBioGrid.toLowerCase();
        
        // Filtro ativo/inativo
        let statusMatch = true;
        if (filtroBioAtivo === 'ativo') {
            statusMatch = piloto.tipo_piloto !== 'ex-piloto' && (piloto.status === 'ATIVO' || !piloto.status);
        } else if (filtroBioAtivo === 'inativo') {
            statusMatch = piloto.tipo_piloto === 'ex-piloto' || piloto.status === 'INATIVO';
        }
        
        return gridMatch && statusMatch;
    });

    // Debug: Log da lista de pilotos
    useEffect(() => {
        console.log('📊 Estado da lista de pilotos:', {
            total: pilotosList.length,
            filtrados: pilotosFiltrados.length,
            bioFiltrados: pilotosBioFiltrados.length,
            loading: loadingPlanilha,
            error: errorPlanilha,
            viewMode,
            pilotosPlanilhaCount: pilotosPlanilha?.length || 0
        });
        if (pilotosList.length > 0) {
            console.log('📋 Primeiros 3 pilotos:', pilotosList.slice(0, 3));
        } else if (loadingPlanilha === false && pilotosPlanilha?.length === 0) {
            console.warn('⚠️ Nenhum piloto na lista após carregamento');
        }
    }, [pilotosList, pilotosFiltrados, pilotosBioFiltrados, loadingPlanilha, errorPlanilha, viewMode, pilotosPlanilha]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Buscar narrador pelo email
            const { data: narrador, error: fetchError } = await supabase
                .from('narradores')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .eq('ativo', true)
                .single();

            if (fetchError || !narrador) {
                setError('Email não encontrado ou inativo');
                setLoading(false);
                return;
            }

            // Verificar se é primeiro acesso (senha não definida)
            if (!narrador.senha_definida || !narrador.senha_hash) {
                setNarradorData(narrador);
                setIsPrimeiroAcesso(true);
                setStep('criar_senha');
                setLoading(false);
                return;
            }

            // Verificar senha (SHA-256)
            const encoder = new TextEncoder();
            const data = encoder.encode(senha);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex !== narrador.senha_hash) {
                setError('Email ou senha incorretos');
                setLoading(false);
                return;
            }

            // Autenticação bem-sucedida - login permanente até logout
            localStorage.setItem('ml_narrador_auth', 'true');
            localStorage.setItem('ml_narrador_email', email.toLowerCase().trim());
            setIsAuthenticated(true);
            // Os pilotos já são carregados automaticamente pelo usePilotosData hook
        } catch (err) {
            console.error('Erro no login:', err);
            setError('Erro ao fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCriarSenha = async (e) => {
        e.preventDefault();
        setError('');

        // Validações
        if (!novaSenha || novaSenha.length < 4) {
            setError('A senha deve ter pelo menos 4 caracteres');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setError('As senhas não coincidem');
            return;
        }

        if (!narradorData.whatsapp || narradorData.whatsapp.trim().length < 10) {
            setError('WhatsApp não cadastrado. Entre em contato com o administrador.');
            return;
        }

        setEnviandoCodigo(true);
        try {
            // Enviar código via WhatsApp
            const result = await requestVerificationCode(
                narradorData.email,
                narradorData.whatsapp,
                narradorData.nome,
                true // skipPilotoCheck - narrador não está na tabela pilotos
            );

            if (!result.success) {
                setError(result.error || 'Erro ao enviar código. Tente novamente.');
                setEnviandoCodigo(false);
                return;
            }

            // Ir para tela de verificação
            setStep('verificar_codigo');
        } catch (err) {
            console.error('Erro ao enviar código:', err);
            setError('Erro ao enviar código. Tente novamente.');
        } finally {
            setEnviandoCodigo(false);
        }
    };

    const handleVerificarCodigo = async (e) => {
        e.preventDefault();
        setError('');
        setVerificandoCodigo(true);

        try {
            // Verificar código
            const result = await verifyCode(narradorData.email, codigoVerificacao);

            if (!result.success || !result.valid) {
                setError(result.error || 'Código inválido. Tente novamente.');
                setVerificandoCodigo(false);
                return;
            }

            // Código válido - salvar senha
            const encoder = new TextEncoder();
            const data = encoder.encode(novaSenha);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Atualizar narrador com senha
            const { error: updateError } = await supabase
                .from('narradores')
                .update({
                    senha_hash: hashHex,
                    senha_definida: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', narradorData.id);

            if (updateError) throw updateError;

            // Autenticação bem-sucedida - login permanente até logout
            localStorage.setItem('ml_narrador_auth', 'true');
            localStorage.setItem('ml_narrador_email', narradorData.email);
            setIsAuthenticated(true);
            setIsPrimeiroAcesso(false);
            setStep('login');
            setNovaSenha('');
            setConfirmarSenha('');
            setCodigoVerificacao('');
            // Os pilotos já são carregados automaticamente pelo usePilotosData hook
        } catch (err) {
            console.error('Erro ao verificar código:', err);
            setError('Erro ao finalizar cadastro. Tente novamente.');
        } finally {
            setVerificandoCodigo(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('ml_narrador_auth');
        localStorage.removeItem('ml_narrador_email');
        setIsAuthenticated(false);
        setPilotoSelecionado(null);
        setPilotosList([]);
        setEmail('');
        setSenha('');
        setStep('login');
        setIsPrimeiroAcesso(false);
        setNarradorData(null);
    };

    // Tela de login / primeiro acesso
    // Log apenas quando necessário para evitar spam
    useEffect(() => {
        console.log('🎯 Renderização - Estado:', { 
            isAuthenticated, 
            step, 
            pilotoSelecionado: !!pilotoSelecionado, 
            pilotoBioSelecionado: !!pilotoBioSelecionado,
            pilotosListCount: pilotosList.length,
            viewMode
        });
    }, [isAuthenticated, step, pilotoSelecionado, pilotoBioSelecionado, pilotosList.length, viewMode]);

    if (!isAuthenticated) {
        // Tela de criar senha (primeiro acesso)
        if (step === 'criar_senha') {
            return (
                <div className="page-wrapper">
                    <div style={{
                        maxWidth: '450px',
                        margin: '100px auto',
                        background: '#1E293B',
                        padding: '40px',
                        borderRadius: '16px',
                        textAlign: 'center',
                        border: '1px solid #06B6D4'
                    }}>
                        <h1 style={{ color: '#06B6D4', marginBottom: '10px' }}>🎙️ PRIMEIRO ACESSO</h1>
                        <p style={{ color: '#94A3B8', marginBottom: '30px', fontSize: '0.9rem' }}>
                            Olá, {narradorData?.nome}! Crie sua senha para acessar o painel.
                        </p>
                        <form onSubmit={handleCriarSenha}>
                            <input
                                type="password"
                                placeholder="Nova Senha (mín. 4 caracteres)"
                                value={novaSenha}
                                onChange={e => setNovaSenha(e.target.value)}
                                required
                                minLength={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginBottom: '15px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#0F172A',
                                    color: 'white'
                                }}
                            />
                            <input
                                type="password"
                                placeholder="Confirmar Senha"
                                value={confirmarSenha}
                                onChange={e => setConfirmarSenha(e.target.value)}
                                required
                                minLength={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginBottom: '20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#0F172A',
                                    color: 'white'
                                }}
                            />
                            {error && (
                                <div style={{
                                    color: '#EF4444',
                                    marginBottom: '15px',
                                    fontSize: '0.9rem'
                                }}>
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={enviandoCodigo}
                                style={{
                                    width: '100%',
                                    background: '#06B6D4',
                                    color: '#0F172A',
                                    cursor: enviandoCodigo ? 'not-allowed' : 'pointer',
                                    opacity: enviandoCodigo ? 0.6 : 1
                                }}
                            >
                                {enviandoCodigo ? '⏳ Enviando código...' : '🔄 Atualizar Senha'}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        // Tela de verificar código
        if (step === 'verificar_codigo') {
            return (
                <div className="page-wrapper">
                    <div style={{
                        maxWidth: '450px',
                        margin: '100px auto',
                        background: '#1E293B',
                        padding: '40px',
                        borderRadius: '16px',
                        textAlign: 'center',
                        border: '1px solid #06B6D4'
                    }}>
                        <h1 style={{ color: '#06B6D4', marginBottom: '10px' }}>🔐 VERIFICAÇÃO</h1>
                        <p style={{ color: '#94A3B8', marginBottom: '10px', fontSize: '0.9rem' }}>
                            Informamos o número do WhatsApp cadastrado:
                        </p>
                        <p style={{ color: '#F8FAFC', marginBottom: '10px', fontSize: '1rem', fontWeight: 'bold' }}>
                            📱 {narradorData?.whatsapp}
                        </p>
                        <p style={{ color: '#94A3B8', marginBottom: '30px', fontSize: '0.9rem' }}>
                            Enviamos um código de verificação para este número.
                        </p>
                        <form onSubmit={handleVerificarCodigo}>
                            <input
                                type="text"
                                placeholder="Código de 6 dígitos"
                                value={codigoVerificacao}
                                onChange={e => setCodigoVerificacao(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginBottom: '20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#0F172A',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    textAlign: 'center',
                                    letterSpacing: '8px'
                                }}
                            />
                            {error && (
                                <div style={{
                                    color: '#EF4444',
                                    marginBottom: '15px',
                                    fontSize: '0.9rem'
                                }}>
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={verificandoCodigo || codigoVerificacao.length !== 6}
                                style={{
                                    width: '100%',
                                    background: '#06B6D4',
                                    color: '#0F172A',
                                    cursor: (verificandoCodigo || codigoVerificacao.length !== 6) ? 'not-allowed' : 'pointer',
                                    opacity: (verificandoCodigo || codigoVerificacao.length !== 6) ? 0.6 : 1
                                }}
                            >
                                {verificandoCodigo ? '⏳ Verificando...' : '✅ Confirmar e Finalizar'}
                            </button>
                        </form>
                        <button
                            onClick={async () => {
                                setCodigoVerificacao('');
                                setError('');
                                setEnviandoCodigo(true);
                                try {
                                    await requestVerificationCode(
                                        narradorData.email,
                                        narradorData.whatsapp,
                                        narradorData.nome,
                                        true
                                    );
                                } catch (err) {
                                    console.error('Erro ao reenviar código:', err);
                                } finally {
                                    setEnviandoCodigo(false);
                                }
                            }}
                            disabled={enviandoCodigo}
                            style={{
                                marginTop: '15px',
                                width: '100%',
                                padding: '10px',
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                borderRadius: '8px',
                                cursor: enviandoCodigo ? 'not-allowed' : 'pointer',
                                opacity: enviandoCodigo ? 0.6 : 1
                            }}
                        >
                            {enviandoCodigo ? '📱 Reenviando...' : '📱 Reenviar Código'}
                        </button>
                    </div>
                </div>
            );
        }

        // Tela de login normal
        return (
            <div className="page-wrapper">
                <div style={{
                    maxWidth: '400px',
                    margin: '100px auto',
                    background: '#1E293B',
                    padding: '40px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    border: '1px solid #06B6D4'
                }}>
                    <h1 style={{ color: '#06B6D4', marginBottom: '20px' }}>ÁREA DO NARRADOR</h1>
                    <p style={{ color: '#94A3B8', marginBottom: '30px' }}>
                        Acesso somente leitura aos painéis dos pilotos
                    </p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginBottom: '15px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#0F172A',
                                color: 'white'
                            }}
                        />
                        <input
                            type="password"
                            placeholder="Senha"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginBottom: '20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#0F172A',
                                color: 'white'
                            }}
                        />
                        {error && (
                            <div style={{
                                color: '#EF4444',
                                marginBottom: '15px',
                                fontSize: '0.9rem'
                            }}>
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: '#06B6D4',
                                color: '#0F172A',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'ENTRANDO...' : 'ENTRAR'}
                        </button>
                    </form>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            marginTop: '20px',
                            width: '100%',
                            padding: '10px',
                            background: 'transparent',
                            border: '1px solid #64748B',
                            color: '#94A3B8',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Voltar para Home
                    </button>
                </div>
            </div>
        );
    }

    // Debug: Log do estado de renderização
    useEffect(() => {
        console.log('🎨 Estado de renderização:', {
            isAuthenticated,
            step,
            pilotoSelecionado: !!pilotoSelecionado,
            pilotoBioSelecionado: !!pilotoBioSelecionado,
            viewMode,
            pilotosListCount: pilotosList.length,
            pilotosFiltradosCount: pilotosFiltrados.length,
            pilotosBioFiltradosCount: pilotosBioFiltrados.length
        });
    }, [isAuthenticated, step, pilotoSelecionado, pilotoBioSelecionado, viewMode, pilotosList.length, pilotosFiltrados.length, pilotosBioFiltrados.length]);

    // Tela principal com filtros e visualização
    if (!pilotoSelecionado && !pilotoBioSelecionado) {
        return (
            <div className="page-wrapper">
                <div style={{ maxWidth: '1400px', margin: '40px auto', padding: '0 20px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '30px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '20px'
                    }}>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '900',
                            color: '#06B6D4',
                            fontStyle: 'italic',
                            margin: 0
                        }}>
                            PAINEL <span style={{ color: 'white' }}>NARRADOR</span>
                        </h1>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                onClick={() => setViewMode('lista')}
                                className="btn-outline"
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '8px 20px',
                                    borderColor: viewMode === 'lista' ? '#06B6D4' : '#64748B',
                                    color: viewMode === 'lista' ? '#06B6D4' : '#94A3B8',
                                    background: viewMode === 'lista' ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
                                }}
                            >
                                📋 Lista de Pilotos
                            </button>
                            <button
                                onClick={() => setViewMode('bio')}
                                className="btn-outline"
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '8px 20px',
                                    borderColor: viewMode === 'bio' ? '#06B6D4' : '#64748B',
                                    color: viewMode === 'bio' ? '#06B6D4' : '#94A3B8',
                                    background: viewMode === 'bio' ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
                                }}
                            >
                                📊 Bio do Piloto
                            </button>
                            <button
                                onClick={handleLogout}
                                className="btn-outline"
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '8px 20px',
                                    borderColor: '#EF4444',
                                    color: '#EF4444'
                                }}
                            >
                                SAIR
                            </button>
                        </div>
                    </div>

                    {/* Seção Bio do Piloto */}
                    {viewMode === 'bio' && (
                        <div>
                            {loadingPlanilha ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                                    ⏳ Carregando pilotos da planilha...
                                </div>
                            ) : errorPlanilha ? (
                                <div style={{ 
                                    padding: '40px', 
                                    textAlign: 'center', 
                                    color: '#EF4444',
                                    background: '#1E293B',
                                    borderRadius: '12px'
                                }}>
                                    ❌ Erro ao carregar pilotos: {errorPlanilha}
                                    <br />
                                    <small style={{ color: '#94A3B8', marginTop: '10px', display: 'block' }}>
                                        Verifique o console para mais detalhes.
                                    </small>
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        background: '#1E293B',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        marginBottom: '30px'
                                    }}>
                                        <h3 style={{ color: '#F8FAFC', marginBottom: '20px' }}>📊 Bio do Piloto</h3>
                                        {pilotosList.length === 0 && (
                                            <div style={{ 
                                                padding: '20px', 
                                                textAlign: 'center', 
                                                color: '#94A3B8',
                                                background: '#0F172A',
                                                borderRadius: '8px',
                                                marginBottom: '20px'
                                            }}>
                                                📋 Nenhum piloto encontrado na planilha.
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '15px',
                                            marginBottom: '20px'
                                        }}>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Selecionar Piloto
                                                </label>
                                                <select
                                                    value={pilotoBioSelecionado?.id || ''}
                                                    onChange={(e) => {
                                                        const piloto = pilotosBioFiltrados.find(p => p.id === e.target.value);
                                                        setPilotoBioSelecionado(piloto || null);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <option value="">-- Selecione um piloto --</option>
                                                    {pilotosBioFiltrados.length === 0 ? (
                                                        <option disabled>Nenhum piloto disponível</option>
                                                    ) : (
                                                        pilotosBioFiltrados.map(piloto => (
                                                            <option key={piloto.id} value={piloto.id}>
                                                                {piloto.nome} {piloto.tipo_piloto === 'ex-piloto' ? '(Ex-Piloto)' : ''}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                                {pilotosBioFiltrados.length > 0 && (
                                                    <small style={{ color: '#64748B', marginTop: '5px', display: 'block' }}>
                                                        {pilotosBioFiltrados.length} piloto(s) disponível(is)
                                                    </small>
                                                )}
                                            </div>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Status
                                                </label>
                                                <select
                                                    value={filtroBioAtivo}
                                                    onChange={(e) => setFiltroBioAtivo(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="ativo">Ativo</option>
                                                    <option value="inativo">Inativo/Ex-Piloto</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Grid
                                                </label>
                                                <select
                                                    value={filtroBioGrid}
                                                    onChange={(e) => setFiltroBioGrid(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="carreira">Carreira</option>
                                                    <option value="light">Light</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Seção Lista de Pilotos (original) */}
                    {viewMode === 'lista' && (
                        <>
                            {loadingPlanilha ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                                    ⏳ Carregando pilotos da planilha...
                                </div>
                            ) : errorPlanilha ? (
                                <div style={{ 
                                    padding: '40px', 
                                    textAlign: 'center', 
                                    color: '#EF4444',
                                    background: '#1E293B',
                                    borderRadius: '12px'
                                }}>
                                    ❌ Erro ao carregar pilotos: {errorPlanilha}
                                    <br />
                                    <small style={{ color: '#94A3B8', marginTop: '10px', display: 'block' }}>
                                        Verifique o console para mais detalhes.
                                    </small>
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        background: '#1E293B',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        marginBottom: '30px'
                                    }}>
                                        <h3 style={{ color: '#F8FAFC', marginBottom: '20px' }}>Filtros</h3>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '15px'
                                        }}>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Nome do Piloto
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nome..."
                                                    value={filtroNome}
                                                    onChange={e => setFiltroNome(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Equipe
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por equipe..."
                                                    value={filtroEquipe}
                                                    onChange={e => setFiltroEquipe(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>
                                                    Grid
                                                </label>
                                                <select
                                                    value={filtroGrid}
                                                    onChange={e => setFiltroGrid(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: '#0F172A',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="carreira">Carreira</option>
                                                    <option value="light">Light</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        background: '#1E293B',
                                        borderRadius: '12px',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Debug info */}
                                        <div style={{
                                            padding: '10px 20px',
                                            background: '#0F172A',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                                            fontSize: '0.8rem',
                                            color: '#64748B'
                                        }}>
                                            📊 Debug: Total: {pilotosList.length} | Filtrados: {pilotosFiltrados.length} | Loading: {loadingPlanilha ? 'Sim' : 'Não'} | Error: {errorPlanilha || 'Nenhum'}
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                            gap: '15px',
                                            padding: '20px'
                                        }}>
                                            {loadingPlanilha ? (
                                                <div style={{
                                                    gridColumn: '1 / -1',
                                                    padding: '40px',
                                                    textAlign: 'center',
                                                    color: '#94A3B8'
                                                }}>
                                                    ⏳ Carregando pilotos da planilha...
                                                </div>
                                            ) : pilotosList.length === 0 ? (
                                                <div style={{
                                                    gridColumn: '1 / -1',
                                                    padding: '40px',
                                                    textAlign: 'center',
                                                    color: '#94A3B8'
                                                }}>
                                                    📋 Nenhum piloto encontrado na planilha.
                                                    {errorPlanilha && (
                                                        <div style={{ marginTop: '10px', color: '#EF4444', fontSize: '0.9rem' }}>
                                                            Erro: {errorPlanilha}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : pilotosFiltrados.length === 0 ? (
                                                <div style={{
                                                    gridColumn: '1 / -1',
                                                    padding: '40px',
                                                    textAlign: 'center',
                                                    color: '#94A3B8'
                                                }}>
                                                    Nenhum piloto encontrado com os filtros selecionados.
                                                    <br />
                                                    <small style={{ color: '#64748B', marginTop: '10px', display: 'block' }}>
                                                        Total de pilotos: {pilotosList.length}
                                                    </small>
                                                </div>
                                            ) : (
                                                pilotosFiltrados.map(piloto => (
                                                    <div
                                                        key={piloto.id}
                                                        onClick={() => setPilotoSelecionado(piloto)}
                                                        style={{
                                                            background: 'rgba(6, 182, 212, 0.1)',
                                                            border: '1px solid rgba(6, 182, 212, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '20px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s',
                                                            ':hover': {
                                                                background: 'rgba(6, 182, 212, 0.2)',
                                                                borderColor: '#06B6D4'
                                                            }
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                                                            e.currentTarget.style.borderColor = '#06B6D4';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                                                            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                                                        }}
                                                    >
                                                        <div style={{
                                                            fontWeight: '800',
                                                            color: 'white',
                                                            fontSize: '1.1rem',
                                                            marginBottom: '10px'
                                                        }}>
                                                            {piloto.nome || 'Sem Nome'}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '5px' }}>
                                                            {piloto.equipe || 'Sem Equipe'}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '700',
                                                            color: '#06B6D4'
                                                        }}>
                                                            {piloto.grid || '-'}
                                                        </div>
                                                        {piloto.tipo_piloto === 'ex-piloto' && (
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: '#94A3B8',
                                                                marginTop: '5px'
                                                            }}>
                                                                📜 EX-PILOTO
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Visualização do painel do piloto (somente leitura) - modo lista
    if (pilotoSelecionado) {
        return (
        <div>
            <div style={{
                position: 'fixed',
                top: '20px',
                left: '20px',
                zIndex: 1000,
                display: 'flex',
                gap: '10px'
            }}>
                <button
                    onClick={() => setPilotoSelecionado(null)}
                    className="btn-primary"
                    style={{
                        background: '#06B6D4',
                        color: '#0F172A',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700'
                    }}
                >
                    ← Voltar para Lista
                </button>
                <button
                    onClick={handleLogout}
                    className="btn-outline"
                    style={{
                        borderColor: '#EF4444',
                        color: '#EF4444',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Sair
                </button>
            </div>
            <div style={{ pointerEvents: 'none' }}>
                <Dashboard isReadOnly={true} pilotoEmail={pilotoSelecionado.email} />
            </div>
        </div>
    );
    }

    // Visualização do painel do piloto (somente leitura) - modo Bio
    if (pilotoBioSelecionado) {
        return (
            <div>
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '10px'
                }}>
                    <button
                        onClick={() => setPilotoBioSelecionado(null)}
                        className="btn-primary"
                        style={{
                            background: '#06B6D4',
                            color: '#0F172A',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '700'
                        }}
                    >
                        ← Voltar para Bio do Piloto
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-outline"
                        style={{
                            borderColor: '#EF4444',
                            color: '#EF4444',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Sair
                    </button>
                </div>
                <div style={{ pointerEvents: 'none' }}>
                    <Dashboard isReadOnly={true} pilotoEmail={pilotoBioSelecionado.email} />
                </div>
            </div>
        );
    }

    // Fallback: se chegou aqui, algo está errado
    console.error('❌ Erro: Componente Narrador chegou ao return null - nenhuma condição foi satisfeita', {
        isAuthenticated,
        step,
        pilotoSelecionado: !!pilotoSelecionado,
        pilotoBioSelecionado: !!pilotoBioSelecionado
    });
    
    return (
        <div className="page-wrapper">
            <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', color: '#EF4444' }}>
                <h1>Erro ao carregar página do narrador</h1>
                <p>Verifique o console para mais detalhes.</p>
            </div>
        </div>
    );
}

export default Narrador;
*/

// Placeholder temporário - Sistema de narrador adiado
function Narrador() {
    return (
        <div className="page-wrapper">
            <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', color: '#94A3B8' }}>
                <h1 style={{ color: '#06B6D4', marginBottom: '20px' }}>🎙️ Sistema de Narrador</h1>
                <p>Esta funcionalidade está temporariamente desabilitada.</p>
            </div>
        </div>
    );
}

export default Narrador;


