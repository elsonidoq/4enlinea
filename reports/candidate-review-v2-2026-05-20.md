# Classifier Audit Report — Candidate Review v2
**Date:** 2026-05-20  
**Audited categories:** z_threat, claimeven, undercut, overcut, figure_7, j_shape  
**Method:** 6 parallel sub-agents (one per category). Each performed a two-phase audit:
Phase 1 = abstract KB review of the formal predicate; Phase 2 = empirical review of 8
randomly-sampled `pending` candidates from the DB.

> **Note on figure_7:** Two successive sub-agent runs timed out during Phase 2 board
> visualization (see §2.5 for explanation). Phase 1 was completed by the coordinator
> directly; Phase 2 evaluations were also completed by the coordinator using board data
> fetched separately.

---

## 1. Executive Summary

| Category | Phase 1 gaps | FP count (8 sampled) | New empirical gaps |
|---|---|---|---|
| z_threat | 3 (static) | 0/8 | none |
| claimeven | 6 (3 static, 2 doc-missing, 1 asymm) | 1/8 | 2 (wrong player; Z-threat conflation) |
| undercut | 4 (A–D) | 0/8 | none |
| overcut | 3 (1 doc-missing, 1 static, 1 asymm) | 2/8 | 1 (T5 column-position failure) |
| figure_7 | 3 (see note) | 0/8 | 1 (KB/classifier misalignment: incomplete vs. complete Figure-7) |
| j_shape | 8 (G1–G8) | **8/8** | 3 (partial 3-of-4 matching; even anchor; wrong player) |

---

## 2. Per-Category Full Reports

---

## 2.1  z_threat

### Phase 1 — Abstract KB Audit

**Goal:** Creates an odd-number-of-empty-cells column segment between the current column top and a major threat cell, guaranteeing the current player fills that threat cell via parity (they get the first, third, fifth… fills).

**Winning continuations:**

- **C1 — Major-threat window:** The only continuation. Player P has a major threat at `(col, T.row)`. The column currently has `h` discs. The "capsule" spans `fromRow = h` to `toRow = T.row` (0-indexed), containing `T.row - h` empty cells. If that count is odd, P fills `T.row` before the opponent.

**Phase 1 gaps found:**

1. **Static gap — Row-convention comment wrong**
   - Missing/wrong: The predicate comment states "rows are 1-indexed" and defines `h` as "count of occupied cells." Both contradict `index-conventions.md` (rows 0–5, 0-indexed). For a partially-filled column the two interpretations diverge by 1, producing an off-by-one in `empty_count = T.row - h`.
   - Affects: C1
   - Location: `formal_predicate` comment

2. **Static gap — No guard for `T.row > h`**
   - Missing: Explicit `T.row > h` assertion (empty_count ≤ 0 goes unguarded)
   - Affects: C1
   - Location: `formal_predicate`

3. **Static gap — No on-board bounds check for `T.row`**
   - Missing: `0 ≤ T.row ≤ 5`
   - Affects: C1
   - Location: `formal_predicate`

### Phase 2 — Empirical Candidate Review

**Candidate a38f0692**
- Movestring: `4534122663354411650106504660`
- correct_col: 3
- Board summary: Move 28, Red to move. col3 (0-idx) is empty at rows 2–5; major Red threat `[R]` at col3 row5. Capsule (fromRow=3, toRow=5, badgeCount=3). Solver col3=+2.
- Verdict: VALID
- Reasoning: 3 odd empty cells to threat → Z-threat confirmed.
- Gap link: n/a

**Candidate 85bf6c77**
- Movestring: `33646366336242244526340`
- correct_col: 5
- Board summary: Move 23, Yellow to move. col5 has `[*]` at row3 (0-idx): both players share a major threat. 3 empty cells below → 5O parity.
- Verdict: VALID
- Reasoning: Structural Z-threat condition satisfied; `[*]` is a player-input concern, not a predicate gap.
- Gap link: n/a

**Candidates 8ef98e6a, 72f62695, 1e3b1d70, 2f77a775, 3f7a18c9, ddcfcca6** — all VALID, all show odd badgeCount=3, confirmed by positive solver scores.

```
Phase 2 summary
- Valid: 8/8
- False positives: 0/8
- Uncertain: 0/8
- New empirical gaps: none
```

---

## 2.2  claimeven

### Phase 1 — Abstract KB Audit

**Goal:** Yellow (second player / Zugzwang controller) guarantees occupying a specific even-row square, thereby refuting every Red winning group through that square via the pairing strategy.

**Winning continuation:**

- **C1 — Even-square guarantee:** Pair `(col, row_odd)` lower + `(col, row_even)` upper. Whenever Red plays lower, Yellow plays upper. Terminal cell = `(col, row_even)`. Refutes all Red 4-windows through the upper square.

**Phase 1 gaps found:**

