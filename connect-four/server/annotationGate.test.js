// Regression harness for annotationGate.js.
// Uses node:test + node:assert/strict (project convention — no Jest).
// All fixtures are deterministic synthetic positions.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAnnotation,
  checkP1,
  checkP2,
  checkP3,
  checkP5,
  checkP6,
  checkP5Strong,
  getWindowsThroughCell,
  isWindowBlocked,
} from './annotationGate.js';
import { Board } from './classifier.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake board object compatible with annotationGate's board.board[row][col] API.
 * Useful for P5 tests where we need a specific blocked/unblocked configuration that
 * cannot easily be expressed as a valid Connect Four movestring.
 *
 * @param {number[][]} grid  board[row][col] where row 0 = bottom; values 0/1/2.
 * @returns {{ board: number[][] }}
 */
function makeFakeBoard(grid) {
  return { board: grid };
}

/**
 * Create a board where all cells are player 2 except the target cell (col=3, row=2)
 * which is player 1. This guarantees every 4-window through (3,2) contains both
 * player 1 (at (3,2)) and player 2 (at all surrounding cells) → all windows blocked.
 *
 * Used for P5 FAIL tests (c4r3 in 1-indexed = col=3, row=2 in 0-indexed).
 */
function makeBlockedAt3_2() {
  const grid = Array.from({ length: 6 }, () => Array(7).fill(2));
  grid[2][3] = 1; // target cell = player 1; all others = player 2
  return makeFakeBoard(grid);
}

// Board where (col=3, row=2) = c4r3 (1-indexed) has all 13 windows blocked.
// Every window through this cell contains (3,2)=player1 and at least one neighbor=player2.
const BLOCKED_BOARD = makeBlockedAt3_2();

// Reference-only: 35-move alternating board (not used for P5 blocking tests)
const DENSE_MOVESTRING = '01234560123456012345601234560123456'; // 35 moves

// ---------------------------------------------------------------------------
// P1 — spec syntax and bounds
// ---------------------------------------------------------------------------

describe('checkP1', () => {
  test('unknown spec format → P1:invalid_spec', () => {
    const failures = checkP1([{ spec: 'foo', innerText: 'text' }]);
    assert.ok(
      failures.some(f => f.startsWith('P1:invalid_spec')),
      `expected P1:invalid_spec in ${JSON.stringify(failures)}`
    );
  });

  test('out-of-bounds col8 → P1:empty', () => {
    // col8 is valid syntax but expands to [] (out of bounds)
    const failures = checkP1([{ spec: 'col8', innerText: 'x' }]);
    assert.ok(
      failures.some(f => f.startsWith('P1:empty')),
      `expected P1:empty in ${JSON.stringify(failures)}`
    );
  });

  test('tg → no failures', () => {
    const failures = checkP1([{ spec: 'tg', innerText: 'x' }]);
    assert.deepEqual(failures, []);
  });

  test('valid col4 → no failures', () => {
    const failures = checkP1([{ spec: 'col4', innerText: 'x' }]);
    assert.deepEqual(failures, []);
  });

  test('valid c4r3 → no failures', () => {
    const failures = checkP1([{ spec: 'c4r3', innerText: 'x' }]);
    assert.deepEqual(failures, []);
  });
});

// ---------------------------------------------------------------------------
// P2 — column reference consistency  [fixture 58f99d33]
// ---------------------------------------------------------------------------

describe('checkP2', () => {
  test('58f99d33: col mismatch — zone col4 but text references column 3 → P2:col_mismatch:col4', () => {
    const zones = [{ spec: 'col4', innerText: 'Play in column 3 to set up the threat' }];
    const failures = checkP2(zones, new Map());
    assert.ok(
      failures.includes('P2:col_mismatch:col4'),
      `expected P2:col_mismatch:col4 in ${JSON.stringify(failures)}`
    );
  });

  test('zone col4, text references column 4 → no failures', () => {
    const zones = [{ spec: 'col4', innerText: 'Play in column 4 to set up the threat' }];
    const failures = checkP2(zones, new Map());
    assert.deepEqual(failures, []);
  });

  test('non-col zone → skipped by P2', () => {
    const zones = [{ spec: 'c4r3', innerText: 'column 5 is mentioned here' }];
    const failures = checkP2(zones, new Map());
    assert.deepEqual(failures, []);
  });
});

