# Feature-Vector Sufficiency Report — fv_suff_answers_all.jsonl

Grader: `grade-fv-sufficiency` (A1–A4 against solver + `visualize_board.sh`, per-id sub-agents).
Model under floor test: `gpt-5.4` (full). Frozen vectors: `eval_set_fv_suff_frozen_vectors.jsonl` (18 cases).

## Summary
- **Answer rows:** 162   **parse/call failures:** 0
- **Cases (id × condition):** 54   **passed (A1–A4 on all 3 runs):** 15   **failed:** 39
- **Per-axis pass rate (over all 162 gradeable runs):** A1 **162/162** · A2 **125/162** · A3 **66/162** · A4 **104/162**
- **Headline (Condition A — production-faithful):** **8/18 cases pass.** The strong model cannot make a board-grounded case crystal-clear from the vector on more than half the set → these are **context blindspots**, not capability gaps.

## Pass/fail by condition (A vs B vs C ablation — §6)

| condition | cases | passed | A3 pass-rate | A4 pass-rate |
|---|---|---|---|---|
| **A** — full (glossary + full vector) | 18 | **8** | 30/54 | 29/54 |
| **B** — board-only (movestring, engineered fields stripped) | 18 | **0** | 6/54 | 48/54 |
| **C** — features-without-movestring | 18 | **7** | 30/54 | 27/54 |

**Reading the ablation:**
- **C ≈ A** (7 vs 8 passes; identical A3 30/54). The distilled engineered fields carry essentially the *same* reasoning as the full vector — the `movestring` adds almost nothing for this model on this task, because the model is not re-deriving the board; it is **trusting the engineered threat/lookahead fields** (and inheriting their errors). This is the desirable direction for transfer to the weak model: the fields, not raw board re-derivation, are load-bearing.
- **B ≪ A** (0 passes). Stripping the engineered fields collapses the result. Two distinct failure modes appear: **A2 craters** (B A2 = lowest — with `lookahead.*Outcome` gone the model *guesses* the win/draw/loss labels and is wrong ~half the time) and **A3 craters** (6/54 — with `tag`/`patternsOpponent`/`threatStats` gone the model can name no decisive mechanism and honestly abstains). Note B's A4 is **highest** (48/54): with nothing to assert, the model fabricates less. B confirms the engineered fields are necessary — the board alone does not transfer.

**The core asymmetry:** the engineered fields are simultaneously **necessary** (B proves it) and **the source of most A/C fabrications** (A4 fails cluster on specific fields, below). The fix is not "add the board back" but "correct/disambiguate the fields that are being misread."

## Per-case verdict

A1–A4 columns: `pass` = all 3 runs pass; `fail` = all 3 fail; `k/3` = mixed (intermittent).

