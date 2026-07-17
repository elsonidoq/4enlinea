import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { realizedPattern, realizedDeniedReason, computeReason } from '../scripts/reason_engine/reasonEngine.mjs';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

// 3321234543: Gray (player 2) holds an immediate threat at c4r5 (vertical c4r2..c4r5).
// tagBlunder tags this forced_block/defensive_miss; the OWNER of the threat is the opponent (player 2).
test('realizedPattern: immediate_threat window for the threat owner', () => {
  const rp = realizedPattern('3321234543', 2, 'immediate_threat');
  assert.ok(rp, 'pattern present');
  assert.equal(rp.completingCell, 'c4r5');
  assert.ok(rp.windows.some((w) => w.includes('c4r5') && w.includes('c4r2')), 'vertical window present');
});

// The D16 Case-A double_threat fixture (reasonEngine.test.mjs "D16 Case A: 214444115623 played 4").
// The brief's naive root+playedCol string ("2144441156234") is NOT the fork board: solver best-move
// on '214444115623' is col 2 (score 9), not col 4 (score 0, the blunder), and the deciding fork only
// materializes 10 plies into the forced best-play line, not at ply+1. Sourced directly from
// computeReason('214444115623', 4, { solver }).lostResource.finalMovestring (verified against the
// production D16 test's expected forkCells c4r3/c6r4).
test('realizedPattern: double_threat fork windows via detectForkAt', () => {
  const rp = realizedPattern('21444411562322311656615', 1, 'double_threat');
  assert.ok(rp, 'fork present');
  assert.ok(rp.windows.length >= 1, 'at least one fork window');
  assert.ok(rp.cells.length >= 1, 'fork completing cells present');
  assert.ok(rp.cells.includes('c4r3') && rp.cells.includes('c6r4'),
    `fork completing cells include c4r3 & c6r4, got ${JSON.stringify(rp.cells)}`);
});

function baseOut(movestring, playedCol, bestCol, scores) {
  const discs = movestring.length;
  const player = (discs % 2 === 0) ? 1 : 2;
  return {
    movestring, playedCol, bestCol, scores, discs, boardState: 'opening',
    player, opponent: player === 1 ? 2 : 1,
    bestScore: scores[bestCol], playedScore: scores[playedCol],
    case: null, notABlunder: false, lostResource: null, opponentPunishment: null,
    replyHistogram: null, gate: null,
  };
}

test('realizedDeniedReason: 3321234543 defensive_miss -> block c4r5 is lostResource, opp completes c4r5', async () => {
  const scores = [-16,-16,-16,-4,-16,-16,-16];
  const out = baseOut('3321234543', 0, 3, scores);
  const r = await realizedDeniedReason(out, 'forced_block', 'defensive_miss', { solver });
  assert.equal(r.route, 'realized_denied');
  // opponent owns the threat -> realized half is the opponentPunishment (the threat handed over)
  assert.equal(r.opponentPunishment.kind, 'realized_pattern');
  assert.equal(r.opponentPunishment.completingCell, 'c4r5');
  // the defense you had -> lostResource is the denial (you occupy/block c4r5 on the correct line)
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.completingCell, 'c4r5');
  assert.equal(r.lostResource.verdict, 'occupation');
});

test('computeReason routes 3321234543 to realized_denied (not lose_to_faster_lose swindle)', async () => {
  const r = await computeReason('3321234543', 0, { solver });
  assert.equal(r.route, 'realized_denied');
  assert.equal(r.tag, 'forced_block');
  assert.equal(r.direction, 'defensive_miss');
  // D24 (review F1): this board is BOTH-LOSING (lose_to_faster_lose signs). The route still emits a
  // Blunder (the conceded forced_block is the lesson), but now CARRIES the swindle-gate verdict for
  // honest counterplay framing instead of the old `gate: null`. The route never suppresses; the gate
  // is diagnostic. (Non-losing routed boards — win_to_*/draw_to_lose signs — still get gate: null.)
  assert.ok(r.gate && r.gate.ran === true, 'both-losing routed board carries a gate verdict (D24)');
  assert.ok(['Blunder', 'NotABlunder'].includes(r.gate.verdict), 'carried gate verdict is valid');
  assert.equal(r.opponentPunishment.completingCell, 'c4r5');
});

