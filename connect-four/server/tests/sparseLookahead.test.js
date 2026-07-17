/**
 * Characterization snapshot test for runSparseLookahead — SC-003 regression gate.
 *
 * Purpose: Assert that the fields feeding the production annotation gate
 * (`allowedSetEntries`, `aliasMap`, `tag`, `oppTag`, `oppAliasMap`,
 * `oppAllowedSetEntries`) are byte-identical to the frozen constants below.
 * If `collectNovelOpportunities` or `compareOpportunities` ever change in a way
 * that alters the production annotation gate output, this test will fail before
 * the seam edit is merged.
 *
 * T003 / FR-B01 / SC-003
 *
 * Fixtures (all depth=4 to keep the test fast and deterministic):
 *   - eval-43 (Case 2): ms='4122251554142', playedCol=6, bestCol=4, perspective=2
 *     both_moves_hold_better_stronger — optScore=13>0, blunderScore=3>0
 *   - eval-29 (Case 1): ms='332', playedCol=2, bestCol=4, perspective=2
 *     better_holds_played_loses — optScore=2>0, blunderScore=-18<0
 *   - eval-42 (Case 3): ms='412225155414', playedCol=2, bestCol=4, perspective=1
 *     losing_either_way — optScore=-3<0
 *
 * Snapshot captured 2026-06-27 at depth=4 with the real c4solver.
 * DO NOT modify these expected values without first understanding why they changed.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../c4solver-wrapper.js';
import {
  runSparseLookahead,
  toOutcome,
  toPliesToEnd,
  pickEarliestWay,
  findGravityTopEmpty,
  countWindowsThrough,
  buildDecisiveLine,
  deriveEdgeType,
  assembleReachability,
  mergeSymmetricExamples,
  toOutcomeFromRef,
} from '../sparseLookahead.js';
import { Board } from '../classifier.js';

// ─── Frozen expected values ────────────────────────────────────────────────────

// eval-43, Case 2 (both_moves_hold_better_stronger)
const CASE2_EXPECTED = {
  case: 2,
  tag: 'double_threat',
  aliasMap: { 'future-double_threat-1': 'cells:c4r2' },
  allowedSetEntries: [{ cells: ['c4r2'], validationOnly: true }],
};

// eval-29, Case 1 (better_holds_played_loses)
const CASE1_EXPECTED = {
  case: 1,
  tag: 'minor_threat',
  aliasMap: {
    'future-minor_threat-1': 'cells:c2r4',
    'future-minor_threat-2': 'cells:c3r3',
  },
  allowedSetEntries: [{ cells: ['c2r4', 'c3r3'], validationOnly: true }],
};

// eval-42, Case 3 (losing_either_way)
const CASE3_EXPECTED = {
  case: 3,
  tag: 'minor_threat',
  oppTag: 'major_threat_parity',
  aliasMap: { 'future-minor_threat-1': 'cells:c7r2' },
  allowedSetEntries: [{ cells: ['c7r2'], validationOnly: true }],
  oppAliasMap: { 'opp-future-major_threat_parity-1': 'cells:c4r2' },
  oppAllowedSetEntries: [{ cells: ['c4r2'], validationOnly: true }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runSparseLookahead characterization snapshot (SC-003 regression gate)', () => {
  let solver;

  before(() => {
    solver = createSolverProcess();
  });

  after(() => {
    solver.destroy?.();
  });

  it('Case 2 (both_moves_hold) — eval-43 snapshot: tag, aliasMap, allowedSetEntries byte-identical', async () => {
    // eval-43: ms='4122251554142' (13 chars), playedCol=6, bestCol=4, perspective=2
    // Pre-move scores: [3,3,3,-3,13,3,3] → bestCol=4 score=13>0, playedCol=6 score=3>0 → Case 2
    const result = await runSparseLookahead(
      { movestring: '4122251554142', playedCol: 6, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );

    assert.equal(result.case, CASE2_EXPECTED.case, 'case must match');
    assert.equal(result.tag, CASE2_EXPECTED.tag, 'tag must match');
    assert.deepEqual(result.aliasMap, CASE2_EXPECTED.aliasMap, 'aliasMap must be byte-identical');
    assert.deepEqual(
      result.allowedSetEntries,
      CASE2_EXPECTED.allowedSetEntries,
      'allowedSetEntries must be byte-identical',
    );
  });

  it('Case 1 (better_holds_played_loses) — eval-29 snapshot: tag, aliasMap, allowedSetEntries byte-identical', async () => {
    // eval-29: ms='332' (3 chars), playedCol=2, bestCol=4, perspective=2
    // Pre-move scores: [-18,2,-18,-18,2,-18,-18] → bestCol=4 score=2>0, playedCol=2 score=-18<0 → Case 1
    const result = await runSparseLookahead(
      { movestring: '332', playedCol: 2, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );

    assert.equal(result.case, CASE1_EXPECTED.case, 'case must match');
    assert.equal(result.tag, CASE1_EXPECTED.tag, 'tag must match');
    assert.deepEqual(result.aliasMap, CASE1_EXPECTED.aliasMap, 'aliasMap must be byte-identical');
    assert.deepEqual(
      result.allowedSetEntries,
      CASE1_EXPECTED.allowedSetEntries,
      'allowedSetEntries must be byte-identical',
    );
  });

  it('Case 3 (losing_either_way) — eval-42 snapshot: both player and opponent structures byte-identical', async () => {
    // eval-42: ms='412225155414' (12 chars), playedCol=2, bestCol=4, perspective=1
    // Pre-move scores: [-13,-3,-13,-15,-3,-13,-13] → bestCol=4 score=-3<0 → Case 3
    const result = await runSparseLookahead(
      { movestring: '412225155414', playedCol: 2, bestCol: 4, perspective: 1 },
      { solver, depth: 4 },
    );

    assert.equal(result.case, CASE3_EXPECTED.case, 'case must match');
    assert.equal(result.tag, CASE3_EXPECTED.tag, 'player tag must match');
    assert.equal(result.oppTag, CASE3_EXPECTED.oppTag, 'opponent tag must match');
    assert.deepEqual(result.aliasMap, CASE3_EXPECTED.aliasMap, 'aliasMap must be byte-identical');
    assert.deepEqual(
      result.allowedSetEntries,
      CASE3_EXPECTED.allowedSetEntries,
      'allowedSetEntries must be byte-identical',
    );
    assert.deepEqual(result.oppAliasMap, CASE3_EXPECTED.oppAliasMap, 'oppAliasMap must be byte-identical');
    assert.deepEqual(
      result.oppAllowedSetEntries,
      CASE3_EXPECTED.oppAllowedSetEntries,
      'oppAllowedSetEntries must be byte-identical',
    );
  });
});

// ─── Story A unit tests (T005–T010 helpers) ───────────────────────────────────
//
// Tests A-T1 through A-T8 per data-model §5. Pure helpers (toOutcome, toPliesToEnd,
// pickEarliestWay, findGravityTopEmpty, countWindowsThrough, buildDecisiveLine) are
// tested without a solver. Integration assertions for outcomeTiming presence run
// against the existing SC-003 fixtures using the real solver.

describe('Story A — toOutcome / toPliesToEnd (A-T1, A-T2, A-T3)', () => {
  // A-T1: win-in-5 position (optScore=+5)
  it('A-T1: positive score → outcome=win, pliesToEnd=count', () => {
    assert.equal(toOutcome(5), 'win');
    assert.equal(toPliesToEnd(5), 5);
    // Also verify other win distances
    assert.equal(toOutcome(1), 'win');
    assert.equal(toPliesToEnd(1), 1);
    assert.equal(toOutcome(20), 'win');
    assert.equal(toPliesToEnd(20), 20);
  });

  // A-T2: draw position (optScore=0)
  it('A-T2: score=0 → outcome=draw, pliesToEnd=null', () => {
    assert.equal(toOutcome(0), 'draw');
    assert.equal(toPliesToEnd(0), null);
  });

  // A-T3: solver error (score=undefined)
  it('A-T3: score=undefined → outcome=null, pliesToEnd=null', () => {
    assert.equal(toOutcome(undefined), null);
    assert.equal(toPliesToEnd(undefined), null);
  });

  it('negative score → outcome=loss, pliesToEnd=absolute value', () => {
    assert.equal(toOutcome(-3), 'loss');
    assert.equal(toPliesToEnd(-3), 3);
  });
});

describe('Story A — pickEarliestWay', () => {
  it('returns null when tally has no immediate_threat entry', () => {
    const tally = new Map([['minor_threat', { ways: [{ cells: ['c1r1'], ply: 2 }] }]]);
    assert.equal(pickEarliestWay(tally), null);
  });

  it('returns null when immediate_threat entry has empty ways', () => {
    const tally = new Map([['immediate_threat', { ways: [] }]]);
    assert.equal(pickEarliestWay(tally), null);
  });

  it('returns the way with the minimum ply', () => {
    const ways = [{ cells: ['c1r1', 'c2r1', 'c3r1', 'c4r1'], ply: 3 },
                  { cells: ['c1r2', 'c2r2', 'c3r2', 'c4r2'], ply: 1 },
                  { cells: ['c1r3', 'c2r3', 'c3r3', 'c4r3'], ply: 2 }];
    const tally = new Map([['immediate_threat', { ways }]]);
    const result = pickEarliestWay(tally);
    assert.equal(result.ply, 1);
    assert.deepEqual(result.cells, ['c1r2', 'c2r2', 'c3r2', 'c4r2']);
  });
});

describe('Story A — findGravityTopEmpty', () => {
  // Board '012': P1 at (0,0),(0,1),(0,2). col3 is empty (gravity-top row0).
  const board012 = new Board('012');

  it('returns the gravity-top cell in the window', () => {
    // c4r1 (0-indexed: row=0, col=3) is gravity-top since colHeights[3]=0
    const result = findGravityTopEmpty(['c1r1', 'c2r1', 'c3r1', 'c4r1'], board012);
    assert.equal(result, 'c4r1');
  });

  it('returns null when no cell in the window is gravity-top empty', () => {
    // c1r1,c2r1,c3r1 all have colHeights > 0 on board '012'
    // c1r1: col=0, row=0 → colHeights[0]=1 → NOT gravity-top
    const result = findGravityTopEmpty(['c1r1', 'c2r1', 'c3r1'], board012);
    assert.equal(result, null);
  });

  it('returns null for malformed cell strings', () => {
    const result = findGravityTopEmpty(['bad', 'wrong'], board012);
    assert.equal(result, null);
  });
});

describe('Story A — countWindowsThrough (A-T5, A-T6)', () => {
  // A-T5: Single-line win — board '05162' gives P1 at c1r1,c2r1,c3r1 with
  // completing cell c4r1. Only 1 winning window for P1 through c4r1.
  // '05162' move sequence: P1→col0, P2→col5, P1→col1, P2→col6, P1→col2
  // → P1 at (0,0),(0,1),(0,2); P2 at (0,5),(0,6). Col3 gravity-top=row0=c4r1.
  it('A-T5: single-line position → winningLinesThroughCell = 1', () => {
    const board = new Board('05162'); // P1 at c1r1,c2r1,c3r1; currentPlayer=2
    const count = countWindowsThrough('c4r1', board, 1 /* player 1 */);
    assert.equal(count, 1);
  });

  // A-T6: Fork — board '31516132122' (see test comments) where P1 has BOTH a
  // horizontal [c4r1,c5r1,c6r1,c7r1] and a diagonal [c5r1,c4r2,c3r3,c2r4]
  // through the gravity-top cell c5r1 (0-indexed: row=0, col=4).
  //
  // Board construction ('31516132122', 11 moves):
  //   P1: cols 3,5,6,3,1,2 → pieces at (0,3),(0,5),(0,6),(1,3),(3,1),(2,2)
  //   P2: cols 1,1,1,2,2   → pieces at (0,1),(1,1),(2,1),(0,2),(1,2)
  // Col4 is empty (gravity-top = row0 = c5r1).
  // Winning windows for P1 through c5r1:
  //   1) Horizontal [c4r1,c5r1,c6r1,c7r1]: P1 at (0,3),(0,5),(0,6) ✓
  //   2) Diagonal ↘ [c5r1,c4r2,c3r3,c2r4]: P1 at (1,3),(2,2),(3,1) ✓
  it('A-T6: fork position → winningLinesThroughCell = 2', () => {
    const board = new Board('31516132122'); // length=11 → currentPlayer=2, P1=opponent
    // Verify gravity-top of col4 is row0 (c5r1)
    assert.equal(board.colHeights[4], 0, 'col4 must be empty for gravity-top check');
    const count = countWindowsThrough('c5r1', board, 1 /* player 1 owns threats */);
    assert.equal(count, 2);
  });
});

