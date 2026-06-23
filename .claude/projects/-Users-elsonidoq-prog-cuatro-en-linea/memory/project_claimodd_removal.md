---
name: project_claimodd_removal
description: claimodd category was fully removed from the codebase on 2026-06-17 — 20 files edited/deleted
metadata: 
  node_type: memory
  type: project
  originSessionId: e2c1cdc1-0979-476c-b4f4-7486ff14dfb3
---

**claimodd was removed entirely on 2026-06-17.** It no longer exists as a category, detector, blunder tag, challenge set entry, or i18n key.

**Why:** Two compounding problems:
1. The formal WeakC4 definition (from `docs/external_references/weakc4_explanation.html`) shows claimodd is a *cell annotation* (`|`) in a Steady State diagram — "play on a | only if it is on an odd row." It is NOT center-column-specific. Both the community KB entry and `detectClaimodd` in classifier.js incorrectly assumed center-column specificity.
2. Even with a correct implementation, candidate generation produced ~2 candidates per 400 attempts. The solver-weighted simulation fills col 3 (center) early (height 6 = even by depth ≥8), so ~88% of all-even-heights positions have col 3 full, which blocked the center-column check in `detectClaimodd`. A correct multi-column implementation would require a specialized position generator.

**Decision:** Remove rather than fix — the implementation was fundamentally wrong and the generation problem had no cheap solution.

**How to apply:** Do not re-introduce claimodd without reading the WeakC4 source and building a Steady State diagram-aware detector. The formal definition requires identifying `|`-annotated cells across all columns, not just col 3.
