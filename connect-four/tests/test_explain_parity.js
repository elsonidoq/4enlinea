/**
 * Parity mapping test for /api/explain.
 *
 * Scenario: moves "4444443263" (AI-first game, 9 history moves + 1 human candidate).
 *   - AI opens → player 0 = AI, player 1 = human.
 *   - After 10 moves (even), C++ current player = player 0 = AI.
 *   - heatCurrent = AI's winning cells, heatOpponent = human's (empty).
 *   - With humanFirst=false the mapping must return those cells under `ai`, not `human`.
 *
 * The AI wins immediately by playing col 4 (0-indexed) → horizontal at row=0, cols 2-5.
 * Bug: old code returned those cells as `human` (heatmap showed AI's win as human's).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { assignHeatmaps } from '../server/heatmap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BINARY   = join(__dirname, '..', 'server', 'c4solver');
const BOOK     = join(__dirname, '..', 'server', '7x6.book');
const ROWS = 6, COLS = 7;

function runSolver(moves) {
  const result = spawnSync(BINARY, ['-x', '-b', BOOK], {
    input: moves + '\n',
    cwd: __dirname,
    encoding: 'utf8',
  });
  const parts = result.stdout.trim().split(/\s+/);
  const nums  = parts.slice(1).map(Number);
  assert.equal(nums.length, 84, `solver must return 84 numbers, got ${nums.length}`);
  const current  = Array.from({ length: ROWS }, (_, r) => nums.slice(r * COLS, r * COLS + COLS));
  const opponent = Array.from({ length: ROWS }, (_, r) => nums.slice(42 + r * COLS, 42 + r * COLS + COLS));
  return { current, opponent };
}

test('AI-first game: winning cells appear in ai heatmap, not human', () => {
  const moves = '4444443263'; // AI-first, 10 moves total (9 history + 1 human candidate)
  const { current, opponent } = runSolver(moves);
  const { human, ai } = assignHeatmaps(current, opponent, moves.length, false /* humanFirst=false */);

  // AI wins horizontally at C++ row=0, cols 2,3,4,5 → must be in ai heatmap
  assert.ok(ai[0][2] > 0, 'ai heat: (row=0, col=2) should be hot');
  assert.ok(ai[0][3] > 0, 'ai heat: (row=0, col=3) should be hot');
  assert.ok(ai[0][4] > 0, 'ai heat: (row=0, col=4) should be hot');
  assert.ok(ai[0][5] > 0, 'ai heat: (row=0, col=5) should be hot');

  // Human heatmap must NOT show those cells (the bug: it used to)
  assert.equal(human[0][2], 0, 'human heat: (row=0, col=2) must be 0');
  assert.equal(human[0][3], 0, 'human heat: (row=0, col=3) must be 0');
  assert.equal(human[0][4], 0, 'human heat: (row=0, col=4) must be 0');
  assert.equal(human[0][5], 0, 'human heat: (row=0, col=5) must be 0');
});

test('human-first game: parity mapping is unchanged', () => {
  // 9 moves, human-first → human played last (move 9) → AI is C++ current player
  // heatCurrent = AI, heatOpponent = human
  // With humanFirst=true, movesLength=9 (odd) → humanIsCurrent=false → human=opponent ✓
  const moves = '444444326'; // human-first, 8 history + 1 human candidate = 9 total
  const { current, opponent } = runSolver(moves);
  const { human, ai } = assignHeatmaps(current, opponent, moves.length, true /* humanFirst=true */);

  // Sanity: human and ai grids are assigned (not swapped).
  // The human grid must equal opponent, ai grid must equal current.
  assert.deepEqual(human, opponent, 'human-first odd: human must equal opponent grid');
  assert.deepEqual(ai,    current,  'human-first odd: ai must equal current grid');
});
