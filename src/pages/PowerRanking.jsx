import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { usePowerRankingCache, usePowerRankingLightCache } from '../hooks/useSupabaseCache';
import './Cards.css';
import './PowerRankingCards.css';

const DriverImage = ({ name, gridType, season }) => {
    const cleanName = name
        ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase()
        : "pilotoshadow";
    const s = season || '20';

    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const fallbackS19Src = `/pilotos/${gridType || 'carreira'}/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';

    const handleError = (e) => {
        if (e.target.src.includes(`/s${s}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            if (!e.target.src.includes(`/s19/`)) e.target.src = fallbackS19Src;
            else e.target.src = shadowSrc;
        } else if (e.target.src.includes(`/s19/`)) {
            e.target.src = shadowSrc;
        }
    };

    const initialSrc = smlSrc;
    return <img src={initialSrc} onError={handleError} alt={name || ''} />;
};

function PowerRanking() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pilotos, setPilotos] = useState([]);
    const [rankingList, setRankingList] = useState([]);
    const [statsMap, setStatsMap] = useState({});
    const selectedSeason = 20;
    const [selectedGrid, setSelectedGrid] = useState('carreira');
    const { data: rawPRLight, loading: loadingPRLight } = usePowerRankingLightCache(selectedSeason);
    const { data: rawPRCarreira, loading: loadingPRCarreira } = usePowerRankingCache(selectedSeason);

    const normalizeName = (name) => (name || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const rawPR = selectedGrid === 'carreira' ? rawPRCarreira : rawPRLight;

                if (!rawPR || rawPR.length === 0) {
                    setPilotos([]);
                    setStatsMap({});
                    return;
                }

                const driverStats = {};
                const titularesOverride = new Set([
                    'lucas searom'
                ]);

                rawPR.forEach((row) => {
                    const driverName = (row[0] || '').trim();
                    const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));
                    const rowSeason = (row[9] || '').trim();
                    const teamName = (row[10] || '').trim();
                    const isTitular = !/reserva/i.test(teamName) || titularesOverride.has(normalizeName(driverName));

                    if (rowSeason === String(selectedSeason) && driverName && !isNaN(totalPR) && isTitular) {
                        const key = normalizeName(driverName);
                        if (!driverStats[key]) {
                            driverStats[key] = {
                                name: driverName,
                                totalScore: 0
                            };
                        }
                        driverStats[key].totalScore += totalPR;
                    }
                });

                const ranking = Object.values(driverStats)
                    .sort((a, b) => {
                        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });

                const nomesPR = new Set(ranking.map((d) => normalizeName(d.name)));
                setRankingList(ranking);

                const { data: pilotosData, error: pilotosError } = await supabase
                    .from('pilotos')
                    .select('id, nome, grid')
                    .ilike('grid', `%${selectedGrid}%`);

                if (pilotosError) throw pilotosError;

                const pilotosByName = new Map();
                (pilotosData || []).forEach((p) => {
                    const key = normalizeName(p.nome);
                    if (!pilotosByName.has(key)) pilotosByName.set(key, p);
                });

                const pilotosOrdenados = ranking.map((item) => {
                    const key = normalizeName(item.name);
                    const piloto = pilotosByName.get(key);
                    return piloto || { id: key, nome: item.name, grid: 'light' };
                });

                setPilotos(pilotosOrdenados);

                // power_ranking_stats.piloto_id é UUID; pilotos não encontrados na tabela pilotos têm id = nome normalizado
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const ids = pilotosOrdenados
                    .map(p => p.id)
                    .filter(id => id && String(id).length > 0 && uuidRegex.test(String(id)));
                if (!ids.length) {
                    setStatsMap({});
                    return;
                }

                const { data: statsData, error: statsError } = await supabase
                    .from('power_ranking_stats')
                    .select('piloto_id, performance, racecraft, conduta, overall, historico, power_ranking')
                    .eq('season', selectedSeason)
                    .in('piloto_id', ids);

                if (statsError) throw statsError;

                const map = {};
                (statsData || []).forEach((stat) => {
                    map[stat.piloto_id] = stat;
                });
                setStatsMap(map);
            } catch (err) {
                console.error('Erro ao carregar cards do Power Ranking:', err);
                setPilotos([]);
                setStatsMap({});
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedSeason, rawPRLight, rawPRCarreira, selectedGrid]);

    const pilotosOrdenados = useMemo(() => {
        const getStats = (piloto) => statsMap[piloto.id] || {};
        const getNumber = (value) => (value === undefined || value === null || isNaN(value)) ? 0 : Number(value);

        return [...pilotos].sort((a, b) => {
            const statsA = getStats(a);
            const statsB = getStats(b);

            const criteria = [
                'power_ranking',
                'overall',
                'performance',
                'racecraft',
                'conduta',
                'historico'
            ];

            for (const key of criteria) {
                const valA = getNumber(statsA[key]);
                const valB = getNumber(statsB[key]);
                if (valB !== valA) return valB - valA;
            }

            return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        });
    }, [pilotos, statsMap]);

    if (loading || loadingPRLight || loadingPRCarreira) {
        return (
            <div className="pr-cards-page">
                <div className="pr-cards-loading">Carregando cards...</div>
            </div>
        );
    }

    return (
        <div className="pr-cards-page">
            <div className="pr-cards-header">
                <h1>Power Ranking - Grid {selectedGrid === 'carreira' ? 'Carreira' : 'Light'}</h1>
            </div>
            <div className="pr-cards-grid-toggle">
                <button
                    className={`grid-btn carreira ${selectedGrid === 'carreira' ? 'active' : ''}`}
                    onClick={() => setSelectedGrid('carreira')}
                >
                    Carreira
                </button>
                <button
                    className={`grid-btn light ${selectedGrid === 'light' ? 'active' : ''}`}
                    onClick={() => setSelectedGrid('light')}
                >
                    Light
                </button>
                <button
                    className="grid-btn historico"
                    onClick={() => navigate('/historicopowerranking')}
                >
                    Histórico
                </button>
            </div>
            <div className="pr-cards-grid">
                {pilotosOrdenados.map((piloto) => {
                    const stats = statsMap[piloto.id] || {
                        performance: 60,
                        conduta: 100,
                        racecraft: 60,
                        overall: 60,
                        historico: 60,
                        power_ranking: 60
                    };

                    return (
                        <div key={piloto.id} className="pr-card-wrapper">
                            <div className="driver-card">
                                <div className="card-bg-layer"></div>
                                <div className="driver-photo">
                                    <DriverImage
                                        name={piloto.nome}
                                        gridType={piloto.grid || 'light'}
                                        season={selectedSeason}
                                    />
                                </div>
                                <div className="card-front-layer"></div>
                                <div className="card-info-overlay">
                                    <div className="card-pr-badge stat-pr">
                                        <span className="label"></span>
                                        <span className="value main-pr">{Math.ceil(stats.power_ranking || 0)}</span>
                                    </div>
                                    <div className="card-stat-row overall stat-overall">
                                        <span className="label"></span>
                                        <span className="value">{Math.ceil(stats.overall || 60)}</span>
                                    </div>
                                    <div className="card-stat-row stat-performance">
                                        <span className="label"></span>
                                        <span className="value">{Math.ceil(stats.performance || 0)}</span>
                                    </div>
                                    <div className="card-stat-row stat-racecraft">
                                        <span className="label"></span>
                                        <span className="value">{Math.ceil(stats.racecraft || 0)}</span>
                                    </div>
                                    <div className="card-stat-row stat-conduta">
                                        <span className="label"></span>
                                        <span className="value">{Math.ceil(stats.conduta || 0)}</span>
                                    </div>
                                    <div className="card-stat-row stat-historico">
                                        <span className="label"></span>
                                    </div>
                                    <div className="historico-value">
                                        {Math.ceil(stats.historico || 0)}
                                    </div>
                                    <div className="card-name-block">
                                        <div className="driver-name">
                                            {piloto.nome.split(' ')[0]}<br />
                                            <span>{piloto.nome.split(' ').slice(1).join(' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PowerRanking;
