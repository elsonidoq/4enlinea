// OI-170 regression: /api/puzzles/counts and /api/puzzles/draw must agree about what a
// player-visible puzzle is. They drifted once (draw required `position IS NOT NULL`, counts did
// not), so /setpicker advertised sets the draw endpoint could not serve. These tests pin the
// invariant at the shared module both endpoints now call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countVisiblePuzzles,
  drawCategoryPool,
  drawMixedPool,
} from '../../server/puzzlePool.js';

// A chainable, thenable recorder standing in for a PostgREST query builder.
function makeSupabase(result) {
  const log = [];
  const q = {
    select: (cols, opts) => { log.push(['select', cols, opts?.head ? 'head' : '']); return q; },
    eq: (c, v) => { log.push(['eq', c, String(v)]); return q; },
    neq: (c, v) => { log.push(['neq', c, String(v)]); return q; },
    not: (c, op, v) => { log.push(['not', c, op, String(v)]); return q; },
    is: (c, v) => { log.push(['is', c, String(v)]); return q; },
    filter: (c, op, v) => { log.push(['filter', c, op, String(v)]); return q; },
    order: (c, o) => { log.push(['order', c, JSON.stringify(o)]); return q; },
    range: (a, b) => { log.push(['range', a, b]); return q; },
    limit: (n) => { log.push(['limit', n]); return q; },
    then: (res) => Promise.resolve(result).then(res),
  };
  return { supabase: { from: (t) => { log.push(['from', t]); return q; } }, log };
}

// Only the operations that decide WHICH rows exist — ordering and paging are free to differ.
const FILTER_OPS = new Set(['eq', 'neq', 'not', 'is', 'filter']);
// The recorder shares one builder across a call's several queries, so compare the distinct
// set of filters, not the multiset.
const filtersOf = (log) =>
  [...new Set(
    log.filter((e) => FILTER_OPS.has(e[0]))
      .map((e) => e.join(' '))
      // `category` scoping is inherently per-call; the invariant is about everything else.
      .filter((s) => !s.startsWith('eq category')),
  )].sort();

test('counts and draw apply an identical row-visibility filter', async () => {
  const a = makeSupabase({ data: [{ category: 'claimeven', count: 20 }], error: null, count: 20 });
  await countVisiblePuzzles(a.supabase);

  const b = makeSupabase({ data: [{ id: 1 }], error: null, count: 20 });
  await drawCategoryPool(b.supabase, 'claimeven', 8);

  assert.deepEqual(
    filtersOf(b.log),
    filtersOf(a.log),
    'draw and counts disagree about which puzzle rows are visible (OI-170)',
  );
});

test('a puzzle with position = NULL is still drawable', async () => {
  const b = makeSupabase({ data: [{ id: 1, position: null }], error: null, count: 1 });
  await drawCategoryPool(b.supabase, 'claimeven', 8);
  const positionFilters = b.log.filter((e) => FILTER_OPS.has(e[0]) && e[1] === 'position');
  assert.deepEqual(positionFilters, [], '`position` must be an ordering hint, never a visibility gate');
});

test('the mixed pool applies the same visibility filter as counts', async () => {
  const a = makeSupabase({ data: [], error: null, count: 0 });
  await countVisiblePuzzles(a.supabase);
  const m = makeSupabase({ data: [], error: null, count: 0 });
  await drawMixedPool(m.supabase, 8);
  assert.deepEqual(filtersOf(m.log), filtersOf(a.log));
});

test('the pool is ordered by position with un-indexed rows last and a stable id tiebreak', async () => {
  const b = makeSupabase({ data: [{ id: 1 }], error: null, count: 20 });
  await drawCategoryPool(b.supabase, 'claimeven', 8);
  const orders = b.log.filter((e) => e[0] === 'order').map((e) => `${e[1]} ${e[2]}`);
  assert.ok(
    orders.includes('position {"ascending":true,"nullsFirst":false}'),
    `expected a nulls-last position order, got ${JSON.stringify(orders)}`,
  );
  assert.ok(orders.includes('id {"ascending":true}'), 'expected a stable id tiebreak');
});