describe('Story A — buildDecisiveLine (A-T4, A-T7, A-T8)', () => {
  // board05162: P1 at (0,0),(0,1),(0,2); P2 at (0,5),(0,6). Col3 empty → c4r1 gravity-top.
  // '05162': P1→col0, P2→col5, P1→col1, P2→col6, P1→col2. Length=5 → currentPlayer=2 → opponent=1.
  const boardSingleLine = new Board('05162');

  // Helper: build a minimal tally with an immediate_threat way.
  function makeTally(cells, ply) {
    return new Map([['immediate_threat', { ways: [{ cells, ply }] }]]);
  }

  // A-T4: Position with immediate_threat in tally → decisiveLine.cells = 4-window
  it('A-T4: immediate_threat in tally → decisiveLine.cells is 4-cell window', () => {
    const cells = ['c1r1', 'c2r1', 'c3r1', 'c4r1'];
    const primaryTally = makeTally(cells, 1);
    // owner='opponent': ownerPlayer = boardSingleLine.opponent = 1 (currentPlayer=2 → opponent=1)
    const result = buildDecisiveLine(primaryTally, null, 'opponent', boardSingleLine);
    assert.ok(result, 'decisiveLine must be present');
    assert.deepEqual(result.cells, cells);
    assert.equal(result.completingCell, 'c4r1');
    assert.ok(result.winningLinesThroughCell >= 1, 'winningLinesThroughCell must be >= 1');
    assert.equal(result.owner, 'opponent');
  });

  // A-T5 via buildDecisiveLine: single-line → winningLinesThroughCell = 1
  it('A-T5 (via buildDecisiveLine): single-line win → winningLinesThroughCell = 1', () => {
    const primaryTally = makeTally(['c1r1', 'c2r1', 'c3r1', 'c4r1'], 1);
    const result = buildDecisiveLine(primaryTally, null, 'opponent', boardSingleLine);
    assert.equal(result.winningLinesThroughCell, 1);
  });

  // A-T6 via buildDecisiveLine: fork position → winningLinesThroughCell = 2
  it('A-T6 (via buildDecisiveLine): fork → winningLinesThroughCell = 2', () => {
    const board = new Board('31516132122'); // P1 fork at c5r1
    // Window [c4r1,c5r1,c6r1,c7r1] (horizontal): gravity-top is c5r1 (col4=empty)
    const primaryTally = makeTally(['c4r1', 'c5r1', 'c6r1', 'c7r1'], 1);
    // board.currentPlayer=2 (length=11), so opponent=1
    const result = buildDecisiveLine(primaryTally, null, 'opponent', board);
    assert.ok(result, 'decisiveLine must be present');
    assert.equal(result.completingCell, 'c5r1');
    assert.equal(result.winningLinesThroughCell, 2);
  });

  // A-T7: horizon-exceeded (no immediate_threat in tally) → returns undefined
  it('A-T7: empty tally (no immediate_threat) → buildDecisiveLine returns undefined', () => {
    const emptyTally = new Map([['minor_threat', { ways: [{ cells: ['c1r1'], ply: 2 }] }]]);
    const result = buildDecisiveLine(emptyTally, null, 'player', boardSingleLine);
    assert.equal(result, undefined);
  });

  it('A-T7: completely empty tally → buildDecisiveLine returns undefined', () => {
    const result = buildDecisiveLine(new Map(), null, 'player', boardSingleLine);
    assert.equal(result, undefined);
  });

  // A-T8: best wins faster than played → fastSide='best', fastSideRealizedOnPly < slowSideRealizedOnPly
  it('A-T8: best wins faster → fastSide=best, fastSideRealizedOnPly < slowSideRealizedOnPly', () => {
    const bestCells  = ['c1r1', 'c2r1', 'c3r1', 'c4r1'];
    const playedCells = ['c1r2', 'c2r2', 'c3r2', 'c4r2'];
    const bestTally   = makeTally(bestCells,   1); // ply 1 = faster
    const playedTally = makeTally(playedCells, 3); // ply 3 = slower
    // Use a board where both c4r1 and c4r2 can be gravity-top.
    // Board '': empty board; colHeights all 0 → c4r1 is gravity-top for col3.
    const emptyBoard = new Board('');
    // owner='player': ownerPlayer = emptyBoard.currentPlayer = 1
    const result = buildDecisiveLine(bestTally, playedTally, 'player', emptyBoard);
    assert.ok(result, 'decisiveLine must be present');
    assert.equal(result.fastSide, 'best');
    assert.equal(result.fastSideRealizedOnPly, 1);
    assert.equal(result.slowSideRealizedOnPly, 3);
    assert.ok(result.fastSideRealizedOnPly < result.slowSideRealizedOnPly);
  });

  it('played wins faster → fastSide=played', () => {
    const bestTally   = makeTally(['c1r1', 'c2r1', 'c3r1', 'c4r1'], 3);
    const playedTally = makeTally(['c1r2', 'c2r2', 'c3r2', 'c4r2'], 1);
    const emptyBoard = new Board('');
    const result = buildDecisiveLine(bestTally, playedTally, 'player', emptyBoard);
    assert.ok(result, 'decisiveLine must be present');
    assert.equal(result.fastSide, 'played');
    assert.equal(result.fastSideRealizedOnPly, 1);
    assert.equal(result.slowSideRealizedOnPly, 3);
  });

  it('only secondary way present → secondary becomes fast, slowSideRealizedOnPly=null', () => {
    const emptyPrimary = new Map();
    const secondaryTally = makeTally(['c1r1', 'c2r1', 'c3r1', 'c4r1'], 2);
    const emptyBoard = new Board('');
    const result = buildDecisiveLine(emptyPrimary, secondaryTally, 'player', emptyBoard);
    assert.ok(result, 'decisiveLine must be present when secondary has immediate_threat');
    assert.equal(result.fastSide, 'played'); // secondary = played
    assert.equal(result.fastSideRealizedOnPly, 2);
    assert.equal(result.slowSideRealizedOnPly, null);
  });
});

