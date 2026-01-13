import { useState, useEffect, useMemo } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, ReferenceLine, LabelList
} from 'recharts';
import '../index.css';

const getTeamColor = (teamName) => {
    if(!teamName) return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "#3671C6"; 
    if(t.includes("ferrari")) return "#E8002D"; 
    if(t.includes("mercedes")) return "#27F4D2"; 
    if(t.includes("mclaren")) return "#FF8000"; 
    if(t.includes("aston")) return "#229971"; 
    if(t.includes("alpine")) return "#FD4BC7"; 
    if(t.includes("haas")) return "#B6BABD"; 
    if(t.includes("williams")) return "#64C4FF"; 
    if(t.includes("stake") || t.includes("sauber")) return "#52E252"; 
    if(t.includes("vcarb") || t.includes("racing bulls")) return "#6692FF";
    return "#94A3B8";
};

const CustomLegend = ({ payload }) => {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
            {payload.map((entry, index) => {
                const isDashed = entry.payload.strokeDasharray !== "0";
                return (
                    <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        <div style={{ width: '25px', height: '0', borderTop: `3px ${isDashed ? 'dashed' : 'solid'} ${entry.color}`, marginRight: '8px' }}></div>
                        <span style={{fontWeight: '700'}}>{entry.value}</span>
                    </div>
                );
            })}
        </div>
    );
};

