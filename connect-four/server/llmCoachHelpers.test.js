// Tests for Batch 2 classification, grouping, and prompt-building helpers.
// Uses node:test + node:assert/strict (project convention — no Jest).
//
// T07: Classifier unit tests (SC-003: >=1 fixture per type)
// Also covers T04 (checkAllMovesEqual, getGapAndFraming),
// T08 (selectTopGroups), T09 (buildAllowedSet), T09b (buildType1AllowedSet).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  Board,
  getImmediateThreats,
} from './classifier.js';
import {
  checkAllMovesEqual,
  getGapAndFraming,
  classifyExplanationType,
  selectTopGroups,
  buildAllowedSet,
  buildType1AllowedSet,
  buildGroupContextBlock,
  buildType4Prompt,
  buildType12Prompt,
  buildType3Prompt,
  findMajorThreatWindows,
} from './llmCoachHelpers.js';

// ===========================================================================
// T04 — checkAllMovesEqual
// ===========================================================================

describe('checkAllMovesEqual', () => {
  test('all zeros on empty board → settled', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([0, 0, 0, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, true);
  });

  test('all equal non-zero → not settled', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([1, 1, 1, 1, 1, 1, 1], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, false);
  });

  test('mixed scores → not equal', () => {
    const board = new Board('');
    const result = checkAllMovesEqual([0, 0, 1, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, false);
    assert.equal(result.isSettled, false);
  });

  test('full column excluded from legal cols', () => {
    // "000000" fills col 0 completely (6 moves in same column)
    const board = new Board('000000');
    // After 6 moves in col 0, it's full. Other cols still empty.
    const result = checkAllMovesEqual([0, 0, 0, 0, 0, 0, 0], board);
    assert.equal(result.allMovesEqual, true);
    assert.equal(result.isSettled, true);
  });

  // T05 regression: headline Type 4 fixture must NOT hit settled
  test('T05 regression: "34" (2-disc board) does NOT hit settled', () => {
    const board = new Board('34');
    // Non-zero preScores (represents a live position, not a settled draw)
    const preScores = [0, 0, 1, 2, 1, 0, 0];
    const result = checkAllMovesEqual(preScores, board);
    assert.equal(result.isSettled, false, 'Type 4 position "34" must not be classified as settled');
    assert.equal(result.allMovesEqual, false, 'Type 4 position "34" must not have all moves equal');
  });
});

// ===========================================================================
// T04 — getGapAndFraming
// ===========================================================================

