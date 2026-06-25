---
name: project_pattern_tier_definitions
description: Pattern Tier-1/2/3 grouping lives in explainContext.js, NOT classifier.js; distinct from position tier (WINNING/LOSING)
metadata:
  type: project
---

The deep-reveal **pattern tiers** (Tier-1/Tier-2/Tier-3) are NOT defined in
`classifier.js` — grepping it for "tier" returns nothing. `classifier.js` only
produces the raw `classifyPattern` tags. The tier *grouping* lives in
`server/explainContext.js`:

- `TIER1_TAGS` = `immediate_threat, double_threat, undercut, overcut, figure_7, j_shape`
  (detectors returning concrete `cells[]`).
- `TIER2_TAGS` = `z_threat` (cells `[]`, derives a capsule column).
- Tier-3 (forced_win, forced_block, forbidden_columns, odd_even_threat,
  claimeven, drawing_move, suboptimal_move) is position-global, not added to allowedSet.

A board "with no Tier-1/2 pattern" is exactly the `allowedSet === null` case in
`buildAllowedSetFromPatternMaps` — see [[project_patterns_blunders_done]] (null vs []
semantics for validateAnnotation).

**Beware a second, unrelated "tier":** `getPositionTier` (in `llmCoachHelpers.js`)
returns the *position* tier `WINNING | NEUTRAL | LOSING` from solver scores. Totally
different axis from pattern tiers. And `reference_tier_source` is yet a third meaning
(user subscription tier). Three "tier" concepts; don't conflate.

**How to apply:** When asked anything about "Tier-1/2 patterns", read
`explainContext.js` (TIER1_TAGS/TIER2_TAGS), not classifier.js. To check a board for
no-Tier-1/2 pattern, run `classifyPattern(ms, perspective, solver)` for both
perspectives and test its tag keys against the TIER1∪TIER2 set (this is what
`generate_eval_set.mjs` does to collect its ≥10 no-Tier-1/2 boards). See
[[project_explain_system]] and [[reference_deep_reveal_eval_harness]].
