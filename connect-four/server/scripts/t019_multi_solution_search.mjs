// Spec 044 Batch 2 / T019 helper (ad hoc, not part of test suite): search playGame-sourced
// positions for multi-solution immediate_threat / forced_block / double_threat boards (>=2
// correctCols) that ALSO pass the US1 color-cast guard, for use as hardcoded test fixtures.
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame } from '../gameSampling.js';
import { evaluatePredicate } from '../predicates.js';
import { Board } from '../classifier.js';

const solver = createSolverProcess();
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const found = { immediate_threat: [], forced_block: [], double_threat: [] };
const wantPlayer = { immediate_threat: 1, forced_block: 2, double_threat: null };

for (let seed = 1; seed <= 400; seed++) {
  if (found.immediate_threat.length >= 2 && found.forced_block.length >= 2 && found.double_threat.length >= 2) break;
  const rng = mulberry32(seed);
  const it = playGame(solver, rng, { maxMistakeProb: 0.4 });
  for await (const pos of it) {
    if (pos.ms.length < 6) continue;
    const learner = new Board(pos.ms).currentPlayer;
    for (const category of ['immediate_threat', 'forced_block', 'double_threat']) {
      if (found[category].length >= 2) continue;
      if (wantPlayer[category] !== null && learner !== wantPlayer[category]) continue;
      const puzzle = { category, moveString: pos.ms };
      const legalCols = [];
      for (let c = 0; c < 7; c++) if (pos.scores[c] !== undefined && pos.scores[c] > -1000) legalCols.push(c);
      const correctCols = legalCols.filter(c => {
        const r = evaluatePredicate(puzzle, c, pos.scores);
        return r.result === 'correct' || r.result === 'tied';
      });
      if (correctCols.length >= 2) {
        found[category].push({ ms: pos.ms, correctCols, scores: pos.scores });
      }
    }
  }
}

for (const cat of Object.keys(found)) {
  console.log(`=== ${cat} ===`);
  for (const f of found[cat]) {
    console.log(JSON.stringify(f));
  }
}
process.exit(0);
