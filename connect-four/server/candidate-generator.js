import { evaluatePredicate } from './predicates.js';
import {
  classify, checkWin, getImmediateThreats, parseBoardState,
  hasActiveDoubleThreat, Board, hasWon,
  detectZThreat, detectClaimeven, detectUndercut, detectOvercut,
  detectFigure7, detectJShape,
} from './classifier.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { VALID_CATEGORIES, CATEGORY_ORDER } from './categories.js';

/** @import { HighlightCell, HighlightMetadata } from './classifier.js' */
const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// mulberry32 PRNG — 4 lines, no dependency
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function softmaxSample(legalCols, scores, T, rng) {
  const raw = legalCols.map(c => scores[c]);
  const minS = Math.min(...raw);
  const maxS = Math.max(...raw);
  const range = maxS - minS;
  const normalized = range === 0
    ? raw.map(() => 0)
    : raw.map(s => (s - minS) / range * 2 - 1);
  const logits = normalized.map(n => n / T);
  const maxLogit = Math.max(...logits);
  const weights = logits.map(l => Math.exp(l - maxLogit));
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map(w => w / total);

  let r = rng(), cum = 0;
  for (let j = 0; j < legalCols.length; j++) {
    cum += probs[j];
    if (r < cum) return legalCols[j];
  }
  return legalCols[legalCols.length - 1];
}

// Return true if the position is finished (someone won or board is full).
function isGameOver(moveString) {
  const board = new Board(moveString).board;
  return hasWon(board, 1) || hasWon(board, 2) || moveString.length === ROWS * COLS;
}

function copyBoard(board) {
  return board.map(row => [...row]);
}

// immediate_threat/forced_block/double_threat — single hint cell
function computeLowCategoryHighlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];
  const heights = new Board(moveString).colHeights;
  const col = correctCols[0];
  return [{ column: col, row: heights[col], role: 'hint' }];
}

