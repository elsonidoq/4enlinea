// Integration test for category 7 (Forbidden Columns) predicate.
// Runs against the real c4solver binary — uses deterministic hardcoded move strings.
//
// Positive fixture: "142536"
//   P1 pieces at (row0, cols 0-2), P2 pieces at (row0, cols 3-5).
//   P2 threatens col 7 (0-indexed: 6). All other columns are forbidden for P1.
//
// Negative fixture: "44"
//   Two-move opening — no immediate-win threats exist for either player.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluatePredicate } from '../../server/predicates.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SOLVER_DIR = join(__dir, '../../server');

function querySolver(moveString) {
  return new Promise((resolve, reject) => {
    const child = spawn(join(SOLVER_DIR, 'c4solver'), ['-a'], { cwd: SOLVER_DIR });
    let stdout = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', () => {
      const parts = stdout.trim().split(/\s+/);
      resolve(parts.slice(1).map(Number));
    });
    child.stdin.write(moveString + '\n');
    child.stdin.end();
  });
}

// Positive: "142536" — P2 threatens immediate win at col 7; cols 0-5 are all forbidden.
describe('Cat 7 — positive fixture ("142536")', () => {
  const MOVE_STRING = '142536';
  const puzzle = { id: 1, category: 7, moveString: MOVE_STRING, goalPredicateType: 'forbidden_columns' };

  test('playing a forbidden column (col 0) returns wrong with forbiddenCols populated', async () => {
    const scores = await querySolver(MOVE_STRING);
    const result = evaluatePredicate(puzzle, 0, scores);
    assert.equal(result.result, 'wrong');
    assert.ok(result.forbiddenCols.length >= 1, 'at least one forbidden column must exist');
    assert.ok(result.forbiddenCols.includes(0), 'col 0 must be in forbiddenCols');
  });

  test('playing the safe column (col 6) returns correct', async () => {
    const scores = await querySolver(MOVE_STRING);
    const result = evaluatePredicate(puzzle, 6, scores);
    assert.equal(result.result, 'correct');
    assert.ok(!result.forbiddenCols.includes(6), 'safe col 6 must not be in forbiddenCols');
  });

  test('forbiddenCols contains exactly cols 0-5 (all non-blocking columns)', async () => {
    const scores = await querySolver(MOVE_STRING);
    const result = evaluatePredicate(puzzle, 6, scores);
    const expected = [0, 1, 2, 3, 4, 5];
    assert.deepEqual(result.forbiddenCols, expected);
  });
});

// Negative: "44" — early game, no immediate-win threats; predicate fails (no forbidden cols).
describe('Cat 7 — negative fixture ("44")', () => {
  const MOVE_STRING = '44';
  const puzzle = { id: 2, category: 7, moveString: MOVE_STRING, goalPredicateType: 'forbidden_columns' };

  test('no forbidden columns exist — any play returns wrong', async () => {
    const scores = await querySolver(MOVE_STRING);
    const result = evaluatePredicate(puzzle, 3, scores);
    assert.equal(result.result, 'wrong');
    assert.deepEqual(result.forbiddenCols, []);
  });
});
