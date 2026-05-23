# Candidate Review — 2026-05-20

## Overall Summary

18 candidates sampled (3 per category across 6 categories).

| Category  | Valid | False Positive | Uncertain |
|-----------|-------|----------------|-----------|
| z_threat  | 3/3   | 0              | 0         |
| claimeven | 0/3   | 0              | 3         |
| undercut  | 2/3   | 0              | 1         |
| overcut   | 2/3   | 1              | 0         |
| figure_7  | 2/3   | 1              | 0         |
| j_shape   | 3/3   | 0              | 0         |
| **TOTAL** | **12/18** | **2/18**   | **4/18**  |

---

## Category Reports

---

### Category: z_threat

**Candidate 8ef98e6a-5103-4860-a365-5755a07fbf5b**
- Movestring: `1040415306413411`
- correct_col: 2 (0-indexed)
- Board summary: Move 16, Red to move. Column 2 (0-indexed, display col 3) is completely empty with a single Red major threat at row 2 (0-indexed, display row 3). The column has par 6E overall, but the Z-threat count to the threat cell is 3 (odd). All other solver scores are positive; no other major threats exist on the board.
- Verdict: VALID
- Reasoning: Column 2 (0-indexed) has a Red major threat at row 2 (0-indexed); empty_count = 2 - 0 + 1 = 3 (odd) → Z-Threat per FR-001. It is the unique Z-threat column and the solver confirms a win (score 9). The `highlight_metadata` fields match: fromRow=0 = column height, toRow=2 = threat row, badgeCount=3. `correct_col=2` matches the Z-threat column.

**Candidate d4825581-0487-4d5f-8d90-41780779e877**
- Movestring: `3333325623255261`
- correct_col: 4 (0-indexed)
- Board summary: Move 16, Red to move. Column 4 (0-indexed, display col 5) is empty with Red major threats at rows 2 and 3 (0-indexed). The Z-threat count to the lowest threat (row 2) is 3 (odd). All playable columns show positive solver scores. No major threats exist in any other column.
- Verdict: VALID
- Reasoning: Column 4 (0-indexed) has a Red major threat at row 2 (0-indexed); empty_count = 2 - 0 + 1 = 3 (odd) → Z-Threat per FR-001. It is the unique column with a Z-threat, and the solver confirms a win (score 3). The `highlight_metadata` fields match: fromRow=0, toRow=2, badgeCount=3. `correct_col=4` matches.

**Candidate ddcfcca6-df81-4820-ac26-6f9a4324b19e**
- Movestring: `34462355516366314411662122402231`
- correct_col: 0 (0-indexed)
- Board summary: Move 32, Red to move. Column 0 (0-indexed, display col 1) has one disc (Y at row 0), making height=1, with a Red major threat at row 3 (0-indexed). Column 5 (0-indexed) also has a Red major threat at row 5 with odd empty-count=3, but its solver score is -5 (Red loses if played there). Most other columns are full.
- Verdict: VALID
- Reasoning: Column 0 (0-indexed) has a Red major threat at row 3 (0-indexed); empty_count = 3 - 1 + 1 = 3 (odd) → Z-Threat per FR-001. Column 5 also has an odd-count Z-threat but is solver-losing, so col 0 is the unique Z-threat column confirmed winning (score 3). The `highlight_metadata` fields match: fromRow=1 = column height, toRow=3 = threat row, badgeCount=3. `correct_col=0` matches.

**Summary**
- Valid: 3/3
- False positives: 0/3
- Uncertain: 0/3

---

### Category: claimeven

