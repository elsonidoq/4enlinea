// Pattern classifier for Connect Four positions.
// Cats 1-3: bitboard-detectable (no extra solver queries).
// Cats 4-6: solver-guided (secondary solver query required).
//
// PURPOSE AND DESIGN
// ------------------
// This file serves two use cases:
//   1. Puzzle generation: during gameplay simulation, the classifier detects whether
//      the current board is a valid candidate for a specific puzzle type. A candidate
//      is a position where playing `correct_col` *creates* the target pattern.
//   2. Sparring hints: during live play against the solver, the classifier identifies
//      tactics the learner could apply ("you could build a Figure-7 here") or tactics
//      the AI is about to use ("beware, the AI is one move from a Figure-7").
//
// In both use cases the classifier operates in pre-completion mode: it detects the
// one-move-away state, not the finished pattern.
//
// RELATIONSHIP TO THE KNOWLEDGE BASE
// ------------------------------------
// The KB (`docs/knowledge-base/`) documents the *complete* strategic pattern —
// what the tactic looks like when fully formed and why it wins. The predicates here
// are necessarily different: they describe the board *before* the completing move.
// When in doubt about what a tactic is or why it works, read the KB entry first.
// When in doubt about how the classifier detects it, read the functions below.

/**
 * All coordinates are 0-indexed: column 0–6 (left to right), row 0–5 (bottom to top).
 * PARITY: row 0 = even 0-indexed = odd 1-indexed (user-visible). Load-bearing for
 * Undercut/J-Shape logic — do not switch rows to 1-indexed without auditing every r%2 check.
 *
 * @typedef {{ column: number, row: number, role: string }} HighlightCell
 *
 * @typedef {{ type: 'cells', cells: HighlightCell[] }
 *          | { type: 'capsule', column: number, fromRow: number, toRow: number, badgeCount: number }
 *         } HighlightMetadata
 */

const ROWS = 6;
const COLS = 7;
const TOTAL_CELLS = ROWS * COLS; // 42


/**
 * Builds a board grid from a move string (0-indexed columns).
 * Returns board[row][col] where row 0 is bottom, row 5 is top.
 * Values: 0 = empty, 1 = player 1 (first mover), 2 = player 2.
 * @param {string} moves  move string of 0-indexed column digits
 * @returns {{ board: number[][], colHeights: number[] }}
 * @complexity O(n) where n = moves.length
 * @cache not cached
 */
export function parseBoardState(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const colHeights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    if (col < 0 || col >= COLS) continue;
    const row = colHeights[col];
    if (row >= ROWS) continue;
    board[row][col] = (i % 2 === 0) ? 1 : 2; // player 1 moves first
    colHeights[col]++;
  }
  return { board, colHeights };
}

/**
 * Checks if player has won with the last piece placed at (row, col).
 * Scans all 4 directions from the given cell; does not read board[row][col] itself.
 * @param {number[][]} board
 * @param {number} row   0-indexed
 * @param {number} col   0-indexed
 * @param {number} player  1 or 2
 * @returns {boolean}
 * @complexity O(1)  (constant 4 directions × up to 6 cells each)
 * @cache not cached
 */
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

/**
 * Returns true if player already has four-in-a-row anywhere on the board.
 * @param {number[][]} board
 * @param {number} player  1 or 2
 * @returns {boolean}
 * @complexity O(42)
 * @cache not cached
 */
export function hasWon(board, player) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === player && checkWin(board, row, col, player)) return true;
    }
  }
  return false;
}

/**
 * Returns a Map from column to the rows in that column where placing player would win.
 * Only considers cells at or above colHeights[col] (empty cells reachable by gravity).
 * Calls checkWin without mutation — checkWin never reads board[row][col] itself.
 * @param {number[][]} board
 * @param {number[]} colHeights
 * @param {number} player  1 or 2
 * @returns {Map<number, number[]>}  Map<col, row[]>, rows in ascending order
 * @complexity O(42)
 * @cache not cached
 */
export function getReachableThreats(board, colHeights, player) {
  const result = new Map();
  for (let col = 0; col < COLS; col++) {
    const rows = [];
    for (let row = colHeights[col]; row < ROWS; row++) {
      if (checkWin(board, row, col, player)) rows.push(row);
    }
    if (rows.length > 0) result.set(col, rows);
  }
  return result;
}

/**
 * Returns an object keyed by "row,col" with { rm, rn, ym, yn } flags for each empty cell.
 * rm/ym = major threat (3 discs + 1 empty in a 4-window) for red/yellow.
 * rn/yn = minor threat (2 discs + 2 empty) for red/yellow.
 * @param {number[][]} board
 * @returns {Object.<string, {rm: boolean, rn: boolean, ym: boolean, yn: boolean}>}
 * @complexity O(672)  (42 cells × 4 directions × 4 offsets)
 * @cache not cached
 */
