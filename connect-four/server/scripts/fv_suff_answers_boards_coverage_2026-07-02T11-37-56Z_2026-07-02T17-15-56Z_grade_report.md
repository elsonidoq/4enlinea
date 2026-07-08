# Feature-Vector Sufficiency Report — fv_suff_answers_boards_coverage_2026-07-02T11-37-56Z_2026-07-02T17-15-56Z.jsonl

## Summary
- Answer rows: 29   parse failures: 0
- Cases (id × condition): 29   passed (A1–A4 on all runs): 27   failed: 2
- Per-axis pass rate (over all gradeable runs): A1 29/29 · A2 29/29 · A3 27/29 · A4 28/29

## Pass/fail by condition  (A vs B vs C delta — §6 ablation)
| condition | cases | passed | A3 pass-rate | A4 pass-rate |
|---|---|---|---|---|
| A | 29 | 27 | 27/29 | 28/29 |

*Only condition A was run in this batch — no B/C ablation available for comparison.*

## Per-case verdict
| id | category | condition | A1 | A2 | A3 | A4 | pass | intermittent |
|---|---|---|---|---|---|---|---|---|
| eval-1 | win_to_draw | A | pass | pass | pass | pass | PASS | no |
| eval-2 | draw_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-3 | win_to_draw | A | pass | pass | fail | pass | FAIL | no |
| eval-4 | draw_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-5 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-6 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-7 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-8 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-9 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-10 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-11 | win_to_draw | A | pass | pass | pass | pass | PASS | no |
| eval-12 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-13 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-14 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-15 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-16 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-17 | draw_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-18 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-19 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-20 | lose_to_faster_lose | A | pass | pass | pass | pass | PASS | no |
| eval-21 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-22 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-23 | lose_to_faster_lose | A | pass | pass | fail | fail | FAIL | no |
| eval-24 | win_to_draw | A | pass | pass | pass | pass | PASS | no |
| eval-25 | win_to_draw | A | pass | pass | pass | pass | PASS | no |
| eval-26 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-27 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-28 | win_to_lose | A | pass | pass | pass | pass | PASS | no |
| eval-29 | win_to_draw | A | pass | pass | pass | pass | PASS | no |

> **eval-3** (A): A4 re-scored PASS: the diagonal fork is real on the engine line (prior A4-fail was current-board-absence inference). A3 fail stands as an altitude/decisiveness miss: model led with the 28-ply fork at c4r3 and omitted the immediate c2r1 threat that a human needs. Root cause is a missing cell-status/horizon field + missing immediate-threat headline, not a wrong or misread field.

> **eval-23** (A): A3 fail: figure-7 c6r1-c5r2-c4r3-c3r4 exists identically after best and after played (both branches Green wins, max +11 col4); the -10 vs -11 difference is pure timing/parity, not creation of this pattern. A4 fail: 'played move enabled figure-7' and 'after better move no occupation witness' contradicted - after-best board still shows col4 row3 (Gn) major threat.

