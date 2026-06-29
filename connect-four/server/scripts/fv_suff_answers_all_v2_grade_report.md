# Feature-Vector Sufficiency Report — fv_suff_answers_all_v2.jsonl

_Graded 2026-06-28 by `/grade-fv-sufficiency`. Oracle = solver + `visualize_board.sh` + frozen record ground truth. The answering model (`gpt-5.4`) saw only the feature vector + glossary; the grader is privileged._

## Summary

- Answer rows: 108   parse failures: 0   (18 ids × 3 conditions A/B/C × 2 runs)
- Cases (id × condition): 54   passed (A1–A4 on all runs): 19   failed: 35
- Per-axis pass rate (over all 108 gradeable runs): A1 108/108 · A2 75/108 · A3 56/108 · A4 71/108

**Headline (Condition A, production-faithful): 9/18 cases pass** — ~50%, on par with the 2026-06-26 baseline (8/18). A1 is perfect; A2 fails only when outcome fields are pruned (B). The substance failures are all **A3 (mechanism not decisive / mis-attributed)** and **A4 (fabrication)**.

## Pass/fail by condition (A vs B vs C — §6 ablation)

| condition | cases | passed | A3 pass-rate | A4 pass-rate |
|---|---|---|---|---|
| A | 18 | 9 | 26/36 | 22/36 |
| B | 18 | 0 | 2/36 | 22/36 |
| C | 18 | 10 | 28/36 | 27/36 |

**Reading the ablation:**
- **B (board-only, engineered fields stripped) collapses to 0/18.** Without `tag`/`lookahead`/`threatStats`/`patterns*` the model cannot read the outcome (A2 craters) or name a mechanism (A3 = 2/36). Intended signal: **the engineered fields, not the raw board, carry the reasoning for this model** — so they are load-bearing and should transfer to the weaker production model.
- **C (features without movestring) ≥ A on every axis** (10/18 vs 9/18; A3 28/36 vs 26/36; A4 **27/36 vs 22/36**). The distilled fields alone carry the reasoning *better* than the full vector. In A the `movestring` tempts the model to re-derive the board and **fabricate present-tense threats it cannot actually see**; C, lacking the board, stays within what the fields assert and abstains instead. **Most important finding: the movestring is a net liability for fabrication, and the fields are sufficient without it.**
- **A vs C gap is almost entirely A4** (22 vs 27): the field *semantics* are the lever; the board snapshot mostly induces hallucination.

## Per-case verdict

| id | category | cond | A1 | A2 | A3 | A4 | pass | intermittent |
|---|---|---|---|---|---|---|---|---|
| eval-0 | drawing_move | A | pass | pass | pass | pass | **PASS** |  |
| eval-0 | drawing_move | B | pass | fail | pass | pass | fail |  |
| eval-0 | drawing_move | C | pass | pass | pass | pass | **PASS** |  |
| eval-1 | suboptimal_move | A | pass | pass | pass | pass | **PASS** |  |
| eval-1 | suboptimal_move | B | pass | fail | fail | pass | fail |  |
| eval-1 | suboptimal_move | C | pass | pass | pass | pass | **PASS** |  |
| eval-2 | drawing_move | A | pass | pass | pass | pass | **PASS** |  |
| eval-2 | drawing_move | B | pass | fail | fail | fail | fail |  |
| eval-2 | drawing_move | C | pass | pass | pass | pass | **PASS** |  |
| eval-6 | undercut | A | pass | pass | fail | fail | fail |  |
| eval-6 | undercut | B | pass | fail | fail | pass | fail |  |
| eval-6 | undercut | C | pass | pass | fail | fail | fail |  |
| eval-7 | forced_block | A | pass | pass | pass | pass | **PASS** |  |
| eval-7 | forced_block | B | pass | fail | fail | 1/2 | fail | yes |
| eval-7 | forced_block | C | pass | pass | pass | pass | **PASS** |  |
| eval-8 | suboptimal_move | A | pass | pass | fail | pass | fail |  |
| eval-8 | suboptimal_move | B | pass | fail | fail | fail | fail |  |
| eval-8 | suboptimal_move | C | pass | pass | fail | pass | fail |  |
| eval-10 | j_shape | A | pass | pass | fail | fail | fail |  |
| eval-10 | j_shape | B | pass | fail | fail | pass | fail |  |
| eval-10 | j_shape | C | pass | pass | fail | pass | fail |  |
| eval-11 | immediate_threat | A | pass | pass | pass | pass | **PASS** |  |
| eval-11 | immediate_threat | B | pass | fail | fail | pass | fail |  |
| eval-11 | immediate_threat | C | pass | pass | pass | pass | **PASS** |  |
| eval-12 | immediate_threat | A | pass | pass | pass | fail | fail |  |
| eval-12 | immediate_threat | B | pass | 1/2 | fail | 1/2 | fail | yes |
| eval-12 | immediate_threat | C | pass | pass | pass | fail | fail |  |
| eval-15 | double_threat | A | pass | pass | pass | fail | fail |  |
| eval-15 | double_threat | B | pass | fail | fail | 1/2 | fail |  |
| eval-15 | double_threat | C | pass | pass | pass | fail | fail |  |
| eval-29 | double_threat | A | pass | pass | pass | fail | fail |  |
| eval-29 | double_threat | B | pass | fail | fail | 1/2 | fail | yes |
| eval-29 | double_threat | C | pass | pass | pass | fail | fail |  |
| eval-38 | overcut | A | pass | pass | pass | pass | **PASS** |  |
| eval-38 | overcut | B | pass | fail | fail | pass | fail |  |
| eval-38 | overcut | C | pass | pass | pass | pass | **PASS** |  |
| eval-42 | forced_win | A | pass | pass | fail | pass | fail |  |
| eval-42 | forced_win | B | pass | 1/2 | fail | pass | fail | yes |
| eval-42 | forced_win | C | pass | pass | fail | pass | fail |  |
| eval-43 | forced_win | A | pass | pass | pass | pass | **PASS** |  |
| eval-43 | forced_win | B | pass | fail | fail | fail | fail |  |
| eval-43 | forced_win | C | pass | pass | pass | pass | **PASS** |  |
| eval-49 | z_threat | A | pass | pass | pass | pass | **PASS** |  |
| eval-49 | z_threat | B | pass | fail | fail | 1/2 | fail | yes |
| eval-49 | z_threat | C | pass | pass | pass | pass | **PASS** |  |
| eval-51 | figure_7 | A | pass | pass | pass | fail | fail |  |
| eval-51 | figure_7 | B | pass | fail | fail | fail | fail |  |
| eval-51 | figure_7 | C | pass | pass | pass | 1/2 | fail | yes |
| eval-56 | odd_even_threat | A | pass | pass | pass | pass | **PASS** |  |
| eval-56 | odd_even_threat | B | pass | 1/2 | fail | pass | fail | yes |
| eval-56 | odd_even_threat | C | pass | pass | pass | pass | **PASS** |  |
| eval-59 | claimeven | A | pass | pass | fail | fail | fail |  |
| eval-59 | claimeven | B | pass | fail | fail | 1/2 | fail |  |
| eval-59 | claimeven | C | pass | pass | pass | pass | **PASS** |  |

### Notes on failing / intermittent cases

