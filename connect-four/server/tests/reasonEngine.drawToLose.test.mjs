// reasonEngine.drawToLose.test.mjs — TDD tests for the D18 draw_to_lose flip:
// half-a becomes an occupation-denial witness; tie is window-aware (tied vs independent).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('draw_to_lose ZUGZWANG: half-a denial occupies c4r6 of the opponent window; tie window-aware tied', async () => {
  const r = await computeReason('2444422235255630400333', 0, { solver });
  assert.equal(r.case, 'draw_to_lose');
  // half b (opponentPunishment) UNCHANGED: opponent's conceded winning line.
  assert.equal(r.opponentPunishment.kind, 'winning_line');
  assert.deepEqual(r.opponentPunishment.window, ['c4r6', 'c5r6', 'c6r6', 'c7r6']);
  // half a: the best move denies that window by the PLAYER occupying a cell of it.
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.verdict, 'occupation');
  assert.equal(r.lostResource.cell, 'c4r6');
  assert.ok(r.lostResource.window.includes('c4r6'));
  assert.ok(r.lostResource.finalMovestring && r.lostResource.line.length >= 1);
  // the constructive tie is now WINDOW-AWARE: c4r6 is inside the opponent's window -> tied (NOT independent).
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c4r6']);
});

test('draw_to_lose TACTICAL: half-a denial is a root occupation of holdCell; tie tied at c2r4', async () => {
  const r = await computeReason('3342652233354244431011', 0, { solver });
  assert.equal(r.case, 'draw_to_lose');
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.verdict, 'occupation');
  assert.equal(r.lostResource.cell, 'c2r4');
  assert.deepEqual(r.lostResource.line, []);                 // immediate: the best move IS the denial
  assert.equal(r.lostResource.register, 'immediate');
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c2r4']);
});