| id | category | cond | A1 | A2 | A3 | A4 | case | intermittent |
|---|---|---|---|---|---|---|---|---|
| eval-0 | drawing_move | A | pass | pass | fail | fail | fail | |
| eval-0 | drawing_move | B | pass | fail | pass | pass | fail | |
| eval-0 | drawing_move | C | pass | pass | fail | fail | fail | |
| eval-2 | drawing_move | A | pass | pass | pass | 1/3 | fail | yes |
| eval-2 | drawing_move | B | pass | fail | fail | 2/3 | fail | |
| eval-2 | drawing_move | C | pass | pass | pass | fail | fail | |
| eval-8 | suboptimal_move | A | pass | pass | fail | fail | fail | |
| eval-8 | suboptimal_move | B | pass | 1/3 | pass | pass | fail | yes |
| eval-8 | suboptimal_move | C | pass | pass | fail | fail | fail | |
| eval-1 | suboptimal_move | A | pass | pass | pass | pass | **PASS** | |
| eval-1 | suboptimal_move | B | pass | fail | fail | pass | fail | |
| eval-1 | suboptimal_move | C | pass | pass | pass | pass | **PASS** | |
| eval-6 | undercut | A | pass | pass | fail | fail | fail | |
| eval-6 | undercut | B | pass | fail | fail | pass | fail | |
| eval-6 | undercut | C | pass | pass | fail | fail | fail | |
| eval-7 | forced_block | A | pass | pass | pass | pass | **PASS** | |
| eval-7 | forced_block | B | pass | 2/3 | fail | pass | fail | yes |
| eval-7 | forced_block | C | pass | pass | pass | pass | **PASS** | |
| eval-10 | j_shape | A | pass | pass | fail | fail | fail | |
| eval-10 | j_shape | B | pass | 2/3 | fail | pass | fail | yes |
| eval-10 | j_shape | C | pass | pass | fail | fail | fail | |
| eval-11 | immediate_threat | A | pass | pass | pass | 1/3 | fail | yes |
| eval-11 | immediate_threat | B | pass | pass | fail | 2/3 | fail | |
| eval-11 | immediate_threat | C | pass | pass | pass | 1/3 | fail | yes |
| eval-12 | immediate_threat | A | pass | pass | pass | pass | **PASS** | |
| eval-12 | immediate_threat | B | pass | 2/3 | fail | 1/3 | fail | |
| eval-12 | immediate_threat | C | pass | pass | pass | pass | **PASS** | |
| eval-15 | double_threat | A | pass | pass | pass | pass | **PASS** | |
| eval-15 | double_threat | B | pass | fail | fail | 2/3 | fail | yes |
| eval-15 | double_threat | C | pass | pass | pass | pass | **PASS** | |
| eval-29 | double_threat | A | pass | pass | fail | fail | fail | |
| eval-29 | double_threat | B | pass | fail | fail | pass | fail | |
| eval-29 | double_threat | C | pass | pass | fail | fail | fail | |
| eval-38 | overcut | A | pass | pass | pass | pass | **PASS** | |
| eval-38 | overcut | B | pass | 2/3 | fail | 2/3 | fail | yes |
| eval-38 | overcut | C | pass | pass | pass | pass | **PASS** | |
| eval-42 | forced_win | A | pass | pass | pass | pass | **PASS** | |
| eval-42 | forced_win | B | pass | 2/3 | fail | pass | fail | |
| eval-42 | forced_win | C | pass | pass | pass | 2/3 | fail | yes |
| eval-43 | forced_win | A | pass | pass | pass | pass | **PASS** | |
| eval-43 | forced_win | B | pass | fail | fail | pass | fail | |
| eval-43 | forced_win | C | pass | pass | pass | pass | **PASS** | |
| eval-49 | z_threat | A | pass | pass | pass | pass | **PASS** | |
| eval-49 | z_threat | B | pass | fail | fail | pass | fail | |
| eval-49 | z_threat | C | pass | pass | pass | pass | **PASS** | |
| eval-51 | figure_7 | A | pass | pass | fail | fail | fail | |
| eval-51 | figure_7 | B | pass | fail | fail | pass | fail | |
| eval-51 | figure_7 | C | pass | pass | fail | fail | fail | |
| eval-56 | odd_even_threat | A | pass | pass | fail | pass | fail | |
| eval-56 | odd_even_threat | B | pass | pass | fail | pass | fail | |
| eval-56 | odd_even_threat | C | pass | pass | fail | pass | fail | |
| eval-59 | claimeven | A | pass | pass | fail | fail | fail | |
| eval-59 | claimeven | B | pass | fail | fail | pass | fail | |
| eval-59 | claimeven | C | pass | pass | fail | fail | fail | |

### Condition-A failing/intermittent cases — notes

> **eval-0 (drawing_move, empty board):** A3/A4 fail all runs. After-best board is a single disc at c4r1, "Major threats: none", yet the mechanism asserts concrete "parity-aligned major threats c5r5/c6r5", a "j-shape at c1–c2", and undercuts. The decisive reason is solved opening center dominance; the named tactics do not exist on the board. Source: `lookahead.categoryExamples`/`perCategory` cells read as present-board threats.

> **eval-2 (drawing_move):** A3 ok, A4 **intermittent** (run0 pass, run1/run2 fail). After-best (4443) shows "Major threats: none"; c7r4 is a (gy) **minor** threat. Runs 1/2 upgrade it (and empty col3) to "parity major threats at c7r4/c3r4". Run0 makes only the true minor-threat claim and passes — latent ambiguity in the same context.

