/**
 * Tests for depth-limited scoring via the c4solver binary.
 *
 * Spawns the binary directly (same way the server does) and checks that:
 *  1. Full solver on empty board: col 4 (index 3) scores +1, the highest column.
 *  2. Depth-1 on empty board: all scores are 0 (no lookahead visible at depth 1).
 *  3. Depth-1 and depth-5 scores differ on position "6455767164".
 *
 * Run: node --test tests/scores/depth-scores.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const BINARY = join(__dir, '../../server/c4solver');
const INVALID = -1000; // Solver.INVALID_MOVE sentinel

/**
 * Spawn the solver with the given flags, send one position, return the 7 scores.
 * Output format: "<moves> s1 s2 s3 s4 s5 s6 s7\n"
 * For empty moves the prefix is absent, so the 7 scores fill the whole line.
 */
function queryBinary(flags, moves) {
  return new Promise((resolve, reject) => {
    const child = spawn(BINARY, flags, { cwd: join(__dir, '../../server') });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`solver exited ${code}: ${stderr}`));
      const line = stdout.trim().split('\n').find(l => l.trim());
      if (!line) return reject(new Error('no output from solver'));
      const parts = line.trim().split(/\s+/);
      // If moves is non-empty, the first token is the move string; skip it.
      const skip = moves.length > 0 ? 1 : 0;
      const scores = parts.slice(skip).map(Number);
      if (scores.length !== 7) {
        return reject(new Error(`expected 7 scores, got ${scores.length}: ${line}`));
      }
      resolve(scores);
    });
    child.stdin.write(moves + '\n');
    child.stdin.end();
  });
}

describe('depth-limited scoring via c4solver binary', () => {
  it('full solver on empty board: col 4 has the highest score', async () => {
    const scores = await queryBinary(['-a'], '');
    const max = Math.max(...scores);
    assert.equal(scores[3], max, `col 4 (index 3) should be the best, scores: ${scores}`);
    assert.ok(scores[3] > scores[0], 'col 4 should beat col 1');
  });

  it('depth-1 on empty board: all playable scores are 0', async () => {
    const scores = await queryBinary(['-d', '1', '-a'], '');
    for (let col = 0; col < 7; col++) {
      if (scores[col] !== INVALID) {
        assert.equal(scores[col], 0,
          `col ${col + 1} should score 0 at depth 1, got ${scores[col]}`);
      }
    }
  });

  it('depth-1 and depth-5 produce different scores on "6455767164"', async () => {
    const [d1, d5] = await Promise.all([
      queryBinary(['-d', '1', '-a'], '6455767164'),
      queryBinary(['-d', '5', '-a'], '6455767164'),
    ]);
    const differ = d1.some((s, i) => s !== INVALID && d5[i] !== INVALID && s !== d5[i]);
    assert.ok(differ, `depth-1 and depth-5 should differ on "6455767164"\nd1=${d1}\nd5=${d5}`);
  });
});
