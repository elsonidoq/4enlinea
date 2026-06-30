#!/usr/bin/env node
// forward_distance.mjs — the REPAIRED outcomeTiming.pliesToEnd (epic Story A) + register word.
//
// Purpose: the live field is Math.abs(score), whose direction is INVERTED. This tool computes the
// TRUE forward ply distance and the register bucket, so an auditor can verify a reason's register.
//
// Derivation (c4solver / Pons scoring): for a decided position, the game ends with total stone
// count  T = 43 - 2*|score|.  Forward distance = T - currentDiscs = 43 - 2*|score| - currentDiscs.
// Verified: eval-0 (score 1, 0 discs -> 41), eval-6 played (score -1, 18 discs -> 23 = the epic's
// documented realizedOnPly:23). Smallest |score| => LARGEST distance (slow zugzwang).
//
// Usage (from connect-four/):
//   node server/scripts/reason_engine/TOOLS/forward_distance.mjs <movestring> <col> [<col2> ...]
// Prints outcome, forward plies, and suggested register for playing each col on the pre-move board.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
const env = readFileSync(join(root, '.env'), 'utf8');
env.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

// Register buckets (epic §6; cutoffs are an open decision §13.1 — these are reasonable defaults
// derived from the inversion: distance counts plies from now to the decisive board state).
export function registerOf(outcome, fwd) {
  if (outcome === 'draw') return 'draw_no_register';
  if (fwd == null) return 'unknown';
  if (fwd <= 2) return 'immediate';
  if (fwd <= 10) return 'forced_sequence';
  return 'slow_zugzwang'; // near board-fill
}

export function forwardDistance(score, currentDiscs) {
  if (score === undefined || score === -1000) return { outcome: 'invalid', fwd: null };
  if (score === 0) return { outcome: 'draw', fwd: null };
  const outcome = score > 0 ? 'win' : 'loss';
  const fwd = 43 - 2 * Math.abs(score) - currentDiscs;
  return { outcome, fwd };
}

const movestring = process.argv[2] ?? '';
const cols = process.argv.slice(3).map(Number);
if (cols.length === 0) { console.error('Usage: forward_distance.mjs <movestring> <col> [col2 ...]'); process.exit(1); }

const solver = createSolverProcess();
try {
  const scores = await solver.query(movestring);
  const discs = movestring.length;
  console.log(`movestring "${movestring}" (${discs} discs). per-col scores: [${scores.join(', ')}]`);
  for (const col of cols) {
    const { outcome, fwd } = forwardDistance(scores[col], discs);
    console.log(`  col ${col}: score=${scores[col]}  outcome=${outcome}  forwardPlies=${fwd}  register=${registerOf(outcome, fwd)}`);
  }
} finally {
  solver.destroy();
}
