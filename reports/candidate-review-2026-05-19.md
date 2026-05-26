# Candidate False-Positive Review — 2026-05-19

**Reviewed by**: coordinator + 6 category agents
**Scope**: 3 candidates per category (18 total)

## Overall Summary

| Category    | True Positive | False Positive | Uncertain |
|-------------|:---:|:---:|:---:|
| z_threat    |  3  |  0  |  0  |
| claimeven   |  3  |  0  |  0  |
| undercut    |  1  |  2  |  0  |
| overcut     |  0  |  3  |  0  |
| figure_7    |  3  |  0  |  0  |
| j_shape     |  3  |  0  |  0  |
| **Total**   | **13** | **5** | **0** |

---

## Category: z_threat

### Candidate 1441eae9-8535-4f90-ab59-881d54cb5cca — 436143113345376556543766556412
**Verdict**: TRUE POSITIVE
**Reasoning**: Red to move. Column 7 (0-indexed col 6) has a major Red threat at row 5 (1-indexed). Column height h=2 (rows 1–2 occupied). empty_count = 5 − 2 = 3 (odd) → Z-Threat confirmed by KB `is_z_threat` predicate. Solver score for col7 = +2 (Red wins). No other column produces an odd empty_count to a Red major threat with a positive solver score: col2 has par=5O but the major threat there (row 3) has empty_count = 3 − 1 = 2 (even, not a Z-threat), and its solver score is −6 anyway. FR-001 uniqueness condition satisfied.
**Evidence from board**: `par | 2E  | 5O  | 0E  | 1O  | 0E  | 0E  | 4E` and `scr |   2 |  -6 |  -- |   2 |  -- |  -- |   2`; `Major threats: col2 row3 (R+Y)   col7 row5 (R)`. The highlight_metadata `{column:6, fromRow:2, toRow:4, badgeCount:3}` correctly encodes rows 3–5 (1-indexed), matching empty_count=3.

---

### Candidate 37ec5800-5b24-45cc-a4aa-1d90eb246b48 — 44443265312366353637554
**Verdict**: TRUE POSITIVE
**Reasoning**: Yellow to move. Column 7 (0-indexed col 6) has a major Yellow threat at row 4 (1-indexed). Column height h=1 (row 1 occupied). empty_count = 4 − 1 = 3 (odd) → Z-Threat confirmed. Solver score for col7 = +2 (Yellow wins). The only other odd-par column is col1 (par=5O), but col1 has no Yellow major threat — only minor threats — so it does not qualify as a Z-threat column. FR-001 uniqueness condition satisfied, with caveat: col2 also has a Yellow major threat at row 4 with empty_count=3 (odd) and solver score +2, making it a second valid Z-threat column. The highlighted col7 is correct, but if strict uniqueness is required, this candidate should be flagged for manual review.
**Evidence from board**: `par | 5O  | 4E  | 0E  | 1O  | 2E  | 2E  | 5O` and `scr |   4 |   2 |  -- |   2 |  -3 |   4 |   2`; `Major threats: col2 row4 (Y)   col7 row4 (Y)`.

---

### Candidate 1aef79ba-4bcb-4ca2-af38-abcf12ad1b27 — 547655535454433
**Verdict**: TRUE POSITIVE
**Reasoning**: Yellow to move. Column 6 (0-indexed col 5) has a major Yellow threat at row 4 (1-indexed). Column height h=1 (row 1 occupied by Y4). empty_count = 4 − 1 = 3 (odd) → Z-Threat confirmed by KB predicate. Solver score for col6 = +3 (Yellow wins). No other column has a Yellow major threat with an odd empty_count and positive solver score: col7 (par=5O) has only minor Yellow threats; col3 (par=3O) has no Yellow major threat. FR-001 uniqueness condition satisfied.
**Evidence from board**: `par | 6E  | 6E  | 3O  | 2E  | 0E  | 5O  | 5O` and `scr |   3 | -13 |   3 |   5 |  -- |   3 |  -3`; `Major threats: col2 row2 (R)   col6 row4 (Y)   col6 row6 (R)`. The highlight_metadata `{column:5, fromRow:1, toRow:3, badgeCount:3}` correctly encodes rows 2–4 (1-indexed), matching empty_count=3.

