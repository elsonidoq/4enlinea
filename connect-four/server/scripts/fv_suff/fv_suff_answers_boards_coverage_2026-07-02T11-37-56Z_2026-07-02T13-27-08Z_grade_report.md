# Feature-Vector Sufficiency Report — fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_2026-07-02T13-27-08Z.jsonl

## Summary
- Answer rows: 29   parse failures: 0
- Cases (id × condition): 29   passed (A1–A4 on all runs): 27   failed: 2
- Per-axis pass rate (over all 29 gradeable runs): A1 29/29 · A2 29/29 · A3 29/29 · A4 27/29
- N = 1 run per case, single condition (**A — full vector**). No B/C ablation in this batch, so the A-vs-B-vs-C transfer read is not available here.

## Pass/fail by condition

| condition | cases | passed | A3 pass-rate | A4 pass-rate |
|---|---|---|---|---|
| A (full) | 29 | 27 | 29/29 | 27/29 |

Only Condition A was generated. A3 held on every case; **both failures are A4 (fabrication)**, and both trace to the *same* class of defect: a cell/window field in the vector that is off the true board geometry, which the model faithfully reproduced. This is the classic "a confidently-wrong field is worse than an absent one" pattern (spec §Status).

## Per-case verdict

| id | category | A1 | A2 | A3 | A4 | pass |
|---|---|---|---|---|---|---|
| eval-1 | win_to_draw | pass | pass | pass | pass | **PASS** |
| eval-2 | draw_to_lose | pass | pass | pass | pass | **PASS** |
| eval-3 | win_to_draw | pass | pass | pass | pass | **PASS** |
| eval-4 | draw_to_lose | pass | pass | pass | pass | **PASS** |
| eval-5 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-6 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-7 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-8 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-9 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-10 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-11 | win_to_draw | pass | pass | pass | pass | **PASS** |
| eval-12 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-13 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-14 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-15 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-16 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-17 | draw_to_lose | pass | pass | pass | pass | **PASS** |
| eval-18 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-19 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-20 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-21 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-22 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-23 | lose_to_faster_lose | pass | pass | pass | pass | **PASS** |
| eval-24 | win_to_draw | pass | pass | pass | pass | **PASS** |
| eval-25 | win_to_draw | pass | pass | pass | pass | **PASS** |
| eval-26 | win_to_lose | pass | pass | pass | fail | **FAIL** |
| eval-27 | win_to_lose | pass | pass | pass | pass | **PASS** |
| eval-28 | win_to_lose | pass | pass | pass | fail | **FAIL** |
| eval-29 | win_to_draw | pass | pass | pass | pass | **PASS** |

> **eval-26 (cond A): FAIL** — A4: model claims immediate vertical threat completes at c2r5 in window c2r2-c2r5; board shows the win completes at c2r4 (window c2r1-c2r4: Gray discs r1,r2,r3 + open playable r4, major threat col2 row4). Window c2r2-c2r5 has only 2 Gray discs, not an immediate threat. after-best game-over is r1-r4. A1/A2 hold: better_move 2 -> bestCol 1; pre-move scr col2=+14 (win), after-played opponent has +1 win (loss) = win_to_lose. A3 decisive mechanism (col2 vertical threat + occupation denial at c2r4) correct and shared cell c2r4 present.

> **eval-28 (cond A): FAIL** — A4: mechanism says column 6 'forms the figure-7 by taking c7r3, completing the row-3 window' but visualize 333330422246442530655 shows the col-6 move lands at c6r3 (Gn21), making a 3-in-row c4r3-c5r3-c6r3 that only THREATENS c7r3 (gravity-top) plus stacked c7r4 — it does not take c7r3 nor complete the window. A1: better_move 6-1==bestCol 5. A2: after-best scr all -10 (Green wins), after-played Gray scr +3 (Green loses) = win_to_lose. A3: figure_7 double-threat at c7r3/c7r4 is real and decisive.

## Counterexample list (THE DELIVERABLE)

Every A3/A4 failure and every non-empty `unsure_about`, attributed to a missing/ambiguous feature field or glossary ambiguity. The two **A4** rows are hard failures; the rest are **abstentions** (honest "couldn't tell", excluded from A4) that flag latent field gaps.

