// reasonEngine.test.mjs — run the blunder-reason evidence engine on every fixture board and assert
// the evidence is internally sound. Fixture is committed & deterministic (build_fixture.mjs).
//
// Per row asserts:
//   - classified `case` === expectedCase (solver-ground-truth sign pair);
//   - both halves' completingCell parses to a real cell that is OCCUPIED on that half's
//     finalMovestring snapshot board (skipped only for the deferred parity_group half);
//   - each fwd-derived register equals registerOf(fwd) recomputed independently from the formula;
//   - for lose_to_faster_lose: gate.verdict / gate.exhaustive present and === expected.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, fwdOf, registerOf, REASON_CONFIG } from '../scripts/reason_audit/reasonEngine.mjs';
import { buildBoard, parseCell } from '../scripts/reason_audit/lib/boardUtils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../scripts/reason_audit/reason_fixture.jsonl');
const rows = readFileSync(FIXTURE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const VALID_REGISTERS = new Set(['immediate', 'forced_sequence', 'parity']);

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

// completingCell must be a real on-board coordinate occupied on its snapshot board.
function assertCellOnSnapshot(half, label) {
  if (!half) return;
  if (half.completingCell == null) {
    // tolerated for the deferred parity_group half, and for a conditional_swindle whose deviation
    // saves a DRAW (no single winning cell) rather than a win.
    assert.ok(['parity_group', 'conditional_swindle'].includes(half.kind),
      `${label}: null completingCell only allowed for parity_group / conditional_swindle, got ${half.kind}`);
    return;
  }
  const cell = parseCell(half.completingCell);
  assert.ok(cell, `${label}: completingCell "${half.completingCell}" must parse`);
  assert.ok(cell.c >= 0 && cell.c < 7 && cell.r >= 0 && cell.r < 6, `${label}: cell in bounds`);
  if (half.finalMovestring) {
    const { grid } = buildBoard(half.finalMovestring);
    assert.notEqual(grid[cell.r][cell.c], 0,
      `${label}: ${half.completingCell} must be OCCUPIED on snapshot ${half.finalMovestring}`);
    if (half.window) assert.ok(half.window.includes(half.completingCell), `${label}: completingCell in window`);
  }
}

for (const row of rows) {
  const name = `${row.expectedCase}/${row.bucket ?? ''} ${row.movestring} played ${row.playedCol}`;
  test(name, async () => {
    const r = await computeReason(row.movestring, row.playedCol, { solver });

    // 1) case matches solver ground truth
    assert.equal(r.case, row.expectedCase, 'classified case');

    // 2) both halves cite a real, occupied cell on their snapshot
    assertCellOnSnapshot(r.lostResource, 'lostResource');
    assertCellOnSnapshot(r.opponentPunishment, 'opponentPunishment');

    // valid register vocabulary
    for (const [lbl, half] of [['lostResource', r.lostResource], ['opponentPunishment', r.opponentPunishment]]) {
      if (half) assert.ok(VALID_REGISTERS.has(half.register), `${lbl}: register "${half.register}" valid`);
    }

    // 3) fwd-derived registers match the formula (only the walking, score-driven halves)
    const discs = row.movestring.length;
    if (row.expectedCase === 'win_to_draw') {
      assert.equal(r.lostResource.register, registerOf(fwdOf(r.bestScore, discs)), 'w2d lostResource register');
      assert.equal(r.opponentPunishment.kind, 'neutralization');
    } else if (row.expectedCase === 'win_to_lose') {
      assert.equal(r.lostResource.register, registerOf(fwdOf(r.bestScore, discs)), 'w2l lostResource register');
      assert.equal(r.opponentPunishment.register, registerOf(fwdOf(r.playedScore, discs)), 'w2l oppPunish register');
    } else if (row.expectedCase === 'draw_to_lose') {
      assert.equal(r.opponentPunishment.register, registerOf(fwdOf(r.playedScore, discs)), 'd2l oppPunish register');
      assert.ok(['defensive_hold', 'parity_group'].includes(r.lostResource.kind), 'd2l lostResource kind');
    } else if (row.expectedCase === 'lose_to_faster_lose') {
      // 4) gate verdict/flag present and correct
      assert.ok(r.gate, 'ltfl gate present');
      assert.equal(r.gate.exhaustive, row.expectedExhaustive, 'gate exhaustive flag');
      assert.equal(r.gate.verdict, row.expectedGate, 'gate verdict');
      assert.equal(r.notABlunder, row.expectedGate === 'NotABlunder', 'notABlunder mirrors gate verdict');
      if (row.expectedGate === 'Blunder') {
        assert.equal(r.lostResource.kind, 'conditional_swindle', 'ltfl lostResource kind');
        const w = r.gate.witness;
        assert.equal(r.lostResource.register, registerOf(fwdOf(w.devVal, w.node.length)), 'ltfl swindle register');
        assert.equal(r.opponentPunishment.register, registerOf(fwdOf(r.playedScore, discs)), 'ltfl oppPunish register');
      } else {
        assert.equal(r.lostResource, null, 'NotABlunder => no halves');
        assert.equal(r.opponentPunishment, null);
      }
    }
  });
}