export function getMajorThreatCells(board) {
  const map = {};
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) continue;
      let rm = false, rn = false, ym = false, yn = false;
      for (const [dr, dc] of dirs) {
        for (let off = 0; off <= 3; off++) {
          const sr = r - dr*off, sc = c - dc*off;
          let red = 0, yel = 0, valid = true;
          for (let i = 0; i < 4; i++) {
            const nr = sr + dr*i, nc = sc + dc*i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
            if (board[nr][nc] === 1) red++;
            else if (board[nr][nc] === 2) yel++;
          }
          if (!valid || (red > 0 && yel > 0)) continue;
          const empty = 4 - red - yel;
          if (red === 3 && empty === 1) rm = true;
          else if (red === 2 && empty === 2) rn = true;
          if (yel === 3 && empty === 1) ym = true;
          else if (yel === 2 && empty === 2) yn = true;
        }
      }
      if (rm || rn || ym || yn) map[`${r},${c}`] = { rm, rn, ym, yn };
    }
  }
  return map;
}

/**
 * Returns true when two same-column threats have the same row parity.
 * T4: same parity → no interaction between threats, regardless of player.
 * 0-indexed rows: even ↔ Allen 1-indexed odd; odd ↔ Allen 1-indexed even.
 * @param {number} R   current player's threat row (0-indexed)
 * @param {number} Rp  opponent's threat row (0-indexed)
 * @returns {boolean}
 * @complexity O(1)
 * @cache not cached
 * @see allen-t4
 */
export function isT4SameParity(R, Rp) {
  return R % 2 === Rp % 2;
}

/**
 * Returns true for the specific row pair (0-indexed 5, 2) = Allen rows (6, 3).
 * T5 overrides T2 for this pair: threats at Allen rows 3 and 6 in the same column
 * do NOT interact despite opposite parity. Rows 5+2 (0-indexed) = rows 6+3 (Allen).
 * @param {number} R   (0-indexed row)
 * @param {number} Rp  (0-indexed row)
 * @returns {boolean}
 * @complexity O(1)
 * @cache not cached
 * @see allen-t5
 */
export function isT5Exception(R, Rp) {
  return (R === 5 && Rp === 2) || (R === 2 && Rp === 5);
}

/**
 * Returns true if a current-player threat at Rpp < Rp neutralizes the opponent's threat at Rp via T2.
 * Sub-case 2: CP threat at even 0-indexed row below opponent's odd 0-indexed row, any distance.
 * Sub-case 3: CP threat at odd 0-indexed row immediately below opp even 0-indexed row (adjacent only).
 * @param {number[]} colThreats  Current-player threat rows in this column (0-indexed)
 * @param {number}   Rp          Opponent's threat row (0-indexed)
 * @returns {boolean}
 * @complexity O(|colThreats|)
 * @cache not cached
 * @see allen-t2
 */
export function isT2Blocking(colThreats, Rp) {
  return colThreats.some(Rpp => {
    if (Rpp >= Rp) return false;
    if (Rpp % 2 === 0 && Rp % 2 === 1) return true; // sub-case 2: CP even, opp odd, any distance
    if (Rpp % 2 === 1 && Rp % 2 === 0 && Rpp + 1 === Rp) return true; // sub-case 3: adjacent
    return false;
  });
}

/**
 * Returns true if the current player already has an active double threat —
 * either ≥2 immediate winning columns, or a single winning column with a
 * major threat stacked directly above it (same column, one row higher).
 * Use this to filter puzzle candidates that are won before the puzzle starts.
 * @param {number[][]} board
 * @param {number[]} colHeights
 * @param {number} player  1 or 2
 * @returns {boolean}
 * @complexity O(7) + O(672)  (getImmediateThreats + getMajorThreatCells)
 * @cache not cached
 */
export function hasActiveDoubleThreat(board, colHeights, player) {
  const winCols = getImmediateThreats(board, colHeights, player);
  if (winCols.length >= 2) return true;
  if (winCols.length === 1) {
    const c = winCols[0];
    const r = colHeights[c];
    if (r + 1 < ROWS) {
      const t = getMajorThreatCells(board)[`${r+1},${c}`];
      if (t && (player === 1 ? t.rm : t.ym)) return true;
    }
  }
  return false;
}

/**
 * Returns columns where player can win immediately (gravity-top cells only).
 * Mutation-free: checkWin never reads board[row][col], so no placement needed.
 * @param {number[][]} board
 * @param {number[]} colHeights
 * @param {number} player  1 or 2
 * @returns {number[]}  array of column indices
 * @complexity O(7)
 * @cache not cached
 */
export function getImmediateThreats(board, colHeights, player) {
  const cols = [];
  for (let col = 0; col < COLS; col++) {
    const row = colHeights[col];
    if (row >= ROWS) continue;
    if (checkWin(board, row, col, player)) cols.push(col);
  }
  return cols;
}

