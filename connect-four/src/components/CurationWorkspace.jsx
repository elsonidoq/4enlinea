import { useState, useEffect, useCallback } from 'react';
import { Board } from './Board.jsx';
import { PredicateChecklist } from './PredicateChecklist.jsx';
import { RejectModal } from './RejectModal.jsx';
import { MultiMoveSequencer } from './MultiMoveSequencer.jsx';
import { CATEGORY_NAMES } from '../lib/categories.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const ROWS = 6;
const COLS = 7;

const GOAL_PROMPTS = {
  immediate_threat:  'Find the winning move.',
  forced_block:      "Block your opponent's threat.",
  double_threat:     'Find the move that creates two simultaneous threats.',
  forced_win:        'Play a sequence of forcing moves to create two unstoppable threats.',
  fork_setup:        'Set up a fork — a sequence that leads to two unstoppable threats.',
  zugzwang:          'Force your opponent into a losing position with a sequence of moves that leave them no good options.',
  parity_control:    'Control the parity of this column to secure the win.',
  forbidden_columns: 'Identify which columns you must avoid — playing there would hand your opponent an immediate win.',
  z_threat:          'Identify the column where a Z-threat gives you unstoppable parity control.',
  claimeven:         'Use the Claimeven strategy — identify which columns Red can claim to guarantee a win.',
  undercut:          'Find the move that undercuts your opponent, taking the square below their threat.',
  overcut:           'Find the move that overcomes your opponent by playing above their intended threat.',
  figure_7:          'Spot the Figure-7 pattern and play the key move to exploit it.',
  j_shape:           'Spot the J-Shape pattern and play the key move to exploit it.',
};

function buildBoard(moves, userPlayer) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    if (isNaN(col) || col < 0 || col >= COLS || heights[col] >= ROWS) continue;
    board[heights[col]][col] = (i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow';
    heights[col]++;
  }
  return board;
}

function getHeights(moveString) {
  const h = Array(COLS).fill(0);
  for (const ch of moveString) h[parseInt(ch, 10) - 1]++;
  return h;
}

function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

// Derive the pre-highlighted column from stored solver scores (no server call)
function deriveHighlightCol(category, scores, moveString) {
  if (!scores || scores.length !== 7) return null;
  const moveCount = moveString.length;
  const winScore = immediateWinScore(moveCount);
  const heights = getHeights(moveString);
  const legalCols = scores.map((_, i) => i).filter(i => heights[i] < ROWS);

  if (category === 'immediate_threat') {
    return legalCols.find(i => scores[i] >= winScore && winScore > 0) ?? null;
  } else if (category === 'forced_block') {
    const blocking = legalCols.filter(i => scores[i] >= 0);
    return blocking.length === 1 ? blocking[0] : null;
  } else if (category === 'double_threat') {
    let best = -Infinity, bestCol = null;
    for (const i of legalCols) {
      if (scores[i] > best) { best = scores[i]; bestCol = i; }
    }
    return bestCol;
  } else if (category === 'fork_setup' || category === 'parity_control') {
    const nonWinPos = legalCols.filter(i => scores[i] > 0 && scores[i] !== winScore);
    if (nonWinPos.length === 0) return null;
    return nonWinPos.reduce((best, i) => scores[i] > scores[best] ? i : best);
  } else if (category === 'zugzwang') {
    // highlight_cells from DB is the authoritative source; this fallback just picks max score
    const maxScore = Math.max(...legalCols.map(i => scores[i]));
    return legalCols.find(i => scores[i] === maxScore) ?? null;
  } else if (category === 'forbidden_columns') {
    // hint is the SAFE column — find the first col that is NOT forbidden
    const opponentWinScore = -Math.ceil((41 - moveCount) / 2);
    const forbidden = new Set(legalCols.filter(i => scores[i] === opponentWinScore));
    const safe = legalCols.find(i => !forbidden.has(i));
    return safe ?? null;
  }
  return null;
}

