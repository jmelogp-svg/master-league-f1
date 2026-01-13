import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';

// --- CONSTANTES DE PONTUAÇÃO ---
const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

// --- ÍCONES SVG ---
const FastLapIcon = () => (<svg className="fl-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const RecordIcon = () => (<svg className="rh-icon-small" viewBox="0 0 24 24" fill="currentColor" width="20"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>);

// CORES DE BANDEIRAS
const flagColors = {
    'BÉLGICA': ['#000000', '#FDDA24', '#EF3340'], 'HOLANDA': ['#AE1C28', '#FFFFFF', '#21468B'], 'ITÁLIA': ['#009246', '#FFFFFF', '#CE2B37'], 'AZERBAIJÃO': ['#00B5E2', '#EF3340', '#509E2F'], 'SINGAPURA': ['#EF3340', '#FFFFFF'], 'EUA': ['#B22234', '#FFFFFF', '#3C3B6E'], 'MÉXICO': ['#006847', '#FFFFFF', '#CE1126'], 'BRASIL': ['#009C3B', '#FFDF00', '#002776'], 'LAS VEGAS': ['#B22234', '#FFFFFF', '#3C3B6E'], 'QATAR': ['#8D1B3D', '#FFFFFF'], 'ABU DHABI': ['#EF3340', '#007A3D', '#FFFFFF', '#000000'], 'BAHREIN': ['#EF3340', '#FFFFFF'], 'ARÁBIA SAUDITA': ['#006C35', '#FFFFFF'], 'AUSTRÁLIA': ['#00008B', '#FFFFFF', '#EF3340'], 'JAPÃO': ['#FFFFFF', '#BC002D'], 'CHINA': ['#DE2910', '#FFDE00'], 'MIAMI': ['#B22234', '#FFFFFF', '#3C3B6E'], 'EMÍLIA-ROMAGNA': ['#009246', '#FFFFFF', '#CE2B37'], 'MÔNACO': ['#EF3340', '#FFFFFF'], 'CANADÁ': ['#EF3340', '#FFFFFF'], 'ESPANHA': ['#AA151B', '#F1BF00'], 'ÁUSTRIA': ['#EF3340', '#FFFFFF'], 'INGLATERRA': ['#FFFFFF', '#CE1124', '#00247D'], 'HUNGRIA': ['#CE2939', '#FFFFFF', '#477050'], 'DEFAULT': ['#1E293B', '#0F172A'] 
};

// --- COMPONENTES AUXILIARES ---
const DriverImage = ({ name, gridType, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const seasonSrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const [imgSrc, setImgSrc] = useState(seasonSrc);
    useEffect(() => { setImgSrc(seasonSrc); }, [name, gridType, season]);
    
    const handleError = () => {
        if (imgSrc.includes(`/s${season}/`)) {
            setImgSrc(smlSrc);
        } else if (imgSrc.includes('/SML/')) {
            setImgSrc(shadowSrc);
        }
    };
    
    return <img src={imgSrc} className={className} style={style} alt="" onError={handleError} />;
};

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({});
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime(); const distance = targetDate - now;
            if (distance < 0) { clearInterval(timer); setTimeLeft(null); } 
            else { setTimeLeft({ days: Math.floor(distance / (1000 * 60 * 60 * 24)), hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) }); }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);
    if (!timeLeft) return <div>Corrida em Andamento!</div>;
    return (
        <div className="countdown-box">
            <div className="cd-item"><div className="cd-val">{timeLeft.days}</div><div className="cd-label">Dias</div></div>
            <div className="cd-item"><div className="cd-val">{timeLeft.hours}</div><div className="cd-label">Horas</div></div>
            <div className="cd-item"><div className="cd-val">{timeLeft.minutes}</div><div className="cd-label">Min</div></div>
        </div>
    );
};

