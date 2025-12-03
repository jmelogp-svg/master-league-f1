import { Link } from 'react-router-dom';

function Regulamento() {
    return (
        <div style={{minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '40px 20px', fontFamily: "'Montserrat', sans-serif"}}>
            <div style={{maxWidth: '800px', margin: '0 auto'}}>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
                    <div className="nav-logo" style={{fontSize: '1.5rem'}}>MASTER <span>LEAGUE</span></div>
                    <Link to="/" style={{color: '#CBD5E1', textDecoration: 'none', fontWeight: '700', border:'1px solid rgba(255,255,255,0.2)', padding:'8px 16px', borderRadius:'6px'}}>VOLTAR</Link>
                </div>

                <div style={{textAlign: 'center', marginBottom: '40px'}}>
                    <h1 style={{fontSize: '2.5rem', fontStyle: 'italic', fontWeight: '900', textTransform: 'uppercase'}}>REGULAMENTO <span style={{color: 'var(--highlight-cyan)'}}>OFICIAL</span></h1>
                    <p style={{color: '#94A3B8'}}>Temporada 19</p>
                </div>

                <div style={{background: '#1E293B', padding: '40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', lineHeight: '1.8', color: '#E2E8F0'}}>
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