import { useState, useMemo, useEffect } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import '../index.css'; 

// --- ÍCONES ---
const ListIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const GridIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const TrophyIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700" stroke="none"><path d="M20.2 2H3.8C2.8 2 2 2.8 2 3.8v2.4c0 2.6 1.9 4.8 4.4 5.1.9 3.3 3.7 5.9 7.1 6.5v2.2H9v2h6v-2h-4.5v-2.2c3.4-.6 6.2-3.2 7.1-6.5 2.5-.3 4.4-2.5 4.4-5.1V3.8c0-1-.8-1.8-1.8-1.8zM4 6.2V4h2v2.2c-1.1 0-2 0-2 0zm16 0c0 .1-1.1.1-2 0V4h2v2.2z"/></svg>;

// --- HELPERS ---
// ALTERAÇÃO 1: Adicionado a prop 'style' aqui para permitir customização
const DriverImage = ({ name, gridType, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    // Se não passar season, usa '19' (Atual) como fallback para fotos recentes
    const safeSeason = season || '19';
    // Prioriza SML primeiro, depois temporada
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const seasonSrc = `/pilotos/${gridType}/s${safeSeason}/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes('/SML/')) {
            e.target.src = seasonSrc;
        } else if (e.target.src.includes(`/s${safeSeason}/`)) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={smlSrc} className={className} style={style} onError={handleError} alt={name} />;
};

const getTeamColor = (teamName) => {
    if(!teamName) return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull") || t.includes("oracle")) return "var(--f1-redbull)"; 
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

const timeToMs = (timeStr) => {
    if (!timeStr || timeStr.length < 6 || timeStr.includes('DNF') || timeStr.includes('DSQ')) return Infinity;
    try {
        const cleanTime = timeStr.replace(/[^\d:.]/g, '');
        const parts = cleanTime.split(':');
        let min = 0, sec = 0, ms = 0;
        if (parts.length === 2) {
            min = parseInt(parts[0]);
            const rest = parts[1].split('.');
            sec = parseInt(rest[0]);
            ms = parseInt(rest[1] || 0);
        } else { return Infinity; }
        return (min * 60000) + (sec * 1000) + ms;
    } catch (e) { return Infinity; }
};

function HallOfFame() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, rawPR, tracks, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira'); 
    const [activeTab, setActiveTab] = useState('stats'); 
    
    const [stats, setStats] = useState(null);
    const [championsList, setChampionsList] = useState([]);
    const [trackRecords, setTrackRecords] = useState({});
    const [powerDriveStats, setPowerDriveStats] = useState([]);

    useMemo(() => {
        const data = gridType === 'carreira' ? rawCarreira : rawLight;
        if (!data || data.length === 0) return;

        const driverStats = {};
        const tRecords = {};
        const seasonPoints = {};
        
        // Para calcular volta rápida por corrida (agrupado por temporada + etapa)
        const racesFastLaps = {};

        data.forEach(row => {
            const season = parseInt(row[3]);
            const round = row[4]; // Coluna E - Número da etapa (R01, R02, etc)
            const gpName = row[5]; // Coluna F - Nome do GP (BRASIL, ÁUSTRIA, etc)
            const name = row[9];
            const team = row[10];
            let points = parseFloat((row[15] || '0').replace(',', '.'));
            const fastestLap = row[11]; // Coluna L - Volta mais rápida

            // FILTRO: Remove pilotos inválidos ou banidos
            if (!name || name === '-' || name === 'Joao Lucas') return;

            // 1. Estatísticas Gerais (exceto fastLaps que será calculado depois)
            if (!driverStats[name]) {
                driverStats[name] = { name, wins: 0, poles: 0, podiums: 0, fastLaps: 0, races: 0 };
            }
            driverStats[name].races++;
            if (parseInt(row[6]) === 1) driverStats[name].poles++;
            if (parseInt(row[8]) === 1) driverStats[name].wins++;
            if (parseInt(row[8]) >= 1 && parseInt(row[8]) <= 3) driverStats[name].podiums++;
            
            // Agrupa voltas rápidas por corrida (temporada + round)
            if (fastestLap && fastestLap.length > 4 && !fastestLap.includes('-')) {
                const raceKey = `${season}_${round}`;
                const ms = timeToMs(fastestLap);
                
                if (ms < Infinity) {
                    if (!racesFastLaps[raceKey]) {
                        racesFastLaps[raceKey] = { bestTime: Infinity, driver: null, time: null, season, team, gp: gpName };
                    }
                    if (ms < racesFastLaps[raceKey].bestTime) {
                        racesFastLaps[raceKey] = { bestTime: ms, driver: name, time: fastestLap, season, team, gp: gpName };
                    }
                }
                
                // Track Records (melhor volta de todos os tempos por GP)
                const gpKey = gpName ? gpName.trim().toUpperCase() : 'UNK';
                if (ms < Infinity && (!tRecords[gpKey] || ms < tRecords[gpKey].ms)) {
                    tRecords[gpKey] = { driver: name, time: fastestLap, ms, season, team };
                }
            }

            // 2. Pontos por Temporada (para Campeões)
            if (!seasonPoints[season]) seasonPoints[season] = {};
            if (!seasonPoints[season][name]) seasonPoints[season][name] = { points: 0, team: team };
            seasonPoints[season][name].points += points;
        });
        
        // Conta quantas voltas rápidas cada piloto fez (quem teve o melhor tempo em cada corrida)
        Object.values(racesFastLaps).forEach(race => {
            if (race.driver && driverStats[race.driver]) {
                driverStats[race.driver].fastLaps++;
            }
        });

        // Define Campeões
        const champs = Object.keys(seasonPoints).map(season => {
            const drivers = Object.entries(seasonPoints[season]);
            drivers.sort((a, b) => b[1].points - a[1].points);
            if (drivers.length > 0) {
                return { season, name: drivers[0][0], points: drivers[0][1].points, team: drivers[0][1].team };
            }
            return null;
        }).filter(Boolean).sort((a, b) => b.season - a.season);

        // Top Stats Globais
        const driversArray = Object.values(driverStats);
        
        // Dominância (Quem ganhou mais títulos)
        const titleCounts = {};
        const teamTitleCounts = {};
        const totalPointsByDriver = {};
        
        champs.forEach(c => {
            titleCounts[c.name] = (titleCounts[c.name] || 0) + 1;
            teamTitleCounts[c.team] = (teamTitleCounts[c.team] || 0) + 1;
        });
        
        // Calcula pontos totais por piloto
        data.forEach(row => {
            const name = row[9];
            let points = parseFloat((row[15] || '0').replace(',', '.'));
            
            if (!name || name === '-' || name === 'Joao Lucas') return;
            
            if (!totalPointsByDriver[name]) {
                totalPointsByDriver[name] = { name, totalPoints: 0 };
            }
            totalPointsByDriver[name].totalPoints += points;
        });
        
        const topWinnerName = Object.keys(titleCounts).reduce((a, b) => titleCounts[a] > titleCounts[b] ? a : b, '-');
        const topTeamName = Object.keys(teamTitleCounts).reduce((a, b) => teamTitleCounts[a] > teamTitleCounts[b] ? a : b, '-');

        // Calcular Power Ranking total por piloto (somando todas as temporadas)
        const prByDriver = {};
        if (rawPR && rawPR.length > 0) {
            rawPR.forEach(row => {
                const driverName = row[0];
                const totalPR = parseFloat(row[8]) || 0;
                if (driverName && driverName !== '-') {
                    if (!prByDriver[driverName]) {
                        prByDriver[driverName] = { name: driverName, totalPR: 0 };
                    }
                    prByDriver[driverName].totalPR += totalPR;
                }
            });
        }
        const mostPR = Object.values(prByDriver).filter(d => d.totalPR > 0).sort((a, b) => b.totalPR - a.totalPR);

        setStats({
            mostWins: [...driversArray].filter(d => d.wins > 0).sort((a, b) => b.wins - a.wins),
            mostPoles: [...driversArray].filter(d => d.poles > 0).sort((a, b) => b.poles - a.poles),
            mostPodiums: [...driversArray].filter(d => d.podiums > 0).sort((a, b) => b.podiums - a.podiums),
            mostFastLaps: [...driversArray].filter(d => d.fastLaps > 0).sort((a, b) => b.fastLaps - a.fastLaps),
            mostRaces: [...driversArray].filter(d => d.races > 0).sort((a, b) => b.races - a.races),
            mostTitles: Object.entries(titleCounts)
                .map(([name, titles]) => ({ name, titles }))
                .filter(d => d.titles > 0)
                .sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name)),
            mostPoints: Object.values(totalPointsByDriver).filter(d => d.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints),
            mostPR: mostPR,
            topWinner: topWinnerName,
            topWinnerCount: titleCounts[topWinnerName] || 0,
            topTeam: topTeamName,
            topTeamCount: teamTitleCounts[topTeamName] || 0
        });

        setChampionsList(champs);
        setTrackRecords(Object.keys(tRecords).sort().reduce((obj, key) => {
            obj[key] = tRecords[key];
            return obj;
        }, {}));

    }, [gridType, rawCarreira, rawLight]);

    const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando Lendas...</div>;

    return (
        <div className="page-wrapper">
            <div className="hof-hero">
                <div className="hof-hero-content">
                    <h1>HALL DA <span>FAMA</span></h1>
                    <div style={{display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px'}}>
                        <button onClick={() => setGridType('carreira')} style={{padding: '10px 30px', borderRadius: '30px', fontWeight: '800', cursor: 'pointer', background: gridType==='carreira' ? 'var(--carreira-wine)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', transition:'0.3s'}}>GRID CARREIRA</button>
                        <button onClick={() => setGridType('light')} style={{padding: '10px 30px', borderRadius: '30px', fontWeight: '800', cursor: 'pointer', background: gridType==='light' ? 'var(--light-blue)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', transition:'0.3s'}}>GRID LIGHT</button>
                    </div>
                    <div className="hof-stats-bar">
                        <div className="hof-stat-item">
                            <div className="hs-label">MAIOR CAMPEÃO</div>
                            <div className="hs-value">👑 {stats?.topWinner} <small>({stats?.topWinnerCount}x)</small></div>
                        </div>
                        <div className="hof-stat-divider"></div>
                        <div className="hof-stat-item">
                            <div className="hs-label">DOMINÂNCIA</div>
                            <div className="hs-value">🏎️ {stats?.topTeam} <small>({stats?.topTeamCount}x)</small></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hub-container">
                <div style={{display: 'flex', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#020617', position: 'sticky', top: '70px', zIndex: 100, marginBottom:'40px'}}>
                    <button onClick={() => setActiveTab('stats')} style={navTabStyle(activeTab === 'stats')}>ESTATÍSTICAS</button>
                    <button onClick={() => setActiveTab('champions')} style={navTabStyle(activeTab === 'champions')}>MURO DOS CAMPEÕES</button>
                    <button onClick={() => setActiveTab('records')} style={navTabStyle(activeTab === 'records')}>DOMÍNIO DAS PISTAS</button>
                </div>

                {activeTab === 'stats' && stats && (
                    <div className="fade-in">
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '60px'}}>
                            <HighlightCard title="ALPINISTA DAS PISTAS" driver={stats.mostWins[0]} value={stats.mostWins[0]?.wins} label="Vitórias" color="#FFD700" grid={gridType} />
                            <HighlightCard title="REI DAS POLES" driver={stats.mostPoles[0]} value={stats.mostPoles[0]?.poles} label="Poles" color="#A855F7" grid={gridType} />
                            <HighlightCard title="SOMELIER DE PÓDIOS" driver={stats.mostPodiums[0]} value={stats.mostPodiums[0]?.podiums} label="Pódios" color="#22C55E" grid={gridType} />
                            <HighlightCard title="SENHOR VELOCIDADE" driver={stats.mostFastLaps[0]} value={stats.mostFastLaps[0]?.fastLaps} label="Voltas Rápidas" color="#3B82F6" grid={gridType} />
                            <HighlightCard title="DR. EXPERIÊNCIA" driver={stats.mostRaces[0]} value={stats.mostRaces[0]?.races} label="Corridas" color="#F97316" grid={gridType} />
                            <HighlightCard title="MESTRE DAS FAIXAS" driver={stats.mostTitles?.[0]} value={stats.mostTitles?.[0]?.titles} label="Títulos" color="#EF4444" grid={gridType} />
                            <HighlightCard title="CALCULADORA DE PONTOS" driver={stats.mostPoints?.[0]} value={Math.round(stats.mostPoints?.[0]?.totalPoints || 0)} label="Pontos" color="#06B6D4" grid={gridType} />
                            <HighlightCard title="POWER DRIVE" driver={stats.mostPR?.[0]} value={Math.round(stats.mostPR?.[0]?.totalPR || 0)} label="Pontos PR" color="#EC4899" grid={gridType} />
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px'}}>
                            <TopList title="VITÓRIAS" data={stats.mostWins} valueKey="wins" />
                            <TopList title="POLES" data={stats.mostPoles} valueKey="poles" />
                            <TopList title="PÓDIOS" data={stats.mostPodiums} valueKey="podiums" />
                            <TopList title="VOLTAS RÁPIDAS" data={stats.mostFastLaps} valueKey="fastLaps" />
                            <TopList title="CORRIDAS DISPUTADAS" data={stats.mostRaces} valueKey="races" />
                            <TopList title="TÍTULOS" data={stats.mostTitles} valueKey="titles" />
                            <TopList title="PONTOS TOTAIS" data={stats.mostPoints} valueKey="totalPoints" />
                            <TopList title="POWER RANKING" data={stats.mostPR} valueKey="totalPR" />
                        </div>
                    </div>
                )}

                {activeTab === 'champions' && (
                    <div className="hof-grid-champions fade-in">
                        {championsList.map(champ => (
                            <div key={champ.season} className="hof-card-champion">
                                <div className="hof-season-badge-corner">S{champ.season}</div>
                                <div className="hof-champion-title" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#FFD700', letterSpacing: '2px', textAlign: 'center', marginBottom: '15px', marginTop: '10px' }}>
                                    CAMPEÃO
                                </div>
                                <div className="hof-champion-image-container">
                                     <div className="hof-champion-circle">
                                         {/* Aqui temos a temporada do título, então passamos ela */}
                                         <DriverImage 
                                             name={champ.name} 
                                             gridType={gridType} 
                                             season={champ.season} 
                                             className="dch-photo"
                                             style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                         />
                                     </div>
                                </div>
                                <div style={{padding: '0 15px'}}>
                                    <div className="hof-champion-name">{champ.name}</div>
                                    <div className="hof-champion-team">{champ.team}</div>
                                    <div className="hof-champion-points">{champ.points.toFixed(0)} PTS</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'records' && (
                    <div className="fade-in" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
                        {Object.entries(trackRecords).map(([gpName, record]) => {
                            const gpInfo = tracks[normalizeStr(gpName)] || { flag: null, circuit: null, circuitName: null };
                            return (
                                <div key={gpName} style={{background: '#1E293B', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column'}}>
                                    {/* HEADER: Nome da pista + circuito */}
                                    <div style={{padding: '15px', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                        <div>
                                            <span style={{fontWeight: '800', fontSize: '0.95rem', textTransform:'uppercase', color: 'white'}}>{gpName}</span>
                                            {gpInfo.circuitName && (
                                                <div style={{fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px'}}>{gpInfo.circuitName}</div>
                                            )}
                                        </div>
                                        {/* Bandeira no lugar da foto do piloto */}
                                        {gpInfo.flag && (
                                            <div style={{width: '45px', height: '45px', borderRadius: '10px', overflow: 'hidden', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                                                <img src={gpInfo.flag} style={{width: '32px', borderRadius: '3px'}} alt="" />
                                            </div>
                                        )}
                                    </div>

                                    {/* ÁREA CENTRAL: Foto do piloto + Mapa da pista lado a lado */}
                                    <div style={{flex: 1, display: 'flex', alignItems: 'center', padding: '20px', minHeight: '140px', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)', gap: '15px'}}>
                                        {/* Foto do piloto à esquerda */}
                                        <div style={{width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', background: '#0F172A', border: '2px solid #3B82F6', flexShrink: 0, boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'}}>
                                            <DriverImage name={record.driver} gridType={gridType} season={record.season} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                        </div>
                                        
                                        {/* Mapa da pista à direita */}
                                        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            {gpInfo.circuit ? (
                                                <img src={gpInfo.circuit} style={{width: '100%', maxHeight: '90px', objectFit: 'contain', filter: 'invert(1) opacity(0.7)'}} alt="Pista" />
                                            ) : (
                                                <span style={{color: '#334155', fontSize: '3rem'}}>🏁</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* FOOTER: Informações do recorde */}
                                    <div style={{padding: '15px', background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontSize: '0.95rem', fontWeight: '700', color: 'white', lineHeight:'1.2'}}>{record.driver}</div>
                                                <div style={{fontSize: '0.7rem', color: '#94A3B8', marginTop:'3px'}}>S{record.season} • {record.team}</div>
                                            </div>
                                            <div style={{textAlign: 'right'}}>
                                                <div style={{fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600'}}>Volta Rápida</div>
                                                <div style={{fontSize: '1.3rem', fontWeight: '900', color: '#3B82F6'}}>{record.time}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
}

const navTabStyle = (isActive) => ({
    background: 'transparent', border: 'none', borderBottom: isActive ? '3px solid var(--highlight-cyan)' : '3px solid transparent', color: isActive ? 'white' : '#94A3B8', padding: '15px 30px', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', transition: 'all 0.3s'
});

// ALTERAÇÃO 2: Passando estilo para a imagem se ajustar ao círculo
const HighlightCard = ({ title, driver, value, label, color, grid }) => (
    <div style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: `1px solid ${color}40`, borderRadius: '16px', padding: '25px', textAlign: 'center', position: 'relative', overflow: 'hidden'}}>
        <div style={{fontSize: '0.7rem', fontWeight: '800', color: color, letterSpacing: '2px', marginBottom: '15px'}}>{title}</div>
        <div style={{width: '100px', height: '100px', margin: '0 auto 15px', borderRadius: '50%', border: `4px solid ${color}`, overflow: 'hidden', boxShadow: `0 0 20px ${color}40`, background:'#0F172A'}}>
            <DriverImage 
                name={driver?.name} 
                gridType={grid} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} // ESTILO ADICIONADO AQUI
            />
        </div>
        <div style={{fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '5px'}}>{driver?.name || '-'}</div>
        <div style={{fontSize: '2.5rem', fontWeight: '900', color: 'white', lineHeight: 1}}>{value || 0}</div>
        <div style={{fontSize: '0.8rem', color: '#94A3B8'}}>{label}</div>
    </div>
);

const TopList = ({ title, data, valueKey }) => {
    const [expanded, setExpanded] = useState(false);
    const displayData = expanded ? data : data.slice(0, 5);
    const hasMore = data.length > 5;
    
    return (
        <div>
            <h3 style={{borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px', fontSize: '1rem', color: '#94A3B8', letterSpacing: '1px'}}>{title}</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {displayData.map((d, i) => (
                    <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.03)', padding: '10px 15px', borderRadius: '8px', border: i === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : 'none'}}>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <span style={{fontWeight: '800', color: i === 0 ? '#FFD700' : (i===1 ? '#C0C0C0' : (i===2 ? '#CD7F32' : '#64748B')), width: '20px'}}>{i+1}º</span>
                            <span style={{fontWeight: '600', fontSize: '0.9rem'}}>{d.name}</span>
                        </div>
                        <span style={{fontWeight: '800', fontSize: '1rem', color: 'white'}}>{valueKey === 'totalPoints' ? Math.round(d[valueKey]) : d[valueKey]}</span>
                    </div>
                ))}
            </div>
            {hasMore && (
                <button 
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        width: '100%',
                        marginTop: '15px',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'white'; }}
                    onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#94A3B8'; }}
                >
                    {expanded ? '▲ Ver menos' : `▼ Ver todos (${data.length})`}
                </button>
            )}
        </div>
    );
};

export default HallOfFame;