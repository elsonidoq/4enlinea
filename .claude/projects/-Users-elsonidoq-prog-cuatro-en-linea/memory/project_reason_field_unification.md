---
name: project_reason_field_unification
description: "The blunder reason field's 5 kinds collapse into ONE principle — exhibit the winning connect-4 line(s) and compare timing/availability across the two branches"
metadata: 
  node_type: memory
  type: project
  originSessionId: 56e7f9e4-5e9a-4e07-928a-b96d64865768
---

The blunder `reason` field's five kinds (`concrete_line` / `conversion` / `resistance` /
`parity_control` / `positional`) are facets of **one principle** (user direction, 2026-06-28): explain a
blunder by **exhibiting the concrete winning connect-4 line(s) and comparing their availability/timing
between the better branch and the played branch.**

- `concrete_line` (flip to loss): the opponent's winning 4 appears on the played branch, not the better one.
- `conversion` (both win): the player's winning 4 completes in strictly **fewer plies** on the better
  branch — show both lines; the better is sooner. (NOT the epic's vacuous "fewer chances to throw it away".)
- `resistance` (both lose): the opponent's winning 4 is reachable **sooner / in more ways** on the played
  branch. **Rule: if NO opponent winning 4 is reachable within the search on either branch, it was NOT a
  blunder — losing fast vs slow with nothing to punish → OMIT (say nothing).** Kills the eval-8/eval-64
  vacuous cases honestly; replaces the misleading {speed, punishable} enums.
- `parity_control`: same mechanism, but the completing cell is a parity/zugzwang threat that resolves at
  board-fill — needs the parity classifier (Residue B) to name the surviving odd/even threat + controller.
- `positional`: the opening-only degenerate where no line is exhibitable yet; honest ONLY when the
  heuristic (center) is solver-true (empty board). Once a few discs are down it usually fabricates →
  parity case or OMIT.

The solver **score magnitude gives the exact forward depth** (forward distance = `43 − 2·|score| −
discs`) = how deep to search for the line and how soon it completes — so the `register` need not be a
coarse word-bucket; plies-to-completion is a board fact, not solver vocabulary. The only meaningful
boundary is win-in-one (the move itself completes/concedes the 4).

**Settled design** (`docs/epics/unified-blunder-reason-epic.md`, supersedes blunder-reason-field-epic.md):
ONE engine = compute the optimal PV for BOTH the played and best move, characterize the divergence; `kind`
becomes a derived `grain`. Five grains: `line` (a nameable winning four), `line_parity` (standing threat
whose ownership flips — controller FROM THE SOLVER FLIP, cell by ROW parity, NEVER empty-square parity),
`opening_principle` (line-participation = #4-windows through the landing cell; solver-monotone ONLY on a
near-empty board — it inverts mid-game), `zugzwang_class` (FLIPPING-only mechanism-class reason, no cell,
emitted only when a forward search confirms no threat in the horizon — for deep diffuse cases this is
classification not coaching), `not_a_blunder` (same-floor with no discriminating reachable line — "losing
fast / winning slower with nothing to exhibit is not a blunder"). NEVER fabricate: a cell is named only
when re-solve-confirmed decisive OR a FORCED terminal board-fill (non-canonical terminals refused). OMIT
reserved for solver error only — every real case emits one of the 5 grains (100% coverage, user requirement).

Verification: `reason_audit/PROMPT_verify_unified_reason.md` (coordinator prompt, pre-implementation,
produces a golden expected-reason fixture per case). Decide via [[feedback_occam_principled_extrapolation]].
Audit + evidence: `reason_audit/REPORT.md` + `cases/` + `cases/UNIFY_*.md` + `cases/DESIGN_parity_*.md`;
tools in `reason_audit/TOOLS/` (optimal_line, forward_distance, parity_cells, decisive_check,
forward_projection) prototype the build. Builds on [[feedback_feature_vector_design]],
[[project_feature_vector_content_traps]], [[project_lookahead_shared_seam]].