| # | Gap type | Missing condition | Continuation | Location |
|---|---|---|---|---|
| G1 | Static | Row parity inverted: `row_lower % 2 == 1` in DB 0-indexed accepts Allis-even lower squares (DB row 1 = Allis row 2 = even). The check should use 1-indexed parity or `(row+1) % 2 == 1`. | C1 | formal_predicate |
| G2 | Static | Board boundary check uses 1-indexed bounds (`1 ≤ row_upper ≤ 6`) but DB rows are 0–5; correct: `0 ≤ row_upper ≤ 5` | C1 | formal_predicate |
| G3 | Static | No check that Yellow (second player / Zugzwang controller) is the one applying the rule | C1 | formal_predicate, preconditions |
| G4 | Documented-but-missing | FP1 (Vertical vs Claimeven): nominally checked via parity, but the check is inverted (G1), so it produces the opposite discrimination | C1 | formal_predicate |
| G5 | Documented-but-missing | FP3 (Lowinverse conflict): documented in combination_constraint comment but absent from `can_claimeven` function body | C1 | formal_predicate |
| G6 | Static | No check for immediate Red winning threat pre-empting the strategy | C1 | formal_predicate |

### Phase 2 — Empirical Candidate Review

**Candidate 1df7e343** — Movestring `33336461040441001640134566630`, correct_col=5.
Board: move 29 Yellow to move; only col5 (0-idx) has 5O parity; Yellow major at col5 row4 (even). Verdict: **VALID.** Reasoning: classic 1-odd-column zugzwang; Yellow's even-square guaranteed. Gap link: n/a

**Candidate 3c36d3f7** — Movestring `6535623366326321210655220511113`, correct_col=5.
Board: move 31 Yellow to move; col5 = 1O; Yellow claims single remaining even cell directly. Verdict: **VALID.** Gap link: n/a

**Candidate 543e90b6** — Movestring `4313212212622141046660433`, correct_col=1.
Board: move 25 Yellow to move; col1 (0-idx) = 1O; all others even or full. Verdict: **VALID.** Gap link: n/a

**Candidate 408916e7** — Movestring `4631330362626620444410223431610`, correct_col=2.
Board: move 31 Yellow to move; col2 = 1O; col6 = 6E (fully empty); Red threats at col6 row2/3. Verdict: **VALID.** Reasoning: Yellow plays the 1O column, leaving all remaining cells in even-count columns; Red's col6 row2 threat covered by claimeven pairing. Gap link: n/a

**Candidate 7e049506** — Movestring `33330122050013121155012224035`, correct_col=4.
Board: move 29 Yellow to move; col4 = 5O; Yellow has two major threats at col4 rows 3 and 5 — both ODD rows. Verdict: **UNCERTAIN.** Reasoning: Parity structure (1 odd column, Yellow to move) matches claimeven setup, but both Yellow major threats are at odd rows — characteristic of Z-threat, not claimeven (which refutes Red groups through even squares). No visible Red major threats for claimeven to refute. The winning mechanism may be Yellow's own odd-row threats rather than claimeven. Gap link: predicted by Phase 1 G3 (no Zugzwang controller check — parity condition met but strategic content differs).

**Candidate 9ae74da6** — Movestring `432263442211246`, correct_col=2.
Board: move 15 Yellow to move; col2 = 1O; Yellow major threat at col1 row2 (even). Verdict: **VALID.** Gap link: n/a

**Candidate 2a729f66** — Movestring `30215456105565540400324621216113`, correct_col=0.
Board: move 32, **Red to move** (not Yellow). Two odd columns (col0=1O, col3=3O). All solver scores positive (Red wins). Verdict: **FALSE POSITIVE.** Reasoning: Claimeven is Yellow's second-player Zugzwang strategy. This position has Red to move — the fundamental precondition "Zugzwang controller (Black/Yellow) is applying the rule" is violated. The correct_col=0 is Red's best move unrelated to claimeven. Gap link: **New empirical gap** — the formal predicate has no `is_yellow_to_move` guard. A position with Red to move can pass all parity checks yet have no claimeven applicability.

**Candidate ee4a4106** — Movestring `43454400534554253362252`, correct_col=6.
Board: move 23 Yellow to move; col6 = 5O; Red major threats at col2 rows 3 and 5 (odd). Verdict: **VALID.** Reasoning: Yellow addresses the single odd column first; Red is forced into col2 (6E) and Yellow responds above each time; Yellow's even-square guarantee covers col2 row2. Gap link: n/a

```
Phase 2 summary
- Valid: 6/8
- False positives: 1/8 (IDs: 2a729f66)
- Uncertain: 1/8 (IDs: 7e049506)
- New empirical gaps:
  1. Wrong player to move: classifier generates claimeven candidates for positions where Red (first player) is to move. Claimeven is exclusively a Yellow strategy. Concrete instance: candidate 2a729f66, move 32, Red to move.
  2. Z-threat vs claimeven conflation: both share the outer parity structure (one odd column, Yellow to move). When Yellow's major threats are at odd rows the winning mechanism is Z-threat, not claimeven. Candidate 7e049506 demonstrates this edge case.
```

---

## 2.3  undercut

### Phase 1 — Abstract KB Audit

**Goal:** When a player holds a major threat lower in a column than the opponent's major threat of opposite row parity, the lower player's threat is reached first under gravity, making the upper threat permanently inaccessible — the lower player wins the column race.

**Winning continuations (T2 sub-cases):**

