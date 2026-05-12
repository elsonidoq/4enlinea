// Goal predicate evaluator for all 6 puzzle categories.
// Each category defines what "correct" means for a puzzle.

const ROWS = 6;
const COLS = 7;

function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

// Returns a fresh board + heights from a move string.
function parseBoard(moveString) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moveString.length; i++) {
    const col = parseInt(moveString[i], 10) - 1;
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
  const winScore = immediateWinScore(moveCount);

  switch (puzzle.category) {
    case 'immediate_threat': return evalImmediateThreat(candidateCol, scores, winScore);
    case 'forced_block': return evalForcedBlock(candidateCol, scores, winScore, moveCount);
    case 'double_threat': return evalDoubleThreat(candidateCol, scores, winScore, puzzle.moveString);
    case 'fork_setup': return evalForkSetup(candidateCol, scores, winScore);
    case 'zugzwang': return evalZugzwang(candidateCol, scores);
    case 'parity_control': return evalParityControl(candidateCol, scores, winScore);
    case 'forbidden_columns': return evalForbiddenColumns(candidateCol, scores, puzzle.moveString);
    default: return { result: 'wrong' };
  }
}

// immediate_threat: Play the immediate winning move.
function evalImmediateThreat(candidateCol, scores, winScore) {
  const winningCols = scores.reduce((acc, s, i) => {
    if (s >= winScore && s > 0) acc.push(i);  // Bug 1 fix: >= not ===
    return acc;
  }, []);

  if (winningCols.length === 0) return { result: 'wrong' };
  if (winningCols.includes(candidateCol)) {
    const others = winningCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: winningCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: winningCols[0] };
}

// forced_block: Block the opponent's immediate winning threat.
function evalForcedBlock(candidateCol, scores, winScore, moveCount) {
  const opponentImmediateWin = -Math.floor((41 - moveCount) / 2);
  const blockingCols = scores.reduce((acc, s, i) => {
    if (s >= 0) acc.push(i);
    return acc;
  }, []);

  // Bug 2 fix: all non-blocking moves must equal opponentImmediateWin,
  // otherwise there's no forced block (it might be zugzwang or a different category).
  if (blockingCols.length === 0) return { result: 'wrong' };

  const allOthersAreImmediateLoss = scores.every(
    (s, i) => blockingCols.includes(i) || s === opponentImmediateWin
  );
  if (!allOthersAreImmediateLoss) return { result: 'wrong' };

  if (blockingCols.includes(candidateCol)) {
    const others = blockingCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: blockingCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: blockingCols[0] };
}

// double_threat: Create a double threat (≥2 simultaneous winning threats after the move).
function evalDoubleThreat(candidateCol, scores, winScore, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const player = currentPlayer(moveCount);

  function countThreats(b, h, p) {
    // Bug 3 fix: skip threats where the opponent would win first by playing there.
    const opp = 3 - p;
    let threats = 0;
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
      if (!oppWins) threats++;
    }
    return threats;
  }

  function threatsAfterMove(col) {
    const row = heights[col];
    if (row >= ROWS) return 0;
    const b = board.map(r => [...r]);
    const h = [...heights];
    b[row][col] = player;
    h[col]++;
    return countThreats(b, h, player);
  }

  // Find all columns that create ≥2 threats
  const doubleThreatCols = [];
  for (let col = 0; col < COLS; col++) {
    if (scores[col] > 0 && threatsAfterMove(col) >= 2) {
      doubleThreatCols.push(col);
    }
  }

  if (doubleThreatCols.length === 0) {
    // Fallback: positive score moves
    const posCols = scores.reduce((acc, s, i) => { if (s > 0) acc.push(i); return acc; }, []);
    const bestScore = Math.max(...scores.filter(s => s > 0));
    const bestCols = scores.reduce((acc, s, i) => { if (s === bestScore) acc.push(i); return acc; }, []);
    if (bestCols.includes(candidateCol)) {
      return { result: 'tied', tiedWith: bestCols.filter(c => c !== candidateCol), correctCol: bestCols[0] };
    }
    return { result: 'wrong', correctCol: bestCols[0] };
  }

  if (doubleThreatCols.includes(candidateCol)) {
    const others = doubleThreatCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: doubleThreatCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: doubleThreatCols[0] };
}

// fork_setup: Play the move that creates a multi-path fork (3+ winning columns).
function evalForkSetup(candidateCol, scores, winScore) {
  // Bug 4 fix: exclude immediate wins with s >= winScore (not s !== winScore)
  const maxScore = Math.max(...scores.filter(s => s > 0 && s < winScore));
  if (!isFinite(maxScore) || maxScore <= 0) return { result: 'wrong' };

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
  if (scores[candidateCol] > 0 && scores[candidateCol] < winScore) {
    return { result: 'tied', tiedWith: bestCols, correctCol: bestCols[0] };
  }
  return { result: 'wrong', correctCol: bestCols[0] };
}

// zugzwang: Choose the best move in a zugzwang (all moves losing, pick least bad).
function evalZugzwang(candidateCol, scores) {
  // Bug 5 fix: zugzwang requires all scores to be non-positive
  if (Math.max(...scores) > 0) return { result: 'wrong' };

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

// parity_control: Choose the move that best controls parity (positive score ≥ average positive).
function evalParityControl(candidateCol, scores, winScore) {
  const posScores = scores.filter(s => s > 0 && s < winScore);
  // Bug 6 fix: need ≥2 positive moves for parity to be a meaningful choice
  if (posScores.length < 2) return { result: 'wrong' };

  const avg = posScores.reduce((a, b) => a + b, 0) / posScores.length;
  const bestScore = Math.max(...posScores);
  const aboveAvgCols = scores.reduce((acc, s, i) => {
    if (s > 0 && s < winScore && s >= avg) acc.push(i);
    return acc;
  }, []);

  if (aboveAvgCols.includes(candidateCol)) {
    const others = aboveAvgCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: aboveAvgCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  // Below average but still positive — wrong
  return { result: 'wrong', correctCol: aboveAvgCols[0] };
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
