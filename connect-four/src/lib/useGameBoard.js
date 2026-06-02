import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { buildBoard, checkWin } from './board.js';
import {
  INVALID_MOVE,
  DIFFICULTY_TEMPERATURES,
  MISTAKE_RATES,
  sampleColumnFromScores,
  secondBestColumn,
} from './aiDifficulty.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Pick a random i18n key from a prefixed pool (e.g. 'coach.sparring.ai_move')
 * by probing t(key + '.0'), t(key + '.1'), ... until t() returns the key itself (not found).
 */
function pickRandomKey(t, prefix) {
  const indices = [];
  for (let i = 0; i < 10; i++) {
    const fullKey = `${prefix}.${i}`;
    if (t(fullKey) !== fullKey) indices.push(i);
  }
  if (indices.length === 0) return `${prefix}.0`;
  const idx = indices[Math.floor(Math.random() * indices.length)];
  return `${prefix}.${idx}`;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {{
 *   initialMoves?: string,       // movestring to start from ('' = empty board)
 *   side: 'first' | 'second',
 *   difficulty: string,
 *   onGameEnd?: (result: string, finalMoves: number[]) => void
 * }} opts
 */
export function useGameBoard({ initialMoves = '', side, difficulty, onGameEnd, introKey = 'coach.sparring.intro' }) {
  const { t } = useTranslation();

  // ── State ──────────────────────────────────────────────────────
  const [moveHistory, setMoveHistory] = useState(
    () => initialMoves ? initialMoves.split('').map(Number) : []
  );
  const [coachMessages, setCoachMessages] = useState([]); // {text, mood}[]
  const [hintOverlays, setHintOverlays] = useState([]);   // {c, r, type}[]
  const [gameOver, setGameOver] = useState(null);         // {result, winnerColor} | null
  const [aiThinking, setAiThinking] = useState(false);
  const [lastDrop, setLastDrop] = useState(null);         // {c, r} | null
  const [hintActive, setHintActive] = useState(false);
  const [preHintCoach, setPreHintCoach] = useState(null); // snapshot before hint toggle

  // ── Derived values ─────────────────────────────────────────────
  const userColor = side === 'first' ? 'red' : 'yellow';
  const aiColor = side === 'first' ? 'yellow' : 'red';
  const userTurn =
    moveHistory.length % 2 === (side === 'first' ? 0 : 1);

  const { board, heights } = buildBoard(moveHistory.join(''));
  const fullCols = heights
    .map((h, i) => (h >= 6 ? i : -1))
    .filter((i) => i !== -1);

  // ── Helpers ────────────────────────────────────────────────────
  function updateCoach(text, mood, replace = false) {
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
      const key = pickRandomKey(t, 'coach.sparring.hint.generic');
      updateCoach(t(key), 'think');
    } catch (e) {
      // Silently handle network errors
    }
  }

  // ── Effects ────────────────────────────────────────────────────
  // Show intro phrase on mount
  useEffect(() => {
    const key = pickRandomKey(t, introKey);
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
  async function commitAiMove(currentMoves, aiCol, isDeliberate) {
    const newHistory = [...currentMoves, aiCol];
    const { board: newBoard, heights: newHeights } = buildBoard(
      newHistory.join(''),
    );
    const row = newHeights[aiCol] - 1;

    setMoveHistory(newHistory);
    setLastDrop({ c: aiCol, r: row });

    // Coach phrase — replace intro on side='second' opening
    const phrasePool = isDeliberate
      ? 'coach.sparring.deliberate_mistake'
      : 'coach.sparring.ai_move';
    const phraseKey = pickRandomKey(t, phrasePool);
    const replace = currentMoves.length === 0 && side === 'second';
    updateCoach(t(phraseKey), isDeliberate ? 'oops' : 'think', replace);

    // Check AI win
    if (checkWin(newBoard, row, aiCol, aiColor)) {
      setGameOver({ result: 'loss', winnerColor: aiColor });
      updateCoach(t('sparring.aiWon'), 'oops');
      onGameEnd?.('loss', newHistory);
      return;
    }

    // Check draw
    if (newHistory.length === 42) {
      setGameOver({ result: 'draw' });
      updateCoach(t('sparring.draw'), 'think');
      onGameEnd?.('draw', newHistory);
      return;
    }
  }

  async function makeAiMove(currentMoves) {
    const movesStr = currentMoves.join('');
    const { heights: curHeights } = buildBoard(movesStr);

    const shouldMistake =
      Math.random() < MISTAKE_RATES[difficulty];
    let aiCol = null;
    let isDeliberate = false;

    // 1. Get solver scores
    let scores;
    try {
      const res = await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: movesStr }),
      });
      const data = await res.json();
      scores = data.scores;
    } catch (e) {
      // Network/API error — pick a random legal column as fallback
      const legalCols = [];
      for (let c = 0; c < 7; c++) {
        if (curHeights[c] < 6) legalCols.push(c);
      }
      aiCol =
        legalCols.length > 0
          ? legalCols[Math.floor(Math.random() * legalCols.length)]
          : 3;
      await commitAiMove(currentMoves, aiCol, false);
      return;
    }

    // 2. Guard: one legal column only
    const legalCount = scores.filter((s) => s > INVALID_MOVE).length;

    // Dev log: trace deliberate mistake triggers
    if (import.meta.env.DEV && shouldMistake) {
      console.log('[deliberate_mistake] trigger fired', { difficulty, legalCount, secondBest: secondBestColumn(scores) });
    }

    // 3. Deliberate mistake
    if (shouldMistake && legalCount > 1) {
      const secondBest = secondBestColumn(scores);
      if (secondBest !== null) {
        aiCol = secondBest;
        isDeliberate = true;
      }
    }

    // 4. Normal move (temperature-based sampling)
    if (aiCol === null) {
      const temp = DIFFICULTY_TEMPERATURES[difficulty];
      aiCol = sampleColumnFromScores(scores, temp);
    }

    await commitAiMove(currentMoves, aiCol, isDeliberate);
  }

  // ── User move handler ──────────────────────────────────────────
  async function handleColumnClick(col) {
    if (!userTurn || gameOver || aiThinking) return;
    if (heights[col] >= 6) return; // full column guard

    // 1. Clear hint
    setHintOverlays([]);
    setHintActive(false);
    setPreHintCoach(null);

    // 2. Compute pre-move movestring and commit the move
    const preMoveString = moveHistory.join('');
    const newHistory = [...moveHistory, col];
    const row = heights[col]; // landing row before disc is placed

    // 3. Commit-first — show disc immediately
    setMoveHistory(newHistory);
    setLastDrop({ c: col, r: row });

    // 4. Call evaluate-move for Coach feedback
    const { board: newBoard } = buildBoard(newHistory.join(''));
    try {
      const res = await fetch(`${API}/api/evaluate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: preMoveString, col }),
      });
      const data = await res.json();

      let coachText;
      let coachMood = 'happy';
      if (data.coachPhraseKey) {
        coachText = t(data.coachPhraseKey);
        coachMood = data.coachMood || 'happy';
      } else {
        // Fallback: random generic phrase
        const key = pickRandomKey(
          t,
          'coach.sparring.user_move.generic',
        );
        coachText = t(key);
      }
      updateCoach(coachText, coachMood);
    } catch (_e) {
      // Silently handle network errors
    }

    // 5. Check win
    if (checkWin(newBoard, row, col, userColor)) {
      setGameOver({ result: 'win', winnerColor: userColor });
      updateCoach(t('sparring.youWon'), 'happy');
      onGameEnd?.('win', newHistory);
      return;
    }

    // 6. Check draw
    if (newHistory.length === 42) {
      setGameOver({ result: 'draw' });
      updateCoach(t('sparring.draw'), 'think');
      onGameEnd?.('draw', newHistory);
      return;
    }

    // 7. AI's turn
    setAiThinking(true);
    await delay(400);
    await makeAiMove(newHistory);
    setAiThinking(false);
  }

  // ── Resign ──────────────────────────────────────────────────────
  function handleResign() {
    if (gameOver) return;
    setAiThinking(false);
    setGameOver({ result: 'loss' });
    updateCoach(t('sparring.aiWon'), 'oops');
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
    handleColumnClick,
    handleHintToggle,
    handleResign,
    userColor,
    aiColor,
    userTurn,
  };
}