describe('Story A — outcomeTiming present on all four return paths (A-T9b)', () => {
  // Uses the real solver via the SC-003 fixtures.
  let solver;

  before(() => {
    solver = createSolverProcess();
  });

  after(() => {
    solver.destroy?.();
  });

  // A-T9b: forced-outcome position (win/loss on non-zero sides)
  it('A-T9b: Case 2 fixture (eval-43) — outcomeTiming present with non-null pliesToEnd for best', async () => {
    const result = await runSparseLookahead(
      { movestring: '4122251554142', playedCol: 6, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );
    assert.ok(result.outcomeTiming, 'outcomeTiming must be present on Case 2 result');
    assert.ok(['win', 'draw', 'loss', null].includes(result.outcomeTiming.best.outcome),
      'best.outcome must be a valid enum value');
    assert.ok(['win', 'draw', 'loss', null].includes(result.outcomeTiming.played.outcome),
      'played.outcome must be a valid enum value');
    // eval-43: optScore=13>0 → best.pliesToEnd=13, blunderScore=3>0 → played.pliesToEnd=3
    assert.equal(result.outcomeTiming.best.outcome, 'win');
    assert.equal(result.outcomeTiming.best.pliesToEnd, 13);
    assert.equal(result.outcomeTiming.played.outcome, 'win');
    assert.equal(result.outcomeTiming.played.pliesToEnd, 3);
  });

  it('A-T9b: Case 1 fixture (eval-29) — outcomeTiming present; played outcome=loss', async () => {
    const result = await runSparseLookahead(
      { movestring: '332', playedCol: 2, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );
    assert.ok(result.outcomeTiming, 'outcomeTiming must be present on Case 1 result');
    // eval-29: optScore=2>0 → win; blunderScore=-18<0 → loss
    assert.equal(result.outcomeTiming.best.outcome, 'win');
    assert.equal(result.outcomeTiming.best.pliesToEnd, 2);
    assert.equal(result.outcomeTiming.played.outcome, 'loss');
    assert.equal(result.outcomeTiming.played.pliesToEnd, 18);
  });

  it('A-T9b: Case 3 fixture (eval-42) — outcomeTiming present; both outcomes=loss', async () => {
    const result = await runSparseLookahead(
      { movestring: '412225155414', playedCol: 2, bestCol: 4, perspective: 1 },
      { solver, depth: 4 },
    );
    assert.ok(result.outcomeTiming, 'outcomeTiming must be present on Case 3 result');
    // eval-42: optScore=-3<0 → loss
    assert.equal(result.outcomeTiming.best.outcome, 'loss');
    assert.ok(result.outcomeTiming.best.pliesToEnd !== null, 'pliesToEnd must be non-null for decisive loss');
    assert.equal(result.outcomeTiming.played.outcome, 'loss');
  });
});

// ─── Story B unit tests (T015–T019) ───────────────────────────────────────────
//
// Pure-helper tests for deriveEdgeType / assembleReachability / mergeSymmetricExamples /
// toOutcomeFromRef (no solver). Integration assertions run against the SC-003 fixtures
// using the real solver. Tests A-T9, B-T1..B-T12 per data-model §5.

describe('Story B — deriveEdgeType (B-T7, B-T8, B-T9, B-T9b)', () => {
  const ot = (b, p) => ({ best: { outcome: b }, played: { outcome: p } });
  const dl = { owner: 'player', cells: ['c1r1'] }; // a present decisiveLine

  it('B-T7: outcomes diverge → tactical', () => {
    assert.equal(deriveEdgeType(ot('win', 'loss'), dl), 'tactical');
    assert.equal(deriveEdgeType(ot('draw', 'loss'), undefined), 'tactical');
  });

  it('B-T8: same outcome + no decisive line → positional', () => {
    assert.equal(deriveEdgeType(ot('draw', 'draw'), undefined), 'positional');
    assert.equal(deriveEdgeType(ot('loss', 'loss'), undefined), 'positional');
  });

  it('B-T9: same outcome + decisive line on one side → marginal', () => {
    assert.equal(deriveEdgeType(ot('win', 'win'), dl), 'marginal');
  });

  it('B-T9b: same outcome + decisive line on both sides → marginal (same catch-all)', () => {
    const dlBoth = { owner: 'player', cells: ['c1r1'], fastSide: 'best', slowSideRealizedOnPly: 3 };
    assert.equal(deriveEdgeType(ot('loss', 'loss'), dlBoth), 'marginal');
  });
});

describe('Story B — toOutcomeFromRef (ceiling invariant)', () => {
  it('null ref → loss (conservative, equals floor)', () => {
    assert.equal(toOutcomeFromRef(null), 'loss');
  });

  it('-Infinity ref → loss (no player node visited; -Infinity default never produces ceiling<floor)', () => {
    assert.equal(toOutcomeFromRef({ value: -Infinity }), 'loss');
  });

  it('positive ref score → win', () => {
    assert.equal(toOutcomeFromRef({ value: 7 }), 'win');
  });

  it('zero ref score → draw', () => {
    assert.equal(toOutcomeFromRef({ value: 0 }), 'draw');
  });
});

describe('Story B — assembleReachability (B-T5, B-T6, emission gate)', () => {
  const ot = (b, p) => ({ best: { outcome: b }, played: { outcome: p } });

  it('emission gate: neither side losing → undefined (field omitted)', () => {
    assert.equal(assembleReachability(ot('win', 'draw'), null, null), undefined);
    assert.equal(assembleReachability(ot('win', 'win'), null, null), undefined);
  });

  it('B-T5: both sides losing → both floors loss; ceilings from refs; ceiling ≥ floor', () => {
    const r = assembleReachability(ot('loss', 'loss'), { value: 5 }, { value: -2 });
    assert.equal(r.best.floor, 'loss');
    assert.equal(r.played.floor, 'loss');
    assert.equal(r.best.ceiling, 'win');   // ref 5 > 0
    assert.equal(r.played.ceiling, 'loss'); // ref -2 < 0 → loss = floor (still valid)
  });

  it('B-T6: best holds (win), played loses → reachability emitted; best.ceiling = best.floor (no search)', () => {
    // best floor is 'win' (not loss) → ceiling = floor, bestRef is null and unused.
    const r = assembleReachability(ot('win', 'loss'), null, { value: 0 });
    assert.ok(r, 'reachability emitted because played floor is loss');
    assert.equal(r.best.floor, 'win');
    assert.equal(r.best.ceiling, 'win'); // ceiling = floor for non-losing side
    assert.equal(r.played.floor, 'loss');
    assert.equal(r.played.ceiling, 'draw'); // ref 0 → draw (a punishable opponent mistake found)
  });

  it('non-losing side never derives ceiling from a ref (best.ceiling = floor even with a positive ref)', () => {
    const r = assembleReachability(ot('draw', 'loss'), { value: 9 }, { value: -9 });
    assert.equal(r.best.ceiling, 'draw'); // floor=draw, ceiling=floor — ref ignored
  });
});

describe('Story B — mergeSymmetricExamples (B-T1, B-T2, B-T3, B-T4)', () => {
  it('B-T1: empty inputs (true cell-set ties already filtered by collectNovel) → empty output', () => {
    assert.deepEqual(mergeSymmetricExamples([], []), []);
  });

  it('B-T2: same tag on both sides with different cells → both bestNovel and playedNovel', () => {
    const best = [{ tag: 'minor_threat', ways: [{ cells: ['c2r4'], realizedOnPly: 1 }], novelInstances: 1 }];
    const played = [{ tag: 'minor_threat', ways: [{ cells: ['c5r2'], realizedOnPly: 2 }], novelInstances: 1 }];
    const merged = mergeSymmetricExamples(best, played);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].tag, 'minor_threat');
    assert.deepEqual(merged[0].bestNovel, [{ cells: ['c2r4'], realizedOnPly: 1 }]);
    assert.deepEqual(merged[0].playedNovel, [{ cells: ['c5r2'], realizedOnPly: 2 }]);
    assert.equal(merged[0].novelInstances, 2); // summed across directions
  });

  it('B-T3: tag only on best side → bestNovel populated, playedNovel empty (pruned downstream)', () => {
    const best = [{ tag: 'double_threat', ways: [{ cells: ['c4r2'], realizedOnPly: 1 }], novelInstances: 1 }];
    const merged = mergeSymmetricExamples(best, []);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0].bestNovel, [{ cells: ['c4r2'], realizedOnPly: 1 }]);
    assert.deepEqual(merged[0].playedNovel, []);
  });

  it('B-T4: tag only on played side → playedNovel populated, bestNovel empty (pruned downstream)', () => {
    const played = [{ tag: 'undercut', ways: [{ cells: ['c3r1'], realizedOnPly: 3 }], novelInstances: 1 }];
    const merged = mergeSymmetricExamples([], played);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0].playedNovel, [{ cells: ['c3r1'], realizedOnPly: 3 }]);
    assert.deepEqual(merged[0].bestNovel, []);
  });
});