| field / glossary gap | axis | cases | evidence (board finding) |
|---|---|---|---|
| `lostResource.completingCell / lostResource.window / lostResource.cells` | **A4** | eval-26 | Vector says completingCell c2r5 and window [c2r2,c2r3,c2r4,c2r5]; board (visualize 3321235422413131 -> GAME OVER on c2r1-c2r4; major threat col2 row4) proves the immediate win completes at c2r4 with window c2r1-c2r4. Vector is off by one row; model reproduced c2r5 falsehood. |
| `opponentPunishment.window / lostResource.window` | **A4** | eval-27 | Both list [c3r2,c4r2,c5r2,c6r2] (display cols 3-6), which is the residual/after-best threat window, not Green's actual immediate winning window on either relevant board. Pre-move/played the real single-move win is cols 4-7 (c4r2-c7r2) completing at c5r2; cols 3-6 is only a 2-disc minor window there. Claim survives only because c5r2 lies inside cols 3-6 and c3r2-c6r2 is a genuine major threat after best, but the window field is column-imprecise. |
| `lostResource.entryCell / completingCell / anchorCells (all 'c7r3'); no field gives bestCol's landing square` | **A4** | eval-28 | bestCol=5 physically lands at c6r3 per visualizer, but every lostResource cell field points to c7r3, leading the model to claim column 6 'takes c7r3' and 'completes the window' when it only creates a threat there |
| `lostResource.line` / `opponentPunishment.line` = null + `parityAttribution.namedRule` = null (deep forced win, no move-order or named rule) | abstention | eval-1, eval-2, eval-3, eval-6, eval-9, eval-10, eval-11, eval-13, eval-14, eval-15, eval-19, eval-20, eval-22, eval-27 | Wins are 28–40 plies deep; `line:null` (honest signal) means no forcing sequence to narrate, so the model cannot spell out the win's move order or name the parity rule. |
| `lostResource` denial with `verdict:no_occupation` (cell/window/anchorCells all null/empty) — no concrete preserved square | abstention | eval-16, eval-18, eval-23 | On the realized/denied route the best move's preserved defensive resource has no occupation cell to exhibit (D18), so the model cannot name what square the better move saved. |
| `opponentPunishment.savingCol (single value vs savingReplyCount:4)` | abstention | eval-1 | After "4" the solver shows four drawing replies (score 0 in display cols 2-5); the vector names only savingCol=4, so which of the four is principal is unspecified. |
| `case=lose_to_faster_lose vs missing bestScore/playedScore + gate.verdict=NotABlunder` | abstention | eval-7 | Vector exposes no slower-vs-faster-loss magnitude (no score fields, lostResource.line=[]), so on the realized_denied route the model can only narrate the missed block at c2r4 and honestly abstains from the lose_to_faster_lose speed framing; pre-move scr shows best=-2 vs played=-5 but this delta is not surfaced in any field. |
| `opponentPunishment.tie (temporal-only) + replyHistogram (count-only)` | abstention | eval-8 | After-played board scr row is all-positive for Gray (6 safe replies) vs after-best only col4 positive (1 reply); the vector encodes this only as counts and a temporal tie.kind, giving no cell-level/geometric field for WHY the played move destroys the swindle, which is exactly what the run flagged. |
| `lostResource.tag / feature-vector-glossary figure_7` | abstention | eval-29 | tag='figure_7' but lostResource.windows is a pure vertical column (c6r1-c6r4); the board shows a plain 3-in-a-column vertical threat, not an L/7-shape. The tag carries no geometry to distinguish, driving the model's honest unsure_about. |

## fields_relied_on distribution

Aggregated across all 29 answers. Load-bearing (cited in nearly every case): `bestCol`, `case`, `opponentPunishment.kind`, `opponentPunishment.tie.kind`, `lostResource.kind`. The two-halves structure (`lostResource.*` / `opponentPunishment.*`) plus `tie` and `replyHistogram` are the backbone of the mechanism narration.