> **eval-8 (suboptimal_move, sparse):** A3/A4 fail. After-played (35) is 2 discs, zero threats; claimed parity major c5r5, undercut, j-shape are fabricated. True reason is central control (col3 −1 vs col5 −2). Source: `lookahead.oppCategoryExamples`/`perCategory`.

> **eval-6 (undercut):** A3/A4 fail. Mechanism's decisive claim "opponent has immediate winning move at c3r2" is **false** — c3r2 is only a minor (gy) threat; solver gives Gray col3 = draw, and Gray's real wins are col6/col7. The vector framing (`patternsOpponent.immediate_threat.cells`) misled the mechanism away from the true parity/zugzwang reason.

> **eval-10 (j_shape):** A3/A4 fail. "Opponent immediate threat at c3r4" is false (minor only); the sole major on the after-played board is Green's own col3-row3. The claimed opponent j-shape folds in c3r3, which is the mover's own gravity-top threat square — `patternsOpponent.j_shape.cells` does not encode disc ownership.

> **eval-11 (immediate_threat):** A3 ok, A4 **intermittent** (run0 pass; run1/run2 fail). The single decisive enabled win is c1r3 (gravity-top); runs 1/2 also assert an immediate threat at c5r1, which is minor only. `lookahead.oppCategoryExamples` carries no major/minor flag.

> **eval-29 (double_threat):** A3/A4 fail. After-played (3322) "Major threats: none"; c1r1/c5r1 are minor, not the asserted immediate **double-threat fork** ("one move cannot cover both"). Source: `patternsOpponent.double_threat.cells`/`immediate_threat.cells` listing minor cells.

> **eval-51 (figure_7):** A3/A4 fail. Runs assert opponent "immediate threat at c5r5" on the after-played board, which shows "Major threats: none" — c5r5 is minor and col5 (height 3) is not even playable at row 5. c5r5 becomes a major **only after Gray plays col5**, which creates the real double-threat fork (c5r5 + c3r2). Classic **`patternsOpponent` snapshot ambiguity** (computed on a different ply than "after-played, opponent to move").

> **eval-56 (odd_even_threat):** A3 fail, A4 pass. The named j_shape exists **pre-move** and identically in both after-best and after-played boards, so it is not the decisive differentiator. The genuine differentiator (col7 removes one Gray minor at c7r5, score −3 vs −4) is mentioned only as secondary. `lookahead` outcomes are null on `losing_either_way` and there is **no pre-move `patternsOpponent` snapshot** to distinguish "enabled" from "pre-existing".

> **eval-59 (claimeven):** A3/A4 fail. Claims player "minor threats on c7r5 and c7r6", but the after-best board shows c7r5 = Green **major** gravity-top and c7r6 = **opponent** (Gray) major — `threatStats.best.playerMinor.cells` mislabels major and opponent cells as player-minor. Both moves win, so the named tactic is not decisive either.

### The 8 clean Condition-A passes
eval-1 (suboptimal_move), eval-7 (forced_block), eval-12 (immediate_threat), eval-15 (double_threat), eval-38 (overcut), eval-42 (forced_win), eval-43 (forced_win), eval-49 (z_threat).
These share a trait: the decisive tactic is a **real major threat / gravity-top win / parity zugzwang that is actually on the after-best (or after-played) board** and is surfaced by a *correctly-scoped* field (`patternsBest.*`, `threatStats.*MajorParityAligned`, real `immediate_threat`). When the engineered field points at a true on-board major, the model nails it.

## Counterexample list (THE DELIVERABLE)

Grouped by the missing/ambiguous field, ordered by frequency/severity.

