import { useState, useEffect, Fragment } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || '';

const CATEGORY_NAMES = {
  1: 'Immediate Threat',
  2: 'Forced Block',
  3: 'Double Threat',
  4: 'Fork Setup',
  5: 'Zugzwang',
  6: 'Parity Control',
  7: 'Forbidden Columns',
};

export function CandidateDashboard({ onSelectCategory }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Per-category generate form state
  const [generatingCat, setGeneratingCat] = useState(null);
  const [genForms, setGenForms] = useState({});
  const [genResults, setGenResults] = useState({});
  const [genLoading, setGenLoading] = useState({});

  async function loadStats() {
    try {
      const res = await fetch(`${API}/api/admin/candidates/stats`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setStats(data.categories ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStats(); }, []);

  function openGenerateForm(cat) {
    setGeneratingCat(generatingCat === cat ? null : cat);
    if (!genForms[cat]) {
      setGenForms(prev => ({ ...prev, [cat]: { count: 30, seed: '' } }));
    }
    setGenResults(prev => ({ ...prev, [cat]: null }));
  }

  async function handleGenerate(cat) {
    const form = genForms[cat] ?? { count: 30, seed: '' };
    setGenLoading(prev => ({ ...prev, [cat]: true }));
    setGenResults(prev => ({ ...prev, [cat]: null }));

    const body = { category: cat, count: Number(form.count) };
    if (form.seed !== '') body.seed = Number(form.seed);

    try {
      const res = await fetch(`${API}/api/admin/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setGenResults(prev => ({ ...prev, [cat]: { ok: true, inserted: data.inserted, seed: data.seed } }));
      await loadStats();
    } catch (e) {
      setGenResults(prev => ({ ...prev, [cat]: { ok: false, error: e.message } }));
    } finally {
      setGenLoading(prev => ({ ...prev, [cat]: false }));
      setGeneratingCat(null);
    }
  }

  async function handleRejectAll(cat) {
    if (!confirm(`Reject all pending candidates for category ${cat}?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/candidates/reject-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, reason: 'other' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      await loadStats();
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div style={centred}>Loading…</div>;
  if (error) return <div style={centred}>Error: {error}</div>;

  return (
    <div style={page}>
      <div style={header}>
        <div style={title}>Puzzle Factory</div>
        <div style={subtitle}>Candidate Dashboard</div>
      </div>

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Category</th>
              <th style={th}>Pending</th>
              <th style={th}>Approved</th>
              <th style={th}>Rejected</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(row => {
              const isGenerating = genLoading[row.category];
              const result = genResults[row.category];
              const form = genForms[row.category] ?? { count: 30, seed: '' };
              const showForm = generatingCat === row.category;

              return (
                <Fragment key={row.category}>
                  <tr style={tr}>
                    <td style={td}>
                      <span style={catNum}>{row.category}</span>
                      <span style={{ color: 'var(--text)', fontSize: 13 }}>{CATEGORY_NAMES[row.category]}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: row.pending > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                      {row.pending}
                    </td>
                    <td style={{ ...td, color: 'var(--green)' }}>{row.approved}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{row.rejected}</td>
                    <td style={td}>
                      <div style={actionCell}>
                        <button
                          style={genBtn}
                          onClick={() => openGenerateForm(row.category)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? '…' : 'Generate'}
                        </button>
                        {row.pending > 0 ? (
                          <>
                            <button style={reviewBtn} onClick={() => onSelectCategory(row.category)}>
                              Review ({row.pending})
                            </button>
                            <button style={rejectAllBtn} onClick={() => handleRejectAll(row.category)}>
                              Reject All
                            </button>
                          </>
                        ) : (
                          <button style={reviewBtnDisabled} disabled>Review</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {(showForm || result) && (
                    <tr>
                      <td colSpan={5} style={{ padding: '6px 12px 10px', background: 'var(--surface)' }}>
                        {showForm && (
                          <div style={genForm}>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={form.count}
                              onChange={e => setGenForms(prev => ({ ...prev, [row.category]: { ...form, count: e.target.value } }))}
                              style={numInput}
                              placeholder="Count (1–100)"
                            />
                            <input
                              type="number"
                              value={form.seed}
                              onChange={e => setGenForms(prev => ({ ...prev, [row.category]: { ...form, seed: e.target.value } }))}
                              style={numInput}
                              placeholder="Seed (optional)"
                            />
                            <button
                              style={confirmGenBtn}
                              onClick={() => handleGenerate(row.category)}
                              disabled={isGenerating}
                            >
                              {isGenerating ? '…' : 'Start'}
                            </button>
                            <button style={cancelGenBtn} onClick={() => setGeneratingCat(null)}>Cancel</button>
                          </div>
                        )}
                        {result && (
                          <div style={{ color: result.ok ? 'var(--green)' : 'var(--red)', fontSize: 13 }}>
                            {result.ok
                              ? `Generated ${result.inserted} candidates — seed: ${result.seed}`
                              : `Error: ${result.error}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const page = { background: 'var(--bg)', minHeight: '100%' };
const header = { padding: '16px 20px 10px', borderBottom: '1px solid var(--border-dim)' };
const title = { fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.4px' };
const subtitle = { fontSize: 11, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' };
const tableWrapper = { padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { textAlign: 'left', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)' };
const tr = { borderBottom: '1px solid var(--border-dim)' };
const td = { padding: '10px 10px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 13 };
const catNum = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, marginRight: 8, color: 'var(--text-muted)' };
const actionCell = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const genBtn = { padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const reviewBtn = { padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const reviewBtnDisabled = { ...reviewBtn, opacity: 0.4, cursor: 'default' };
const rejectAllBtn = { padding: '5px 10px', borderRadius: 6, border: '1.5px solid rgba(239,68,68,.3)', background: 'transparent', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const genForm = { display: 'flex', gap: 8, alignItems: 'center' };
const numInput = { width: 120, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' };
const confirmGenBtn = { padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const cancelGenBtn = { padding: '7px 14px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const centred = { display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 };
