import { createSolverProcess } from '../server/c4solver-wrapper.js';
import { writeFileSync } from 'fs';

const MOVESTRING = '33333222255555205324466060000666444411';
const OUTPUT = new URL('./movestring_scores.json', import.meta.url).pathname;

const solver = createSolverProcess();
const results = [];

for (let i = 0; i <= MOVESTRING.length; i++) {
  const ms = MOVESTRING.slice(0, i);
  try {
    const scores = await solver.query(ms);
    results.push({ ms, scores });
    process.stdout.write(`${i}/${MOVESTRING.length}\r`);
  } catch (err) {
    console.error(`\nFailed at prefix "${ms}": ${err.message}`);
    results.push({ ms, scores: null });
  }
}

solver.destroy();
writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
console.log(`\nWrote ${results.length} entries to ${OUTPUT}`);
