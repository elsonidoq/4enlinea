#!/usr/bin/env node
// print_lookahead.mjs — print the sparse forward look-ahead result for one position.
//
// Usage (from connect-four/):
//   node server/scripts/print_lookahead.mjs <movestring> <playedCol> [depth] [budget]
//
//   <movestring>  the position BEFORE the move being explained (may be empty: "")
//   <playedCol>   0-indexed column of the move played (0 = leftmost)
//   [depth]       search-depth (plies) override — bounds the tree HEIGHT (default 20)
//   [budget]      call-budget override — bounds total classify/solver calls (default: none).
//
// Defaults: 20-ply window, dedupe-by-score pruning ON, no budget cap.
//
// Example:
//   node server/scripts/print_lookahead.mjs 3333 4
//   node server/scripts/print_lookahead.mjs "" 4 12 5000

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { buildExplainContext } from '../explainContext.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env (dotenv isn't reliable here; parse manually).
const env = readFileSync(join(__dirname, '../.env'), 'utf8');
env.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const movestring = process.argv[2] ?? '';
const playedCol = Number(process.argv[3]);
// Fixed prompt_data look-ahead config: a 20-ply window, dedupe-by-score pruning, and no
// budget cap (only depth limits the search). depth/budget args still override if given.
const depth = process.argv[4] != null ? Number(process.argv[4]) : 20;
// Default budget is null = UNBOUNDED: only depth limits the exploration. Pass a number to cap it.
const budget = process.argv[5] != null ? Number(process.argv[5]) : null;
if (!Number.isInteger(playedCol)
  || (depth !== undefined && !Number.isInteger(depth))
  || (budget !== null && !Number.isInteger(budget))) {
  console.error('Usage: node server/scripts/print_lookahead.mjs <movestring> <playedCol> [depth] [budget]');
  process.exit(1);
}

const solver = createSolverProcess();
try {
  // alwaysLookahead forces the search even on non-sparse positions; lookaheadDepth/Budget
  // override the game-stage tier defaults inside runSparseLookahead (budget null = unbounded).
  const ctx = await buildExplainContext(movestring, playedCol, 1, solver, { alwaysLookahead: true, lookaheadDepth: depth, lookaheadBudget: budget, lookaheadDedupeByScore: true });

  console.log(`movestring : "${movestring}"  playedCol: ${playedCol}  depth: ${depth ?? '(tier default)'}  budget: ${budget === null ? 'unbounded (depth-only)' : budget}`);
  if (!ctx || !ctx.promptData) {
    console.log('no look-ahead — context:', JSON.stringify({
      allMovesEqual: ctx?.allMovesEqual, trivial: ctx?.trivial,
    }));
  } else {
    console.log(`isSparse: ${ctx.isSparse}  lookaheadFired(prompt): ${ctx.lookaheadFired}  bestCol: ${ctx.promptData.bestCol}`);
    console.log('\nlookahead (distilled):');
    console.log(JSON.stringify(ctx.promptData.lookahead, null, 2));
    console.log('\nlookaheadRaw:');
    console.log(JSON.stringify(ctx.promptData.lookaheadRaw, null, 2));
  }
} finally {
  solver.destroy();
}
