import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
    fetchSeasonLifecycleConfig,
    defaultSeasonContext,
    SEASON_PHASE,
    phaseLabelPt,
} from '../utils/seasonLifecycle';

const nowIso = () => new Date().toISOString();

async function persistContext(patch, eventRow) {
    const rows = Object.entries(patch).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: nowIso(),
    }));
    const { error: upErr } = await supabase.from('app_config').upsert(rows, { onConflict: 'key' });
    if (upErr) throw upErr;
    if (eventRow) {
        const { error: evErr } = await supabase.from('season_lifecycle_events').insert([eventRow]);
        if (evErr) console.warn('Auditoria ciclo temporada:', evErr);
    }
}

export default function AdminSeasonLifecyclePanel() {
    const [ctx, setCtx] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [secondConfirmText, setSecondConfirmText] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        setErr('');
        try {
            const c = await fetchSeasonLifecycleConfig();
            setCtx(c);
        } catch (e) {
            console.warn(e);
            setCtx(defaultSeasonContext());
            setErr(e.message || 'Não foi possível ler app_config.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const openConfirm = (payload) => {
        setSecondConfirmText('');
        setConfirmModal(payload);
    };

    const runTransition = async () => {
        if (!confirmModal || !ctx) return;
        const { action } = confirmModal;
        if (secondConfirmText.trim().toUpperCase() !== 'CONFIRMAR') {
            alert('Digite CONFIRMAR (maiúsculas) no segundo passo.');
            return;
        }

        setBusy(true);
        setErr('');
        try {
            const before = { ...ctx };
            let patch = {};
            let event = {
                from_phase: before.phase,
                triggered_by: 'admin_panel',
                notes: action,
                season_before: before.currentSeason,
                season_after: before.currentSeason,
                last_closed_before: before.lastClosedSeason,
                last_closed_after: before.lastClosedSeason,
            };

            if (action === 'fechar') {
                if (before.phase !== SEASON_PHASE.OPEN) throw new Error('Só é possível fechar com a fase “Em andamento”.');
                patch.season_phase = SEASON_PHASE.CLOSED;
                patch.last_closed_season = String(before.currentSeason);
                patch.phase_updated_at = nowIso();
                event.to_phase = SEASON_PHASE.CLOSED;
                event.last_closed_after = before.currentSeason;
            } else if (action === 'pre') {
                if (before.phase !== SEASON_PHASE.CLOSED) throw new Error('Antes, feche a temporada oficialmente.');
                patch.season_phase = SEASON_PHASE.PRE_SEASON;
                patch.phase_updated_at = nowIso();
                event.to_phase = SEASON_PHASE.PRE_SEASON;
            } else if (action === 'mudar') {
                if (before.phase !== SEASON_PHASE.PRE_SEASON) throw new Error('Antes, ative a pré-temporada.');
                const nextS = before.lastClosedSeason + 1;
                patch.season_phase = SEASON_PHASE.OPEN;
                patch.current_season = String(nextS);
                patch.phase_updated_at = nowIso();
                patch.inscricao_temporada_atual = String(nextS);
                event.to_phase = SEASON_PHASE.OPEN;
                event.season_after = nextS;
            } else if (action === 'abrir') {
                if (before.phase !== SEASON_PHASE.CLOSED && before.phase !== SEASON_PHASE.PRE_SEASON) {
                    throw new Error('“Abrir temporada” só aplica com fase Encerrada ou Pré-temporada.');
                }
                const nextS = before.lastClosedSeason + 1;
                patch.season_phase = SEASON_PHASE.OPEN;
                patch.current_season = String(nextS);
                patch.phase_updated_at = nowIso();
                patch.inscricao_temporada_atual = String(nextS);
                event.to_phase = SEASON_PHASE.OPEN;
                event.season_after = nextS;
                event.notes = 'abrir_temporada_atalho';
            }

            event.to_phase = patch.season_phase || event.to_phase;
            event.season_after =
                patch.current_season != null ? parseInt(patch.current_season, 10) : event.season_after;
            event.last_closed_after =
                patch.last_closed_season != null
                    ? parseInt(patch.last_closed_season, 10)
                    : before.lastClosedSeason;

            await persistContext(patch, { ...event });

            setConfirmModal(null);
            await reload();
            alert('Transição registrada com sucesso.');
        } catch (e) {
            setErr(e.message || String(e));
            alert('Erro: ' + (e.message || e));
        } finally {
            setBusy(false);
        }
    };

    if (loading || !ctx) {
        return (
            <div style={{ padding: 24, color: '#94A3B8' }}>
                Carregando ciclo de temporada…
            </div>
        );
    }

    const summaryStyle = {
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        color: '#e2e8f0',
    };

    const btn = (disabled) => ({
        padding: '12px 18px',
        borderRadius: 8,
        border: 'none',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
    });

    return (
        <div style={{ maxWidth: 960, margin: '0 auto 40px' }}>
            <h2 style={{ color: '#f8fafc', marginBottom: 8 }}>Ciclo de temporada</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                Controle as fases sem sobrescrever histórico. Power Ranking editável só em <strong>Em andamento</strong>{' '}
                na <strong>temporada atual</strong>. O Hall da Fama prioriza o último título oficial após o fechamento.
            </p>

            {err && (
                <div style={{ background: 'rgba(220,38,38,0.15)', color: '#fecaca', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {err}
                </div>
            )}

            <div style={summaryStyle}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Fase atual</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{phaseLabelPt(ctx.phase)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>({ctx.phase})</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Temporada atual (site)</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>T{ctx.currentSeason}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Última encerrada (oficial)</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>T{ctx.lastClosedSeason}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Atualizado em</div>
                        <div style={{ fontSize: 14 }}>{ctx.phaseUpdatedAt || '—'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.OPEN || busy), background: '#b91c1c', color: '#fff' }}
                    disabled={ctx.phase !== SEASON_PHASE.OPEN || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'fechar',
                            title: 'Fechar temporada',
                            body: `Encerrar oficialmente a T${ctx.currentSeason}? O Power Ranking desta temporada deixa de ser editável; última encerrada passa a ser T${ctx.currentSeason}.`,
                        })
                    }
                >
                    Fechar temporada
                </button>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.CLOSED || busy), background: '#ca8a04', color: '#0f172a' }}
                    disabled={ctx.phase !== SEASON_PHASE.CLOSED || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'pre',
                            title: 'Pré-temporada',
                            body: 'Ativar pré-temporada: motorhome sem equipe da planilha antiga; propostas voltam para a próxima temporada.',
                        })
                    }
                >
                    Pré-temporada
                </button>
                <button
                    type="button"
                    style={{ ...btn(ctx.phase !== SEASON_PHASE.PRE_SEASON || busy), background: '#0369a1', color: '#fff' }}
                    disabled={ctx.phase !== SEASON_PHASE.PRE_SEASON || busy}
                    onClick={() =>
                        openConfirm({
                            action: 'mudar',
                            title: 'Mudar temporada',
                            body: `Ativar a nova temporada T${ctx.lastClosedSeason + 1} (em andamento). Inscrições do site serão alinhadas a esta temporada.`,
                        })
                    }
                >
                    Mudar temporada
                </button>
                <button
                    type="button"
                    style={{
                        ...btn(
                            (ctx.phase !== SEASON_PHASE.CLOSED && ctx.phase !== SEASON_PHASE.PRE_SEASON) || busy,
                        ),
                        background: '#15803d',
                        color: '#fff',
                    }}
                    disabled={
                        (ctx.phase !== SEASON_PHASE.CLOSED && ctx.phase !== SEASON_PHASE.PRE_SEASON) || busy
                    }
                    onClick={() =>
                        openConfirm({
                            action: 'abrir',
                            title: 'Abrir temporada (atalho)',
                            body: `Pula ou confirma abertura direta da próxima temporada T${ctx.lastClosedSeason + 1}. Use se não quiser passar pela pré-temporada. Alinha inscrições (app_config).`,
                        })
                    }
                >
                    Abrir temporada
                </button>
                <button type="button" style={{ ...btn(false), background: '#334155', color: '#e2e8f0' }} onClick={reload} disabled={busy}>
                    Recarregar
                </button>
            </div>

            {confirmModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#111827',
                            border: '1px solid #374151',
                            borderRadius: 12,
                            maxWidth: 480,
                            width: '100%',
                            padding: 24,
                            color: '#f3f4f6',
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>{confirmModal.title}</h3>
                        <p style={{ color: '#9ca3af', lineHeight: 1.5 }}>{confirmModal.body}</p>
                        <p style={{ fontSize: 13, color: '#fbbf24' }}>
                            Confirmação final: digite <strong>CONFIRMAR</strong> abaixo.
                        </p>
                        <input
                            value={secondConfirmText}
                            onChange={(e) => setSecondConfirmText(e.target.value)}
                            placeholder="CONFIRMAR"
                            style={{
                                width: '100%',
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid #4b5563',
                                background: '#030712',
                                color: '#fff',
                                marginBottom: 16,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={runTransition}
                                disabled={busy}
                                style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
                            >
                                {busy ? '…' : 'Executar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
