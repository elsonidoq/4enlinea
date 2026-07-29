# Feature-Vector Sufficiency Report — fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_2026-07-02T16-04-08Z.jsonl

## Summary
- Answer rows: 29   parse failures: 0
- Cases (id × condition): 29   passed (A1–A4 on all runs): 19   failed: 10
- N = 1 run per case (single run/condition in this batch), all Condition **A** (full vector).
- Per-axis pass rate (over all 29 gradeable runs): A1 29/29 · A2 29/29 · A3 19/29 · A4 19/29

**Headline:** A1/A2 are perfect (the model always reads `bestCol` and the `case`→outcome mapping correctly). Every failure is A3+A4 together — a fabricated or mis-anchored *mechanism*. The 10 failures cluster into three vector defects, all in how the two evidence halves name a **cell / window / line** (see the counterexample list).

## Pass/fail by condition (only Condition A present)

| condition | cases | passed | A3 pass-rate | A4 pass-rate |
|---|---|---|---|---|
| A (full vector) | 29 | 19 | 19/29 | 19/29 |

> Only Condition A was generated in this batch, so no A/B/C ablation delta is available. The finding is intrinsic to the full vector: **65% (19/29) pass**, and the 35% that fail do so because engineered *cell/window/line* fields point at squares the board does not support.

## Pass by pattern_category

| category | passed / total |
|---|---|
| draw_to_lose | 2/3 |
| lose_to_faster_lose | 6/10 |
| win_to_draw | 4/6 |
| win_to_lose | 7/10 |

## Per-case verdict

| id | category | cond | A1 | A2 | A3 | A4 | pass |
|---|---|---|---|---|---|---|---|
| eval-1 | win_to_draw | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-2 | draw_to_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-3 | win_to_draw | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-4 | draw_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-5 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-6 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-7 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-8 | lose_to_faster_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-9 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-10 | lose_to_faster_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-11 | win_to_draw | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-12 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-13 | win_to_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-14 | lose_to_faster_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-15 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-16 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-17 | draw_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-18 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-19 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-20 | lose_to_faster_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-21 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-22 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-23 | lose_to_faster_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-24 | win_to_draw | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-25 | win_to_draw | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-26 | win_to_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-27 | win_to_lose | A | ✅ | ✅ | ❌ | ❌ | FAIL |
| eval-28 | win_to_lose | A | ✅ | ✅ | ✅ | ✅ | PASS |
| eval-29 | win_to_draw | A | ✅ | ✅ | ✅ | ✅ | PASS |

### Notes on failing cases

> **eval-1** (win_to_draw): A3 fail: after-best board is a single center disc (empty-board opening); visualizer shows 'Major threats: none' and no structure — the center win is a deep solver-theoretic win, not the named 'parity-based win / controlling group c2r5-c5r5 / completion at c5r5'. A4 fail: 'controlling group c2r5-c5r5' and 'completion at c5r5' are contradicted — all four top-row cells are empty and form no line.

> **eval-2** (draw_to_lose): A3: mechanism says bestCol (display col4) 'occupies c4r4' to deny the row-4 window, but col4 was empty pre-move so the best disc lands at c4r1 (after-best board shows 'Gn 7' at col4 row1); the move does not occupy or deny c4r4 — decisive reason fabricated. A4: key_cell c4r4 claimed occupied by the best move but empty on after-best board.

> **eval-3** (win_to_draw): A3: claimed decisive line = diagonal c4r3-c5r4-c6r5-c7r6 has no threat presence on after-best board (all 4 cells empty/high); actual decisive resource is bottom-row horizontal c1r1-c4r1 (Gray win-in-1 at Gy c2r1) + left diagonal c1r1-c2r2-c3r3-c4r4. A4: 'occupy c6r5' incoherent — played move was column 7 not 6; named window is on opposite side (cols 4-7) from the real winning resource (cols 1-4).

> **eval-8** (lose_to_faster_lose): A3: named fork geometry is wrong — decisive Green double-threat after best is the column-2 stacked pair (row-2 line c2r2-c5r2 @c2r2 + diagonal c2r4-c5r1 @c2r4) plus row-2 @c6r2, NOT a row-3 fork at c2r3. A4: claim row-3 window c1r3-c4r3 / fork at c2r3 is false — c1r3,c2r3,c4r3 empty non-threat cells; board major threats are c2r2,c2r4,c6r2.

> **eval-10** (lose_to_faster_lose): A3: after-best (33) and after-played (32) boards have zero major/minor threats (2 discs, move 2); claimed groups c3r2-c6r2 / c4r1-c7r4 and completing cells c6r2/c6r3 are all empty cells, no observable decisive tactic. A4: parity-win completion claims unverifiable/not present on board.

> **eval-13** (win_to_lose): A3: board (movestring 33, 3 discs) has 'Major threats: none' and no structure; decisive reason is a bare solver eval (col4 wins +1, col3 loses -2), not an observable named tactic — parityNamingDeferred true both halves. A4: completing cells c5r5 (window c2r5-c5r5) and c5r4 (diagonal c2r1-c5r4) are ~40-ply-deep claims with no supporting discs/threats on the board.