/**
 * Immutable board snapshot. Parses movestring once; all derived state is lazily cached.
 * Use `new Board(movestring)` in `classify()` and all `detect*` functions.
 * Use `board.withMove(col)` instead of the mutation+undo pattern.
 */
export class Board {
  /**
   * Parses movestring once; all subsequent accesses read the cached state.
   * @param {string} movestring
   * @complexity O(42)
   * @cache not cached (constructor)
   */
  constructor(movestring) {
    const { board, colHeights } = parseBoardState(movestring);
    this.movestring    = movestring;
    this.board         = board;
    this.colHeights    = colHeights;
    this.currentPlayer = movestring.length % 2 === 0 ? 1 : 2;
    this.opponent      = 3 - this.currentPlayer;
    this._cache        = new Map();
  }

  /**
   * Returns true if placing player at (row,col) completes four-in-a-row.
   * Delegates to free checkWin; does not read board[row][col].
   * @param {number} row
   * @param {number} col
   * @param {number} player  1 or 2
   * @returns {boolean}
   * @complexity O(1)
   * @cache not cached
   */
  checkWin(row, col, player) { return checkWin(this.board, row, col, player); }

  /**
   * Returns true if player already has four-in-a-row anywhere on the board.
   * @param {number} player  1 or 2
   * @returns {boolean}
   * @complexity O(42)
   * @cache cached per player
   */
  hasWon(player) {
    const key = `hasWon_${player}`;
    if (!this._cache.has(key)) this._cache.set(key, hasWon(this.board, player));
    return this._cache.get(key);
  }

  /**
   * Returns columns where player can win immediately (gravity-top cells only).
   * @param {number} player  1 or 2
   * @returns {number[]}
   * @complexity O(7)
   * @cache cached per player
   */
  immediateThreats(player) {
    const key = `immediateThreats_${player}`;
    if (!this._cache.has(key)) this._cache.set(key, getImmediateThreats(this.board, this.colHeights, player));
    return this._cache.get(key);
  }

  /**
   * Returns Map<col, row[]> of all empty cells at or above colHeight where player wins.
   * @param {number} player  1 or 2
   * @returns {Map<number, number[]>}
   * @complexity O(42)
   * @cache cached per player
   */
  reachableThreats(player) {
    const key = `reachableThreats_${player}`;
    if (!this._cache.has(key)) this._cache.set(key, getReachableThreats(this.board, this.colHeights, player));
    return this._cache.get(key);
  }

  /**
   * Returns all 4-cell windows completed by placing player at (row,col).
   * @param {number} row
   * @param {number} col
   * @param {number} player  1 or 2
   * @returns {Array<Array<{row: number, col: number}>>}
   * @complexity O(16)
   * @cache not cached (varies by row/col)
   */
  winningWindows(row, col, player) { return getWinningWindows(this.board, row, col, player); }

  /**
   * Returns the full major-threat map for all empty cells on the board.
   * @returns {Object}
   * @complexity O(672)
   * @cache cached (player-independent)
   */
  majorThreatCells() {
    if (!this._cache.has('majorThreatCells')) this._cache.set('majorThreatCells', getMajorThreatCells(this.board));
    return this._cache.get('majorThreatCells');
  }

  /**
   * Returns true if player has an active double threat.
   * @param {number} player  1 or 2
   * @returns {boolean}
   * @complexity O(7) + O(672) on first call
   * @cache cached per player
   */
  hasActiveDoubleThreat(player) {
    const key = `hasActiveDoubleThreat_${player}`;
    if (!this._cache.has(key)) this._cache.set(key, hasActiveDoubleThreat(this.board, this.colHeights, player));
    return this._cache.get(key);
  }

  /**
   * Returns a new Board for the position after placing in col. Starts with empty cache.
   * @param {number} col
   * @returns {Board}
   * @complexity O(42)
   * @cache not cached
   * @throws {RangeError} if col is out of range or the column is full
   */
  withMove(col) {
    if (col < 0 || col >= COLS || this.colHeights[col] >= ROWS) {
      throw new RangeError(`withMove: column ${col} is full or out of range`);
    }
    return new Board(this.movestring + col.toString());
  }
}

/**
 * Classifies a position given the move string, candidate column (0-indexed),
 * and the solver scores for all 7 columns.
 * Constructs a single Board instance and delegates to all category checks.
 * @param {string} moves
 * @param {number} candidateCol  0-indexed column
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ tag: string }}  never throws
 * @complexity O(42)
 * @cache not cached
 */
