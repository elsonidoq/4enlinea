/**
 * CLI tool: explain why a move is strong (or weak) by simulating optimal continuations
 * and aggregating which tactical patterns appear at the leaves.
 *
 * Usage:
 *   ./explain_simulate.sh <movestring> <col> [numPlies=2] [perspective=auto]
 *
 *   movestring  — current position as 0-indexed column digits (e.g. "33334")
 *   col         — 0-indexed column being analyzed (the move to explain)
 *   numPlies    — additional plies to simulate after col (default 2; practical range 2–4)
 *   perspective — 1 (Red) or 2 (Yellow); auto derives from who just played
 *
 * Example:
 *   ./explain_simulate.sh 33334 3 2
 */

import { Board } from '../classifier.js';
import { explainSimulate } from '../explainSimulate.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const [,, rawMoves = '', rawCol, rawPlies = '2', rawPerspective = 'auto'] = process.argv;

const col = parseInt(rawCol, 10);
if (isNaN(col) || col < 0 || col > 6) {
  console.error('Error: col must be 0–6');
  process.exit(1);
}

const numPlies = parseInt(rawPlies, 10);
if (isNaN(numPlies) || numPlies < 0 || numPlies > 6) {
  console.error('Error: numPlies must be 0–6');
  process.exit(1);
}

// Derive anchorRow: the row where the disc lands before playing col
let anchorRow;
try {
  anchorRow = new Board(rawMoves).colHeights[col];
} catch (e) {
  console.error(`Error parsing movestring: ${e.message}`);
  process.exit(1);
}

const movestring = rawMoves + col;

// perspective=auto: derives which player will be to move at the leaf level.
// After numPlies from movestring.length, leaves are at length (movestring.length + numPlies).
// currentPlayer at that length is 1 if (length % 2 === 0), else 2.
// Using leaf-level parity ensures the aggregation reports non-empty results.
// If you want a specific player's patterns regardless of parity, pass 1 or 2 explicitly.
const perspective = rawPerspective === 'auto'
  ? ((movestring.length + numPlies) % 2 === 0 ? 1 : 2)
  : parseInt(rawPerspective, 10);

if (perspective !== 1 && perspective !== 2) {
  console.error('Error: perspective must be 1, 2, or auto');
  process.exit(1);
}

const anchorCell = { col, row: anchorRow };
const playerName = p => p === 1 ? 'Red' : 'Yellow';

const solver = createSolverProcess();

async function main() {
  const result = await explainSimulate(movestring, numPlies, anchorCell, perspective, solver);

  console.log('');
  console.log(`  Position : ${movestring}`);
  console.log(`  Anchor   : col${col + 1} row${anchorRow + 1}  (0-indexed: col${col} row${anchorRow})`);
  console.log(`  Patterns : ${playerName(perspective)}'s (player to move at leaves)`);
  console.log(`  Plies    : ${numPlies}`);
  console.log(`  Leaves   : ${result.totalLeaves}`);
  console.log('');

  // Column headers
  const PAT_W = 18;
  const NUM_W = 6;
  const header = 'PATTERN'.padEnd(PAT_W) +
    'FREQ'.padStart(NUM_W) + 'TOTAL'.padStart(NUM_W) + 'RATIO'.padStart(NUM_W) +
    'W/ANC'.padStart(NUM_W) + 'WO/ANC'.padStart(NUM_W) + '  DISTRIBUTION';
  console.log('  ' + header);
  console.log('  ' + '-'.repeat(header.length));

  for (const [name, entry] of Object.entries(result.patterns)) {
    const { frequency, total, ratio, withAnchorDisc, withoutAnchorDisc,
            cellHistogram, colHistogram } = entry;

    const dist = buildDist(cellHistogram, colHistogram);

    const line =
      name.padEnd(PAT_W) +
      String(frequency).padStart(NUM_W) +
      String(total).padStart(NUM_W) +
      ratio.toFixed(2).padStart(NUM_W) +
      String(withAnchorDisc).padStart(NUM_W) +
      String(withoutAnchorDisc).padStart(NUM_W) +
      (dist ? `  ${dist}` : '');

    console.log('  ' + line);
  }

  console.log('');
  console.log(`  Timing   : ${result.timing.totalMs}ms  |  solver calls: ${result.timing.solverCalls} (cache hits: ${result.timing.solverCacheHits})`);
  console.log('');
  console.log('        W/ANC = pattern involved the anchor disc | WO/ANC = pattern did not');
  console.log('        Column indices in DISTRIBUTION are 0-indexed; rows are 0-indexed (0=bottom)');
  console.log('');
}

/** Formats the top-3 entries of a histogram as a compact string. */
function buildDist(cellHistogram, colHistogram) {
  const h = cellHistogram ?? colHistogram;
  if (!h || Object.keys(h).length === 0) return '';
  const sorted = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return sorted.map(([k, v]) => `${k}×${v}`).join('  ');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => solver.destroy());
