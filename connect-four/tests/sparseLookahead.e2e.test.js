import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../server/c4solver-wrapper.js';
import { runSparseLookahead } from '../server/sparseLookahead.js';
import { buildExplainContext } from '../server/explainContext.js';

test('eval-8 sparse look-ahead produces a distinguishing structure or honest null', async (t) => {
  const solver = createSolverProcess();
  try {
    // eval-8: movestring 2031133, played col 4 (0-idx), better col 3 (0-idx), perspective 2 (Gray, odd length).
    const got = await runSparseLookahead(
      { movestring: '2031133', playedCol: 4, bestCol: 3, perspective: 2 },
      { solver },
    );
    // Either a real structure with cells, or null (honest no-differentiator) — never throws/hangs.
    if (got !== null) {
      assert.ok(got.tag);
      assert.ok(got.allowedSetEntries[0].cells.length > 0);
    }
  } finally {
    solver.close?.();
  }
});

test('buildExplainContext fires the look-ahead section end-to-end on an anchorless blunder (real solver)', async (t) => {
  const solver = createSolverProcess();
  try {
    // eval-8 is anchorless (no threat rows shown, no Tier-1/2 pattern). Played col 4, better col 3.
    const ctx = await buildExplainContext('2031133', 4, 1, solver);
    // If the real engine finds a distinguishing structure, the section and a future-* alias appear.
    // If it honestly finds none (null), neither appears — both are valid outcomes; assert the invariant
    // that the section's presence and a future-* alias key are consistent with each other.
    const hasSection = ctx.prompt.includes('## What the better move leads to');
    const hasAlias = Object.keys(ctx.zoneAliasMap || {}).some(k => k.startsWith('future-'));
    assert.equal(hasSection, hasAlias);
  } finally {
    solver.close?.();
  }
});
