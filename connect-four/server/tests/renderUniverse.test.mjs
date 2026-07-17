import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDecisionPredicates, RENDER_UNIVERSE, RENDER_PROVISIONAL } from '../scripts/renderUniverse.mjs';

const base = {
  case: 'win_to_lose', route: 'sign', direction: null, patternOnAfterBestBoard: null,
  link: { id: 'L6', confidence: 'high', covers: ['route'], guardrail: '', text: '' },
  boards: [
    { id: 'decision', shown: true, reason: '' },
    { id: 'afterBest', shown: false, reason: '' },
    { id: 'afterPlayed', shown: true, reason: '' },
    { id: 'projectedDeep', shown: true, reason: '' },
  ],
  resource: { completingCell: { cell: 'c6r5' }, registerToHorizon: { register: 'forced_sequence', horizon: 'deep-forced-line' } },
  fieldPartition: { rendered: ['case'], covered: ['route'], excluded: [] },
  finalMovestring: 'x',
};

test('renderDecisionPredicates emits link/board/horizon/covers predicates', () => {
  const p = renderDecisionPredicates(base);
  assert.ok(p.has('link_L6'));
  assert.ok(p.has('route_sign'));
  assert.ok(p.has('case_win_to_lose'));
  assert.ok(p.has('board_afterbest_omitted'));
  assert.ok(p.has('board_afterplayed_shown'));
  assert.ok(p.has('board_projecteddeep_shown'));
  assert.ok(p.has('horizon_deep-forced-line'));
  assert.ok(p.has('covers_exercised_L6'));   // covered.length > 0
});

test('enabled_opponent splits on the fired link id, and flags the flip-case', () => {
  const l3flip = { ...base, direction: 'enabled_opponent', patternOnAfterBestBoard: true, case: 'win_to_lose',
    link: { ...base.link, id: 'L3' } };
  const p = renderDecisionPredicates(l3flip);
  assert.ok(p.has('dir_enabled_opponent'));
  assert.ok(p.has('enabled_branch_invariant'));
  assert.ok(p.has('flip_case_l3'));          // win_to_lose + enabled + pattern-present
  const l2 = { ...base, direction: 'enabled_opponent', patternOnAfterBestBoard: false, link: { ...base.link, id: 'L2' } };
  assert.ok(renderDecisionPredicates(l2).has('enabled_causal'));
});

test('every predicate any decision emits is in RENDER_UNIVERSE', () => {
  for (const rd of [base]) for (const p of renderDecisionPredicates(rd)) assert.ok(RENDER_UNIVERSE.includes(p), `missing ${p}`);
  assert.ok(RENDER_PROVISIONAL.has('link_L9'));
  assert.ok(RENDER_PROVISIONAL.has('flip_case_l3'));
});

function baseRd(overrides = {}) {
  return { ...base, ...overrides };
}

test('zone/term coverage predicates fire from render_decision.zones', () => {
  const rd = baseRd({ zones: { aliases: [
      { handle: 'better-col', spec: 'col3', truthBoard: 'decision', kbId: null },
      { handle: 'you-immediate', spec: 'c1r4', truthBoard: 'decision', kbId: 'immediate_threat' },
      { handle: 'opp-double', spec: 'windows:c5r1,c7r1', truthBoard: 'afterPlayed', kbId: 'double_threat' } ],
    terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'x', description: 'y' }] } });
  const p = renderDecisionPredicates(rd);
  assert.ok(p.has('zone_speckind_col'));
  assert.ok(p.has('zone_speckind_cell'));
  assert.ok(p.has('zone_speckind_window'));
  assert.ok(p.has('term_emitted'));
  assert.ok(!p.has('zones_no_tactical'));
});

test('zones_no_tactical fires when only column aliases are offered', () => {
  const rd = baseRd({ zones: { aliases: [{ handle: 'better-col', spec: 'col3', truthBoard: 'decision', kbId: null }], terms: [] } });
  const p = renderDecisionPredicates(rd);
  assert.ok(p.has('zones_no_tactical'));
  assert.ok(!p.has('term_emitted'));
});
