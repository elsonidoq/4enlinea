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
export function parseBoardState(moves) {
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
// Only checks gravity-top cells (the next immediately playable row per column).
// Use this for immediate-move reasoning (forced_block, claimeven). For pattern
// detectors that need all reachable threats, use countAllReachableThreats.
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

// Count distinct winning threats for a player across all reachable empty cells
// (row >= colHeight for each column). Threats are counted at any reachable empty
// cell, not only the gravity-top. Gravity-top restriction applies only to
// immediate_threat and forced_block which act on the current move.
function countAllReachableThreats(board, colHeights, player) {
  let threats = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = colHeights[col]; row < ROWS; row++) {
      board[row][col] = player;
      if (checkWin(board, row, col, player)) threats++;
      board[row][col] = 0;
    }
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
      const threats = countAllReachableThreats(board, colHeights, currentPlayer);
      if (threats >= 2) {
        return { tag: 'double_threat' };
      }
    }
  }

  // ── Category 4: Forced Win ────────────────────────────────────────────────
  // All moves are losing but this is the "least bad" — opponent must play into a
  // forced sequence that ends in the current player winning.
  if (score < 0) {
    const allNegative = scores.every(s => s <= 0);
    const isBestBadMove = scores.every(s => s <= score || s === 0);
    if (allNegative && isBestBadMove && scores.some(s => s < score)) {
      return { tag: 'forced_win' };
    }
  }

  // ── Category 5: Forbidden Column ─────────────────────────────────────────
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

// ── New category detection functions (T005–T010) ──────────────────────────────

// T005 — Z-Threat detection
// Finds the unique column where odd-count empty-to-threat cells confirms a solver win.
export function detectZThreat(moves, scores) {
  const moveCount = moves.length;
  const { board, colHeights } = parseBoardState(moves);
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;

  const candidates = [];
  for (let col = 0; col < COLS; col++) {
    if (colHeights[col] >= ROWS) continue;
    if (scores[col] <= 0) continue;

    // Find lowest threat row: first empty cell where placing wins
    let threatRow = -1;
    for (let row = colHeights[col]; row < ROWS; row++) {
      board[row][col] = currentPlayer;
      const wins = checkWin(board, row, col, currentPlayer);
      board[row][col] = 0;
      if (wins) { threatRow = row; break; }
    }
    if (threatRow === -1) continue;

    const count = threatRow - colHeights[col] + 1; // inclusive cell count
    if (count % 2 === 1) {
      candidates.push({ col, fromRow: colHeights[col], toRow: threatRow, badgeCount: count });
    }
  }

  if (candidates.length !== 1) return { matched: false };
  const { col, fromRow, toRow, badgeCount } = candidates[0];
  return {
    matched: true,
    highlightMetadata: { type: 'capsule', column: col, fromRow, toRow, badgeCount },
    categoryEvidence: {},
  };
}

