import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { usePilotosData } from '../hooks/useAnalises';
import { notifyAdminNewDefense } from '../utils/emailService';
import { getVideoEmbedUrl } from '../utils/videoEmbed';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import '../index.css';

// Temporada atual
const TEMPORADA_ATUAL = 20;

// Função getVideoEmbedUrl agora importada de utils/videoEmbed.js

function FormularioDefesa() {
    const navigate = useNavigate();
    const { showAlert, alertState } = useCustomAlert();
    const { pilotos: pilotosInscritos, loading: loadingPilotos } = usePilotosData();
    
    const [pilotoLogado, setPilotoLogado] = useState(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Acusações pendentes contra o piloto
    const [acusacoesPendentes, setAcusacoesPendentes] = useState([]);
    const [loadingAcusacoes, setLoadingAcusacoes] = useState(true);
    const [acusacaoSelecionada, setAcusacaoSelecionada] = useState(null);
    
    const [formData, setFormData] = useState({
        descricaoDefesa: '',
        videoLinkDefesa: ''
    });

    // Carregar dados do piloto logado
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    navigate('/login');
                    return;
                }

                if (loadingPilotos) return;

                const userEmail = session.user.email.toLowerCase().trim();
                const pilotoEncontrado = pilotosInscritos.find(
                    p => p.email.toLowerCase().trim() === userEmail
                );

                if (pilotoEncontrado) {
                    setPilotoLogado(pilotoEncontrado);
                } else {
                    // Fallback 1: buscar da tabela 'pilotos' do Supabase
                    const { data: pilotoData } = await supabase
                        .from('pilotos')
                        .select('*')
                        .eq('email', userEmail)
                        .single();

                    if (pilotoData) {
                        const fotoNome = (pilotoData.nome || '').toLowerCase()
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '');
                        
                        setPilotoLogado({
                            nome: pilotoData.nome,
                            gamertag: pilotoData.gamertag || '',
                            whatsapp: pilotoData.whatsapp || '',
                            email: session.user.email,
                            grid: pilotoData.grid || 'carreira',
                            fotoNome: fotoNome
                        });
                    } else {
                        // Fallback 2: buscar do perfil Supabase (tabela 'profiles')
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();

                        if (profileData) {
                            setPilotoLogado({
                                nome: profileData.nome_piloto,
                                gamertag: profileData.gamertag || '',
                                whatsapp: profileData.whatsapp || '',
                                email: session.user.email,
                                grid: profileData.grid || 'carreira',
                                fotoNome: (profileData.nome_piloto || '').toLowerCase()
                                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                    .replace(/\s+/g, '')
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
            } finally {
                setLoadingPage(false);
            }
        };

        loadUserData();
    }, [navigate, pilotosInscritos, loadingPilotos]);

    // Carregar acusações pendentes contra o piloto logado
    useEffect(() => {
        const loadAcusacoesPendentes = async () => {
            if (!pilotoLogado) return;
            
            setLoadingAcusacoes(true);
            try {
                // Buscar todas as notificações de acusação
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('*')
                    .eq('tipo', 'nova_acusacao')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Erro ao buscar acusações:', error);
                    return;
                }

                // Filtrar acusações onde o piloto logado é o ACUSADO e ainda NÃO tem defesa incorporada
                const acusacoesSemDefesa = (data || []).filter(notif => {
                    const dados = notif.dados || {};
                    const acusado = dados.acusado || {};
                    // Verificar se é contra este piloto
                    const ehContraMim = acusado.nome?.toUpperCase() === pilotoLogado.nome?.toUpperCase();
                    // Verificar se já tem defesa INCORPORADA no próprio registro
                    const temDefesa = dados.defesa != null;
                    return ehContraMim && !temDefesa;
                });

                setAcusacoesPendentes(acusacoesSemDefesa);
            } catch (err) {
                console.error('Erro:', err);
            } finally {
                setLoadingAcusacoes(false);
            }
        };

        loadAcusacoesPendentes();
    }, [pilotoLogado]);

    // Selecionar acusação
    const handleSelecionarAcusacao = (acusacao) => {
        setAcusacaoSelecionada(acusacao);
        setFormData({ descricaoDefesa: '', videoLinkDefesa: '' });
    };

    // Enviar defesa
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Verificar se há acusações disponíveis
        if (acusacoesPendentes.length === 0) {
            await showAlert('Você não possui acusações pendentes para defender.\n\nNão há acusações aguardando sua defesa no momento.', 'Aviso');
            return;
        }
        
        if (!acusacaoSelecionada) {
            await showAlert('Por favor, selecione uma acusação para defender.', 'Aviso');
            return;
        }

        if (!formData.descricaoDefesa) {
            await showAlert('Por favor, escreva sua defesa.', 'Aviso');
            return;
        }

        setSubmitting(true);

        try {
            const dadosAcusacao = acusacaoSelecionada.dados || {};
            const videoEmbed = getVideoEmbedUrl(formData.videoLinkDefesa);
            
            // Preparar dados da defesa
            const dadosDefesa = {
                codigoLance: dadosAcusacao.codigoLance,
                acusacaoOriginal: dadosAcusacao,
                defensor: {
                    nome: pilotoLogado.nome,
                    gamertag: pilotoLogado.gamertag,
                    whatsapp: pilotoLogado.whatsapp,
                    email: pilotoLogado.email,
                    grid: pilotoLogado.grid,
                },
                descricaoDefesa: formData.descricaoDefesa,
                videoLinkDefesa: formData.videoLinkDefesa || null,
                videoEmbedDefesa: videoEmbed,
                temporada: TEMPORADA_ATUAL,
                dataEnvio: new Date().toISOString(),
            };

            // Enviar notificação ao admin
            notifyAdminNewDefense(dadosDefesa)
                .then(result => console.log('📨 Notificação de defesa ao admin:', result))
                .catch(err => console.warn('⚠️ Erro notificação admin:', err));
            
            // Mensagem para o piloto (cópia)
            const mensagemPiloto = encodeURIComponent(
`🛡️ *CÓPIA DE DEFESA - MASTER LEAGUE F1*
━━━━━━━━━━━━━━━━━━━━━
🔖 *Código:* ${dadosAcusacao.codigoLance}

👤 *DEFENSOR*
Nome: ${pilotoLogado.nome}
Gamertag: ${pilotoLogado.gamertag}
Grid: ${pilotoLogado.grid.toUpperCase()}

⚖️ *ACUSADOR ORIGINAL*
Nome: ${dadosAcusacao.acusador?.nome}

📍 *DETALHES*
Temporada: T${TEMPORADA_ATUAL}
Etapa: ${dadosAcusacao.etapa?.round} - ${dadosAcusacao.etapa?.circuit}

📝 *SUA DEFESA*
${formData.descricaoDefesa}

${formData.videoLinkDefesa ? `🎥 *VÍDEO DA DEFESA*\n${formData.videoLinkDefesa}` : ''}

━━━━━━━━━━━━━━━━━━━━━
✅ Defesa enviada com sucesso!
Aguarde análise dos Stewards.`
            );

            // Abrir WhatsApp do piloto com a cópia (usa janela existente se disponível)
            const whatsappNumber = pilotoLogado.whatsapp?.replace(/\D/g, '');
            if (whatsappNumber) {
                window.open(`https://wa.me/55${whatsappNumber}?text=${mensagemPiloto}`, 'whatsapp_window');
            }

            setShowSuccess(true);
            
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/dashboard');
            }, 4000);

        } catch (err) {
            console.error('Erro ao enviar defesa:', err);
            await showAlert('Erro ao enviar defesa. Tente novamente.', 'Erro');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVoltar = () => {
        if (acusacaoSelecionada) {
            setAcusacaoSelecionada(null);
        } else {
            navigate('/dashboard');
        }
    };

    // Gerar URL da foto do piloto - Prioriza SML primeiro
    const TEMPORADA_FOTOS = 19;
    const getFotoUrl = (piloto) => {
        if (!piloto) return '/pilotos/pilotoshadow.png';
        // Prioriza SML primeiro
        return `/pilotos/SML/${piloto.fotoNome}.png`;
    };
    
    const getSeasonFotoUrl = (piloto) => {
        if (!piloto) return '/pilotos/pilotoshadow.png';
        const season = `s${TEMPORADA_FOTOS}`;
        return `/pilotos/${piloto.grid}/${season}/${piloto.fotoNome}.png`;
    };
    
    const handleFotoError = (e, piloto) => {
        if (e.target.src.includes('/SML/')) {
            e.target.src = getSeasonFotoUrl(piloto);
        } else if (e.target.src.includes(`/s${TEMPORADA_FOTOS}/`)) {
            e.target.src = '/pilotos/pilotoshadow.png';
        }
    };

    // Loading
    if (loadingPage || loadingPilotos) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: 'var(--bg-dark-main)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
                    <p>Carregando dados...</p>
                </div>
            </div>
        );
    }

    // Piloto não encontrado
    if (!pilotoLogado) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: 'var(--bg-dark-main)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
                    <h2 style={{ marginBottom: '15px' }}>Piloto não encontrado</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '25px' }}>
                        Seu email não está cadastrado na planilha de inscrição da T{TEMPORADA_ATUAL}.
                    </p>
                    <button onClick={() => navigate('/dashboard')} style={{
                        background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700'
                    }}>
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Modal de sucesso
    if (showSuccess) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: 'var(--bg-dark-main)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{ 
                    textAlign: 'center', 
                    maxWidth: '450px',
                    background: 'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
                    padding: '50px 40px',
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🛡️</div>
                    <h2 style={{ marginBottom: '15px', fontSize: '1.8rem' }}>Defesa Enviada!</h2>
                    <p style={{ color: '#A7F3D0', marginBottom: '10px' }}>
                        Sua defesa foi registrada com sucesso e será analisada pelos Stewards.
                    </p>
                    <p style={{ color: '#6EE7B7', fontSize: '0.9rem' }}>
                        Redirecionando para o Dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-dark-main)', 
            color: 'white', 
            padding: '80px 20px 40px',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px', 
                    marginBottom: '30px' 
                }}>
                    <button 
                        onClick={handleVoltar}
                        style={{
                            background: 'transparent',
                            border: '1px solid #475569',
                            color: '#94A3B8',
                            padding: '10px 15px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        ← Voltar
                    </button>
                    <div>
                        <h1 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '800', 
                            margin: 0,
                            background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            🛡️ ENVIAR DEFESA
                        </h1>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '5px 0 0 0' }}>
                            Temporada {TEMPORADA_ATUAL} • {pilotoLogado.grid.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Card do Piloto Logado */}
                <div style={{
                    background: 'linear-gradient(135deg, #164E63 0%, #0F172A 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    border: '1px solid #0E7490'
                }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        background: '#1F2937',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid #06B6D4',
                        flexShrink: 0
                    }}>
                        <img 
                            src={getFotoUrl(pilotoLogado)}
                            alt={pilotoLogado.nome}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => handleFotoError(e, pilotoLogado)}
                        />
                    </div>
                    <div>
                        <p style={{ color: '#67E8F9', fontSize: '0.75rem', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Defensor</p>
                        <h3 style={{ margin: '5px 0', fontSize: '1.2rem', fontWeight: '700' }}>{pilotoLogado.nome}</h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>
                            GT: {pilotoLogado.gamertag} • {pilotoLogado.grid.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* LISTA DE ACUSAÇÕES ou FORMULÁRIO */}
                {!acusacaoSelecionada ? (
                    // Lista de acusações pendentes
                    <div>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#E2E8F0' }}>
                            📋 Acusações pendentes contra você
                        </h2>

                        {loadingAcusacoes ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                ⏳ Carregando acusações...
                            </div>
                        ) : acusacoesPendentes.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '60px 20px', 
                                background: '#0F172A',
                                borderRadius: '12px',
                                border: '1px dashed #334155'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
                                <h3 style={{ color: '#22C55E', marginBottom: '10px' }}>Nenhuma acusação pendente!</h3>
                                <p style={{ color: '#64748B' }}>
                                    Você não possui acusações aguardando defesa.
                                </p>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    style={{
                                        marginTop: '20px',
                                        background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 30px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '700'
                                    }}
                                >
                                    Voltar ao Dashboard
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {acusacoesPendentes.map((acusacao) => {
                                    const dados = acusacao.dados || {};
                                    const acusador = dados.acusador || {};
                                    const etapa = dados.etapa || {};
                                    
                                    return (
                                        <div
                                            key={acusacao.id}
                                            style={{
                                                background: '#1E293B',
                                                border: '2px solid #EF4444',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            onClick={() => handleSelecionarAcusacao(acusacao)}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ 
                                                        background: '#E5E7EB',
                                                        color: '#1F2937',
                                                        padding: '6px 14px',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        fontFamily: 'monospace',
                                                    }}>
                                                        🔖 {dados.codigoLance || 'N/A'}
                                                    </span>
                                                    <span style={{ 
                                                        background: '#EF4444',
                                                        color: 'white',
                                                        padding: '4px 10px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                    }}>
                                                        AGUARDANDO DEFESA
                                                    </span>
                                                </div>
                                                <span style={{ color: '#64748B', fontSize: '12px' }}>
                                                    {new Date(acusacao.created_at).toLocaleString('pt-BR')}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                                <div>
                                                    <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: '0 0 5px 0' }}>ACUSADOR</p>
                                                    <p style={{ color: '#F8FAFC', fontWeight: '700', margin: 0 }}>{acusador.nome}</p>
                                                    <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>GT: {acusador.gamertag}</p>
                                                </div>
                                                <div>
                                                    <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: '0 0 5px 0' }}>ETAPA</p>
                                                    <p style={{ color: '#F8FAFC', fontWeight: '700', margin: 0 }}>
                                                        Etapa {etapa.round} - {etapa.circuit}
                                                    </p>
                                                </div>
                                            </div>

                                            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #EF4444' }}>
                                                <p style={{ color: '#94A3B8', fontSize: '0.7rem', margin: '0 0 5px 0' }}>ACUSAÇÃO</p>
                                                <p style={{ color: '#E2E8F0', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                    {dados.descricao?.substring(0, 150)}{dados.descricao?.length > 150 ? '...' : ''}
                                                </p>
                                            </div>

                                            <div style={{ marginTop: '15px', textAlign: 'right' }}>
                                                <span style={{
                                                    background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                                                    color: 'white',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700',
                                                    display: 'inline-block'
                                                }}>
                                                    ENVIAR DEFESA →
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    // FORMULÁRIO DE DEFESA
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }}>
                        {/* Header do formulário */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0E7490 0%, #164E63 100%)',
                            padding: '25px 30px',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ 
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace',
                                }}>
                                    🔖 {acusacaoSelecionada.dados?.codigoLance}
                                </span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Formulário de Defesa</h2>
                            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                                Etapa {acusacaoSelecionada.dados?.etapa?.round} - {acusacaoSelecionada.dados?.etapa?.circuit}
                            </p>
                        </div>

                        {/* Resumo da acusação */}
                        <div style={{ padding: '20px 30px', background: '#FEE2E2', borderBottom: '1px solid #FECACA' }}>
                            <h3 style={{ color: '#991B1B', fontSize: '0.9rem', margin: '0 0 10px 0' }}>⚖️ ACUSAÇÃO ORIGINAL</h3>
                            <p style={{ color: '#1F2937', margin: '0 0 10px 0', fontSize: '0.85rem' }}>
                                <strong>Acusador:</strong> {acusacaoSelecionada.dados?.acusador?.nome} (GT: {acusacaoSelecionada.dados?.acusador?.gamertag})
                            </p>
                            <p style={{ color: '#374151', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                "{acusacaoSelecionada.dados?.descricao}"
                            </p>
                            
                            {/* Vídeo da Acusação INCORPORADO */}
                            {acusacaoSelecionada.dados?.videoLink && (() => {
                                const videoUrl = acusacaoSelecionada.dados.videoLink;
                                const embedUrl = getVideoEmbedUrl(videoUrl);
                                
                                return (
                                    <div style={{ marginTop: '15px' }}>
                                        <p style={{ color: '#991B1B', fontSize: '0.75rem', fontWeight: '700', margin: '0 0 10px 0' }}>🎥 VÍDEO DA ACUSAÇÃO</p>
                                        {embedUrl ? (
                                            <div style={{ 
                                                position: 'relative', 
                                                paddingBottom: '56.25%', 
                                                height: 0, 
                                                overflow: 'hidden',
                                                borderRadius: '8px',
                                                background: '#000'
                                            }}>
                                                <iframe
                                                    src={embedUrl}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        border: 'none',
                                                    }}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    title="Vídeo da acusação"
                                                />
                                            </div>
                                        ) : (
                                            <a 
                                                href={videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '10px 15px',
                                                    background: '#DC2626',
                                                    color: 'white',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                🎥 Abrir vídeo (link externo)
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
                            {/* Descrição da Defesa */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '700', 
                                    color: '#374151', 
                                    marginBottom: '8px', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px' 
                                }}>
                                    Sua Defesa <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <textarea
                                    value={formData.descricaoDefesa}
                                    onChange={(e) => setFormData({ ...formData, descricaoDefesa: e.target.value })}
                                    required
                                    rows={6}
                                    placeholder="Descreva sua versão dos fatos, justificativas e argumentos de defesa..."
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        resize: 'vertical',
                                        minHeight: '150px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Link do Vídeo (opcional) */}
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '700', 
                                    color: '#374151', 
                                    marginBottom: '8px', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px' 
                                }}>
                                    Link do Vídeo (opcional)
                                </label>
                                <input
                                    type="url"
                                    value={formData.videoLinkDefesa}
                                    onChange={(e) => setFormData({ ...formData, videoLinkDefesa: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=..."
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <p style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '5px' }}>
                                    Se tiver um vídeo que comprove sua defesa, cole o link aqui (YouTube, Google Drive, Vimeo, etc.)
                                </p>
                                
                                {/* Preview do vídeo incorporado */}
                                {formData.videoLinkDefesa && (() => {
                                    const embedUrl = getVideoEmbedUrl(formData.videoLinkDefesa);
                                    
                                    return embedUrl ? (
                                        <div style={{ marginTop: '15px' }}>
                                            <p style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: '700', margin: '0 0 10px 0' }}>🎥 PREVIEW DO VÍDEO</p>
                                            <div style={{ 
                                                position: 'relative', 
                                                paddingBottom: '56.25%', 
                                                height: 0, 
                                                overflow: 'hidden',
                                                borderRadius: '8px',
                                                background: '#000',
                                                border: '2px solid rgba(34, 197, 94, 0.3)'
                                            }}>
                                                <iframe
                                                    src={embedUrl}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        border: 'none',
                                                    }}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    title="Preview do vídeo de defesa"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            marginTop: '10px', 
                                            padding: '10px', 
                                            background: 'rgba(245, 158, 11, 0.1)', 
                                            border: '1px solid rgba(245, 158, 11, 0.3)', 
                                            borderRadius: '6px' 
                                        }}>
                                            <p style={{ color: '#F59E0B', fontSize: '0.75rem', margin: 0 }}>
                                                ⚠️ Link não reconhecido. O vídeo será exibido como link externo após o envio.
                                            </p>
                                        </div>
                                    );
                                })()}
                                
                                {/* Aviso sobre vídeos */}
                                <div style={{
                                    marginTop: '10px',
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px'
                                }}>
                                    <p style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#EF4444', 
                                        margin: 0,
                                        fontWeight: '600',
                                        lineHeight: '1.4'
                                    }}>
                                        ⚠️ <strong>ATENÇÃO:</strong> Vídeos privados, sem nitidez, com palavrão ou que impossibilitem análise por algum motivo técnico serão automaticamente descartados pela comissão.
                                    </p>
                                </div>
                            </div>

                            {/* Botões */}
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setAcusacaoSelecionada(null)}
                                    style={{
                                        padding: '14px 30px',
                                        background: 'transparent',
                                        border: '2px solid #D1D5DB',
                                        borderRadius: '8px',
                                        color: '#6B7280',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '14px 40px',
                                        background: submitting 
                                            ? '#9CA3AF' 
                                            : 'linear-gradient(135deg, #06B6D4, #0891B2)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontWeight: '700',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {submitting ? (
                                        <>⏳ Enviando...</>
                                    ) : (
                                        <>🛡️ Enviar Defesa</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
            
            {/* Custom Alert */}
            <CustomAlert
                show={alertState.show}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </div>
    );
}

export default FormularioDefesa;
