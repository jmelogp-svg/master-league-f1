import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { usePilotosData, useCalendarioT20 } from '../hooks/useAnalises';
import { notifyAdminNewAccusation } from '../utils/emailService';
import '../index.css';

// Temporada atual
const TEMPORADA_ATUAL = 20;

/**
 * Gera código único para o lance
 * Formato: STW-{Grid}{Temporada}{Ordem}
 * Exemplo: STW-L2001 (Light, T20, 1º envio)
 */
async function gerarCodigoLance(grid, temporada) {
    try {
        // Buscar quantidade de notificações do grid nesta temporada
        const gridLetra = grid === 'light' ? 'L' : 'C';
        const prefixo = `STW-${gridLetra}${temporada.toString().padStart(2, '0')}`;
        
        // Contar quantas acusações já existem nessa temporada/grid
        const { data, error } = await supabase
            .from('notificacoes_admin')
            .select('dados')
            .eq('tipo', 'nova_acusacao');
        
        if (error) {
            console.error('Erro ao buscar contagem:', error);
            // Fallback: usar timestamp
            return `${prefixo}${Date.now().toString().slice(-4)}`;
        }
        
        // Filtrar por temporada e grid
        const acusacoesDoGrid = (data || []).filter(n => {
            const dados = n.dados || {};
            return dados.temporada === temporada && 
                   dados.acusador?.grid === grid;
        });
        
        const ordem = (acusacoesDoGrid.length + 1).toString().padStart(2, '0');
        return `${prefixo}${ordem}`;
    } catch (err) {
        console.error('Erro ao gerar código:', err);
        return `STW-${grid === 'light' ? 'L' : 'C'}${temporada}${Date.now().toString().slice(-4)}`;
    }
}

/**
 * Extrai o ID do vídeo do YouTube/Twitch para embed
 */
function getVideoEmbedUrl(url) {
    if (!url) return null;
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Twitch clip
    const twitchClipMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
    if (twitchClipMatch) {
        return `https://clips.twitch.tv/embed?clip=${twitchClipMatch[1]}&parent=${window.location.hostname}`;
    }
    
    // Twitch video
    const twitchVideoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (twitchVideoMatch) {
        return `https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${window.location.hostname}`;
    }
    
    return null;
}