> **eval-0 (B)** [drawing_move]: A2 fail: both runs report best_outcome=draw, truth is win (after-best scr max opp -1 → win). A1/A3/A4 ok.
> **eval-1 (B)** [suboptimal_move]: A2 fail (claims draw, truth loss). A3 fail (no mechanism, pruned). A1/A4 pass.
> **eval-2 (B)** [drawing_move]: A1 pass. A2 fail (run0 loss/loss, run1 loss/draw vs truth draw/win). A3 fail. A4 fail: run0 'lands at c5r1' but c5r1 occupied (real playedCell c5r4); run1 lists occupied/empty non-load-bearing cells and best=draw.
> **eval-6 (A)** [undercut]: A1/A2 correct (played=loss, best=draw). A3/A4 fail: answers frame loss as IMMEDIATE shot at c3r2; board shows Gray has NO immediate threat (c3r2 only minor; Gray col3 only draws scr=0). Real loss is deep zugzwang via cols6/7 (Gray win score +1).
> **eval-6 (B)** [undercut]: A1 pass. A2 fail (r0 best=loss should draw, r1 played=draw should loss). A3 fail. A4 pass (abstains).
> **eval-6 (C)** [undercut]: Same as A: A1/A2 correct, A3/A4 fail. 'c3r2 immediate threat' / 'loses in 1 ply' contradict board (c3r2 minor, col3 scr=0=draw); loss is deep zugzwang via cols6/7.
> **eval-7 (B)** [forced_block]: Sparse. A1 pass both. A2 fail both (claim draw/draw, truth loss/loss). A3 fail both. run0 ALSO A4 fail: claims col7 takes c7r1 (false, lands row4) and played at c6r2 (false, lands row5). run1 A4 pass.
> **eval-8 (A)** [suboptimal_move]: Sparse opening, losing_either_way. Boards 33/35 show NO threats; both moves lose. A1/A2 correct (loss/loss). A3 fail: no named tactic, both lose, no decisive line; cited minor threats c4r3/c4r4 not on board. A4 pass (threats hedged as future).
> **eval-8 (B)** [suboptimal_move]: A1 correct. A2 fail (say draw/draw, truth loss/loss). A3 fail. A4 fail: 'both moves draw with best play' contradicted by board (loss/loss).
> **eval-8 (C)** [suboptimal_move]: Same losing_either_way sparse opening. A1/A2 correct. A3 fail: no decisive named tactic; cited c4r3/c4r4/c5r5 projected not present/decisive. A4 pass.
> **eval-10 (A)** [j_shape]: A1 ok (better_move 3→idx2). A2 ok both LOSS (scr after-best opp+5, after-played opp+6). A3 fail: losing_either_way, no outcome diff so j_shape not decisive 'win/hold'. A4 fail both: assert opponent immediate threat at c3r4 on root; board has no Gray major; immediate_threat is gravity-top c3r3 not c3r4.
> **eval-10 (B)** [j_shape]: stripped. A1 ok. A2 fail (draw/draw, actual loss/loss). A3 fail (honest gap). A4 pass (only 'col4 worse than col3' board-true).
> **eval-10 (C)** [j_shape]: A1/A2 ok (loss/loss). A4 pass both (only board-true facts; dubious c3r4 only inside unsure_about). A3 fail: losing_either_way, j_shape not decisive 'win/hold'.
> **eval-11 (B)** [immediate_threat]: B strips all tactical fields; both abstain. A1 pass. A2 fail (guessed draw/draw, both lose). A3 fail (empty key_cells). A4 pass.
> **eval-12 (A)** [immediate_threat]: better_move col2==correct. both loss (losing_either_way; opp 5 played/2 best). immediate_threat gravity-top c4r4 (Gray win-in-one scr=5) decisive. A4 fail both: claim played loses Green's own c4r4 major; board shows Green keeps c4r4 major (diag Gn15/Gn9/Gn5) in BOTH branches.
> **eval-12 (B)** [immediate_threat]: A1 pass both. A3 fail both (no tactic). A2: run0 draw/draw FAIL (true loss/loss), run1 loss/loss PASS → intermittent. A4: run0 'non-decisive preference between drawing moves' board-false FAIL; run1 only meta-claims PASS.
> **eval-12 (C)** [immediate_threat]: A1/A2/A3 pass (col2; loss/loss; immediate_threat win-in-one c4r4 decisive). A4 fail both: 'drops own c4r4 major, two→one' / 'only c1r4 remains'; board: Green keeps both c1r4 and c4r4 majors.
> **eval-15 (A)** [double_threat]: A1/A2/A3 correct: better=col2(disp3) wins, played=col0 loses; decisive = Green gains 2nd parity-aligned major c1r5 alongside c1r3 vs Gray c1r4. A4 fail both: assert played removed Green major / left only minor; board shows Green major c1r3 [GT] persists. True mechanism = parity flip + failing to ADD 2nd threat, not losing existing.
> **eval-15 (B)** [double_threat]: sparse. both best_outcome wrong (said loss, truth win) A2 fail. run0 honest abstain A4 pass A3 fail. run1 hallucinated row-4 four-in-a-row c3r4-c6r4 (board: Gy,Gy,Gn,Gn mixed, move lands col2 row5) A3/A4 fail.
> **eval-15 (C)** [double_threat]: same as A: A1/A2/A3 correct (best wins via 2 parity-aligned majors c1r3+c1r5 vs Gray c1r4). A4 fail both for same false claim played left no/only-minor threats; board: Green major c1r3 persists.
> **eval-29 (A)** [double_threat]: A1 5-1=4==correct. A2 played=loss/best=win (3322 Green +18 → Gray loses; 3324 all-neg → Gray wins). A3 pass: double threat c1r1/c5r1 genuine fork (33221→two gravity-top Gn majors), col5 kills by occupying c5r1. A4 fail both: assert opponent has fork 'from pre-move/immediate'; boards 332 AND 3322 have ZERO major threats; fork needs Green prep c2r1.
> **eval-29 (B)** [double_threat]: ablated. A1 pass. A2 fail both (draw/draw, actual loss/win). A3 fail both. A4: run0 'without changing game-theoretic result' false (changes loss→win) FAIL; run1 honest abstention PASS → intermittent.
> **eval-29 (C)** [double_threat]: A1/A2/A3 pass (correct better move, loss/win, decisive fork c1r1/c5r1). A4 fail both: 'immediate double threat'/'pre-move already had' contradict boards (332,3322 zero major threats; fork needs prep c2r1).
> **eval-38 (B)** [overcut]: A1 pass. both guessed draw/draw, truth loss/loss (A2 fail). no tactic (A3 fail). honest abstention (A4 pass).
> **eval-42 (A)** [forced_win]: losing_either_way: best=loss/played=loss (best max3, played max13). A1 pass. A3 fail: cited decisive cell c4r2 (Gy major) present in pre/best/played alike → not the differentiator; real differentiator after played is col5 immediate + col4 stacked double (score13 vs3); better move neither wins nor holds. A4 pass (board claims c3r4,c4r2,c5r4 true).
> **eval-42 (B)** [forced_win]: pruned. A1 both. run0 loss/loss (A2 pass), run1 draw/draw (A2 fail, true loss/loss) → intermittent. A3 fail both; key_cells empty A4 vacuous pass.
> **eval-42 (C)** [forced_win]: A1/A2 pass (loss/loss). A3 fail: same as A — c4r2 common to both lines, better move doesn't hold. A4 pass (c4r2,c5r4 verified). run1 unsure_about 'played loses slower' FALSE (played loses faster 13 vs 3) but excluded.
> **eval-43 (B)** [forced_win]: sparse. A1 ok. A2 fail both (guessed loss/loss, truth win/win). A3 fail (no tactic). A4 fail: run0 key_cell c5r3 occupied (Gy12), move lands c5r4; both assert losing outcomes false.
> **eval-49 (B)** [z_threat]: A1 pass. A2 fail both (run0 best=draw, run1 both loss; true best=win/played=draw). A3 fail both. A4: run0 honest abstention pass; run1 'both moves lose' false → fail. intermittent.
> **eval-51 (A)** [figure_7]: A1/A2 correct (best=draw via forced c6r4 threat, played=loss). A3 core correct (c6r4 immediate threat holds draw). A4 fail both: call c5r5 'immediate' threat; board: c5r5 only MINOR (gy), not playable (col5 height=3). Opponent threat-cell list carries no severity → wrongly upgraded.
> **eval-51 (B)** [figure_7]: sparse. A1 pass. A2 fail: best_outcome=loss, true=draw (scr col6=0). A3 fail (no tactic). A4 fail: 'both moves must still lose' / best=loss contradicts board draw.
> **eval-51 (C)** [figure_7]: A1/A2/A3 correct both (best=draw, played=loss; c6r4 decisive, verified). run0 A4 fail: 'opponent already had immediate threat at c5r5' false (minor/non-reachable). run1 avoids it (only c6r4 immediate, true) A4 pass. disagree → intermittent.
> **eval-56 (B)** [odd_even_threat]: sparse. run0 abstains (A3 fail, A4 vacuous pass). run1 mis-maps to draw/draw (A2 fail) 'suboptimal not losing' — both lose. disagree on outcome → intermittent.
> **eval-59 (A)** [claimeven]: A1/A2 correct (better_move=7; both WIN, scr all opp cols negative both lines). A4 fail both: claim Green 'minor threats c7r5/c7r6'; board: c7r5 is Green MAJOR [GT], c7r6 is OPPONENT (Gray) major; no minor threats. Fabricated minors are the cited decisive reason → A3 fail too.
> **eval-59 (B)** [claimeven]: stripped. both guessed loss/loss (position win/win) A2 fail. run0 honest abstain A4 pass. run1 'both moves still lose'/'7 loses less badly' false A4 fail. A3 fail both.
## Counterexample list (THE DELIVERABLE)

Failures and abstentions, grouped by the **feature-field / glossary gap** that caused them, ordered
by impact. Each is attributed to *what the vector did not carry or the glossary did not disambiguate*
— the model is a floor-test instrument, not the thing under test.

### Gap 1 — `patternsOpponent.*` / `threatStats.*` threat cells have no board-snapshot anchor or severity (the dominant A4 fabrication driver)

The single largest source of A4 fabrication. The vector exposes opponent/own threat *cells* (e.g.
`patternsOpponent.immediate_threat.cells`, `double_threat.cells`, the prompt's "YOUR OPPONENT's
threat cells" list) **without saying (a) on which board snapshot they exist** (pre-move? after the
prep move? projected deep in search?) **or (b) their severity** (minor vs major vs gravity-top /
immediately playable). The model then asserts threats as "immediate" / "already present" / "pre-move"
that the board does not show.

| case(s) | axis | board finding proving the gap |
|---|---|---|
| eval-29 A, C | A4 | Model: opponent has an "immediate" double threat at c1r1/c5r1 "from the pre-move board". Board: positions `332` **and** `3322` have **zero major threats**; the fork materializes only on `33221`, after Green plays prep cell c2r1. Fork cells right, timing fabricated. |
| eval-10 A | A4 | Model: "opponent immediate threat at c3r4" on root. Board: root has **no Gray major threat**; the gravity-top immediate cell is c3r3, never c3r4. |
| eval-59 A | A4, A3 | Model: Green "minor threats on c7r5/c7r6". Board: c7r5 is a Green **major** [GT]; c7r6 is the **opponent's** major. No minors exist. The fabricated minors were the cited decisive reason → A3 also fails. |
| eval-51 A; C (run0) | A4 | Model: opponent "immediate threat at c5r5". Board: c5r5 is only a **minor** (gy) and not reachable (col5 height 3). The threat-cell list carried no severity, so the model upgraded minor→immediate. |
| eval-42 C (run1, in unsure) | A4-adjacent | Vector reportedly marks c5r5 `immediate`, board shows c5r5 `(*)` minor only — same severity gap; here it surfaced as an abstention, not a hard claim. |

**Fix direction:** every threat-cell set should carry an explicit `{severity, snapshot, gravityTop}`
tag, and the glossary must state that a cell in `patternsOpponent` is a *pre-move opponent snapshot*,
not a claim that the threat is currently active/playable. (Tracks the known
`project_feature_vector_content_traps.md` "patternsOpponent snapshot ambiguity".)

### Gap 2 — `threatStats.*MajorNonParity` count drops are read as "lost my own threat" (reclassification ≠ disappearance)

When a latent major cell becomes gravity-top/playable it moves from the `…MajorNonParity` bucket
into the parity/gravity bucket. The count `playerMajorNonParity` then drops 2→1, and the model reads
this as "the played move destroyed one of my major threats" — board-false.

| case(s) | axis | board finding |
|---|---|---|
| eval-12 A, C | A4 | Model: played move "strips your c4r4 major, leaving only c1r4". Board: Green **keeps** the c4r4 major (diagonal c4r4-c5r3-c6r2-c7r1) in **both** branches; the count moved buckets. |
| eval-15 A, C | A4 | Model: played move "left Green with only minor threats". Board: Green major at c1r3 `[GT]` **persists** after the played move. True mechanism = parity flip + failing to *add* the second major, not losing the existing one. |

**Fix direction:** either expose a stable `playerMajorTotal` the prompt is told to use for
"did I lose a threat?" reasoning, or add a glossary note that a major leaving the `NonParity` bucket
means *reclassification*, not loss.

### Gap 3 — `losing_either_way`: no field expresses "loses N plies slower", so A3 has no decisive reason to stand on

When both moves lose, A3 ("the better move is decisive because it wins/holds") has nothing to anchor:
the better move neither wins nor holds. The vector's `lookahead.decisiveLine`/`outcomeTiming` are
**null** in `losing_either_way` (per `project_feature_vector_content_traps.md`), so the model either
(a) fabricates a decisive tactic that isn't there, or (b) falls back to a static cell common to both
lines (not a differentiator).

| case(s) | axis | board finding |
|---|---|---|
| eval-10 A, C | A3 | Both moves LOSS (scr opp +5 best vs +6 played). j_shape framed as decisive but produces no win/hold; real difference is a marginal 1-ply delay the vector cannot express. |
| eval-42 A, C | A3 | Cited decisive cell c4r2 (Gy major) is present in pre/best/played **alike** → not the differentiator. Real differentiator (col5 tempo + stacked col4r3 double, score 13 vs 3) is only in the null `decisiveLine`. |
| eval-8 A, C | A3 | Sparse `losing_either_way` opening: both lose, no current-board tactic; cited minor threats c4r3/c4r4 are projected, not present/decisive. The honest reason is purely positional (premove −1 vs −2). |

**Fix direction:** for `losing_either_way`, populate a `relativeDelay`/`pliesToEnd` differential and
an explicit "no holding line; the better move only loses more slowly / concedes fewer tempi" signal,
so the model has a *true* reason instead of a fabricated tactic.