| field / glossary gap | axis | cases affected | evidence (board finding) | model's `unsure_about` |
|---|---|---|---|---|
| **`lookahead.categoryExamples` / `perCategory` / `oppCategoryExamples`** — deep-search example cells are presented with no flag that they are **hypothetical far-future-line artifacts**, not current-board threats; the model relays them as present major threats | A4, A3 | eval-0, eval-2, eval-8, eval-11 (A & C) | After-best boards for eval-0 (single disc), eval-8 (2 discs), eval-2 (4443) show "Major threats: none" at the cited cells; the named parity/j-shape/undercut structures do not exist | "vector does not specify the exact forcing continuation… only that it creates stronger future structure" |
| **`patternsOpponent.immediate_threat.cells` — minor vs major (gravity-top) conflation + snapshot ply ambiguity** | A4, A3 | eval-6, eval-10, eval-51 (A & C), eval-11 | Cited cells are annotated minor `(gy)` on the relevant board, or are not yet playable (eval-51: col5 height 3); solver gives the "immediate win" move only a draw (eval-6 c3r2) | "does not specify the exact four-in-a-row window… cannot name the full line" |
| **`patternsOpponent.double_threat.cells` / `immediate_threat.cells` labeled as wins when cells are minor** | A4, A3 | eval-29 (A & C) | After-played 3322 "Major threats: none"; c1r1/c5r1 are minor `(gn)`, so "two immediate winning cells, one move cannot cover both" is false | "does not spell out the exact move order of the winning continuation" |
| **Null `lookahead.bestOutcome`/`postBlunderOutcome` on `losing_either_way` + no forced-sequence / ply-ordering field** | abstention, A3 | eval-7, eval-12, eval-38, eval-42, eval-51, eval-56 (all A) | Threats that are minor on move *n* become majors on move *n+1* (eval-42 c5r5; eval-51 c5r5); model cannot place the threat in time, abstains on the line, or misattributes immediacy | "cannot tell whether c5r5 is immediate or in-continuation" / "both lose with best play but no continuation given" |
| **No pre-move `patternsOpponent` snapshot (enabled-vs-pre-existing)** | A3, abstention | eval-56 (A, B, C) | j_shape cells c5r3/c4r4/c4r5 present on the **pre-move** board and identical in both lines → not enabled by the blunder, so not decisive | "cannot tell whether the j-shape is already present before the move versus enabled after" |
| **`threatStats.best.playerMinor.cells` mislabels major / opponent cells as player-minor; no per-cell minor-vs-major flag** | A4, A3 | eval-59 (A & C) | After-best board: c7r5 = Green major gravity-top, c7r6 = Gray (opponent) major — neither is a player minor threat | "does not specify the exact winning continuation… cannot say how it converts faster" |
| **`threatStats.best.*` instance counts conflate minor threats with "immediate/double threats"** | A4 | eval-42 (C run2) | After-best board: c1r3/c2r4 = `(gn)` minor, c4r4 = `(*)`; run2 elevates them to "double threats and immediate threats" | (not hedged — hard A4 fail) |
| **`threatStats.*MajorParityAligned.cells` direction ambiguity (which line gains the cell)** | A4 | eval-59 (A run0), eval-1 (A — soft) | eval-59 run0: says best line opens c2r3, but c2r3 is immediate in the **played** line; eval-1: c2r2/c2r6 (even rows, off-parity) called "major-threat squares" though after-best shows none | "cannot specify the exact forcing continuation" |
| **Condition-B ablation removes `lookahead.*Outcome` → A2 guessing** (diagnostic, not a Condition-A gap) | A2 | eval-0,1,2,6,7,8,10,12,15,29,38,42,43,49,51,59 (B) | Solver outcomes contradict guessed labels (e.g. eval-0 best=win guessed loss/draw; eval-43 win/win guessed loss/loss) | "no outcome labels… cannot determine with-best-play outcomes" |
| **Condition-B ablation removes `tag`/`direction`/`patternsOpponent`/`threatStats` → no mechanism (A3 abstain) + occasional hallucinated landing squares** (diagnostic) | A3, A4 | all B cases (A3); eval-2/12/38 B (A4 hallucination) | eval-12 B mis-derived landing c2r4/c2r2 (actual c2r6) and invented a fork/horizontal four; eval-7 B could not name the forced block that is on the board | "omits tag, direction, lookahead… cannot identify the mechanism" |

## fields_relied_on distribution

Aggregated over all 162 answers (top fields):

