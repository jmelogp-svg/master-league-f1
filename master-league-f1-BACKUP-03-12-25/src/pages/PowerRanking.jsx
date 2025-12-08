import { useState, useEffect } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import '../index.css'; // Garante estilos

// --- HELPERS VISUAIS ---
const DriverImage = ({ name, season, className }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    return <img src={`/pilotos/carreira/s${season}/${cleanName}.png`} className={className} style={{mixBlendMode: 'lighten'}} onError={(e) => e.target.src = '/pilotos/pilotoshadow.png'} alt={name} />;
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
    const { rawPR, loading } = useLeagueData();
    const [rankingData, setRankingData] = useState([]);
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState("");

    // 1. Carregar Temporadas Disponíveis
    useEffect(() => {
        if (loading || rawPR.length === 0) return;
        const seasons = [...new Set(rawPR.map(row => row[9]?.trim()))]
            .filter(s => s && !isNaN(s))
            .sort((a, b) => b - a);
        setAvailableSeasons(seasons);
        if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0]);
    }, [rawPR, loading]);

    // 2. Processar Pontos e Equipes (ATUALIZADO)
    useEffect(() => {
        if (!selectedSeason || rawPR.length === 0) return;

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
            .slice(0, 20)
            .map((d, index) => ({
                ...d,
                rank: index + 1,
                displayScore: d.totalScore.toFixed(0) 
            }));

        setRankingData(sortedRank);

    }, [selectedSeason, rawPR]);

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando Power Ranking...</div>;

    const leader = rankingData[0];
    const rest = rankingData.slice(1);

    return (
        <div className="page-wrapper">
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

                {/* LISTA ESTILIZADA (CARDS MENORES) */}
                <div className="pr-list">
                    {rest.map((driver) => {
                        const tColor = getTeamColor(driver.team);
                        return (
                            <div key={driver.name} className="pr-card" style={{"--team-color": tColor}}>
                                <div className="pr-rank">{driver.rank}º</div>
                                
                                <div className="pr-photo-wrapper">
                                    <DriverImage name={driver.name} season={selectedSeason} className="pr-card-photo" />
                                </div>

                                <div className="pr-info">
                                    <div className="pr-name">{driver.name}</div>
                                    <div className="pr-team-row">
                                        {getTeamLogo(driver.team) && <img src={getTeamLogo(driver.team)} className="pr-team-logo-small" alt="" />}
                                        <div className="pr-team-name">{driver.team}</div>
                                    </div>
                                </div>

                                <div className="pr-score-small">
                                    <div className="pr-score-val" style={{color: tColor}}>{driver.displayScore}</div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {rankingData.length === 0 && <div style={{textAlign:'center', padding:'40px', color:'#94A3B8'}}>Sem dados para esta temporada.</div>}
                </div>

            </div>
        </div>
    );
}

export default PowerRanking;