---
name: feedback_feature_vector_design
description: "How to build/trim a feature vector for a thinking-model consumer (feature_vector / toFeatureVector) — keep grounded cells, drop plumbing/derivations/search-artifacts"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c9e50389-b9da-47c3-9f2d-cf1525eac88a
---

The user's design principle for the deep-reveal **feature vector** (`toFeatureVector` in `server/explainContext.js`, written to `feature_vector` by `run_eval.mjs`, shown in the "Deep reveal feature vector" admin tool), taught across many correction rounds in one session. The goal: a structure that holds **everything needed to explain *why* a move was a blunder**, readable by a thinking model or human, grounded in reproducible board features. Aligns with [[feedback_deep_reveal_product_mindset]] (score is a compass, not the reason; never fabricate).

**Three-way classification for every field** (the bar for removal is plumbing/derivation/artifact — NEVER "it's verbose"):

1. **KEEP — grounded board detail.** Cells are first-class signal: they complement the movestring with specifics NOT recoverable from counts. This includes the static `classifyPattern` maps (`patternsBest/Played/PostBlunder/Opponent`, tag→{cells}), parity-bucket threats **with cells** (`threatStats.{pre,best,played}`, each bucket `{count, cells}`), `playedCell`/`bestCell`, `centerDominance` (the sole signal on opening boards), and the look-ahead's novel cell-sets (`categoryExamples`/`oppCategoryExamples`). **Over-pruning trap:** cells, the pattern maps, and `centerDominance` were each dropped during the session and had to be restored. Do NOT flatten grounded cells down to counts.

2. **DROP — LLM-prompt plumbing.** `allowedSet` (the P5strong validation whitelist — explicitly NOT a tactical feature, even though it looks data-rich), `zoneAliasMap`, all reason prose (`humanReason`/`positiveReason`/`terseReason` — `terseReason` only restates `tag`+`direction` plus a score transition already in `preScores`/`gap`), KB-term plumbing (`relevantPatternKeys`/`kbTerms`), display labels (`playerName`), the rendered `threatComparison`/`threatShowFlags`, and the redundant `lookaheadRaw`.

3. **DROP — pure derivations & noisy search artifacts.** Derivations: `opponentPerspective`, `isOptimal`, `gapBucket`, `positionTier`, `lookaheadFired`. **Search-artifact magnitudes: raw `occurrences` (DFS detection-node counts) are OUT** — they scale with depth/budget/branching, so their magnitudes (e.g. `minor_threat` 284 vs 168) mislead an LLM into over-weighting and naive subtraction. **Keep only board-bounded *instance* counts**: `novelInstances` (distinct novel cells = a set-difference, NOT the occurrence-delta — a model WILL conflate the two), and `perCategory`'s `bestInstances`/`playedInstances`.

**Tactical-only invariant (emphasized 2026-06-28):** the vector must express **tactical** concepts
(threats, columns, parity, named patterns, "wins/loses in N moves"), **never solver internals**
(scores, raw `|score|` magnitudes). A field may be *computed* from the solver, but what it *surfaces*
must read tactically. This is why `pliesToEnd = Math.abs(score)` is a bug, not just a naming issue
(see [[project_feature_vector_content_traps]]): it leaks a score magnitude with inverted meaning. The
owner also wants a future `reason` field that *states why the blunder is worse* (a decisive
winning-line diff between branches), since today no field carries the causal "why" — currently a
brainstorm topic, anchor case eval-6.

**Scope:** the production coach prompt does NOT see any of these counts (it gets only the winner's cells via zone tags + the pattern name); `feature_vector` is for the eval/inspection/thinking-model consumer. So trimming here cannot break the live coach.

**`prune` flag:** `toFeatureVector` defaults `prune:true` (recursive empty/all-zero elimination), but `buildExplainContext` overrides to `prune:false` so the wire carries the full fixed shape and the admin tool can toggle collapse both ways. See [[reference_deep_reveal_eval_harness]].
