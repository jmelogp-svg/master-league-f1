import React, { useState, useEffect } from 'react';
import { usePowerRankingCache } from '../hooks/useSupabaseCache';
import '../index.css'; // Garante estilos

// --- HELPERS VISUAIS ---
const DriverImage = ({ name, season, className }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const primarySrc = `/pilotos/carreira/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={primarySrc} className={className} style={{mixBlendMode: 'lighten'}} onError={handleError} alt={name} />;
};
const getTeamLogo = (teamName) => {
    if(!teamName) return null;
    const t = teamName.toLowerCase().replace(/\s/g, ''); 
    if(t.includes("ferrari")) return "/logos/ferrari.png"; 
    if(t.includes("mercedes")) return "/logos/mercedes.png"; 
    if(t.includes("alpine")) return "/logos/alpine.png"; 
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls")) || t.includes("visa")) return "/logos/racingbulls.png"; 
    if(t.includes("redbull") || t.includes("oracle")) return "/logos/redbull.png"; 
    if(t.includes("mclaren")) return "/logos/mclaren.png"; 
    if(t.includes("aston")) return "/logos/astonmartin.png"; 
    if(t.includes("haas")) return "/logos/haas.png"; 
    if(t.includes("williams")) return "/logos/williams.png"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/logos/sauber.png";
    return null;
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
    return "#94A3B8"; // Cinza padrão se não achar
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

    // 2. Processar Pontos e Equipes (ATUALIZADO)
    useEffect(() => {
        if (!selectedSeason || !rawPR || rawPR.length === 0) return;

        const driverStats = {};

        rawPR.forEach(row => {
            // Mapeamento:
            // A[0]: Piloto
            // I[8]: Total PR
            // J[9]: Season
            // K[10]: Equipe (NOVO!)
            
            const driverName = row[0];
            const totalPR = parseFloat(row[8]); 
            const rowSeason = row[9]?.trim();
            const teamName = row[10]?.trim(); // Lendo a Coluna K

            if (rowSeason === String(selectedSeason) && driverName) {
                if (!driverStats[driverName]) {
                    driverStats[driverName] = { 
                        name: driverName, 
                        team: teamName || "Sem Equipe", // Usa a coluna K
                        totalScore: 0
                    };
                }
                
                // Se a equipe mudar no meio da temporada, isso pega a última lida.
                // Para maior precisão, poderíamos pegar a equipe mais frequente, 
                // mas pegar a última entrada geralmente funciona bem.
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
        return (
            <div style={{padding:'100px', textAlign:'center', color:'white'}}>
                Carregando Power Ranking...
            </div>
        );
    }

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    // Função para obter cor do rank
    const getRankColor = (rank) => {
        switch(rank) {
            case 2: return '#2563eb'; // Blue
            case 3: return '#10b981'; // Green
            case 4: return '#db2777'; // Pink
            case 5: return '#9ca3af'; // Gray
            default: return '#64748B'; // Default gray para ranks 6+
        }
    };
    
    // Função para obter cor baseada na equipe (para ranks 6+)
    const getCardColor = (driver) => {
        if (driver.rank <= 5) {
            return getRankColor(driver.rank);
        }
        // Para ranks 6+, usar cor da equipe
        return getTeamColor(driver.team);
    };
    
    // Função para obter gradiente da equipe
    const getTeamGradient = (teamName) => {
        if (!teamName) return 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
        
        const t = teamName.toLowerCase();
        // Gradientes baseados nas cores das equipes (tons mais escuros para o degradê)
        if (t.includes("red bull") || t.includes("oracle")) {
            return 'linear-gradient(135deg, #3671C6 0%, #1E40AF 50%, #1E3A8A 100%)';
        }
        if (t.includes("ferrari")) {
            return 'linear-gradient(135deg, #E8002D 0%, #C1121F 50%, #B8001F 100%)';
        }
        if (t.includes("mercedes")) {
            return 'linear-gradient(135deg, #27F4D2 0%, #00D4AA 50%, #00A082 100%)';
        }
        if (t.includes("mclaren")) {
            return 'linear-gradient(135deg, #FF8000 0%, #FF6600 50%, #E55A00 100%)';
        }
        if (t.includes("aston")) {
            return 'linear-gradient(135deg, #229971 0%, #006B52 50%, #005A44 100%)';
        }
        if (t.includes("alpine")) {
            return 'linear-gradient(135deg, #FD4BC7 0%, #E91E63 50%, #C2185B 100%)';
        }
        if (t.includes("haas")) {
            return 'linear-gradient(135deg, #B6BABD 0%, #9CA3AF 50%, #8B8F91 100%)';
        }
        if (t.includes("williams")) {
            return 'linear-gradient(135deg, #64C4FF 0%, #0099FF 50%, #0077CC 100%)';
        }
        if (t.includes("stake") || t.includes("kick") || t.includes("sauber")) {
            return 'linear-gradient(135deg, #52E252 0%, #00C853 50%, #00A844 100%)';
        }
        if (t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) {
            return 'linear-gradient(135deg, #6692FF 0%, #4A6CF7 50%, #3B5BDB 100%)';
        }
        return 'linear-gradient(135deg, #64748B 0%, #475569 50%, #334155 100%)';
    };
    
    // Função para obter gradiente do rank (2-5)
    const getRankGradient = (rank) => {
        switch(rank) {
            case 2: return 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'; // Blue
            case 3: return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green
            case 4: return 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'; // Pink
            case 5: return 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'; // Gray
            default: return 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
        }
    };
    
    // Função para obter gradiente do card
    const getCardGradient = (driver) => {
        if (driver.rank <= 5) {
            return getRankGradient(driver.rank);
        }
        return getTeamGradient(driver.team);
    };

    return (
        <div className="page-wrapper">
            {/* VERSÃO MOBILE */}
            <div className="pr-mobile-wrapper">
                {/* Header */}
                <header className="pr-mobile-header">
                    <h1 className="pr-mobile-title">
                        <span className="pr-title-white">Power</span>
                        <span className="pr-title-accent"> Ranking</span>
                    </h1>
                    <p className="pr-mobile-subtitle">
                        Ranking de performance pura. Quem domina a pista?
                    </p>
                    <div className="pr-mobile-season-wrapper">
                        <select 
                            className="pr-mobile-season-select" 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(e.target.value)}
                        >
                            {availableSeasons.map(s => (
                                <option key={s} value={s}>TEMPORADA {s}</option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down pr-mobile-season-icon"></i>
                    </div>
                </header>

                {/* Main Content */}
                <main className="pr-mobile-main">
                    {/* Hero Card (Rank 1) */}
                    {leader && (
                        <section className="pr-mobile-hero-card" style={{'--team-color': getTeamColor(leader.team)}}>
                            {/* Rank Number (Left Side, Orange Background) */}
                            <div className="pr-hero-rank">
                                <span className="pr-hero-rank-number">1</span>
                                <span className="pr-hero-rank-label">TOP 1</span>
                            </div>
                            {/* Driver Image */}
                            <div className="pr-hero-photo-container">
                                <DriverImage name={leader.name} season={selectedSeason} className="pr-hero-photo" />
                                <div className="pr-hero-gradient-overlay"></div>
                            </div>
                            {/* Driver Info (Right Side/Bottom) */}
                            <div className="pr-hero-info">
                                <h2 className="pr-hero-name">
                                    {leader.name?.toUpperCase().split(' ').map((part, i, arr) => (
                                        <React.Fragment key={i}>
                                            {part}
                                            {i < arr.length - 1 && <br />}
                                        </React.Fragment>
                                    ))}
                                </h2>
                                <div className="pr-hero-team">
                                    <span className="pr-hero-team-name">{leader.team?.toUpperCase()}</span>
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div className="pr-hero-points-badge">
                                    <span className="pr-hero-points">{leader.displayScore} PONTOS</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Leaderboard List (Ranks 2+) */}
                    <section className="pr-mobile-list">
                        {rest.map((driver) => {
                            const cardColor = getCardColor(driver);
                            const cardGradient = getCardGradient(driver);
                            return (
                                <div key={driver.name} className="pr-mobile-card">
                                    {/* Left Color Indicator */}
                                    <div className="pr-card-color-bar" style={{background: cardGradient}}></div>
                                    {/* Rank Box */}
                                    <div className="pr-mobile-rank-badge" style={{background: cardGradient, borderColor: cardColor}}>
                                        <span className="pr-mobile-rank-number" style={{color: 'white'}}>{driver.rank}</span>
                                    </div>
                                    {/* Avatar */}
                                    <div className="pr-mobile-avatar" style={{borderColor: cardColor}}>
                                        <DriverImage name={driver.name} season={selectedSeason} className="pr-mobile-avatar-img" />
                                    </div>
                                    {/* Info */}
                                    <div className="pr-mobile-info">
                                        <h3 className="pr-mobile-driver-name">{driver.name}</h3>
                                        <div className="pr-mobile-team-info">
                                            <i className="fas fa-shield-alt"></i>
                                            <span className="pr-mobile-team-name">{driver.team?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    {/* Points */}
                                    <div className="pr-mobile-points">
                                        <div className="pr-mobile-points-value" style={{background: cardGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: '700'}}>{driver.displayScore}</div>
                                        <div className="pr-mobile-points-label">PTS</div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {rankingData.length === 0 && (
                            <div className="pr-mobile-empty">Sem dados para esta temporada.</div>
                        )}
                    </section>
                </main>
            </div>

            {/* VERSÃO DESKTOP */}
            <div className="pr-desktop-wrapper">
                <div className="pr-header">
                    <h1 className="pr-title">POWER <span>RANKING</span></h1>
                    <p className="pr-subtitle">Ranking de performance pura. Quem domina a pista?</p>
                    <div style={{marginTop: '20px'}}>
                        <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} style={{border: '1px solid #FFD700', color: '#FFD700'}}>
                            {availableSeasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pr-container">
                    {/* CARD LÍDER (HERO) */}
                    {leader && (
                        <div className="pr-leader-card" style={{borderColor: getTeamColor(leader.team)}}>
                            <div className="pr-leader-pos" style={{background: getTeamColor(leader.team), color: '#0F172A'}}>1</div>
                            <DriverImage name={leader.name} season={selectedSeason} className="pr-leader-photo" />
                            <div className="pr-leader-info">
                                <div className="pr-leader-name">{leader.name}</div>
                                <div className="pr-leader-team-group">
                                    {getTeamLogo(leader.team) && <img src={getTeamLogo(leader.team)} className="pr-team-logo-large" alt="" />}
                                    <div className="pr-leader-team" style={{color: getTeamColor(leader.team)}}>{leader.team}</div>
                                </div>
                            </div>
                            <div className="pr-leader-score">
                                <div className="score-val" style={{color: getTeamColor(leader.team)}}>{leader.displayScore}</div>
                                <span className="score-label">PONTOS</span>
                            </div>
                        </div>
                    )}

                    {/* LISTA ESTILIZADA (CARDS MODERNOS) */}
                    <div className="pr-list">
                        {rest.map((driver) => {
                            const tColor = getTeamColor(driver.team);
                            const isPodium = driver.rank <= 3;
                            return (
                                <div 
                                    key={driver.name} 
                                    className={`pr-card ${isPodium ? 'pr-card-podium' : ''}`} 
                                    style={{"--team-color": tColor}}
                                >
                                    <div className="pr-rank-badge" style={{background: isPodium ? tColor : 'rgba(148, 163, 184, 0.2)'}}>
                                        <span className="pr-rank-number">{driver.rank}</span>
                                        {isPodium && <span className="pr-rank-medal">🏆</span>}
                                    </div>
                                    
                                    <div className="pr-photo-wrapper">
                                        <div className="pr-photo-frame" style={{borderColor: tColor}}>
                                            <DriverImage name={driver.name} season={selectedSeason} className="pr-card-photo" />
                                        </div>
                                    </div>

                                    <div className="pr-info">
                                        <div className="pr-name">{driver.name || 'Sem nome'}</div>
                                        <div className="pr-team-row">
                                            {getTeamLogo(driver.team) && (
                                                <img src={getTeamLogo(driver.team)} className="pr-team-logo-small" alt={driver.team} />
                                            )}
                                            <div className="pr-team-name" style={{color: tColor}}>{driver.team || 'Sem equipe'}</div>
                                        </div>
                                    </div>

                                    <div className="pr-score-container">
                                        <div className="pr-score-val" style={{color: tColor}}>{driver.displayScore}</div>
                                        <div className="pr-score-label">PTS</div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {rankingData.length === 0 && <div style={{textAlign:'center', padding:'40px', color:'#94A3B8'}}>Sem dados para esta temporada.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PowerRanking;