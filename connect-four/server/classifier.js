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

// ── Threat categorization (canonical, low-level) ───────────────────────────────
// Moved here from explainContext.js so it is importable by classifyPattern detectors,
// explainContext.js (summarizeThreats), and sparseLookahead.js without an import cycle
// (classifier.js imports neither of those modules).

// Build a set of all disc-pair keys from major threat windows (3 player discs + 1 empty).
// Each pair is stored as a canonical sorted string "r1,c1|r2,c2" for all C(3,2)=3 pairs
// within each major window. Used to filter shadow minor threats.
function buildMajorDiscPairSet(rawBoard, disc) {
  const opponent = disc === 1 ? 2 : 1;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const pairSet = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        let player = 0, opp = 0, valid = true;
        const discCells = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
          if (rawBoard[nr][nc] === disc) { player++; discCells.push([nr, nc]); }
          else if (rawBoard[nr][nc] === opponent) opp++;
        }
        if (!valid || player !== 3 || opp !== 0) continue;
        for (let i = 0; i < discCells.length; i++) {
          for (let j = i + 1; j < discCells.length; j++) {
            const [r1, c1] = discCells[i], [r2, c2] = discCells[j];
            pairSet.add(`${r1},${c1}|${r2},${c2}`);
          }
        }
      }
    }
  }
  return pairSet;
}

// Return all distinct 4-windows with exactly 2 of `disc` and 2 empty cells (no opponent discs),
// excluding windows whose disc pair is a subset of any major threat window's disc triplet
// (those are "shadow" windows that arise from sliding along the same run as a major threat).
// Each window is enumerated once by its (r, c, direction) starting point — no double-counting.
// Returns Array<Array<[number,number]>> — each window is an array of 4 [r, c] pairs (0-indexed).
export function getMinorThreatWindows(rawBoard, disc) {
  const majorPairs = buildMajorDiscPairSet(rawBoard, disc);
  const opponent = disc === 1 ? 2 : 1;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const windows = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        let player = 0, opp = 0, valid = true;
        const cells = [];
        const discCells = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
          cells.push([nr, nc]);
          if (rawBoard[nr][nc] === disc) { player++; discCells.push([nr, nc]); }
          else if (rawBoard[nr][nc] === opponent) opp++;
        }
        if (!valid || player !== 2 || opp !== 0) continue;
        const [r1, c1] = discCells[0], [r2, c2] = discCells[1];
        if (majorPairs.has(`${r1},${c1}|${r2},${c2}`)) continue;
        windows.push(cells);
      }
    }
  }
  return windows;
}

// Return deduplicated sorted "cNrM" strings for the empty cells within a list of windows.
export function emptyCellsFromWindows(rawBoard, windows) {
  const seen = new Set();
  for (const window of windows) {
    for (const [r, c] of window) {
      if (rawBoard[r][c] === 0) seen.add(`c${c + 1}r${r + 1}`);
    }
  }
  return [...seen].sort();
}

/**
 * Canonical threat categorizer. For BOTH the to-move perspective ("player") and its
 * opponent, partitions latent threats into three buckets:
 *   - majorParityAligned: 3-disc major threats whose empty cell sits on that side's
 *     natural parity row (aligned ⟺ row % 2 === (P - 1); P = that side's perspective)
 *   - majorNonParity:     major threats on the off-parity row
 *   - minor:              app-canonical minor-threat empty cells (shadow windows excluded)
 *
 * Major threats EXCLUDE immediately-playable cells (row === colHeights[col]); those are
 * covered by the immediate_threat tag. Minors use getMinorThreatWindows (NOT the rn/yn
 * flags), so 2-disc windows shadowed by a major window are excluded.
 *
 * @param {Board} board
 * @param {1|2} perspective  the to-move / "player" side
 * @returns {{ player: {majorParityAligned:{count,cells}, majorNonParity:{count,cells}, minor:{count,cells}},
 *             opponent: {...same shape...} }}  cells are "cNrM" 1-indexed strings, sorted.
 */
export function categorizeThreats(board, perspective) {
  const opponent = 3 - perspective;
  const threatMap = getMajorThreatCells(board.board);

  const mkBuckets = () => ({
    majorParityAligned: { count: 0, cells: [] },
    majorNonParity:     { count: 0, cells: [] },
    minor:              { count: 0, cells: [] },
  });
  const result = { player: mkBuckets(), opponent: mkBuckets() };

  const sides = [
    { side: 'player',   persp: perspective, majFlag: perspective === 1 ? 'rm' : 'ym' },
    { side: 'opponent', persp: opponent,    majFlag: opponent === 1    ? 'rm' : 'ym' },
  ];

  for (const { side, persp, majFlag } of sides) {
    for (const [key, flags] of Object.entries(threatMap)) {
      const [r, c] = key.split(',').map(Number);
      if (r === board.colHeights[c]) continue; // exclude immediately-playable
      if (!flags[majFlag]) continue;
      const cell = `c${c + 1}r${r + 1}`;
      if (r % 2 === (persp - 1)) result[side].majorParityAligned.cells.push(cell);
      else                       result[side].majorNonParity.cells.push(cell);
    }
    const windows = getMinorThreatWindows(board.board, persp);
    result[side].minor.cells = emptyCellsFromWindows(board.board, windows);
  }

  for (const side of ['player', 'opponent']) {
    for (const bucket of ['majorParityAligned', 'majorNonParity', 'minor']) {
      result[side][bucket].cells.sort();
      result[side][bucket].count = result[side][bucket].cells.length;
    }
  }
  return result;
}

