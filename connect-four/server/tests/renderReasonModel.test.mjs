import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReasonRenderModel, assembleGroundedPrompt } from '../scripts/renderReasonModel.mjs';

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('buildReasonRenderModel classifies link and passes coverage', () => {
  const m = buildReasonRenderModel(NV);
  assert.equal(m.link.id, 'L6');
  assert.equal(m.coverage.ok, true);
  assert.equal(m.perspective.you, 2);
});

test('rendered fields keep render cells but drop transformed/excluded (path-precise)', () => {
  const m = buildReasonRenderModel({ ...NV, notABlunder: false,
    lostResource: { ...NV.lostResource, finalMovestring: '34133061334', exhaustive: true } });
  assert.equal(m.rendered.lostResource.completingCell, 'c6r5');      // render cell survives
  assert.ok(!('finalMovestring' in m.rendered.lostResource));         // transformed dropped
  assert.ok(!('exhaustive' in m.rendered.lostResource));              // excluded dropped
  assert.ok(!('notABlunder' in m.rendered));                          // excluded dropped
  assert.ok(!('movestring' in m.rendered));                          // transformed dropped
});

test('render model draws an ASCII decision board', () => {
  const m = buildReasonRenderModel(NV);
  assert.match(m.boards.decision.ascii, /c1|col|\|/); // some board scaffold
  assert.deepEqual(m.boards.decision.tags, []);       // untagged in P1
});

test('assembled prompt contains the board and omits scores/movestring dump', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /Board/);
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/); // raw movestring is transformed into the board
});

test('an unregistered field makes the model throw', () => {
  assert.throws(() => buildReasonRenderModel({ ...NV, opponentPunishment: { ...NV.opponentPunishment, brandNewField: 1 } }));
});
