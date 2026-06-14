import React, { useState, useCallback } from 'react';
import BoardEditor from './BoardEditor.jsx';

const COL_LABELS = ['0', '1', '2', '3', '4', '5', '6'];

/**
 * Props:
 *   enabled: boolean
 *   socratic: { movestring, overlays, correctCol } | null
 *   onChange: (socratic | null) => void
 */
export default function SocraticEditor({ enabled, socratic, onChange }) {
  const [verifyState, setVerifyState] = useState(null); // null | 'checking' | 'ok' | 'bad'

  const empty = { movestring: '', overlays: [], correctCol: null };

  function toggle() {
    onChange(enabled ? null : empty);
  }

  function updateField(key, value) {
    onChange({ ...socratic, [key]: value });
    if (key === 'correctCol') setVerifyState(null);
  }

  const verifySolver = useCallback(async (col, movestring) => {
    if (movestring === '') { setVerifyState('bad'); return; }
    setVerifyState('checking');
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: movestring }),
      });
      const data = await res.json();
      const score = data.scores?.[col];
      setVerifyState(typeof score === 'number' && score > 0 ? 'ok' : 'bad');
    } catch {
      setVerifyState('bad');
    }
  }, []);

  function selectCorrectCol(col) {
    updateField('correctCol', col);
    verifySolver(col, socratic?.movestring ?? '');
  }

  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 };
  const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} id="socratic-toggle" />
        <label htmlFor="socratic-toggle" style={{ fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Socratic board</label>
      </div>

      {enabled && socratic && (
        <>
          <div>
            <div style={label}>Board instructions</div>
            <textarea
              readOnly
              value={socratic._boardInstructions ?? ''}
              rows={3}
              style={{
                width: '100%', marginTop: 6, padding: '8px 10px',
                borderRadius: 6, border: '1px solid #444',
                background: '#111', resize: 'vertical', boxSizing: 'border-box',
                color: socratic._boardInstructions ? '#fff' : '#666',
                fontStyle: socratic._boardInstructions ? 'normal' : 'italic',
                fontSize: 13,
              }}
              placeholder="(no board instructions)"
            />
          </div>

          <BoardEditor
            label="Socratic position"
            movestring={socratic.movestring ?? ''}
            overlays={socratic.overlays ?? []}
            onMovestringChange={ms => { updateField('movestring', ms); setVerifyState(null); }}
            onOverlaysChange={ov => updateField('overlays', ov)}
          />

          <div>
            <div style={label}>Correct column</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              {COL_LABELS.map((cl, col) => (
                <button
                  key={col}
                  onClick={() => selectCorrectCol(col)}
                  style={{
                    width: 36, height: 36, borderRadius: 6, cursor: 'pointer',
                    fontWeight: socratic.correctCol === col ? 700 : 400,
                    background: socratic.correctCol === col ? '#2563eb' : '#222',
                    color: '#fff',
                    border: socratic.correctCol === col ? '2px solid #60a5fa' : '1px solid #444',
                  }}
                >
                  {cl}
                </button>
              ))}
              {verifyState === 'checking' && <span style={{ color: '#aaa', fontSize: 12 }}>Checking…</span>}
              {verifyState === 'ok' && <span style={{ color: '#4ade80', fontSize: 12 }}>✓ Solver confirms winning move</span>}
              {verifyState === 'bad' && <span style={{ color: '#f87171', fontSize: 12 }}>⚠ Not a winning move (or empty board)</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