> **eval-14** (lose_to_faster_lose): A3: no tactic exists on 2-disc board (movestring '3'); both after-best(33) and after-played(34) show 'Major threats: none'; cited parity group c3r2-c6r2 and figure-7 fork c4r4-c7r4/c7r4 are empty cells, not decisive. A4: concrete claims false — c6r2 winning cell, figure-7 fork, c7r4 fork cell all fabricated; key_cells all empty.

> **eval-23** (lose_to_faster_lose): A3: cited figure_7 diagonal c6r1-c5r2-c4r3-c3r4 (completing c4r3) is a Green major threat present IDENTICALLY on pre-move and best-move(col2) boards; not created by col6, so not the decisive reason played loses faster. A4: claim 'playing column 6 immediately handed the opponent a realized figure_7 with c4r3 as completing cell' is false on board — c4r3 pre-exists and is a non-gravity threat (col4 has 1 disc, not immediately playable).

> **eval-26** (win_to_lose): A3/A4: after-best col2 is an IMMEDIATE vertical win completing at c2r4 (Gray col2 rows1-4, board=GAME OVER). Answer's decisive mechanism ('created immediate threat on c2r5 in window c2r2-c2r5') is the phantom win-in-1 one row up; real completingCell is c2r4 (window r1-r4). key_cells rest on the wrong window (include phantom c2r5, omit c2r1).

> **eval-27** (win_to_lose): A3: after-best board is an immediate 4-in-a-row on c4r2-c7r2 (GAME OVER); mechanism names wrong window c3r2-c6r2 / completing c3r2. A4: c3r2-c6r2 is a 2-Green minor window, not winning; true completing cell is c5r2 (filled by bestCol=col5), not c3r2; key_cells miss c7r2.

## Counterexample list (THE DELIVERABLE)

Every A3/A4 failure traces to one of **three vector defects**, all about how a cell/window/line field is anchored to the board. Abstentions (`unsure_about`) are logged separately below as field gaps.