**Candidate bf62bef0-4e89-42b4-a0b2-44ce01a0dece**
- Movestring: `3601101332431132142230640`
- correct_col: 4
- Board summary: Move 25, Yellow to move. Six of seven columns have even empty-cell counts. Only col4 (0-indexed) has an odd count (3 empty). Yellow playing col4 reduces col4 to 2 empty cells, making all columns even — a unique equalising move. Solver score for col4 is +3 (winning for Yellow).
- Verdict: UNCERTAIN
- Reasoning: The board satisfies FR-002(a) (not yet claimeven-valid) and FR-002(b) (unique equalising move = col4, matching correct_col=4). However, `category_evidence` is NULL — there is no stored `simulation_trace` and no recorded subtype. FR-002(c) requires the claimeven simulation to confirm Yellow wins; without the trace we cannot verify the deterministic pairing succeeds. The solver score confirms col4 is a winning move, but the full claimeven simulation is a stricter check than solver confirmation alone.

**Candidate c3abdd7e-3504-4e77-9b2d-85c411857949**
- Movestring: `33026402003422366`
- correct_col: 6
- Board summary: Move 17, Yellow to move. Six of seven columns have even empty-cell counts (cols 0–5 all even: 2E, 6E, 2E, 2E, 4E, 6E). Only col6 has an odd count (3 empty). Playing col6 reduces it to 2E, making all columns even. Solver score for col6 is +6 (strongly winning for Yellow). There are major threats in col1 (rows 2 and 3 for Red) and col5 (row 2 for Yellow).
- Verdict: UNCERTAIN
- Reasoning: The structural conditions of FR-002(a) and FR-002(b) are satisfied (board is not claimeven-valid; unique equalising move is col6, matching correct_col=6). However, `category_evidence` is NULL — no stored subtype or simulation_trace exists. FR-002(c) requires the claimeven simulation to confirm Yellow wins via the pairing strategy; without the trace this cannot be verified. The strong solver score (+6) suggests it is a genuine win, but does not substitute for the simulation confirmation the spec mandates.

**Candidate df0de633-4855-47cd-ae94-ccf573a6e8ab**
- Movestring: `655046104405556234110541004666112`
- correct_col: 3
- Board summary: Move 33, Yellow to move. Columns 0, 1, 4, 5, 6 are all full (0 empty), col2 has 4 empty (even), and only col3 has 5 empty cells (odd). Playing col3 reduces it to 4E, making all columns even or full. Solver score for col3 is +2 (winning for Yellow). Col3 also has multiple major threats (rows 2 and 6 for Red, rows 3 and 5 for Yellow) making it a rich tactical column.
- Verdict: UNCERTAIN
- Reasoning: FR-002(a) is satisfied (col3 is odd, so the board is not yet claimeven-valid) and FR-002(b) is satisfied (col3 is the unique equalising move, matching correct_col=3). However, `category_evidence` is NULL — no simulation_trace exists to confirm FR-002(c). Additionally, with col3 having 5 empty cells and multiple competing threats in that column (Red at rows 2 and 6, Yellow at rows 3 and 5), the claimeven pairing simulation would need careful verification to ensure Yellow's response-above strategy navigates these threats correctly. The solver score of +2 is only modestly positive.

**Summary**
- Valid: 0/3
- False positives: 0/3
- Uncertain: 3/3 (bf62bef0, c3abdd7e, df0de633)

---

### Category: undercut

**Candidate 22d8d270-a39a-4f25-aee7-49818c71c823**
- Movestring: `33343406035352244641`
- correct_col: NULL
- Board summary: Move 20, Red to play. Major threats in col 6 (display) = col 5 (0-indexed): Yellow at row 4 (even, 1-indexed) and Red at row 5 (odd, 1-indexed). Yellow's even-row threat is below Red's odd-row threat in the same column. The solver scores show col 5 (0-indexed) scores -11 for Red — playing there is Red's worst move — while cols 0 and 2 score +9 (winning).
- Verdict: VALID
- Reasoning: Satisfies FR-005 exactly: Red (current player) has a major threat at row 5 (odd, 0-indexed row 4) in col 5, and Yellow (opponent) has a major threat at row 4 (even, 0-indexed row 3) in the same col 5, lower row, killing Red's threat. U1 (opposite parity 4/5), U2 (not row 3+6 pair), U3 (not applicable — Red's threat is odd, not even) all pass. highlight_metadata correctly labels Yellow's cell as `killing_threat` and Red's cell as `dead_threat` with the killing_threat at the lower 0-indexed row (3 < 4). `correct_col` is NULL but this is a DB completeness issue, not a structural invalidity.

