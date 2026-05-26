import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { DeepRevealButton } from '../components/DeepRevealButton.jsx';
import { PaywallModal } from '../components/PaywallModal.jsx';
import { SequenceHandler } from '../components/SequenceHandler.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { CATEGORY_NAMES, CATEGORY_CHIPS, CATEGORY_ORDER } from '../lib/categories.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const COLS = 7;
const ROWS = 6;

function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return { board, heights };
}

function Chip({ catId }) {
  const chip = CATEGORY_CHIPS[catId];
  if (!chip) return null;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.8px',
      textTransform: 'uppercase',
      padding: '3px 8px',
      borderRadius: 4,
      color: chip.color,
      background: chip.bg,
      border: `1px solid ${chip.border}`,
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      {chip.label}
    </span>
  );
}

function SessionAccuracy({ stats, prevStats }) {
  const entries = Object.entries(stats).filter(([, { attempted }]) => attempted > 0);
  if (!entries.length) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 20px 0' }}>
      {entries.map(([cat, { attempted, correct }]) => {
        const rate = Math.round((correct / attempted) * 100);
        const prev = prevStats?.[cat];
        const prevRate = prev?.attempted > 0 ? Math.round((prev.correct / prev.attempted) * 100) : null;
        const delta = prevRate !== null ? rate - prevRate : null;
        return (
          <div key={cat} style={{
            fontSize: 11,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            color: 'var(--text-sub)',
          }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{CATEGORY_NAMES[cat]}</span>
            {': '}
            <span style={{ fontFamily: "'Courier New', monospace" }}>{correct}/{attempted}</span>
            {delta !== null && (
              <span style={{ color: delta >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: 4, fontWeight: 700 }}>
                {delta >= 0 ? '+' : ''}{delta}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CategoryList({ categories, onSelect }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map(cat => (
        <div
          key={cat.id}
          onClick={() => {
            if (cat.locked) {
              track('paywall_viewed', { trigger: 'category_lock', category: cat.id });
              setShowPaywall(true);
            } else {
              onSelect(cat.id);
            }
          }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${CATEGORY_CHIPS[cat.id]?.color ?? 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            cursor: 'pointer',
            opacity: cat.locked ? 0.6 : 1,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Chip catId={cat.id} />
            {cat.locked && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔒 {t('puzzle.locked')}</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
            {CATEGORY_NAMES[cat.id]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{cat.count} puzzles</div>
          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }}>→</div>
        </div>
      ))}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="category_lock"
        session={session}
      />
    </div>
  );
}

export default function PuzzlesPage() {
  const { t } = useTranslation();
  const { session, store } = useStore();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoard] = useState(null);
  const [heights, setHeights] = useState(null);
  const [moves, setMoves] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [sessionStats, setSessionStats] = useState({});
  const [prevSessionStats, setPrevSessionStats] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [correctCol, setCorrectCol] = useState(null);

  useEffect(() => {
    fetchCategories();
    track('session_start', { mode: 'puzzle' });
    if (store?.getSessionStats) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      store.getSessionStats(yesterday).then(prev => {
        if (prev?.stats) setPrevSessionStats(prev.stats);
      }).catch(() => {});
    }
  }, [session]);

  async function fetchCategories() {
    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
    const res = await fetch(`${API}/api/puzzles`, { headers });
    if (res.ok) setCategories(await res.json().then(d => d.categories));
  }

  const [emptyCategory, setEmptyCategory] = useState(false);

  async function loadPuzzle(categoryId) {
    setSelectedCategory(categoryId);
    setFeedback(null);
    setAttemptCount(0);
    setCorrectCol(null);
    setEmptyCategory(false);

    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
    const listRes = await fetch(`${API}/api/puzzles?category=${categoryId}`, { headers });
    const listData = await listRes.json();
    const categoryPuzzles = listData.categories?.find(c => c.id === categoryId);
    if (!categoryPuzzles?.puzzles?.length) {
      setEmptyCategory(true);
      return;
    }

    const randomPuzzle = categoryPuzzles.puzzles[Math.floor(Math.random() * categoryPuzzles.puzzles.length)];
    const puzzleRes = await fetch(`${API}/api/puzzles/${randomPuzzle.id}`, { headers });
    const puzzleData = await puzzleRes.json();

    setPuzzle(puzzleData);
    const state = buildBoard(puzzleData.moveString);
    setBoard(state.board);
    setHeights(state.heights);
    setMoves(puzzleData.moveString);
    setStartTime(Date.now());
  }

  async function handleColumnClick(col) {
    if (!puzzle || feedback === 'correct' || feedback === 'tied' || feedback === 'revealed') return;

    const headers = {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };

    const res = await fetch(`${API}/api/puzzles/${puzzle.id}/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ candidateCol: col, moveHistory: [], attemptNumber: attemptCount + 1 }),
    });
    const data = await res.json();

    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    track('puzzle_attempted', { puzzleId: puzzle.id, category: selectedCategory, outcome: data.result });

    if (data.result === 'correct' || data.result === 'tied') {
      const outcome = newAttemptCount === 1 ? 'correct_first' : 'correct_retry';
      setFeedback(data.result === 'tied' ? 'tied' : outcome);
      setCorrectCol(col);
      track('puzzle_solved_correct', { puzzleId: puzzle.id, category: selectedCategory, firstAttempt: newAttemptCount === 1 });
      if (newAttemptCount === 1) {
        updateStats(selectedCategory, true);
      }
      if (store) await store.recordPuzzleAttempt({
        puzzle_id: puzzle.id, device_uuid: 'local', moves_tried: [col],
        outcome, first_attempt_correct: newAttemptCount === 1,
        time_ms: Date.now() - startTime,
      });
    } else if (data.result === 'wrong') {
      if (newAttemptCount === 1) {
        updateStats(selectedCategory, false);
      }
      if (newAttemptCount >= 2) {
        setFeedback('revealed');
        setCorrectCol(data.correctCol ?? null);
        track('puzzle_solved_wrong', { puzzleId: puzzle.id, category: selectedCategory, attemptNumber: newAttemptCount });
      } else {
        setFeedback('wrong');
      }
    }
  }

  function updateStats(category, wasCorrect) {
    setSessionStats(prev => {
      const cat = prev[category] ?? { attempted: 0, correct: 0 };
      const next = { ...prev, [category]: { attempted: cat.attempted + 1, correct: cat.correct + (wasCorrect ? 1 : 0) } };
      if (store?.saveSessionStats) {
        const today = new Date().toISOString().slice(0, 10);
        store.saveSessionStats({ date: today, stats: next }).catch(() => {});
      }
      return next;
    });
  }

  const isCorrect = feedback === 'correct_first' || feedback === 'correct_retry' || feedback === 'tied';
  const isWrong = feedback === 'wrong';
  const isRevealed = feedback === 'revealed';
  const canPlay = !feedback || feedback === 'wrong';

  if (!selectedCategory) {
    return (
      <div style={page}>
        <div style={sectionHeader}>
          <div style={sectionTitle}>Puzzles</div>
        </div>
        <SessionAccuracy stats={sessionStats} prevStats={prevSessionStats} />
        <CategoryList categories={categories} onSelect={loadPuzzle} />
      </div>
    );
  }

  if (emptyCategory) {
    return (
      <div style={page}>
        <div style={topBar}>
          <button onClick={() => { setSelectedCategory(null); setEmptyCategory(false); }} style={backBtn}>←</button>
          <div style={{ flex: 1 }}>
            <Chip catId={selectedCategory} />
          </div>
        </div>
        <div style={{ margin: '20px 16px', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No puzzles yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 16 }}>
            This category has no puzzles available right now. Check back soon.
          </div>
          <button onClick={() => { setSelectedCategory(null); setEmptyCategory(false); }} style={backBtn}>
            ← Back to categories
          </button>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div style={page}>
        <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={page}>
      {/* Top bar */}
      <div style={topBar}>
        <button onClick={() => { setSelectedCategory(null); setPuzzle(null); }} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <Chip catId={selectedCategory} />
        </div>
      </div>

      <SessionAccuracy stats={sessionStats} prevStats={prevSessionStats} />

      {/* Sequence mode: delegate entirely to SequenceHandler */}
      {puzzle.interactionMode === 'sequence' ? (
        <SequenceHandler
          key={puzzle.id}
          puzzle={puzzle}
          onNext={() => loadPuzzle(selectedCategory)}
        />
      ) : (
        <>
          {/* Prompt */}
          <div style={{ padding: '8px 20px 10px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--text)' }}>
              {puzzle.goalPrompt}
            </div>
            {isWrong && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Not the best — try again</div>
            )}
          </div>

          {/* Board */}
          <div style={{ padding: '0 16px' }}>
            <Board
              board={board}
              onColumnClick={handleColumnClick}
              canPlay={canPlay}
              highlightedCells={correctCol !== null ? [[heights?.[correctCol] - 1 ?? 0, correctCol, 'winning']] : []}
              highlightMetadata={puzzle?.highlightMetadata ?? null}
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{
              ...expl,
              borderLeftColor: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--text-muted)',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--text-sub)',
                marginBottom: 5,
              }}>
                {isCorrect && '✓ Correct Move'}
                {isWrong && '✗ Not the best move'}
                {isRevealed && `Best move: Col ${(correctCol ?? 0) + 1}`}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
                {isCorrect && (feedback === 'correct_first' ? t('puzzle.correctFirst') : feedback === 'tied' ? t('puzzle.tied', { col: (correctCol ?? 0) + 1 }) : t('puzzle.correctRetry'))}
                {isWrong && t('puzzle.wrong')}
                {isRevealed && t('puzzle.revealed')}
              </div>
            </div>
          )}

          {(isCorrect || isRevealed) && correctCol !== null && (
            <div style={{ padding: '0 16px 8px' }}>
              <DeepRevealButton moves={moves} candidateCol={correctCol} />
            </div>
          )}

          {feedback && (
            <div style={{ padding: '0 16px 12px' }}>
              <button onClick={() => loadPuzzle(selectedCategory)} style={btnPrimary}>
                Next puzzle →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const page = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  minHeight: '100%',
};

const sectionHeader = {
  padding: '14px 20px 10px',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
};

const sectionTitle = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: '-.4px',
  color: 'var(--text)',
};

const topBar = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 20px 6px',
  gap: 10,
};

const backBtn = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  color: 'var(--text-sub)',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'inherit',
};

const expl = {
  margin: '10px 16px',
  padding: '12px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--green)',
};

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: 'none',
  background: 'var(--red)',
  color: '#fff',
  fontFamily: 'inherit',
};
