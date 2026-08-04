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
import { useCoachSpeech, speakLessonAudio } from '../lib/useCoachSpeech.js';
import { SINGLE_ANSWER_CATEGORIES, MULTI_SOLUTION_CATEGORIES } from '../lib/categories.js';
import { DevBoardInjector } from '../components/DevBoardInjector.jsx';
import { buildDevPuzzle } from '../lib/devFixtures.js';
import { readDevBoardParam } from '../lib/devBoardParam.js';
import { isSyntheticPuzzleId } from '../lib/syntheticPuzzleId.js';

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
  go,
  category,
  lessonMode = false,
  lessonId,
  lessonTitle,
  confirmationCategory,
  confirmationCount,
  confirmationChallenges = null,
  devPuzzles = undefined,
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
  // Path-addressed narration for a goalPrompt override (see initPuzzle). Mutually
  // exclusive with lastCoachKeyRef: pool prompts have a key, overrides have a path.
  const lastLessonAudioRef = useRef(null);

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

    // Pick a random prompt key from coach.spoken.<category>.prompt.*
    const effectiveCategory = lessonMode ? confirmationCategory : category;
    const candidateKeys = [0, 1, 2].map(i => `coach.spoken.${effectiveCategory}.prompt.${i}`);
    const validKeys = candidateKeys.filter(k => t(k) !== k);
    const pickedKey = validKeys.length > 0
      ? validKeys[Math.floor(Math.random() * validKeys.length)]
      : candidateKeys[0];
    promptKeyRef.current = pickedKey;

    const playerDisc = (puzzle.move_string || '').length % 2 === 0 ? 'green' : 'gray';
    const discLabel = t(playerDisc === 'gray' ? 'challenge.playing_gray' : 'challenge.playing_green');

    // Spec 052 US2 (T018/T019, Settled Decision 8): a lesson-authored `goal_prompt`
    // override replaces the generic pool text when present (FR-006); the pool
    // mechanism and its outcome-neutral copy are otherwise untouched (FR-007/FR-008).
    // No pre-generated audio clip matches override text yet (Epic 5 follow-up), so
    // lastCoachKeyRef is set to null (not pickedKey) in this branch — the narration
    // effect below reads `if (lastCoachKeyRef.current)` and stays silent (FR-029).
    const promptText = puzzle.goal_prompt || t(pickedKey);
    lastCoachKeyRef.current = puzzle.goal_prompt ? null : pickedKey;
    // The override's clip is path-addressed, so it cannot ride lastCoachKeyRef (which
    // feeds the strictly key-based speakCoachMessage). Kept in its own ref and played
    // by the same narration effect — exactly one of the two refs is ever set.
    lastLessonAudioRef.current = puzzle.goal_prompt ? (puzzle.goal_prompt_audio || null) : null;
    setCoachMessages([{ text: promptText, mood: 'happy', disc: playerDisc, discLabel }]);
    startTimeRef.current = Date.now();
  }

  useEffect(() => {
    async function loadPuzzles() {
      try {
        // DEV board injector (dead-code-eliminated in prod): a `devPuzzles` prop (set by handleDevLoad's
        // go('challenge', {devPuzzles})) or a ?devBoard= URL param takes priority over the normal draw.
        if (import.meta.env.DEV) {
          let injected = devPuzzles?.length ? devPuzzles : null;
          if (!injected) {
            const p = readDevBoardParam();
            if (p) injected = [buildDevPuzzle({ ...p, category })];
          }
          if (injected?.length) {
            sessionIdRef.current = null;
            setPuzzles(injected);
            setCurrentIdx(0);
            initPuzzle(injected[0]);
            setPhase('pre-move');
            return;
          }
        }

        // Use embedded challenges when provided (lesson editor curation)
        if (lessonMode && confirmationChallenges?.length > 0) {
          const loaded = confirmationChallenges.map(ch => ({
            // Always a synthetic `inline-` id, even when the lesson JSON carries an authored
            // `ch.puzzleId`. A lesson confirmation challenge IS the whole puzzle — board, correct
            // column and highlight metadata all live in the lesson file — so it has no `puzzles`
            // row and must never claim one. Every authored `puzzleId` in the lesson content today
            // resolves to no row at all (see docs/open_issues.md OI-85), and sending one made the
            // server attempt a stored-set lookup that could only miss. Minting the id here keeps
            // `isSyntheticPuzzleId` sufficient: these requests omit `puzzleId` entirely and take
            // the computed-live branch, which is the branch row-less content is supposed to use
            // (FR-025).
            id: `inline-${ch.moveString}`,
            category: confirmationCategory,
            move_string: ch.moveString,
            interaction_mode: ch.interactionMode || 'single_move',
            highlight_metadata: ch.highlightMetadata ?? null,
            correct_cols: [ch.correctCol],
            user_player: ch.userPlayer,
            // Spec 052 US2 (T017): already locale-resolved by localizeLesson's
            // confirmationChallenges[].goalPrompt merge (server/lessonLoader.js) —
            // a single, current-locale string, never the raw {goalPrompt, goalPrompt_es} pair.
            goal_prompt: ch.goalPrompt ?? null,
            // The narration clip for that override, localized by the same merge.
            // Path-addressed (/audio/lessons/<sha>.mp3), NOT an i18n key — override text
            // has no key, which is why it was silent until this clip existed.
            goal_prompt_audio: ch.goalPromptAudio ?? null,
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
  }, [category, lessonMode, confirmationCategory, confirmationCount, confirmationChallenges, devPuzzles]);

  // ── Audio: coach speech playback ─────────────────────────────────
  useEffect(() => {
    if (lastCoachKeyRef.current) {
      speakCoachMessage(lastCoachKeyRef.current);
    } else if (lastLessonAudioRef.current) {
      // speakCoachMessage gates on speechEnabled internally; speakLessonAudio does NOT
      // (see its doc comment in useCoachSpeech.js — the caller owns that check). Gate it
      // here or a muted learner still hears the override prompt.
      if (speechEnabled) speakLessonAudio(lastLessonAudioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachMessages.length]);

  // ── Audio: background music lifecycle ────────────────────────────
  useEffect(() => {
    playMusic();
    return () => pauseMusic();
  }, [playMusic, pauseMusic]);

  function handleDevLoad(puzzleObj, cat) {
    // Re-navigate so the `category` prop (hence effectiveCategory + the accepted-gate) matches the
    // loaded board. `go()` to the same screen does NOT remount ChallengeScreen (no `key` prop in
    // App.jsx); instead the new `devPuzzles` prop (a fresh array reference) re-runs the loadPuzzles
    // effect in place, since devPuzzles is now listed in its dependency array.
    go('challenge', { category: cat, devPuzzles: [puzzleObj] });
  }

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
      body: JSON.stringify({
        movestring: current.move_string,
        col,
        category: effectiveCategory,
        // Spec 049 (Epic 9) T010 — mandatory snake_case→camelCase remap. The client's local
        // puzzle object (from GET /api/puzzles/draw) is snake_case; the server reads camelCase.
        // Top-level rename only — the inner highlight_metadata JSON (.column, .cells[].role)
        // passes through unmodified. Sent unconditionally; harmless no-op for categories that
        // don't consume it.
        correctCols: current.correct_cols,
        highlightMetadata: current.highlight_metadata,
        // Spec 051 (Epic 1) US3 T054 / FR-027 — lets the server's stored-set grading branch
        // (server/evaluateMoveHandler.js) look the row up and grade directly against its stored
        // correct_cols instead of recomputing. Kept alongside correctCols/highlightMetadata (not a
        // replacement, FR-017) — those still serve the FR-024a NULL-correct_cols fallback and any
        // request this endpoint gets with no puzzle row at all (lesson inline challenges).
        //
        // Only sent for ids that can actually resolve to a `puzzles` row. Two id shapes minted
        // locally in this file are synthetic and have no row: `dev-<movestring>` (DEV board
        // injector, see buildDevPuzzle) and `inline-<movestring>` (lesson confirmation challenges
        // minted above, unconditionally, for every lesson confirmation challenge).
        // Sending either made the server's stored-set lookup 404 the whole request, which silently
        // killed grading feedback for every lesson inline challenge and every DEV-injected board —
        // the phase change has already committed by then, so the UI shows no error, just nothing.
        // Omitting the field routes these to the pre-existing computed-live branch, which is the
        // branch they are supposed to use (FR-025). Mirrors the existing `dev-` guard on
        // recordPuzzleAttempt below.
        ...(isSyntheticPuzzleId(current.id) ? {} : { puzzleId: current.id }),
      }),
    })
      // Guard against non-2xx responses (e.g. a solver/server error): without this, `r.json()`
      // still parses an error body like `{ error: "internal error" }`, and the code below reads
      // `data.quality`/`data.accepted` as undefined, which renders as a raw, untranslated
      // `challenge.quality.undefined` i18n key on screen instead of failing gracefully like a
      // network error does (see the existing `.catch` below).
      .then(r => { if (!r.ok) throw new Error(`evaluate-move failed: ${r.status}`); return r.json(); })
      .then(data => {
        // Spec 044 US3 / FR-015a: for the three multi-solution categories (immediate_threat,
        // forced_block, double_threat), do NOT judge correctness by a bare
        // `data.quality === 'optimal'` check — that's a pure solver-score comparison and can
        // disagree with the puzzle's actual accepted-answer set (e.g. a fork column that isn't
        // the single max-score column, or a winning/blocking column that isn't the stored
        // canonical one). Read the additive `data.accepted` field instead, which the server
        // computes via evaluatePredicate (FR-012's 'tied'-as-correct rule) for these categories.
        // Spec 049 (Epic 9) T012 — the six SINGLE_ANSWER_CATEGORIES (z_threat, overcut,
        // claimeven, undercut, figure_7, j_shape) have the same problem (a taught-pattern column
        // can tie or trail the raw solver score) and now route through the same `accepted` gate
        // (FR-008/FR-011/FR-012). Every other category keeps the original
        // `data.quality === 'optimal'` check unchanged (FR-011).
        const isMultiSolutionCategory = MULTI_SOLUTION_CATEGORIES.has(effectiveCategory);
        const usesAcceptedGate = isMultiSolutionCategory || SINGLE_ANSWER_CATEGORIES.has(effectiveCategory);
        const isCorrect = usesAcceptedGate ? data.accepted === true : data.quality === 'optimal';

        // True when the accepted-gate promotes a pattern-correct-but-slower move to "correct":
        // the server's raw score-only `quality` is below 'optimal' but the taught/tied pattern was
        // actually played (OI-1 repro board 2 shape).
        const acceptedPromoted = usesAcceptedGate && isCorrect && data.quality !== 'optimal';

        // Symmetric case (OI-1 repro board 1 shape): the played column ties the raw solver score
        // (so the server's unchanged, score-only `quality`/`badge` read 'optimal'/'good' per
        // FR-003 — those fields are additive-only and MUST NOT be mutated for other callers) but
        // it is NOT the taught pattern, so `accepted` is false. Without this, the display would
        // silently keep showing the server's score-only "correct" verdict even though `isCorrect`
        // (derived from `accepted`) is false — a wrong-answer SFX/attempt-record alongside a
        // "correct" badge/coach line (SC-002 contradiction).
        const acceptedDemoted = usesAcceptedGate && !isCorrect && data.quality === 'optimal';

        // Re-pick summaryLineKey from the corrected-tier pool, but only when that pool actually
        // has content — several categories (overcut, undercut, figure_7, j_shape) have NO
        // `eval.<category>.*.summary` keys at all in en.json, and pickRandomKey's fallback
        // (`${prefix}.0`) returns a key that doesn't resolve, rendering the raw untranslated key
        // string on screen. Feature-detect with t() before using the picked key.
        function pickSummaryKeyOrNull(quality) {
          const key = pickRandomKey(t, `eval.${effectiveCategory}.${quality}.summary`);
          return t(key) !== key ? key : null;
        }

        // The rendered badge/glyph/summary must agree with `isCorrect`, not the server's raw
        // score-only `quality` — a valid tied/taught answer (accepted:true) must visually read as
        // correct, not "suboptimal", and a score-tied-but-non-taught answer (accepted:false) must
        // visually read as wrong, not "correct". This overrides the display-driving `quality`/
        // `badge` fields for the accepted-gated categories when they'd otherwise contradict
        // `accepted`. `summaryLineKey` is ALSO re-picked from the corrected-tier pool above when
        // available — otherwise the visible summary line (e.g. "Playable, but the Z-threat column
        // gives stronger parity control.") would still read from the server's unmutated,
        // score-only `quality` tier and contradict the corrected badge/coach line (SC-002); when no
        // corrected-tier summary pool exists for the category, summaryLineKey falls back to
        // whatever the server sent (null for these categories in practice, since the pool is empty
        // across all tiers, so no contradiction). `patternTag` is left as the server sent them
        // (FR-010).
        const displayData = acceptedPromoted
          ? { ...data, quality: 'optimal', badge: 'good', summaryLineKey: pickSummaryKeyOrNull('optimal') ?? data.summaryLineKey }
          : acceptedDemoted
          ? { ...data, quality: 'blunder', badge: 'bad', summaryLineKey: pickSummaryKeyOrNull('blunder') ?? data.summaryLineKey }
          : data;
        setEvaluation(displayData);

        // SFX feedback
        if (isCorrect) {
          playSfx('correct_move');
        } else {
          playSfx('wrong_move');
        }

        // Update coach — fall back to quality-aware generic pool when no category-specific key exists.
        // Spec 049 (Epic 9) Finding 1: when the accepted-gate promotes the move to "correct", the
        // server's coachPhraseKey/coachMood were derived from the raw suboptimal quality and would
        // contradict the corrected verdict (a "correct" badge/SFX alongside a hedging "think"-mood
        // coach line — SC-002). Present a congruent optimal-voiced message instead: suppress the
        // suboptimal category phrase (fall back to the optimal generic pool) and force the happy mood.
        const used = usedPhraseKeysRef.current;
        // acceptedDemoted mirrors acceptedPromoted: suppress the server's optimal-voiced
        // coachPhraseKey/coachMood (which would contradict the demoted "wrong" verdict) and fall
        // back to the generic blunder-voiced pool, same mechanism as the promoted case.
        const coachQuality = acceptedPromoted ? 'optimal' : acceptedDemoted ? 'blunder' : (data.quality ?? 'blunder');
        let phraseKey = (acceptedPromoted || acceptedDemoted ? null : data.coachPhraseKey)
          ?? pickRandomKey(t, `coach.spoken.generic.${coachQuality}`, used);
        used.add(phraseKey);
        const moodDefaults = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
        lastCoachKeyRef.current = phraseKey;
        setCoachMessages(prev => [...prev, {
          text: t(phraseKey),
          mood: acceptedPromoted ? 'happy' : acceptedDemoted ? 'oops' : (data.coachMood ?? moodDefaults[data.quality] ?? 'think'),
        }]);

        // Win overlay if optimal win
        if (isCorrect) {
          const winLine = getWinLine(newBoard, row, col, color);
          if (winLine.length >= 4) {
            setOverlays(winLine.map(cell => ({ c: cell.c, r: cell.r, type: 'win' })));
          }
        }

        // Record attempt. Skip for DEV-injector synthetic puzzles (`dev-<movestring>` ids,
        // src/lib/devFixtures.js) — these have no real DB row, so `puzzle_id` isn't a valid uuid
        // and the write 500s (Postgres "invalid input syntax for type uuid"). This is a pre-existing
        // dev-tooling-only gap (unrelated to the spec-049 accepted-gate fix) surfaced while QA-ing
        // via the fixture dropdown/deep-link; guarding here avoids masking real regressions with
        // benign console noise during QA.
        if (!String(current.id).startsWith('dev-')) store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          moves_tried: [col],
          outcome: isCorrect ? 'correct_first' : 'incorrect',
          first_attempt_correct: isCorrect,
          time_ms: Date.now() - startTimeRef.current,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        });
        store?.recordActivityDay().catch(() => {});

        // Analytics
        if (isCorrect) {
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
    const keys = [`coach.spoken.${effectiveCategory}.hint.0`, `coach.spoken.${effectiveCategory}.hint.1`];
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
      // Task 19 fix (finding 16): SagaScreen refetches lesson-progress on every mount
      // (its useEffect deps are empty besides `store`, and it genuinely remounts —
      // SCREENS[key] returns the same stable component reference each time, but the
      // Navigator swaps component *type* on every go(), which React always unmounts
      // and remounts). The stale-map bug was a race: this save fired without being
      // awaited, so go('saga') could land and re-fetch before the write committed —
      // reproducing exactly as "server already agrees, but /saga still shows old
      // state until a manual reload". Await the save (or let it fail loudly) before
      // navigating so the refetch on the new mount always sees the fresh status.
      store.saveLessonProgress(lessonId, 'complete')
        .catch(err => console.error('[ChallengeScreen] saveLessonProgress failed:', err))
        .finally(() => {
          track('lesson_completed', { lessonId });
          go('saga');
        });
      return;
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
    const coachKey = `coach.spoken.forbidden_columns.${quality}.0`;
    lastCoachKeyRef.current = coachKey;
    setCoachMessages(prev => [...prev, { text: t(coachKey, { missed: missedForbidden.length }), mood: quality === 'optimal' ? 'happy' : 'oops' }]);

    store?.recordPuzzleAttempt({
      puzzle_id: current.id,
      device_uuid: 'local',
      // The columns actually selected, not a count — puzzle_attempts.moves_tried is
      // `integer[] NOT NULL` (003_puzzles.sql:28) and Postgres rejects a scalar with
      // "malformed array literal", which the fire-and-forget write path then swallows.
      // No consumer reads this field, so storing the list rather than the count is
      // strictly more information (OI-103 / spec 054 SC-004).
      moves_tried: cols,
      outcome: quality === 'optimal' ? 'correct_first' : 'incorrect',
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
        setEvaluation({ quality: 'optimal', badge: 'good', summaryLineKey: 'coach.spoken.forced_win.optimal.0' });
        lastCoachKeyRef.current = 'coach.spoken.forced_win.optimal.0';
        setCoachMessages(prev => [...prev, { text: t('coach.spoken.forced_win.optimal.0'), mood: 'happy' }]);
        // Highlight both threat cells on double-threat success
        if (data.threatCells && data.threatCells.length > 0) {
          setOverlays(data.threatCells.map(cell => ({ c: cell.c, r: cell.r, type: 'win' })));
        }
        store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          // Array, not a scalar — see the sibling failure-branch write below and OI-103.
          moves_tried: [col],
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
        lastCoachKeyRef.current = data.reason ? null : 'coach.spoken.forced_win.blunder.0';
        setCoachMessages(prev => [...prev, {
          text: data.reason ?? t('coach.spoken.forced_win.blunder.0'),
          mood: 'oops',
        }]);
        store?.recordPuzzleAttempt({
          puzzle_id: current.id,
          device_uuid: 'local',
          // puzzle_attempts.moves_tried is `integer[] NOT NULL` (003_puzzles.sql:28) —
          // a scalar is rejected by Postgres with `malformed array literal` and the
          // insert is then silently swallowed by the fire-and-forget .catch on the
          // write path. Must be an array. (The sibling success write above and the
          // forbidden_columns site were fixed the same way — see OI-103.)
          moves_tried: [col],
          outcome: 'incorrect',
          first_attempt_correct: false,
          time_ms: Date.now() - startTimeRef.current,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        });
        store?.recordActivityDay().catch(() => {});
        track('puzzle_solved_wrong', { puzzleId: current.id, category });
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-lessons)' }}>
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
        display: 'flex', flexDirection: 'column', minHeight: '100dvh',
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
      // height (not minHeight): pins the root so the Toolbar (Hint / Submit /
      // Next →) stays reachable at the viewport bottom. See ConceptScreen.jsx.
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: 'var(--bg-chal)',
    }}>
      {import.meta.env.DEV && <DevBoardInjector onLoad={handleDevLoad} />}

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

      {/* Coach dialog — always visible.
          `fixed` reserves a stable height (140px) so appending the post-move
          feedback bubble scrolls within the coach region instead of growing it
          and pushing the board down (FR-022 board-stability fix — matches the
          GameScreen/ReviewScreen accumulating-messages pattern). */}
      <CoachDialog fixed messages={coachMessages} size={58} />

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
                  zhCells={zhCells}
                />
              </div>
            )
          }
        />
      ) : (
        <>
          {/* Scrollable region: with the root pinned to 100dvh, the board + the
              Tier-1 evaluation strip are the only flexible content, so THEY (not
              just the trailing spacer) must live inside the scroller — the spacer
              is a sibling of the board, not its parent, and cannot rescue an
              over-tall board on its own. flex:1 + minHeight:0 lets this region
              shrink and scroll instead of clipping the board on a short viewport. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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

          {/* Spacer: pushes the Toolbar to the bottom of the scroller when
              content is short. When content is tall, the scroller above
              absorbs the overflow instead. */}
          <div style={{ flex: 1 }} />
          </div>
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
              {t('common.submit', 'Submit')}
            </button>
          ) : (
            <ToolButton
              icon="bulb"
              label={t('common.hint', 'Hint')}
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
          aria-label={sfxEnabled ? t('audio.muteSfx') : t('audio.unmuteSfx')}
          title={sfxEnabled ? t('audio.sfxOn') : t('audio.sfxOff')}
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
          aria-label={musicEnabled ? t('audio.muteMusic') : t('audio.unmuteMusic')}
          title={musicEnabled ? t('audio.musicOn') : t('audio.musicOff')}
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
          aria-label={speechEnabled ? t('audio.muteSpeech') : t('audio.unmuteSpeech')}
          title={speechEnabled ? t('audio.speechOn') : t('audio.speechOff')}
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