**Candidate 5b29adde-6522-4867-baba-3eeb86723253**
- Movestring: `23554452355042641440211115`
- correct_col: NULL
- Board summary: Move 26, Red to play. Major threats in col 4 (display) = col 3 (0-indexed): Yellow at row 4 (even, 1-indexed) and Red at row 5 (odd, 1-indexed). Cols 4 and 5 are full. Solver scores col 3 (0-indexed) at -8 for Red (second-worst available), while col 1 scores +3 (winning for Red).
- Verdict: VALID
- Reasoning: FR-005 conditions met: Red's major threat at row 5 (odd) in col 3, Yellow's major threat at row 4 (even) in the same col 3 at a lower row, undercutting Red's threat. U1 (rows 4/5 opposite parity), U2 (not 3+6 pair), U3 (not applicable — Red's threat is odd-row) all pass. highlight_metadata correctly assigns roles with killing_threat (Yellow, 0-indexed row 3) below dead_threat (Red, 0-indexed row 4).

**Candidate e433d40c-319b-4279-8a97-8e4ea7b15f42**
- Movestring: `2563522251161521541042331336`
- correct_col: NULL
- Board summary: Move 28, Red to play. Two undercut pairs exist: col 1 (display) = col 0 (0-indexed) with Yellow at row 4 / Red at row 5, and col 5 (display) = col 4 (0-indexed) with Yellow at row 4 / Red at row 5. All solver scores are negative (Red is losing); col 0 scores -5, col 4 scores -7. highlight_metadata focuses on col 0. The presence of two simultaneous undercut structures makes the intended "wrong column" ambiguous.
- Verdict: UNCERTAIN
- Reasoning: The undercut structure at col 0 individually satisfies FR-005 and all three parity constraints (U1/U2/U3). However, col 4 (0-indexed) also has an identical undercut structure (Yellow row 4 / Red row 5), and col 4 is actually the worst move (-7) while col 0 is -5. With two valid undercut columns present, it is unclear which column should be `correct_col` (excluded), and a learner who plays col 0 while col 4 is also wrong would receive a confusing experience. The spec FR-013 says "any column that does not activate the opponent's undercutting threat MUST be accepted as correct" — but with two such threat-activating columns, the puzzle design is ambiguous and the correct_col cannot be determined without additional editorial judgment.

**Summary**
- Valid: 2/3 (22d8d270, 5b29adde)
- False positives: 0/3
- Uncertain: 1/3 (e433d40c — two simultaneous undercut structures create ambiguity about which column to penalize)

---

### Category: overcut

**Candidate af435cd2-6a14-4f02-884f-30944e5524e9**
- Movestring: `40634336035150310114402255`
- correct_col: NULL (should be 2, 0-indexed)
- Board summary: Move 26, Red to move. Col 2 (0-indexed) / col 3 (1-indexed) is the only winning column (score +5). Red has major threats at col3 rows 4 and 6 (1-indexed), Yellow has a major threat at col3 row 3 (1-indexed). Col 2 has 4 empty cells (4E parity).
- Verdict: VALID
- Reasoning: `major_threat` (row 5 0-indexed = row 6 1-indexed, even) vs `neutralised_threat` (row 2 0-indexed = row 3 1-indexed, odd) in col 2 (0-indexed). Rows {3, 6} (1-indexed) = the T5 exception pair — T5 overrides T2 for this specific pair even though they have opposite parity, so Red's row-6 threat survives. Solver confirms col 2 scores +5. All highlight_metadata cells match the correct threat pair.

