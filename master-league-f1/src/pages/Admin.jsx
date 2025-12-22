import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import VideoEmbed from '../components/VideoEmbed';
import { clearLeagueDataCache } from '../hooks/useLeagueData';
import '../index.css';

function Admin() {
    // Removido scroll automático - deixar usuário controlar a posição da tela
    // O scroll só será resetado se o usuário recarregar a página manualmente
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [activeTab, setActiveTab] = useState('drivers');
    
    // Autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [realPassword, setRealPassword] = useState('1234'); 
    
    // NOVO: Estado do Checkbox
    const [keepConnected, setKeepConnected] = useState(false);

    const [showChangePass, setShowChangePass] = useState(false);
    const [newPass, setNewPass] = useState('');

    // Estados para Stewards/Notificações
    const [notificacoes, setNotificacoes] = useState([]);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [filtroNotificacao, setFiltroNotificacao] = useState('todas'); // 'todas', 'nao_lidas', 'lidas'
    const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'aguardando_defesa', 'aguardando_analise', 'analise_realizada'
    const [expandedLances, setExpandedLances] = useState({}); // { notifId: true/false }

    // Estados para Jurados
    const [jurados, setJurados] = useState([]);
    const [loadingJurados, setLoadingJurados] = useState(false);
    const [editingJurado, setEditingJurado] = useState(null); // { id, nome, email_google, whatsapp }
    const [savingJurado, setSavingJurado] = useState(false);

    // Estados para Narradores
    const [narradores, setNarradores] = useState([]);
    const [loadingNarradores, setLoadingNarradores] = useState(false);
    const [editingNarrador, setEditingNarrador] = useState(null); // { id, nome, email, whatsapp, senha }
    const [savingNarrador, setSavingNarrador] = useState(false);

    // Estados para Notícias (Upload de Imagens)
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedNewsId, setSelectedNewsId] = useState(1);

    // Estados para Edição de Usuários/Pilotos
    const [editingUser, setEditingUser] = useState(null); // { id, nome, email, grid, equipe, whatsapp, is_steward }
    const [savingUser, setSavingUser] = useState(false);
    
    // Estados para Cadastro de Novo Piloto
    const [showCadastroPiloto, setShowCadastroPiloto] = useState(false);
    const [novoPiloto, setNovoPiloto] = useState({
        tipo_piloto: 'ativo', // 'ativo' ou 'ex-piloto'
        nome: '',
        email: '',
        whatsapp: '',
        grid: 'light', // 'carreira' ou 'light'
        equipe: '',
        gamertag: ''
    });
    const [salvandoPiloto, setSalvandoPiloto] = useState(false);

    // Toggle para expandir/colapsar gaveta + marcar como lida automaticamente
    // Ao abrir uma gaveta, fecha todas as outras
    const toggleLance = async (notifId, isLido, event) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:41',message:'toggleLance ENTRY',data:{notifId,isLido,currentExpanded:Object.keys(expandedLances),expandedCount:Object.keys(expandedLances).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        // Prevenir comportamento padrão
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // O DisableAutoScroll cuida de preservar o scroll
        const isOpening = !expandedLances[notifId];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:49',message:'Before setExpandedLances',data:{notifId,isOpening,willExpand:isOpening ? { [notifId]: true } : {}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        // Se está abrindo, fecha todas as outras e abre apenas esta
        // Se está fechando, apenas fecha esta
        setExpandedLances(isOpening ? { [notifId]: true } : {});
        
        // Se está abrindo e não está lida, marca como lida
        if (isOpening && !isLido) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:56',message:'Calling marcarComoLida',data:{notifId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            await marcarComoLida(notifId);
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:58',message:'toggleLance EXIT',data:{notifId,isOpening},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
    };
    
    // Salvar posição do scroll (o DisableAutoScroll cuida do bloqueio)
    const scrollPositionRef = useRef(null);
    
    useEffect(() => {
        // Apenas salvar posição do scroll - o DisableAutoScroll bloqueia scroll automático
        let scrollTimeout = null;
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            scrollPositionRef.current = scrollY;
            
            // Throttle: salvar apenas a cada 200ms
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (scrollY > 0) {
                    sessionStorage.setItem('admin_scroll_position', scrollY.toString());
                }
            }, 200);
        };
        
        // Salvar posição antes de sair
        const handleBeforeUnload = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            if (scrollY > 0) {
                sessionStorage.setItem('admin_scroll_position', scrollY.toString());
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []); // Executar apenas uma vez ao montar o componente

    // Resetar gavetas ao mudar de aba
    useEffect(() => {
        // O DisableAutoScroll cuida de preservar o scroll
        setExpandedLances({});
    }, [activeTab]);

    // 1. INICIALIZAÇÃO E VERIFICAÇÃO DE LOGIN SALVO
    useEffect(() => {
        const init = async () => {
            // Busca senha real
            const { data } = await supabase.from('app_config').select('value').eq('key', 'admin_password').single();
            if (data) setRealPassword(data.value);

            // Verifica sessão Google (Opcional, mas mantido)
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                navigate('/login');
                return;
            }

            // --- AQUI ESTÁ A MÁGICA DA PERSISTÊNCIA ---
            const savedAuth = localStorage.getItem('ml_admin_auth');
            if (savedAuth === 'true') {
                setIsAuthenticated(true);
            }
            
            setLoading(false);
        };
        init();
    }, [navigate]);

    // 2. CARREGA DADOS QUANDO AUTENTICADO
    useEffect(() => {
        if (isAuthenticated) {
            fetchAllUsers();
            fetchNotificacoes();
        }
    }, [isAuthenticated]);

    // Carregar notificações quando mudar para aba stewards + auto-refresh a cada 10 segundos
    useEffect(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:149',message:'useEffect stewards ENTRY',data:{isAuthenticated,activeTab,notificacoesCount:notificacoes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        if (isAuthenticated && activeTab === 'stewards') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:154',message:'Calling fetchNotificacoes (first load)',data:{isBackgroundUpdate:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            // Primeira carga: Mostra loading normal
            fetchNotificacoes(false);
            
            // Auto-refresh a cada 10 segundos para capturar mudanças de status
            // #region agent log
            const intervalId = setInterval(() => {
                fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:160',message:'Auto-refresh interval triggered',data:{isBackgroundUpdate:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // Atualizações seguintes: NÃO mostra loading (silencioso)
                fetchNotificacoes(true);
            }, 10000);
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:159',message:'Interval created',data:{intervalId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            return () => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:166',message:'Cleaning up interval',data:{intervalId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                clearInterval(intervalId);
            };
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:170',message:'useEffect stewards EXIT',data:{conditionMet:isAuthenticated && activeTab === 'stewards'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
    }, [activeTab, isAuthenticated]);

    // Carregar jurados quando mudar para aba jurados
    useEffect(() => {
        if (isAuthenticated && activeTab === 'jurados') {
            fetchJurados();
        }
    }, [activeTab, isAuthenticated]);

    // Carregar narradores quando mudar para aba narradores
    useEffect(() => {
        if (isAuthenticated && activeTab === 'narradores') {
            fetchNarradores();
        }
    }, [activeTab, isAuthenticated]);

    const fetchAllUsers = async () => {
        // setLoading(true); // Comentado para não piscar a tela no refresh
        // Buscar pilotos da tabela 'pilotos' incluindo todos os campos necessários
        const { data, error } = await supabase
            .from('pilotos')
            .select('id, nome, email, whatsapp, grid, equipe, is_steward, tipo_piloto, status, nome_piloto_historico, senha_hash, gamertag, cod_idml, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pilotos:', error);
            // Tentar fallback para 'profiles' se 'pilotos' não existir
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!fallbackError) setUsersList(fallbackData || []);
        } else {
            setUsersList(data || []);
        }
        // setLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === realPassword) {
            setIsAuthenticated(true);
            // Salva no localStorage se o checkbox estiver marcado
            if (keepConnected) {
                localStorage.setItem('ml_admin_auth', 'true');
            }
        } else {
            alert('Senha incorreta.');
        }
    };

    // NOVO: Função de Logout para limpar a memória
    const handleLogoutAdmin = () => {
        localStorage.removeItem('ml_admin_auth'); // Limpa a chave
        setIsAuthenticated(false);
        setPasswordInput('');
    };

    const handleChangePassword = async () => {
        if (!newPass || newPass.length < 4) return alert("Mínimo 4 caracteres.");
        const { error } = await supabase.from('app_config').upsert({ key: 'admin_password', value: newPass });
        if (error) alert("Erro: " + error.message);
        else {
            setRealPassword(newPass);
            alert("Senha atualizada!");
            setShowChangePass(false);
            setNewPass('');
        }
    };

    // ===== FUNÇÕES DE JURADOS =====
    const fetchJurados = async () => {
        setLoadingJurados(true);
        try {
            const { data, error } = await supabase
                .from('jurados')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error('Erro ao buscar jurados:', error);
            } else {
                setJurados(data || []);
            }
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoadingJurados(false);
        }
    };

    const formatWhatsApp = (value) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        // Aplica máscara (00) 00000-0000
        if (numbers.length <= 2) {
            return `(${numbers}`;
        } else if (numbers.length <= 7) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
    };

    const handleEditJurado = (jurado) => {
        setEditingJurado({
            id: jurado.id,
            usuario: jurado.usuario,
            nome: jurado.nome || '',
            email_google: jurado.email_google || '',
            whatsapp: jurado.whatsapp || '',
            ativo: jurado.ativo || false
        });
    };

    const handleSaveJurado = async () => {
        if (!editingJurado) return;

        // Validações
        if (!editingJurado.nome.trim()) {
            alert('⚠️ Informe o nome do jurado!');
            return;
        }
        if (!editingJurado.email_google.trim()) {
            alert('⚠️ Informe o e-mail Google!');
            return;
        }
        if (!editingJurado.email_google.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingJurado.whatsapp || editingJurado.whatsapp.replace(/\D/g, '').length !== 11) {
            alert('⚠️ WhatsApp deve ter 11 dígitos! Ex: (11) 99999-9999');
            return;
        }

        setSavingJurado(true);
        try {
            const { error } = await supabase
                .from('jurados')
                .update({
                    nome: editingJurado.nome.trim(),
                    email_google: editingJurado.email_google.trim().toLowerCase(),
                    whatsapp: editingJurado.whatsapp,
                    ativo: editingJurado.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingJurado.id);

            if (error) throw error;

            alert('✅ Jurado atualizado com sucesso!');
            setEditingJurado(null);
            fetchJurados();
        } catch (err) {
            console.error('Erro ao salvar jurado:', err);
            alert('❌ Erro ao salvar: ' + err.message);
        } finally {
            setSavingJurado(false);
        }
    };

    const toggleJuradoAtivo = async (jurado) => {
        try {
            const { error } = await supabase
                .from('jurados')
                .update({ 
                    ativo: !jurado.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jurado.id);

            if (error) throw error;
            fetchJurados();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE NARRADORES =====
    const fetchNarradores = async () => {
        setLoadingNarradores(true);
        try {
            const { data, error } = await supabase
                .from('narradores')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error('Erro ao buscar narradores:', error);
            } else {
                setNarradores(data || []);
            }
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoadingNarradores(false);
        }
    };

    const handleEditNarrador = (narrador) => {
        setEditingNarrador({
            id: narrador.id,
            nome: narrador.nome || '',
            email: narrador.email || '',
            whatsapp: narrador.whatsapp || '',
            senha: '', // Não mostrar senha atual
            ativo: narrador.ativo !== false
        });
    };

    const handleSaveNarrador = async () => {
        if (!editingNarrador) return;

        // Validações
        if (!editingNarrador.nome.trim()) {
            alert('⚠️ Informe o nome do narrador!');
            return;
        }
        if (!editingNarrador.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingNarrador.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingNarrador.whatsapp || editingNarrador.whatsapp.trim().length < 10) {
            alert('⚠️ Informe um WhatsApp válido!');
            return;
        }

        setSavingNarrador(true);
        try {
            const updateData = {
                nome: editingNarrador.nome.trim(),
                email: editingNarrador.email.trim().toLowerCase(),
                whatsapp: editingNarrador.whatsapp.trim(),
                ativo: editingNarrador.ativo,
                updated_at: new Date().toISOString()
            };

            // Se foi informada uma nova senha, fazer hash SHA-256
            if (editingNarrador.senha && editingNarrador.senha.length > 0) {
                const encoder = new TextEncoder();
                const data = encoder.encode(editingNarrador.senha);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                updateData.senha_hash = hashHex;
                updateData.senha_definida = true;
            }

            const { error } = await supabase
                .from('narradores')
                .update(updateData)
                .eq('id', editingNarrador.id);

            if (error) throw error;

            alert('✅ Narrador atualizado com sucesso!');
            setEditingNarrador(null);
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao salvar narrador:', err);
            alert('❌ Erro ao salvar: ' + err.message);
        } finally {
            setSavingNarrador(false);
        }
    };

    const handleCreateNarrador = async () => {
        const novoNarrador = {
            nome: '',
            email: '',
            whatsapp: '',
            ativo: true
        };
        setEditingNarrador(novoNarrador);
    };

    const handleSaveNewNarrador = async () => {
        if (!editingNarrador) return;

        // Validações
        if (!editingNarrador.nome.trim()) {
            alert('⚠️ Informe o nome do narrador!');
            return;
        }
        if (!editingNarrador.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingNarrador.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (!editingNarrador.whatsapp || editingNarrador.whatsapp.trim().length < 10) {
            alert('⚠️ Informe um WhatsApp válido!');
            return;
        }

        setSavingNarrador(true);
        try {
            // Criar narrador sem senha - ele criará no primeiro acesso
            const { error } = await supabase
                .from('narradores')
                .insert({
                    nome: editingNarrador.nome.trim(),
                    email: editingNarrador.email.trim().toLowerCase(),
                    whatsapp: editingNarrador.whatsapp.trim(),
                    senha_hash: null,
                    senha_definida: false,
                    ativo: editingNarrador.ativo !== false
                });

            if (error) throw error;

            alert('✅ Narrador criado com sucesso! Ele receberá instruções para criar a senha no primeiro acesso.');
            setEditingNarrador(null);
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao criar narrador:', err);
            alert('❌ Erro ao criar: ' + err.message);
        } finally {
            setSavingNarrador(false);
        }
    };

    const toggleNarradorAtivo = async (narrador) => {
        try {
            const { error } = await supabase
                .from('narradores')
                .update({ 
                    ativo: !narrador.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', narrador.id);

            if (error) throw error;
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    const handleDeleteNarrador = async (narrador) => {
        if (!confirm(`Tem certeza que deseja excluir o narrador "${narrador.nome}"?`)) return;
        
        try {
            const { error } = await supabase
                .from('narradores')
                .delete()
                .eq('id', narrador.id);

            if (error) throw error;
            alert('✅ Narrador excluído com sucesso!');
            fetchNarradores();
        } catch (err) {
            console.error('Erro ao excluir narrador:', err);
            alert('❌ Erro: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE NOTIFICAÇÕES/STEWARDS =====
    const fetchNotificacoes = async (isBackgroundUpdate = false) => {
        // #region agent log
        const callId = Date.now();
        fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:345',message:'fetchNotificacoes ENTRY',data:{callId,currentNotificacoesCount:notificacoes.length,loadingNotificacoes,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        
        // SÓ mostre o loading se NÃO for uma atualização automática de fundo
        if (!isBackgroundUpdate) {
            setLoadingNotificacoes(true);
        }
        
        try {
            // Buscar apenas acusações (defesas são incorporadas dentro delas)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:353',message:'Before Supabase query',data:{callId,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const { data, error } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .order('created_at', { ascending: false });

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:362',message:'After Supabase query',data:{callId,hasError:!!error,dataCount:data?.length || 0,errorMessage:error?.message,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion

            if (error) {
                console.error('Erro ao buscar notificações:', error);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:366',message:'Error branch',data:{callId,error:error.message,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:371',message:'Before setNotificacoes',data:{callId,newDataCount:data?.length || 0,oldDataCount:notificacoes.length,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                setNotificacoes(data || []);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:375',message:'After setNotificacoes',data:{callId,setCount:data?.length || 0,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
            }
        } catch (err) {
            console.error('Erro:', err);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:380',message:'Catch block',data:{callId,error:err.message,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
        } finally {
            // Sempre desative o loading no final, caso tenha sido ativado
            if (!isBackgroundUpdate) {
                setLoadingNotificacoes(false);
            }
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Admin.jsx:387',message:'fetchNotificacoes EXIT',data:{callId,isBackgroundUpdate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
        }
    };

    const marcarComoLida = async (id) => {
        const { error } = await supabase
            .from('notificacoes_admin')
            .update({ lido: true })
            .eq('id', id);

        if (!error) {
            setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n));
        }
    };

    const marcarTodasComoLidas = async () => {
        const { error } = await supabase
            .from('notificacoes_admin')
            .update({ lido: true })
            .eq('lido', false);

        if (!error) {
            setNotificacoes(prev => prev.map(n => ({ ...n, lido: true })));
        }
    };

    const excluirNotificacao = async (id, codigoLance) => {
        // Solicita senha para excluir
        const senhaDigitada = prompt(`⚠️ ATENÇÃO: Você está prestes a EXCLUIR o lance ${codigoLance || ''}.\n\nEsta ação é IRREVERSÍVEL!\n\nDigite a senha de administrador para confirmar:`);
        
        if (!senhaDigitada) return; // Cancelou
        
        if (senhaDigitada !== realPassword) {
            alert('❌ Senha incorreta! Exclusão cancelada.');
            return;
        }
        
        const { error } = await supabase
            .from('notificacoes_admin')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotificacoes(prev => prev.filter(n => n.id !== id));
            alert('✅ Lance excluído com sucesso!');
        } else {
            alert('❌ Erro ao excluir o lance.');
        }
    };

    // ===== ENVIAR PARA JÚRI =====
    const enviarParaJuri = async (notifId, dados) => {
        if (!window.confirm(`Confirmar envio do lance ${dados.codigoLance} para análise do Júri?`)) return;
        
        try {
            const dadosAtualizados = {
                ...dados,
                status: 'aguardando_analise',
                enviadoParaJuri: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('notificacoes_admin')
                .update({ dados: dadosAtualizados })
                .eq('id', notifId);
            
            if (error) throw error;
            
            // Atualiza localmente
            setNotificacoes(prev => prev.map(n => 
                n.id === notifId ? { ...n, dados: dadosAtualizados } : n
            ));
            
            alert(`✅ Lance ${dados.codigoLance} enviado para o Júri!`);
            
        } catch (err) {
            console.error('Erro ao enviar para júri:', err);
            alert('❌ Erro ao enviar para o Júri: ' + err.message);
        }
    };

    // Filtra notificações baseado nos filtros selecionados
    const notificacoesFiltradas = notificacoes.filter(n => {
        // Filtro de leitura
        if (filtroNotificacao === 'nao_lidas' && n.lido) return false;
        if (filtroNotificacao === 'lidas' && !n.lido) return false;
        
        // Filtro de status
        if (filtroStatus !== 'todos') {
            const status = n.dados?.status || 'aguardando_defesa';
            if (status !== filtroStatus) return false;
        }
        
        return true;
    });

    // Conta não lidas para badge
    const countNaoLidas = notificacoes.filter(n => !n.lido).length;
    
    // Conta por status para badges
    const countPorStatus = {
        aguardando_defesa: notificacoes.filter(n => (n.dados?.status || 'aguardando_defesa') === 'aguardando_defesa').length,
        aguardando_analise: notificacoes.filter(n => n.dados?.status === 'aguardando_analise').length,
        analise_realizada: notificacoes.filter(n => n.dados?.status === 'analise_realizada').length,
    };

    const handleApprove = async (userId, nome) => {
        // Buscar dados completos do usuário - tentar primeiro 'pilotos', depois 'profiles'
        let userData = null;
        let tableName = 'pilotos';
        
        const { data: pilotosData, error: pilotosError } = await supabase
            .from('pilotos')
            .select('email, whatsapp, nome, status')
            .eq('id', userId)
            .single();
        
        if (!pilotosError && pilotosData) {
            userData = pilotosData;
            tableName = 'pilotos';
        } else {
            // Fallback para 'profiles'
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('email, whatsapp, nome_piloto, status')
                .eq('id', userId)
                .single();
            
            if (!profilesError && profilesData) {
                userData = profilesData;
                tableName = 'profiles';
            }
        }
        
        if (!userData) {
            alert('❌ Erro ao buscar dados do usuário. Tente novamente.');
            return;
        }
        
        const email = userData.email;
        const whatsapp = userData.whatsapp;
        const nomePiloto = userData.nome || userData.nome_piloto || nome;
        
        if (!window.confirm(`Aprovar acesso de ${nomePiloto}?\n\nUma notificação será enviada no WhatsApp com as instruções de login.`)) return;
        
        try {
            // Atualizar status para 'ativo' (pilotos) ou 'active' (profiles)
            const statusValue = tableName === 'pilotos' ? 'ativo' : 'active';
            const { error } = await supabase
                .from(tableName)
                .update({ status: statusValue })
                .eq('id', userId);
            
            if (error) {
                throw new Error(error.message);
            }
            
            // Enviar notificação WhatsApp se tiver WhatsApp cadastrado
            if (whatsapp && whatsapp !== '-') {
                try {
                    await enviarNotificacaoAprovacao(email, nomePiloto, whatsapp, false);
                    alert('✅ Piloto aprovado! Notificação WhatsApp enviada com sucesso.');
                } catch (notifError) {
                    console.error('Erro ao enviar WhatsApp:', notifError);
                    alert('⚠️ Piloto aprovado, mas houve erro ao enviar notificação WhatsApp: ' + notifError.message);
                }
            } else {
                alert('✅ Piloto aprovado! (WhatsApp não cadastrado, notificação não enviada)');
            }
            
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao aprovar piloto:', err);
            alert('❌ Erro ao aprovar: ' + err.message);
        }
    };

    const handleReset = async (userId, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar cadastro de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) { alert('Resetado!'); fetchAllUsers(); }
    };

    // Remover piloto completamente do cadastro
    const handleDeletePiloto = async (userId, nome, tableName) => {
        if (!window.confirm(`⚠️ ATENÇÃO: Remover piloto ${nome} permanentemente?\n\nEsta ação não pode ser desfeita. O piloto será removido do sistema.`)) return;
        
        try {
            // Verificar se há sessão do Supabase (necessário para RLS)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert('⚠️ Você precisa estar autenticado no Supabase para deletar pilotos.\n\nPor favor, faça login no site primeiro e depois tente novamente.');
                return;
            }
            // Verificar se há relacionamentos (acusações, defesas, etc.)
            if (tableName === 'pilotos') {
                const { data: acusacoes, error: acusacoesError } = await supabase
                    .from('acusacoes')
                    .select('id')
                    .or(`piloto_acusador_id.eq.${userId},piloto_acusado_id.eq.${userId}`)
                    .limit(1);
                
                const { data: defesas, error: defesasError } = await supabase
                    .from('defesas')
                    .select('id')
                    .eq('piloto_acusado_id', userId)
                    .limit(1);
                
                const { data: verdicts, error: verdictsError } = await supabase
                    .from('verdicts')
                    .select('id')
                    .eq('steward_id', userId)
                    .limit(1);
                
                if ((acusacoes && acusacoes.length > 0) || (defesas && defesas.length > 0) || (verdicts && verdicts.length > 0)) {
                    const relacionamentos = [];
                    if (acusacoes && acusacoes.length > 0) relacionamentos.push('acusações');
                    if (defesas && defesas.length > 0) relacionamentos.push('defesas');
                    if (verdicts && verdicts.length > 0) relacionamentos.push('vereditos');
                    
                    if (!window.confirm(`⚠️ Este piloto possui ${relacionamentos.join(', ')} relacionadas.\n\nPara deletar, é necessário primeiro remover ou atualizar esses registros.\n\nDeseja continuar mesmo assim? (A operação pode falhar se houver foreign keys sem CASCADE)`)) {
                        return;
                    }
                }
            }
            
            // Remover da tabela principal (pilotos ou profiles)
            // A sessão já foi verificada no início da função
            const { error: mainError, data: deleteData } = await supabase
                .from(tableName)
                .delete()
                .eq('id', userId)
                .select();
            
            if (mainError) {
                // Verificar se é erro de RLS
                if (mainError.message.includes('RLS') || mainError.message.includes('policy') || mainError.message.includes('permission')) {
                    throw new Error(`Erro de permissão (RLS): Você não tem permissão para deletar este registro. Verifique as políticas de Row Level Security no Supabase. É necessário criar uma política DELETE para a tabela ${tableName}.`);
                }
                // Verificar se é erro de foreign key
                if (mainError.message.includes('foreign key') || mainError.message.includes('constraint') || mainError.message.includes('violates')) {
                    throw new Error(`Não é possível deletar este piloto porque ele possui relacionamentos em outras tabelas (acusações, defesas, vereditos, etc.). É necessário primeiro remover ou atualizar esses registros, ou configurar ON DELETE CASCADE nas foreign keys.`);
                }
                throw new Error(mainError.message);
            }
            
            // Verificar se realmente deletou
            if (!deleteData || deleteData.length === 0) {
                throw new Error('Nenhum registro foi deletado. Verifique se o ID está correto ou se há problemas de permissão (RLS).');
            }

            // Se removeu de 'pilotos', também tentar remover de 'profiles' se existir
            if (tableName === 'pilotos') {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId);
                
                // Não tratar erro de profiles como crítico (pode não existir)
                if (profileError) {
                    console.warn('Aviso: Não foi possível remover de profiles:', profileError);
                }
            }

            alert(`✅ Piloto ${nome} removido com sucesso!`);
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao remover piloto:', err);
            alert('❌ Erro ao remover piloto:\n\n' + err.message + '\n\nVerifique o console para mais detalhes.');
        }
    };

    // ===== FUNÇÕES PARA EX-PILOTOS E APROVAÇÕES =====
    // Função auxiliar para enviar notificação WhatsApp
    const enviarNotificacaoAprovacao = async (email, nome, whatsapp, isExPiloto = false) => {
        // URL do site
        const siteUrl = 'https://www.masterleaguef1.com.br';
        const loginUrl = isExPiloto ? `${siteUrl}/ex-piloto/login` : `${siteUrl}/login`;

        // Mensagem diferente para pilotos ativos vs ex-pilotos
        const mensagem = isExPiloto 
            ? `✅ *ACESSO LIBERADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu acesso ao Painel do Piloto foi *APROVADO*!\n\n📋 *CADASTRE SUA SENHA E ACESSE:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Passos:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Digite seu e-mail:\n   ${email}\n\n3️⃣ Valide seu WhatsApp com o código que será enviado\n\n4️⃣ Crie sua senha de acesso\n\n5️⃣ Pronto! Você terá acesso ao seu painel histórico\n\n🏎️ Reveja a sua história na Master League F1`
            : `✅ *ACESSO APROVADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu cadastro foi *APROVADO* pela administração!\n\n🎉 *AGORA VOCÊ PODE ACESSAR SEU PAINEL:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Como fazer login:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Escolha:\n   • Entrar com Google\n   • Entrar com Microsoft (Hotmail/Outlook)\n\n3️⃣ Use seu e-mail:\n   ${email}\n\n4️⃣ Valide seu WhatsApp com o código que será enviado\n\n5️⃣ Pronto! Você terá acesso ao seu painel\n\n🏎️ Bem-vindo à Master League F1!`;
        
        // Usar a Edge Function para enviar WhatsApp
        const whatsappLimpo = whatsapp.replace(/\D/g, '');
        if (whatsappLimpo.length < 10) {
            throw new Error('WhatsApp inválido');
        }

        const { data, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email,
                whatsapp: whatsappLimpo,
                nomePiloto: nome,
                tipo: 'notificacao_aprovacao',
                mensagemCustomizada: mensagem
            }
        });
        
        if (whatsappError) {
            throw new Error(whatsappError.message || 'Erro ao enviar WhatsApp');
        }
        
        return data;
    };

    // Aprovar ex-piloto e enviar notificação WhatsApp
    const handleAprovarExPiloto = async (pilotoId, email, nome, whatsapp) => {
        if (!window.confirm(`Aprovar acesso do ex-piloto ${nome}?\n\nUma notificação será enviada no WhatsApp com as instruções de login.`)) return;
        
        try {
            // Atualizar status para 'ativo' (mantém tipo_piloto como 'ex-piloto')
            const { error: updateError } = await supabase
                .from('pilotos')
                .update({ status: 'ativo' })
                .eq('id', pilotoId);
            
            if (updateError) {
                throw new Error(updateError.message);
            }

            // Enviar notificação
            try {
                await enviarNotificacaoAprovacao(email, nome, whatsapp, true);
                alert('✅ Ex-piloto aprovado! Notificação WhatsApp enviada com sucesso.');
            } catch (notifError) {
                console.error('Erro ao enviar WhatsApp:', notifError);
                alert('⚠️ Ex-piloto aprovado, mas houve erro ao enviar notificação WhatsApp: ' + notifError.message);
            }

            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao aprovar ex-piloto:', err);
            alert('❌ Erro ao aprovar: ' + err.message);
        }
    };

    // Reenviar notificação de aprovação (para ex-pilotos já aprovados)
    const handleReenviarNotificacao = async (email, nome, whatsapp, isExPiloto = true) => {
        if (!window.confirm(`Reenviar notificação de aprovação para ${nome}?\n\nUma nova mensagem será enviada no WhatsApp.`)) return;
        
        try {
            await enviarNotificacaoAprovacao(email, nome, whatsapp, isExPiloto);
            alert('✅ Notificação reenviada com sucesso!');
        } catch (err) {
            console.error('Erro ao reenviar notificação:', err);
            alert('❌ Erro ao reenviar notificação: ' + err.message);
        }
    };

    // Cadastrar novo piloto
    const handleCadastrarPiloto = async () => {
        // Validações
        if (!novoPiloto.nome.trim()) {
            alert('❌ Por favor, preencha o nome do piloto.');
            return;
        }
        if (!novoPiloto.email.trim()) {
            alert('❌ Por favor, preencha o email do piloto.');
            return;
        }
        if (!novoPiloto.email.includes('@')) {
            alert('❌ Por favor, insira um email válido.');
            return;
        }

        setSalvandoPiloto(true);
        try {
            // Formatar nome: primeira letra de cada palavra maiúscula, demais minúsculas
            const nomeFormatado = capitalizeWords(novoPiloto.nome.trim());
            
            const dadosPiloto = {
                nome: nomeFormatado,
                email: novoPiloto.email.trim().toLowerCase(),
                whatsapp: novoPiloto.whatsapp.trim() || null,
                grid: novoPiloto.grid,
                equipe: novoPiloto.equipe.trim() || null,
                gamertag: novoPiloto.gamertag.trim() || null,
                tipo_piloto: novoPiloto.tipo_piloto === 'ex-piloto' ? 'ex-piloto' : null,
                status: novoPiloto.tipo_piloto === 'ex-piloto' ? 'pendente' : 'ativo',
                is_steward: false
            };

            const { data, error } = await supabase
                .from('pilotos')
                .insert(dadosPiloto)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Violação de constraint única
                    alert('❌ Este email já está cadastrado no sistema.');
                } else {
                    throw error;
                }
                return;
            }

            alert(`✅ Piloto cadastrado com sucesso!\n\n${novoPiloto.tipo_piloto === 'ex-piloto' ? 'Status: PENDENTE (aguardando aprovação)' : 'Status: ATIVO'}`);
            
            // Limpar formulário e fechar modal
            setNovoPiloto({
                tipo_piloto: 'ativo',
                nome: '',
                email: '',
                whatsapp: '',
                grid: 'light',
                equipe: '',
                gamertag: ''
            });
            setShowCadastroPiloto(false);
            
            // Atualizar lista
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao cadastrar piloto:', err);
            alert('❌ Erro ao cadastrar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSalvandoPiloto(false);
        }
    };

    // Resetar senha de ex-piloto
    const handleResetarSenhaExPiloto = async (pilotoId, email, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar senha do ex-piloto ${nome}?\n\nO piloto precisará criar uma nova senha no próximo login.`)) return;
        
        try {
            const { error } = await supabase
                .from('pilotos')
                .update({ senha_hash: null })
                .eq('id', pilotoId);
            
            if (error) {
                throw new Error(error.message);
            }

            alert('✅ Senha resetada! O piloto precisará criar uma nova senha no próximo login.');
            await fetchAllUsers();
        } catch (err) {
            console.error('Erro ao resetar senha:', err);
            alert('❌ Erro ao resetar senha: ' + err.message);
        }
    };

    // ===== FUNÇÕES DE EDIÇÃO DE USUÁRIOS =====
    // Função para capitalizar apenas a primeira letra de cada palavra
    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleEditUser = (user) => {
        setEditingUser({
            id: user.id,
            email_original: user.email || '', // Guardar email original para busca
            nome: user.nome_piloto || user.nome || '',
            email: user.email || '',
            grid: user.grid_preferencia || user.grid || 'carreira',
            equipe: user.equipe || '',
            whatsapp: user.whatsapp || '',
            is_steward: user.is_steward || false,
            nome_completo: user.nome_completo || '',
            gamertag: user.gamertag || ''
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Validações
        if (!editingUser.nome.trim()) {
            alert('⚠️ Informe o nome do piloto!');
            return;
        }
        if (!editingUser.email.trim()) {
            alert('⚠️ Informe o e-mail!');
            return;
        }
        if (!editingUser.email.includes('@')) {
            alert('⚠️ E-mail inválido!');
            return;
        }
        if (editingUser.whatsapp && editingUser.whatsapp.replace(/\D/g, '').length < 10) {
            alert('⚠️ WhatsApp inválido! Deve ter pelo menos 10 dígitos.');
            return;
        }

        setSavingUser(true);
        try {
            console.log('💾 Salvando usuário:', editingUser);
            
            // Preparar dados para atualização na tabela 'pilotos'
            const dadosAtualizacao = {
                nome: capitalizeWords(editingUser.nome.trim()),
                email: editingUser.email.trim().toLowerCase(),
                grid: editingUser.grid,
                equipe: editingUser.equipe || null,
                whatsapp: editingUser.whatsapp || null,
                is_steward: editingUser.is_steward || false,
                updated_at: new Date().toISOString()
            };

            console.log('📝 Dados para atualização:', dadosAtualizacao);

            // Verificar se o registro existe antes de atualizar
            let registroExiste = false;
            let registroAtual = null;
            
            if (editingUser.id) {
                console.log('🔍 Verificando se registro existe por ID:', editingUser.id);
                const { data: checkData, error: checkError } = await supabase
                    .from('pilotos')
                    .select('*')
                    .eq('id', editingUser.id)
                    .single();
                
                if (!checkError && checkData) {
                    registroExiste = true;
                    registroAtual = checkData;
                    console.log('✅ Registro encontrado por ID:', registroAtual);
                } else {
                    console.warn('⚠️ Registro não encontrado por ID:', checkError);
                }
            }
            
            // Se não encontrou por ID, tentar por email
            if (!registroExiste) {
                const emailParaBusca = editingUser.email_original || editingUser.email;
                if (emailParaBusca) {
                    console.log('🔍 Verificando se registro existe por email:', emailParaBusca);
                    const { data: checkData, error: checkError } = await supabase
                        .from('pilotos')
                        .select('*')
                        .eq('email', emailParaBusca.toLowerCase().trim())
                        .single();
                    
                    if (!checkError && checkData) {
                        registroExiste = true;
                        registroAtual = checkData;
                        console.log('✅ Registro encontrado por email:', registroAtual);
                    } else {
                        console.warn('⚠️ Registro não encontrado por email:', checkError);
                    }
                }
            }
            
            // Se o registro não existe, criar um novo
            if (!registroExiste) {
                console.log('📝 Registro não encontrado. Criando novo registro na tabela pilotos...');
                const { data: newData, error: insertError } = await supabase
                    .from('pilotos')
                    .insert(dadosAtualizacao)
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('❌ Erro ao criar novo registro:', insertError);
                    throw new Error(`Erro ao criar novo registro: ${insertError.message}`);
                } else {
                    console.log('✅ Novo registro criado com sucesso:', newData);
                    alert('✅ Novo piloto criado com sucesso no Supabase!');
                    setEditingUser(null);
                    await fetchAllUsers();
                    return;
                }
            }
            
            // Atualizar na tabela 'pilotos' usando ID (se disponível) ou email
            let pilotosError = null;
            let pilotosSuccess = false;
            
            if (registroAtual?.id) {
                console.log('🔍 Tentando atualizar pilotos por ID:', registroAtual.id);
                const { data, error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('id', registroAtual.id)
                    .select();
                
                pilotosError = error;
                pilotosSuccess = !error && data && data.length > 0;
                
                if (pilotosError) {
                    console.error('❌ Erro ao atualizar pilotos por ID:', pilotosError);
                    // Se erro de RLS, mostrar mensagem mais clara
                    if (pilotosError.code === 'PGRST301' || pilotosError.message?.includes('permission') || pilotosError.message?.includes('policy')) {
                        throw new Error(`Erro de permissão (RLS): Você não tem permissão para atualizar este registro. Verifique as políticas de Row Level Security no Supabase.`);
                    }
                } else if (pilotosSuccess) {
                    console.log('✅ Piloto atualizado na tabela pilotos por ID:', data);
                } else {
                    console.warn('⚠️ Nenhuma linha atualizada na tabela pilotos por ID');
                }
            }
            
            // Se não tem ID ou falhou, tentar por email
            if (!pilotosSuccess && registroAtual?.email) {
                console.log('🔍 Tentando atualizar pilotos por email:', registroAtual.email);
                const { data, error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('email', registroAtual.email.toLowerCase().trim())
                    .select();
                
                pilotosError = error;
                pilotosSuccess = !error && data && data.length > 0;
                
                if (pilotosError) {
                    console.error('❌ Erro ao atualizar pilotos por email:', pilotosError);
                    // Se erro de RLS, mostrar mensagem mais clara
                    if (pilotosError.code === 'PGRST301' || pilotosError.message?.includes('permission') || pilotosError.message?.includes('policy')) {
                        throw new Error(`Erro de permissão (RLS): Você não tem permissão para atualizar este registro. Verifique as políticas de Row Level Security no Supabase.`);
                    }
                } else if (pilotosSuccess) {
                    console.log('✅ Piloto atualizado na tabela pilotos por email:', data);
                } else {
                    console.warn('⚠️ Nenhuma linha atualizada na tabela pilotos por email');
                }
            }

            // Verificar se a atualização na tabela pilotos funcionou
            if (!pilotosSuccess) {
                const errorMsg = pilotosError?.message || 'Nenhuma linha foi atualizada na tabela pilotos. Verifique se o usuário existe no banco de dados ou se há problemas de permissão (RLS).';
                console.error('❌ Falha ao salvar na tabela pilotos:', { 
                    pilotosError, 
                    pilotosSuccess, 
                    editingUser,
                    dadosAtualizacao 
                });
                
                // Tentar verificar se o registro existe
                if (editingUser.id) {
                    const { data: checkData, error: checkError } = await supabase
                        .from('pilotos')
                        .select('id, email, nome')
                        .eq('id', editingUser.id)
                        .single();
                    
                    if (checkError || !checkData) {
                        console.error('❌ Registro não encontrado na tabela pilotos com ID:', editingUser.id);
                        throw new Error(`Registro não encontrado na tabela pilotos. O piloto pode não existir ou ter sido removido.`);
                    } else {
                        console.log('✅ Registro encontrado:', checkData);
                        throw new Error(`Não foi possível atualizar o registro. Verifique as permissões (RLS) ou se os dados estão corretos. Erro: ${errorMsg}`);
                    }
                } else {
                    throw new Error(errorMsg);
                }
            }

            // Se a atualização funcionou, mostrar sucesso
            console.log('✅ Piloto atualizado na tabela pilotos com sucesso!');
            
            // NOTA: Sincronização com Google Sheets
            // Para atualizar a planilha Google Sheets, seria necessário:
            // 1. Autenticação OAuth com Google Sheets API
            // 2. Encontrar a linha correspondente na planilha pelo email
            // 3. Atualizar os campos correspondentes
            // Por enquanto, a atualização é feita apenas no Supabase
            // A planilha pode ser sincronizada manualmente ou via script separado

            alert('✅ Usuário atualizado com sucesso no Supabase!');
            setEditingUser(null);
            await fetchAllUsers();
        } catch (err) {
            console.error('❌ Erro ao salvar usuário:', err);
            alert('❌ Erro ao salvar: ' + err.message);
        } finally {
            setSavingUser(false);
        }
    };

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando...</div>;

    // TELA DE BLOQUEIO
    if (!isAuthenticated) {
        return (
            <div className="page-wrapper">
                <div style={{maxWidth:'400px', margin:'100px auto', background:'#1E293B', padding:'40px', borderRadius:'16px', textAlign:'center', border:'1px solid #FFD700'}}>
                    <h1 style={{color:'#FFD700', marginBottom:'20px'}}>ÁREA RESTRITA</h1>
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Senha de Administrador" 
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)}
                            style={{width:'100%', padding:'12px', marginBottom:'20px', borderRadius:'8px', border:'none', background:'#0F172A', color:'white'}}
                        />
                        
                        {/* CHECKBOX MANTER CONECTADO */}
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', justifyContent:'flex-start'}}>
                            <input 
                                type="checkbox" 
                                id="keepLogged" 
                                checked={keepConnected} 
                                onChange={e => setKeepConnected(e.target.checked)}
                                style={{width:'auto', cursor:'pointer'}}
                            />
                            <label htmlFor="keepLogged" style={{color:'#CBD5E1', fontSize:'0.9rem', cursor:'pointer', userSelect:'none'}}>Manter conectado</label>
                        </div>

                        <button className="btn-primary" style={{width:'100%', background:'#FFD700', color:'#020617'}}>ENTRAR</button>
                    </form>
                </div>
            </div>
        );
    }

    // PAINEL LOGADO
    return (
        <div className="page-wrapper">
            <div style={{maxWidth:'1200px', margin:'40px auto', padding:'0 20px'}}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'20px'}}>
                    <div>
                        <h1 style={{fontSize:'2rem', fontWeight:'900', color:'#FFD700', fontStyle:'italic', margin:0}}>PAINEL <span style={{color:'white'}}>ADM</span></h1>
                    </div>
                    <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                        <button 
                            onClick={async () => {
                                if (window.confirm('Forçar sincronização de dados da planilha?\n\nIsso atualizará:\n- Classificação (Carreira e Light)\n- Nomes dos pilotos\n- Voltas rápidas\n\nA página será recarregada após a sincronização.')) {
                                    try {
                                        // Limpar cache local completamente
                                        clearLeagueDataCache();
                                        
                                        // Limpar cache do Supabase também (forçar atualização)
                                        try {
                                            // Invalidar cache do Supabase deletando e recriando
                                            const { error: deleteError } = await supabase
                                                .from('classificacao_cache')
                                                .delete()
                                                .in('grid', ['carreira', 'light']);
                                            
                                            if (deleteError) {
                                                console.warn('Aviso ao limpar cache do Supabase:', deleteError);
                                            }
                                        } catch (e) {
                                            console.warn('Erro ao limpar cache do Supabase:', e);
                                        }
                                        
                                        // Limpar localStorage completamente
                                        Object.keys(localStorage).forEach(key => {
                                            if (key.includes('cache') || key.includes('league') || key.includes('carreira') || key.includes('light')) {
                                                localStorage.removeItem(key);
                                            }
                                        });
                                        
                                        // Forçar sincronização do Supabase
                                        const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
                                        const { data: { session } } = await supabase.auth.getSession();
                                        
                                        if (session) {
                                            // Sincronizar ambos os grids
                                            const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${session.access_token}`
                                                },
                                                body: JSON.stringify({ 
                                                    sheetType: 'classificacao',
                                                    force: true,
                                                    season: 20
                                                })
                                            });
                                            
                                            if (response.ok) {
                                                alert('✅ Sincronização iniciada! Limpando cache e recarregando página em 3 segundos...\n\n⚠️ Se o nome ainda não atualizar, pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para limpar o cache do navegador.');
                                                setTimeout(() => {
                                                    // Forçar reload sem cache
                                                    window.location.reload(true);
                                                }, 3000);
                                            } else {
                                                const errorText = await response.text();
                                                console.error('Erro na sincronização:', errorText);
                                                alert('⚠️ Erro ao sincronizar. Recarregando página mesmo assim...\n\nPressione Ctrl+Shift+R para forçar atualização.');
                                                setTimeout(() => window.location.reload(true), 1000);
                                            }
                                        } else {
                                            alert('⚠️ Sessão expirada. Recarregando página para limpar cache local...\n\nPressione Ctrl+Shift+R para forçar atualização.');
                                            setTimeout(() => window.location.reload(true), 1000);
                                        }
                                    } catch (error) {
                                        console.error('Erro ao sincronizar:', error);
                                        alert('⚠️ Erro ao sincronizar. Recarregando página...');
                                        setTimeout(() => window.location.reload(), 1000);
                                    }
                                }
                            }}
                            className="btn-outline" 
                            style={{
                                fontSize:'0.8rem', 
                                padding:'8px 20px',
                                borderColor:'#FF9900',
                                color:'#FF9900',
                                background:'rgba(255, 153, 0, 0.1)'
                            }}
                            title="Forçar atualização dos dados da planilha Google Sheets"
                        >
                            🔄 SINCRONIZAR
                        </button>
                        <button onClick={() => setShowChangePass(!showChangePass)} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>SENHA</button>
                        {/* Botão de Logout do ADMIN */}
                        <button onClick={handleLogoutAdmin} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px', borderColor:'#EF4444', color:'#EF4444'}}>LOGOUT</button>
                        <button onClick={() => navigate('/')} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>VOLTAR SITE</button>
                    </div>
                </div>

                {showChangePass && (
                    <div style={{background:'rgba(255, 215, 0, 0.1)', padding:'20px', borderRadius:'12px', marginBottom:'30px', border:'1px solid #FFD700', display:'flex', alignItems:'center', gap:'15px'}}>
                        <input type="text" placeholder="Nova senha..." value={newPass} onChange={e => setNewPass(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.2)', background:'#020617', color:'white'}} />
                        <button onClick={handleChangePassword} className="btn-primary" style={{background:'#FFD700', color:'#020617'}}>SALVAR</button>
                    </div>
                )}

                <div className="adm-tabs">
                    <button className={`adm-tab-btn ${activeTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveTab('drivers')}>DRIVERS</button>
                    <button className={`adm-tab-btn ${activeTab === 'stewards' ? 'active' : ''}`} onClick={() => setActiveTab('stewards')}>
                        STEWARDS
                        {countNaoLidas > 0 && (
                            <span style={{
                                marginLeft: '8px',
                                background: '#EF4444',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 8px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                            }}>
                                {countNaoLidas}
                            </span>
                        )}
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'jurados' ? 'active' : ''}`} onClick={() => setActiveTab('jurados')}>
                        👨‍⚖️ JÚRI
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'narradores' ? 'active' : ''}`} onClick={() => setActiveTab('narradores')}>
                        🎙️ NARRADORES
                    </button>
                    <button className={`adm-tab-btn ${activeTab === 'noticias' ? 'active' : ''}`} onClick={() => setActiveTab('noticias')}>
                        📰 NOTÍCIAS
                    </button>
                    <button 
                        className="adm-tab-btn"
                        onClick={() => navigate('/resultados-corrida')}
                        style={{
                            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        🏁 RESULTADOS
                    </button>
                </div>

                {activeTab === 'drivers' && (
                    <div className="adm-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#F8FAFC' }}>👥 Pilotos Cadastrados</h3>
                            <button 
                                onClick={() => {
                                    setNovoPiloto({
                                        tipo_piloto: 'ativo',
                                        nome: '',
                                        email: '',
                                        whatsapp: '',
                                        grid: 'light',
                                        equipe: '',
                                        gamertag: ''
                                    });
                                    setShowCadastroPiloto(true);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                ➕ Cadastrar Piloto
                            </button>
                        </div>
                        <div className="adm-list-header">
                            <div style={{flex:2}}>PILOTO / NOME</div>
                            <div style={{flex:1}}>EQUIPE</div>
                            <div style={{flex:1}}>GRID</div>
                            <div style={{width:'100px', textAlign:'center'}}>STATUS</div>
                            <div style={{width:'180px', textAlign:'right'}}>AÇÕES</div>
                        </div>

                        {usersList.length === 0 ? (
                            <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Nenhum usuário.</div>
                        ) : (
                            <div className="adm-list-body">
                                {usersList.map(user => {
                                    // Adaptar para campos da tabela 'pilotos' ou 'profiles'
                                    const nome = user.nome || user.nome_piloto || 'Sem Nome';
                                    const email = user.email || '';
                                    const grid = user.grid || user.grid_preferencia || '-';
                                    const equipe = user.equipe || '-';
                                    const whatsapp = user.whatsapp || '-';
                                    const isSteward = user.is_steward || false;
                                    const isExPiloto = user.tipo_piloto === 'ex-piloto';
                                    // Para ex-pilotos, verificar se status é 'pendente'
                                    // Para 'profiles', verificar status 'pending'; para 'pilotos', verificar status 'pendente'
                                    const isPending = isExPiloto 
                                        ? (user.status === 'pendente' || user.status === 'pending')
                                        : (user.status === 'pending' || (!user.status && user.nome_piloto));
                                    
                                    return (
                                        <div key={user.id} className="adm-row">
                                            <div style={{flex:2}}>
                                                <div style={{fontWeight:'800', color:'white', fontSize:'1rem'}}>{nome}</div>
                                                <div style={{fontSize:'0.75rem', color:'#94A3B8'}}>{email}</div>
                                                {isSteward && <div style={{fontSize:'0.7rem', color:'#FFD700', marginTop:'2px'}}>👨‍⚖️ STEWARD</div>}
                                                {isExPiloto && <div style={{fontSize:'0.7rem', color:'#94A3B8', marginTop:'2px'}}>📜 EX-PILOTO</div>}
                                            </div>
                                            <div style={{flex:1, fontSize:'0.9rem', color:'#CBD5E1'}}>{equipe}</div>
                                            <div style={{flex:1, fontSize:'0.8rem', textTransform:'uppercase', fontWeight:'700', color:'var(--highlight-cyan)'}}>{grid}</div>
                                            
                                            <div style={{width:'100px', textAlign:'center'}}>
                                                <span className={`status-badge ${
                                                    isPending ? 'pending' : 
                                                    (isExPiloto ? 'inactive' : 'active')
                                                }`}>
                                                    {isPending ? 'PENDENTE' : (isExPiloto ? 'INATIVO' : 'ATIVO')}
                                                </span>
                                            </div>

                                            <div className="adm-row-actions">
                                                <button onClick={() => handleEditUser(user)} className="btn-icon-edit" title="Editar" style={{background:'rgba(59, 130, 246, 0.2)', border:'1px solid #3B82F6', color:'#3B82F6'}}>✏️</button>
                                                {isPending && isExPiloto && (
                                                    <button 
                                                        onClick={() => handleAprovarExPiloto(user.id, email, nome, whatsapp)} 
                                                        className="btn-icon-approve" 
                                                        title="Aprovar Ex-Piloto"
                                                        style={{background:'rgba(34, 197, 94, 0.2)', border:'1px solid #22C55E', color:'#22C55E'}}
                                                    >
                                                        ✅
                                                    </button>
                                                )}
                                                {isExPiloto && !isPending && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleReenviarNotificacao(email, nome, whatsapp)} 
                                                            className="btn-icon-approve" 
                                                            title="Reenviar Notificação"
                                                            style={{background:'rgba(59, 130, 246, 0.2)', border:'1px solid #3B82F6', color:'#3B82F6', marginRight:'5px'}}
                                                        >
                                                            📨
                                                        </button>
                                                        <button 
                                                            onClick={() => handleResetarSenhaExPiloto(user.id, email, nome)} 
                                                            className="btn-icon-reset" 
                                                            title="Resetar Senha"
                                                            style={{background:'rgba(245, 158, 11, 0.2)', border:'1px solid #F59E0B', color:'#F59E0B'}}
                                                        >
                                                            🔑
                                                        </button>
                                                    </>
                                                )}
                                                {!isExPiloto && isPending && (
                                                    <button onClick={() => handleApprove(user.id, nome)} className="btn-icon-approve" title="Aprovar">✅</button>
                                                )}
                                                {!isExPiloto && (
                                                    <button onClick={() => handleReset(user.id, nome)} className="btn-icon-reset" title="Resetar">🔄</button>
                                                )}
                                                {/* Botão de remover - disponível para todos */}
                                                <button 
                                                    onClick={() => {
                                                        // Determinar tabela: se tem tipo_piloto ou grid, é da tabela 'pilotos'
                                                        const tableName = (user.tipo_piloto !== undefined || user.grid) ? 'pilotos' : 'profiles';
                                                        handleDeletePiloto(user.id, nome, tableName);
                                                    }} 
                                                    className="btn-icon-delete" 
                                                    title="Remover Piloto"
                                                    style={{
                                                        background:'rgba(239, 68, 68, 0.2)', 
                                                        border:'1px solid #EF4444', 
                                                        color:'#EF4444',
                                                        marginLeft: '5px'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stewards' && (
                    <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <h3 style={{ margin: 0, color: '#F8FAFC' }}>
                                🚨 Notificações de Acusações
                                {countNaoLidas > 0 && (
                                    <span style={{ fontSize: '14px', color: '#94A3B8', marginLeft: '10px' }}>
                                        ({countNaoLidas} não lida{countNaoLidas > 1 ? 's' : ''})
                                    </span>
                                )}
                            </h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Filtro de Status */}
                                <select
                                    value={filtroStatus}
                                    onChange={(e) => setFiltroStatus(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        cursor: 'pointer',
                                        minWidth: '180px',
                                    }}
                                >
                                    <option value="todos">📊 Todos os Status</option>
                                    <option value="aguardando_defesa">⏳ Aguardando Defesa ({countPorStatus.aguardando_defesa})</option>
                                    <option value="aguardando_analise">🔍 Aguardando Análise ({countPorStatus.aguardando_analise})</option>
                                    <option value="analise_realizada">✅ Análise Realizada ({countPorStatus.analise_realizada})</option>
                                </select>
                                
                                {/* Filtro de Leitura */}
                                <select
                                    value={filtroNotificacao}
                                    onChange={(e) => setFiltroNotificacao(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="todas">📬 Todas</option>
                                    <option value="nao_lidas">🔴 Não Lidas</option>
                                    <option value="lidas">✓ Lidas</option>
                                </select>
                                
                                <button
                                    type="button"
                                    onClick={() => fetchNotificacoes(false)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#3B82F6',
                                        color: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    🔄 Atualizar
                                </button>
                                
                                {countNaoLidas > 0 && (
                                    <button
                                        type="button"
                                        onClick={marcarTodasComoLidas}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: '#22C55E',
                                            color: 'white',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ✓ Marcar todas como lidas
                                    </button>
                                )}
                                
                                {/* Botão Tribunal do Júri */}
                                <button
                                    onClick={() => navigate('/veredito')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                                    }}
                                >
                                    👨‍⚖️ Tribunal do Júri
                                </button>

                                {/* Botão Login Jurado Teste */}
                                <button
                                    onClick={() => navigate('/login-jurado-teste')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #F59E0B',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: '#F59E0B',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    🧪 Login Teste
                                </button>
                            </div>
                        </div>

                        {/* Lista de Notificações */}
                        {loadingNotificacoes ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                ⏳ Carregando notificações...
                            </div>
                        ) : notificacoesFiltradas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', border: '1px dashed #475569', borderRadius: '8px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                                <p>Nenhuma notificação {filtroNotificacao !== 'todas' ? `(${filtroNotificacao === 'nao_lidas' ? 'não lida' : 'lida'})` : ''}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {notificacoesFiltradas.map((notif) => {
                                    const dados = notif.dados || {};
                                    
                                    // Apenas acusações (defesas são incorporadas na acusação)
                                    const acusador = dados.acusador || {};
                                    const acusado = dados.acusado || {};
                                    const etapa = dados.etapa || {};
                                    const codigoLance = dados.codigoLance || 'N/A';
                                    const defesa = dados.defesa || null; // Defesa incorporada
                                    const status = dados.status || 'aguardando_defesa';
                                    const isExpanded = expandedLances[notif.id];
                                    
                                    // Determinar cor e texto baseado no status
                                    const getStatusInfo = () => {
                                        if (status === 'aguardando_analise') return { color: '#8B5CF6', text: 'AGUARDANDO ANÁLISE', icon: '⏳' };
                                        if (status === 'analise_realizada') return { color: '#22C55E', text: 'ANÁLISE REALIZADA', icon: '✅' };
                                        return { color: '#F59E0B', text: 'AGUARDANDO DEFESA', icon: '⚖️' };
                                    };
                                    
                                    const statusInfo = getStatusInfo();
                                    
                                    return (
                                        <div
                                            key={notif.id}
                                            style={{
                                                background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                                                border: `1px solid ${statusInfo.color}40`,
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {/* ===== PRÉVIA (GAVETA FECHADA) - Layout Compacto ===== */}
                                            <div 
                                                onClick={(e) => toggleLance(notif.id, notif.lido, e)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '12px 15px',
                                                    cursor: 'pointer',
                                                    gap: '12px',
                                                    transition: 'background 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Código do Lance */}
                                                <span style={{ 
                                                    background: '#E5E7EB',
                                                    color: '#1F2937',
                                                    padding: '5px 10px',
                                                    borderRadius: '5px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    🔖 {codigoLance}
                                                </span>

                                                {/* Badge de Status */}
                                                <span style={{ 
                                                    background: statusInfo.color,
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Data/Hora - Texto simples */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    📅 {new Date(notif.created_at).toLocaleDateString('pt-BR')} às {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Etapa e Circuito - Texto simples */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    🏁 Etapa {etapa.round} - {etapa.circuit || '-'}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Grid */}
                                                <span style={{ color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                    🎮 {dados.grid?.toUpperCase() || acusador.grid?.toUpperCase() || '-'} T{dados.temporada || '20'}
                                                </span>

                                                {/* Separador */}
                                                <span style={{ color: '#475569' }}>|</span>

                                                {/* Acusador vs Acusado - Texto simples */}
                                                <span style={{ color: '#E2E8F0', fontSize: '12px', flex: 1 }}>
                                                    <span style={{ color: '#EF4444' }}>👤 {acusador.nome || '-'}</span>
                                                    <span style={{ color: '#64748B', margin: '0 6px' }}>vs</span>
                                                    <span style={{ color: '#F59E0B' }}>⚖️ {acusado.nome || '-'}</span>
                                                </span>

                                                {/* Botões de ação e Seta */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                    {!notif.lido && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); marcarComoLida(notif.id); }}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                border: 'none',
                                                                background: '#22C55E',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ✓
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); excluirNotificacao(notif.id, codigoLance); }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            fontSize: '10px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                    {/* Seta de expandir/colapsar */}
                                                    <div style={{
                                                        color: '#94A3B8',
                                                        fontSize: '14px',
                                                        transition: 'transform 0.3s ease',
                                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        marginLeft: '4px',
                                                    }}>
                                                        ▼
                                                    </div>
                                                </div>

                                                {/* Badge NOVA */}
                                                {!notif.lido && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '0px',
                                                        right: '10px',
                                                        background: '#EF4444',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '0 0 6px 6px',
                                                        fontSize: '9px',
                                                        fontWeight: 'bold',
                                                    }}>
                                                        NOVA
                                                    </div>
                                                )}
                                            </div>

                                            {/* ===== CONTEÚDO EXPANDIDO (GAVETA ABERTA) ===== */}
                                            {isExpanded && (
                                                <div 
                                                    id={`lance-expanded-${notif.id}`}
                                                    style={{
                                                        padding: '0 20px 20px 20px',
                                                        borderTop: '1px solid #334155',
                                                        animation: 'slideDown 0.3s ease',
                                                        scrollMarginTop: '0 !important',
                                                        scrollMargin: '0 !important'
                                                    }}
                                                    onFocus={(e) => {
                                                        // Prevenir scroll automático ao focar em elementos dentro
                                                        e.stopPropagation();
                                                    }}
                                                    onClick={(e) => {
                                                        // Prevenir qualquer scroll ao clicar dentro
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {/* Cards de Acusador, Acusado e Detalhes */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                                                        {/* Acusador */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #EF4444', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>
                                                                👤 ACUSAÇÃO DE {acusador.nome?.toUpperCase() || '-'}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                GT: {acusador.gamertag || '-'}
                                                            </div>
                                                            {acusador.whatsapp && (
                                                                <a 
                                                                    href={`https://wa.me/55${acusador.whatsapp?.replace(/\D/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#22C55E', fontSize: '12px', textDecoration: 'none' }}
                                                                >
                                                                    📱 {acusador.whatsapp}
                                                                </a>
                                                            )}
                                                            <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                📅 {new Date(new Date(notif.created_at).getTime() - 3 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} às {new Date(new Date(notif.created_at).getTime() - 3 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Brasília)
                                                            </div>
                                                        </div>

                                                        {/* Acusado / Defesa */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: defesa ? '3px solid #22C55E' : '3px solid #F59E0B', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: defesa ? '#6EE7B7' : '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>
                                                                {defesa ? `🛡️ DEFESA DE ${acusado.nome?.toUpperCase() || '-'}` : `⚖️ ACUSADO: ${acusado.nome?.toUpperCase() || '-'}`}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                GT: {acusado.gamertag || '-'}
                                                            </div>
                                                            {acusado.whatsapp && acusado.whatsapp !== '-' && (
                                                                <a 
                                                                    href={`https://wa.me/55${acusado.whatsapp?.replace(/\D/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#22C55E', fontSize: '12px', textDecoration: 'none' }}
                                                                >
                                                                    📱 {acusado.whatsapp}
                                                                </a>
                                                            )}
                                                            {defesa?.dataEnvioDefesa && (
                                                                <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                    📅 {new Date(new Date(defesa.dataEnvioDefesa).getTime() - 3 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} às {new Date(new Date(defesa.dataEnvioDefesa).getTime() - 3 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Brasília)
                                                                </div>
                                                            )}
                                                            {!defesa && (
                                                                <div style={{ color: '#F59E0B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                    ⏳ Aguardando defesa...
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Detalhes */}
                                                        <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3B82F6', display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px' }}>📍 DETALHES DA CORRIDA</div>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                                Etapa {etapa.round} - {etapa.circuit || '-'}
                                                            </div>
                                                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                                                                Grid: {dados.grid?.toUpperCase() || acusador.grid?.toUpperCase() || '-'} | T{dados.temporada || '20'}
                                                            </div>
                                                            <div style={{ color: '#64748B', fontSize: '11px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                                                                🏁 Data da corrida: {etapa.date || '-'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Descrição da Acusação */}
                                                    <div style={{ marginTop: '15px', background: '#0F172A', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #FF6B35' }}>
                                                        <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '8px' }}>
                                                            📝 DESCRIÇÃO DA ACUSAÇÃO
                                                        </div>
                                                        <div style={{ color: '#E2E8F0', lineHeight: '1.5' }}>
                                                            {dados.descricao || 'Sem descrição'}
                                                        </div>
                                                    </div>

                                                    {/* Descrição da Defesa (se existir) */}
                                                    {defesa && (
                                                        <div style={{ marginTop: '15px', background: '#0F172A', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #22C55E' }}>
                                                            <div style={{ color: '#6EE7B7', fontSize: '11px', marginBottom: '8px' }}>
                                                                🛡️ DESCRIÇÃO DA DEFESA
                                                            </div>
                                                            <div style={{ color: '#E2E8F0', lineHeight: '1.5' }}>
                                                                {defesa.descricaoDefesa || 'Sem descrição'}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* VÍDEOS LADO A LADO (Comparativo) */}
                                                    {(dados.videoLink || defesa?.videoLinkDefesa) && (
                                                        <div style={{ marginTop: '20px' }}>
                                                            <div style={{ 
                                                                color: '#94A3B8', 
                                                                fontSize: '12px', 
                                                                marginBottom: '12px',
                                                                textAlign: 'center',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                🎥 COMPARATIVO DE VÍDEOS
                                                            </div>
                                                            <div style={{ 
                                                                display: 'grid', 
                                                                gridTemplateColumns: defesa?.videoLinkDefesa ? '1fr 1fr' : '1fr',
                                                                gap: '15px'
                                                            }}>
                                                                {/* Vídeo da Acusação */}
                                                                {dados.videoLink && (
                                                                    <div>
                                                                        <div style={{ 
                                                                            color: '#FF6B35', 
                                                                            fontSize: '11px', 
                                                                            marginBottom: '8px',
                                                                            fontWeight: 'bold',
                                                                            textAlign: 'center'
                                                                        }}>
                                                                            ⚖️ VISÃO DO ACUSADOR
                                                                        </div>
                                                                        <VideoEmbed 
                                                                            videoLink={dados.videoLink} 
                                                                            title="Vídeo da acusação"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Vídeo da Defesa */}
                                                                {defesa?.videoLinkDefesa && (
                                                                    <div>
                                                                        <div style={{ 
                                                                            color: '#22C55E', 
                                                                            fontSize: '11px', 
                                                                            marginBottom: '8px',
                                                                            fontWeight: 'bold',
                                                                            textAlign: 'center'
                                                                        }}>
                                                                            🛡️ VISÃO DO DEFENSOR
                                                                        </div>
                                                                        <VideoEmbed 
                                                                            videoLink={defesa.videoLinkDefesa} 
                                                                            title="Vídeo da defesa"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Botão para enviar ao Júri (se tem defesa e ainda não foi enviado) */}
                                                    {defesa && status === 'aguardando_defesa' && (
                                                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                                            <button
                                                                style={{
                                                                    padding: '12px 25px',
                                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '13px',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                                                                }}
                                                                onClick={() => enviarParaJuri(notif.id, dados)}
                                                            >
                                                                👨‍⚖️ Enviar para Júri Analisar
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Badge quando já foi enviado */}
                                                    {status === 'aguardando_analise' && (
                                                        <div style={{ 
                                                            marginTop: '20px', 
                                                            textAlign: 'right',
                                                            color: '#8B5CF6',
                                                            fontSize: '13px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            ⏳ Aguardando análise do Júri...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== ABA JURADOS ===== */}
                {activeTab === 'jurados' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#8B5CF6', margin: 0 }}>👨‍⚖️ Cadastro de Jurados</h3>
                            <button 
                                onClick={fetchJurados} 
                                style={{ padding: '8px 16px', background: '#1E293B', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                🔄 Atualizar
                            </button>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px' }}>
                            Configure os jurados vinculando e-mail Google e WhatsApp. Após configurado e ativo, o jurado poderá acessar o Tribunal do Júri.
                        </p>

                        {loadingJurados ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Carregando jurados...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {jurados.map((jurado) => (
                                    <div 
                                        key={jurado.id}
                                        style={{
                                            background: '#1E293B',
                                            borderRadius: '10px',
                                            border: `1px solid ${jurado.ativo ? '#22C55E' : '#475569'}`,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Header do Card */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '15px 20px',
                                            background: jurado.ativo ? 'rgba(34, 197, 94, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{
                                                    background: '#E5E7EB',
                                                    color: '#1F2937',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: 'bold',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {jurado.usuario}
                                                </span>
                                                <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                    {jurado.nome || '(Nome não definido)'}
                                                </span>
                                                <span style={{
                                                    background: jurado.ativo ? '#22C55E' : '#64748B',
                                                    color: 'white',
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {jurado.ativo ? '✅ ATIVO' : '⏸️ INATIVO'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => handleEditJurado(jurado)}
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: '#8B5CF6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => toggleJuradoAtivo(jurado)}
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: jurado.ativo ? '#EF4444' : '#22C55E',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    {jurado.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info do jurado */}
                                        <div style={{ padding: '15px 20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                            <div>
                                                <span style={{ color: '#64748B', fontSize: '12px' }}>📧 E-mail Google:</span>
                                                <div style={{ color: jurado.email_google ? '#F8FAFC' : '#64748B', marginTop: '3px' }}>
                                                    {jurado.email_google || '(não configurado)'}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748B', fontSize: '12px' }}>📱 WhatsApp:</span>
                                                <div style={{ color: jurado.whatsapp ? '#F8FAFC' : '#64748B', marginTop: '3px' }}>
                                                    {jurado.whatsapp || '(não configurado)'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Formulário de edição (se estiver editando este jurado) */}
                                        {editingJurado && editingJurado.id === jurado.id && (
                                            <div style={{
                                                padding: '20px',
                                                background: '#0F172A',
                                                borderTop: '1px solid #8B5CF6'
                                            }}>
                                                <h4 style={{ color: '#8B5CF6', margin: '0 0 15px 0', fontSize: '14px' }}>
                                                    ✏️ Editando {editingJurado.usuario}
                                                </h4>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            Nome do Jurado *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingJurado.nome}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, nome: e.target.value })}
                                                            placeholder="Ex: Comissário Silva"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            E-mail Google *
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={editingJurado.email_google}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, email_google: e.target.value })}
                                                            placeholder="Ex: jurado@gmail.com"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                            WhatsApp * (11 dígitos)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingJurado.whatsapp}
                                                            onChange={(e) => setEditingJurado({ ...editingJurado, whatsapp: formatWhatsApp(e.target.value) })}
                                                            placeholder="(00) 00000-0000"
                                                            maxLength={15}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #475569',
                                                                background: '#1E293B',
                                                                color: '#F8FAFC',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setEditingJurado(null)}
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: 'transparent',
                                                            color: '#94A3B8',
                                                            border: '1px solid #475569',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleSaveJurado}
                                                        disabled={savingJurado}
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: savingJurado ? '#475569' : '#22C55E',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: savingJurado ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {savingJurado ? '⏳ Salvando...' : '💾 Salvar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== ABA NARRADORES ===== */}
                {activeTab === 'narradores' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#06B6D4', margin: 0 }}>🎙️ Cadastro de Narradores</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={handleCreateNarrador}
                                    style={{ 
                                        padding: '8px 16px', 
                                        background: '#06B6D4', 
                                        color: '#0F172A', 
                                        border: 'none', 
                                        borderRadius: '6px', 
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    ➕ Novo Narrador
                                </button>
                                <button 
                                    onClick={fetchNarradores} 
                                    style={{ padding: '8px 16px', background: '#1E293B', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    🔄 Atualizar
                                </button>
                            </div>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px' }}>
                            Configure os narradores que terão acesso somente leitura aos painéis dos pilotos durante as transmissões.
                        </p>

                        {/* Formulário de criação/edição */}
                        {editingNarrador && !editingNarrador.id && (
                            <div style={{
                                background: '#1E293B',
                                borderRadius: '10px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '2px solid #06B6D4'
                            }}>
                                <h4 style={{ color: '#06B6D4', margin: '0 0 15px 0' }}>➕ Novo Narrador</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nome *</label>
                                        <input
                                            type="text"
                                            value={editingNarrador.nome}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, nome: e.target.value })}
                                            placeholder="Ex: João Silva"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>E-mail *</label>
                                        <input
                                            type="email"
                                            value={editingNarrador.email}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, email: e.target.value })}
                                            placeholder="Ex: narrador@email.com"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>WhatsApp *</label>
                                        <input
                                            type="text"
                                            value={editingNarrador.whatsapp || ''}
                                            onChange={(e) => setEditingNarrador({ ...editingNarrador, whatsapp: e.target.value })}
                                            placeholder="Ex: (11) 99999-9999"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                                        />
                                        <small style={{ color: '#64748B', fontSize: '11px', display: 'block', marginTop: '5px' }}>
                                            O narrador criará a senha no primeiro acesso via WhatsApp
                                        </small>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setEditingNarrador(null)}
                                        style={{ padding: '10px 20px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveNewNarrador}
                                        disabled={savingNarrador}
                                        style={{ padding: '10px 20px', background: savingNarrador ? '#475569' : '#06B6D4', color: savingNarrador ? '#94A3B8' : '#0F172A', border: 'none', borderRadius: '6px', cursor: savingNarrador ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                    >
                                        {savingNarrador ? '⏳ Salvando...' : '💾 Criar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingNarradores ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Carregando narradores...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {narradores.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Nenhum narrador cadastrado.</div>
                                ) : (
                                    narradores.map((narrador) => (
                                        <div 
                                            key={narrador.id}
                                            style={{
                                                background: '#1E293B',
                                                borderRadius: '10px',
                                                border: `1px solid ${narrador.ativo ? '#06B6D4' : '#475569'}`,
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '15px 20px',
                                                background: narrador.ativo ? 'rgba(6, 182, 212, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '16px' }}>
                                                        {narrador.nome || '(Nome não definido)'}
                                                    </span>
                                                    <span style={{
                                                        background: narrador.ativo ? '#06B6D4' : '#64748B',
                                                        color: 'white',
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {narrador.ativo ? '✅ ATIVO' : '⏸️ INATIVO'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleEditNarrador(narrador)}
                                                        style={{ padding: '6px 14px', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => toggleNarradorAtivo(narrador)}
                                                        style={{ padding: '6px 14px', background: narrador.ativo ? '#EF4444' : '#22C55E', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                                    >
                                                        {narrador.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNarrador(narrador)}
                                                        style={{ padding: '6px 14px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                                    >
                                                        🗑️ Excluir
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px 20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📧 E-mail:</span>
                                                    <div style={{ color: '#F8FAFC', marginTop: '3px' }}>{narrador.email || '(não configurado)'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>📱 WhatsApp:</span>
                                                    <div style={{ color: '#F8FAFC', marginTop: '3px' }}>{narrador.whatsapp || '(não configurado)'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748B', fontSize: '12px' }}>🔐 Senha:</span>
                                                    <div style={{ color: narrador.senha_definida ? '#10B981' : '#EF4444', marginTop: '3px', fontWeight: 'bold' }}>
                                                        {narrador.senha_definida ? '✅ Definida' : '❌ Não definida'}
                                                    </div>
                                                </div>
                                            </div>
                                            {editingNarrador && editingNarrador.id === narrador.id && (
                                                <div style={{ padding: '20px', background: '#0F172A', borderTop: '1px solid #06B6D4' }}>
                                                    <h4 style={{ color: '#06B6D4', margin: '0 0 15px 0', fontSize: '14px' }}>✏️ Editando {narrador.nome}</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nome *</label>
                                                            <input
                                                                type="text"
                                                                value={editingNarrador.nome}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, nome: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>E-mail *</label>
                                                            <input
                                                                type="email"
                                                                value={editingNarrador.email}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, email: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>WhatsApp *</label>
                                                            <input
                                                                type="text"
                                                                value={editingNarrador.whatsapp || ''}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, whatsapp: e.target.value })}
                                                                placeholder="Ex: (11) 99999-9999"
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Nova Senha (deixe vazio para manter)</label>
                                                            <input
                                                                type="password"
                                                                value={editingNarrador.senha}
                                                                onChange={(e) => setEditingNarrador({ ...editingNarrador, senha: e.target.value })}
                                                                placeholder="Deixe vazio para manter a senha atual"
                                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => setEditingNarrador(null)}
                                                            style={{ padding: '10px 20px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handleSaveNarrador}
                                                            disabled={savingNarrador}
                                                            style={{ padding: '10px 20px', background: savingNarrador ? '#475569' : '#06B6D4', color: savingNarrador ? '#94A3B8' : '#0F172A', border: 'none', borderRadius: '6px', cursor: savingNarrador ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {savingNarrador ? '⏳ Salvando...' : '💾 Salvar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'noticias' && (
                    <div className="adm-content">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#F59E0B', margin: 0 }}>📰 Upload de Imagens das Notícias</h3>
                        </div>

                        <p style={{ color: '#94A3B8', marginBottom: '25px', fontSize: '14px', lineHeight: '1.6' }}>
                            Faça upload das imagens das notícias. As imagens serão nomeadas automaticamente como <strong>Noticia1.jpg</strong>, <strong>Noticia2.jpg</strong>, etc., 
                            baseado no ID da notícia na planilha do Google Sheets.
                            <br/><br/>
                            <strong>⚠️ Importante:</strong> Após fazer upload, você precisará mover a imagem para a pasta:
                            <br/><code style={{background: '#0F172A', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}}>public/noticias/</code>
                            <br/><br/>
                            <strong>Caminho completo:</strong>
                            <br/><code style={{background: '#0F172A', padding: '4px 8px', borderRadius: '4px', fontSize: '11px'}}>C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\public\noticias</code>
                        </p>

                        <div style={{
                            background: '#1E293B',
                            borderRadius: '10px',
                            padding: '25px',
                            marginBottom: '20px',
                            border: '2px solid #F59E0B'
                        }}>
                            <h4 style={{ color: '#F59E0B', margin: '0 0 15px 0' }}>📤 Upload de Imagem</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        ID da Notícia *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={selectedNewsId}
                                        onChange={(e) => setSelectedNewsId(parseInt(e.target.value) || 1)}
                                        placeholder="Ex: 1"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                    <p style={{ color: '#64748B', fontSize: '11px', marginTop: '5px' }}>
                                        A imagem será salva como: <strong>Noticia{selectedNewsId}.jpg</strong>
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                    Selecione a Imagem *
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="news-image-upload"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        setUploadingImage(true);
                                        try {
                                            // Converter imagem para base64 para preview
                                            const reader = new FileReader();
                                            reader.onload = async (event) => {
                                                const imageData = event.target?.result;
                                                
                                                // Criar um link de download com o nome correto
                                                const blob = await fetch(imageData).then(r => r.blob());
                                                const url = URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `Noticia${selectedNewsId}.jpg`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);

                                                alert(`✅ Imagem "Noticia${selectedNewsId}.jpg" baixada com sucesso!\n\nAgora mova o arquivo para a pasta:\npublic/noticias/\n\nCaminho completo:\nC:\\Users\\Usuario\\Documents\\Master League F1\\Projetos_React\\master-league-f1\\public\\noticias`);
                                            };
                                            reader.readAsDataURL(file);
                                        } catch (err) {
                                            console.error('Erro ao processar imagem:', err);
                                            alert('❌ Erro ao processar imagem: ' + err.message);
                                        } finally {
                                            setUploadingImage(false);
                                            // Limpar input
                                            e.target.value = '';
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#0F172A',
                                        color: '#F8FAFC',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                    disabled={uploadingImage}
                                />
                                {uploadingImage && (
                                    <p style={{ color: '#F59E0B', fontSize: '12px', marginTop: '5px' }}>
                                        ⏳ Processando...
                                    </p>
                                )}
                            </div>

                            <div style={{ 
                                marginTop: '20px', 
                                padding: '15px', 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                borderRadius: '6px',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                                <h5 style={{ color: '#F59E0B', margin: '0 0 10px 0', fontSize: '14px' }}>📋 Instruções:</h5>
                                <ol style={{ color: '#CBD5E1', fontSize: '12px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                    <li>Selecione o ID da notícia (1, 2, 3, etc.)</li>
                                    <li>Escolha a imagem que deseja fazer upload</li>
                                    <li>A imagem será baixada automaticamente com o nome correto</li>
                                    <li>Mova o arquivo para a pasta <code>public/noticias/</code> do projeto</li>
                                    <li>Recarregue a página do site para ver a imagem</li>
                                </ol>
                            </div>
                        </div>

                        {/* Preview das imagens existentes */}
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '10px',
                            padding: '25px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <h4 style={{ color: '#F59E0B', margin: '0 0 15px 0' }}>🖼️ Imagens Existentes</h4>
                            <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '15px' }}>
                                Preview das imagens que estão na pasta <code>public/noticias/</code>:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                                {[1, 2, 3, 4, 5, 6].map((id) => (
                                    <div key={id} style={{
                                        background: '#0F172A',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        border: '1px solid #475569'
                                    }}>
                                        <div style={{ 
                                            width: '100%', 
                                            aspectRatio: '16/9', 
                                            background: '#1E293B',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden'
                                        }}>
                                            <img 
                                                src={`/noticias/Noticia${id}.jpg`}
                                                alt={`Notícia ${id}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<span style="color: #64748B; font-size: 12px;">Sem imagem</span>';
                                                }}
                                            />
                                        </div>
                                        <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0, textAlign: 'center' }}>
                                            Noticia{id}.jpg
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== MODAL DE EDIÇÃO DE USUÁRIO ===== */}
                {editingUser && (
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
                        zIndex: 10000,
                        padding: '20px'
                    }}
                    onClick={() => setEditingUser(null)}
                    >
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            border: '2px solid #3B82F6'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#3B82F6', margin: 0, fontSize: '18px' }}>
                                    ✏️ Editar Usuário
                                </h3>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Nome do Piloto *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.nome}
                                        onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                                        placeholder="Ex: ALAIN PROST"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        E-mail *
                                    </label>
                                    <input
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        placeholder="Ex: piloto@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Grid *
                                    </label>
                                    <select
                                        value={editingUser.grid}
                                        onChange={(e) => setEditingUser({ ...editingUser, grid: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="carreira">Carreira</option>
                                        <option value="light">Light</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Equipe
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.equipe || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, equipe: e.target.value })}
                                        placeholder="Ex: MCLAREN"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.whatsapp || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, whatsapp: formatWhatsApp(e.target.value) })}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Gamertag
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.gamertag || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, gamertag: e.target.value })}
                                        placeholder="Ex: Piloto123"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#0F172A', borderRadius: '6px' }}>
                                    <input
                                        type="checkbox"
                                        id="is_steward"
                                        checked={editingUser.is_steward || false}
                                        onChange={(e) => setEditingUser({ ...editingUser, is_steward: e.target.checked })}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="is_steward" style={{ color: '#F8FAFC', fontSize: '14px', cursor: 'pointer', margin: 0 }}>
                                        É Steward (acesso ao painel de análises)
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#475569',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveUser}
                                        disabled={savingUser}
                                        style={{
                                            padding: '10px 20px',
                                            background: savingUser ? '#475569' : '#22C55E',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: savingUser ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {savingUser ? '⏳ Salvando...' : '💾 Salvar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Cadastro de Novo Piloto */}
                {showCadastroPiloto && (
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
                        zIndex: 10000,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.5rem' }}>➕ Cadastrar Novo Piloto</h2>
                                <button
                                    onClick={() => setShowCadastroPiloto(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Tipo de Piloto */}
                                <div>
                                    <label style={{ color: '#F8FAFC', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                        Tipo de Piloto *
                                    </label>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: novoPiloto.tipo_piloto === 'ativo' ? 'rgba(34, 197, 94, 0.2)' : '#0F172A',
                                            border: `2px solid ${novoPiloto.tipo_piloto === 'ativo' ? '#22C55E' : '#475569'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#F8FAFC',
                                            flex: 1,
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                name="tipo_piloto"
                                                value="ativo"
                                                checked={novoPiloto.tipo_piloto === 'ativo'}
                                                onChange={(e) => setNovoPiloto({ ...novoPiloto, tipo_piloto: e.target.value })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontWeight: '600' }}>🏎️ Piloto Ativo</span>
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: novoPiloto.tipo_piloto === 'ex-piloto' ? 'rgba(148, 163, 184, 0.2)' : '#0F172A',
                                            border: `2px solid ${novoPiloto.tipo_piloto === 'ex-piloto' ? '#94A3B8' : '#475569'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#F8FAFC',
                                            flex: 1,
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                name="tipo_piloto"
                                                value="ex-piloto"
                                                checked={novoPiloto.tipo_piloto === 'ex-piloto'}
                                                onChange={(e) => setNovoPiloto({ ...novoPiloto, tipo_piloto: e.target.value })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontWeight: '600' }}>📜 Ex-Piloto</span>
                                        </label>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px' }}>
                                        {novoPiloto.tipo_piloto === 'ex-piloto' 
                                            ? '⚠️ Ex-pilotos ficam com status PENDENTE e precisam ser aprovados pelo admin.'
                                            : '✅ Pilotos ativos são cadastrados com status ATIVO automaticamente.'}
                                    </div>
                                </div>

                                {/* Nome */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.nome}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, nome: e.target.value })}
                                        placeholder="Ex: JOÃO SILVA"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={novoPiloto.email}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, email: e.target.value })}
                                        placeholder="Ex: joao@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* WhatsApp */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        WhatsApp (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.whatsapp}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, whatsapp: e.target.value })}
                                        placeholder="Ex: (83) 99152-6615"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Grid */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Grid *
                                    </label>
                                    <select
                                        value={novoPiloto.grid}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, grid: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="light">Light</option>
                                        <option value="carreira">Carreira</option>
                                    </select>
                                </div>

                                {/* Equipe */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Equipe (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.equipe}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, equipe: e.target.value })}
                                        placeholder="Ex: McLaren"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Gamertag */}
                                <div>
                                    <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                        Gamertag (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={novoPiloto.gamertag}
                                        onChange={(e) => setNovoPiloto({ ...novoPiloto, gamertag: e.target.value })}
                                        placeholder="Ex: Piloto123"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#0F172A',
                                            color: '#F8FAFC',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Botões */}
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                    <button
                                        onClick={() => {
                                            setShowCadastroPiloto(false);
                                            setNovoPiloto({
                                                tipo_piloto: 'ativo',
                                                nome: '',
                                                email: '',
                                                whatsapp: '',
                                                grid: 'light',
                                                equipe: '',
                                                gamertag: ''
                                            });
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#475569',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCadastrarPiloto}
                                        disabled={salvandoPiloto}
                                        style={{
                                            padding: '10px 20px',
                                            background: salvandoPiloto ? '#475569' : '#22C55E',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: salvandoPiloto ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {salvandoPiloto ? '⏳ Cadastrando...' : '💾 Cadastrar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Admin;