describe('Story B — edgeType + reachability integration (A-T9, B-T5, B-T6, B-T11, B-T12)', () => {
  let solver;

  before(() => {
    solver = createSolverProcess();
  });

  after(() => {
    solver.destroy?.();
  });

  // A-T9: edgeType (truthy string) + outcomeTiming present on every fixture exit path.
  const FIXTURES = [
    { name: 'eval-43 (Case 2, path 1)', args: { movestring: '4122251554142', playedCol: 6, bestCol: 4, perspective: 2 } },
    { name: 'eval-29 (Case 1, path 1)', args: { movestring: '332', playedCol: 2, bestCol: 4, perspective: 2 } },
    { name: 'eval-42 (Case 3, path 4)', args: { movestring: '412225155414', playedCol: 2, bestCol: 4, perspective: 1 } },
  ];

  for (const { name, args } of FIXTURES) {
    it(`A-T9: ${name} → edgeType is a truthy enum string AND outcomeTiming present`, async () => {
      const result = await runSparseLookahead(args, { solver, depth: 4 });
      assert.ok(typeof result.edgeType === 'string' && result.edgeType.length > 0,
        'edgeType must be a non-empty string (survives pruneEmpty)');
      assert.ok(['tactical', 'positional', 'marginal'].includes(result.edgeType),
        'edgeType must be one of the three enum values');
      assert.ok(result.outcomeTiming, 'outcomeTiming must be present');
    });
  }

  it('B-T7: eval-29 outcomes diverge (best win, played loss) → edgeType = tactical', async () => {
    const result = await runSparseLookahead(
      { movestring: '332', playedCol: 2, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );
    assert.equal(result.edgeType, 'tactical');
  });

  it('B-T5: eval-42 (losing either way) → reachability both floors = loss', async () => {
    const result = await runSparseLookahead(
      { movestring: '412225155414', playedCol: 2, bestCol: 4, perspective: 1 },
      { solver, depth: 4 },
    );
    assert.ok(result.reachability, 'reachability must be emitted when a floor is loss');
    assert.equal(result.reachability.best.floor, 'loss');
    assert.equal(result.reachability.played.floor, 'loss');
    // ceiling ≥ floor — never below loss; both are valid outcome strings
    assert.ok(['win', 'draw', 'loss'].includes(result.reachability.best.ceiling));
    assert.ok(['win', 'draw', 'loss'].includes(result.reachability.played.ceiling));
  });

  it('B-T6 / B-T12: eval-29 (best holds, played loses) → reachability emitted; best.ceiling = best.floor; played.ceiling ≥ floor from real search', async () => {
    const result = await runSparseLookahead(
      { movestring: '332', playedCol: 2, bestCol: 4, perspective: 2 },
      { solver, depth: 4 },
    );
    assert.ok(result.reachability, 'reachability emitted because played floor is loss');
    // best floor is 'win' (not loss) → ceiling = floor, no search
    assert.equal(result.reachability.best.floor, 'win');
    assert.equal(result.reachability.best.ceiling, 'win');
    // played floor is 'loss'; ceiling from real mistake-mode search — a valid outcome, ≥ loss
    assert.equal(result.reachability.played.floor, 'loss');
    assert.ok(['win', 'draw', 'loss'].includes(result.reachability.played.ceiling),
      'played.ceiling derived from real search, not an -Infinity default');
  });

  it('B-T11: eval-42 (Case 3) → decisiveLine, when present, has owner = opponent (from oppTally)', async () => {
    const result = await runSparseLookahead(
      { movestring: '412225155414', playedCol: 2, bestCol: 4, perspective: 1 },
      { solver, depth: 4 },
    );
    // decisiveLine may be absent at depth 4 (no immediate_threat in oppTally); when present
    // it MUST be owner='opponent' for a Case-3 result (never 'player').
    if (result.decisiveLine !== undefined) {
      assert.equal(result.decisiveLine.owner, 'opponent');
    }
  });
});
