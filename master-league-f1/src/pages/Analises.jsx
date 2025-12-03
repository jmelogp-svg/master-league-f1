import { useState } from 'react';
import { Link } from 'react-router-dom';

function Analises() {
    const [activeTab, setActiveTab] = useState('consultar'); // 'solicitar', 'defesa', 'consultar'

    return (
        <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '40px 20px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '1000px', margin: '0 auto'}}>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
                    <div className="nav-logo" style={{fontSize: '1.5rem'}}>MASTER <span>LEAGUE</span></div>
                    <Link to="/" style={{color: '#CBD5E1', textDecoration: 'none', fontWeight: '700', border:'1px solid rgba(255,255,255,0.2)', padding:'8px 16px', borderRadius:'6px'}}>VOLTAR</Link>
                </div>

                <h1 style={{fontSize: '2.5rem', fontStyle: 'italic', fontWeight: '900', marginBottom: '30px', textTransform: 'uppercase', textAlign:'center'}}>
                    CENTRAL DE <span style={{color: '#EF4444'}}>ANÁLISES</span>
                </h1>

                {/* ABAS */}
                <div style={{display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px', flexWrap: 'wrap'}}>
                    <button onClick={() => setActiveTab('consultar')} style={{padding: '12px 30px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', background: activeTab === 'consultar' ? 'white' : 'rgba(255,255,255,0.05)', color: activeTab === 'consultar' ? '#0F172A' : '#94A3B8'}}>CONSULTAR</button>
                    <button onClick={() => setActiveTab('solicitar')} style={{padding: '12px 30px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', background: activeTab === 'solicitar' ? '#EF4444' : 'rgba(255,255,255,0.05)', color: activeTab === 'solicitar' ? 'white' : '#94A3B8'}}>ABRIR PROTESTO</button>
                    <button onClick={() => setActiveTab('defesa')} style={{padding: '12px 30px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', background: activeTab === 'defesa' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeTab === 'defesa' ? 'white' : '#94A3B8'}}>ENVIAR DEFESA</button>
                </div>

                {/* CONTEÚDO */}
                <div style={{background: '#1E293B', padding: '40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '300px', textAlign: 'center'}}>
                    
                    {activeTab === 'consultar' && (
                        <div>
                            <div style={{fontSize: '4rem', marginBottom: '20px'}}>🕵️‍♂️</div>
                            <h3>Nenhuma análise publicada</h3>
                            <p style={{color: '#94A3B8'}}>Os vereditos dos comissários aparecerão aqui.</p>
                        </div>
                    )}

                    {activeTab === 'solicitar' && (
                        <div>
                            <div style={{fontSize: '4rem', marginBottom: '20px'}}>📝</div>
                            <h3>Solicitar Análise</h3>
                            <p style={{color: '#94A3B8', marginBottom:'20px'}}>Preencha o formulário com o vídeo do incidente.</p>
                            <button className="btn-primary" style={{background:'#EF4444', border:'none'}}>PREENCHER FORMULÁRIO</button>
                        </div>
                    )}

                    {activeTab === 'defesa' && (
                        <div>
                            <div style={{fontSize: '4rem', marginBottom: '20px'}}>🛡️</div>
                            <h3>Direito de Defesa</h3>
                            <p style={{color: '#94A3B8'}}>Foi citado? Envie seu ponto de vista aqui.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Analises;