### Gap 4 — No principal-variation / forcing-line / full 4-cell winning-window field (pervasive honest abstention)

Even in **passing** cases, nearly every run abstains on the concrete continuation: the vector gives
a `decisiveLine.completingCell` but not the full 4-in-a-row window, and never the forcing move
sequence. This is honest abstention (excluded from A4), but it is a real ceiling on explanation
quality and the most frequent `unsure_about`.

| representative cases | axis | model's `unsure_about` (paraphrased) |
|---|---|---|
| eval-49 A/C, eval-11 A/C, eval-2 A/C, eval-7 A/C, eval-1 A/C, eval-43 A | abstention | "vector gives the completing cell but not the full four-cell window / forcing sequence, so I cannot name the line." |

**Fix direction:** expose the full winning-window cells and (where affordable) a short PV. This is
the cleanest single lever to raise explanation *concreteness* without risking fabrication.

### Gap 5 — `lookahead.categoryExamples` surfaces far-future cells with no present-board tactic (sparse / opening positions)

On sparse/opening boards the only structured content is projected threats realized 15–20 plies later.
The model correctly abstains (it flags them as future), but in A it sometimes leans on them as if
load-bearing. The right reason on these boards is positional (center control), which the vector
underweights.

| case(s) | axis | board finding |
|---|---|---|
| eval-0 A/C, eval-8 A/C | abstention / A3 | after-best board empty, "Major threats: none"; `categoryExamples` only far-future cells. eval-0 passes (model leans on `centerDominance`); eval-8 fails A3 (cites projected threats as the differentiator on a both-lose board). |

**Fix direction:** tag `categoryExamples` entries with `realizedOnPly` distance and instruct the
prompt to treat distant ones as positional, not tactical; strengthen the positional/center signal for
opening positions.

### Gap 6 — Condition-B ablation: outcome + mechanism unrecoverable from board alone (expected, confirms field value)

All B failures trace to the deliberate stripping of `lookahead.{bestOutcome,postBlunderOutcome}`,
`tag`/`direction`, `threatStats`, and `patterns*`. The model defaults to guessing draw/draw (A2
fail) and names no tactic (A3 fail). Not a vector gap to fix — it is the **positive control** showing
those fields are necessary, and that the board (movestring) alone does not let even `gpt-5.4` recover
the answer. Several B runs also intermittently fabricate (e.g. eval-7 run0 guessed wrong landing
cells; eval-2 run0 placed a disc on an occupied cell) when forced to reconstruct without `playedCell`/`bestCell`.
## fields_relied_on distribution

Aggregated across all 108 answers (note: B prunes most fields, so engineered-field counts are A+C-dominated).

**Most-cited (load-bearing):**

| count | field |
|---|---|
| 108 | `bestCol` |
| 71 | `tag` |
| 71 | `direction` |
| 64 | `playedCell` |
| 59 | `lookahead.case` |
| 56 | `bestCell` |
| 45 | `playedCol` |
| 44 | `lookahead.outcomeTiming.played.outcome` |
| 43 | `lookahead.outcomeTiming.best.outcome` |
| 40 | `lookahead.bestOutcome` |
| 40 | `lookahead.postBlunderOutcome` |
| 37 | `movestring` |
| 29 | `lookahead.categoryExamples` |
| 22 | `lookahead.oppCategoryExamples` |
| 21 | `lookahead.decisiveLine.completingCell` |
| 17 | `patternsOpponent.immediate_threat.cells` |
| 16 | `lookahead.decisiveLine.owner` |
| 16 | `lookahead.decisiveLine.fastSideRealizedOnPly` |
| 14 | `centerDominance` |
| 10 | `lookahead.edgeType` |
| 10 | `perspective` |
| 10 | `lookahead.outcomeTiming.played.pliesToEnd` |

**Read-out:**
- `bestCol` (108) is cited by every answer — it is the A1 spoon-feed. `tag`/`direction` (71 each) and the `lookahead.*outcome*` family (40–44 each) are the backbone of A2/A3 — confirming the **outcome + tag fields are the most load-bearing engineered content**, which is exactly why Condition B (which strips them) collapses.
- `threatStats.*` fields are cited but **fragmented across dozens of sub-keys** (each `…ParityAligned`, `…NonParity`, `.cells`, `.count` variant appears only a handful of times). This long tail is where the A4 fabrications (Gaps 1–2) concentrate: the model reaches for a specific bucket and misreads its snapshot/severity semantics. Candidate for **consolidation + clearer glossary semantics** rather than removal.
- `lookahead.decisiveLine.*` is cited 16–21 times but **only ever gives `completingCell`/`owner`/`fastSide`, never the full window** — matching Gap 4 (the most common abstention).
- Genuinely rare/never-cited engineered fields (`lookahead.reachability` 1, `gapBucket` 4, `edgeType` 10, deep `categoryExamples[i].*` indices) are candidates for review: either the glossary doesn't surface them or they don't earn their place.

## Raw answers (per case)

_Compact view: per id, the board + oracle, then each run's structured answer (mechanism truncated). Full vectors live in `eval_set_fv_suff_frozen_vectors.jsonl`; full answers in `fv_suff_answers_all_v2.jsonl`._

### eval-0 — drawing_move  (tag=drawing_move, dir=missed_own)
- board_state: `(empty)`  | played col 4 (0-idx) | correct col 3 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=draw_with_best_play · case=both_moves_hold_better_stronger
  - **A0** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r1,c5r5,c6r5,c1r3,c2r4,c1r5,c2r5
    - mech: On the empty board, the mistake was positional: playing column 5 gave up the center, while column 4 was the stronger move. The lookahead says the center move leads to a win with best play, whereas the played move only draws, and the winning…
    - unsure: The vector does not show a concrete present-board tactic on move 1; the cited major threats and j-shape are projected future structures (realized much later), so I cannot specify the exact forcing continuation from the opening move beyond that central control leads to the stronger winning plan.
  - **A1** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r1,c5r5,c6r5
    - mech: On the empty board, playing the center in column 4 was stronger: with best play it leads to a win, while the played move in column 5 only holds a draw. The vector is sparse and explicitly flags center dominance, so the load-bearing reason i…
    - unsure: The vector does not give a concrete present-board tactic on move 1; the listed major threats and j-shape are projected future structures (realizedOnPly 18-20), so I cannot honestly specify the exact forcing sequence from the center win.
  - **B0** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only shows an empty-board opening choice: you played column 5, while the engine preferred column 4. With no tag, threat, pattern, or lookahead data present, the only grounded explanation is a quiet positional one: column 4 is the…
    - unsure: The vector does not provide tag, gapBucket, centerDominance, threatStats, patterns, or lookahead, so I cannot determine any specific tactical refutation or even the exact with-best-play outcomes from this data alone.
  - **B1** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: From the vector alone, the only grounded fact is that on the empty board the engine preferred column 4 over the played column 5. With no tag, lookahead, threat, pattern, or outcome fields present, this reads as a quiet positional inaccuracy…
    - unsure: The vector does not provide tag, gapBucket, lookahead, threatStats, patterns, or outcome labels, so I cannot determine the exact mechanism or whether either move changes the game-theoretic result.
  - **C0** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r1,c5r5,c6r5,c1r3,c2r4,c1r5,c2r5
    - mech: Playing column 4 (landing on c4r1) was stronger because with best play it keeps a winning continuation, while the played move to column 5 only holds a draw. The vector grounds that difference in player-side future structure available after …
    - unsure: The vector does not show the exact forcing winning line from c4r1, and the cited major-threat/j-shape structures are projected later in the search rather than already present on the current board.
  - **C1** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r1,c5r5,c6r5
    - mech: Playing column 4 (landing on c4r1) was stronger because with best play it leads to a win, while the played move in column 5 only holds a draw. The vector is sparse and center-dominance is flagged, so the core mistake is giving up the strong…
    - unsure: The vector does not show the exact forced winning line after c4r1, and the listed major-threat and j-shape examples are projected future structures (realized much later), not features already present on the current board.

### eval-1 — suboptimal_move  (tag=minor_threat, dir=missed_own)
- board_state: `44`  | played col 4 (0-idx) | correct col 3 (0-idx)
- oracle outcomes: best=draw_with_best_play · postBlunder=loss_with_best_play · case=better_holds_played_loses
  - **A0** bm=4 played=loss best=draw conf=medium | key_cells: c4r1,c5r3,c2r1,c3r1,c6r1,c7r1
    - mech: Playing column 5 was a missed build: the better move was column 4, which would have kept the position drawable and immediately given you four minor-threat squares at c2r1, c3r1, c6r1, and c7r1. Instead, the move to c5r3 loses with best play…
    - unsure: The vector does not identify the exact opponent winning line or current-board tactical refutation after c5r3, so I cannot name a concrete opponent threat cell beyond saying the played move loses with best play.
  - **A1** bm=4 played=loss best=draw conf=medium | key_cells: c4r1,c5r3,c2r1,c3r1,c6r1,c7r1
    - mech: Playing column 5 missed the stronger setup from column 4. After the better move, you would have had four minor threats on c2r1, c3r1, c6r1, and c7r1 and the position would still hold a draw; after the played move, the line instead loses wit…
    - unsure: The vector does not identify the opponent's exact punishing cells or immediate winning line after the played move, so I cannot say precisely how the loss is executed beyond that it loses with best play and does so in 1 ply by the solver timing.
  - **B0** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only tells us that column 4 was the engine's preferred move over the played column 5 in the position after movestring "44", but it provides no tag, threat, pattern, or lookahead data showing a concrete tactical reason. So the onl…
    - unsure: The vector omits tag, gapBucket, threatStats, patterns, and lookahead, so it does not reveal the actual blunder mechanism or either move's with-best-play outcome. I also cannot determine any grounded key cells beyond the move columns alone.
  - **B1** bm=4 played=draw best=draw conf=low | key_cells: c5r1,c5r2
    - mech: The vector only tells us that column 4 was the engine's preferred move over the played column 5 in this position, but it gives no tag, threat, pattern, or lookahead data explaining the concrete reason. On the board from movestring "44", bot…
    - unsure: The vector does not provide tag, gapBucket, threatStats, patterns, or lookahead, so I cannot determine the actual blunder mechanism or the with-best-play outcomes of the played and better moves from the supplied features alone.
  - **C0** bm=4 played=loss best=draw conf=high | key_cells: c4r1,c5r3,c2r1,c3r1,c6r1,c7r1
    - mech: Column 4 was better because it would have held the position to a draw, while the played move in column 5 loses with best play. The vector tags this as a missed own minor-threat plan: after the better move you would immediately add player mi…
    - unsure: The vector does not identify the exact opponent winning move or decisive winning cell on the played line, so I cannot specify the concrete immediate punishment beyond that the played move loses in 1 ply with best play.
  - **C1** bm=4 played=loss best=draw conf=high | key_cells: c4r1,c5r3,c2r1,c3r1,c6r1,c7r1
    - mech: The mistake was a missed own-building move: playing column 4 would have held the position to a draw, while the played move in column 5 loses with best play. The concrete board-grounded reason the vector gives is that the better move creates…
    - unsure: The vector does not specify the exact opponent reply or winning line after the played move, so I cannot name the precise tactical punishment beyond the outcome flip to a loss. The future categoryExamples are projected structures, not current-board features, so I did not treat them as already present.