export function classify(moves, candidateCol, scores) {
  const board = new Board(moves);
  const score = scores[candidateCol];

  // ── Category 1: Immediate Threat ─────────────────────────────────────────
  if (board.colHeights[candidateCol] < ROWS) {
    const row = board.colHeights[candidateCol];
    if (board.withMove(candidateCol).checkWin(row, candidateCol, board.currentPlayer)) {
      return { tag: 'immediate_threat' };
    }
  }

  // ── Category 3: Double Threat ─────────────────────────────────────────────
  if (board.colHeights[candidateCol] < ROWS) {
    const nextBoard = board.withMove(candidateCol);
    const threatCells = [];
    for (const [col, rows] of nextBoard.reachableThreats(board.currentPlayer)) {
      for (const row of rows) threatCells.push({ col, row });
    }

    // Case A: two or more distinct columns each have a threat at their gravity-top
    const gravityTopCols = new Set(
      threatCells.filter(t => t.row === nextBoard.colHeights[t.col]).map(t => t.col)
    );
    if (gravityTopCols.size >= 2) return { tag: 'double_threat' };

    // Case B: two consecutive-row threats in the same column (opponent needs 2 turns to block)
    const byCol = {};
    for (const t of threatCells) {
      if (!byCol[t.col]) byCol[t.col] = [];
      byCol[t.col].push(t.row);
    }
    for (const rows of Object.values(byCol)) {
      const sorted = rows.sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1) return { tag: 'double_threat' };
      }
    }
  }

  // ── Category 2: Forced Block ──────────────────────────────────────────────
  if (score >= 0) {
    const opponent = board.opponent;
    if (board.immediateThreats(opponent).length > 0) {
      const nextBoard = board.withMove(candidateCol);
      if (nextBoard.immediateThreats(opponent).length === 0) {
        const someOtherFails = scores.some((_, i) => {
          if (i === candidateCol || board.colHeights[i] >= ROWS) return false;
          return board.withMove(i).immediateThreats(opponent).length > 0;
        });
        if (someOtherFails) return { tag: 'forced_block' };
      }
    }
  }

  // ── Category 4: Forced Win ────────────────────────────────────────────────
  if (score < 0) {
    const allNegative = scores.every(s => s <= 0);
    const isBestBadMove = scores.every(s => s <= score || s === 0);
    if (allNegative && isBestBadMove && scores.some(s => s < score)) {
      return { tag: 'forced_win' };
    }
  }

  // ── Category 5: Forbidden Column ─────────────────────────────────────────
  if (scores.every(s => s <= 0) && board.colHeights[candidateCol] < ROWS) {
    // Only tag as forbidden_columns if the opponent had NO immediate threat
    // before the move but gains one after — otherwise it's a failed forced_block,
    // not a forbidden column.
    if (board.immediateThreats(board.opponent).length === 0 &&
        board.withMove(candidateCol).immediateThreats(board.opponent).length > 0) {
      return { tag: 'forbidden_columns' };
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (score > 0) return { tag: 'best_move' };
  if (score === 0) return { tag: 'drawing_move' };
  return { tag: 'suboptimal_move' };
}

// ── New category detection functions (T005–T010) ──────────────────────────────

/**
 * T005 — Z-Threat detection.
 * Finds the unique column where odd-count empty-to-threat cells confirms a solver win.
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, col?: number, metadata?: HighlightMetadata }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectZThreat(board, scores) {
  const candidates = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (scores[col] <= 0) continue;

    // Find lowest threat row: first empty cell where placing wins (checkWin is mutation-free)
    let threatRow = -1;
    for (let row = board.colHeights[col]; row < ROWS; row++) {
      if (checkWin(board.board, row, col, board.currentPlayer)) { threatRow = row; break; }
    }
    if (threatRow === -1) continue;

    const count = threatRow - board.colHeights[col] + 1; // inclusive cell count
    if (count % 2 === 1) {
      candidates.push({ col, fromRow: board.colHeights[col], toRow: threatRow, badgeCount: count });
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

/**
 * T007 — Undercut detection.
 * Finds column C where current player has a threat at R and opponent has a threat at R' < R
 * in the same column (opponent's lower threat kills current player's upper threat).
 * Returns matched only when scores[C] < 0 (playing in C is losing — avoid it).
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, col?: number, metadata?: HighlightMetadata }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectUndercut(board, scores) {
  // @see allen-t4, allen-t5, allen-t2
  const threats    = board.reachableThreats(board.currentPlayer); // Map<col, row[]>
  const oppThreats = board.reachableThreats(board.opponent);

  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] >= 0) continue; // undercut requires playing C to be losing
    const colRows    = threats.get(col) ?? [];
    const oppColRows = oppThreats.get(col) ?? [];

    for (const R of colRows) {
      const kill = oppColRows.find(rp => rp < R);
      if (kill === undefined) continue;
      if (isT4SameParity(R, kill)) continue;                            // U1 @see allen-t4
      if (isT5Exception(R, kill)) continue;                             // U2 @see allen-t5
      if (R % 2 === 1 && kill % 2 === 0 && R !== kill + 1) continue;   // U3 @see allen-t2 sub-case 3
      return {
        matched: true,
        highlightMetadata: {
          type: 'cells',
          cells: [
            { column: col, row: kill, role: 'killing_threat' },
            { column: col, row: R,    role: 'dead_threat' },
          ],
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false };
}

/**
 * T008 — Overcut detection.
 * Same structural pattern as undercut but playing in C is WINNING (scores[C] > 0).
 * Opponent's lower threat is neutralised by current player's upper threat.
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, col?: number, metadata?: HighlightMetadata }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectOvercut(board, scores) {
  // @see allen-t4, allen-t5, allen-t2
  const threats    = board.reachableThreats(board.currentPlayer);
  const oppThreats = board.reachableThreats(board.opponent);

  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] <= 0) continue; // overcut requires playing C to be winning
    const colRows    = threats.get(col) ?? [];
    const oppColRows = oppThreats.get(col) ?? [];

    for (const R of colRows) {
      const neutralised = oppColRows.find(rp => rp < R);
      if (neutralised === undefined) continue;
      // O1: match only if at least one T-rule neutralization holds @see allen-t2, allen-t4, allen-t5
      if (!isT4SameParity(R, neutralised) &&
          !isT5Exception(R, neutralised) &&
          !isT2Blocking(colRows, neutralised)) continue;
      return {
        matched: true,
        reason: isT4SameParity(R, neutralised) ? 'same_parity_t4'
              : isT5Exception(R, neutralised) ? 'active_forcing'
              : 'chain_t2',
        highlightMetadata: {
          type: 'cells',
          cells: [
            { column: col, row: neutralised, role: 'neutralised_threat' },
            { column: col, row: R,           role: 'major_threat' },
          ],
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false };
}

/**
 * Returns all 4-cell windows completed by placing player at (threatRow, threatCol).
 * Board must not already have a piece at that cell.
 * @param {number[][]} board
 * @param {number} threatRow
 * @param {number} threatCol
 * @param {number} player  1 or 2
 * @returns {Array<Array<{row: number, col: number}>>}
 * @complexity O(16)
 * @cache not cached
 */
export function getWinningWindows(board, threatRow, threatCol, player) {
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

/**
 * T009 — Figure-7 detection.
 * Checks all four structural variants; current player occupies 4 of 5 template cells,
 * the 5th is empty and playable, and scores confirm a win.
 * Threats are counted at any reachable empty cell in the column (row >= colHeight),
 * not only the gravity-top. Gravity-top restriction applies only to immediate_threat
 * and forced_block which act on the current move.
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, col?: number, metadata?: HighlightMetadata }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectFigure7(board, scores) {
  const currentPlayer = board.currentPlayer;

  // Enumerate all Figure-7 templates (4 variants × all valid anchor positions)
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const variants = [];

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

        if (!placed.every(c => board.board[c.row][c.col] === currentPlayer)) continue;
        if (board.board[comp.row][comp.col] !== 0) continue;
        if (board.colHeights[comp.col] !== comp.row) continue;
        if (!scores || scores[comp.col] <= 0) continue;

        // withMove replaces outer mutation+undo; colHeights guard above ensures no throw.
        const nextBoard = board.withMove(comp.col);
        // The double threat must be generated by the figure-7 shape itself:
        // after placing comp, count threats whose winning 4-in-a-row shares ≥3 cells
        // with the template (the connect-4 is the 7-shape + 1 extra disk).
        const templateSet = new Set([...placed, comp].map(c => `${c.row},${c.col}`));

        const threatCells = [];
        // nextBoard.reachableThreats replaces the inner mutation loop.
        for (const [col, rows] of nextBoard.reachableThreats(currentPlayer)) {
          for (const row of rows) {
            const windows = nextBoard.winningWindows(row, col, currentPlayer);
            if (windows.some(w => w.filter(cell => templateSet.has(`${cell.row},${cell.col}`)).length >= 3)) {
              threatCells.push({ column: col, row });
            }
          }
        }
        // gravityTopCount uses nextBoard.colHeights (comp already placed) for accuracy.
        // A figure-7 zugzwang has at most 1 gravity-top threat (the forcing move). Two or
        // more gravity-top threats means the position is a direct fork, not a figure-7.
        const gravityTopCount = threatCells.filter(t => t.row === nextBoard.colHeights[t.column]).length;
        const hasAboveGravity = threatCells.some(t => t.row > nextBoard.colHeights[t.column]);
        if (threatCells.length < 2) continue;
        if (gravityTopCount >= 2) continue; // F1: two gravity-top threats = direct fork, not figure-7 zugzwang
        if (!hasAboveGravity) continue; // F2: zugzwang requires at least one above-gravity threat
        // Genuine figure-7 zugzwang: two threats in the same column at consecutive
        // rows, with the lower threat at most 1 above the current gravity-top.
        // "Blocking one immediately enables the other" (training material §E Q21):
        // one opponent fill raises the column by 1, placing the lower threat at
        // gravity-top; Red then plays there, leaving the upper threat exposed.
        const hasConsecutivePair = threatCells.some(t1 =>
          threatCells.some(t2 =>
            t2.column === t1.column &&
            t2.row === t1.row + 1 &&
            t1.row <= nextBoard.colHeights[t1.column] + 1
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

/**
 * T010 — J-Shape detection.
 * Canonical: {(c,r),(c,r+2),(c+1,r+1)} with (c+1,r+2) completing.
 * Mirror: {(c,r),(c,r+2),(c-1,r+1)} with (c-1,r+2) completing.
 * Threats are counted at any reachable empty cell in the column (row >= colHeight),
 * not only the gravity-top. Gravity-top restriction applies only to immediate_threat
 * and forced_block which act on the current move.
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, col?: number, metadata?: HighlightMetadata }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectJShape(board, scores) {
  function tryTemplate(placed, completing, farCol) {
    if (!placed.every(cell => board.board[cell.row][cell.col] === board.currentPlayer)) return false;
    if (board.board[completing.row][completing.col] !== 0) return false;
    if (board.colHeights[completing.col] !== completing.row) return false;
    // J4: opponent must not occupy the far column at the completing row
    if (board.board[completing.row][farCol] === board.opponent) return false;
    if (!scores || scores[completing.col] <= 0) return false;
    return true;
  }

  // Canonical variant: tall column c, short side c+1
  for (let c = 0; c < COLS - 2; c++) { // J2: farCol=c+2 must be in bounds
    for (let r = 0; r <= ROWS - 4; r++) { // J2: diagonal extension row r+3 must be in bounds
      if (r % 2 !== 0) continue; // J1: anchor parity (0-indexed even = 1-indexed odd, load-bearing)
      const placed = [{ col: c, row: r }, { col: c, row: r+2 }, { col: c+1, row: r+1 }];
      const completing = { col: c+1, row: r+2 };
      const farCol = c + 2;
      if (tryTemplate(placed, completing, farCol)) {
        // J3: parity cancellation — reject if opponent has an odd-1-indexed threat in farCol
        // checkWin is mutation-free (never reads board[row][col]) — no placement needed
        let oppOddInFarCol = false;
        for (let row = 0; row < ROWS && !oppOddInFarCol; row++) {
          if (board.board[row][farCol] !== 0 || row % 2 !== 0) continue; // even 0-indexed = odd 1-indexed
          if (checkWin(board.board, row, farCol, board.opponent)) oppOddInFarCol = true;
        }
        if (oppOddInFarCol) continue;
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
  for (let c = 2; c < COLS; c++) { // J2: farCol=c-2 must be in bounds
    for (let r = 0; r <= ROWS - 4; r++) { // J2: diagonal extension row r+3 must be in bounds
      if (r % 2 !== 0) continue; // J1: anchor parity
      const placed = [{ col: c, row: r }, { col: c, row: r+2 }, { col: c-1, row: r+1 }];
      const completing = { col: c-1, row: r+2 };
      const farCol = c - 2;
      if (tryTemplate(placed, completing, farCol)) {
        // J3: parity cancellation (mutation-free checkWin)
        let oppOddInFarCol = false;
        for (let row = 0; row < ROWS && !oppOddInFarCol; row++) {
          if (board.board[row][farCol] !== 0 || row % 2 !== 0) continue;
          if (checkWin(board.board, row, farCol, board.opponent)) oppOddInFarCol = true;
        }
        if (oppOddInFarCol) continue;
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

/**
 * T011 — Odd-Even Threat detection (Red-only, FR-009).
 *
 * Detects positions where Red (currentPlayer=1) has ≥2 distinct legal moves
 * each creating a major threat, with one threat landing on an odd row
 * (0-indexed: 0, 2, 4 — Red's parity) and one on an even row (1, 3, 5).
 * correctCol = the column whose threat lands on the odd row (FR-007).
 *
 * Per-move threat enumeration uses board.immediateThreats() as required by
 * FR-006 condition 2. getMajorThreatCells MUST NOT be used for this check.
 *
 * The `scores` parameter is accepted for signature consistency with other
 * detectors but never read (FR-008 was removed as unreachable — all odd-row
 * and even-row threats are both present by FR-006 conditions 3+4, so there is
 * no tie-break scenario where all threats are odd-row).
 *
 * interaction_mode = 'single_move' (R-006). No highlight_metadata needed.
 */
export function detectOddEvenThreat(board, scores) {
  // Red-only predicate (FR-009)
  if (board.currentPlayer !== 1) return { matched: false };

  const oddRowMoves  = []; // { col, landingRow } where landingRow % 2 === 0 (Red parity)
  const evenRowMoves = []; // { col, landingRow } where landingRow % 2 === 1 (Yellow parity)

  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] >= 6) continue;
    const landingRow = board.colHeights[col];
    // FR-006 condition 2: use immediateThreats, not getMajorThreatCells
    const afterBoard = board.withMove(col);
    if (afterBoard.immediateThreats(board.currentPlayer).length > 0) {
      if (landingRow % 2 === 0) oddRowMoves.push({ col, landingRow });
      else                       evenRowMoves.push({ col, landingRow });
    }
  }

  // FR-006 conditions 3+4: need at least one odd-row AND one even-row threat
  if (oddRowMoves.length === 0 || evenRowMoves.length === 0) return { matched: false };

  // FR-008 (both-on-odd-row tie-break) is unreachable: FR-006 condition 4 requires
  // one even-row threat, so any position where all threats are odd-row is filtered above.
  // The `scores` parameter is accepted for signature consistency but never read.

  // FR-007: correctCol = the column whose threat lands on the odd row (Red's parity)
  const correctCol = oddRowMoves[0].col;
  return {
    matched: true,
    correctCol,
    highlightMetadata: null,
    categoryEvidence: {
      oddRowCol: oddRowMoves[0].col,
      oddRow: oddRowMoves[0].landingRow,
      evenRowCol: evenRowMoves[0].col,
      evenRow: evenRowMoves[0].landingRow,
    },
  };
}

