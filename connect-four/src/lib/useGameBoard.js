import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { buildBoard } from './board.js';
import { useBoardState } from './useBoardState.js';
import { pickRandomKey } from './coachUtils.js';
import { delay, COACH_PACING_MS, INVALID_MOVE } from './constants.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * @param {{
 *   initialMoves?: string,       // movestring to start from ('' = empty board)
 *   side: 'first' | 'second',
 *   difficulty: string,
 *   onGameEnd?: (result: string, finalMoves: number[]) => void
 * }} opts
 */
export function useGameBoard({ initialMoves = '', side, difficulty, onGameEnd, introKey = 'coach.spoken.sparring.intro' }) {
  const { t } = useTranslation();

  // ── Board state (pure mechanics, extracted to useBoardState) ───
  const {
    moveHistory,
    board,
    heights,
    fullCols,
    lastDrop,
    gameOver: boardGameOver,
    userTurn,
    userColor,
    commitMove,
  } = useBoardState({ initialMoves, side });

  // ── Additional state ───────────────────────────────────────────
  const [coachMessages, setCoachMessages] = useState([]); // {text, mood}[]
  const [hintOverlays, setHintOverlays] = useState([]);   // {c, r, type}[]
  const [aiThinking, setAiThinking] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const [preHintCoach, setPreHintCoach] = useState(null); // snapshot before hint toggle
  // Resign sets gameOver externally (useBoardState only sets it on win/draw)
  const [resignedOver, setResignedOver] = useState(null);

  // Effective gameOver: resign layered on top of board-detected win/draw
  const gameOver = resignedOver ?? boardGameOver;

  // ── Derived values ─────────────────────────────────────────────
  const aiColor = side === 'first' ? 'yellow' : 'red';

  // Mirrors live move count so commitAiMove can guard against concurrent calls.
  const moveCountRef = useRef(moveHistory.length);
  moveCountRef.current = moveHistory.length;

  // Tracks phrase keys used in this game to avoid repetition within a session.
  const usedPhraseKeysRef = useRef(new Set());
  const trackPhrase = (key) => { usedPhraseKeysRef.current.add(key); return key; };

  // Last i18n key pushed as a coach message — consumed by useCoachSpeech.
  const lastCoachKeyRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────
  function updateCoach(text, mood, replace = false, key = null) {
    if (key) lastCoachKeyRef.current = key;
    setCoachMessages((prev) =>
      replace ? [{ text, mood }] : [...prev, { text, mood }],
    );
  }

  // ── Hint toggle ────────────────────────────────────────────────
  async function handleHintToggle() {
    if (hintActive) {
      // Toggle OFF: clear overlays, restore previous coach message
      setHintOverlays([]);
      setHintActive(false);
      if (preHintCoach) {
        setCoachMessages(preHintCoach);
        setPreHintCoach(null);
      }
      return;
    }

    // Toggle ON
    setHintActive(true);
    setPreHintCoach(coachMessages);

    try {
      const res = await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: moveHistory.join('') }),
      });
      const { scores } = await res.json();

      // Find all columns tied at the best score
      const validScores = scores.filter((s) => s > INVALID_MOVE);
      if (validScores.length === 0) return;
      const maxScore = Math.max(...validScores);
      const bestCols = [];
      for (let c = 0; c < 7; c++) {
        if (scores[c] > INVALID_MOVE && scores[c] === maxScore) {
          bestCols.push({ c, r: heights[c], type: 'tg' });
        }
      }
      setHintOverlays(bestCols);

      // Show generic hint phrase
      const key = trackPhrase(pickRandomKey(t, 'coach.spoken.sparring.hint.generic', usedPhraseKeysRef.current));
      updateCoach(t(key), 'think', false, key);
    } catch {
      // Silently handle network errors
    }
  }

  // ── Effects ────────────────────────────────────────────────────
  // Show intro phrase on mount
  useEffect(() => {
    const key = pickRandomKey(t, introKey);
    lastCoachKeyRef.current = key;
    setCoachMessages([{ text: t(key), mood: 'happy' }]);
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play AI opening when side='second' and starting from an empty board
  useEffect(() => {
    if (side === 'second' && initialMoves === '') {
      setAiThinking(true);
      makeAiMove([]).then(() => setAiThinking(false));
    }
    // Intentionally run only on mount — initial closure captures correct values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AI move logic ──────────────────────────────────────────────
  // commitAiMove uses commitMove which is STABLE (reads via internal refs),
  // so calling it with any currentMoves is safe from async closures.
  async function commitAiMove(currentMoves, aiCol, classificationPromise) {
    // Idempotency guard: if the board has already advanced beyond the position
    // we were called for, a concurrent invocation already committed — bail out.
    if (moveCountRef.current !== currentMoves.length) return;

    // commitMove reads live state via internal refs in useBoardState —
    // no stale-closure risk even though this runs after an async await.
    const { won, draw } = commitMove(aiCol);
    const newHistory = [...currentMoves, aiCol];

    // Await classification result (null on network error / HTTP error / auto-play skip)
    const classification = await classificationPromise;

    // Quality-gated coach phrase selection (FR-007)
    let phraseKey, mood;
    const patternPool = classification?.patternTag
      ? `coach.spoken.ai_move.${classification.patternTag}`
      : null;

    const used = usedPhraseKeysRef.current;
    if (!classification) {
      // Null classification (network error, HTTP error, missing quality, or auto-play skip)
      phraseKey = trackPhrase(pickRandomKey(t, 'coach.spoken.ai_move.neutral', used));
      mood = 'think';
    } else if (classification.quality !== 'optimal') {
      // Suboptimal or blunder AI move → suboptimal pool
      phraseKey = trackPhrase(pickRandomKey(t, 'coach.spoken.ai_move.suboptimal', used));
      mood = 'oops';
    } else if (patternPool) {
      // Quality is optimal, patternTag is non-null — probe pool existence
      const probe = `${patternPool}.0`;
      if (t(probe) !== probe) {
        phraseKey = trackPhrase(pickRandomKey(t, patternPool, used));
        mood = 'think';
      } else {
        phraseKey = trackPhrase(pickRandomKey(t, 'coach.spoken.ai_move.neutral', used));
        mood = 'think';
      }
    } else {
      // Optimal quality but no patternTag → neutral fallback
      phraseKey = trackPhrase(pickRandomKey(t, 'coach.spoken.ai_move.neutral', used));
      mood = 'think';
    }

    // FR-008: preserve intro-replacement when side='second' and empty board
    const replace = currentMoves.length === 0 && side === 'second';
    updateCoach(t(phraseKey), mood, replace, phraseKey);

    // Check AI win — from commitMove return value
    if (won) {
      updateCoach(t('sparring.aiWon'), 'oops', false, 'coach.spoken.sparring.outcome.loss');
      onGameEnd?.('loss', newHistory);
      return;
    }

    // Check draw
    if (draw) {
      updateCoach(t('sparring.draw'), 'think', false, 'coach.spoken.sparring.outcome.draw');
      onGameEnd?.('draw', newHistory);
      return;
    }
  }

  async function makeAiMove(currentMoves) {
    const movesStr = currentMoves.join('');
    const { heights: curHeights } = buildBoard(movesStr);

    // Coach commentary for the AI's move — classify the chosen column just before
    // committing. Skipped on the opening auto-play; null on any error → neutral phrase.
    const classifyFor = (aiCol) =>
      (currentMoves.length === 0 && side === 'second')
        ? Promise.resolve(null)   // opening auto-play: skip (FR-005 exception / FR-009)
        : fetch(`${API}/api/evaluate-move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movestring: movesStr, col: aiCol, aiMove: true }),
          })
          .then(async r => {
            if (!r.ok) return null;          // HTTP 4xx/5xx → neutral fallback (SC-006)
            const data = await r.json();
            return data.quality !== undefined ? data : null; // missing quality → neutral fallback
          })
          .catch(() => null);     // network error → neutral fallback (SC-006)

    // Move selection is server-side (chooseSparringMove): POST the difficulty and
    // play the column it returns.
    let aiCol;
    try {
      const res = await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: movesStr, difficulty }),
      });
      const data = await res.json();
      if (typeof data.col !== 'number') throw new Error('missing col in /api/scores response');
      aiCol = data.col;
    } catch {
      // Network/API error — pick a random legal column as fallback.
      const legalCols = [];
      for (let c = 0; c < 7; c++) {
        if (curHeights[c] < 6) legalCols.push(c);
      }
      aiCol = legalCols.length > 0
        ? legalCols[Math.floor(Math.random() * legalCols.length)]
        : 3;
    }

    await commitAiMove(currentMoves, aiCol, classifyFor(aiCol));
  }

  // ── User move handler ──────────────────────────────────────────
  async function handleColumnClick(col) {
    if (!userTurn || gameOver || aiThinking) return;
    if (heights[col] >= 6) return; // full column guard

    // 1. Clear hint
    setHintOverlays([]);
    setHintActive(false);
    setPreHintCoach(null);

    // 2. Capture pre-move state for coach feedback and AI
    const preMoveString = moveHistory.join('');
    const newHistory = [...moveHistory, col];

    // 3. Commit via useBoardState — sets moveHistory, lastDrop, gameOver atomically
    const { won, draw } = commitMove(col);

    // 4. Call evaluate-move for Coach feedback
    try {
      const res = await fetch(`${API}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: preMoveString, col }),
      });
      const data = await res.json();

      let coachKey = null;
      let coachText;
      let coachMood = 'happy';
      const used = usedPhraseKeysRef.current;
      if (data.coachPhraseKey) {
        coachKey = trackPhrase(data.coachPhraseKey);
        coachText = t(coachKey);
        coachMood = data.coachMood || 'happy';
      } else if (data.quality === 'blunder') {
        // Fallback for blunders without category-specific keys:
        // use the generic blunder pool so the coach signals the mistake
        coachKey = trackPhrase(pickRandomKey(t, 'coach.spoken.generic.blunder', used));
        coachText = t(coachKey);
        coachMood = data.coachMood || 'oops';
      } else {
        // Fallback: random generic phrase for non-blunder moves (FR-011)
        coachKey = trackPhrase(pickRandomKey(t, `coach.spoken.generic.${data.quality ?? 'blunder'}`, used));
        coachText = t(coachKey);
      }
      updateCoach(coachText, coachMood, false, coachKey);
    } catch {
      // Silently handle network errors
    }

    // 5. Check win (from commitMove return value)
    if (won) {
      updateCoach(t('sparring.youWon'), 'happy', false, 'coach.spoken.sparring.outcome.win');
      onGameEnd?.('win', newHistory);
      return;
    }

    // 6. Check draw
    if (draw) {
      updateCoach(t('sparring.draw'), 'think', false, 'sparring.draw');
      onGameEnd?.('draw', newHistory);
      return;
    }

    // 7. AI's turn
    setAiThinking(true);
    await delay(COACH_PACING_MS);
    await makeAiMove(newHistory);
    setAiThinking(false);
  }

  // ── Resign ──────────────────────────────────────────────────────
  function handleResign() {
    if (gameOver) return;
    // OI-163: there is no game to resign before the first move. Resigning at move 0 used to fire
    // onGameEnd('loss', []), which is the single seam that (a) POSTs /api/games with moves: ''
    // — 400'd by the server, id swallowed — (b) writes the LOCAL sparring record anyway, and
    // (c) navigates to the post-game review with a null id (`/game/null`). Refusing here keeps
    // local and server state in agreement: no row, no local loss, no review of a game that never
    // happened. The player is not trapped — the TopBar Back control leaves the screen.
    if (moveHistory.length === 0) {
      updateCoach(t('sparring.resignNoMoves'), 'think', false, 'sparring.resignNoMoves');
      return;
    }
    setAiThinking(false);
    // useBoardState only sets gameOver on win/draw — resign uses local override
    setResignedOver({ result: 'loss' });
    updateCoach(t('sparring.aiWon'), 'oops', false, 'coach.spoken.sparring.outcome.loss');
    onGameEnd?.('loss', moveHistory);
  }

  return {
    moveHistory,
    board,
    heights,
    fullCols,
    lastDrop,
    aiThinking,
    gameOver,
    hintOverlays,
    hintActive,
    coachMessages,
    lastCoachKeyRef,
    handleColumnClick,
    handleHintToggle,
    handleResign,
    userColor,
    aiColor,
    userTurn,
  };
}
