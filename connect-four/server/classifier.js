// Pattern classifier for Connect Four positions.
// Cats 1-3: bitboard-detectable (no extra solver queries).
// Cats 4-6: solver-guided (secondary solver query required).

const ROWS = 6;
const COLS = 7;
const TOTAL_CELLS = ROWS * COLS; // 42

// c4solver winning score convention: score = floor((42 + 1 - movesWhenGameEnds) / 2)
// For an immediate win (game ends at moveCount + 1 stones): score = floor((42 - moveCount) / 2)
function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

// Build a board grid from a move string (1-indexed columns).
// Returns board[row][col] where row 0 is bottom, row 5 is top.
// Values: 0 = empty, 1 = player 1 (first mover), 2 = player 2
function parseBoardState(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const colHeights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1; // convert to 0-indexed
    const row = colHeights[col];
    board[row][col] = (i % 2 === 0) ? 1 : 2; // player 1 moves first
    colHeights[col]++;
  }
  return { board, colHeights };
}

// Check if player has won with the last piece placed at (row, col).
export function checkWin(board, row, col, player) {
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let d = 1; d <= 3; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
      else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

// Count distinct winning threats for a player on the current board.
// A threat is an empty cell that would complete a 4-in-a-row.
export function countWinningThreats(board, colHeights, player) {
  let threats = 0;
  for (let col = 0; col < COLS; col++) {
    const row = colHeights[col];
    if (row >= ROWS) continue; // full column
    // Temporarily place the piece
    board[row][col] = player;
    if (checkWin(board, row, col, player)) threats++;
    board[row][col] = 0;
  }
  return threats;
}

// Classify a position given the move string, candidate column (0-indexed),
// and the solver scores for all 7 columns.
// Returns { tag } — never throws.
export function classify(moves, candidateCol, scores) {
  const moveCount = moves.length;
  const score = scores[candidateCol];
  const winScore = immediateWinScore(moveCount);

  // ── Category 1: Immediate Threat ─────────────────────────────────────────
  // This move wins the game immediately.
  // Use >= because for odd moveCount, winScore equals win-in-2 score; board check disambiguates.
  if (score >= winScore && score > 0) {
    const { board, colHeights } = parseBoardState(moves);
    const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;
    const row = colHeights[candidateCol];
    if (row < ROWS) {
      board[row][candidateCol] = currentPlayer;
      if (checkWin(board, row, candidateCol, currentPlayer)) {
        return { tag: 'immediate_threat' };
      }
      board[row][candidateCol] = 0;
    }
  }

  // ── Category 2: Forced Block ──────────────────────────────────────────────
  // The opponent has an immediate winning threat; any other move loses instantly.
  // Indicator: all non-candidate playable columns have score equal to the
  // worst possible loss (opponent wins on their very next move).
  if (score >= 0) {
    // Opponent wins on their very next turn: game ends at moveCount+2 stones
    // score convention: -floor((42+1-(moveCount+2))/2) = -floor((41-moveCount)/2)
    const opponentImmediateWin = -Math.floor((41 - moveCount) / 2);
    const allOthersAreLoss = scores.every((s, i) => {
      if (i === candidateCol) return true;
      return s < 0 && s >= opponentImmediateWin;
    });
    // At least one other move must be losing (otherwise we're not "forced" to block)
    const someOtherIsLosing = scores.some((s, i) => i !== candidateCol && s < 0);
    if (allOthersAreLoss && someOtherIsLosing) {
      return { tag: 'forced_block' };
    }
  }

  // ── Category 3: Double Threat ─────────────────────────────────────────────
  // After this move, the current player has ≥2 simultaneous winning threats.
  // We detect this by building the board state after the candidate move
  // and counting threats for the same player.
  if (score > 0) {
    const { board, colHeights } = parseBoardState(moves);
    const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;
    const row = colHeights[candidateCol];
    if (row < ROWS) {
      board[row][candidateCol] = currentPlayer;
      colHeights[candidateCol]++;
      const threats = countWinningThreats(board, colHeights, currentPlayer);
      if (threats >= 2) {
        return { tag: 'double_threat' };
      }
    }
  }

  // ── Category 4: Fork Setup ────────────────────────────────────────────────
  // This move is part of a multi-move sequence that builds toward a double threat.
  // Heuristic: score > 0 AND no immediate win AND the move is among the best
  // available AND scores for the resulting position suggest the opponent cannot
  // stop a double threat. Simplified: positive score without immediate win or block.
  if (score > 0 && !isImmediateWin(score, winScore)) {
    // Check if multiple columns remain winning — indicative of fork setup
    const winningCols = scores.filter(s => s > 0).length;
    if (winningCols >= 3) {
      return { tag: 'fork_setup' };
    }
  }

  // ── Category 5: Zugzwang ──────────────────────────────────────────────────
  // Any move worsens the position for the current player (compelled to move into loss).
  // Heuristic: all scores are negative but this is the "least bad" move.
  if (score < 0) {
    const allNegative = scores.every(s => s <= 0);
    const isBestBadMove = scores.every(s => s <= score || s === 0);
    if (allNegative && isBestBadMove && scores.some(s => s < score)) {
      return { tag: 'zugzwang' };
    }
  }

  // ── Category 6: Parity Control ────────────────────────────────────────────
  // The move maintains or gains parity advantage (odd/even row dominance).
  // Simplified heuristic: positive score move that is better than average.
  if (score > 0) {
    const posScores = scores.filter(s => s > 0);
    const avgPos = posScores.reduce((a, b) => a + b, 0) / (posScores.length || 1);
    if (score >= avgPos && posScores.length >= 2) {
      return { tag: 'parity_control' };
    }
  }

  // ── Category 7: Forbidden Column ─────────────────────────────────────────
  // Playing in a column that gives the opponent an immediate winning response.
  // Only valid when the current player has no winning move (all scores <= 0).
  const opponentWinScore = -Math.ceil((41 - moveCount) / 2);
  if (scores.some(s => s === opponentWinScore) && scores.every(s => s <= 0)) {
    return { tag: 'forbidden_columns' };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (score > 0) return { tag: 'best_move' };
  if (score === 0) return { tag: 'drawing_move' };
  return { tag: 'suboptimal_move' };
}

function isImmediateWin(score, winScore) {
  return score >= winScore;
}

// Classify the best available move (ignoring candidateCol, find the strongest pattern).
export function classifyBestMove(moves, scores) {
  const maxScore = Math.max(...scores);
  const bestCol = scores.indexOf(maxScore);
  return classify(moves, bestCol, scores);
}
