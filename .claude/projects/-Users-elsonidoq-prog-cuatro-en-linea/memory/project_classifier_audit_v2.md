---
name: project-classifier-audit-v2
description: Results of the v2 candidate-review audit (2026-05-20) across all 6 puzzle categories — FP rates, root causes, and fix priorities
metadata:
  type: project
---

Full report at `reports/candidate-review-v2-2026-05-20.md`.

**Why:** To validate classifier correctness before approving pending candidates for
production puzzles.

**How to apply:** Use this as the starting point for any follow-up work on classifiers
or pending-candidate cleanup. The report is self-contained including deeper notes on
figure_7, j_shape, and overcut (§2.7).

## Summary table

| Category | Phase 1 gaps | FP/8 sampled | Priority |
|---|---|---|---|
| j_shape | 8 gaps (G1–G8) | 8/8 | CRITICAL — classifier broken |
| overcut | 3 gaps | 2/8 | Moderate |
| claimeven | 6 gaps | 1/8 + 1 uncertain | Low-moderate |
| z_threat | 3 (comment/convention only) | 0/8 | Healthy |
| undercut | 4 (doc/contract only) | 0/8 | Healthy |
| figure_7 | 3 (incl. KB/impl misalignment) | 0/8 | Healthy (docs need update) |

## Key findings

### j_shape — completely broken
All 8 sampled candidates are false positives from three independent bugs:
1. Classifier matches 3-of-4 J discs (should require all 4)
2. Anchor parity (`y % 2 == 1`) not enforced — all candidates have even anchor (DB row 0)
3. Applied to both players — 2/8 show Yellow discs

The classifier appears to intend an "incomplete J" design (play to complete the J) mirroring
how figure_7 works, but all three filters are missing. Fix = add the three guards; don't
rewrite from scratch.

### overcut — T5 column-position bug
Correct invariant: R must be at an **odd fill-sequence position** from current column height
(`(R.row - col_height) % 2 == 1`). It is NOT sufficient to check odd column parity.
Even-parity columns can still be valid if R lands at position 1/3/5 in the fill sequence.
Candidate af435cd2 (T5, 4E parity) is a concrete FP. Candidate 5d6e19cc (T4, 6E parity)
is a concrete VALID case confirming even parity ≠ wrong.

### claimeven — wrong player guard missing
Candidate 2a729f66: Red to move, yet classified as claimeven. Add `sideToMove === 'yellow'`
guard. Also: Z-threat positions with one odd column share the outer parity structure —
candidate 7e049506 is uncertain (Yellow's threats are at odd rows, suggesting Z-threat).

### figure_7 — KB/classifier misalignment (docs only)
The KB `find_figure7` predicate requires all 5 discs and explicitly says it does NOT fire for
Incomplete-7. But all candidates are Incomplete-7 (4 discs placed, hinge empty, `correct_col`
= hinge column). The actual classifier implements `find_incomplete_figure7` which the KB
does not document. Functionally correct; needs KB documentation update.

## Candidates to reject
11 total: 2a729f66 (claimeven), af435cd2 + ae22abd4 (overcut), 8 j_shape IDs listed in §3 of the report.
