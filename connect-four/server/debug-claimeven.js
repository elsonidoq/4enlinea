import { createSolverProcess } from './c4solver-wrapper.js';
import { detectClaimeven } from './classifier.js';

const moves = process.argv[2] ?? '';
const solver = createSolverProcess();

const result = await detectClaimeven(moves, null, solver);
console.log(JSON.stringify(result, null, 2));

if (result.matched) {
  const trace = result.categoryEvidence.simulation_trace ?? [];
  const traceCols = trace.map(s => s.col).join('');
  console.log('\nmovestring:', moves + result.correctCol + traceCols);
}

solver.destroy();
process.exit(0);
