// Spec 044 Batch 2 / T018 helper (ad hoc, not part of test suite): search playGame-sourced
// positions for boards where checkPredicate() passes for undercut / z_threat / overcut / claimeven,
// for use as hardcoded regression-test fixtures confirming these single-answer categories are
// unaffected by the US3 multi-solution fix.
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame } from '../gameSampling.js';
import { checkPredicate } from '../candidate-generator.js';

const solver = createSolverProcess();
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wanted = ['undercut', 'z_threat', 'overcut', 'claimeven'];
const found = Object.fromEntries(wanted.map(c => [c, null]));

outer:
for (let seed = 1; seed <= 300; seed++) {
  if (wanted.every(c => found[c])) break;
  const rng = mulberry32(seed);
  const it = playGame(solver, rng, { maxMistakeProb: 0.4 });
  for await (const pos of it) {
    if (pos.ms.length < 6) continue;
    for (const category of wanted) {
      if (found[category]) continue;
      const result = await checkPredicate(category, pos.ms, pos.scores, solver);
      if (result.passes) {
        found[category] = { ms: pos.ms, scores: pos.scores, correctCols: result.correctCols, correct_col: result.correct_col };
        console.log(`${category}: ${JSON.stringify(found[category])}`);
      }
    }
    if (wanted.every(c => found[c])) break outer;
  }
}

console.log('---missing---', wanted.filter(c => !found[c]));
process.exit(0);
