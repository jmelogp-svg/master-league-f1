import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';

// URL do CSV da Minicup
const MINICUP_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1709066718&single=true&output=csv';

// --- ÍCONES ---
const ArrowRightIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
const CalendarIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const FastLapIcon = () => (<svg className="fl-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const RecordIcon = () => (<svg className="rh-icon-small" viewBox="0 0 24 24" fill="currentColor" width="20"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>);

const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

const flagColors = { 'BÉLGICA': ['#000000', '#FDDA24', '#EF3340'], 'HOLANDA': ['#AE1C28', '#FFFFFF', '#21468B'], 'ITÁLIA': ['#009246', '#FFFFFF', '#CE2B37'], 'AZERBAIJÃO': ['#00B5E2', '#EF3340', '#509E2F'], 'SINGAPURA': ['#EF3340', '#FFFFFF'], 'EUA': ['#B22234', '#FFFFFF', '#3C3B6E'], 'MÉXICO': ['#006847', '#FFFFFF', '#CE1126'], 'BRASIL': ['#009C3B', '#FFDF00', '#002776'], 'LAS VEGAS': ['#B22234', '#FFFFFF', '#3C3B6E'], 'QATAR': ['#8D1B3D', '#FFFFFF'], 'ABU DHABI': ['#EF3340', '#007A3D', '#FFFFFF', '#000000'], 'BAHREIN': ['#EF3340', '#FFFFFF'], 'ARÁBIA SAUDITA': ['#006C35', '#FFFFFF'], 'AUSTRÁLIA': ['#00008B', '#FFFFFF', '#EF3340'], 'JAPÃO': ['#FFFFFF', '#BC002D'], 'CHINA': ['#DE2910', '#FFDE00'], 'MIAMI': ['#B22234', '#FFFFFF', '#3C3B6E'], 'EMÍLIA-ROMAGNA': ['#009246', '#FFFFFF', '#CE2B37'], 'MÔNACO': ['#EF3340', '#FFFFFF'], 'CANADÁ': ['#EF3340', '#FFFFFF'], 'ESPANHA': ['#AA151B', '#F1BF00'], 'ÁUSTRIA': ['#EF3340', '#FFFFFF'], 'INGLATERRA': ['#FFFFFF', '#CE1124', '#00247D'], 'HUNGRIA': ['#CE2939', '#FFFFFF', '#477050'], 'DEFAULT': ['#1E293B', '#0F172A'] };

const DriverImage = ({ name, gridType, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    // Prioriza pasta da temporada primeiro, depois SML, depois shadow
    const seasonSrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={seasonSrc} className={className} style={style} onError={handleError} alt="" />;
};

// Componente de imagem para Minicup - busca SML PRIMEIRO
const MinicupDriverImage = ({ name, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    // Prioriza SML primeiro para Minicup
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const carreiraS19Src = `/pilotos/carreira/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes('/SML/')) {
            e.target.src = carreiraS19Src;
        } else if (e.target.src.includes('/carreira/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={smlSrc} className={className} style={style} onError={handleError} alt="" />;
};

// Função para obter logo da equipe
const getTeamLogo = (teamName) => {
    if (!teamName || teamName.trim() === "") return null;
    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('renault')) return '/team-logos/f1-renault.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('alfaromeo') || t.includes('alfa romeo') || (t.includes('alfa') && !t.includes('tauri'))) return '/team-logos/f1-alfaromeo.png';
    if (t.includes('alphatauri') || t.includes('alpha tauri')) return '/team-logos/f1-alphatauri.png';
    if (t.includes('tororosso') || t.includes('toro rosso') || t.includes('toro')) return '/team-logos/f1-tororosso.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racingpoint') || (t.includes('racing') && t.includes('point'))) return '/team-logos/f1-racingpoint.png';
    if (t.includes('vcarb') || (t.includes('racing') && t.includes('bulls'))) return '/team-logos/f1-racingbulls.png';
    return null;
};

// Função específica para logos da minicup (usa pasta /team-logos/)
const getMinicupTeamLogo = (teamName) => {
    if (!teamName || teamName.trim() === "") return '/team-logos/f1-reserva.png';
    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t === "reserva" || t.includes('reserva')) return '/team-logos/f1-reserva.png';
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('renault')) return '/team-logos/f1-renault.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('alfaromeo') || t.includes('alfa romeo') || (t.includes('alfa') && !t.includes('tauri'))) return '/team-logos/f1-alfaromeo.png';
    if (t.includes('alphatauri') || t.includes('alpha tauri')) return '/team-logos/f1-alphatauri.png';
    if (t.includes('tororosso') || t.includes('toro rosso') || t.includes('toro')) return '/team-logos/f1-tororosso.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racingpoint') || (t.includes('racing') && t.includes('point'))) return '/team-logos/f1-racingpoint.png';
    if (t.includes('vcarb') || (t.includes('racing') && t.includes('bulls'))) return '/team-logos/f1-racingbulls.png';
    return '/team-logos/f1-reserva.png';
};

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => {
        if(!targetDate) return;
        const timer = setInterval(() => {
            const now = new Date().getTime(); const distance = targetDate - now;
            if (distance < 0) { clearInterval(timer); setTimeLeft(null); } 
            else { setTimeLeft({ days: Math.floor(distance / (1000 * 60 * 60 * 24)), hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) }); }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);
    if (!timeLeft) return <div className="live-badge">AO VIVO</div>;
    return <div className="hub-countdown"><div className="cd-unit"><span>{timeLeft.days}</span><small>DIAS</small></div>:<div className="cd-unit"><span>{timeLeft.hours}</span><small>HRS</small></div>:<div className="cd-unit"><span>{timeLeft.minutes}</span><small>MIN</small></div></div>;
};

const DriverModal = ({ driver, gridType, season, onClose, teamColor, teamLogo }) => {
    if (!driver) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="driver-card-layout">
                    <div className="card-left" style={{"--team-color": teamColor}}>
                        <DriverImage name={driver.name} gridType={gridType} season={season} className="card-driver-photo" />
                    </div>
                    <div className="card-right">
                        {teamLogo && <img src={teamLogo} className="card-team-logo" />}
                        <h2 className="card-name">{driver.name}</h2>
                        <h3 className="card-team-name" style={{color: teamColor}}>{driver.team}</h3>
                        <div className="stats-grid" style={{"--team-color": teamColor}}>
                            <div className="stat-box"><span>Pontos</span><div className="stat-value">{driver.stats.points}</div></div>
                            <div className="stat-box"><span>Vitórias</span><div className="stat-value">{driver.stats.wins}</div></div>
                            <div className="stat-box"><span>Pódios</span><div className="stat-value">{driver.stats.podiums}</div></div>
                            <div className="stat-box"><span>Poles</span><div className="stat-value">{driver.stats.poles}</div></div>
                            <div className="stat-box"><span>Corridas</span><div className="stat-value">{driver.stats.races}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function Home() {
    const navigate = useNavigate();
    const location = useLocation();

    // Verificar se é um retorno de OAuth de jurado (detectar hash na URL)
    useEffect(() => {
        const checkOAuthReturn = async () => {
            // Se há um hash de autenticação na URL (retorno do OAuth)
            if (window.location.hash && window.location.hash.includes('access_token')) {
                console.log('🔄 Detectado retorno de OAuth na Home...');
                
                // Aguardar a sessão ser processada
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    const email = session.user.email?.toLowerCase().trim();
                    console.log('📧 Email do OAuth:', email);
                    
                    // Verificar se é um jurado
                    const { data: jurado } = await supabase
                        .from('jurados')
                        .select('*')
                        .eq('email_google', email)
                        .eq('ativo', true)
                        .single();
                    
                    if (jurado) {
                        console.log('✅ É jurado! Redirecionando para /veredito...');
                        navigate('/veredito');
                        return;
                    }
                }
            }
        };
        
        checkOAuthReturn();
    }, [navigate]);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, tracks, seasons, loading } = useLeagueData();
    const [viewType, setViewType] = useState('hub'); 
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState(0);
    const [historicalRecord, setHistoricalRecord] = useState({ time: "9:59.999", driver: "-", season: "-" });
    const [selectedDriver, setSelectedDriver] = useState(null);

    // Adicionado: Hook para verificar se é mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [nextRaceData, setNextRaceData] = useState(null);
    const [topDrivers, setTopDrivers] = useState([]);
    const [topDriversLight, setTopDriversLight] = useState([]);
    const [seasonDrivers, setSeasonDrivers] = useState([]);
    const [minicupDrivers, setMinicupDrivers] = useState([]);

    const scrollRef = useRef(null);
    const minicupScrollRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isMinicupPaused, setIsMinicupPaused] = useState(false);

    const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

    // URL Sync
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const view = params.get('view');
        const grid = params.get('grid');
        if (view) setViewType(view); else setViewType('hub');
        if (grid) setGridType(grid);
    }, [location]);

    // Auto-scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || loading || seasonDrivers.length === 0) return;
        const interval = setInterval(() => {
            if (!isPaused) {
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) el.scrollLeft = 0;
                else el.scrollLeft += 1;
            }
        }, 30);
        return () => clearInterval(interval);
    }, [isPaused, loading, seasonDrivers]);

    // Auto-scroll Minicup
    useEffect(() => {
        const el = minicupScrollRef.current;
        if (!el || minicupDrivers.length === 0) return;
        const interval = setInterval(() => {
            if (!isMinicupPaused) {
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) el.scrollLeft = 0;
                else el.scrollLeft += 1;
            }
        }, 30);
        return () => clearInterval(interval);
    }, [isMinicupPaused, minicupDrivers]);

    // Buscar dados da Minicup
    useEffect(() => {
        const fetchMinicup = async () => {
            try {
                const response = await fetch(MINICUP_CSV_URL);
                const csvText = await response.text();
                
                Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const data = results.data;
                        const drivers = [];
                        
                        // Verificar se os dados foram parseados corretamente
                        if (!data || data.length === 0) {
                            console.warn('⚠️ Dados da Minicup vazios ou inválidos');
                            return;
                        }
                        
                        for (let i = 1; i < data.length; i++) {
                            const row = data[i];
                            if (!row || row.length < 3) continue;
                            
                            const piloto = row[1]?.trim();
                            const equipe = row[2]?.trim() || 'Reserva';
                            
                            if (!piloto) continue;

                            let totalPoints = 0;
                            for (let j = 4; j < 10; j++) {
                                const pos = parseInt(row[j]?.trim());
                                if (!isNaN(pos) && pos >= 1 && pos <= 20) {
                                    totalPoints += (21 - pos);
                                }
                            }

                            // Incluir TODOS os pilotos do grid, independente de terem pontos
                            drivers.push({ name: piloto, team: equipe, points: totalPoints });
                        }

                        // Ordenar por pontos (pilotos com pontos primeiro, depois os sem pontos)
                        drivers.sort((a, b) => b.points - a.points);
                        console.log('✅ Minicup drivers carregados:', drivers.length);
                        setMinicupDrivers(drivers);
                    },
                    error: (error) => {
                        console.error('❌ Erro ao parsear CSV da Minicup:', error);
                    }
                });
            } catch (err) {
                console.error('Erro ao carregar Minicup:', err);
            }
        };
        fetchMinicup();
    }, []);

    useEffect(() => { if (!loading && seasons.length > 0 && selectedSeason === 0) setSelectedSeason(seasons[0]); }, [seasons, loading]);

    // Hub Data
    useEffect(() => {
        if (loading || rawCarreira.length === 0) return;
        const today = new Date().getTime();
        let upcoming = null;
        const totals = {};
        const totalsLight = {};
        const targetSeason = seasons[0] || 19; 

        rawCarreira.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(targetSeason)) {
                const name = row[9];
                if (name) {
                    if (!totals[name]) totals[name] = { name, team: row[10], points: 0 };
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if (!isNaN(p)) totals[name].points += p;
                }
                const dateStr = row[0];
                if (dateStr && row[5]) {
                     const [d, m, y] = dateStr.includes('/') ? dateStr.split('/') : [0,0,0];
                     if(y) {
                        const rDate = new Date(`${y}-${m}-${d}`).getTime();
                        if (rDate >= today && (!upcoming || rDate < upcoming.timestamp)) {
                            upcoming = { gp: row[5], date: dateStr, timestamp: rDate, round: row[4] };
                        }
                     }
                }
            }
        });

        rawLight.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(targetSeason)) {
                const name = row[9];
                if (name) {
                    if (!totalsLight[name]) totalsLight[name] = { name, team: row[10], points: 0 };
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if (!isNaN(p)) totalsLight[name].points += p;
                }
            }
        });

        setNextRaceData(upcoming);
        const sorted = Object.values(totals).sort((a, b) => b.points - a.points);
        setTopDrivers(sorted.slice(0, 3));
        setTopDriversLight(Object.values(totalsLight).sort((a, b) => b.points - a.points).slice(0, 3));
        setSeasonDrivers(sorted); 
    }, [rawCarreira, rawLight, loading, seasons]);

    // Rounds
    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const roundSet = new Set();
        let maxRound = 0; 
        const today = new Date().getTime();
        const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); };
        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(selectedSeason)) {
                const r = parseInt(row[4]); const dateStr = row[0];
                if (!isNaN(r)) {
                    roundSet.add(r);
                    const rDate = parseDate(dateStr);
                    if (rDate <= today) { if (r > maxRound) maxRound = r; }
                }
            }
        });
        const sortedRounds = Array.from(roundSet).sort((a, b) => a - b);
        setRounds(sortedRounds);
        if (sortedRounds.length > 0) {
             if (selectedRound === 0 || !sortedRounds.includes(selectedRound)) {
                 const newRound = maxRound > 0 ? maxRound : sortedRounds[0];
                 setSelectedRound(newRound);
             }
        } else {
             setSelectedRound(0);
        }
    }, [selectedSeason, gridType, rawCarreira, rawLight]);

    // Histórico
    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        let currentGPName = "";
        for(let row of rawData) { if (parseInt(row[3]) === parseInt(selectedSeason) && parseInt(row[4]) === parseInt(selectedRound)) { currentGPName = normalizeStr(row[5]); break; } }
        if(currentGPName) {
            let bestTime = "9:59.999"; let bestDriver = "-"; let bestSeason = "-";
            [...rawCarreira, ...rawLight].forEach(row => {
                if(normalizeStr(row[5]) === currentGPName) {
                    const lap = row[11]; 
                    if (lap && lap.length > 4 && lap < bestTime && !lap.includes('DNF')) { bestTime = lap; bestDriver = row[9]; bestSeason = row[3]; }
                }
            });
            setHistoricalRecord({ time: bestTime !== "9:59.999" ? bestTime : "-", driver: bestDriver, season: bestSeason });
        }
    }, [selectedSeason, selectedRound, gridType, rawCarreira, rawLight]);

    // --- HELPERS DE LOGO REFORÇADOS ---
    const getTeamLogoReforcado = (teamName) => {
        if(!teamName) return null;
        const t = teamName.toLowerCase().replace(/\s/g, ''); 
        // Antigas
        if(t.includes("romeo") || (t.includes("alfa") && !t.includes("tauri"))) return "/team-logos/f1-alfaromeo.png";
        if(t.includes("alphatauri") || t.includes("alpha") || t.includes("tauri")) return "/team-logos/f1-alphatauri.png";
        if(t.includes("racingpoint") || t.includes("point") || t.includes("bwt")) return "/team-logos/f1-racingpoint.png";
        if(t.includes("renault")) return "/team-logos/f1-renault.png";
        if(t.includes("tororosso") || t.includes("toro")) return "/team-logos/f1-tororosso.png";
        // Atuais
        if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png"; 
        if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png"; 
        if(t.includes("alpine")) return "/team-logos/f1-alpine.png"; 
        if(t.includes("vcarb") || t.includes("racingbulls") || t.includes("rb")) return "/team-logos/f1-racingbulls.png"; 
        if(t.includes("redbull") || t.includes("oracle")) return "/team-logos/f1-redbull.png"; 
        if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png"; 
        if(t.includes("aston")) return "/team-logos/f1-astonmartin.png"; 
        if(t.includes("haas")) return "/team-logos/f1-haas.png"; 
        if(t.includes("williams")) return "/team-logos/f1-williams.png"; 
        if(t.includes("stake") || t.includes("sauber") || t.includes("kick")) return "/team-logos/f1-sauber.png";
        return null;
    };

    const getTeamColor = (teamName) => {
        if(!teamName) return "#94A3B8";
        const t = teamName.toLowerCase();
        if(t.includes("alfa") && !t.includes("tauri")) return "#900000";
        if(t.includes("alpha") || t.includes("tauri")) return "#FFFFFF";
        if(t.includes("racing point") || t.includes("bwt")) return "#F596C8";
        if(t.includes("renault")) return "#FFF500";
        if(t.includes("toro") || t.includes("rosso")) return "#469BFF";
        if(t.includes("red bull")) return "var(--f1-redbull)"; 
        if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
        if(t.includes("mercedes")) return "var(--f1-mercedes)"; 
        if(t.includes("mclaren")) return "var(--f1-mclaren)"; 
        if(t.includes("aston")) return "var(--f1-aston)"; 
        if(t.includes("alpine")) return "var(--f1-alpine)"; 
        if(t.includes("haas")) return "var(--f1-haas)"; 
        if(t.includes("williams")) return "var(--f1-williams)"; 
        if(t.includes("stake") || t.includes("sauber")) return "var(--f1-sauber)"; 
        if(t.includes("vcarb") || t.includes("racing bulls")) return "var(--f1-vcarb)"; 
        return "#94A3B8";
    };

    const getDriverStats = (driverName) => { const rawData = gridType === 'carreira' ? rawCarreira : rawLight; let stats = { points: 0, wins: 0, podiums: 0, poles: 0, races: 0 }; rawData.forEach(row => { const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return; if (row[9] === driverName) { stats.races++; const qualy = parseInt(row[6]); if (qualy === 1) stats.poles++; const racePos = parseInt(row[8]); if (racePos === 1) stats.wins++; if (racePos >= 1 && racePos <= 3) stats.podiums++; if (s >= 20) { let p = parseFloat((row[15]||'0').replace(',', '.')); if (!isNaN(p)) stats.points += p; } else { if (racePos >= 1 && racePos <= 10) stats.points += POINTS_RACE[racePos - 1]; const sprintPos = parseInt(row[7]); if (sprintPos >= 1 && sprintPos <= 8) stats.points += POINTS_SPRINT[sprintPos - 1]; } } }); stats.points = stats.points.toFixed(0); return stats; };
    const handleDriverClick = (driver) => { setSelectedDriver({ ...driver, stats: getDriverStats(driver.name) }); };
    
    const getDrivers = () => { const rawData = gridType === 'carreira' ? rawCarreira : rawLight; const totals = {}; rawData.forEach(row => { const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return; const name = row[9]; const team = row[10]; if (!name) return; if (!totals[name]) totals[name] = { name, team, points: 0 }; if (s >= 20) { let p = parseFloat((row[15]||'0').replace(',', '.')); if (!isNaN(p)) totals[name].points += p; } else { const racePos = parseInt(row[8]); if (racePos >= 1 && racePos <= 10) totals[name].points += POINTS_RACE[racePos - 1]; const sprintPos = parseInt(row[7]); if (sprintPos >= 1 && sprintPos <= 8) totals[name].points += POINTS_SPRINT[sprintPos - 1]; } }); return Object.values(totals).sort((a, b) => b.points - a.points).map((d, i) => ({ ...d, pos: i + 1 })); };
    const getConstructors = () => {
        const drivers = getDrivers();
        const teams = {};
        drivers.forEach(d => {
            if (!teams[d.team]) {
                teams[d.team] = { team: d.team, points: 0, driversList: [] };
            }
            teams[d.team].points += d.points;
            if (!teams[d.team].driversList.includes(d.name)) {
                teams[d.team].driversList.push(d.name);
            }
        });
        return Object.values(teams).sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, pos: i + 1 }));
    };
    // Função para formatar nome: primeiro nome primeira letra maiúscula (sem negrito), segundo nome todo maiúsculo (negrito)
    const formatDriverName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const lastName = parts.slice(1).join(' ').toUpperCase();
        return (
            <>
                <span style={{fontWeight: 400, display: 'block'}}>{firstName}</span>
                <span style={{fontWeight: 900, display: 'block'}}>{lastName}</span>
            </>
        );
    };
    
    // Função para formatar nome em uma linha (para lista de classificação)
    const formatDriverNameOneLine = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const lastName = parts.slice(1).join(' ').toUpperCase();
        return (
            <>
                <span style={{fontWeight: 400}}>{firstName}</span>
                <span style={{fontWeight: 400}}>&nbsp;</span>
                <span style={{fontWeight: 900}}>{lastName}</span>
            </>
        );
    };
    
    // Função para parsear tempo de volta
    const parseTime = (timeStr) => {
        if (!timeStr || timeStr === '-') return Infinity;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return parseInt(minutes) * 60000 + parseFloat(seconds) * 1000;
        }
        return Infinity;
    };
    
    const getRaceResults = () => { 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; 
        const raceResults = []; 
        rawData.forEach(row => { 
            const s = parseInt(row[3]); 
            const r = parseInt(row[4]); 
            if (s === parseInt(selectedSeason) && r === parseInt(selectedRound)) { 
                const pos = parseInt(row[8]); 
                if (!isNaN(pos)) { 
                    let stagePoints = 0; 
                    if (pos >= 1 && pos <= 10) stagePoints += POINTS_RACE[pos - 1]; 
                    const sprintPos = parseInt(row[7]); 
                    if (!isNaN(sprintPos) && sprintPos >= 1 && sprintPos <= 8) stagePoints += POINTS_SPRINT[sprintPos - 1]; 
                    raceResults.push({ 
                        pos: pos, 
                        name: row[9], 
                        team: row[10], 
                        date: row[0], 
                        gp: row[5], 
                        fastestLap: row[11] || '-', 
                        totalPoints: stagePoints 
                    }); 
                } 
            } 
        }); 
        return raceResults.sort((a, b) => a.pos - b.pos); 
    };
    const getCalendar = () => { const rawData = gridType === 'carreira' ? rawCarreira : rawLight; const raceMap = new Map(); rawData.forEach(row => { const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return; const r = parseInt(row[4]); if(!isNaN(r) && !raceMap.has(r)) { raceMap.set(r, { round: r, date: row[0], gp: row[5], winner: null, winnerTeam: null }); } if(parseInt(row[8]) === 1) { const race = raceMap.get(r); if(race) { race.winner = row[9]; race.winnerTeam = row[10]; } } }); const races = Array.from(raceMap.values()).sort((a,b) => a.round - b.round); const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); }; const today = new Date().getTime(); let nextRace = null; const processedRaces = races.map(race => { const rDate = parseDate(race.date); let status = 'soon'; if (race.winner) status = 'done'; else if (rDate >= today) { status = 'next'; if (!nextRace) nextRace = { ...race, timestamp: rDate }; } return { ...race, status }; }); return { races: processedRaces, nextRace }; };

    // --- HELPER PARA CLASSE CSS DO BOTÃO ---
    const getTabClass = (tabName) => {
        if (viewType === tabName) {
            return gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light';
        }
        return '';
    };

    const renderStandingsContent = () => {
        if (loading) return <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Carregando Dados...</div>;
        if (gridType === 'light' && parseInt(selectedSeason) < 16) {
            return (
                <div style={{textAlign: 'center', padding: '60px 20px', background: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '600px', margin: '40px auto'}}>
                    <div style={{fontSize: '4rem', marginBottom: '20px'}}>🚧</div>
                    <h2 style={{color: 'white', marginBottom: '10px'}}>TEMPORADA NÃO DISPONÍVEL</h2>
                    <p style={{color: '#94A3B8', marginBottom: '30px'}}>O <strong>Grid Light</strong> teve início apenas na <strong>Temporada 16</strong>.</p>
                    <button onClick={() => setSelectedSeason(16)} className="btn-primary" style={{textDecoration:'none', cursor:'pointer'}}>IR PARA TEMPORADA 16</button>
                </div>
            );
        }

        if (viewType === 'drivers') { 
            const data = getDrivers(); 
            const topCount = isMobile ? 3 : 5;
            const topDriversList = data.slice(0, topCount);
            const rest = data.slice(topCount);
            
            return ( 
                <>
                    {/* TOP CARDS */}
                    <div className="top5-container">
                        {topDriversList.map(driver => {
                            const teamColor = getTeamColor(driver.team);
                            const teamLogo = getTeamLogo(driver.team);
                            const maxPoints = topDriversList[0]?.points || driver.points;
                            const progressPercent = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;
                            return (
                                <article 
                                    key={driver.pos} 
                                    className="top5-card-new" 
                                    style={{"--team-color": teamColor}}
                                    onClick={() => handleDriverClick(driver)}
                                >
                                    {/* Rank Number - Top Left */}
                                    <div className="top5-rank-number">{driver.pos}º</div>
                                    
                                    {/* Team Logo - Top Right */}
                                    {teamLogo && (
                                        <div className="top5-team-logo-top">
                                            <img src={teamLogo} alt={driver.team} />
                                        </div>
                                    )}
                                    
                                    {/* Driver Photo */}
                                    <div className="top5-photo-container">
                                        <DriverImage 
                                            name={driver.name} 
                                            gridType={gridType} 
                                            season={selectedSeason} 
                                            className="top5-photo"
                                        />
                                    </div>
                                    
                                    {/* Driver Info */}
                                    <div className="top5-info">
                                        <div className="top5-driver-name">{formatDriverName(driver.name)}</div>
                                        <div className="top5-team-info">
                                            {teamLogo ? (
                                                <img src={teamLogo} className="top5-team-logo-info" alt={driver.team} />
                                            ) : (
                                                <div className="top5-team-initial-info" style={{"--team-color": teamColor}}>
                                                    {driver.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="top5-team-name" style={{color: teamColor}}>{driver.team}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Points Bar */}
                                    <div className="top5-points-container">
                                        <div className="top5-points-bar">
                                            <div 
                                                className="top5-points-fill" 
                                                style={{
                                                    width: `${progressPercent}%`,
                                                    background: `linear-gradient(90deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
                                                    "--fill-color": teamColor
                                                }}
                                            ></div>
                                        </div>
                                        <div className="top5-points-wrapper">
                                            <div className="top5-points-value">{driver.points.toFixed(0)}</div>
                                            <div className="top5-points-label">PONTOS</div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    
                    {/* LISTA DE CLASSIFICAÇÃO (6º - 18º) */}
                    <div className="classification-section-new">
                        {rest.map(driver => {
                            const teamColor = getTeamColor(driver.team);
                            const teamLogo = getTeamLogo(driver.team);
                            return (
                                <div 
                                    key={driver.pos} 
                                    className="classification-row-new" 
                                    style={{"--team-color": teamColor}}
                                    onClick={() => handleDriverClick(driver)}
                                >
                                    <div className="classification-left">
                                        <span className="classification-position">{driver.pos}º</span>
                                        <div className="classification-avatar" style={{"--team-color": teamColor}}>
                                            <DriverImage 
                                                name={driver.name} 
                                                gridType={gridType} 
                                                season={selectedSeason} 
                                                className="classification-photo"
                                            />
                                        </div>
                                        <div className="classification-driver-name">
                                            {formatDriverNameOneLine(driver.name)}
                                            <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.7, marginTop: '2px', fontWeight: 400}}>{driver.team}</small>
                                        </div>
                                    </div>
                                    <div className="classification-right">
                                        <div className="classification-team-info">
                                            {teamLogo ? (
                                                <img src={teamLogo} className="classification-team-logo" alt={driver.team} />
                                            ) : (
                                                <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                    {driver.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="classification-team-name">
                                                {driver.team}
                                            </span>
                                        </div>
                                        <div className="classification-points">
                                            <span className="classification-points-value">{driver.points.toFixed(0)}</span>
                                            <span className="classification-points-label">PTS</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </> 
            ); 
        }
        if (viewType === 'teams') {
            const data = getConstructors();
            return (
                <>
                    <div className="classification-section-new">
                        {data.map(team => {
                            const teamColor = getTeamColor(team.team);
                            const teamLogo = getTeamLogo(team.team);
                            return (
                                <div 
                                    key={team.pos} 
                                    className="classification-row-new" 
                                    style={{"--team-color": teamColor}}
                                >
                                    <div className="classification-left">
                                        <span className="classification-position">{team.pos}º</span>
                                        <div className="classification-team-logo-container">
                                            {teamLogo ? (
                                                <img src={teamLogo} className="classification-team-logo" alt={team.team} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                    {team.team.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="classification-driver-name">{team.team}</div>
                                    </div>
                                    <div className="classification-right">
                                        <div className="classification-team-info">
                                            <span className="classification-team-name" style={{color: '#94A3B8', fontSize: '0.85rem'}}>
                                                {team.driversList.join(' & ')}
                                            </span>
                                        </div>
                                        <div className="classification-points">
                                            <span className="classification-points-value">{team.points.toFixed(0)}</span>
                                            <span className="classification-points-label">PTS</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            );
        }
        
        // CORREÇÃO AQUI: INCLUSÃO DA LOGO NO PÓDIO DA TABELA DE RESULTADOS
        if (viewType === 'results') { 
            const data = getRaceResults(); 
            if(data.length === 0) return <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Sem resultados para esta etapa.</div>; 
            
            const podium = data.slice(0,3); 
            const rest = data.slice(3); 
            const p1 = podium.find(p=>p.pos===1); 
            const p2 = podium.find(p=>p.pos===2); 
            const p3 = podium.find(p=>p.pos===3); 
            const gpInfo = tracks[normalizeStr(data[0].gp)] || {}; 
            
            // Encontrar a melhor volta (menor tempo)
            const validLaps = data.filter(r => r.fastestLap && r.fastestLap !== '-').map(r => ({...r, timeMs: parseTime(r.fastestLap)}));
            const bestLapData = validLaps.length > 0 ? validLaps.reduce((best, current) => current.timeMs < best.timeMs ? current : best) : null;
            const bestLap = bestLapData ? bestLapData.fastestLap : null;
            
            return ( <> 
                <div className="race-header-card">
                    <div className="rh-left">
                        <div className="rh-flag-container">{gpInfo.flag && <img src={gpInfo.flag} className="rh-flag" alt="" />}</div>
                        <div className="rh-info">
                            <div className="rh-gp">{data[0].gp}</div>
                            <div className="rh-details-line">{gpInfo.circuitName} {gpInfo.circuit && <span className="hide-mobile" style={{marginLeft:10}}>• Pista</span>}<span className="rh-divider">|</span><span className="rh-date">{data[0].date}</span></div>
                        </div>
                    </div>
                    <div className="rh-right">
                        <div className="rh-record"><RecordIcon/> Recorde: <strong>{historicalRecord.time}</strong> <small style={{marginLeft:5, opacity:0.7}}>({historicalRecord.driver})</small></div>
                        {gpInfo.circuit && <img src={gpInfo.circuit} className="rh-circuit" style={{height:50, marginTop:5, filter:'invert(1)'}} alt="" />}
                    </div>
                </div> 
                
                <div className="results-layout">
                    <div className="podium-container">
                        <div className="podium-left">
                            {p2 && (
                                <div key={p2.name} className={`podium-step podium-p${p2.pos}`} style={{"--team-color":getTeamColor(p2.team)}} onClick={()=>handleDriverClick(p2)}>
                                    <div className="podium-position-left">{p2.pos}º</div>
                                    <div className="podium-team-logo-top">
                                        {getTeamLogo(p2.team) ? (
                                            <img src={getTeamLogo(p2.team)} className="podium-team-logo-top-img" alt={p2.team} />
                                        ) : (
                                            <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p2.team)}}>
                                                {p2.team.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="podium-photo-container">
                                        <DriverImage name={p2.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                    </div>
                                    <div className="podium-base">
                                        <div className="podium-driver-name">{formatDriverName(p2.name)}</div>
                                        <div className="podium-team-info">
                                            <span className="podium-team-name" style={{color: getTeamColor(p2.team)}}>
                                                {p2.team}
                                            </span>
                                        </div>
                                        <div className="podium-stats">
                                            {p2.fastestLap && p2.fastestLap !== '-' && (
                                                <div className={`podium-fastest-lap ${p2.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                    <FastLapIcon />
                                                    {p2.fastestLap}
                                                </div>
                                            )}
                                            <div className="podium-stat-item points">+{p2.totalPoints}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="podium-center">
                            {p1 && (
                                <div key={p1.name} className={`podium-step podium-p${p1.pos}`} style={{"--team-color":getTeamColor(p1.team)}} onClick={()=>handleDriverClick(p1)}>
                                    <div className="podium-position-left">{p1.pos}º</div>
                                    <div className="podium-team-logo-top">
                                        {getTeamLogo(p1.team) ? (
                                            <img src={getTeamLogo(p1.team)} className="podium-team-logo-top-img" alt={p1.team} />
                                        ) : (
                                            <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p1.team)}}>
                                                {p1.team.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="podium-photo-container">
                                        <DriverImage name={p1.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                    </div>
                                    <div className="podium-base">
                                        <div className="podium-driver-name">{formatDriverName(p1.name)}</div>
                                        <div className="podium-team-info">
                                            <span className="podium-team-name" style={{color: getTeamColor(p1.team)}}>
                                                {p1.team}
                                            </span>
                                        </div>
                                        <div className="podium-stats">
                                            {p1.fastestLap && p1.fastestLap !== '-' && (
                                                <div className={`podium-fastest-lap ${p1.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                    <FastLapIcon />
                                                    {p1.fastestLap}
                                                </div>
                                            )}
                                            <div className="podium-stat-item points">+{p1.totalPoints}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="podium-right">
                            {p3 && (
                                <div key={p3.name} className={`podium-step podium-p${p3.pos}`} style={{"--team-color":getTeamColor(p3.team)}} onClick={()=>handleDriverClick(p3)}>
                                    <div className="podium-position-left">{p3.pos}º</div>
                                    <div className="podium-team-logo-top">
                                        {getTeamLogo(p3.team) ? (
                                            <img src={getTeamLogo(p3.team)} className="podium-team-logo-top-img" alt={p3.team} />
                                        ) : (
                                            <div className="podium-team-initial-top" style={{"--team-color": getTeamColor(p3.team)}}>
                                                {p3.team.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="podium-photo-container">
                                        <DriverImage name={p3.name} gridType={gridType} season={selectedSeason} className="podium-photo"/>
                                    </div>
                                    <div className="podium-base">
                                        <div className="podium-driver-name">{formatDriverName(p3.name)}</div>
                                        <div className="podium-team-info">
                                            <span className="podium-team-name" style={{color: getTeamColor(p3.team)}}>
                                                {p3.team}
                                            </span>
                                        </div>
                                        <div className="podium-stats">
                                            {p3.fastestLap && p3.fastestLap !== '-' && (
                                                <div className={`podium-fastest-lap ${p3.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                                    <FastLapIcon />
                                                    {p3.fastestLap}
                                                </div>
                                            )}
                                            <div className="podium-stat-item points">+{p3.totalPoints}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div> 
                
                <div className="classification-section-new">
                    {rest.map(r => {
                        const teamColor = getTeamColor(r.team);
                        const teamLogo = getTeamLogo(r.team);
                        return (
                            <div 
                                key={r.pos} 
                                className="classification-row-new" 
                                style={{"--team-color": teamColor}}
                                onClick={() => handleDriverClick(r)}
                            >
                                <div className="classification-left">
                                    <span className="classification-position">{r.pos}º</span>
                                    <div className="classification-avatar" style={{"--team-color": teamColor}}>
                                        <DriverImage 
                                            name={r.name} 
                                            gridType={gridType} 
                                            season={selectedSeason} 
                                            className="classification-photo"
                                        />
                                    </div>
                                    <div className="classification-driver-name">{formatDriverNameOneLine(r.name)}</div>
                                    <div className="classification-team-info">
                                        {teamLogo ? (
                                            <img src={teamLogo} className="classification-team-logo" alt={r.team} />
                                        ) : (
                                            <div className="classification-team-initial" style={{"--team-color": teamColor}}>
                                                {r.team.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="classification-team-name">
                                            {r.team}
                                        </span>
                                    </div>
                                </div>
                                <div className="classification-right">
                                    {r.fastestLap && r.fastestLap !== '-' && (
                                        <div className={`classification-fastest-lap ${r.fastestLap === bestLap ? 'best-lap' : ''}`}>
                                            <FastLapIcon />
                                            {r.fastestLap}
                                        </div>
                                    )}
                                        <div className="classification-points">
                                            <span className="classification-points-value">+{r.totalPoints}</span>
                                            <span className="classification-points-label">PTS</span>
                                        </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </> ); 
        }
    };

    const nextGPInfo = nextRaceData ? (tracks[normalizeStr(nextRaceData.gp)] || {}) : {};

    return (
        <div className="page-wrapper">

            {viewType === 'hub' ? (
                <>
                    <header className="hub-hero">
                        <div className="hero-overlay"></div>
                        <div className="hero-content">
                            <span className="hero-badge">TEMPORADA {selectedSeason}</span>
                            <h1 className="hero-title">SUPERANDO<br/>SEUS LIMITES</h1>
                            <p className="hero-subtitle">Confira as análises completas da última etapa e prepare-se para o próximo GP.</p>
                            <div className="hero-actions">
                                <button className="btn-primary hero-btn" onClick={() => setViewType('drivers')}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="9" y1="21" x2="9" y2="9"></line>
                                    </svg>
                                    <span className="hero-btn-label">TABELAS</span>
                                </button>

                                <a href="https://masterleaguet20-inscricao.base44.app/login?from_url=https%3A%2F%2Fmasterleaguet20-inscricao.base44.app%2F" target="_blank" rel="noopener noreferrer" className="btn-inscricao hero-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"/>
                                        <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                    </svg>
                                    <span className="hero-btn-label">INSCRIÇÃO</span>
                                </a>

                                <a href="https://chat.whatsapp.com/K3UKMSXPoZv8BaYSMGRCuK" target="_blank" rel="noopener noreferrer" className="btn-whatsapp hero-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span className="hero-btn-label">WHATSAPP</span>
                                </a>
                            </div>
                        </div>
                        {nextRaceData && (
                            <div className="next-race-widget">
                                <div className="nr-header"><span className="nr-label">PRÓXIMA ETAPA</span><span className="nr-date"><CalendarIcon/> {nextRaceData.date}</span></div>
                                <div className="nr-body"><div className="nr-flag">{nextGPInfo.flag && <img src={nextGPInfo.flag} alt="Flag" />}</div><div className="nr-info"><div className="nr-round">ROUND {nextRaceData.round}</div><div className="nr-gp">{nextRaceData.gp}</div></div></div>
                                <div className="nr-footer"><Countdown targetDate={nextRaceData.timestamp} /></div>
                            </div>
                        )}
                    </header>

                    <div className="hub-container">
                        {/* GRID MINICUP */}
                        {minicupDrivers.length > 0 && (
                            <section className="hub-section minicup-section">
                                <div className="section-header-hub" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <img src="/team-logos/minicup-logo.jpg" alt="Minicup" style={{ height: '40px', borderRadius: '6px' }} onError={(e) => e.target.style.display = 'none'} />
                                    <h2 style={{ color: '#22C55E' }}>GRID MINICUP</h2>
                                    <div className="header-line" style={{ background: 'linear-gradient(90deg, #22C55E, transparent)' }}></div>
                                    <Link to="/minicup" className="btn-text" style={{ marginLeft: 'auto', color: '#22C55E' }}>Ver Classificação <ArrowRightIcon/></Link>
                                </div>
                                <div className="drivers-grid-hub minicup-grid" ref={minicupScrollRef} onMouseEnter={() => setIsMinicupPaused(true)} onMouseLeave={() => setIsMinicupPaused(false)} style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.05), transparent, rgba(34,197,94,0.05))' }}>
                                    {minicupDrivers.map((d, idx) => {
                                        const nameParts = d.name.split(' ');
                                        const firstName = nameParts[0];
                                        const lastName = nameParts.slice(1).join(' ');
                                        const teamLogo = getMinicupTeamLogo(d.team);
                                        return (
                                        <div key={d.name} className="driver-card-hub minicup-card" style={{"--team-color": '#22C55E', border: idx === 0 ? '2px solid #22C55E' : '1px solid rgba(34,197,94,0.3)'}}>
                                            <div className="dch-bg" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), transparent)' }}></div>
                                            <div className="dch-photo-wrapper"><MinicupDriverImage name={d.name} className="dch-photo" /></div>
                                            <div className="dch-info">
                                                <div className="dch-name">
                                                    <span className="dch-firstname">{firstName}</span>
                                                    <span className="dch-lastname">{lastName}</span>
                                                </div>
                                                <div className="dch-team" style={{ color: idx === 0 ? '#22C55E' : '#64748B' }}>{idx === 0 ? '👑 Líder' : d.team}</div>
                                                <img 
                                                    src={teamLogo} 
                                                    alt={d.team || 'Master League'} 
                                                    style={{ 
                                                        position: 'absolute', 
                                                        bottom: '8px', 
                                                        right: '8px', 
                                                        width: '28px', 
                                                        height: '28px', 
                                                        objectFit: 'contain',
                                                        opacity: 0.9,
                                                        filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                                                    }} 
                                                />
                                            </div>
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: idx === 0 ? '#22C55E' : 'rgba(34,197,94,0.2)', color: idx === 0 ? '#000' : '#22C55E', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>
                                                {d.points} pts
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <section className="hub-section">
                            <div className="section-header-hub"><h2>GRID CARREIRA T19</h2><div className="header-line"></div></div>
                            <div className="drivers-grid-hub" ref={scrollRef} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                                {seasonDrivers.map(d => {
                                    const nameParts = d.name.split(' ');
                                    const firstName = nameParts[0];
                                    const lastName = nameParts.slice(1).join(' ');
                                    const teamLogo = getTeamLogo(d.team);
                                    return (
                                    <div key={d.name} className="driver-card-hub" style={{"--team-color": getTeamColor(d.team)}} onClick={() => handleDriverClick(d)}>
                                        <div className="dch-bg"></div>
                                        <div className="dch-photo-wrapper"><DriverImage name={d.name} gridType="carreira" season={selectedSeason} className="dch-photo" /></div>
                                        <div className="dch-info">
                                            <div className="dch-name">
                                                <span className="dch-firstname">{firstName}</span>
                                                <span className="dch-lastname">{lastName}</span>
                                            </div>
                                            <div className="dch-team">{d.team}</div>
                                            <img 
                                                src={teamLogo} 
                                                alt={d.team || 'Master League'} 
                                                style={{ 
                                                    position: 'absolute', 
                                                    bottom: '8px', 
                                                    right: '8px', 
                                                    width: '28px', 
                                                    height: '28px', 
                                                    objectFit: 'contain',
                                                    opacity: 0.9,
                                                    filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="hub-split-section">
                            <div className="hub-col-left">
                                <div className="section-header-hub"><h2>TOP 3 - CARREIRA</h2><button className="btn-text" onClick={() => navigate('/?view=drivers&grid=carreira')}>Ver Todos <ArrowRightIcon/></button></div>
                                <div className="mini-standings">
                                    {topDrivers.map((d, i) => (
                                        <div key={d.name} className={`ms-row rank-${i+1}`} onClick={() => handleDriverClick(d)} style={{cursor:'pointer'}}>
                                            <div className="ms-pos">{i+1}</div>
                                            <div className="ms-driver"><DriverImage name={d.name} gridType="carreira" season={selectedSeason} className="ms-photo" /><div className="ms-info"><span className="ms-name">{d.name}</span><span className="ms-team">{d.team}</span></div></div>
                                            <div className="ms-pts">{d.points.toFixed(0)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="hub-col-right">
                                <div className="section-header-hub"><h2>TOP 3 - LIGHT</h2><button className="btn-text" onClick={() => { setGridType('light'); navigate('/?view=drivers&grid=light'); }}>Ver Todos <ArrowRightIcon/></button></div>
                                <div className="mini-standings">
                                    {topDriversLight.map((d, i) => (
                                        <div key={d.name} className={`ms-row rank-${i+1}`} onClick={() => handleDriverClick({ ...d, gridType: 'light' })} style={{cursor:'pointer'}}>
                                            <div className="ms-pos">{i+1}</div>
                                            <div className="ms-driver"><DriverImage name={d.name} gridType="light" season={selectedSeason} className="ms-photo" /><div className="ms-info"><span className="ms-name">{d.name}</span><span className="ms-team">{d.team}</span></div></div>
                                            <div className="ms-pts">{d.points.toFixed(0)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                        
                        <section className="hub-section">
                            <div className="section-header-hub"><h2>ACESSO RÁPIDO</h2></div>
                            <div className="quick-links-grid">
                                <Link to="/mercado" className="ql-card style-mercado"><div className="ql-icon">💰</div><div className="ql-info"><h3>MERCADO</h3><span>Negocie pilotos</span></div></Link>
                                <Link to="/telemetria" className="ql-card style-analises"><div className="ql-icon">📊</div><div className="ql-info"><h3>TELEMETRIA</h3><span>Dados avançados</span></div></Link>
                                <Link to="/halloffame" className="ql-card style-hof"><div className="ql-icon">🏆</div><div className="ql-info"><h3>HALL DA FAMA</h3><span>Lendas</span></div></Link>
                            </div>
                        </section>
                    </div>
                </>
            ) : (
                <div className="hub-container">
                    <section className="standings-section">
                        <div className="tabs-container">
                            <button className={`tab-btn ${getTabClass('drivers')}`} onClick={() => navigate('/?view=drivers')}>PILOTOS</button>
                            <button className={`tab-btn ${getTabClass('teams')}`} onClick={() => navigate('/?view=teams')}>EQUIPES</button>
                            <button className={`tab-btn ${getTabClass('results')}`} onClick={() => navigate('/?view=results')}>RESULTADOS</button>
                        </div>
                        <div className="section-header">
                            <div className="title-container">
                                <h2 className="section-title" style={{marginBottom: '0', lineHeight: '1'}}>
                                    {viewType === 'drivers' && "CLASSIFICAÇÃO DE PILOTOS"}
                                    {viewType === 'teams' && "CLASSIFICAÇÃO DE EQUIPES"}
                                    {viewType === 'results' && "RESULTADOS POR ETAPA"}
                                </h2>
                                <div style={{fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '5px', color: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)'}}>{gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}</div>
                            </div>
                            <div className="controls-wrapper">
                                <div className="grid-toggle">
                                    <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>GRID CARREIRA</button>
                                    <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>GRID LIGHT</button>
                                </div>
                                <div className="dropdown-group">
                                    <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>{seasons.map(s => <option key={s} value={s}>{`Temporada ${s}`}</option>)}</select>
                                    {viewType === 'results' && <select className="season-select" value={selectedRound} onChange={(e) => setSelectedRound(parseInt(e.target.value))} style={{borderColor:'var(--highlight-cyan)'}}>{rounds.map(r => <option key={r} value={r}>{`Etapa ${r}`}</option>)}</select>}
                                </div>
                            </div>
                        </div>
                        <div className={`table-container ${gridType === 'carreira' ? 'glow-carreira' : 'glow-light'}`}>{renderStandingsContent()}</div>
                    </section>
                </div>
            )}

            {selectedDriver && <DriverModal driver={selectedDriver} gridType={selectedDriver.gridType || gridType} season={selectedSeason} onClose={() => setSelectedDriver(null)} teamColor={getTeamColor(selectedDriver.team)} teamLogo={getTeamLogo(selectedDriver.team)} />}
            <footer><div className="nav-logo" style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>MASTER <span>LEAGUE</span></div><p style={{color:'#94A3B8'}}>© 2025. Acelere para a glória.</p>
            <Link to="/admin" style={{fontSize: '0.7rem', color: '#334155', textDecoration: 'none', marginTop: '20px', display: 'block'}}>Área Administrativa</Link>
            </footer>
        </div>
    );
}

export default Home;