/**
 * Claimodd detection — Red's response to Claimeven (synchronous, no solver needed).
 * Detection predicate: all columns have even colHeights, it is Red's turn,
 * the center column (col 3) is not full, and the solver score for col 3
 * is positive and ties the maximum legal score.
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, correctCol?: number }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectClaimodd(board, scores) {
  // Must be Red's turn
  if (board.currentPlayer !== 1) return { matched: false };

  // All columns must have even heights
  for (let col = 0; col < board.colHeights.length; col++) {
    if (board.colHeights[col] % 2 !== 0) return { matched: false };
  }

  // Center column must not be full
  if (board.colHeights[3] >= 6) return { matched: false };

  // scores[3] must be positive and tie the maximum legal score
  if (!scores || scores[3] <= 0) return { matched: false };

  const legalScores = [];
  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] < 6) legalScores.push(scores[col]);
  }
  const maxLegal = Math.max(...legalScores);

  if (scores[3] !== maxLegal) return { matched: false };

  return { matched: true, correctCol: 3 };
}

/**
 * T006 — Claimeven detection (async — runs solver simulation).
 * Subtype A: exactly 1 odd column → unique equalising move.
 * Subtype B: exactly 2 odd columns → opponent just played in one, current player responds in the other.
 * @param {Board} board
 * @param {object} solver  c4solver wrapper instance
 * @returns {Promise<{ matched: boolean, col?: number, metadata?: HighlightMetadata }>}
 * @complexity O(42) + solver queries
 * @cache not cached
 */
