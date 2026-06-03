import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Icon } from '../components/Icon.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { ToolButton } from '../components/ToolButton.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { buildBoard, getMajorThreatCells } from '../lib/board.js';
import { AnnotatedExplanation } from '../components/AnnotatedExplanation.jsx';
import { SplitReveal } from '../components/SplitReveal.jsx';

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

export function ChallengeScreen({
  go, goBack,
  category,
  lessonMode = false,
  lessonId,
  lessonTitle,
  confirmationCategory,
  confirmationCount,
}) {
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
  const [selectedCols, setSelectedCols] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seqPosition, setSeqPosition] = useState('');

  // Deep Reveal state
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [deepRevealLoading, setDeepRevealLoading] = useState(false);
  const [deepRevealData, setDeepRevealData] = useState(null);
  const [deepRevealFlagged, setDeepRevealFlagged] = useState(false);
  const [deepRevealFlagOpen, setDeepRevealFlagOpen] = useState(false);
  const [deepRevealFlagNote, setDeepRevealFlagNote] = useState('');
  const [deepRevealTimedOut, setDeepRevealTimedOut] = useState(false);
  const [zhCells, setZhCells] = useState([]);

  const promptKeyRef = useRef(null);
  const startTimeRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Stable reference — avoids AnnotatedExplanation re-render loop.
  const userMajorThreats = useMemo(() => {
    if (!board) return [];
    const threats = getMajorThreatCells(board);
    const puzzle = puzzles[currentIdx];
    const userColor = (puzzle?.move_string?.length ?? 0) % 2 === 0 ? 'red' : 'yellow';
    const isMajor = userColor === 'red' ? 'rm' : 'ym';
    return Object.entries(threats)
      .filter(([, v]) => v[isMajor])
      .map(([key]) => {
        const [r, c] = key.split(',').map(Number);
        return { c, r };
      });
  }, [board, puzzles, currentIdx]);

  function initPuzzle(puzzle) {
    if (!puzzle) return;
    const { board: b, heights: h } = buildBoard(puzzle.move_string || '');
    setBoard(b);
    setHeights(h);
    setLastDrop(null);
    setOverlays([]);
    setEvaluation(null);
    setSelectedCols([]);
    setIsSubmitting(false);
    setDeepRevealOpen(false);
    setDeepRevealLoading(false);
    setDeepRevealData(null);
    setDeepRevealFlagged(false);
    setDeepRevealTimedOut(false);
    setZhCells(new Map());
    setSeqPosition(puzzle.move_string ?? '');

    // Pick a random prompt key from coach.<category>.prompt.*
    const effectiveCategory = lessonMode ? confirmationCategory : category;
    const candidateKeys = [0, 1, 2].map(i => `coach.${effectiveCategory}.prompt.${i}`);
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
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
        const drawCategory = lessonMode ? confirmationCategory : category;
        const drawN        = lessonMode ? confirmationCount    : 8;
        const res = await fetch(`${API}/api/puzzles/draw?category=${drawCategory}&n=${drawN}`, { headers });
        const data = await res.json();
        const loaded = data.puzzles || [];
        sessionIdRef.current = data.session_id ?? null;
        const resumeIdx = data.resume_idx ?? 0;
        setPuzzles(loaded);
        setCurrentIdx(resumeIdx);
        if (loaded.length > resumeIdx) {
          initPuzzle(loaded[resumeIdx]);
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
  }, [category, lessonMode, confirmationCategory, confirmationCount]);

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
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
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

  function advanceSession() {
    if (!sessionIdRef.current || !session) return;
    fetch(`${API}/api/challenge-sessions/${sessionIdRef.current}/advance`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  }

  function handleBack() {
    if (lessonMode) { go('concept', { lessonId }); return; }
    if (session || window.confirm(t('challenge.leave_confirm_body', "Your progress won't be saved."))) {
      go('setpicker');
    }
  }

  function handleNext() {
    const current = puzzles[currentIdx];
    const effectiveCategory = lessonMode ? confirmationCategory : category;
    const newResults = [...results, {
      puzzleId: current?.id,
      quality: evaluation?.quality ?? 'blunder',
      category: effectiveCategory,
    }];
    setResults(newResults);
    advanceSession();

    const nextIdx = currentIdx + 1;
    if (nextIdx < puzzles.length) {
      setCurrentIdx(nextIdx);
      initPuzzle(puzzles[nextIdx]);
      setPhase('pre-move');
    } else if (lessonMode) {
      store.saveLessonProgress(lessonId, 'complete');
      track('lesson_completed', { lessonId });
      go('saga');
    } else {
      go('summary', { results: newResults, category });
    }
  }

  async function handleLearnMore() {
    if (!session) { setAuthOpen(true); return; }
    // No client-side quota pre-flight — server 429 is the sole quota gate
    setDeepRevealOpen(true);
    setDeepRevealLoading(true);
    setDeepRevealData(null);
    setDeepRevealFlagged(false);
    setDeepRevealFlagOpen(false);
    setDeepRevealFlagNote('');
    setDeepRevealTimedOut(false);

    const current = puzzles[currentIdx];
    const timeoutId = setTimeout(() => {
      setDeepRevealLoading(false);
      setDeepRevealTimedOut(true);
    }, 6000);

    try {
      const res = await fetch(`${API}/api/explain-move-llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ movestring: current.move_string, col: lastDrop?.c }),
      });
      clearTimeout(timeoutId);
      if (res.status === 401) { setDeepRevealOpen(false); setAuthOpen(true); return; }
      if (res.status === 429) { setDeepRevealOpen(false); setUpgradeOpen(true); return; }
      const data = await res.json();
      setDeepRevealData(data);
      setDeepRevealLoading(false);
      track('deep_reveal_viewed', { puzzleId: current?.id, cached: data.cached ?? false });
    } catch {
      clearTimeout(timeoutId);
      setDeepRevealLoading(false);
      setDeepRevealTimedOut(true);
    }
  }

  async function handleFlag(note = '') {
    if (deepRevealFlagged) return;
    setDeepRevealFlagged(true);
    setDeepRevealFlagOpen(false);
    const current = puzzles[currentIdx];
    fetch(`${API}/api/llm-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movestring: current.move_string,
        col: lastDrop?.c,
        llm_prompt: deepRevealData?.prompt ?? '',
        llm_response: deepRevealData?.explanation ?? '',
        human_note: note,
        feature: 'challenges',
      }),
    }).catch(() => {});
    track('deep_reveal_flagged', { puzzleId: current?.id });
  }

  async function handleForbiddenSubmit() {
    if (phase !== 'pre-move' || selectedCols.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const current = puzzles[currentIdx];
    const cols = [...selectedCols];
    const diskColor = (current.move_string || '').length % 2 === 0 ? 'red' : 'yellow';
    const headers = {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };

    // Evaluate all selected columns in parallel
    const checkResults = await Promise.all(cols.map(col =>
      fetch(`${API}/api/puzzles/${current.id}/check`, {
        method: 'POST', headers,
        body: JSON.stringify({ candidateCol: col, moveHistory: [], attemptNumber: 1 }),
      }).then(r => r.json()).then(data => ({ col, data }))
    ));

    setIsSubmitting(false);

    // All responses share the same forbiddenCols set
    const forbiddenCols = checkResults[0]?.data?.forbiddenCols ?? [];

    const newOverlays = [];
    let newBoard = board.map(r => [...r]);
    let newHeights = [...heights];

    // Place discs for selected columns with appropriate overlays
    for (const { col } of checkResults) {
      const row = newHeights[col];
      newBoard[row][col] = diskColor;
      newHeights[col]++;
      newOverlays.push({ c: col, r: row, type: forbiddenCols.includes(col) ? 'win' : 'tr' });
    }

    // Reveal missed forbidden columns
    const missedForbidden = forbiddenCols.filter(c => !cols.includes(c));
    for (const col of missedForbidden) {
      const row = newHeights[col];
      newBoard[row][col] = diskColor;
      newHeights[col]++;
      newOverlays.push({ c: col, r: row, type: 'win' });
    }

    // Show opponent threat overlay above each forbidden column
    for (const col of forbiddenCols) {
      const threatRow = newHeights[col];
      if (threatRow < 6) {
        newOverlays.push({ c: col, r: threatRow, type: 'td' });
      }
    }

    setBoard(newBoard);
    setHeights(newHeights);
    setOverlays(newOverlays);
    setSelectedCols([]);

    const allCorrect = cols.every(c => forbiddenCols.includes(c)) && missedForbidden.length === 0;
    const noFalsePositives = cols.every(c => forbiddenCols.includes(c));
    const quality = allCorrect ? 'optimal' : noFalsePositives ? 'suboptimal' : 'blunder';
    const badge = quality === 'optimal' ? 'good' : quality === 'suboptimal' ? 'mid' : 'bad';

    const correctFound = cols.filter(c => forbiddenCols.includes(c));
    const summaryLine = quality === 'suboptimal'
      ? t('eval.forbidden_columns.suboptimal.summary.0', { found: correctFound.length, total: forbiddenCols.length })
      : t(`eval.forbidden_columns.${quality}.summary.0`);

    setEvaluation({ quality, badge, summaryLine });

    // Update coach
    const coachKey = `coach.forbidden_columns.${quality}.0`;
    setCoachMessages(prev => [...prev, { text: t(coachKey, { missed: missedForbidden.length }), mood: quality === 'optimal' ? 'happy' : 'oops' }]);

    store?.recordPuzzleAttempt({
      puzzle_id: current.id,
      device_uuid: 'local',
      moves_tried: cols.length,
      outcome: quality === 'optimal' ? 'correct_first' : 'wrong',
      first_attempt_correct: quality === 'optimal',
      time_ms: Date.now() - startTimeRef.current,
      ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
    });

    track('puzzle_attempted', { puzzleId: current.id, category: 'forbidden_columns', submittedCols: cols, correctCols: forbiddenCols });

    setPhase('post-move');
  }

  async function handleSequenceClick(col) {
    if (phase !== 'pre-move' || isSubmitting) return;
    const current = puzzles[currentIdx];
    if (!current) return;

    setIsSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };
      const res = await fetch(`${API}/api/puzzles/${current.id}/sequence/move`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ position: seqPosition, col }),
      });
      const data = await res.json();

      if (data.outcome === 'continue') {
        const newPos = seqPosition + String(col) + String(data.aiCol);
        setSeqPosition(newPos);
        const { board: b, heights: h } = buildBoard(newPos);
        setBoard(b);
        setHeights(h);
      } else if (data.outcome === 'success') {
        const newPos = seqPosition + String(col);
        setSeqPosition(newPos);
        const { board: b, heights: h } = buildBoard(newPos);
        setBoard(b);
        setHeights(h);
        setLastDrop({ c: col, r: heights[col] });
        setEvaluation({ quality: 'optimal', badge: 'good', summaryLineKey: 'coach.forced_win.optimal.0' });
        setCoachMessages(prev => [...prev, { text: t('coach.forced_win.optimal.0'), mood: 'happy' }]);
        store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          moves_tried: 1,
          outcome: 'correct_first',
          first_attempt_correct: true,
          time_ms: Date.now() - startTimeRef.current,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        });
        track('puzzle_solved_correct', { puzzleId: current.id, category });
        setPhase('post-move');
      } else {
        setCoachMessages(prev => [...prev, {
          text: data.reason ?? t('coach.forced_win.blunder.0'),
          mood: 'oops',
        }]);
      }
    } catch {
      setCoachMessages(prev => [...prev, { text: t('error.generic'), mood: 'oops' }]);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Derive full columns
  const fullCols = heights
    ? Array.from({ length: 7 }, (_, i) => i).filter(i => heights[i] >= 6)
    : [];

  // Badge for the board
  const badge = evaluation
    ? { col: lastDrop?.c, type: evaluation.badge, label: QUALITY_GLYPH[evaluation.quality] }
    : undefined;

  if (lessonMode && puzzles.length === 0 && phase !== 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-lessons)' }}>
        <TopBar onBack={handleBack} title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center', color: 'var(--text-sub)' }}>
          <p style={{ margin: 0, fontSize: 15 }}>{t('lesson.confirmation.empty', 'No practice puzzles available yet.')}</p>
          <button onClick={handleBack} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--surface-3)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
            {t('common.back', 'Back')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        background: 'var(--bg-chal)',
      }}>
        <TopBar
          onBack={handleBack}
          title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined}
        />
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
        title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined}
        meta={puzzles.length > 0 ? t('challenge.progress', { current: currentIdx + 1, total: puzzles.length }) : undefined}
      />

      {/* Progress bar */}
      {puzzles.length > 0 && (
        <div style={{ padding: '0 18px 10px' }}>
          <ProgressBar value={currentIdx + 1} max={puzzles.length} />
        </div>
      )}

      {/* Coach dialog — always visible */}
      <CoachDialog messages={coachMessages} size={58} />

      {deepRevealOpen ? (
        <SplitReveal
          isOpen={deepRevealOpen}
          onClose={() => {
            setDeepRevealOpen(false);
            setZhCells([]);
          }}
          closeLabel={t('common.collapse', 'Collapse')}
          boardContent={
            board && (
              <div style={{ width: '100%' }}>
                <Board
                  board={board}
                  onColumnClick={
                    category === 'forbidden_columns' ? undefined
                    : puzzles[currentIdx]?.interaction_mode === 'sequence' ? handleSequenceClick
                    : handleColumnClick
                  }
                  onColToggle={category === 'forbidden_columns' && phase === 'pre-move'
                    ? (col) => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
                    : undefined}
                  selectedCols={category === 'forbidden_columns' ? selectedCols : undefined}
                  canPlay={phase === 'pre-move' && !isSubmitting}
                  overlays={overlays}
                  badge={badge}
                  lastDrop={lastDrop}
                  fullCols={fullCols}
                  interactionMode={puzzles[currentIdx]?.interaction_mode === 'sequence' ? 'sequence' : 'single_move'}
                  zhCells={zhCells}
                />
              </div>
            )
          }
          revealContent={
            <>
              {deepRevealLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '3px solid #e2ddd2', borderTopColor: 'var(--disc-green)',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
                    {t('deepReveal.loading', 'Reading the position…')}
                  </p>
                </div>
              )}

              {!deepRevealLoading && deepRevealTimedOut && (
                <div style={{ padding: '8px 0' }}>
                  <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                    {evaluation?.summaryLine ?? (evaluation?.summaryLineKey ? t(evaluation.summaryLineKey) : '')}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
                    {t('deepReveal.unavailable', 'Detailed explanation unavailable.')}
                  </p>
                </div>
              )}

              {!deepRevealLoading && !deepRevealTimedOut && deepRevealData && (
                <div>
                  {/* Pattern tag + quality badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {evaluation?.patternTag && (
                      <span style={{
                        background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8, padding: '4px 10px',
                        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--ink)',
                      }}>
                        {evaluation.patternTag.replace(/_/g, ' ')}
                      </span>
                    )}
                    {evaluation?.badge && (
                      <span style={{
                        background: evaluation.badge === 'good' ? 'var(--eval-good-bg,#dcfce7)' : evaluation.badge === 'mid' ? 'var(--eval-mid-bg,#fef9c3)' : 'var(--eval-bad-bg,#fee2e2)',
                        color: evaluation.badge === 'good' ? 'var(--eval-good,#16a34a)' : evaluation.badge === 'mid' ? 'var(--eval-mid,#ca8a04)' : 'var(--eval-bad,#dc2626)',
                        borderRadius: 8, padding: '4px 10px',
                        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
                      }}>
                        {QUALITY_GLYPH[evaluation.quality]} {t('challenge.quality.' + evaluation.quality)}
                      </span>
                    )}
                  </div>

                  {/* LLM explanation */}
                  <div style={{
                    margin: '0 0 14px',
                    fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6,
                    color: 'var(--ink)',
                  }}>
                    <AnnotatedExplanation
                      text={deepRevealData.explanation}
                      userMajorThreats={userMajorThreats}
                      onHighlightsChange={setZhCells}
                    />
                  </div>

                  {/* Best line chips */}
                  {deepRevealData.bestLine?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
                        letterSpacing: '1.2px', color: 'var(--ink-soft)', marginBottom: 7,
                      }}>
                        BEST LINE
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {deepRevealData.bestLine.map((move, i) => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                              background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8,
                              padding: '4px 10px',
                              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                              color: 'var(--ink)',
                            }}>
                              {move}
                            </span>
                            {i < deepRevealData.bestLine.length - 1 && (
                              <Icon name="chevR" size={14} color="var(--ink-soft)" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flag button */}
                  <div style={{ marginTop: 6 }}>
                    {deepRevealFlagged ? (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                        }}>
                          <Icon name="check" size={15} color="var(--eval-good,#16a34a)" />
                          {t('deepReveal.flagged', 'Thanks — flagged')}
                        </span>
                      </div>
                    ) : deepRevealFlagOpen ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <textarea
                          autoFocus
                          value={deepRevealFlagNote}
                          onChange={e => setDeepRevealFlagNote(e.target.value)}
                          placeholder={t('deepReveal.flagNotePlaceholder', "What's wrong with this explanation? (optional)")}
                          rows={3}
                          style={{
                            width: '100%', boxSizing: 'border-box', resize: 'none',
                            fontFamily: 'var(--font-body)', fontSize: 13,
                            border: '1px solid var(--border-dim)', borderRadius: 8,
                            padding: '6px 8px', colorScheme: 'light',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setDeepRevealFlagOpen(false); setDeepRevealFlagNote(''); }}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                            }}
                          >
                            {t('deepReveal.flagCancel', 'Cancel')}
                          </button>
                          <button
                            onClick={() => handleFlag(deepRevealFlagNote.trim())}
                            style={{
                              background: 'var(--eval-bad)', border: 'none', cursor: 'pointer',
                              fontFamily: 'var(--font-body)', fontSize: 13, color: '#fff',
                              borderRadius: 6, padding: '4px 12px',
                            }}
                          >
                            {t('deepReveal.flagSend', 'Send')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setDeepRevealFlagOpen(true)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                          }}
                        >
                          <Icon name="flag" size={15} />
                          {t('deepReveal.flag', 'Flag this explanation')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          }
        />
      ) : (
        <>
          {/* Board — original layout when reveal is closed */}
          {board && (
            <div style={{ padding: '0 8px', flex: '0 0 auto' }}>
              <Board
                board={board}
                onColumnClick={
                  category === 'forbidden_columns' ? undefined
                  : puzzles[currentIdx]?.interaction_mode === 'sequence' ? handleSequenceClick
                  : handleColumnClick
                }
                onColToggle={category === 'forbidden_columns' && phase === 'pre-move'
                  ? (col) => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
                  : undefined}
                selectedCols={category === 'forbidden_columns' ? selectedCols : undefined}
                canPlay={phase === 'pre-move' && !isSubmitting}
                overlays={overlays}
                badge={badge}
                lastDrop={lastDrop}
                fullCols={fullCols}
                interactionMode={puzzles[currentIdx]?.interaction_mode === 'sequence' ? 'sequence' : 'single_move'}
                zhCells={zhCells}
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
                {evaluation.summaryLine ?? t(evaluation.summaryLineKey)}
              </p>

              {/* Learn more button — hidden for forbidden_columns and sequence mode */}
              {category !== 'forbidden_columns' && puzzles[currentIdx]?.interaction_mode !== 'sequence' && (
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
              )}
            </div>
          )}

          {/* Spacer to push toolbar to bottom */}
          <div style={{ flex: 1 }} />
        </>
      )}

      {/* Toolbar */}
      <Toolbar>
        {phase === 'pre-move' ? (
          category === 'forbidden_columns' ? (
            <button
              onClick={handleForbiddenSubmit}
              disabled={selectedCols.length === 0 || isSubmitting}
              style={{
                flex: 1, padding: '14px 22px', borderRadius: 16, border: 'none',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                cursor: selectedCols.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                background: selectedCols.length > 0 && !isSubmitting ? 'var(--disc-green)' : '#c7c2b8',
                color: '#fff',
                boxShadow: selectedCols.length > 0 && !isSubmitting ? '0 6px 0 #228245' : 'none',
                transition: 'background .15s',
              }}
            >
              Submit
            </button>
          ) : (
            <ToolButton
              icon="bulb"
              label="Hint"
              onClick={handleHint}
            />
          )
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
