import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Mercado() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    // Mock de dados para visualização
    const teams = [
        { name: 'Mercedes', color: '#27F4D2' },
        { name: 'Ferrari', color: '#E8002D' },
        { name: 'Red Bull', color: '#3671C6' },
        { name: 'McLaren', color: '#FF8000' },
        { name: 'Aston Martin', color: '#229971' },
        { name: 'Alpine', color: '#FD4BC7' }
    ];
    return (
        <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '40px 20px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
                    <div className="nav-logo" style={{fontSize: '1.5rem'}}>MASTER <span>LEAGUE</span></div>
                    <Link to="/" style={{color: '#CBD5E1', textDecoration: 'none', fontWeight: '700', border:'1px solid rgba(255,255,255,0.2)', padding:'8px 16px', borderRadius:'6px'}}>VOLTAR</Link>
                </div>

                <div style={{textAlign: 'center', marginBottom: '40px'}}>
                    <h1 style={{fontSize: '3rem', fontStyle: 'italic', fontWeight: '900', textTransform: 'uppercase'}}>MERCADO DE <span style={{color: '#22C55E'}}>PILOTOS</span></h1>
                    <div style={{display:'inline-block', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22C55E', borderRadius: '20px', padding: '5px 15px', color: '#22C55E', fontWeight:'700', fontSize:'0.8rem', marginTop:'10px'}}>🟢 MERCADO ABERTO</div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px'}}>
                    {teams.map(team => (
                        <div key={team.name} style={{background: '#1E293B', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: `4px solid ${team.color}`}}>
                            <h3 style={{textTransform: 'uppercase', marginBottom: '15px', fontSize:'1.2rem', fontWeight:'800'}}>{team.name}</h3>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                {/* Vaga 1 */}
                                <div style={{background: '#0F172A', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span style={{fontSize: '0.9rem', fontWeight:'600'}}>Vaga 1</span>
                                    <span style={{fontSize: '0.7rem', color: '#EF4444', fontWeight:'700'}}>OCUPADA</span>
                                </div>
                                
                                {/* Vaga 2 */}
                                <div style={{background: 'rgba(34, 197, 94, 0.05)', border:'1px dashed #22C55E', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span style={{fontSize: '0.9rem', fontWeight:'600'}}>Vaga 2</span>
                                    <button style={{background: '#22C55E', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#022C22', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer'}}>ASSINAR</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}