// FR-011 (spec 054 Epic 4 US2 / OI-47): GET /api/games' in-JS "unified" sort must
// produce a stable total order — even when many rows share the primary sort-key
// value — so that unified.slice(offset, offset+limit) never skips or duplicates a
// row across two successive paginated requests. This is a genuine behavioral test
// against the real extracted comparator module (not a source-parse), per the
// batch's test-seam note.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { comparePlayedWell, compareWorstBlunders, compareRecent } from './gamesSort.js';

/**
 * Build `unified`-shaped rows mirroring server/index.js:2057-2090's per-source shape,
 * with a caller-supplied primary-sort field tied across many rows and a unique id.
 * @param {number} n
 * @param {(i:number)=>object} extra
 * @returns {object[]}
 */
function buildRows(n, extra) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: `id-${String(i).padStart(3, '0')}`,
      outcome: 'win',
      created_at: '2026-01-01T00:00:00.000Z',
      source: i % 2 === 0 ? 'ai' : 'papergames',
      accuracy: null,
      blunder_count: 0,
      side: 'red',
      cols: [],
      ...extra(i),
    });
  }
  return rows;
}

/**
 * Simulate paging across two successive requests using slice(offset, offset+limit)
 * and assert every row appears exactly once across the two pages, in the order the
 * comparator produces.
 * @param {object[]} rows
 * @param {(a:object,b:object)=>number} comparator
 */
function assertNoSkipOrDuplicateAcrossPages(rows, comparator) {
  const sorted = [...rows].sort(comparator);
  const limit = Math.ceil(rows.length / 2);
  const page1 = sorted.slice(0, limit);
  const page2 = sorted.slice(limit, limit * 2);
  const seen = new Set();
  for (const row of [...page1, ...page2]) {
    assert.ok(!seen.has(row.id), `row ${row.id} was duplicated across pages`);
    seen.add(row.id);
  }
  assert.equal(seen.size, rows.length, 'every row must appear exactly once across pages');

  // A second independent sort of a differently-ordered copy of the same rows must
  // produce the SAME total order — proving the tiebreaker removes the "unordered
  // Postgres fetch" nondeterminism the stable-sort-over-ties bug depends on.
  const shuffled = [...rows].reverse();
  const sortedAgain = [...shuffled].sort(comparator);
  assert.deepEqual(sortedAgain.map((r) => r.id), sorted.map((r) => r.id));
}

describe('gamesSort comparators — id tiebreaker prevents skip/duplicate across page boundaries', () => {
  it("compareRecent: tied created_at is broken deterministically by id", () => {
    const rows = buildRows(10, () => ({}));
    assertNoSkipOrDuplicateAcrossPages(rows, compareRecent);
  });

  it("comparePlayedWell: tied accuracy is broken deterministically by id", () => {
    const rows = buildRows(10, () => ({ accuracy: 0.75 }));
    assertNoSkipOrDuplicateAcrossPages(rows, comparePlayedWell);
  });

  it("compareWorstBlunders: tied blunder_count is broken deterministically by id", () => {
    const rows = buildRows(10, () => ({ blunder_count: 3 }));
    assertNoSkipOrDuplicateAcrossPages(rows, compareWorstBlunders);
  });

  it('compareRecent: mixed ties AND distinct created_at values still sort correctly with id as final tiebreak', () => {
    const rows = [
      { id: 'z', created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'a', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'b', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'c', created_at: '2026-01-03T00:00:00.000Z' },
    ];
    const sorted = [...rows].sort(compareRecent).map((r) => r.id);
    // c (newest) first, then z, then a/b tied on created_at, broken by id asc.
    assert.deepEqual(sorted, ['c', 'z', 'a', 'b']);
  });
});