function Telemetria() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, seasons, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [showCharts, setShowCharts] = useState(false);
    
    useEffect(() => {
        if (!loading && seasons.length > 0 && selectedSeason === 0) {
            setSelectedSeason(seasons[0]);
            setShowCharts(true);
        }
    }, [seasons, loading, selectedSeason]);

    useEffect(() => {
        setShowCharts(false);
        const timer = setTimeout(() => setShowCharts(true), 100);
        return () => clearTimeout(timer);
    }, [gridType, selectedSeason]);

    const { evolutionData, qualyData, racePaceData, topDriversList } = useMemo(() => {
        if (!showCharts || (gridType === 'light' && parseInt(selectedSeason) < 16)) {
            return { evolutionData: [], qualyData: [], racePaceData: [], topDriversList: [] };
        }

        const data = gridType === 'carreira' ? rawCarreira : rawLight;
        if (!data || data.length === 0 || !selectedSeason) return { evolutionData: [], qualyData: [], racePaceData: [], topDriversList: [] };

        // Otimização: usar Map em vez de objeto para melhor performance
        const driverMap = new Map();
        const roundsMap = new Set();

        // Loop único com menos processamento
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const s = parseInt(row[3]);
            if (s !== parseInt(selectedSeason)) continue;

            const name = row[9];
            const round = parseInt(row[4]);
            if (!name) continue;

            const qualy = parseInt(row[6]);
            const race = parseInt(row[8]);
            let points = parseFloat((row[15] || '0').replace(',', '.'));
            if (isNaN(points)) points = 0;

            roundsMap.add(round);

            if (!driverMap.has(name)) {
                driverMap.set(name, { 
                    name, team: row[10], totalPoints: 0, pointsHistory: {}, 
                    qualySum: 0, raceSum: 0, deltaSum: 0, racesCount: 0 
                });
            }

            const driver = driverMap.get(name);
            if (!isNaN(qualy) && !isNaN(race)) {
                driver.qualySum += qualy;
                driver.raceSum += race;
                driver.deltaSum += (qualy - race); 
                driver.racesCount++;
            }

            driver.totalPoints += points;
            driver.pointsHistory[round] = driver.totalPoints;
        }

        const sortedDrivers = Array.from(driverMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
        const topDrivers = sortedDrivers.slice(0, 5); 
        const rounds = Array.from(roundsMap).sort((a, b) => a - b);
        
        const evolData = rounds.map(r => {
            const point = { name: `R${r}` };
            for (const d of topDrivers) {
                for (let i = r; i >= 1; i--) {
                    if (d.pointsHistory[i] !== undefined) {
                        point[d.name] = d.pointsHistory[i];
                        break;
                    }
                }
            }
            return point;
        });

        const consistentDrivers = sortedDrivers.filter(d => d.racesCount > 0).slice(0, 20);

        const qData = consistentDrivers.map(d => {
            const avgQualy = d.qualySum / d.racesCount;
            const score = Math.max(0, Math.round(((21 - avgQualy) / 20) * 100));
            return { name: d.name, score: score, display: `${score}%`, avgPos: avgQualy.toFixed(1), team: d.team };
        }).sort((a, b) => b.score - a.score);

        const rData = consistentDrivers.map(d => {
            const avgDelta = d.deltaSum / d.racesCount;
            return { name: d.name, delta: parseFloat(avgDelta.toFixed(1)), team: d.team };
        }).sort((a, b) => b.delta - a.delta);

        return { evolutionData: evolData, qualyData: qData, racePaceData: rData, topDriversList: topDrivers };

    }, [gridType, selectedSeason, rawCarreira, rawLight, showCharts]);

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando Telemetria...</div>;

    return (
        <div className="page-wrapper">
            
            {/* HEADER */}
            <div className="analises-hero">
                <div className="analises-content" style={{textAlign: 'center'}}>
                    <h1 className="hero-title" style={{fontSize:'3rem', marginBottom:'10px'}}>TELEMETRIA</h1>
                    <p className="hero-subtitle" style={{margin:'0 auto 30px'}}>Análise avançada de desempenho e consistência.</p>

                    <div style={{display:'flex', gap:'15px', justifyContent:'center', flexWrap:'wrap'}}>
                         <div className="grid-toggle">
                            <button onClick={() => setGridType('carreira')} className={`grid-btn ${gridType === 'carreira' ? 'active-carreira' : ''}`}>CARREIRA</button>
                            <button onClick={() => setGridType('light')} className={`grid-btn ${gridType === 'light' ? 'active-light' : ''}`}>LIGHT</button>
                        </div>
                        <select className="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} style={{minWidth:'150px'}}>
                            {seasons.map(s => <option key={s} value={s}>Temporada {s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="hub-container" style={{marginTop:'-40px', position:'relative', zIndex:2}}>
                
                {/* AVISO LIGHT S16 */}
                {(gridType === 'light' && parseInt(selectedSeason) < 16) ? (
                    <div style={{textAlign: 'center', padding: '80px 20px', background: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '600px', margin: '40px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'}}>
                        <div style={{fontSize: '4rem', marginBottom: '20px'}}>🚧</div>
                        <h2 style={{color: 'white', marginBottom: '15px', fontSize: '1.8rem', fontWeight: '900', textTransform:'uppercase'}}>TEMPORADA NÃO DISPONÍVEL</h2>
                        <p style={{color: '#94A3B8', marginBottom: '30px', fontSize: '1.1rem'}}>O <strong>Grid Light</strong> teve início apenas na <strong>Temporada 16</strong>.</p>
                        <button onClick={() => setSelectedSeason(16)} className="btn-primary" style={{textDecoration:'none', cursor:'pointer', border:'none'}}>IR PARA TEMPORADA 16</button>
                    </div>
                ) : (
                    <>
                        {/* GRÁFICO 1 (EVOLUÇÃO) - Margem top adicionada */}
                        <div className="chart-card" style={{marginTop: '40px'}}>
                            <div className="chart-header">
                                <h3>DISPUTA PELO TÍTULO (TOP 5)</h3>
                                <span>Evolução de pontos acumulados por etapa</span>
                            </div>
                            <div style={{ width: '100%', height: 500 }}> 
                                <ResponsiveContainer>
                                    <LineChart data={evolutionData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="#94A3B8" />
                                        <YAxis stroke="#94A3B8" />
                                        <Tooltip contentStyle={{backgroundColor:'#1E293B', border:'1px solid #334155', borderRadius:'8px', color:'white'}} />
                                        <Legend content={<CustomLegend />} verticalAlign="bottom" />
                                        {topDriversList.map((driver) => {
                                            const isSecondDriver = new Set([...topDriversList.slice(0, topDriversList.indexOf(driver))].map(d => d.team)).has(driver.team);
                                            return (
                                                <Line 
                                                    key={driver.name} type="monotone" dataKey={driver.name} 
                                                    stroke={getTeamColor(driver.team)} strokeWidth={3}
                                                    strokeDasharray={isSecondDriver ? "5 5" : "0"}
                                                    dot={{r: 4}} activeDot={{ r: 6 }} 
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CONTAINER LADO A LADO */}
                        <div className="chart-grid-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            
                            {/* GRÁFICO 2 */}
                            <div className="chart-card" style={{width: '100%'}}>
                                <div className="chart-header">
                                    <h3>RITMO DE CLASSIFICAÇÃO</h3>
                                    <span>Potência em volta rápida (0% a 100%)</span>
                                </div>
                                <div style={{ width: '100%', height: 600 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={qualyData} layout="vertical" margin={{top: 5, right: 50, left: 40, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" stroke="white" width={100} tick={{fontSize: 11}} interval={0} />
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor:'#1E293B', border:'1px solid #334155', color:'white'}} formatter={(value, name, props) => [`${value}% (Méd: ${props.payload.avgPos}º)`, "Score"]} />
                                            <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]} barSize={15}>
                                                <LabelList dataKey="display" position="right" fill="white" fontSize={11} fontWeight={800} />
                                                {qualyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={getTeamColor(entry.team)} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* GRÁFICO 3 */}
                            <div className="chart-card" style={{width: '100%'}}>
                                <div className="chart-header">
                                    <h3>RITMO DE CORRIDA</h3>
                                    <span>Posições ganhas (Verde) ou perdidas (Vermelho)</span>
                                </div>
                                <div style={{ width: '100%', height: 600 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={racePaceData} layout="vertical" margin={{top: 5, right: 80, left: 80, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                            <XAxis type="number" stroke="#94A3B8" hide domain={[dataMin => Math.min(dataMin, 0), dataMax => Math.max(dataMax, 0)]} />
                                            <YAxis dataKey="name" type="category" stroke="white" width={140} tick={{fontSize: 11}} interval={0} />
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor:'#1E293B', border:'1px solid #334155', color:'white'}} formatter={(value) => [`${value > 0 ? '+' : ''}${value} posições`, "Média"]} />
                                            <ReferenceLine x={0} stroke="#64748B" strokeWidth={2} />
                                            <Bar dataKey="delta" name="Delta" barSize={15}>
                                                {racePaceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? '#10B981' : '#EF4444'} radius={entry.delta >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]} />)}
                                                <LabelList 
                                                    dataKey="delta" 
                                                    content={(props) => {
                                                        const { x, y, width, height, value, index } = props;
                                                        const data = racePaceData[index];
                                                        if (!data) return null;
                                                        
                                                        if (data.delta >= 0) {
                                                            return (
                                                                <text 
                                                                    x={Number(x) + Number(width) + 5} 
                                                                    y={Number(y) + Number(height) / 2} 
                                                                    fill="white" 
                                                                    fontSize={11} 
                                                                    fontWeight={800} 
                                                                    textAnchor="start" 
                                                                    dominantBaseline="middle"
                                                                >
                                                                    {`+${value}`}
                                                                </text>
                                                            );
                                                        } else {
                                                            return (
                                                                <text 
                                                                    x={Number(x) - 5} 
                                                                    y={Number(y) + Number(height) / 2} 
                                                                    fill="white" 
                                                                    fontSize={11} 
                                                                    fontWeight={800} 
                                                                    textAnchor="end" 
                                                                    dominantBaseline="middle"
                                                                >
                                                                    {value}
                                                                </text>
                                                            );
                                                        }
                                                    }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Telemetria;