---
name: category-cleanup-2026-05-13
description: fork_setup and parity_control removed; zugzwang renamed forced_win; rationale and current valid category set
metadata:
  type: project
---

Current valid categories (as of 2026-05-13): `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`.

**Why:** `fork_setup` and `parity_control` had no puzzles and were removed. `zugzwang` was renamed to `forced_win` because "zugzwang" has a specific game-theory meaning that doesn't match how the category is implemented here — proper zugzwang will be a distinct category in the future. Keeping the old name would cause confusion when that future category is built.

**How to apply:** If anyone proposes adding a `zugzwang` category, it should be a new, correctly-defined concept — not a rename of `forced_win`. Do not reuse the slug `zugzwang` for `forced_win` logic.


---

## (merged from `project_claimodd_removal` — claimodd category was fully removed from the codebase on 2026-06-17 — 20 files edited/deleted)

**claimodd was removed entirely on 2026-06-17.** It no longer exists as a category, detector, blunder tag, challenge set entry, or i18n key.

**Why:** Two compounding problems:
1. The formal WeakC4 definition (from `docs/external_references/weakc4_explanation.html`) shows claimodd is a *cell annotation* (`|`) in a Steady State diagram — "play on a | only if it is on an odd row." It is NOT center-column-specific. Both the community KB entry and `detectClaimodd` in classifier.js incorrectly assumed center-column specificity.
2. Even with a correct implementation, candidate generation produced ~2 candidates per 400 attempts. The solver-weighted simulation fills col 3 (center) early (height 6 = even by depth ≥8), so ~88% of all-even-heights positions have col 3 full, which blocked the center-column check in `detectClaimodd`. A correct multi-column implementation would require a specialized position generator.

**Decision:** Remove rather than fix — the implementation was fundamentally wrong and the generation problem had no cheap solution.

**How to apply:** Do not re-introduce claimodd without reading the WeakC4 source and building a Steady State diagram-aware detector. The formal definition requires identifying `|`-annotated cells across all columns, not just col 3.
