---
name: project_select_boards_skips_openings
description: RESOLVED — select_boards now has an additive opening harvest band; openings are no longer skipped (was discMin 12)
metadata: 
  node_type: memory
  type: project
  originSessionId: 4f6802b0-e9e6-4ad7-83f4-13466dbbe726
---

**RESOLVED on branch `opening-theory` (2026-07-05, Task B4, commit e56fe26).** Historically
`connect-four/server/scripts/select_boards.mjs` excluded opening positions: the `fixture` config had
`CFG.discMin: 12 // skip opening theory`, so `phase_opening` and any opening-specific reason was
never sampled — a mismatch, since `computeReason` already classified `board_state: opening`
(`REASON_CONFIG.openingMaxDiscs: 15`).

That gap is now closed: B4 added an **additive opening harvest band** (discs ~1–14) alongside the
untouched mid-game band (`discMin` 12 still governs the mid-game pass; the opening pass uses a
separate `counts.opening.*` bucket). The predicate derivation was also **extracted out of
select_boards.mjs into `reasonEvalPredicates.mjs`** (behavior-preserving) so it is unit-testable, and
two new PROVISIONAL predicates were registered: `reason_opening_named_line`
(from `openingContext.namedOpening`) and `reason_opening_centrality` (from `openingContext.centrality`).

**Still-true gotcha:** keep opening predicates `PROVISIONAL`, not REQUIRED — named-opening matches are
rare, and a REQUIRED unreachable predicate burns the full solver budget
([[project_coverage_sampler_rarefill_trap]]). A pre-existing orphaned REQUIRED predicate
`opp_neutralization` is the current rare-fill culprit in coverage harvests (unrelated to openings,
still OPEN). The opening reason engine itself lives in `computeOpeningContext.mjs`; see
[[feedback_reason_case_requires_eval_and_grader]] and reason-DECISIONS **D31**.
