import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function AdminInscricoesPanel() {
    const [loading, setLoading] = useState(false);
    const [inscricoes, setInscricoes] = useState([]);
    const [erro, setErro] = useState('');
    const [temporadaAtual, setTemporadaAtual] = useState(20);
    const [salvandoTemporada, setSalvandoTemporada] = useState(false);

    const fetchInscricoes = async () => {
        setLoading(true);
        setErro('');
        try {
            const { data, error } = await supabase
                .from('season_registrations')
                .select('*')
                .order('data_inscricao', { ascending: false });
            if (error) throw error;
            setInscricoes(data || []);
        } catch (err) {
            setErro(err.message || 'Erro ao carregar inscrições.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemporadaAtual = async () => {
        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('value')
                .eq('key', 'inscricao_temporada_atual')
                .single();
            if (!error && data?.value) {
                const t = parseInt(String(data.value), 10);
                if (!Number.isNaN(t) && t > 0) setTemporadaAtual(t);
            }
        } catch {
            // fallback já definido em 20
        }
    };

    const salvarTemporadaAtual = async () => {
        if (!temporadaAtual || Number(temporadaAtual) < 1) {
            alert('Informe uma temporada válida.');
            return;
        }
        setSalvandoTemporada(true);
        try {
            const { error } = await supabase
                .from('app_config')
                .upsert({ key: 'inscricao_temporada_atual', value: String(temporadaAtual) });
            if (error) throw error;
            alert(`Temporada de inscrição definida como T${temporadaAtual}.`);
        } catch (err) {
            alert(`Erro ao salvar temporada: ${err.message || 'desconhecido'}`);
        } finally {
            setSalvandoTemporada(false);
        }
    };

    useEffect(() => {
        fetchInscricoes();
        fetchTemporadaAtual();
    }, []);

    const updateField = async (id, patch) => {
        try {
            const { error } = await supabase
                .from('season_registrations')
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            setInscricoes((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
        } catch (err) {
            alert(`Erro ao atualizar: ${err.message || 'desconhecido'}`);
        }
    };

    const formatWhatsAppExibicao = (digits) => {
        const d = String(digits || '').replace(/\D/g, '');
        if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
        return d || '—';
    };

    const escapeCsvCell = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };

    const exportarCsv = () => {
        if (!inscricoes.length) return;
        const headers = [
            '#',
            'ID',
            'Temporada',
            'Data inscrição',
            'Nome',
            'Gamertag',
            'WhatsApp',
            'Plataforma',
            'Grid',
            'E-mail',
            'Piloto transmissão',
            'Nº carro',
            'Status inscrição',
            'Forma pagamento',
            'Data pagamento prevista',
            'Criado em',
            'Atualizado em',
        ];
        const rows = [headers.map(escapeCsvCell).join(',')];
        inscricoes.forEach((item, idx) => {
            const line = [
                idx + 1,
                item.id,
                item.temporada,
                item.data_inscricao ? new Date(item.data_inscricao).toLocaleString('pt-BR') : '',
                item.nome,
                item.gamertag_id,
                String(item.whatsapp || '').replace(/\D/g, ''),
                item.plataforma,
                item.grid,
                item.email_login,
                item.nome_piloto_transmissao,
                item.numero_carro,
                item.status_inscricao,
                item.forma_pagamento,
                item.data_pagamento_prevista || '',
                item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
                item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '',
            ];
            rows.push(line.map(escapeCsvCell).join(','));
        });
        const bom = '\uFEFF';
        const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        const a = document.createElement('a');
        a.href = url;
        a.download = `inscricoes_mlf_${stamp}.csv`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const cellInput = {
        width: '100%',
        minWidth: '72px',
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px solid #475569',
        background: '#1E293B',
        color: '#F8FAFC',
        fontSize: '0.78rem',
        boxSizing: 'border-box',
    };

    return (
        <div className="adm-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#F8FAFC' }}>🧾 Pilotos Inscritos</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={exportarCsv}
                        disabled={loading || inscricoes.length === 0}
                        style={{
                            padding: '8px 14px',
                            border: 'none',
                            borderRadius: '8px',
                            background: loading || inscricoes.length === 0 ? '#475569' : '#0EA5E9',
                            color: 'white',
                            cursor: loading || inscricoes.length === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Exportar CSV
                    </button>
                    <button
                        type="button"
                        onClick={fetchInscricoes}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#3B82F6', color: 'white', cursor: 'pointer' }}
                    >
                        Atualizar
                    </button>
                </div>
            </div>
            <div style={{ marginBottom: '16px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', padding: '12px' }}>
                <div style={{ color: '#E2E8F0', fontWeight: 700, marginBottom: '8px' }}>Temporada atual da inscrição (controlada pelo ADM)</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        min="1"
                        value={temporadaAtual}
                        onChange={(e) => setTemporadaAtual(parseInt(e.target.value || '0', 10))}
                        style={{ width: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #475569', background: '#1E293B', color: '#F8FAFC' }}
                    />
                    <button
                        onClick={salvarTemporadaAtual}
                        disabled={salvandoTemporada}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#22C55E', color: 'white', cursor: 'pointer' }}
                    >
                        {salvandoTemporada ? 'Salvando...' : 'Salvar temporada'}
                    </button>
                </div>
            </div>

            {erro && <div style={{ color: '#F87171', marginBottom: '12px', fontWeight: 700 }}>{erro}</div>}
            {loading && <div style={{ color: '#94A3B8' }}>Carregando inscrições...</div>}

            {!loading && inscricoes.length === 0 && (
                <div style={{ color: '#94A3B8', padding: '20px 0' }}>Nenhuma inscrição registrada.</div>
            )}

            {!loading && inscricoes.length > 0 && (
                <div
                    style={{
                        overflowX: 'auto',
                        borderRadius: '10px',
                        border: '1px solid #334155',
                        background: '#020617',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            minWidth: '1100px',
                            borderCollapse: 'collapse',
                            fontSize: '0.8rem',
                        }}
                    >
                        <thead>
                            <tr style={{ background: '#0F172A', color: '#94A3B8', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>#</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Temp.</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Data inscrição</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Nome</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Gamertag</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>WhatsApp</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Plat.</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Grid</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '180px' }}>E-mail</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '140px' }}>Piloto (TV)</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Nº</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '120px' }}>Status</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap', minWidth: '130px' }}>Pagamento</th>
                                <th style={{ padding: '10px 8px', borderBottom: '2px solid #334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Data pag.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inscricoes.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    style={{
                                        background: idx % 2 === 0 ? '#0F172A' : '#1E293B',
                                        color: '#E2E8F0',
                                    }}
                                >
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>{idx + 1}</td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        T{item.temporada}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        {new Date(item.data_inscricao).toLocaleString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', maxWidth: '160px', wordBreak: 'break-word' }}>
                                        {item.nome}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', maxWidth: '120px', wordBreak: 'break-word' }}>
                                        {item.gamertag_id}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>
                                        {formatWhatsAppExibicao(item.whatsapp)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textTransform: 'uppercase' }}>
                                        {(item.plataforma || '').slice(0, 4)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textTransform: 'uppercase' }}>
                                        {(item.grid || '').slice(0, 8)}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', wordBreak: 'break-all', maxWidth: '200px' }}>
                                        {item.email_login}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', wordBreak: 'break-word', maxWidth: '160px' }}>
                                        {item.nome_piloto_transmissao}
                                    </td>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #334155', verticalAlign: 'middle', textAlign: 'center' }}>
                                        {item.numero_carro}
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <select
                                            value={item.status_inscricao || 'pendente'}
                                            onChange={(e) => updateField(item.id, { status_inscricao: e.target.value })}
                                            style={cellInput}
                                        >
                                            <option value="pendente">Pendente</option>
                                            <option value="aprovado">Aprovado</option>
                                            <option value="reserva">Reserva</option>
                                            <option value="recusado">Recusado</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <select
                                            value={item.forma_pagamento || 'pix_agora'}
                                            onChange={(e) => updateField(item.id, { forma_pagamento: e.target.value })}
                                            style={cellInput}
                                        >
                                            <option value="pix_agora">PIX agora</option>
                                            <option value="pagar_depois">Depois</option>
                                            <option value="adm">ADM</option>
                                            <option value="premiacao_equipe">Prêmio eq.</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '6px', borderBottom: '1px solid #334155', verticalAlign: 'middle' }}>
                                        <input
                                            type="date"
                                            value={item.data_pagamento_prevista || ''}
                                            onChange={(e) => updateField(item.id, { data_pagamento_prevista: e.target.value || null })}
                                            style={{ ...cellInput, minWidth: '118px' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminInscricoesPanel;
