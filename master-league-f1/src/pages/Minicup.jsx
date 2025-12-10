import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import '../index.css';

// URL do CSV do Minicup
const MINICUP_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1709066718&single=true&output=csv';

// Pontuação: 1º = 20pts, 2º = 19pts, ..., 20º = 1pt
const getPoints = (position) => {
    const pos = parseInt(position);
    if (isNaN(pos) || pos < 1 || pos > 20) return 0;
    return 21 - pos;
};

// Cores das equipes
const getTeamColor = (teamName) => {
    if (!teamName || teamName === 'Reserva') return '#64748B';
    const t = teamName.toLowerCase();
    if (t.includes('red bull')) return 'var(--f1-redbull, #3671C6)';
    if (t.includes('ferrari')) return 'var(--f1-ferrari, #E80020)';
    if (t.includes('mercedes')) return 'var(--f1-mercedes, #27F4D2)';
    if (t.includes('mclaren')) return 'var(--f1-mclaren, #FF8000)';
    if (t.includes('aston')) return 'var(--f1-aston, #229971)';
    if (t.includes('alpine')) return 'var(--f1-alpine, #FF87BC)';
    if (t.includes('haas')) return 'var(--f1-haas, #B6BABD)';
    if (t.includes('williams')) return 'var(--f1-williams, #64C4FF)';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return 'var(--f1-sauber, #52E252)';
    if (t.includes('racing bulls') || t.includes('vcarb')) return 'var(--f1-vcarb, #6692FF)';
    return '#64748B';
};

