import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import { getTeamLogo } from '../utils/classificacaoUtils';

function Calendario() {
    const { rawCarreira, rawLight, tracks, datesCarreira, datesLight, seasons, loading } = useLeagueData();
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [gridType, setGridType] = useState('carreira');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { 
        if (!loading && seasons.length > 0 && selectedSeason === 0) {
            setSelectedSeason(seasons[0]); 
        } 
    }, [seasons, loading]);

    const getCalendar = () => {
        const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
        const datesMap = gridType === 'carreira' ? datesCarreira : datesLight;
        const raceMap = new Map();

        rawData.forEach(row => {
            const s = parseInt(row[3]);
            if (s !== parseInt(selectedSeason)) return;

            const r = parseInt(row[4]);
            if (!isNaN(r) && !raceMap.has(r)) {
                const gpName = row[5];
                const normalizedGP = gpName?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
                const trackData = tracks[normalizedGP] || {};
                
                // Busca a data no mapa de datas (chave: season-round)
                const dateKey = `${s}-${r}`;
                const correctDate = datesMap[dateKey] || row[0];
                
                // Determinar bandeira: usar a do trackData ou fallback para EUA se for Texas, Miami ou Las Vegas
                let flag = trackData.flag || null;
                
                // Se não tem bandeira, verificar se é um circuito dos EUA
                if (!flag) {
                    // Verificar tanto o nome original quanto o normalizado
                    const gpNameUpper = normalizedGP || '';
                    const gpNameOriginal = (gpName || '').toUpperCase();
                    
                    // Verificar múltiplas variações possíveis (case-insensitive)
                    const isUSCircuit = 
                        gpNameUpper.includes('TEXAS') || 
                        gpNameOriginal.includes('TEXAS') ||
                        gpNameUpper.includes('MIAMI') || 
                        gpNameOriginal.includes('MIAMI') ||
                        gpNameUpper.includes('LAS VEGAS') || 
                        gpNameUpper.includes('LASVEGAS') ||
                        gpNameUpper.includes('VEGAS') || 
                        gpNameOriginal.includes('VEGAS') ||
                        gpNameOriginal.includes('LAS VEGAS') ||
                        gpNameOriginal.includes('AUSTIN'); // Austin também é Texas
                    
                    if (isUSCircuit) {
                        flag = 'https://flagcdn.com/w40/us.png';
                        console.log(`✅ Bandeira EUA aplicada para: "${gpName}" (normalized: "${normalizedGP}")`);
                    }
                }
                
                // Debug: log quando não encontrar bandeira
                if (!flag && gpName) {
                    console.warn(`⚠️ Bandeira não encontrada para: "${gpName}" (normalized: "${normalizedGP}")`);
                }
                
                raceMap.set(r, { 
                    round: r, 
                    date: correctDate, 
                    gp: gpName,
                    flag: flag,
                    circuitName: trackData.circuitName,
                    circuitMap: trackData.circuit,
                    winner: null, 
                    winnerTeam: null,
                    status: 'pending'
                });
            }

            if (parseInt(row[8]) === 1) {
                const race = raceMap.get(r);
                if (race) {
                    race.winner = row[9];
                    race.winnerTeam = row[10];
                    race.status = 'done';
                }
            }
        });

        const races = Array.from(raceMap.values()).sort((a, b) => a.round - b.round);
        return races;
    };

    const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        
        // Remove espaços
        dateStr = dateStr.trim();
        
        // Tenta dd/mm/yyyy ou dd/mm/yy
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts;
                const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y);
                try {
                    return new Date(year, parseInt(m) - 1, parseInt(d)).getTime();
                } catch (e) {
                    return 0;
                }
            }
        }
        
        // Tenta formato ISO (yyyy-mm-dd)
        if (dateStr.includes('-')) {
            try {
                return new Date(dateStr).getTime();
            } catch (e) {
                return 0;
            }
        }
        
        // Tenta qualquer outro formato
        try {
            return new Date(dateStr).getTime();
        } catch (e) {
            return 0;
        }
    };

    const DriverImage = ({ name, season, style }) => {
        const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
        // Prioriza temporada primeiro, depois SML
        const seasonSrc = `/pilotos/${gridType}/s${season}/${cleanName}.png`;
        const smlSrc = `/pilotos/SML/${cleanName}.png`;
        const shadowSrc = '/pilotos/pilotoshadow.png';
        
        const [imgSrc, setImgSrc] = useState(seasonSrc);
        
        useEffect(() => {
            setImgSrc(seasonSrc);
        }, [gridType, season, cleanName]);
        
        const handleError = () => {
            if (imgSrc.includes(`/s${season}/`)) {
                setImgSrc(smlSrc);
            } else if (imgSrc.includes('/SML/')) {
                setImgSrc(shadowSrc);
            }
        };
        
        return <img src={imgSrc} style={{...style, borderRadius: '8px'}} alt={name} onError={handleError} />;
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', 
                background: 'var(--bg-dark-main)', 
                color: 'white', 
                padding: isMobile ? '60px 20px' : '100px 20px', 
                textAlign: 'center',
                fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
                Carregando calendário...
            </div>
        );
    }

    const races = getCalendar();

    return (
        <div className="calendario-page" style={{
            minHeight: '100vh', 
            background: 'var(--bg-dark-main)', 
            color: 'white', 
            padding: isMobile ? '60px 12px 30px' : '80px 20px 40px', 
            fontFamily: "'Montserrat', sans-serif"
        }}>
            <div style={{maxWidth: '1400px', margin: '0 auto'}}>
                {/* Header */}
                <div className="calendario-header" style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    marginBottom: isMobile ? '30px' : '50px', 
                    flexWrap: 'wrap', 
                    gap: isMobile ? '16px' : '20px',
                    flexDirection: isMobile ? 'column' : 'row'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? '2rem' : '3rem', 
                            fontWeight: '900', 
                            fontStyle: 'italic', 
                            marginBottom: '5px',
                            lineHeight: '1.1'
                        }}>
                            ETAPAS
                        </h1>
                        <p style={{
                            color: '#94A3B8', 
                            fontSize: isMobile ? '0.85rem' : '1rem', 
                            margin: 0, 
                            fontStyle: 'italic', 
                            fontWeight: '700'
                        }}>
                            {gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}
                        </p>
                    </div>
                    <div className="calendario-controls" style={{
                        display: 'flex', 
                        gap: isMobile ? '10px' : '15px', 
                        alignItems: 'center', 
                        flexWrap: 'wrap',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <div style={{display: 'flex', gap: isMobile ? '8px' : '10px', flex: isMobile ? 1 : 'auto'}}>
                            <button 
                                onClick={() => setGridType('carreira')}
                                style={{
                                    padding: isMobile ? '10px 16px' : '10px 20px',
                                    background: gridType === 'carreira' ? 'var(--carreira-wine)' : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                                    flex: isMobile ? 1 : 'auto'
                                }}
                            >
                                CARREIRA
                            </button>
                            <button 
                                onClick={() => setGridType('light')}
                                style={{
                                    padding: isMobile ? '10px 16px' : '10px 20px',
                                    background: gridType === 'light' ? 'var(--light-blue)' : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                                    flex: isMobile ? 1 : 'auto'
                                }}
                            >
                                LIGHT
                            </button>
                        </div>
                        <select 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                            style={{
                                padding: isMobile ? '10px 12px' : '10px 16px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                fontFamily: "'Montserrat', sans-serif",
                                flex: isMobile ? 1 : 'auto',
                                minWidth: isMobile ? '120px' : 'auto'
                            }}
                        >
                            {seasons.map(year => (
                                <option key={year} value={year} style={{background: '#0f172a', color: 'white'}}>
                                    T{year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Aviso para Grid Light - Temporada anterior a 16 */}
                {gridType === 'light' && parseInt(selectedSeason) < 16 && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
                        border: '2px solid var(--light-blue)',
                        borderRadius: '12px',
                        padding: isMobile ? '16px' : '24px',
                        marginBottom: isMobile ? '24px' : '32px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: isMobile ? '12px' : '16px'
                    }}>
                        <p style={{
                            fontSize: isMobile ? '0.9rem' : '1.1rem', 
                            fontWeight: '700', 
                            color: '#06B6D4', 
                            margin: 0
                        }}>
                            ⚠️ Grid Light iniciou na Temporada 16
                        </p>
                        <button
                            onClick={() => setSelectedSeason(16)}
                            style={{
                                padding: isMobile ? '10px 20px' : '10px 24px',
                                background: 'var(--light-blue)',
                                color: '#0F172A',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: isMobile ? '0.85rem' : '0.95rem'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                            Ir para Temporada 16
                        </button>
                    </div>
                )}

                {/* Grid de Corridas - Responsivo */}
                {races.length > 0 ? (
                    <div className="calendario-grid" style={{
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(500px, 1fr))', 
                        gap: isMobile ? '16px' : '24px', 
                        paddingBottom: isMobile ? '30px' : '40px'
                    }}>
                        {races.map((race, idx) => {
                            return (
                                <div 
                                    key={idx}
                                    className="calendario-card"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                        borderRadius: isMobile ? '12px' : '16px',
                                        borderLeft: gridType === 'carreira' ? '6px solid var(--carreira-wine)' : '6px solid var(--light-blue)',
                                        padding: '0',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        minHeight: isMobile ? '200px' : '280px'
                                    }} 
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)';
                                        e.currentTarget.style.borderColor = '#06B6D4';
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(6, 182, 212, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)';
                                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {/* Lado Esquerdo - Info da corrida com mapa como marca d'água */}
                                    <div className="calendario-info" style={{
                                        flex: isMobile ? 1.8 : 1.5, 
                                        padding: isMobile ? '16px' : '28px', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        justifyContent: 'space-between', 
                                        position: 'relative', 
                                        overflow: 'hidden',
                                        minWidth: 0
                                    }}>
                                        {/* Background do mapa da pista - Marca d'água centralizada */}
                                        {race.circuitMap && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '120%',
                                                height: '120%',
                                                opacity: 0.08,
                                                backgroundSize: 'contain',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundImage: `url(${race.circuitMap})`
                                            }}></div>
                                        )}

                                        {/* Conteúdo */}
                                        <div style={{position: 'relative', zIndex: 2}}>
                                            {/* Bandeira e Round */}
                                            <div style={{
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: isMobile ? '8px' : '16px', 
                                                marginBottom: isMobile ? '10px' : '18px'
                                            }}>
                                                {(() => {
                                                    // Garantir que Texas, Miami e Las Vegas sempre tenham bandeira dos EUA
                                                    let flagUrl = race.flag;
                                                    if (!flagUrl) {
                                                        const gpNameUpper = (race.gp || '').toUpperCase();
                                                        if (gpNameUpper.includes('TEXAS') || gpNameUpper.includes('MIAMI') || 
                                                            gpNameUpper.includes('VEGAS') || gpNameUpper.includes('AUSTIN')) {
                                                            flagUrl = 'https://flagcdn.com/w40/us.png';
                                                            console.log(`🔧 Bandeira EUA aplicada no render para: ${race.gp}`);
                                                        }
                                                    }
                                                    
                                                    return flagUrl ? (
                                                        <img 
                                                            src={flagUrl}
                                                            alt={`Bandeira ${race.gp}`}
                                                            className="calendario-flag"
                                                            style={{
                                                                width: isMobile ? '48px' : '64px', 
                                                                height: isMobile ? '32px' : '42px', 
                                                                borderRadius: '6px', 
                                                                border: '2px solid rgba(255,255,255,0.3)', 
                                                                objectFit: 'cover',
                                                                flexShrink: 0,
                                                                display: 'block',
                                                                minWidth: isMobile ? '48px' : '64px',
                                                                minHeight: isMobile ? '32px' : '42px',
                                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                                imageRendering: 'crisp-edges'
                                                            }}
                                                            onError={(e) => {
                                                                console.error(`❌ Erro ao carregar bandeira: ${flagUrl} para ${race.gp}`);
                                                                // Tentar fallback para EUA se for Texas, Miami ou Las Vegas
                                                                const gpNameUpper = (race.gp || '').toUpperCase();
                                                                if (gpNameUpper.includes('TEXAS') || gpNameUpper.includes('MIAMI') || 
                                                                    gpNameUpper.includes('VEGAS') || gpNameUpper.includes('AUSTIN')) {
                                                                    if (e.target.src !== 'https://flagcdn.com/w40/us.png') {
                                                                        e.target.src = 'https://flagcdn.com/w40/us.png';
                                                                        console.log(`🔄 Tentando fallback EUA para: ${race.gp}`);
                                                                    } else {
                                                                        // Se já tentou EUA e falhou, mostrar placeholder
                                                                        e.target.style.opacity = '0.5';
                                                                        e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
                                                                        e.target.style.border = '2px dashed rgba(148, 163, 184, 0.4)';
                                                                    }
                                                                } else {
                                                                    // Não esconder, apenas mostrar placeholder
                                                                    e.target.style.opacity = '0.5';
                                                                    e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
                                                                    e.target.style.border = '2px dashed rgba(148, 163, 184, 0.4)';
                                                                }
                                                            }}
                                                            onLoad={() => {
                                                                // Garantir que a imagem seja visível quando carregar
                                                                const img = document.querySelector(`img[alt="Bandeira ${race.gp}"]`);
                                                                if (img) {
                                                                    img.style.opacity = '1';
                                                                    img.style.backgroundColor = 'transparent';
                                                                }
                                                            }}
                                                            loading="eager"
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: isMobile ? '48px' : '64px', 
                                                            height: isMobile ? '32px' : '42px', 
                                                            borderRadius: '6px', 
                                                            border: '2px dashed rgba(148, 163, 184, 0.4)', 
                                                            backgroundColor: 'rgba(148, 163, 184, 0.1)',
                                                            flexShrink: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: isMobile ? '0.5rem' : '0.6rem',
                                                            color: '#94A3B8'
                                                        }}>
                                                            🏁
                                                        </div>
                                                    );
                                                })()}
                                                <p className="calendario-round" style={{
                                                    fontSize: isMobile ? '0.65rem' : '0.85rem', 
                                                    color: '#94A3B8', 
                                                    textTransform: 'uppercase', 
                                                    letterSpacing: isMobile ? '1px' : '2px', 
                                                    margin: 0, 
                                                    fontWeight: '800',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    ROUND {race.round}
                                                </p>
                                            </div>

                                            {/* Nome do GP */}
                                            <h3 className="calendario-gp-name" style={{
                                                fontSize: isMobile ? '1.1rem' : '2rem', 
                                                fontWeight: '900', 
                                                margin: '0 0 8px 0', 
                                                color: 'white', 
                                                lineHeight: '1.1',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: isMobile ? 2 : 3,
                                                WebkitBoxOrient: 'vertical'
                                            }}>
                                                {race.gp}
                                            </h3>

                                            {/* Nome do Circuito */}
                                            {race.circuitName && (
                                                <p className="calendario-circuit" style={{
                                                    fontSize: isMobile ? '0.75rem' : '1rem', 
                                                    color: '#06B6D4', 
                                                    margin: '0 0 10px 0', 
                                                    fontWeight: '700',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    🏁 {race.circuitName}
                                                </p>
                                            )}

                                            {/* Data */}
                                            <p className="calendario-date" style={{
                                                fontSize: isMobile ? '0.8rem' : '1.1rem', 
                                                fontWeight: '700', 
                                                margin: '0 0 12px 0', 
                                                color: '#94A3B8'
                                            }}>
                                                🗓️ {new Date(parseDate(race.date)).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: '2-digit'
                                                })}
                                            </p>

                                            {/* Equipe do Vencedor */}
                                            {race.winnerTeam && race.winner && race.status === 'done' && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: isMobile ? '8px' : '10px',
                                                    marginTop: '4px'
                                                }}>
                                                    {getTeamLogo(race.winnerTeam) && (
                                                        <img 
                                                            src={getTeamLogo(race.winnerTeam)}
                                                            alt={race.winnerTeam}
                                                            style={{
                                                                width: isMobile ? '20px' : '24px',
                                                                height: isMobile ? '20px' : '24px',
                                                                objectFit: 'contain',
                                                                flexShrink: 0
                                                            }}
                                                            onError={(e) => e.target.style.display = 'none'}
                                                        />
                                                    )}
                                                    <p style={{
                                                        fontSize: isMobile ? '0.75rem' : '0.9rem',
                                                        color: '#06B6D4',
                                                        margin: 0,
                                                        fontWeight: '700',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {race.winnerTeam}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Accent bar */}
                                        <span style={{
                                            display: 'inline-block',
                                            width: isMobile ? '40px' : '50px',
                                            height: isMobile ? '4px' : '5px',
                                            background: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)',
                                            borderRadius: '2px',
                                            marginTop: isMobile ? '12px' : '16px'
                                        }}></span>
                                    </div>

                                    {/* Lado Direito - Card 3x4 com Vencedor */}
                                    <div className="calendario-winner" style={{
                                        flex: isMobile ? 1 : 1,
                                        padding: isMobile ? '12px' : '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        flexShrink: 0,
                                        minWidth: isMobile ? '100px' : 'auto'
                                    }}>
                                        <p style={{
                                            fontSize: isMobile ? '0.55rem' : '0.65rem', 
                                            color: '#FFD700', 
                                            textTransform: 'uppercase', 
                                            letterSpacing: isMobile ? '1px' : '1.5px', 
                                            margin: '0 0 8px 0', 
                                            fontWeight: '800'
                                        }}>
                                            🏆 VENCEDOR
                                        </p>
                                        
                                        {race.winner && race.status === 'done' ? (
                                            <div style={{
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                gap: isMobile ? '8px' : '12px', 
                                                width: '100%'
                                            }}>
                                                {/* Card 3x4 para a foto */}
                                                <div className="calendario-winner-photo" style={{
                                                    position: 'relative',
                                                    width: isMobile ? '70px' : '120px',
                                                    aspectRatio: '3/4',
                                                    border: '2px solid rgba(6, 182, 212, 0.4)',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)',
                                                    boxShadow: gridType === 'carreira' 
                                                        ? '0 0 20px rgba(157, 29, 73, 0.3)' 
                                                        : '0 0 20px rgba(6, 182, 212, 0.3)',
                                                    flexShrink: 0
                                                }}>
                                                    <DriverImage 
                                                        name={race.winner} 
                                                        season={selectedSeason}
                                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                                    />
                                                </div>
                                                
                                                {/* Info do Piloto - Nome e Sobrenome em duas linhas */}
                                                <div style={{width: '100%', textAlign: 'center'}}>
                                                    {(() => {
                                                        const nameParts = race.winner.trim().split(' ');
                                                        const firstName = nameParts[0] || '';
                                                        const lastName = nameParts.slice(1).join(' ') || '';
                                                        
                                                        return (
                                                            <>
                                                                <p style={{
                                                                    fontSize: isMobile ? '0.75rem' : '0.95rem', 
                                                                    fontWeight: '900', 
                                                                    margin: '0', 
                                                                    color: '#FFD700', 
                                                                    lineHeight: '1.1',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {firstName}
                                                                </p>
                                                                {lastName && (
                                                                    <p style={{
                                                                        fontSize: isMobile ? '0.75rem' : '0.95rem', 
                                                                        fontWeight: '900', 
                                                                        margin: '2px 0 0 0', 
                                                                        color: '#FFD700', 
                                                                        lineHeight: '1.1',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        {lastName}
                                                                    </p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                                                <div style={{
                                                    width: isMobile ? '70px' : '120px',
                                                    aspectRatio: '3/4',
                                                    border: '2px solid rgba(6, 182, 212, 0.2)',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#94A3B8'
                                                }}>
                                                    <p style={{
                                                        fontSize: isMobile ? '0.65rem' : '0.8rem', 
                                                        fontWeight: '700', 
                                                        margin: 0
                                                    }}>
                                                        {race.status === 'done' ? 'Realizado' : 'Pendente'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center', 
                        padding: isMobile ? '60px 20px' : '80px 20px', 
                        color: '#94A3B8'
                    }}>
                        <p style={{
                            fontSize: isMobile ? '1rem' : '1.2rem', 
                            marginBottom: '10px'
                        }}>
                            📅 Nenhuma corrida encontrada
                        </p>
                        <p style={{
                            fontSize: isMobile ? '0.85rem' : '0.95rem'
                        }}>
                            Temporada {selectedSeason} - {gridType === 'carreira' ? 'Grid Carreira' : 'Grid Light'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Calendario;
