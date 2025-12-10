import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import '../index.css';

// URL do CSV do Minicup
const MINICUP_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1709066718&single=true&output=csv';

// Mapeamento de código de país para código ISO (para usar com flagcdn)
const getCountryCode = (raceName) => {
    // Normalizar: minúsculas e remover acentos
    const name = raceName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Verificar códigos exatos primeiro
    if (name === 'imo' || name === 'imola') return 'it';
    if (name === 'at' || name === 'aus') return 'at';
    if (name === 'au') return 'au';
    if (name === 'jp' || name === 'jap') return 'jp';
    if (name === 'mc' || name === 'mon') return 'mc';
    if (name === 'gb' || name === 'gra') return 'gb';
    // Depois verificar por conteúdo
    if (name.includes('imola')) return 'it';
    if (name.includes('austria')) return 'at';
    if (name.includes('australia')) return 'au';
    if (name.includes('japan') || name.includes('japao')) return 'jp';
    if (name.includes('monaco')) return 'mc';
    if (name.includes('britain') || name.includes('silverstone') || name.includes('gra-bretanha') || name.includes('gra bretanha')) return 'gb';
    if (name.includes('italy') || name.includes('italia') || name.includes('monza')) return 'it';
    if (name.includes('bahrain') || name.includes('bahrein')) return 'bh';
    if (name.includes('saudi') || name.includes('arabia')) return 'sa';
    if (name.includes('china')) return 'cn';
    if (name.includes('miami') || name.includes('usa') || name.includes('austin') || name.includes('vegas')) return 'us';
    if (name.includes('canada')) return 'ca';
    if (name.includes('spain') || name.includes('espanha') || name.includes('barcelona')) return 'es';
    if (name.includes('hungary') || name.includes('hungria')) return 'hu';
    if (name.includes('belgium') || name.includes('belgica') || name.includes('spa')) return 'be';
    if (name.includes('netherlands') || name.includes('holanda') || name.includes('zandvoort')) return 'nl';
    if (name.includes('singapore') || name.includes('singapura')) return 'sg';
    if (name.includes('qatar') || name.includes('catar')) return 'qa';
    if (name.includes('mexico')) return 'mx';
    if (name.includes('brazil') || name.includes('brasil') || name.includes('interlagos')) return 'br';
    if (name.includes('abu') || name.includes('emirates')) return 'ae';
    return null;
};

// Componente de bandeira
const FlagImage = ({ raceName }) => {
    const code = getCountryCode(raceName);
    if (!code) return <span style={{ fontSize: '1.4rem' }}>🏁</span>;
    return (
        <img 
            src={`https://flagcdn.com/w40/${code}.png`}
            alt={raceName}
            style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px' }}
        />
    );
};

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
    if (t.includes('red bull')) return '#3671C6';
    if (t.includes('ferrari')) return '#E80020';
    if (t.includes('mercedes')) return '#27F4D2';
    if (t.includes('mclaren')) return '#FF8000';
    if (t.includes('aston')) return '#229971';
    if (t.includes('alpine')) return '#FF87BC';
    if (t.includes('haas')) return '#B6BABD';
    if (t.includes('williams')) return '#64C4FF';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '#52E252';
    if (t.includes('racing bulls') || t.includes('vcarb')) return '#6692FF';
    return '#64748B';
};

// Logos das equipes
const getTeamLogo = (teamName) => {
    if (!teamName || teamName.trim() === "") return '/logos/reserva.png';
    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t === "reserva" || t.includes('reserva')) return '/logos/reserva.png';
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/logos/redbull.png';
    if (t.includes('ferrari')) return '/logos/ferrari.png';
    if (t.includes('mercedes')) return '/logos/mercedes.png';
    if (t.includes('mclaren')) return '/logos/mclaren.png';
    if (t.includes('aston')) return '/logos/astonmartin.png';
    if (t.includes('alpine')) return '/logos/alpine.png';
    if (t.includes('williams')) return '/logos/williams.png';
    if (t.includes('haas')) return '/logos/haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/logos/sauber.png';
    if (t.includes('racing') || t.includes('vcarb') || t.includes('bulls')) return '/logos/racingbulls.png';
    return '/logos/reserva.png';
};

