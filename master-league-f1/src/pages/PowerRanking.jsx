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
    
    return <img src={imgSrc} className={className} style={{...style}} onError={handleError} alt={name} />;
};

const getTeamLogo = (teamName) => {
    if(!teamName) return null;
    const t = teamName.toLowerCase().replace(/\s/g, ''); 
    if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png"; 
    if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png"; 
    if(t.includes("alpine")) return "/team-logos/f1-alpine.png"; 
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls")) || t.includes("visa")) return "/team-logos/f1-racingbulls.png"; 
    if(t.includes("redbull") || t.includes("oracle")) return "/team-logos/f1-redbull.png"; 
    if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png"; 
    if(t.includes("aston")) return "/team-logos/f1-astonmartin.png"; 
    if(t.includes("haas")) return "/team-logos/f1-haas.png"; 
    if(t.includes("williams")) return "/team-logos/f1-williams.png"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/team-logos/f1-sauber.png";
    return null;
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
    return "#FF9900"; 
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 153, 0";
};

const getRankColor = (rank) => {
    switch(rank) {
        case 2: return '#2563eb'; 
        case 3: return '#10b981'; 
        case 4: return '#db2777'; 
        case 5: return '#eab308'; 
        default: return '#64748B'; 
    }
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

    useEffect(() => {
        if (loading || !rawPR || rawPR.length === 0) return;
        const seasons = [...new Set(rawPR.map(row => row[9]?.trim()))]
            .filter(s => s && !isNaN(s))
            .sort((a, b) => b - a);
        setAvailableSeasons(seasons);
        if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0]);
    }, [rawPR, loading, selectedSeason]);

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
                    driverStats[driverName] = { name: driverName, team: teamName || "Sem Equipe", totalScore: 0 };
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
        return <div style={{padding:'100px', textAlign:'center', color:'white', background:'#050505', minHeight:'100vh'}}>Carregando Power Ranking...</div>;
    }

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    return (
        <div className="pr-new-wrapper">
            <header className="pr-new-header">
                <h1 className="pr-new-title">
                    <span className="white">VIRTUAL MOTORSPORT </span>
                    <span className="accent">POWER RANKING</span>
                </h1>
                <div style={{position: 'relative', display:'inline-block'}}>
                    <select 
                        className="pr-new-season-selector" 
                        value={selectedSeason} 
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        style={{appearance: 'none', WebkitAppearance: 'none'}}
                    >
                        {availableSeasons.map(s => (
                            <option key={s} value={s}>SEASON {s}</option>
                        ))}
                    </select>
                    <i className="fas fa-chevron-down" style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', pointerEvents: 'none', color: '#888'}}></i>
                </div>
            </header>

            <main className="pr-new-main">
                {leader && (
                    <section 
                        className="pr-hero-banner" 
                        style={{
                            '--team-color': getTeamColor(leader.team),
                            '--team-color-rgb': hexToRgb(getTeamColor(leader.team))
                        }}
                    >
                        <div className="pr-hero-rank-side">
                            <span className="pr-hero-pos-num">1</span>
                            <span className="pr-hero-pos-label">TOP 1</span>
                        </div>
                        
                        <div className="pr-hero-photo-center">
                            <DriverImage name={leader.name} season={selectedSeason} style={{ height: '100%' }} />
                        </div>

                        <div className="pr-hero-info-side">
                            <h2 className="pr-hero-driver-name">
                                <span className="first">{leader.name?.split(' ')[0]}</span>
                                <span className="last">{leader.name?.split(' ').slice(1).join(' ')}</span>
                            </h2>
                            <div className="pr-hero-team-row">
                                <span className="pr-hero-team-name">{leader.team}</span>
                                {getTeamLogo(leader.team) && <img src={getTeamLogo(leader.team)} className="pr-hero-team-logo" alt="" />}
                            </div>
                            <div className="pr-hero-points-box">
                                <span className="pr-hero-points-text">{leader.displayScore} PONTOS</span>
                            </div>
                        </div>
                    </section>
                )}

                <div className="pr-rankings-grid">
                    {rest.map((driver) => {
                        const rankColor = driver.rank <= 5 ? getRankColor(driver.rank) : getTeamColor(driver.team);
                        const rankColorRgb = hexToRgb(rankColor);
                        return (
                            <div 
                                key={driver.name} 
                                className="pr-grid-card"
                                style={{
                                    '--rank-color': rankColor,
                                    '--rank-color-rgb': rankColorRgb
                                }}
                            >
                                <div className="pr-grid-left">
                                    <div className="pr-grid-rank-box">
                                        <span className="pr-grid-rank-num">{driver.rank}</span>
                                    </div>
                                    <div className="pr-grid-photo">
                                        <DriverImage name={driver.name} season={selectedSeason} />
                                    </div>
                                    <div className="pr-grid-info">
                                        <span className="pr-grid-name">{driver.name}</span>
                                        <span className="pr-grid-team">
                                            <i className="fas fa-shield-alt" style={{marginRight:'5px', fontSize:'10px'}}></i>
                                            {driver.team}
                                        </span>
                                    </div>
                                </div>
                                <div className="pr-grid-points">
                                    <div className="pr-grid-points-val">{driver.displayScore}</div>
                                    <div className="pr-grid-points-label">PTS</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <nav className="pr-bottom-nav">
                <a href="/" className="pr-nav-link">HOME</a>
                <a href="/standings" className="pr-nav-link active">RANKINGS</a>
                <a href="/pilotos" className="pr-nav-link">DRIVERS</a>
                <a href="/teams" className="pr-nav-link">TEAMS</a>
                <a href="/news" className="pr-nav-link">NEWS</a>
            </nav>
        </div>
    );
}

export default PowerRanking;
