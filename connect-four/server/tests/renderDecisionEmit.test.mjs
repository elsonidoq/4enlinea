import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { renderDecisionForCondition } from '../scripts/compute.mjs';
import { buildRenderDecision } from '../scripts/renderReasonModel.mjs';

const OPENING = JSON.parse(readFileSync(new URL('./fixtures/opening_vectors.json', import.meta.url)));

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('render_decision is emitted for condition D only', () => {
  const rd = renderDecisionForCondition(NV, 'D');
  assert.equal(rd.link.id, 'L6');
  assert.ok(Array.isArray(rd.boards));
  assert.equal(renderDecisionForCondition(NV, 'A'), null);
  assert.equal(renderDecisionForCondition(NV, 'C'), null);
});

test('render_decision returns null instead of throwing on an unroutable vector', () => {
  // no route/direction and no sign-matchable half → classifyCausalLink throws; helper swallows to null
  const bad = { movestring: '', playedCol: 0, bestCol: 1, player: 1, opponent: 2, case: 'win_to_draw' };
  assert.equal(renderDecisionForCondition(bad, 'D'), null);
});

test('render_decision carries an openingContext block with deepResourceGrounded false', () => {
  const rd = buildRenderDecision(OPENING.defense);
  assert.ok(rd.openingContext);
  assert.equal(rd.openingContext.kind, 'defense');
  assert.equal(rd.openingContext.frameId, 'O2');
  assert.equal(rd.openingContext.deepResourceGrounded, false);
  assert.equal(rd.openingContext.lead.holdCol, 3);   // bestDefenseCol 2 -> display 3
  assert.ok(['much_easier', 'easier', null].includes(rd.openingContext.centralityComparison.qualitative));
});

test('render_decision carries a zones block (aliases + terms, no zoneAliasMap)', () => {
  const rd = buildRenderDecision(NV);
  assert.ok(rd.zones);
  assert.ok(Array.isArray(rd.zones.aliases));
  assert.ok(Array.isArray(rd.zones.terms));
  assert.ok(rd.zones.aliases.some((a) => a.handle === 'better-col'));
  assert.equal(rd.zones.zoneAliasMap, undefined); // ground truth omits the prompt-only map
});