| count | field |
|---|---|
| 29 | `bestCol` |
| 29 | `case` |
| 29 | `opponentPunishment.kind` |
| 29 | `opponentPunishment.tie.kind` |
| 27 | `lostResource.kind` |
| 25 | `opponentPunishment.window` |
| 24 | `lostResource.register` |
| 22 | `replyHistogram.afterBest` |
| 22 | `replyHistogram.afterPlayed` |
| 20 | `lostResource.window` |
| 19 | `opponentPunishment.completingCell` |
| 19 | `opponentPunishment.tie.sharedCells` |
| 18 | `opponentPunishment.register` |
| 17 | `lostResource.anchorCells` |
| 16 | `route` |
| 16 | `tag` |
| 16 | `direction` |
| 14 | `lostResource.completingCell` |
| 10 | `lostResource.verdict` |
| 10 | `opponentPunishment.tag` |
| 9 | `gate.verdict` |
| 8 | `opponentPunishment.verdict` |
| 8 | `opponentPunishment.cell` |
| 8 | `opponentPunishment.owner` |
| 8 | `opponentPunishment.cells` |
| 7 | `lostResource.cell` |
| 7 | `opponentPunishment.line` |
| 6 | `lostResource.parityAttribution.controllingGroup` |
| 6 | `gate.witness.oppPlies` |
| 6 | `lostResource.tag` |
| 6 | `lostResource.owner` |
| 5 | `opponentPunishment.parityAttribution.controllingGroup` |
| 5 | `lostResource.terminal` |
| 5 | `lostResource.forkCase` |
| 5 | `lostResource.tacticTag` |
| 5 | `gate.witness.devCols` |
| 5 | `lostResource.cells` |
| 4 | `lostResource.forkCells` |
| 4 | `lostResource.forkWindows` |
| 4 | `lostResource.witness.devCols` |
| 4 | `lostResource.witness.oppPlies` |
| 3 | `opponentPunishment.terminal` |
| 3 | `opponentPunishment.forkCase` |
| 3 | `opponentPunishment.forkCells` |
| 3 | `opponentPunishment.tacticTag` |
| 2 | `opponentPunishment.savingCol` |
| 2 | `opponentPunishment.savingReplyCount` |
| 2 | `opponentPunishment.tie.tied` |
| 2 | `opponentPunishment.windows` |
| 2 | `lostResource.exhaustive` |
| 2 | `lostResource.windows` |
| 1 | `opponentPunishment.entryCell` |
| 1 | `lostResource.pliesToEnd` |
| 1 | `opponentPunishment.tie.playedPlies` |
| 1 | `opponentPunishment.tie.swindlePlies` |
| 1 | `lostResource.parityAttribution.nameable` |
| 1 | `opponentPunishment.forkWindows` |
| 1 | `opponentPunishment.anchorCells` |

**Rarely/never cited** (candidate for glossary surfacing or removal): fields appearing ≤2× — e.g. `savingCol`, `savingReplyCount`, `tie.playedPlies`, `tie.swindlePlies`, `pliesToEnd`, `parityAttribution.nameable`, `entryCell`, `windows`, `exhaustive`. Note the `.line` fields are cited only 7× (opp) — precisely because they are usually `null` on the deep parity wins that dominate this set (the dominant abstention driver).

## Raw answers (per case)

### eval-1 — win_to_draw (win_to_draw)
- movestring: `(empty/opening)`  ·  playedCol 4 (display 5)  ·  bestCol 3 (display 4)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `neutralization`

```json
{
  "better_move": 4,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 4 would have preserved a long parity win: the controlling group is c2r5-c5r5, and with best play you eventually complete it at c5r5. Instead, the played move in column 5 lets the opponent keep drawing by a saving reply in column 5 at c5r2; this neutralization is independent of the lost winning resource rather than sharing one of its cells. The counterplay count reflects that difference: after the best move the opponent has no non-losing reply, but after the played move they have drawing replies available.",
  "key_cells": [
    "c2r5",
    "c3r5",
    "c4r5",
    "c5r5",
    "c5r2",
    "c4r1"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.window",
    "lostResource.completingCell",
    "lostResource.parityAttribution.controllingGroup",
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.completingCell",
    "opponentPunishment.entryCell",
    "opponentPunishment.savingCol",
    "opponentPunishment.savingReplyCount",
    "opponentPunishment.tie.kind",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector does not specify the exact full forcing sequence for the parity win or which of the four drawing replies after the played move is the principal one beyond the shown saving reply in column 5.",
  "confidence": "high"
}
```

### eval-2 — draw_to_lose (draw_to_lose)
- movestring: `422242`  ·  playedCol 5 (display 6)  ·  bestCol 3 (display 4)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "Playing column 4 would have preserved a draw by eventually occupying c4r4, which plugs the opponent's winning window c1r4-c4r4. By playing column 6 instead, you gave up that defensive occupation, and with best play the opponent gets a long parity win on that same controlling group, finishing at c4r4.",
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
    "lostResource.register",
    "lostResource.cell",
    "lostResource.window",
    "lostResource.completingCell",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "The vector shows that the draw is held by eventually occupying c4r4 and that the played move loses by parity on the same window, but it does not establish a shorter tactical name beyond that structural defense/win.",
  "confidence": "high"
}
```

### eval-3 — win_to_draw (win_to_draw)
- movestring: `422242532`  ·  playedCol 6 (display 7)  ·  bestCol 0 (display 1)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 1,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 1 would have preserved a forced win for player 2 built around the diagonal window c4r3-c5r4-c6r5-c7r6, with a double-threat resource on that line. By playing column 7 instead, you let the opponent occupy c6r5 along the optimal reply sequence, locally killing that winning window; globally, that is enough to neutralize your win and the game only draws. The punishment is tied to the very resource you gave up, because c6r5 is one of the anchor cells of the lost winning line.",
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
  "unsure_about": "The vector establishes that the best move keeps a forced win and that the played move allows an occupation at c6r5 to kill the key window, but it does not give a simpler short tactical summary beyond the recorded double-threat/fork framing.",
  "confidence": "high"
}
```