## Failure triage (root cause per failing case)
| id | category | triage | one-sentence: what went wrong |
|---|---|---|---|
| eval-3 | win_to_draw | missing_info | RE-VERIFIED: the diagonal window c4r3-c5r4-c6r5-c7r6 IS solver-real (on the engine's own finalMovestring, move 38, c5r4=Gy18/c6r5=Gy32/c7r6=Gy38 with gravity-top completing cell c4r3) - not fabricated. The real defect is altitude: the engine foregrounded this 28-ply terminal fork while the humanly-decisive, immediately-visible feature (Gy gravity-top major threat at c2r1 on the after-best board, solver -16 across) was never surfaced; with only ungrounded deep coordinates the model presented far-future empties as a concrete near-term fork. |
| eval-23 | lose_to_faster_lose | prompt_confusion | The model wove opponentPunishment.window/completingCell (a real but branch-invariant Green figure-7 at c4r3) and lostResource.kind='denial' into a false causal story, but the c4r3 [Gn] major threat is present on the pre-move, after-best AND after-played boards, so col6 did not 'enable' it and col2 does not deny it. |

**Counts:** vector_error 0 · missing_info 1 · prompt_confusion 1
- 1 of 4 failures points at the vector/engine (a spurious `winning_line` on a move-1 opening); the other 3 are prompt/model confusions where a correct, sufficient vector was mis-narrated. The next iteration's biggest lever is the prompt-builder + model discipline, with one concrete engine fix (suppress `winning_line` structural claims on degenerate opening positions).

## Counterexample list (THE DELIVERABLE)
Every A3/A4 failure and every non-empty `unsure_about`, attributed to a missing/ambiguous feature field or glossary ambiguity. Grouped by field, ordered by frequency.

| field / glossary gap | axis | triage | cases affected | evidence (board finding) | model's unsure_about |
|---|---|---|---|---|---|
| (abstention — see per-case) | abstention | prompt_confusion | eval-5, eval-6, eval-7, eval-8, eval-9, eval-10, eval-11, eval-13, eval-14, eval-15, eval-16, eval-18, eval-20, eval-23, eval-29 |  | The vector does not establish the exact continuation length after the miss, only that both moves lose with best play and that failing to occupy c6r2 concedes the opponent's immedia… |
| opponentPunishment.parityAttribution.namedRule / opponentPunishment.line | abstention | - | eval-2 | Both null in vector (parityNamingDeferred=true, line=null), so model correctly abstained on the specific Allen rule and forced line. | The vector shows this as a parity win controlled by the group c1r4-c4r4, but it does not confirm a specific named Allen rule or give a short forced line for the opponent's win. |
| (missing) lostResource cell-status/horizon + immediate-threat headline | A3 | missing_info | eval-3 | after-best board '4222425320' has an immediate gravity-top Gy threat at c2r1 (solver -16 across); the vector instead carried only the deep diagonal window c4r3-c5r4-c6r5-c7r6 (~22-… |  |
| lostResource (no_occupation denial witness) | abstention | - | eval-19 | Abstention is honest; the played-move mechanism (immediate diagonal at c5r4) is fully grounded and does not depend on naming the best move's preserved resource. | The vector does not establish the exact defensive resource preserved by the best move beyond that it kept a swindle/practical chance; lostResource is only a no_occupation denial wi… |
| opponentPunishment (realized_pattern figure_7) | A3 | prompt_confusion | eval-23 | col4r3 [Gn] major-threat diagonal present on after-best AND after-played boards; solver +11 col4 in both, so the figure-7 is not the decisive differentiator (best -10 vs played -11… |  |
| lostResource.kind='denial' + opponentPunishment.completingCell c4r3 | A4 | prompt_confusion | eval-23 | visualize_board of 325564424544512122 (after col2) still lists 'Major threats: col4 row3 (Gn)', so col2 does not deny the resource and col6 did not enable it; pre-move board alread… |  |

**Dominant abstention theme:** the recurring non-empty `unsure_about` is the model honestly declining to name a specific **Allen parity rule** or spell out a forced parity line when `parityAttribution.parityNamingDeferred=true` / `line=null`. This is a *correct* reading of the absence-contract (an honest field-gap signal), not a fabrication — it recurs in eval-6/8/9/10/11/13/14/15 and is the biggest single candidate for a future `namedRule` enrichment (known gap: allen-v4 never confirms).

## fields_relied_on distribution
Aggregate of `fields_relied_on` across all 29 answers (count · field). Fields cited in passing cases are load-bearing; a field no answer cites is a removal/glossary-surfacing candidate.

| field | times cited | of which in passing cases |
|---|---|---|
| bestCol | 29 | 27 |
| case | 29 | 27 |
| opponentPunishment.kind | 29 | 27 |
| opponentPunishment.tie.kind | 29 | 27 |
| lostResource.kind | 27 | 25 |
| opponentPunishment.window | 27 | 25 |
| replyHistogram.afterBest | 21 | 19 |
| replyHistogram.afterPlayed | 21 | 19 |
| opponentPunishment.tie.sharedCells | 20 | 19 |
| lostResource.register | 19 | 17 |
| lostResource.window | 19 | 18 |
| opponentPunishment.completingCell | 18 | 17 |
| route | 16 | 15 |
| tag | 16 | 15 |
| direction | 16 | 15 |
| lostResource.completingCell | 13 | 13 |
| lostResource.anchorCells | 13 | 12 |
| opponentPunishment.verdict | 10 | 9 |
| opponentPunishment.cell | 10 | 9 |
| opponentPunishment.register | 10 | 10 |
| opponentPunishment.owner | 10 | 9 |
| lostResource.verdict | 9 | 8 |
| gate.verdict | 8 | 7 |
| gate.witness.devCols | 8 | 7 |
| lostResource.cell | 7 | 7 |
| opponentPunishment.tag | 7 | 6 |
| gate.witness.oppPlies | 7 | 6 |
| opponentPunishment.line | 7 | 7 |
| lostResource.parityAttribution.controllingGroup | 6 | 6 |
| opponentPunishment.parityAttribution.controllingGroup | 6 | 6 |
| lostResource.terminal | 6 | 5 |
| lostResource.tag | 6 | 6 |
| lostResource.forkCase | 5 | 4 |
| lostResource.forkCells | 5 | 4 |
| lostResource.forkWindows | 5 | 4 |
| lostResource.tacticTag | 5 | 4 |
| lostResource.witness.devCols | 4 | 4 |
| lostResource.witness.oppPlies | 4 | 4 |
| opponentPunishment.cells | 4 | 3 |
| opponentPunishment.tie.playedPlies | 3 | 3 |
| opponentPunishment.tie.swindlePlies | 3 | 3 |
| opponentPunishment.terminal | 3 | 3 |
| opponentPunishment.forkCase | 3 | 3 |
| opponentPunishment.tacticTag | 3 | 3 |
| opponentPunishment.windows | 3 | 3 |
| opponentPunishment.anchorCells | 3 | 2 |
| lostResource.cells | 3 | 3 |
| lostResource.owner | 3 | 3 |
| lostResource.parityAttribution.namedRule.rule | 2 | 2 |
| lostResource.parityAttribution.namedRule.completingCell | 2 | 2 |
| opponentPunishment.tie.tied | 2 | 2 |
| opponentPunishment.forkWindows | 2 | 2 |
| opponentPunishment.forkCells | 2 | 2 |
| lostResource.windows | 2 | 2 |
| opponentPunishment.parityAttribution.empties | 1 | 1 |
| lostResource.entryCell | 1 | 1 |
| opponentPunishment.entryCell | 1 | 1 |
| opponentPunishment.parityAttribution.completingCell | 1 | 1 |
| lostResource.parityAttribution.parityNamingDeferred | 1 | 1 |
| opponentPunishment.tacticCells | 1 | 1 |
| lostResource.parityAttribution.completingCell | 1 | 1 |
| lostResource.exhaustive | 1 | 0 |

*Every field the answerer cited appears above; `bestCol`/`case`/`opponentPunishment.kind`/`opponentPunishment.tie.kind` are cited in all 29 (the universal spine). The parity-naming fields (`parityAttribution.namedRule.*`) are cited only twice — consistent with them rarely confirming.*

## Raw answers (per case)
### eval-1 — win_to_draw (case win_to_draw)
- movestring: ``  playedCol(0-idx)=4  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 4 would have preserved a long parity win: the controlling group is c2r5-c5r5, and under the named Allen-v3 resource the eventual winning threat completes at c5r5. By playing column 5 instead, you let the opponent eventually occupy c2r5, a square in that same winning window, so that local occupation kills the window while the overall result falls to a draw rather than a forced win.",
  "key_cells": [
    "c2r5",
    "c3r5",
    "c4r5",
    "c5r5",
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
    "lostResource.parityAttribution.namedRule.rule",
    "lostResource.parityAttribution.namedRule.completingCell",
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

### eval-2 — draw_to_lose (case draw_to_lose)
- movestring: `422242`  playedCol(0-idx)=5  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "Playing column 4 was better because it preserved a draw by eventually occupying c4r4, a square inside the opponent's winning window c1r4-c4r4. After the played move in column 6, the opponent has a parity-based win on that same window and eventually completes it at c4r4, so the draw-holding denial is lost and the position becomes a loss.",
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
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "The vector shows this as a parity win controlled by the group c1r4-c4r4, but it does not confirm a specific named Allen rule or give a short forced line for the opponent's win.",
  "confidence": "high"
}
```

### eval-3 — win_to_draw (case win_to_draw)
- movestring: `422242532`  playedCol(0-idx)=6  bestCol(0-idx)=0
- verdict: **FAIL missing_info**
```json
{
  "better_move": 1,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Column 1 was winning for you: it preserved a forced double-threat on the diagonal window c4r3-c5r4-c6r5-c7r6, with the winning resource anchored on those cells and culminating in the fork at c4r3. By playing column 7 instead, you let the opponent occupy c6r5, which kills that same winning window; that local occupation is the concrete denial, and under best play your win disappears into a draw.",
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
    "lostResource.forkCells",
    "lostResource.forkWindows",
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

### eval-4 — draw_to_lose (case draw_to_lose)
- movestring: `42224253264`  playedCol(0-idx)=3  bestCol(0-idx)=4
- verdict: **PASS**
```json
{
  "better_move": 5,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "This was a defensive miss: the opponent already had an immediate vertical threat in column 5 on the window c5r1-c5r4, with c5r4 as the winning square. The better move was to play column 5 and occupy c5r4 to hold the draw; by playing column 4 instead, you failed to block that exact square and let the opponent win there.",
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
    "lostResource.cell",
    "lostResource.window",
    "opponentPunishment.kind",
    "opponentPunishment.owner",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-5 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `422242532643343`  playedCol(0-idx)=0  bestCol(0-idx)=5
- verdict: **PASS**
```json
{
  "better_move": 6,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "This was a defensive miss: the opponent already had an immediate threat on the diagonal window c6r2-c5r3-c4r4-c3r5, with c6r2 as the completing square. The better move was to play column 6 and occupy c6r2 to block that threat; by playing column 1 instead, you left c6r2 open and the opponent can complete that same four there.",
  "key_cells": [
    "c6r2",
    "c5r3",
    "c4r4",
    "c3r5"
  ],
  "fields_relied_on": [
    "route",
    "tag",
    "direction",
    "case",
    "bestCol",
    "lostResource.kind",
    "lostResource.verdict",
    "lostResource.cell",
    "lostResource.window",
    "opponentPunishment.kind",
    "opponentPunishment.owner",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "The vector does not establish the exact continuation length after the miss, only that both moves lose with best play and that failing to occupy c6r2 concedes the opponent's immediate threat there.",
  "confidence": "high"
}
```

### eval-6 — win_to_lose (case win_to_lose)
- movestring: `422242532643343015330451665102`  playedCol(0-idx)=0  bestCol(0-idx)=1
- verdict: **PASS**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 2 was winning: it preserved a forced double-threat on the fifth row, with the key fork at c2r5 in the window c1r5-c4r5, and after that line the opponent had no non-losing reply. By playing column 1 instead, you gave up that resource and let the opponent switch to a long parity win on the top-row group c2r6-c5r6, finishing at c2r6; the tie shows this punishment is connected to the lost resource through c1r5.",
  "key_cells": [
    "c2r5",
    "c1r5",
    "c2r6",
    "c5r6"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.completingCell",
    "lostResource.window",
    "lostResource.terminal",
    "lostResource.forkCase",
    "lostResource.forkCells",
    "lostResource.forkWindows",
    "lostResource.tacticTag",
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.parityAttribution.empties",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector establishes the winning fifth-row fork and the opponent's parity win, but it does not spell out the full parity move sequence for the punishment because the line is suppressed at parity register.",
  "confidence": "high"
}
```

### eval-7 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `42224253264334301533045166510200`  playedCol(0-idx)=6  bestCol(0-idx)=1
- verdict: **PASS**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "The blunder is a defensive miss: the opponent already had an immediate threat on the diagonal window c4r2-c3r3-c2r4-c1r5, with c2r4 as the completing square. The better move was column 2, which would occupy c2r4 and block that window; by playing column 7 instead, you left c2r4 open, so the opponent can complete that four immediately.",
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
  "unsure_about": "Because this is a realized_denied vector, the sign-taxonomy swindle machinery does not govern the explanation; although case is lose_to_faster_lose and gate says NotABlunder, the vector here only establishes the conceded immediate block at c2r4, not any broader swindle story.",
  "confidence": "high"
}
```

### eval-8 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `424424244263`  playedCol(0-idx)=5  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 4 kept a real swindle: after that move, if the opponent immediately slips in column 1, 3, or 7, you still have a forced sequence ending in a Case-B double-threat on the row-3 window c1r3-c4r3, with c2r3 as the fork cell. Playing column 6 throws away that practical chance and instead allows the opponent to keep a long parity-based win on the diagonal c1r3-c2r4-c3r5-c4r6, completing at c2r4; it also leaves them far more non-losing replies.",
  "key_cells": [
    "c2r3",
    "c1r3",
    "c3r3",
    "c4r3",
    "c2r4",
    "c3r5",
    "c4r6"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "lostResource.register",
    "lostResource.terminal",
    "lostResource.forkCase",
    "lostResource.forkCells",
    "lostResource.forkWindows",
    "lostResource.completingCell",
    "lostResource.tacticTag",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.playedPlies",
    "opponentPunishment.tie.swindlePlies",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols"
  ],
  "unsure_about": "The vector does not establish the exact full forcing line of the opponent's parity win after the played move, and parity naming was deferred, so I cannot name a specific Allen rule or a more specific tactical label for that win.",
  "confidence": "high"
}
```

### eval-9 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `3333364555535421220`  playedCol(0-idx)=1  bestCol(0-idx)=0
- verdict: **PASS**
```json
{
  "better_move": 1,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 1 kept a real swindle alive: after that move, if the opponent later slips on ply 6 by choosing column 3, 5, or 6, the position can still be saved to a draw. The move you played instead walks into the opponent's long parity win on the diagonal c4r1-c3r2-c2r3-c1r4, eventually completing at c1r4, so you give up that practical chance and lose faster in the sense captured by the swindle gate.",
  "key_cells": [
    "c3r6",
    "c4r1",
    "c3r2",
    "c2r3",
    "c1r4",
    "c7r3"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "lostResource.kind",
    "lostResource.register",
    "lostResource.terminal",
    "lostResource.anchorCells",
    "lostResource.entryCell",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.entryCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.parityAttribution.completingCell",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.playedPlies",
    "opponentPunishment.tie.swindlePlies",
    "opponentPunishment.tie.tied",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector does not name the exact continuation of the swindle or the exact move-by-move parity line, and because parityNamingDeferred is true it does not confirm a specific Allen rule name.",
  "confidence": "high"
}
```

### eval-10 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `3`  playedCol(0-idx)=2  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 4 kept a real swindle: after the best move, if the opponent slipped immediately, you could still win on the parity-controlled group c3r2-c6r2, eventually completing at c6r2. Playing column 3 throws away that practical chance and instead leaves the opponent several non-losing replies, with their own parity win running through c4r1-c5r2-c6r3-c7r4 and completing at c6r3.",
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
    "lostResource.window",
    "lostResource.completingCell",
    "lostResource.witness.devCols",
    "lostResource.witness.oppPlies",
    "lostResource.parityAttribution.controllingGroup",
    "opponentPunishment.kind",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies",
    "opponentPunishment.tie.kind"
  ],
  "unsure_about": "The vector does not establish a named Allen rule here because parityNamingDeferred is true on both halves, so I cannot name the exact parity tactic beyond the controlling groups and completing cells.",
  "confidence": "high"
}
```

### eval-11 — win_to_draw (case win_to_draw)
- movestring: `3255`  playedCol(0-idx)=2  bestCol(0-idx)=6
- verdict: **PASS**
```json
{
  "better_move": 7,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 7 would have preserved a long parity-based win on the horizontal group c2r3-c5r3, eventually completing at c4r3. By playing column 3 instead, you let the opponent's one saving reply occupy c4r3 and kill that winning window; that shared square is exactly where the lost win and the opponent's denial meet, so the position only draws.",
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
  "unsure_about": "The vector establishes a parity-controlled win on c2r3-c5r3 but does not confirm a named Allen rule, so I cannot name the exact parity rule beyond describing the controlling group and completion at c4r3.",
  "confidence": "high"
}
```

### eval-12 — win_to_lose (case win_to_lose)
- movestring: `32552653232`  playedCol(0-idx)=0  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "The blunder was a defensive miss: the opponent already had an immediate vertical threat in column 3, with c3r2-c3r4 occupied and c3r5 as the playable winning square. Best play was to block that square by playing column 3; instead you played column 1 and left c3r5 open, so the opponent can complete that four immediately.",
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
    "lostResource.register",
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

### eval-13 — win_to_lose (case win_to_lose)
- movestring: `33`  playedCol(0-idx)=2  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 was winning, but the move you played in column 3 throws that away and lets the opponent force a different parity win. Your preserved resource after the best move was an Allen-v3 zugzwang win on the group c2r5-c5r5, eventually completing at c5r5; after the played move, the opponent instead gets a separate parity-controlled win on c2r1-c3r2-c4r3-c5r4, completing at c5r4. These two lines are marked independent, so the blunder is not that you gave up one shared square, but that you abandoned your own winning parity structure and allowed the opponent's unrelated one.",
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
    "lostResource.parityAttribution.namedRule.rule",
    "lostResource.parityAttribution.namedRule.completingCell",
    "opponentPunishment.kind",
    "opponentPunishment.register",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.parityAttribution.controllingGroup",
    "opponentPunishment.tie.kind",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector does not provide a short forced line for either side because both wins are parity-register lines, so I cannot honestly specify the exact move-by-move sequence or a more local tactical trigger beyond the named controlling groups and completing cells.",
  "confidence": "high"
}
```

### eval-14 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `3`  playedCol(0-idx)=4  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 4 was better because it kept a live swindle: after the best move, if the opponent's very next reply is any of columns 1, 2, 3, 5, 6, or 7, you still have a parity-based winning resource on the group c3r2-c6r2 that completes at c6r2. Playing column 5 throws that practical chance away and instead walks into the opponent's forced figure-7 fork ending on c7r4 along the row-4 window c4r4-c7r4; it also leaves the opponent more non-losing replies.",
  "key_cells": [
    "c3r2",
    "c4r2",
    "c5r2",
    "c6r2",
    "c4r4",
    "c5r4",
    "c6r4",
    "c7r4",
    "c1r1"
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
    "lostResource.anchorCells",
    "opponentPunishment.kind",
    "opponentPunishment.terminal",
    "opponentPunishment.forkCase",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.forkWindows",
    "opponentPunishment.tacticTag",
    "opponentPunishment.tacticCells",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.playedPlies",
    "opponentPunishment.tie.swindlePlies",
    "opponentPunishment.tie.tied",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector shows the swindle is parity-based and names its controlling group, but it does not confirm a named Allen rule or give a short forcing line for that resource, so I cannot say more specifically how the win would be realized beyond completing at c6r2 after an opponent slip.",
  "confidence": "high"
}
```

### eval-15 — win_to_lose (case win_to_lose)
- movestring: `341330`  playedCol(0-idx)=6  bestCol(0-idx)=1
- verdict: **PASS**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 2 was winning for you, but not by an immediate tactic: it preserved a long parity win on the row-5 group c1r5-c4r5, eventually completing at c1r5. By playing column 7 instead, you gave the opponent a forced sequence to an unstoppable double-threat fork with threats at c6r5 and c7r5; the punishment is tied to a square from the resource you gave up, c2r2. The counterplay numbers match that shift: after the best move the opponent has no non-losing reply, while after the played move they have winning play available.",
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
    "lostResource.parityAttribution.completingCell",
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
  "unsure_about": "The vector does not confirm a named Allen rule for the best move's parity win (`parityNamingDeferred: true`), so I cannot name that structural win more specifically than a long parity-controlled win on c1r5-c4r5.",
  "confidence": "high"
}
```

### eval-16 — win_to_lose (case win_to_lose)
- movestring: `341330613`  playedCol(0-idx)=4  bestCol(0-idx)=3
- verdict: **PASS**
```json
{
  "better_move": 4,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 would have preserved a forced win: your winning line is a double-threat fork, with threats at c6r5 and c7r5 on the windows [c3r5,c4r5,c5r5,c6r5] and [c4r2,c5r3,c6r4,c7r5], leaving the opponent no non-losing reply. The move you played instead lets the opponent force their own double-threat win ending on the c3r3-c6r3 row, and the punishment is tied to c4r5, a square from the winning resource you gave up.",
  "key_cells": [
    "c4r5",
    "c6r5",
    "c7r5",
    "c3r3",
    "c4r3",
    "c5r3",
    "c6r3"
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
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.terminal",
    "opponentPunishment.forkCase",
    "opponentPunishment.forkCells",
    "opponentPunishment.tacticTag",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector shows both sides' forced sequences and the shared square c4r5, but it does not establish a shorter human-summary tactic beyond those recorded fork structures, so I cannot say more specifically how c4r5 shifts control without inventing details.",
  "confidence": "high"
}
```

### eval-17 — draw_to_lose (case draw_to_lose)
- movestring: `44443`  playedCol(0-idx)=3  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "draw",
  "mechanism": "Playing column 4 was a blunder because you were holding a draw by occupying c3r1 with the better move in column 3, which plugs the bottom-row window c2r1-c5r1. Instead, your move enabled the opponent to realize an immediate double threat on the bottom row at c2r1 and c6r1 across the windows c2r1-c5r1 and c3r1-c6r1; the tie shows this punishment depends on the very square c3r1 that the better move would have occupied.",
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
    "opponentPunishment.cells",
    "opponentPunishment.windows",
    "opponentPunishment.completingCell",
    "opponentPunishment.window",
    "opponentPunishment.tie.kind",
    "opponentPunishment.tie.sharedCells"
  ],
  "unsure_about": "",
  "confidence": "high"
}
```

### eval-18 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `3152332536215522346266536`  playedCol(0-idx)=4  bestCol(0-idx)=0
- verdict: **PASS**
```json
{
  "better_move": 1,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You were losing either way, but column 1 was better because it at least preserved some swindle chances; the move you played instead immediately handed the opponent a realized figure-7 pattern. After your move, player 1 gets the diagonal window c7r2-c6r3-c5r4-c4r5 with c5r4 as the completing cell, so your move loses faster rather than keeping the more resistant losing line.",
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
    "opponentPunishment.window",
    "opponentPunishment.windows",
    "opponentPunishment.completingCell",
    "opponentPunishment.cells",
    "opponentPunishment.tie.kind",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies",
    "lostResource.kind",
    "lostResource.verdict"
  ],
  "unsure_about": "The vector does not spell out the exact defensive resource preserved by the best move beyond saying a swindle existed, and lostResource has no occupation cell or named tactic here; it also does not provide the full practical line from the best move, only the gate witness that some opponent deviations in columns 5 or 7 would let you back in 6 opponent plies later.",
  "confidence": "high"
}
```

### eval-19 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `315233253621552234626653641`  playedCol(0-idx)=4  bestCol(0-idx)=1
- verdict: **PASS**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Playing column 5 handed the opponent an immediate threat: after your move, player 1 has a live diagonal win-in-one on the window c7r2-c6r3-c5r4-c4r5, with c5r4 as the completing cell. The better move was column 2; you were still losing either way, but that move kept more practical resistance, while column 5 walks into this immediate threat and loses faster.",
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
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.anchorCells",
    "opponentPunishment.tie.kind",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed"
  ],
  "unsure_about": "The vector does not establish the exact defensive resource preserved by the best move beyond that it kept a swindle/practical chance; lostResource is only a no_occupation denial witness here, so I cannot name a specific saved square or line for that move.",
  "confidence": "high"
}
```