// ── First-class threat pattern detectors (geometry-only; perspective-independent) ──
// Each emits the union of completing cells for the to-move perspective in its category.
// No FR-033 solver IIFE — threat geometry does not depend on whose turn the solver thinks
// it is. Shape matches figure_7/j_shape: { matched, cells }.
export function detectMajorThreatParity(board, perspective = board.currentPlayer) {
  const cells = categorizeThreats(board, perspective).player.majorParityAligned.cells;
  return { matched: cells.length > 0, cells };
}

export function detectMajorThreatNonParity(board, perspective = board.currentPlayer) {
  const cells = categorizeThreats(board, perspective).player.majorNonParity.cells;
  return { matched: cells.length > 0, cells };
}

export function detectMinorThreat(board, perspective = board.currentPlayer) {
  const cells = categorizeThreats(board, perspective).player.minor.cells;
  return { matched: cells.length > 0, cells };
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
 * Per-turn probability that the non-perfect sparring AI makes a deliberate mistake.
 * The only difficulty knob (softmax was removed): every other move is optimal.
 */
export const SPARRING_MISTAKE_RATES = {
  easy: 1 / 2,
  medium: 1 / 4,
  hard: 1 / 8,
  perfect: 0,
};

/**
 * Choose the sparring AI's move for a non-perfect difficulty.
 *
 * Priority: take an own win-in-1 first (always); otherwise roll for a deliberate
 * mistake. A non-mistake plays the optimal (argmax-score) column with random
 * tie-break. A mistake blocks an opponent win-in-1 if one exists, else samples
 * uniformly from columns that are strictly worse than best AND do not hand the
 * opponent a win-in-1 (a genuine but non-suicidal mistake); it falls back to
 * optimal only when no such move exists.
 *
 * `scores` are c4solver scores (INVALID_MOVE for full columns). `rng` is injected
 * for deterministic tests: consumed once for the mistake roll, then once more for
 * the uniform pick when a pool is sampled.
 *
 * @param {Board} board       position with the AI to move
 * @param {string} difficulty 'easy' | 'medium' | 'hard' | 'perfect'
 * @param {number[]} scores   per-column solver scores
 * @param {() => number} rng  uniform [0,1) source (default Math.random)
 * @returns {number} chosen 0-indexed column
 */
export function chooseSparringMove(board, difficulty, scores, rng = Math.random) {
  const me = board.currentPlayer;
  const opp = board.opponent;

  // 1. Own immediate win — take it, before rolling for a mistake.
  const myWins = board.immediateThreats(me);
  if (myWins.length > 0) return myWins[0];

  // Legal columns and the optimal (argmax) set.
  const playable = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) playable.push(c);
  const best = Math.max(...playable.map(c => scores[c]));
  const bestCols = playable.filter(c => scores[c] === best);

  const pick = (pool) => pool[Math.floor(rng() * pool.length)];

  // 2. Roll for a deliberate mistake.
  const rate = SPARRING_MISTAKE_RATES[difficulty] ?? 0;
  if (rng() >= rate) return pick(bestCols); // no mistake → optimal

  // 3a. Never concede: block an opponent win-in-1 (covers the unblockable ≥2 case).
  const oppThreats = board.immediateThreats(opp);
  if (oppThreats.length > 0) return oppThreats[0];

  // 3b. Sample a strictly-worse move that does not hand the opponent a win-in-1.
  const forbidden = new Set(
    playable.filter(c => board.withMove(c).immediateThreats(opp).length > 0),
  );
  const mistakePool = playable.filter(c => scores[c] < best && !forbidden.has(c));
  if (mistakePool.length > 0) return pick(mistakePool);

  // 3c. No safe strictly-worse move exists → fall back to optimal.
  return pick(bestCols);
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
 * True if `player` has a double threat on `board`, evaluated as-is (no candidate move).
 *
 * Extracted verbatim from the inline logic classify() has always used for its post-move
 * double_threat check, so the SAME predicate can also run on the PRE-move board for transition
 * gating (praise only an absent→present creation).
 *
 * NOTE: this intentionally differs from the exported detectDoubleThreat() in Case B. This loose
 * variant matches ANY two consecutive-row reachable threats in a column; detectDoubleThreat()
 * additionally requires the lower threat to sit at the gravity-top. They are NOT interchangeable:
 * swapping classify() to detectDoubleThreat() would change existing post-move classifications
 * (e.g. '3333344044114' col0 stops being double_threat). Reconciling the two loose/strict Case B
 * definitions is out of scope here — see
 * docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md.
 *
 * @param {Board} board
 * @param {number} player  1 or 2
 * @returns {boolean}
 */
function hasDoubleThreat(board, player) {
  const threatCells = [];
  for (const [col, rows] of board.reachableThreats(player)) {
    for (const row of rows) threatCells.push({ col, row });
  }

  // Case A: two or more distinct columns each have a threat at their gravity-top
  const gravityTopCols = new Set(
    threatCells.filter(t => t.row === board.colHeights[t.col]).map(t => t.col)
  );
  if (gravityTopCols.size >= 2) return true;

  // Case B: two consecutive-row threats in the same column (opponent needs 2 turns to block)
  const byCol = {};
  for (const t of threatCells) {
    if (!byCol[t.col]) byCol[t.col] = [];
    byCol[t.col].push(t.row);
  }
  for (const rows of Object.values(byCol)) {
    const sorted = rows.sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] === sorted[i] + 1) return true;
    }
  }

  return false;
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
    // Only praise a double threat this move CREATED: present on the post-move board AND
    // absent on the pre-move board, both from the mover's perspective. A double threat that
    // was already present and merely persists is not "created" here — fall through so the
    // coach does not repeat "you created the double threat" on every subsequent move.
    const player = board.currentPlayer;
    if (hasDoubleThreat(nextBoard, player) && !hasDoubleThreat(board, player)) {
      return { tag: 'double_threat' };
    }

    // ── Category 4: Forced Win ──────────────────────────────────────────────
    // Same transition rule as double_threat: only when this move ESTABLISHED the forced win
    // (present after, absent before). A forced win, once made, persists under optimal play, so
    // without this gate every subsequent move would re-fire "you have a forced win".
    if (detectForcedWin(nextBoard, player).matched && !detectForcedWin(board, player).matched) {
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

// ── Convolution helpers ───────────────────────────────────────────────

/**
 * Slides a binary kernel over every valid anchor position on the board.
 * Returns all positions where playerCells are occupied by `perspective`
 * and emptyCells are vacant (0).
 *
 * @param {Board} board
 * @param {number} perspective  1 or 2 — player whose discs form the O cells
 * @param {{ rows: number, cols: number,
 *           playerCells: Array<{row: number, col: number}>,
 *           emptyCells:  Array<{row: number, col: number}> }} kernel
 * @returns {Array<{ anchorRow: number, anchorCol: number,
 *                   playerCells: Array<{row: number, col: number}> }>}
 */
function convolve(board, perspective, kernel) {
  const matches = [];
  for (let ar = 0; ar <= ROWS - kernel.rows; ar++) {
    for (let ac = 0; ac <= COLS - kernel.cols; ac++) {
      let ok = true;
      for (const {row, col} of kernel.playerCells) {
        if (board.board[ar + row][ac + col] !== perspective) { ok = false; break; }
      }
      if (!ok) continue;
      for (const {row, col} of kernel.emptyCells) {
        if (board.board[ar + row][ac + col] !== 0) { ok = false; break; }
      }
      if (!ok) continue;
      matches.push({
        anchorRow: ar,
        anchorCol: ac,
        playerCells: kernel.playerCells.map(({row, col}) => ({row: ar + row, col: ac + col})),
      });
    }
  }
  return matches;
}

/** Returns the horizontal mirror of a kernel (col j → cols-1-j). */
function flipKernel(kernel) {
  return {
    rows: kernel.rows,
    cols: kernel.cols,
    playerCells: kernel.playerCells.map(({row, col}) =>
      ({row, col: kernel.cols - 1 - col})),
    emptyCells: kernel.emptyCells.map(({row, col}) =>
      ({row, col: kernel.cols - 1 - col})),
  };
}

// ── Shape kernels ─────────────────────────────────────────────────────
//
// Kernel diagrams use row 0 = bottom.  "O" = must be the perspective
// player's disc.  "F" = must be empty.  Blank = don't care.

// Figure-7 canonical (ascending diagonal + horizontal back to the left)
//   |   |   |   | F |    row r+3
//   |O  |O  | O | F |    row r+2
//   |   |O  |   |   |    row r+1
//   |O  |   |   |   |    row r
const F7 = {
  rows: 4, cols: 4,
  playerCells: [
    {row: 0, col: 0},  // diagonal bottom
    {row: 1, col: 1},  // diagonal middle
    {row: 2, col: 0},  // horizontal left
    {row: 2, col: 1},  // horizontal middle (junction)
    {row: 2, col: 2},  // horizontal right (diagonal top)
  ],
  emptyCells: [
    {row: 2, col: 3},  // right of horizontal terminus
    {row: 3, col: 3},  // upper-right corner
  ],
};
const F7_FLIPPED = flipKernel(F7);

// J-shape canonical (tall column on the left, hook on the right)
//   |   |   |   | F |    row r+3
//   |O  |O  | F | F |    row r+2
//   |   |O  |   |   |    row r+1
//   |O  |   |   |   |    row r
const J = {
  rows: 4, cols: 4,
  playerCells: [
    {row: 0, col: 0},  // tall column bottom
    {row: 1, col: 1},  // middle step
    {row: 2, col: 0},  // tall column top
    {row: 2, col: 1},  // hook
  ],
  emptyCells: [
    {row: 2, col: 2},  // right of hook — distinguishes from Figure-7
    {row: 2, col: 3},  // far right
    {row: 3, col: 3},  // upper-right corner
  ],
};
const J_FLIPPED = flipKernel(J);

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
 * Does a threat at row `kill` neutralise the opponent's threat directly above it at row `R`
 * in the same column? Pure row geometry — ownership-independent, so both undercut sides use it.
 * @see allen-t2, allen-t4, allen-t5
 */
function undercutKills(R, kill) {
  if (isT4SameParity(R, kill)) return false;                          // U1 @see allen-t4
  if (isT5Exception(R, kill)) return false;                           // U2 @see allen-t5
  if (R % 2 === 1 && kill % 2 === 0 && R !== kill + 1) return false;  // U3 @see allen-t2 sub-case 3
  return true;
}

/**
 * Shared core of the two undercut sides. One undercut situation, two roles:
 * the VICTIM owns the upper threat that dies, the BENEFICIARY owns the lower threat that
 * kills it. Both detectors anchor on the SIDE TO MOVE, because c4solver `scores` are always
 * the mover's — a score gate is meaningless for anyone else (this is the OI-74 defect).
 *
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column, from the side to move's perspective
 * @param {object} roles
 * @param {number} roles.victim       player whose upper threat dies
 * @param {number} roles.beneficiary  player whose lower threat kills it
 * @param {(s: number) => boolean} roles.scoreOk  gate on the mover's score for the column
 * @complexity O(42)
 * @cache not cached
 */
function detectUndercutCore(board, scores, { victim, beneficiary, scoreOk }) {
  const deadThreats = board.reachableThreats(victim);      // Map<col, row[]>
  const killThreats = board.reachableThreats(beneficiary);

  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || !scoreOk(scores[col])) continue;
    const deadRows = deadThreats.get(col) ?? [];
    const killRows = killThreats.get(col) ?? [];

    for (const R of deadRows) {
      // EVERY lower threat is a candidate killer — the upper threat is dead as soon as ANY of
      // them neutralises it. Inspecting only the lowest one (the original `find(rp => rp < R)`)
      // silently missed an adjacent T2 kill sitting above a same-parity T4 pair, which is
      // exactly the shape lesson 11 teaches.
      const kill = killRows.find(rp => rp < R && undercutKills(R, rp));
      if (kill === undefined) continue;
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
 * T007 — Undercut, VICTIM side: the side to move owns the threat that dies.
 * Finds column C where the mover has a threat at R and the opponent has a killing threat at
 * R' < R in the same column, and entering C loses for the mover (`scores[C] < 0`) — so the
 * drill is avoid-the-column. This is the `undercut` puzzle category and the `undercut` tag.
 *
 * There is deliberately NO `perspective` parameter: which player is victim and which is
 * beneficiary is fixed by who is to move, not by a caller argument. See
 * docs/architecture/server-conventions.md § "Undercut has two sides".
 *
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, cells: string[], highlightMetadata?: object }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectUndercutVictim(board, scores) {
  const mover = board.currentPlayer;
  return detectUndercutCore(board, scores, {
    victim: mover, beneficiary: 3 - mover, scoreOk: s => s < 0,
  });
}

/**
 * Undercut, BENEFICIARY side: the side to move owns the LOWER killing threat and pressing the
 * column wins (`scores[C] > 0`). The mirror of {@link detectUndercutVictim} on the same
 * geometry — this is the side lesson 11 teaches, and the matcher `undercut_t2_adjacent` in
 * scripts/find_lesson_boards.mjs validates its boards against.
 *
 * Not a `classifyPattern` tag: on a classifier board the side to move is the one facing the
 * decision, and the `undercut` tag names their exposure.
 *
 * @param {Board} board
 * @param {number[]} scores  c4solver scores per column
 * @returns {{ matched: boolean, cells: string[], highlightMetadata?: object }}
 * @complexity O(42)
 * @cache not cached
 */
export function detectUndercutBeneficiary(board, scores) {
  const mover = board.currentPlayer;
  return detectUndercutCore(board, scores, {
    victim: 3 - mover, beneficiary: mover, scoreOk: s => s > 0,
  });
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
 * Slides the Figure-7 kernel (canonical + flipped) over the board and returns
 * the first match.  The pattern is detected as-is: all 5 cells of the 7-shape
 * must be occupied by `perspective`.
 *
 * @param {Board} board
 * @param {*} _scores  unused — kept for caller signature compatibility
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @returns {{ matched: boolean, cells: string[], highlightMetadata?: object, categoryEvidence?: object }}
 * @complexity O(ROWS × COLS) = O(42)
 */
export function detectFigure7(board, _scores, perspective = board.currentPlayer) {
  for (const kernel of [F7, F7_FLIPPED]) {
    const matches = convolve(board, perspective, kernel);
    if (matches.length > 0) {
      const m = matches[0];
      const hCells = m.playerCells.map(({row, col}) =>
        ({column: col, row, role: 'pattern_piece'}));
      const threatCells = kernel.emptyCells
        .map(({row, col}) => ({row: m.anchorRow + row, col: m.anchorCol + col}))
        .sort((a, b) => a.row - b.row);
      return {
        matched: true,
        cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
        highlightMetadata: { type: 'cells', cells: hCells },
        categoryEvidence: {
          pattern_cells: m.playerCells.map(({row, col}) => ({column: col, row})),
        },
        threatCells,
      };
    }
  }
  return { matched: false, cells: [] };
}

/**
 * T010 — J-Shape detection.
 * Slides the J-shape kernel (canonical + flipped) over the board and returns
 * the first match.  The pattern is detected as-is: all 4 cells of the J-shape
 * must be occupied by `perspective`.
 *
 * @param {Board} board
 * @param {*} _scores  unused — kept for caller signature compatibility
 * @param {number} [perspective]  1 or 2 (default: board.currentPlayer)
 * @returns {{ matched: boolean, cells: string[], highlightMetadata?: object, categoryEvidence?: object }}
 * @complexity O(ROWS × COLS) = O(42)
 */
export function detectJShape(board, _scores, perspective = board.currentPlayer) {
  for (const kernel of [J, J_FLIPPED]) {
    const matches = convolve(board, perspective, kernel);
    if (matches.length > 0) {
      const m = matches[0];
      const hCells = m.playerCells.map(({row, col}) =>
        ({column: col, row, role: 'pattern_piece'}));
      return {
        matched: true,
        cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
        highlightMetadata: { type: 'cells', cells: hCells },
        categoryEvidence: {
          pattern_cells: m.playerCells.map(({row, col}) => ({column: col, row})),
        },
      };
    }
  }
  return { matched: false, cells: [] };
}

/**
 * Returns true if the player's major threat at (R, threatCol) is undercut by the opponent:
 * the opponent has a reachable threat rp < R in the same column that is not neutralised
 * by T4 (same parity), T5 (rows 5+2 exception), or U3 (odd-player / even-opponent / non-adjacent).
 * Uses only board structure — no solver scores required.
 */
function isThreatUndercut(board, perspective, R, threatCol) {
  const oppThreats = board.reachableThreats(3 - perspective);
  const oppColRows = oppThreats.get(threatCol) ?? [];
  for (const rp of oppColRows) {
    if (rp >= R) continue;
    if (isT4SameParity(R, rp)) continue;
    if (isT5Exception(R, rp)) continue;
    if (R % 2 === 1 && rp % 2 === 0 && R !== rp + 1) continue; // U3: not adjacent, T2 doesn't apply
    return true;
  }
  return false;
}

/**
 * T011 — Odd-Even Threat detection (Red-only, FR-009).
 *
 * Detects a decision point where Red has non-immediate minor threats (2+2 windows) at
 * BOTH parities — at least one at an odd 0-indexed row (row%2===0, Red's parity) and
 * at least one at an even 0-indexed row (row%2===1, Yellow's parity) — and a
 * solver-optimal move (scores[col] > 0) promotes exactly one of them: the odd-row
 * (Red's parity) one, WITHOUT also promoting any even-row minor threat.
 *
 * The promoted odd-row threat must be non-gravity-top (completing cell strictly above
 * colHeights[col] in the post-move board). A gravity-top major is an immediate win,
 * not a parity threat — the whole point is the non-immediate parity advantage.
 *
 * The puzzle: Red must choose which minor threat to convert. Promoting the even-row
 * threat surrenders parity to Yellow; the correct play promotes the odd-row threat,
 * keeping parity for Red.
 *
 * The correct move must produce no pre-existing Red major threats and no double threat.
 *
 * correctCol = the column of the correct (odd-row-promoting) move.
 * categoryEvidence.evenMinorCol/evenMinorRow = the wrong-choice minor threat (not promoted).
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

  const majorFlag = perspective === 1 ? 'rm' : 'ym';
  const minorFlag = perspective === 1 ? 'rn' : 'yn';
  const isGoodRow = row => row % 2 === (perspective - 1);

  const oldMajorCells = getMajorThreatCells(board.board);

  // Step 1: Both parities of non-immediate minor threats must already exist.
  // Their simultaneous presence creates the parity choice for the perspective player.
  let firstBadMinor = null;
  let hasGoodMinor = false;
  for (const [key, flags] of Object.entries(oldMajorCells)) {
    if (!flags[minorFlag] || flags[majorFlag]) continue;
    const [row, col] = key.split(',').map(Number);
    if (row <= board.colHeights[col]) continue; // immediate — not a parity choice
    if (isGoodRow(row)) { hasGoodMinor = true; }
    else if (!firstBadMinor) { firstBadMinor = { col, row }; }
  }
  if (!hasGoodMinor || !firstBadMinor) return { matched: false, cells: [] };

  // Step 2: Verify there exists at least one playable column (any column, not just
  // solver-optimal ones) that converts a bad-parity minor to a non-immediate major —
  // the "wrong choice" whose completing cell does not align with the perspective
  // player's favorable parity. Without a promotable bad-parity minor, there is no
  // genuine parity decision for the player to face.
  {
    let wrongChoiceExists = false;
    for (let col = 0; col < COLS; col++) {
      if (board.colHeights[col] >= ROWS) continue;
      const afterBoard = board.withMove(col);
      const afterCells = getMajorThreatCells(afterBoard.board);
      for (const [key, afterFlags] of Object.entries(afterCells)) {
        if (!afterFlags[majorFlag]) continue;
        const oldFlags = oldMajorCells[key];
        // Must be a converted minor: was minor but not major before
        if (!oldFlags || !oldFlags[minorFlag] || oldFlags[majorFlag]) continue;
        const [row, tc] = key.split(',').map(Number);
        if (row <= afterBoard.colHeights[tc]) continue; // immediate — not a parity threat
        if (!isGoodRow(row)) { wrongChoiceExists = true; break; } // bad parity → wrong choice
      }
      if (wrongChoiceExists) break;
    }
    if (!wrongChoiceExists) return { matched: false, cells: [] };
  }

  // Step 3: Find all solver-optimal moves that promote at least one good-parity minor
  // into a non-immediate, non-undercut major, without also promoting any bad-parity
  // minor or creating a parity double-threat.
  const correctCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] <= 0) continue;

    const afterBoard = board.withMove(col);
    const newMajorCells = getMajorThreatCells(afterBoard.board);

    // Discard if any pre-existing major threat for perspective player survives as non-immediate
    let hasPreexistingMajor = false;
    for (const [key, newFlags] of Object.entries(newMajorCells)) {
      if (!newFlags[majorFlag]) continue;
      const [row, threatCol] = key.split(',').map(Number);
      if (row <= afterBoard.colHeights[threatCol]) continue;
      const oldFlags = oldMajorCells[key];
      if (oldFlags && oldFlags[majorFlag]) { hasPreexistingMajor = true; break; }
    }
    if (hasPreexistingMajor) continue;

    const convertedGood = [];
    let convertedBadCount = 0;
    for (const [key, newFlags] of Object.entries(newMajorCells)) {
      if (!newFlags[majorFlag]) continue;
      const oldFlags = oldMajorCells[key];
      if (!oldFlags || !oldFlags[minorFlag] || oldFlags[majorFlag]) continue;
      const [row, threatCol] = key.split(',').map(Number);
      if (row <= afterBoard.colHeights[threatCol]) continue; // gravity-top = immediate win, not a parity threat
      if (!isGoodRow(row)) { convertedBadCount++; continue; } // bad parity → wrong parity
      if (isThreatUndercut(afterBoard, perspective, row, threatCol)) continue;
      convertedGood.push({ col: threatCol, row });
    }

    if (convertedGood.length === 0) continue;
    if (convertedBadCount > 0) continue; // promoted bad-parity minor — no choice left
    if (afterBoard.hasActiveDoubleThreat(perspective)) continue;

    // Check for non-immediate parity double-threat: ≥2 non-imm majors at both parities
    // means the opponent can't block both paths, making the position trivially won.
    {
      let nonImmGood = 0, nonImmBad = 0;
      for (const [key, flags] of Object.entries(newMajorCells)) {
        if (!flags[majorFlag]) continue;
        const [row, tc] = key.split(',').map(Number);
        if (row <= afterBoard.colHeights[tc]) continue;
        if (isGoodRow(row)) nonImmGood++; else nonImmBad++;
      }
      if (nonImmGood >= 1 && nonImmBad >= 1) continue;
    }

    // Choose evidence: prefer converted good-parity threat in same column as the bad
    // minor (the parity-choice column), fall back to first converted.
    const evidenceGood = convertedGood.find(e => e.col === firstBadMinor.col) ?? convertedGood[0];

    correctCols.push({
      col,
      evidence: {
        correctCol:   col,
        goodRowCol:   evidenceGood.col,
        goodRow:      evidenceGood.row,
        badMinorCol:  firstBadMinor.col,
        badMinorRow:  firstBadMinor.row,
      },
    });
  }

  if (correctCols.length === 0) return { matched: false, cells: [] };

  return {
    matched: true,
    cells: [],
    correctCol:  correctCols[0].col,                  // backward compat
    correctCols: correctCols.map(c => c.col),
    highlightMetadata: null,
    categoryEvidence: correctCols[0].evidence,
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

  // Case B: consecutive-row threats in the same column.
  // The lower threat must be at the gravity-top (colHeights[col]), so the opponent
  // is forced to block it. After the block, the upper threat becomes gravity-top and
  // the initiator wins there. Without this constraint, reachable threats buried under
  // empty cells would produce false positives.
  const byCol = {};
  for (const t of threatCells) {
    if (!byCol[t.col]) byCol[t.col] = [];
    byCol[t.col].push(t.row);
  }
  for (const [colStr, rows] of Object.entries(byCol)) {
    const sorted = rows.sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] === sorted[i] + 1 &&
          sorted[i] === board.colHeights[parseInt(colStr)]) {
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
    // undercut takes no perspective: the side to move is the victim by construction, so the
    // tag is the same for both perspectives — for the mover it reads "the column you must not
    // enter", for the player who just moved it reads "the undercut you just landed". Passing a
    // perspective here mixed one player's threats with the other's score sign (OI-74).
    ['undercut',          () => detectUndercutVictim(board, scores)],
    ['overcut',           () => detectOvercut(board, scores, perspective)],
    ['figure_7',          () => detectFigure7(board, scores, perspective)],
    ['j_shape',           () => detectJShape(board, scores, perspective)],
    // Parity-aware threats (geometry-only; first-class, flow through the look-ahead pipeline)
    ['major_threat_parity',    () => detectMajorThreatParity(board, perspective)],
    ['major_threat_nonparity', () => detectMajorThreatNonParity(board, perspective)],
    ['minor_threat',           () => detectMinorThreat(board, perspective)],
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
 * Thrown by tagBlunder when called on a position that has no move to tag — i.e. a
 * board that is already won or completely full. This is a PRECONDITION VIOLATION
 * (a caller error), distinct from a genuine solver failure: callers must treat it
 * as "this is not a blunder, skip it", never as a fallback blunder tag.
 */
export class NotABlunderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotABlunderError';
  }
}