### eval-2 — drawing_move  (tag=minor_threat, dir=missed_own)
- board_state: `444`  | played col 4 (0-idx) | correct col 3 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=draw_with_best_play · case=both_moves_hold_better_stronger
  - **A0** bm=4 played=draw best=win conf=high | key_cells: c4r1,c5r4,c6r3,c7r4
    - mech: Playing column 4 (landing on c4r1) was stronger because it created your concrete minor-threat setup immediately: after the better move, you have two player minor threats at c6r3 and c7r4, while the played move in column 5 missed that constr…
    - unsure: The vector does not pin down the exact forcing continuation from the better move, only that the better line becomes a win with best play and that it builds stronger future threat structure.
  - **A1** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r4,c6r3,c7r4,c3r4
    - mech: Playing column 4 would have been stronger because it creates your minor-threat setup immediately after the move, with two player minor-threat cells at c6r3 and c7r4, while the played move to column 5 misses that plan. The lookahead says thi…
    - unsure: The vector does not specify the exact forcing continuation that converts the better move into a win, so I cannot name the full winning line or say whether the win comes from one immediate tactic versus a longer conversion beyond the listed future structures.
  - **B0** bm=4 played=loss best=loss conf=low | key_cells: c4r1,c5r1
    - mech: The vector only shows that you played column 5 and the engine preferred column 4 in the position after movestring "444". From the board implied by that movestring, column 4 would land at c4r1 while the played move lands at c5r1, but no tag,…
    - unsure: The vector does not provide tag, direction, gapBucket, patterns, threatStats, or lookahead, so I cannot determine the actual blunder mechanism or the with-best-play outcomes for either move from the supplied fields alone.
  - **B1** bm=4 played=loss best=draw conf=low | key_cells: c4r1,c4r2,c4r3,c5r1
    - mech: I can tell only that playing column 5 was worse than playing column 4 in this position, but the vector gives no tag, threat, pattern, or lookahead data to show the concrete tactical mechanism. From the movestring alone, the board is still v…
    - unsure: The vector does not provide tag, gapBucket, threatStats, patterns, or lookahead, so it does not let me determine the actual blunder mechanism or the with-best-play outcomes of the played and better moves.
  - **C0** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r4,c6r3,c7r4,c3r4
    - mech: Playing column 4 would have led to a winning position with best play, while the played move in column 5 only holds a draw. The concrete board-grounded difference the vector gives is that after the better move you would create two minor thre…
    - unsure: The vector does not specify the exact forcing continuation from the better move, so I cannot say precisely how the win is converted beyond the stronger threat structure shown in lookahead.
  - **C1** bm=4 played=draw best=win conf=medium | key_cells: c4r1,c5r4,c6r3,c7r4
    - mech: The blunder was a missed build-up: playing column 4 would have created two of your minor threats immediately after the move, at c6r3 and c7r4, while the played move did not. The lookahead says both moves avoid losing, but only the better mo…
    - unsure: The vector does not show the full pre-move or post-played threat maps, so I cannot specify the exact forcing continuation that turns the better move into a win, only that the better line preserves stronger player-side threat structure and the played line does not.

### eval-6 — undercut  (tag=undercut, dir=enabled_opponent)
- board_state: `444423333643535655`  | played col 1 (0-idx) | correct col 2 (0-idx)
- oracle outcomes: best=draw_with_best_play · postBlunder=loss_with_best_play · case=better_holds_played_loses
  - **A0** bm=3 played=loss best=draw conf=high | key_cells: c2r1,c3r2,c3r5
    - mech: Playing column 2 at c2r1 was an undercut blunder: it allows the opponent an immediate move at c3r2, which sits below your existing major threat at c3r5 and kills that threat before it can matter. The better move was column 3 to c3r2, which …
    - unsure: The vector identifies the undercut relation between c3r2 and c3r5, but it does not specify the exact four-cell winning windows involved, so I cannot state the full line geometry more precisely.
  - **A1** bm=3 played=loss best=draw conf=high | key_cells: c2r1,c3r2,c3r5
    - mech: Playing column 2 at c2r1 is an undercut blunder: it leaves the opponent an immediate reply at c3r2, while your own key major threat remains higher up at c3r5. The better move was column 3 to c3r2, which removes that immediate opponent shot …
    - unsure: The vector identifies the undercut around c3r2 and c3r5, but it does not specify the exact four-cell winning window completed by the opponent's immediate threat at c3r2.
  - **B0** bm=3 played=loss best=loss conf=low | key_cells: 
    - mech: I can tell only that column 3 was evaluated as better than the played column 2, but the supplied vector gives no tag, threat, pattern, or lookahead data to identify the concrete tactical or positional reason. From movestring alone the board…
    - unsure: The vector omits tag, direction, gapBucket, threatStats, patterns, lookahead, and outcome fields, so I cannot determine the actual reason column 2 is worse than column 3, nor the with-best-play outcomes for either move from the vector alone.
  - **B1** bm=3 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 3 was evaluated as at least as good as the played column 2 in this position, but the vector provides no tag, threat, pattern, or lookahead data explaining the tactical or strategic reason. From the supplied field…
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, and lookahead, so I cannot determine whether column 2 missed a threat, failed to block something, or was merely positionally inferior. It also does not provide best-play outcomes for either move.
  - **C0** bm=3 played=loss best=draw conf=high | key_cells: c3r2,c3r5
    - mech: Playing column 2 was an undercut blunder: it lets the opponent use c3r2, which is already flagged as their immediate threat, while your own key threat remains higher in the same column at c3r5. The better move was column 3 to c3r2, which re…
    - unsure: The vector does not specify the exact four-cell winning line completed from c3r2, only that c3r2 is the opponent's immediate threat and that the undercut relation is between c3r2 and your higher threat at c3r5.
  - **C1** bm=3 played=loss best=draw conf=high | key_cells: c3r2,c3r5
    - mech: Playing column 2 was an undercut blunder: it lets the opponent use c3r2 immediately, which sits below your existing major threat at c3r5 in the same column and kills that winning idea before it can matter. The better move was column 3 to c3…
    - unsure: The vector identifies the undercut relation at c3r2/c3r5 and that the played move loses in 1 ply, but it does not specify the exact four-cell winning window completed by the opponent at c3r2.

### eval-7 — forced_block  (tag=forced_block, dir=defensive_miss)
- board_state: `44442333364353565516`  | played col 5 (0-idx) | correct col 6 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=7 played=loss best=loss conf=high | key_cells: c7r4,c6r5
    - mech: This was a defensive miss: before your move, the opponent already had an immediate winning threat at c7r4, so the load-bearing requirement was to play column 7 and block that square. Instead you played column 6 to c6r5, leaving c7r4 availab…
    - unsure: The vector does not let me specify the exact four-cell winning line completed through c7r4 from the current board, because the immediate-threat pattern only names the completing cell, not the full window.
  - **A1** bm=7 played=loss best=loss conf=medium | key_cells: c7r4,c6r5
    - mech: This was a defensive miss: before your move, the opponent already had an immediate winning threat at c7r4, so the urgent move was to play column 7 and block that square. Instead you played column 6 to c6r5, leaving c7r4 available; the vecto…
    - unsure: The vector shows both moves lose with best play, and even says the best line's decisive immediate threat at c7r4 appears on ply 1, so it does not fully clarify why the blocking move in column 7 is still labeled the better move beyond identifying the pre-move forced block at c7r4.
  - **B0** bm=7 played=draw best=draw conf=low | key_cells: c7r1,c6r2
    - mech: Column 7 was better because it takes the last open bottom cell on the right edge, while the played move in column 6 stacks on top at c6r2 instead. From the board alone, the concrete difference I can justify is that the better move occupies …
    - unsure: The vector omits gapBucket, tag, direction, threatStats, patterns, and lookahead, so I cannot determine the exact blunder mechanism, whether either move changes the true outcome with best play, or any specific threats/forks/parity features beyond the directly derivable landing squares.
  - **B1** bm=7 played=draw best=draw conf=low | key_cells: 
    - mech: Column 7 was the engine's preferred move, but this sparse vector gives no tactical pattern, threat map, or lookahead showing a concrete punishment for playing column 6 instead. So the only justified claim is that the played move was a weake…
    - unsure: The vector omits gapBucket, tag, direction, playedCell, bestCell, threatStats, patterns, and lookahead, so I cannot determine the specific tactical or positional mechanism, nor the exact with-best-play outcomes from engineered fields. I can only infer that both moves are legal alternatives from the given position and that column 7 is preferred to column 6.
  - **C0** bm=7 played=loss best=loss conf=high | key_cells: c7r4,c6r5
    - mech: This was a defensive miss: before your move, the opponent already had an immediate winning threat at c7r4, so the load-bearing requirement was to play column 7 and block that cell. You instead played column 6 to c6r5, leaving c7r4 available…
    - unsure: The vector shows both moves as losses with best play, so I cannot say from this vector alone why blocking at c7r4 still loses overall beyond stopping the immediate win on that square.
  - **C1** bm=7 played=loss best=loss conf=high | key_cells: c7r4,c6r5
    - mech: This was a defensive miss: before your move, the opponent already had an immediate winning threat at c7r4, so you had to play column 7 to block that square. Instead you played column 6, landing on c6r5, which does not affect c7r4 and leaves…
    - unsure: The vector does not identify the exact four-cell winning window completed through c7r4 on the pre-move board, only the winning cell itself.