// T007 — Undercut detection
// Finds column C where current player has a threat at R and opponent has a threat at R' < R
// in the same column (opponent's lower threat kills current player's upper threat).
// Returns matched only when scores[C] < 0 (playing in C is losing — avoid it).
export function detectUndercut(moves, scores) {
  const moveCount = moves.length;
  const { board, colHeights } = parseBoardState(moves);
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;
  const opponent = 3 - currentPlayer;

  // Collect all threats per column for each player
  const currentThreats = {}; // col → [row, ...]
  const opponentThreats = {};
  for (let col = 0; col < COLS; col++) {
    currentThreats[col] = [];
    opponentThreats[col] = [];
    for (let row = 0; row < ROWS; row++) {
      if (board[row][col] !== 0) continue; // must be empty
      board[row][col] = currentPlayer;
      if (checkWin(board, row, col, currentPlayer)) currentThreats[col].push(row);
      board[row][col] = 0;
      board[row][col] = opponent;
      if (checkWin(board, row, col, opponent)) opponentThreats[col].push(row);
      board[row][col] = 0;
    }
  }

  for (let col = 0; col < COLS; col++) {
    if (colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] >= 0) continue; // undercut requires playing C to be losing
    for (const R of currentThreats[col]) {
      const kill = opponentThreats[col].find(rp => rp < R);
      if (kill === undefined) continue;
      return {
        matched: true,
        highlightMetadata: {
          type: 'cells',
          cells: [
            { column: col, row: kill, role: 'killing_threat' },
            { column: col, row: R, role: 'dead_threat' },
          ],
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false };
}

// T008 — Overcut detection
// Same structural pattern as undercut but playing in C is WINNING (scores[C] > 0).
// Opponent's lower threat is neutralised by current player's upper threat.
export function detectOvercut(moves, scores) {
  const moveCount = moves.length;
  const { board, colHeights } = parseBoardState(moves);
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;
  const opponent = 3 - currentPlayer;

  const currentThreats = {};
  const opponentThreats = {};
  for (let col = 0; col < COLS; col++) {
    currentThreats[col] = [];
    opponentThreats[col] = [];
    for (let row = 0; row < ROWS; row++) {
      if (board[row][col] !== 0) continue;
      board[row][col] = currentPlayer;
      if (checkWin(board, row, col, currentPlayer)) currentThreats[col].push(row);
      board[row][col] = 0;
      board[row][col] = opponent;
      if (checkWin(board, row, col, opponent)) opponentThreats[col].push(row);
      board[row][col] = 0;
    }
  }

  for (let col = 0; col < COLS; col++) {
    if (colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] <= 0) continue; // overcut requires playing C to be winning
    for (const R of currentThreats[col]) {
      const neutralised = opponentThreats[col].find(rp => rp < R);
      if (neutralised === undefined) continue;
      return {
        matched: true,
        highlightMetadata: {
          type: 'cells',
          cells: [
            { column: col, row: neutralised, role: 'neutralised_threat' },
            { column: col, row: R, role: 'major_threat' },
          ],
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false };
}

// Returns all 4-cell windows that would be completed by placing `player` at (threatRow, threatCol).
// Board must not already have a piece at that cell.
function getWinningWindows(board, threatRow, threatCol, player) {
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  const windows = [];
  for (const [dr, dc] of directions) {
    for (let offset = 0; offset <= 3; offset++) {
      const sr = threatRow - dr * offset;
      const sc = threatCol - dc * offset;
      const window = [];
      let valid = true;
      for (let i = 0; i < 4; i++) {
        const r = sr + dr * i, c = sc + dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { valid = false; break; }
        window.push({ row: r, col: c });
        if (r === threatRow && c === threatCol) continue;
        if (board[r][c] !== player) { valid = false; break; }
      }
      if (valid && window.length === 4) windows.push(window);
    }
  }
  return windows;
}

// T009 — Figure-7 detection
// Checks all four structural variants; current player occupies 4 of 5 template cells,
// the 5th is empty and playable, and scores confirm a win.
// Threats are counted at any reachable empty cell in the column (row >= colHeight),
// not only the gravity-top. Gravity-top restriction applies only to immediate_threat
// and forced_block which act on the current move.
export function detectFigure7(moves, scores) {
  const moveCount = moves.length;
  const { board, colHeights } = parseBoardState(moves);
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;

  // Enumerate all Figure-7 templates (4 variants × all valid anchor positions)
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const variants = [];

      // Variant 1: ascending diagonal + horizontal right (junction at index 2)
      if (x + 4 < COLS && y + 2 < ROWS) {
        variants.push([
          { col: x, row: y }, { col: x+1, row: y+1 }, { col: x+2, row: y+2 },
          { col: x+3, row: y+2 }, { col: x+4, row: y+2 },
        ]);
        // 1b: comp = arm cell adjacent to junction (x+3)
        variants.push([
          { col: x, row: y }, { col: x+1, row: y+1 }, { col: x+3, row: y+2 },
          { col: x+2, row: y+2 }, { col: x+4, row: y+2 },
        ]);
      }
      // Variant 2: ascending diagonal + horizontal left (junction at index 2)
      if (x + 2 < COLS && y + 2 < ROWS) {
        variants.push([
          { col: x, row: y }, { col: x+1, row: y+1 }, { col: x+2, row: y+2 },
          { col: x+1, row: y+2 }, { col: x, row: y+2 },
        ]);
        // 2b: comp = arm cell adjacent to junction (x+1)
        variants.push([
          { col: x, row: y }, { col: x+1, row: y+1 }, { col: x+1, row: y+2 },
          { col: x+2, row: y+2 }, { col: x, row: y+2 },
        ]);
      }
      // Variant 3: descending diagonal + horizontal right (junction at index 2)
      if (x - 2 >= 0 && y + 2 < ROWS) {
        variants.push([
          { col: x, row: y }, { col: x-1, row: y+1 }, { col: x-2, row: y+2 },
          { col: x-1, row: y+2 }, { col: x, row: y+2 },
        ]);
        // 3b: comp = arm cell adjacent to junction (x-1)
        variants.push([
          { col: x, row: y }, { col: x-1, row: y+1 }, { col: x-1, row: y+2 },
          { col: x-2, row: y+2 }, { col: x, row: y+2 },
        ]);
      }
      // Variant 4: descending diagonal + horizontal left (junction at index 2)
      if (x - 4 >= 0 && y + 2 < ROWS) {
        variants.push([
          { col: x, row: y }, { col: x-1, row: y+1 }, { col: x-2, row: y+2 },
          { col: x-3, row: y+2 }, { col: x-4, row: y+2 },
        ]);
        // 4b: comp = arm cell adjacent to junction (x-3)
        variants.push([
          { col: x, row: y }, { col: x-1, row: y+1 }, { col: x-3, row: y+2 },
          { col: x-2, row: y+2 }, { col: x-4, row: y+2 },
        ]);
      }

      for (const template of variants) {
        // Only the corner (index 2) is a valid completing cell: it is the junction where
        // the diagonal arm meets the horizontal arm, so playing it creates both threats
        // simultaneously. Allowing arm-end cells produces false positives where a
        // horizontal already in place gets extended, which is not a figure-7 trap.
        const comp = template[2];
        const placed = template.filter((_, i) => i !== 2);

        if (!placed.every(c => board[c.row][c.col] === currentPlayer)) continue;
        if (board[comp.row][comp.col] !== 0) continue;
        if (colHeights[comp.col] !== comp.row) continue;
        if (!scores || scores[comp.col] <= 0) continue;

        // The double threat must be generated by the figure-7 shape itself:
        // after placing comp, count threats whose winning 4-in-a-row shares ≥3 cells
        // with the template (the connect-4 is the 7-shape + 1 extra disk).
        const templateSet = new Set([...placed, comp].map(c => `${c.row},${c.col}`));
        board[comp.row][comp.col] = currentPlayer;
        colHeights[comp.col]++;
        const threatCells = [];
        for (let col = 0; col < COLS; col++) {
          for (let row = colHeights[col]; row < ROWS; row++) {
            board[row][col] = currentPlayer;
            const wins = checkWin(board, row, col, currentPlayer);
            board[row][col] = 0;
            if (!wins) continue;
            const windows = getWinningWindows(board, row, col, currentPlayer);
            if (windows.some(w => w.filter(cell => templateSet.has(`${cell.row},${cell.col}`)).length >= 3)) {
              threatCells.push({ column: col, row });
            }
          }
        }
        // gravityTopCount uses incremented colHeights (comp already placed) for accuracy.
        // A figure-7 zugzwang has at most 1 gravity-top threat (the forcing move). Two or
        // more gravity-top threats means the position is a direct fork, not a figure-7.
        const gravityTopCount = threatCells.filter(t => t.row === colHeights[t.column]).length;
        const hasAboveGravity = threatCells.some(t => t.row > colHeights[t.column]);
        board[comp.row][comp.col] = 0;
        colHeights[comp.col]--;
        if (threatCells.length < 2) continue;
        // Genuine figure-7 zugzwang: two threats in the same column at consecutive
        // rows, with the lower threat at most 1 above the current gravity-top.
        // "Blocking one immediately enables the other" (training material §E Q21):
        // one opponent fill raises the column by 1, placing the lower threat at
        // gravity-top; Red then plays there, leaving the upper threat exposed.
        const hasConsecutivePair = threatCells.some(t1 =>
          threatCells.some(t2 =>
            t2.column === t1.column &&
            t2.row === t1.row + 1 &&
            t1.row <= colHeights[t1.column] + 1
          )
        );
        if (!hasConsecutivePair) continue;

        return {
          matched: true,
          highlightMetadata: {
            type: 'cells',
            cells: placed.map(c => ({ column: c.col, row: c.row, role: 'pattern_piece' })),
          },
          correctCol: comp.col,
          categoryEvidence: {
            pattern_cells: placed.map(c => ({ column: c.col, row: c.row })),
            threat_cells: threatCells,
          },
        };
      }
    }
  }
  return { matched: false };
}

// T010 — J-Shape detection
// Canonical: {(c,r),(c,r+2),(c+1,r+1)} with (c+1,r+2) completing.
// Mirror: {(c,r),(c,r+2),(c-1,r+1)} with (c-1,r+2) completing.
// Threats are counted at any reachable empty cell in the column (row >= colHeight),
// not only the gravity-top. Gravity-top restriction applies only to immediate_threat
// and forced_block which act on the current move.
export function detectJShape(moves, scores) {
  const moveCount = moves.length;
  const { board, colHeights } = parseBoardState(moves);
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;
  const opponent = 3 - currentPlayer;

  function tryTemplate(placed, completing, templateColsAtCompletingRow) {
    if (!placed.every(cell => board[cell.row][cell.col] === currentPlayer)) return false;
    if (board[completing.row][completing.col] !== 0) return false;
    if (colHeights[completing.col] > completing.row) return false;
    // Guard: opponent must not occupy the row above the completing row in any template column
    if (completing.row + 1 < ROWS) {
      if (templateColsAtCompletingRow.some(tc => board[completing.row + 1][tc] === opponent)) return false;
    }
    if (!scores || scores[completing.col] <= 0) return false;
    return true;
  }

  // Canonical variant: tall column c, short side c+1
  for (let c = 0; c < COLS - 1; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const placed = [{ col: c, row: r }, { col: c, row: r+2 }, { col: c+1, row: r+1 }];
      const completing = { col: c+1, row: r+2 };
      if (tryTemplate(placed, completing, [c, c+1])) {
        return {
          matched: true,
          highlightMetadata: {
            type: 'cells',
            cells: placed.map(cell => ({ column: cell.col, row: cell.row, role: 'pattern_piece' })),
          },
          correctCol: completing.col,
          categoryEvidence: {
            pattern_cells: placed.map(cell => ({ column: cell.col, row: cell.row })),
          },
        };
      }
    }
  }

  // Mirror variant: tall column c, short side c-1
  for (let c = 1; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const placed = [{ col: c, row: r }, { col: c, row: r+2 }, { col: c-1, row: r+1 }];
      const completing = { col: c-1, row: r+2 };
      if (tryTemplate(placed, completing, [c, c-1])) {
        return {
          matched: true,
          highlightMetadata: {
            type: 'cells',
            cells: placed.map(cell => ({ column: cell.col, row: cell.row, role: 'pattern_piece' })),
          },
          correctCol: completing.col,
          categoryEvidence: {
            pattern_cells: placed.map(cell => ({ column: cell.col, row: cell.row })),
          },
        };
      }
    }
  }

  return { matched: false };
}

