import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useLeagueData } from '../hooks/useLeagueData';
import '../index.css';

// --- HELPERS (Mesmos do Home) ---
const getTeamColor = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "var(--f1-redbull)"; 
    if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
    // ... (adicione o resto se quiser, ou use o padrão)
    return "#94A3B8";
};

const calculateStats = (data, driverName) => {
    const stats = { seasons: new Set(), gps: 0, wins: 0, poles: 0, podiums: 0, bestRes: 999, team: 'Sem Equipe', currentPoints: 0, races: [] };
    let found = false;
    data.forEach(row => {
        if (row[9] === driverName) {
            found = true;
            stats.seasons.add(row[3]);
            stats.gps++;
            if (parseInt(row[6]) === 1) stats.poles++;
            const pos = parseInt(row[8]);
            if (!isNaN(pos)) {
                if (pos === 1) stats.wins++;
                if (pos <= 3) stats.podiums++;
                if (pos < stats.bestRes) stats.bestRes = pos;
            }
            stats.team = row[10];
            let p = parseFloat((row[15]||'0').replace(',', '.'));
            if(!isNaN(p)) stats.currentPoints += p;
        }
    });
    return found ? stats : null;
};

const DriverImage = ({ name }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    return <img src={`/pilotos/carreira/s19/${cleanName}.png`} style={{width:'100%', height:'100%', objectFit:'cover'}} onError={(e) => e.target.src = '/pilotos/pilotoshadow.png'} alt="" />;
};

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const { rawCarreira, rawLight, loading } = useLeagueData();
    const [statsCarreira, setStatsCarreira] = useState(null);
    const [statsLight, setStatsLight] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) navigate('/login');
            else setUser(session.user);
        };
        getSession();
    }, [navigate]);

    useEffect(() => {
        if (user && !loading) {
            const nameToSearch = user.user_metadata.full_name || user.user_metadata.name;
            const cStats = calculateStats(rawCarreira, nameToSearch);
            const lStats = calculateStats(rawLight, nameToSearch);
            setStatsCarreira(cStats);
            setStatsLight(lStats);
        }
    }, [user, rawCarreira, rawLight, loading]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (!user || loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando Cockpit...</div>;

    const displayName = user.user_metadata.full_name;
    // PROTEÇÃO CONTRA NULL AQUI:
    const displayTeam = statsCarreira?.team || statsLight?.team || "Piloto Independente";
    const teamColor = getTeamColor(displayTeam);
    
    const totalWins = (statsCarreira?.wins || 0) + (statsLight?.wins || 0);
    const totalPodiums = (statsCarreira?.podiums || 0) + (statsLight?.podiums || 0);
    const totalSeasons = (statsCarreira?.seasons?.size || 0) + (statsLight?.seasons?.size || 0);

    return (
        <div className="page-wrapper">
            <div className="dashboard-hero" style={{background: `linear-gradient(135deg, ${teamColor}aa 0%, #0F172A 90%)`}}>
                <div className="dashboard-hero-content">
                    <div>
                        <h1 style={{fontSize:'2.5rem', fontStyle:'italic', fontWeight:'900', textTransform:'uppercase', margin:0, lineHeight:1}}>COCKPIT</h1>
                        <div style={{color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: '2px', marginTop:'5px', textTransform:'uppercase'}}>{displayTeam}</div>
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => navigate('/')} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>SITE</button>
                        <button onClick={handleLogout} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px', borderColor:'#EF4444', color:'#EF4444'}}>SAIR</button>
                    </div>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="dashboard-main-grid">
                    <div className="license-card">
                        <div className="lc-header">SUPER LICENÇA VIRTUAL <span className="lc-status">ATIVO</span></div>
                        <div className="lc-body">
                            <div className="lc-photo-box" style={{borderColor: teamColor}}>
                                <DriverImage name={displayName} />
                            </div>
                            <div className="lc-info">
                                <div className="lc-label">PILOTO</div>
                                <div className="lc-name">{displayName}</div>
                                <div className="lc-team" style={{color: teamColor}}>{displayTeam}</div>
                                <div className="lc-details-row">
                                    <div><div className="lc-label">Licença</div><div className="lc-value">BRA-{user.id.slice(0,4).toUpperCase()}</div></div>
                                </div>
                            </div>
                            <div className="lc-fia-bg">FIA</div>
                        </div>
                    </div>

                    <div className="career-summary-card">
                        <h3>RESUMO DA CARREIRA</h3>
                        <div className="csc-grid">
                            <div className="csc-item"><div className="csc-val">{totalWins}</div><div className="csc-lbl">VITÓRIAS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalPodiums}</div><div className="csc-lbl">PÓDIOS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalSeasons}</div><div className="csc-lbl">TEMPORADAS</div></div>
                        </div>
                    </div>
                </div>

                <h3 className="stats-section-title" style={{color: 'var(--carreira-wine)', borderColor: 'var(--carreira-wine)'}}>GRID CARREIRA</h3>
                {statsCarreira ? (
                    <div className="stats-row-cockpit">
                        <StatBox label="GPS" value={statsCarreira.gps} />
                        <StatBox label="VITÓRIAS" value={statsCarreira.wins} />
                        <StatBox label="POLES" value={statsCarreira.poles} />
                        <StatBox label="PÓDIOS" value={statsCarreira.podiums} />
                        <StatBox label="PONTOS" value={statsCarreira.currentPoints.toFixed(0)} />
                        <StatBox label="MELHOR RES." value={statsCarreira.bestRes === 999 ? '-' : `${statsCarreira.bestRes}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Carreira.</div>}

                <h3 className="stats-section-title" style={{marginTop:'40px', color: 'var(--light-blue)', borderColor: 'var(--light-blue)'}}>GRID LIGHT</h3>
                {statsLight ? (
                    <div className="stats-row-cockpit">
                        <StatBox label="GPS" value={statsLight.gps} />
                        <StatBox label="VITÓRIAS" value={statsLight.wins} />
                        <StatBox label="POLES" value={statsLight.poles} />
                        <StatBox label="PÓDIOS" value={statsLight.podiums} />
                        <StatBox label="PONTOS" value={statsLight.currentPoints.toFixed(0)} />
                        <StatBox label="MELHOR RES." value={statsLight.bestRes === 999 ? '-' : `${statsLight.bestRes}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Light.</div>}
            </div>
        </div>
    );
}

const StatBox = ({ label, value }) => (
    <div className="cockpit-stat-box">
        <div className="csb-value">{value}</div>
        <div className="csb-label">{label}</div>
    </div>
);

export default Dashboard;