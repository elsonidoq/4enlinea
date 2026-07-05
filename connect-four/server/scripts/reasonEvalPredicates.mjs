// reasonEvalPredicates.mjs — pure predicate-derivation for the reason-eval coverage selector
// (select_boards.mjs --strategy coverage). Extracted out of select_boards.mjs (Task B4) so the
// derivation is directly unit-testable: select_boards.mjs has top-level CLI arg-parsing / --help /
// process.exit side effects on import, so it cannot be `import`ed by a test without executing them.
//
// Takes a `computeReason` output vector (`r`) and returns the Set of coverage-predicate strings it
// exhibits. select_boards.mjs's `discovered ⊆ REASON_UNIVERSE` guard runs at the call site, not here
// — this module only DERIVES predicate names; it does not validate them against the universe.

import { toNarratorVector } from './reasonNarratorVector.mjs';
import { buildRenderDecision } from './renderReasonModel.mjs';
import { renderDecisionPredicates } from './renderUniverse.mjs';

export function reasonPredicates(r) {
  const preds = new Set();
  const half = (h, side) => {
    if (!h) return;
    if (h.register) preds.add(`reg_${side}_${h.register}`);
    if (h.tacticTag) preds.add(`tactic_${side}_present`); else preds.add(`tactic_${side}_null`);
  };

  preds.add(`case_${r.case}`);
  preds.add(r.player === 1 ? 'player_1' : 'player_2');
  preds.add(`phase_${r.boardState}`);                       // opening | mid-game | closing
  // severity band from the score gap (bestScore - playedScore), the engine's own magnitudes.
  const gap = (r.bestScore ?? 0) - (r.playedScore ?? 0);
  preds.add(gap >= 12 ? 'sev_large' : (gap >= 4 ? 'sev_moderate' : 'sev_small'));
  preds.add(`route_${r.route || 'sign'}`);
  if (r.route === 'realized_denied' && r.tag && r.direction) preds.add(`rd_${r.tag}_${r.direction}`);

  const lr = r.lostResource;
  if (lr) {
    if (lr.kind === 'winning_line' && lr.terminal === 'fork') preds.add(`lost_fork_${lr.forkCase}`);
    else if (lr.kind === 'winning_line') preds.add('lost_parity_win');
    else if (lr.kind === 'denial') preds.add(`lost_denial_${lr.verdict}`);
    else if (lr.kind === 'conditional_swindle') preds.add('lost_conditional_swindle');
    else if (lr.kind === 'realized_pattern') preds.add(`lost_realized_${lr.tag}`);
    if (lr.parityAttribution) {
      preds.add(lr.parityAttribution.nameable ? 'parity_nameable' : 'parity_unnameable');
      // `parity_forcedFirst` retired (review F3): forcedFirstRequired was an unbacked
      // Aftereven claim; attributeParityWin no longer emits it.
    }
  }
  half(lr, 'lost');

  const op = r.opponentPunishment;
  if (op) {
    if (op.kind) preds.add(`opp_${op.kind}`);                // winning_line | denial | neutralization
    if (op.tie?.kind) preds.add(`tie_${op.tie.kind}`);       // tied | independent | temporal
    if (op.parityAttribution) preds.add(op.parityAttribution.nameable ? 'opp_parity_nameable' : 'opp_parity_unnameable');
  }
  half(op, 'opp');

  if (r.gate) preds.add('gate_ran');   // D23: uniform depth-bounded gate (no exhaustive/bounded split)

  // Task B2's opening-theory evidence (mutually exclusive on `r.openingContext`; absent otherwise).
  // Named-opening matches are RARE (a self-play move must land exactly on a KB book prefix), so both
  // cases are registered PROVISIONAL in REASON_UNIVERSE (coverage-sampler rare-fill trap — a REQUIRED
  // unreachable predicate burns the full harvest budget chasing it).
  if (r.openingContext?.namedOpening) preds.add('reason_opening_named_line');
  if (r.openingContext?.defense) preds.add('reason_opening_defense');
  if (r.openingContext?.centrality) preds.add('reason_opening_centrality');

  // Render-layer predicates (spec §3e): derive the render_decision from this evidence and union in
  // its link/board/branch-invariance/horizon/covers predicates. Failure (unroutable) → engine preds only.
  try {
    const rd = buildRenderDecision(toNarratorVector(r));
    for (const rp of renderDecisionPredicates(rd)) preds.add(rp);
  } catch { /* render pipeline can't route this board — keep engine predicates */ }

  return preds;
}