### eval-8 — suboptimal_move  (tag=minor_threat, dir=enabled_opponent)
- board_state: `3`  | played col 5 (0-idx) | correct col 3 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=4 played=loss best=loss conf=medium | key_cells: c4r3,c4r4,c4r2,c6r1
    - mech: Playing column 6 was classified as an enabled-opponent minor-threat mistake: on this sparse, center-driven position, it gives the opponent a developing threat plan that the better move in column 4 would not. The concrete grounded difference…
    - unsure: The vector does not show a present-board tactical refutation or any pre-move/post-move pattern snapshots, and the opponent structures in lookahead are projected future features (not current-board threats), so I cannot say exactly how the center concession is converted without guessing.
  - **A1** bm=4 played=loss best=loss conf=medium | key_cells: c4r3,c4r4,c5r5,c4r2,c6r1
    - mech: The played move to column 6 was tagged as an enabled_opponent minor_threat mistake: it gives the opponent extra developing threats instead of contesting the center with column 4. The concrete opponent-side punishments shown by lookahead are…
    - unsure: The vector does not show any pre-move pattern/threat maps, so I cannot say exactly how column 4 would have prevented those opponent plans on the current board; the listed opponent threats are projected future structures, not present immediately.
  - **B0** bm=4 played=draw best=draw conf=low | key_cells: c4r1,c6r1
    - mech: The vector only tells us that column 4 was at least as good as the played column 6, but it gives no tag, threat data, pattern maps, or lookahead showing a concrete tactical reason. From the board after movestring "3", this is an extremely e…
    - unsure: The vector does not provide tag, gapBucket, patterns, threatStats, lookahead, or outcome labels, so I cannot determine the specific mechanism or whether either move changes the game-theoretic result; I can only identify the compared moves and their landing cells from the board.
  - **B1** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only tells us that column 4 was at least as good as the played column 6, but it provides no tag, threat, pattern, or lookahead explaining a concrete tactical or positional reason. From the board described by movestring "3", this …
    - unsure: The vector does not include tag, gapBucket, lookahead, threatStats, patterns, or outcome labels, so I cannot determine the specific reason column 4 is better, nor can I determine either move's with-best-play outcome from the vector alone.
  - **C0** bm=4 played=loss best=loss conf=medium | key_cells: c6r1,c4r2,c4r3,c4r4,c4r4,c5r5
    - mech: This was a small positional mistake: both moves lose with best play, but your move in column 6 enabled the opponent's minor-threat plan rather than the better central move in column 4. The vector's opponent lookahead is centered on column 4…
    - unsure: The vector does not show a concrete pre-move board pattern or an immediate tactical refutation; the opponent threats are only projected in lookahead, and several cited structures occur many plies later, so I cannot say exactly how the center fight on column 4 converts without inventing details.
  - **C1** bm=4 played=loss best=loss conf=medium | key_cells: c4r2,c6r1,c4r3,c4r4,c5r5
    - mech: This was a small positional mistake: both moves lose with best play, but your move to column 6 enabled the opponent's minor-threat plan instead of the better central move to column 4. The vector's opponent examples are centered on column 4 …
    - unsure: The vector does not show the exact current-board threat pattern or a concrete forced line from the root, and the listed opponent structures are projected future patterns (not present immediately), so I cannot specify the precise move-by-move refutation beyond the opponent building those column-4/5 threats.

### eval-10 — j_shape  (tag=j_shape, dir=enabled_opponent)
- board_state: `3553121302`  | played col 3 (0-idx) | correct col 2 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=3 played=loss best=loss conf=medium | key_cells: c3r1,c4r2,c3r3,c4r3,c3r4,c4r4
    - mech: Playing column 4 at c4r4 was a blunder because it enabled the opponent's existing J-shape based on c3r1, c4r2, c3r3, and c4r3, instead of playing column 3 at c3r3. The pre-move opponent snapshot already shows both an immediate threat on c3r…
    - unsure: The vector shows both moves lose with best play, and it does not explicitly give the exact forcing sequence from the played move to the final loss. I also cannot determine from the vector alone whether the opponent's c3r4 immediate threat was already uniquely forcing on the root board or how the engine orders the competing immediate threats after each move.
  - **A1** bm=3 played=loss best=loss conf=medium | key_cells: c3r4,c3r1,c4r2,c3r3,c4r3,c4r4
    - mech: Both moves lose with best play, so this was not a decisive swing, but the played move is classified as enabling the opponent's j-shape structure. On the pre-move board the opponent already has an immediate threat at c3r4 and also a j-shape …
    - unsure: The vector does not explicitly show the opponent's post-blunder board patterns, so I cannot prove from the provided fields exactly how the opponent's j-shape is strengthened after the played move beyond the classifier's top-level tag and the fact that best move would occupy c3r3 instead.
  - **B0** bm=3 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only tells us that column 3 was preferred over the played column 4, but it provides no tag, threat data, pattern maps, or lookahead explaining why. So the only grounded claim is that column 4 was evaluated as worse than column 3,…
    - unsure: The vector does not include tag, gapBucket, patterns, threatStats, or lookahead, so I cannot determine the concrete blunder mechanism or the with-best-play outcomes from this feature vector alone.
  - **B1** bm=3 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only tells us that column 3 was evaluated as better than the played column 4, but it provides no tag, threat stats, pattern maps, or lookahead showing a concrete tactical or strategic reason. So all that can be said from the supp…
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, and lookahead, so I cannot determine the actual blunder mechanism or the with-best-play outcomes for either move from the provided data alone.
  - **C0** bm=3 played=loss best=loss conf=medium | key_cells: c3r1,c4r2,c3r3,c4r3,c4r4,c3r3
    - mech: Playing column 4 was weaker because it enabled the opponent's J-shape structure on c3r1, c4r2, c3r3, and c4r3, which the vector identifies as the key opponent-side tactical feature. The better move in column 3 would instead have given you a…
    - unsure: The vector does not fully specify the exact forcing move order from the current board, and patternsOpponent is a pre-move opponent snapshot rather than a post-blunder board, so I cannot state the precise concrete sequence by which the opponent converts the J-shape after the played move.
  - **C1** bm=3 played=loss best=loss conf=medium | key_cells: c3r1,c4r2,c3r3,c4r3,c4r4,c3r3
    - mech: Both moves lose with best play, so this was not an outcome-flipping blunder. The concrete difference is structural: by playing column 4 to c4r4, you allowed the opponent's J-shape based on c3r1, c4r2, c3r3, and c4r3 to remain relevant, whil…
    - unsure: The vector does not spell out exactly how the opponent's pre-move immediate threat at c3r4 interacts move-by-move with your own immediate threats, and because lookahead is marked positional with no decisiveLine, I cannot safely reconstruct the exact forcing sequence from the current board.

### eval-11 — immediate_threat  (tag=immediate_threat, dir=enabled_opponent)
- board_state: `35531213023221`  | played col 0 (0-idx) | correct col 3 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=4 played=loss best=loss conf=medium | key_cells: c1r2,c1r3,c4r5
    - mech: Playing in column 1 at c1r2 was tagged as an enabled_opponent immediate_threat because it gives the opponent an immediate winning move at c1r3 on the very next ply. The better move was column 4 to c4r5; after that line the opponent still ha…
    - unsure: The vector does not identify the actual played column directly, and it does not fully specify why the best move also loses beyond showing the opponent's c1r3 decisive line appears on the faster side. I also cannot reconstruct the exact four-cell winning window from decisiveLine because only c1r3 is listed there.
  - **A1** bm=4 played=loss best=loss conf=high | key_cells: c1r2,c1r3,c4r5
    - mech: Playing in column 1 at c1r2 was tagged as an enabled immediate threat: it gives the opponent an immediate winning move at c1r3 on the very next ply. The better move was column 4 to c4r5; after that, the opponent still has major threats, but…
    - unsure: The vector does not expose playedCol directly, so I inferred the played move's square from playedCell only; it also does not fully specify every winning line through c1r3, only that it is an opponent immediate threat with one winning line through that cell.
  - **B0** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 4 was evaluated as at least as good as the played column 1, but this vector provides no tag, threat, pattern, or lookahead data showing a concrete tactical reason. From the supplied fields alone, the played move …
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, lookahead, playedCell, and outcome labels, so I cannot determine the specific blunder mechanism or the with-best-play outcomes for either move from the provided data alone.
  - **B1** bm=4 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 4 was evaluated as at least as good as the played column 1, but the vector provides no tag, pattern, threat, or lookahead data explaining the reason. From the supplied fields alone, the blunder mechanism is not r…
    - unsure: The vector omits tag, direction, gapBucket, patterns, threatStats, lookahead, and outcome labels, so I cannot determine the concrete tactical/positional reason, the exact resulting outcomes with best play, or any load-bearing cells without guessing.
  - **C0** bm=4 played=loss best=loss conf=medium | key_cells: c1r2,c1r3
    - mech: Playing in column 1 at c1r2 was tagged as an immediate-threat blunder because it gives the opponent a win-in-one on c1r3. The lookahead shows that this immediate threat appears on the played line, while the better move was column 4; both mo…
    - unsure: The vector does not pin down the full four-cell winning window for c1r3 on the current board, only the completing cell and that it is an opponent immediate threat. It also does not let me say whether the better move avoids c1r3 specifically beyond showing that the fastest realized decisive line is on the best side and that both moves still lose overall.
  - **C1** bm=4 played=loss best=loss conf=medium | key_cells: c1r2,c1r3,c4r5
    - mech: Playing in column 1 to c1r2 enabled an opponent immediate threat at c1r3 on the very next ply; that is the concrete tactical mistake flagged here. Column 4 was also losing with best play, but it does not create that immediate c1r3 win-in-on…
    - unsure: The vector does not specify the exact four-cell winning window for c1r3, only the completing cell, so I cannot name the full line. It also shows both moves lose, with the best move actually losing faster, so the precise reason the engine still prefers column 4 beyond not enabling the immediate c1r3 threat is not fully determined from this vector alone.

### eval-12 — immediate_threat  (tag=immediate_threat, dir=enabled_opponent)
- board_state: `33426526555245446212241411160660`  | played col 3 (0-idx) | correct col 1 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=2 played=loss best=loss conf=medium | key_cells: c4r3,c4r4,c2r6
    - mech: Playing column 4 at c4r3 hands the opponent an immediate win at c4r4; the vector classifies this as enabling an opponent immediate threat, and the decisive line also completes on c4r4 right away. The better move to column 2 does not improve…
    - unsure: The vector is internally tense about ownership at c4r4: patternsPostBlunder marks c4r4 as your immediate threat, while the top-level tag/direction and lookahead decisive line say the played move enables the opponent to win there. I therefore cannot fully reconstruct the exact local line around c4r4 beyond saying that c4r4 is the decisive square and the played move mishandles it.
  - **A1** bm=2 played=loss best=loss conf=medium | key_cells: c4r3,c4r4,c1r4
    - mech: Playing column 4 at c4r3 is bad because it enables the opponent's immediate win at c4r4; the vector classifies this as an enabled opponent immediate threat, and the decisive line is the single winning cell c4r4 realized immediately on the p…
    - unsure: The vector is internally mixed about whose immediate threat appears after the played move: patternsPostBlunder marks c4r4 as your immediate threat, but tag/direction, decisiveLine, and oppCategoryExamples say the load-bearing immediate threat at c4r4 belongs to the opponent. I therefore rely on the latter fields for the blunder mechanism.
  - **B0** bm=2 played=draw best=draw conf=low | key_cells: 
    - mech: The vector only tells us that column 2 was at least as good as the played column 4, but it provides no tag, pattern, threat, or lookahead data explaining a concrete tactical or strategic difference. From the supplied fields alone, this appe…
    - unsure: The vector omits tag, gapBucket, threatStats, patterns, and lookahead, so I cannot determine the actual load-bearing reason column 2 is better than column 4, nor whether center, parity, or a specific threat pattern is involved.
  - **B1** bm=2 played=loss best=loss conf=low | key_cells: 
    - mech: I can tell only that column 2 was evaluated as better than the played column 4, but the vector provides no tag, threat, pattern, or lookahead data to show the concrete tactical or positional reason. Since both moves are only distinguished b…
    - unsure: The vector does not include tag, direction, gapBucket, patterns, threatStats, or lookahead, so I cannot determine the specific mistake type, the concrete key cells, or even the with-best-play outcomes of the played and better moves from the provided fields alone.
  - **C0** bm=2 played=loss best=loss conf=medium | key_cells: c4r3,c4r4
    - mech: Playing column 4 at c4r3 was tagged as enabling the opponent's immediate threat: after your move, c4r4 becomes a gravity-top winning cell, and the lookahead shows the opponent's decisive line runs through c4r4 immediately. Your move also dr…
    - unsure: The vector shows c4r4 as the decisive opponent winning cell and as an immediate threat after the blunder, but it does not fully spell out the exact four-cell winning window on the current board; it also indicates both moves lose, so I cannot claim the better move fully avoids the loss, only that this move specifically opens c4r4 and weakens your own threat structure.
  - **C1** bm=2 played=loss best=loss conf=medium | key_cells: c4r4,c1r4,c1r5,c4r5
    - mech: Playing column 4 was classified as an enabled-opponent immediate-threat blunder because it gives the opponent a win-in-one at c4r4. It also strips away your own latent major threat on c4r4: after the better move you still keep two non-parit…
    - unsure: The vector does not fully spell out the exact four-cell winning window through c4r4 on the current board, and lookahead marks both moves as losing overall, so I cannot say the better move avoids defeat entirely—only that this played move specifically hands over the immediate c4r4 tactic while the better move preserves more of your own threats.

