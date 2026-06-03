/**
 * Forward-looking pattern aggregation for the coach LLM.
 *
 * explainSimulate() plays out optimal continuations from a position and aggregates
 * classifyAll results at the leaves, answering "what patterns does this move set up
 * for a given player across N plies of optimal play?"
 *
 * Usage by caller:
 *   const anchorRow = new Board(movestring).colHeights[col];
 *   const result = await explainSimulate(movestring + col, numPlies,
 *                                        { col, row: anchorRow }, perspective, solver);
 *
 * @see docs/architecture/server-conventions.md §Forward Simulation
 */

import {
  Board,
  detectImmediateThreat,
  detectDoubleThreat,
  detectForcedBlock,
  detectForcedWin,
  detectForbiddenColumns,
  detectZThreat,
  detectUndercut,
  detectOvercut,
  detectFigure7,
  detectJShape,
  detectClaimodd,
  detectClaimeven,
} from './classifier.js';

const ROWS = 6;
const COLS = 7;
const MAX_EXAMPLES = 2;
// Solver rejects the empty board; use the known-correct scores instead.
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

/**
 * Canonical list of all pattern detectors available to explainSimulate.
 * Adding a new detector = one entry here; no other code changes required.
 *
 * @typedef {object} DetectorEntry
 * @property {string}            name     — pattern name; matches classifyAll output keys
 * @property {Function}          fn       — detector function
 * @property {boolean}           isAsync  — true if fn returns a Promise (e.g. detectClaimeven)
 * @property {'col'|'cell'|null} histType — histogram type emitted by aggregateLeaves:
 *                                          'col'  → colHistogram keyed by column index string
 *                                          'cell' → cellHistogram keyed by "colC,rowR"
 *                                          null   → no histogram
 */
export const DETECTOR_REGISTRY = [
  { name: 'immediate_threat',  fn: detectImmediateThreat,  isAsync: false, histType: 'col'  },
  { name: 'double_threat',     fn: detectDoubleThreat,     isAsync: false, histType: 'col'  },
  { name: 'forced_block',      fn: detectForcedBlock,      isAsync: false, histType: 'col'  },
  { name: 'forced_win',        fn: detectForcedWin,        isAsync: false, histType: 'col'  },
  { name: 'forbidden_columns', fn: detectForbiddenColumns, isAsync: false, histType: 'col'  },
  { name: 'z_threat',          fn: detectZThreat,          isAsync: false, histType: 'cell' },
  { name: 'undercut',          fn: detectUndercut,         isAsync: false, histType: 'cell' },
  { name: 'overcut',           fn: detectOvercut,          isAsync: false, histType: 'cell' },
  { name: 'figure_7',          fn: detectFigure7,          isAsync: false, histType: 'cell' },
  { name: 'j_shape',           fn: detectJShape,           isAsync: false, histType: 'cell' },
  { name: 'claimodd',          fn: detectClaimodd,         isAsync: false, histType: 'col'  },
  { name: 'claimeven',         fn: detectClaimeven,        isAsync: true,  histType: 'col'  },
];

/** O(1) lookup map built once from DETECTOR_REGISTRY. */
const REGISTRY_MAP = new Map(DETECTOR_REGISTRY.map(d => [d.name, d]));

/**
 * Runs a filtered subset of detectors against one board position.
 * Sync detectors are called as fn(board, scores); async detectors as fn(board, solver).
 * All async calls are launched concurrently via Promise.all.
 *
 * @param {Board}           board
 * @param {number[]}        scores
 * @param {object}          solver
 * @param {DetectorEntry[]} registry  — already-filtered subset of DETECTOR_REGISTRY
 * @returns {Promise<Array<{detectorName: string, result: object}>>}
 */
async function runDetectors(board, scores, solver, registry) {
  return Promise.all(
    registry.map(async ({ name, fn, isAsync }) => ({
      detectorName: name,
      result: isAsync ? await fn(board, solver) : fn(board, scores),
    }))
  );
}

/**
 * Extracts the cells geometrically constituting a matched pattern.
 *
 * Exact cell-level data (row+col) is available for cells-based and capsule patterns.
 * For patterns that only return column arrays (immediate_threat, double_threat,
 * forced_block, forced_win, forbidden_columns) and for claimeven (correctCol), row is
 * null — anchor involvement is determined by column match only.
 *
 * @param {string} detectorName
 * @param {object} result
 * @returns {Array<{col: number, row: number|null}>}
 */