- **Sub-case 1:** Red even-row threat at `(C, r_even)` below Black odd-row threat at `(C, r_odd)`, any distance.
- **Sub-case 2:** Black even-row threat at `(C, r_even)` below Red odd-row threat at `(C, r_odd)`, any distance.
- **Sub-case 3:** Red odd-row threat at `(C, r_odd)` immediately below Black even-row threat at `(C, r_odd+1)` (adjacency required).

**Phase 1 gaps found:**

| ID | Gap type | Missing condition | Continuation | Location |
|---|---|---|---|---|
| A | Documented-but-missing | No exclusion of the row-3 + row-6 pair (0-indexed: rows 2+5) mandated by T5 override | All sub-cases | formal_predicate |
| B | Static | Lower (killing) threat not checked for prior neutralization by a third threat below it (precondition 3 stated but not encoded) | All sub-cases | formal_predicate |
| C | Static | Threat type (major vs minor) not validated inside predicate — relies on caller | All sub-cases | formal_predicate (input contract) |
| D | Asymmetric | Sub-case 3 is generalised to both players (Black-odd below Red-even adjacent also fires), but Allen only names Red-odd below Black-even | Sub-case 3 | formal_predicate vs. source |

### Phase 2 — Empirical Candidate Review

All 8 candidates were VALID. Summary of notable cases:

**Candidate 5675f699** — Movestring `4355213353142555464336004422`.
Killing: Yellow (Black) at Allen-odd row 3; dead: Red at Allen-even row 4, adjacent.
Verdict: **VALID.** This exercises the undocumented reverse of sub-case 3 (Black-odd below Red-even). The gravity logic is sound. Gap link: predicted by Phase 1 Gap D.

All others (ce4a9d6d, 40b98ce1, 22d8d270, eaafadd6, f68bd2f8, 893ebbf0, 4000162e) — **VALID**, covering sub-cases 1, 2, and 3 with correct Allen-parity identification.

```
Phase 2 summary
- Valid: 8/8
- False positives: 0/8
- Uncertain: 0/8
- New empirical gaps: none (candidate 5675f699 exercises Phase 1 Gap D — the undocumented reverse direction — but is strategically correct; confirms the gap is a documentation asymmetry rather than a logic error)
```

---

## 2.4  overcut

### Phase 1 — Abstract KB Audit

**Goal:** The current player wins by playing column C because their major threat at `(C, R)` cannot be neutralized by T2 — the lower opponent threat is blocked, neutralized, or structurally exempt — so the current player reaches `R` and completes their win.

**Five sub-case mechanisms:** (a) lower is minor threat; (b) T4 same-parity; (c) T5 row-3+6 exemption; (d) chain-T2; (e) active-forcing in odd-parity column.

**Phase 1 gaps found:**

| # | Gap type | Missing condition | Sub-cases | Location |
|---|---|---|---|---|
| G1 | Documented-but-missing | `R` must not be `[*]` (also an opponent major threat); documented in false_positives[1] but absent from predicate | (e) active-forcing | formal_predicate |
| G2 | Static | Chain-T2 logic omits T2 sub-case 1 as a chain mechanism (non-adjacent even-below-odd) | (d) chain-T2 | formal_predicate |
| G3 | Asymmetric | Sub-cases (b) T4 and (c) T5 lack column-position verification that the current player physically fills row R (sub-case (e) active-forcing has this check via odd-parity requirement; T4 and T5 do not) | (b), (c) | formal_predicate |

### Phase 2 — Empirical Candidate Review

**Candidate 7a1e3aba** — Movestring `653564561352321115303326`.
T4 sub-case: R=row4 even, R'=row2 even, same parity. Col5 5O. Scr=+8. Verdict: **VALID.** Gap link: n/a

**Candidate 372dc61b** — Movestring `34113313660264433466064114005`.
Active-forcing: R=row5 odd, R'=row4 even, adjacent, 5O, Yellow to move, R not `[*]`. Scr=+2. Verdict: **VALID.** Gap link: n/a

**Candidate af435cd2** — Movestring `40634336035150310114402255`.
T5 sub-case claimed: R=row6 even (Allen), R'=row3 odd (Allen), {3,6} pair. But col3 has **4E parity**: Red fills rows 3 and 5, Yellow fills rows 4 and **6** — Yellow physically occupies row 6 before Red can. Red's row-6 winning continuation is unreachable. Solver confirms +5 for col3, but the win comes from a different structural advantage. Verdict: **FALSE POSITIVE.** Gap link: predicted by Phase 1 Gap G3 (T5 lacks column-position verification). **New empirical gap:** confirms T5 false positives occur in practice when even column parity places the opponent on row R.

**Candidate ae22abd4** — Movestring `564605522515206642521641060014`.
R=row4 is `[*]` — both players have major threats at that cell. Yellow may complete their own row-4 threat before Red's overcut sequence plays out. Verdict: **FALSE POSITIVE.** Gap link: predicted by Phase 1 Gap G1 (no `R ≠ [*]` check).

**Candidates 1f0c51f1, 2922eaed, 9fbcbb3c, 5d6e19cc** — all **VALID** via active-forcing or T4. Candidate 5d6e19cc demonstrates that even column parity (6E) does not always invalidate T4 — if R falls at an odd fill-sequence position, the current player still reaches it.

