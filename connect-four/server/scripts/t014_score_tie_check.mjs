// Spec 044 T014 (record-only, not a gate): empirically check whether a double_threat
// fork-creating column is always the single max-score column from scoreMove. Run once, ad hoc;
// not part of the test suite.
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame } from '../gameSampling.js';
import { evaluatePredicate } from '../predicates.js';

const solver = createSolverProcess();
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

let found = 0;
let counterexample = null;

for (let game = 0; game < 80 && found < 8; game++) {
  const it = playGame(solver, rng, { maxMistakeProb: 0.4 });
  for await (const pos of it) {
    if (pos.ms.length < 8) continue;
    const puzzle = { category: 'double_threat', moveString: pos.ms };
    const legalCols = [];
    for (let c = 0; c < 7; c++) if (pos.scores[c] > -1000) legalCols.push(c);
    const correctCols = legalCols.filter(c => {
      const r = evaluatePredicate(puzzle, c, pos.scores);
      return r.result === 'correct' || r.result === 'tied';
    });
    if (correctCols.length >= 2) {
      found++;
      const maxScore = Math.max(...legalCols.map(c => pos.scores[c]));
      const maxScoreCols = legalCols.filter(c => pos.scores[c] === maxScore);
      const forkNotMax = correctCols.some(c => !maxScoreCols.includes(c));
      const maxNotFork = maxScoreCols.some(c => !correctCols.includes(c));
      console.log(`ms=${pos.ms} forkCols=${JSON.stringify(correctCols)} maxScoreCols=${JSON.stringify(maxScoreCols)} forkNotMax=${forkNotMax} maxNotFork=${maxNotFork}`);
      if ((forkNotMax || maxNotFork) && !counterexample) {
        counterexample = { ms: pos.ms, correctCols, maxScoreCols };
      }
    }
    if (found >= 8) break;
  }
}

console.log('---');
console.log('double_threat boards found with >=2 correct (fork) cols:', found);
console.log('counterexample (fork-tie != score-tie):', counterexample ? JSON.stringify(counterexample) : 'NONE FOUND in this sample');
process.exit(0);