function extractActiveCells(detectorName, result) {
  if (!result.matched) return [];

  // Cells-based: undercut, overcut, figure_7, j_shape
  if (['undercut', 'overcut', 'figure_7', 'j_shape'].includes(detectorName)) {
    return (result.highlightMetadata?.cells ?? []).map(c => ({ col: c.column, row: c.row }));
  }

  // Capsule: z_threat — expand the vertical range to individual cells
  if (detectorName === 'z_threat') {
    const { column, fromRow, toRow } = result.highlightMetadata ?? {};
    if (column == null) return [];
    const cells = [];
    for (let row = fromRow; row <= toRow; row++) cells.push({ col: column, row });
    return cells;
  }

  // Column-proxy: immediate_threat, double_threat, forced_block, forced_win, forbidden_columns
  if (result.cols) return result.cols.map(col => ({ col, row: null }));

  // Claimeven: single column proxy
  if (result.correctCol != null) return [{ col: result.correctCol, row: null }];

  return [];
}

/**
 * Returns true if anchorCell appears among activeCells.
 * Cells with row === null match on column only (column proxy).
 * @param {{col: number, row: number}} anchorCell
 * @param {Array<{col: number, row: number|null}>} activeCells
 * @returns {boolean}
 */
function anchorInCells(anchorCell, activeCells) {
  return activeCells.some(c =>
    c.col === anchorCell.col && (c.row === null || c.row === anchorCell.row)
  );
}

/**
 * Retrieves solver scores for a position, using a per-simulation cache.
 * Empty board: returns constant EMPTY_BOARD_SCORES (solver rejects empty input).
 * @param {string} ms
 * @param {object} solver
 * @param {Map<string, number[]>} cache
 * @param {{calls: number, hits: number}} stats  — mutable counter updated in place
 * @returns {Promise<number[]>}
 */
async function getScores(ms, solver, cache, stats) {
  if (cache.has(ms)) {
    stats.hits++;
    return cache.get(ms);
  }
  stats.calls++;
  const scores = ms.length === 0 ? EMPTY_BOARD_SCORES : await solver.query(ms);
  cache.set(ms, scores);
  return scores;
}

/**
 * Recursively collects leaf board states by following tied-best moves for numPlies.
 * "Optimal" always means tied-best for whoever is currently to move — this correctly
 * models both players playing optimally without special-casing perspective.
 *
 * Each leaf is tagged with a leafType:
 *   'won_by_perspective' — perspective's player has 4-in-a-row
 *   'won_by_opponent'    — opponent has 4-in-a-row
 *   'draw'               — board full, no winner
 *   'depth_limit'        — numPlies reached 0 with game still in progress
 *   'intermediate'       — perspective-to-move non-terminal node (emitted while recursing)
 *
 * Won/draw leaves carry no pattern data (classifiers are not run on them).
 * Both depth_limit and intermediate leaves where currentPlayer === perspective are
 * classified, accumulating pattern statistics across all rounds of the tree.
 *
 * The classCache (Map<string, Array>) deduplicates classification work across
 * transpositions — a position reached via multiple move orderings is classified
 * only once and its sample is emitted only once.
 *
 * @param {string} ms
 * @param {number} numPlies
 * @param {number} perspective  1 or 2
 * @param {object} solver
 * @param {Map<string, number[]>} cache       solver score cache
 * @param {Map<string, Array>}    classCache  classification result cache (dedup)
 * @param {DetectorEntry[]}       registry    active detector list
 * @param {{calls: number, hits: number}} stats  solver call counter
 * @returns {Promise<Array<{leafType: string, patterns: Array|null, currentPlayer: number, ms?: string}>>}
 */
