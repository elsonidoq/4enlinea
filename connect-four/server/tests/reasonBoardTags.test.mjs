// connect-four/server/tests/reasonBoardTags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagBoard } from '../scripts/reasonBoardTags.mjs';

test('detects a gravity-top (immediate) major threat, owner via perspective', () => {
  // "01020": player1 has a vertical 3-in-col0, threatening c1r4 (=[3,0]); heights[0]=3 => gravity-top.
  const tags = tagBoard('01020', 1);
  const t = tags.find((x) => x.cell === 'c1r4');
  assert.ok(t, 'expected a tag at c1r4');
  assert.equal(t.kind, 'immediate');   // r === height
  assert.equal(t.owner, 'you');        // player1 === perspectivePlayer 1
});

test('same board from the opponent perspective flips owner', () => {
  const t = tagBoard('01020', 2).find((x) => x.cell === 'c1r4');
  assert.equal(t.owner, 'opp');
});

test('surfaces a named pattern from the vector when provided', () => {
  const tags = tagBoard('01020', 1, { patternTag: 'figure_7', patternCompletingCell: 'c4r3',
    patternWindow: ['c6r1', 'c5r2', 'c4r3', 'c3r4'], patternOwner: 'opp' });
  const fig = tags.find((x) => x.kind === 'figure_7');
  assert.ok(fig);
  assert.equal(fig.cell, 'c4r3');
  assert.deepEqual(fig.window, ['c6r1', 'c5r2', 'c4r3', 'c3r4']);
  assert.equal(fig.owner, 'opp');
});

test('no minor threats leak into the tag set', () => {
  // A lone 2-in-a-row must NOT produce a tag (minors excluded).
  const tags = tagBoard('0102', 1); // col0: p1 at r0,r1 only (2 discs) -> minor, not major
  assert.equal(tags.filter((t) => t.owner === 'you').length, 0);
});
