import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../server/classifier.js';
import { selectOpponentMistakeCols, classifyPatternWithTimeout, extractTier1Structures, runSparseLookahead } from '../server/sparseLookahead.js';

test('selectOpponentMistakeCols drops best tier and worst tier, keeps middle', () => {
  // 7 distinct tiers, all columns legal (empty board).
  const board = new Board('');
  const scores = [10, 9, 8, 7, 6, 5, 4]; // best=col0(10), worst=col6(4)
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Drop best tier (col0) and worst tier (col6); accumulate from 2nd-best until >=3, cap 4.
  // 2nd..: col1(9),col2(8),col3(7) -> 3 reached -> stop. worst tier already excluded.
  assert.deepEqual(got, [1, 2, 3]);
});

test('selectOpponentMistakeCols never splits a tie tier', () => {
  const board = new Board('');
  const scores = [10, 9, 9, 9, 9, 5, 4]; // best col0; tie tier (9) has 4 cols; worst col6.
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Exclude best(col0) and worst(col6); next tier is the four 9s -> whole tier included (>=3, cap 4 ok).
  assert.deepEqual(got, [1, 2, 3, 4]);
});

test('selectOpponentMistakeCols returns [] when <=1 legal column', () => {
  // Fill all but column 0 to height 6 by constructing a near-full board movestring is overkill;
  // instead assert the guard via a board with a single legal column.
  const board = new Board('111111'); // col1 filled to 6 -> still other cols legal; use colHeights directly
  // Simpler: monkeypatch colHeights to simulate one legal col.
  board.colHeights = [0, 6, 6, 6, 6, 6, 6];
  const scores = [3, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(selectOpponentMistakeCols(scores, board), []);
});

test('selectOpponentMistakeCols keeps a whole tie tier even if it exceeds OPPONENT_CAP', () => {
  // Never-split-overrides-cap: if the first middle tier is a large tie, return all of it.
  const board = new Board('');
  const scores = [10, 5, 5, 5, 5, 5, 1]; // best col0(10); tie tier cols1-5(5); worst col6(1)
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Exclude best(col0) and worst(col6); first middle tier is the five 5s -> whole tier included,
  // even though 5 columns exceeds OPPONENT_CAP(4).
  assert.deepEqual(got, [1, 2, 3, 4, 5]);
});

test('classifyPatternWithTimeout returns empty Map when classify hangs', async () => {
  const hang = () => new Promise(() => {}); // never resolves
  const got = await classifyPatternWithTimeout(hang, '01', 1, null, 50);
  assert.ok(got instanceof Map);
  assert.equal(got.size, 0);
});

test('classifyPatternWithTimeout returns empty Map when classify throws', async () => {
  const boom = async () => { throw new Error('solver error on won position'); };
  const got = await classifyPatternWithTimeout(boom, '01', 1, null, 1000);
  assert.equal(got.size, 0);
});

test('classifyPatternWithTimeout passes through the Map on success', async () => {
  const ok = async () => new Map([['double_threat', { cells: ['c4r3'] }]]);
  const got = await classifyPatternWithTimeout(ok, '01', 1, null, 1000);
  assert.deepEqual(got.get('double_threat'), { cells: ['c4r3'] });
});

test('extractTier1Structures keeps Tier-1 tags with cells, drops others', () => {
  const map = new Map([
    ['double_threat', { cells: ['c4r3', 'c5r3'] }],
    ['odd_even_threat', { cells: [] }],   // Tier-3 -> dropped
    ['j_shape', { cells: [] }],           // Tier-1 but empty -> dropped
    ['figure_7', { cells: ['c2r2'] }],
  ]);
  const got = extractTier1Structures(map);
  assert.deepEqual(got, [
    { tag: 'double_threat', cells: ['c4r3', 'c5r3'] },
    { tag: 'figure_7', cells: ['c2r2'] },
  ]);
});

// Fake solver: returns fixed scores so opponent/player column selection is deterministic.
function fakeSolver(scoreFn) {
  return { async query(ms) { return scoreFn(ms); } };
}

test('searchOpportunities tallies structures per first-opponent-reply branch', async () => {
  const { searchOpportunities } = await import('../server/sparseLookahead.js');

  // Root after candidate move = '3' (one disc). depth small via budget.
  // Opponent scores: make cols 1,2,3 the mistakes (col0 best, col6 worst).
  const solver = fakeSolver(() => [10, 5, 5, 5, 5, 5, 1]);
  // classifyFn: only when it's the player's move AND the line went through opp reply col 2,
  // report a double_threat; otherwise nothing.
  const classifyFn = async (ms, perspective) => {
    // ms is rootMovestring + oppReply + ... ; detect oppReply char at index = root length.
    if (ms[1] === '2') return new Map([['double_threat', { cells: ['c4r3', 'c5r3'] }]]);
    return new Map();
  };
  const tally = await searchOpportunities('3', 1, { solver, classifyFn }, { calls: 20 });
  const dt = tally.get('double_threat');
  assert.ok(dt, 'double_threat tallied');
  assert.ok(dt.branches.has(2), 'reachable via opponent reply col 2');
  assert.deepEqual(dt.ways[0], ['c4r3', 'c5r3']);
});

test('searchOpportunities stops when call budget is exhausted', async () => {
  const { searchOpportunities } = await import('../server/sparseLookahead.js');

  const solver = fakeSolver(() => [10, 5, 5, 5, 5, 5, 1]);
  let calls = 0;
  const classifyFn = async () => { calls++; return new Map(); };
  await searchOpportunities('3', 1, { solver, classifyFn }, { calls: 2 });
  assert.ok(calls <= 2, `classify called at most budget times, got ${calls}`);
});

const tally = (entries) => new Map(entries.map(([t, b, ways]) =>
  [t, { branches: new Set(b), ways: ways ?? [['c4r3']] }]));

test('compareOpportunities picks structure best reaches more than played', async () => {
  const { compareOpportunities } = await import('../server/sparseLookahead.js');
  const best = tally([['double_threat', [1, 2, 3], [['c4r3'], ['c5r4'], ['c2r2'], ['c6r5']]]]);
  const played = tally([['double_threat', [1]]]);
  const got = compareOpportunities(best, played);
  assert.equal(got.tag, 'double_threat');
  assert.equal(got.ways.length, 3); // capped at MAX_WAYS
});

test('compareOpportunities returns null when no advantage', async () => {
  const { compareOpportunities } = await import('../server/sparseLookahead.js');
  const best = tally([['double_threat', [1]]]);
  const played = tally([['double_threat', [1, 2]]]); // played reaches MORE
  assert.equal(compareOpportunities(best, played), null);
});

test('compareOpportunities surfaces tag best reaches and played never does', async () => {
  const { compareOpportunities } = await import('../server/sparseLookahead.js');
  const best = tally([['figure_7', [2]]]);
  const played = new Map();
  assert.equal(compareOpportunities(best, played).tag, 'figure_7');
});

test('runSparseLookahead returns alias map + allowedSet entries for the distinguishing structure', async () => {
  // best move line yields double_threat via opp reply col 2; played line never does.
  const fSolver = fakeSolver(() => [10, 5, 5, 5, 5, 5, 1]);
  const classifyFn = async (ms) => {
    // best line movestrings start with bestCol '1'; played start with '4'.
    if (ms[0] === '1' && ms[1] === '2') return new Map([['double_threat', { cells: ['c4r3', 'c5r3'] }]]);
    return new Map();
  };
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.tag, 'double_threat');
  assert.equal(Object.keys(got.aliasMap)[0], 'future-double_threat-1');
  assert.equal(got.aliasMap['future-double_threat-1'], 'cells:c4r3,c5r3');
  assert.ok(got.allowedSetEntries[0].cells.includes('c4r3'));
  assert.equal(got.allowedSetEntries[0].validationOnly, true);
});

test('runSparseLookahead returns null when nothing distinguishes the moves', async () => {
  const fSolver = fakeSolver(() => [10, 5, 5, 5, 5, 5, 1]);
  const classifyFn = async () => new Map();
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got, null);
});

import { isAnchorlessPosition } from '../server/sparseLookahead.js';

test('isAnchorlessPosition: true only when no threat rows shown AND allowedSet null', () => {
  const none = { showPlayerMajor: false, showOpponentMajor: false, showPlayerMinor: false, showOpponentMinor: false };
  assert.equal(isAnchorlessPosition(none, null), true);
  // Any shown row → not anchorless (something to anchor on).
  assert.equal(isAnchorlessPosition({ ...none, showOpponentMinor: true }, null), false);
  // allowedSet present (Tier-1/2 pattern cells) → not anchorless even with no rows.
  assert.equal(isAnchorlessPosition(none, [{ cells: ['c4r3'] }]), false);
});
