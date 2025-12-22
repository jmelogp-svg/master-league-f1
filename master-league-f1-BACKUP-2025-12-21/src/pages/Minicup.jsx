import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useSupabaseCache } from '../hooks/useSupabaseCache';
import { supabase } from '../supabaseClient';
import '../index.css';

// URL do CSV do Minicup
// Planilha: CONTROLE ML1
// Aba: TAB MINICUP (gid=1709066718)
// Link: https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pubhtml?gid=1709066718&single=true
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
    if (!teamName || teamName.trim() === "") return '/team-logos/f1-reserva.png';
    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t === "reserva" || t.includes('reserva')) return '/team-logos/f1-reserva.png';
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racing') || t.includes('vcarb') || t.includes('bulls')) return '/team-logos/f1-racingbulls.png';
    return '/team-logos/f1-reserva.png';
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
    const [expandedRows, setExpandedRows] = useState([]);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, []);

    // Buscar dados da Minicup usando cache do Supabase
    const { data: minicupCacheData, loading: minicupCacheLoading, source: minicupSource, error: minicupError } = useSupabaseCache('minicup_cache', {
        fallbackUrl: MINICUP_CSV_URL,
        cacheMaxAge: 10,
        enableLocalCache: true,
        parseData: (data) => {
            // Os dados do Supabase vêm como { rows: [...] }
            // Os dados do fallback também vêm como { rows: [...] }
            if (data && typeof data === 'object' && Array.isArray(data.rows)) {
                return data.rows; // Retornar array de arrays
            }
            // Se for array direto (não deveria acontecer, mas por segurança)
            if (Array.isArray(data)) {
                return data;
            }
            // Fallback: retornar array vazio
            console.warn('⚠️ Formato de dados inesperado da Minicup:', typeof data, data);
            return [];
        }
    });

    useEffect(() => {
        if (minicupCacheLoading) {
            return;
        }

        if (minicupError) {
            console.error('❌ Erro ao carregar Minicup:', minicupError);
            return;
        }

        if (!minicupCacheData || !Array.isArray(minicupCacheData)) {
            console.warn('⚠️ Dados da Minicup inválidos ou vazios');
            return;
        }

        // Processar dados da Minicup
        const rows = minicupCacheData;
        if (rows.length < 2) {
            console.warn('⚠️ Dados da Minicup insuficientes');
            return;
        }

        const header = rows[0];
        
        // Extrair nomes das corridas - APENAS colunas E a J (índices 4 a 9)
        // Colunas L e M são apenas referências (POSIÇÃO e PTS), não são corridas
        const raceNames = [];
        const raceStartCol = 4; // Coluna E (índice 4)
        const raceEndCol = 9;   // Coluna J (índice 9) - máximo de 6 corridas
        
        // Processar apenas as colunas E (4) até J (9)
        for (let i = raceStartCol; i <= raceEndCol; i++) {
            const raceName = header[i]?.trim();
            if (raceName && raceName.length > 0) {
                raceNames.push(raceName);
            } else {
                // Mesmo se vazio, adiciona para manter o índice correto
                // (pode ser uma corrida ainda não realizada)
                raceNames.push('');
            }
        }
        
        // Filtrar apenas corridas com nome para exibição
        const racesWithNames = raceNames.filter(r => r && r.length > 0);
        
        console.log(`📊 Colunas de corridas processadas: ${racesWithNames.length} (colunas E-J, índices ${raceStartCol} a ${raceEndCol})`);
        console.log(`🏁 Corridas: ${racesWithNames.join(', ') || 'Nenhuma corrida com nome ainda'}`);
        
        setRaces(racesWithNames);

        // Processar dados dos pilotos
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

            // Processar resultados para todas as corridas detectadas
            for (let j = 0; j < raceNames.length; j++) {
                const colIndex = raceStartCol + j;
                const position = row[colIndex]?.trim();
                if (position && !isNaN(parseInt(position))) {
                    const pos = parseInt(position);
                    if (pos >= 1 && pos <= 20) { // Validar posição entre 1 e 20
                        const pts = getPoints(pos);
                        raceResults.push({ position: pos, points: pts });
                        totalPoints += pts;
                        racesParticipated++;
                        if (pos === 1) wins++;
                    } else {
                        raceResults.push({ position: null, points: 0 });
                    }
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

        // Ordenar por pontos e vitórias
        driversData.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return b.wins - a.wins;
        });

        console.log(`✅ Minicup processado: ${driversData.length} pilotos, ${raceNames.length} corridas (${minicupSource === 'supabase' ? 'Supabase' : 'Google Sheets'})`);
        
        setStandings(driversData);
    }, [minicupCacheData, minicupCacheLoading, minicupSource, minicupError]);

    if (minicupCacheLoading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0D3320', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'pulse 2s ease-in-out infinite' }}>🏎️</div>
                    <p style={{ fontSize: '1.1rem', color: '#10B981', fontWeight: '600' }}>Carregando classificação Minicup...</p>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '10px' }}>Aguarde enquanto buscamos os dados mais recentes</p>
                </div>
            </div>
        );
    }

    if (minicupError) {
        return (
            <div style={{ minHeight: '100vh', background: '#0D3320', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#EF4444' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                    <p>Erro ao carregar dados: {minicupError}</p>
                </div>
            </div>
        );
    }

    const leader = standings[0];

    const toggleRow = (driverName) => {
        setExpandedRows(prev => 
            prev.includes(driverName) 
                ? prev.filter(name => name !== driverName)
                : [...prev, driverName]
        );
    };

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
                        src="/team-logos/minicup-logo.png" 
                        alt="Minicup" 
                        style={{ width: '80%', height: 'auto' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>

                {/* Card do Líder */}
                {leader && (
                    <div 
                        className="minicup-leader-card"
                        style={{
                            maxWidth: '900px',
                            margin: '0 auto',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '20px',
                            padding: '25px 40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <div className="leader-title-mobile" style={{ display: 'none', fontSize: '0.7rem', color: '#10B981', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px', textAlign: 'center', width: '100%' }}>
                            👑 LÍDER DO CAMPEONATO
                        </div>
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
                                <div className="leader-title-desktop" style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: '700', letterSpacing: '1px', marginBottom: '5px' }}>👑 LÍDER DO CAMPEONATO</div>
                                <div className="leader-name" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white' }}>{leader.name}</div>
                                <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>{leader.team}</div>
                                <div className="leader-points-mobile" style={{ display: 'none', fontSize: '1.5rem', fontWeight: '900', color: '#10B981', marginTop: '5px' }}>
                                    {leader.totalPoints} <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>PONTOS | {leader.wins} VITÓRIA{leader.wins !== 1 ? 'S' : ''}</span>
                                </div>
                            </div>
                        </div>
                        <div className="leader-points-desktop" style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10B981' }}>{leader.totalPoints}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94A3B8', letterSpacing: '1px' }}>PONTOS | {leader.wins} VITÓRIA{leader.wins !== 1 ? 'S' : ''}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* TABELA DE CLASSIFICAÇÃO */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 
                        className="minicup-title"
                        style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: '800', 
                            color: '#10B981', 
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            letterSpacing: '2px'
                        }}
                    >
                        <span className="title-full">🏁 CLASSIFICAÇÃO MINICUP ML1 🏁</span>
                        <span className="title-mobile" style={{display: 'none'}}>🏁 CLASSIFICAÇÃO MINICUP ML1 🏁</span>
                    </h2>
                    <button
                        onClick={async () => {
                            if (window.confirm('Atualizar dados da Minicup?\n\nIsso forçará uma nova sincronização com a planilha.')) {
                                try {
                                    // Limpar cache local
                                    Object.keys(localStorage).forEach(key => {
                                        if (key.startsWith('cache_minicup_cache')) {
                                            localStorage.removeItem(key);
                                        }
                                    });
                                    
                                    // Chamar Edge Function para forçar sincronização
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session) {
                                        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/sync-google-sheets`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${supabase.supabaseKey}`
                                            },
                                            body: JSON.stringify({ sheetType: 'minicup', force: true })
                                        });
                                        
                                        if (response.ok) {
                                            alert('✅ Sincronização iniciada! A página será recarregada em 3 segundos...');
                                            setTimeout(() => window.location.reload(), 3000);
                                        } else {
                                            alert('⚠️ Erro ao sincronizar. Tente novamente ou aguarde a sincronização automática.');
                                        }
                                    } else {
                                        // Se não estiver logado, apenas recarregar a página
                                        alert('🔄 Recarregando página para buscar dados atualizados...');
                                        window.location.reload();
                                    }
                                } catch (err) {
                                    console.error('Erro ao forçar sincronização:', err);
                                    alert('⚠️ Erro ao sincronizar. Recarregando página...');
                                    window.location.reload();
                                }
                            }
                        }}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid #10B981',
                            borderRadius: '8px',
                            color: '#10B981',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        🔄 Atualizar Dados
                    </button>
                </div>

                {/* Header da tabela */}
                <div 
                    className="minicup-table-header"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `60px 300px repeat(${races.length}, 70px) 100px`,
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
                    }}
                >
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
                    const isExpanded = expandedRows.includes(driver.name);
                    
                    return (
                        <div key={driver.name}>
                            {/* Linha principal */}
                            <div 
                                className="minicup-table-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `60px 300px repeat(${races.length}, 70px) 100px`,
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
                                        width: '60px',
                                        height: '70px',
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
                                                color: 'white'
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
                                            fontWeight: '600'
                                        }}>{driver.team}</div>
                                    </div>
                                </div>

                                {/* Pontos por etapa */}
                                <div className="minicup-race-results" style={{ display: 'contents' }}>
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
                                </div>

                                {/* Total de Pontos e Botão Expandir (Mobile) */}
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                    <div>
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
                                    
                                    {/* Botão expandir mobile */}
                                    <button
                                        onClick={() => toggleRow(driver.name)}
                                        className="minicup-expand-btn"
                                        style={{
                                            display: 'none',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            color: '#10B981',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.65rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {isExpanded ? '▲' : '▼'}
                                    </button>
                                </div>
                            </div>

                            {/* Etapas expandidas (mobile) */}
                            {isExpanded && (
                                <div 
                                    className="minicup-races-expanded"
                                    style={{
                                        display: 'none',
                                        width: '100%',
                                        overflowX: 'auto',
                                        padding: '10px 20px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
                                        {driver.raceResults.map((result, i) => (
                                            <div 
                                                key={i}
                                                style={{
                                                    minWidth: '60px',
                                                    textAlign: 'center',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    background: result.points > 0 
                                                        ? result.position === 1 
                                                            ? '#10B981' 
                                                            : result.position <= 3 
                                                                ? 'rgba(16, 185, 129, 0.3)' 
                                                                : 'rgba(255,255,255,0.05)'
                                                        : 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}
                                            >
                                                <div style={{ marginBottom: '5px' }}>
                                                    <FlagImage raceName={races[i]} />
                                                </div>
                                                <div style={{ 
                                                    fontSize: '0.65rem', 
                                                    color: '#94A3B8',
                                                    marginBottom: '3px'
                                                }}>
                                                    {races[i]?.substring(0, 3).toUpperCase()}
                                                </div>
                                                <div style={{
                                                    fontSize: '1rem',
                                                    fontWeight: '700',
                                                    color: result.points > 0 
                                                        ? result.position === 1 
                                                            ? '#0D3320' 
                                                            : '#10B981'
                                                        : '#64748B'
                                                }}>
                                                    {result.points > 0 ? result.points : '-'}
                                                </div>
                                                {result.position && (
                                                    <div style={{ 
                                                        fontSize: '0.6rem', 
                                                        color: '#94A3B8',
                                                        marginTop: '2px'
                                                    }}>
                                                        P{result.position}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