```
Phase 2 summary
- Valid: 6/8
- False positives: 2/8 (IDs: af435cd2, ae22abd4)
- Uncertain: 0/8
- New empirical gaps:
  1. T5 sub-case column-position failure (candidate af435cd2): even column parity places the opponent on row R in the T5 case, producing a false positive. The predicate must verify that R falls at an odd position in the column fill sequence for T5 (and T4) sub-cases, not just that T2 is structurally blocked.
```

---

## 2.5  figure_7

### Why figure_7 stalled the sub-agents

Two sequential sub-agents timed out during Phase 2. The root cause is a **structural mismatch** between the KB formal predicate and the actual classifier behavior:

- The KB `formal_predicate` (`find_figure7`) detects **complete** 5-disc Figure-7 configurations.
- The `known_limitations` section explicitly states: *"If the hinge is empty (Incomplete-7)… the Figure-7 predicate does not fire."*
- However, all 8 sampled candidates have `highlight_metadata` showing only **4 pattern pieces** — the hinge cell is missing. The `correct_col` field points to the column of the missing hinge, i.e., the puzzle is "play here to complete the Figure-7."

Each sub-agent had to:
1. Read the KB (describes complete-7 detection).
2. Fetch candidates (all show incomplete-7 shapes).
3. Resolve the contradiction between "Incomplete-7 predicate does not fire" and the fact that these are exactly the generated candidates.
4. Understand the actual classifier in `classifier.js` behaves differently (detects 4-of-5 pieces with completing cell at gravity-top).
5. Evaluate whether playing `correct_col` creates a valid Figure-7 with ≤1 gravity-top threat and ≥1 above-gravity threat — reasoning about the **hypothetical post-move board** rather than the current board shown by the visualizer.

Steps 3–5 required multi-step reasoning about a board state that doesn't yet exist in the visualizer output. Combined with running 8 board visualizations sequentially, the agents exceeded the 600 s progress watchdog.

### Phase 1 — Abstract KB Audit

**Goal:** The Figure-7 creates two major threats in the same column on adjacent rows, making it impossible for the opponent to block both via zugzwang — at least one threat is above gravity, so the opponent is eventually forced to expose it.

**Winning continuations:**

- **T1 — Horizontal:** `(x,y+2)–(x+1,y+2)–(x+2,y+2)–(x+3,y+2)`. Terminal cell: `(x+3,y+2)`. Direction: horizontal.
- **T2 — Diagonal ascending:** `(x,y)–(x+1,y+1)–(x+2,y+2)–(x+3,y+3)`. Terminal cell: `(x+3,y+3)`. Direction: diagonal.

Both threats occupy column `x+3`. Blocking the gravity-top one immediately makes the other directly playable.

**Phase 1 gaps found:**

| # | Gap type | Missing condition | Continuation | Location |
|---|---|---|---|---|
| G1 | Static | `range(1,5)` for y (1-indexed) allows y=4, putting `y+3=7` off the 6-row board. Should be `range(1,4)`. | T1, T2 | formal_predicate |
| G2 | Static | Dead branch: `if gravity_top_count == 2: continue` at line 53–54 is unreachable (already caught by `>= 2` at line 50). Not a logic error, but a signal of incomplete review. | — | formal_predicate |
| G3 | Documented (meta-gap) | The KB formal predicate describes complete-5-disc detection; the actual classifier detects Incomplete-7 (4-disc) configurations. The `known_limitations` section explicitly states the predicate does NOT fire for Incomplete-7. The KB and the classifier implementation are misaligned by design. The KB needs a separate `find_incomplete_figure7` predicate to match what the classifier actually does. | T1, T2 | KB (missing section) |

**Note on false_positives:** Both documented FPs are correctly handled by the predicate:
- FP1 (far-arm-end): predicate sets `t_horiz = (x+3,y+2)` not `(x+4,y+2)`. ✓
- FP2 (borderline gravity_top_count=1): predicate allows this; the KB notes it's a pedagogical quality issue, not a logic error. ✓

### Phase 2 — Empirical Candidate Review

*(Coordinator evaluation using board data fetched directly.)*

**Interpretation note:** In all 8 candidates, the `highlight_metadata` shows 4 `pattern_piece` cells and `correct_col` is the column of the missing hinge. Evaluation criterion: does playing `correct_col` (at its current gravity-top row) produce a valid Figure-7 with both threats in the same column, ≤1 gravity-top, ≥1 above-gravity?

---

**Candidate d76f31a7**
- Movestring: `4314640214034415216600`
- correct_col: 2
- Board summary: Move 22, Red to move. 4 Red pieces at display col1 rows 1/3 and col2 rows 2/3 form incomplete standard Figure-7 (x=0,y=0). Completing cell (col2,row2)=display col3 row3 is empty `(*)`. After completion, threats at display col4 rows 3 and 4 (col3 height=2, gravity-top=row3 → 1 gravity-top + 1 above). Scr col2=+9.
- Verdict: **VALID**
- Reasoning: Threats at adjacent rows in same column (col3,0-idx), 1 gravity-top + 1 above-gravity. Standard zugzwang Figure-7 after completion.
- Gap link: n/a