### Summary
- True positives: 3/3
- False positives: 0/3
- Uncertain: 0/3
- Notes: All three candidates correctly exhibit a single major threat with an odd empty-cell count to the threat cell and a positive solver score. Mild concern on candidate 2: col2 also qualifies as a Z-threat column (odd empty_count=3, solver +2). If strict uniqueness is required by FR-001, candidate 2 should be manually reviewed.

---

## Category: claimeven

### Candidate 710811b9-f7d8-4265-94b5-2270200028d9 — 351222713573525
**Verdict**: TRUE POSITIVE
**Reasoning**: Subtype B claimeven position. Before Red's move 15 (col5, 1-indexed), the board had exactly two odd-empty-count columns: col3=3O and col5=3O. Red played col5, reducing it to 2E. The current position has a single odd column (col3=3O). Yellow's unique equalizing move is col3 (0-indexed col2 = correct_col=2), which brings all columns to even empty counts. Playing any other column leaves at least two odd columns, confirming uniqueness (FR-002b). All solver scores are in range 9–11 (positive = Yellow wins), consistent with FR-004 simulation confirming Yellow wins. The KB's `can_claimeven` predicate is satisfied at col3: rows 3 and 4 are both empty with the upper square (row 4) being even (1-indexed).
**Evidence from board**: `par | 4E  | 2E  | 3O  | 6E  | 2E  | 6E  | 4E  |` and `scr |  10 |  11 |   9 |  11 |   9 |   9 |   9 |`. Pre-move-15 par: `4E 2E 3O 6E 3O 6E 4E` — exactly two odd columns (col3, col5). Only playing col3 restores all-even.

---

### Candidate ded34c03-528c-404f-a7d4-8991ca906bd1 — 4446112333443141171277773576656
**Verdict**: TRUE POSITIVE
**Reasoning**: Subtype B claimeven position. Before Red's move 31 (col6, 1-indexed), the board had exactly two odd-empty-count columns: col3=1O and col6=3O. Red played col6, bringing it to 2E. The current position has a single odd column (col3=1O). Yellow's correct response is col3 (0-indexed col2 = correct_col=2), the baseinverse partner. Solver score for col3=2 (positive = Yellow wins) while col2=-3 (Yellow loses) confirm the correct answer is specifically col3. After Yellow plays col3, all remaining columns have even empty counts, confirming claimeven pairing covers the remainder. A Red major threat at col2 row5 (odd row) is properly neutralized by Yellow's major threat at col2 row4 (even row).
**Evidence from board**: `par | 0E  | 4E  | 1O  | 0E  | 4E  | 2E  | 0E  |` and `scr |  -- |  -3 |   2 |  -- |  -5 |   2 |  -- |`; `Major threats: col2 row4 (Y)   col2 row5 (R)   col5 row4 (R)`. Pre-move-31 par: `0E 4E 1O 0E 4E 3O 0E` — exactly two odd columns (col3=1O, col6=3O).

---

### Candidate 29ce0d05-bfc7-47be-8bf1-9c6ce6e00622 — 277763332771561356373
**Verdict**: TRUE POSITIVE
**Reasoning**: Subtype B claimeven position. Before Red's move 21 (col3, 1-indexed), the board had exactly two odd-empty-count columns: col3=1O and col6=3O. Red played col3, making it 0E (column full). The current position has a single odd column (col6=3O). Yellow's correct response is col6 (0-indexed col5 = correct_col=5), the baseinverse partner. Solver score for col6=3 (positive = Yellow wins); most other columns score negatively. A Red major threat at col4 row2 (even row) is refuted by claimeven pairing at the col4 row1/row2 pair after all columns are equalized. All three FR-003 conditions met: (a) two odd columns pre-move, (b) Red played in one, (c) solver confirms Yellow wins after responding in the other.
**Evidence from board**: `par | 4E  | 4E  | 0E  | 6E  | 4E  | 3O  | 0E  |` and `scr |  -8 |   2 |  -- | -10 |   2 |   3 |  -- |`; `Major threats: col4 row2 (R)`. Pre-move-21 par: `4E 4E 1O 6E 4E 3O 0E` — exactly two odd columns (col3=1O, col6=3O).

### Summary
- True positives: 3/3
- False positives: 0/3
- Uncertain: 0/3
- Notes: All three candidates are Subtype B claimeven positions. Each exhibits the canonical pattern: exactly two odd-empty-count columns before Red's move, Red plays into one, and Yellow must respond in the other. The `category_evidence` field is null for all three; verification relied on solver scores and parity analysis of the pre-move board. No false positives detected.