**Candidate 7a1e3aba-b76d-46a8-ba42-7e782d0906e0**
- Movestring: `653564561352321115303326`
- correct_col: NULL
- Board summary: Move 24, Red to move. Col 4 (0-indexed) / col 5 (1-indexed) is the only winning column (score +8, 5O parity). Red has major threats at col5 rows 3, 4, 5 (1-indexed); Yellow has a major threat at col5 row 2 (1-indexed, even).
- Verdict: FALSE POSITIVE
- Reasoning: The `highlight_metadata` identifies `major_threat` at row 3 (0-indexed) = row 4 (1-indexed, even) and `neutralised_threat` at row 1 (0-indexed) = row 2 (1-indexed, even). Both threats are at even rows — same parity. The formal predicate's T1 guard skips this pair because Red has a major threat at row 3 (1-indexed) = R-1 for R=4, indicating a T1 guaranteed win rather than an overcut. The actual active-forcing overcut (if any) in this position would be at the pair (major_threat = row 2 0-indexed = row 3 1-indexed, neutralised_threat = row 1 0-indexed = row 2 1-indexed), but that is not what the metadata captures. The stored metadata cells do not match a valid overcut pair per the formal predicate.

**Candidate 372dc61b-3618-410d-978e-62a616d24d13**
- Movestring: `34113313660264433466064114005`
- correct_col: NULL (should be 5, 0-indexed)
- Board summary: Move 29, Yellow to move. Col 5 (0-indexed) / col 6 (1-indexed) is one of the winning columns (score +2, 5O parity). Yellow has major threats at col6 rows 3 and 5 (1-indexed); Red has a major threat at col6 row 4 (1-indexed, even).
- Verdict: VALID
- Reasoning: `major_threat` (row 4 0-indexed = row 5 1-indexed, odd) vs `neutralised_threat` (row 3 0-indexed = row 4 1-indexed, even) in col 5 (0-indexed). T2 sub-case 1 would normally fire (Red even row 4 below Yellow odd row 5), but chain-T2 exception (d) applies: Yellow has a lower major threat at row 3 (1-indexed, odd), and Red's row 4 (even) is immediately above it (3+1=4), satisfying T2 sub-case 3 bottom-up — Yellow's row-3 threat neutralizes Red's row-4 threat first, leaving Yellow's row-5 threat alive. Solver confirms col 5 (0-indexed) scores +2.

**Summary**
- Valid: 2/3 (af435cd2, 372dc61b)
- False positives: 1/3 (7a1e3aba — metadata identifies the wrong threat pair; T1 guard blocks the stated T4-parity pair at R=4)
- Uncertain: 0/3

---

### Category: figure_7

**Candidate c22172f0-da6d-4292-91da-d467b4b38533**
- Movestring: `34505332261153256265`
- correct_col: 1
- Board summary: Move 20, Red to play. The board has Red pieces at (3,0),(2,1),(2,2),(3,2) which are identified as pattern_pieces. These correspond to a Descending+right Figure-7 partial structure with anchor x=3,y=0, missing cell at (col=1,row=2). However, the cell at (col=1,row=2) is already occupied by Yellow (Y12). The solver scores show col 0,1,2,3,5 all winning for Red (score 8–10), but col 4 loses.
- Verdict: FALSE POSITIVE
- Reasoning: The completing cell at (col=1, row=2) for the Descending+right variant is already occupied by Yellow (Y12). FR-007 requires the missing 5th cell to be a "legal playable cell still empty." Since (1,2) is occupied by the opponent rather than being empty and playable, the Figure-7 predicate fails — there is no valid Figure-7 structure with a legal completing move in col 1.