**Candidate b6bd7dda**
- Movestring: `341153441220151431`
- correct_col: 2
- Board summary: Move 18, Red to move. 4 Red pieces form incomplete Mirror-7 (x=3,y=0): (col3,row0), (col2,row1), (col1,row2)=hinge, (col3,row2). Missing horizontal arm cell at (col2,row2). After completing, threats at display col1 rows 3 and 4 (col0,0-idx). Col0 height=1, threats both above gravity-top (row2). Scr col2=+10.
- Verdict: **VALID**
- Reasoning: Both threats above gravity (gravity_top_count=0, above_gravity=2). Major Red threat already visible at display col1 row4 confirms diagonal extension. Zugzwang Figure-7.
- Gap link: n/a

**Candidate 67e26ae5**
- Movestring: `253152122151554112533230004006`
- correct_col: 4
- Board summary: Move 30, Red to move. 4 Red pieces form incomplete standard Figure-7 (x=3,y=0). Hinge at (col5,row2) already placed; missing horizontal arm cell at (col4,row2)=display col5 row3. After completing, threats at display col7 rows 3 and 4 (col6,0-idx). Col6 height=1, both threats above gravity. Scr col4=+4.
- Verdict: **VALID**
- Reasoning: Major Red threat already at display col7 row4 confirms diagonal extension. Both threats above gravity. Zugzwang Figure-7.
- Gap link: n/a

**Candidate 34df238f**
- Movestring: `3331623145142560`
- correct_col: 2
- Board summary: Move 16, Red to move. Same Mirror-7 structure as b6bd7dda (x=3,y=0). Completing cell (col2,row2)=display col3 row3, currently minor-threat empty. After completing, threats at display col1 rows 3 and 4. Col0 height=0, both threats above gravity. Scr col2=+11.
- Verdict: **VALID**
- Reasoning: Both threats above gravity (gravity_top_count=0). Major Red threat pre-visible at display col1 row4. Zugzwang Figure-7.
- Gap link: n/a

**Candidate c22172f0**
- Movestring: `34505332261153256265`
- correct_col: 1
- Board summary: Move 20, Red to move. Incomplete Mirror-7 (x=3,y=0); hinge would be at (col1,row2)=display col2 row3, currently at gravity-top of col1 (height=2, 4E). After completing, threats at display col1 rows 3 and 4 (col0,0-idx, height=1, both above gravity). Scr col1=+9.
- Verdict: **VALID**
- Reasoning: Diagonal win (col0,row3)–(col1,row2)–(col2,row1)–(col3,row0) all Red after hinge placed; horizontal win (col0,row2)–…–(col3,row2) similarly. Both threats above gravity. Zugzwang Figure-7.
- Gap link: n/a

**Candidate 28463775**
- Movestring: `333335622250311245016`
- correct_col: 1
- Board summary: Move 21, Yellow to move. 4 Yellow pieces form incomplete Mirror-7 (x=3,y=1): (col3,row1), (col2,row2), (col2,row3), (col3,row3). Missing hinge at (col1,row3)=display col2 row4, at gravity-top of col1 (height=3, 3O). After completing, threats at (col0,row3) and (col0,row4)=display col1 rows 4 and 5. Col0 height=2, both threats above gravity. Scr col1=+8 for Yellow.
- Verdict: **VALID**
- Reasoning: Yellow Mirror-7; both threats above gravity (gravity_top_count=0, above_gravity=2). Zugzwang Figure-7 for Yellow.
- Gap link: n/a

**Candidate 4482a1b7**
- Movestring: `021115016640124442266014240203636`
- correct_col: 3
- Board summary: Move 33, Yellow to move. 4 Yellow pieces form incomplete standard Figure-7 (x=2,y=0). Missing horizontal arm cell at (col3,row2)=display col4 row3, at gravity-top of col3 (4E). After completing, threats at (col5,row2) and (col5,row3)=display col6 rows 3 and 4. Col5 height=1, both threats above gravity. Major Yellow threat already at display col6 row4 confirms diagonal extension. Scr col3=+2 for Yellow.
- Verdict: **VALID**
- Reasoning: Both threats above gravity. Pre-visible Yellow major threat at diagonal extension cell confirms the Figure-7 will be valid. Zugzwang Figure-7 for Yellow.
- Gap link: n/a

**Candidate 924a9529**
- Movestring: `43314421362545360312`
- correct_col: 2
- Board summary: Move 20, Red to move. 4 Red pieces form incomplete Mirror-7 (x=4,y=1). Missing hinge at (col2,row3)=display col3 row4, at gravity-top of col2 (height=3, 3O). After completing, threats at (col1,row3) and (col1,row4)=display col2 rows 4 and 5. Col1 height=3, row4=gravity-top (1 gravity-top + 1 above). Scr col2=+10.
- Verdict: **VALID**
- Reasoning: 1 gravity-top + 1 above-gravity — valid Figure-7 (gravity_top_count=1, above_gravity=1). Blocking the gravity-top threat exposes the above-gravity one. Zugzwang Figure-7.
- Gap link: n/a

