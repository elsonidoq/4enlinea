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

  // ── Categories 3 & 4: build post-move board once for both checks ─────────
  if (board.colHeights[candidateCol] < ROWS) {
    const nextBoard = board.withMove(candidateCol);

    // ── Category 3: Double Threat ───────────────────────────────────────────
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

    // ── Category 4: Forced Win ──────────────────────────────────────────────
    if (detectForcedWin(nextBoard, board.currentPlayer).matched) {
      return { tag: 'forced_win' };
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
export function detectZThreat(board, scores, perspective = board.currentPlayer, solver = null) {
  // FR-033: when perspective != current player, recurse into all child moves
  if (perspective !== board.currentPlayer && solver) {
    return (async () => {
      const playableCols = [];
      for (let c = 0; c < COLS; c++) {
        if (board.colHeights[c] < ROWS) playableCols.push(c);
      }
      for (const c of playableCols) {
        const childMs = board.movestring + c;
        let childScores;
        try { childScores = await solver.query(childMs); }
        catch { return { matched: false, cells: [] }; } // terminal position → pattern doesn't apply
        const childBoard = new Board(childMs);
        const result = await detectZThreat(childBoard, childScores, perspective, solver);
        if (!result.matched) return { matched: false, cells: [] };
      }
      return { matched: true, cells: [] };
    })();
  }

  const candidates = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (scores[col] <= 0) continue;

    // Find lowest threat row: first empty cell where placing wins (checkWin is mutation-free)
    let threatRow = -1;
    for (let row = board.colHeights[col]; row < ROWS; row++) {
      if (checkWin(board.board, row, col, perspective)) { threatRow = row; break; }
    }
    if (threatRow === -1) continue;

    const count = threatRow - board.colHeights[col] + 1; // inclusive cell count
    if (count % 2 === 1) {
      candidates.push({ col, fromRow: board.colHeights[col], toRow: threatRow, badgeCount: count });
    }
  }

  if (candidates.length !== 1) return { matched: false, cells: [] };
  const { col, fromRow, toRow, badgeCount } = candidates[0];
  return {
    matched: true,
    cells: [],
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
export function detectUndercut(board, scores, perspective = board.currentPlayer) {
  // @see allen-t4, allen-t5, allen-t2
  const threats    = board.reachableThreats(perspective); // Map<col, row[]>
  const oppThreats = board.reachableThreats(3 - perspective);

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
      const hCells = [
        { column: col, row: kill, role: 'killing_threat' },
        { column: col, row: R,    role: 'dead_threat' },
      ];
      return {
        matched: true,
        cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
        highlightMetadata: {
          type: 'cells',
          cells: hCells,
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false, cells: [] };
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
export function detectOvercut(board, scores, perspective = board.currentPlayer) {
  // @see allen-t4, allen-t5, allen-t2
  const threats    = board.reachableThreats(perspective);
  const oppThreats = board.reachableThreats(3 - perspective);

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
      const hCells = [
        { column: col, row: neutralised, role: 'neutralised_threat' },
        { column: col, row: R,           role: 'major_threat' },
      ];
      return {
        matched: true,
        reason: isT4SameParity(R, neutralised) ? 'same_parity_t4'
              : isT5Exception(R, neutralised) ? 'active_forcing'
              : 'chain_t2',
        cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
        highlightMetadata: {
          type: 'cells',
          cells: hCells,
        },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false, cells: [] };
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
export function detectFigure7(board, scores, perspective = board.currentPlayer) {
  const currentPlayer = perspective;

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

        const hCells = placed.map(c => ({ column: c.col, row: c.row, role: 'pattern_piece' }));
        return {
          matched: true,
          cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
          highlightMetadata: {
            type: 'cells',
            cells: hCells,
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
  return { matched: false, cells: [] };
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
export function detectJShape(board, scores, perspective = board.currentPlayer) {
  function tryTemplate(placed, completing, farCol) {
    if (!placed.every(cell => board.board[cell.row][cell.col] === perspective)) return false;
    if (board.board[completing.row][completing.col] !== 0) return false;
    if (board.colHeights[completing.col] !== completing.row) return false;
    // J4: opponent must not occupy the far column at the completing row
    if (board.board[completing.row][farCol] === 3 - perspective) return false;
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
          if (checkWin(board.board, row, farCol, 3 - perspective)) oppOddInFarCol = true;
        }
        if (oppOddInFarCol) continue;
        const hCells = placed.map(cell => ({ column: cell.col, row: cell.row, role: 'pattern_piece' }));
        return {
          matched: true,
          cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
          highlightMetadata: {
            type: 'cells',
            cells: hCells,
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
          if (checkWin(board.board, row, farCol, 3 - perspective)) oppOddInFarCol = true;
        }
        if (oppOddInFarCol) continue;
        const hCells = placed.map(cell => ({ column: cell.col, row: cell.row, role: 'pattern_piece' }));
        return {
          matched: true,
          cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
          highlightMetadata: {
            type: 'cells',
            cells: hCells,
          },
          correctCol: completing.col,
          categoryEvidence: {
            pattern_cells: placed.map(cell => ({ column: cell.col, row: cell.row })),
          },
        };
      }
    }
  }

  return { matched: false, cells: [] };
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
export function detectOddEvenThreat(board, scores, perspective = board.currentPlayer, solver = null) {
  // FR-033: when perspective != current player, recurse into all child moves
  if (perspective !== board.currentPlayer && solver) {
    return (async () => {
      const playableCols = [];
      for (let c = 0; c < COLS; c++) {
        if (board.colHeights[c] < ROWS) playableCols.push(c);
      }
      for (const c of playableCols) {
        const childMs = board.movestring + c;
        let childScores;
        try { childScores = await solver.query(childMs); }
        catch { return { matched: false, cells: [] }; } // terminal position → pattern doesn't apply
        const childBoard = new Board(childMs);
        const result = await detectOddEvenThreat(childBoard, childScores, perspective, solver);
        if (!result.matched) return { matched: false, cells: [] };
      }
      return { matched: true, cells: [] };
    })();
  }

  // Odd-even threat is Red-only (FR-009)
  if (perspective !== 1) return { matched: false, cells: [] };

  const oddRowMoves  = []; // { col, landingRow } where landingRow % 2 === 0 (Red parity)
  const evenRowMoves = []; // { col, landingRow } where landingRow % 2 === 1 (Yellow parity)

  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] >= 6) continue;
    const landingRow = board.colHeights[col];
    // FR-006 condition 2: use immediateThreats, not getMajorThreatCells
    const afterBoard = board.withMove(col);
    if (afterBoard.immediateThreats(perspective).length > 0) {
      if (landingRow % 2 === 0) oddRowMoves.push({ col, landingRow });
      else                       evenRowMoves.push({ col, landingRow });
    }
  }

  // FR-006 conditions 3+4: need at least one odd-row AND one even-row threat
  if (oddRowMoves.length === 0 || evenRowMoves.length === 0) return { matched: false, cells: [] };

  // FR-008 (both-on-odd-row tie-break) is unreachable: FR-006 condition 4 requires
  // one even-row threat, so any position where all threats are odd-row is filtered above.
  // The `scores` parameter is accepted for signature consistency but never read.

  // FR-007: correctCol = the column whose threat lands on the odd row (Red's parity)
  const correctCol = oddRowMoves[0].col;
  return {
    matched: true,
    cells: [],
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
export function detectClaimodd(board, scores, perspective = board.currentPlayer) {
  // Claimodd is Red-only (FR-009)
  if (perspective !== 1) return { matched: false, cells: [] };

  // All columns must have even heights
  for (let col = 0; col < board.colHeights.length; col++) {
    if (board.colHeights[col] % 2 !== 0) return { matched: false, cells: [] };
  }

  // Center column must not be full
  if (board.colHeights[3] >= 6) return { matched: false, cells: [] };

  // scores[3] must be positive and tie the maximum legal score
  if (!scores || scores[3] <= 0) return { matched: false, cells: [] };

  const legalScores = [];
  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] < 6) legalScores.push(scores[col]);
  }
  const maxLegal = Math.max(...legalScores);

  if (scores[3] !== maxLegal) return { matched: false, cells: [] };

  const correctCol = 3;
  return {
    matched: true,
    correctCol,
    cells: [`c${correctCol + 1}r${board.colHeights[correctCol] + 1}`],
  };
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
export async function detectClaimeven(board, solver, perspective = board.currentPlayer) {
  // Claimeven is Yellow-only: guard out if perspective != Yellow
  if (perspective !== 2 || board.movestring.length === 0) return { matched: false, cells: [] };

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
    if (!oddCols.includes(lastCol)) return { matched: false, cells: [] };
    subtype = 'B';
    baseinversePair = [...oddCols];
    correctCol = oddCols.find(c => c !== lastCol);
  } else {
    return { matched: false, cells: [] };
  }

  // Run simulation from position after correct move
  const newMoves = board.movestring + correctCol.toString();
  const simResult = await runClaimevenSimulation(newMoves, solver);
  if (!simResult.yellowWins) return { matched: false, cells: [] };

  return {
    matched: true,
    cells: [],
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
 * Detects columns where current player can win immediately (gravity-top only).
 * @param {Board} board
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectImmediateThreat(board, perspective = board.currentPlayer) {
  const cols = board.immediateThreats(perspective);
  if (cols.length === 0) return { matched: false, cells: [] };
  const cells = cols.map(col => `c${col + 1}r${board.colHeights[col] + 1}`);
  return { matched: true, cols, cells };
}

/**
 * Detects whether the perspective player has a double threat on the current board:
 * ≥2 gravity-top reachable threats (Case A) or two consecutive-row threats in the
 * same column (Case B). Unlike classify() which checks after playing a candidate,
 * this evaluates the board as-is — suitable for classifyPattern/tagBlunder.
 * @param {Board} board
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectDoubleThreat(board, perspective = board.currentPlayer) {
  const threatCells = [];
  for (const [col, rows] of board.reachableThreats(perspective)) {
    for (const row of rows) threatCells.push({ col, row });
  }

  // Case A: gravity-top threats in ≥2 distinct columns
  const gravityTopCols = new Set(
    threatCells.filter(t => t.row === board.colHeights[t.col]).map(t => t.col)
  );
  if (gravityTopCols.size >= 2) {
    const cols = [...gravityTopCols];
    const cells = cols.map(col => `c${col + 1}r${board.colHeights[col] + 1}`);
    return { matched: true, cols, cells };
  }

  // Case B: consecutive-row threats in the same column
  const byCol = {};
  for (const t of threatCells) {
    if (!byCol[t.col]) byCol[t.col] = [];
    byCol[t.col].push(t.row);
  }
  for (const [colStr, rows] of Object.entries(byCol)) {
    const sorted = rows.sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] === sorted[i] + 1) {
        const col = parseInt(colStr);
        const cells = [`c${col + 1}r${board.colHeights[col] + 1}`];
        return { matched: true, cols: [col], cells };
      }
    }
  }

  return { matched: false, cells: [] };
}

/**
 * Detects forced-block columns: opponent has immediate threats and only specific columns
 * (with non-negative score) neutralise them while other columns fail to.
 * @param {Board} board
 * @param {number[]} scores
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @param {object} [solver]  c4solver wrapper (required for FR-033 perspective mismatch)
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7²)
 * @cache not cached
 */
export function detectForcedBlock(board, scores, perspective = board.currentPlayer, solver = null) {
  // FR-033: when perspective != current player, recurse into all child moves
  if (perspective !== board.currentPlayer && solver) {
    return (async () => {
      const playableCols = [];
      for (let c = 0; c < COLS; c++) {
        if (board.colHeights[c] < ROWS) playableCols.push(c);
      }
      for (const c of playableCols) {
        const childMs = board.movestring + c;
        let childScores;
        try { childScores = await solver.query(childMs); }
        catch { return { matched: false, cells: [] }; } // terminal position → pattern doesn't apply
        const childBoard = new Board(childMs);
        const result = await detectForcedBlock(childBoard, childScores, perspective, solver);
        if (!result.matched) return { matched: false, cells: [] };
      }
      return { matched: true, cells: [] };
    })();
  }

  if (board.immediateThreats(3 - perspective).length === 0) return { matched: false, cells: [] };
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (scores[col] < 0) continue;
    const nextBoard = board.withMove(col);
    if (nextBoard.immediateThreats(3 - perspective).length > 0) continue;
    const someOtherFails = scores.some((_, i) => {
      if (i === col || board.colHeights[i] >= ROWS) return false;
      return board.withMove(i).immediateThreats(3 - perspective).length > 0;
    });
    if (someOtherFails) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false, cells: [] };
  return { matched: true, cols: matchedCols, cells: [] };
}

/**
 * Detects forced-win (opponent is winning) columns: all scores ≤ 0 and the column
 * has the best (least-negative) score while strictly worse alternatives exist.
 * @param {Board} board
 * @param {number[]} scores
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @param {object} [solver]  c4solver wrapper (required for FR-033 perspective mismatch)
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectForcedWin(board, perspective = board.currentPlayer, maxDepth = 8) {
  if (maxDepth <= 0) return { matched: false, cells: [] };

  // Do not match if the board already has a double_threat — that's Category 3.
  // forced_win requires at least one forcing step before the terminal condition.
  if (detectDoubleThreat(board, perspective).matched) return { matched: false, cells: [] };

  // Need exactly 1 immediate threat to force the opponent's response.
  // 0 = no forcing pressure; ≥2 = already a double_threat (caught above).
  const myThreats = board.immediateThreats(perspective);
  if (myThreats.length !== 1) return { matched: false, cells: [] };

  const blockCol = myThreats[0];
  if (board.colHeights[blockCol] >= ROWS) return { matched: false, cells: [] };

  const afterBlock = board.withMove(blockCol);
  const opponent = 3 - perspective;

  // If opponent gains an immediate threat after blocking, the chain is broken.
  if (afterBlock.immediateThreats(opponent).length > 0) return { matched: false, cells: [] };

  // Try all user continuation moves.
  for (let col = 0; col < COLS; col++) {
    if (afterBlock.colHeights[col] >= ROWS) continue;

    const row = afterBlock.colHeights[col];
    const afterUser = afterBlock.withMove(col);

    // Terminal 1: user wins immediately with this continuation.
    if (afterUser.checkWin(row, col, perspective)) return { matched: true, cells: [] };

    // Terminal 2: user creates a double_threat with this continuation.
    if (detectDoubleThreat(afterUser, perspective).matched) return { matched: true, cells: [] };

    // Recurse: continue the forcing chain.
    if (detectForcedWin(afterUser, perspective, maxDepth - 2).matched) return { matched: true, cells: [] };
  }

  return { matched: false, cells: [] };
}

/**
 * Detects forbidden columns: in a losing position (all scores ≤ 0), columns whose play
 * immediately hands the opponent a winning move.
 * @param {Board} board
 * @param {number[]} scores
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @param {object} [solver]  c4solver wrapper (required for FR-033 perspective mismatch)
 * @returns {{ matched: boolean, cols?: number[] }}
 * @complexity O(7)
 * @cache not cached
 */
export function detectForbiddenColumns(board, scores, perspective = board.currentPlayer, solver = null) {
  // FR-033: when perspective != current player, recurse into all child moves
  if (perspective !== board.currentPlayer && solver) {
    return (async () => {
      const playableCols = [];
      for (let c = 0; c < COLS; c++) {
        if (board.colHeights[c] < ROWS) playableCols.push(c);
      }
      for (const c of playableCols) {
        const childMs = board.movestring + c;
        let childScores;
        try { childScores = await solver.query(childMs); }
        catch { return { matched: false, cells: [] }; } // terminal position → pattern doesn't apply
        const childBoard = new Board(childMs);
        const result = await detectForbiddenColumns(childBoard, childScores, perspective, solver);
        if (!result.matched) return { matched: false, cells: [] };
      }
      return { matched: true, cells: [] };
    })();
  }

  if (!scores.every(s => s <= 0)) return { matched: false, cells: [] };
  // Only count columns where the opponent had NO immediate threat before but gains one after.
  // If the opponent already had a threat, failing to block it is a forced_block, not forbidden_columns.
  if (board.immediateThreats(3 - perspective).length > 0) return { matched: false, cells: [] };
  const matchedCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (board.withMove(col).immediateThreats(3 - perspective).length > 0) matchedCols.push(col);
  }
  if (matchedCols.length === 0) return { matched: false, cells: [] };
  return { matched: true, cols: matchedCols, cells: [] };
}

/**
 * Classifies a position by running all 13 pattern detectors for a specific perspective.
 * Returns a Map from matching tag string to { cells: string[] } (never contains 'unknown').
 * cells wire format: "c{col+1}r{row+1}" (1-indexed). cells: [] when detector has no spatial output.
 *
 * NOTE: This inline list is the sole registry of pattern detectors.
 * Adding a new detector requires an entry in this list only.
 *
 * @param {string} ms  movestring (0-indexed)
 * @param {number} perspective  1 or 2
 * @param {object} solver  c4solver wrapper with .query(ms) → Promise<number[]>
 * @returns {Promise<Map<string, { cells: string[] }>>}
 */
export async function classifyPattern(ms, perspective, solver) {
  const board = new Board(ms);
  const scores = await solver.query(ms);
  const tags = new Map();

  const detectors = [
    // Sync detectors — non-score-consuming
    ['immediate_threat',  () => detectImmediateThreat(board, perspective)],
    ['double_threat',     () => detectDoubleThreat(board, perspective)],
    // Score-consuming detectors: pass solver for the recursive perspective case (FR-033)
    ['forced_block',      () => detectForcedBlock(board, scores, perspective, solver)],
    ['forced_win',        () => detectForcedWin(board, perspective)],
    ['forbidden_columns', () => detectForbiddenColumns(board, scores, perspective, solver)],
    ['z_threat',          () => detectZThreat(board, scores, perspective, solver)],
    ['odd_even_threat',   () => detectOddEvenThreat(board, scores, perspective, solver)],
    // Non-score-consuming (no recursive solver step needed)
    ['undercut',          () => detectUndercut(board, scores, perspective)],
    ['overcut',           () => detectOvercut(board, scores, perspective)],
    ['figure_7',          () => detectFigure7(board, scores, perspective)],
    ['j_shape',           () => detectJShape(board, scores, perspective)],
    ['claimodd',          () => detectClaimodd(board, scores, perspective)],
    // Async detector (uses solver internally for simulation)
    ['claimeven',         () => detectClaimeven(board, solver, perspective)],
  ];

  await Promise.all(detectors.map(async ([tag, fn]) => {
    const result = await fn();
    if (result.matched) tags.set(tag, { cells: result.cells });
  }));

  return tags;
}

/**
 * Tags a blunder move with a tactical pattern from the perspective of the player
 * who made the move. Never throws — all errors resolve to the solver-error fallback.
 *
 * Algorithm:
 *   Steps 1–3: compute blunderer & opponent pattern sets for pre- and post-move positions
 *   Step 4 (lazy): compute after-blunder and after-correct continuation patterns
 *   Step 5: score-based fallback (drawing_move or suboptimal_move)
 *
 * @param {string} moves  movestring of the position where the blunder was made
 * @param {number} playedCol  0-indexed column the player actually played
 * @param {number} correctCol  0-indexed best column
 * @param {object} solver  c4solver wrapper
 * @returns {Promise<{tag: string, direction: string, reason: string}>}
 */
export async function tagBlunder(moves, playedCol, correctCol, solver) {
  try {
    // Degenerate detection — BEFORE any solver calls
    const board = new Board(moves);
    if (board.hasWon(1) || board.hasWon(2)) {
      return { tag: 'suboptimal_move', direction: 'missed_own',
               reason: 'degenerate position: board is already won' };
    }
    if (moves.length >= 42) {
      return { tag: 'suboptimal_move', direction: 'missed_own',
               reason: 'degenerate position: board is full' };
    }

    // Derive blunderer and opponent from move count parity
    const blunderer = moves.length % 2 === 0 ? 1 : 2; // even move count → Red opens
    const opponent  = 3 - blunderer;

    // Short alias: classify patterns for a position from a player's perspective.
    // Returns a Set<string> of matched tags — wraps classifyPattern (which now returns Map).
    const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys());

    // bm(ms): best-move function — argmax of solver scores, lowest-index tie-break
    const bm = async (ms) => {
      const scores = await solver.query(ms);
      return scores.indexOf(Math.max(...scores));
    };

    // --- Steps 1–3: computed upfront ---
    const [
      pMovesBlunderer,
      pAfterPlayedBlunderer,
      pAfterPlayedOpponent,
    ] = await Promise.all([
      P(moves,             blunderer),
      P(moves + playedCol, blunderer),
      P(moves + playedCol, opponent),
    ]);

    // Step 1: Defensive miss — blunderer had forced_block before playing
    if (pMovesBlunderer.has('forced_block')) {
      return { tag: 'forced_block', direction: 'defensive_miss',
               reason: 'matched defensive_miss: forced_block' };
    }

    // Step 2: Enabled immediate threat (1-ply) — opponent has immediate_threat after blunder
    if (pAfterPlayedOpponent.has('immediate_threat')) {
      return { tag: 'immediate_threat', direction: 'enabled_opponent',
               reason: 'matched enabled_opponent: immediate_threat' };
    }

    // Step 3: Missed own — tags the blunderer had before but lost after playing
    const MISSED_OWN_PRIORITY = [
      'immediate_threat', 'forced_win', 'double_threat', 'z_threat', 'odd_even_threat',
      'figure_7', 'j_shape', 'overcut', 'claimeven', 'claimodd',
    ];
    for (const t of MISSED_OWN_PRIORITY) {
      if (pMovesBlunderer.has(t) && !pAfterPlayedBlunderer.has(t)) {
        return { tag: t, direction: 'missed_own', reason: `matched missed_own: ${t}` };
      }
    }

    // --- Step 4: Lazy — compute after_blunder and after_correct only now ---
    const afterBlunderMs = moves + playedCol  + (await bm(moves + playedCol)).toString();
    const afterCorrectMs = moves + correctCol + (await bm(moves + correctCol)).toString();

    const [
      pAfterBlunderOpponent,
      pAfterCorrectOpponent,
      pAfterBlunderBlunderer,
      pAfterCorrectBlunderer,
    ] = await Promise.all([
      P(afterBlunderMs, opponent),
      P(afterCorrectMs, opponent),
      P(afterBlunderMs, blunderer),
      P(afterCorrectMs, blunderer),
    ]);

    const STEP4_PRIORITY = [
      { tag: 'forced_win',      check: () => pAfterBlunderOpponent.has('forced_win')      && !pAfterCorrectOpponent.has('forced_win') },
      { tag: 'double_threat',   check: () => pAfterBlunderOpponent.has('double_threat')   && !pAfterCorrectOpponent.has('double_threat') },
      { tag: 'z_threat',        check: () => pAfterBlunderOpponent.has('z_threat')        && !pAfterCorrectOpponent.has('z_threat') },
      { tag: 'odd_even_threat', check: () => pAfterBlunderOpponent.has('odd_even_threat') && !pAfterCorrectOpponent.has('odd_even_threat') },
      { tag: 'figure_7',        check: () => pAfterBlunderOpponent.has('figure_7')        && !pAfterCorrectOpponent.has('figure_7') },
      { tag: 'j_shape',         check: () => pAfterBlunderOpponent.has('j_shape')         && !pAfterCorrectOpponent.has('j_shape') },
      // undercut uses enabled_self (blunderer's after-positions), not enabled_opp —
      // per FR-024/FR-025: undercut names the blunderer's exposure, not an opponent gain
      { tag: 'undercut',        check: () => pAfterBlunderBlunderer.has('undercut')       && !pAfterCorrectBlunderer.has('undercut') },
      { tag: 'claimeven',       check: () => pAfterBlunderOpponent.has('claimeven')       && !pAfterCorrectOpponent.has('claimeven') },
      { tag: 'claimodd',        check: () => pAfterBlunderOpponent.has('claimodd')        && !pAfterCorrectOpponent.has('claimodd') },
    ];
    for (const { tag, check } of STEP4_PRIORITY) {
      if (check()) {
        return { tag, direction: 'enabled_opponent', reason: `matched enabled_opponent: ${tag}` };
      }
    }

    // Step 5: Score-based fallbacks
    const preScores  = await solver.query(moves);
    const postScores = await solver.query(moves + playedCol);
    const preScore   = Math.max(...preScores);
    const postScore  = Math.max(...postScores);

    if (preScore > 0 && postScore === 0) {
      return { tag: 'drawing_move', direction: 'missed_own',
               reason: 'win dropped to draw, no pattern detected' };
    }

    return { tag: 'suboptimal_move', direction: 'missed_own', reason: 'no pattern detected' };

  } catch (err) {
    return { tag: 'suboptimal_move', direction: 'missed_own',
             reason: `solver error: ${err.message}` };
  }
}
