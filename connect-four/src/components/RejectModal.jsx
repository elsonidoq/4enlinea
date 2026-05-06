import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || '';

const REASONS = [
  { value: 'not_educational', label: 'Not educational' },
  { value: 'end_game', label: 'Too close to end-game' },
  { value: 'false_positive', label: 'False Positive / Classifier Bug' },
  { value: 'other', label: 'Other' },
];

export function RejectModal({ candidateId, onConfirm, onClose }) {
  const [reason, setReason] = useState('not_educational');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/candidates/${candidateId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      const data = await res.json();
      if (res.status === 409) { setError('Already reviewed'); return; }
      if (!res.ok) { setError(data.error ?? 'Reject failed'); return; }
      onConfirm();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={title}>Reject Candidate</div>

        <div style={field}>
          <label style={lbl}>Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)} style={sel}>
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div style={field}>
          <label style={lbl}>Note (optional — especially useful for classifier bugs)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            style={ta}
            placeholder="Describe the issue..."
          />
        </div>

        {error && <div style={errStyle}>{error}</div>}

        <div style={actions}>
          <button onClick={onClose} style={cancelBtn} disabled={loading}>Cancel</button>
          <button onClick={handleConfirm} style={confirmBtn} disabled={loading}>
            {loading ? '…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 360, maxWidth: '90vw' };
const title = { fontSize: 17, fontWeight: 800, marginBottom: 16, color: 'var(--text)' };
const field = { marginBottom: 12 };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 };
const sel = { width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };
const ta = { width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };
const actions = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 };
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const confirmBtn = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const errStyle = { color: 'var(--red)', fontSize: 13, marginTop: 4 };