export async function detectClaimeven(board, solver) {
  if (board.movestring.length === 0 || board.movestring.length % 2 === 0) return { matched: false };

  // Identify odd-height columns (odd empty-space count)
  const oddCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] < ROWS && board.colHeights[col] % 2 === 1) oddCols.push(col);
  }

  let subtype, correctCol, baseinversePair;

  if (oddCols.length === 1) {
    subtype = 'A';
    correctCol = oddCols[0];
    baseinversePair = [correctCol];
  } else if (oddCols.length === 2) {
    // Subtype B: opponent's last move made one of these columns odd
    const lastCol = parseInt(board.movestring[board.movestring.length - 1], 10);
    if (!oddCols.includes(lastCol)) return { matched: false };
    subtype = 'B';
    baseinversePair = [...oddCols];
    correctCol = oddCols.find(c => c !== lastCol);
  } else {
    return { matched: false };
  }

  // Run simulation from position after correct move
  const newMoves = board.movestring + correctCol.toString();
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
    currentMs += redCol.toString();

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
    currentMs += yellowCol.toString();

    if (checkWin(board, yellowRow, yellowCol, yellowPlayer)) return { yellowWins: true, trace };
  }

  return { yellowWins: false, trace };
}

/**
 * Detects columns where the current player can win immediately (gravity-top only).
 * @param {Board} board
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectImmediateThreat(board) {
  const cols = board.immediateThreats(board.currentPlayer);
  if (cols.length === 0) return { matched: false };
  return { matched: true, cols };
}

/**
 * Detects columns where playing creates a double threat: ≥2 gravity-top threats (Case A)
 * or two consecutive-row threats in the same column (Case B).
 * @param {Board} board
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7 × 42)
 * @cache not cached
 */
