import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function Regulamento() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    return (
        <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '90px 20px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '800px', margin: '0 auto'}}>
                
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
                            O regulamento completo estará disponível em breve. Aguarde!
                        </p>
                    </div>
                </div>

                <div style={{textAlign: 'center', marginBottom: '30px', opacity: 0.5}}>
                    <h1 style={{fontSize: '2.5rem', fontStyle: 'italic', fontWeight: '900', textTransform: 'uppercase'}}>REGULAMENTO <span style={{color: 'var(--highlight-cyan)'}}>OFICIAL</span></h1>
                    <p style={{color: '#94A3B8'}}>Temporada 19</p>
                </div>

                <div style={{background: '#1E293B', padding: '40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', lineHeight: '1.8', color: '#E2E8F0', opacity: 0.3}}>
                    <h3 style={{color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px'}}>1. CONDUTA EM PISTA</h3>
                    <p style={{marginBottom: '10px'}}>1.1. O respeito entre os pilotos é fundamental. Manobras desleais serão punidas severamente.</p>
                    <p style={{marginBottom: '10px'}}>1.2. Em caso de saída de pista, o retorno deve ser feito de forma segura, sem atrapalhar quem vem no traçado.</p>
                    <p style={{marginBottom: '20px'}}>1.3. É permitido apenas um movimento de defesa de posição.</p>

                    <h3 style={{color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px', marginTop: '40px'}}>2. PONTUAÇÃO</h3>
                    <p style={{marginBottom: '10px'}}>2.1. A pontuação segue o padrão FIA: 25-18-15-12-10-8-6-4-2-1.</p>
                    <p style={{marginBottom: '20px'}}>2.2. Ponto extra para volta mais rápida (se terminar no Top 10).</p>

                    <h3 style={{color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px', marginTop: '40px'}}>3. PENALIDADES</h3>
                    <p style={{marginBottom: '20px'}}>3.1. As punições variam de advertência, acréscimo de tempo e perda de pontos na carteira, conforme a gravidade analisada pelos comissários.</p>
                </div>
            </div>
        </div>
    );
}

export default Regulamento;