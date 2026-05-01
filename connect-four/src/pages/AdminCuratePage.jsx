import { useState } from 'react';
import { Board } from '../components/Board.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';
const COLS = 7;
const ROWS = 6;

const CATEGORY_OPTIONS = [
  { value: 1, label: 'Immediate Threat' },
  { value: 2, label: 'Forced Block' },
  { value: 3, label: 'Double Threat' },
  { value: 4, label: 'Fork Setup' },
  { value: 5, label: 'Zugzwang' },
  { value: 6, label: 'Parity Control' },
];

const PREDICATE_OPTIONS = [
  'immediate_threat',
  'forced_block',
  'double_threat',
  'fork_setup',
  'zugzwang',
  'parity_control',
];

function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    if (isNaN(col) || col < 0 || col >= COLS) continue;
    if (heights[col] >= ROWS) continue;
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return board;
}

function validateMoveString(moves) {
  if (!/^[1-7]{0,42}$/.test(moves)) {
    return 'Only digits 1–7 allowed, max 42 characters.';
  }
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    if (heights[col] >= ROWS) return `Column ${col + 1} is full at position ${i + 1}.`;
    heights[col]++;
  }
  return null;
}

export default function AdminCuratePage() {
  const [moveString, setMoveString] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [scores, setScores] = useState(null);
  const [solverLoading, setSolverLoading] = useState(false);
  const [category, setCategory] = useState(1);
  const [goalPrompt, setGoalPrompt] = useState('');
  const [predicateType, setPredicateType] = useState('immediate_threat');
  const [difficulty, setDifficulty] = useState(1);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  function handleMoveStringChange(val) {
    setMoveString(val);
    setScores(null);
    setSaveStatus(null);
    const err = validateMoveString(val);
    setValidationError(err);
  }

  async function runSolver() {
    const err = validateMoveString(moveString);
    if (err) { setValidationError(err); return; }
    setSolverLoading(true);
    setScores(null);
    try {
      const res = await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: moveString }),
      });
      const data = await res.json();
      setScores(data.scores ?? null);
    } catch (e) {
      setSaveStatus({ ok: false, message: `Solver error: ${e.message}` });
    } finally {
      setSolverLoading(false);
    }
  }

  async function savePuzzle() {
    const err = validateMoveString(moveString);
    if (err) { setValidationError(err); return; }
    if (!goalPrompt.trim()) { setSaveStatus({ ok: false, message: 'Goal prompt is required.' }); return; }

    setSaveLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API}/api/admin/puzzles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          move_string: moveString,
          goal_prompt: goalPrompt.trim(),
          predicate_type: predicateType,
          difficulty,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus({ ok: true, message: `Saved! ID: ${data.id}` });
      } else {
        setSaveStatus({ ok: false, message: data.error ?? 'Save failed.' });
      }
    } catch (e) {
      setSaveStatus({ ok: false, message: `Network error: ${e.message}` });
    } finally {
      setSaveLoading(false);
    }
  }

  const board = buildBoard(moveString);

  return (
    <div style={page}>
      <div style={header}>
        <div style={title}>Puzzle Curation Tool</div>
        <div style={subtitle}>Internal — accessible at /admin/curate</div>
      </div>

      <div style={section}>
        <label style={label}>Move string</label>
        <input
          type="text"
          value={moveString}
          onChange={e => handleMoveStringChange(e.target.value)}
          placeholder="e.g. 121212 (columns 1–7, up to 42 moves)"
          style={{ ...input, borderColor: validationError ? 'var(--red)' : 'var(--border)' }}
        />
        {validationError && <div style={errText}>{validationError}</div>}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <Board board={board} canPlay={false} />
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <button onClick={runSolver} disabled={!!validationError || solverLoading} style={btn}>
          {solverLoading ? '…' : 'Run solver'}
        </button>
      </div>

      {scores && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={label}>Column scores</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {scores.map((s, i) => (
              <div key={i} style={{
                ...scoreCell,
                background: s > 0 ? 'rgba(34,197,94,.15)' : s < 0 ? 'rgba(239,68,68,.15)' : 'var(--surface)',
                color: s > 0 ? 'var(--green)' : s < 0 ? 'var(--red)' : 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>C{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={section}>
        <label style={label}>Category</label>
        <select value={category} onChange={e => setCategory(Number(e.target.value))} style={input}>
          {CATEGORY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.value}. {o.label}</option>
          ))}
        </select>
      </div>

      <div style={section}>
        <label style={label}>Goal prompt</label>
        <input
          type="text"
          value={goalPrompt}
          onChange={e => setGoalPrompt(e.target.value)}
          placeholder="e.g. Win the game in one move."
          style={input}
        />
      </div>

      <div style={section}>
        <label style={label}>Predicate type</label>
        <select value={predicateType} onChange={e => setPredicateType(e.target.value)} style={input}>
          {PREDICATE_OPTIONS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={section}>
        <label style={label}>Difficulty (1–3)</label>
        <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} style={input}>
          <option value={1}>1 — Easy</option>
          <option value={2}>2 — Medium</option>
          <option value={3}>3 — Hard</option>
        </select>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button onClick={savePuzzle} disabled={!!validationError || saveLoading || !goalPrompt.trim()} style={btnPrimary}>
          {saveLoading ? '…' : 'Save puzzle'}
        </button>
        {saveStatus && (
          <div style={{ ...saveMsg, color: saveStatus.ok ? 'var(--green)' : 'var(--red)' }}>
            {saveStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}

const page = { display: 'flex', flexDirection: 'column', background: 'var(--bg)', minHeight: '100%' };
const header = { padding: '16px 20px 8px', borderBottom: '1px solid var(--border-dim)' };
const title = { fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.4px' };
const subtitle = { fontSize: 11, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' };
const section = { padding: '0 16px 12px' };
const label = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 };
const input = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const errText = { fontSize: 12, color: 'var(--red)', marginTop: 4 };
const btn = { width: '100%', padding: '11px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const btnPrimary = { ...btn, background: 'var(--red)', color: '#fff', border: 'none' };
const saveMsg = { marginTop: 10, fontSize: 13, fontWeight: 600 };
const scoreCell = { flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center', minWidth: 0 };