### eval-20 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `334531345414414102133022210000`  playedCol(0-idx)=5  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Playing column 6 handed the opponent an immediate threat: after your move, they have a win-in-one on the diagonal window c3r1-c4r2-c5r3-c6r4, completed at c6r4. You were losing anyway, but the better move in column 3 kept a practical swindle alive, while the played move walks straight into this immediate opponent threat.",
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
  "unsure_about": "The vector does not specify the exact defensive resource preserved by the better move, only that a reachable swindle existed if the opponent later deviated in column 7.",
  "confidence": "high"
}
```

### eval-21 — win_to_lose (case win_to_lose)
- movestring: `334`  playedCol(0-idx)=3  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 4 handed the opponent an immediate double threat on the bottom row: the two winning windows c2r1-c5r1 and c3r1-c6r1, with threat cells at c2r1 and c6r1. The better move was column 3, which immediately occupied c3r1 inside that structure; by leaving c3r1 available, your played move enabled the opponent's fork and turned a winning position into a loss.",
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
    "opponentPunishment.cells",
    "opponentPunishment.windows",
    "opponentPunishment.completingCell",
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

### eval-22 — win_to_lose (case win_to_lose)
- movestring: `3343`  playedCol(0-idx)=3  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "The better move was column 3, which would have created your immediate double threat: two bottom-row winning threats at c2r1 and c6r1 across the windows c2r1-c5r1 and c3r1-c6r1. By playing column 4 instead, you missed that fork and let the opponent occupy c3r1 at once, killing one of those windows on the very shared square, so instead of preserving a forced win you lose.",
  "key_cells": [
    "c2r1",
    "c3r1",
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
    "lostResource.cells",
    "lostResource.windows",
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

### eval-23 — lose_to_faster_lose (case lose_to_faster_lose)
- movestring: `32556442454451212`  playedCol(0-idx)=5  bestCol(0-idx)=1
- verdict: **FAIL prompt_confusion**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "Column 2 was better because, although you were losing either way, it at least avoided handing the opponent an immediate figure-7 pattern. Your played move in column 6 enabled player 1 to form that one-move tactic on the diagonal window c6r1-c5r2-c4r3-c3r4, with c4r3 as the key completing cell; after the better move the vector finds no occupation witness on that resource and the swindle gate says practical chances still remained, while the played move loses faster and gives the opponent many more non-losing replies.",
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
    "opponentPunishment.owner",
    "opponentPunishment.cells",
    "opponentPunishment.window",
    "opponentPunishment.completingCell",
    "opponentPunishment.anchorCells",
    "opponentPunishment.tie.kind",
    "lostResource.kind",
    "lostResource.verdict",
    "lostResource.register",
    "lostResource.exhaustive",
    "replyHistogram.afterBest",
    "replyHistogram.afterPlayed",
    "gate.verdict",
    "gate.witness.devCols",
    "gate.witness.oppPlies"
  ],
  "unsure_about": "The vector does not show the exact defensive geometry preserved by column 2, only that it did not concede the immediate figure-7 and that a swindle remained; it also does not give the exact faster winning line after the played move.",
  "confidence": "high"
}
```