const DriverModal = ({ driver, gridType, season, onClose, teamColor, teamLogo }) => {
    if (!driver) return null;
    const labelStyle = { color: '#CBD5E1', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' };
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
                            <div className="stat-box"><span style={labelStyle}>Pontos</span><div className="stat-value">{driver.stats.points}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Vitórias</span><div className="stat-value">{driver.stats.wins}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Pódios</span><div className="stat-value">{driver.stats.podiums}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Poles</span><div className="stat-value">{driver.stats.poles}</div></div>
                            <div className="stat-box"><span style={labelStyle}>Corridas</span><div className="stat-value">{driver.stats.races}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE STANDINGS (ANTIGA HOME) ---
function Standings() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, tracks, seasons, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira');
    const [viewType, setViewType] = useState('drivers');
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState(0);
    const [historicalRecord, setHistoricalRecord] = useState({ time: "9:59.999", driver: "-", season: "-" });
    const [selectedDriver, setSelectedDriver] = useState(null);

    const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

    useEffect(() => { if (!loading && seasons.length > 0 && selectedSeason === 0) setSelectedSeason(seasons[0]); }, [seasons, loading]);

    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const roundSet = new Set(); let maxRound = 0; let lastRaceDate = 0; const today = new Date().getTime();
        const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); };
        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s === parseInt(selectedSeason)) {
                const r = parseInt(row[4]); const dateStr = row[0];
                if (!isNaN(r)) {
                    roundSet.add(r); const rDate = parseDate(dateStr);
                    if (rDate <= today && rDate > lastRaceDate) { lastRaceDate = rDate; maxRound = r; }
                }
            }
        });
        const sortedRounds = Array.from(roundSet).sort((a, b) => b - a);
        setRounds(sortedRounds);
        if (maxRound > 0) setSelectedRound(maxRound); else if (sortedRounds.length > 0) setSelectedRound(sortedRounds[0]);
    }, [selectedSeason, gridType, rawCarreira, rawLight]);

    useEffect(() => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        let currentGPName = "";
        for(let row of rawData) { if (parseInt(row[3]) === parseInt(selectedSeason) && parseInt(row[4]) === parseInt(selectedRound)) { currentGPName = normalizeStr(row[5]); break; } }
        if(currentGPName) {
            let bestTime = "9:59.999"; let bestDriver = "-"; let bestSeason = "-";
            [...rawCarreira, ...rawLight].forEach(row => {
                if(normalizeStr(row[5]) === currentGPName) {
                    const lap = row[11]; 
                    if (lap && lap.length > 4 && lap < bestTime) { bestTime = lap; bestDriver = row[9]; bestSeason = row[3]; }
                }
            });
            setHistoricalRecord({ time: bestTime !== "9:59.999" ? bestTime : "-", driver: bestDriver, season: bestSeason });
        }
    }, [selectedSeason, selectedRound, gridType, rawCarreira, rawLight]);

    // Helpers (Stats, Logos, Colors, Getters...)
    // (Mantendo a mesma lógica de antes, omitindo linhas repetitivas para economizar espaço visual, mas o código deve ser completo igual ao anterior)
    const getDriverStats = (driverName) => { /* Lógica Mantida */ 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        let stats = { points: 0, wins: 0, podiums: 0, poles: 0, races: 0 };
        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s !== parseInt(selectedSeason)) return;
            if (row[9] === driverName) {
                stats.races++;
                const qualy = parseInt(row[6]); if (qualy === 1) stats.poles++;
                const racePos = parseInt(row[8]); if (racePos === 1) stats.wins++; if (racePos >= 1 && racePos <= 3) stats.podiums++;
                if (s >= 20) { let p = parseFloat((row[15]||'0').replace(',', '.')); if (!isNaN(p)) stats.points += p; }
                else { if (racePos >= 1 && racePos <= 10) stats.points += POINTS_RACE[racePos - 1]; const sprintPos = parseInt(row[7]); if (sprintPos >= 1 && sprintPos <= 8) stats.points += POINTS_SPRINT[sprintPos - 1]; }
            }
        });
        stats.points = stats.points.toFixed(0);
        return stats;
    };
    const handleDriverClick = (driver) => { setSelectedDriver({ ...driver, stats: getDriverStats(driver.name) }); };
    const getTeamLogo = (teamName) => {
        if(!teamName) return null;
        const t = teamName.toLowerCase().replace(/\s/g, ''); 
        if(t.includes("ferrari")) return "/logos/ferrari.png"; if(t.includes("mercedes")) return "/logos/mercedes.png"; if(t.includes("alpine")) return "/logos/alpine.png"; if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "/logos/racingbulls.png"; if(t.includes("redbull") || t.includes("oracle")) return "/logos/redbull.png"; if(t.includes("mclaren")) return "/logos/mclaren.png"; if(t.includes("aston")) return "/logos/astonmartin.png"; if(t.includes("haas")) return "/logos/haas.png"; if(t.includes("williams")) return "/logos/williams.png"; if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/logos/sauber.png";
        return null;
    };
    const getTeamColor = (teamName) => {
        if(!teamName) return "#94A3B8";
        const t = teamName.toLowerCase();
        if(t.includes("red bull") || t.includes("oracle")) return "var(--f1-redbull)"; if(t.includes("ferrari")) return "var(--f1-ferrari)"; if(t.includes("mercedes")) return "var(--f1-mercedes)"; if(t.includes("mclaren")) return "var(--f1-mclaren)"; if(t.includes("aston")) return "var(--f1-aston)"; if(t.includes("alpine")) return "var(--f1-alpine)"; if(t.includes("haas")) return "var(--f1-haas)"; if(t.includes("williams")) return "var(--f1-williams)"; if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)"; if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "var(--f1-vcarb)";
        return "#94A3B8";
    };

    const getDrivers = () => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        console.log('🔍 getDrivers - gridType:', gridType, 'rawData length:', rawData.length, 'selectedSeason:', selectedSeason);
        
        const totals = {};
        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s !== parseInt(selectedSeason)) return;
            const name = row[9];
            const team = row[10];
            if (!name) return;
            
            if (!totals[name]) totals[name] = { name, team, points: 0 };
            
            if (s >= 20) {
                // Temporada 20+: usar coluna de pontos direta (coluna 15)
                let p = parseFloat((row[15]||'0').replace(',', '.'));
                if (!isNaN(p)) totals[name].points += p;
            } else {
                // Temporadas anteriores: calcular pontos baseado nas posições
                const racePos = parseInt(row[8]);
                if (racePos >= 1 && racePos <= 10) totals[name].points += POINTS_RACE[racePos - 1];
                const sprintPos = parseInt(row[7]);
                if (sprintPos >= 1 && sprintPos <= 8) totals[name].points += POINTS_SPRINT[sprintPos - 1];
            }
        });
        
        const result = Object.values(totals).sort((a, b) => b.points - a.points).map((d, i) => ({ ...d, pos: i + 1 }));
        console.log('✅ getDrivers - result:', result.length, 'drivers');
        return result;
    };
    const getConstructors = () => { /* Mesma Lógica */ 
        const drivers = getDrivers(); const teams = {}; drivers.forEach(d => { if (!teams[d.team]) teams[d.team] = { team: d.team, points: 0, driversList: [] }; teams[d.team].points += d.points; if (!teams[d.team].driversList.includes(d.name)) teams[d.team].driversList.push(d.name); });
        return Object.values(teams).sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, pos: i + 1 }));
    };
    const getRaceResults = () => { /* Mesma Lógica */ 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; const raceResults = [];
        rawData.forEach(row => {
            const s = parseInt(row[3]); const r = parseInt(row[4]);
            if (s === parseInt(selectedSeason) && r === parseInt(selectedRound)) {
                const pos = parseInt(row[8]);
                if (!isNaN(pos)) {
                    let stagePoints = 0; if (pos >= 1 && pos <= 10) stagePoints += POINTS_RACE[pos - 1]; const sprintPos = parseInt(row[7]); if (!isNaN(sprintPos) && sprintPos >= 1 && sprintPos <= 8) stagePoints += POINTS_SPRINT[sprintPos - 1];
                    raceResults.push({ pos: pos, name: row[9], team: row[10], date: row[0], gp: row[5], fastestLap: row[11] || '-', totalPoints: stagePoints });
                }
            }
        });
        return raceResults.sort((a, b) => a.pos - b.pos);
    };
    const getCalendar = () => { /* Mesma Lógica */ 
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight; const raceMap = new Map();
        rawData.forEach(row => {
            const s = parseInt(row[3]); if (s !== parseInt(selectedSeason)) return; const r = parseInt(row[4]);
            if(!isNaN(r) && !raceMap.has(r)) { raceMap.set(r, { round: r, date: row[0], gp: row[5], winner: null, winnerTeam: null }); }
            if(parseInt(row[8]) === 1) { const race = raceMap.get(r); if(race) { race.winner = row[9]; race.winnerTeam = row[10]; } }
        });
        const races = Array.from(raceMap.values()).sort((a,b) => a.round - b.round);
        const parseDate = (dateStr) => { if (!dateStr) return 0; if (dateStr.includes('/')) { const [d, m, y] = dateStr.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); } return new Date(dateStr).getTime(); };
        const today = new Date().getTime(); let nextRace = null;
        const processedRaces = races.map(race => { const rDate = parseDate(race.date); let status = 'soon'; if (race.winner) status = 'done'; else if (rDate >= today) { status = 'next'; if (!nextRace) nextRace = { ...race, timestamp: rDate }; } return { ...race, status }; });
        return { races: processedRaces, nextRace };
    };

    const renderContent = () => {
        if (loading) return <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Carregando Dados...</div>;
        if (gridType === 'light' && parseInt(selectedSeason) < 16) return <div style={{textAlign:'center', padding:'60px', color:'white'}}>TEMPORADA NÃO DISPONÍVEL NO GRID LIGHT</div>;
        
        // Debug: verificar se há dados
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        console.log('📊 renderContent - rawData length:', rawData.length, 'seasons:', seasons, 'selectedSeason:', selectedSeason);
        
        if (rawData.length === 0) {
            return <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Nenhum dado disponível. Verifique se as planilhas estão acessíveis.</div>;
        }

        if (viewType === 'calendar') {
            const { races, nextRace } = getCalendar();
            const nextGPName = nextRace ? normalizeStr(nextRace.gp) : null;
            const nextInfo = nextGPName ? tracks[nextGPName] : null;
            return (
                <>
                    {nextRace && (
                        <div className="next-race-card">
                            <div className="nr-label">PRÓXIMA CORRIDA</div><div className="nr-title">{nextRace.gp}</div><div className="nr-date">{nextRace.date}</div><Countdown targetDate={nextRace.timestamp} />{nextInfo && nextInfo.circuit && <img src={nextInfo.circuit} style={{height:'80px', filter:'invert(1)'}} />}
                        </div>
                    )}
                    <div className="calendar-grid">
                        {races.map(race => {
                            const isNext = nextRace && nextRace.round === race.round; const pillText = isNext ? 'EM BREVE' : (race.winner ? 'CONCLUÍDA' : 'AGENDADA'); const gpName = normalizeStr(race.gp); const gpInfo = tracks[gpName] || { flag: null }; const flagColor = flagColors[gpName] ? flagColors[gpName][0] : '#334155';
                            return (
                                <div key={race.round} className={`cal-card ${isNext ? 'next' : ''}`}>
                                    <div className="cal-accent-bar" style={{background: flagColor}}></div>
                                    <div className="cal-info-col">
                                        <div style={{fontSize:'0.75rem', fontWeight:'700', color:'#94A3B8'}}>ROUND {race.round}</div><div className="cal-gp-title">{race.gp}</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', color:'#CBD5E1'}}>{gpInfo.flag && <img src={gpInfo.flag} style={{width:'24px', height:'16px', borderRadius:'2px'}} />}<span>{race.date}</span></div>
                                    </div>
                                    <div className="cal-winner-col">
                                        {race.winner ? <><div style={{fontSize:'0.6rem', fontWeight:'700', color:'#FCD34D', marginBottom:'4px'}}>VENCEDOR</div><DriverImage name={race.winner} gridType={gridType} season={selectedSeason} className="cal-winner-photo" style={{width:'45px', height:'45px', borderRadius:'50%', border:`2px solid ${getTeamColor(race.winnerTeam)}`}} /><div className="cal-winner-name">{race.winner}</div></> : <div style={{padding:'6px 8px', borderRadius:'20px', fontSize:'0.65rem', fontWeight:'700', background: isNext ? '#06B6D4' : 'rgba(255,255,255,0.1)', color: isNext ? '#0F172A' : '#94A3B8'}}>{pillText}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            );
        }
        // ... (VIEWTYPE DRIVERS/TEAMS/RESULTS MANTIDO IGUAL AO ANTERIOR - Resumido aqui para caber, mas use o código completo da versão anterior)
        if (viewType === 'drivers') {
            const data = getDrivers();
            return (
                <>
                <div className="table-header header-default"><div>POS</div><div>PILOTO</div><div className="hide-mobile">EQUIPE</div><div style={{textAlign:'right'}}>PONTOS</div></div>
                {data.map(driver => (
                <div className="table-row row-default default-bg" key={driver.pos} style={{"--team-color": getTeamColor(driver.team)}} onClick={() => handleDriverClick(driver)}>
                    <div className={`pos-number pos-${driver.pos}`}>{driver.pos}º</div>
                    <div className="driver-cell"><DriverImage name={driver.name} gridType={gridType} season={selectedSeason} className="driver-photo-small"/><div className="driver-info-group"><div className="mobile-row-1"><div className="show-mobile-only">{getTeamLogo(driver.team) && <img src={getTeamLogo(driver.team)} className="team-logo-tiny" />}</div><div className="driver-name">{driver.name}</div></div><div className="team-name-small show-mobile-only">{driver.team}</div></div></div><div className="hide-mobile"><div className="team-name-group">{getTeamLogo(driver.team) && <img src={getTeamLogo(driver.team)} className="team-logo-tiny" />}<span className="team-name-small" style={{color: getTeamColor(driver.team)}}>{driver.team}</span></div></div><div className="driver-points-big">{driver.points.toFixed(0)}</div>
                </div>
                ))}
                </>
            );
        }
        if (viewType === 'teams') {
            const data = getConstructors();
            return (
                <>
                <div className="table-header header-default"><div>POS</div><div>EQUIPE</div><div className="hide-mobile"></div><div style={{textAlign:'right'}}>PONTOS</div></div>
                {data.map(team => (
                <div className="table-row row-default default-bg" key={team.pos} style={{"--team-color": getTeamColor(team.team)}}>
                    <div className={`pos-number pos-${team.pos}`}>{team.pos}º</div>
                    <div className="driver-cell">{getTeamLogo(team.team) && <img src={getTeamLogo(team.team)} className="team-logo-img" />}<div><div className="driver-name">{team.team}</div><div className="drivers-list">{team.driversList.join(' & ')}</div></div></div><div className="hide-mobile"></div><div className="driver-points-big">{team.points.toFixed(0)}</div>
                </div>
                ))}
                </>
            );
        }
        if (viewType === 'results') {
            const data = getRaceResults();
            if(data.length === 0) return <div>Sem resultados.</div>;
            const podium = data.slice(0,3); const rest = data.slice(3); const p1=podium.find(p=>p.pos===1); const p2=podium.find(p=>p.pos===2); const p3=podium.find(p=>p.pos===3); const podiumDisplay=[p2,p1,p3].filter(x=>x!==undefined);
            const gpInfo = tracks[normalizeStr(data[0].gp)] || {};
            return (
                <>
                    <div className="race-header-card"><div className="rh-left"><div className="rh-flag-container">{gpInfo.flag && <img src={gpInfo.flag} className="rh-flag" />}</div><div className="rh-info"><div className="rh-gp">{data[0].gp}</div><div className="rh-details-line">{gpInfo.circuitName}<span className="rh-divider">|</span><span className="rh-date">{data[0].date}</span></div></div></div><div className="rh-right"><div className="rh-record"><RecordIcon/> Recorde: <strong>{historicalRecord.time}</strong></div></div></div>
                    <div className="results-layout"><div className="podium-container">{podiumDisplay.map(p=>(<div key={p.name} className={`podium-step podium-p${p.pos}`} style={{"--team-color":getTeamColor(p.team)}} onClick={()=>handleDriverClick(p)}><div className="podium-photo-container"><DriverImage name={p.name} gridType={gridType} season={selectedSeason} className="podium-photo"/></div><div className="podium-base"><div className={`podium-rank rank-${p.pos}`}>{p.pos}</div><div className="podium-driver-name">{p.name}</div><div className="podium-stats"><div className="podium-stat-item points">+{p.totalPoints}</div></div></div></div>))}</div></div>
                    <div className="table-header header-results"><div>POS</div><div>PILOTO</div><div style={{textAlign:'right'}}>PTS</div></div>
                    {rest.map(r => (<div className="table-row row-results colored-bg" key={r.pos} style={{"--team-color": getTeamColor(r.team)}}><div className="pos-number">{r.pos}º</div><div className="driver-cell"><DriverImage name={r.name} gridType={gridType} season={selectedSeason} className="driver-photo-small"/><div className="driver-name">{r.name}</div></div><div className="results-right-col"><span className="points-pill">+{r.totalPoints}</span></div></div>))}
                </>
            );
        }
    };

    return (
        <div className="page-wrapper">

            <header className="hero-section">
                <div className="hero-container"><div className="hero-text"><span className="hero-tag">TEMPORADA {selectedSeason}</span><h1>SUPERANDO<br/><span>SEUS LIMITES</span></h1></div></div>
            </header>

            <section className="standings-section">
                <div className="tabs-container">
                    <button className={`tab-btn ${viewType === 'drivers' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => setViewType('drivers')}>PILOTOS</button>
                    <button className={`tab-btn ${viewType === 'teams' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => setViewType('teams')}>EQUIPES</button>
                    <button className={`tab-btn ${viewType === 'results' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => setViewType('results')}>RESULTADOS</button>
                    <button className={`tab-btn ${viewType === 'calendar' ? (gridType === 'carreira' ? 'active-tab-carreira' : 'active-tab-light') : ''}`} onClick={() => setViewType('calendar')}>CALENDÁRIO</button>
                </div>
                
                <div className="section-header">
                    <div className="title-container">
                        <h2 className="section-title" style={{marginBottom: '0', lineHeight: '1'}}>
                            {viewType === 'drivers' && "CLASSIFICAÇÃO DE PILOTOS"}
                            {viewType === 'teams' && "CLASSIFICAÇÃO DE EQUIPES"}
                            {viewType === 'results' && "RESULTADOS POR ETAPA"}
                            {viewType === 'calendar' && "CALENDÁRIO"}
                        </h2>
                        <div style={{fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '5px', color: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)'}}>{gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}</div>
                    </div>

                    <div className="controls-wrapper">
                        <div className="grid-toggle">
                            <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>GRID CARREIRA</button>
                            <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>GRID LIGHT</button>
                        </div>
                        <div className="dropdown-group">
                            <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>{seasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}</select>
                            {viewType === 'results' && <select className="season-select" value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} style={{borderColor:'var(--highlight-cyan)'}}>{rounds.map(r => <option key={r} value={r}>Etapa {r}</option>)}</select>}
                        </div>
                    </div>
                </div>
                
                <div className={`table-container ${gridType === 'carreira' ? 'glow-carreira' : 'glow-light'}`}>{renderContent()}</div>
            </section>
            
            {selectedDriver && <DriverModal driver={selectedDriver} gridType={gridType} season={selectedSeason} onClose={() => setSelectedDriver(null)} teamColor={getTeamColor(selectedDriver.team)} teamLogo={getTeamLogo(selectedDriver.team)} />}
            <footer><div className="nav-logo" style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>MASTER <span>LEAGUE</span></div><p style={{color:'#94A3B8'}}>© 2025. Acelere para a glória.</p></footer>
        </div>
    );
}

export default Standings;