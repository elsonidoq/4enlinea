import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { DeepRevealButton } from '../components/DeepRevealButton.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
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
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map(cat => (
        <div
          key={cat.id}
          onClick={() => {
            if (cat.locked) {
              track('paywall_viewed', { trigger: 'category_lock', category: cat.id });
              setShowUpgrade(true);
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
      {showUpgrade && <UpgradeModal onDismiss={() => setShowUpgrade(false)} onNotify={() => {}} />}
    </div>
  );
}

function PlayerContext({ puzzle }) {
  if (!puzzle) return null;
  const userIsRed = puzzle.userPlayer !== 2;
  const userMovesFirst = (puzzle.moveString.length % 2 === 0) === userIsRed;
  const color = userIsRed ? 'var(--red)' : 'var(--yellow)';
  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 20px 8px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-sub)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        {userIsRed ? 'Playing as Red' : 'Playing as Yellow'}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
      <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
        {userMovesFirst ? 'You move first' : 'You move second'}
      </span>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOverlays, setPlacedOverlays] = useState([]); // [{c, r, type}]
  const [threatOverlays, setThreatOverlays] = useState([]); // double_threat reveal cells
  const [selectedForbiddenCols, setSelectedForbiddenCols] = useState(new Set()); // forbidden_columns multi-select
  const [showClaimSequence, setShowClaimSequence] = useState(false); // claimeven overlay
  // Stable puzzle selection per category within a session
  const categoryPuzzleRef = useRef({});
  // Board snapshot before the last optimistic placement (used to undo a wrong move on retry)
  const preMoveStateRef = useRef(null);

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

    // Exclude solved puzzles (Issue 4)
    let solvedIds = new Set();
    if (store?.getAllPuzzleAttempts) {
      try {
        const attempts = await store.getAllPuzzleAttempts();
        for (const a of attempts) {
          if (a.outcome === 'correct_first' || a.outcome === 'correct_retry' || a.outcome === 'tied') {
            solvedIds.add(a.puzzle_id);
          }
        }
      } catch {}
    }
    let pool = categoryPuzzles.puzzles.filter(p => !solvedIds.has(p.id));
    if (pool.length === 0) pool = categoryPuzzles.puzzles; // fallback when all solved

    // Stable selection per category within the session (Issue 3)
    let chosenId = categoryPuzzleRef.current[categoryId];
    if (!chosenId || !pool.find(p => p.id === chosenId)) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      chosenId = picked.id;
      categoryPuzzleRef.current[categoryId] = chosenId;
    }
    const randomPuzzle = pool.find(p => p.id === chosenId);

    const puzzleRes = await fetch(`${API}/api/puzzles/${randomPuzzle.id}`, { headers });
    const puzzleData = await puzzleRes.json();

    setPuzzle(puzzleData);
    const state = buildBoard(puzzleData.moveString);
    setBoard(state.board);
    setHeights(state.heights);
    setMoves(puzzleData.moveString);
    setStartTime(Date.now());
    setPlacedOverlays([]);
    setThreatOverlays([]);
    setIsSubmitting(false);
    setSelectedForbiddenCols(new Set());
    setShowClaimSequence(false);
    preMoveStateRef.current = null;
  }

  function handleColToggle(col) {
    if (!puzzle || feedback || isSubmitting) return;
    setSelectedForbiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  }

  async function handleColumnClick(col) {
    if (!puzzle || feedback === 'correct_first' || feedback === 'correct_retry' || feedback === 'tied' || feedback === 'revealed') return;
    if (isSubmitting) return;
    if (!heights || heights[col] >= ROWS) return;

    // Undo the previous wrong disk before placing a new one
    let currentBoard = board;
    let currentHeights = heights;
    if (feedback === 'wrong' && preMoveStateRef.current) {
      currentBoard = preMoveStateRef.current.board;
      currentHeights = preMoveStateRef.current.heights;
      setPlacedOverlays([]);
      setFeedback(null);
    }

    // Optimistic disk placement
    const placedRow = currentHeights[col];
    const diskColor = puzzle.userPlayer === 2 ? 'yellow' : 'red';
    const newHeights = currentHeights.map((h, i) => i === col ? h + 1 : h);
    preMoveStateRef.current = { board: currentBoard, heights: currentHeights };
    setBoard(() => {
      const next = currentBoard.map(r => [...r]);
      next[placedRow][col] = diskColor;
      return next;
    });
    setHeights(newHeights);
    setIsSubmitting(true);

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
    setIsSubmitting(false);

    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    track('puzzle_attempted', { puzzleId: puzzle.id, category: selectedCategory, outcome: data.result });

    if (data.result === 'correct' || data.result === 'tied') {
      const outcome = newAttemptCount === 1 ? 'correct_first' : 'correct_retry';
      setPlacedOverlays(prev => [...prev, { c: col, r: placedRow, type: 'win' }]);
      if (puzzle.category === 'double_threat' && data.threatCells?.length) {
        setThreatOverlays(data.threatCells.map(({ col: c, row: r }) => ({ c, r, type: 'tg' })));
      }
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
        setPlacedOverlays(prev => [...prev, { c: col, r: placedRow, type: 'tr' }]);
        setFeedback('wrong');
      } else {
        // Reveal: remove the wrong disk, then place only the correct disk
        const preMove = preMoveStateRef.current;
        const revCol = data.correctCol ?? null;
        if (revCol !== null) {
          const baseBoard = preMove ? preMove.board : board;
          const baseHeights = preMove ? preMove.heights : heights;
          const revRow = baseHeights[revCol];
          setBoard(() => {
            const next = baseBoard.map(r => [...r]);
            next[revRow][revCol] = diskColor;
            return next;
          });
          setPlacedOverlays([{ c: revCol, r: revRow, type: 'win' }]);
        } else {
          // No correct col to reveal — just remove the wrong disk
          if (preMove) {
            setBoard(() => preMove.board.map(r => [...r]));
            setHeights(preMove.heights);
          }
          setPlacedOverlays([]);
        }
        if (puzzle.category === 'double_threat' && data.threatCells?.length) {
          setThreatOverlays(data.threatCells.map(({ col: c, row: r }) => ({ c, r, type: 'tg' })));
        }
        setFeedback('revealed');
        setCorrectCol(revCol);
        track('puzzle_solved_wrong', { puzzleId: puzzle.id, category: selectedCategory, attemptNumber: newAttemptCount });
      }
    }
  }

  async function handleForbiddenSubmit() {
    if (!puzzle || feedback || isSubmitting || selectedForbiddenCols.size === 0) return;
    setIsSubmitting(true);
    const cols = Array.from(selectedForbiddenCols);
    const diskColor = puzzle.userPlayer === 2 ? 'yellow' : 'red';
    const headers = {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };

    // Evaluate all selected columns in parallel
    const results = await Promise.all(cols.map(col =>
      fetch(`${API}/api/puzzles/${puzzle.id}/check`, {
        method: 'POST', headers,
        body: JSON.stringify({ candidateCol: col, moveHistory: [], attemptNumber: 1 }),
      }).then(r => r.json()).then(data => ({ col, data }))
    ));

    setIsSubmitting(false);
    setSelectedForbiddenCols(new Set());

    // All responses share the same forbiddenCols set
    const forbiddenCols = results[0]?.data?.forbiddenCols ?? [];

    const newOverlays = [];
    let newBoard = board.map(r => [...r]);
    let newHeights = [...heights];

    // Place disks for selected columns: correct (IS forbidden) or wrong (NOT forbidden)
    for (const { col } of results) {
      const row = newHeights[col];
      newBoard[row][col] = diskColor;
      newHeights[col]++;
      newOverlays.push({ c: col, r: row, type: forbiddenCols.includes(col) ? 'win' : 'tr' });
    }

    // Reveal missed forbidden cols (forbidden but user didn't select them)
    const missedForbidden = forbiddenCols.filter(c => !cols.includes(c));
    for (const col of missedForbidden) {
      const row = newHeights[col];
      newBoard[row][col] = diskColor;
      newHeights[col]++;
      newOverlays.push({ c: col, r: row, type: 'win' });
    }

    // Show opponent's winning cell above each forbidden column (empty cell, opponent threat)
    for (const col of forbiddenCols) {
      const threatRow = newHeights[col]; // row above the Red disk just placed
      if (threatRow < ROWS) {
        newOverlays.push({ c: col, r: threatRow, type: 'td' });
      }
    }

    setBoard(newBoard);
    setHeights(newHeights);
    setPlacedOverlays(newOverlays);

    const allCorrect = cols.every(c => forbiddenCols.includes(c)) && missedForbidden.length === 0;
    setFeedback(allCorrect ? 'correct_first' : 'revealed');
    if (allCorrect) {
      updateStats(selectedCategory, true);
    } else {
      updateStats(selectedCategory, false);
    }
    if (store) await store.recordPuzzleAttempt({
      puzzle_id: puzzle.id, device_uuid: 'local', moves_tried: cols,
      outcome: allCorrect ? 'correct_first' : 'wrong',
      first_attempt_correct: allCorrect,
      time_ms: Date.now() - startTime,
    });
    track('puzzle_attempted', { puzzleId: puzzle.id, category: selectedCategory, outcome: allCorrect ? 'correct' : 'wrong' });
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
  const canPlay = (!feedback || feedback === 'wrong') && !isSubmitting;

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
          onNext={() => { delete categoryPuzzleRef.current[selectedCategory]; loadPuzzle(selectedCategory); }}
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

          {/* Player context: color + move order */}
          <PlayerContext puzzle={puzzle} />

          {/* Board */}
          {(() => {
            // When showing claimeven trace, apply trace moves to a copy of the board
            const trace = (showClaimSequence && puzzle?.category === 'claimeven' && puzzle?.simulationTrace?.length > 0)
              ? puzzle.simulationTrace : null;
            const displayBoard = trace
              ? (() => {
                  const b = board.map(r => [...r]);
                  for (const { col, row, player } of trace) b[row][col] = player === 1 ? 'red' : 'yellow';
                  return b;
                })()
              : board;

            const isForbiddenMode = puzzle?.category === 'forbidden_columns' && !feedback;

            return (
              <div style={{ padding: '0 16px' }}>
                <Board
                  board={displayBoard}
                  onColumnClick={handleColumnClick}
                  canPlay={canPlay}
                  overlays={[
                    ...placedOverlays,
                    ...(threatOverlays.length > 0 && (isCorrect || isRevealed) ? threatOverlays : []),
                    ...(puzzle?.highlightMetadata?.type === 'cells' && (isCorrect || isRevealed)
                      ? (puzzle.highlightMetadata.cells ?? []).map(({ column, row }) => ({ c: column, r: row, type: 'tg' }))
                      : []),
                  ]}
                  selectedCols={isForbiddenMode ? Array.from(selectedForbiddenCols) : []}
                  onColToggle={isForbiddenMode ? handleColToggle : undefined}
                />
              </div>
            );
          })()}

          {/* Forbidden columns submit button */}
          {puzzle?.category === 'forbidden_columns' && !feedback && selectedForbiddenCols.size > 0 && (
            <div style={{ padding: '0 16px 8px' }}>
              <button onClick={handleForbiddenSubmit} style={{ ...btnPrimary, background: 'var(--text)', color: 'var(--bg)' }} disabled={isSubmitting}>
                {isSubmitting ? 'Checking…' : `Submit ${selectedForbiddenCols.size} column${selectedForbiddenCols.size > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

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
                {isRevealed && (puzzle?.category === 'forbidden_columns' ? 'Forbidden columns revealed' : `Best move: Col ${(correctCol ?? 0) + 1}`)}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
                {isCorrect && (feedback === 'correct_first' ? t('puzzle.correctFirst') : feedback === 'tied' ? t('puzzle.tied', { col: (correctCol ?? 0) + 1 }) : t('puzzle.correctRetry'))}
                {isWrong && t('puzzle.wrong')}
                {isRevealed && t('puzzle.revealed')}
              </div>
            </div>
          )}

          {(isCorrect || isRevealed) && correctCol !== null && puzzle?.category !== 'forbidden_columns' && (
            <div style={{ padding: '0 16px 8px' }}>
              <DeepRevealButton moves={moves} candidateCol={correctCol} />
            </div>
          )}

          {/* Claimeven sequence overlay toggle */}
          {puzzle?.category === 'claimeven' && (isCorrect || isRevealed) && correctCol !== null && (
            <div style={{ padding: '0 16px 4px' }}>
              <button
                onClick={() => setShowClaimSequence(v => !v)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13, color: 'var(--text-sub)', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
              >
                {showClaimSequence ? 'Hide sequence ▴' : 'Show how it plays out ▾'}
              </button>
              {showClaimSequence && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Red plays solver-optimal. Yellow mirrors each Red move in the same column (claimeven), claiming the even row above.
                  Numbers show move order.
                </div>
              )}
            </div>
          )}

          {feedback && (
            <div style={{ padding: '0 16px 12px' }}>
              <button onClick={() => { delete categoryPuzzleRef.current[selectedCategory]; loadPuzzle(selectedCategory); }} style={btnPrimary}>
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
