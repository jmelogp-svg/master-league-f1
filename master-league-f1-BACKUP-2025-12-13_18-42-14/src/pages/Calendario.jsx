import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';

function Calendario() {
    const { rawCarreira, rawLight, tracks, datesCarreira, datesLight, seasons, loading } = useLeagueData();
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [gridType, setGridType] = useState('carreira');

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
                
                raceMap.set(r, { 
                    round: r, 
                    date: correctDate, 
                    gp: gpName,
                    flag: trackData.flag,
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
            <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '100px 20px', textAlign: 'center'}}>
                Carregando calendário...
            </div>
        );
    }

    const races = getCalendar();

    return (
        <div className="calendario-page" style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '80px 20px 40px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '1400px', margin: '0 auto'}}>
                {/* Header */}
                <div className="calendario-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', flexWrap: 'wrap', gap: '20px'}}>
                    <div>
                        <h1 style={{fontSize: '3rem', fontWeight: '900', fontStyle: 'italic', marginBottom: '5px'}}>CALENDÁRIO</h1>
                        <p style={{color: '#94A3B8', fontSize: '1rem', margin: 0, fontStyle: 'italic', fontWeight: '700'}}>
                            {gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT'}
                        </p>
                    </div>
                    <div className="calendario-controls" style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                onClick={() => setGridType('carreira')}
                                style={{
                                    padding: '10px 20px',
                                    background: gridType === 'carreira' ? 'var(--carreira-wine)' : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.9rem'
                                }}
                            >
                                CARREIRA
                            </button>
                            <button 
                                onClick={() => setGridType('light')}
                                style={{
                                    padding: '10px 20px',
                                    background: gridType === 'light' ? 'var(--light-blue)' : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.9rem'
                                }}
                            >
                                LIGHT
                            </button>
                        </div>
                        <select 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                            style={{
                                padding: '10px 16px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontFamily: "'Montserrat', sans-serif"
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
                        padding: '24px',
                        marginBottom: '32px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <p style={{fontSize: '1.1rem', fontWeight: '700', color: '#06B6D4', margin: 0}}>
                            ⚠️ Grid Light iniciou na Temporada 16
                        </p>
                        <button
                            onClick={() => setSelectedSeason(16)}
                            style={{
                                padding: '10px 24px',
                                background: 'var(--light-blue)',
                                color: '#0F172A',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                            Ir para Temporada 16
                        </button>
                    </div>
                )}

                {/* Grid de Corridas - 2 colunas */}
                {races.length > 0 ? (
                    <div className="calendario-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', paddingBottom: '40px'}}>
                        {races.map((race, idx) => {
                            return (
                                <div 
                                    key={idx}
                                    className="calendario-card"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                        borderRadius: '16px',
                                        borderLeft: gridType === 'carreira' ? '6px solid var(--carreira-wine)' : '6px solid var(--light-blue)',
                                        padding: '0',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        minHeight: '280px'
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
                                    <div className="calendario-info" style={{flex: 1.5, padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'}}>
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
                                            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px'}}>
                                                {race.flag && (
                                                    <img 
                                                        src={race.flag}
                                                        alt={race.gp}
                                                        className="calendario-flag"
                                                        style={{width: '64px', height: '42px', borderRadius: '6px', border: '2px solid rgba(255,255,255,0.3)', objectFit: 'cover'}}
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                )}
                                                <p className="calendario-round" style={{fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, fontWeight: '800'}}>
                                                    ROUND {race.round}
                                                </p>
                                            </div>

                                            {/* Nome do GP */}
                                            <h3 className="calendario-gp-name" style={{fontSize: '2rem', fontWeight: '900', margin: '0 0 12px 0', color: 'white', lineHeight: '1.1'}}>
                                                {race.gp}
                                            </h3>

                                            {/* Nome do Circuito */}
                                            {race.circuitName && (
                                                <p className="calendario-circuit" style={{fontSize: '1rem', color: '#06B6D4', margin: '0 0 16px 0', fontWeight: '700'}}>
                                                    🏁 {race.circuitName}
                                                </p>
                                            )}

                                            {/* Data */}
                                            <p className="calendario-date" style={{fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#94A3B8'}}>
                                                🗓️ {new Date(parseDate(race.date)).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: '2-digit'
                                                })}
                                            </p>
                                        </div>

                                        {/* Accent bar */}
                                        <span style={{
                                            display: 'inline-block',
                                            width: '50px',
                                            height: '5px',
                                            background: gridType === 'carreira' ? 'var(--carreira-wine)' : 'var(--light-blue)',
                                            borderRadius: '2px',
                                            marginTop: '16px'
                                        }}></span>
                                    </div>

                                    {/* Lado Direito - Card 3x4 com Vencedor */}
                                    <div className="calendario-winner" style={{
                                        flex: 1,
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{fontSize: '0.65rem', color: '#FFD700', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px 0', fontWeight: '800'}}>
                                            🏆 VENCEDOR
                                        </p>
                                        
                                        {race.winner && race.status === 'done' ? (
                                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%'}}>
                                                {/* Card 3x4 para a foto */}
                                                <div className="calendario-winner-photo" style={{
                                                    position: 'relative',
                                                    width: '120px',
                                                    aspectRatio: '3/4',
                                                    border: '2px solid rgba(6, 182, 212, 0.4)',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)',
                                                    boxShadow: gridType === 'carreira' 
                                                        ? '0 0 20px rgba(157, 29, 73, 0.3)' 
                                                        : '0 0 20px rgba(6, 182, 212, 0.3)'
                                                }}>
                                                    <DriverImage 
                                                        name={race.winner} 
                                                        season={selectedSeason}
                                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                                    />
                                                </div>
                                                
                                                {/* Info do Piloto */}
                                                <div style={{width: '100%'}}>
                                                    <p style={{fontSize: '0.95rem', fontWeight: '900', margin: '8px 0 0 0', color: '#FFD700', lineHeight: '1.1'}}>
                                                        {race.winner}
                                                    </p>
                                                    {race.winnerTeam && (
                                                        <p style={{fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 0 0', fontWeight: '600'}}>
                                                            {race.winnerTeam}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'}}>
                                                <div style={{
                                                    width: '120px',
                                                    aspectRatio: '3/4',
                                                    border: '2px solid rgba(6, 182, 212, 0.2)',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#94A3B8'
                                                }}>
                                                    <p style={{fontSize: '0.8rem', fontWeight: '700', margin: 0}}>
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
                    <div style={{textAlign: 'center', padding: '80px 20px', color: '#94A3B8'}}>
                        <p style={{fontSize: '1.2rem', marginBottom: '10px'}}>📅 Nenhuma corrida encontrada</p>
                        <p style={{fontSize: '0.95rem'}}>Temporada {selectedSeason} - {gridType === 'carreira' ? 'Grid Carreira' : 'Grid Light'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Calendario;