export function detectDoubleThreat(board) {
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    const nextBoard = board.withMove(col);
    const threatCells = [];
    for (const [c, rows] of nextBoard.reachableThreats(board.currentPlayer)) {
      for (const row of rows) threatCells.push({ col: c, row });
    }
    const gravityTopCols = new Set(
      threatCells.filter(t => t.row === nextBoard.colHeights[t.col]).map(t => t.col)
    );
    if (gravityTopCols.size >= 2) { matchedCols.push(col); continue; }
    const byCol = {};
    for (const t of threatCells) {
      if (!byCol[t.col]) byCol[t.col] = [];
      byCol[t.col].push(t.row);
    }
    let found = false;
    for (const rows of Object.values(byCol)) {
      const sorted = rows.sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1) { found = true; break; }
      }
      if (found) break;
    }
    if (found) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false };
  return { matched: true, cols: matchedCols };
}

/**
 * Detects forced-block columns: opponent has immediate threats and only specific columns
 * (with non-negative score) neutralise them while other columns fail to.
 * @param {Board} board
 * @param {number[]} scores
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7²)
 * @cache not cached
 */
export function detectForcedBlock(board, scores) {
  if (board.immediateThreats(board.opponent).length === 0) return { matched: false };
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (scores[col] < 0) continue;
    const nextBoard = board.withMove(col);
    if (nextBoard.immediateThreats(board.opponent).length > 0) continue;
    const someOtherFails = scores.some((_, i) => {
      if (i === col || board.colHeights[i] >= ROWS) return false;
      return board.withMove(i).immediateThreats(board.opponent).length > 0;
    });
    if (someOtherFails) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false };
  return { matched: true, cols: matchedCols };
}

