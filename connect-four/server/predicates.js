// Goal predicate evaluator for puzzle categories.
// Each category defines what "correct" means for a puzzle.

const ROWS = 6;
const COLS = 7;

// Returns a fresh board + heights from a move string.
function parseBoard(moveString) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moveString.length; i++) {
    const col = parseInt(moveString[i], 10);
    board[heights[col]][col] = (i % 2 === 0) ? 1 : 2;
    heights[col]++;
  }
  return { board, heights };
}

// Returns the current player: 1 if even moves played, 2 if odd.
function currentPlayer(moveCount) {
  return (moveCount % 2 === 0) ? 1 : 2;
}

// Evaluate a puzzle attempt given the puzzle definition and solver scores.
//
// @param {object} puzzle  - { id, category, moveString, goalPredicateType, goalPredicateParams, cooperativeAiMoves }
// @param {number} candidateCol  - 0-indexed column the user chose
// @param {number[]} scores      - solver scores for all 7 columns
// @returns {{ result: 'correct'|'wrong'|'tied', correctCol?: number, tiedWith?: number[] }}
export function evaluatePredicate(puzzle, candidateCol, scores) {
  const moveCount = puzzle.moveString.length;

  switch (puzzle.category) {
    case 'immediate_threat': return evalImmediateThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_block': return evalForcedBlock(candidateCol, puzzle.moveString);
    case 'double_threat': return evalDoubleThreat(candidateCol, scores, puzzle.moveString);
    case 'forced_win': return evalForcedWin(candidateCol, scores);
    case 'forbidden_columns': return evalForbiddenColumns(candidateCol, scores, puzzle.moveString);
    case 'z_threat': return evalZThreat(candidateCol, puzzle);
    case 'claimeven': return evalClaimeven(candidateCol, puzzle);
    case 'undercut': return evalUndercut(candidateCol, puzzle);
    case 'overcut': return evalOvercut(candidateCol, puzzle);
    case 'figure_7': return evalFigure7(candidateCol, puzzle);
    case 'j_shape': return evalJShape(candidateCol, puzzle);
    case 'odd_even_threat': return evalOddEvenThreat(candidateCol, puzzle);
    default: return { result: 'wrong' };
  }
}

// immediate_threat: Play the immediate winning move.
function evalImmediateThreat(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const player = currentPlayer(moveString.length);
  const winningCols = [];
  for (let i = 0; i < COLS; i++) {
    if (heights[i] >= ROWS) continue;
    board[heights[i]][i] = player;
    if (checkWin(board, heights[i], i, player)) winningCols.push(i);
    board[heights[i]][i] = 0;
  }

  if (winningCols.length === 0) return { result: 'wrong' };
  if (winningCols.includes(candidateCol)) {
    const others = winningCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: winningCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: winningCols[0] };
}

// Returns true if `opponent` has at least one immediately playable winning move.
function opponentWinsImmediately(board, heights, opponent) {
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    board[heights[c]][c] = opponent;
    const wins = checkWin(board, heights[c], c, opponent);
    board[heights[c]][c] = 0;
    if (wins) return true;
  }
  return false;
}

// forced_block: Block the opponent's immediate winning threat.
// Uses direct board checks (not score thresholds) to determine whether the
// opponent can win immediately — avoids the floor/ceil scoring ambiguity.
function evalForcedBlock(candidateCol, moveString) {
  const { board, heights } = parseBoard(moveString);
  const player = currentPlayer(moveString.length);
  const opponent = 3 - player;

  const safeCols = [];
  let hasImmediateThreat = false;
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    board[heights[c]][c] = player;
    heights[c]++;
    const oppWins = opponentWinsImmediately(board, heights, opponent);
    heights[c]--;
    board[heights[c]][c] = 0;
    if (oppWins) {
      hasImmediateThreat = true;
    } else {
      safeCols.push(c);
    }
  }

  if (!hasImmediateThreat || safeCols.length === 0) return { result: 'wrong' };

  if (safeCols.includes(candidateCol)) {
    const others = safeCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: safeCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: safeCols[0] };
}