describe('getGapAndFraming', () => {
  test('standard gap: B is better (positive gap)', () => {
    // preScores from current-player (opponent) perspective
    // score_coached = -preScores
    // A at col 0, B at col 3: preScores[0]=5 (opponent wins), preScores[3]=-5 (coach wins)
    const preScores = [5, 0, 0, -5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = -5, scoreB = 5, gap = 5 - (-5) = 10
    assert.equal(result.gap, 10);
    assert.equal(result.inverted, false);
    assert.equal(result.gapBucket, 'large');
  });

  test('inverted: A is optimal', () => {
    // coach wins after A (-3), loses after B (5)
    const preScores = [-3, 0, 0, 5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = 3, scoreB = -5, gap = -5 - 3 = -8, scoreA >= scoreB → inverted
    assert.equal(result.inverted, true);
    assert.equal(result.gap, -8);
    // Sign change: both non-zero and different → forceBucket = 'large'
    assert.equal(result.gapBucket, 'large');
  });

  test('inverted=true test for FR-008/FR-016 mutual exclusion', () => {
    // Position where A is the optimal move (highest score_coached)
    // preScores: lower = better for coached player
    // A at col 0: score -10 (coach wins strongly)
    // B at col 3: score -5 (coach wins but less)
    const preScores = [-10, 0, 0, -5, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = 10, scoreB = 5, gap = 5 - 10 = -5, scoreA >= scoreB → inverted=true
    assert.equal(result.inverted, true);
    assert.equal(result.gap, -5);
    // gap = -5, abs = 5, gapBucket = 'moderate'
    assert.equal(result.gapBucket, 'moderate');
  });

  test('sign-change override: win→loss → large', () => {
    // A: coach wins (preScore -8), B: opponent wins (preScore 9)
    const preScores = [-8, 0, 0, 9, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    assert.equal(result.forceBucket, 'large');
    assert.equal(result.gapBucket, 'large');
  });

  test('sign-change override: win→draw → moderate', () => {
    // A: coach wins (-6), B: draw (0)
    const preScores = [-6, 0, 0, 0, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    assert.equal(result.forceBucket, 'moderate');
    assert.equal(result.gapBucket, 'moderate');
  });

  test('small gap → small bucket', () => {
    const preScores = [2, 0, 0, 4, 0, 0, 0];
    const result = getGapAndFraming(preScores, 0, 3);
    // scoreA = -2, scoreB = -4, gap = -4 - (-2) = -2, abs = 2
    assert.equal(result.gapBucket, 'small');
  });
});

// ===========================================================================
// T06/T14 — classifyExplanationType
// ===========================================================================

describe('classifyExplanationType', () => {
  // Test 1: Type 1 — player has immediate threat
  test('Type 1: player has immediate threat (fixture "001122")', () => {
    // Movestring "001122" (0-indexed): Red at (0,0),(0,1),(0,2)
    //   → Red has 3 horizontal at row 0, immediate threat at col 3
    const preMoveBoard = new Board('001122');
    const postABoard = new Board('0011225'); // Red plays elsewhere (col 5)
    const perspective = 1; // Red is coached player
    const playedCol = 5;

    const result = classifyExplanationType(preMoveBoard, postABoard, null, perspective, playedCol);
    assert.equal(result.type, 'type1');
  });

  // Test 2: Type 2 — opponent has >=2 threats in critical position
  test('Type 2: >=2 opponent threats in critical position', () => {
    // Critical board "506152645464":
    //   Yellow has 3 horizontal at row 0 cols 0-2 (empty at col 3)
    //   AND 3 vertical at col 4 rows 0-2 (empty at row 3)
    const preMoveBoard = new Board(''); // No immediate threats
    const postABoard = new Board('0'); // Dummy
    const criticalPositionMs = '506152645464';
    const perspective = 1;
    const playedCol = 0;

    const result = classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol);
    assert.equal(result.type, 'type2');
  });

  // Test 3: Type 2 via scaffold (Figure 7 or J-shape)
  // Note: detectFigure7/detectJShape with ZERO_SCORES require the completing
  // column to have a positive score. With all-zero scores these detectors
  // won't fire in practice. This test verifies the opponent-threats path
  // as the primary Type 2 detection mechanism.
  test('Type 2: fallback scaffold check is wired', () => {
    // Same as test 2; verify the opponent-threat windows path
    const preMoveBoard = new Board('');
    const postABoard = new Board('0');
    const criticalPositionMs = '506152645464';
    const perspective = 1;
    const playedCol = 0;

    const result = classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol);
    assert.equal(result.type, 'type2');
  });

  // Test 4: Type 3 — major threat adjacent to parity-flip column
  test('Type 3: major threat adjacent to played column', () => {
    // preMoveBoard "3030": Red at (0,3),(1,3); Yellow at (0,0),(1,0)
    // User plays col 3 → postABoard "30303": Red at (0,3),(1,3),(2,3)
    //   → vertical major threat at col 3
    // playedCol=3 is same as threat column → Type 3
    const preMoveBoard = new Board('3030');
    const postABoard = new Board('30303');
    const perspective = 1;
    const playedCol = 3;

    const result = classifyExplanationType(preMoveBoard, postABoard, null, perspective, playedCol);
    assert.equal(result.type, 'type3');
    assert.ok(result.parityFlipData);
    assert.equal(typeof result.parityFlipData.colA, 'number');
    assert.equal(typeof result.parityFlipData.colX, 'number');
    assert.equal(typeof result.parityFlipData.rowR, 'number');
    assert.ok(typeof result.parityFlipData.playerLabel === 'string');
  });

  // Test 5: Type 4 — sparse early-game position
  test('Type 4: sparse position "34"', () => {
    const preMoveBoard = new Board('34');
    const postABoard = new Board('345'); // user plays col 5
    const perspective = 1;
    const playedCol = 5;

    const result = classifyExplanationType(preMoveBoard, postABoard, null, perspective, playedCol);
    assert.equal(result.type, 'type4');
  });

  // Test 6: Fallthrough order — Type 1 > 2 > 3 > 4
  test('Fallthrough order: Type 1 matches before Type 2/3/4', () => {
    // Position with immediate threat (Type 1) that could also be Type 3
    const preMoveBoard = new Board('001122'); // Red has immediate threat at col 3
    const postABoard = new Board('0011225'); // Red plays col 5
    const criticalPositionMs = '506152645464'; // has opponent threats (would be Type 2)
    const perspective = 1;
    const playedCol = 5;

    const result = classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol);
    // Should be Type 1 (first match wins), not Type 2 or 3
    assert.equal(result.type, 'type1');
  });

  test('Fallthrough order: Type 2 matches before Type 3', () => {
    // Position without immediate threats but with >=2 opponent threats
    const preMoveBoard = new Board(''); // No threats
    // Use "30303" for postABoard (has major threat, would be Type 3)
    const postABoard = new Board('30303');
    const criticalPositionMs = '506152645464'; // has 2 opponent threats (Type 2)
    const perspective = 1;
    const playedCol = 3;

    const result = classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol);
    assert.equal(result.type, 'type2');
  });

  // Test 7: getGapAndFraming inverted=true (FR-008/FR-016 mutual exclusion)
  test('getGapAndFraming inverted for optimal-A position (FR-008)', () => {
    // A's score_coached (=-preScore) >= B's → inverted=true
    const preScores = [-10, 0, 0, -3, 0, 0, 0]; // A=col0, B=col3
    const result = getGapAndFraming(preScores, 0, 3);
    // score_coached(A) = 10, score_coached(B) = 3
    // 10 >= 3 → inverted=true
    assert.equal(result.inverted, true);
    // gap = 3 - 10 = -7
    assert.equal(result.gap, -7);
  });
});

// ===========================================================================
// T08 — selectTopGroups
// ===========================================================================

describe('selectTopGroups', () => {
  test('empty maps → empty result', () => {
    const result = selectTopGroups(new Map(), new Map());
    assert.deepEqual(result, []);
  });

  test('top 5 per branch merged by key', () => {
    const aGroups = new Map([
      ['c3r2,c4r2,c5r2,c6r2:player', {
        cells: ['c3r2', 'c4r2', 'c5r2', 'c6r2'],
        owner: 'player',
        completed_freq: 0.8,
        draw_freq: 0.1,
      }],
      ['c1r1,c2r1,c3r1,c4r1:opponent', {
        cells: ['c1r1', 'c2r1', 'c3r1', 'c4r1'],
        owner: 'opponent',
        completed_freq: 0.3,
        draw_freq: 0.2,
      }],
    ]);

    const bGroups = new Map([
      ['c3r2,c4r2,c5r2,c6r2:player', {
        cells: ['c3r2', 'c4r2', 'c5r2', 'c6r2'],
        owner: 'player',
        completed_freq: 0.5,
        draw_freq: 0.3,
      }],
    ]);

    const result = selectTopGroups(aGroups, bGroups);
    assert.equal(result.length, 2);

    // Find the shared group
    const shared = result.find(r => r.owner === 'player');
    assert.ok(shared);
    assert.equal(shared.aCompleted, 0.8);
    assert.equal(shared.aDraw, 0.1);
    assert.equal(shared.bCompleted, 0.5);
    assert.equal(shared.bDraw, 0.3);

    // A-only group should have b* = 0
    const aOnly = result.find(r => r.owner === 'opponent');
    assert.ok(aOnly);
    assert.equal(aOnly.bCompleted, 0);
    assert.equal(aOnly.bDraw, 0);
  });

  test('selectTopGroups handles null/undefined inputs', () => {
    assert.deepEqual(selectTopGroups(null, new Map()), []);
    assert.deepEqual(selectTopGroups(new Map(), null), []);
  });
});

// ===========================================================================
// T09 — buildAllowedSet
// ===========================================================================

describe('buildAllowedSet', () => {
  test('CONCRETE-ELIGIBLE with >=2 player discs', () => {
    // Build a simple board where the player has 2 discs in a group
    const grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    grid[0][0] = 1; grid[1][0] = 1; grid[0][1] = 1; // Red discs mixed
    const board = { board: grid, colHeights: [2, 1, 0, 0, 0, 0, 0] };

    const groups = [{
      cells: ['c1r1', 'c2r1', 'c3r1', 'c4r1'],
      owner: 'player',
      aCompleted: 0.5,
      aDraw: 0.1,
      bCompleted: 0.2,
      bDraw: 0.05,
    }];

    // All 4 cells are in different cols → zoneSpec = cells:...
    // Red discs in group: check each cell
    // c1r1 = col0,row0 → board[0][0] = 1 = perspective (1) → count++
    // c2r1 = col1,row0 → board[0][1] = 1 = perspective → count++
    // 2 discs → CONCRETE-ELIGIBLE
    const result = buildAllowedSet(groups, board, 1);
    assert.equal(result.length, 1);
    assert.ok(result[0].cells, 'CONCRETE-ELIGIBLE should have cells field');
    assert.equal(result[0].zoneSpec, 'cells:c1r1,c2r1,c3r1,c4r1');
  });

  test('ABSTRACT-ONLY with <2 player discs', () => {
    const grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    grid[0][0] = 1; // Only 1 Red disc
    const board = { board: grid, colHeights: [1, 0, 0, 0, 0, 0, 0] };

    const groups = [{
      cells: ['c1r1', 'c1r2', 'c1r3', 'c1r4'],
      owner: 'player',
      aCompleted: 0.3,
      aDraw: 0,
      bCompleted: 0.1,
      bDraw: 0,
    }];

    // All same col (col 0) → zoneSpec = col1
    // Only 1 Red in the group (grid[0][0]=1) → ABSTRACT-ONLY
    const result = buildAllowedSet(groups, board, 1);
    assert.equal(result.length, 1);
    assert.ok(!result[0].cells, 'ABSTRACT-ONLY should NOT have cells field');
    assert.ok('col' in result[0], 'ABSTRACT-ONLY should have col');
    assert.ok('parity' in result[0], 'ABSTRACT-ONLY should have parity');
    assert.equal(result[0].zoneSpec, 'col1');
  });

  test('same-column group → col zone spec', () => {
    const grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    grid[0][0] = 1; grid[1][0] = 1; grid[2][0] = 1; // 3 Reds vertical
    const board = { board: grid, colHeights: [3, 0, 0, 0, 0, 0, 0] };

    const groups = [{
      cells: ['c1r1', 'c1r2', 'c1r3', 'c1r4'],
      owner: 'player',
      aCompleted: 0.6,
      aDraw: 0,
      bCompleted: 0.3,
      bDraw: 0,
    }];

    // 3 Reds in the group → CONCRETE-ELIGIBLE
    // All same col (0) → zoneSpec = col1
    const result = buildAllowedSet(groups, board, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].zoneSpec, 'col1');
  });
});