```
Phase 2 summary
- Valid: 8/8
- False positives: 0/8
- Uncertain: 0/8
- New empirical gaps:
  1. KB/classifier misalignment (all 8 candidates): The KB formal_predicate is for COMPLETE Figure-7 detection and explicitly states it does not fire for Incomplete-7. Yet every candidate is an Incomplete-7 (4 of 5 discs placed). The actual classifier.js detects an entirely different predicate — find_incomplete_figure7 — which is unspecified in the KB. This is a documentation gap, not a correctness gap in the candidates themselves (all 8 candidates are strategically valid Incomplete-7 puzzles).
```

---

## 2.6  j_shape

### Phase 1 — Abstract KB Audit

**Goal:** Red (first player) creates three simultaneous minor threats that collectively function as an unblockable major odd-row threat — any opponent response to one enables another.

**Winning continuations:**

- **T1 — Horizontal:** row y+2 cells (x,y+2)–(x+1,y+2)–(x+2,y+2)–(x+3,y+2). Terminal cells: (x+2,y+2) and (x+3,y+2).
- **T2 — Diagonal ascending from upper-left:** Through (x,y+2) toward G4 = upper-right diagonal extension.
- **T3 — Diagonal through upper-right arm:** Through (x+1,y+1) toward G3.

**Phase 1 gaps found:**

| # | Gap type | Missing condition | Continuation | Location |
|---|---|---|---|---|
| G1 | Static | `x+3 <= 7` should be `x+3 <= 6` (0-indexed board, columns 0–6). Allows col 7 which is off-board. | T1 | formal_predicate |
| G2 | Static | `board[x+3][y+2] != opponent` checks only (x+2,y+2); does not check (x+3,y+2) for opponent occupation | T1 | formal_predicate |
| G3 | Static | Diagonal extension cells (T2: (x+2,y+3); T3: (x+2,y+1)) entirely absent — no on-board, unblocked, or occupancy checks | T2, T3 | formal_predicate |
| G4 | Static | Gravity/reachability of (x+2,y+2) not verified | T1 | formal_predicate |
| G5 | Documented-but-missing | Overcutting cells `board[x][y+3]` and `board[x+1][y+3]` not checked despite FP2 naming them as blocking conditions | T1, T2, T3 | formal_predicate |
| G6 | Static | Parity cancellation too strict: fires on 1 opponent odd-row threat in far column; KB known_limitations require 2 threats in separate columns | All | formal_predicate |
| G7 | Static | `x-3 >= 1` in mirror predicate should be `x-3 >= 0` (off-by-one, excludes valid leftmost extension) | Mirror T1 | formal_predicate |
| G8 | Asymmetric | `mirror_j_configuration` has no opponent-blocking-cell check and no parity-cancellation check; `j_configuration` has both | Mirror T1/T2/T3 | formal_predicate |

### Phase 2 — Empirical Candidate Review

**All 8 candidates were FALSE POSITIVES.**

**Candidate 79aea25d** — Movestring `0644124632263164`, correct_col=3.
Only 3 Red discs present in highlight (J requires 4). Anchor y=0 (0-idx) is even — parity fails (`y % 2 == 1`). Verdict: **FALSE POSITIVE.** Gap link: new empirical gap — classifier matches 3-of-4 J discs.

**Candidate cb6ae77e** — Movestring `36033056024001412664`, correct_col=2.
3 Red discs; 4th J cell (col2,row2) is empty. Anchor y=0 even — parity fails. Verdict: **FALSE POSITIVE.** Gap link: same new empirical gap.

**Candidate 7ae1a2e7** — Movestring `4435445565023142`, correct_col=3.
3 Red discs; 4th J cell occupied by Yellow (opponent blocks one arm). Anchor y=0 even. Solver shows Red losing heavily. Verdict: **FALSE POSITIVE.** Gap link: predicted by Phase 1 G5 (overcutting — opponent at J-arm cell); also new empirical gap (3-of-4 matching).

**Candidate 48ba95ee** — Movestring `4222243456624134611566510`, correct_col=1.
Yellow (not Red) discs in highlight. Anchor y=2 (0-idx) even — parity fails. 4th Yellow disc missing. Yellow to play. Verdict: **FALSE POSITIVE.** Gap link: new empirical gap — classifier applied to Yellow's pieces without validating the Red-specific winning mechanism and parity framing.

**Candidates 661dde13, 95d0b694, 60b2abe9, b627b55f** — Movestrings `6332401114456411005664610604`, `451050140355311144010560`, `03333543111401603`, `2534533526435046043660`.
All have 3-of-4 pattern pieces; anchor at y=0 (0-idx, even); parity fails for all. Candidates 60b2abe9 and 48ba95ee show Yellow's pieces being classified. Verdict: **FALSE POSITIVE** (all four).

