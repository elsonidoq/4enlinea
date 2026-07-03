// renderUniverse.mjs — the render-layer half of the joint coverage universe (spec §3e).
// ONE predicate function shared by the sampler (select_boards.mjs) and the coverage test
// (renderCoverageUniverse.test.mjs), so "which predicates does this board hit" has a single source
// of truth. Consumes a render_decision (buildRenderDecision output); never touches the engine.

// Map a render_decision to the set of render-layer coverage predicates it exercises.
export function renderDecisionPredicates(rd) {
  const p = new Set();
  p.add(`link_${rd.link.id}`);
  p.add(`route_${rd.route}`);
  if (rd.case) p.add(`case_${rd.case}`);
  if (rd.direction) p.add(`dir_${rd.direction}`);
  // Branch-invariance split keys off the FIRED link (L2 causal vs L3 branch-invariant), not the raw
  // patternOnAfterBestBoard flag — L3 also fires via lose_to_faster_lose where the flag is false (D28).
  if (rd.direction === 'enabled_opponent') p.add(rd.link.id === 'L3' ? 'enabled_branch_invariant' : 'enabled_causal');
  // The I12 flip-case: enabled_opponent routed to L3 by a PRESENT after-best pattern (not by the
  // already-losing sign). Absent from the frozen 29; the targeted rare-fill probes for it.
  if (rd.direction === 'enabled_opponent' && rd.patternOnAfterBestBoard === true && rd.case !== 'lose_to_faster_lose') {
    p.add('flip_case_l3');
  }
  for (const b of rd.boards) {
    if (b.id === 'afterBest') p.add(b.shown ? 'board_afterbest_shown' : 'board_afterbest_omitted');
    if (b.id === 'afterPlayed') p.add(b.shown ? 'board_afterplayed_shown' : 'board_afterplayed_omitted');
    if (b.id === 'projectedDeep') p.add(b.shown ? 'board_projecteddeep_shown' : 'board_projecteddeep_absent');
  }
  if (rd.fieldPartition.covered.length > 0) p.add(`covers_exercised_${rd.link.id}`);
  const h = rd.resource?.registerToHorizon?.horizon;
  if (h) p.add(`horizon_${h}`);
  return p;
}

// Known-rare / structurally-hard render predicates: reported by the coverage test, non-blocking.
export const RENDER_PROVISIONAL = new Set([
  'link_L9', 'covers_exercised_L9',                 // diffuse-parity bucket, rare in self-play
  'flip_case_l3',                                    // I12 gap (D28); may be structurally unreachable
  'board_afterbest_shown',                           // after-best rarely changes the tag-set
]);

// Every render-layer predicate the function can emit, named upfront (closed; the sampler's
// discovered ⊆ universe guard unions this with the engine REASON_UNIVERSE).
export const RENDER_UNIVERSE = [
  'link_L1', 'link_L2', 'link_L3', 'link_L4', 'link_L5', 'link_L6', 'link_L7', 'link_L8', 'link_L9',
  'route_sign', 'route_realized_denied',
  'case_win_to_draw', 'case_win_to_lose', 'case_draw_to_lose', 'case_lose_to_faster_lose',
  'dir_missed_own', 'dir_enabled_opponent', 'dir_defensive_miss',
  'enabled_causal', 'enabled_branch_invariant', 'flip_case_l3',
  'board_afterbest_shown', 'board_afterbest_omitted',
  'board_afterplayed_shown', 'board_afterplayed_omitted',
  'board_projecteddeep_shown', 'board_projecteddeep_absent',
  'covers_exercised_L1', 'covers_exercised_L2', 'covers_exercised_L3', 'covers_exercised_L4',
  'covers_exercised_L5', 'covers_exercised_L6', 'covers_exercised_L7', 'covers_exercised_L8', 'covers_exercised_L9',
  'horizon_immediate', 'horizon_deep-forced-line', 'horizon_deep-parity',
];

export const RENDER_REQUIRED = RENDER_UNIVERSE.filter((p) => !RENDER_PROVISIONAL.has(p));
