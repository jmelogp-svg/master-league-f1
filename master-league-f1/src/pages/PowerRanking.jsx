import React, { useState, useEffect } from 'react';
import { usePowerRankingCache } from '../hooks/useSupabaseCache';
import '../index.css'; 

// --- HELPERS VISUAIS ---
const DriverImage = ({ name, season, className, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const primarySrc = `/pilotos/carreira/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const [imgSrc, setImgSrc] = useState(primarySrc);
    useEffect(() => { setImgSrc(primarySrc); }, [name, season]);

    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            setImgSrc(smlSrc);
        } else if (e.target.src.includes('/SML/')) {
            setImgSrc(shadowSrc);
        }
    };
    
    return <img src={imgSrc} className={className} style={{...style, mixBlendMode: 'lighten'}} onError={handleError} alt={name} />;
};

const getTeamColor = (teamName) => {
    if(!teamName) return "#FF9900";
    const t = teamName.toLowerCase();
    if(t.includes("red bull") || t.includes("oracle")) return "#3671C6"; 
    if(t.includes("ferrari")) return "#E80020"; 
    if(t.includes("mercedes")) return "#27F4D2"; 
    if(t.includes("mclaren")) return "#FF8000"; 
    if(t.includes("aston")) return "#229971"; 
    if(t.includes("alpine")) return "#FF87BC"; 
    if(t.includes("haas")) return "#B6BABD"; 
    if(t.includes("williams")) return "#64C4FF"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "#52E252"; 
    if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "#6692FF";
    return "#FF9900"; // Laranja MLF1 padrão
};

function PowerRanking() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { data: rawPR, loading } = usePowerRankingCache();
    const [rankingData, setRankingData] = useState([]);
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState("");

    // 1. Carregar Temporadas Disponíveis
    useEffect(() => {
        if (loading || !rawPR || rawPR.length === 0) return;
        const seasons = [...new Set(rawPR.map(row => row[9]?.trim()))]
            .filter(s => s && !isNaN(s))
            .sort((a, b) => b - a);
        setAvailableSeasons(seasons);
        if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0]);
    }, [rawPR, loading, selectedSeason]);

    // 2. Processar Dados
    useEffect(() => {
        if (!selectedSeason || !rawPR || rawPR.length === 0) return;

        const driverStats = {};

        rawPR.forEach(row => {
            const driverName = row[0];
            const totalPR = parseFloat((row[8] || '0').replace(',', '.')); 
            const rowSeason = row[9]?.trim();
            const teamName = row[10]?.trim();

            if (rowSeason === String(selectedSeason) && driverName) {
                if (!driverStats[driverName]) {
                    driverStats[driverName] = { 
                        name: driverName, 
                        team: teamName || "Sem Equipe",
                        totalScore: 0
                    };
                }
                if (teamName) driverStats[driverName].team = teamName;
                if (!isNaN(totalPR)) driverStats[driverName].totalScore += totalPR;
            }
        });

        const sortedRank = Object.values(driverStats)
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((d, index) => ({
                ...d,
                rank: index + 1,
                displayScore: d.totalScore.toFixed(0) 
            }));

        setRankingData(sortedRank);

    }, [selectedSeason, rawPR]);

    if (loading) {
        return <div style={{padding:'100px', textAlign:'center', color:'white', background:'#0e0e12', minHeight:'100vh'}}>Carregando Power Ranking...</div>;
    }

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    return (
        <div className="pr-new-wrapper">
            {/* Header */}
            <header className="pr-new-header">
                <h1 className="pr-new-title">
                    <span className="white">Power</span>
                    <span className="accent">Ranking</span>
                </h1>
                <p className="pr-new-subtitle">
                    Ranking de performance pura. Quem domina a pista?
                </p>
                
                {/* Season Selector */}
                <div style={{position: 'relative'}}>
                    <select 
                        className="pr-new-filter-btn" 
                        value={selectedSeason} 
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        style={{appearance: 'none', WebkitAppearance: 'none'}}
                    >
                        {availableSeasons.map(s => (
                            <option key={s} value={s}>TEMPORADA {s}</option>
                        ))}
                    </select>
                    <i className="fas fa-chevron-down" style={{position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', pointerEvents: 'none'}}></i>
                </div>
            </header>

            {/* Main Content */}
            <main className="pr-new-main">
                {/* Hero Card (Rank 1) */}
                {leader ? (
                    <section 
                        className="pr-new-hero-card" 
                        style={{'--team-color': getTeamColor(leader.team), borderColor: getTeamColor(leader.team)}}
                    >
                        <div className="pr-new-hero-rank">
                            <span className="pr-new-hero-rank-num">1</span>
                            <span className="pr-new-hero-rank-label">TOP 1</span>
                        </div>
                        
                        <div className="pr-new-hero-photo-container">
                            <DriverImage name={leader.name} season={selectedSeason} className="pr-new-hero-photo" />
                            <div className="pr-new-hero-overlay"></div>
                        </div>

                        <div className="pr-new-hero-info">
                            <h2 className="pr-new-hero-name">
                                {leader.name?.toUpperCase().split(' ').map((part, i, arr) => (
                                    <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </h2>
                            <div className="pr-new-hero-team">
                                <span className="pr-new-hero-team-name">{leader.team?.toUpperCase()}</span>
                                <i className="fas fa-shield-alt"></i>
                            </div>
                            <div className="pr-new-hero-badge" style={{borderColor: `${getTeamColor(leader.team)}80`, backgroundColor: `${getTeamColor(leader.team)}33`}}>
                                <span className="pr-new-hero-points" style={{color: getTeamColor(leader.team)}}>{leader.displayScore} PONTOS</span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <div style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>Nenhum dado encontrado para esta temporada.</div>
                )}

                {/* List (Ranks 2+) */}
                <section className="pr-new-list">
                    {rest.map((driver) => {
                        const rankClass = driver.rank <= 5 ? `rank-${driver.rank}` : '';
                        const rankColor = driver.rank <= 5 ? null : getTeamColor(driver.team);
                        
                        return (
                            <div key={driver.name} className="pr-new-card">
                                {/* Left Color Indicator */}
                                <div 
                                    className={`pr-new-card-bar ${rankClass ? `bg-${rankClass}` : ''}`} 
                                    style={!rankClass ? {backgroundColor: rankColor} : {}}
                                ></div>
                                
                                {/* Rank Box */}
                                <div 
                                    className={`pr-new-card-rank-box ${rankClass ? `bg-${rankClass}-light` : ''}`}
                                    style={!rankClass ? {backgroundColor: `${rankColor}33`} : {}}
                                >
                                    <span className={`pr-new-card-rank-text ${rankClass ? `text-${rankClass}` : ''}`} style={!rankClass ? {color: rankColor} : {}}>{driver.rank}</span>
                                </div>

                                {/* Avatar */}
                                <div 
                                    className={`pr-new-card-avatar ${rankClass ? `border-${rankClass}` : ''}`}
                                    style={!rankClass ? {borderColor: rankColor} : {}}
                                >
                                    <DriverImage name={driver.name} season={selectedSeason} />
                                </div>

                                {/* Info */}
                                <div className="pr-new-card-info">
                                    <h3 className="pr-new-card-name">{driver.name}</h3>
                                    <div className="pr-new-card-team">
                                        <i className="fas fa-shield-alt"></i>
                                        <span className="pr-new-card-team-name">{driver.team?.toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="pr-new-card-points">
                                    <div className={`pr-new-card-points-val ${rankClass ? `text-${rankClass}` : ''}`} style={!rankClass ? {color: rankColor} : {}}>{driver.displayScore}</div>
                                    <div className="pr-new-card-points-label">PTS</div>
                                </div>
                            </div>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}

export default PowerRanking;
