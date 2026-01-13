import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function AdminSync() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSteward, setIsSteward] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncLogs, setSyncLogs] = useState([]);
    const [syncStatus, setSyncStatus] = useState({});
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // Verificar se é steward
            const { data: piloto } = await supabase
                .from('pilotos')
                .select('is_steward')
                .eq('email', user.email)
                .single();

            if (piloto?.is_steward) {
                setIsSteward(true);
                setIsAuthenticated(true);
            } else {
                navigate('/dashboard');
            }
            setLoading(false);
        };

        checkAuth();
    }, [navigate]);

    useEffect(() => {
        if (isAuthenticated) {
            loadSyncLogs();
            loadSyncStatus();
        }
    }, [isAuthenticated]);

    const loadSyncLogs = async () => {
        const { data, error } = await supabase
            .from('sync_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setSyncLogs(data);
        }
    };

    const loadSyncStatus = async () => {
        const status = {};

        // Verificar status de cada cache
        const tables = [
            { name: 'classificacao_cache', label: 'Classificação', grid: 'carreira', season: 20 },
            { name: 'classificacao_cache', label: 'Classificação Light', grid: 'light', season: 20 },
            { name: 'power_ranking_cache', label: 'Power Ranking' },
            { name: 'calendario_cache', label: 'Calendário', season: 20 },
            { name: 'tracks_cache', label: 'Tracks' },
            { name: 'minicup_cache', label: 'Minicup' }
        ];

        for (const table of tables) {
            let query = supabase.from(table.name).select('last_synced_at, data');
            
            if (table.grid) {
                query = query.eq('grid', table.grid);
            }
            if (table.season) {
                query = query.eq('season', table.season);
            }

            const { data, error } = await query.single().catch(() => ({ data: null, error: null }));

            if (data) {
                const lastSync = new Date(data.last_synced_at);
                const age = (Date.now() - lastSync.getTime()) / (1000 * 60);
                const recordCount = data.data?.rows?.length || 0;

                status[table.label] = {
                    lastSync: lastSync.toLocaleString('pt-BR'),
                    ageMinutes: Math.round(age),
                    recordCount,
                    status: age < 60 ? 'ok' : age < 120 ? 'warning' : 'error'
                };
            } else {
                status[table.label] = {
                    lastSync: 'Nunca',
                    ageMinutes: null,
                    recordCount: 0,
                    status: 'error'
                };
            }
        }

        setSyncStatus(status);
    };

    const triggerSync = async (sheetType) => {
        setSyncing(true);
        try {
            const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert('Sessão expirada. Faça login novamente.');
                return;
            }

            const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                    sheetType,
                    force: true,
                    season: 20
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Sincronização de ${sheetType} iniciada com sucesso!`);
                setTimeout(() => {
                    loadSyncLogs();
                    loadSyncStatus();
                }, 2000);
            } else {
                alert(`Erro: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            alert('Erro ao iniciar sincronização');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>;
    }

    if (!isAuthenticated || !isSteward) {
        return null;
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            padding: '20px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'white', marginBottom: '30px' }}>Dashboard de Sincronização</h1>

                {/* Status das Sincronizações */}
                <div style={{ 
                    background: '#1E293B', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    marginBottom: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h2 style={{ color: 'white', marginBottom: '20px' }}>Status das Sincronizações</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        {Object.entries(syncStatus).map(([label, status]) => (
                            <div key={label} style={{
                                background: '#0F172A',
                                padding: '16px',
                                borderRadius: '8px',
                                border: `1px solid ${status.status === 'ok' ? '#22C55E' : status.status === 'warning' ? '#F59E0B' : '#EF4444'}`
                            }}>
                                <h3 style={{ color: 'white', marginBottom: '8px', fontSize: '14px' }}>{label}</h3>
                                <p style={{ color: '#94A3B8', fontSize: '12px', margin: '4px 0' }}>
                                    Última sync: {status.lastSync}
                                </p>
                                <p style={{ color: '#94A3B8', fontSize: '12px', margin: '4px 0' }}>
                                    Idade: {status.ageMinutes !== null ? `${status.ageMinutes} minutos` : 'N/A'}
                                </p>
                                <p style={{ color: '#94A3B8', fontSize: '12px', margin: '4px 0' }}>
                                    Registros: {status.recordCount}
                                </p>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: status.status === 'ok' ? '#22C55E20' : status.status === 'warning' ? '#F59E0B20' : '#EF444420',
                                    color: status.status === 'ok' ? '#22C55E' : status.status === 'warning' ? '#F59E0B' : '#EF4444',
                                    fontSize: '11px',
                                    marginTop: '8px'
                                }}>
                                    {status.status === 'ok' ? '✓ OK' : status.status === 'warning' ? '⚠ Aviso' : '✗ Erro'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Botões de Sincronização Manual */}
                <div style={{ 
                    background: '#1E293B', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    marginBottom: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h2 style={{ color: 'white', marginBottom: '20px' }}>Sincronização Manual</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {['classificacao', 'power_ranking', 'calendario', 'tracks', 'minicup', 'all'].map(type => (
                            <button
                                key={type}
                                onClick={() => triggerSync(type)}
                                disabled={syncing}
                                style={{
                                    padding: '12px 24px',
                                    background: syncing ? '#475569' : '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: syncing ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {syncing ? 'Sincronizando...' : `Sincronizar ${type === 'all' ? 'Tudo' : type}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Logs de Sincronização */}
                <div style={{ 
                    background: '#1E293B', 
                    borderRadius: '12px', 
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h2 style={{ color: 'white', marginBottom: '20px' }}>Logs de Sincronização</h2>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', color: 'white', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Data/Hora</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Planilha</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Registros</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Duração</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Erro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {syncLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px' }}>
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '12px' }}>{log.sheet_name || '-'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: log.status === 'success' ? '#22C55E20' : '#EF444420',
                                                color: log.status === 'success' ? '#22C55E' : '#EF4444',
                                                fontSize: '12px'
                                            }}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{log.records_synced || 0}</td>
                                        <td style={{ padding: '12px' }}>
                                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                        </td>
                                        <td style={{ padding: '12px', color: '#EF4444', fontSize: '12px' }}>
                                            {log.error_message || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {syncLogs.length === 0 && (
                            <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>
                                Nenhum log de sincronização encontrado
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminSync;

