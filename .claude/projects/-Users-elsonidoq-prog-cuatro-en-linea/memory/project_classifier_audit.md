---
name: project-classifier-audit
description: "Post-audit spec/plan/tasks for 11 classifier discrepancies in feature 008 (J1–J4, U1–U3, O1, F1–F3) — spec fixed, code not yet changed"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0708dd6-497f-4096-b53b-9c4b5a25aef4
---

Cross-check of `specs/008-new-puzzle-categories/spec.md` against 5 KB files on 2026-05-19 found 11 discrepancies between the spec predicates and the KB formal predicates. The spec was fixed in-place; `classifier.js` has NOT been updated yet. Phase 6 tasks T037–T048 cover the code fixes.

**Why:** All fixes tighten the predicate (remove false positives). KB is the source of truth.

**How to apply:** When implementing Phase 6 tasks, use the plan.md `## Classifier Bug Fixes (post-audit)` section as the delta spec. Do not re-derive the conditions from first principles — they are already locked in spec and plan.

---

## The 11 discrepancies

### detectJShape — J1, J2, J3, J4 (T037–T040)

- **J1**: Missing anchor parity. Add `if (r % 2 !== 0) continue;` (0-indexed even = 1-indexed odd). KB: `allen-j-configuration.md` `y % 2 == 1`.
- **J2**: Loop bounds allow `c+2 == COLS` and `r+3 == ROWS` (both off-board). Fix: `c < COLS - 2` / `c >= 2` (mirror), `r <= ROWS - 4`.
- **J3**: No check for opponent odd-row major threats in far column. Enumerate opponent threats in `c+2` (canonical) / `c-2` (mirror); reject if any at even 0-indexed row (= odd 1-indexed). KB: `opp_odd_in_far_col == False`.
- **J4**: Wrong guard cell. Current code: `board[completing.row + 1][tc]` for tc in `{c, c+1}` (row above completing in template columns). Correct: `board[completing.row][c+2]` (far column, same row as completing). KB: `board[far_col][far_row] != opponent`.

### detectUndercut — U1, U2, U3 (T041–T043)

- **U1**: No parity check. Add `if (R % 2 === kill % 2) continue;` — same 0-indexed parity = T4, not undercut. **DB review needed** for existing undercut candidates.
- **U2**: No T5 exception. Add `if (R === 5 && kill === 2) continue;` (0-indexed rows 5+2 = 1-indexed rows 6+3).
- **U3**: No adjacency for sub-case 3. Add `if (R % 2 === 1 && kill % 2 === 0 && R !== kill + 1) continue;` — when current player's R is 0-indexed odd (1-indexed even) and kill is 0-indexed even (1-indexed odd), must be adjacent.

### detectOvercut — O1 (T044)

- **O1**: No T2-blocking mechanism check; relies entirely on `scores[col] > 0`. After finding `(R, neutralised)`, verify at least one holds: (a) neutralised is minor threat; (b) `R % 2 === neutralised % 2` (T4); (c) `{R, neutralised}` = `{5, 2}` 0-indexed (T5); (d) chain-T2 from current player's lower threat. Skip pair if none hold.

### detectFigure7 — F1, F2, F3 (T045–T047)

- **F1**: `gravityTopCount` computed but never checked. Add `if (gravityTopCount >= 2) continue;`.
- **F2**: `hasAboveGravity` computed but never checked. Add `if (!hasAboveGravity) continue;`.
- **F3**: Variants 1 and 1b (ascending + right, uses `x+4,y+2`) generate threats in different columns — structurally wrong. Self-filtered by `hasConsecutivePair` so no DB fix needed, but remove as dead code.

---

## Files changed (spec/plan/tasks only — classifier.js unchanged)

- `specs/008-new-puzzle-categories/spec.md` — FR-005, FR-006, FR-007, FR-008 fixed
- `specs/008-new-puzzle-categories/plan.md` — `## Classifier Bug Fixes (post-audit)` appended
- `specs/008-new-puzzle-categories/tasks.md` — `## Phase 6: Classifier Correctness Fixes` appended (T037–T048)

## Key framing: classifier purpose vs KB predicate

The classifier's role is **puzzle generation** — finding positions where playing `correct_col` *creates* the pattern, not detecting already-complete instances. The KB documents the strategic pattern and its winning logic (complete configuration). These are two different predicates.

For figure_7: the classifier correctly detects incomplete Figure-7s (4 discs placed, hinge missing). The `known_limitations` note "Incomplete-7 does not fire" refers to the strategic detector, not the classifier. The real gap is that the KB never documents the puzzle-generation framing or the `find_incomplete_figure7` predicate the classifier actually implements.

For j_shape: same design intent (find 3 discs placed, completing disc at gravity-top), but broken by 3 bugs (fires on 3-of-4 discs instead of requiring all 4 pre-placed, parity not enforced, player identity not checked).

[[project-new-puzzle-categories]]
