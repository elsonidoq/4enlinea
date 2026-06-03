// Diagnose why specific moves in a movestring are or aren't blunders.
// Run from project root:
//   node --env-file=connect-four/server/.env connect-four/server/scripts/diagnose_blunders.mjs <movestring> [side: first|second]
//
// Example:
//   node --env-file=connect-four/server/.env connect-four/server/scripts/diagnose_blunders.mjs 333333451225566664442 second

import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { classify, parseBoardState } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const INVALID_MOVE = -1000;

const moveString = process.argv[2];
const side = process.argv[3] || 'first'; // "first" = user played first (Red), "second" = user played second (Yellow)

if (!moveString) {
  console.error('Usage: node diagnose_blunders.mjs <movestring> [first|second]');
  process.exit(1);
}

function rawBoard(moves) {
  const { board, colHeights } = parseBoardState(moves);
  const lines = [];
  lines.push('     ' + Array.from({ length: COLS }, (_, i) => `  ${i + 1} `).join(''));
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = board[row].map(v => v === 0 ? '   ' : v === 1 ? ' R ' : ' Y ').join('|');
    lines.push(`  ${row + 1}  |${cells}|`);
  }
  // Height row
  const heights = colHeights.map(h => (h >= ROWS ? ' --' : ' ' + String(h).padStart(2))).join('  ');
  lines.push(` ht   ${heights}`);
  return lines.join('\n');
}

function scoresRow(scores, colHeights) {
  const cells = scores.map((s, c) =>
    colHeights[c] >= ROWS ? '  -- ' : ' ' + String(s).padStart(3) + ' '
  ).join('|');
  return `     |${cells}| scr`;
}

function signStr(v) {
  if (v === INVALID_MOVE) return 'INV';
  if (v > 0) return '+';
  if (v === 0) return '0';
  return '-';
}