// ---------------------------------------------------------------------------
// P3 — forbidden terminology  [6 synthetic fixtures]
// ---------------------------------------------------------------------------

describe('checkP3', () => {
  test('e094ee00: standalone R disc notation → P3:disc_notation', () => {
    const failures = checkP3('The R disc at position four blocks the threat.');
    assert.ok(failures.includes('P3:disc_notation'), `got: ${JSON.stringify(failures)}`);
  });

  test('b6071ab4: player name "Red" → P3:player_name', () => {
    const failures = checkP3('Red has a strong position in the center.');
    assert.ok(failures.includes('P3:player_name'), `got: ${JSON.stringify(failures)}`);
  });

  test('5a10047c: "Yellow" → P3:player_name (but "force a win" ≠ "forced win", no engine_jargon)', () => {
    const failures = checkP3('Yellow can now force a win by playing here.');
    assert.ok(failures.includes('P3:player_name'), `got: ${JSON.stringify(failures)}`);
    assert.ok(!failures.includes('P3:engine_jargon'), `should NOT include engine_jargon: ${JSON.stringify(failures)}`);
  });

  test('972f74e1: "forced win" phrase → P3:engine_jargon', () => {
    const failures = checkP3('This move creates a forced win for the current player.');
    assert.ok(failures.includes('P3:engine_jargon'), `got: ${JSON.stringify(failures)}`);
  });

  test('092f4340: "the solver" phrase → P3:engine_jargon', () => {
    const failures = checkP3('According to the solver, this is the best move.');
    assert.ok(failures.includes('P3:engine_jargon'), `got: ${JSON.stringify(failures)}`);
  });

  test('0f0d66b3: "forced_win" pattern → P3:engine_jargon', () => {
    const failures = checkP3('The forced_win pattern is established here.');
    assert.ok(failures.includes('P3:engine_jargon'), `got: ${JSON.stringify(failures)}`);
  });

  test('clean text → no P3 failures', () => {
    const failures = checkP3('Playing in this column builds a strong threat.');
    assert.deepEqual(failures, []);
  });
});

// ---------------------------------------------------------------------------
// P5 — blocked 4-windows  [fixtures e86eeac9, 8d83947e, 403a21c9]
// ---------------------------------------------------------------------------

describe('checkP5', () => {
  test('e86eeac9: BLOCKED_BOARD, zone c4r3 — all windows blocked → P5:blocked:c4r3', () => {
    // c4r3 (1-indexed) = col=3, row=2 (0-indexed)
    // BLOCKED_BOARD has (col=3,row=2)=player1 and all others=player2,
    // so every 4-window through (3,2) contains both players → all blocked.
    const failures = checkP5(BLOCKED_BOARD, [{ spec: 'c4r3', innerText: 'blocked cell' }]);
    assert.ok(
      failures.includes('P5:blocked:c4r3'),
      `expected P5:blocked:c4r3 in ${JSON.stringify(failures)}`
    );
  });

  test('8d83947e: BLOCKED_BOARD, cells:c4r3 (single cell in cells format) — blocked → P5:blocked', () => {
    // cells:c4r3 exercises the `cells:` spec parsing path.
    // col=3,row=2 has all windows blocked in BLOCKED_BOARD (all=2 except (3,2)=1).
    const failures = checkP5(BLOCKED_BOARD, [{ spec: 'cells:c4r3', innerText: 'key cell' }]);
    assert.ok(
      failures.some(f => f.startsWith('P5:blocked')),
      `expected P5:blocked in ${JSON.stringify(failures)}`
    );
  });

  // Deferred to Epic B — passes Epic A gate
  test('403a21c9: empty board, zone c4r3 — all windows live → no failures', () => {
    const board = new Board('');
    const failures = checkP5(board, [{ spec: 'c4r3', innerText: 'empty board' }]);
    assert.deepEqual(failures, []);
  });

  test('tg zone → vacuously valid (no failures)', () => {
    const failures = checkP5(BLOCKED_BOARD, [{ spec: 'tg', innerText: 'a major threat' }]);
    assert.deepEqual(failures, []);
  });
});

