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
> ⚠️ **This table is partly STALE — see the 2026-07-11 UPDATE block below.** V1 (`44452556366`) and
> V5 (`42354643256425346355663`) FAILED independent solver re-verification and must NOT be reused;
> V2/V4 here are 1-indexed. The **KB entries `docs/knowledge-base/allen-v{1..5}.md` are now the
> source of truth** (backfilled + `solver_verified: 2026-07-11`). Pull movestrings from the KB, not
> this table.

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

## Allen T1–T7 are DETECTORS, not board operators — and KB is the verification source of truth
- **T1–T7 are threat-simplification rules**, signature `t*_winner(threats) -> (player, col) | None` (see
  `docs/knowledge-base/allen-t1.md` `formal_predicate`, `type: transformation_rule`). Input is a **threat SET**,
  output is a **winner** — they do NOT mutate a board into a new board. They simplify a threat set to feed the
  V1–V5 win/loss/draw evaluation ("after T1–T7 simplification…"). Do NOT model them as board-transformation
  operators that widen the candidate-board pool (that misreading drove a whole bad epic framing, corrected in the
  spec-044 review 2026-07-10).
- **Verification status: trust the KB entries, not this table.** In `docs/knowledge-base/`: **T1,T2,T3,T4(A+B),
  T5,T6,T7 all have `solver_verified` worked examples**; **V1,V2,V4,V5 are `movestring: PENDING` / `solver_verified:
  PENDING` in their KB entries** (the verified V-movestrings live ONLY in this memory's table above — never
  backfilled into the KB); **V3 is verified in-entry**. So the epic-4 KB backfill (spec 044 US5) copies this
  memory's V1/V2/V4/V5 movestrings INTO their KB `worked_examples`; T1–T7 need no backfill.
- **UPDATE 2026-07-11 (spec 044 US5, T031-T037, Batch 3): backfill complete, and this table's V1/V5 movestrings
  turned out to be WRONG on independent re-verification** — do not reuse them. `V1`'s `44452556366` and `V5`'s
  `42354643256425346355663` were re-run through a direct solver query + `./visualize_board.sh`: neither
  reproduced its claimed threat structure or outcome (V1's board showed an unrelated imminent Black win with only
  2 major threats total, not 3 separate Red odd threats; V5's board scored -2/all-columns, a Red win, not a
  Draw, and had no col1r3/col7r5 threat pair). Both were replaced in the KB with independently solver-verified
  substitutes (`allen-v1.md`: `16213263616`; `allen-v5.md`: `31243532145314235244552`, reusing `allen-t7.md`'s
  own already-verified second worked example). `V2`'s `727364` and `V4`'s `2134124321317273` in this table are
  1-indexed (contain digit 7, invalid for this project's 0-indexed `SEQUENCE_POSITION_RE`) — their 0-indexed
  forms (`616253`, `1023013210206162` respectively) WERE independently re-verified and DID match their KB
  entries' descriptions; those backfills succeeded as-is (after the index-base conversion). `V3`'s KB entry
  already had a real, correctly 0-indexed, re-confirmed movestring (`333330211113120000012222`) — this table's
  `77273746` for V3 does not appear in the KB entry at all (it is 1-indexed digits equal to `66162635` 0-indexed,
  which is a different position — `allen-t7.md`'s own second worked example, not V3's). All 5 KB entries
  (`allen-v1.md`…`allen-v5.md`) now carry independently solver-verified `worked_examples`; see each file's
  `solver_verified: 2026-07-11` stamp for the final movestring used.

## Allen T4 Case A — full entry `docs/knowledge-base/allen-t4.md` (Allen 2010 Ch.4 p.98)
- **Movestring:** `1115222555577773663636617` — Red has two major threats at col4 row3 AND col4 row5 (both odd, SAME column). Col4 entirely empty (par=6E); no other Red odd-row majors; Yellow to move.
- **Outcome:** all scr negative (Yellow wins). The two same-column odd threats produce NO V1/V3 win — confirms T4 (no cumulative bonus for same-parity threats in one column); Yellow's win is external structure. Verified 2026-05-17. Use as the Case-A regression for any T4 detector / parity analyzer / threat-simplifier.
- **T4 Case B (opposite-colour same-parity same column: R@(C,3)+Black@(C,5)):** **RECONCILED 2026-07-11 (spec 044
  US5, T036).** This memory previously called Case B PENDING — that was the stale claim. Independently re-ran a
  direct solver query against `docs/knowledge-base/allen-t4.md`'s existing Case-B movestring
  (`33104201250010221152`): scores `[-5,-10,-10,11,-5,-10,-10]`, mover=Red, matching the KB's own description
  verbatim (col4 display / col3 0-indexed scores +11, Red claims the row-3 threat first). **The KB was correct;
  this memory's "still PENDING" label was the error** — confirmed via direct re-verification, not assumed. False
  positives to guard: same-parity-different-column (V1), same-column-different-parity (T5), same-column-adjacent-rows (T1).

## double_threat — detector-verified boards (verified 2026-07-08 via `detectDoubleThreat` in `classifier.js`)
| Movestring | Player | Detector cells (1-indexed cXrY) |
|---|---|---|
| `41442625312235115445550126400` | P1 (Green) | `c1r4`, `c4r3` |
| `3333364101252113121524` | P2 (Gray) | `c5r3`, `c7r2` |
- **TRAP — an open three is NOT necessarily a double_threat.** `33243432244` has Gray's open three `_OOO_` on row 2, but both end cells float above empty columns (not gravity-top) → `detectDoubleThreat` returns `matched:false` for BOTH players. Both production detectors (`classify` Case A/B and `detectDoubleThreat`) require gravity-top threats: Case A = ≥2 distinct columns with immediately-playable threats; Case B = stacked consecutive-row threats whose lower cell is gravity-top. Never eyeball "two threat cells" as a double threat — run the detector. (This bogus example+cell `c2r1` circulated in polish_epic.md Epic 2 until fixed 2026-07-08; spec 042 SC-008 uses the two verified boards above.)

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