### eval-24 — win_to_draw (case win_to_draw)
- movestring: `33333555511111`  playedCol(0-idx)=1  bestCol(0-idx)=5
- verdict: **PASS**
```json
{
  "better_move": 6,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 6 would have preserved a forced win: your winning resource is a double-threat fork, with threats at c5r5 and c7r6 supported by the windows [c3r5,c4r5,c5r5,c6r5] and [c4r3,c5r4,c6r5,c7r6]. By playing column 2 instead, you let the opponent immediately occupy c6r5, which locally kills the c3r5-c6r5 window; that shared square is part of the fork resource you gave up, and after that the position only draws.",
  "key_cells": [
    "c5r5",
    "c7r6",
    "c6r5",
    "c3r5",
    "c4r5",
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

### eval-25 — win_to_draw (case win_to_draw)
- movestring: `3402440500455533023013413`  playedCol(0-idx)=5  bestCol(0-idx)=2
- verdict: **PASS**
```json
{
  "better_move": 3,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Playing column 3 was better because it would have created an immediate double threat for player 2: threats centered on c2r3 and c3r4, with winning windows c2r3-c5r3 and c3r1-c3r4. By playing column 6 instead, you missed that pattern, and the opponent could immediately occupy c2r3 to kill the horizontal window; the vector says that after the best move there were no non-losing replies, but after the played move the opponent had saving replies, so your win dropped to a draw.",
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
    "lostResource.cells",
    "lostResource.windows",
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

### eval-26 — win_to_lose (case win_to_lose)
- movestring: `332123542241313`  playedCol(0-idx)=5  bestCol(0-idx)=1
- verdict: **PASS**
```json
{
  "better_move": 2,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 2 was winning because you already had an immediate vertical threat in column 2: the window c2r1-c2r4 would complete at c2r4. By playing column 6 instead, you missed that win and gave the opponent time to occupy c2r4 themselves, so the very square that would have won for you becomes the square that denies your threat.",
  "key_cells": [
    "c2r4",
    "c2r1",
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
    "lostResource.completingCell",
    "lostResource.window",
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

### eval-27 — win_to_lose (case win_to_lose)
- movestring: `353312566345`  playedCol(0-idx)=5  bestCol(0-idx)=4
- verdict: **PASS**
```json
{
  "better_move": 5,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Column 5 was winning because it created your immediate threat on c5r2 in the row-2 window c4r2-c7r2. By playing column 6 instead, you missed that threat and allowed the opponent's one saving reply: they occupy c5r2 themselves, which kills that same window and turns your missed win into a loss.",
  "key_cells": [
    "c5r2",
    "c4r2",
    "c6r2",
    "c7r2"
  ],
  "fields_relied_on": [
    "bestCol",
    "case",
    "route",
    "tag",
    "direction",
    "lostResource.kind",
    "lostResource.tag",
    "lostResource.cells",
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

### eval-28 — win_to_lose (case win_to_lose)
- movestring: `33333042224644253065`  playedCol(0-idx)=4  bestCol(0-idx)=5
- verdict: **PASS**
```json
{
  "better_move": 6,
  "played_outcome": "loss",
  "best_outcome": "win",
  "mechanism": "Playing column 6 would have created your immediate figure-7 threat on c7r3 in the row-3 window c4r3-c7r3, and with best play that position is winning for you. By playing column 5 instead, you missed that resource; the opponent can then follow the forced sequence shown and eventually occupy c7r3 themselves, which kills that same window and turns your winning position into a loss. The key point is that the punishment lands on the very square of the missed pattern.",
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

### eval-29 — win_to_draw (case win_to_draw)
- movestring: `351433344402416516321`  playedCol(0-idx)=4  bestCol(0-idx)=5
- verdict: **PASS**
```json
{
  "better_move": 6,
  "played_outcome": "draw",
  "best_outcome": "win",
  "mechanism": "Column 6 was winning because it immediately formed your figure_7 pattern on the vertical window c6r1-c6r4, with c6r4 as the completing cell. By playing column 5 instead, you missed that resource and the opponent can force a draw by occupying c6r3 in that same window, so the win never materializes.",
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
    "lostResource.completingCell",
    "lostResource.window",
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
  "unsure_about": "The vector shows the opponent's occupation of c6r3 as the denial, but it does not establish any additional tactic beyond the named figure_7 or why the exact reply order beyond the shown line is unique.",
  "confidence": "high"
}
```