async function collectLeaves(ms, numPlies, perspective, solver, cache, classCache, registry, stats) {
  const board = new Board(ms);
  const opponent = 3 - perspective;
  const wonByPerspective = board.hasWon(perspective);
  const wonByOpponent    = board.hasWon(opponent);
  const isBoardFull      = board.colHeights.every(h => h >= ROWS);
  const isWon            = wonByPerspective || wonByOpponent;
  const isTerminal       = isWon || isBoardFull;

  if (isTerminal) {
    let leafType;
    if (wonByPerspective)   leafType = 'won_by_perspective';
    else if (wonByOpponent) leafType = 'won_by_opponent';
    else                    leafType = 'draw';
    // Won/draw positions carry no useful pattern data for the perspective player.
    return [{ leafType, patterns: null, currentPlayer: board.currentPlayer }];
  }

  if (numPlies === 0) {
    // Only classify if it's perspective's turn — opponent-to-move leaves are not useful.
    if (board.currentPlayer !== perspective) {
      return [{ leafType: 'depth_limit', patterns: null, currentPlayer: board.currentPlayer }];
    }
    // Dedup: if this position was already classified via a transposition, skip.
    if (classCache.has(ms)) return [];
    const scores = await getScores(ms, solver, cache, stats);
    const patterns = await runDetectors(board, scores, solver, registry);
    classCache.set(ms, patterns);
    return [{ leafType: 'depth_limit', patterns, currentPlayer: board.currentPlayer, ms }];
  }

  const scores = await getScores(ms, solver, cache, stats);
  const legalCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] < ROWS) legalCols.push(col);
  }

  const bestScore   = Math.max(...legalCols.map(col => scores[col]));
  const optimalCols = legalCols.filter(col => scores[col] === bestScore);

  const leaves = [];

  // Emit an intermediate sample for every perspective-to-move non-terminal node.
  // Dedup via classCache: if this position was already seen (transposition), skip.
  if (board.currentPlayer === perspective && !classCache.has(ms)) {
    const patterns = await runDetectors(board, scores, solver, registry);
    classCache.set(ms, patterns);
    leaves.push({ leafType: 'intermediate', patterns, currentPlayer: board.currentPlayer, ms });
  }

  for (const col of optimalCols) {
    const subLeaves = await collectLeaves(
      ms + col, numPlies - 1, perspective, solver, cache, classCache, registry, stats
    );
    for (const leaf of subLeaves) leaves.push(leaf);
  }
  return leaves;
}

/**
 * Aggregates leaf results into per-pattern statistics and outcome counts.
 *
 * Outcomes:
 *   wonByPerspective — branches where perspective's player won
 *   wonByOpponent    — branches where opponent won
 *   draws            — branches that ended in a draw
 *   perspectiveLeaves — depth-limit leaves where currentPlayer === perspective
 *                       (the denominator for pattern ratios)
 *
 * Pattern ratios use perspectiveLeaves as the denominator, not total leaves.
 * This ensures ratios are stable across simulation depth and are not diluted by
 * won/draw branches that terminate before the depth limit.
 *
 * @param {Array<{leafType: string, patterns: Array|null, currentPlayer: number}>} leaves
 * @param {{col: number, row: number}} anchorCell
 * @param {number} perspective  1 or 2
 * @param {DetectorEntry[]} registry  — determines which pattern keys appear in output
 * @returns {{ patterns: object, outcomes: object }}
 */