async function main() {
  const solver = createSolverProcess();

  console.log('═'.repeat(72));
  console.log(`DIAGNOSING: "${moveString}"  (${moveString.length} moves)`);
  console.log(`USER SIDE: ${side}  (${side === 'first' ? 'Red/player1' : 'Yellow/player2'})`);
  console.log('═'.repeat(72));

  let totalBlunders = 0;
  let totalUserPlies = 0;
  const diagnostics = [];

  for (let i = 0; i < moveString.length; i++) {
    const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
    if (!isUserPly) continue;

    totalUserPlies++;
    const movesBefore = moveString.slice(0, i);
    const col = parseInt(moveString[i], 10);

    console.log(`\n${'─'.repeat(72)}`);
    console.log(`PLY ${i} (user move #${totalUserPlies}) — played col ${col + 1} (0-idx: ${col})`);
    console.log(`  movesBefore: "${movesBefore}" (${movesBefore.length} moves)`);
    console.log(`${'─'.repeat(72)}`);

    // Get solver scores
    let scores;
    try {
      scores = movesBefore.length === 0
        ? EMPTY_BOARD_SCORES
        : await solver.query(movesBefore);
    } catch (e) {
      console.log(`  ⚠ Solver error: ${e.message}`);
      continue;
    }

    // Show the board
    console.log(`\n  Board before move ${i}:`);
    console.log(rawBoard(movesBefore).split('\n').map(l => '  ' + l).join('\n'));

    // Show scores
    console.log(`\n  Scores before move:`);
    console.log('  ' + scoresRow(scores, parseBoardState(movesBefore).colHeights));
    const signCells = scores.map((s, c) => {
      if (parseBoardState(movesBefore).colHeights[c] >= ROWS) return ' -- ';
      return ` ${signStr(s)} `;
    }).join('|');
    console.log(`     |${signCells}| sign`);

    // Find best
    const legal = scores.map((s, c) => ({ s, c })).filter(e => e.s > INVALID_MOVE);
    const legalCount = legal.length;
    const bestEntry = legal.reduce((a, b) => b.s > a.s ? b : a);
    const bestScore = bestEntry.s;
    const bestCol = bestEntry.c;

    // scoreMove result
    const { quality, badge } = scoreMove(scores, col);
    const playedScore = scores[col];

    console.log(`\n  ┌─ ANALYSIS ─────────────────────────────────────────────┐`);
    console.log(`  │ Legal moves: ${legalCount}   Best: col ${bestCol + 1} (score=${bestScore})   Played: col ${col + 1} (score=${playedScore})`);
    console.log(`  │ scoreMove → quality="${quality}"  badge="${badge}"`);

    // Detailed reasoning
    console.log(`  │`);
    console.log(`  │ REASONING:`);

    // Check: forced move?
    if (legalCount <= 1) {
      console.log(`  │ → SKIP: forced move (only ${legalCount} legal column(s))`);
      diagnostics.push({ ply: i, col, quality, reason: 'forced move' });
      console.log(`  └────────────────────────────────────────────────────────┘`);
      continue;
    }

    // Check: already losing?
    if (bestScore < 0) {
      console.log(`  │ Losing position (bestScore=${bestScore} < 0) — using LOSING branch`);
      console.log(`  │   blunder threshold: played(${playedScore}) < bestScore(${bestScore}) - 4 = ${bestScore - 4}`);
      const threshold = bestScore - 4;
      if (playedScore < threshold) {
        console.log(`  │   ${playedScore} < ${threshold} → BLUNDER! (even in losing position)`);
        diagnostics.push({ ply: i, col, quality, reason: 'BLUNDER in losing position' });
        totalBlunders++;
      } else {
        console.log(`  │   ${playedScore} >= ${threshold} → NOT a blunder in losing branch`);
        diagnostics.push({ ply: i, col, quality, reason: 'not a blunder (diff too small in losing position)' });
      }
      console.log(`  └────────────────────────────────────────────────────────┘`);
      continue;
    }

    // Standard branch
    console.log(`  │   bestScore=${bestScore} >= 0 → using STANDARD branch`);
    console.log(`  │   sign(bestScore)=${signStr(bestScore)}  sign(played)=${signStr(playedScore)}`);

    const playedSign = Math.sign(playedScore);
    const bestSign = Math.sign(bestScore);

    if (playedScore === bestScore) {
      console.log(`  │   played === bestScore → OPTIMAL (not a blunder)`);
      diagnostics.push({ ply: i, col, quality, reason: 'optimal (played === bestScore)' });
    } else if (playedSign === bestSign) {
      console.log(`  │   sign(played) === sign(bestScore) → SUBOPTIMAL (not a blunder)`);
      console.log(`  │   Same sign means both are winning, drawing, or losing together.`);
      diagnostics.push({ ply: i, col, quality, reason: 'suboptimal (same sign, not a blunder)' });
    } else {
      console.log(`  │   sign(played) < sign(bestScore) → BLUNDER!`);
      console.log(`  │   Player chose a worse outcome category than available.`);
      diagnostics.push({ ply: i, col, quality, reason: 'BLUNDER — sign mismatch' });
      totalBlunders++;

      // Also classify
      try {
        const classifyResult = classify(movesBefore, col, scores);
        console.log(`  │   Pattern: ${classifyResult.tag}`);
      } catch (e) {
        console.log(`  │   Classify error: ${e.message}`);
      }
    }

    console.log(`  └────────────────────────────────────────────────────────┘`);
  }

  // Summary
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`SUMMARY`);
  console.log(`${'═'.repeat(72)}`);
  console.log(`  Total user plies: ${totalUserPlies}`);
  console.log(`  Blunders detected: ${totalBlunders}`);
  console.log(`  Non-blunder plies: ${totalUserPlies - totalBlunders}`);
  console.log(``);
  console.log(`  Per-ply breakdown:`);
  for (const d of diagnostics) {
    console.log(`    ply ${String(d.ply).padStart(3)}  col ${d.col + 1}  quality=${d.quality.padEnd(11)}  ${d.reason}`);
  }

  solver.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