### eval-4 — draw_to_lose (draw_to_lose)
- movestring: `42224253264`  ·  playedCol 3 (display 4)  ·  bestCol 4 (display 5)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 5,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "Column 5 was the necessary block: your best move would have occupied c5r4, which sits in the opponent's vertical window c5r1-c5r4 and holds the draw. By playing column 4 instead, you missed that forced block and left c5r4 available, so the opponent's immediate threat on that same window is realized and you lose.",
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
    "opponentPunishment.register",
    "opponentPunishment.cells",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-5 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `422242532643343`  ·  playedCol 0 (display 1)  ·  bestCol 5 (display 6)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 6,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Column 6 was the necessary block: it occupies c6r2, which sits in the opponent's immediate winning diagonal c6r2-c5r3-c4r4-c3r5. By playing column 1 instead, you missed that forced block and left player 1 free to complete the threat on c6r2; the punishment is tied to the exact square you failed to occupy. You were losing either way, but this move is still a blunder because the best move at least kept a live swindle if the opponent slipped immediately.",
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
    "lostResource.cell",
    "lostResource.window",
    "opponentPunishment.kind",
    "opponentPunishment.tag",
    "opponentPunishment.owner",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "gate.verdict",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-6 — win_to_lose (win_to_lose)
- movestring: `422242532643343015330451665102`  ·  playedCol 0 (display 1)  ·  bestCol 1 (display 2)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 2 would have preserved a forced win for you: the recorded winning line ends in a fork on the row-5 window c1r5-c4r5, with c2r5 as the fork cell. By playing column 1 instead, you gave up that resource and let the opponent take over a parity win on the row-6 group c2r6-c5r6, eventually completing at c2r6; the tie shows this punishment is connected to the same resource through c1r5.",
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
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector establishes that the best move preserves a forced win and the played move loses to a parity win, but it does not provide a short explicit line for the opponent's parity win, so I cannot spell out the full move order of the punishment.",
  "confidence": "high"
}
```

### eval-7 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `42224253264334301533045166510200`  ·  playedCol 6 (display 7)  ·  bestCol 1 (display 2)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "This is a defensive miss: the opponent already had an immediate threat on the diagonal window c4r2-c3r3-c2r4-c1r5, with c2r4 as the critical open square. The better move was column 2, which occupies c2r4 and blocks that window; by playing column 7 instead, you failed to block, so the opponent can complete that same line at c2r4 immediately.",
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
    "opponentPunishment.kind",
    "opponentPunishment.tag",
    "opponentPunishment.owner",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "The vector labels the case as lose_to_faster_lose, but on the realized_denied route the load-bearing explanation is the missed forced block. It does not establish any further swindle or speed-comparison lesson here, and gate.verdict is NotABlunder, so I cannot honestly say more about the broader lose-to-faster-lose framing.",
  "confidence": "high"
}
```

