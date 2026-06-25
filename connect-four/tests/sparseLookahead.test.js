import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../server/classifier.js';
import { selectOpponentMistakeCols, selectOptimalOpponentCols, classifyPatternWithTimeout, extractTier1Structures, runSparseLookahead } from '../server/sparseLookahead.js';

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

// Pre-move-aware fake solver: returns PRE scores for the pre-move query (movestring),
// NODE scores for every deeper node. Lets a test independently pick the mode (via PRE)
// and steer in-search opponent replies (via NODE).
function preNodeSolver(preScores, nodeScores, root = '') {
  return { async query(ms) { return ms === root ? preScores : nodeScores; } };
}

test('runSparseLookahead returns alias map + allowedSet entries for the distinguishing structure', async () => {
  // optScore (bestCol 1) = 5 >= 0 -> optimal-opponent path (case 2). NODE scores make the
  // opponent's optimal reply col 2, so the best line reaches double_threat; played line does not.
  const fSolver = preNodeSolver([5, 5, 5, 5, 5, 5, 5], [0, 0, 9, 0, 0, 0, 0]);
  const classifyFn = async (ms) => {
    // best line movestrings start with bestCol '1'; played start with '4'.
    if (ms[0] === '1' && ms[1] === '2') return new Map([['double_threat', { cells: ['c4r3', 'c5r3'] }]]);
    return new Map();
  };
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.case, 2);
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

// Fix 1: per-candidate independent budgets
test('runSparseLookahead: played search is not starved when best search runs first', async () => {
  // classifyFn only returns a structure on the PLAYED line (playedCol=4).
  // If both searches shared a budget the best search would exhaust it and the
  // played search would see 0 calls — but with independent budgets the played
  // search still gets its own GLOBAL_CALL_BUDGET calls.
  const { GLOBAL_CALL_BUDGET } = await import('../server/sparseLookahead.js');
  const fSolver = fakeSolver(() => [10, 5, 5, 5, 5, 5, 1]);
  let bestCalls = 0;
  let playedCalls = 0;
  const classifyFn = async (ms) => {
    // ms[0] is the first column digit: '1' = best line, '4' = played line.
    if (ms[0] === '1') { bestCalls++; return new Map(); }
    if (ms[0] === '4') { playedCalls++; return new Map([['double_threat', { cells: ['c4r3'] }]]); }
    return new Map();
  };
  await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  // Each search must receive up to GLOBAL_CALL_BUDGET calls independently.
  assert.ok(bestCalls <= GLOBAL_CALL_BUDGET, `best search used ${bestCalls} calls, expected <= ${GLOBAL_CALL_BUDGET}`);
  assert.ok(playedCalls > 0, `played search was starved (0 calls)`);
  assert.ok(playedCalls <= GLOBAL_CALL_BUDGET, `played search used ${playedCalls} calls, expected <= ${GLOBAL_CALL_BUDGET}`);
});

// Fix 2: solver.query rejection must not propagate
test('runSparseLookahead resolves (does not reject) when solver.query throws', async () => {
  const rejectingSolver = { async query() { throw new Error('solver IPC error'); } };
  const classifyFn = async () => new Map();
  const result = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: rejectingSolver, classifyFn },
  );
  // Must resolve to null (no structures found due to pruning) — not reject.
  assert.equal(result, null);
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

// ── Optimal-opponent column selection ──────────────────────────────────────────
test('selectOptimalOpponentCols keeps every column tied for the max score', () => {
  const board = new Board('');
  // cols 2 and 5 tie for the max (9).
  assert.deepEqual(selectOptimalOpponentCols([1, 3, 9, 4, 2, 9, 0], board).sort((a, b) => a - b), [2, 5]);
  // single max
  assert.deepEqual(selectOptimalOpponentCols([1, 3, 9, 4, 2, 8, 0], board), [2]);
});

test('selectOptimalOpponentCols only considers legal columns', () => {
  const board = new Board('');
  board.colHeights = [6, 0, 0, 0, 0, 0, 0]; // col0 full
  // col0 has the highest score but is full → excluded; next max is col3.
  assert.deepEqual(selectOptimalOpponentCols([99, 1, 1, 5, 1, 1, 1], board), [3]);
});

// ── Terminal-position guard ─────────────────────────────────────────────────────
test('searchOpportunities prunes an already-won root without querying/classifying', async () => {
  const { searchOpportunities } = await import('../server/sparseLookahead.js');
  // '0101010' = P1 dropped col0 four times (rows 0-3) → vertical win for player 1.
  const wonRoot = '0101010';
  assert.equal(new Board(wonRoot).hasWon(1), true);
  let queried = false;
  let classified = false;
  const solver = { async query() { queried = true; return [0, 0, 0, 0, 0, 0, 0]; } };
  const classifyFn = async () => { classified = true; return new Map(); };
  const tally = await searchOpportunities(wonRoot, 1, { solver, classifyFn }, { calls: 10 });
  assert.equal(tally.size, 0);
  assert.equal(queried, false, 'solver.query must not be called on a won position');
  assert.equal(classified, false, 'classify must not be called on a won position');
});

// ── Mode selector ───────────────────────────────────────────────────────────────
test('runSparseLookahead: optScore >= 0 routes through optimal-opponent (case 1)', async () => {
  // Pre-move: bestCol 3 wins (+1), playedCol 4 loses (-2) → case 1. NODE scores steer the
  // opponent's optimal reply to col 5, where the best line surfaces an undercut.
  const pre = [-2, -2, -2, 1, -2, -2, -2];
  const node = [0, 0, 0, 0, 0, 9, 0]; // col5 is the opponent's optimal reply
  const fSolver = { async query(ms) { return ms === '3333' ? pre : node; } };
  const classifyFn = async (ms) => {
    // best line starts with bestCol '3'; played starts with '4'. Opp reply col 5.
    if (ms[4] === '3' && ms[5] === '5') return new Map([['undercut', { cells: ['c1r1'] }]]);
    return new Map();
  };
  const got = await runSparseLookahead(
    { movestring: '3333', playedCol: 4, bestCol: 3, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.case, 1);
  assert.equal(got.tag, 'undercut');
  assert.ok(Object.keys(got.aliasMap)[0].startsWith('future-undercut'));
});

test('runSparseLookahead: solver error on pre-move query falls back to mistake mode (no throw)', async () => {
  // Pre-move query throws → optScore undefined → mistake-mode best-vs-played fallback.
  // Mistake mode explores middle tiers [1,2,3,4,5] best-first; the match lands on col 1,
  // the FIRST reply explored, so the depth-first budget reaches it before being exhausted.
  const node = [10, 5, 5, 5, 5, 5, 1];
  const fSolver = { async query(ms) { if (ms === '') throw new Error('pre-move solver error'); return node; } };
  const classifyFn = async (ms) => {
    if (ms[0] === '1' && ms[1] === '1') return new Map([['double_threat', { cells: ['c4r3'] }]]);
    return new Map();
  };
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 1, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.tag, 'double_threat'); // mistake-mode opp explores middle tiers incl col2
});

// ── Case 3: dual output (opponent punishment + player slip) ──────────────────────
test('runSparseLookahead: case 3 carries both opponent-punishment and player-slip structures', async () => {
  // optScore (bestCol 3) = -1 < 0 → case 3.
  const pre = [-3, -3, -3, -1, -2, -3, -3];
  // NODE scores: distinct tiers so mistake mode (player slip) has a gradient, and the
  // opponent's optimal reply (max) is col 0.
  const node = [9, 5, 4, 3, 2, 1, 0];
  const fSolver = { async query(ms) { return ms === '' ? pre : node; } };
  const classifyFn = async (ms, persp) => {
    // Player-slip search: perspective 1, best line starts '3', mistake opp reply incl col1..4.
    if (persp === 1 && ms[0] === '3' && ms.length >= 2) {
      return new Map([['j_shape', { cells: ['c2r2'] }]]);
    }
    // Opponent-punishment search: perspective 2 (opponent), from played root '4',
    // opponent's optimal reply col 0.
    if (persp === 2 && ms[0] === '4' && ms[1] === '0') {
      return new Map([['double_threat', { cells: ['c5r4'] }]]);
    }
    return new Map();
  };
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 3, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.case, 3);
  assert.equal(got.oppTag, 'double_threat');
  assert.ok(Object.keys(got.oppAliasMap)[0].startsWith('opp-future-double_threat'));
  assert.equal(got.tag, 'j_shape');
  assert.ok(Object.keys(got.aliasMap)[0].startsWith('future-j_shape'));
});

test('runSparseLookahead: case 3 fires when only the opponent-punishment search has content', async () => {
  const pre = [-3, -3, -3, -1, -2, -3, -3]; // optScore (col3) = -1 < 0 → case 3
  const node = [9, 5, 4, 3, 2, 1, 0];
  const fSolver = { async query(ms) { return ms === '' ? pre : node; } };
  const classifyFn = async (ms, persp) => {
    if (persp === 2 && ms[0] === '4' && ms[1] === '0') {
      return new Map([['immediate_threat', { cells: ['c5r4'] }]]);
    }
    return new Map(); // player-slip search finds nothing
  };
  const got = await runSparseLookahead(
    { movestring: '', playedCol: 4, bestCol: 3, perspective: 1 },
    { solver: fSolver, classifyFn },
  );
  assert.equal(got.case, 3);
  assert.equal(got.oppTag, 'immediate_threat');
  assert.equal(got.tag, null);
  assert.deepEqual(got.aliasMap, {});
  assert.deepEqual(got.allowedSetEntries, []);
});