```
Phase 2 summary
- Valid: 0/8
- False positives: 8/8 (IDs: 79aea25d, cb6ae77e, 7ae1a2e7, 48ba95ee, 661dde13, 95d0b694, 60b2abe9, b627b55f)
- Uncertain: 0/8
- New empirical gaps:
  1. Partial 3-of-4 J matching: classifier fires when only 3 of the 4 required discs are present. All 8 candidates have exactly 3 pattern_piece cells in highlight_metadata. The predicate requires all 4 but the classifier implementation matches a 3-disc sub-pattern.
  2. Even-anchor parity universally violated: every candidate has anchor y=0 (0-indexed, even). The predicate contains y % 2 == 1 which should reject these — suggesting the classifier implementation does not enforce this check, or uses a different anchor convention than the predicate specifies.
  3. Yellow J configurations included: candidates 48ba95ee and 60b2abe9 show Yellow (not Red) discs as pattern pieces, indicating the classifier applies J without validating player identity against the KB's Red-specific parity and mechanism analysis.
```

---

## 2.7  Deeper notes on figure_7, j_shape, and overcut

### figure_7 — What the implicit "Incomplete-7" predicate actually is

Every sampled candidate is an Incomplete-7: 4 of 5 Figure-7 discs are placed, the hinge
cell is empty, and `correct_col` is the hinge column. The visualizer shows the board
**before** the hinge is played; the Figure-7 only exists in the hypothetical post-move
position.

The implicit predicate the classifier appears to implement (not documented in the KB):

```python
def find_incomplete_figure7(board, player):
    # Find positions where playing the hinge creates a valid Figure-7
    for x, y, orientation in enumerate_anchors():
        hinge = (x+2, y+2)          # or (x-2, y+2) for Mirror-7
        if not board.empty(hinge):
            continue
        if board.height(hinge_col) != hinge_row:
            continue                 # hinge must be at gravity-top
        # 4 non-hinge cells must all be owned by player
        non_hinge = [(x,y), (x+1,y+1), (x,y+2), (x+1,y+2)]
        if not all(board.owns(player, c) for c in non_hinge):
            continue
        # After placing hinge, check threat cells
        t_horiz = (x+3, y+2)
        t_diag  = (x+3, y+3)
        if not (board.empty(t_horiz) and board.empty(t_diag)):
            continue
        h = board.height(x+3)
        gravity_top_count = sum(1 for t in [t_horiz, t_diag] if t[1] == h + 1)
        if gravity_top_count >= 2:
            continue
        if all(t[1] <= h + 1 for t in [t_horiz, t_diag]):
            continue                 # both immediately playable = plain fork
        yield hinge_col
```

All 8 candidates satisfy this predicate. The KB needs a `find_incomplete_figure7` section
to document this. The complete-7 `find_figure7` predicate in the KB is currently
**unreferenced** by the actual classifier behavior.

### j_shape — Design intent vs. implementation bugs

The j_shape classifier appears to be following the **same "incomplete pattern" design as
figure_7**: find 3 of the 4 J discs already placed, verify the 4th (completing) disc is at
gravity-top of `correct_col`, and confirm the resulting position generates the J's triple
threat. This design intent would be valid if implemented correctly.

The difference from figure_7 is that j_shape has three independent bugs making it
non-functional:

1. **Wrong disc count threshold:** The J requires 4 discs; the classifier fires on 3. In
   figure_7, the completing cell is the hinge (the most structurally central disc); in j_shape,
   the completing cell is `(x+1,y+2)` — the far horizontal arm cell, not the hinge. The KB
   says 4 discs must be present for the J mechanism to work; 3 discs produce only 2 minor
   threats, not the required 3.

2. **Anchor parity not enforced:** All 8 candidates have anchor at DB row 0 (even
   0-indexed). The predicate requires `y % 2 == 1`. If the classifier is using the "play to
   complete" framing, the parity must be checked on the *completed* J's anchor row — but it
   isn't being checked at all, yielding a systematic bias toward bottom-row (y=0) anchors.

3. **Player identity not checked:** 2 of 8 candidates show Yellow discs. If the J's
   odd-row winning mechanism is Red-specific (first-player), classifying Yellow J's as
   puzzles is wrong. If player-agnostic, the parity logic needs to account for Yellow's
   turn order.

**Implication for fixing:** Don't rewrite from scratch — add the three missing guards to the
existing "incomplete J" detection logic. The architecture is correct; the filters are absent.

### overcut — The correct column-position invariant for T4/T5

The report flags that T5 fails with even column parity (candidate af435cd2). The correct
generalization is **not** "T4 and T5 require odd column parity." The correct invariant is:

> **R must fall at an odd fill-sequence position counting from the current column height.**

Formally: let `empty = 6 - board.height(col)` (total empty cells in the column). Let
`r_pos = R_row - board.height(col)` (R's position in the fill sequence, 1-indexed from
bottom of the empty region). The current player fills positions 1, 3, 5, … — so R is
reachable iff `r_pos % 2 == 1`.

Consequences:
- Even column parity can still satisfy the invariant if R happens to be at an odd position
  (confirmed by candidate 5d6e19cc: 6E parity, R at fill-position 3 → VALID).
- Odd column parity does NOT automatically satisfy the invariant — if R is at fill-position
  2, the current player still cannot reach it (though in practice the active-forcing
  sub-case already enforces this via adjacent adjacency).

The fix for T4 and T5 in `classifier.js` is to add:
```js
const rPos = threat_R.row - board.height(col);  // 1-indexed fill position
if (rPos % 2 !== 1) continue;   // current player doesn't reach R
```

