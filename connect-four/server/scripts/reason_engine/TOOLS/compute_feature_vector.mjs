#!/usr/bin/env node
// compute_feature_vector.mjs — dump the blunder-reason feature vector for one board.
//
// Runs the production computeReason(movestring, playedCol) end-to-end (solver-backed) and
// prints the full vector, so you don't have to hand-roll a scratch script every time you want
// to inspect what the reason engine produces for a position. Also prints matchOpeningPrefix()
// for the pre-move board (handy for opening-theory work).
//
// Usage:
//   node compute_feature_vector.mjs <movestring> <playedCol> [--narrator] [--no-match]
//
// Arguments (ALL COLUMNS 0-INDEXED, col 0 = leftmost):
//   movestring   pre-move board as a digit string of 0-indexed columns (e.g. "3333344"; "" = empty board)
//   playedCol    the played (blundered) column, 0-indexed 0..6
//
// Options:
//   --narrator     also print toNarratorVector(vector) — the pruned view the LLM coach sees (D21)
//   --no-match     skip the matchOpeningPrefix() line
//   -h, --help     show this help and exit
//
// Examples:
//   node compute_feature_vector.mjs 3333344 2            # 5-4 opening, player 2 plays col 2
//   node compute_feature_vector.mjs 3333 0 --narrator    # shared central prefix, player 1 plays col 0
//   node compute_feature_vector.mjs "" 0                 # empty board, player 1 plays col 0
//
// Notes:
//   - playedCol must differ from best for a "blunder"; the tool prints the case/scores regardless.
//   - Exit codes: 0 ok; 2 bad usage; 1 runtime error (e.g. playedCol full/illegal).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import { computeReason } from '../reasonEngine.mjs';
import { matchOpeningPrefix } from '../openingMatch.mjs';
import { toNarratorVector } from '../../reasonNarratorVector.mjs';

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  // Print only the leading comment block (stop at the first line that isn't a // comment or shebang).
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  const help = [];
  for (const l of src) {
    if (l.startsWith('#!')) continue;
    if (!l.startsWith('//')) break;
    help.push(l.replace(/^\/\/ ?/, ''));
  }
  process.stdout.write(help.join('\n') + '\n');
  process.exit(0);
}

const wantNarrator = args.includes('--narrator');
const skipMatch = args.includes('--no-match');
const positional = args.filter((a) => !a.startsWith('--') && a !== '-h');

if (positional.length < 2) {
  process.stderr.write('Error: <movestring> and <playedCol> are required.\n');
  process.stderr.write('Usage: node compute_feature_vector.mjs <movestring> <playedCol> [--narrator] [--no-match]\n');
  process.stderr.write('Run with --help for details.\n');
  process.exit(2);
}

const movestring = positional[0] === '""' || positional[0] === "''" ? '' : positional[0];
const playedCol = Number(positional[1]);
if (!Number.isInteger(playedCol) || playedCol < 0 || playedCol > 6) {
  process.stderr.write(`Error: playedCol must be an integer 0..6 (0-indexed); got "${positional[1]}".\n`);
  process.exit(2);
}
if (movestring && !/^[0-6]+$/.test(movestring)) {
  process.stderr.write(`Error: movestring must be digits 0..6 (0-indexed columns); got "${movestring}".\n`);
  process.exit(2);
}

// Load server/.env (solver config) the same way the sibling TOOLS do.
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
try {
  readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
} catch { /* .env optional if already in env */ }

const solver = await createSolverProcess();
try {
  if (!skipMatch) {
    console.log('=== matchOpeningPrefix(' + JSON.stringify(movestring) + ') ===');
    console.log(JSON.stringify(matchOpeningPrefix(movestring)));
    console.log('');
  }
  console.log('=== computeReason(' + JSON.stringify(movestring) + ', playedCol=' + playedCol + ') ===');
  const vector = await computeReason(movestring, playedCol, { solver });
  console.log(JSON.stringify(vector, null, 2));
  if (wantNarrator) {
    console.log('\n=== toNarratorVector(vector) — pruned LLM-facing view ===');
    console.log(JSON.stringify(toNarratorVector(vector), null, 2));
  }
} catch (err) {
  process.stderr.write('Error running computeReason: ' + (err?.message || err) + '\n');
  process.exit(1);
} finally {
  solver.destroy();
}
