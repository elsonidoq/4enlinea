import { useState, useRef, useCallback } from 'react';
import { buildBoard, checkWin } from './board.js';

/**
 * Pure board mechanics hook — no AI, no coach, no side effects.
 *
 * commitMove(col) returns { won, draw, row, color } so the caller can branch on
 * end-of-game outcomes without any onGameEnd callback. This avoids the double-fire
 * problem where async coach/AI handling interleaves with win detection.
 *
 * commitMove is STABLE (no deps in useCallback) — it reads live values via
 * internal refs. This means it is safe to call from long-lived async closures
 * (WebSocket onmessage, setTimeout, AI awaits) without stale-closure risk.
 *
 * WebSocket onmessage safety: even though commitMove itself is stable, other
 * derived values (moveHistory, heights, gameOver) are recreated each render.
 * Any code in a long-lived closure that needs to READ these (not just write via
 * commitMove) must use a ref updated each render:
 *
 *   const boardApiRef = useRef(null);
 *   boardApiRef.current = { commitMove, heights, gameOver, moveHistory };
 *
 * @param {{ initialMoves?: string, side: 'first'|'second' }} opts
 * @returns {{
 *   moveHistory: number[],
 *   board: string[][],
 *   heights: number[],
 *   fullCols: number[],
 *   lastDrop: {c: number, r: number} | null,
 *   gameOver: {result: 'win'|'loss'|'draw', winnerColor?: string} | null,
 *   userTurn: boolean,
 *   userColor: 'red'|'yellow',
 *   commitMove: (col: number) => {won: boolean, draw: boolean, row: number, color: string},
 *   reset: (newSide?: 'first'|'second') => void,
 * }}
 */
export function useBoardState({ initialMoves = '', side: initialSide }) {
  const [moveHistory, setMoveHistory] = useState(
    () => (initialMoves ? initialMoves.split('').map(Number) : [])
  );
  const [lastDrop, setLastDrop] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [side, setSide] = useState(initialSide);

  // Internal refs so commitMove is stable (no stale-closure risk in async paths)
  const moveHistoryRef = useRef(moveHistory);
  moveHistoryRef.current = moveHistory;
  const sideRef = useRef(side);
  sideRef.current = side;

  // Derived values
  const { board, heights } = buildBoard(moveHistory.join(''));
  const fullCols = heights.map((h, i) => (h >= 6 ? i : -1)).filter((i) => i !== -1);
  const userColor = side === 'first' ? 'red' : 'yellow';
  const userTurn = moveHistory.length % 2 === (side === 'first' ? 0 : 1);

  // heights ref for stable commitMove
  const heightsRef = useRef(heights);
  heightsRef.current = heights;

  /**
   * Commit a move. STABLE — safe to call from async closures.
   * Always reads live board state via internal refs.
   *
   * @param {number} col
   * @returns {{ won: boolean, draw: boolean, row: number, color: string }}
   */
  const commitMove = useCallback((col) => {
    const currentMoveHistory = moveHistoryRef.current;
    const currentHeights = heightsRef.current;
    const currentSide = sideRef.current;

    const row = currentHeights[col];
    const newHistory = [...currentMoveHistory, col];
    const { board: newBoard } = buildBoard(newHistory.join(''));

    // Color of the disc just placed (parity before appending)
    const colorJustPlayed = currentMoveHistory.length % 2 === 0 ? 'red' : 'yellow';

    setMoveHistory(newHistory);
    setLastDrop({ c: col, r: row });

    const won = checkWin(newBoard, row, col, colorJustPlayed);
    const draw = !won && newHistory.length === 42;

    if (won) {
      const result =
        currentSide === 'first'
          ? colorJustPlayed === 'red'
            ? 'win'
            : 'loss'
          : colorJustPlayed === 'yellow'
          ? 'win'
          : 'loss';
      setGameOver({ result, winnerColor: colorJustPlayed });
    } else if (draw) {
      setGameOver({ result: 'draw' });
    }

    return { won, draw, row, color: colorJustPlayed };
  }, []); // stable — reads via refs

  /**
   * Reset board to initial state. Optionally update side.
   * STABLE.
   */
  const reset = useCallback((newSide) => {
    setMoveHistory([]);
    setLastDrop(null);
    setGameOver(null);
    if (newSide !== undefined) {
      setSide(newSide);
      sideRef.current = newSide;
    }
  }, []);

  return {
    moveHistory,
    board,
    heights,
    fullCols,
    lastDrop,
    gameOver,
    userTurn,
    userColor,
    commitMove,
    reset,
  };
}
