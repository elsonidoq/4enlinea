---
name: project_pattern_tier_definitions
description: "Pattern Tier-1/2/3 grouping lives in explainContext.js, NOT classifier.js; distinct from position tier (WINNING/LOSING)"
metadata: 
  node_type: memory
  type: project
  originSessionId: c9e50389-b9da-47c3-9f2d-cf1525eac88a
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

**Threat detectors emit cells but are deliberately NOT in `TIER1_TAGS`.** The 3
parity-aware threat detectors added 2026-06-25 (`major_threat_parity`,
`major_threat_nonparity`, `minor_threat`) return concrete `cells[]` like a Tier-1
detector, yet they are intentionally absent from `explainContext.js`'s `TIER1_TAGS`, so
`buildAllowedSetFromPatternMaps` falls them through to "Tier-3: skip" — they do NOT
expand the static `allowedSet`. They flow instead through the **sparse look-ahead's
own** `LOOKAHEAD_TAGS = TIER1 ∪ THREAT_TAGS` set in `sparseLookahead.js` (a separate
tier list from explainContext's). Two distinct tag-tier registries; don't assume a
cell-emitting tag is in `TIER1_TAGS`. See [[project_sparse_lookahead_unvalidated]] and
[[project_odd_even_threat_puzzle_only]].

**Beware a second, unrelated "tier":** `getPositionTier` (in `llmCoachHelpers.js`)
returns the *position* tier `WINNING | NEUTRAL | LOSING` from solver scores. Totally
different axis from pattern tiers. And `reference_tier_source` is yet a third meaning
(user subscription tier). Three "tier" concepts; don't conflate.

**How to apply:** When asked anything about "Tier-1/2 patterns", read
`explainContext.js` (TIER1_TAGS/TIER2_TAGS), not classifier.js. To check a board for
no-Tier-1/2 pattern, run `classifyPattern(ms, perspective, solver)` for both
perspectives and test its tag keys against the TIER1∪TIER2 set (the retired
`generate_eval_set.mjs` did this to collect its ≥10 no-Tier-1/2 boards; DELETED 2026-07-01 D22). See
[[project_explain_system]] and [[reference_deep_reveal_eval_harness]].
