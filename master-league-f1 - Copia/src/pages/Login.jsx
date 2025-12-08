import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

const ArrowBackIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
const HubIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>);

function Login() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Verifica se já tem sessão ativa
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard');
            }
        };
        checkSession();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/dashboard' }
        });
        if (error) {
            alert('Erro: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="login-section" style={{marginTop: '30px'}}>
                <div className="login-card">
                    <h1>ÁREA DO PILOTO</h1>
                    <p className="login-subtitle">Faça login com sua conta Google para acessar o Cockpit.</p>
                    
                    <button onClick={handleGoogleLogin} className="btn-primary" disabled={loading} style={{width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '10px', background: 'white', color: '#333', border: 'none'}}>
                        <img src="https://www.google.com/favicon.ico" alt="G" style={{width: '20px'}} />
                        {loading ? 'REDIRECIONANDO...' : 'ENTRAR COM GOOGLE'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;