/**
 * Tags a blunder move with a tactical pattern from the perspective of the player
 * who made the move.
 *
 * Throws NotABlunderError if the position is terminal (won or full) — a caller
 * error, surfaced loudly rather than masked. All OTHER errors (e.g. solver
 * failures) resolve to the suboptimal_move fallback.
 *
 * Algorithm (priority order; first match wins):
 *   Phase A — pre-move pressure: immediate_threat:missed_own (own win available),
 *             then forced_block:defensive_miss (opponent had an immediate threat).
 *   Phase B — immediate_threat:enabled_opponent (played move hands a NEW opp win).
 *   Phase C — missed_own pattern: correctCol BUILDS pattern X for the blunderer
 *             while playedCol does not  (pAfterCorrect.has(X) && !pAfterPlayed.has(X)),
 *             with undercut guards on double_threat / figure_7.
 *   Phase D (lazy) — enabled_opponent: pattern on the blunder continuation that the
 *             correct continuation avoided (one opponent best-response ply each).
 *   Phase E — score-based fallback (drawing_move or suboptimal_move).
 *
 * Won-position safety: Phase A returns before any `moves + correctCol` query when
 * the blunderer has an immediate win, so Phase C never queries a terminal position.
 *
 * @param {string} moves  movestring of the position where the blunder was made
 * @param {number} playedCol  0-indexed column the player actually played
 * @param {number} correctCol  0-indexed best column
 * @param {object} solver  c4solver wrapper
 * @returns {Promise<{tag: string, direction: string, reason: string}>}
 */