function aggregateLeaves(leaves, anchorCell, perspective, registry) {
  // Outcome counters
  let wonByPerspective  = 0;
  let wonByOpponent     = 0;
  let draws             = 0;
  let perspectiveLeaves = 0; // depth_limit/intermediate leaves where currentPlayer === perspective

  // Pattern accumulators — keyed by detector name, initialised from active registry
  const agg = {};
  for (const { name, histType } of registry) {
    agg[name] = {
      frequency: 0,
      ratio: 0,
      withAnchorDisc: 0,
      withoutAnchorDisc: 0,
      examples: [],
      ...(histType === 'cell' ? { cellHistogram: {} } : {}),
      ...(histType === 'col'  ? { colHistogram: {} }  : {}),
    };
  }

  for (const leaf of leaves) {
    if (leaf.leafType === 'won_by_perspective') { wonByPerspective++; continue; }
    if (leaf.leafType === 'won_by_opponent')    { wonByOpponent++;    continue; }
    if (leaf.leafType === 'draw')               { draws++;            continue; }

    // depth_limit or intermediate leaf — both counted identically
    if (leaf.leafType !== 'depth_limit' && leaf.leafType !== 'intermediate') continue;
    if (leaf.currentPlayer !== perspective || leaf.patterns === null) continue;
    perspectiveLeaves++;

    for (const { detectorName, result } of leaf.patterns) {
      if (!result.matched) continue;
      const entry = agg[detectorName];
      if (!entry) continue;

      entry.frequency++;
      if (leaf.ms && entry.examples.length < MAX_EXAMPLES) entry.examples.push(leaf.ms);
      const activeCells = extractActiveCells(detectorName, result);
      if (anchorInCells(anchorCell, activeCells)) entry.withAnchorDisc++;
      else entry.withoutAnchorDisc++;

      const det = REGISTRY_MAP.get(detectorName);
      if (det?.histType === 'cell') {
        for (const c of activeCells) {
          if (c.row === null) continue;
          const key = `col${c.col},row${c.row}`;
          entry.cellHistogram[key] = (entry.cellHistogram[key] ?? 0) + 1;
        }
      } else if (det?.histType === 'col') {
        for (const c of activeCells) {
          const key = String(c.col);
          entry.colHistogram[key] = (entry.colHistogram[key] ?? 0) + 1;
        }
      }
    }
  }

  // Ratios use perspectiveLeaves as denominator; expose total per entry for callers/tests.
  for (const name of Object.keys(agg)) {
    agg[name].ratio = perspectiveLeaves > 0 ? agg[name].frequency / perspectiveLeaves : 0;
    agg[name].total = perspectiveLeaves;
  }

  const total = leaves.length;
  return {
    patterns: agg,
    outcomes: {
      total,
      wonByPerspective,
      wonByOpponent,
      draws,
      perspectiveLeaves,
      winRate:  total > 0 ? wonByPerspective / total : 0,
      lossRate: total > 0 ? wonByOpponent    / total : 0,
      drawRate: total > 0 ? draws            / total : 0,
    },
  };
}

/**
 * Plays out optimal continuations from a position and aggregates which patterns
 * appear at the leaves, answering "what does this move set up for perspective?"
 *
 * The movestring must already include the candidate move being analyzed. anchorCell
 * identifies the cell where that disc landed; it is fixed for the entire recursion
 * tree so disc-involvement tracking stays anchored to the original move.
 *
 * Practical numPlies range: 2–4. With claimeven included, each perspective-to-move
 * node issues ~20 extra solver queries; see timing output to measure actual cost.
 *
 * @param {string} movestring   position after candidate move (already played)
 * @param {number} numPlies     additional plies to simulate (0–6; 2–4 practical)
 * @param {{col: number, row: number}} anchorCell  0-indexed; fixed for entire tree
 * @param {number} perspective  1 (Red) or 2 (Yellow)
 * @param {object} solver       c4solver process wrapper with .query(ms) → Promise<number[]>
 * @param {object} [options={}]
 * @param {string[]} [options.detectors]  Detector names to enable. Default: all names in
 *   DETECTOR_REGISTRY (including 'claimeven'). Pass a filtered array to reduce cost.
 *   Example (exclude claimeven):
 *     DETECTOR_REGISTRY.map(d => d.name).filter(n => n !== 'claimeven')
 * @returns {Promise<{totalLeaves: number, anchorCell, perspective, patterns: object,
 *                    outcomes: object, timing: object}>}
 *   timing.totalMs         — wall-clock milliseconds for the full call
 *   timing.solverCalls     — solver.query() invocations (cache misses only)
 *   timing.solverCacheHits — positions served from the score cache
 */
export async function explainSimulate(movestring, numPlies, anchorCell, perspective, solver, options = {}) {
  const registry = options.detectors
    ? DETECTOR_REGISTRY.filter(d => options.detectors.includes(d.name))
    : DETECTOR_REGISTRY;

  const t0 = Date.now();
  const cache = new Map();
  const classCache = new Map();
  const stats = { calls: 0, hits: 0 };

  const leaves = await collectLeaves(movestring, numPlies, perspective, solver, cache, classCache, registry, stats);
  const { patterns, outcomes } = aggregateLeaves(leaves, anchorCell, perspective, registry);

  return {
    totalLeaves: leaves.length,
    anchorCell,
    perspective,
    patterns,
    outcomes,
    timing: {
      totalMs: Date.now() - t0,
      solverCalls: stats.calls,
      solverCacheHits: stats.hits,
    },
  };
}

