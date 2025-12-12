import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useLeagueData } from '../hooks/useLeagueData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import '../index.css';

// --- CONFIGURAÇÃO ---
// CADASTRO MLF1 (gid=1844400629)
const LINK_CONTROLE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1844400629&single=true&output=csv";

const fetchWithProxy = async (url) => {
    const proxyUrl = "https://corsproxy.io/?";
    const response = await fetch(proxyUrl + encodeURIComponent(url));
    return response.text();
};

// --- HELPERS VISUAIS ---
const getTeamColor = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "var(--f1-redbull)"; 
    if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
    if(t.includes("mercedes")) return "var(--f1-mercedes)"; 
    if(t.includes("mclaren")) return "var(--f1-mclaren)"; 
    if(t.includes("aston")) return "var(--f1-aston)"; 
    if(t.includes("alpine")) return "var(--f1-alpine)"; 
    if(t.includes("haas")) return "var(--f1-haas)"; 
    if(t.includes("williams")) return "var(--f1-williams)"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)"; 
    if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "var(--f1-vcarb)";
    return "#94A3B8";
};

const getTeamLogo = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return null;
    const t = teamName.toLowerCase().replace(/\s/g, '');
    if(t.includes("ferrari")) return "/logos/ferrari.png";
    if(t.includes("mercedes")) return "/logos/mercedes.png";
    if(t.includes("alpine")) return "/logos/alpine.png";
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "/logos/racingbulls.png";
    if(t.includes("redbull") || t.includes("oracle")) return "/logos/redbull.png";
    if(t.includes("mclaren")) return "/logos/mclaren.png";
    if(t.includes("aston")) return "/logos/astonmartin.png";
    if(t.includes("haas")) return "/logos/haas.png";
    if(t.includes("williams")) return "/logos/williams.png";
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/logos/sauber.png";
    return null;
};

const getTeamGradient = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "linear-gradient(135deg, #334155 0%, #1E293B 100%)";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "linear-gradient(135deg, #000000 0%, #3671C6 50%, #FABB00 100%)";
    if(t.includes("ferrari")) return "linear-gradient(135deg, #000000 0%, #E8002D 60%, #F9B900 100%)";
    if(t.includes("mercedes")) return "linear-gradient(135deg, #000000 0%, #C0C0C0 50%, #27F4D2 100%)";
    if(t.includes("mclaren")) return "linear-gradient(135deg, #000000 0%, #FF8000 60%, #47C7FC 100%)";
    return "linear-gradient(135deg, #334155 0%, #1E293B 100%)"; 
};

const DriverImage = ({ name, gridType, season }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const s = season || '19';
    const src = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    return <img src={src} onError={(e) => { e.target.onerror = null; e.target.src = '/pilotos/pilotoshadow.png'; }} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />;
};

