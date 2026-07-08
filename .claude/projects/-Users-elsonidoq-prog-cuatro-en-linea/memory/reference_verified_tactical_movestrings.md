---
name: reference_verified_tactical_movestrings
description: "Verified movestrings for Allen V-rules (V1–V5), Allis rules (claimeven/baseinverse/vertical/aftereven/lowinverse/highinverse/before/baseclaim/specialbefore), and the Allen T4 Case-A regression position"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

Solver-verified example movestrings for the strategic rules. Coordinates in the notes are as printed by `./visualize_board.sh`. **Token legend (current format):** `X`=player1=GREEN, `O`=player2=GRAY; `[X]`/`[O]` major threat, `<X>`/`<O>` gravity-top major, `(x)`/`(o)` minor threat, `[*]`/`(*)` both players; major-threats list tags the owner as `(X)`/`(O)`. (These notes were migrated from the old `R`/`Y` token format.) Canonical source files noted per group.

## Allen V-rules — `specs/008-new-puzzle-categories/allen_v_rule_examples.yaml`
| Rule | Movestring | Winner | Key structure |
|---|---|---|---|
| V5 | `42354643256425346355663` | Draw | col1r3(X)+col7r5(O) odd threats → T7 cancels both; all scr=0 |
| V3 | `77273746` | Red | col5r1(X)+col7r5(O) cancel via T7; col1r1(X) survives; scr=[17,-17,-17,-17,17,-17,16] |
| V2 | `727364` | Black | col1r1(O)+col5r1(O) odd threats; Red 0 threats; all scr=-18 |
| V1 | `44452556366` | Red | col1r1,col3r3,col7r3 (X) — 3 Red odd, 0 Black odd; no T7 needed |
| V4 | `2134124321317273` | Black | col4r4(O) even threat; no odd threats anywhere; scr all negative |
- **V2/V3 row-1 trick:** 3 consecutive cols at row 1 create two simultaneous horizontal windows, e.g. cols 2,3,4 → `[O]` at col1r1 AND col5r1. **T7:** one Red-odd + one Black-odd in *separate* columns cancel 1:1 — count pairs. **V4:** alternate rows 1–3 to avoid odd-row threats; Yellow gets 3-in-a-row at row 4. **V1:** Black mirrors with even-row threats only (T6 makes them worthless).

## Allis rules — `docs/knowledge-base/allis-*.md` (each rule's `worked_examples`); verified 2026-05-18
| Rule | Movestring | Key structure |
|---|---|---|
| claimeven (boardwide) | `2364354354354256` | all par=E, [X] col2/col6 row4, all scr=-13 |
| claimeven (singlepair) | `7112233` | Claimeven col4 rows1-2; [X] col4 row2 |
| baseinverse | `2233` | (col1,r1)+(col4,r1) in (x) window cols1-4 row1; structural (col4 scr=18) |
| vertical | `41424` | Vertical col4 rows4-5 (upper=r5 odd); [X] col4 row4; scr≤0 |
| aftereven | `71122` | Red cols1-2 row2; Claimeven col3/col4 rows1-2; structural (col2 scr=+2) |
| lowinverse | `45675172537` | col4+col6 Vertical pairs rows2-3 (upper=r3 odd); (x) cols4-7 row3; scr≤0 |
| highinverse | `45675172537` | same position; col4+col6 triple rows2,3,4 |
| before | `36666` | "/" diag col3-6 rows1-4; Claimeven col4 rows1-2 + Vertical col5 rows2-3; scr≤0 |
| baseclaim | `263223362` | P1=col5r1,P2=col4r1(odd),P3=col1r1,E=col4r2; "\" diag col5–col2 rows1-4 has Red at col3r3+col2r4 → (x) through P1+E; horiz row1 cols1-4 has Red at col2r1+col3r1 → (x) through P2+P3; scr≤0 |
| specialbefore | `2365555` | "/" diag Before group; col3r2 directly playable; col4r3 Vertical; scr≤0 |
- baseinverse/aftereven are structural demos (positions not Black-winning; some scr>0). lowinverse+highinverse share one movestring (both rules on one position).

## Allen T4 Case A — full entry `docs/knowledge-base/allen-t4.md` (Allen 2010 Ch.4 p.98)
- **Movestring:** `1115222555577773663636617` — Red has two major threats at col4 row3 AND col4 row5 (both odd, SAME column). Col4 entirely empty (par=6E); no other Red odd-row majors; Yellow to move.
- **Outcome:** all scr negative (Yellow wins). The two same-column odd threats produce NO V1/V3 win — confirms T4 (no cumulative bonus for same-parity threats in one column); Yellow's win is external structure. Verified 2026-05-17. Use as the Case-A regression for any T4 detector / parity analyzer / threat-simplifier.
- **Still PENDING movestrings:** T4 Case B (opposite-colour same-parity same column: R@(C,3)+Black@(C,5)); false positives for same-parity-different-column (V1), same-column-different-parity (T5), same-column-adjacent-rows (T1).

Related: [[reference_external_pdfs]].


---

## (merged from `reference_t4_vs_forced_win_trap` — Movestring 1115222555577773663636617 is a T4 classification example, NOT a forced_win puzzle; also 1-indexed)

The movestring `1115222555577773663636617` (stored in project KB as `reference_t4_example_movestring.md`) is a **T4 Case A classification example** from Allen 2010 — it demonstrates two Red odd-row threats at col4. It is NOT a valid forced_win sequence puzzle.

**Two reasons it fails as a forced_win source:**
1. **Wrong category**: All 7 columns fail `ForcedWinStrategy.validateMove()` — the position has no valid forcing move from Yellow's perspective.
2. **1-indexed digits**: The movestring uses digits 1-7. The server's `SEQUENCE_POSITION_RE = /^[0-6]{0,41}$/` regex rejects 1-indexed digits. The project uses 0-indexed movestrings everywhere.

**What to use instead:** Query the `puzzles` table for `category = 'forced_win' AND is_active = true`, or pull from the `candidates` table. The known-good double-threat puzzle is `d05f7be5-97ee-4686-b194-23ee0951ebd9` (movestring `3332253320451552466226`, returns 2 threatCells `[{c:1,r:2},{c:4,r:4}]` at success).

**Why:** Discovered during spec 034 T006b when the spec-suggested movestring failed validation for all 7 columns. The KB reference never claimed it was a forced_win puzzle — it was always a T4 example.

**How to apply:** Never use this movestring for forced_win testing or puzzle seeding. When reading KB reference movestrings, always verify the index base (0-indexed vs 1-indexed) — KB entries may be 1-indexed.
