export const INVALID_MOVE = -1000;

export const DIFFICULTY_TEMPERATURES = {
  easy: 2,
  medium: 1,
  hard: 1,
  perfect: 0,
};

export const MISTAKE_RATES = {
  easy: 1/2,
  medium: 1/4,
  hard: 1/8,
  perfect: 0,
};

/**
 * Sample a column index from solver scores using softmax with the given temperature.
 *
 * temperature=0  → argmax (always picks best)
 * temperature→∞  → uniform over valid columns
 *
 * Columns with score <= INVALID_MOVE are masked and never sampled.
 */
export function sampleColumnFromScores(scores, temperature) {
  const valid = scores
    .map((s, i) => ({ score: s, col: i }))
    .filter(({ score }) => score > INVALID_MOVE);

  if (valid.length === 0) return 0;

  if (temperature === 0) {
    let best = valid[0];
    for (const entry of valid) if (entry.score > best.score) best = entry;
    // break ties randomly
    const tied = valid.filter(e => e.score === best.score);
    return tied[Math.floor(Math.random() * tied.length)].col;
  }

  // Numerically stable softmax: subtract max before exp
  const maxScore = Math.max(...valid.map(e => e.score));
  const exps = valid.map(e => ({ col: e.col, w: Math.exp((e.score - maxScore) / temperature) }));
  const total = exps.reduce((s, e) => s + e.w, 0);

  let r = Math.random() * total;
  for (const e of exps) {
    r -= e.w;
    if (r <= 0) return e.col;
  }
  return exps[exps.length - 1].col;
}

/**
 * Given scores from POST /api/scores, return the second-best legal column.
 * "Second-best" = highest score strictly below the maximum among legal columns.
 * Returns null if: fewer than 2 legal columns, or all legal columns tie the max.
 * Never returns a sentinel-masked column.
 */
export function secondBestColumn(scores) {
  const legal = scores
    .map((s, i) => ({ score: s, col: i }))
    .filter(({ score }) => score > INVALID_MOVE);
  if (legal.length < 2) return null;
  const maxScore = Math.max(...legal.map(e => e.score));
  const belowMax = legal.filter(e => e.score < maxScore);
  if (belowMax.length === 0) return null;
  const best = belowMax.reduce((a, b) => b.score > a.score ? b : a);
  return best.col;
}
