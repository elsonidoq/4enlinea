// Unit tests for chooseSparringMove — the non-perfect sparring AI move selector.
//
// Algorithm under test (all boards verified with ./visualize_board.sh):
//   1. Own immediate win → take it (before the mistake roll).
//   2. Roll rng() < SPARRING_MISTAKE_RATES[difficulty].
//   3. No mistake → optimal (argmax of scores), random tie-break.
//   4. Mistake → block opponent immediate threat; else sample uniformly from
//      columns that are strictly worse than best AND not forbidden (i.e. do not
//      hand the opponent a win-in-1); fall back to optimal if no such move exists.
//
// rng is injected so selection is deterministic. rng() is consumed first for the
// mistake roll, then (if a pool is sampled) once more for the uniform pick:
//   pool[Math.floor(rng() * pool.length)].

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Board, chooseSparringMove, SPARRING_MISTAKE_RATES } from '../../server/classifier.js';

const INV = -1000; // full-column sentinel

// Deterministic rng returning queued values in order; throws if over-drawn.
function seqRng(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`rng over-drawn (called ${i + 1}x, queued ${values.length})`);
    return values[i++];
  };
}

describe('chooseSparringMove', () => {
  describe('own immediate win', () => {
    // "001122": P1 to move, X bottom row cols 0,1,2 → win at col 3 (0-idx).
    const board = new Board('001122');

    test('takes the winning column even on a mistake roll (before the roll)', () => {
      // rng throws if called — proves own-win short-circuits before any roll.
      const rng = () => { throw new Error('rng must not be consulted when a win is available'); };
      const col = chooseSparringMove(board, 'easy', [0, 0, 0, 0, 0, 0, 0], rng);
      assert.equal(col, 3);
    });
  });

  describe('no-mistake path → optimal move', () => {
    // "33": P1 to move, all columns playable, no threats.
    const board = new Board('33');

    test('returns the argmax column when the roll is above the mistake rate', () => {
      const scores = [1, 1, 1, 5, 1, 1, 1]; // col 3 uniquely best
      const rng = seqRng([0.99, 0]);         // 0.99 >= 0.5 (easy) → no mistake
      assert.equal(chooseSparringMove(board, 'easy', scores, rng), 3);
    });

    test('perfect difficulty (rate 0) is always optimal', () => {
      const scores = [1, 1, 1, 5, 1, 1, 1];
      // rate 0 → rng() < 0 is always false → no mistake, regardless of roll.
      const rng = seqRng([0, 0]);
      assert.equal(chooseSparringMove(board, 'perfect', scores, rng), 3);
    });
  });

  describe('mistake path → block opponent immediate threat', () => {
    // "606152": P1 to move, O threatens an immediate win at col 3 (0-idx).
    const board = new Board('606152');

    test('blocks the opponent win-in-1 instead of a random move', () => {
      const rng = seqRng([0.0]); // mistake roll fires; block returns before any pick
      assert.equal(chooseSparringMove(board, 'easy', [0, 0, 0, 0, 0, 0, 0], rng), 3);
    });
  });

  describe('mistake path → genuine, non-suicidal mistake', () => {
    // "000000111111232232": P1 to move, no active immediate threat for either side.
    // playable = {2,3,4,5,6}; scores below; col 3 is forbidden (hands O a win on top).
    const board = new Board('000000111111232232');
    const scores = [INV, INV, -4, -12, 0, 0, -4]; // best = 0 at cols 4 & 5

    test('never returns an optimal column on a mistake roll (real mistake)', () => {
      for (let i = 0; i < 50; i++) {
        const col = chooseSparringMove(board, 'easy', scores, seqRng([0.0, i / 50]));
        assert.ok(col !== 4 && col !== 5, `col ${col} is optimal — mistake must be strictly worse`);
      }
    });

    test('never returns a forbidden column on a mistake roll (no self-sabotage)', () => {
      for (let i = 0; i < 50; i++) {
        const col = chooseSparringMove(board, 'easy', scores, seqRng([0.0, i / 50]));
        assert.notEqual(col, 3, 'col 3 is forbidden — must never be sampled');
      }
    });

    test('samples only from strictly-worse, non-forbidden columns {2,6}', () => {
      const seen = new Set();
      for (let i = 0; i < 50; i++) {
        seen.add(chooseSparringMove(board, 'easy', scores, seqRng([0.0, i / 50])));
      }
      assert.deepEqual([...seen].sort((a, b) => a - b), [2, 6]);
    });

    test('the mistake pick is uniform over the pool via rng index', () => {
      // pool = [2,6] in column order; floor(rng*2) selects the index.
      assert.equal(chooseSparringMove(board, 'easy', scores, seqRng([0.0, 0.0])), 2);
      assert.equal(chooseSparringMove(board, 'easy', scores, seqRng([0.0, 0.6])), 6);
    });

    test('no-mistake roll on the same board still returns an optimal column', () => {
      const col = chooseSparringMove(board, 'easy', scores, seqRng([0.99, 0]));
      assert.ok(col === 4 || col === 5, `expected optimal col 4 or 5, got ${col}`);
    });
  });

  describe('mistake path → fallback when no safe mistake exists', () => {
    // "33": all columns tie → no strictly-worse move exists → fall back to optimal.
    const board = new Board('33');

    test('falls back to an optimal column when every legal move is best', () => {
      const scores = [1, 1, 1, 1, 1, 1, 1]; // all playable cols tie
      const col = chooseSparringMove(board, 'easy', scores, seqRng([0.0, 0.3]));
      // Every playable column is optimal, so any is acceptable — but it must be legal.
      assert.ok(col >= 0 && col <= 6 && board.colHeights[col] < 6);
    });
  });

  describe('SPARRING_MISTAKE_RATES config', () => {
    test('exposes the four difficulty levels with perfect at 0', () => {
      assert.deepEqual(SPARRING_MISTAKE_RATES, {
        easy: 1 / 2, medium: 1 / 4, hard: 1 / 8, perfect: 0,
      });
    });
  });
});