export async function tagBlunder(moves, playedCol, correctCol, solver) {
  // Precondition: tagBlunder must be called on a live position that still has a
  // move to evaluate. A position that is already won, or a full board, is a caller
  // error — there is no blunder to tag — so fail loudly. These checks live OUTSIDE
  // the try/catch on purpose: the catch converts errors into the solver-error
  // fallback, which would silently mask the misuse.
  const board = new Board(moves);
  if (board.hasWon(1) || board.hasWon(2)) {
    throw new NotABlunderError(`tagBlunder: position "${moves}" is already won — no move to tag`);
  }
  if (moves.length >= 42) {
    throw new NotABlunderError(`tagBlunder: board "${moves}" is full — no move to tag`);
  }

  try {
    // Derive blunderer and opponent from move count parity
    const blunderer = moves.length % 2 === 0 ? 1 : 2; // even move count → Red opens
    const opponent  = 3 - blunderer;

    // Short alias: classify patterns for a position from a player's perspective.
    // Returns a Set<string> of matched tags — wraps classifyPattern (which now returns Map).
    const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys());

    // ─────────────────────────────────────────────────────────────────────────
    // Phase A — defensive / tactical pressure that exists AT `moves`.
    // These are about what was true before the blunder, evaluated from each
    // player's perspective on the pre-move board. Computed upfront.
    // ─────────────────────────────────────────────────────────────────────────
    const [pMovesBlunderer, pMovesOpponent] = await Promise.all([
      P(moves, blunderer),
      P(moves, opponent),
    ]);

    // A1: Missed own immediate win — the most specific blunder. If the blunderer
    // could win in one move and this is a (non-optimal) blunder, they did not take
    // it. Returning here also means we never query `moves + correctCol` (a won
    // position the solver would reject): correctCol is the winning column.
    if (pMovesBlunderer.has('immediate_threat')) {
      return { tag: 'immediate_threat', direction: 'missed_own',
               reason: 'matched missed_own: immediate_threat' };
    }

    // A2: Defensive miss — the opponent already had an immediate winning threat at
    // `moves` and the blunderer failed to take it off the board. This is a defensive
    // lapse, NOT an "enabled" threat (the threat pre-existed the move) — so it must
    // be caught here, before Phase B's enabled_opponent check.
    //
    // We key on the opponent's pre-existing immediate threat rather than on the
    // forced_block detector: forced_block only matches when a safe non-negative
    // blocking column exists, so in an already-lost position (all scores negative)
    // it misses, leaving the threat to be mislabeled as enabled_opponent later.
    // `pMovesBlunderer.has('forced_block')` is a strict subset of this condition, so
    // every previous forced_block case still resolves to forced_block:defensive_miss.
    // (A1 already returned if the blunderer had their own win to take instead.)
    if (pMovesOpponent.has('immediate_threat')) {
      return { tag: 'forced_block', direction: 'defensive_miss',
               reason: 'matched defensive_miss: forced_block' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase B — 1-ply consequence of the played move.
    // ─────────────────────────────────────────────────────────────────────────
    const pAfterPlayedOpponent = await P(moves + playedCol, opponent);

    // B1: Enabled immediate threat — the played move HANDED the opponent an
    // immediate win. Reaching here guarantees the opponent had NO immediate threat
    // at `moves` (A2 returned otherwise), so any threat now is necessarily new.
    if (pAfterPlayedOpponent.has('immediate_threat')) {
      return { tag: 'immediate_threat', direction: 'enabled_opponent',
               reason: 'matched enabled_opponent: immediate_threat' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase C — Missed own pattern (NEW semantics).
    // "Playing correctCol would have BUILT pattern X for the blunderer, but
    //  playing playedCol did not." → pAfterCorrect.has(X) && !pAfterPlayed.has(X).
    // This is uniform across every pattern tag; double_threat and figure_7 carry
    // an extra undercut guard (a stacked threat the opponent can neutralise from
    // below is not a real missed win).
    //
    // Safety: A1 guarantees the blunderer has no immediate win at `moves`, so no
    // column wins immediately → `moves + correctCol` is never a terminal (won)
    // position, and the solver query inside P() is safe. `moves + playedCol` is
    // likewise non-winning (a winning move would be optimal, not a blunder).
    // ─────────────────────────────────────────────────────────────────────────
    const [pAfterCorrectBlunderer, pAfterPlayedBlunderer] = await Promise.all([
      P(moves + correctCol, blunderer),
      P(moves + playedCol,  blunderer),
    ]);

    const boardAfterCorrect = new Board(moves + correctCol);

    // Undercut guards for stacked-threat patterns. A stacked double_threat
    // (Case B, single column) or figure_7 is illusory if the opponent has a
    // reachable threat in the same column at or below the lower threat row — they
    // win/neutralise from underneath before the pattern matures. Case A
    // double_threats (≥2 distinct gravity-top columns) can never be undercut.
    const isUndercutDoubleThreat = () => {
      const dt = detectDoubleThreat(boardAfterCorrect, blunderer);
      if (!dt.matched) return true;            // detector disagrees → don't credit
      if (dt.cols.length !== 1) return false;  // Case A — never undercut
      const col      = dt.cols[0];
      const lowerRow = boardAfterCorrect.colHeights[col];
      const oppRows  = boardAfterCorrect.reachableThreats(opponent).get(col) ?? [];
      return oppRows.some(r => r <= lowerRow);
    };
    const isUndercutFigure7 = () => {
      const f7 = detectFigure7(boardAfterCorrect, null, blunderer);
      if (!f7.matched) return true;            // detector disagrees → don't credit
      const lower   = f7.threatCells[0];       // sorted ascending: index 0 = lower row
      const oppRows = boardAfterCorrect.reachableThreats(opponent).get(lower.col) ?? [];
      return oppRows.some(r => r <= lower.row);
    };

    // Priority: concrete tactical wins first, then strategic/zugzwang patterns.
    // (forced_win and double_threat are mutually exclusive on the same board:
    // detectForcedWin returns false when a double_threat is present.)
    const MISSED_OWN_PRIORITY = [
      // Specific named structures first; the parity-aware threats are generic (almost any
      // mid-game position carries a latent major threat), so they rank LAST — only chosen
      // when no more specific pattern applies, just above the score-based fallbacks.
      'forced_win', 'double_threat', 'figure_7', 'j_shape',
      'z_threat', 'overcut', 'claimeven',
      'major_threat_parity', 'major_threat_nonparity', 'minor_threat',
    ];
    for (const tag of MISSED_OWN_PRIORITY) {
      if (!pAfterCorrectBlunderer.has(tag) || pAfterPlayedBlunderer.has(tag)) continue;
      if (tag === 'double_threat' && isUndercutDoubleThreat()) continue;
      if (tag === 'figure_7'      && isUndercutFigure7())      continue;
      return { tag, direction: 'missed_own', reason: `matched missed_own: ${tag}` };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase D — Enabled opponent. Advance both the blunder line and the correct
    // line by one opponent reply, then ask: does a pattern exist on the blunder
    // continuation that the correct continuation avoided?
    //
    // The opponent has free choice among ALL of their optimal replies (tied
    // top-score columns), and will pick whichever one realises the pattern. So the
    // honest quantifier structure is:
    //     enabled(X) ⇔ (∃ optimal reply on the BLUNDER line that builds X)
    //               ∧  (∄ optimal reply on the CORRECT line that builds X)
    // We aggregate each line into the UNION of patterns over its optimal replies;
    // `union.has(X)` is the existential, `!union.has(X)` the universal-absence.
    // Computed lazily — only reached when no missed_own pattern matched.
    // (undercut is the blunderer's own exposure, not an opponent gain.)
    // ─────────────────────────────────────────────────────────────────────────

    // optimalReplies(ms): every legal column whose solver score ties for the max.
    const optimalReplies = async (ms) => {
      const scores = await solver.query(ms);
      const heights = new Board(ms).colHeights;
      const legal = scores.filter((_, c) => heights[c] < ROWS);
      const max = Math.max(...legal);
      const cols = [];
      for (let c = 0; c < scores.length; c++) {
        if (heights[c] < ROWS && scores[c] === max) cols.push(c);
      }
      return cols;
    };

    // unionPatterns(ms, replies, player): the patterns `player` holds under ANY of
    // the given replies. A reply that lands on a terminal (won) position contributes
    // no patterns — the relevant tag there is immediate_threat, not enumerated here.
    const unionPatterns = async (ms, replies, player) => {
      const sets = await Promise.all(replies.map(async (r) => {
        try { return await P(ms + r, player); }
        catch { return new Set(); } // terminal/illegal continuation → no patterns
      }));
      const union = new Set();
      for (const s of sets) for (const t of s) union.add(t);
      return union;
    };

    const [repliesBlunder, repliesCorrect] = await Promise.all([
      optimalReplies(moves + playedCol),
      optimalReplies(moves + correctCol),
    ]);

    const [
      contBlunderOpponent,
      contCorrectOpponent,
      contBlunderBlunderer,
      contCorrectBlunderer,
    ] = await Promise.all([
      unionPatterns(moves + playedCol,  repliesBlunder, opponent),
      unionPatterns(moves + correctCol, repliesCorrect, opponent),
      unionPatterns(moves + playedCol,  repliesBlunder, blunderer),
      unionPatterns(moves + correctCol, repliesCorrect, blunderer),
    ]);

    const ENABLED_OPP_PRIORITY = [
      { tag: 'forced_win',      check: () => contBlunderOpponent.has('forced_win')      && !contCorrectOpponent.has('forced_win') },
      { tag: 'double_threat',   check: () => contBlunderOpponent.has('double_threat')   && !contCorrectOpponent.has('double_threat') },
      { tag: 'z_threat',        check: () => contBlunderOpponent.has('z_threat')        && !contCorrectOpponent.has('z_threat') },
      { tag: 'figure_7',        check: () => contBlunderOpponent.has('figure_7')        && !contCorrectOpponent.has('figure_7') },
      { tag: 'j_shape',         check: () => contBlunderOpponent.has('j_shape')         && !contCorrectOpponent.has('j_shape') },
      // undercut uses enabled_self (blunderer's after-positions), not enabled_opp —
      // per FR-024/FR-025: undercut names the blunderer's exposure, not an opponent gain
      { tag: 'undercut',        check: () => contBlunderBlunderer.has('undercut')       && !contCorrectBlunderer.has('undercut') },
      { tag: 'claimeven',       check: () => contBlunderOpponent.has('claimeven')       && !contCorrectOpponent.has('claimeven') },
      // Parity-aware threats are generic — rank LAST so specific structures win first.
      { tag: 'major_threat_parity',    check: () => contBlunderOpponent.has('major_threat_parity')    && !contCorrectOpponent.has('major_threat_parity') },
      { tag: 'major_threat_nonparity', check: () => contBlunderOpponent.has('major_threat_nonparity') && !contCorrectOpponent.has('major_threat_nonparity') },
      { tag: 'minor_threat',    check: () => contBlunderOpponent.has('minor_threat')    && !contCorrectOpponent.has('minor_threat') },
    ];
    for (const { tag, check } of ENABLED_OPP_PRIORITY) {
      if (check()) {
        return { tag, direction: 'enabled_opponent', reason: `matched enabled_opponent: ${tag}` };
      }
    }

    // Phase E: Score-based fallbacks
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
