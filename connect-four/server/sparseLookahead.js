import { Board } from './classifier.js';

const ROWS = 6;
const COLS = 7;

export const LOOKAHEAD_DEPTH = 4;
export const PLAYER_CAP = 2;
export const OPPONENT_CAP = 4;
export const GLOBAL_CALL_BUDGET = 60;
export const CLASSIFY_TIMEOUT_MS = 4000;
export const MAX_WAYS = 3;
export const MIN_BRANCH_DELTA = 1;

/**
 * 0-indexed opponent "mistake" columns to explore from an opponent-to-move node.
 * Excludes the best score tier and the single worst tier; accumulates middle tiers
 * (best-first) until >=3 columns, never splitting a tier, capped by OPPONENT_CAP.
 */
export function selectOpponentMistakeCols(scores, board) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  if (legal.length <= 1) return [];

  // Group legal columns into score tiers, best (highest score) first.
  const byScore = new Map();
  for (const c of legal) {
    const s = scores[c];
    if (!byScore.has(s)) byScore.set(s, []);
    byScore.get(s).push(c);
  }
  const tiers = [...byScore.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cols]) => cols);

  if (tiers.length <= 1) return []; // all equal — no mistake gradient
  // Drop best tier (index 0). Drop worst tier (last) unless that leaves nothing.
  const middle = tiers.slice(1, tiers.length > 2 ? tiers.length - 1 : tiers.length);

  // Accumulate middle tiers whole; never-split takes precedence over OPPONENT_CAP.
  // A single large tie tier may exceed the cap (e.g., 5 columns) rather than force
  // an arbitrary within-tier choice.
  const selected = [];
  for (const tier of middle) {
    if (selected.length >= 3 && selected.length + tier.length > OPPONENT_CAP) break;
    selected.push(...tier);
    if (selected.length >= 3) break;
  }
  return selected;
}

/**
 * Runs classifyFn with a hard timeout. Returns an empty Map on throw OR timeout.
 * classifyPattern can hang on IPC deadlock (no throw) — the timeout is mandatory.
 */
export async function classifyPatternWithTimeout(classifyFn, ms, perspective, solver, timeoutMs = CLASSIFY_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(new Map()), timeoutMs);
  });
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => classifyFn(ms, perspective, solver)),
      timeout,
    ]);
    return result instanceof Map ? result : new Map();
  } catch {
    return new Map();
  } finally {
    clearTimeout(timer);
  }
}

const TIER1 = new Set(['immediate_threat', 'double_threat', 'undercut', 'overcut', 'figure_7', 'j_shape']);

export function extractTier1Structures(patternMap) {
  const out = [];
  for (const [tag, val] of patternMap) {
    if (TIER1.has(tag) && val && Array.isArray(val.cells) && val.cells.length > 0) {
      out.push({ tag, cells: val.cells });
    }
  }
  return out;
}

function topScoringCols(scores, board, cap) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  legal.sort((a, b) => scores[b] - scores[a]);
  return legal.slice(0, cap);
}

function recordWay(tally, tag, firstReply, cells) {
  if (!tally.has(tag)) tally.set(tag, { branches: new Set(), ways: [] });
  const entry = tally.get(tag);
  entry.branches.add(firstReply);
  const key = cells.join(',');
  if (!entry.ways.some(w => w.join(',') === key)) entry.ways.push(cells);
}

export async function searchOpportunities(rootMovestring, perspective, deps, budget) {
  const { solver, classifyFn } = deps;
  const tally = new Map();
  const opponent = perspective === 1 ? 2 : 1;

  async function recurse(ms, firstReply, pliesLeft) {
    if (pliesLeft <= 0 || budget.calls <= 0) return;
    const board = new Board(ms);
    const toMove = board.currentPlayer;

    if (toMove === opponent) {
      const scores = await solver.query(ms);
      const cols = selectOpponentMistakeCols(scores, board);
      for (const c of cols) {
        if (board.colHeights[c] >= ROWS) continue;
        const nextFirst = firstReply === null ? c : firstReply;
        await recurse(ms + c.toString(), nextFirst, pliesLeft - 1);
      }
    } else {
      // Player to move: detect structures here, then continue down best lines.
      if (budget.calls > 0) {
        budget.calls -= 1;
        const map = await classifyPatternWithTimeout(classifyFn, ms, perspective, solver);
        for (const { tag, cells } of extractTier1Structures(map)) {
          recordWay(tally, tag, firstReply, cells);
        }
      }
      const scores = await solver.query(ms);
      for (const c of topScoringCols(scores, board, PLAYER_CAP)) {
        await recurse(ms + c.toString(), firstReply, pliesLeft - 1);
      }
    }
  }

  await recurse(rootMovestring, null, LOOKAHEAD_DEPTH);
  return tally;
}

export function compareOpportunities(bestTally, playedTally) {
  let winner = null;
  let bestDelta = 0;
  for (const [tag, entry] of bestTally) {
    const bestCount = entry.branches.size;
    const playedCount = playedTally.get(tag)?.branches.size ?? 0;
    const delta = bestCount - playedCount;
    if (delta >= MIN_BRANCH_DELTA) {
      if (delta > bestDelta || (delta === bestDelta && (winner === null || tag < winner.tag))) {
        bestDelta = delta;
        winner = { tag, ways: entry.ways.slice(0, MAX_WAYS) };
      }
    }
  }
  return winner;
}