### Cluster 1 — Parity `controllingGroup` / `completingCell` / `window` asserted as present-tense structure on a board that has none (deep/theoretical wins)
**Cases:** eval-1, eval-10, eval-13, eval-14 (+ eval-2's parity framing). **All 4 are near-empty or few-disc boards where the win is dozens of plies deep.**

| field | cases | board finding |
|---|---|---|
| `lostResource.parityAttribution.controllingGroup` / `.completingCell` | eval-1, eval-13, eval-14 | On a 1–3-disc board the visualizer shows *Major threats: none*; the named controlling group and completing cell (e.g. eval-1 `c2r5–c5r5` completing `c5r5`; eval-13 `c5r5`/`c5r4` ~40 plies out) are all empty, structureless cells. The model narrates them as a concrete winning line. |
| `opponentPunishment.parityAttribution.controllingGroup` / `.completingCell` | eval-13 | Same defect on the punishment half (`c2r1–c5r4` completing `c5r4`). |
| `lostResource.forkCells` / `forkWindows` (parity-register) | eval-14 | 2-disc board; the emitted figure-7 fork (`c4r4–c7r4`, fork cell `c7r4`) references only empty cells. |

**Fix direction:** when `parityNamingDeferred=true` (or the win is beyond some ply horizon), the parity fields describe a *future* zugzwang resource, **not** a line on the board. The glossary must force these to be narrated as parity/zugzwang control ("whoever fills the odd square"), never as an existing threat — or the engine should suppress `completingCell`/`window` for the deep-parity register and expose only the abstract control claim. The passing parity cases (eval-9, eval-11, eval-15) prove the model *can* narrate parity safely when it hedges; the failures are where it read `completingCell` as a real square.

### Cluster 2 — `lostResource.window` / `completingCell` not anchored to the row the best move actually lands on (incl. immediate_threat phantom row-up)
**Cases:** eval-2, eval-26, eval-27.

| field | case | board finding |
|---|---|---|
| `lostResource.completingCell` / `window` | eval-2 | Field names row-4 window `c1r4–c4r4` / cell `c4r4`; but col4 was empty pre-move so the best disc lands at **c4r1**. The move can't occupy/deny `c4r4`. |
| `lostResource.tag=immediate_threat` detected on the **pre-move** board | eval-26 | Real win is an immediate vertical completing at **c2r4** (GAME OVER); the vector's phantom win-in-1 sits one row up at `c2r5`. Model relays `c2r5` — a cell that never resolves. (Known trap: `project_reason_immediate_threat_phantom`.) |
| `lostResource.window` / `completingCell` | eval-27 | Vector points at `c3r2–c6r2` completing `c3r2` (a 2-Green *minor* window); the actual winning window is `c4r2–c7r2` completing **c5r2**, which the best move fills for an immediate 4-in-a-row. |

**Fix direction:** the `window`/`completingCell` for a `winning_line` half must be pinned to the cell the *best move actually occupies* (its gravity landing row), and the immediate_threat detector must run on the post-best board (or explicitly mark the phantom row-up so the narrator drops it).

### Cluster 3 — `opponentPunishment` window/cell describes a threat that pre-exists or is mis-located, so it doesn't distinguish played from best
**Cases:** eval-3, eval-8, eval-23.

| field | case | board finding |
|---|---|---|
| `opponentPunishment.cell` (`c6r5`) | eval-3 | Cell tied to a move that was played in **column 7**, not column 6; no occupation of `c6r5` happens. Named diagonal `c4r3–c7r6` has zero presence; the real resource is the bottom-row horizontal `c1r1–c4r1`. |
| `lostResource.window` / `forkCells` | eval-8 | Fork named on row-3 window `c1r3–c4r3` at `c2r3`; board's actual Green threats are the column-2 stacked pair (`c2r2` + `c2r4`) and `c6r2`. Wrong row. |
| `opponentPunishment.window` / `completingCell` (`figure_7`, `c4r3`) | eval-23 | The figure_7 diagonal `c6r1–c5r2–c4r3–c3r4` is present **identically** on the pre-move and after-best boards — col6 did not create it, so it can't be the reason the played move loses *faster* (a 1-ply solver delta, −11 vs −10, is the real difference). |

**Fix direction:** the punishment half must carry evidence that the named threat is *newly enabled by the played move* (a before/after diff), not merely present after it; and `cell`/`entryCell` must reference the column actually played. Eval-23 specifically shows a `figure_7` tag firing on a threat that both moves share — the router needs the played-vs-best distinguishing witness the grader had to reconstruct by hand.

### Abstentions (`unsure_about`) — field gaps, excluded from A4

Non-empty on 12 cases; **none cost a pass** (all in passing cases except where an A3/A4 defect already failed the case). Two recurring gaps:

- **No named rule / full line for parity wins** (`parityNamingDeferred=true`, no PV field): eval-6, eval-9, eval-11, eval-15 all correctly hedge that they can't name an Allen rule or spell the winning sequence. This is the *safe* counterpart to Cluster 1 — the model abstains instead of fabricating. A `namedRule` or short-PV field would let it say more.
- **`denial` / `no_occupation` half carries no concrete preserved cell** (`kind=denial, verdict=no_occupation, line=[]`): eval-18, eval-19, eval-20 correctly abstain on *which* resource the best move kept alive. By design (D18/D26) the denial witness names only occupation-denial; naming the swindle's preserved cell would require an added field.
- **Retired term leak** (eval-1): the model saw `opponentPunishment.tie.kind='neutralization'`, which it flagged as *retired in favor of `denial`* per the glossary. Either the vector still emits a stale kind or the glossary still documents it — reconcile.

## `fields_relied_on` distribution

Cited across all 29 answers (count = # answers citing it; "in pass" = # of those that were passing cases). The **always-cited core** (`bestCol`, `case`, `lostResource.kind`, `opponentPunishment.kind`/`.tie.kind`) is load-bearing and reliable. The fields concentrated in *failing* cases are exactly the Cluster-1/2/3 culprits.

| field | cited | in passing case |
|---|---|---|
| `bestCol` | 29 | 19 |
| `case` | 29 | 19 |
| `lostResource.kind` | 28 | 18 |
| `opponentPunishment.tie.kind` | 28 | 19 |
| `opponentPunishment.kind` | 26 | 18 |
| `opponentPunishment.window` | 22 | 16 |
| `replyHistogram.afterBest` | 21 | 12 |
| `replyHistogram.afterPlayed` | 21 | 12 |
| `lostResource.window` | 20 | 12 |
| `lostResource.register` | 19 | 14 |
| `opponentPunishment.tie.sharedCells` | 19 | 15 |
| `opponentPunishment.completingCell` | 18 | 12 |
| `lostResource.anchorCells` | 16 | 13 |
| `route` | 16 | 13 |
| `tag` | 16 | 13 |
| `direction` | 16 | 13 |
| `lostResource.completingCell` | 14 | 7 |
| `opponentPunishment.register` | 12 | 9 |
| `lostResource.verdict` | 10 | 8 |
| `opponentPunishment.owner` | 10 | 9 |
| `opponentPunishment.tag` | 9 | 8 |
| `opponentPunishment.verdict` | 8 | 5 |
| `opponentPunishment.cell` | 8 | 5 |
| `gate.verdict` | 8 | 4 |
| `gate.witness.devCols` | 8 | 4 |
| `gate.witness.oppPlies` | 8 | 4 |
| `lostResource.cell` | 7 | 6 |
| `lostResource.parityAttribution.controllingGroup` | 6 | 2 |
| `lostResource.tag` | 6 | 4 |
| `opponentPunishment.line` | 6 | 4 |
| `opponentPunishment.parityAttribution.controllingGroup` | 5 | 2 |
| `lostResource.terminal` | 5 | 3 |
| `lostResource.forkCase` | 5 | 3 |
| `lostResource.tacticTag` | 5 | 3 |
| `opponentPunishment.cells` | 5 | 5 |
| `lostResource.forkCells` | 4 | 3 |
| `lostResource.forkWindows` | 4 | 3 |
| `lostResource.witness.devCols` | 4 | 1 |
| `lostResource.witness.oppPlies` | 4 | 1 |
| `opponentPunishment.terminal` | 3 | 2 |
| `opponentPunishment.forkCase` | 3 | 2 |
| `opponentPunishment.forkCells` | 3 | 2 |
| `opponentPunishment.tacticTag` | 3 | 2 |
| `lostResource.cells` | 3 | 2 |
| `lostResource.owner` | 3 | 2 |
| `lostResource.pliesToEnd` | 2 | 2 |
| `opponentPunishment.forkWindows` | 2 | 1 |
| `opponentPunishment.windows` | 2 | 2 |
| `lostResource.exhaustive` | 2 | 2 |
| `lostResource.windows` | 2 | 2 |
| `lostResource.parityAttribution.completingCell` | 1 | 0 |
| `opponentPunishment.entryCell` | 1 | 0 |
| `opponentPunishment.savingReplyCount` | 1 | 0 |
| `opponentPunishment.parityAttribution.empties` | 1 | 1 |
| `opponentPunishment.tie.playedPlies` | 1 | 1 |
| `opponentPunishment.tie.swindlePlies` | 1 | 1 |
| `lostResource.witness.node` | 1 | 0 |
| `lostResource.parityAttribution.parityNamingDeferred` | 1 | 1 |
| `opponentPunishment.savingCol` | 1 | 1 |
| `opponentPunishment.tie.tied` | 1 | 0 |

**Signals:**
- `lostResource.completingCell` (14 cited, only 7 passing) and the `parityAttribution.controllingGroup` fields (6 cited, 2 passing) are the **least reliable** load-bearing fields — they are cited about as often in failures as in passes. These are the Cluster-1/Cluster-2 fields.
- `lostResource.parityAttribution.completingCell`, `opponentPunishment.entryCell`, `opponentPunishment.savingReplyCount`, `opponentPunishment.tie.tied`, `lostResource.witness.node` were each cited **once, in a failing case** — candidates for either better glossary framing or removal.
- `replyHistogram.afterBest`/`afterPlayed` (21 each) are heavily relied on and mostly in passing cases — a reliable, safe signal (0 vs 1 saving replies is board-verifiable).

## Raw answers (per case)

### eval-1 — win_to_draw — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`(empty / game start)`  playedCol=4 (display 5)  bestCol=3 (display 4)  case=`win_to_draw`

```json
{
 "better_move": 4,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Playing column 4 would have preserved a long parity-based win: the controlling group is c2r5-c5r5, with the eventual winning completion at c5r5, and after that best move the opponent has no non-losing reply. The played move in column 5 gives up that resource and instead leaves the opponent four saving replies immediately, so the position is only a draw; the vector marks this punishment as independent rather than on the same square as the lost win.",
 "key_cells": [
  "c2r5",
  "c3r5",
  "c4r5",
  "c5r5",
  "c4r1",
  "c5r2"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.register",
  "opponentPunishment.completingCell",
  "opponentPunishment.entryCell",
  "opponentPunishment.savingReplyCount",
  "opponentPunishment.tie.kind",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The punishment half uses kind 'neutralization', which the glossary says was retired in favor of denial, so I can only safely say the played move leaves immediate saving replies and draws; the exact geometric blocking square or window of the saving reply is not established by this vector.",
 "confidence": "medium"
}
```

### eval-2 — draw_to_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`422242`  playedCol=5 (display 6)  bestCol=3 (display 4)  case=`draw_to_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "Column 4 was the draw-holding move because it occupies c4r4 inside the opponent's winning window c1r4-c2r4-c3r4-c4r4. By playing column 6 instead, you leave that square available, and with best play the opponent gets a long parity win on that same window, eventually completing at c4r4.",
 "key_cells": [
  "c4r4",
  "c1r4",
  "c2r4",
  "c3r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.cell",
  "lostResource.window",
  "lostResource.register",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "The vector shows this as a parity win on the c1r4-c4r4 group, but it does not confirm a named Allen rule or provide a short forced sequence for the losing line, so I cannot say more specifically which parity motif decides it.",
 "confidence": "high"
}
```

### eval-3 — win_to_draw — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`422242532`  playedCol=6 (display 7)  bestCol=0 (display 1)  case=`win_to_draw`

```json
{
 "better_move": 1,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Playing column 1 would have preserved a forced win for player 2: a double-threat winning line on the diagonal window c4r3-c5r4-c6r5-c7r6, ending in a Case-B fork. By playing column 7 instead, you let the opponent occupy c6r5 on that same window; that local occupation kills the winning window, and with best play the position only draws. The punishment is directly tied to the resource you gave up, because c6r5 is one of the anchor cells of your lost winning line.",
 "key_cells": [
  "c4r3",
  "c5r4",
  "c6r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.window",
  "lostResource.terminal",
  "lostResource.forkCase",
  "lostResource.tacticTag",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-4 — draw_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`42224253264`  playedCol=3 (display 4)  bestCol=4 (display 5)  case=`draw_to_lose`

```json
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "This was a defensive miss: the opponent already had an immediate vertical threat in column 5 on the window c5r1-c5r4, with c5r4 as the winning square. The better move was to play column 5 and occupy c5r4 to hold the draw; by playing column 4 instead, you failed to block that exact square, so the opponent can complete the four at c5r4 and win.",
 "key_cells": [
  "c5r4",
  "c5r1",
  "c5r2",
  "c5r3"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.register",
  "lostResource.cell",
  "lostResource.window",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.cells",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-5 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`422242532643343`  playedCol=0 (display 1)  bestCol=5 (display 6)  case=`lose_to_faster_lose`

```json
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 6 was the necessary block: the opponent already had an immediate threat on the diagonal window c6r2-c5r3-c4r4-c3r5, with c6r2 as the open completing square. By playing column 1 instead, you failed to occupy c6r2, so the opponent can complete that four there; the square you needed to take is exactly the square their threat wins on.",
 "key_cells": [
  "c6r2",
  "c5r3",
  "c4r4",
  "c3r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.register",
  "lostResource.cell",
  "lostResource.window",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "The vector shows this was specifically a missed forced block, but it does not establish any broader positional explanation beyond that immediate threat.",
 "confidence": "high"
}
```

### eval-6 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`422242532643343015330451665102`  playedCol=0 (display 1)  bestCol=1 (display 2)  case=`win_to_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Playing column 2 would have preserved a forced win: a forced-sequence double-threat on the row-5 window c1r5-c4r5, culminating in the fork cell c2r5 and completion on that same window. Instead, the played move lets the opponent force a parity win on the top-row group c2r6-c5r6, completing at c2r6; the punishment is tied to the resource you gave up because both lines involve c1r5.",
 "key_cells": [
  "c1r5",
  "c2r5",
  "c3r5",
  "c4r5",
  "c2r6",
  "c3r6",
  "c4r6",
  "c5r6"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.terminal",
  "lostResource.forkCase",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.pliesToEnd",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector shows the opponent's punishment as a parity win with deferred naming, so I cannot name a confirmed Allen rule or spell out the full move sequence for that win.",
 "confidence": "high"
}
```

### eval-7 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`42224253264334301533045166510200`  playedCol=6 (display 7)  bestCol=1 (display 2)  case=`lose_to_faster_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "The blunder is a defensive miss: the opponent already had an immediate threat on the diagonal window c4r2-c3r3-c2r4-c1r5, with c2r4 as the completing square. The better move was to play column 2 and occupy c2r4 to block that threat; by playing column 7 instead, you left c2r4 open and the opponent's win-in-one remains available there.",
 "key_cells": [
  "c2r4",
  "c4r2",
  "c3r3",
  "c1r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.register",
  "lostResource.cell",
  "lostResource.window",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "The vector does not establish the exact continuation length after the missed block, and because this is a realized_denied route I did not use the lose_to_faster_lose swindle/gate machinery to infer anything beyond the conceded immediate threat.",
 "confidence": "high"
}
```

### eval-8 — lose_to_faster_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`424424244263`  playedCol=5 (display 6)  bestCol=3 (display 4)  case=`lose_to_faster_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You were losing either way, but column 4 kept a real swindle: if the opponent slipped immediately after that move by playing in column 1, 3, or 7, you still had a forced sequence to a double-threat based on the row-3 window c1r3-c4r3, with the fork centered on c2r3. The move you played in column 6 throws that practical chance away and leaves the opponent many more non-losing replies instead of the single swindle-sensitive reply that remained after the better move.",
 "key_cells": [
  "c2r3",
  "c1r3",
  "c3r3",
  "c4r3",
  "c1r1"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.terminal",
  "lostResource.forkCase",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.witness.devCols",
  "lostResource.witness.oppPlies",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies",
  "opponentPunishment.tie.kind"
 ],
 "unsure_about": "The vector proves this is a lose-to-faster-lose swindle case, but it does not give a short concrete punishment line for the played move because the opponent's win is parity-based and the naming is deferred; it also does not establish a shared-cell geometric tie between the lost swindle and the opponent's win.",
 "confidence": "high"
}
```

### eval-9 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`3333364555535421220`  playedCol=1 (display 2)  bestCol=0 (display 1)  case=`lose_to_faster_lose`

```json
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You were losing either way, but column 1 kept a real swindle that your played move threw away. After the best move, there was still a practical chance if the opponent later slipped with columns 3, 5, or 6 (the vector’s 0-indexed devCols 2, 4, 5), whereas the move you played walks into the opponent’s long parity win on the diagonal c4r1-c3r2-c2r3-c1r4, completed at c1r4.",
 "key_cells": [
  "c3r6",
  "c4r1",
  "c3r2",
  "c2r3",
  "c1r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.pliesToEnd",
  "lostResource.witness.devCols",
  "lostResource.witness.oppPlies",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.playedPlies",
  "opponentPunishment.tie.swindlePlies",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "The vector proves the practical swindle exists but does not spell out the exact winning continuation after the opponent’s slip, and the parity win is nameable only by its controlling group/completing cell, not by a confirmed Allen rule name.",
 "confidence": "high"
}
```

### eval-10 — lose_to_faster_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`3`  playedCol=2 (display 3)  bestCol=3 (display 4)  case=`lose_to_faster_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You were losing either way, but column 4 kept a real swindle: after the best line's root (`node: \"33\"`), the opponent's very next move had many slip columns (`1, 2, 3, 5, 6, 7` in display) that would let you back into a parity-based win on the group `c3r2-c6r2`, eventually completing at `c6r2`. The move you played instead gives the opponent much more room to stay safe (`afterPlayed: 4` vs `afterBest: 1`) and leads to their own parity win on `c4r1-c7r4`, completing at `c6r3`, so it throws away the practical swindle the better move preserved.",
 "key_cells": [
  "c3r2",
  "c4r2",
  "c5r2",
  "c6r2",
  "c4r1",
  "c5r2",
  "c6r3",
  "c7r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.witness.node",
  "lostResource.witness.devCols",
  "lostResource.witness.oppPlies",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.completingCell",
  "opponentPunishment.kind",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "The vector proves a practical swindle and the two parity-controlled groups, but it does not name a specific Allen rule or give a short forced line for either side because both halves are parity-register with naming deferred.",
 "confidence": "high"
}
```

### eval-11 — win_to_draw — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`3255`  playedCol=2 (display 3)  bestCol=6 (display 7)  case=`win_to_draw`

```json
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Playing column 7 would have preserved a long parity-based win centered on the controlling group c2r3-c5r3, eventually completing at c4r3. By playing column 3 instead, you let the opponent use the one saving reply in column 7, occupying c7r1; that shared square is explicitly tied to the resource you gave up, and after your played move the opponent has exactly one non-losing reply whereas after the best move they have none.",
 "key_cells": [
  "c2r3",
  "c3r3",
  "c4r3",
  "c5r3",
  "c7r1"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.parityNamingDeferred",
  "lostResource.anchorCells",
  "opponentPunishment.register",
  "opponentPunishment.completingCell",
  "opponentPunishment.savingCol",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector does not spell out the exact tactical meaning of the opponent's immediate neutralization beyond c7r1 being the tied saving reply, and it does not provide a named parity rule or a full winning line for the best move.",
 "confidence": "medium"
}
```

### eval-12 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`32552653232`  playedCol=0 (display 1)  bestCol=2 (display 3)  case=`win_to_lose`

```json
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "The blunder was a defensive miss: the opponent already had an immediate vertical threat in column 3, with c3r2-c3r4 occupied and c3r5 the winning square. The better move was to play column 3 and occupy c3r5 yourself; by playing column 1 instead, you failed to block that exact square and let the opponent keep a forced win there.",
 "key_cells": [
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.cell",
  "lostResource.window",
  "opponentPunishment.kind",
  "opponentPunishment.owner",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-13 — win_to_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`33`  playedCol=2 (display 3)  bestCol=3 (display 4)  case=`win_to_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Playing column 4 would have preserved a long parity-based win for you on the controlling group c2r5-c5r5, eventually completing at c5r5. Instead, the move you played lets the opponent force their own long parity win on a different diagonal window c2r1-c5r4, completing at c5r4. The two ideas are explicitly independent here, so this is not 'the same square changing hands' but giving up your winning parity structure and allowing a separate opposing one.",
 "key_cells": [
  "c2r5",
  "c3r5",
  "c4r5",
  "c5r5",
  "c2r1",
  "c3r2",
  "c4r3",
  "c5r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.parityAttribution.controllingGroup",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.tie.kind",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector shows both sides' wins are deep parity wins, but parityNamingDeferred is true on both halves, so it does not confirm a named Allen rule or a more specific tactic beyond the controlling groups and completing cells.",
 "confidence": "high"
}
```

### eval-14 — lose_to_faster_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`3`  playedCol=4 (display 5)  bestCol=3 (display 4)  case=`lose_to_faster_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "This is a lose-to-faster-lose blunder: you were lost either way, but column 4 kept a real swindle. After the better move, the engine found an immediate practical chance at node \"33\": if the opponent's very next reply is any of columns 1, 2, 3, 5, 6, or 7, your parity resource on the controlling group c3r2-c6r2 can still become a win ending at c6r2. By playing column 5 instead, you throw that swindle away and allow the opponent a forced figure-7 fork sequence on the c4r4-c7r4 window, with c7r4 as the fork cell.",
 "key_cells": [
  "c3r2",
  "c4r2",
  "c5r2",
  "c6r2",
  "c7r4",
  "c4r4",
  "c5r4",
  "c6r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.witness.devCols",
  "lostResource.witness.oppPlies",
  "lostResource.parityAttribution.controllingGroup",
  "opponentPunishment.kind",
  "opponentPunishment.terminal",
  "opponentPunishment.forkCase",
  "opponentPunishment.forkCells",
  "opponentPunishment.forkWindows",
  "opponentPunishment.completingCell",
  "opponentPunishment.tacticTag",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.tied",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "The vector shows the swindle witness and the opponent's punishment, but it does not spell out a full named tactic for the better move beyond a parity-controlled resource, so I cannot say more specifically how your win would be realized after an opponent slip.",
 "confidence": "high"
}
```

### eval-15 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`341330`  playedCol=6 (display 7)  bestCol=1 (display 2)  case=`win_to_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 2 was winning: it preserved a long parity-based win on the row-5 group c1r5-c4r5, eventually completing at c1r5. By playing column 7 instead, you gave the opponent a forced sequence to an unstoppable double-threat fork at c6r5 and c7r5; one of its winning windows is c3r5-c6r5. The punishment is tied to a square of the resource you gave up, because c2r2 is listed as both one of your lost resource's anchor cells and a shared cell in the opponent's winning line.",
 "key_cells": [
  "c1r5",
  "c2r2",
  "c3r5",
  "c4r5",
  "c5r5",
  "c6r5",
  "c7r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.terminal",
  "opponentPunishment.forkCase",
  "opponentPunishment.forkCells",
  "opponentPunishment.forkWindows",
  "opponentPunishment.tacticTag",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector shows the best move preserves a parity win, but parityNamingDeferred is true, so it does not confirm a named Allen rule or a more specific tactic name for that winning resource.",
 "confidence": "high"
}
```

### eval-16 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`341330613`  playedCol=4 (display 5)  bestCol=3 (display 4)  case=`win_to_lose`

```json
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Playing column 5 threw away a forced win. The better move, column 4, preserved an eventual double-threat fork for you with winning threats at c6r5 and c7r5, but the move you played lets the opponent force their own winning fork instead, centered on the c3r3-c6r3 window. The connection is direct: the punishment is tied to c4r5, a square from the winning resource you gave up.",
 "key_cells": [
  "c6r5",
  "c7r5",
  "c3r3",
  "c4r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.terminal",
  "lostResource.forkCase",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.register",
  "opponentPunishment.terminal",
  "opponentPunishment.forkCase",
  "opponentPunishment.forkCells",
  "opponentPunishment.window",
  "opponentPunishment.tacticTag",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-17 — draw_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`44443`  playedCol=3 (display 4)  bestCol=2 (display 3)  case=`draw_to_lose`

```json
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "Playing column 4 was a blunder because you were holding a draw by occupying c3r1 with the better move in column 3, which plugs the bottom-row window c2r1-c5r1. Instead, your move enabled an immediate opponent double threat on the bottom row at c2r1 and c6r1, based on the two windows c2r1-c5r1 and c3r1-c6r1; the shared square c3r1 is exactly the defensive square you failed to take.",
 "key_cells": [
  "c3r1",
  "c2r1",
  "c6r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.cell",
  "lostResource.window",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-18 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`3152332536215522346266536`  playedCol=4 (display 5)  bestCol=0 (display 1)  case=`lose_to_faster_lose`

```json
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You were losing either way, but column 1 was better because your played move in column 5 immediately handed player 1 a realized figure-7 pattern. That pattern is the diagonal window c7r2-c6r3-c5r4-c4r5 with c5r4 as the completing cell; the vector also says this punishment is independent of the best move's resource, so the blunder is specifically that you enabled this immediate opponent tactic rather than preserving the swindle chances the best move kept.",
 "key_cells": [
  "c5r4",
  "c7r2",
  "c6r3",
  "c4r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.cells",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.kind",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.exhaustive"
 ],
 "unsure_about": "The vector does not spell out the exact defensive resource preserved by the best move beyond saying a swindle exists and no occupation witness was involved, so I cannot name a specific saved cell or line for that half.",
 "confidence": "high"
}
```

### eval-19 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`315233253621552234626653641`  playedCol=4 (display 5)  bestCol=1 (display 2)  case=`lose_to_faster_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You were losing either way, but column 2 kept some practical counterplay while the move you played handed the opponent an immediate threat. After your played move, player 1 has a one-move win at c5r4 on the diagonal window c7r2-c6r3-c5r4-c4r5, so the loss becomes faster; the vector also says this threat is independent of the resource the better move preserved.",
 "key_cells": [
  "c5r4",
  "c7r2",
  "c6r3",
  "c4r5"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.cells",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.kind",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.exhaustive"
 ],
 "unsure_about": "The vector does not name the exact defensive resource preserved by the better move: lostResource is only a denial with verdict no_occupation and gives no cell or window, so I cannot say which specific square or pattern column 2 kept alive.",
 "confidence": "high"
}
```

### eval-20 — lose_to_faster_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`334531345414414102133022210000`  playedCol=5 (display 6)  bestCol=2 (display 3)  case=`lose_to_faster_lose`

```json
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Playing column 6 hands the opponent an immediate threat: after your move they have a live diagonal window c3r1-c4r2-c5r3-c6r4 with c6r4 as the completing square. You were losing either way, but the better move in column 3 kept a practical swindle alive, while the played move lets the opponent force matters immediately instead of preserving that counterchance.",
 "key_cells": [
  "c3r1",
  "c4r2",
  "c5r3",
  "c6r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.kind",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "The vector does not name the exact defensive resource preserved by the best move: lostResource is only a no_occupation denial witness, so I cannot specify which concrete cells or line made the swindle possible.",
 "confidence": "high"
}
```

### eval-21 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`334`  playedCol=3 (display 4)  bestCol=2 (display 3)  case=`win_to_lose`

```json
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 3 was the winning move for you: it immediately occupies c3r1, which sits in the bottom-row window c2r1-c5r1 and denies the opponent access to that square. By playing column 4 instead, you handed player 1 an immediate double threat on the bottom row, with threats based on the two windows c2r1-c5r1 and c3r1-c6r1; the key shared square is c3r1, the square your best move would have occupied but your played move left available.",
 "key_cells": [
  "c3r1",
  "c2r1",
  "c6r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.verdict",
  "lostResource.register",
  "lostResource.cell",
  "lostResource.window",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.register",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-22 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`3343`  playedCol=3 (display 4)  bestCol=2 (display 3)  case=`win_to_lose`

```json
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 3 would have created your immediate double threat: two bottom-row winning windows, c2r1-c5r1 and c3r1-c6r1, with threats at c2r1 and c6r1 that the opponent cannot both answer. Instead, after the move you played, the opponent can immediately occupy c3r1, killing the c2r1-c5r1 window on the very fork structure you failed to create; with best play, your winning resource is gone and the position becomes losing.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c6r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.register",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.register",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector establishes the missed double threat and the opponent's immediate occupation at c3r1, but it does not spell out the full winning line for the opponent after that, so I cannot name more of the eventual losing sequence.",
 "confidence": "high"
}
```

### eval-23 — lose_to_faster_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`32556442454451212`  playedCol=5 (display 6)  bestCol=1 (display 2)  case=`lose_to_faster_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 2 was better because, although you were losing either way, it at least kept some swindle chances alive. By playing column 6 instead, you immediately handed the opponent a realized figure_7 pattern on the diagonal window c6r1-c5r2-c4r3-c3r4, with c4r3 as the completing cell; that tactical punishment is independent of the resource the best move preserved, and it also leaves the opponent far more safe replies.",
 "key_cells": [
  "c6r1",
  "c5r2",
  "c4r3",
  "c3r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "opponentPunishment.kind",
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.kind",
  "lostResource.kind",
  "lostResource.verdict",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "The vector does not identify the exact defensive resource preserved by the best move beyond saying it kept a real swindle alive and that no occupation witness was involved, so I cannot name a specific saved cell or line for that half.",
 "confidence": "high"
}
```

### eval-24 — win_to_draw — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`33333555511111`  playedCol=1 (display 2)  bestCol=5 (display 6)  case=`win_to_draw`

```json
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Playing column 6 would have preserved a forced win: your winning resource is a double-threat fork with threats at c5r5 and c7r6, based on the windows c3r5-c6r5 and c4r3-c7r6. By playing column 2 instead, you let the opponent immediately occupy c6r5, which locally kills the c3r5-c6r5 winning window; that shared square is part of the very fork resource you gave up, and with best play the position only draws.",
 "key_cells": [
  "c5r5",
  "c7r6",
  "c6r5",
  "c3r5",
  "c4r5",
  "c5r4",
  "c4r3"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "lostResource.kind",
  "lostResource.register",
  "lostResource.terminal",
  "lostResource.forkCase",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.line",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-25 — win_to_draw — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`3402440500455533023013413`  playedCol=5 (display 6)  bestCol=2 (display 3)  case=`win_to_draw`

```json
{
 "better_move": 3,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Column 3 was winning because it immediately formed your double threat: one threat completes on c2r3 across the row c2r3-c5r3, and the other is the vertical threat up to c3r4. By playing column 6 instead, you missed that pattern, and the opponent can immediately occupy c2r3 to kill one of those winning windows; after that, the position is only a draw rather than a forced win.",
 "key_cells": [
  "c2r3",
  "c3r4",
  "c3r3",
  "c4r3",
  "c5r3"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.owner",
  "lostResource.register",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.register",
  "opponentPunishment.line",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-26 — win_to_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`332123542241313`  playedCol=5 (display 6)  bestCol=1 (display 2)  case=`win_to_lose`

```json
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 2 was winning because it created your immediate threat on c2r5 in the vertical window c2r2-c2r5; after that, the opponent would have no non-losing reply. By playing column 6 instead, you missed that threat and gave the opponent time to occupy c2r4 in the same window, so the resource you could have used to force a win is denied and the position turns into a loss.",
 "key_cells": [
  "c2r5",
  "c2r4",
  "c2r2",
  "c2r3"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.owner",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.cells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.line",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "The vector establishes the missed immediate threat and the opponent's occupation of c2r4 in the same window, but it does not spell out the opponent's full eventual winning line beyond that denial.",
 "confidence": "high"
}
```

### eval-27 — win_to_lose — FAIL (A1 pass/A2 pass/A3 fail/A4 fail)
- board: movestring=`353312566345`  playedCol=5 (display 6)  bestCol=4 (display 5)  case=`win_to_lose`

```json
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 5 was the winning move: it would have created your immediate threat on the row-2 window c3r2-c6r2, with c3r2 as the completing cell, and the opponent would have no non-losing reply. By playing column 6 instead, you missed that threat and let the opponent immediately occupy c5r2, a square in that same winning window, so your win disappears and the position loses instead.",
 "key_cells": [
  "c3r2",
  "c5r2",
  "c4r2",
  "c6r2"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.line",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-28 — win_to_lose — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`33333042224644253065`  playedCol=4 (display 5)  bestCol=5 (display 6)  case=`win_to_lose`

```json
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "Column 6 would have created your own immediate figure-7 threat on the row-3 window c4r3-c7r3, with c7r3 as the completing square; after that, the opponent has no non-losing reply. By playing column 5 instead, you missed that resource, and the opponent can eventually occupy c7r3 themselves along the forced sequence shown, denying that same window and turning your winning position into a loss.",
 "key_cells": [
  "c4r3",
  "c5r3",
  "c6r3",
  "c7r3"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.line",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-29 — win_to_draw — PASS (A1 pass/A2 pass/A3 pass/A4 pass)
- board: movestring=`351433344402416516321`  playedCol=4 (display 5)  bestCol=5 (display 6)  case=`win_to_draw`

```json
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Playing column 6 would have created your own immediate figure_7 pattern on the vertical window c6r1-c6r4, with c6r4 as the completing cell; the vector treats that as a winning resource with no non-losing reply for the opponent. By playing column 5 instead, you missed that pattern, and in the shown forcing line the opponent later occupies c6r3, a square from that same window, which kills the vertical win and leaves only a draw.",
 "key_cells": [
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4"
 ],
 "fields_relied_on": [
  "bestCol",
  "case",
  "route",
  "tag",
  "direction",
  "lostResource.kind",
  "lostResource.tag",
  "lostResource.owner",
  "lostResource.register",
  "lostResource.window",
  "lostResource.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.kind",
  "opponentPunishment.verdict",
  "opponentPunishment.register",
  "opponentPunishment.line",
  "opponentPunishment.window",
  "opponentPunishment.cell",
  "opponentPunishment.tie.kind",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```