// Componente de foto do piloto - Prioriza pasta SML
const DriverImage = ({ name, style }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const carreraSrc = `/pilotos/carreira/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes('/SML/')) {
            e.target.src = carreraSrc;
        } else if (e.target.src.includes('/s19/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={smlSrc} style={style} onError={handleError} alt={name} />;
};

function Minicup() {
    const [standings, setStandings] = useState([]);
    const [races, setRaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        const fetchData = async () => {
            try {
                const response = await fetch(MINICUP_CSV_URL);
                const csvText = await response.text();
                
                Papa.parse(csvText, {
                    complete: (results) => {
                        const rows = results.data;
                        if (rows.length < 2) {
                            setError('Dados não encontrados');
                            setLoading(false);
                            return;
                        }

                        // Pegar nomes das corridas do header (colunas E-J = índices 4-9)
                        const header = rows[0];
                        const raceNames = [];
                        for (let i = 4; i <= 9; i++) {
                            if (header[i] && header[i].trim()) {
                                raceNames.push(header[i].trim());
                            }
                        }
                        setRaces(raceNames);

                        // Processar pilotos (pular header)
                        const driversData = [];
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const piloto = row[1]?.trim();
                            
                            if (!piloto) continue;

                            const equipe = row[2]?.trim() || 'Reserva';
                            
                            // Pegar posições das corridas (colunas E-J = índices 4-9)
                            const raceResults = [];
                            let totalPoints = 0;
                            let racesParticipated = 0;
                            let wins = 0;
                            let podiums = 0;

                            for (let j = 4; j <= 9; j++) {
                                const position = row[j]?.trim();
                                if (position && !isNaN(parseInt(position))) {
                                    const pos = parseInt(position);
                                    const pts = getPoints(pos);
                                    raceResults.push({ position: pos, points: pts });
                                    totalPoints += pts;
                                    racesParticipated++;
                                    if (pos === 1) wins++;
                                    if (pos <= 3) podiums++;
                                } else {
                                    raceResults.push({ position: null, points: 0 });
                                }
                            }

                            // Só adicionar pilotos que participaram de pelo menos 1 corrida
                            if (racesParticipated > 0) {
                                driversData.push({
                                    name: piloto,
                                    team: equipe,
                                    totalPoints,
                                    racesParticipated,
                                    wins,
                                    podiums,
                                    raceResults
                                });
                            }
                        }

                        // Ordenar por pontos (decrescente), depois por vitórias, depois por pódios
                        driversData.sort((a, b) => {
                            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                            if (b.wins !== a.wins) return b.wins - a.wins;
                            return b.podiums - a.podiums;
                        });

                        setStandings(driversData);
                        setLoading(false);
                    },
                    error: (err) => {
                        setError('Erro ao processar dados: ' + err.message);
                        setLoading(false);
                    }
                });
            } catch (err) {
                setError('Erro ao carregar dados: ' + err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏆</div>
                    <p>Carregando Minicup...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#EF4444' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    const leader = standings[0];

    return (
        <div className="page-wrapper" style={{ background: 'linear-gradient(180deg, #0D3320 0%, #0F172A 30%)', minHeight: '100vh' }}>
            {/* HERO VERDE */}
            <div style={{
                background: 'linear-gradient(135deg, #0D3320 0%, #064E3B 50%, #0D3320 100%)',
                padding: '100px 20px 60px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    opacity: 0.5
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Logo Minicup */}
                    <div style={{
                        background: '#0D3320',
                        borderRadius: '20px',
                        padding: '30px 50px',
                        display: 'inline-block',
                        marginBottom: '20px',
                        border: '2px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <img src="/logos/minicup-logo.png" alt="Minicup" style={{ height: '80px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white', marginTop: '10px' }}>MINICUP</div>
                    </div>
                    
                    <div style={{ 
                        display: 'inline-block',
                        background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent)',
                        padding: '12px 40px',
                        marginBottom: '30px'
                    }}>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#10B981', letterSpacing: '3px' }}>⚡ MINICAMPEONATO ESPECIAL ⚡</span>
                    </div>

                    {/* Líder em destaque */}
                    {leader && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '2px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '16px',
                            padding: '20px 30px',
                            maxWidth: '800px',
                            margin: '0 auto'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '70px',
                                    height: '90px',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    border: '3px solid #10B981',
                                    background: '#0D3320'
                                }}>
                                    <DriverImage name={leader.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: '700', letterSpacing: '1px', marginBottom: '5px' }}>👑 LÍDER DO CAMPEONATO</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>{leader.name}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>{leader.team}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10B981' }}>{leader.totalPoints}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PONTOS | {leader.wins} VITÓRIA{leader.wins !== 1 ? 'S' : ''}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TABELA DE CLASSIFICAÇÃO */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px', overflowX: 'auto' }}>
                <h2 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '800', 
                    color: 'white', 
                    marginBottom: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span>🏁</span> CLASSIFICAÇÃO GERAL
                </h2>

                {/* Header da tabela */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `50px 200px repeat(${races.length}, 70px) 80px`,
                    gap: '10px',
                    padding: '12px 20px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px 12px 0 0',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: '#10B981',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    minWidth: 'fit-content',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    <div>POS</div>
                    <div>PILOTO</div>
                    {races.map((race, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>{race.substring(0, 3)}</div>
                    ))}
                    <div style={{ textAlign: 'right' }}>TOTAL</div>
                </div>

                {/* Linhas da tabela */}
                {standings.map((driver, index) => {
                    const position = index + 1;
                    const teamColor = getTeamColor(driver.team);
                    const isTop3 = position <= 3;
                    
                    return (
                        <div 
                            key={driver.name}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `50px 200px repeat(${races.length}, 70px) 80px`,
                                gap: '10px',
                                padding: '12px 20px',
                                background: isTop3 
                                    ? `linear-gradient(90deg, ${position === 1 ? 'rgba(16, 185, 129, 0.2)' : position === 2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'} 0%, rgba(13, 51, 32, 0.8) 100%)`
                                    : 'rgba(13, 51, 32, 0.5)',
                                borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                borderLeft: `4px solid ${isTop3 ? '#10B981' : teamColor}`,
                                minWidth: 'fit-content'
                            }}
                        >
                            {/* Posição */}
                            <div style={{
                                fontSize: '1.1rem',
                                fontWeight: '900',
                                color: position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : position === 3 ? '#CD7F32' : '#64748B'
                            }}>
                                {position}º
                            </div>

                            {/* Piloto e Equipe */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '45px',
                                    height: '60px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    background: '#1E293B',
                                    border: `2px solid ${teamColor}`,
                                    flexShrink: 0
                                }}>
                                    <DriverImage name={driver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driver.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: teamColor, fontWeight: '600' }}>{driver.team}</div>
                                </div>
                            </div>

                            {/* Pontos por etapa */}
                            {driver.raceResults.map((result, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        textAlign: 'center',
                                        padding: '6px 4px',
                                        borderRadius: '6px',
                                        background: result.points > 0 
                                            ? result.position === 1 
                                                ? 'rgba(16, 185, 129, 0.3)' 
                                                : result.position <= 3 
                                                    ? 'rgba(16, 185, 129, 0.15)' 
                                                    : 'rgba(16, 185, 129, 0.05)'
                                            : 'transparent',
                                        color: result.points > 0 
                                            ? result.position === 1 
                                                ? '#10B981' 
                                                : result.position <= 3 
                                                    ? '#34D399' 
                                                    : '#6EE7B7'
                                            : '#374151',
                                        fontWeight: result.points > 0 ? '700' : '400',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {result.points > 0 ? result.points : '-'}
                                </div>
                            ))}

                            {/* Total de Pontos */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                    fontSize: '1.2rem', 
                                    fontWeight: '900', 
                                    color: isTop3 ? '#10B981' : '#6EE7B7'
                                }}>
                                    {driver.totalPoints}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B' }}>
                                    {driver.wins > 0 && `${driver.wins}🏆`}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Legenda de pontuação */}
                <div style={{
                    marginTop: '40px',
                    padding: '20px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10B981', marginBottom: '15px' }}>
                        📊 SISTEMA DE PONTUAÇÃO
                    </h3>
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px',
                        fontSize: '0.75rem'
                    }}>
                        {[...Array(20)].map((_, i) => (
                            <div 
                                key={i}
                                style={{
                                    padding: '5px 10px',
                                    background: i < 3 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)',
                                    borderRadius: '6px',
                                    color: i < 3 ? '#10B981' : '#6EE7B7'
                                }}
                            >
                                {i + 1}º = {20 - i}pts
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Minicup;
