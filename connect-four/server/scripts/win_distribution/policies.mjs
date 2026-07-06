import { checkWin } from '../../classifier.js';

const ROWS = 6;

export const POLICY_NAMES = ['optimal', 'mp10', 'mp25', 'blocker'];

function pickUniform(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function argmaxCols(scores, legal) {
  const best = Math.max(...legal.map(c => scores[c]));
  return legal.filter(c => scores[c] === best);
}

function makeOptimal() {
  return async ({ legal, getScores, rng }) => {
    const scores = await getScores();
    return pickUniform(argmaxCols(scores, legal), rng);
  };
}

function makeEpsilonUniform(eps) {
  return async ({ legal, getScores, rng }) => {
    if (rng() < eps) return pickUniform(legal, rng); // mistake: no solver call
    const scores = await getScores();
    return pickUniform(argmaxCols(scores, legal), rng);
  };
}

// Defensive random player, solver-free. Pre-move board is sufficient: the
// mover's own disc can neither create nor remove an opponent window through
// the landing cell (that supporting cell is empty in both evaluations).
function makeBlocker() {
  return async ({ board, heights, player, legal, rng }) => {
    const opp = 3 - player;
    const ownWins = legal.filter(c => checkWin(board, heights[c], c, player));
    if (ownWins.length) return pickUniform(ownWins, rng);
    const blocks = legal.filter(c => checkWin(board, heights[c], c, opp));
    if (blocks.length) return pickUniform(blocks, rng);
    const safe = legal.filter(c => heights[c] + 1 >= ROWS || !checkWin(board, heights[c] + 1, c, opp));
    return pickUniform(safe.length ? safe : legal, rng);
  };
}

export function makePolicy(name) {
  switch (name) {
    case 'optimal': return makeOptimal();
    case 'mp10': return makeEpsilonUniform(0.10);
    case 'mp25': return makeEpsilonUniform(0.25);
    case 'blocker': return makeBlocker();
    default: throw new Error(`Unknown policy: ${name} (valid: ${POLICY_NAMES.join(', ')})`);
  }
}
