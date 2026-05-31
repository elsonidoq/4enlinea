import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { ToolButton } from '../components/ToolButton.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { buildBoard } from '../lib/board.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

const QUALITY_GLYPH = { optimal: '✓', suboptimal: '?', blunder: '✕' };

function getWinLine(board, row, col, color) {
  const ROWS = 6, COLS = 7;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const line = [{ r: row, c: col }];
    for (let d = 1; d <= 3; d++) {
      const r2 = row + dr * d, c2 = col + dc * d;
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS && board[r2][c2] === color) line.push({ r: r2, c: c2 }); else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r2 = row - dr * d, c2 = col - dc * d;
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS && board[r2][c2] === color) line.push({ r: r2, c: c2 }); else break;
    }
    if (line.length >= 4) return line;
  }
  return [];
}

export function ChallengeScreen({ go, goBack, category }) {
  const { t } = useTranslation();
  const { store, session } = useStore();

  const [phase, setPhase] = useState('loading'); // 'loading' | 'pre-move' | 'post-move'
  const [puzzles, setPuzzles] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [board, setBoard] = useState(null);
  const [heights, setHeights] = useState(null);
  const [lastDrop, setLastDrop] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [coachMessages, setCoachMessages] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const promptKeyRef = useRef(null);
  const startTimeRef = useRef(null);

  function initPuzzle(puzzle) {
    if (!puzzle) return;
    const { board: b, heights: h } = buildBoard(puzzle.move_string || '');
    setBoard(b);
    setHeights(h);
    setLastDrop(null);
    setOverlays([]);
    setEvaluation(null);

    // Pick a random prompt key from coach.<category>.prompt.*
    const candidateKeys = [0, 1, 2].map(i => `coach.${category}.prompt.${i}`);
    const validKeys = candidateKeys.filter(k => t(k) !== k);
    const pickedKey = validKeys.length > 0
      ? validKeys[Math.floor(Math.random() * validKeys.length)]
      : candidateKeys[0];
    promptKeyRef.current = pickedKey;

    const playerDisc = (puzzle.move_string || '').length % 2 === 0 ? 'green' : 'gray';
    const discLabel = t(playerDisc === 'gray' ? 'challenge.playing_gray' : 'challenge.playing_green');
    setCoachMessages([{ text: t(pickedKey), mood: 'happy', disc: playerDisc, discLabel }]);
    startTimeRef.current = Date.now();
  }

  useEffect(() => {
    async function loadPuzzles() {
      try {
        const res = await fetch(`${API}/api/puzzles/draw?category=${category}&n=8`);
        const data = await res.json();
        const loaded = data.puzzles || [];
        setPuzzles(loaded);
        if (loaded.length > 0) {
          initPuzzle(loaded[0]);
          setPhase('pre-move');
        } else {
          setPhase('pre-move'); // empty set — will render gracefully
        }
      } catch (err) {
        console.error('Failed to load puzzles', err);
        setPhase('pre-move');
      }
    }
    loadPuzzles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function handleColumnClick(col) {
    if (phase !== 'pre-move') return;
    const current = puzzles[currentIdx];
    if (!current || !board || !heights) return;

    const row = heights[col];
    if (row >= 6) return; // full column

    // Determine disc color: even move count → Red plays
    const color = current.move_string.length % 2 === 0 ? 'red' : 'yellow';

    // Optimistic board update
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = color;
    const newHeights = [...heights];
    newHeights[col]++;
    setBoard(newBoard);
    setHeights(newHeights);
    setLastDrop({ c: col, r: row });

    // Commit-first (FR-017)
    setPhase('post-move');

    // Analytics
    track('puzzle_attempted', { puzzleId: current.id, category });

    // Fetch evaluation
    fetch(`${API}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movestring: current.move_string, col, category }),
    })
      .then(r => r.json())
      .then(data => {
        setEvaluation(data);

        // Update coach
        setCoachMessages(prev => [...prev, {
          text: t(data.coachPhraseKey),
          mood: data.coachMood,
        }]);

        // Win overlay if optimal win
        if (data.quality === 'optimal') {
          const winLine = getWinLine(newBoard, row, col, color);
          if (winLine.length >= 4) {
            setOverlays(winLine.map(cell => ({ c: cell.c, r: cell.r, type: 'win' })));
          }
        }

        // Record attempt
        store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          moves_tried: [col],
          outcome: data.quality === 'optimal' ? 'correct_first' : 'wrong',
          first_attempt_correct: data.quality === 'optimal',
          time_ms: Date.now() - startTimeRef.current,
        });

        // Analytics
        if (data.quality === 'optimal') {
          track('puzzle_solved_correct', { puzzleId: current.id, category });
        } else {
          track('puzzle_solved_wrong', { puzzleId: current.id, category });
        }
      })
      .catch(err => console.error('evaluate-move failed', err));
  }

  function handleHint() {
    const keys = [`coach.${category}.hint.0`, `coach.${category}.hint.1`];
    const valid = keys.filter(k => t(k) !== k);
    if (valid.length === 0) return;
    const key = valid[Math.floor(Math.random() * valid.length)];
    setCoachMessages(prev => [...prev, { text: t(key), mood: 'think' }]);
  }

  function handleBack() {
    if (window.confirm(t('challenge.leave_confirm_body', "Your progress won't be saved."))) {
      go('setpicker');
    }
  }

  function handleNext() {
    const current = puzzles[currentIdx];
    const newResults = [...results, {
      puzzleId: current?.id,
      quality: evaluation?.quality ?? 'blunder',
      category,
    }];
    setResults(newResults);

    const nextIdx = currentIdx + 1;
    if (nextIdx < puzzles.length) {
      setCurrentIdx(nextIdx);
      initPuzzle(puzzles[nextIdx]);
      setPhase('pre-move');
    } else {
      go('summary', { results: newResults, category });
    }
  }

  function handleLearnMore() {
    if (!session) { setAuthOpen(true); return; }
    // TODO Epic 2b: implement real weekly limit check
    const quotaExhausted = false; // stub for Epic 2a
    if (quotaExhausted) { setUpgradeOpen(true); return; }
    console.log('[Epic 2b] Deep Reveal would open here');
  }

  // Derive full columns
  const fullCols = heights
    ? Array.from({ length: 7 }, (_, i) => i).filter(i => heights[i] >= 6)
    : [];

  // Badge for the board
  const badge = evaluation
    ? { col: lastDrop?.c, type: evaluation.badge, label: QUALITY_GLYPH[evaluation.quality] }
    : undefined;

  if (phase === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        background: 'var(--bg-chal)',
      }}>
        <TopBar onBack={handleBack} />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-soft)', fontSize: 15, fontFamily: 'var(--font-body)',
        }}>
          {t('loading', 'Loading…')}
        </div>
      </div>
    );
  }

  const qualityColor = evaluation
    ? (evaluation.badge === 'good' ? 'var(--eval-good)' : evaluation.badge === 'mid' ? 'var(--eval-mid)' : 'var(--eval-bad)')
    : undefined;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: 'var(--bg-chal)',
    }}>
      {/* Top bar */}
      <TopBar
        onBack={handleBack}
        meta={puzzles.length > 0 ? t('challenge.progress', { current: currentIdx + 1, total: puzzles.length }) : undefined}
      />

      {/* Progress bar */}
      {puzzles.length > 0 && (
        <div style={{ padding: '0 18px 10px' }}>
          <ProgressBar value={currentIdx + 1} max={puzzles.length} />
        </div>
      )}

      {/* Coach dialog */}
      <CoachDialog messages={coachMessages} size={58} />

      {/* Board */}
      {board && (
        <div style={{ padding: '0 8px', flex: '0 0 auto' }}>
          <Board
            board={board}
            onColumnClick={handleColumnClick}
            canPlay={phase === 'pre-move'}
            overlays={overlays}
            badge={badge}
            lastDrop={lastDrop}
            fullCols={fullCols}
            interactionMode="single_move"
          />
        </div>
      )}

      {/* Tier-1 evaluation strip — shown after move is evaluated */}
      {phase === 'post-move' && evaluation && (
        <div style={{
          margin: '10px 18px 0',
          background: '#fff',
          borderRadius: 16,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {/* Quality tag */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
              color: qualityColor,
            }}>
              {QUALITY_GLYPH[evaluation.quality]} {t('challenge.quality.' + evaluation.quality)}
            </span>
          </div>

          {/* Summary line */}
          <p style={{
            margin: 0,
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
            color: 'var(--ink)', lineHeight: 1.4,
          }}>
            {t(evaluation.summaryLineKey)}
          </p>

          {/* Learn more button */}
          <button
            onClick={handleLearnMore}
            style={{
              marginTop: 4,
              background: 'transparent', border: '1.5px solid var(--line, #e2ddd2)',
              borderRadius: 10, padding: '8px 14px',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
              color: 'var(--ink-soft)', cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            Learn more ▼
          </button>
        </div>
      )}

      {/* Spacer to push toolbar to bottom */}
      <div style={{ flex: 1 }} />

      {/* Toolbar */}
      <Toolbar>
        {phase === 'pre-move' ? (
          <ToolButton
            icon="bulb"
            label="Hint"
            onClick={handleHint}
          />
        ) : (
          <button
            onClick={handleNext}
            disabled={!evaluation}
            style={{
              flex: 1,
              padding: '14px 22px',
              borderRadius: 16,
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              cursor: evaluation ? 'pointer' : 'not-allowed',
              background: evaluation ? 'var(--disc-green)' : '#c7c2b8',
              color: '#fff',
              boxShadow: evaluation ? '0 6px 0 #228245' : 'none',
              transition: 'background .15s',
            }}
          >
            {t('challenge.next', 'Next →')}
          </button>
        )}
      </Toolbar>

      {/* Modals */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          reason="deep_reveal"
        />
      )}
      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => setUpgradeOpen(false)}
          onNotify={() => setUpgradeOpen(false)}
        />
      )}
    </div>
  );
}
