const INVALID_MOVE = -1000;

export const DIFFICULTY_TEMPERATURES = {
  easy: 5.0,
  medium: 3,
  hard: 1.5,
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