export function CurationWorkspace({ category, status = 'pending', onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Per-candidate state
  const [clickedScores, setClickedScores] = useState(null);
  const [clickedTags, setClickedTags] = useState([]);
  const [clickedPass, setClickedPass] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [clickedCol, setClickedCol] = useState(null);

  // Approval panel
  const [showApprove, setShowApprove] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState(GOAL_PROMPTS[category] ?? '');
  const [difficulty, setDifficulty] = useState(2);
  const [cooperativeAiMoves, setCooperativeAiMoves] = useState([]);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState(null);

  // Reject modal
  const [showReject, setShowReject] = useState(false);

  // Debug trace panel
  const [showTrace, setShowTrace] = useState(false);

  const candidate = candidates[idx] ?? null;


  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/admin/candidates?category=${category}&status=${status}&limit=100`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load');
        setCandidates(data.candidates ?? []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, status]);

  // Reset per-candidate state when moving to next
  useEffect(() => {
    setClickedScores(null);
    setClickedTags([]);
    setClickedPass(null);
    setClickedCol(null);
    setShowApprove(false);
    setShowReject(false);
    setShowTrace(false);
    setGoalPrompt(candidate?.goal_prompt ?? GOAL_PROMPTS[category] ?? '');
    setDifficulty(candidate?.difficulty ?? 2);
    setCooperativeAiMoves([]);
    setApproveError(null);
  }, [candidate?.id, category]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') {
        if (!showReject) setShowApprove(v => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        if (!showApprove) setShowReject(v => !v);
      } else if (e.key === 'Enter') {
        if (showApprove) handleApprove();
        if (showReject) { /* RejectModal handles its own confirm */ }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showApprove, showReject]);

  async function handleColumnClick(col) {
    if (!candidate) return;
    setClickedCol(col);
    setScoresLoading(true);
    try {
      const movesWithClick = candidate.move_string + (col + 1).toString();
      const correctColParam = candidate.correct_col != null ? `&correct_col=${candidate.correct_col}` : '';
      const res = await fetch(`${API}/api/admin/scores?moves=${encodeURIComponent(movesWithClick)}&category=${category}${correctColParam}`);
      const data = await res.json();
      if (res.ok) {
        setClickedScores(data.scores);
        setClickedTags(data.classifier_tags ?? []);
        setClickedPass(data.predicate_pass);
      }
    } catch {}
    setScoresLoading(false);
  }

  async function handleApprove() {
    if (!candidate) return;
    setApproveLoading(true);
    setApproveError(null);
    try {
      const res = await fetch(`${API}/api/admin/candidates/${candidate.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_prompt: goalPrompt, difficulty, cooperative_ai_moves: cooperativeAiMoves }),
      });
      const data = await res.json();
      if (res.status === 409) { setApproveError(data.error ?? 'Already reviewed'); return; }
      if (!res.ok) { setApproveError(data.error ?? 'Approve failed'); return; }
      advanceToNext();
    } catch (e) {
      setApproveError(e.message);
    } finally {
      setApproveLoading(false);
    }
  }

  function removeCandidate(id) {
    setCandidates(prev => prev.filter(c => c.id !== id));
  }

  function advanceToNext() {
    const id = candidate?.id;
    if (id) removeCandidate(id);
  }

  async function handleDelete() {
    if (!candidate) return;
    if (!confirm('Permanently delete this candidate?')) return;
    const id = candidate.id;
    try {
      const res = await fetch(`${API}/api/admin/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Delete failed'); return; }
      removeCandidate(id);
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div style={emptyState}>Loading candidates…</div>;
  if (error) return <div style={emptyState}>Error: {error}</div>;
  if (!candidate) {
    return (
      <div style={emptyState}>
        <div style={{ marginBottom: 12 }}>No more candidates in this batch.</div>
        <button style={backBtn} onClick={onBack}>← Generate more</button>
      </div>
    );
  }

  const userPlayer = candidate.move_string.length % 2 === 0 ? 1 : 2;
  const board = buildBoard(candidate.move_string, userPlayer);
  const highlightCol = deriveHighlightCol(category, candidate.solver_scores, candidate.move_string);
  const displayScores = clickedScores ?? candidate.solver_scores;
  const moveCount = candidate.move_string.length;
  const winScore = immediateWinScore(moveCount);

  // Build highlighted cells — stored cells first, fall back to deriveHighlightCol
  const heights = getHeights(candidate.move_string);
  const highlightedCells = [];
  if (candidate.highlight_cells && candidate.highlight_cells.length > 0) {
    let stepIdx = 0;
    for (const { col, row, role } of candidate.highlight_cells) {
      const isSequenceStep = role === 'hint' || role === 'loser' || role === 'winner';
      const step = isSequenceStep ? ++stepIdx : null;
      // Alternate red/yellow by step parity: odd = red (loser), even = yellow (winner)
      const effectiveRole = isSequenceStep && step !== null
        ? (step % 2 === 1 ? 'loser' : 'winner')
        : role;
      highlightedCells.push([row, col, effectiveRole, step]);
    }
  } else if (category === 'z_threat' && candidate.highlight_metadata?.type === 'capsule') {
    // T028: highlight cells in z_threat column from fromRow to toRow
    const { column, fromRow, toRow } = candidate.highlight_metadata;
    for (let r = fromRow; r <= toRow; r++) {
      highlightedCells.push([r, column, 'z_range']);
    }
  } else if (['undercut', 'overcut'].includes(category) && candidate.highlight_metadata?.type === 'cells') {
    // T030: undercut/overcut cells with role-based colors
    for (const { column, row, role } of candidate.highlight_metadata.cells) {
      highlightedCells.push([row, column, role]);
    }
  } else if (['figure_7', 'j_shape'].includes(category) && candidate.highlight_metadata?.type === 'cells') {
    // T031: pattern cells in teal
    for (const { column, row, role } of candidate.highlight_metadata.cells) {
      highlightedCells.push([row, column, role]);
    }
    if (candidate.correct_col != null && heights[candidate.correct_col] < ROWS) {
      highlightedCells.push([heights[candidate.correct_col], candidate.correct_col, 'hint']);
    }
    // figure_7: also highlight the two derived threat cells in amber
    if (category === 'figure_7' && candidate.category_evidence?.threat_cells) {
      for (const { column, row } of candidate.category_evidence.threat_cells) {
        highlightedCells.push([row, column, 'figure7_threat']);
      }
    }
  } else if (category === 'claimeven' && candidate.category_evidence) {
    // T029: simulation_trace → loser/winner steps; baseinverse_pair → hint cells
    const { simulation_trace, baseinverse_pair } = candidate.category_evidence;
    if (simulation_trace && simulation_trace.length > 0) {
      let stepIdx = 0;
      for (const { col, row, player } of simulation_trace) {
        const step = ++stepIdx;
        const role = step % 2 === 1 ? 'loser' : 'winner';
        highlightedCells.push([row, col, role, step]);
      }
    }
    if (baseinverse_pair) {
      for (const col of baseinverse_pair) {
        if (heights[col] < ROWS) {
          highlightedCells.push([heights[col], col, 'hint']);
        }
      }
    }
  } else if (highlightCol !== null && heights[highlightCol] < ROWS) {
    highlightedCells.push([heights[highlightCol], highlightCol, 'hint']);
  }
  if (clickedCol !== null && heights[clickedCol] < ROWS) {
    highlightedCells.push([heights[clickedCol], clickedCol, 'selected']);
  }

  return (
    <div style={page}>
      {showReject && (
        <RejectModal
          candidateId={candidate.id}
          initialReason={candidate.rejection_reason}
          initialNote={candidate.annotator_note}
          onConfirm={advanceToNext}
          onClose={() => setShowReject(false)}
        />
      )}

      <div style={topBar}>
        <button style={backBtn} onClick={onBack}>← Dashboard</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {status !== 'pending' && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: status === 'approved' ? 'var(--green)' : 'var(--red)' }}>
              {status === 'approved' ? 'Reviewing Approved' : 'Reviewing Rejected'}
            </span>
          )}
          <div style={progress}>
            {candidates.length - idx} remaining
            {candidates.length - idx === 0 && <span style={{ color: 'var(--text-muted)' }}> — <button style={linkBtn} onClick={onBack}>back to dashboard</button></span>}
          </div>
        </div>
      </div>

      <div style={mainLayout}>
        <Board
          board={board}
          canPlay={true}
          onColumnClick={handleColumnClick}
          highlightedCells={highlightedCells}
        />

        {/* T028: z_threat badge info */}
        {category === 'z_threat' && candidate.highlight_metadata?.type === 'capsule' && (
          <div style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Z-threat: col {candidate.highlight_metadata.column + 1}</span>
            <span style={{ background: 'var(--surface)', border: '1px solid var(--yellow)', borderRadius: 4, padding: '1px 6px' }}>
              {candidate.highlight_metadata.badgeCount} cells
            </span>
          </div>
        )}

        <div style={metaRow}>
          <span style={catLabel}>{CATEGORY_NAMES[category] ?? 'Unknown'}</span>
          <span style={moveStringDisplay}>{candidate.move_string || '(empty)'}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>You are RED ●</div>
          {candidate.rejection_reason && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Rejected: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{candidate.rejection_reason}</span>
            </div>
          )}
          {candidate.goal_prompt && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Prompt: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{candidate.goal_prompt}</span>
            </div>
          )}
        </div>

        {/* Scores */}
        <div style={scoresRow}>
          {(displayScores ?? []).map((s, i) => (
            <div key={i} style={{
              ...scoreCell,
              background: s > 0 ? 'rgba(34,197,94,.15)' : s < 0 ? 'rgba(239,68,68,.15)' : 'var(--surface)',
              color: s > 0 ? 'var(--green)' : s < 0 ? 'var(--red)' : 'var(--text-muted)',
              outline: i === clickedCol ? '2px solid var(--text)' : 'none',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>C{i + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{s}</div>
              {s === winScore && winScore > 0 && <div style={{ fontSize: 8, color: 'var(--green)' }}>WIN</div>}
            </div>
          ))}
        </div>
        {scoresLoading && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>}

        {/* Debug trace */}
        <div style={debugSection}>
          <button style={debugToggle} onClick={() => setShowTrace(v => !v)}>
            {showTrace ? '▲ Hide trace' : '▼ Debug trace'}
          </button>
          {showTrace && (
            candidate.debug_trace
              ? <DebugTracePanel trace={candidate.debug_trace} />
              : <div style={noTrace}>no trace available</div>
          )}
        </div>

        {/* Predicate checklist (shown after a click) */}
        {clickedPass !== null && (
          <PredicateChecklist
            category={category}
            predicatePass={clickedPass}
            classifierTags={clickedTags}
          />
        )}

        {/* Multi-move sequencer for cats 4 and 6 */}
        {['fork_setup', 'parity_control'].includes(category) && (
          <MultiMoveSequencer
            category={category}
            baseMoveString={candidate.move_string}
            solverScores={displayScores}
            onSequenceComplete={seq => setCooperativeAiMoves(seq.cooperativeAiMoves)}
          />
        )}

        {/* Approve panel */}
        {showApprove ? (
          <div style={approvePanel}>
            <div style={panelTitle}>Approve Candidate</div>
            <div style={fieldGroup}>
              <label style={lbl}>Goal prompt</label>
              <textarea
                value={goalPrompt}
                onChange={e => setGoalPrompt(e.target.value)}
                rows={3}
                style={ta}
                placeholder={category === 'z_threat' ? `e.g. 'Find the column with ${candidate.highlight_metadata?.badgeCount ?? '?'} cells to the threat'` : undefined}
              />
            </div>
            <div style={fieldGroup}>
              <label style={lbl}>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} style={sel}>
                <option value={1}>1 — Easy</option>
                <option value={2}>2 — Medium</option>
                <option value={3}>3 — Hard</option>
              </select>
            </div>
            {approveError && <div style={errStyle}>{approveError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleApprove} style={approvePrimaryBtn} disabled={approveLoading || !goalPrompt.trim()}>
                {approveLoading ? '…' : 'Confirm (Enter)'}
              </button>
              <button onClick={() => setShowApprove(false)} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={actionRow}>
            <button onClick={() => setShowApprove(true)} style={approveBtn}>Approve (A)</button>
            <button onClick={() => setShowReject(true)} style={rejectBtn}>Reject (R)</button>
            <button onClick={advanceToNext} style={skipBtn}>Skip</button>
            <button onClick={handleDelete} style={deleteBtn}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugTracePanel({ trace }) {
  const { temperature_p1, temperature_p2, termination, plies } = trace;
  return (
    <div style={tracePanelWrap}>
      <div style={traceMeta}>
        T₁ = {temperature_p1.toFixed(3)} &nbsp; T₂ = {temperature_p2.toFixed(3)} &nbsp; stopped: <strong>{termination}</strong>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={traceTable}>
          <thead>
            <tr>
              {['ply', 'pl', 'col', 'scores', 'weights'].map(h => (
                <th key={h} style={traceTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plies.map(p => (
              <tr key={p.ply}>
                <td style={traceTd}>{p.ply}</td>
                <td style={traceTd}>{p.player}</td>
                <td style={traceTd}>{p.sampled_col + 1}</td>
                <td style={{ ...traceTd, fontFamily: 'monospace', fontSize: 9 }}>
                  {p.scores.map((s, i) => `C${i+1}:${s}`).join(' ')}
                </td>
                <td style={{ ...traceTd, fontFamily: 'monospace', fontSize: 9 }}>
                  {p.weights.map((w, i) => `C${i+1}:${w.toFixed(2)}`).join(' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const page = { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' };
const topBar = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-dim)' };
const progress = { fontSize: 13, color: 'var(--text-muted)' };
const mainLayout = { display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', gap: 10, padding: 12 };
const metaRow = { display: 'flex', alignItems: 'center', gap: 8 };
const catLabel = { fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 };
const moveStringDisplay = { fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', background: 'var(--surface)', padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', wordBreak: 'break-all' };
const scoresRow = { display: 'flex', gap: 3 };
const scoreCell = { flex: 1, padding: '4px 2px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center', minWidth: 0 };
const actionRow = { display: 'flex', gap: 8, marginTop: 8 };
const approveBtn = { flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const rejectBtn = { flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const skipBtn = { padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const deleteBtn = { padding: '10px 12px', borderRadius: 8, border: '1.5px solid rgba(239,68,68,.3)', background: 'transparent', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const approvePanel = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 8 };
const panelTitle = { fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10 };
const fieldGroup = { marginBottom: 10 };
const lbl = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 };
const ta = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };
const sel = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' };
const approvePrimaryBtn = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const cancelBtn = { padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const backBtn = { padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const linkBtn = { background: 'none', border: 'none', color: 'var(--text)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0 };
const errStyle = { color: 'var(--red)', fontSize: 12, marginBottom: 8 };
const emptyState = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', flex: 1 };
const debugSection = { borderTop: '1px solid var(--border-dim)', paddingTop: 6 };
const debugToggle = { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' };
const noTrace = { fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' };
const tracePanelWrap = { marginTop: 6, fontSize: 11 };
const traceMeta = { marginBottom: 4, color: 'var(--text-muted)' };
const traceTable = { width: '100%', borderCollapse: 'collapse', fontSize: 10 };
const traceTh = { textAlign: 'left', padding: '2px 4px', borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)', fontWeight: 700 };
const traceTd = { padding: '2px 4px', borderBottom: '1px solid var(--border-dim)', verticalAlign: 'top' };