// T006 — Claimeven detection (async — runs solver simulation)
// Subtype A: exactly 1 odd column → unique equalising move.
// Subtype B: exactly 2 odd columns → opponent just played in one, current player responds in the other.
export async function detectClaimeven(moves, scores, solver) {
  const moveCount = moves.length;
  if (moveCount === 0) return { matched: false };
  const { colHeights } = parseBoardState(moves);

  // Identify odd-height columns (odd empty-space count)
  const oddCols = [];
  for (let col = 0; col < COLS; col++) {
    if (colHeights[col] < ROWS && colHeights[col] % 2 === 1) oddCols.push(col);
  }

  let subtype, correctCol, baseinversePair;

  if (oddCols.length === 1) {
    subtype = 'A';
    correctCol = oddCols[0];
    baseinversePair = [correctCol];
  } else if (oddCols.length === 2) {
    // Subtype B: opponent's last move made one of these columns odd
    const lastCol = parseInt(moves[moveCount - 1], 10) - 1;
    if (!oddCols.includes(lastCol)) return { matched: false };
    subtype = 'B';
    baseinversePair = [...oddCols];
    correctCol = oddCols.find(c => c !== lastCol);
  } else {
    return { matched: false };
  }

  // Run simulation from position after correct move
  const newMoves = moves + (correctCol + 1).toString();
  const simResult = await runClaimevenSimulation(newMoves, solver);
  if (!simResult.yellowWins) return { matched: false };

  return {
    matched: true,
    highlightMetadata: null,
    correctCol,
    categoryEvidence: {
      subtype,
      baseinverse_pair: baseinversePair,
      correct_col: correctCol,
      simulation_trace: simResult.trace,
    },
  };
}

