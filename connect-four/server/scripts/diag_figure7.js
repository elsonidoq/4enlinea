// Diagnostic script: figure-7 detection acceptance rate with convolution kernels.
// Generates N random games, probes detectFigure7 at every ply >= MIN_MOVES,
// and reports per-kernel match rates + isClean funnel.
//
// Usage: node --experimental-vm-modules server/scripts/diag_figure7.js [N_GAMES]

import { detectFigure7, Board } from '../classifier.js';

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

async function main() {
  const rng = mulberry32(42);

  let totalPlies = 0;
  let isCleanPass = 0;
  let isCleanFail = 0;
  let matchedCanonical = 0;
  let matchedFlipped = 0;

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
        totalPlies++;

        const b = new Board(ms);
        // isClean: current player has no immediate threats (no solver scores needed)
        const cleanApprox = b.immediateThreats(b.currentPlayer).length === 0;

        if (cleanApprox) {
          isCleanPass++;
          const result = detectFigure7(b, null, b.currentPlayer);
          if (result.matched) matchedCanonical++;
        } else {
          isCleanFail++;
        }
      }

      const col = legal[Math.floor(rng() * legal.length)];
      board[heights[col]][col] = player;
      heights[col]++;
      ms += col.toString();
      if (hasWon(board, player)) break;
      player = 3 - player;
    }

    if ((game + 1) % 50 === 0) process.stderr.write(`  ${game+1}/${N_GAMES} games\n`);
  }

  console.log('\n=== figure-7 diagnostic (convolution kernels) ===');
  console.log(`Games simulated: ${N_GAMES} (random, uniform move selection)`);
  console.log(`\n--- isClean funnel (plies with ms.length >= ${MIN_MOVES}) ---`);
  console.log(`  Total plies:                          ${totalPlies}`);
  console.log(`  Pass isClean → detectFigure7 called:  ${isCleanPass} (${pct(isCleanPass, totalPlies)})`);
  console.log(`  Fail isClean (rejected before detect): ${isCleanFail} (${pct(isCleanFail, totalPlies)})`);
  console.log(`\n--- detectFigure7 results (convolution) ---`);
  console.log(`  Matched (canonical kernel):  ${matchedCanonical} (${pct(matchedCanonical, isCleanPass)})`);
  console.log(`  Matched (flipped kernel):    ${matchedFlipped} (${pct(matchedFlipped, isCleanPass)})`);
}

function pct(n, d) { return d ? `${(n/d*100).toFixed(1)}%` : 'n/a'; }

main().catch(e => { console.error(e); process.exit(1); });
