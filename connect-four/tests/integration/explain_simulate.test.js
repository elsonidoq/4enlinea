// Integration tests for explainSimulate — uses the real c4solver binary.
// Principle III: solver-dependent features MUST have integration tests with the real solver.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { Board } from '../../server/classifier.js';
import { explainSimulate } from '../../server/explainSimulate.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('explainSimulate — structure invariants', () => {
  // Position just before figure_7/j_shape is detectable:
  //   '3333331465455' (13 moves) + col 1 → '33333314654551' (14 moves, Red to play)
  //   detectFigure7 matches on '33333314654551' (verified in figure7_jshape.test.js)
  const FIGURE7_POS  = '33333314654551';  // figure_7 detectable at this position
  const ANCHOR_COL   = 1;
  const ANCHOR_ROW   = new Board('3333331465455').colHeights[1]; // row where col1 lands

  test('returns correct top-level shape', async () => {
    const anchorCell = { col: ANCHOR_COL, row: ANCHOR_ROW };
    const result = await explainSimulate(FIGURE7_POS, 2, anchorCell, 1, solver);

    assert.equal(typeof result.totalLeaves, 'number');
    assert.ok(result.totalLeaves >= 1, 'must have at least one leaf');
    assert.deepEqual(result.anchorCell, anchorCell);
    assert.equal(result.perspective, 1);
    assert.equal(typeof result.patterns, 'object');
  });

  test('all 11 pattern names are present in output', async () => {
    const expected = [
      'immediate_threat', 'double_threat', 'forced_block', 'forced_win',
      'forbidden_columns', 'z_threat', 'undercut', 'overcut',
      'figure_7', 'j_shape', 'claimeven',
    ];
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    for (const name of expected) {
      assert.ok(name in result.patterns, `pattern "${name}" missing`);
    }
  });

  test('frequency ≤ total for every pattern', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    for (const [name, entry] of Object.entries(result.patterns)) {
      assert.ok(entry.frequency <= entry.total,
        `${name}: frequency ${entry.frequency} > total ${entry.total}`);
    }
  });

  test('ratio = frequency / total for every pattern', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    for (const [name, entry] of Object.entries(result.patterns)) {
      const expected = entry.total > 0 ? entry.frequency / entry.total : 0;
      assert.ok(Math.abs(entry.ratio - expected) < 1e-10,
        `${name}: ratio ${entry.ratio} ≠ ${expected}`);
    }
  });

  test('withAnchorDisc + withoutAnchorDisc = frequency for every pattern', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    for (const [name, entry] of Object.entries(result.patterns)) {
      assert.equal(
        entry.withAnchorDisc + entry.withoutAnchorDisc, entry.frequency,
        `${name}: withAnchor + withoutAnchor ≠ frequency`
      );
    }
  });

  test('claimeven frequency is always 0 (excluded from simulation)', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    assert.equal(result.patterns.claimeven.frequency, 0,
      'claimeven must always be 0 in simulation (excluded for cost reasons)');
  });

  test('coordinate patterns have cellHistogram, directional have colHistogram', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    const coordPatterns = ['z_threat', 'undercut', 'overcut', 'figure_7', 'j_shape'];
    const direcPatterns = ['immediate_threat', 'double_threat', 'forced_block', 'forced_win', 'forbidden_columns'];
    for (const name of coordPatterns) {
      assert.ok('cellHistogram' in result.patterns[name], `${name} should have cellHistogram`);
      assert.ok(!('colHistogram' in result.patterns[name]), `${name} should not have colHistogram`);
    }
    for (const name of direcPatterns) {
      assert.ok('colHistogram' in result.patterns[name], `${name} should have colHistogram`);
      assert.ok(!('cellHistogram' in result.patterns[name]), `${name} should not have cellHistogram`);
    }
  });
});

describe('explainSimulate — tactical detection', () => {
  // '33333314654551': figure_7 is detectable at this position for Red (player 1)
  const FIGURE7_POS = '33333314654551';
  const ANCHOR_COL  = 1;
  const ANCHOR_ROW  = new Board('3333331465455').colHeights[1];

  test('figure_7 appears in at least one leaf from the figure_7 setup position', async () => {
    // Perspective=1 (Red), numPlies=2 → leaves at length 16 (even = Red to move)
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    assert.ok(result.patterns.figure_7.frequency > 0,
      `expected figure_7 frequency > 0, got ${result.patterns.figure_7.frequency}`);
  });

  test('totalLeaves matches tree branching (1–27 for numPlies=2)', async () => {
    const result = await explainSimulate(FIGURE7_POS, 2, { col: ANCHOR_COL, row: ANCHOR_ROW }, 1, solver);
    assert.ok(result.totalLeaves >= 1 && result.totalLeaves <= 27,
      `totalLeaves ${result.totalLeaves} out of expected range 1–27`);
  });
});

describe('explainSimulate — terminal position', () => {
  // Won position: '0414243' — Red (P1) plays cols 0,1,2,3 at row 0 while Yellow plays col4.
  // After move 6 (P1 plays col3), P1 has a horizontal four-in-a-row at row 0.
  const WON_POS = '0414243'; // Red wins horizontally at row 0
  const ANCHOR  = { col: 3, row: 0 }; // row where last Red disc landed (col3, row0)

  test('totalLeaves = 1 on a won position regardless of numPlies', async () => {
    const result = await explainSimulate(WON_POS, 4, ANCHOR, 1, solver);
    assert.equal(result.totalLeaves, 1,
      'won position must be treated as a single leaf regardless of numPlies');
  });

  test('all pattern frequencies are 0 on a won position (no solver-based patterns fire)', async () => {
    const result = await explainSimulate(WON_POS, 2, ANCHOR, 1, solver);
    for (const [name, entry] of Object.entries(result.patterns)) {
      assert.equal(entry.frequency, 0,
        `${name} frequency should be 0 on won position, got ${entry.frequency}`);
    }
  });
});

describe('explainSimulate — numPlies=0', () => {
  const POS     = '33334';
  const ANCHOR  = { col: 3, row: 4 };

  test('numPlies=0 returns exactly 1 leaf (the current position)', async () => {
    const result = await explainSimulate(POS, 0, ANCHOR, 1, solver);
    assert.equal(result.totalLeaves, 1);
  });
});
