import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { ToolButton } from '../components/ToolButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { buildBoard, getMajorThreatCells } from '../lib/board.js';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { pickRandomKey } from '../lib/coachUtils.js';
import { COACH_PACING_MS } from '../lib/constants.js';
import { useAudio } from '../lib/useAudio.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';

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
  confirmationChallenges = null,
}) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const { playSfx, playMusic, pauseMusic, sfxEnabled, musicEnabled, speechEnabled, toggleSfx, toggleMusic, toggleSpeech } = useAudio();
  const { speakCoachMessage } = useCoachSpeech();

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
  const [selectedCols, setSelectedCols] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seqPosition, setSeqPosition] = useState('');

  // Deep Reveal state
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [zhCells, setZhCells] = useState([]);
  const [hintUsed, setHintUsed] = useState(false);

  const promptKeyRef = useRef(null);
  const startTimeRef = useRef(null);
  const sessionIdRef = useRef(null);
  const usedPhraseKeysRef = useRef(new Set());
  const lastCoachKeyRef = useRef(null); // T021: for coach speech

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
    setZhCells([]);
    setHintUsed(false);
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
    lastCoachKeyRef.current = pickedKey;
    setCoachMessages([{ text: t(pickedKey), mood: 'happy', disc: playerDisc, discLabel }]);
    startTimeRef.current = Date.now();
  }

  useEffect(() => {
    async function loadPuzzles() {
      try {
        // Use embedded challenges when provided (lesson editor curation)
        if (lessonMode && confirmationChallenges?.length > 0) {
          const loaded = confirmationChallenges.map(ch => ({
            id: ch.puzzleId || `inline-${ch.moveString}`,
            category: confirmationCategory,
            move_string: ch.moveString,
            interaction_mode: ch.interactionMode || 'single_move',
            highlight_metadata: ch.highlightMetadata ?? null,
            correct_col: ch.correctCol,
            user_player: ch.userPlayer,
          }));
          sessionIdRef.current = null;
          setPuzzles(loaded);
          setCurrentIdx(0);
          if (loaded.length > 0) {
            initPuzzle(loaded[0]);
            setPhase('pre-move');
          } else {
            setPhase('pre-move');
          }
          return;
        }

        // Legacy random draw
        const drawCategory = lessonMode ? confirmationCategory : category;
        const drawN        = lessonMode ? confirmationCount    : 8;
        const res = await fetch(`${API}/api/puzzles/draw?category=${drawCategory}&n=${drawN}`, { credentials: 'include' });
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
  }, [category, lessonMode, confirmationCategory, confirmationCount, confirmationChallenges]);

  // ── Audio: coach speech playback ─────────────────────────────────
  useEffect(() => {
    if (lastCoachKeyRef.current) {
      speakCoachMessage(lastCoachKeyRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachMessages.length]);

  // ── Audio: background music lifecycle ────────────────────────────
  useEffect(() => {
    playMusic();
    return () => pauseMusic();
  }, [playMusic, pauseMusic]);

  function handleColumnClick(col) {
    if (phase !== 'pre-move') return;
    const current = puzzles[currentIdx];
    if (!current || !board || !heights) return;

    const effectiveCategory = lessonMode ? confirmationCategory : category;

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
      body: JSON.stringify({ movestring: current.move_string, col, category: effectiveCategory }),
    })
      .then(r => r.json())
      .then(data => {
        setEvaluation(data);

        // SFX feedback
        if (data.quality === 'optimal') {
          playSfx('correct_move');
        } else {
          playSfx('wrong_move');
        }

        // Update coach — fall back to quality-aware generic pool when no category-specific key exists
        const used = usedPhraseKeysRef.current;
        let phraseKey = data.coachPhraseKey
          ?? pickRandomKey(t, `coach.generic.${data.quality ?? 'blunder'}`, used);
        used.add(phraseKey);
        const moodDefaults = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
        lastCoachKeyRef.current = phraseKey;
        setCoachMessages(prev => [...prev, {
          text: t(phraseKey),
          mood: data.coachMood ?? moodDefaults[data.quality] ?? 'think',
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
          outcome: data.quality === 'optimal' ? 'correct_first' : 'abandoned',
          first_attempt_correct: data.quality === 'optimal',
          time_ms: Date.now() - startTimeRef.current,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        });
        store?.recordActivityDay().catch(() => {});

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
    if (hintUsed) return;
    const effectiveCategory = lessonMode ? confirmationCategory : category;
    const keys = [`coach.${effectiveCategory}.hint.0`, `coach.${effectiveCategory}.hint.1`];
    const valid = keys.filter(k => t(k) !== k);
    if (valid.length === 0) return;
    const key = valid[Math.floor(Math.random() * valid.length)];
    lastCoachKeyRef.current = key;
    setCoachMessages(prev => [...prev, { text: t(key), mood: 'think' }]);
    setHintUsed(true);
  }

  function advanceSession() {
    if (!sessionIdRef.current || !session) return;
    fetch(`${API}/api/challenge-sessions/${sessionIdRef.current}/advance`, {
      method: 'PATCH',
      credentials: 'include',
    }).catch(() => {});
  }

  function handleBack() {
    if (lessonMode) { go('saga'); return; }
    if (session || window.confirm(t('challenge.leave_confirm_body', "Your progress won't be saved."))) {
      go('setpicker');
    }
  }

  function handleTryAgain() {
    const current = puzzles[currentIdx];
    if (!current) return;
    initPuzzle(current);
    setPhase('pre-move');
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

  function handleLearnMore() {
    setDeepRevealOpen(true);
  }

  async function handleForbiddenSubmit() {
    if (phase !== 'pre-move' || selectedCols.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const current = puzzles[currentIdx];
    const cols = [...selectedCols];
    const diskColor = (current.move_string || '').length % 2 === 0 ? 'red' : 'yellow';
    const headers = { 'Content-Type': 'application/json' };

    // Evaluate all selected columns in parallel
    const checkResults = await Promise.all(cols.map(col =>
      fetch(`${API}/api/puzzles/${current.id}/check`, {
        method: 'POST', headers, credentials: 'include',
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

    // SFX feedback
    if (quality === 'optimal') {
      playSfx('correct_move');
    } else {
      playSfx('wrong_move');
    }

    // Update coach
    const coachKey = `coach.forbidden_columns.${quality}.0`;
    lastCoachKeyRef.current = coachKey;
    setCoachMessages(prev => [...prev, { text: t(coachKey, { missed: missedForbidden.length }), mood: quality === 'optimal' ? 'happy' : 'oops' }]);

    store?.recordPuzzleAttempt({
      puzzle_id: current.id,
      device_uuid: 'local',
      moves_tried: cols.length,
      outcome: quality === 'optimal' ? 'correct_first' : 'abandoned',
      first_attempt_correct: quality === 'optimal',
      time_ms: Date.now() - startTimeRef.current,
      ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
    });
    store?.recordActivityDay().catch(() => {});

    track('puzzle_attempted', { puzzleId: current.id, category: 'forbidden_columns', submittedCols: cols, correctCols: forbiddenCols });

    setPhase('post-move');
  }

  async function handleSequenceClick(col) {
    if (phase !== 'pre-move' || isSubmitting) return;
    const current = puzzles[currentIdx];
    if (!current) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/puzzles/${current.id}/sequence/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ position: seqPosition, col }),
      });
      const data = await res.json();

      if (data.outcome === 'continue') {
        // T005 + T006: Staged two-step render.
        // Option B: isSubmitting cleared inside setTimeout callback (not in finally).
        // finally block removed — setIsSubmitting(false) is explicit in every other branch.

        // Step (a): render user's disc with animation; isSubmitting stays true
        const userPos = seqPosition + String(col);
        const { board: bUser, heights: hUser } = buildBoard(userPos);
        setBoard(bUser);
        setHeights(hUser);
        // heights[col] is pre-move heights from React state — still valid
        // because setHeights hasn't fired yet (React state updates are batched).
        setLastDrop({ c: col, r: heights[col] });

        // Coach pacing: wait before AI continuation (FR-015)
        await new Promise(r => setTimeout(r, COACH_PACING_MS));

        // Step (b): render AI's disc with animation after user's drop animation has ~settled
        const aiRow = hUser[data.aiCol]; // captured from locally-returned hUser — avoids stale-closure trap
        const fullPos = userPos + String(data.aiCol);
        setTimeout(() => {
          const { board: bFull, heights: hFull } = buildBoard(fullPos);
          setSeqPosition(fullPos);
          setBoard(bFull);
          setHeights(hFull);
          setLastDrop({ c: data.aiCol, r: aiRow });
          setIsSubmitting(false); // T006: clear re-entry guard HERE, not in finally
        }, 300);
        return; // T006: skip synchronous isSubmitting=false for this branch
      } else if (data.outcome === 'success') {
        playSfx('correct_move');
        const newPos = seqPosition + String(col);
        setSeqPosition(newPos);
        const { board: b, heights: h } = buildBoard(newPos);
        setBoard(b);
        setHeights(h);
        setLastDrop({ c: col, r: heights[col] });
        setEvaluation({ quality: 'optimal', badge: 'good', summaryLineKey: 'coach.forced_win.optimal.0' });
        lastCoachKeyRef.current = 'coach.forced_win.optimal.0';
        setCoachMessages(prev => [...prev, { text: t('coach.forced_win.optimal.0'), mood: 'happy' }]);
        // Highlight both threat cells on double-threat success
        if (data.threatCells && data.threatCells.length > 0) {
          setOverlays(data.threatCells.map(cell => ({ c: cell.c, r: cell.r, type: 'win' })));
        }
        store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          moves_tried: 1,
          outcome: 'correct_first',
          first_attempt_correct: true,
          time_ms: Date.now() - startTimeRef.current,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        });
        store?.recordActivityDay().catch(() => {});
        track('puzzle_solved_correct', { puzzleId: current.id, category });
        setPhase('post-move');
        setIsSubmitting(false); // T006: explicit clear (option B, no finally)
      } else {
        playSfx('wrong_move');
        lastCoachKeyRef.current = data.reason ? null : 'coach.forced_win.blunder.0';
        setCoachMessages(prev => [...prev, {
          text: data.reason ?? t('coach.forced_win.blunder.0'),
          mood: 'oops',
        }]);
        setIsSubmitting(false); // T006: explicit clear (option B, no finally)
      }
    } catch {
      playSfx('wrong_move');
      lastCoachKeyRef.current = 'error.generic';
      setCoachMessages(prev => [...prev, { text: t('error.generic'), mood: 'oops' }]);
      setIsSubmitting(false); // T006: explicit clear (option B, no finally)
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
        <TopBar onBack={handleBack} title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined} onLogoClick={() => go('home')} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <p style={{ margin: 0, fontSize: 15 }}>{t('lesson.confirmation.empty', 'No practice puzzles available yet.')}</p>
          <button onClick={handleBack} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer', fontSize: 14 }}>
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
          onLogoClick={() => go('home')}
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
        onLogoClick={() => go('home')}
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
        <DeepRevealPane
          isOpen={deepRevealOpen}
          onClose={() => setDeepRevealOpen(false)}
          closeLabel={t('common.collapse', 'Collapse')}
          moveString={puzzles[currentIdx]?.move_string}
          col={lastDrop?.c}
          feature="challenges"
          navigate={go}
          onReveal={d => track('deep_reveal_viewed', { puzzleId: puzzles[currentIdx]?.id, cached: d.cached ?? false })}
          onZhCellsChange={setZhCells}
          userMajorThreats={userMajorThreats}
          headerContent={evaluation?.badge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {evaluation?.patternTag && (
                <span style={{
                  background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8, padding: '4px 10px',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--ink)',
                }}>
                  {evaluation.patternTag.replace(/_/g, ' ')}
                </span>
              )}
              <span style={{
                background: evaluation.badge === 'good' ? 'var(--eval-good-bg,#dcfce7)' : evaluation.badge === 'mid' ? 'var(--eval-mid-bg,#fef9c3)' : 'var(--eval-bad-bg,#fee2e2)',
                color: evaluation.badge === 'good' ? 'var(--eval-good,#16a34a)' : evaluation.badge === 'mid' ? 'var(--eval-mid,#ca8a04)' : 'var(--eval-bad,#dc2626)',
                borderRadius: 8, padding: '4px 10px',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
              }}>
                {QUALITY_GLYPH[evaluation.quality]} {t('challenge.quality.' + evaluation.quality)}
              </span>
            </div>
          )}
          timeoutContent={evaluation && (
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
              {evaluation.summaryLine ?? (evaluation.summaryLineKey ? t(evaluation.summaryLineKey) : '')}
            </p>
          )}
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
                  // T004: canPlay is always false when Deep Reveal is open
                  // (phase === 'post-move'), so this board is non-interactive.
                  // Pass null to prevent drop animations on a static reference view.
                  lastDrop={null}
                  fullCols={fullCols}
                  interactionMode={puzzles[currentIdx]?.interaction_mode === 'sequence' ? 'sequence' : 'single_move'}
                  zhCells={zhCells}
                />
              </div>
            )
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

              {/* Learn more button — hidden for forbidden_columns, sequence mode, and correct answers */}
              {category !== 'forbidden_columns' && puzzles[currentIdx]?.interaction_mode !== 'sequence' && evaluation?.quality !== 'optimal' && (
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
              disabled={hintUsed}
            />
          )
        ) : (
          lessonMode && evaluation && evaluation.quality !== 'optimal' ? (
            <button
              onClick={handleTryAgain}
              style={{
                flex: 1,
                padding: '14px 22px',
                borderRadius: 16,
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                background: 'var(--disc-green)',
                color: '#fff',
                boxShadow: '0 6px 0 #228245',
                transition: 'background .15s',
              }}
            >
              {t('challenge.try_again', 'Try Again')}
            </button>
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
          )
        )}

        {/* Audio toggle buttons */}
        <button
          type="button"
          onClick={toggleSfx}
          aria-label={sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          title={sfxEnabled ? 'SFX on' : 'SFX off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <Icon name={sfxEnabled ? 'speaker' : 'speakerOff'} size={22} color={sfxEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>

        <button
          type="button"
          onClick={toggleMusic}
          aria-label={musicEnabled ? 'Mute music' : 'Unmute music'}
          title={musicEnabled ? 'Music on' : 'Music off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <Icon name={musicEnabled ? 'music' : 'musicOff'} size={22} color={musicEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>

        <button
          type="button"
          onClick={toggleSpeech}
          aria-label={speechEnabled ? 'Mute speech' : 'Unmute speech'}
          title={speechEnabled ? 'Speech on' : 'Speech off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <Icon name={speechEnabled ? 'speaker' : 'speakerOff'} size={22} color={speechEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>
      </Toolbar>

    </div>
  );
}