### eval-15 — double_threat  (tag=major_threat_parity, dir=missed_own)
- board_state: `3333302555551413111222444416`  | played col 0 (0-idx) | correct col 2 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=loss_with_best_play · case=better_holds_played_loses
  - **A0** bm=3 played=loss best=win conf=medium | key_cells: c3r5,c1r3,c1r5,c1r4,c1r2
    - mech: The blunder was missing column 3, which would have increased your parity-aligned major threats from one to two by adding c1r5 while keeping c1r3, giving you a winning position with best play. Instead, the played move removed your only major…
    - unsure: The vector does not fully specify the exact forcing continuation after the better move or the exact opponent punishment sequence after the played move. It also shows an immediate threat at c1r3 after the played move while threatStats.played omits player major threats, so I avoided claiming more than the outcome and the major/minor contrast explicitly supported by the fields.
  - **A1** bm=3 played=loss best=win conf=high | key_cells: c1r3,c1r5,c1r4,c3r5
    - mech: Playing column 3 was stronger because it increased your parity-aligned major threats from one to two, specifically adding c1r5 while keeping c1r3, whereas the played move lost your only major threat and left you with only minor threats. The…
    - unsure: The vector does not identify the actual played column explicitly, and the projected immediate threat at c1r3 in lookahead is future-only rather than present on the current board; I also cannot fully reconstruct the exact continuation from the provided fields alone.
  - **B0** bm=3 played=loss best=loss conf=low | key_cells: 
    - mech: I can tell only that column 3 was evaluated as better than the played column 1, but the vector provides no tag, threat, pattern, or lookahead data to show the concrete tactical reason. Since both outcome fields are also absent, the load-bea…
    - unsure: The vector does not provide tag, direction, threatStats, patterns, lookahead, or outcome fields, so I cannot determine whether the mistake was tactical, defensive, parity-based, center-related, or only a small positional downgrade; I also cannot determine the with-best-play outcomes of the played and better moves from the provided fields alone.
  - **B1** bm=3 played=loss best=loss conf=medium | key_cells: c3r4,c4r4,c5r4,c6r4,c1r3
    - mech: Column 3 was better than column 1 because it is the only move here that immediately completes your four-in-a-row on row 4 from c3r4 through c6r4. Playing column 1 at c1r3 does not address that winning line, so you miss an available immediat…
    - unsure: The vector omits tag, direction, threatStats, patterns, and lookahead, so I cannot verify the classifier's named blunder type or the exact forced continuation after either move; the win/loss outcomes are only inferable from the board position itself.
  - **C0** bm=3 played=loss best=win conf=high | key_cells: c1r3,c1r5,c1r4,c3r5,c1r2
    - mech: The blunder was missing a parity-aligned major threat: playing column 3 would have increased your major parity threats from one to two, specifically at c1r3 and c1r5, and with best play that line is winning. Instead, the played move left yo…
    - unsure: The vector does not include the movestring, so I cannot reconstruct the full board or explain the exact four-in-a-row windows behind c1r3, c1r5, and c1r4. The lookahead also projects some structures several plies ahead, so I cannot claim those were already present on the current board beyond what threatStats explicitly says.
  - **C1** bm=3 played=loss best=win conf=high | key_cells: c1r3,c1r5,c1r4,c3r5
    - mech: The blunder was missing column 3, which would have strengthened your parity-aligned major threats instead of downgrading them. After the better move, you would have two major parity threats at c1r3 and c1r5, while after the played move thos…
    - unsure: The vector does not give the movestring, so I cannot reconstruct the full board or explain the exact four-cell windows behind c1r3, c1r5, or c3r5. The lookahead decisiveLine appears only deep in the search, so I cannot claim that c1r3 was already winning on the current board.

### eval-29 — double_threat  (tag=double_threat, dir=enabled_opponent)
- board_state: `332`  | played col 2 (0-idx) | correct col 4 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=loss_with_best_play · case=better_holds_played_loses
  - **A0** bm=5 played=loss best=win conf=high | key_cells: c3r2,c5r1,c1r1
    - mech: Playing column 3 at c3r2 was a blunder because it enabled the opponent's immediate double threat: from the pre-move board, the opponent has immediate winning cells at c1r1 and c5r1, and your played move does not take that tactic away. The b…
    - unsure: The vector identifies the opponent's immediate double-threat cells on the pre-move board, but it does not explicitly show the exact four-cell winning windows through c1r1 and c5r1, so I cannot name those full lines without reconstructing more than the vector states.
  - **A1** bm=5 played=loss best=win conf=high | key_cells: c3r2,c5r1,c1r1,c2r1
    - mech: Playing column 3 at c3r2 was a blunder because it enabled the opponent to have an immediate double threat on c1r1 and c5r1: two win-in-one threats at once, so one reply cannot cover both. By contrast, the better move was column 5 to c5r1, w…
    - unsure: The vector identifies the opponent's immediate double-threat cells from the pre-move board, but it does not spell out the exact four-in-a-row windows those cells complete or the full forcing sequence after the blunder.
  - **B0** bm=5 played=draw best=draw conf=low | key_cells: c3r2,c5r1
    - mech: The vector only establishes that column 5 was a better choice than the played column 3, but it provides no tag, threat statistics, pattern maps, or lookahead showing a concrete tactical punishment. From the board after movestring 332, this …
    - unsure: The vector does not provide tag, gapBucket, patterns, threatStats, or lookahead, so I cannot determine the exact blunder mechanism, whether center control was the issue, or the with-best-play outcomes beyond inferring that both moves likely hold since no outcome fields are present.
  - **B1** bm=5 played=draw best=draw conf=low | key_cells: 
    - mech: I can't ground a specific blunder mechanism from this vector because it only tells us that column 5 was preferred over the played column 3 in the position after movestring 332. No tag, threat, pattern, or lookahead data is present, so the o…
    - unsure: The vector does not provide tag, direction, gapBucket, threatStats, patterns, lookahead, or outcome fields, so I cannot determine whether the mistake was tactical, defensive, parity-based, center-related, or even what the with-best-play outcomes were for either move.
  - **C0** bm=5 played=loss best=win conf=medium | key_cells: c1r1,c5r1
    - mech: Playing column 3 was a blunder because it enabled the opponent to have an immediate double threat: the opponent's winning cells are c1r1 and c5r1, and a single block cannot cover both. By contrast, the better move was column 5, which avoide…
    - unsure: The vector identifies the opponent's immediate double-threat cells on the pre-move board, but it does not spell out the exact move-by-move geometry of how your played move at c3r2 specifically hands that fork over rather than the better move at c5r1 preventing it.
  - **C1** bm=5 played=loss best=win conf=high | key_cells: c1r1,c5r1
    - mech: Playing column 3 was a blunder because it enabled the opponent's immediate double threat: from the pre-move position, the opponent already had immediate threats at c1r1 and c5r1, and together they form a fork you cannot block with one move.…
    - unsure: The vector shows the opponent's fork cells on the pre-move board, but it does not explicitly show the opponent's post-played-move pattern snapshot, so I cannot specify the exact move-by-move punishment sequence beyond that the played move loses and the better move wins with best play.

### eval-38 — overcut  (tag=overcut, dir=missed_own)
- board_state: `3253336324221646166`  | played col 3 (0-idx) | correct col 1 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=2 played=loss best=loss conf=high | key_cells: c2r3,c4r6,c5r4,c5r6,c1r2
    - mech: The mistake was missing the overcut available by playing column 2 to c2r3. After the better move, the vector shows your overcut structure at c5r4/c5r6 and two parity-aligned major threats (at c1r2 and c5r6), while the played move to c4r6 cr…
    - unsure: The vector does not specify the exact winning line of the missed overcut on the current board, only that the overcut pattern would exist after the better move. The lookahead also says both moves lose with best play, so this was a structural improvement that still did not save the game.
  - **A1** bm=2 played=loss best=loss conf=high | key_cells: c2r3,c4r6,c5r4,c5r6,c1r2
    - mech: The mistake was missing an overcut: playing column 2 to c2r3 would have created your overcut structure, while the played move to c4r6 did not. After the better move, you would have had two parity-aligned major threats at c1r2 and c5r6, and …
    - unsure: The vector identifies the better move as an overcut and gives the key cells, but it does not fully specify the exact four-in-a-row windows that make the overcut work, so I cannot describe that geometry more concretely without guessing.
  - **B0** bm=2 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 2 was evaluated as at least as good as the played column 4, but this vector includes no tag, threat, pattern, or lookahead data showing a concrete tactical reason. From the board alone, I cannot reproducibly iden…
    - unsure: The vector omits tag, gapBucket, threatStats, patterns, and lookahead, so it does not reveal whether the difference was tactical, positional, parity-based, or just a tiebreak between drawing moves. Because no outcome fields are present, I also cannot determine from the supplied vector whether either move was a win, draw, or loss with best play; I am defaulting to draw/draw only because no contrary evidence is provided.
  - **B1** bm=2 played=draw best=draw conf=low | key_cells: c2r3,c4r4
    - mech: I can tell only that column 2 was evaluated as at least as good as the played column 4, but this vector omits the blunder tag, threat maps, and lookahead, so it does not expose the concrete tactical or strategic reason. From the board alone…
    - unsure: The vector does not provide tag, direction, gapBucket, threatStats, patterns, or lookahead, so I cannot determine whether the issue was a missed threat, a defensive miss, a parity/center issue, or even the with-best-play outcomes; the draw outcomes are therefore uncertain.
  - **C0** bm=2 played=loss best=loss conf=high | key_cells: c2r3,c4r6,c5r4,c5r6,c1r2
    - mech: The mistake was missing an overcut: playing column 2 to c2r3 would have created your overcut structure on c5r4 and c5r6, and it also would have given you two parity-aligned major threats at c1r2 and c5r6. By playing column 4 to c4r6 instead…
    - unsure: The vector identifies the overcut cells and the threat counts, but it does not spell out the exact four-in-a-row windows those cells belong to, so I cannot describe the full geometric continuation beyond saying the better move creates the overcut and parity-aligned major threats.
  - **C1** bm=2 played=loss best=loss conf=high | key_cells: c2r3,c5r4,c5r6,c1r2,c4r6
    - mech: The mistake was missing an overcut: playing column 2 to c2r3 would have created your overcut structure based on c5r4 and c5r6, and it also would have turned c1r2 and c5r6 into your parity-aligned major threats. The played move to c4r6 did n…
    - unsure: The vector identifies the overcut cells and the resulting major threats, but it does not fully spell out the exact move-by-move parity geometry of why that overcut works on this board, so I cannot describe that internal tactic more concretely without guessing.