function FormularioAcusacao() {
    const navigate = useNavigate();
    const { pilotos: pilotosInscritos, loading: loadingPilotos } = usePilotosData();
    const { etapas: etapasRaw, loading: loadingCalendario } = useCalendarioT20();
    
    // Remover etapas duplicadas baseado no round
    const etapasCalendario = etapasRaw.filter((etapa, index, self) =>
        index === self.findIndex(e => e.round === etapa.round)
    );
    
    const [pilotoLogado, setPilotoLogado] = useState(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Estados do formulário
    const [pilotosGrid, setPilotosGrid] = useState([]);
    const [pilotoAcusadoSelecionado, setPilotoAcusadoSelecionado] = useState(null);
    const [codigoLance, setCodigoLance] = useState(null);
    
    const [formData, setFormData] = useState({
        etapa: '',
        pilotoAcusado: '',
        descricao: '',
        videoLink: ''
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

                // Aguardar pilotos carregarem
                if (loadingPilotos) return;

                const userEmail = session.user.email.toLowerCase().trim();
                const pilotoEncontrado = pilotosInscritos.find(
                    p => p.email.toLowerCase().trim() === userEmail
                );

                console.log('DEBUG - Email do usuário:', userEmail);
                console.log('DEBUG - Piloto encontrado:', pilotoEncontrado);
                console.log('DEBUG - Foto URL seria:', pilotoEncontrado ? `/pilotos/${pilotoEncontrado.grid}/s19/${pilotoEncontrado.fotoNome}.png` : 'não encontrado');

                if (pilotoEncontrado) {
                    setPilotoLogado(pilotoEncontrado);
                } else {
                    // Fallback: buscar do perfil Supabase
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
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
            } finally {
                setLoadingPage(false);
            }
        };

        loadUserData();
    }, [navigate, pilotosInscritos, loadingPilotos]);

    // Carregar pilotos do mesmo grid (exceto o próprio)
    useEffect(() => {
        if (!pilotoLogado || loadingPilotos) return;

        const pilotosDoGrid = pilotosInscritos
            .filter(p => p.grid === pilotoLogado.grid && p.nome !== pilotoLogado.nome)
            .sort((a, b) => a.nome.localeCompare(b.nome));

        setPilotosGrid(pilotosDoGrid);
    }, [pilotoLogado, pilotosInscritos, loadingPilotos]);

    // Quando seleciona piloto acusado, carrega seus dados
    const handlePilotoAcusadoChange = (e) => {
        const nomeAcusado = e.target.value;
        setFormData({ ...formData, pilotoAcusado: nomeAcusado });
        
        const piloto = pilotosGrid.find(p => p.nome === nomeAcusado);
        setPilotoAcusadoSelecionado(piloto || null);
    };

    // Enviar acusação
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.etapa || !formData.pilotoAcusado || !formData.descricao || !formData.videoLink) {
            alert('Por favor, preencha todos os campos obrigatórios, incluindo o link do vídeo.');
            return;
        }

        setSubmitting(true);

        try {
            // Gerar código único do lance
            const codigo = await gerarCodigoLance(pilotoLogado.grid, TEMPORADA_ATUAL);
            setCodigoLance(codigo);
            console.log('📋 Código do lance gerado:', codigo);

            // Preparar dados da acusação
            const etapaSelecionada = etapasCalendario.find(e => e.round === parseInt(formData.etapa));
            const videoEmbed = getVideoEmbedUrl(formData.videoLink);
            
            // 🔔 ENVIAR NOTIFICAÇÃO AUTOMÁTICA AO ADMIN (não requer ação do piloto)
            const dadosAcusacao = {
                codigoLance: codigo,
                acusador: {
                    nome: pilotoLogado.nome,
                    gamertag: pilotoLogado.gamertag,
                    whatsapp: pilotoLogado.whatsapp,
                    email: pilotoLogado.email,
                    grid: pilotoLogado.grid,
                },
                acusado: {
                    nome: pilotoAcusadoSelecionado?.nome || formData.pilotoAcusado,
                    gamertag: pilotoAcusadoSelecionado?.gamertag || '-',
                    whatsapp: pilotoAcusadoSelecionado?.whatsapp || '-',
                },
                etapa: etapaSelecionada || { round: formData.etapa, circuit: '-' },
                descricao: formData.descricao,
                videoLink: formData.videoLink,
                videoEmbed: videoEmbed,
                temporada: TEMPORADA_ATUAL,
                dataEnvio: new Date().toISOString(),
            };

            // Envia automaticamente para o admin (background, não bloqueia)
            notifyAdminNewAccusation(dadosAcusacao)
                .then(result => console.log('📨 Notificação ao admin:', result))
                .catch(err => console.warn('⚠️ Erro notificação admin:', err));
            
            // Mensagem para o piloto (cópia) - inclui código do lance
            const mensagemPiloto = encodeURIComponent(
`📋 *CÓPIA DE ACUSAÇÃO - MASTER LEAGUE F1*
━━━━━━━━━━━━━━━━━━━━━
🔖 *Código:* ${codigo}

👤 *ACUSADOR*
Nome: ${pilotoLogado.nome}
Gamertag: ${pilotoLogado.gamertag}
Grid: ${pilotoLogado.grid.toUpperCase()}

⚖️ *ACUSADO*
Nome: ${pilotoAcusadoSelecionado?.nome || formData.pilotoAcusado}
Gamertag: ${pilotoAcusadoSelecionado?.gamertag || '-'}
WhatsApp: ${pilotoAcusadoSelecionado?.whatsapp || '-'}

📍 *DETALHES*
Temporada: T${TEMPORADA_ATUAL}
Etapa: ${etapaSelecionada?.round} - ${etapaSelecionada?.circuit}
Data: ${etapaSelecionada?.date}

📝 *DESCRIÇÃO*
${formData.descricao}

🎥 *VÍDEO*
${formData.videoLink}

━━━━━━━━━━━━━━━━━━━━━
✅ Acusação enviada com sucesso!
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
            console.error('Erro ao enviar acusação:', err);
            alert('Erro ao enviar acusação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVoltar = () => {
        navigate('/dashboard');
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

    if (loadingPage || loadingCalendario || loadingPilotos) {
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
                    <button onClick={handleVoltar} style={{
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

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-dark-main)', 
            color: 'white', 
            padding: '80px 20px 40px',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div style={{ maxWidth: '750px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '25px'
                }}>
                    <button
                        onClick={handleVoltar}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        ← Voltar
                    </button>
                    <div style={{
                        background: pilotoLogado.grid === 'light' ? '#06B6D4' : '#8B1538',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Grid {pilotoLogado.grid}
                    </div>
                </div>

                {/* Card do Formulário - Estilo Documento */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    color: '#1a1a1a',
                    overflow: 'hidden'
                }}>
                    {/* Cabeçalho Vermelho */}
                    <div style={{
                        background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                        padding: '20px 30px',
                        textAlign: 'center'
                    }}>
                        <h1 style={{ 
                            fontSize: '1.3rem', 
                            fontWeight: '900', 
                            margin: 0,
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '3px'
                        }}>⚖️ Formulário de Acusação</h1>
                        <p style={{ 
                            fontSize: '0.8rem', 
                            color: 'rgba(255,255,255,0.8)', 
                            margin: '8px 0 0 0' 
                        }}>
                            Master League F1 - Direção de Prova - Temporada {TEMPORADA_ATUAL}
                        </p>
                    </div>

                    {/* Corpo do Documento */}
                    <div style={{ padding: '35px 40px' }}>
                        
                        {/* SEÇÃO: DADOS DO ACUSADOR */}
                        <div style={{ marginBottom: '35px' }}>
                            <h2 style={{
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginBottom: '20px',
                                paddingBottom: '10px',
                                borderBottom: '2px solid #E5E7EB'
                            }}>
                                📋 Dados do Acusador
                            </h2>
                            
                            <div style={{ 
                                display: 'flex', 
                                gap: '25px',
                                alignItems: 'flex-start'
                            }}>
                                {/* Foto 3x4 */}
                                <div style={{
                                    width: '120px',
                                    height: '160px',
                                    background: '#1F2937',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '3px solid #374151'
                                }}>
                                    <img 
                                        src={getFotoUrl(pilotoLogado)}
                                        alt={pilotoLogado.nome}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => handleFotoError(e, pilotoLogado)}
                                    />
                                </div>

                                {/* Informações */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '15px'
                                    }}>
                                        <div>
                                            <label style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#6B7280', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>Nome do Piloto</label>
                                            <p style={{ 
                                                fontSize: '0.95rem', 
                                                fontWeight: '700', 
                                                color: '#1F2937',
                                                margin: 0,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{pilotoLogado.nome}</p>
                                        </div>
                                        <div>
                                            <label style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#6B7280', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>Gamertag / ID</label>
                                            <p style={{ 
                                                fontSize: '0.95rem', 
                                                fontWeight: '700', 
                                                color: '#1F2937',
                                                margin: 0,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{pilotoLogado.gamertag || '-'}</p>
                                        </div>
                                        <div>
                                            <label style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#6B7280', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>WhatsApp</label>
                                            <p style={{ 
                                                fontSize: '0.9rem', 
                                                fontWeight: '600', 
                                                color: '#1F2937',
                                                margin: 0,
                                                whiteSpace: 'nowrap'
                                            }}>{pilotoLogado.whatsapp || '-'}</p>
                                        </div>
                                        <div>
                                            <label style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#6B7280', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>Grid</label>
                                            <p style={{ 
                                                fontSize: '0.9rem', 
                                                fontWeight: '700', 
                                                color: pilotoLogado.grid === 'light' ? '#0891B2' : '#991B1B',
                                                margin: 0,
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap'
                                            }}>{pilotoLogado.grid}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#6B7280', 
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>Email</label>
                                            <p style={{ 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#1F2937',
                                                margin: 0,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{pilotoLogado.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO: FORMULÁRIO */}
                        <form onSubmit={handleSubmit}>
                            
                            <h2 style={{
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginBottom: '20px',
                                paddingBottom: '10px',
                                borderBottom: '2px solid #E5E7EB'
                            }}>
                                📝 Dados da Acusação
                            </h2>

                            {/* Etapa */}
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
                                    Etapa (T{TEMPORADA_ATUAL}) <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <select
                                    value={formData.etapa}
                                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Selecione a etapa...</option>
                                    {etapasCalendario.map(e => (
                                        <option key={e.round} value={e.round} style={{ background: '#374151' }}>
                                            Etapa {e.round.toString().padStart(2, '0')} - {e.circuit} ({e.date})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Piloto Acusado */}
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
                                    Piloto Acusado <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <select
                                    value={formData.pilotoAcusado}
                                    onChange={handlePilotoAcusadoChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Selecione o piloto acusado...</option>
                                    {pilotosGrid.map(p => (
                                        <option key={p.nome} value={p.nome} style={{ background: '#374151' }}>
                                            {p.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Info do Acusado (aparece após seleção) */}
                            {pilotoAcusadoSelecionado && (
                                <div style={{
                                    background: '#FEE2E2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '8px',
                                    padding: '15px 20px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        background: '#1F2937',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                        <img 
                                            src={getFotoUrl(pilotoAcusadoSelecionado)}
                                            alt={pilotoAcusadoSelecionado.nome}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => handleFotoError(e, pilotoAcusadoSelecionado)}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.7rem', color: '#991B1B', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Piloto Acusado</p>
                                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937', margin: '3px 0 0 0' }}>
                                            {pilotoAcusadoSelecionado.nome}
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '2px 0 0 0' }}>
                                            Gamertag: <strong>{pilotoAcusadoSelecionado.gamertag || '-'}</strong>
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '2px 0 0 0' }}>
                                            📱 WhatsApp: <strong style={{ color: '#16A34A' }}>{pilotoAcusadoSelecionado.whatsapp || '-'}</strong>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
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
                                    Descrição do Lance <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <textarea
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                    placeholder="Descreva detalhadamente o que ocorreu no lance. Inclua informações como volta, curva, e o que aconteceu..."
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        minHeight: '120px',
                                        resize: 'vertical',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Link do Vídeo (OBRIGATÓRIO) */}
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '700', 
                                    color: '#374151', 
                                    marginBottom: '8px', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px' 
                                }}>
                                    🎥 Link do Vídeo <span style={{ color: '#EF4444' }}>* (Obrigatório)</span>
                                </label>
                                <input
                                    type="url"
                                    value={formData.videoLink}
                                    onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=... ou https://streamable.com/..."
                                    required
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
                                <p style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#991B1B', 
                                    marginTop: '8px',
                                    fontWeight: '600'
                                }}>
                                    ⚠️ O link do vídeo é obrigatório para validar a acusação
                                </p>
                            </div>

                            {/* Aviso */}
                            <div style={{
                                padding: '15px 18px',
                                background: '#FEF3C7',
                                border: '1px solid #F59E0B',
                                borderRadius: '8px',
                                marginBottom: '25px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px'
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#92400E', margin: 0, fontWeight: '600' }}>
                                        Atenção
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#78350F', margin: '5px 0 0 0', lineHeight: '1.5' }}>
                                        Após o envio, você receberá uma cópia do formulário no seu WhatsApp. 
                                        Acusações falsas ou sem fundamento podem resultar em penalidades.
                                    </p>
                                </div>
                            </div>

                            {/* Botão Enviar */}
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: submitting 
                                        ? '#9CA3AF' 
                                        : 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '1.05rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: submitting ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                {submitting ? (
                                    <>⏳ Enviando...</>
                                ) : (
                                    <>⚖️ Enviar Acusação</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de Sucesso */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '40px',
                        textAlign: 'center',
                        maxWidth: '420px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ 
                            fontSize: '4rem', 
                            marginBottom: '20px'
                        }}>✅</div>
                        <h2 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '900', 
                            color: '#059669', 
                            marginBottom: '15px' 
                        }}>
                            Acusação Enviada!
                        </h2>
                        <p style={{ 
                            color: '#4B5563', 
                            fontSize: '0.95rem', 
                            lineHeight: '1.6',
                            marginBottom: '10px'
                        }}>
                            Sua acusação foi registrada com sucesso e será analisada pelos Stewards.
                        </p>
                        <p style={{ 
                            color: '#059669', 
                            fontSize: '0.85rem', 
                            fontWeight: '600'
                        }}>
                            📱 Uma cópia foi enviada para seu WhatsApp
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FormularioAcusacao;