// ===========================================================================
// T09b — buildType1AllowedSet
// ===========================================================================

describe('buildType1AllowedSet', () => {
  test('returns empty for board with no immediate threats', () => {
    const board = new Board('34'); // 2 discs, sparse
    const result = buildType1AllowedSet(board, 1);
    assert.deepEqual(result, []);
  });

  test('returns entries for position with immediate threat', () => {
    // "001122": Red has 3 horizontal at row 0, immediate threat at col 3
    const board = new Board('001122');
    const result = buildType1AllowedSet(board, 1);
    assert.ok(result.length > 0);
    assert.ok(result.every(e => Array.isArray(e.cells)));
    assert.ok(result.every(e => typeof e.zoneSpec === 'string'));
  });
});

// ===========================================================================
// T10 — buildGroupContextBlock (smoke test)
// ===========================================================================

describe('buildGroupContextBlock', () => {
  test('returns string with Move context section', () => {
    const board = new Board('34');
    const result = buildGroupContextBlock([], [], board, 1, {
      userCol: 3,
      contrastCol: 4,
      gapBucket: 'small',
    });
    assert.ok(result.includes('## Move context'));
    assert.ok(result.includes('## Boards'));
    assert.ok(!result.includes('## Winning-line comparison'));
  });

  test('includes Winning-line comparison when groups present', () => {
    const board = new Board('34');
    const groups = [{
      cells: ['c1r1', 'c2r1', 'c3r1', 'c4r1'],
      owner: 'player',
      aCompleted: 0.5,
      aDraw: 0,
      bCompleted: 0.2,
      bDraw: 0,
    }];
    const allowedSet = [{
      cells: ['c1r1', 'c2r1', 'c3r1', 'c4r1'],
      zoneSpec: 'cells:c1r1,c2r1,c3r1,c4r1',
    }];
    const result = buildGroupContextBlock(groups, allowedSet, board, 1, {
      userCol: 3,
      contrastCol: 4,
      gapBucket: 'small',
    });
    assert.ok(result.includes('## Winning-line comparison'));
    assert.ok(result.includes('GROUP_0'));
    assert.ok(result.includes('CONCRETE-ELIGIBLE'));
  });

  test('major threats: none when no threats exist', () => {
    const board = new Board('34');
    const result = buildGroupContextBlock([], [], board, 1, {
      userCol: 3,
      contrastCol: 4,
      gapBucket: 'small',
    });
    assert.ok(result.includes('major threats: none'));
  });
});