### eval-8 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `424424244263`  ·  playedCol 5 (display 6)  ·  bestCol 3 (display 4)
- lostResource.kind: `conditional_swindle`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "This is a lose-to-faster-lose blunder: you were losing either way, but column 4 kept a real swindle. After the better move, if the opponent immediately slipped with column 1, 3, or 7, you still had a forced sequence to a Case-B double-threat centered on c2r3 on the c1r3-c4r3 row-3 window; the move you played instead throws that chance away and leaves the opponent many more safe replies.",
  "key_cells": [
    "c2r3",
    "c1r3",
    "c3r3",
    "c4r3",
    "c2r4"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.completingCell",
    "lostResource.window",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "lostResource.terminal",
    "lostResource.forkCase",
    "lostResource.forkCells",
    "lostResource.forkWindows",
    "lostResource.tacticTag",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector proves the better move preserves a practical swindle, but it does not establish the exact board-geometric reason why playing column 6 specifically removes that swindle beyond increasing the opponent's safe replies; tie is temporal rather than cell-sharing.",
  "confidence": "high"
}
```

### eval-9 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `3333364555535421220`  ·  playedCol 1 (display 2)  ·  bestCol 0 (display 1)
- lostResource.kind: `conditional_swindle`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 1,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 1 kept a real swindle alive: after that move, if the opponent later slipped with column 3, 5, or 6, you still had a winning resource, with the swindle witness anchored on c3r6. By playing column 2 instead, you throw that chance away and walk into the opponent's parity-based winning line on the diagonal c4r1-c3r2-c2r3-c1r4, eventually completed at c1r4.",
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
    "lostResource.anchorCells",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.playedPlies",
    "opponentPunishment.tie.swindlePlies",
    "opponentPunishment.tie.tied",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector does not name the exact continuation of the swindle or spell out the parity win as a move-by-move line, so I cannot say exactly how c3r6 would have been used or give the precise forcing sequence.",
  "confidence": "high"
}
```

