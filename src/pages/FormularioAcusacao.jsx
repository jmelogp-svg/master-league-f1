import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { usePilotosData, useCalendarioT20, canSubmitAcusacao, calcLightDate } from '../hooks/useAnalises';
import { notifyAdminNewAccusation, notifyAccusedDefenseRequest, notifyAccusatorAnalysisOpened } from '../utils/emailService';
import { getVideoEmbedUrl } from '../utils/videoEmbed';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import '../index.css';
import './FormularioAcusacaoDefesa.css';

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

// Função getVideoEmbedUrl agora importada de utils/videoEmbed.js

function FormularioAcusacao() {
    const navigate = useNavigate();
    const { showAlert, showConfirm, alertState } = useCustomAlert();
    const { pilotos: pilotosInscritos, loading: loadingPilotos } = usePilotosData();
    const { etapas: etapasRaw, loading: loadingCalendario } = useCalendarioT20();
    
    const [pilotoLogado, setPilotoLogado] = useState(null);
    const [selectedGrid, setSelectedGrid] = useState(null);
    const [defaultGrid, setDefaultGrid] = useState(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Remover etapas duplicadas baseado no round e ajustar datas para o Grid Light
    const effectiveGrid = selectedGrid || pilotoLogado?.grid || 'carreira';

    const normalizeName = (name) => (name || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const etapasCalendario = (etapasRaw || [])
        .filter((etapa, index, self) =>
            index === self.findIndex(e => e.round === etapa.round)
        )
        .map(etapa => {
            // Se o piloto for do Grid Light, ajustar a data (quinta -> segunda)
            if (effectiveGrid === 'light') {
                return {
                    ...etapa,
                    date: calcLightDate(etapa.date)
                };
            }
            return etapa;
        });
    
    // Debug: verificar se etapas estão sendo carregadas
    useEffect(() => {
        console.log('📅 Etapas carregadas:', {
            etapasRaw: etapasRaw?.length || 0,
            etapasCalendario: etapasCalendario.length,
            etapas: etapasCalendario.map(e => ({ round: e.round, circuit: e.circuit }))
        });
    }, [etapasRaw, etapasCalendario]);
    
    // Estados do formulário
    const [pilotosGrid, setPilotosGrid] = useState([]);
    const [pilotoAcusadoSelecionado, setPilotoAcusadoSelecionado] = useState(null);
    const [codigoLance, setCodigoLance] = useState(null);
    
    const [formData, setFormData] = useState({
        tipoSolicitacao: 'acusacao', // 'acusacao' ou 'retirada_bug'
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
                    setDefaultGrid(pilotoEncontrado.grid || 'carreira');
                    setSelectedGrid(prev => prev || pilotoEncontrado.grid || 'carreira');
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
                        setDefaultGrid(pilotoData.grid || 'carreira');
                        setSelectedGrid(prev => prev || pilotoData.grid || 'carreira');
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
                            setDefaultGrid(profileData.grid || 'carreira');
                            setSelectedGrid(prev => prev || profileData.grid || 'carreira');
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

    // Carregar pilotos do mesmo grid (exceto o próprio)
    useEffect(() => {
        if (!pilotoLogado || loadingPilotos || pilotosInscritos.length === 0) return;
        
        // Usar effectiveGrid se selectedGrid não estiver definido
        const gridParaFiltrar = selectedGrid || pilotoLogado?.grid || 'carreira';
        
        if (!gridParaFiltrar) {
            console.warn('⚠️ Grid não definido para filtrar pilotos');
            return;
        }

        const pilotosDoGrid = pilotosInscritos
            .filter(p => {
                const gridPiloto = (p.grid || '').toLowerCase();
                return gridPiloto === gridParaFiltrar.toLowerCase() && normalizeName(p.nome) !== normalizeName(pilotoLogado.nome);
            })
            .sort((a, b) => a.nome.localeCompare(b.nome));

        console.log('👥 Pilotos do grid', gridParaFiltrar, ':', pilotosDoGrid.length, pilotosDoGrid.map(p => p.nome));
        setPilotosGrid(pilotosDoGrid);
    }, [pilotoLogado, pilotosInscritos, loadingPilotos, selectedGrid]);

    const gridsDisponiveis = pilotoLogado ? Array.from(new Set(
        pilotosInscritos
            .filter(p => normalizeName(p.nome) === normalizeName(pilotoLogado.nome))
            .map(p => p.grid || pilotoLogado.grid)
    )) : [];

    const handleGridChange = async (e) => {
        const novoGrid = e.target.value;
        if (novoGrid === selectedGrid) return;
        if (defaultGrid && novoGrid !== defaultGrid) {
            const confirmado = await showConfirm(
                'Você está selecionando um grid no qual não é titular. Deseja continuar?',
                'Confirmar mudança de grid'
            );
            if (!confirmado) return;
        }
        setSelectedGrid(novoGrid);
        setFormData(prev => ({ ...prev, pilotoAcusado: '' }));
        setPilotoAcusadoSelecionado(null);
    };

    // Quando o tipo de solicitação muda, setar automaticamente o responsável
    useEffect(() => {
        if (formData.tipoSolicitacao === 'retirada_bug') {
            // Se for retirada de bug, setar automaticamente "Administração Master League F1"
            if (formData.pilotoAcusado !== 'Administração Master League F1') {
                setFormData(prev => ({ ...prev, pilotoAcusado: 'Administração Master League F1' }));
                setPilotoAcusadoSelecionado(null);
            }
        } else {
            // Se mudar para acusação normal e estiver com "Administração Master League F1", limpar
            if (formData.pilotoAcusado === 'Administração Master League F1') {
                setFormData(prev => ({ ...prev, pilotoAcusado: '' }));
                setPilotoAcusadoSelecionado(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.tipoSolicitacao]);

    // Quando seleciona piloto acusado, carrega seus dados
    const handlePilotoAcusadoChange = (e) => {
        const nomeAcusado = e.target.value;
        setFormData({ ...formData, pilotoAcusado: nomeAcusado });
        
        // Se for "Administração Master League F1", não buscar dados de piloto
        if (nomeAcusado === 'Administração Master League F1') {
            setPilotoAcusadoSelecionado(null);
            return;
        }
        
        const piloto = pilotosGrid.find(p => p.nome === nomeAcusado);
        setPilotoAcusadoSelecionado(piloto || null);
    };

    // Enviar acusação
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.etapa || !formData.pilotoAcusado || !formData.descricao || !formData.videoLink) {
            await showAlert('Por favor, preencha todos os campos obrigatórios, incluindo o link do vídeo.', 'Aviso');
            return;
        }

        // Validar deadline
        if (pilotoLogado && !canSubmitAcusacao(effectiveGrid)) {
            const mensagem = effectiveGrid === 'light' 
                ? '❌ Prazo para envio de acusação encerrado!\n\nGrid Light: Acusações podem ser enviadas de Segunda 20:15h até Terça 20:00h BRT.'
                : '❌ Prazo para envio de acusação encerrado!\n\nGrid Carreira: Acusações podem ser enviadas até Sexta 20:00h BRT.';
            await showAlert(mensagem, 'Prazo Encerrado');
            return;
        }

        setSubmitting(true);

        try {
            // Gerar código único do lance
            const codigo = await gerarCodigoLance(effectiveGrid, TEMPORADA_ATUAL);
            setCodigoLance(codigo);
            console.log('📋 Código do lance gerado:', codigo);

            // Preparar dados da acusação
            const etapaSelecionada = etapasCalendario.find(e => e.round === parseInt(formData.etapa));
            const videoEmbed = getVideoEmbedUrl(formData.videoLink);
            
            // 🔔 ENVIAR NOTIFICAÇÃO AUTOMÁTICA AO ADMIN (não requer ação do piloto)
            const dadosAcusacao = {
                codigoLance: codigo,
                grid: effectiveGrid, // Grid no nível raiz para facilitar filtros
                acusador: {
                    nome: pilotoLogado.nome,
                    gamertag: pilotoLogado.gamertag,
                    whatsapp: pilotoLogado.whatsapp,
                    email: pilotoLogado.email,
                    grid: effectiveGrid,
                },
                acusado: {
                    nome: pilotoAcusadoSelecionado?.nome || formData.pilotoAcusado,
                    gamertag: pilotoAcusadoSelecionado?.gamertag || '-',
                    whatsapp: pilotoAcusadoSelecionado?.whatsapp || '-',
                    email: pilotoAcusadoSelecionado?.email || null,
                },
                etapa: etapaSelecionada || { round: formData.etapa, circuit: '-' },
                descricao: formData.descricao,
                videoLink: formData.videoLink,
                videoEmbed: videoEmbed,
                temporada: TEMPORADA_ATUAL,
                dataEnvio: new Date().toISOString(),
                tipoSolicitacao: formData.tipoSolicitacao,
                // Se for retirada de bug, pular defesa e ir direto para aguardando análise
                status: formData.tipoSolicitacao === 'retirada_bug' ? 'aguardando_analise' : 'aguardando_defesa',
            };

            // Envia automaticamente para o admin (background, não bloqueia)
            notifyAdminNewAccusation(dadosAcusacao)
                .then(result => console.log('📨 Notificação ao admin:', result))
                .catch(err => console.warn('⚠️ Erro notificação admin:', err));

            // 🔔 Notificar PILOTO ACUSADOR que a análise foi aberta
            notifyAccusatorAnalysisOpened({
                dadosAcusacao,
                acusador: {
                    nome: pilotoLogado.nome,
                    email: pilotoLogado.email,
                    whatsapp: pilotoLogado.whatsapp,
                },
            })
                .then(result => console.log('📨 Notificação ao acusador (análise aberta):', result))
                .catch(err => console.warn('⚠️ Erro notificação acusador:', err));

            // 🔔 Notificar PILOTO ACUSADO para enviar DEFESA (apenas acusação normal)
            if (dadosAcusacao.status === 'aguardando_defesa') {
                notifyAccusedDefenseRequest({
                    dadosAcusacao,
                    acusado: {
                        nome: pilotoAcusadoSelecionado?.nome || formData.pilotoAcusado,
                        email: pilotoAcusadoSelecionado?.email || null,
                        whatsapp: pilotoAcusadoSelecionado?.whatsapp || null,
                    },
                })
                    .then(result => console.log('📨 Notificação ao acusado (defesa):', result))
                    .catch(err => console.warn('⚠️ Erro notificação acusado:', err));
            }
            
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
            await showAlert('Erro ao enviar acusação. Tente novamente.', 'Erro');
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

    // Só mostrar loading se ainda estiver carregando dados essenciais
    if (loadingPage || (loadingPilotos && pilotosInscritos.length === 0)) {
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
                        Voltar ao Motorhome
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="form-steward-page" style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-dark-main)', 
            color: 'white', 
            padding: '80px 20px 40px',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div className="form-steward-container" style={{ maxWidth: '750px', margin: '0 auto' }}>
                
                {/* Header */}
                <div className="form-steward-header" style={{ 
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
                <div className="form-steward-card" style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    color: '#1a1a1a',
                    overflow: 'hidden'
                }}>
                    {/* Cabeçalho Vermelho */}
                    <div className="form-steward-card-header" style={{
                        background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                        padding: '20px 30px',
                        textAlign: 'center'
                    }}>
                        <h1 className="form-steward-card-title" style={{ 
                            fontSize: '1.3rem', 
                            fontWeight: '900', 
                            margin: 0,
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '3px'
                        }}>⚖️ Formulário de Acusação</h1>
                        <p className="form-steward-card-subtitle" style={{ 
                            fontSize: '0.8rem', 
                            color: 'rgba(255,255,255,0.8)', 
                            margin: '8px 0 0 0' 
                        }}>
                            Master League F1 - Direção de Prova - Temporada {TEMPORADA_ATUAL}
                        </p>
                    </div>

                    {/* Corpo do Documento */}
                    <div className="form-steward-card-body" style={{ padding: '35px 40px' }}>
                        
                        {/* Aviso se dados não estiverem carregados */}
                        {(etapasCalendario.length === 0 || pilotosGrid.length === 0) && !loadingCalendario && !loadingPilotos && (
                            <div style={{
                                background: '#FEF3C7',
                                border: '1px solid #F59E0B',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '20px',
                                color: '#92400E'
                            }}>
                                <strong>⚠️ Atenção:</strong> {
                                    etapasCalendario.length === 0 && pilotosGrid.length === 0 
                                        ? 'Etapas e pilotos não foram carregados. Por favor, recarregue a página.'
                                        : etapasCalendario.length === 0 
                                            ? 'Etapas não foram carregadas. Por favor, recarregue a página.'
                                            : 'Pilotos não foram carregados. Por favor, recarregue a página.'
                                }
                            </div>
                        )}
                        
                        {/* SEÇÃO: TIPO DE SOLICITAÇÃO */}
                        <div style={{ marginBottom: '35px' }}>
                            <label style={{ 
                                display: 'block', 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                color: '#374151', 
                                marginBottom: '8px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px' 
                            }}>
                                Tipo de Solicitação <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <select
                                className="form-steward-select"
                                value={formData.tipoSolicitacao}
                                onChange={(e) => {
                                    setFormData({ ...formData, tipoSolicitacao: e.target.value });
                                    // O useEffect vai cuidar de setar/limpar o pilotoAcusado automaticamente
                                }}
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
                                <option value="acusacao" style={{ background: '#374151' }}>Acusação Normal</option>
                                <option value="retirada_bug" style={{ background: '#374151' }}>Retirada de Bug do Jogo</option>
                            </select>
                        </div>
                        
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
                            
                            <div className="form-steward-acusador-row" style={{ 
                                display: 'flex', 
                                gap: '25px',
                                alignItems: 'flex-start'
                            }}>
                                {/* Foto 3x4 */}
                                <div className="form-steward-acusador-foto" style={{
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
                                <div className="form-steward-acusador-info" style={{ flex: 1 }}>
                                    <div className="form-steward-info-grid" style={{ 
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
                                        <div className="span-2" style={{ gridColumn: 'span 2' }}>
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

                            {gridsDisponiveis.length > 1 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '700', 
                                        color: '#374151', 
                                        marginBottom: '8px', 
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>Grid selecionado</label>
                                    <select
                                        className="form-steward-select"
                                        value={selectedGrid}
                                        onChange={handleGridChange}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
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
                                        {gridsDisponiveis.map(grid => (
                                            <option key={grid} value={grid} style={{ background: '#374151' }}>
                                                {grid.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <p style={{
                                        marginTop: '8px',
                                        fontSize: '0.75rem',
                                        color: '#6B7280'
                                    }}>
                                        Padrão: {defaultGrid ? defaultGrid.toUpperCase() : '-'} (grid titular)
                                    </p>
                                </div>
                            )}

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
                                    className="form-steward-select"
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
                                    {etapasCalendario.length === 0 ? (
                                        <option value="" disabled style={{ background: '#374151', color: '#9CA3AF' }}>
                                            {loadingCalendario ? 'Carregando etapas...' : 'Nenhuma etapa disponível'}
                                        </option>
                                    ) : (
                                        etapasCalendario.map(e => (
                                            <option key={e.round} value={e.round} style={{ background: '#374151' }}>
                                                Etapa {e.round.toString().padStart(2, '0')} - {e.circuit} ({e.date})
                                            </option>
                                        ))
                                    )}
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
                                    {formData.tipoSolicitacao === 'retirada_bug' ? 'Destinatário' : 'Piloto Acusado'} <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <select
                                    className="form-steward-select"
                                    value={formData.pilotoAcusado}
                                    onChange={handlePilotoAcusadoChange}
                                    required
                                    disabled={formData.tipoSolicitacao === 'retirada_bug'}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: formData.tipoSolicitacao === 'retirada_bug' ? '#1E293B' : '#374151',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: formData.tipoSolicitacao === 'retirada_bug' ? '#64748B' : 'white',
                                        fontFamily: "'Montserrat', sans-serif",
                                        fontSize: '0.95rem',
                                        cursor: formData.tipoSolicitacao === 'retirada_bug' ? 'not-allowed' : 'pointer',
                                        outline: 'none',
                                        opacity: formData.tipoSolicitacao === 'retirada_bug' ? 0.7 : 1
                                    }}
                                >
                                    <option value="">Selecione {formData.tipoSolicitacao === 'retirada_bug' ? 'o destinatário' : 'o piloto acusado'}...</option>
                                    {pilotosGrid.length === 0 ? (
                                        <option value="" disabled style={{ background: '#374151', color: '#9CA3AF' }}>
                                            {loadingPilotos || !selectedGrid ? 'Carregando pilotos...' : 'Nenhum piloto disponível neste grid'}
                                        </option>
                                    ) : (
                                        pilotosGrid.map(p => (
                                            <option key={p.nome} value={p.nome} style={{ background: '#374151' }}>
                                                {p.nome}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Info do Acusado (aparece após seleção) */}
                            {formData.pilotoAcusado === 'Administração Master League F1' ? (
                                <div style={{
                                    background: '#DBEAFE',
                                    border: '1px solid #93C5FD',
                                    borderRadius: '8px',
                                    padding: '15px 20px',
                                    marginTop: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}>
                                    <div style={{ fontSize: '2rem' }}>🏛️</div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.7rem', color: '#1E40AF', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Destinatário</p>
                                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937', margin: '3px 0 0 0' }}>
                                            Administração Master League F1
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '2px 0 0 0' }}>
                                            Este lance não requer defesa e irá direto para análise dos jurados.
                                        </p>
                                    </div>
                                </div>
                            ) : pilotoAcusadoSelecionado && (
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
                                    className="form-steward-textarea"
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
                                    className="form-steward-input"
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
                                className="form-steward-btn-submit"
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
                <div className="form-steward-modal" style={{
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
                    <div className="form-steward-modal-inner" style={{
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

export default FormularioAcusacao;
