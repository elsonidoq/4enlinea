#!/usr/bin/env node
// opp_punish_probe.mjs — Force the opponent-punishment search (the Case-3 machinery)
// on a PLAYED (losing) root, even when Case-1 would normally short-circuit on a
// player-side structure delta. Reports what completingCell / decisiveLine / earliest
// way the opponent search surfaces, at a chosen depth & budget.
//
// Usage: node opp_punish_probe.mjs <movestring> <playedCol> [depth] [budget]
//   movestring : pre-move board (0-indexed columns)
//   playedCol  : the blundered column (0-indexed)
//
// Purpose: answer "what opponent winning cell does the live lookahead expose, and at
// what realizedOnPly" independent of the early-return path in runSparseLookahead.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import {
  searchOpportunities, buildDecisiveLine, collectNovelOpportunities,
  compareOpportunities, buildAliasOutput, pickEarliestWay,
} from '../../../sparseLookahead.js';
import { classifyPattern, Board } from '../../../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const [, , movestring, playedColStr, depthStr, budgetStr] = process.argv;
const playedCol = Number(playedColStr);
const depth = depthStr ? Number(depthStr) : 20;
const budget = budgetStr ? Number(budgetStr) : 100000;

const solver = await createSolverProcess();
try {
  const classifyFn = (ms, perspective) => classifyPattern(ms, perspective, solver);
  const preBoard = new Board(movestring);
  const perspective = preBoard.currentPlayer;          // the blunderer
  const opponent = perspective === 1 ? 2 : 1;
  const playedRoot = movestring + String(playedCol);

  const oppTally = await searchOpportunities(
    playedRoot, opponent,
    { solver, classifyFn, opponentMode: 'optimal', dedupeByScore: true },
    { calls: budget }, depth,
  );

  const rootBoard = new Board(movestring);
  const dl = buildDecisiveLine(oppTally, null, 'opponent', rootBoard);
  const oppExamples = collectNovelOpportunities(oppTally, new Map());
  const oppOut = buildAliasOutput(compareOpportunities(oppTally, new Map()), 'opp-future');
  const earliest = pickEarliestWay(oppTally);

  console.log(JSON.stringify({
    perspective, opponent, depth, budget,
    earliestWay: earliest,
    decisiveLine: dl,
    oppWinner: oppOut ? { tag: oppOut.tag, allowedSetEntries: oppOut.allowedSetEntries } : null,
    oppCategoryExamples: oppExamples,
  }, null, 2));
} finally {
  solver.destroy();
}
