// openingSampling.mjs — pure, seed-local RNG + prefix-length helpers for select_boards.mjs's
// Phase-1 deterministic opening step. NOTHING here touches Math.random or gameSampling's RNG
// (determinism trap project_gamesampling_rng_determinism_trap): the caller passes a private
// mulberry32 instance so the opening step cannot perturb the stochastic Phase-2 harvest.

/** Deterministic PRNG seeded by `seed` (mulberry32). Returns a () => float in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher-Yates using the supplied rng; returns the same array (deterministic per rng). */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * All prefix lengths of a KB opening line worth sampling: 1..L-1 (both parities), capped so the
 * prefix stays in the opening phase (< maxDiscs). Even length ⇒ player 1 to move; odd ⇒ player 2.
 * Length 0 (empty board) is excluded — matchOpeningPrefix('') has family:null (no opening reason).
 */
export function evenAndOddPrefixLengths(line, maxDiscs) {
  const L = line.moves.length;
  const out = [];
  for (let k = 1; k < L && k < maxDiscs; k++) out.push(k);
  return out;
}
