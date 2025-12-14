import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import VideoEmbed from '../components/VideoEmbed';
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

    // Estados para Edição de Usuários/Pilotos
    const [editingUser, setEditingUser] = useState(null); // { id, nome, email, grid, equipe, whatsapp, is_steward }
    const [savingUser, setSavingUser] = useState(false);

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

    const fetchAllUsers = async () => {
        // setLoading(true); // Comentado para não piscar a tela no refresh
        // Buscar pilotos da tabela 'pilotos'
        const { data, error } = await supabase
            .from('pilotos')
            .select('*')
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
        if (!window.confirm(`Confirmar ativação de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
        if (!error) { alert('Ativado!'); fetchAllUsers(); }
    };

    const handleReset = async (userId, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar cadastro de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) { alert('Resetado!'); fetchAllUsers(); }
    };

    // ===== FUNÇÕES DE EDIÇÃO DE USUÁRIOS =====
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
            // Preparar dados para atualização na tabela 'pilotos'
            const dadosAtualizacao = {
                nome: editingUser.nome.trim().toUpperCase(),
                email: editingUser.email.trim().toLowerCase(),
                grid: editingUser.grid,
                equipe: editingUser.equipe || null,
                whatsapp: editingUser.whatsapp || null,
                is_steward: editingUser.is_steward || false,
                updated_at: new Date().toISOString()
            };

            // Atualizar na tabela 'pilotos' usando ID (mais seguro) ou email original como fallback
            let pilotosError = null;
            if (editingUser.id) {
                const { error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('id', editingUser.id);
                pilotosError = error;
            }
            
            // Se não tem ID ou falhou, tentar por email original
            if (pilotosError && editingUser.email_original) {
                console.log('⚠️ Tentando atualizar por email original...');
                const { error } = await supabase
                    .from('pilotos')
                    .update(dadosAtualizacao)
                    .eq('email', editingUser.email_original.toLowerCase().trim());
                pilotosError = error;
            }

            // Também atualizar na tabela 'profiles' (se existir) usando ID
            let profilesError = null;
            if (editingUser.id) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        nome_piloto: editingUser.nome.trim().toUpperCase(),
                        nome_completo: editingUser.nome_completo || editingUser.nome.trim(),
                        email: editingUser.email.trim().toLowerCase(),
                        grid_preferencia: editingUser.grid,
                        equipe: editingUser.equipe || null,
                        whatsapp: editingUser.whatsapp || null,
                        gamertag: editingUser.gamertag || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingUser.id);
                profilesError = error;
            }

            // Se ambas as tabelas falharem, mostrar erro
            if (pilotosError && profilesError) {
                throw new Error(profilesError.message || pilotosError.message || 'Erro ao atualizar piloto');
            }

            // Se pelo menos uma atualização funcionou, considerar sucesso
            if (!pilotosError) {
                console.log('✅ Piloto atualizado na tabela pilotos com sucesso!');
            }
            if (!profilesError) {
                console.log('✅ Perfil atualizado na tabela profiles com sucesso!');
            }

            alert('✅ Usuário atualizado com sucesso no Supabase!');
            setEditingUser(null);
            fetchAllUsers();
        } catch (err) {
            console.error('Erro ao salvar usuário:', err);
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
                    <div style={{display:'flex', gap:'10px'}}>
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
                </div>

                {activeTab === 'drivers' && (
                    <div className="adm-content">
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
                                    // Para 'profiles', verificar status; para 'pilotos', considerar sempre ativo
                                    const isPending = user.status === 'pending' || (!user.status && user.nome_piloto);
                                    
                                    return (
                                        <div key={user.id} className="adm-row">
                                            <div style={{flex:2}}>
                                                <div style={{fontWeight:'800', color:'white', fontSize:'1rem'}}>{nome}</div>
                                                <div style={{fontSize:'0.75rem', color:'#94A3B8'}}>{email}</div>
                                                {isSteward && <div style={{fontSize:'0.7rem', color:'#FFD700', marginTop:'2px'}}>👨‍⚖️ STEWARD</div>}
                                            </div>
                                            <div style={{flex:1, fontSize:'0.9rem', color:'#CBD5E1'}}>{equipe}</div>
                                            <div style={{flex:1, fontSize:'0.8rem', textTransform:'uppercase', fontWeight:'700', color:'var(--highlight-cyan)'}}>{grid}</div>
                                            
                                            <div style={{width:'100px', textAlign:'center'}}>
                                                <span className={`status-badge ${isPending ? 'pending' : 'active'}`}>
                                                    {isPending ? 'PENDENTE' : 'ATIVO'}
                                                </span>
                                            </div>

                                            <div className="adm-row-actions">
                                                <button onClick={() => handleEditUser(user)} className="btn-icon-edit" title="Editar" style={{background:'rgba(59, 130, 246, 0.2)', border:'1px solid #3B82F6', color:'#3B82F6'}}>✏️</button>
                                                {isPending && (
                                                    <button onClick={() => handleApprove(user.id, nome)} className="btn-icon-approve" title="Aprovar">✅</button>
                                                )}
                                                <button onClick={() => handleReset(user.id, nome)} className="btn-icon-reset" title="Resetar">🔄</button>
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
            </div>
        </div>
    );
}

export default Admin;