import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDevBoardSearch, readDevBoardParam } from '../../src/lib/devBoardParam.js';

test('parseDevBoardSearch returns null when devBoard is absent', () => {
  assert.equal(parseDevBoardSearch('?foo=bar'), null);
  assert.equal(parseDevBoardSearch(''), null);
});

test('parseDevBoardSearch parses a full param set with URL-encoded devMeta', () => {
  const meta = encodeURIComponent(JSON.stringify({ column: 0 }));
  const r = parseDevBoardSearch(`?devBoard=3333334512266550121166&devMeta=${meta}`);
  assert.equal(r.movestring, '3333334512266550121166');
  assert.deepEqual(r.highlightMetadata, { column: 0 });
});

test('parseDevBoardSearch parses devCorrectCol as an integer', () => {
  const r = parseDevBoardSearch('?devBoard=041015021326&devCategory=figure_7&devCorrectCol=2');
  assert.equal(r.correctCol, 2);
});

test('parseDevBoardSearch parses devSide and devDifficulty for sparring', () => {
  const r = parseDevBoardSearch('?devBoard=333333&devSide=second&devDifficulty=hard');
  assert.equal(r.side, 'second');
  assert.equal(r.difficulty, 'hard');
});

test('parseDevBoardSearch tolerates malformed devMeta JSON (no throw)', () => {
  const r = parseDevBoardSearch('?devBoard=333&devMeta=not-json');
  assert.equal(r.movestring, '333');
  assert.equal(r.highlightMetadata, undefined);
});

test('readDevBoardParam returns null outside a Vite DEV build (import.meta.env.DEV undefined in node)', () => {
  assert.equal(readDevBoardParam('?devBoard=333'), null);
});