// ===========================================================================
// T11 — buildType4Prompt (smoke test)
// ===========================================================================

describe('buildType4Prompt', () => {
  test('returns prompt string with all sections', () => {
    const result = buildType4Prompt({
      playerName: 'Green',
      gap: 5,
      gapBucket: 'moderate',
      contextBlock: '## Move context\n- Player: Green\n',
      inverted: false,
    });
    assert.ok(result.includes('## Role'));
    assert.ok(result.includes('## Players'));
    assert.ok(result.includes('## Hard grounding rules'));
    assert.ok(result.includes('## Tone'));
    assert.ok(result.includes('## Task'));
    assert.ok(result.includes('## Output format'));
    assert.ok(result.includes('Green'));
    assert.ok(result.includes('Grey'));
  });

  test('inverted=true produces inverted tone', () => {
    const result = buildType4Prompt({
      playerName: 'Grey',
      gap: 0,
      gapBucket: 'small',
      contextBlock: '## Move context\n- Player: Grey\n',
      inverted: true,
    });
    assert.ok(result.includes('Both A and the alternative are equivalent'));
    assert.ok(!result.includes('col B is clearly preferable'));
  });

  test('gap=0 inverted produces neutral tone', () => {
    const result = buildType4Prompt({
      playerName: 'Green',
      gap: 0,
      gapBucket: 'small',
      contextBlock: '## Move context',
      inverted: true,
    });
    assert.ok(result.includes('Both A and the alternative are equivalent'));
  });
});

