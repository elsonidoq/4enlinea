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
    case 1: return evalCat1(candidateCol, scores, winScore);
    case 2: return evalCat2(candidateCol, scores, winScore, moveCount);
    case 3: return evalCat3(candidateCol, scores, winScore, puzzle.moveString);
    case 4: return evalCat4(candidateCol, scores, winScore);
    case 5: return evalCat5(candidateCol, scores);
    case 6: return evalCat6(candidateCol, scores, winScore);
    default: return { result: 'wrong' };
  }
}

// Cat 1: Play the immediate winning move.
function evalCat1(candidateCol, scores, winScore) {
  const winningCols = scores.reduce((acc, s, i) => {
    if (s === winScore && s > 0) acc.push(i);
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

// Cat 2: Block the opponent's immediate winning threat.
function evalCat2(candidateCol, scores, winScore, moveCount) {
  // The blocking square(s): the opponent's immediate win squares.
  // After current player skips, the opponent would play at these squares to win.
  // Since we're calling from current player's perspective, we look for the squares
  // where NOT playing allows opponent an immediate win.
  // The forced block is the square(s) with score >= 0 while all others are deeply negative.
  const opponentImmediateWin = -Math.floor((41 - moveCount) / 2);
  const blockingCols = scores.reduce((acc, s, i) => {
    if (s >= 0) acc.push(i);
    return acc;
  }, []);

  if (blockingCols.length === 0) {
    // All moves lose — pick the best (least bad)
    const maxScore = Math.max(...scores);
    const bestCols = scores.reduce((acc, s, i) => { if (s === maxScore) acc.push(i); return acc; }, []);
    if (bestCols.includes(candidateCol)) {
      return bestCols.length > 1
        ? { result: 'tied', tiedWith: bestCols.filter(c => c !== candidateCol), correctCol: bestCols[0] }
        : { result: 'correct', correctCol: candidateCol };
    }
    return { result: 'wrong', correctCol: bestCols[0] };
  }

  if (blockingCols.includes(candidateCol)) {
    const others = blockingCols.filter(c => c !== candidateCol);
    return others.length > 0
      ? { result: 'tied', tiedWith: others, correctCol: blockingCols[0] }
      : { result: 'correct', correctCol: candidateCol };
  }
  return { result: 'wrong', correctCol: blockingCols[0] };
}

// Cat 3: Create a double threat (≥2 simultaneous winning threats after the move).
function evalCat3(candidateCol, scores, winScore, moveString) {
  const { board, heights } = parseBoard(moveString);
  const moveCount = moveString.length;
  const player = currentPlayer(moveCount);

  function countThreats(b, h, p) {
    let threats = 0;
    for (let col = 0; col < COLS; col++) {
      const row = h[col];
      if (row >= ROWS) continue;
      b[row][col] = p;
      if (checkWin(b, row, col, p)) threats++;
      b[row][col] = 0;
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

// Cat 4: Play the move that creates a multi-path fork (3+ winning columns).
function evalCat4(candidateCol, scores, winScore) {
  // Best positive score that is not an immediate win
  const maxScore = Math.max(...scores.filter(s => s > 0 && s !== winScore));
  if (maxScore <= 0) {
    // All moves are draws or losses — no clear correct answer
    return { result: 'wrong' };
  }
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
  // If the candidate is still positive (though not best), treat as tied
  if (scores[candidateCol] > 0 && scores[candidateCol] !== winScore) {
    return { result: 'tied', tiedWith: bestCols, correctCol: bestCols[0] };
  }
  return { result: 'wrong', correctCol: bestCols[0] };
}

// Cat 5: Choose the best move in a zugzwang (all moves losing, pick least bad).
function evalCat5(candidateCol, scores) {
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

// Cat 6: Choose the move that best controls parity (positive score ≥ average positive).
function evalCat6(candidateCol, scores, winScore) {
  const posScores = scores.filter(s => s > 0 && s !== winScore);
  if (posScores.length === 0) return { result: 'wrong' };

  const avg = posScores.reduce((a, b) => a + b, 0) / posScores.length;
  const bestScore = Math.max(...posScores);
  const aboveAvgCols = scores.reduce((acc, s, i) => {
    if (s > 0 && s !== winScore && s >= avg) acc.push(i);
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