### eval-42 — forced_win  (tag=forced_win, dir=enabled_opponent)
- board_state: `412225155414`  | played col 2 (0-idx) | correct col 4 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=5 played=loss best=loss conf=medium | key_cells: c3r4,c4r2
    - mech: Playing column 3 at c3r4 is tagged as enabling an opponent forced win. The concrete load-bearing feature is the opponent's parity-aligned major threat at c4r2, which already exists before the move and is still present after both moves; afte…
    - unsure: The vector does not let me reconstruct the exact full forcing sequence move-by-move from c4r2, and it also shows both moves lose with best play, so the precise sense in which column 5 is 'better' is not fully explicit beyond being the engine's preferred line.
  - **A1** bm=5 played=loss best=loss conf=medium | key_cells: c3r4,c5r4,c4r2,c3r5,c4r3
    - mech: The move to column 3 let the opponent keep building around the c4 file: they already had a latent parity-aligned major threat at c4r2 before the move, and after the blunder the search immediately still sees opponent threats rooted at c4r2 a…
    - unsure: The vector does not show the full exact forcing sequence move-by-move, and the pre-move opponent immediate threat at c5r5 in patternsOpponent conflicts with the latent-major picture in threatStats, so I cannot state precisely which single reply was mandatory from the root without guessing.
  - **B0** bm=5 played=loss best=loss conf=low | key_cells: 
    - mech: I can tell only that column 5 was evaluated as better than the played column 3, but the vector gives no tag, threat, pattern, or lookahead data explaining why. From the movestring alone, the board position is reconstructible, but without th…
    - unsure: The vector omits tag, direction, gapBucket, threatStats, patterns, and lookahead, so I cannot determine the concrete tactical or positional reason column 5 is better than column 3, nor can I determine the with-best-play outcomes of either move from the provided data alone.
  - **B1** bm=5 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 5 was evaluated as at least as good as the played column 3, but this pruned vector gives no tag, threat, pattern, or lookahead data to show the concrete reason. From the available fields alone, the move is only i…
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, and lookahead, so I cannot determine the actual mistake type, any concrete threat cells, or the with-best-play outcomes for either move from the provided data alone.
  - **C0** bm=5 played=loss best=loss conf=medium | key_cells: c3r4,c5r4,c4r2,c5r5
    - mech: The mistake was not that column 3 immediately loses while column 5 saves the game; both moves still lose with best play. The load-bearing issue is that your move to c3r4 is classified as enabling an opponent forced win: after it, the oppone…
    - unsure: The vector does not cleanly identify a single concrete board tactic that only the played move creates, because the lookahead case is losing_either_way and both moves have loss outcomes; it only supports that the played move enabled the opponent's forced-win structure rather than showing a full unique move-by-move refutation on the current board.
  - **C1** bm=5 played=loss best=loss conf=medium | key_cells: c4r2,c5r4,c5r5,c3r4,c5r4
    - mech: This was not a saveable position either way, but your move still helped the opponent's plan: the blunder is classified as enabling an opponent forced win, and the opponent already has a parity-aligned major threat at c4r2 before the move. P…
    - unsure: The vector is internally mixed about timing: patternsOpponent marks c5r5 as an opponent immediate threat on the pre-move board, while lookahead's decisive line focuses on c4r2 later, and both moves are losing with the played move actually losing slower. So I cannot say the played move is worse because it loses faster; only that it is tagged as enabling the opponent's forced win and leaves their key threat structure intact.

### eval-43 — forced_win  (tag=forced_win, dir=missed_own)
- board_state: `4122251554142`  | played col 6 (0-idx) | correct col 4 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=win_with_best_play · case=both_moves_hold_better_stronger
  - **A0** bm=5 played=win best=win conf=medium | key_cells: c5r4,c5r5,c4r2,c4r3
    - mech: Playing column 5 at c5r4 was stronger because it immediately created a winning threat at c5r5 and increased your major threats from one to two, including a new non-parity major at c4r3. The played move to c7r1 still wins with best play, but…
    - unsure: The vector does not fully specify the exact continuation proving the forced win, so I cannot name every intermediate move or explain precisely why the played line wins faster despite being classified as the weaker choice.
  - **A1** bm=5 played=win best=win conf=high | key_cells: c5r4,c5r5,c4r2,c4r3
    - mech: Playing column 5 to c5r4 was stronger because it created an immediate winning threat at c5r5 on the very next board, while the played move to c7r1 did not. The best line also preserved more forcing attacking structure for you: after the bet…
    - unsure: The vector does not fully specify the exact forced winning sequence after the played move, and the lookahead examples include future structures at later plies that should not be treated as already present on the board.
  - **B0** bm=5 played=loss best=loss conf=low | key_cells: c5r3,c7r1
    - mech: I can tell only that column 5 was evaluated as better than the played column 7 from this position, but the provided vector contains no tag, threat, pattern, or lookahead data explaining the tactical reason. Reconstructing the board from mov…
    - unsure: The vector omits tag, direction, gapBucket, threatStats, patterns, and lookahead, so I cannot determine whether the mistake was about a missed own threat, a failure to block, parity, center control, or a specific future tactic; I also cannot determine the with-best-play outcomes from the provided fields alone.
  - **B1** bm=5 played=loss best=loss conf=low | key_cells: 
    - mech: The vector is too sparse to identify a concrete tactical feature: it only says column 5 was better than the played column 7, but both moves still lose with best play. So the blunder is only that column 7 loses more badly than column 5 in a …
    - unsure: The vector omits tag, direction, lookahead, threatStats, patterns, and outcome fields, so I cannot determine the specific tactical/positional reason, the exact winning mechanism for the opponent, or any grounded key cells beyond reconstructing the board from movestring.
  - **C0** bm=5 played=win best=win conf=medium | key_cells: c5r4,c5r5,c4r3,c4r2
    - mech: Column 5 was better because it immediately created a winning threat at c5r5 and increased your major threats from one to two, adding a new major at c4r3. The played move in column 7 still wins with best play, but it missed that stronger for…
    - unsure: The vector does not let me reconstruct the exact forced winning continuation move-by-move, and the outcomeTiming numbers conflict with decisiveLine.fastSide, so I did not rely on those timings to claim which line wins faster.
  - **C1** bm=5 played=win best=win conf=medium | key_cells: c5r4,c5r5,c4r2
    - mech: Column 5 was better because after the best move you create an immediate winning threat at c5r5, and the lookahead says that line is the stronger forced win. The played move to column 7 still wins with best play, but it misses that direct fo…
    - unsure: The vector shows that both moves win with best play, but it does not fully expose the exact forcing continuation after each move, so I cannot specify the complete winning sequence beyond the immediate threat at c5r5 and the projected pressure around c4r2.

### eval-49 — z_threat  (tag=z_threat, dir=missed_own)
- board_state: `33241034112213235544401245230150005`  | played col 6 (0-idx) | correct col 5 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=draw_with_best_play · case=both_moves_hold_better_stronger
  - **A0** bm=6 played=draw best=win conf=high | key_cells: c6r6,c7r1,c7r2
    - mech: Column 6 was stronger because it preserved your parity-aligned major threat on c7r2 and, with best play, that threat becomes an immediate winning move within 2 plies. By playing column 7 instead, you only reached a drawn position, missing t…
    - unsure: The vector shows c7r2 as the winning focal square, but it does not specify the full four-cell winning window or the exact continuation sequence beyond that this immediate threat appears on the best line by ply 2.
  - **A1** bm=6 played=draw best=win conf=medium | key_cells: c6r6,c7r1,c7r2
    - mech: Playing column 6 would have kept your parity-aligned major threat on c7r2 and, with best play, converted it into an immediate winning threat within 2 plies. Instead, the played move in column 7 only held a draw, so the blunder was missing t…
    - unsure: The vector shows that c7r2 is the key winning cell and that the best line realizes an immediate threat there on ply 2, but it does not fully spell out the exact intervening move sequence or why the played line's immediate threat on c7r2 does not also force a win.
  - **B0** bm=6 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 6 was evaluated as better than the played column 7, but the vector provides no tag, threat, pattern, or lookahead data to identify the concrete tactical or positional reason. From the board alone, I should not in…
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, and lookahead, so I cannot determine the specific board feature that makes column 6 better than column 7, nor can I determine whether either move wins, draws, or loses with best play.
  - **B1** bm=6 played=loss best=loss conf=low | key_cells: 
    - mech: I can tell only that column 6 was evaluated better than the played column 7 in a position where both moves still lose with best play. The provided vector contains no tag, lookahead, threat, pattern, or cell-grounding fields, so the concrete…
    - unsure: The vector does not include tag, gapBucket, lookahead, threatStats, patterns, playedCell, bestCell, or outcome fields, so I cannot determine the specific blunder mechanism or any grounded key cells from the supplied data alone.
  - **C0** bm=6 played=draw best=win conf=medium | key_cells: c6r6,c7r1,c7r2
    - mech: Column 6 was stronger because it preserved and converted your parity-aligned threat at c7r2 into a winning sequence; the lookahead shows the win appears on the better line, with c7r2 as the completing cell. By playing column 7 instead, you …
    - unsure: The vector identifies c7r2 as the key winning cell and labels the motif as a z_threat, but it does not spell out the full underlying four-cell window or why the played line's immediate_threat at c7r2 does not still force a win.
  - **C1** bm=6 played=draw best=win conf=high | key_cells: c6r6,c7r1,c7r2
    - mech: The blunder was missing a z-threat-based winning plan: playing column 6 would have preserved your parity-aligned major threat at c7r2 and, with best play, turned it into an immediate winning threat two plies later. Instead, playing column 7…
    - unsure: The vector shows that c7r2 is the key winning cell and that the best line realizes an immediate threat there on ply 2, but it does not specify the exact intervening moves or the full four-cell winning window through c7r2.