**Candidate bdf08072-4180-4dea-80fd-36677a1aafe1**
- Movestring: `533333123551611426216060`
- correct_col: 2
- Board summary: Move 24, Red to play. Red occupies (3,1),(2,2),(1,3),(3,3) — the 4 highlighted pattern pieces. These form a Descending+right Figure-7 partial structure at anchor (x=3,y=1): diagonal {(3,1),(2,2),(1,3)} plus horizontal {(1,3),(2,3),(3,3)}, with the hinge at (3,3). The completing cell (col=2, row=3) is empty (shown as `[Y]`, the next playable cell in col 2). After completion, threat cells are at (4,3) and (4,4) in col 4 (0-indexed), both above gravity (col 4 height=1). Solver confirms col 2 scores +7.
- Verdict: VALID
- Reasoning: All 4 pattern pieces are Red-occupied, the completing cell (col=2,row=3) is empty and gravity-playable, the two resulting threat cells at (col=4,row=3) and (col=4,row=4) are in the same column and both above gravity satisfying F1 and F2, and the solver confirms a Red win (score +7) after playing col 2.

**Candidate 4482a1b7-5313-4db1-9403-eeb0f7f4675b**
- Movestring: `021115016640124442266014240203636`
- correct_col: 3
- Board summary: Move 33, Yellow to play. Yellow occupies (2,0),(3,1),(4,2),(2,2) — the 4 highlighted pattern pieces. These form an Ascending+left Figure-7 partial structure at anchor (x=2,y=0): diagonal {(2,0),(3,1),(4,2)} plus horizontal {(4,2),(3,2),(2,2)}, with the hinge at (4,2). The completing cell (col=3, row=2) is empty (`[R]` major Red threat) and is the next gravity-playable cell in col 3. After completion, threat cells are at (5,2) and (5,3) — both in col 5 (0-indexed), both above gravity (col 5 height=1). Solver confirms col 3 scores +2.
- Verdict: VALID
- Reasoning: All 4 pattern pieces are Yellow-occupied, the completing cell (col=3,row=2) is empty and gravity-playable, the threat cells at (col=5,row=2) and (col=5,row=3) satisfy the same-column property and both are above gravity (F1 and F2 satisfied), and the solver confirms a Yellow win (score +2) after playing col 3.

**Summary**
- Valid: 2/3
- False positives: 1/3 (c22172f0 — completing cell occupied by opponent)
- Uncertain: 0/3

---

### Category: j_shape

**Candidate 987ba73f-ddee-4a36-9b4b-ccccbefb98fc**
- Movestring: `2102652531506034`
- correct_col: 3 (0-indexed)
- Board summary: Move 16, Red to play. Red has pieces at col2 row0, col2 row2, col3 row1 forming 3/4 of a canonical J-shape. The board is relatively open in the upper section, no major threats present, solver scores show col3 (0-indexed) at 9 confirming a win.
- Verdict: VALID
- Reasoning: All 3 pattern cells are occupied by Red; completing cell (col3, row2) is at the correct column height; J1 passes (anchor row 0, 0-indexed even); J2 passes (far cell col4 row3 is on-board); J3 passes (no Yellow major threat at odd 1-indexed row in far col4); J4 passes (col4 row2 is empty); solver score 9 confirms Red win after completing move.

**Candidate a664a29c-3258-4f1a-8ee9-7cc151a1bba3**
- Movestring: `0530205115540133130410563`
- correct_col: 4 (0-indexed)
- Board summary: Move 25, Yellow to play. Yellow has pieces at col5 row0, col5 row2, col4 row1 forming 3/4 of a mirror J-shape. Col3 (0-indexed) has a contested major-threat column; solver score for col4 (0-indexed) is 5 (positive = Yellow wins). Major threats in col3 are on even 1-indexed rows (4 and 6), so they do not cancel Yellow's J-shape zugzwang.
- Verdict: VALID
- Reasoning: All 3 pattern cells are Yellow; completing cell (col4, row2) is at the correct column height and empty; mirror J conditions pass — J1 (anchor row 0, even 0-indexed), J2 (far extension col3 row3 on-board), J3 (no Red major threat at odd 1-indexed row in far col3), J4 (col3 row2 is empty); solver confirms Yellow win.