### eval-10 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `3`  ·  playedCol 2 (display 3)  ·  bestCol 3 (display 4)
- lostResource.kind: `conditional_swindle`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 4 kept a real swindle: after that move, if the opponent slipped immediately by playing any of columns 1, 2, 3, 5, 6, or 7, you would still have a parity-based win on the group c3r2-c6r2, eventually completing at c6r2. Playing column 3 throws that practical chance away and instead allows the opponent a parity win on the diagonal window c4r1-c7r4, completing at c6r3; it also leaves the opponent more non-losing replies.",
  "key_cells": [
    "c3r2",
    "c4r2",
    "c5r2",
    "c6r2",
    "c4r1",
    "c6r3",
    "c7r4",
    "c5r2"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.window",
    "lostResource.completingCell",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "lostResource.parityAttribution.controllingGroup",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector does not provide the exact forced continuation for either parity win, so I cannot say more than that the better move preserved a swindle and the played move lost without that resource.",
  "confidence": "high"
}
```

### eval-11 — win_to_draw (win_to_draw)
- movestring: `3255`  ·  playedCol 2 (display 3)  ·  bestCol 6 (display 7)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `neutralization`

```json
{
  "better_move": 7,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 7 was winning, while the move you played only draws. The best move preserves a long parity win built around the controlling group c2r3-c5r3, eventually completing at c4r3; by not taking c7r1 yourself, you leave the opponent exactly one saving reply, and that reply is column 7 at c7r1. That saving square is tied to the resource you gave up, so your move lets the opponent neutralize the win instead of facing a lost position.",
  "key_cells": [
    "c7r1",
    "c2r3",
    "c3r3",
    "c4r3",
    "c5r3"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.completingCell",
    "lostResource.window",
    "lostResource.parityAttribution.nameable",
    "lostResource.parityAttribution.controllingGroup",
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.completingCell",
    "opponentPunishment.savingCol",
    "opponentPunishment.savingReplyCount",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector does not spell out the full forced sequence of the parity win, so beyond the controlling group c2r3-c5r3 and eventual completion at c4r3, it does not establish the detailed move-by-move win.",
  "confidence": "high"
}
```

### eval-12 — win_to_lose (win_to_lose)
- movestring: `32552653232`  ·  playedCol 0 (display 1)  ·  bestCol 2 (display 3)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "The blunder was a defensive miss: the opponent already had an immediate vertical threat in column 3 on the window c3r2-c3r5, with c3r5 as the winning square. The better move was to play column 3 and occupy c3r5 yourself; by playing column 1 instead, you left c3r5 open and handed the opponent their forced block tactic there, turning a winning position into a loss.",
  "key_cells": [
    "c3r5",
    "c3r2",
    "c3r3",
    "c3r4"
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
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.cells",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-13 — win_to_lose (win_to_lose)
- movestring: `33`  ·  playedCol 2 (display 3)  ·  bestCol 3 (display 4)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 was winning under best play, but the move you chose in column 3 loses instead. The best move preserved a long parity win built around the controlling group c2r5-c5r5, eventually completing at c5r5; your played move instead allows the opponent their own separate parity win on the diagonal c2r1-c3r2-c4r3-c5r4, completed at c5r4. These two resources are marked independent, so the punishment is not 'using the same square you gave up' but giving up your winning parity structure while allowing a different opponent win.",
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
  "unsure_about": "The vector shows both sides' wins are parity-based, but it does not provide a short forced line or a named parity rule, so I cannot say more specifically how column 4 secures c5r5 or exactly why column 3 concedes the diagonal beyond the controlling groups given.",
  "confidence": "high"
}
```

### eval-14 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `3`  ·  playedCol 4 (display 5)  ·  bestCol 3 (display 4)
- lostResource.kind: `conditional_swindle`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 4 was better because it kept a real swindle alive: after the best move, if the opponent immediately slipped with any of columns 1, 2, 3, 5, 6, or 7, you could still win via a long parity-controlled group on c3r2-c6r2, eventually completing at c6r2. Playing column 5 throws that resource away and instead allows the opponent a forced winning line that builds a figure-7 style fork on the row-4 window c4r4-c7r4, with c7r4 as the fork cell. The vector ties this as temporal rather than by a shared square: the loss comes from discarding the swindle, not from one specific reused cell.",
  "key_cells": [
    "c3r2",
    "c4r2",
    "c5r2",
    "c6r2",
    "c4r4",
    "c5r4",
    "c6r4",
    "c7r4"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.window",
    "lostResource.completingCell",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "lostResource.parityAttribution.controllingGroup",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.terminal",
    "opponentPunishment.forkCase",
    "opponentPunishment.forkCells",
    "opponentPunishment.tacticTag",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.tied",
    "gate.verdict",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector shows the preserved swindle and the opponent's punishment, but it does not spell out exactly how the better move itself creates or maintains that swindle beyond the parity-controlled group and the immediate-slip witness.",
  "confidence": "high"
}
```

### eval-15 — win_to_lose (win_to_lose)
- movestring: `341330`  ·  playedCol 6 (display 7)  ·  bestCol 1 (display 2)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 2 would have preserved a long parity win for you: the controlling group is c1r5-c4r5, with c1r5 as the eventual completing cell, and after that best move the opponent has no non-losing reply. By playing column 7 instead, you allow the opponent a forced sequence that builds an unstoppable double threat with fork cells c6r5 and c7r5; this punishment is tied to the square c2r2, which is one of the anchor cells of the winning resource you gave up.",
  "key_cells": [
    "c1r5",
    "c2r2",
    "c2r5",
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
  "unsure_about": "The vector shows that the best move wins by parity control of c1r5-c4r5, but it does not supply a short line or a named parity rule, so I cannot say more specifically how column 2 secures that long win beyond the controlling group and completing cell.",
  "confidence": "high"
}
```

### eval-16 — win_to_lose (win_to_lose)
- movestring: `341330613`  ·  playedCol 4 (display 5)  ·  bestCol 3 (display 4)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `winning_line`

```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 would have preserved a forced win for you: the winning line ends in a double-threat fork with threats at c6r5 and c7r5, based on the windows c3r5-c6r5 and c4r2-c7r5. Instead, the move you played lets the opponent force their own winning line, a fork on the c3r3-c6r3 window, and the two lines are directly linked because both hinge on the shared square c4r5.",
  "key_cells": [
    "c4r5",
    "c6r5",
    "c7r5",
    "c3r3",
    "c5r3",
    "c6r4"
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
    "opponentPunishment.window",
    "opponentPunishment.forkCells",
    "opponentPunishment.tacticTag",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector proves both sides' forced-sequence wins/forks and the shared square c4r5, but it does not establish a shorter verbal motif beyond that; I cannot say more about why c4r5 is the decisive crossover than the tie and listed windows show.",
  "confidence": "high"
}
```

### eval-17 — draw_to_lose (draw_to_lose)
- movestring: `44443`  ·  playedCol 3 (display 4)  ·  bestCol 2 (display 3)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "Playing column 3 would have held the draw by occupying c3r1, which sits inside the bottom-row window c2r1-c5r1. Instead, the played move enabled an immediate opponent double threat: player 1 gets threats at c2r1 and c6r1 on the two windows c2r1-c5r1 and c3r1-c6r1, and the shared square c3r1 is exactly the defensive cell you failed to take.",
  "key_cells": [
    "c3r1",
    "c2r1",
    "c6r1"
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

### eval-18 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `3152332536215522346266536`  ·  playedCol 4 (display 5)  ·  bestCol 0 (display 1)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 1,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Column 1 was the better move because, although you were losing either way, it kept some swindle chances alive: the gate witness says the opponent could still go wrong later (in columns 5 or 7) and let you back into at least a draw. By playing column 5 instead, you immediately handed the opponent a realized figure-7 fork centered on c5r4, on the diagonal window c7r2-c6r3-c5r4-c4r5, so your move loses faster.",
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
  "unsure_about": "The vector does not provide the denied pattern or a shared denial cell for the better move: lostResource is only a no_occupation denial with no cell/window, so I cannot name the exact defensive resource column 1 preserved beyond the gate's swindle witness.",
  "confidence": "high"
}
```

### eval-19 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `315233253621552234626653641`  ·  playedCol 4 (display 5)  ·  bestCol 1 (display 2)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but the better move kept more resistance; your played move immediately handed the opponent an immediate threat on c5r4, completing the diagonal window c7r2-c6r3-c5r4-c4r5. Because this is the realized pattern after your move and the tie is independent, the punishment is the opponent's new immediate threat itself, not a square taken out of a preserved resource.",
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
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector does not identify a concrete lost-resource cell or tactic for the better move: lostResource is a denial with verdict no_occupation, so I cannot name the exact defensive resource the better move preserved beyond the gate witness that a swindle chance remained.",
  "confidence": "high"
}
```

### eval-20 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `334531345414414102133022210000`  ·  playedCol 5 (display 6)  ·  bestCol 2 (display 3)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Column 6 was a blunder because it handed the opponent an immediate threat: after your move, they can play c6r4 to complete the diagonal window c3r1-c4r2-c5r3-c6r4. You were losing either way, but the better move in column 3 at least avoided conceding that one-move win and kept more resistance; the vector marks the conceded threat as independent of the lost resource rather than the same square you had been using.",
  "key_cells": [
    "c6r4",
    "c3r1",
    "c4r2",
    "c5r3"
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
    "lostResource.verdict"
  ],
  "unsure_about": "The vector does not identify a concrete occupied denial square for the better move; lostResource is only a no_occupation witness, so I cannot name the exact defensive resource it preserved beyond 'it did not concede the immediate threat.'",
  "confidence": "high"
}
```

### eval-21 — win_to_lose (win_to_lose)
- movestring: `334`  ·  playedCol 3 (display 4)  ·  bestCol 2 (display 3)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 was a blunder because it handed the opponent an immediate double threat on the bottom row: the two winning endpoints are c2r1 and c6r1, on the windows c2r1-c5r1 and c3r1-c6r1, so they cannot both be answered. The better move was column 3, which would instead occupy c3r1 and deny that same structure; the shared square c3r1 is the key tie between the defense you missed and the fork you allowed.",
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
    "opponentPunishment.anchorCells",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-22 — win_to_lose (win_to_lose)
- movestring: `3343`  ·  playedCol 3 (display 4)  ·  bestCol 2 (display 3)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "The better move was column 3, which would have formed your immediate double threat on the bottom row: the two winning windows c2r1-c5r1 and c3r1-c6r1, with key threat cells at c2r1 and c6r1. By playing column 4 instead, you missed that fork, and the opponent can immediately occupy c3r1, a shared square from that lost pattern, killing the c2r1-c5r1 window; after the best move the opponent had no non-losing reply, but after the played move they have escapes.",
  "key_cells": [
    "c2r1",
    "c3r1",
    "c6r1",
    "c2r1",
    "c3r1",
    "c4r1",
    "c5r1",
    "c3r1",
    "c4r1",
    "c5r1",
    "c6r1"
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
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.verdict",
    "opponentPunishment.register",
    "opponentPunishment.cell",
    "opponentPunishment.window",
    "opponentPunishment.line",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector proves the missed immediate double threat and the opponent's occupation of c3r1, but it does not spell out the full subsequent winning line after that denial.",
  "confidence": "high"
}
```

