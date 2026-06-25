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
