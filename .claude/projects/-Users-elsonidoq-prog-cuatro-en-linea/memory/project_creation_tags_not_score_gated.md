---
name: project_creation_tags_not_score_gated
description: "classify()'s creation tags (double_threat/forced_win/figure_7/j_shape) fire regardless of score, so a creation tag can name a game-losing blunder — never map one straight to praise copy"
metadata: 
  node_type: memory
  type: project
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-07-30T23:53:58.669Z
---

`classify()`'s Categories 3, 4 and 6 (`double_threat`, `forced_win`, `figure_7`, `j_shape`) are
absent→present **transition** gates that read the board only — they never consult `scores`. So a
move can legitimately earn a creation tag *and* be a game-throwing blunder. Verified:
`060550303021255625` col 3 creates a `double_threat` scoring **−12 against a +12 best**;
`34510362124443001124000` col 1 is a losing `j_shape`.

**Why:** the tag asserts "this move built the pattern", which is a *structural* claim. Move quality
is a separate, score-rank claim computed by `scoreMove` (`moveQualityScorer.js`). The two are
independent, and the copy pools conflate them: `coach.spoken.<tag>.suboptimal|blunder` was authored
for ChallengeScreen's "did you pick the correct completing cell" semantics, where those tiers mean
*"you did NOT build it"* — a meaning that is always false once the creation gate has fired.

**How to apply:** in `evaluateMoveHandler.js`, never key a creation tag's phrase pool off raw
`quality`. The shipped resolution (spec 052 US5): promote `suboptimal` → the `optimal` pool (the move
really did build it), but on `blunder` drop the pattern pool entirely and fall back to
`coach.spoken.generic.blunder` — praising a losing move is worse than the contradictory copy it
replaces. Keep `quality`/`badge` in the response score-based for downstream stats consumers.

Same family as [[project_missed_own_capitalize_principle]] (structure survives a wrong move) and
[[feedback_deep_reveal_product_mindset]] (score is a compass, not the reason). See also
[[project_coach_phrase_pool_dual_lookup]] — the fix must be applied to BOTH lookup families
(`coach.spoken.*` and `eval.*.summary`), which share one `phrasePoolKey`.