### eval-23 — lose_to_faster_lose (lose_to_faster_lose)
- movestring: `32556442454451212`  ·  playedCol 5 (display 6)  ·  bestCol 1 (display 2)
- lostResource.kind: `denial`  ·  opponentPunishment.kind: `realized_pattern`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Column 2 was better because, although you were losing either way, it kept more resistance: after the best move the opponent had only one non-losing reply, while your played move left all seven replies non-losing. By playing column 6, you immediately handed the opponent a realized figure-7 stacked fork centered on c4r3, on the diagonal window c6r1-c5r2-c4r3-c3r4; this punishment is independent of the resource the best move preserved.",
  "key_cells": [
    "c4r3",
    "c6r1",
    "c5r2",
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
    "opponentPunishment.cells",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.tie.kind",
    "lostResource.kind",
    "lostResource.verdict",
    "lostResource.exhaustive",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector does not name the exact defensive resource preserved by the best move: lostResource is only a denial with verdict no_occupation, so no specific cell or window for that half is established.",
  "confidence": "high"
}
```

### eval-24 — win_to_draw (win_to_draw)
- movestring: `33333555511111`  ·  playedCol 1 (display 2)  ·  bestCol 5 (display 6)
- lostResource.kind: `winning_line`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 6,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "The played move threw away a forced win. Best play in column 6 preserved a winning line that leads to an unstoppable double-threat fork at c5r5 and c7r6, but after the move actually played the opponent has a single immediate saving occupation at c6r5, which kills the window c3r5-c4r5-c5r5-c6r5 and holds the game to a draw.",
  "key_cells": [
    "c5r5",
    "c7r6",
    "c6r5",
    "c3r5",
    "c4r5",
    "c6r5",
    "c4r3",
    "c5r4"
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

### eval-25 — win_to_draw (win_to_draw)
- movestring: `3402440500455533023013413`  ·  playedCol 5 (display 6)  ·  bestCol 2 (display 3)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 3,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "The better move was column 3, which immediately gave you a double threat: winning points at c2r3 and c3r4, based on the horizontal window c2r3-c5r3 and the vertical window c3r1-c3r4. By playing column 6 instead, you missed that fork, and the opponent could immediately occupy c2r3 to kill one of those winning windows; with best play that neutralizes your win and leaves only a draw.",
  "key_cells": [
    "c2r3",
    "c3r4",
    "c3r3",
    "c4r3",
    "c5r3",
    "c3r1",
    "c3r2"
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

### eval-26 — win_to_lose (win_to_lose)
- movestring: `332123542241313`  ·  playedCol 5 (display 6)  ·  bestCol 1 (display 2)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 2 was winning because it created your immediate vertical threat on c2r5 in the window c2r2-c2r5; after that, the opponent had no non-losing reply. By playing column 6 instead, you missed that threat and allowed the opponent's immediate occupation of c2r4, which sits in that same winning window and denies it; from there the played move loses.",
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
    "lostResource.register",
    "lostResource.cells",
    "lostResource.window",
    "lostResource.completingCell",
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.verdict",
    "opponentPunishment.register",
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

### eval-27 — win_to_lose (win_to_lose)
- movestring: `353312566345`  ·  playedCol 5 (display 6)  ·  bestCol 4 (display 5)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 5,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "The better move was column 5, which would have created your immediate threat on the row-2 window c3r2-c6r2, with c3r2 as the completing cell. By playing column 6 instead, you missed that threat and allowed the opponent's immediate occupation of c5r2 to deny that same winning window; after the best move they would have had no non-losing reply, but after the played move they had exactly one saving reply.",
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
    "lostResource.owner",
    "lostResource.register",
    "lostResource.cells",
    "lostResource.window",
    "lostResource.completingCell",
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
  "unsure_about": "The vector establishes the missed immediate threat and its denial, but it does not spell out the opponent's full winning continuation beyond that immediate denial.",
  "confidence": "high"
}
```