---

## Category: undercut

### Candidate 3170300a-89ad-4e4c-ab75-28a27fb01691 — 43633675553351776
**Verdict**: FALSE POSITIVE
**Reasoning**: Yellow is the current player. The highlight_metadata correctly identifies the undercut pair: Red has a major threat at col4 row3 (1-indexed, odd) and Yellow has a major threat at col4 row4 (1-indexed, even), satisfying U1 (opposite parity), U2 (not a row-3/row-6 pair), and U3 (R=R'+1, immediately adjacent, sub-case 3). However, FR-005 additionally requires the position to be confirmed as a winning position for the current player by the solver. Every solver score is negative (-10 to -12), meaning Yellow loses under perfect play regardless of which column is chosen. The structural undercut pattern exists in the position, but Yellow is already in a lost position — the undercut is not the decisive winning mechanism.
**Evidence from board**: `scr | -12 | -12 | -12 | -12 | -12 | -12 | -10 |`; `Major threats: col4 row3 (R)   col4 row4 (Y)   col4 row5 (R)   col7 row4 (R)`. All scores negative = Yellow loses.

---

### Candidate 5f82a70b-f7e0-4708-980f-b58f7abff172 — 6237442552661262164444
**Verdict**: FALSE POSITIVE
**Reasoning**: Red is the current player. The highlight_metadata identifies: Red has a major threat at col3 row4 (1-indexed, even) and Yellow has a major threat at col3 row3 (1-indexed, odd) — satisfying U1 (opposite parity: R=4 even, R'=3 odd), U2 (not a row-3/row-6 pair), and U3 (R=R'+1=4, immediately adjacent). The structural undercut predicate is formally correct. However, FR-005 requires the solver to confirm a win for the current player (Red). Every available column scores negative (-4 to -10). Red is losing under perfect play; the solver does not confirm a win. Same failure mode as candidate 1: structural pattern present but position is a loss for the puzzle's current player.
**Evidence from board**: `scr | -10 |  -4 | -10 |  -- | -10 | -10 | -10 |`; `Major threats: col2 row6 (Y)   col3 row3 (Y)   col3 row4 (R)`. All scores negative = Red loses.

---

### Candidate 9c24f23c-7670-4bca-898f-68aeb310ffca — 3655654112336615541751331
**Verdict**: TRUE POSITIVE
**Reasoning**: Yellow is the current player. The highlight_metadata identifies: Red has a major threat at col2 row3 (1-indexed, odd) as `killing_threat`, and Yellow has a major threat at col2 row4 (1-indexed, even) as `dead_threat`. All FR-005 / U1–U3 conditions hold: R=4 (even) and R'=3 (odd) are opposite parity (U1), the pair (4,3) is not the forbidden (3,6)/(6,3) T5 pair (U2), and R=R'+1 satisfies sub-case 3 adjacency (U3). The solver confirms Yellow wins: columns 3, 4, 6, and 7 all score +5, while the undercut column (col2) scores -8. The structure is sound — Yellow must avoid playing col2, which would advance toward Red's row3 threat, rendering Yellow's row4 threat permanently unreachable.
**Evidence from board**: `scr |  -- |  -8 |   5 |   5 |  -- |   5 |   5 |`; `Major threats: col2 row3 (R)   col2 row4 (Y)   col7 row5 (Y)`; `par | 0E  | 5O  | 1O  | 4E  | 0E  | 2E  | 5O  |`.

### Summary
- True positives: 1/3
- False positives: 2/3
- Uncertain: 0/3
- Notes: Both false positives share an identical failure mode — the structural undercut predicate (U1/U2/U3) fires correctly, but the classifier failed to enforce the pipeline-level pre-filter (FR-005 final clause: solver must confirm a win for the current player). All three candidates show the same row-3/row-4 adjacent-opposite-parity pattern. The fix is straightforward: reject any candidate where all solver scores are ≤ 0.

---

## Category: overcut

### Candidate acb7a52f — 44452445313151153473367311
**Verdict**: FALSE POSITIVE
**Reasoning**: The highlight_metadata specifies col 1 rows 3 and 4 as the overcut pair (neutralised_threat and major_threat), but col 1 has **0 empty cells** (par = 0E) — every cell is occupied. Row 3 is Y14 (an occupied Yellow disc) and row 4 is R15 (an occupied Red disc). Occupied cells cannot be threat cells; a major threat requires an empty cell. The actual major-threat activity is in col 2 (5O parity, threats at rows 3/4/5/6 alternating R/Y, solver score +2) and col 6 (row 3=R, row 4=Y, score +2), but neither was used to construct the highlight. The candidate was misclassified because the overcut detector identified a structural threat pair in completed disc positions without verifying the target cells are empty.
**Evidence from board**: `par | 0E  | 5O  | 0E  | 0E  | 2E  | 5O  | 4E  |` — col 1 shows 0E (zero empty cells). Annotated board: col1 rows 1–6 all occupied (Y10, Y12, Y14, R15, R25, Y26).

---

### Candidate 4084af46 — 444445555741212111525771777222
**Verdict**: FALSE POSITIVE
**Reasoning**: The highlight_metadata specifies col 2 rows 2 and 3 as the overcut pair, but col 2 also has **0 empty cells** (par = 0E) — all six cells are filled. Rows 2 and 3 of col 2 are occupied discs (R15 and Y20), not empty threat cells. The actual major threats are in col 3 (6E, scr=+4) and col 6 (6E, scr=-6). The classifier assigned overcut to col 2 based on historical disc positions rather than current empty-cell threat structure.
**Evidence from board**: `par | 0E  | 0E  | 6E  | 0E  | 0E  | 6E  | 0E  |` — col 2 shows 0E. Annotated board: col 2 rows 1–6 all occupied (R13, R15, Y20, Y28, R29, Y30).

---

### Candidate d44f7b4f — 444447535545117553377
**Verdict**: FALSE POSITIVE
**Reasoning**: The highlight_metadata specifies col 5 rows 2 and 3 as the overcut pair (neutralised_threat=row2, major_threat=row3), but col 5 has **0 empty cells** (par = 0E) — all six cells occupied (R7, R9, Y10, Y12, Y16, R17). No threat can exist in a full column. The actual major threats are in col 6: Yellow at row 2 (even), Red at row 3 (odd), Yellow at row 4 (even); col 6 has 6E empty cells and scr=+3 for Yellow (to move). Col 6 displays a genuine chain-T2 overcut pattern, but the classifier pointed to the wrong column entirely.
**Evidence from board**: `par | 4E  | 6E  | 3O  | 0E  | 0E  | 6E  | 2E  |` — col 5 shows 0E. Annotated board: col5 all occupied (R7, R9, Y10, Y12, Y16, R17). `Major threats: col2 row2 (Y)   col6 row2 (Y)   col6 row3 (R)   col6 row4 (Y)` — no col5 threats at all.

### Summary
- True positives: 0/3
- False positives: 3/3
- Uncertain: 0/3
- Notes: All three false positives share a systematic bug — the highlight_metadata points to cells in **fully-occupied columns** (par = 0E for the indicated column in every case). The classifier is detecting a historical structural pattern (discs placed in the correct relative position during the game) rather than checking that the highlighted cells are currently empty. The overcut formal predicate requires threats to be built from actual empty cells. A pre-condition check `assert board[col][row] is empty` on both highlighted cells before writing `highlight_metadata` would catch all three cases.

---

## Category: figure_7

### Candidate af144300-e207-4feb-9e55-1bfaa8f172e9 — 451154722155425466
**Verdict**: TRUE POSITIVE
**Reasoning**: Red has 4 of 5 Figure-7 cells placed — "Ascending+left" variant with anchor (x=3,y=0) in 0-indexed: diagonal arm D1→E2→F3(missing hinge at col6r3) and horizontal arm D3→E3→F3(same hinge). correct_col=5 (0-indexed = col6 1-indexed) is at gravity-top (col6 height=2, row3 immediately playable). After Red completes at F3, two Red major threats appear at col7r3 and col7r4; col7 height=1 so both threats are above gravity (gravity-top count=0, F1 passes; above-gravity=2, F2 passes). Solver confirms Red wins via col6 (scr=+9, only winning column, F3 passes).
**Evidence from board**: `scr |  -4 |  -2 |  -4 |  -4 |  -4 |   9 |  -4 |`; major threats after play: col7 row3 (R), col7 row4 (R).

---

### Candidate 07e5ebcc-9bed-428d-ad52-2f9a9b28c499 — 7733266233227571743712613452
**Verdict**: TRUE POSITIVE
**Reasoning**: Red has 4 of 5 Figure-7 cells placed — "Descending+right" variant: diagonal arm G1→F2→E3(missing hinge at col5r3) and horizontal arm G3→F3→E3(same hinge). correct_col=4 (0-indexed = col5 1-indexed) is at gravity-top (col5 height=2, row3 immediately playable). After Red completes at E3, major threats appear at col4r3 and col4r4. Col4 height=2 so gravity-top=r3: one gravity-top threat (F1: count=1 ≤ 1 passes) and one above-gravity (col4r4, F2 passes). Solver confirms Red wins via col5 (scr=+6, F3 passes).
**Evidence from board**: `scr |   3 |  -- |  -- |   4 |   6 |   5 |  -- |`; major threats after play: col4 row3 (R), col4 row4 (R).

---

### Candidate a91c7e05-f8a7-49e2-b94c-afb26e668580 — 413256643373442475267754533
**Verdict**: TRUE POSITIVE
**Reasoning**: Yellow has 4 of 5 Figure-7 cells placed — "Ascending+left" variant with anchor (x=2,y=2) in 0-indexed: diagonal arm C3→D4→E5(missing hinge at col5r5) and horizontal arm C5→D5→E5(same hinge). correct_col=4 (0-indexed = col5 1-indexed) is at gravity-top (col5 height=4, row5 immediately playable). After Yellow completes at E5, two Yellow major threats appear at col6r5 (`[*]`) and col6r6 (`[Y]`). Col6 height=3, gravity-top=r4: both threats at r5 and r6 are above gravity (gravity-top count=0, F1 passes; above-gravity=2, F2 passes). Solver confirms Yellow wins via col5 (scr=+5, F3 passes).
**Evidence from board**: `scr |  -3 |   4 |  -- |  -- |   5 |  -7 |  -3 |`; major threats after play: col2 row5 (Y), col6 row5 (R+Y), col6 row6 (Y).

### Summary
- True positives: 3/3
- False positives: 0/3
- Uncertain: 0/3
- Notes: All three candidates use the hinge-as-completing-cell pattern. F1 (gravity-top ≤ 1) and F2 (above-gravity ≥ 1) pass cleanly: candidates 1 and 3 have zero gravity-top threats (pure zugzwang), candidate 2 has exactly one (boundary case, still valid). Solver confirmation holds for all three. Classifier appears correct for this category.

---

## Category: j_shape

### Candidate fab25fe2 — 321633212657112246647552714551
**Verdict**: TRUE POSITIVE
**Reasoning**: Move 30, Red to play. Three highlighted cells (0-indexed col4r2, col4r4, col5r3) correspond to Red discs at col5r3 (R23), col5r5 (R29), col6r4 (R19) in 1-indexed — canonical J-shape `{(x,y),(x,y+2),(x+1,y+1)}` with x=4, y=2 (0-indexed). Missing 4th cell is col6r5 (1-indexed), playable as the first empty cell. J1: anchor y=2 (0-indexed) = row3 (1-indexed, odd) ✓. J2: extension cell (x+2,y+3)=(6,5) 0-indexed = col7r6, on-board ✓. J3: no Yellow major threat at any odd row in far column col7 (only major threat in position is col4r6 Red) ✓. J4: Yellow does not occupy horizontal arm cell (x+2,y+2)=(6,4) 0-indexed = col7r5, which is empty ✓. Solver confirms col6 wins (scr=+1, positive).
**Evidence from board**: `scr | -- | -- | 0 | -1 | 0 | 1 | 1`; `Major threats: col4 row6 (R)` (no Yellow major threat in col7); col6r5 and col7r5–6 all empty.

---

### Candidate 246aceef — 5551474236645222752541
**Verdict**: TRUE POSITIVE
**Reasoning**: Move 22, Red to play. Three highlighted cells (0-indexed col4r0, col4r2, col5r1) correspond to Red discs at col5r1 (R1), col5r3 (R3), col6r2 (R11) in 1-indexed — canonical J-shape with x=4, y=0 (0-indexed). Missing 4th cell is col6r3 (1-indexed), playable (col6 rows 1–2 filled). J1: anchor y=0 (0-indexed) = row1 (1-indexed, odd) ✓. J2: extension (6,3) 0-indexed = col7r4, on-board ✓. J3: far column is col7 (1-indexed); only Yellow major threat is at col3r4 (1-indexed), not in col7 ✓. J4: col7r3 (1-indexed) is empty, Yellow does not occupy it ✓. Solver confirms col6 wins (scr=+9, strongly positive).
**Evidence from board**: `scr | -2 | -2 | -2 | 9 | -- | 9 | -2`; `Major threats: col3 row4 (Y)   col3 row5 (R)   col6 row4 (R)` (no Yellow threat in col7).

---

### Candidate 4ea274d8 — 422426666257143212454
**Verdict**: TRUE POSITIVE
**Reasoning**: Move 21, Yellow to play. Three highlighted cells (0-indexed col5r0, col5r2, col4r1) correspond to Yellow discs at col6r1 (Y6), col6r3 (Y8), col5r2 (Y4) in 1-indexed — mirror J-shape `{(x,y),(x,y+2),(x-1,y+1)}` with x=5, y=0 (0-indexed). Missing 4th cell is col5r3 (1-indexed), playable (col5 rows 1–2 filled). J1: anchor y=0 (0-indexed) = row1 (1-indexed, odd) ✓. J2: for mirror J, x-3 ≥ 1 (1-indexed); x=6 → 6-3=3 ≥ 1 ✓. J3: far column is col4 (1-indexed); no Red major threat there (major threats at col3 1-indexed) ✓. J4: horizontal arm cell (x-2,y+2) 0-indexed = col4r3 (1-indexed) contains Y14 (Yellow, current player, not opponent Red) ✓. Solver confirms col5 wins (scr=+5, positive).
**Evidence from board**: `scr | -9 | -- | -10 | -9 | 5 | -9 | -9`; `Major threats: col3 row3 (R)   col3 row4 (R+Y)`; annotated board col4r3 shows Y14 (Yellow disc, not opponent Red).

### Summary
- True positives: 3/3
- False positives: 0/3
- Uncertain: 0/3
- Notes: All three candidates use the row-1 anchor (y=0 0-indexed), the most common configuration. Candidates 1 and 2 are canonical J-shapes extending rightward; candidate 3 is a mirror J extending leftward with Yellow active. The J3 and J4 checks were most important to verify: in candidate 3, major threats at col3 (1-indexed) were initially easy to misread as being in far column col4, but careful column-index alignment confirmed they are in a different column. All solver scores are positive and well above zero.

---

## Classifier Health Assessment & Recommended Actions

| Category  | Assessment | Action |
|-----------|-----------|--------|
| z_threat  | Healthy — all 3 valid, metadata fields accurate | Minor: verify strict Z-threat uniqueness for candidate 37ec5800 (two valid Z-threat columns) |
| claimeven | Healthy — all 3 valid (all Subtype B) | Minor: persist simulation traces to `category_evidence` (null for all 3) |
| undercut  | **Bug: FR-005 solver-win pre-filter not applied** | Reject candidates 3170300a and 5f82a70b; add `assert all_solver_scores > 0` gate |
| overcut   | **Bug: highlighted cells in fully-occupied columns** | Reject all 3 candidates; add `assert board[col][row] is empty` pre-condition check on both highlighted cells |
| figure_7  | Healthy — all 3 valid, F1/F2/F3 pass cleanly | No action needed |
| j_shape   | Healthy — all 3 valid, J1–J4 pass | No action needed |

### Candidates to reject (mark `status = 'rejected'`)

| ID | Movestring | Category | Reason |
|----|-----------|----------|--------|
| 3170300a-89ad-4e4c-ab75-28a27fb01691 | `43633675553351776` | undercut | FR-005 fails — all solver scores negative (Yellow loses) |
| 5f82a70b-f7e0-4708-980f-b58f7abff172 | `6237442552661262164444` | undercut | FR-005 fails — all solver scores negative (Red loses) |
| acb7a52f (full id needed) | `44452445313151153473367311` | overcut | Highlighted col1 is fully occupied (par=0E) |
| 4084af46 (full id needed) | `444445555741212111525771777222` | overcut | Highlighted col2 is fully occupied (par=0E) |
| d44f7b4f (full id needed) | `444447535545117553377` | overcut | Highlighted col5 is fully occupied (par=0E) |
