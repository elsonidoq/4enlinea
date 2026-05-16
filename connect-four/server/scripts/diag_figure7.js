// Diagnostic script: figure-7 acceptance rate root cause analysis.
// Generates N random games, probes detectFigure7 at every ply >= 14 moves,
// and reports the isClean funnel + per-stage rejection breakdown inside detectFigure7.
//
// Usage: node --experimental-vm-modules server/scripts/diag_figure7.js [N_GAMES]

import { detectFigure7, figure7Diag, resetFigure7Diag } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const ROWS = 6;
const COLS = 7;
const N_GAMES = parseInt(process.argv[2] ?? '300', 10);
const MIN_MOVES = 34;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

function hasWon(board, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        let cnt = 0;
        for (let i = 0; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) cnt++;
          else break;
        }
        if (cnt === 4) return true;
      }
    }
  }
  return false;
}

// Re-implement guards A–C inline (structural match without score/threat constraint).
// Returns true if any template variant has 4 placed cells owned by currentPlayer
// and the junction is empty AND at exact column height.
function hasStructuralFigure7(moves) {
  const moveCount = moves.length;
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const colHeights = Array(COLS).fill(0);
  for (let i = 0; i < moveCount; i++) {
    const col = parseInt(moves[i], 10) - 1;
    board[colHeights[col]][col] = (i % 2 === 0) ? 1 : 2;
    colHeights[col]++;
  }
  const currentPlayer = (moveCount % 2 === 0) ? 1 : 2;

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const variants = [];
      if (x + 4 < COLS && y + 2 < ROWS) variants.push([
        {col:x,row:y},{col:x+1,row:y+1},{col:x+2,row:y+2},{col:x+3,row:y+2},{col:x+4,row:y+2}]);
      if (x + 2 < COLS && y + 2 < ROWS) variants.push([
        {col:x,row:y},{col:x+1,row:y+1},{col:x+2,row:y+2},{col:x+1,row:y+2},{col:x,row:y+2}]);
      if (x - 2 >= 0 && y + 2 < ROWS) variants.push([
        {col:x,row:y},{col:x-1,row:y+1},{col:x-2,row:y+2},{col:x-1,row:y+2},{col:x,row:y+2}]);
      if (x - 4 >= 0 && y + 2 < ROWS) variants.push([
        {col:x,row:y},{col:x-1,row:y+1},{col:x-2,row:y+2},{col:x-3,row:y+2},{col:x-4,row:y+2}]);

      for (const template of variants) {
        const comp = template[2];
        const placed = template.filter((_, i) => i !== 2);
        if (!placed.every(c => board[c.row][c.col] === currentPlayer)) continue;
        if (board[comp.row][comp.col] !== 0) continue;
        if (colHeights[comp.col] !== comp.row) continue;
        return true; // guards A–C pass
      }
    }
  }
  return false;
}

async function main() {
  const solver = createSolverProcess();
  const rng = mulberry32(42);
  resetFigure7Diag();

  let totalPlies = 0;
  let isCleanPass = 0;
  let isCleanFail = 0;
  let structuralMatchTotal = 0;           // guards A–C pass (any ply ≥ MIN_MOVES)
  let structuralMatchBlockedByIsClean = 0; // A–C pass but isClean failed
  let structuralMatchPassedIsClean = 0;   // A–C pass and isClean passed (→ detectFigure7 called)

  for (let game = 0; game < N_GAMES; game++) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    const heights = Array(COLS).fill(0);
    let ms = '';
    let player = 1;

    while (true) {
      const legal = [];
      for (let c = 0; c < COLS; c++) if (heights[c] < ROWS) legal.push(c);
      if (legal.length === 0) break;

      if (ms.length >= MIN_MOVES) {
        const scores = await solver.query(ms);
        totalPlies++;

        const winScore = immediateWinScore(ms.length);
        const clean = winScore <= 0 || !scores.some(s => s >= winScore);
        const structural = hasStructuralFigure7(ms);

        if (structural) {
          structuralMatchTotal++;
          if (clean) structuralMatchPassedIsClean++;
          else structuralMatchBlockedByIsClean++;
        }

        if (clean) {
          isCleanPass++;
          detectFigure7(ms, scores); // accumulates figure7Diag
        } else {
          isCleanFail++;
        }
      }

      const col = legal[Math.floor(rng() * legal.length)];
      board[heights[col]][col] = player;
      heights[col]++;
      ms += (col + 1).toString();
      if (hasWon(board, player)) break;
      player = 3 - player;
    }

    if ((game + 1) % 50 === 0) process.stderr.write(`  ${game+1}/${N_GAMES} games\n`);
  }

  solver.destroy();

  const d = figure7Diag;
  console.log('\n=== figure-7 diagnostic ===');
  console.log(`Games simulated: ${N_GAMES} (random, uniform move selection)`);
  console.log(`\n--- isClean funnel (plies with ms.length >= ${MIN_MOVES}) ---`);
  console.log(`  Total plies:                        ${totalPlies}`);
  console.log(`  Pass isClean → detectFigure7 called:  ${isCleanPass} (${pct(isCleanPass, totalPlies)})`);
  console.log(`  Fail isClean (rejected before detect): ${isCleanFail} (${pct(isCleanFail, totalPlies)})`);
  console.log(`\n--- Structural figure-7 match (guards A–C, no score/threat) ---`);
  console.log(`  Structural matches total:           ${structuralMatchTotal} (${pct(structuralMatchTotal, totalPlies)})`);
  console.log(`  ...of which blocked by isClean:     ${structuralMatchBlockedByIsClean}`);
  console.log(`  ...of which passed isClean:         ${structuralMatchPassedIsClean}`);
  console.log(`\n--- detectFigure7 per-stage rejection (only when isClean passes) ---`);
  console.log(`  Calls:               ${d.calls}`);
  console.log(`  failPlaced [A]:      ${d.failPlaced}`);
  console.log(`  failCompOccupied [B]:${d.failCompOccupied}`);
  console.log(`  failHeight [C]:      ${d.failHeight}`);
  console.log(`  failScore [D]:       ${d.failScore}`);
  console.log(`  failThreat [E]:      ${d.failThreat}`);
  console.log(`    failThreat with 0 qualifying threats: ${d.failThreat_count_0 ?? 0}`);
  console.log(`    failThreat with 1 qualifying threat:  ${d.failThreat_count_1 ?? 0}`);
  console.log(`  matched:             ${d.matched}`);
  console.log(`\n--- Threat overlap analysis (among positions passing A–D) ---`);
  console.log(`  Raw winning cols found (before overlap filter): ${d.rawWinCols ?? 0}`);
  console.log(`  Winning cols rejected by overlap filter (<3):   ${d.winColNoOverlap ?? 0}`);
  console.log(`\n--- Derived ---`);
  console.log(`  Structural rate given isClean pass: ${pct(structuralMatchPassedIsClean, isCleanPass)}`);
  console.log(`  Score filter pass rate (of struct): ${pct(d.matched + d.failThreat, structuralMatchPassedIsClean)}`);
  console.log(`  Threat filter pass rate (of scored):${pct(d.matched, d.matched + d.failThreat)}`);
}

function pct(n, d) { return d ? `${(n/d*100).toFixed(1)}%` : 'n/a'; }

main().catch(e => { console.error(e); process.exit(1); });
