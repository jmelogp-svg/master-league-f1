import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../index.css';

function Admin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [activeTab, setActiveTab] = useState('drivers');
    
    // Autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [realPassword, setRealPassword] = useState('1234'); 
    
    // NOVO: Estado do Checkbox
    const [keepConnected, setKeepConnected] = useState(false);

    const [showChangePass, setShowChangePass] = useState(false);
    const [newPass, setNewPass] = useState('');

    // 1. INICIALIZAÇÃO E VERIFICAÇÃO DE LOGIN SALVO
    useEffect(() => {
        const init = async () => {
            // Busca senha real
            const { data } = await supabase.from('app_config').select('value').eq('key', 'admin_password').single();
            if (data) setRealPassword(data.value);

            // Verifica sessão Google (Opcional, mas mantido)
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                navigate('/login');
                return;
            }

            // --- AQUI ESTÁ A MÁGICA DA PERSISTÊNCIA ---
            const savedAuth = localStorage.getItem('ml_admin_auth');
            if (savedAuth === 'true') {
                setIsAuthenticated(true);
            }
            
            setLoading(false);
        };
        init();
    }, [navigate]);

    // 2. CARREGA DADOS QUANDO AUTENTICADO
    useEffect(() => {
        if (isAuthenticated) {
            fetchAllUsers();
        }
    }, [isAuthenticated]);

    const fetchAllUsers = async () => {
        // setLoading(true); // Comentado para não piscar a tela no refresh
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setUsersList(data || []);
        // setLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === realPassword) {
            setIsAuthenticated(true);
            // Salva no localStorage se o checkbox estiver marcado
            if (keepConnected) {
                localStorage.setItem('ml_admin_auth', 'true');
            }
        } else {
            alert('Senha incorreta.');
        }
    };

    // NOVO: Função de Logout para limpar a memória
    const handleLogoutAdmin = () => {
        localStorage.removeItem('ml_admin_auth'); // Limpa a chave
        setIsAuthenticated(false);
        setPasswordInput('');
    };

    const handleChangePassword = async () => {
        if (!newPass || newPass.length < 4) return alert("Mínimo 4 caracteres.");
        const { error } = await supabase.from('app_config').upsert({ key: 'admin_password', value: newPass });
        if (error) alert("Erro: " + error.message);
        else {
            setRealPassword(newPass);
            alert("Senha atualizada!");
            setShowChangePass(false);
            setNewPass('');
        }
    };

    const handleApprove = async (userId, nome) => {
        if (!window.confirm(`Confirmar ativação de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
        if (!error) { alert('Ativado!'); fetchAllUsers(); }
    };

    const handleReset = async (userId, nome) => {
        if (!window.confirm(`ATENÇÃO: Resetar cadastro de ${nome}?`)) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) { alert('Resetado!'); fetchAllUsers(); }
    };

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando...</div>;

    // TELA DE BLOQUEIO
    if (!isAuthenticated) {
        return (
            <div className="page-wrapper">
                <div style={{maxWidth:'400px', margin:'100px auto', background:'#1E293B', padding:'40px', borderRadius:'16px', textAlign:'center', border:'1px solid #FFD700'}}>
                    <h1 style={{color:'#FFD700', marginBottom:'20px'}}>ÁREA RESTRITA</h1>
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Senha de Administrador" 
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)}
                            style={{width:'100%', padding:'12px', marginBottom:'20px', borderRadius:'8px', border:'none', background:'#0F172A', color:'white'}}
                        />
                        
                        {/* CHECKBOX MANTER CONECTADO */}
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', justifyContent:'flex-start'}}>
                            <input 
                                type="checkbox" 
                                id="keepLogged" 
                                checked={keepConnected} 
                                onChange={e => setKeepConnected(e.target.checked)}
                                style={{width:'auto', cursor:'pointer'}}
                            />
                            <label htmlFor="keepLogged" style={{color:'#CBD5E1', fontSize:'0.9rem', cursor:'pointer', userSelect:'none'}}>Manter conectado</label>
                        </div>

                        <button className="btn-primary" style={{width:'100%', background:'#FFD700', color:'#020617'}}>ENTRAR</button>
                    </form>
                </div>
            </div>
        );
    }

    // PAINEL LOGADO
    return (
        <div className="page-wrapper">
            <div style={{maxWidth:'1200px', margin:'40px auto', padding:'0 20px'}}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'20px'}}>
                    <div>
                        <h1 style={{fontSize:'2rem', fontWeight:'900', color:'#FFD700', fontStyle:'italic', margin:0}}>PAINEL <span style={{color:'white'}}>ADM</span></h1>
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => setShowChangePass(!showChangePass)} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>SENHA</button>
                        {/* Botão de Logout do ADMIN */}
                        <button onClick={handleLogoutAdmin} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px', borderColor:'#EF4444', color:'#EF4444'}}>LOGOUT</button>
                        <button onClick={() => navigate('/')} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>VOLTAR SITE</button>
                    </div>
                </div>

                {showChangePass && (
                    <div style={{background:'rgba(255, 215, 0, 0.1)', padding:'20px', borderRadius:'12px', marginBottom:'30px', border:'1px solid #FFD700', display:'flex', alignItems:'center', gap:'15px'}}>
                        <input type="text" placeholder="Nova senha..." value={newPass} onChange={e => setNewPass(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.2)', background:'#020617', color:'white'}} />
                        <button onClick={handleChangePassword} className="btn-primary" style={{background:'#FFD700', color:'#020617'}}>SALVAR</button>
                    </div>
                )}

                <div className="adm-tabs">
                    <button className={`adm-tab-btn ${activeTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveTab('drivers')}>DRIVERS</button>
                    <button className={`adm-tab-btn ${activeTab === 'stewards' ? 'active' : ''}`} onClick={() => setActiveTab('stewards')}>STEWARDS</button>
                </div>

                {activeTab === 'drivers' && (
                    <div className="adm-content">
                        <div className="adm-list-header">
                            <div style={{flex:2}}>PILOTO / NOME</div>
                            <div style={{flex:1}}>GAMERTAG</div>
                            <div style={{flex:1}}>GRID</div>
                            <div style={{width:'100px', textAlign:'center'}}>STATUS</div>
                            <div style={{width:'180px', textAlign:'right'}}>AÇÕES</div>
                        </div>

                        {usersList.length === 0 ? (
                            <div style={{padding:'40px', textAlign:'center', color:'#94A3B8'}}>Nenhum usuário.</div>
                        ) : (
                            <div className="adm-list-body">
                                {usersList.map(user => {
                                    const isPending = user.status === 'pending' || !user.status;
                                    return (
                                        <div key={user.id} className="adm-row">
                                            <div style={{flex:2}}>
                                                <div style={{fontWeight:'800', color:'white', fontSize:'1rem'}}>{user.nome_piloto || 'Sem Nome'}</div>
                                                <div style={{fontSize:'0.75rem', color:'#94A3B8'}}>{user.nome_completo || user.email}</div>
                                            </div>
                                            <div style={{flex:1, fontSize:'0.9rem', color:'#CBD5E1'}}>{user.gamertag || '-'}</div>
                                            <div style={{flex:1, fontSize:'0.8rem', textTransform:'uppercase', fontWeight:'700', color:'var(--highlight-cyan)'}}>{user.grid_preferencia || '-'}</div>
                                            
                                            <div style={{width:'100px', textAlign:'center'}}>
                                                <span className={`status-badge ${isPending ? 'pending' : 'active'}`}>
                                                    {isPending ? 'PENDENTE' : 'ATIVO'}
                                                </span>
                                            </div>

                                            <div className="adm-row-actions">
                                                {isPending && (
                                                    <button onClick={() => handleApprove(user.id, user.nome_piloto)} className="btn-icon-approve" title="Aprovar">✅</button>
                                                )}
                                                <button onClick={() => handleReset(user.id, user.nome_piloto)} className="btn-icon-reset" title="Resetar">🔄</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stewards' && (
                    <div style={{padding:'60px', textAlign:'center', background:'#1E293B', borderRadius:'12px', border:'1px dashed #64748B', color:'#94A3B8'}}>
                        <h3>Painel de Stewards</h3>
                        <p>Em breve.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Admin;