// --- TELA DE VALIDAÇÃO / ONBOARDING ---
const Onboarding = ({ session, onComplete }) => {
    const [mode, setMode] = useState('validate'); 
    const [whatsappInput, setWhatsappInput] = useState('');
    const [manualData, setManualData] = useState({ nome: '', gamertag: '', plataforma: 'Xbox', grid: 'Carreira', nomePiloto: '' });
    const [validating, setValidating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setWhatsappInput(value);
    };
    const cleanPhone = (phone) => phone ? phone.replace(/\D/g, '') : '';

    const handleValidate = async () => {
        const clean = cleanPhone(whatsappInput);
        if (clean.length < 10) return setErrorMsg("WhatsApp inválido.");
        setValidating(true); setErrorMsg('');

        try {
            const csvText = await fetchWithProxy(LINK_CONTROLE);
            Papa.parse(csvText, {
                header: false, skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data.slice(1);
                    const myEmail = session.user.email.toLowerCase().trim();
                    // NOVA ESTRUTURA - CADASTRO MLF1
                    // Coluna H (índice 7) = E-mail Login
                    // Coluna C (índice 2) = WhatsApp
                    // Coluna O (índice 14) = Nome Piloto
                    const match = rows.find(row => {
                        const sheetPhone = cleanPhone(row[2]); // Coluna C
                        const sheetEmail = (row[7] || '').toLowerCase().trim(); // Coluna H - E-mail Login
                        return sheetEmail === myEmail && sheetPhone.includes(clean);
                    });

                    if (match) {
                        const nomeOficial = match[14] || match[0]; // Coluna O (Nome Piloto) ou Coluna A (Nome Cadastrado)
                        if (!nomeOficial) { setErrorMsg("Nome de Piloto vazio na planilha."); setValidating(false); return; }
                        await saveProfile({ nome_piloto: nomeOficial, whatsapp: match[2], status: 'active' }, true);
                    } else {
                        setErrorMsg(`Inscrição não encontrada para ${myEmail}.`);
                    }
                    setValidating(false);
                }
            });
        } catch (err) { console.error(err); setErrorMsg("Erro de conexão."); setValidating(false); }
    };

    const handleManualSubmit = async () => {
        if (!manualData.nome || !manualData.nomePiloto || cleanPhone(whatsappInput).length < 10) {
            return setErrorMsg("Preencha todos os campos obrigatórios.");
        }
        setValidating(true);
        await saveProfile({
            nome_piloto: manualData.nomePiloto, 
            whatsapp: whatsappInput,
            plataforma: manualData.plataforma, 
            grid_preferencia: manualData.grid, 
            nome: manualData.nome
            // Removido 'status' e 'gamertag' pois não existem na tabela pilotos
        }, false);
    };

    const saveProfile = async (extraData, isActive) => {
        const updates = { 
            email: session.user.email,
            nome: extraData.nome_piloto || extraData.nome, // Campo 'nome' para consistência
            whatsapp: extraData.whatsapp,
            grid: extraData.grid_preferencia || extraData.grid || 'carreira',
            equipe: null,
            is_steward: false
            // Removido 'status', 'gamertag', 'plataforma', 'created_at' e 'updated_at' pois não existem na tabela pilotos
        };
        
        console.log('💾 Salvando no banco (tabela pilotos):', updates);
        
        const { error } = await supabase.from('pilotos').upsert(updates, { onConflict: 'email' });
        if (error) { 
            console.error('❌ Erro ao salvar:', error);
            setErrorMsg('Erro ao salvar: ' + error.message); 
            setValidating(false); 
        } else { 
            console.log('✅ Salvo com sucesso!');
            isActive ? onComplete(updates) : window.location.reload(); 
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={{marginBottom:'20px', color:'var(--highlight-cyan)', textTransform:'uppercase'}}>{mode === 'validate' ? 'VALIDAR IDENTIDADE' : 'INSCRIÇÃO MANUAL'}</h2>
            {errorMsg && <div style={{background:'rgba(220,38,38,0.2)', color:'#FECACA', padding:'10px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.9rem'}}>{errorMsg}</div>}
            {mode === 'validate' && (
                <>
                    <p style={{color:'#94A3B8', marginBottom:'30px'}}>Confirme seus dados para liberar o acesso.</p>
                    <div style={{textAlign:'left', marginBottom:'20px'}}><label style={labelStyle}>E-MAIL</label><input type="text" value={session.user.email} disabled style={inputDisabledStyle} /></div>
                    <div style={{textAlign:'left', marginBottom:'30px'}}><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} placeholder="(00) 00000-0000" style={inputStyle} /></div>
                    <button onClick={handleValidate} disabled={validating} className="btn-primary" style={{width:'100%', marginBottom:'20px'}}>{validating ? 'VERIFICANDO...' : 'VALIDAR'}</button>
                    <button onClick={() => { setMode('manual'); setErrorMsg(''); }} style={{background:'transparent', border:'1px solid #64748B', color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem'}}>REENVIAR INSCRIÇÃO</button>
                </>
            )}
            {mode === 'manual' && (
                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'15px'}}>
                    <div><label style={labelStyle}>NOME COMPLETO</label><input type="text" value={manualData.nome} onChange={e => setManualData({...manualData, nome: e.target.value})} style={inputStyle} /></div>
                    <div><label style={labelStyle}>NOME DE PILOTO (NA TRANSMISSÃO)</label><input type="text" value={manualData.nomePiloto} onChange={e => setManualData({...manualData, nomePiloto: e.target.value})} style={inputStyle} /></div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>GAMERTAG</label><input type="text" value={manualData.gamertag} onChange={e => setManualData({...manualData, gamertag: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} style={inputStyle} /></div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>PLATAFORMA</label><select value={manualData.plataforma} onChange={e => setManualData({...manualData, plataforma: e.target.value})} style={inputStyle}><option value="Xbox">Xbox</option><option value="PlayStation">PlayStation</option><option value="PC">PC</option></select></div>
                        <div><label style={labelStyle}>GRID</label><select value={manualData.grid} onChange={e => setManualData({...manualData, grid: e.target.value})} style={inputStyle}><option value="Carreira">Carreira</option><option value="Light">Light</option></select></div>
                    </div>
                    <button onClick={handleManualSubmit} disabled={validating} className="btn-primary" style={{width:'100%', marginTop:'10px'}}>{validating ? 'ENVIANDO...' : 'ENVIAR CADASTRO'}</button>
                    <button onClick={() => setMode('validate')} style={{background:'transparent', border:'none', color:'#64748B', fontSize:'0.8rem', width:'100%', marginTop:'10px', cursor:'pointer'}}>Cancelar</button>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD ---
function Dashboard() {
    const navigate = useNavigate();
    const { rawCarreira, rawLight, loading: loadingData } = useLeagueData();
    
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [dashData, setDashData] = useState(null);
    const [acusacoesPendentes, setAcusacoesPendentes] = useState(0);

    useEffect(() => {
        // Verificar sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('🔍 Dashboard - Sessão inicial:', session ? 'Encontrada' : 'Não encontrada');
            setSession(session);
            if (!session) {
                console.log('⚠️ Nenhuma sessão encontrada. Redirecionando para login...');
                setLoadingAuth(false);
                navigate('/login');
            }
        });
        
        // Listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Dashboard - Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão');
            setSession(session);
            if (!session && event === 'SIGNED_OUT') {
                console.log('🚪 Usuário deslogado. Redirecionando para login...');
                setLoadingAuth(false);
                navigate('/login');
            } else if (session) {
                console.log('✅ Sessão ativa no Dashboard');
            }
        });
        
        return () => subscription.unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (!session?.user?.email) return;
        
        let isMounted = true;
        console.log('🔍 Buscando piloto na tabela pilotos para:', session.user.email);
        setLoadingAuth(true);
        
        supabase.from('pilotos').select('*').eq('email', session.user.email.toLowerCase()).single()
            .then(({ data, error }) => {
                if (!isMounted) return;
                
                if (error) {
                    console.error('❌ Erro ao buscar piloto:', error);
                    // Se o erro for "not found", pode ser que o piloto ainda não foi salvo
                    if (error.code === 'PGRST116') {
                        console.log('⚠️ Piloto não encontrado no banco ainda. Aguardando...');
                        // Aguardar 2 segundos e tentar novamente (apenas uma vez)
                        setTimeout(() => {
                            if (!isMounted) return;
                            supabase.from('pilotos').select('*').eq('email', session.user.email.toLowerCase()).single()
                                .then(({ data: retryData, error: retryError }) => {
                                    if (!isMounted) return;
                                    if (retryData) {
                                        console.log('✅ Piloto encontrado na segunda tentativa:', retryData);
                                        setProfile(retryData);
                                    } else {
                                        console.log('⚠️ Piloto ainda não encontrado após retry');
                                    }
                                    setLoadingAuth(false);
                                });
                        }, 2000);
                        return;
                    }
                    setLoadingAuth(false);
                    return;
                }
                
                if (data) {
                    console.log('✅ Piloto encontrado:', data);
                    setProfile(data);
                } else {
                    console.log('⚠️ Piloto não encontrado no banco');
                }
                
                setLoadingAuth(false);
            });
        
        return () => {
            isMounted = false;
        };
    }, [session?.user?.email]); // Removido loadingAuth das dependências para evitar loop

    // Buscar acusações pendentes
    useEffect(() => {
        const buscarAcusacoesPendentes = async () => {
            if (!profile?.nome) return;
            
            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('tipo', 'nova_acusacao');
                
                if (error) {
                    console.error('Erro ao buscar acusações:', error);
                    return;
                }
                
                const acusacoesSemDefesa = (data || []).filter(notif => {
                    const dados = notif.dados || {};
                    const acusado = dados.acusado || {};
                    const temDefesa = dados.defesa != null;
                    return acusado.nome?.toUpperCase() === profile.nome?.toUpperCase() && !temDefesa;
                });
                
                setAcusacoesPendentes(acusacoesSemDefesa.length);
            } catch (err) {
                console.error('Erro:', err);
            }
        };
        
        buscarAcusacoesPendentes();
    }, [profile]);

    // Processamento - usar ref para evitar loops
    const processedRef = useRef(false);
    const lastPilotNameRef = useRef(null);
    
    // Resetar refs quando o piloto mudar
    useEffect(() => {
        if (profile?.nome && lastPilotNameRef.current !== profile.nome) {
            processedRef.current = false;
        }
    }, [profile?.nome]);
    
    useEffect(() => {
        // Só processar se tiver todos os dados necessários
        if (!profile?.nome || loadingData || !rawCarreira || !rawLight || rawCarreira.length === 0 || rawLight.length === 0) {
            return;
        }
        
        const pilotName = profile.nome;
        
        // Evitar reprocessar se já foi processado para o mesmo piloto
        if (processedRef.current && lastPilotNameRef.current === pilotName) {
            return;
        }
        
        console.log('✅ Processando estatísticas para:', pilotName);
        
        const calcStats = (data) => {
            let s = { races:0, wins:0, poles:0, podiums:0, best:999, seasons: new Set(), currentPoints: 0, racesList: [] };
            data.forEach(row => {
                if (row[9] === pilotName) {
                    s.races++; s.seasons.add(row[3]);
                    const q = parseInt(row[6]); const r = parseInt(row[8]);
                    if (q===1) s.poles++; if (r===1) s.wins++; if (r<=3) s.podiums++;
                    if (r>0 && r<s.best) s.best = r;
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if(!isNaN(p)) s.currentPoints += p;
                    s.racesList.push({ round: parseInt(row[4]), points: p });
                }
            });
            return s;
        };

        const sCarreira = calcStats(rawCarreira);
        const sLight = calcStats(rawLight);

        let maxS = 0, grid='carreira', team='Sem Equipe';
        const check = (row, g) => {
            if(row[9]===pilotName) {
                const s = parseInt(row[3]);
                if (s > maxS || (s === maxS && g === 'carreira')) { maxS = s; grid = g; team = row[10]; }
            }
        };
        rawCarreira.forEach(r => check(r, 'carreira'));
        rawLight.forEach(r => check(r, 'light'));

        const targetData = grid === 'carreira' ? sCarreira : sLight;
        const sortedRaces = targetData.racesList.sort((a,b) => a.round - b.round);
        let acc = 0;
        const chartData = sortedRaces.map(r => {
            acc += r.points;
            return { name: `R${r.round}`, points: acc };
        });

        console.log('📊 Estatísticas calculadas:', { currentGrid: grid, currentSeason: maxS, currentTeam: team });
        setDashData({ currentGrid: grid, currentSeason: maxS, currentTeam: team, statsCarreira: sCarreira, statsLight: sLight, chartData });
        
        processedRef.current = true;
        lastPilotNameRef.current = pilotName;
    }, [profile?.nome, loadingData, rawCarreira?.length, rawLight?.length]); // Usar apenas length para detectar quando dados são carregados

    const handleLogout = async () => {
        try {
            console.log('🚪 Fazendo logout...');
            await supabase.auth.signOut();
            // Limpar qualquer cache/localStorage se necessário
            // Redirecionar para login após logout
            navigate('/login');
            // Recarregar a página para garantir que tudo seja limpo
            window.location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            // Mesmo com erro, tentar redirecionar e recarregar
            navigate('/login');
            window.location.reload();
        }
    };

    if (loadingAuth || loadingData) return <div style={{color:'white', padding:'100px', textAlign:'center'}}>Carregando...</div>;
    if (!session) return null;

    // STATUS PENDENTE - simplificar verificação
    if (profile?.status === 'pending') {
        return (
            <div style={containerStyle}>
                <div style={{fontSize:'4rem', marginBottom:'20px'}}>⏳</div>
                <h2 style={{color:'var(--highlight-cyan)', marginBottom:'10px'}}>SOLICITAÇÃO EM ANÁLISE</h2>
                <p style={{color:'#CBD5E1', lineHeight:'1.6'}}>Seus dados foram enviados para a diretoria.<br/>Aguarde a liberação.</p>
                <button onClick={handleLogout} className="btn-outline" style={{marginTop:'20px', borderColor:'#EF4444', color:'#EF4444'}}>SAIR</button>
            </div>
        );
    }

    if (!profile || !profile.nome) {
        console.log('⚠️ Sem profile ou nome, mostrando Onboarding');
        return <div style={{paddingTop:'70px'}}><Onboarding session={session} onComplete={(newP) => setProfile(newP)} /></div>;
    }
    
    if (!dashData) {
        console.log('⏳ Aguardando dashData...');
        return <div style={{color:'white', padding:'50px', textAlign:'center'}}>Bem-vindo! Carregando estatísticas...</div>;
    }

    console.log('✅ Renderizando Dashboard completo');

    // RENDERIZAÇÃO DO PAINEL
    const teamColor = getTeamColor(dashData.currentTeam);
    const teamGradient = getTeamGradient(dashData.currentTeam);
    const teamLogo = getTeamLogo(dashData.currentTeam);
    const totalWins = dashData.statsCarreira.wins + dashData.statsLight.wins;
    const totalPodiums = dashData.statsCarreira.podiums + dashData.statsLight.podiums;
    const totalSeasons = dashData.statsCarreira.seasons.size + dashData.statsLight.seasons.size;

    return (
        <div className="page-wrapper">
            <div className="dashboard-hero" style={{background: `linear-gradient(to bottom, ${teamColor}99 0%, #0F172A 100%), url('/banner-masterleague.png') center/cover no-repeat`, backgroundBlendMode: 'overlay'}}>
                <div className="dashboard-hero-content">
                    <div>
                        <h1 style={{fontSize:'2.5rem', fontStyle:'italic', fontWeight:'900', textTransform:'uppercase', margin:0, lineHeight:1}}>COCKPIT</h1>
                        <div style={{color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: '2px', marginTop:'5px', textTransform:'uppercase', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            {teamLogo && <img src={teamLogo} alt="" style={{height: '25px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}} />}
                            {dashData.currentTeam}
                        </div>
                    </div>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <Link to="/" className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px', textDecoration:'none'}}>SITE</Link>
                        <button 
                            onClick={handleLogout} 
                            className="btn-outline" 
                            style={{
                                fontSize:'0.8rem', 
                                padding:'8px 20px', 
                                borderColor:'#EF4444', 
                                color:'#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.target.style.borderColor = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = '#EF4444';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            SAIR
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="dashboard-main-grid">
                    {/* LICENÇA */}
                    <div className="license-card" style={{background: teamGradient}}>
                        {teamLogo && <div className="lc-watermark" style={{backgroundImage: `url(${teamLogo})`}}></div>}
                        <div className="lc-content-wrapper">
                            <div className="lc-left-col">
                                <div className="lc-header">
                                    SUPER LICENÇA VIRTUAL 
                                    <span className="lc-status">ATIVO</span>
                                </div>

                                <div className="lc-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                        <div className="lc-photo-box" style={{borderColor: teamColor}}>
                                            <DriverImage name={profile.nome} gridType={dashData.currentGrid} season={dashData.currentSeason} />
                                        </div>
                                        <div className="lc-info">
                                            <div className="lc-label">PILOTO</div>
                                            <div className="lc-name">{profile.nome}</div>
                                            <div className="lc-team" style={{color: teamColor}}>{dashData.currentTeam}</div>
                                            <div className="lc-details-row">
                                                <div><div className="lc-label">Licença</div><div className="lc-value">BRA-{(profile.email || '').slice(0,4).toUpperCase()}</div></div>
                                                <div><div className="lc-label">Pontos</div><div className="lc-value" style={{color:'#22C55E'}}>0 pts</div></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Botões de Análise - Lado Direito */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        marginLeft: 'auto'
                                    }}>
                                        <button 
                                            className="btn-analise btn-acusacao"
                                            onClick={() => navigate('/acusacao')}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                width: '170px',
                                                height: '40px',
                                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                        >
                                            ⚖️ Enviar Acusação
                                        </button>
                                        
                                        {/* Botão de Defesa com Badge de Notificações */}
                                        <div style={{ position: 'relative', width: '170px', height: '40px' }}>
                                            {acusacoesPendentes > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: '#EF4444',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                                                    zIndex: 10,
                                                    animation: 'pulse 2s infinite'
                                                }}>
                                                    {acusacoesPendentes}
                                                </div>
                                            )}
                                            <button 
                                                className="btn-analise btn-defesa"
                                                onClick={() => navigate('/defesa')}
                                                style={{
                                                    padding: '10px 20px',
                                                    background: acusacoesPendentes > 0 
                                                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
                                                        : 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
                                                    color: 'white',
                                                    border: acusacoesPendentes > 0 ? '2px solid #EF4444' : 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    width: '100%',
                                                    height: '100%',
                                                    boxShadow: acusacoesPendentes > 0 
                                                        ? '0 4px 15px rgba(245, 158, 11, 0.5)' 
                                                        : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                🛡️ {acusacoesPendentes > 0 ? 'Defender-se!' : 'Enviar Defesa'}
                                            </button>
                                        </div>
                                        <button 
                                            className="btn-analise btn-consulta"
                                            onClick={() => navigate('/analises?tab=consulta')}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                width: '170px',
                                                height: '40px',
                                                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                        >
                                            📋 Consultar Análise
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lc-fia-bg">FIA</div>
                    </div>

                    {/* RESUMO */}
                    <div className="career-summary-card">
                        <h3>RESUMO DA CARREIRA</h3>
                        <div className="csc-grid">
                            <div className="csc-item"><div className="csc-val">{totalWins}</div><div className="csc-lbl">VITÓRIAS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalPodiums}</div><div className="csc-lbl">PÓDIOS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalSeasons}</div><div className="csc-lbl">TEMPORADAS</div></div>
                        </div>
                    </div>
                </div>
                
                {/* GRÁFICO DE EVOLUÇÃO */}
                {dashData.chartData && dashData.chartData.length > 1 && (
                    <div style={{background:'#1E293B', borderRadius:'16px', padding:'25px', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'40px'}}>
                        <h3 style={{fontSize:'1rem', color:'white', marginBottom:'20px', textTransform:'uppercase', fontStyle:'italic'}}>EVOLUÇÃO DE PONTOS (S{dashData.currentSeason})</h3>
                        <div style={{width:'100%', height: 250}}>
                             <ResponsiveContainer>
                                <AreaChart data={dashData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={teamColor} stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor={teamColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748B" tick={{fontSize: 12}} />
                                    <YAxis stroke="#64748B" tick={{fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor:'#0F172A', border:`1px solid ${teamColor}`, borderRadius:'8px', color:'white'}} />
                                    <Area type="monotone" dataKey="points" stroke={teamColor} strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* STATS CARREIRA */}
                <h3 className="stats-section-title" style={{color: 'var(--carreira-wine)', borderColor: 'var(--carreira-wine)'}}>GRID CARREIRA</h3>
                {dashData.statsCarreira.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="GPS" value={dashData.statsCarreira.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsCarreira.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsCarreira.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsCarreira.podiums} />
                        <StatCard label="PONTOS" value={dashData.statsCarreira.currentPoints.toFixed(0)} />
                        <StatCard label="MELHOR RES." value={dashData.statsCarreira.best === 999 ? '-' : `${dashData.statsCarreira.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Carreira.</div>}

                {/* STATS LIGHT */}
                <h3 className="stats-section-title" style={{marginTop:'40px', color: 'var(--light-blue)', borderColor: 'var(--light-blue)'}}>GRID LIGHT</h3>
                {dashData.statsLight.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="GPS" value={dashData.statsLight.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsLight.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsLight.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsLight.podiums} />
                        <StatCard label="PONTOS" value={dashData.statsLight.currentPoints.toFixed(0)} />
                        <StatCard label="MELHOR RES." value={dashData.statsLight.best === 999 ? '-' : `${dashData.statsLight.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Light.</div>}
            </div>
        </div>
    );
}

const StatCard = ({ label, value, color = 'white' }) => <div className="cockpit-stat-box"><div className="csb-value" style={{color}}>{value}</div><div className="csb-label">{label}</div></div>;
const containerStyle = { maxWidth:'500px', margin:'50px auto', background:'#1E293B', padding:'40px', borderRadius:'20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' };
const labelStyle = { display:'block', color:'#CBD5E1', fontSize:'0.7rem', fontWeight:'700', marginBottom:'5px', textTransform:'uppercase' };
const inputStyle = { width:'100%', padding:'12px', background:'#0F172A', color:'white', border:'1px solid var(--highlight-cyan)', borderRadius:'8px', fontSize:'1rem', outline:'none' };
const inputDisabledStyle = { ...inputStyle, color:'#64748B', border:'1px solid #334155', cursor:'not-allowed' };

export default Dashboard;