| field | count | load-bearing? |
|---|---|---|
| `bestCol` | 158 | yes — drives A1 (162/162) |
| `lookahead.case` | 108 | yes — A2 + "losing_either_way" framing |
| `tag` / `direction` | 107 / 106 | yes — mechanism framing (absent in B → A3 collapse) |
| `playedCell` / `bestCell` | 102 / 98 | yes — landing squares; **absent in B → hallucinated squares** (eval-11/12 B) |
| `lookahead.bestOutcome` / `postBlunderOutcome` | 76 / 76 | yes — **the A2 axis**; absent → guessing |
| `lookahead.categoryExamples` / `perCategory` / `oppCategoryExamples` | 72 / 62 / 35 | **load-bearing but TOXIC** — cited in the majority of A4 fabrications (eval-0/2/8/11) |
| `patternsOpponent.immediate_threat.cells` | 35 | **mixed** — correct on eval-12, fabrication source on eval-6/10/51 |
| `patternsBest.immediate_threat.cells` | 23 | yes — clean (powers eval-12/49 passes) |
| `threatStats.best.playerMajorParityAligned.cells` | 20 | yes — powers eval-15/49 parity passes |
| `threatStats.best.playerMinor.cells` | 19 | **mixed** — mislabel source on eval-59 |
| `centerDominance` | 24 | weak — cited on eval-0/8 but co-occurs with fabrication |
| `patternsBest.undercut/overcut.cells` | 6 / 6 | yes — clean, powers eval-38 overcut pass |

**Never/barely cited (candidates for review):** the deep `threatStats.*.opponentMajorNonParity.*` and `pre.*` variants (1–2 cites each). `gapBucket` (8) and `isSparse` (12) are rarely load-bearing. No field is *unused*, but the `lookahead.*categoryExamples` family is the clearest case of a field that is **cited often yet drives failure** — it surfaces example cells without a "this is a deep-line artifact, not a current threat" marker.

## Top recommendations (drive the next vector/glossary iteration)

1. **Tag every threat-cell field with major/minor and current/future.** The single largest failure cluster is the model reading a **minor** threat cell, a **deep-search example** cell, or a **next-ply** cell as a *present-board major threat*. `lookahead.categoryExamples`/`perCategory`/`oppCategoryExamples`, `patternsOpponent.immediate_threat.cells`, and `threatStats.*Minor.cells` all need an explicit per-cell `{severity: major|minor, realizedOnPly: n}` so the model stops upgrading them. (Glossary §6 prune does not help here — the cells are real, just mis-typed.)
2. **Fix the `patternsOpponent` snapshot ply (eval-51, eval-56).** Either compute it on the "after-played, opponent-to-move" board and label it as such, or add a **pre-move opponent-pattern snapshot** so the model can tell *enabled* from *pre-existing*. This is the documented `project_feature_vector_content_traps.md` trap, confirmed live on two cases.
3. **Add a forced-line / principal-variation field for `losing_either_way`.** Every clean-A case that still logged an abstention did so on "the exact winning continuation". With `lookahead.*Outcome` null on `losing_either_way`, the model has outcome **and** line both missing — a short PV (or at minimum non-null per-line outcomes) would close most honest abstentions and prevent the timing misattributions in eval-42/51.
4. **Encode disc ownership in pattern cell lists (eval-10, eval-59).** `j_shape`/`playerMinor` cell lists that fold in the *other* player's squares cause ownership-flip fabrications.

These four would convert the bulk of the A3/A4 fabrications (which dominate the failed cases) without touching the model — consistent with the floor-test logic that the deficiency is in the **artifact**, not the answerer.

## Method notes
- Each id graded by one fresh `general-purpose` sub-agent with shell access, observing every board via `./visualize_board.sh` and confirming outcomes with the solver. The board is identical across conditions A/B/C for a given id, so per-id grading shares the (authoritative) board observation across the three ablation rows.
- A1 = `better_move − 1 == correct_move` (all 162 runs pass — the model always reads `bestCol`). A2 cross-checked against `lookahead.*Outcome` and the solver. `unsure_about` excluded from A4 per spec, logged as abstention.