// ---------------------------------------------------------------------------
// P6 — raw coordinates in zone text  [synthetic fixtures]
// ---------------------------------------------------------------------------

describe('checkP6', () => {
  test('PASS: c4r3 zone with descriptive text → no failures', () => {
    const failures = checkP6([{ spec: 'c4r3', innerText: 'the cell on row 3' }]);
    assert.deepEqual(failures, []);
  });

  test('PASS: col4 zone with descriptive text → no failures', () => {
    const failures = checkP6([{ spec: 'col4', innerText: 'this column' }]);
    assert.deepEqual(failures, []);
  });

  test('FAIL: c4r3 zone with raw coord "c4r3" in text → P6:raw_coordinate:c4r3', () => {
    const failures = checkP6([{ spec: 'c4r3', innerText: 'c4r3' }]);
    assert.ok(failures.includes('P6:raw_coordinate:c4r3'), `got: ${JSON.stringify(failures)}`);
  });

  test('FAIL: col4 zone with raw coord "col4" in text → P6:raw_coordinate:col4', () => {
    const failures = checkP6([{ spec: 'col4', innerText: 'col4' }]);
    assert.ok(failures.includes('P6:raw_coordinate:col4'), `got: ${JSON.stringify(failures)}`);
  });

  test('FAIL: c4r3 zone, "look at c4r3 carefully" → P6:raw_coordinate:c4r3', () => {
    const failures = checkP6([{ spec: 'c4r3', innerText: 'look at c4r3 carefully' }]);
    assert.ok(failures.includes('P6:raw_coordinate:c4r3'), `got: ${JSON.stringify(failures)}`);
  });

  test('FAIL: col4 zone, "play col4 here" → P6:raw_coordinate:col4', () => {
    const failures = checkP6([{ spec: 'col4', innerText: 'play col4 here' }]);
    assert.ok(failures.includes('P6:raw_coordinate:col4'), `got: ${JSON.stringify(failures)}`);
  });
});

// ---------------------------------------------------------------------------
// validateAnnotation — integration tests
// ---------------------------------------------------------------------------

describe('validateAnnotation', () => {
  test('59a11a79: clean col4 zone on empty board → valid: true', () => {
    const explanation = '[zone:col4]Play in this column to extend your threat.[/zone:col4]';
    const board = new Board('');
    const result = validateAnnotation(explanation, board);
    assert.equal(result.valid, true, `failures: ${JSON.stringify(result.failures)}`);
  });

  test('f4241ea6: clean c4r3 zone on empty board → valid: true', () => {
    const explanation = '[zone:c4r3]This cell is the key position in the center.[/zone:c4r3]';
    const board = new Board('');
    const result = validateAnnotation(explanation, board);
    assert.equal(result.valid, true, `failures: ${JSON.stringify(result.failures)}`);
  });

  test('explanation with "Red" in text → valid: false, includes P3:player_name', () => {
    const explanation = '[zone:col4]Red has played here.[/zone:col4]';
    const board = new Board('');
    const result = validateAnnotation(explanation, board);
    assert.equal(result.valid, false);
    assert.ok(result.failures.includes('P3:player_name'), `failures: ${JSON.stringify(result.failures)}`);
  });

  test('blocked zone (BLOCKED_BOARD) → valid: false, includes P5:blocked:c4r3', () => {
    const explanation = '[zone:c4r3]This cell is blocked.[/zone:c4r3]';
    const result = validateAnnotation(explanation, BLOCKED_BOARD);
    assert.equal(result.valid, false);
    assert.ok(result.failures.includes('P5:blocked:c4r3'), `failures: ${JSON.stringify(result.failures)}`);
  });

  test('no zones, clean text → valid: true', () => {
    const explanation = 'This position is interesting.';
    const board = new Board('');
    const result = validateAnnotation(explanation, board);
    assert.equal(result.valid, true);
  });
});

// ---------------------------------------------------------------------------
// Helper unit tests — getWindowsThroughCell + isWindowBlocked
// ---------------------------------------------------------------------------