// Componente de foto do piloto
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

                        const header = rows[0];
                        const raceNames = [];
                        for (let i = 4; i <= 9; i++) {
                            if (header[i] && header[i].trim()) {
                                raceNames.push(header[i].trim());
                            }
                        }
                        setRaces(raceNames);

                        const driversData = [];
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const piloto = row[1]?.trim();
                            
                            if (!piloto) continue;

                            const equipe = row[2]?.trim() || 'Reserva';
                            
                            const raceResults = [];
                            let totalPoints = 0;
                            let racesParticipated = 0;
                            let wins = 0;

                            for (let j = 4; j <= 9; j++) {
                                const position = row[j]?.trim();
                                if (position && !isNaN(parseInt(position))) {
                                    const pos = parseInt(position);
                                    const pts = getPoints(pos);
                                    raceResults.push({ position: pos, points: pts });
                                    totalPoints += pts;
                                    racesParticipated++;
                                    if (pos === 1) wins++;
                                } else {
                                    raceResults.push({ position: null, points: 0 });
                                }
                            }

                            if (racesParticipated > 0) {
                                driversData.push({
                                    name: piloto,
                                    team: equipe,
                                    totalPoints,
                                    wins,
                                    raceResults
                                });
                            }
                        }

                        driversData.sort((a, b) => {
                            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                            return b.wins - a.wins;
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
            <div style={{ minHeight: '100vh', background: '#0D3320', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏎️</div>
                    <p>Carregando classificação...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#0D3320', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#EF4444' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    const leader = standings[0];

    return (
        <div style={{ background: 'linear-gradient(180deg, #0D3320 0%, #0F172A 50%)', minHeight: '100vh' }}>
            {/* HERO VERDE */}
            <div style={{
                background: 'linear-gradient(135deg, #0D3320 0%, #064E3B 50%, #0D3320 100%)',
                padding: '100px 20px 60px',
                textAlign: 'center'
            }}>
                {/* Logo Minicup */}
                <div style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto 30px',
                    background: '#0D3320',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #10B981'
                }}>
                    <img 
                        src="/logos/minicup-logo.png" 
                        alt="Minicup" 
                        style={{ width: '80%', height: 'auto' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>

                {/* Card do Líder */}
                {leader && (
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '20px',
                        padding: '25px 40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{
                                width: '80px',
                                height: '100px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '3px solid #10B981',
                                background: '#0D3320'
                            }}>
                                <DriverImage name={leader.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <img 
                                src={getTeamLogo(leader.team)} 
                                alt={leader.team}
                                style={{ 
                                    width: '50px', 
                                    height: '50px', 
                                    objectFit: 'contain',
                                    opacity: 0.9
                                }}
                            />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: '700', letterSpacing: '1px', marginBottom: '5px' }}>👑 LÍDER DO CAMPEONATO</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white' }}>{leader.name}</div>
                                <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>{leader.team}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10B981' }}>{leader.totalPoints}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94A3B8', letterSpacing: '1px' }}>PONTOS | {leader.wins} VITÓRIA{leader.wins !== 1 ? 'S' : ''}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* TABELA DE CLASSIFICAÇÃO */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <h2 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '800', 
                    color: '#10B981', 
                    marginBottom: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    letterSpacing: '2px'
                }}>
                    🏁 CLASSIFICAÇÃO GERAL | MINICUP PRÉ-TEMPORADA
                </h2>

                {/* Header da tabela */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `60px 280px repeat(${races.length}, 70px) 100px`,
                    gap: '5px',
                    padding: '15px 20px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px 12px 0 0',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    alignItems: 'center'
                }}>
                    <div>POS</div>
                    <div>PILOTO</div>
                    {races.map((race, i) => {
                        const raceCode = race.substring(0, 3).toUpperCase();
                        return (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '4px' }}><FlagImage raceName={race} /></div>
                                <div>{raceCode}</div>
                            </div>
                        );
                    })}
                    <div style={{ textAlign: 'center' }}>TOTAL</div>
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
                                gridTemplateColumns: `60px 280px repeat(${races.length}, 70px) 100px`,
                                gap: '5px',
                                padding: '15px 20px',
                                background: isTop3 
                                    ? 'rgba(16, 185, 129, 0.08)' 
                                    : 'rgba(30, 41, 59, 0.5)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                alignItems: 'center',
                                borderLeft: `4px solid ${isTop3 ? '#10B981' : teamColor}`
                            }}
                        >
                            {/* Posição */}
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: '900',
                                color: isTop3 ? '#10B981' : '#64748B'
                            }}>
                                {position}º
                            </div>

                            {/* Piloto e Equipe */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '45px',
                                    height: '55px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: '#1E293B',
                                    border: `2px solid ${teamColor}`,
                                    flexShrink: 0
                                }}>
                                    <DriverImage name={driver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <img 
                                    src={getTeamLogo(driver.team)} 
                                    alt={driver.team}
                                    style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        objectFit: 'contain',
                                        opacity: 0.9,
                                        flexShrink: 0
                                    }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div 
                                        className="driver-name-minicup"
                                        style={{ 
                                            fontWeight: '700', 
                                            fontSize: '0.95rem', 
                                            color: 'white',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                        data-full-name={driver.name}
                                    >
                                        <span className="full-name">{driver.name}</span>
                                        <span className="short-name" style={{ display: 'none' }}>
                                            {(() => {
                                                const nameParts = driver.name.trim().split(' ');
                                                if (nameParts.length > 1) {
                                                    return `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`;
                                                }
                                                return driver.name;
                                            })()}
                                        </span>
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: teamColor, 
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{driver.team}</div>
                                </div>
                            </div>

                            {/* Pontos por etapa */}
                            {driver.raceResults.map((result, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        textAlign: 'center',
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        background: result.points > 0 
                                            ? result.position === 1 
                                                ? '#10B981' 
                                                : result.position <= 3 
                                                    ? 'rgba(16, 185, 129, 0.3)' 
                                                    : 'rgba(255,255,255,0.05)'
                                            : 'transparent',
                                        color: result.points > 0 
                                            ? result.position === 1 
                                                ? '#0D3320' 
                                                : result.position <= 3 
                                                    ? '#10B981' 
                                                    : '#94A3B8'
                                            : '#374151',
                                        fontWeight: result.points > 0 ? '700' : '400',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {result.points > 0 ? (
                                        <>
                                            <div>{result.points}</div>
                                            <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>P{result.position}</div>
                                        </>
                                    ) : '-'}
                                </div>
                            ))}

                            {/* Total de Pontos */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '1.3rem', 
                                    fontWeight: '900', 
                                    color: isTop3 ? '#10B981' : '#6EE7B7'
                                }}>
                                    {driver.totalPoints}
                                </div>
                                {driver.wins > 0 && (
                                    <div style={{ fontSize: '0.7rem', color: '#FFD700' }}>🏆</div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Legenda */}
                <div style={{
                    marginTop: '40px',
                    padding: '20px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.1)'
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
                        {[...Array(10)].map((_, i) => (
                            <div 
                                key={i}
                                style={{
                                    padding: '5px 10px',
                                    background: i < 3 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '6px',
                                    color: i < 3 ? '#10B981' : '#6EE7B7'
                                }}
                            >
                                {i + 1}º = {20 - i}pts
                            </div>
                        ))}
                        <div style={{ padding: '5px 10px', color: '#64748B' }}>...</div>
                        <div style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: '#6EE7B7' }}>20º = 1pt</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Minicup;