/**
 * Detects forced-win (opponent is winning) columns: all scores ≤ 0 and the column
 * has the best (least-negative) score while strictly worse alternatives exist.
 * @param {Board} board
 * @param {number[]} scores
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectForcedWin(board, scores) {
  if (!scores.every(s => s <= 0)) return { matched: false };
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    const score = scores[col];
    if (score >= 0) continue;
    const isBestBadMove = scores.every(s => s <= score || s === 0);
    if (isBestBadMove && scores.some(s => s < score)) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false };
  return { matched: true, cols: matchedCols };
}

/**
 * Detects forbidden columns: in a losing position (all scores ≤ 0), columns whose play
 * immediately hands the opponent a winning move.
 * @param {Board} board
 * @param {number[]} scores
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectForbiddenColumns(board, scores) {
  if (!scores.every(s => s <= 0)) return { matched: false };
  // Only count columns where the opponent had NO immediate threat before but gains one after.
  // If the opponent already had a threat, failing to block it is a forced_block, not forbidden_columns.
  if (board.immediateThreats(board.opponent).length > 0) return { matched: false };
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (board.withMove(col).immediateThreats(board.opponent).length > 0) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false };
  return { matched: true, cols: matchedCols };
}

/**
 * Runs all detectors against a single Board, returning one result per detector.
 * Caches (reachableThreats, etc.) are shared across all detectors via the Board instance.
 * @param {string} moves
 * @param {number[]} scores
 * @param {object} [solver]  Required only for detectClaimeven
 * @returns {Promise<Array<{detectorName: string, result: object}>>}
 * @complexity O(42) board parse + per-detector cost (all reachableThreats() cached after first)
 * @cache not cached
 */
export async function classifyAll(moves, scores, solver) {
  const board = new Board(moves);
  return [
    { detectorName: 'immediate_threat',  result: detectImmediateThreat(board) },
    { detectorName: 'double_threat',     result: detectDoubleThreat(board) },
    { detectorName: 'forced_block',      result: detectForcedBlock(board, scores) },
    { detectorName: 'forced_win',        result: detectForcedWin(board, scores) },
    { detectorName: 'forbidden_columns', result: detectForbiddenColumns(board, scores) },
    { detectorName: 'z_threat',          result: detectZThreat(board, scores) },
    { detectorName: 'odd_even_threat',   result: detectOddEvenThreat(board, scores) },
    { detectorName: 'undercut',          result: detectUndercut(board, scores) },
    { detectorName: 'overcut',           result: detectOvercut(board, scores) },
    { detectorName: 'figure_7',          result: detectFigure7(board, scores) },
    { detectorName: 'j_shape',           result: detectJShape(board, scores) },
    { detectorName: 'claimodd',          result: detectClaimodd(board, scores) },
    { detectorName: 'claimeven',         result: await detectClaimeven(board, solver) },
  ];
}

/**
 * Classifies the best available move (ignoring candidateCol, finds the strongest pattern).
 * Delegates to classify() using the column with the highest solver score.
 * @param {string} moves
 * @param {number[]} scores  c4solver scores per column
 * @returns {object}  classification result from classify()
 * @complexity O(42)
 * @cache not cached
 */
export function classifyBestMove(moves, scores) {
  const maxScore = Math.max(...scores);
  const bestCol = scores.indexOf(maxScore);
  return classify(moves, bestCol, scores);
}