### eval-28 — win_to_lose (win_to_lose)
- movestring: `33333042224644253065`  ·  playedCol 4 (display 5)  ·  bestCol 5 (display 6)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 6,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 6 would have immediately formed your figure-7 pattern by taking c7r3, completing the row-3 window c4r3-c7r3; after that the opponent has no non-losing reply. By playing column 5 instead, you missed that immediate winning square, and the opponent's forcing line ends with them occupying c7r3 themselves, denying that same window and turning your missed win into a loss.",
  "key_cells": [
    "c7r3",
    "c4r3",
    "c5r3",
    "c6r3"
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

### eval-29 — win_to_draw (win_to_draw)
- movestring: `351433344402416516321`  ·  playedCol 4 (display 5)  ·  bestCol 5 (display 6)
- lostResource.kind: `realized_pattern`  ·  opponentPunishment.kind: `denial`

```json
{
  "better_move": 6,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "The better move was column 6, which immediately gives you a realized figure_7 pattern on the vertical window c6r1-c6r4, with c6r4 as the key winning cell. By playing column 5 instead, you missed that pattern, and the opponent can then occupy c6r3 on that same window after the shown forced sequence, locally breaking the pattern; with best play that neutralizes your win and the game only draws.",
  "key_cells": [
    "c6r4",
    "c6r3",
    "c6r1",
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
    "lostResource.owner",
    "lostResource.register",
    "lostResource.cells",
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
  "unsure_about": "The vector names the missed tactic as figure_7 but does not further define its geometry beyond the carried vertical window and key cells, so I cannot say more about that pattern than what the vector explicitly establishes.",
  "confidence": "high"
}
```