test('D24: a non-losing routed board keeps gate: null (the swindle gate does not apply)', async () => {
  // 3321234543 is both-losing; a win_to_draw / draw_to_lose routed board must NOT run the gate.
  // 3325 played 5 is a win_to_draw double_threat that routes realized_denied (bestScore>0).
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.route, 'realized_denied');
  assert.ok(r.bestScore > 0, 'not a both-losing board');
  assert.equal(r.gate, null, 'gate is null on a non-both-losing routed board');
});

// ── Fix B (D30) I12: sign `case` gates the L2/L3 outcome sentence, not patternOnAfterBestBoard. ──
// Each board is extracted verbatim from the frozen combined coverage answers (never hand-built) and
// driven end-to-end (computeReason -> toNarratorVector -> buildReasonRenderModel). The full
// enabled_opponent (tag, case) cell-space is covered: win_to_lose, draw_to_lose, lose_to_faster_lose.
// (win_to_draw + enabled_opponent is not sourced in the frozen sets — PROVISIONAL per I12 step 4;
// the L2 unit test in causalLinks.test.mjs asserts the routing predicate for it directly.)
async function renderFor(movestring, playedCol) {
  const raw = await computeReason(movestring, playedCol, { solver });
  const m = buildReasonRenderModel(toNarratorVector(raw));
  return { raw, m };
}

test('D30: win_to_lose enabled_opponent (eval-53) routes to L2 with best=win, NOT L3 (best truly wins)', async () => {
  const { raw, m } = await renderFor('253153335311554111534440620', 2);
  assert.equal(raw.case, 'win_to_lose');
  assert.equal(raw.direction, 'enabled_opponent');
  assert.notEqual(m.link.id, 'L3', 'must not route to the both-lose frame on a winning case');
  assert.equal(m.decision.bestOutcome, 'win');
  assert.doesNotMatch(m.link.text, /already losing|both moves? lose|loses faster/i);
});

test('D30: draw_to_lose enabled_opponent (eval-51) routes to L2 with best=draw, NOT L3 (best truly draws)', async () => {
  const { raw, m } = await renderFor('333330422356611124544555464661162210050', 0);
  assert.equal(raw.case, 'draw_to_lose');
  assert.equal(raw.direction, 'enabled_opponent');
  assert.notEqual(m.link.id, 'L3', 'must not route to the both-lose frame on a drawing case');
  assert.equal(m.decision.bestOutcome, 'draw');
  assert.doesNotMatch(m.link.text, /already losing|both moves? lose|loses faster/i);
});

test('D30: lose_to_faster_lose enabled_opponent (eval-23) STILL routes to L3 (both moves genuinely lose)', async () => {
  const { raw, m } = await renderFor('32556442454451212', 5);
  assert.equal(raw.case, 'lose_to_faster_lose');
  assert.equal(raw.direction, 'enabled_opponent');
  assert.equal(m.link.id, 'L3');
  assert.equal(m.decision.bestOutcome, 'loss');
  assert.equal(m.decision.playedOutcome, 'loss');
  assert.match(m.link.text, /didn't create it|work hardest|speeds up the finish/i);
  assert.doesNotMatch(m.link.text, /already losing|neither move wins/i);
});

test('computeReason keeps deep-fork 214444115623 on the sign engine (D18 witness c3r3 preserved)', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  // tagBlunder tags this board drawing_move (Phase C is 1-ply; the fork is 10 plies deep), so
  // realizedPattern cannot confirm double_threat in one move on the played root -> falls through
  // (Fix 1) to the sign-taxonomy engine rather than routing realized_denied.
  assert.notEqual(r.route, 'realized_denied', 'deep fork must not fast-path via realized_denied');
  // the sign-taxonomy engine still preserves the D18 occupation witness at c3r3.
  assert.equal(r.opponentPunishment.completingCell, 'c3r3', 'same occupation cell as D18');
});
