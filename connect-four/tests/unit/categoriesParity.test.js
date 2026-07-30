// Spec 051 (Epic 1) T062 — FR-032: server/categories.js and src/lib/categories.js are
// duplicate-and-sync, NEVER cross-imported (both files say so explicitly in their own comments —
// see server/categories.js's header and research.md R3). That convention carries a hand-sync
// risk: nothing stops the two literals from drifting apart except a human remembering to edit
// both. This test closes that gap for the two sets this feature widened, `MULTI_SOLUTION_CATEGORIES`
// and `SINGLE_ANSWER_CATEGORIES` — it must fail the moment either file's list changes without the
// other being updated to match.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MULTI_SOLUTION_CATEGORIES as SERVER_MULTI,
  SINGLE_ANSWER_CATEGORIES as SERVER_SINGLE,
} from '../../server/categories.js';
import {
  MULTI_SOLUTION_CATEGORIES as FRONTEND_MULTI,
  SINGLE_ANSWER_CATEGORIES as FRONTEND_SINGLE,
} from '../../src/lib/categories.js';

const sorted = (set) => [...set].sort();

describe('FR-032 — server/categories.js and src/lib/categories.js stay hand-synced', () => {
  test('MULTI_SOLUTION_CATEGORIES is identical in both files', () => {
    assert.deepEqual(sorted(SERVER_MULTI), sorted(FRONTEND_MULTI));
  });

  test('SINGLE_ANSWER_CATEGORIES is identical in both files', () => {
    assert.deepEqual(sorted(SERVER_SINGLE), sorted(FRONTEND_SINGLE));
  });

  test('the two sets are disjoint in both files (a category must not gate the accepted field via both routes)', () => {
    for (const [label, multi, single] of [
      ['server', SERVER_MULTI, SERVER_SINGLE],
      ['frontend', FRONTEND_MULTI, FRONTEND_SINGLE],
    ]) {
      const overlap = [...multi].filter(c => single.has(c));
      assert.deepEqual(overlap, [], `${label}/categories.js: MULTI_SOLUTION_CATEGORIES and SINGLE_ANSWER_CATEGORIES must not overlap`);
    }
  });
});
