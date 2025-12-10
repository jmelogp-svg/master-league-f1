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
        <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '90px 20px 40px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                
                {/* AVISO EM DESENVOLVIMENTO */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
                    border: '3px solid #F59E0B',
                    borderRadius: '20px',
                    padding: '50px 30px',
                    textAlign: 'center',
                    marginBottom: '40px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 158, 11, 0.05) 10px, rgba(245, 158, 11, 0.05) 20px)',
                        pointerEvents: 'none'
                    }}></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '4rem', display: 'block', marginBottom: '15px' }}>🚧</span>
                        <h2 style={{ 
                            fontSize: '2.5rem', 
                            fontWeight: '900', 
                            color: '#F59E0B',
                            textTransform: 'uppercase',
                            marginBottom: '15px',
                            textShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
                        }}>
                            PÁGINA EM DESENVOLVIMENTO
                        </h2>
                        <p style={{ 
                            fontSize: '1.1rem', 
                            color: '#FCD34D',
                            maxWidth: '500px',
                            margin: '0 auto',
                            lineHeight: '1.6'
                        }}>
                            Estamos trabalhando para trazer esta funcionalidade em breve. Aguarde novidades!
                        </p>
                    </div>
                </div>

                <div style={{textAlign: 'center', marginBottom: '40px', opacity: 0.5}}>
                    <h1 style={{fontSize: '3rem', fontStyle: 'italic', fontWeight: '900', textTransform: 'uppercase'}}>MERCADO DE <span style={{color: '#22C55E'}}>PILOTOS</span></h1>
                    <div style={{display:'inline-block', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22C55E', borderRadius: '20px', padding: '5px 15px', color: '#22C55E', fontWeight:'700', fontSize:'0.8rem', marginTop:'10px'}}>🟢 EM BREVE</div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', opacity: 0.3, pointerEvents: 'none'}}>
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