**Candidate cb6ae77e-668a-4d54-b0fa-f12a35c17c0a**
- Movestring: `36033056024001412664`
- correct_col: 2 (0-indexed)
- Board summary: Move 20, Red to play. Red has pieces at col3 row0, col3 row2, col2 row1 forming 3/4 of a mirror J-shape. Board has major Red threats at col3 row4 and col6 row3 but none in the J-shape's far column (col1 0-indexed). Solver score for col2 (0-indexed) is 10, confirming a strong Red win.
- Verdict: VALID
- Reasoning: All 3 pattern cells are Red; completing cell (col2, row2) is at the correct column height and empty; J1 passes (anchor row 0, even 0-indexed); J2 passes (far extension col1 row3 on-board); J3 passes (Yellow has no major threat at odd 1-indexed row in far col1); J4 passes (col1 row2 is empty); solver confirms Red win.

**Summary**
- Valid: 3/3
- False positives: 0/3
- Uncertain: 0/3

---

## Recommended Actions

### Mark as `status = 'rejected'` (FALSE POSITIVE)

| ID | Category | Reason |
|----|----------|--------|
| `7a1e3aba-b76d-46a8-ba42-7e782d0906e0` | overcut | `highlight_metadata` identifies the wrong threat pair — stored (major_threat=row4 1-indexed even, neutralised_threat=row2 1-indexed even) is blocked by the T1 guard (Red has threat at R-1=3); the actual active-forcing overcut pair if it exists would be at (row3 1-indexed, row2 1-indexed), which the metadata does not capture. |
| `c22172f0-da6d-4292-91da-d467b4b38533` | figure_7 | The completing cell at (col=1, row=2) is occupied by the opponent (Yellow Y12), not empty. FR-007 requires the 5th cell to be a legally playable empty cell. |

### Manual curator review required (UNCERTAIN)

| ID | Category | Reason |
|----|----------|--------|
| `bf62bef0-4e89-42b4-a0b2-44ce01a0dece` | claimeven | `category_evidence` is NULL; FR-002(c) simulation trace required to confirm Yellow wins via claimeven pairing. Re-run classifier to populate. |
| `c3abdd7e-3504-4e77-9b2d-85c411857949` | claimeven | `category_evidence` is NULL; same issue as above. Re-run classifier. |
| `df0de633-4855-47cd-ae94-ccf573a6e8ab` | claimeven | `category_evidence` is NULL; additionally col3 has multiple competing threats (Red rows 2+6, Yellow rows 3+5) making the pairing simulation non-trivial; verify manually after re-running classifier. |
| `e433d40c-319b-4279-8a97-8e4ea7b15f42` | undercut | Two simultaneous undercut structures present (col0 and col4, 0-indexed), both with Yellow row4/Red row5 threat pairs; `correct_col` is NULL and ambiguous; editorial judgment required to select which column to penalize or whether to reject. |

### Classifier health

| Category | Assessment |
|----------|-----------|
| z_threat | All 3 sampled positions valid — classifier appears healthy for sampled positions. |
| j_shape  | All 3 sampled positions valid — classifier appears healthy for sampled positions. |
| claimeven | All 3 UNCERTAIN due to missing `category_evidence` — classifier must be re-run with simulation trace storage enabled before these candidates can be approved. |
| undercut | 2/3 valid; 1 uncertain due to multiple simultaneous undercut structures (an edge case the classifier may not handle). |
| overcut  | 2/3 valid; 1 false positive where metadata captures the wrong threat pair (T1 guard fires on the stored pair). Investigate whether the overcut classifier correctly applies the T1 guard before emitting `highlight_metadata`. |
| figure_7 | 2/3 valid; 1 false positive where the completing cell was occupied by the opponent at detection time. Investigate whether the figure_7 classifier verifies that the 5th cell is empty before emitting the candidate. |