// Recursively trace a forced-win sequence starting with Red playing redCol on ms.
// Returns an array [redCol, yellowCol, ..., finalWinnerCol] or null.
// depth = number of Red plays so far (starts at 1, max 4).
//
// Two cases after Red plays redCol → ms1 (Yellow's turn):
//   Case A (double/multi-threat terminal): ALL Yellow legal cols score == oiw1.
//     Yellow plays any col → ms2 → Red wins immediately.  ← terminal
//   Case B (single forced block): EXACTLY ONE Yellow col scores > oiw1, others == oiw1.
//     Yellow must play that col → ms2 → recurse at ms2.
//
// Case A is the terminal: after any Yellow move Red wins immediately (sign-flip: oiw1 = -winScore2).
// Case B recurses, building up forced moves until Case A is reached.
async function traceForcedWin(ms, redCol, depth, solver) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}[depth=${depth}] traceForcedWin ms="${ms}" redCol=${redCol+1}`);

  const ms1 = ms + redCol;
  if (isGameOver(ms1)) { console.log(`${indent}  → game over after redCol, return null`); return null; }
  let scores1;
  try { scores1 = await solver.query(ms1); } catch { console.log(`${indent}  → solver error, return null`); return null; }

  const oiw1 = -Math.floor((41 - ms1.length) / 2);
  const heights1 = new Board(ms1).colHeights;
  console.log(`${indent}  ms1="${ms1}" oiw1=${oiw1} scores1=[${scores1.join(', ')}]`);

  // Classify each legal opponent col.
  // score >= oiw1: opponent has at least one immediate threat to deal with (possible forced block).
  // score < oiw1: initiator already has multiple threats — no block is possible.
  const betterCols = [];
  let allForced = true;
  let hasLegal = false;
  for (let c = 0; c < COLS; c++) {
    if (heights1[c] >= ROWS) continue;
    hasLegal = true;
    if (scores1[c] >= oiw1) { betterCols.push(c); allForced = false; }
  }
  console.log(`${indent}  allForced=${allForced} betterCols(1-indexed)=[${betterCols.map(x=>x+1).join(', ')}]`);
  if (!hasLegal) return null;

  // Case A: all opponent cols score < oiw1 → multi-threat terminal, initiator wins after any reply.
  // Find initiator's immediate winning threat directly on the board: the opponent is forced to
  // play into that column, and the initiator wins by playing there next (one row higher).
  if (allForced) {
    console.log(`${indent}  → Case A`);
    const board1 = new Board(ms1).board;
    const redPlayer = ms.length % 2 === 0 ? 1 : 2;
    for (let wc = 0; wc < COLS; wc++) {
      if (heights1[wc] >= ROWS) continue;
      board1[heights1[wc]][wc] = redPlayer;
      const wins = checkWin(board1, heights1[wc], wc, redPlayer);
      board1[heights1[wc]][wc] = 0;
      if (wins) {
        console.log(`${indent}    Red threat at col ${wc+1}, opponent forced there, initiator wins`);
        return [redCol, wc, wc];
      }
    }
    console.log(`${indent}  → Case A: no direct threat found, return null`);
    return null;
  }

  // Case B: exactly one opponent col avoids immediate multi-threat → forced block, recurse.
  if (betterCols.length !== 1) {
    console.log(`${indent}  → Case B fail: ${betterCols.length} betterCols, return null`);
    return null;
  }
  const yellowCol = betterCols[0];
  console.log(`${indent}  → Case B: forced block col ${yellowCol+1}`);

  const ms2 = ms1 + yellowCol;
  if (isGameOver(ms2)) { console.log(`${indent}  → game over after forced block, return null`); return null; }
  if (depth >= 4) { console.log(`${indent}  → max depth, return null`); return null; }

  const heights2 = new Board(ms2).colHeights;
  for (let c = 0; c < COLS; c++) {
    if (heights2[c] >= ROWS) continue;
    const subTrace = await traceForcedWin(ms2, c, depth + 1, solver);
    if (subTrace !== null) return [redCol, yellowCol, ...subTrace];
  }
  console.log(`${indent}  → no sub-trace found, return null`);
  return null;
}

// forced_win predicate: exactly one column initiates a valid forced-win sequence.
export async function checkForcedWinPredicate(ms, solver) {
  const heights = new Board(ms).colHeights;
  const redPlayer = ms.length % 2 === 0 ? 1 : 2;
  const correctCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    const trace = await traceForcedWin(ms, c, 1, solver);
    if (trace === null) continue;
    // Require at least 5-ply sequence: [R1, Y1, R2, Y2, R3].
    // A 3-element trace means Case A fired at depth 1 — the first move already creates
    // an immediate double threat, making the puzzle trivially easy.
    if (trace.length < 5) continue;
    let msEnd = ms;
    for (const col of trace) msEnd += col;
    const boardEnd = new Board(msEnd).board;
    if (hasWon(boardEnd, redPlayer)) correctCols.push(c);
  }
  return { passes: correctCols.length === 1, correctCols };
}

// Forbidden columns predicate: a column is forbidden if Red plays there (without winning),
// and then Yellow plays in that same column one row above and wins.
export function checkForbiddenColumnsPredicate(ms) {
  const { board, colHeights: heights } = new Board(ms);
  const red = ms.length % 2 === 0 ? 1 : 2;
  const yellow = 3 - red;

  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  const forbiddenCols = legalCols.filter(c => {
    const h = heights[c];
    if (h + 1 >= ROWS) return false;
    const b = copyBoard(board);
    b[h][c] = red;
    if (checkWin(b, h, c, red)) return false;
    b[h + 1][c] = yellow;
    return checkWin(b, h + 1, c, yellow);
  });

  const safeCols = legalCols.filter(c => !forbiddenCols.includes(c));
  return {
    passes: forbiddenCols.length >= 1 && safeCols.length >= 1,
    correctCols: safeCols,
  };
}

// forced_win highlight — trace forced sequence from the initiating move.
export async function computeForcedWinHighlight(solver, moveString, correctCols) {
  if (correctCols.length === 0) return [];

  const redCol = correctCols[0];
  const trace = await traceForcedWin(moveString, redCol, 1, solver);
  if (!trace) return [];

  const cells = [];
  let ms = moveString;

  for (let i = 0; i < trace.length; i++) {
    const col = trace[i];
    const h = new Board(ms).colHeights;
    if (h[col] >= ROWS) break;

    const isLast = (i === trace.length - 1);
    const isRedTurn = (i % 2 === 0);

    if (isLast) {
      cells.push({ column: col, row: h[col], role: 'winner' });
    } else if (isRedTurn) {
      cells.push({ column: col, row: h[col], role: 'hint' });
    } else {
      cells.push({ column: col, row: h[col], role: 'loser' });
    }

    ms += col;
  }

  return cells;
}

// Forbidden columns highlight — mark each forbidden column with role 'loser'.
function computeForbiddenColumnsHighlight(moveString, correctCols) {
  const heights = new Board(moveString).colHeights;
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  const forbiddenCols = legalCols.filter(c => !correctCols.includes(c));
  return forbiddenCols.map(col => ({ column: col, row: heights[col], role: 'loser' }));
}

// highlight_cells: per-step animation for sequence categories (immediate_threat, forced_block,
//   double_threat, forced_win, forbidden_columns). Shape: [{ column, row, role }]. 0-indexed.
// highlight_metadata: static pattern for tactical categories (z_threat, undercut, overcut,
//   claimeven, figure_7, j_shape). Shape: { type, cells: [{ column, row, role }] } or capsule.
// These are never both populated for the same candidate. New categories → use highlight_metadata.
async function computeHighlightCells(category, moveString, scores, correctCols, solver) {
  if (['immediate_threat', 'forced_block', 'double_threat'].includes(category)) return computeLowCategoryHighlight(moveString, correctCols);
  if (category === 'forced_win') return computeForcedWinHighlight(solver, moveString, correctCols);
  if (category === 'forbidden_columns') return computeForbiddenColumnsHighlight(moveString, correctCols);
  return [];
}

// Simulate a softmax-weighted game up to maxMoves plies, calling onPosition(moveString, scores)
// after each solver query. Returns { moveString, scores, trace } on first match, null otherwise.
async function solverWeightedPosition(solver, maxMoves, rng, onPosition) {
  const T1 = rng() * 4 + 0.1;
  const T2 = rng() * 4 + 0.1;
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < maxMoves; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);

    if (await onPosition(moveString, scores)) {
      return { moveString, scores, trace: { temperature_p1: T1, temperature_p2: T2, termination: 'predicate_match', plies } };
    }

    const T = temps[player - 1];
    const rawWeights = legal.map(c => Math.exp(scores[c] / T));
    const total = rawWeights.reduce((a, b) => a + b, 0);
    const probs = Array(COLS).fill(0);
    legal.forEach((c, j) => { probs[c] = rawWeights[j] / total; });

    const col = softmaxSample(legal, scores, T, rng);
    plies.push({ ply: i, player, scores: [...scores], weights: probs, sampled_col: col });

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += col.toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return null;
}

// T011 — check* functions for the 6 new tactical categories

export function checkZThreatPredicate(ms, scores) {
  const result = detectZThreat(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  const correctCol = result.highlightMetadata.column;
  return {
    passes: true,
    correctCols: [correctCol],
    correct_col: correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export async function checkClaimevenPredicate(ms, scores, solver) {
  const result = await detectClaimeven(new Board(ms), solver);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata, // null for claimeven
    category_evidence: result.categoryEvidence,
  };
}

export function checkUndercutPredicate(ms, scores) {
  const b = new Board(ms);
  const result = detectUndercut(b, scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  // For undercut, "correct" = any column except the killing_threat column
  const killingCol = result.highlightMetadata.cells.find(c => c.role === 'killing_threat').column;
  const correctCols = [];
  for (let c = 0; c < COLS; c++) {
    if (b.colHeights[c] < ROWS && c !== killingCol) correctCols.push(c);
  }
  return {
    passes: correctCols.length >= 1,
    correctCols,
    correct_col: null, // undercut has no single correct col; eval derives from highlight_metadata
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkOvercutPredicate(ms, scores) {
  const result = detectOvercut(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  const majorCol = result.highlightMetadata.cells.find(c => c.role === 'major_threat').column;
  return {
    passes: true,
    correctCols: [majorCol],
    correct_col: null, // overcut eval derives from highlight_metadata
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkFigure7Predicate(ms, scores) {
  const result = detectFigure7(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

export function checkJShapePredicate(ms, scores) {
  const result = detectJShape(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  return {
    passes: true,
    correctCols: [result.correctCol],
    correct_col: result.correctCol,
    highlight_metadata: result.highlightMetadata,
    category_evidence: result.categoryEvidence,
  };
}

// Check whether the current position satisfies the category predicate.
// Returns { passes, correctCols, correct_col?, highlight_metadata?, category_evidence? }.
async function checkPredicate(category, moveString, scores, solver) {
  if (category === 'forced_win') return checkForcedWinPredicate(moveString, solver);
  if (category === 'forbidden_columns') return checkForbiddenColumnsPredicate(moveString);

  // New tactical categories — priority order per Decision 5
  if (category === 'z_threat') return checkZThreatPredicate(moveString, scores);
  if (category === 'undercut') return checkUndercutPredicate(moveString, scores);
  if (category === 'overcut') return checkOvercutPredicate(moveString, scores);
  if (category === 'claimeven') return checkClaimevenPredicate(moveString, scores, solver);
  if (category === 'figure_7') return checkFigure7Predicate(moveString, scores);
  if (category === 'j_shape') return checkJShapePredicate(moveString, scores);

  const puzzle = { category, moveString };
  const heights = new Board(moveString).colHeights;
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  // immediate_threat/forced_block/double_threat: exactly one legal column must return 'correct'
  const correctCols = legalCols.filter(c => {
    const r = evaluatePredicate(puzzle, c, scores);
    return r.result === 'correct';
  });
  return { passes: correctCols.length === 1, correctCols };
}

// Reject positions that violate per-category board-quality constraints.
function isClean(category, ms) {
  const { board, colHeights } = parseBoardState(ms);
  const player = (ms.length % 2 === 0) ? 1 : 2;
  const playerThreats = getImmediateThreats(board, colHeights, player).length;

  if (category === 'immediate_threat') {
    // Exactly one winning column, and no stacked double-threat structure
    return playerThreats === 1 && !hasActiveDoubleThreat(board, colHeights, player);
  }

  // All other categories: current player must not already be able to win immediately
  if (playerThreats > 0) return false;

  if (category === 'forced_block') {
    // Opponent must have exactly one immediate threat → uniquely blockable
    // and no active double threat for the opponent (which would make blocking futile)
    const opponent = 3 - player;
    return getImmediateThreats(board, colHeights, opponent).length === 1 &&
      !hasActiveDoubleThreat(board, colHeights, opponent);
  }

  if (category === 'forbidden_columns') {
    // Current player must not be in a position where the opponent already has a double threat
    const opponent = 3 - player;
    return !hasActiveDoubleThreat(board, colHeights, opponent);
  }

  return true;
}

/**
 * Generate up to `count` puzzle candidates for `category`.
 * Returns { candidates[], seed, durationMs }.
 */
export async function generateCandidates(category, count, seed) {
  const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32);
  console.log('generateCandidates called', { category, count, seed: usedSeed });
  const rng = mulberry32(usedSeed);
  const t0 = Date.now();

  const solver = createSolverProcess();

  const candidates = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 400;
  let lastLogTime = t0;
  const LOG_INTERVAL_MS = 5000;

  const stats = { noMatch: 0, depthFilter: 0, accepted: 0 };

  try {
    while (candidates.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;

      const rawMinMoves = 8 + Math.floor(rng() * 5);
      const maxMoves = ['immediate_threat', 'forced_block'].includes(category) ? 20 : Math.max(rawMinMoves, 34);
      const minMoves = Math.min(rawMinMoves, maxMoves);

      let matchedCorrectCols = null;
      let matchedHighlightMetadata = null;
      let matchedCategoryEvidence = null;
      let matchedCorrectCol = null;
      const onPosition = async (ms, sc) => {
        if (ms.length < minMoves) return false;
        if (!isClean(category, ms)) return false;
        const predicateResult = await checkPredicate(category, ms, sc, solver);
        if (!predicateResult.passes) return false;
        matchedCorrectCols = predicateResult.correctCols;
        matchedHighlightMetadata = predicateResult.highlight_metadata ?? null;
        matchedCategoryEvidence = predicateResult.category_evidence ?? null;
        matchedCorrectCol = predicateResult.correct_col ?? null;
        return true;
      };

      const result = await solverWeightedPosition(solver, maxMoves, rng, onPosition);
      if (!result) { stats.noMatch++; continue; }

      const { moveString, scores, trace } = result;
      const correctCols = matchedCorrectCols;

      const tags = [];
      if (correctCols.length > 0) {
        const cls = classify(moveString, correctCols[0], scores);
        if (cls?.tag) tags.push(cls.tag);
      }

      const highlight_cells = await computeHighlightCells(category, moveString, scores, correctCols, solver);
      if (highlight_cells === null) {
        stats.depthFilter++;
        continue;
      }

      stats.accepted++;
      candidates.push({
        category,
        move_string: moveString,
        solver_scores: scores,
        classifier_tags: tags,
        debug_trace: trace,
        highlight_cells,
        highlight_metadata: matchedHighlightMetadata,
        category_evidence: matchedCategoryEvidence,
        correct_col: matchedCorrectCol,
      });

      const now = Date.now();
      if (now - lastLogTime >= LOG_INTERVAL_MS) {
        lastLogTime = now;
        const elapsed = ((now - t0) / 1000).toFixed(1);
        console.log(
          `[generateCandidates cat=${category}] ${elapsed}s | attempt=${attempts}/${MAX_ATTEMPTS} found=${candidates.length}/${count}` +
          ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
        );
      }
    }
  } finally {
    solver.destroy();
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[generateCandidates cat=${category}] DONE ${elapsed}s | attempts=${attempts} found=${candidates.length}/${count}` +
    ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
  );

  return { candidates, seed: usedSeed, durationMs: Date.now() - t0 };
}
