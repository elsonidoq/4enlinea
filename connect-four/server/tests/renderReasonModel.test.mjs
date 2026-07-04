import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision } from '../scripts/renderReasonModel.mjs';

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
  const decision = m.boards.find((b) => b.id === 'decision');
  assert.ok(decision);
  assert.match(decision.ascii, /c1|col|\|/); // some board scaffold
});

test('assembled prompt contains the board and omits scores/movestring dump', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /Board/);
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/); // raw movestring is transformed into the board
});

test('assembled prompt renders composed frame text + guardrail + reading key', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(m.frames && m.frames[0].text.length > 0);
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /causal link L6/);          // machine marker preserved (computeConditionD test)
  assert.match(prompt, /forced win via c6r5/);     // composed L6 text present (NV's actual completingCell)
  assert.match(prompt, /Guardrail:/);
  assert.match(prompt, /# Reading key/);
  assert.match(prompt, /register:/);               // key explains a residual coded field
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});

test('assembled prompt leads with a canonical 1-indexed Decision block (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  // Decision block is at the TOP, before the boards.
  assert.ok(prompt.indexOf('# Decision') >= 0 && prompt.indexOf('# Decision') < prompt.indexOf('# Boards'));
  assert.match(prompt, /you = player 2/);
  // bestCol 3 -> display column 4, lands c4r5; playedCol 4 -> column 5, lands c5r2.
  assert.match(prompt, /Better move: column 4 \(lands at c4r5\)/);
  assert.match(prompt, /Played move: column 5 \(lands at c5r2\)/);
  // win_to_lose -> best win, played loss.
  assert.match(prompt, /Better move: column 4[^\n]*Outcome: win/);
  assert.match(prompt, /Played move: column 5[^\n]*Outcome: loss/);
});

test('assembled prompt never leaks 0-indexed bestCol/playedCol into the Vector facts JSON (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.doesNotMatch(prompt, /"bestCol"/);
  assert.doesNotMatch(prompt, /"playedCol"/);
});

test('rendered fields drop bestCol/playedCol (transformed via Decision block, Fix A)', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(!('bestCol' in m.rendered));
  assert.ok(!('playedCol' in m.rendered));
});

test('READING_KEY states the 1-indexed display-column convention (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /1-indexed display column/);
});

test('an unregistered field makes the model throw', () => {
  assert.throws(() => buildReasonRenderModel({ ...NV, opponentPunishment: { ...NV.opponentPunishment, brandNewField: 1 } }));
});

test('renderedFields prunes transformed/excluded subfields inside object arrays', () => {
  // window as an array of grounded-cell objects; `finalMovestring` (transformed) nested per element
  // must be dropped, while `cell`/`status` (render) survive.
  const m = buildReasonRenderModel({ ...NV,
    lostResource: { ...NV.lostResource,
      window: [{ cell: 'c4r3', status: 'empty', finalMovestring: 'zzz' },
               { cell: 'c5r4', status: 'occupied-you', finalMovestring: 'zzz' }] } });
  const w = m.rendered.lostResource.window;
  assert.equal(w[0].cell, 'c4r3');                 // render subfield kept
  assert.equal(w[0].status, 'empty');              // render subfield kept
  assert.ok(!('finalMovestring' in w[0]));          // transformed subfield dropped
});

test('assembled prompt renders selected boards each with a Tactics list', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(Array.isArray(m.boards) && m.boards.length >= 1);
  assert.ok(m.boards.every((b) => b.ascii && Array.isArray(b.tags) && b.reason));
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /Y = you \(player 2\)/);   // You/Opp board present
  assert.match(prompt, /Tactics:/);               // threat list section present
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});

test('buildRenderDecision assembles the full decision set from render helpers', () => {
  const rd = buildRenderDecision(NV); // NV from the top of this file (win_to_lose, sign, L6)
  assert.equal(rd.link.id, 'L6');
  assert.equal(rd.route, 'sign');
  assert.equal(rd.case, 'win_to_lose');
  assert.equal(rd.direction, null);              // sign route → no direction
  assert.equal(rd.patternOnAfterBestBoard, null); // only computed for enabled_opponent
  assert.ok(rd.boards.some((b) => b.id === 'decision' && b.shown === true));
  assert.ok(rd.boards.every((b) => typeof b.shown === 'boolean' && b.reason));
  // field partition classifies present leaves into exactly the three buckets
  const all = [...rd.fieldPartition.rendered, ...rd.fieldPartition.covered, ...rd.fieldPartition.excluded];
  assert.ok(all.includes('case'));                        // render
  assert.ok(rd.fieldPartition.covered.includes('route')); // L6 covers route (present code → hidden)
});

test('buildRenderDecision records branch-invariance + finalMovestring for enabled_opponent', () => {
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
    tag: 'double_threat',
    lostResource: { kind: 'denial', verdict: 'occupation' },
    opponentPunishment: { kind: 'realized_pattern', register: 'immediate', completingCell: 'c3r3',
                          window: ['c3r3', 'c4r3', 'c5r3', 'c6r3'], finalMovestring: '3413306133' },
  };
  const rd = buildRenderDecision(fv);
  assert.equal(rd.direction, 'enabled_opponent');
  assert.equal(typeof rd.patternOnAfterBestBoard, 'boolean'); // computed, not null
  assert.equal(rd.link.id, 'L3');                             // lose_to_faster_lose → branch-invariant
  assert.equal(rd.finalMovestring, '3413306133');            // opponent's line (no lostResource winning_line)
});
