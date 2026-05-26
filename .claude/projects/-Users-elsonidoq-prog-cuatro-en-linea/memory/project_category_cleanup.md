---
name: category-cleanup-2026-05-13
description: fork_setup and parity_control removed; zugzwang renamed forced_win; rationale and current valid category set
metadata:
  type: project
---

Current valid categories (as of 2026-05-13): `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`.

**Why:** `fork_setup` and `parity_control` had no puzzles and were removed. `zugzwang` was renamed to `forced_win` because "zugzwang" has a specific game-theory meaning that doesn't match how the category is implemented here — proper zugzwang will be a distinct category in the future. Keeping the old name would cause confusion when that future category is built.

**How to apply:** If anyone proposes adding a `zugzwang` category, it should be a new, correctly-defined concept — not a rename of `forced_win`. Do not reuse the slug `zugzwang` for `forced_win` logic.
