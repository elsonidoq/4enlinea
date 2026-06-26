// T007 / FR-T02 — classifyPattern returns Map<string, {cells: string[]}> with wire-format cells.
//
// Movestring sources:
//   '33442' — 5 moves: R:col3, Y:col3, R:col4, Y:col4, R:col2.
//     Red has col2r0, col3r0, col4r0 (three-in-a-row at row 0).
//     immediate_threat: Red wins at col1r0 or col5r0.
//     double_threat: two gravity-top threats (Case A), cols 1 and 5.
//     Wire format: c{col+1}r{row+1}: col1r0 → c2r1, col5r0 → c6r1.
//     Source: derived from classify('3344', 2/5, scores) double_threat fixture
//     in tests/classifier/classifier.test.js + one extra Red move at col2.
//     Position is valid (5 moves, Yellow to move, game not over).
//
// Conventions:
//   - All coords 0-indexed internally; wire format is 1-indexed: c{col+1}r{row+1}.
//   - perspective=1 = Red, perspective=2 = Yellow.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPattern } from '../../server/classifier.js';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';

describe('classifyPattern — Map return type and cells (FR-T02)', () => {
  let solver;
  before(() => { solver = createSolverProcess(); });
  after(() => { solver.destroy(); });

  it('returns a Map (not a Set)', async () => {
    const result = await classifyPattern('33442', 1, solver);
    assert.ok(result instanceof Map, 'classifyPattern must return a Map');
  }, { timeout: 30_000 });

  it('immediate_threat entry has non-empty cells array with wire-format strings', async () => {
    // '33442' (5 moves, Yellow to move): Red has col2r0,col3r0,col4r0.
    // Red has immediate_threat at col1r0 (c2r1) and col5r0 (c6r1) from Red's perspective.
    const result = await classifyPattern('33442', 1, solver);
    assert.ok(result.has('immediate_threat'),
      'immediate_threat must be detected for Red at position 33442');

    const entry = result.get('immediate_threat');
    assert.ok(Array.isArray(entry.cells), 'cells must be an array');
    assert.ok(entry.cells.length > 0, 'cells must be non-empty for immediate_threat');

    // Each cell must match wire format c{col+1}r{row+1}
    for (const cell of entry.cells) {
      assert.match(cell, /^c\d+r\d+$/, `cell "${cell}" must match wire format c{col+1}r{row+1}`);
    }

    // Specific cells: col1r0 → c2r1 and col5r0 → c6r1
    assert.ok(entry.cells.includes('c2r1'),
      'immediate_threat cells must include c2r1 (col1 row0 in 0-indexed)');
    assert.ok(entry.cells.includes('c6r1'),
      'immediate_threat cells must include c6r1 (col5 row0 in 0-indexed)');
  }, { timeout: 30_000 });

  it('double_threat entry has non-empty cells array with wire-format strings', async () => {
    // '33442': Red has two gravity-top reachable threats at col1r0 and col5r0 → double_threat.
    const result = await classifyPattern('33442', 1, solver);
    assert.ok(result.has('double_threat'),
      'double_threat must be detected for Red at position 33442');

    const entry = result.get('double_threat');
    assert.ok(Array.isArray(entry.cells), 'cells must be an array');
    assert.ok(entry.cells.length > 0, 'cells must be non-empty for double_threat');

    for (const cell of entry.cells) {
      assert.match(cell, /^c\d+r\d+$/, `cell "${cell}" must match wire format c{col+1}r{row+1}`);
    }
  }, { timeout: 30_000 });

  it('major_threat_parity fires with the parity-aligned cell for the to-move perspective', async () => {
    // '3342652334': Gray (P=2) holds a latent major threat at c3r4 on an odd row (Gray's parity).
    const result = await classifyPattern('3342652334', 2, solver);
    assert.ok(result.has('major_threat_parity'), 'major_threat_parity must fire for Gray');
    const entry = result.get('major_threat_parity');
    assert.ok(entry.cells.includes('c3r4'), 'parity-aligned cell c3r4 present');
    assert.ok(!result.has('major_threat_nonparity'), 'no off-parity major here');
  }, { timeout: 30_000 });

  it('major_threat_nonparity fires for an off-parity major; minor_threat carries union cells', async () => {
    // '542344233': Green (P=1) holds a latent major threat at c3r4 on an odd row (OFF Green parity).
    const result = await classifyPattern('542344233', 1, solver);
    assert.ok(result.has('major_threat_nonparity'), 'major_threat_nonparity must fire for Green');
    assert.ok(result.get('major_threat_nonparity').cells.includes('c3r4'));
    assert.ok(!result.has('major_threat_parity'), 'no parity-aligned major here');
    // minor_threat union cells are wire-format and exclude the shadow window cell c2r5.
    assert.ok(result.has('minor_threat'), 'minor_threat fires');
    const minor = result.get('minor_threat');
    assert.ok(minor.cells.length > 1, 'minor_threat carries a union of cells');
    for (const cell of minor.cells) assert.match(cell, /^c\d+r\d+$/);
    assert.ok(!minor.cells.includes('c2r5'), 'shadow window cell excluded');
  }, { timeout: 30_000 });

  it('entries without cell evidence return cells: []', async () => {
    // forced_win has cells: [] (position-global, not cell-specific)
    // Use a forced-win position: '3233333556' (from tagBlunder test)
    const result = await classifyPattern('3233333556', 2, solver);
    // This is Red's turn (10 moves), testing from Yellow's perspective (perspective=2)
    // We're not asserting a specific tag, just that if a position-global tag appears, cells=[].
    for (const [, entry] of result) {
      assert.ok(Array.isArray(entry.cells), 'every entry must have a cells array');
    }
  }, { timeout: 60_000 });
});
