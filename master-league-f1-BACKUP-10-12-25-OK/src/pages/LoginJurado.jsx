import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LoginJurado() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    useEffect(() => {
        // Verifica se já tem sessão ativa e se é jurado
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Tem sessão Google, verificar se é jurado
                const email = session.user.email?.toLowerCase().trim();
                console.log('📧 Email logado:', email);
                
                // Buscar TODOS os jurados para debug
                const { data: todosJurados } = await supabase
                    .from('jurados')
                    .select('*');
                console.log('📋 Todos os jurados cadastrados:', todosJurados);
                
                const { data: jurado, error: juradoError } = await supabase
                    .from('jurados')
                    .select('*')
                    .eq('email_google', email)
                    .eq('ativo', true)
                    .single();

                console.log('👨‍⚖️ Jurado encontrado:', jurado, 'Erro:', juradoError);

                if (jurado) {
                    // É jurado ativo, redirecionar para verificação de WhatsApp
                    console.log('✅ Redirecionando para /veredito');
                    navigate('/veredito');
                    return;
                } else {
                    // Não é jurado, mostrar mensagem
                    setError(`❌ O e-mail "${email}" não está autorizado como jurado. Cadastre este email na aba JÚRI do painel Admin.`);
                }
            }
            
            setChecking(false);
        };
        
        checkSession();

        // Listener para mudanças na autenticação (captura o retorno do OAuth)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth event:', event);
            if (event === 'SIGNED_IN' && session) {
                const email = session.user.email?.toLowerCase().trim();
                console.log('📧 OAuth retornou com email:', email);
                
                // Buscar TODOS os jurados para debug
                const { data: todosJurados } = await supabase
                    .from('jurados')
                    .select('*');
                console.log('📋 Todos os jurados cadastrados:', todosJurados);
                
                const { data: jurado } = await supabase
                    .from('jurados')
                    .select('*')
                    .eq('email_google', email)
                    .eq('ativo', true)
                    .single();

                if (jurado) {
                    console.log('✅ Jurado válido, redirecionando...');
                    navigate('/veredito');
                } else {
                    setError(`❌ O e-mail "${email}" não está autorizado como jurado. Cadastre este email na aba JÚRI do painel Admin.`);
                    setChecking(false);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        
        // Detectar ambiente: localhost = dev, outro = produção
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const redirectUrl = isLocalhost 
            ? 'http://localhost:5173/login-jurado'
            : `${window.location.origin}/login-jurado`;
        
        console.log('🔄 Redirect URL:', redirectUrl);
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: redirectUrl
            }
        });
        
        if (error) {
            setError('Erro: ' + error.message);
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
                <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: '50px', marginBottom: '20px' }}>⏳</div>
                    <p>Verificando sessão...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
        }}>
            <div style={{ 
                background: '#1E293B', 
                borderRadius: '16px', 
                padding: '40px', 
                maxWidth: '420px', 
                width: '100%', 
                border: '1px solid #8B5CF6', 
                textAlign: 'center' 
            }}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>👨‍⚖️</div>
                <h2 style={{ color: '#F8FAFC', marginBottom: '10px' }}>Tribunal do Júri</h2>
                <p style={{ color: '#94A3B8', marginBottom: '30px' }}>Área restrita à Comissão de Análise</p>

                {/* Mensagem de erro */}
                {error && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid #EF4444', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        marginBottom: '20px',
                        color: '#EF4444',
                        fontSize: '14px',
                        textAlign: 'left'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    borderRadius: '10px', 
                    padding: '20px', 
                    marginBottom: '25px',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                    <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                        Para acessar o Tribunal do Júri, você precisa fazer login com a conta Google vinculada ao seu cadastro de jurado.
                    </p>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{ 
                        width: '100%', 
                        padding: '15px', 
                        background: loading ? '#475569' : 'white',
                        color: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    {loading ? (
                        '⏳ Redirecionando...'
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Entrar com Google
                        </>
                    )}
                </button>

                <button 
                    onClick={() => navigate('/')}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: 'transparent',
                        color: '#94A3B8', 
                        border: '1px solid #475569', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        cursor: 'pointer',
                        marginTop: '15px'
                    }}
                >
                    ← Voltar ao Site
                </button>

                {/* Link para login de teste */}
                <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => navigate('/login-jurado-teste')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#F59E0B',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        🧪 Acesso de Teste (Jurados)
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginJurado;
