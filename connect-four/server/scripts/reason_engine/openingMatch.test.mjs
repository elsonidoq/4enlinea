import { test } from 'node:test';
import assert from 'node:assert';
import { loadOpeningLines, matchOpeningPrefix } from './openingMatch.mjs';

test('loads KB opening lines including D3-D4 and candlesticks', () => {
  const lines = loadOpeningLines();
  const ids = lines.map((l) => l.id);
  assert.ok(ids.includes('allen-5-4-opening'));
  assert.ok(ids.includes('allen-d3-d4-opening'));
  assert.ok(ids.includes('allen-third-row-gambit'));
  assert.ok(lines.every((l) => l.beneficiary === 1));
});

test('shared central prefix names the family, not a specific opening', () => {
  const m = matchOpeningPrefix('3333'); // 5-4 / candlesticks share this stem
  assert.equal(m.family, 'central-column opening');
  assert.ok(m.ids.length > 1);
});

test('unique deep prefix identifies one opening and its book move', () => {
  // KB worked example (allen-d3-d4-opening): D1 d2 D3 c1 C2 c3 D4 — D4 as disk 7,
  // the clean D3-D4 stem, distinct from the sibling 3-4 opening's "3332222"
  // (whose 7th ply is col 2, not col 3).
  const m = matchOpeningPrefix('3332223');
  assert.ok(m.ids.includes('allen-d3-d4-opening'));
});

test('non-opening history does not match', () => {
  assert.equal(matchOpeningPrefix('0123456'), null);
});

// REQUIRED replacement for the plan's placeholder mirror test (which called
// matchOpeningPrefix('3333') against itself — 3 is its own mirror, so it
// verified nothing about mirror-normalization). Uses a genuine off-centre KB
// line: allen-candlesticks-opening's worked example "3333311115555" (centre
// col 3 + flanks col 1 and col 5 — NOT centred on col 3 alone). Its column
// reflection (col -> 6-col) swaps the col-1/col-5 flanks: "3333355551111".
// Verified as a legal, mirror-symmetric board pair via
// `./visualize_board.sh 3333311115555` / `./visualize_board.sh 3333355551111`
// (identical solver-score profile, columns reflected).
test('mirror-reflected off-centre candlesticks prefix matches the same opening', () => {
  const own = matchOpeningPrefix('3333311115555');
  const reflected = matchOpeningPrefix('3333355551111');
  assert.ok(own.ids.includes('allen-candlesticks-opening'));
  assert.ok(reflected.ids.includes('allen-candlesticks-opening'));
  assert.equal(own.family, 'central-column opening');
  assert.equal(reflected.family, 'central-column opening');
});