// Claimeven simulation (FR-004): Red plays solver-optimal, Yellow uses baseinverse strategy.
// Starts from a position where Red is about to move.
async function runClaimevenSimulation(ms, solver) {
  const MAX_PAIRS = 60;
  const trace = [];
  const redPlayer = ms.length % 2 === 0 ? 1 : 2;
  const yellowPlayer = 3 - redPlayer;
  let currentMs = ms;

  for (let pair = 0; pair < MAX_PAIRS; pair++) {
    if (currentMs.length === TOTAL_CELLS) return { yellowWins: false, trace };

    const { board, colHeights } = parseBoardState(currentMs);

    // Red plays solver-optimal
    let scores;
    try { scores = await solver.query(currentMs); } catch { return { yellowWins: false, trace }; }

    let bestScore = -Infinity;
    let redCol = -1;
    for (let c = 0; c < COLS; c++) {
      if (colHeights[c] < ROWS && scores[c] > bestScore) {
        bestScore = scores[c];
        redCol = c;
      }
    }
    if (redCol === -1) return { yellowWins: true, trace }; // Red has no move

    const redHeightBefore = colHeights[redCol];
    trace.push({ col: redCol, row: redHeightBefore, player: redPlayer });
    board[redHeightBefore][redCol] = redPlayer;
    const newHeights = [...colHeights];
    newHeights[redCol]++;
    currentMs += (redCol + 1).toString();

    if (checkWin(board, redHeightBefore, redCol, redPlayer)) return { yellowWins: false, trace };
    if (currentMs.length === TOTAL_CELLS) return { yellowWins: false, trace };

    // Yellow's baseinverse response
    let yellowCol;
    if (redHeightBefore % 2 === 0) {
      // Red played in even-height column → Yellow plays above Red
      yellowCol = redCol;
    } else {
      // Red played in baseinverse column → Yellow plays other odd-height column
      const oddColsNow = [];
      for (let c = 0; c < COLS; c++) {
        if (newHeights[c] < ROWS && newHeights[c] % 2 === 1) oddColsNow.push(c);
      }
      yellowCol = oddColsNow.length > 0 ? oddColsNow[0] : redCol;
    }

    if (newHeights[yellowCol] >= ROWS) return { yellowWins: false, trace };

    const yellowRow = newHeights[yellowCol];
    trace.push({ col: yellowCol, row: yellowRow, player: yellowPlayer });
    board[yellowRow][yellowCol] = yellowPlayer;
    currentMs += (yellowCol + 1).toString();

    if (checkWin(board, yellowRow, yellowCol, yellowPlayer)) return { yellowWins: true, trace };
  }

  return { yellowWins: false, trace };
}

// Classify the best available move (ignoring candidateCol, find the strongest pattern).
export function classifyBestMove(moves, scores) {
  const maxScore = Math.max(...scores);
  const bestCol = scores.indexOf(maxScore);
  return classify(moves, bestCol, scores);
}