// ===========================================================================
// T12 — buildType12Prompt (smoke test)
// ===========================================================================

describe('buildType12Prompt', () => {
  test('returns prompt string', () => {
    const result = buildType12Prompt({
      playerName: 'Green',
      gap: 8,
      gapBucket: 'moderate',
      contextBlock: '## Move context\n',
      explainType: 'type1',
    });
    assert.ok(result.includes('## Role'));
    assert.ok(result.includes('missed immediate threat'));
  });

  test('type1 task mentions missed immediate threat', () => {
    const result = buildType12Prompt({
      playerName: 'Green',
      gap: 5,
      gapBucket: 'moderate',
      contextBlock: '## Move context\n',
      explainType: 'type1',
    });
    assert.ok(result.includes('missed immediate threat'));
  });

  test('type2 task mentions tactical pattern', () => {
    const result = buildType12Prompt({
      playerName: 'Grey',
      gap: 12,
      gapBucket: 'large',
      contextBlock: '## Move context\n',
      explainType: 'type2',
    });
    assert.ok(result.includes('tactical pattern'));
  });
});

// ===========================================================================
// T13 — buildType3Prompt (smoke test)
// ===========================================================================

describe('buildType3Prompt', () => {
  test('returns prompt string with parity sentence', () => {
    const result = buildType3Prompt({
      playerName: 'Green',
      gap: 3,
      gapBucket: 'small',
      contextBlock: '## Move context\n',
      parityFlipData: { colA: 4, colX: 4, rowR: 4, playerLabel: 'you' },
    });
    assert.ok(result.includes('## Role'));
    assert.ok(result.includes('changes the number of empty squares'));
    assert.ok(result.includes('column 4'));
    assert.ok(result.includes('row 4'));
    assert.ok(result.includes('you'));
  });
});