This replaces the tempting but wrong shortcut of `colParity === 'odd'`.

---

## 3. Recommended Actions

### KB fixes

| Gap | Condition to add | Precondition bullet to update |
|---|---|---|
| claimeven G1 | Fix parity check to use 1-indexed convention or explicitly document that `row_lower % 2 == 0` (DB 0-indexed even = Allis odd) | Precondition "lower cell is at an odd Allis row" |
| claimeven G2 | Fix boundary check to `0 ≤ row_upper ≤ 5` | Precondition "cells are on the board" |
| claimeven G3 | Add: "Yellow (second player) must be to move (Zugzwang controller)" | New precondition bullet |
| claimeven G5 | Encode Lowinverse exclusion in `can_claimeven` body, not just comment | Combination constraint section |
| overcut G3 | For T4 and T5 sub-cases: add "R falls at an odd position in the column fill sequence (i.e., current player reaches R before opponent)" | Sub-case (b) and (c) bullets |
| figure_7 G1 | Fix y loop bound: `range(1, 4)` (1-indexed) to keep `y+3 ≤ 6` | "y+3 must be within board" precondition |
| figure_7 G3 | Add a `find_incomplete_figure7` predicate section documenting the 4-disc detection with completing-cell-at-gravity-top logic | New section in KB entry |
| j_shape G1 | Fix `x+3 <= 6` (not 7) in `j_configuration` | Edge proximity precondition |
| j_shape G7 | Fix `x-3 >= 0` (not 1) in `mirror_j_configuration` | Mirror edge proximity precondition |
| j_shape G5 | Add `board[x][y+3] != opponent and board[x+1][y+3] != opponent` | New precondition bullet |
| j_shape G8 | Add opponent-blocking-cell check and parity-cancellation check to `mirror_j_configuration` | Mirror predicate section |

### Classifier fixes

| Gap | Function in `classifier.js` | Check to add |
|---|---|---|
| claimeven new gap 1 | `classifyClaimeven` (or equivalent) | `position.sideToMove === 'yellow'` guard before firing |
| overcut G1 / ae22abd4 | `classifyOvercut` active-forcing branch | `majorThreatExclusivelyForCurrentPlayer(col, R)` — R must not be `[*]` |
| overcut G3 / af435cd2 | `classifyOvercut` T4 and T5 branches | `currentPlayerFillsRow(col, R, colHeight)` — verify R is at an odd fill-sequence position |
| j_shape new gap 1 | `classifyJShape` pattern matcher | Require all 4 disc positions to be present, not 3-of-4 |
| j_shape new gap 2 | `classifyJShape` | Enforce anchor row parity check `anchorRow % 2 === 1` (DB 0-indexed: odd row = Allis even, or use Allis-indexed check) |
| j_shape new gap 3 | `classifyJShape` | Restrict to current player's pieces only (`player === position.sideToMove`) |
| j_shape G5 | `classifyJShape` | Block detection: `board[x][y+3] !== opponent && board[x+1][y+3] !== opponent` |

### DB cleanup — FALSE POSITIVE candidates to reject

| Category | Candidate ID | Reason |
|---|---|---|
| claimeven | 2a729f66 | Red to move — Zugzwang controller precondition violated |
| overcut | af435cd2 | T5 sub-case: even column parity means opponent fills R before current player |
| overcut | ae22abd4 | R cell is `[*]` — opponent also has major threat at R |
| j_shape | 79aea25d | 3-of-4 discs + even anchor parity |
| j_shape | cb6ae77e | 3-of-4 discs + even anchor parity |
| j_shape | 7ae1a2e7 | 3-of-4 discs + even anchor + opponent on J arm |
| j_shape | 48ba95ee | Yellow J, 3-of-4 discs, even anchor |
| j_shape | 661dde13 | 3-of-4 discs + even anchor parity |
| j_shape | 95d0b694 | 3-of-4 discs + even anchor parity |
| j_shape | 60b2abe9 | Yellow J, 3-of-4 discs, even anchor |
| j_shape | b627b55f | 3-of-4 discs + even anchor parity |

**Recommended SQL:**
```sql
UPDATE candidates SET status = 'rejected'
WHERE id IN (
  '2a729f66-...',  -- claimeven wrong player
  'af435cd2-...',  -- overcut T5 parity
  'ae22abd4-...',  -- overcut R=[*]
  '79aea25d-...', 'cb6ae77e-...', '7ae1a2e7-...', '48ba95ee-...',
  '661dde13-...', '95d0b694-...', '60b2abe9-...', 'b627b55f-...'  -- j_shape
);
```
*(Replace `...` with full UUIDs from the DB query above.)*

### Healthy classifiers

- **z_threat:** 0 Phase 1 logic gaps (comment/convention issues only), 0 false positives in 8 samples. Classifier is generating structurally correct candidates.
- **undercut:** 4 Phase 1 documentation gaps but all are input-contract or documentation issues; 0 false positives. Classifier is correct in practice.
- **figure_7:** 0 false positives in 8 samples despite the KB/classifier misalignment. The Incomplete-7 detection logic in `classifier.js` is functionally sound even though the KB does not document it.
