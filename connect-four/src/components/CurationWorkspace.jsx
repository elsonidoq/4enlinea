import { useState, useEffect, useCallback } from 'react';
import { Board } from './Board.jsx';
import { PredicateChecklist } from './PredicateChecklist.jsx';
import { RejectModal } from './RejectModal.jsx';
import { MultiMoveSequencer } from './MultiMoveSequencer.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';
const ROWS = 6;
const COLS = 7;

const GOAL_PROMPTS = {
  1: 'Find the winning move.',
  2: "Block your opponent's threat.",
  3: 'Find the move that creates two simultaneous threats.',
  4: 'Set up a fork — a sequence that leads to two unstoppable threats.',
  5: 'Any move your opponent makes leads to their loss. Make your move.',
  6: 'Control the parity of this column to secure the win.',
  7: 'Identify which columns you must avoid — playing there would hand your opponent an immediate win.',
};

function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    if (isNaN(col) || col < 0 || col >= COLS || heights[col] >= ROWS) continue;
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
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

  switch (category) {
    case 1:
      return legalCols.find(i => scores[i] === winScore && winScore > 0) ?? null;
    case 2: {
      const blocking = legalCols.filter(i => scores[i] >= 0);
      return blocking.length === 1 ? blocking[0] : null;
    }
    case 3: {
      let best = -Infinity, bestCol = null;
      for (const i of legalCols) {
        if (scores[i] > best) { best = scores[i]; bestCol = i; }
      }
      return bestCol;
    }
    case 4:
    case 6: {
      const nonWinPos = legalCols.filter(i => scores[i] > 0 && scores[i] !== winScore);
      if (nonWinPos.length === 0) return null;
      return nonWinPos.reduce((best, i) => scores[i] > scores[best] ? i : best);
    }
    case 5: {
      const maxScore = Math.max(...legalCols.map(i => scores[i]));
      return legalCols.find(i => scores[i] === maxScore) ?? null;
    }
    case 7: {
      const opponentWinScore = -Math.ceil((41 - moveCount) / 2);
      const forbidden = legalCols.filter(i => scores[i] === opponentWinScore);
      if (forbidden.length > 0 && forbidden.length < legalCols.length) return forbidden[0];
      return null;
    }
    default:
      return null;
  }
}

export function CurationWorkspace({ category, onBack }) {
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

  const candidate = candidates[idx] ?? null;
  const remaining = candidates.length - idx;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/admin/candidates?category=${category}&status=pending&limit=100`);
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
  }, [category]);

  // Reset per-candidate state when moving to next
  useEffect(() => {
    setClickedScores(null);
    setClickedTags([]);
    setClickedPass(null);
    setClickedCol(null);
    setShowApprove(false);
    setShowReject(false);
    setGoalPrompt(GOAL_PROMPTS[category] ?? '');
    setDifficulty(2);
    setCooperativeAiMoves([]);
    setApproveError(null);
  }, [idx, category]);

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
      const res = await fetch(`${API}/api/admin/scores?moves=${encodeURIComponent(movesWithClick)}&category=${category}`);
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
      if (res.status === 409) { setApproveError('Already reviewed'); return; }
      if (!res.ok) { setApproveError(data.error ?? 'Approve failed'); return; }
      advanceToNext();
    } catch (e) {
      setApproveError(e.message);
    } finally {
      setApproveLoading(false);
    }
  }

  function advanceToNext() {
    setIdx(i => i + 1);
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

  const board = buildBoard(candidate.move_string);
  const highlightCol = deriveHighlightCol(category, candidate.solver_scores, candidate.move_string);
  const displayScores = clickedScores ?? candidate.solver_scores;
  const moveCount = candidate.move_string.length;
  const winScore = immediateWinScore(moveCount);

  // Build highlighted cells for pre-highlight and clicked col
  const highlightedCells = [];
  const heights = getHeights(candidate.move_string);
  if (highlightCol !== null && heights[highlightCol] < ROWS) {
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
          onConfirm={advanceToNext}
          onClose={() => setShowReject(false)}
        />
      )}

      <div style={topBar}>
        <button style={backBtn} onClick={onBack}>← Dashboard</button>
        <div style={progress}>
          {remaining} remaining
          {candidates.length === 0 && ' — '}
          {remaining === 0 && <span style={{ color: 'var(--text-muted)' }}> — <button style={linkBtn} onClick={onBack}>generate more</button></span>}
        </div>
      </div>

      <div style={mainLayout}>
        <Board
          board={board}
          canPlay={true}
          onColumnClick={handleColumnClick}
          highlightedCells={highlightedCells}
        />

        <div style={metaRow}>
          <span style={catLabel}>Category {category}</span>
          <span style={moveStringDisplay}>{candidate.move_string || '(empty)'}</span>
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

        {/* Predicate checklist (shown after a click) */}
        {clickedPass !== null && (
          <PredicateChecklist
            category={category}
            predicatePass={clickedPass}
            classifierTags={clickedTags}
          />
        )}

        {/* Multi-move sequencer for cats 4 and 6 */}
        {[4, 6].includes(category) && (
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
          </div>
        )}
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
