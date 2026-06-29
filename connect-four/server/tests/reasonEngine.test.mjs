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
  if (half.terminal === 'fork') {
    // a fork's completingCell is an EMPTY pending threat (not yet played); assert it is one of the
    // fork's completing cells rather than an occupied square.
    assert.ok(half.forkCells && half.forkCells.includes(half.completingCell),
      `${label}: fork completingCell ${half.completingCell} must be in forkCells ${JSON.stringify(half.forkCells)}`);
    return;
  }
  if (half.completingCell == null) {
    // tolerated for the deferred parity_group half, for a conditional_swindle whose deviation
    // saves a DRAW (no single winning cell) rather than a win, and for a denial where the
    // opponent never occupies a fork-window cell within the depth cap (verdict=no_occupation).
    assert.ok((['parity_group', 'conditional_swindle'].includes(half.kind)
               || (half.kind === 'denial' && half.verdict !== 'occupation')),
      `${label}: null completingCell only allowed for parity_group / conditional_swindle / denial, got ${half.kind}`);
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
    // D16: a fork half derives its register from the fork node, not the root fwd formula — so the
    // fwd-formula assertions apply only to halves that walked all the way to a single completed four.
    const regFromFwd = (half, score) => {
      if (half.terminal === 'fork') {
        assert.notEqual(half.register, 'parity', 'fork register must not be parity');
        assert.ok(['immediate', 'forced_sequence'].includes(half.register), 'fork register is tactical');
      } else {
        assert.equal(half.register, registerOf(fwdOf(score, discs)));
      }
    };
    if (row.expectedCase === 'win_to_draw') {
      regFromFwd(r.lostResource, r.bestScore);
      // D14: fork win_to_draw uses denial search; genuine-parity win_to_draw keeps neutralization.
      if (r.lostResource.terminal === 'fork') {
        assert.equal(r.opponentPunishment.kind, 'denial');
      } else {
        assert.equal(r.opponentPunishment.kind, 'neutralization');
      }
    } else if (row.expectedCase === 'win_to_lose') {
      regFromFwd(r.lostResource, r.bestScore);
      regFromFwd(r.opponentPunishment, r.playedScore);
    } else if (row.expectedCase === 'draw_to_lose') {
      regFromFwd(r.opponentPunishment, r.playedScore);
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
        if (r.lostResource.terminal === 'fork') {
          assert.ok(['immediate', 'forced_sequence'].includes(r.lostResource.register), 'ltfl swindle fork register');
        } else {
          assert.equal(r.lostResource.register, registerOf(fwdOf(w.devVal, w.node.length)), 'ltfl swindle register');
        }
        regFromFwd(r.opponentPunishment, r.playedScore);
      } else {
        assert.equal(r.lostResource, null, 'NotABlunder => no halves');
        assert.equal(r.opponentPunishment, null);
      }
    }
  });
}

// ── D16 fork-stop: the lost-resource walk halts at the deciding double-threat fork (not the
// completed four). Two sourced fixtures, one per detectDoubleThreat case (I12 counterexample per case).
test('D16 Case A: 214444115623 played 4 -> double_threat fork, not parity', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.case, 'win_to_draw', 'case');
  assert.equal(r.lostResource.terminal, 'fork', 'lostResource stops at a fork');
  assert.notEqual(r.lostResource.register, 'parity', 'a forced tactical fork must NOT be register=parity');
  assert.equal(r.lostResource.tacticTag, 'double_threat', 'Case A (>=2 gravity-top columns) names double_threat');
  assert.ok(r.lostResource.forkCells.includes('c4r3') && r.lostResource.forkCells.includes('c6r4'),
    `fork completing cells include c4r3 & c6r4, got ${JSON.stringify(r.lostResource.forkCells)}`);
  // the opponent's saving reply sits on a constituent cell of the fork the best move was building
  assert.ok(r.opponentPunishment.tie.sharedCells.includes('c3r3'),
    `tie shares c3r3 (fork constituent), got ${JSON.stringify(r.opponentPunishment.tie.sharedCells)}`);
});

test('D16 Case B: 3333344440625621503122 played 6 -> figure_7 stacked fork, not parity', async () => {
  const r = await computeReason('3333344440625621503122', 6, { solver });
  assert.equal(r.case, 'win_to_draw', 'case');
  assert.equal(r.lostResource.terminal, 'fork', 'lostResource stops at a fork');
  assert.notEqual(r.lostResource.register, 'parity', 'a stacked figure_7 fork must NOT be register=parity');
  // Case B (1 column, stacked) prefers the more specific figure_7 over the co-present double_threat tag
  assert.equal(r.lostResource.tacticTag, 'figure_7', 'Case B names figure_7');
  assert.ok(r.lostResource.forkCells.includes('c1r3'),
    `stacked fork includes gravity-top cell c1r3, got ${JSON.stringify(r.lostResource.forkCells)}`);
});