### eval-51 — figure_7  (tag=figure_7, dir=enabled_opponent)
- board_state: `4333345154`  | played col 0 (0-idx) | correct col 5 (0-idx)
- oracle outcomes: best=draw_with_best_play · postBlunder=loss_with_best_play · case=better_holds_played_loses
  - **A0** bm=6 played=loss best=draw conf=medium | key_cells: c6r3,c6r4,c5r5,c4r1,c5r2,c4r3,c5r3,c1r1
    - mech: Playing column 1 was a tactical mistake because it turns a drawable position into a loss, while column 6 would have held the draw. The concrete board feature is that after the better move to c6r3, you would have an immediate winning threat …
    - unsure: The vector labels the blunder as enabled_opponent figure_7, but it does not give a post-blunder opponent figure_7 cell set directly, so I cannot name the exact figure-7 cells created after the played move beyond the opponent's pre-move j-shape and immediate threat.
  - **A1** bm=6 played=loss best=draw conf=medium | key_cells: c6r3,c6r4,c5r5,c4r1,c5r2,c4r3,c5r3
    - mech: Playing column 1 was a tactical mistake because it let the position slip from a drawable line to a losing one. The better move was column 6, landing on c6r3, which would have created your immediate winning threat at c6r4 and held the game; …
    - unsure: The vector does not show the opponent's post-blunder pattern snapshot directly, so I cannot specify the exact move-by-move punishment sequence after the played move beyond the draw-to-loss flip and the opponent-side immediate/J-shape structure supplied from the pre-move board.
  - **B0** bm=6 played=loss best=loss conf=low | key_cells: 
    - mech: The vector only tells us that column 6 was evaluated as better than the played column 1 from this position, but it does not include the tag, threat stats, patterns, or lookahead needed to identify the concrete tactical or positional mechani…
    - unsure: The vector omits tag, direction, gapBucket, patterns, threatStats, and lookahead, so I cannot tell whether column 1 missed your own threat, failed to block, enabled an opponent tactic, or merely lost faster/slower than column 6. The with-best-play outcomes are also not provided, so their values cannot be determined from the vector alone.
  - **B1** bm=6 played=loss best=loss conf=low | key_cells: 
    - mech: I can only tell that column 6 was evaluated as better than the played column 1, but the vector provides no tag, threat, pattern, or lookahead explaining why. From the movestring alone, both moves must still lose with best play, but the conc…
    - unsure: The vector omits tag, gapBucket, threatStats, patterns, and lookahead, so I cannot determine the actual blunder mechanism, the concrete key cells, or the with-best-play outcomes from engineered fields rather than guess from the board.
  - **C0** bm=6 played=loss best=draw conf=medium | key_cells: c1r1,c6r3,c6r4,c5r5,c4r1,c5r2,c4r3,c5r3
    - mech: Playing column 1 at c1r1 was a tactical mistake because it turned a drawable position into a losing one, while column 6 would have held the draw. The vector classifies the mistake as enabling the opponent's figure_7/J-shape-based attack: be…
    - unsure: The vector does not show the opponent's post-blunder pattern map or the exact forced continuation, so I cannot specify the precise move sequence by which the enabled figure_7 converts the played line into a loss.
  - **C1** bm=6 played=loss best=draw conf=medium | key_cells: c6r3,c6r4,c5r5,c4r1,c5r2,c4r3,c5r3,c1r1
    - mech: Playing column 1 was a tactical mistake because it turns a drawable position into a loss, while column 6 would have held the draw. The concrete board feature is that after the better move to c6r3, you have an immediate winning threat at c6r…
    - unsure: The vector does not show the opponent's post-blunder figure_7 cells directly, only the classifier tag and the opponent's pre-move J-shape/immediate-threat context, so I cannot name the exact post-blunder figure_7 squares or its full forcing sequence.

### eval-56 — odd_even_threat  (tag=j_shape, dir=enabled_opponent)
- board_state: `3333646366013500541441`  | played col 0 (0-idx) | correct col 6 (0-idx)
- oracle outcomes: best=None · postBlunder=None · case=losing_either_way
  - **A0** bm=7 played=loss best=loss conf=medium | key_cells: c5r3,c4r4,c5r5,c4r5,c7r5,c3r5
    - mech: The played move is tagged as enabling an opponent j-shape: the opponent already has the J-shaped cluster on c5r3, c4r4, c5r5, and c4r5, and after your move that structure is the load-bearing source of their attack. The comparison is only ma…
    - unsure: The vector does not show patternsPostBlunder or the exact best/played board states, so I cannot pin down the exact forcing sequence from the j-shape on the current board; the j-shape and c3r5 win are only justified through the provided opponent pattern snapshot and projected lookahead.
  - **A1** bm=7 played=loss best=loss conf=medium | key_cells: c5r3,c4r4,c5r5,c4r5,c7r5
    - mech: The blunder is that your move enabled an opponent j-shape built on c5r3, c4r4, c5r5, and c4r5; that structure is the classifier's named reason this move is worse. The better move to column 7 would also lose with best play, but it removes on…
    - unsure: The vector does not show bestCol's exact played-line board snapshot, so I cannot prove from current-board patterns alone exactly how the played move triggers the j-shape versus merely failing to reduce it; the j-shape evidence comes from opponent-side pattern/search annotations rather than a post-blunder opponent snapshot on the board.
  - **B0** bm=7 played=loss best=loss conf=low | key_cells: 
    - mech: The vector only establishes that column 7 was better than the played column 1, but that both moves still lose with best play. With no tag, lookahead, threat stats, patterns, or landing-cell fields present, the specific tactical or positiona…
    - unsure: I cannot determine the concrete mechanism, key threat cells, or whether this was tactical, defensive, parity-related, or merely slower-losing, because tag, direction, lookahead, patterns*, threatStats, playedCell, and bestCell are all absent.
  - **B1** bm=7 played=draw best=draw conf=low | key_cells: 
    - mech: I can tell only that column 7 was evaluated as at least as good as the played column 1, but this sparse vector gives no tag, threat, pattern, or lookahead data explaining the concrete tactical or strategic reason. So the move looks suboptim…
    - unsure: The vector omits tag, gapBucket, patterns, threatStats, and lookahead, so I cannot determine the specific mechanism, any decisive cells, or even whether the edge is tactical, positional, or just a tiebreak-level preference.
  - **C0** bm=7 played=loss best=loss conf=medium | key_cells: c5r3,c4r4,c5r5,c4r5,c7r5,c1r4,c7r5
    - mech: The played move is classified as enabling an opponent j-shape: the opponent already has a J-shaped cluster on c5r3, c4r4, c5r5, and c4r5, and playing c1r4 does not disrupt it. Compared with the better move to column 7, your move also leaves…
    - unsure: The vector does not show the pre-move board directly, so I cannot specify exactly how column 7 would have reduced the opponent's j-shape-related chances, only that the classifier marks j_shape as the blunder type and that c7r5 remains an opponent minor threat after the played move but not after the better move.
  - **C1** bm=7 played=loss best=loss conf=medium | key_cells: c1r4,c7r5,c5r3,c4r4,c5r5,c4r5
    - mech: The played move was tagged as enabling an opponent j-shape: the opponent already had that J-shaped cluster on the pre-move board at c5r3, c4r4, c5r5, and c4r5, and playing c1r4 did not disrupt it. Compared with the better move to column 7, …
    - unsure: The vector does not show the post-played-board opponent pattern map, so I cannot prove from the vector alone exactly how the played move activates the j-shape beyond the classifier tag and the preserved opponent structure. The lookahead only gives projected future tactics, so I cannot claim any deeper immediate board tactic is already present now.

### eval-59 — claimeven  (tag=minor_threat, dir=missed_own)
- board_state: `4452223644442533255526033003005061`  | played col 1 (0-idx) | correct col 6 (0-idx)
- oracle outcomes: best=win_with_best_play · postBlunder=win_with_best_play · case=both_moves_hold_better_stronger
  - **A0** bm=7 played=win best=win conf=medium | key_cells: c7r4,c7r5,c7r6,c2r2,c2r3,c2r5
    - mech: This was a missed-own minor-threat mistake: playing column 7 at c7r4 would have kept your existing parity-aligned major threats on c2r3 and c2r5 while also adding two minor threats on c7r5 and c7r6. By playing column 2 at c2r2 instead, you …
    - unsure: The vector does not spell out the exact four-cell windows behind the c7r5/c7r6 minor threats or the precise continuation proving why the column-7 line is considered stronger than the played line beyond those structural differences.
  - **A1** bm=7 played=win best=win conf=medium | key_cells: c2r3,c2r5,c7r5,c7r6
    - mech: Column 7 was better because it preserved your existing parity-aligned major threats at c2r3 and c2r5 and also added minor pressure on c7r5 and c7r6. By playing column 2 instead, you converted c2r3 into an immediate threat on the board, but …
    - unsure: The vector shows that column 7 is structurally stronger, but it does not fully explain why that structure is preferable even though the played move appears to reach a win sooner in outcomeTiming; I cannot justify more than the feature differences the vector explicitly gives.
  - **B0** bm=7 played=loss best=loss conf=low | key_cells: 
    - mech: I can only ground this as a positional/suboptimal mistake: the engine preferred column 7 over the played column 2, but the provided vector includes no tag, threat, pattern, or lookahead data identifying a specific tactical reason. Since bot…
    - unsure: The vector omits tag, direction, gapBucket, playedCell, bestCell, threatStats, patterns*, and lookahead, so I cannot determine the concrete blunder mechanism, any key tactical cells, or the with-best-play outcomes for the played and better moves.
  - **B1** bm=7 played=loss best=loss conf=low | key_cells: 
    - mech: Column 7 was the better move because, from this position, both moves still lose with best play, so the blunder is not that column 2 immediately hands over a win but that it is a weaker losing move than column 7. From the vector given, no co…
    - unsure: The vector omits tag, direction, threatStats, patterns, and lookahead, so it does not let me determine the specific tactical or positional mechanism, any key threat cells, or explicitly verify the best-play outcomes beyond inferring this was a blunder comparison where the better move was still available.
  - **C0** bm=7 played=win best=win conf=medium | key_cells: c7r4,c7r5,c2r2,c2r3
    - mech: This was only a small missed-own mistake: both moves still win with best play, but column 7 was the stronger setup. Playing column 7 would have turned c7r5 into an immediate threat right away, while the played move to c2r2 instead made c2r3…
    - unsure: The vector shows that both moves are winning and that column 7 is considered stronger, but it does not fully explain in concrete board terms why the engine prefers the c7r5 immediate-threat route over the c2r3 immediate-threat route beyond those categorized differences.
  - **C1** bm=7 played=win best=win conf=medium | key_cells: c7r4,c7r5,c2r2,c2r3
    - mech: Column 7 was better because it kept your stronger route: after the best move, c7r5 becomes an immediate threat, while your played move in column 2 instead cashes in the immediate threat at c2r3. Both moves still win with best play, but the …
    - unsure: The vector does not fully specify the exact four-cell winning windows behind c7r5 or c2r3, so I cannot state the complete line geometry beyond the listed threat cells and timing.