describe('getWindowsThroughCell', () => {
  test('center cell (3,3) → more than 10 windows', () => {
    const windows = getWindowsThroughCell(3, 3);
    assert.ok(windows.length > 10, `expected >10 windows, got ${windows.length}`);
  });

  test('corner cell (0,0) → exactly 3 windows', () => {
    // From (0,0): only 1 horizontal window (cols 0-3), 1 vertical window (rows 0-3),
    // 1 diagonal-up window (col0r0, col1r1, col2r2, col3r3), 0 diagonal-down windows.
    const windows = getWindowsThroughCell(0, 0);
    assert.equal(windows.length, 3, `expected 3 windows at corner, got ${windows.length}: ${JSON.stringify(windows)}`);
  });

  test('each window has exactly 4 cells', () => {
    const windows = getWindowsThroughCell(3, 3);
    for (const w of windows) {
      assert.equal(w.length, 4, `window should have 4 cells: ${JSON.stringify(w)}`);
    }
  });

  test('all windows contain the target cell', () => {
    const col = 3, row = 3;
    const windows = getWindowsThroughCell(col, row);
    for (const w of windows) {
      const hasTarget = w.some(c => c.col === col && c.row === row);
      assert.ok(hasTarget, `window missing target cell (${col},${row}): ${JSON.stringify(w)}`);
    }
  });
});

describe('isWindowBlocked', () => {
  test('empty board, horizontal window row0 cols 0-3 → false (live)', () => {
    const board = new Board('');
    const window = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    ];
    assert.equal(isWindowBlocked(board, window), false);
  });

  test('board from "0123" (R,Y,R,Y at row0 cols 0-3) → window blocked', () => {
    // Move 0: col0 player1(R), move 1: col1 player2(Y), move 2: col2 player1(R), move 3: col3 player2(Y)
    const board = new Board('0123');
    const window = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    ];
    assert.equal(isWindowBlocked(board, window), true);
  });

  test('board with only player1 discs — window all R → false (not blocked)', () => {
    // "0000" places 4 R discs in col0 rows 0-3
    const board = new Board('0000');
    // Horizontal window at row0 has only col0=R and cols 1-3 empty → not blocked
    const window = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    ];
    assert.equal(isWindowBlocked(board, window), false);
  });
});

// ---------------------------------------------------------------------------
// T17 — Strong-P5 gate unit tests (checkP5Strong)
// ---------------------------------------------------------------------------

describe('checkP5Strong', () => {
  const concreteAllowed = [
    { cells: ['c4r3', 'c5r3', 'c6r3', 'c7r3'], zoneSpec: 'cells:c4r3,c5r3,c6r3,c7r3' },
    { cells: ['c1r2', 'c2r2', 'c3r2', 'c4r2'], zoneSpec: 'cells:c1r2,c2r2,c3r2,c4r2' },
  ];
  const abstractAllowed = [
    { col: 3, parity: 'odd', zoneSpec: 'col4' },
  ];

  test('1: tg zone fails unconditionally', () => {
    const failures = checkP5Strong([{ spec: 'tg', innerText: 'this threat' }], concreteAllowed);
    assert.ok(failures.includes('P5strong:tg'));
  });

  test('2: col4 passes with ABSTRACT-ONLY entry col=3', () => {
    const failures = checkP5Strong([{ spec: 'col4', innerText: 'column 4' }], abstractAllowed);
    assert.equal(failures.length, 0);
  });

  test('3: c4r3 zone fails with ABSTRACT-ONLY only (no concrete cells)', () => {
    // c4r3 is in col 4 (1-indexed) = col 3 (0-indexed). Abstract entry has col:3.
    // But c4r3 is a cell-level spec, which requires concrete cells list.
    const failures = checkP5Strong([{ spec: 'c4r3', innerText: 'cell c4r3' }], abstractAllowed);
    assert.ok(failures.some(f => f.startsWith('P5strong:cell_not_allowed:c4r3')));
  });

  test('4: row3 zone passes with CONCRETE-ELIGIBLE entry containing row 2', () => {
    // row3 (1-indexed) = row 2 (0-indexed)
    // concreteAllowed[0] has c4r3 (col3,row2), c5r3 (col4,row2), etc. — all row 2
    const failures = checkP5Strong([{ spec: 'row3', innerText: 'row 3' }], concreteAllowed);
    assert.equal(failures.length, 0);
  });

  test('5: backward-compat — no allowedSet skips strong-P5', () => {
    const explanation = '[zone:tg]A threat[/zone:tg]';
    const board = new Board('');
    // Without allowedSet parameter (undefined) — old behavior
    const result1 = validateAnnotation(explanation, board);
    // With explicit null
    const result2 = validateAnnotation(explanation, board, null);
    // Both should be valid (tg passes P1, P5 vacuously, and no strong-P5)
    assert.equal(result1.valid, true);
    assert.equal(result2.valid, true);
  });

  test('6: checkP5Strong directly with synthetic zones', () => {
    // Test multiple zones: tg (fails) + col4 (passes with abstract)
    const zones = [
      { spec: 'tg', innerText: 'threat' },
      { spec: 'col4', innerText: 'col' },
      { spec: 'col8', innerText: 'out of bounds' }, // P5strong doesn't validate bounds
    ];
    const failures = checkP5Strong(zones, abstractAllowed);
    assert.ok(failures.includes('P5strong:tg'));
    // col4 should pass (abstract col=3)
    assert.ok(!failures.some(f => f.includes('col4')));
    // col8 is not in allowed set (abstract col=3 only)
    assert.ok(failures.some(f => f.startsWith('P5strong:col_not_allowed:col8')));
  });
});