// double_threat: Create a double threat (≥2 simultaneous winning threats after the move).
function evalDoubleThreat(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const player = currentPlayer(moveCount);

  function getThreatCells(b, h, p) {
    // Returns cells where p has an immediate winning threat (not pre-empted by opponent).
    const opp = 3 - p;
    const cells = [];
    for (let col = 0; col < COLS; col++) {
      const row = h[col];
      if (row >= ROWS) continue;
      b[row][col] = p;
      const playerWins = checkWin(b, row, col, p);
      b[row][col] = 0;
      if (!playerWins) continue;
      b[row][col] = opp;
      const oppWins = checkWin(b, row, col, opp);
      b[row][col] = 0;
      if (!oppWins) cells.push({ col, row });
    }
    return cells;
  }

  function threatCellsAfterMove(col) {
    const row = heights[col];
    if (row >= ROWS) return [];
    const b = board.map(r => [...r]);
    const h = [...heights];
    b[row][col] = player;
    h[col]++;
    return getThreatCells(b, h, player);
  }

  // Find all columns that create ≥2 threats
  const doubleThreatCols = [];
  for (let col = 0; col < COLS; col++) {
    if (scores[col] > 0 && threatCellsAfterMove(col).length >= 2) {
      doubleThreatCols.push(col);
    }
  }

  if (doubleThreatCols.length === 0) {
    // Fallback: positive score moves
    const bestScore = Math.max(...scores.filter(s => s > 0));
    const bestCols = scores.reduce((acc, s, i) => { if (s === bestScore) acc.push(i); return acc; }, []);
    if (bestCols.includes(candidateCol)) {
      return { result: 'tied', tiedWith: bestCols.filter(c => c !== candidateCol), correctCol: bestCols[0] };
    }
    return { result: 'wrong', correctCol: bestCols[0] };
  }

  if (doubleThreatCols.includes(candidateCol)) {
    const others = doubleThreatCols.filter(c => c !== candidateCol);
    const threatCells = threatCellsAfterMove(candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: doubleThreatCols[0], threatCells }
      : { result: 'correct', correctCol: candidateCol, threatCells };
  }
  const threatCells = threatCellsAfterMove(doubleThreatCols[0]);
  return { result: 'wrong', correctCol: doubleThreatCols[0], threatCells };
}

// forced_win: Choose the initiating move in a forced-win sequence (all moves losing, pick the one that forces the win).
function evalForcedWin(candidateCol, scores) {
  if (Math.max(...scores) >= 0) return { result: 'wrong' };

  const maxScore = Math.max(...scores);
  const bestCols = scores.reduce((acc, s, i) => {
    if (s === maxScore) acc.push(i);
    return acc;
  }, []);

  if (bestCols.includes(candidateCol)) {
    const others = bestCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: bestCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: bestCols[0] };
}

// forbidden_columns: Identify columns that would hand the opponent an immediate win.
// A column is forbidden if: Red plays there (and does NOT win), and then Yellow plays
// in that same column one row above and wins.
function evalForbiddenColumns(candidateCol, scores, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const red = currentPlayer(moveCount);
  const yellow = 3 - red;

  const forbiddenCols = [];
  for (let c = 0; c < COLS; c++) {
    const h = heights[c];
    if (h >= ROWS || h + 1 >= ROWS) continue;
    const b = board.map(r => [...r]);
    b[h][c] = red;
    if (checkWin(b, h, c, red)) continue;
    b[h + 1][c] = yellow;
    if (checkWin(b, h + 1, c, yellow)) forbiddenCols.push(c);
  }

  if (forbiddenCols.length === 0) return { result: 'wrong', forbiddenCols: [] };
  if (forbiddenCols.includes(candidateCol)) return { result: 'wrong', forbiddenCols };
  return { result: 'correct', forbiddenCols };
}

// ── New category evaluators (T012) ───────────────────────────────────────────

// z_threat: correct column is stored in highlightMetadata.column
function evalZThreat(candidateCol, puzzle) {
  const correctCol = puzzle.highlightMetadata?.column;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// claimeven: correct column stored as correctCol on puzzle
function evalClaimeven(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// undercut: any column except the killing_threat column is correct
function evalUndercut(candidateCol, puzzle) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const killing = cells.find(c => c.role === 'killing_threat');
  if (!killing) return { result: 'wrong' };
  if (candidateCol === killing.column) return { result: 'wrong', correctCol: null };
  return { result: 'correct' };
}

// overcut: must play the major_threat column
function evalOvercut(candidateCol, puzzle) {
  const cells = puzzle.highlightMetadata?.cells;
  if (!cells) return { result: 'wrong' };
  const major = cells.find(c => c.role === 'major_threat');
  if (!major) return { result: 'wrong' };
  if (candidateCol === major.column) return { result: 'correct', correctCol: major.column };
  return { result: 'wrong', correctCol: major.column };
}

// figure_7: correct column stored as correctCol on puzzle
function evalFigure7(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// j_shape: correct column stored as correctCol on puzzle
function evalJShape(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// odd_even_threat: correct column stored as correctCol on puzzle
function evalOddEvenThreat(candidateCol, puzzle) {
  const correctCol = puzzle.correctCol;
  if (correctCol === undefined || correctCol === null) return { result: 'wrong' };
  if (candidateCol === correctCol) return { result: 'correct', correctCol };
  return { result: 'wrong', correctCol };
}

// ── Board utilities ───────────────────────────────────────────────────────────

function checkWin(board, row, col, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let d = 1; d <= 3; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cnt++;
      else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cnt++;
      else break;
    }
    if (cnt >= 4) return true;
  }
  return false;
}
