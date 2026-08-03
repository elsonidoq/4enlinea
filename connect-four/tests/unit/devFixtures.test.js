import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEV_QA_FIXTURES, buildDevPuzzle } from '../../src/lib/devFixtures.js';
import { SINGLE_ANSWER_CATEGORIES } from '../../src/lib/categories.js';

test('buildDevPuzzle produces the inline puzzle shape for a correctCol category', () => {
  const p = buildDevPuzzle({ movestring: '041015021326', category: 'figure_7', correctCol: 2 });
  assert.equal(p.id, 'dev-041015021326');
  assert.equal(p.category, 'figure_7');
  assert.equal(p.move_string, '041015021326');
  assert.equal(p.interaction_mode, 'single_move');
  assert.deepEqual(p.correct_cols, [2]);
  assert.equal(p.highlight_metadata, null);
});

test('buildDevPuzzle produces the inline puzzle shape for a highlightMetadata category', () => {
  const hm = { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 };
  const p = buildDevPuzzle({ movestring: '3333302444422222060315555054', category: 'z_threat', highlightMetadata: hm });
  assert.deepEqual(p.highlight_metadata, hm);
  assert.equal(p.correct_cols, null);
});

test('every single-answer fixture carries the metadata its category requires (anti-drift)', () => {
  const single = DEV_QA_FIXTURES.filter(f => SINGLE_ANSWER_CATEGORIES.has(f.category));
  assert.ok(single.length >= 6, 'expected at least one fixture per single-answer category');
  for (const f of single) {
    const ok = Number.isInteger(f.correctCol) || (f.highlightMetadata != null);
    assert.ok(ok, `fixture "${f.label}" (${f.category}) must carry correctCol or highlightMetadata`);
  }
});