// ---------------------------------------------------------------------------
// T20 — Regression harness extension
// ---------------------------------------------------------------------------

describe('T20 regression: validateAnnotation + allowedSet integration', () => {
  test('SC-002: explanation with out-of-bounds zone rejected when allowedSet provided', () => {
    const explanation = '[zone:tg]This threat is here[/zone:tg]';
    const board = new Board('');
    const allowedSet = [{ col: 3, parity: 'odd', zoneSpec: 'col4' }];
    const result = validateAnnotation(explanation, board, allowedSet);
    // tg always fails P5strong
    assert.equal(result.valid, false);
    assert.ok(result.failures.includes('P5strong:tg'));
  });

  test('SC-007: response shape includes no new fields from allowedSet', () => {
    // Verify that the response shape expected by clients is maintained.
    // The validateAnnotation function returns { valid, failures } — no
    // allowedSet leaks into the result.
    const explanation = '[zone:col4]Column 4[/zone:col4]';
    const board = new Board('');
    const allowedSet = [{ col: 3, parity: 'odd', zoneSpec: 'col4' }];
    const result = validateAnnotation(explanation, board, allowedSet);
    // Verify shape
    assert.equal(typeof result.valid, 'boolean');
    assert.ok(Array.isArray(result.failures));
    assert.equal(result.valid, true); // col4 matches abstract col=3
    // No extra fields
    assert.equal(Object.keys(result).length, 2);
    assert.equal(Object.keys(result).sort().join(','), 'failures,valid');
  });

  test('validateAnnotation + allowedSet rejects cell-level zone with abstract-only set', () => {
    // c4r3 (col=3, row=2) requires a CONCRETE-ELIGIBLE entry with that cell.
    // Abstract-only set cannot satisfy it.
    const explanation = '[zone:c4r3]this cell[/zone:c4r3]';
    const board = new Board('');
    const allowedSet = [{ col: 3, parity: 'odd', zoneSpec: 'col4' }];
    const result = validateAnnotation(explanation, board, allowedSet);
    assert.equal(result.valid, false);
    assert.ok(result.failures.some(f => f.startsWith('P5strong:cell_not_allowed')));
  });

  test('validateAnnotation + allowedSet with concrete set passes cell-level zone', () => {
    // c4r3 matches a CONCRETE-ELIGIBLE entry
    const explanation = '[zone:c4r3]this cell[/zone:c4r3]';
    const board = new Board('');
    const allowedSet = [
      { cells: ['c4r3', 'c5r3', 'c6r3', 'c7r3'], zoneSpec: 'cells:c4r3,c5r3,c6r3,c7r3' },
    ];
    const result = validateAnnotation(explanation, board, allowedSet);
    assert.equal(result.valid, true, `unexpected failures: ${JSON.stringify(result.failures)}`);
  });
});

