# Feature-Vector Sufficiency Report — fv_suff_answers_boards_2026-08-06T16-04-29Z.jsonl

Graded with the condition-D rubric (A1–A7 + G1–G7). Vectors source: `connect-four/server/scripts/reason_corpus/evidence.jsonl` (each answers row also embeds its own `feature_vector`, which is what was read).

## Summary
- Answer rows: 126   parse failures: 0
- Cases (id × condition): 63   passed (A1–A7 **and** G1–G7 on all runs): 5   failed: 58   intermittent: 31
- Per-axis pass rate (over all 126 gradeable runs): A1 126/126 · A2 126/126 · A3 99/126 · A4 101/126 · A5 116/126 · A6 76/126 · A7 55/126
- Per-check pass rate (condition D): G1 126/126 · G2 108/126 · G3 120/126 · G4 118/126 · G5 116/126 · G6 126/126 · G7 103/126
- A7 sub-test failures: A7a 26 · A7b 38 · A7c 31 · A7d 35  (a run can fail more than one)

## Pass/fail by condition  (§6 ablation)

| condition | cases | passed | A3 | A4 | A5 | A6 | A7 |
|---|---|---|---|---|---|---|---|
| D | 63 | 5 | 99/126 | 101/126 | 116/126 | 76/126 | 55/126 |

This run contains **only condition D** — there is no A/B/C arm to compare against, so the A-vs-B-vs-C
delta the spec's §6 asks for cannot be computed from this file. What the single column does say: the
sanity axes are saturated (A1 126/126, A2 126/126 — the model always reads the
Decision block correctly), and the loss is concentrated in **A7 (55/126)** and **A6
(76/126)** — usefulness and actionability, not truth (A4 101/126).

## Per-case verdict

| id | category | cond | A1 | A2 | A3 | A4 | A5 | A6 | A7 | G2 | G5 | G7 | pass | interm. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| eval-1 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | 1/2 | fail | yes |
| eval-2 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | **pass** |  |
| eval-3 | win_to_lose | D | pass | pass | pass | pass | pass | fail | 1/2 | pass | pass | pass | fail | yes |
| eval-4 | win_to_lose | D | pass | pass | pass | 1/2 | pass | fail | 1/2 | pass | pass | 1/2 | fail | yes |
| eval-5 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | fail | fail(A7b,A7d) | pass | pass | pass | fail |  |
| eval-6 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | 1/2 | fail(A7a,A7d) | pass | pass | 1/2 | fail | yes |
| eval-7 | win_to_lose | D | pass | pass | 1/2 | pass | pass | 1/2 | 1/2 | 1/2 | pass | pass | fail | yes |
| eval-8 | win_to_lose | D | pass | pass | fail | pass | pass | pass | fail(A7b,A7d) | fail | pass | fail | fail |  |
| eval-9 | win_to_draw | D | pass | pass | fail | pass | pass | pass | fail(A7b,A7d) | pass | pass | pass | fail |  |
| eval-10 | win_to_draw | D | pass | pass | pass | pass | pass | 1/2 | 1/2 | pass | pass | pass | fail | yes |
| eval-11 | win_to_lose | D | pass | pass | fail | 1/2 | 1/2 | pass | fail(A7b,A7c,A7d,A7a) | fail | pass | fail | fail |  |
| eval-12 | win_to_lose | D | pass | pass | 1/2 | pass | pass | fail | fail(A7b,A7c,A7d,A7a) | fail | pass | pass | fail |  |
| eval-13 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | 1/2 | fail(A7b,A7c) | pass | pass | 1/2 | fail | yes |
| eval-14 | lose_to_faster_lose | D | pass | pass | pass | 1/2 | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-15 | win_to_draw | D | pass | pass | 1/2 | pass | 1/2 | 1/2 | fail(A7a,A7b,A7d,A7c) | pass | pass | 1/2 | fail | yes |
| eval-16 | win_to_draw | D | pass | pass | 1/2 | pass | 1/2 | fail | fail(A7b,A7c,A7d,A7a) | pass | pass | 1/2 | fail |  |
| eval-17 | win_to_draw | D | pass | pass | 1/2 | pass | pass | 1/2 | fail(A7b,A7d,A7c) | pass | pass | pass | fail | yes |
| eval-18 | win_to_lose | D | pass | pass | pass | pass | pass | 1/2 | fail(A7a,A7c) | pass | pass | pass | fail | yes |
| eval-19 | win_to_draw | D | pass | pass | pass | pass | fail | pass | fail(A7a,A7c) | pass | pass | pass | fail |  |
| eval-20 | win_to_lose | D | pass | pass | 1/2 | 1/2 | 1/2 | 1/2 | fail(A7a,A7b,A7c,A7d) | fail | pass | 1/2 | fail |  |
| eval-21 | lose_to_faster_lose | D | pass | pass | pass | fail | pass | 1/2 | fail(A7d) | pass | pass | pass | fail | yes |
| eval-22 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | fail(A7b,A7c) | pass | pass | pass | fail |  |
| eval-23 | lose_to_faster_lose | D | pass | pass | pass | pass | 1/2 | pass | 1/2 | pass | pass | 1/2 | fail | yes |
| eval-24 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | fail | fail(A7b,A7d) | pass | pass | 1/2 | fail |  |
| eval-25 | win_to_lose | D | pass | pass | fail | pass | pass | pass | fail(A7a,A7b,A7d) | fail | pass | fail | fail |  |
| eval-26 | win_to_lose | D | pass | pass | pass | pass | pass | 1/2 | fail(A7c,A7a) | pass | pass | pass | fail | yes |
| eval-27 | win_to_draw | D | pass | pass | fail | pass | pass | pass | fail(A7b,A7d) | pass | pass | fail | fail |  |
| eval-28 | win_to_draw | D | pass | pass | pass | 1/2 | pass | pass | 1/2 | 1/2 | pass | pass | fail |  |
| eval-29 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | fail(A7a,A7d) | pass | pass | pass | fail |  |
| eval-30 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | fail(A7c) | pass | pass | pass | fail |  |
| eval-31 | win_to_lose | D | pass | pass | pass | 1/2 | pass | 1/2 | 1/2 | 1/2 | pass | pass | fail | yes |
| eval-32 | draw_to_lose | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-33 | draw_to_lose | D | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | **pass** |  |
| eval-34 | win_to_draw | D | pass | pass | pass | pass | pass | fail | pass | pass | pass | pass | fail |  |
| eval-35 | win_to_lose | D | pass | pass | pass | pass | pass | fail | 1/2 | pass | pass | pass | fail |  |
| eval-36 | draw_to_lose | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-37 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | **pass** |  |
| eval-38 | draw_to_lose | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-39 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | fail | pass | pass | pass | pass | fail |  |
| eval-40 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-41 | win_to_lose | D | pass | pass | pass | 1/2 | pass | fail | pass | pass | pass | pass | fail |  |
| eval-42 | lose_to_faster_lose | D | pass | pass | fail | fail | pass | pass | fail(A7a,A7c,A7d) | fail | fail | pass | fail |  |
| eval-43 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | fail(A7a,A7c) | pass | pass | pass | fail |  |
| eval-44 | draw_to_lose | D | pass | pass | 1/2 | pass | pass | pass | 1/2 | 1/2 | pass | 1/2 | fail | yes |
| eval-45 | draw_to_lose | D | pass | pass | pass | pass | pass | pass | 1/2 | pass | pass | pass | fail | yes |
| eval-46 | lose_to_faster_lose | D | pass | pass | pass | 1/2 | pass | pass | 1/2 | pass | pass | 1/2 | fail | yes |
| eval-47 | win_to_draw | D | pass | pass | fail | fail | pass | 1/2 | fail(A7b,A7c) | pass | pass | pass | fail |  |
| eval-48 | win_to_lose | D | pass | pass | pass | 1/2 | pass | 1/2 | pass | pass | pass | pass | fail | yes |
| eval-49 | win_to_draw | D | pass | pass | pass | pass | pass | 1/2 | pass | pass | fail | pass | fail | yes |
| eval-50 | win_to_draw | D | pass | pass | pass | pass | pass | fail | fail(A7c) | pass | pass | pass | fail |  |
| pin-L1-completes-your-tactic | win_to_lose | D | pass | pass | pass | 1/2 | pass | 1/2 | 1/2 | pass | fail | pass | fail | yes |
| pin-L2-enabled-opponent | win_to_lose | D | pass | pass | fail | fail | pass | pass | fail(A7b,A7c) | pass | fail | 1/2 | fail |  |
| pin-L3-no-causation | lose_to_faster_lose | D | pass | pass | fail | pass | 1/2 | pass | fail(A7a) | pass | pass | pass | fail | yes |
| pin-L4-missed-defense | draw_to_lose | D | pass | pass | pass | pass | 1/2 | 1/2 | pass | pass | pass | pass | fail | yes |
| pin-L5-deep-fork | win_to_draw | D | pass | pass | pass | 1/2 | 1/2 | fail | fail(A7c) | 1/2 | pass | pass | fail | yes |
| pin-L6-lost-win-and-gave-one | win_to_lose | D | pass | pass | 1/2 | 1/2 | pass | fail | pass | 1/2 | pass | 1/2 | fail |  |
| pin-L7-practical-swindle | lose_to_faster_lose | D | pass | pass | pass | 1/2 | pass | pass | pass | pass | pass | pass | fail | yes |
| pin-L8-draw-abandoned | draw_to_lose | D | pass | pass | pass | 1/2 | pass | pass | pass | pass | pass | pass | fail | yes |
| pin-L9-hedged-parity | win_to_lose | D | pass | pass | pass | 1/2 | pass | fail | fail(A7a,A7b,A7d) | pass | pass | pass | fail |  |
| pin-branch-invariance-false | draw_to_lose | D | pass | pass | pass | fail | pass | pass | 1/2 | pass | fail | fail | fail |  |
| pin-branch-invariance-true-1 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | **pass** |  |
| pin-branch-invariance-true-2 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | **pass** |  |
| pin-branch-invariance-true-3 | lose_to_faster_lose | D | pass | pass | 1/2 | pass | pass | pass | pass | pass | pass | pass | fail | yes |

### Notes on failing / intermittent cases

> **eval-1** (prompt_confusion) — Both defects are the model mishandling information the render already supplied: run 1 never wrote the column number even though render_decision.link.text opens with "Column 4 is your most stubborn defense" (A6), and run 0 emitted an unoffered [term:central] tag although render_decision.zones.terms is empty (G7b, silently dropped by dropUnoffered so annotationRepairs stayed []).
>
> render_decision is byte-identical across both runs (no divergence). Board check: after "3", visualize_board gives scr col4=-1 (best for Gray) and after 33 the mover (Green) is +1 vs +2 after 31 — confirms lose_to_faster_lose, both outcomes loss (A2 ok) and that col 4 is genuinely the more resistant defense (A3 ok). Centrality claim (col 4 sits in more four-in-a-row lines than col 2) is board-true; key_cells are pure zone expansions of col4/col2 overlays, so the Condition-D exception applies and no per-cell threat was asserted (A4 ok). A5b applies (player 2, opening): both runs hold-the-line framed, no defeatist clause, so L7 guardrail honored (G2 ok). A6 run 1: stripped prose reads "You needed the more central column ..." / "the edge-leaning column you chose" — the number 4 appears only inside the zone handle, which the rubric explicitly fails. G7 run 0: raw mechanism contains [term:central]central[/term:central] while render_decision.zones.terms === [] — no term vocabulary was offered at all; processAnnotations dropUnoffered stripped it, so the served text looks clean and annotationRepairs is [] (G7c did not fire). Minor, not charged: run 0 attributes "keep the practical swindle going" to the opponent, inverting whose resource the swindle is; run 1 says the opponent will "hold the tougher defense", which is the players role, not the opponents.

> **eval-3** (prompt_confusion) — Both runs fail A6 — neither mechanism ever says "column 2" even though the prompt Decision block prints "Better move: column 2 (lands at c2r1)" verbatim and a better-col->col2 zone alias was offered; run 0 additionally fails A7a/A7b by reducing the cause to a race ("finish ... before you can cash in your own") and pointing at an unnamed, unwrapped "deeper four-in-a-row line" while the offered opp-key-line handle went unused.
>
> A1/A2 verified: better_move 2 -> bestCol 1; visualize_board 333334 scr row gives col2=+1 (win) and col4=-3 (loss), matching case win_to_lose. | G4: render_decision.finalMovestring 33333410111003110004224555552222566666644 ends move 41 = X at c5r5 completing X on c2r5,c3r5,c4r5,c5r5 -> lostResource half board-true; opponentPunishment.finalMovestring 33333434011111000001222222444466666655 ends move 38 = O at c6r2 completing O on c3r2..c6r2 -> opponent half board-true. | A6 run 0: prose says only "play the column that preserves the key square" — no column named at all. A6 run 1: names "column 4" (the PLAYED column, correctly labelled) but never names column 2 as the better move. | A7a/A7b run 0: whole reason is the opponent taking their square and finishing first (the A7a FAIL pattern), and "a deeper four-in-a-row line" names a specific object with nothing locating it (also factually loose: opponent resolves at 31 plies vs your 34, so it is the SHALLOWER line). | G7: all emitted zone specs (future:c5r5, future:windows:c2r5..c5r5, future:c6r2, col4) expand from offered handles; roles match the wrapped phrases; annotationRepairs empty on both runs; the whole requiredSet (you-key-square, opp-key-square, you-key-line) was emitted in both runs. | render_decision is byte-identical across both runs. | Observation, not scored as a failure: opp-key-square/opp-key-line carry truthBoard "projectedDeep", but reasonBoardSelect.mjs builds projectedDeep from the FIRST deep half (lostResource.finalMovestring), where c6r2 is a GREEN disc and the opponent window never occurs — the future: prefix makes the alias a not-yet claim, so I did not fail G5, but the truthBoard label is inaccurate for the opponent half. | L6 guardrail asks to "name both lines with their horizons"; neither run states a horizon (34 / 31 plies were rendered as lostResource.pliesToEnd / opponentPunishment.pliesToEnd) — noted, not scored under G2(a).

> **eval-4** (prompt_confusion) — Both runs fail A6 — neither prose ever writes "column 2" although bestCol=1 is in render_decision.fieldPartition.rendered and offered as the better-col alias (spec col2); run 0 additionally mis-attributes opponentPunishment.entryCell c5r2 to the played move (col index 2 actually lands on c3r1 per visualize_board 3333342) and binds the you-key-square / opp-key-square handles to the wrong cell words (G7a).
>
> A4 run 0: prose says "By playing the move that lands on c5r2" — playedCol=2 lands on c3r1 (visualize_board 3333342, move 7 = c3r1); c5r2 is opponentPunishment.entryCell, an opponent disc. Board-contradicted claim. | A6 both runs: cleaned prose never names column 2. Run 0 names only the raw cell c2r1; run 1 says only "the better move" / "the only move that keeps your deep four-in-a-row line alive". The L6 template text itself names only cells (c5r5 / c6r2) and no column, which plausibly primes cell-naming. | A7b run 1: "the only move that keeps your deep four-in-a-row line alive" and "The better move" promise a specific move and point at nothing — the better-col alias (spec col2) was offered and never emitted, so the blunderer cannot locate the move. | G7a run 0: [zone:future:c5r5] (you-key-square, role = single square that matters later) wraps the words "c2r1", and [zone:future:c6r2] (opp-key-square) wraps the words "c5r2" — both handles bound to a semantically different cell than the phrase they highlight. | Grounding OK: render_decision.finalMovestring 33333410111003110004224555552222566666644 ends move 41 = X on c5r5 completing c2r5-c5r5 (G4/G5 pass); opponentPunishment.finalMovestring ends move 38 = O on c6r2 completing c3r2-c6r2. Both named lines are real. G6: route sign + both halves winning_line => L6 is the correct link per causalLinks.mjs. annotationRepairs empty on both runs (G7c N/A). | render_decision identical across the two runs — no divergence.

> **eval-5** (prompt_confusion) — Both runs dropped the better column from the prose even though render_decision.link.text states it verbatim ("Column 3 is your most stubborn defense"), leaving column 3 visible only inside the [zone:better-col] handle (A6), and neither run grounded the reason on any square although opponentPunishment.completingCell c2r3 / lostResource.parityAttribution.controllingGroup were rendered (A7b/A7d).
>
> A6 run0+run1: cleaned prose says only "central column"/"central column move" and "on the edge"; the digit 3 never appears outside the zone handle. render_decision.link.text supplied it verbatim => prompt_confusion.
> A7b run0: "your opponent+s forking chances" names a specific object and points at nothing; run1: "convert the pressure" / "a deep parity battle" likewise unlocatable.
> A7d run0+run1: abstract centrality rule ("gave up central control", "gives up centrality") with only whole-column overlays; no named idea anchored to squares, though c2r3 (opponentPunishment.completingCell, echoed as render_decision.resource.completingCell role "where the load-bearing resource completes") and window c4r1/c3r2/c2r3/c1r4 were in the rendered partition.
> A7c N/A: mechanism is not a fork. Honest-minimal exception VOID: unsure_about empty, confidence high, and the decisive field (opponentPunishment.completingCell) exists.
> A5 pass: no defeatist wording, hold-the-line frame present in both runs (player 2 + opening, so A5b applied). Borderline internal-echo wording noted but not failed: run0 "this book line", run1 "a deep parity battle" (echoes registerToHorizon.horizon "deep-parity").
> G7 pass: stored [zone:col3]/[zone:col1] are EXPANDED specs - zoneAnnotations.mjs processAnnotations() drops unoffered handles first (annotationRepairs empty), so the model emitted the offered handles better-col/played-col; roles match the wrapped phrases.
> G6 pass: route=sign, lostResource.kind=conditional_swindle => L7 per causalLinks.mjs; patternOnAfterBestBoard null and informational only.
> Board check (./visualize_board.sh 33322): P2 to move, scr row = -6 -6 -3 -3 -4 -4 -5, so col3 (0-idx 2) is jointly best and col1 (0-idx 0) is worst - both lose, confirming case lose_to_faster_lose and A1/A2/A3/A4.

> **eval-6** (prompt_confusion) — The render supplied every concrete anchor for this deep-parity swindle (render_decision.resource.completingCell c1r4, the projectedDeep board shown:true, both parityAttribution windows c3r1-c6r4 and c1r4-c4r4, and link.text naming "Column 3" verbatim) yet both runs recited generic centrality with no square instantiating it (A7d), and run 0 additionally never wrote the digit 3 outside a zone handle (A6) and over-wrapped [zone:col3] onto "central pressure", a phrase denoting the opponent rather than the alias role "the column of the better move" (G7a).
>
> A6 (run 0): cleaned prose says only "central-column reply" / "the wider side drop"; the column number 3 appears nowhere outside [zone:col3]. render_decision.link.text states "Column 3 is your most stubborn defense" verbatim, so the info was present -> prompt_confusion. Run 1 writes "column 3" and passes -> intermittent. | A7d (both runs): board at 33322 has zero major threats and the decisive resource is deep (lostResource.completingCell c6r4 at 33 plies vs opponentPunishment.completingCell c1r4 at 29 plies). Both answers anchor only on the two candidate columns, naming no square that instantiates the idea, despite the projectedDeep board being shown:true. | A7a (run 0): inverts ownership of the swindle - lostResource.kind=conditional_swindle is the PLAYER (Gray) resource and link.text says "one slip by your opponent could let you climb back in", but the prose says the played move "makes the practical swindle easier for them to steer". | G7a (run 0): handle col3 (role "the column of the better move") is bound twice, the second time to "central pressure", which denotes the opponent's pressure - role mismatch / over-wrap. annotationRepairs is empty for both runs so G7c does not fire. | A3/A4 hold: solver confirms after-best 333222 scores +3 for Green and after-played 333225 scores +4, i.e. both lose for Gray but the played move loses faster - the centrality/toughest-defense framing is grounded (openingContext.defense.centralityGrounded=true, bestDefenseCol=2). key_cells are whole-column zone expansions, exempt per the condition-D A3/A4 exception. | A5 passes both runs: 2nd person, no internal vocabulary, no defeatist clause, and a hold-the-line frame ("most stubborn"/"harder to break"), honoring the L7 guardrail. | render_decision is byte-identical across both runs - no divergence.

> **eval-7** (prompt_confusion) — Run 1 ignored the verbatim render_decision.link (L6) text — “You had a forced win via c2r5 … gives it up AND lets the opponent force their own win via c6r2” — and narrated the winning move (col 3, solver +3 on 3332 vs -3 for col 1) as a “more resilient defense”/“tougher opening choice” while never naming column 3 in the cleaned prose (A6), so the sufficient info was present and mis-read, not missing; run 0 on the identical record passed every axis (intermittent).
>
> render_decision identical across both runs (byte-equal); annotationRepairs empty in both, so no G7c auto-fail. | Solver on decision board 3332 (Green to move): col3(display)=+3 win, col1(display)=-3 loss → case win_to_lose confirmed; A1/A2 pass both runs (better_move 3 - 1 === bestCol 2). | A3 run 1: mechanism rests on ‘the good move is the book-like, more resilient defense’ — the decisive reason is that col 3 PRESERVES a forced win (lostResource.kind=winning_line, completingCell c2r5, register forced_sequence), supplied verbatim in render_decision.link.text; the defensive framing is not that reason. | A6 run 1: with [zone:…]/[term:…] stripped the prose reads ‘the more central column’ / ‘the edge column’ — the number 3 survives only inside the [zone:col3] handle, which the rubric marks an explicit FAIL. | A7b run 1: ‘let your opponent steer the game into the winning line’ promises a specific line and points at nothing — opponentPunishment.window (c3r2,c4r2,c5r2,c6r2) is in fieldPartition.rendered but is never named or zone-wrapped. A7d: no square or column is named in the cleaned prose at all. | G2 run 1: L6 guardrail is ‘You gave up a win AND handed the opponent their own; name both lines with their horizons’ — run 1 asserts the opposite frame (a defense), contradicting rather than merely omitting it. Run 0 does not contradict it (‘lets your opponent’s best reply steer the game into a losing finish’). | G3/G4/G5/G6/G7 pass on both runs: afterBest/afterPlayed are shown:false but neither answer needed them (decision board carries the two columns); no cell/line claim was made outside the col1/col3 overlay zones, so nothing to trace against finalMovestring 33322232332414001244445556666660011; the only aliases offered are better-col=col3 / played-col=col1 on truthBoard ‘decision’ (trivially board-true); route sign + L6 is the correct pick for win_to_lose with both halves winning_line (patternOnAfterBestBoard null). | key_cells in both runs are the 12 cells of columns 1 and 3 — display-overlay expansion of the two emitted zone handles, exempted from A3/A4 by the condition-D exception; no A4 fabrication in either run. | unsure_about empty in both runs; no abstention signal.

> **eval-8** (prompt_confusion) — Both runs ignored the high-confidence L6 link text and the fully rendered lostResource/opponentPunishment lines (forced win completing at c2r5, opponent win at c6r2 — c2r5 is a real gravity-top X major threat on render_decision.finalMovestring 33322232332414001244445556666660011) and instead recited generic openingContext.centrality.text, violating the L6 guardrail (G2) and emitting zone specs col3/col2 instead of the offered handles better-col/played-col (G7a), with figure_7 bound to the phrase "central line" in run 0 (G7b).
>
> A3 (both runs): mechanism names only "more central column keeps more four-in-a-row lines" — a true-but-peripheral opening heuristic. The decisive reason per the vector is a forced win (register forced_sequence, 30 plies) completing at c2r5 on window c2r5-c5r5 via a figure_7 fork, plus an opponent parity win completing at c6r2; neither is named. visualize_board.sh 33322232332414001244445556666660011 shows col2 row5 (X) [GT] as a real major threat, so the decisive mechanism was board-true and available. | A7d (both runs): pure abstract rule recitation (central columns sit in more lines) with no square anchoring it — key_cells are whole-column zone overlays (c2r1..c2r6, c3r1..c3r6), and the prose names no cell. | A7b (run 0): "the more central line" promises a specific line and resolves to nothing findable; the [term:figure_7] wrapper points at it but no figure-7 exists on the decision board (33322 shows only minor threats, no major threats). | G2a (both runs): L6 guardrail "You gave up a win AND handed the opponent their own; name both lines with their horizons" — neither run states you had a forced win, neither mentions the opponent forcing their own win, neither gives a horizon. Run 1 downgrades it to "made it easier for your opponent to outplay you in the long run". | G7a (both runs): emitted [zone:col3] and [zone:col2] — those are the alias SPECS; the offered handles in render_decision.zones.aliases are better-col and played-col. Not offered handles. | G7b (run 0): [term:figure_7] wraps "central line", which does not denote the KB concept (canonicalPhrase "7-shaped double threat"); semantically wrong binding. | G6 pass: route=sign, lostResource.kind=winning_line and opponentPunishment.kind=winning_line -> L6 is the correct rule (causalLinks.mjs L6 when-clause); not an L2/L3 pick. | A2 confirmed on the board: decision board 3332 solver row gives col2 (0-idx) = +3 and col1 (0-idx) = -3, consistent with win_to_lose. | render_decision is byte-identical across both runs; annotationRepairs empty on both.

> **eval-9** (render_bug) — render_decision.zones.aliases offers no handle for the load-bearing parity line c3r5-c6r5 (nor its completing cell c6r5 / the denial cell c3r5) and requiredSet is empty, so both runs dropped the decisive resource that link.text names and narrated only "you left the allen-3-4 book move" — the after-best board 333222266 has no major threats, so the parity line completing at c6r5 (all four of c3r5,c4r5,c5r5,c6r5 empty, engine finalMovestring 33322226664420600000211111313344445556655) is the ONLY board-level reason available; secondary prompt_confusion since link.text stated both cells verbatim.
>
> A3 (both runs): mechanism names no board tactic at all — the decisive resource (lostResource.window c3r5..c6r5 completing at c6r5, denied by the opponent occupying c3r5 at ply 10) is replaced by book-line authority ("stay with the book move", "you abandoned the book continuation"); visualize_board.sh 33322226 shows all of row 5 empty and no major threats on the after-best board, so the parity line is exactly what the win rests on. | A7b (both runs): "the deep winning path", "the forced sequence", "the defense that turns your win into a draw" (run 0) and "the winning finish", "the opening plan that keeps your win alive" (run 1) each promise a specific board object and resolve to nothing — no cell named in prose, no zone wrapped; the only zones emitted are better-col/played-col. | A7d (both runs): pure move narration (left the book column) with no named idea anchored to squares. | A7a not charged separately (same sentences as the A3 failure, per no-double-charge). | A1 pass: better_move 7 - 1 === bestCol 6. | A2 pass: win/draw matches win_to_draw and the solver rows (after-best 333222266 all-negative for Gray = Green win; after-played 333222265 has 0s = draw). | A4 pass: every stated fact is true — allen-3-4-opening/matchedPrefixLen 8/bookNextCol 6 (display 7), pliesToEnd 32, and "no immediate one-move tactic" (after-best board: Major threats: none); the 12 key_cells are the col6/col7 zone expansions, excluded per the condition-D overlay exception. | A5 pass (markup stripped): 2nd person throughout, no field names; borderline only on "about 32 plies away" (pliesToEnd in its internal unit rather than "about N moves later") — noted, not failed. A5b N/A (player===1). | A6 pass: cleaned prose names "column 7" as the better move in both runs. | G1-G7 pass: render_decision identical across both runs; L5 correctly routed (route=sign, lostResource.kind=winning_line, no L2/L3 involved so no branch-invariance risk); guardrail honored (forced win stated, horizon called deep, denial acknowledged), confidence high so no hedging owed; afterBest shown:false was not needed; the only cells named trace to the render finalMovestring (its 9th move "6" = display column 7); alias specs verified board-true (you-major c5r2 shows as [X] on afterPlayed, you-major-line c6r1,c5r2,c4r3,c3r4 is a real three-plus-gap anti-diagonal there; better-col=col7/played-col=col6 true on the decision board); both emitted handles were offered (key_cells are their expansions, proving processAnnotations did not drop them), roles matched, annotationRepairs empty.

> **eval-10** (prompt_confusion) — Run 0 never names the better column in prose - it hides col 7 inside [zone:better-col] wrapped around the words "book line" and reduces the reason to the outcome ("preserves the long, parity-based win"), even though render_decision.openingContext.lead.bookCol=7 and fieldPartition.rendered includes bestCol/openingContext.namedOpening.bookNextCol verbatim; run 1, from the identical render_decision, says "column 7" and passes.
>
> A6 (run 0): cleaned prose = "You needed to keep following the book line in this opening... By playing the other move, you left that line..." - no "column 7" anywhere; the only carrier of the column is the zone handle (expanded to [zone:col7]). visualize_board.sh 33322226 confirms scr col7=+1 (win) vs col5=0 (draw), so the fact was available and correct. | A7a (run 0): the whole stated reason is the result - "that move preserves the long, parity-based win" / "you ... only held the draw instead of keeping the forced win alive" - which is the instructions verbatim FAIL example ("the better move keeps the win alive"). | A7d (run 0): the named idea (opening book / parity win) is anchored to no square or column in the prose; the only anchors are two full-column overlays, so nothing tells the blunderer where the idea lives. Run 1 anchors the same idea to columns 7 and 5 and passes. | A3/A4 pass both runs: board shows Major threats: none and the engine carries a 32-ply parity win (lostResource.register=parity, completingCell c6r5, controllingGroup c3r5-c6r5), so "deep parity win, keep the book line" is board-true and decisive; the 12 key_cells are pure [zone:col5]/[zone:col7] overlay expansions (condition-D exception). | G2 pass: L5 guardrail ("state its horizon honestly (may be deep)") honored - run 1 says "the resolution is deep", run 0 says "long"; no covers code was needed-and-missing. | G6 pass: route=sign, lostResource.kind=winning_line, opponentPunishment.kind=denial, and hasSharedCell is true (tie.sharedCells=[c3r5]) so L9 is correctly skipped in favor of L5 (causalLinks.mjs L9/L5 when-clauses). | G7 pass both runs: annotationRepairs is empty and the surviving [zone:col7]/[zone:col5] are processAnnotations expansions of the offered handles better-col/played-col (an unoffered handle would have been stripped by dropUnoffered, leaving no tag). | render_decision is byte-identical across the two runs - no divergence.

> **eval-11** (prompt_confusion) — render_decision.link (L6) handed the model the composed text 'You had a forced win via c2r5 ... lets the opponent force their own win via c2r4' plus rendered lostResource.completingCell/window and opponentPunishment.completingCell, yet both runs dropped every cell and narrated generic opening centrality — and both emitted [zone:col4]/[zone:col5], the alias SPECS, instead of the offered handles better-col/played-col (render_decision.zones.aliases), so G7a auto-fails on both; run 1 additionally mislocated the opponent's winning line 'around column 5' when opponentPunishment.window is c4r2/c3r3/c2r4/c1r5 (display cols 4,3,2,1).
>
> A3 (both runs): decisive reason is P1's forced win completing at c2r5 on window c2r5/c3r5/c4r5/c5r5 — verified board-true on render_decision.finalMovestring 33322232332414001244445556666660011, where row5 shows X at c3,c4,c5 and c2r5 is a gravity-top major X threat. Both mechanisms rest instead on openingContext centrality ('more four-in-a-row lines open'), a true-but-peripheral observation; neither names c2r5 or the opponent's c2r4.
> A4 (run 1): 'lets your opponent steer the game to their own deep winning line around column 5' is false — opponentPunishment.window = c4r2,c3r3,c2r4,c1r5 (display cols 4,3,2,1), completingCell c2r4; column 5 appears nowhere in it.
> A5 (run 0, marginal): cleaned prose says 'only settles many plies later' — 'plies' is a prose echo of the internal pliesToEnd unit; A5a allows only plain 'about N moves later'. Otherwise 2nd person and clean. A5b N/A (player 1).
> A6 (both): cleaned prose names 'column 4' = bestCol+1 → pass.
> A7 run 0: A7b 'a deep fork fight' and 'your opponent's long forcing finish' promise specific board objects and resolve to nothing (the only zones emitted are whole columns 4 and 5, neither of which contains c2r5 or c2r4); A7c the fork pivot/finishing square c2r5 (lostResource.forkCells, entryCell c3r4) is never named though lostResource.completingCell is in fieldPartition.rendered; A7d idea named ('fork', centrality) with no squares instantiating it.
> A7 run 1: A7a 'The better move is also the one that holds the winning line alive' is the banned outcome framing; A7b 'the winning line ... around column 4' and 'their own deep winning line around column 5' are unlocatable/false referents; A7d pure centrality abstraction with no squares.
> G2 (both): L6 guardrail 'You gave up a win AND handed the opponent their own; name both lines with their horizons' is not honored — run 0 names neither line, run 1 names both only as vague 'around column N' and mislocates the opponent's, and neither gives a horizon.
> G4 (run 1): the named line locations contradict the engine's own resource cells traced on render_decision.finalMovestring (c2r5 for the lost win, c2r4 for the punishment).
> G6: route 'sign', lostResource.kind and opponentPunishment.kind both winning_line → L6 is the correct rule per causalLinks.mjs; patternOnAfterBestBoard null, no L2/L3 involvement. Pass.
> G7a (both): emitted handles 'col4'/'col5' are the alias spec strings, not the offered handles 'better-col'/'played-col'; annotationRepairs is empty on both rows so this is not a G7c auto-fail but a direct handle-set violation. G7b run 0: [term:figure_7] wraps the bare word 'fork' — slug is offered and the denotation is acceptable.
> render_decision is byte-identical across the two runs (no divergence bug).
> A1/A2 confirmed at source: visualize_board.sh 333222 scr row gives col 4 (display) = +3 and col 5 = -2, matching case win_to_lose.

> **eval-12** (prompt_confusion) — render_decision.link (L6) text verbatim named BOTH real lines with cells and horizons ("forced win via c2r5 ... opponent force their own win via c2r4") and the Decision block gave bestCol=3, yet both runs dropped all of it and wrote generic openingContext.centrality prose, never naming column 4 in words (A6) nor either winning line (G2/A7); a secondary render gap is that zones.aliases offered only better-col/played-col, so the fork pivot c2r5 was never annotatable (A7c).
>
> A6 (both runs): cleaned prose never says "column 4" — the better column appears only inside the [zone:col4] handle ("the central column that keeps more four-in-a-row lines alive" / "the more central column"). Rubric: handle-only = FAIL. bestCol=3 was rendered in the Decision block. | G2 (both runs): L6 guardrail = "You gave up a win AND handed the opponent their own; name both lines with their horizons." Run 0 only says the edge move "lets your opponent steer the fight into a winning line" (no cells, no horizon); run 1 never mentions the opponent obtaining a win at all ("let the deep fight tilt against you"). Both lines are board-true: on finalMovestring 33322232332414001244445556666660011 c2r5 is a gravity-top major <X> completing the row-5 window c2r5-c5r5 (28 plies); on the punishment line 3332226310123223050050044555444456666611 move 40 at c2r4 completes the O diagonal c5r1/c4r2/c3r3/c2r4 (game over). | A3 (run 1): mechanism is pure centrality recitation with no tactic named; centrality is a true-but-peripheral observation here — visualize_board on 333222 gives scr row -2 -2 1 3 -2 -2 -2, so central col 5 (display) loses just as the edge col 7 does while col 3 wins, i.e. "more central keeps more lines alive" does not explain the win/loss split. Run 0 escapes A3 by naming the lost figure_7 (lostResource.tacticTag, real on the engine line). | A7 (run 0): A7b — "the 7-shaped double threat idea in the center" promises a specific board object and resolves to nothing (key_cells are the two overlay columns only); A7c — the fork pivot c2r5 (lostResource.forkCells) is never named, and it was never offered as a zone alias; A7d — named idea with zero anchoring squares. | A7 (run 1): A7a — reason given as outcome ("kept your winning chances open longer", "the deep fight tilt against you"); A7d — abstract opening rule with no squares. | A5 pass with a caveat: voice is 2nd person and free of internal field names, but both runs call column 4 "the tougher book continuation" while render_decision.openingContext.lead.bookCol is null and frameId is O3 (centrality) — unsupported book framing, borderline prose echo of bookCol. | G7 pass: stored mechanism shows [zone:col4]/[zone:col7], which are the EXPANDED specs of the offered handles better-col/played-col (zoneAnnotations.mjs expands handle->spec after dropUnoffered); annotationRepairs is [] on both runs, so no unoffered handle was emitted. [term:figure_7] wraps exactly the canonicalPhrase "7-shaped double threat". | render_decision is byte-identical across both runs (no divergence).

> **eval-13** (prompt_confusion) — Run 0 never names the better column in prose (A6 fail) even though render_decision.link.text states "Column 4 is your most stubborn defense" verbatim — the column survives only inside the [zone:better-col] handle; secondaries: neither run names the fork-creating square c6r4 (A7c, render_bug — no such alias in render_decision.zones.aliases) and run 1 emitted an unoffered [term:central_column] slug (G7b).
>
> A6 run0: markup-stripped prose says only "the central column"/"the edge move"; the string "column 4" never appears, while render_decision.link.text supplies it verbatim. | A7b run0: "the two-way danger" (opening clause) promises a specific board object but is bound to no zone and is spatially incoherent — the double threat completes at c6r5/c7r4, i.e. in the very columns the player moved toward, so "drifted away from the two-way danger" points at nothing findable (the same object is only located two sentences later as "pair of finishing squares"). | A7c both runs: opponentPunishment.tacticTag=double_threat with forkCells c6r5/c7r4; visualize_board on render_decision.finalMovestring 333621312111100000033444444555665 shows move 33 = c6r4 as the pivot that creates BOTH gravity-top majors (col6 row5 <X> and col7 row4 <X>) — neither run names c6r4, and no alias for it was offered (OI-182: render never offered the pivot). | G7 run1: raw mechanism emitted [term:central_column]…[/term:central_column]; render_decision.zones.terms offers only double_threat, so the slug was unoffered and dropUnoffered() silently stripped it with NO annotationRepairs entry (annotationRepairs is []), making the violation invisible in the stored answer. | Abstention run1: the vector carries no near-term tactical cell at ply 3 — lostResource.parityAttribution.parityNamingDeferred=true / namedRule=null and the only grounded cells (c5r4 completing cell, c3r4-c6r4 controlling group) sit on a 35-ply parity horizon; visualize_board on 333 shows "Major threats: none". | Non-failing checks verified: A1 better_move 4 - 1 === bestCol 3; A2 lose_to_faster_lose => loss/loss and solver on 333 gives col3=-1 (best) vs col6=-4; G4 c6r5/c7r4 both true on render_decision.finalMovestring; G6 route=sign + lostResource.kind=conditional_swindle => L7 is the correct link (causalLinks.mjs L7 when-clause); G5 opp-future-fork spec is board-true on projectedDeep; render_decision identical across both runs.

> **eval-14** (prompt_confusion) — Run 1 never names the better column in prose ("the central column hold", column 4 appears only as the [zone:better-col] handle) even though render_decision.link.text states it verbatim ("Column 4 is your most stubborn defense"), and it inverts the board geometry by calling the played move "the higher side drop" when the played cell c5r1 is the bottom row and the better cell c4r4 sits three rows higher.
>
> A6 run 1 FAIL: cleaned prose = "You should have kept the central column hold instead of drifting to the higher side drop..." — no "column 4" token anywhere; the number survives only inside [zone:col4] (post-expansion of the offered better-col handle). render_decision.link.text supplies it verbatim, so prompt_confusion, not missing_info. | A4 run 1 FAIL: "the higher side drop" is board-false — visualize_board.sh 3334 shows the played disc at c5r1 (col 5 height 1, bottom row) while the better move lands at c4r4 (col 4 height 4). render_decision.openingContext.centralityComparison already gives betterCell c4r4 / playedCell c5r1. | A5b (player 2 + opening) HOLDS on both runs: neither says the player is lost; run 0 = "keep the defense more central ... stays in the central fight", run 1 = "the central reply is the tougher defense" — both hold-the-line frames, no defeatist closing clause, L7 guardrail honored. | A3 pass both: the only idea rested on is central-hold / fewer opponent replies, grounded by openingContext.defense.centralityGrounded=true and replyHistogram afterBest 1 vs afterPlayed 4; no tactic is named on a board (visualize_board.sh 333/3333/3334 all show "Major threats: none"). | G7 pass both: mechanisms carry [zone:col4]/[zone:col5], i.e. processAnnotations already expanded the OFFERED handles better-col/played-col to their specs (zoneAnnotations.mjs:320-321), key_cells are the resulting column overlays (c4r1-r6, c5r1-r6) — display cells, not per-cell threat claims; annotationRepairs empty on both runs; zones.terms empty and no [term:] emitted. | G6 pass: route "sign" + lostResource.kind "conditional_swindle" is exactly L7 when-clause (causalLinks.mjs:77-79); patternOnAfterBestBoard null, no L2/L3 involvement. | G3 pass: afterBest/afterPlayed marked shown:false as tag-identical to the decision board; the decision board alone carries the column heights both answers needed. | render_decision is byte-identical across both runs (verified) — no routing divergence.

> **eval-15** (prompt_confusion) — Both runs mis-consumed a render_decision that was correct and complete: run 0 never named the better column at all (A6) despite openingContext.lead.bookCol=7 and zones.aliases better-col being stated verbatim, and run 1 emitted [zone:col7]/[zone:col2] using the alias SPEC strings instead of the listed handles better-col/played-col (G7a) and echoed the pliesToEnd field as "many plies away" (A5); secondarily, the fork pivot c7r3 (lostResource.forkCells / opponentPunishment.completingCell, on finalMovestring 333222336212244151100550446) was never offered as a zone alias, so A7c is a render_bug.
>
> A3 run0: mechanism names no board tactic at all ("keep the book line alive", "forcing chances intact") and key_cells is empty, so nothing rests on the board; the engine supplied lostResource.tacticTag=figure_7 with cells c4r1,c5r2,c4r3,c5r3,c6r3 and a fork completing at c7r3. | A6 run0: cleaned prose says only "the better move is the one that stays on that path" — no "column 7". | A7 run0: a/b/d — "let your opponent steer the game into a drawn defense instead of the deeper forced win" is pure outcome restatement, "the book line"/"your forcing chances" point at no locatable square, and no named idea is anchored to any cell. | A5 run1: "your deep win that was still many plies away" is a prose echo of lostResource.pliesToEnd (18) — the allowed form is "about N moves later". | A7b run1: "your 7-shaped double threat" is wrapped only in a [term:], which points at no cells; the fork window c4r3,c5r3,c6r3,c7r3 is never named. | A7c run1: mechanism IS a double threat but the fork-creating square is never named. | G7a run1: emitted handles col7/col2 are the aliases SPECS; the offered handles are better-col and played-col. | G5 verified board-true: on afterPlayed (333222331) visualize_board shows col5 row4 as [X] major (alias you-major c5r4) and the diagonal c2r1(X9),c3r2(X5),c4r3(X3),c5r4 (alias you-major-line) — both correct on their truthBoard. | G6: route sign, patternOnAfterBestBoard null, L5 for win_to_draw is correct; afterBest board (333222336) scores -12,-10,-7,-12,-7,-7,-12 for the mover-to-play confirm P1 wins, afterPlayed col7 score 0 confirms the draw. | render_decision is byte-identical across both runs.

> **eval-16** (prompt_confusion) — Both runs fail A6 and A7 even though the assembled prompt hands over the answer verbatim - the Decision block reads 'Better move: column 7 (lands at c7r1). Outcome: win.' yet neither mechanism writes 'column 7' in prose (it survives only inside the expanded [zone:col7] handle), and run 1 additionally drops the tactic entirely and mis-binds [term:figure_7] to the phrase 'opening pattern'; the secondary, genuinely render-layer defect is that buildAnnotationOffer still offers the figure_7 term on this opening record while openingHorizon:true empties the half-geometry alias family (zones.aliases = better-col/played-col only, requiredSet = []), so a named 7-shaped fork has no offered zone to point at (A7b/A7c).
>
> Board check: decision board 33322233, scr row = -5 0 0 -4 0 -1 7 -> display col 7 (+7, win) vs played display col 5 (0, draw); case win_to_draw, A1/A2 confirmed on both runs. | A6 (both runs): cleaned prose names only 'column 5'; column 7 appears solely inside the post-processed [zone:col7] span (processAnnotations rewrites handle->spec), which the rubric scores as a fail. The prompt Decision block gives it verbatim -> prompt_confusion, not missing_info. | A7b (both runs): 'the deep 7-shaped fork' / 'that long forced finish' (run 0) and 'the opening pattern' / 'the defense' (run 1) promise specific board objects; the only emitted zones are whole columns 5 and 7, so nothing resolves. The engine finalMovestring 333222336212244151100550446 does carry the real fork at c7r3, but pruneOpeningResidue reduces lostResource to {pliesToEnd:18} and opponentPunishment to {} in the prompt, so no cell was nameable. | A7c (run 0): the mechanism rests on the figure_7 fork but never names the pivot square; the pivot was never offered (openingHorizon suppression) and the frame guardrail explicitly forbids it ('Do NOT ground a specific deep completing cell') -> render-layer, per the OI-182 offered-check. | A7d (both runs): a named idea with zero squares instantiating it (run 0); pure book-line narration with no idea at all (run 1). | A3 (run 1 only): the mechanism names no tactic or threat - the decisive resource (the deep figure_7 fork denied at c7r3) is replaced by 'stay on the book line'; run 0 does name the fork and matches lostResource.tacticTag, so A3 passes there. | A5 (run 1 only): 'keep the win alive many plies later' and 'your played column' echo pliesToEnd / playedCol; the rubric allows plain 'about N moves later' but not the plies unit. A5b N/A (player === 1). Run 0 prose is clean. | G7b (run 1 only): [term:figure_7] wraps 'opening pattern', which does not denote the 7-shaped double threat KB concept; the slug itself was offered and annotationRepairs is [] (no G7c). | G2/G3/G5/G6 pass: L5 correctly matched (route sign, lostResource.kind winning_line + opponentPunishment.kind denial), patternOnAfterBestBoard null and unused, decision board prints '(no tactics)' so there is no false threat-list entry, both column aliases are board-true on the decision board, and no answer needed a shown:false board. | Provenance observation (not scored): render_decision.boards marks projectedDeep shown:true and fieldPartition.rendered lists lostResource.completingCell/window/line, but the buildReasonRenderModel opening branch returns boards:[decision] and pruneOpeningResidue removes those fields - the persisted record over-states what the model actually saw. | render_decision identical across both runs; annotationRepairs empty on both.

> **eval-17** (prompt_confusion) — Both runs had the fork fully rendered and REQUIRED (render_decision.requiredSet / zones.aliases you-future-fork = future:windows:c5r5,c7r6, board-true: after the engine finalMovestring 333331111555515200022223000124445666664 both c5r5 and c7r6 are gravity-top X major threats), yet run 0 dropped it entirely and explained only "you left the book line / column 6 keeps the win" (outcome restatement, A3+A7b/A7d), and run 1 used the fork zone but never named column 6 in prose (A6) and never named the fork pivot c5r4 (A7c, unoffered alias -> secondary render_bug per OI-182).
>
> A3 run0: mechanism names no tactic at all - it rests on "left the book line of the central opening" (true but peripheral: openingContext.matchedPrefixLen=10, bookNextCol=5) and on the win/draw outcome; the decisive resource (lostResource.tacticTag=double_threat, forkCells c5r5/c7r6) is never mentioned even though requiredSet obliged it. | A7 run0 (A7b): "the winning line you had available" promises a specific object and points at nothing - the only zones emitted are better-col(col6)/played-col(col5), whole-column overlays, not the line c3r5-c4r5-c5r5-c6r5. | A7 run0 (A7d): pure column narration, no named idea and no squares; key_cells are just the 12 cells of the two overlay columns (D exception applies, so not an A4 fail). | A6 run1: markup-stripped prose says only "The better move keeps your fork ... alive"; the string "column 6" (bestCol 5 + 1) never appears, although render_decision states the better column verbatim. | A7c run1: mechanism IS the double threat but only the two finishing squares (c5r5, c7r6, via the zone) are given; the pivot c5r4 - ply 39 of lostResource.line, the move that makes both threats live simultaneously - is never named and was never offered as an alias (secondary render_bug, OI-182). | Verified pass side: A1 better_move 6 === bestCol 5 + 1 (both runs); A2 win/draw matches win_to_draw and the solver (after-best 33333111155 all-negative for Gray = P1 win; after-played 33333111154 shows 0 = draw); G4/G5/G7a spec board-truth confirmed on the projectedDeep board; annotationRepairs empty on both runs so G7c passes.

> **eval-18** (render_bug) — Both runs fail A7c because render_decision.zones.aliases/requiredSet offer no alias for the fork PIVOT c5r4 (present in lostResource.anchorCells and lostResource.line[] ply 39) - only the two finishing squares c5r5/c7r6 are offered - so neither coach names the move that actually creates the double threat (visualize_board on the engine finalMovestring prefix 33333111155551520002222300012444566666 shows only ONE major threat col5 row5 before c5r4, two after); secondary and intermittent: run 0 never names the better column in prose (A6) and frames the reason as outcome (A7a), aggravated by L6 being the one sign-family frame whose composed text omits "col N".
>
> Board decision 3333311115, player 1 (Green) to move, 10 discs, opening; solver scr row gives col6(display)=+1 win, col2(display)=-3 loss -> case win_to_lose confirmed, A1/A2 pass both runs. | A6 run 0: cleaned mechanism names no column at all ("The better move keeps the opening parity...") - bestCol+1=6 never appears in prose; run 1 says "playing column 6" -> pass, hence intermittent. | A7a run 0: reason is stated as outcome ("so your winning line stays alive", "lets your opponent steer the deep fight to their own finish") rather than what changed on the board. | A7c both runs: mechanism rests on the double threat at c5r5/c7r6 but the pivot c5r4 is never named; verified on the engine finalMovestring 333331111555515200022223000124445666664 (move 39 = col index 4 -> c5r4 turns a single major threat into two: col5 row5 and col7 row6, both [GT] for X). | A3/A4 pass: the fork cells are board-true on the projectedDeep board; the zone-expanded col2/col6 cells in run 1 key_cells are display-overlay cells (condition-D exception), not threat claims. | A5 pass: 2nd person, no vector/render terminology after stripping markup; A5b N/A (player 1). | G1-G7 pass: link L6 correct (both halves kind=winning_line), route sign, patternOnAfterBestBoard null so no L2/L3 risk; annotationRepairs empty; every emitted handle (better-col, played-col, you-future-fork) and the term double_threat are in render_decision.zones and wrap role-matching phrases; requiredSet spec future:windows:c5r5,c7r6 emitted in both runs; no omitted board (afterBest/afterPlayed shown:false) was needed - the after-best board 33333111155 is indeed tag-identical (no major threats). | render_decision identical across both runs. | Minor, not charged: neither run grounds the opponent line at c5r2 by cell even though L6 guardrail says "name both lines with their horizons" - both name it qualitatively ("their own deep win later"), so G2 passes.

> **eval-19** (render_bug) — The O1 opening frame composed by openingFrame.mjs ('The solver confirms this resolves deep (~28 plies, a deep forced line) - too far to pin to one square; the lesson is the opening' + its 'Do NOT ground a specific deep completing cell' guardrail) both leaked the internal unit 'plies' into the coach prose (A5a) and forbade naming the one concrete board cause the L5 link.text itself supplies - the opponent's denial at c3r5, which occupies the shared c3r5-c6r5 window - so both runs could only restate the outcome ('column 6 preserves your forced win') instead of a board cause (A7a); the fork pivot c5r4 was never offered as a zone (A7c).
>
> A5 (both runs): cleaned prose says 'about 28 plies away' (run 0) / 'many plies later' (run 1) - 'plies' is the banned pliesToEnd prose echo (plain 'about N moves later' is the allowed form). Source is the render: openingFrame.mjs:59 emits '~28 plies, ' verbatim in the O1 frame text the model saw. A5b N/A (player===1). | A7a (both runs): the only causal statement is book-adherence + outcome ('column 6 preserves that book path ... away from your forced win' / 'that is what preserves your forced win many plies later'). The real board change - the opponent occupying c3r5, the shared cell of the row-5 window c3r5,c4r5,c5r5,c6r5 (opponentPunishment.kind=denial, verdict=occupation, tie.sharedCells=[c3r5]) - is never named, though render_decision.link.text states it. | A7c (both runs): mechanism invokes the double threat at c5r5/c7r6 but never names the square that CREATES the fork. Traced render_decision.finalMovestring 333331111555515200022223000124445666664: visualize_board shows ply-39 X at c5r4 producing BOTH major threats <X> c5r5 [GT] and <X> c7r6 [GT] with Gray to move. c5r4 is present in lostResource.anchorCells but zones.aliases offers no pivot handle (only better-col, played-col, you-future-fork) - not offered, so render-layer per OI-182. | A1-A4/A6 pass: better_move 6 = bestCol 5 + 1; win/draw matches case win_to_draw and the decision board's solver row (col6 = +1, col7 = 0); the named double threat at c5r5/c7r6 is board-true on the projectedDeep board; whole-column key_cells are [zone:col6]/[zone:col7] overlay expansions (Condition D exception), and the raw model output shows key_cells was emitted empty. | G1-G7 pass: model emitted only offered handles (better-col, played-col, you-future-fork - the required-set member was used) and the offered term double_threat; annotationRepairs empty on both runs; no shown:false board was needed; every named cell traced to render_decision.finalMovestring; route 'sign'/L5 with patternOnAfterBestBoard null involves no L2/L3 branch pick. | Render conflict worth reporting: requiredSet REQUIRES the deep fork zone future:windows:c5r5,c7r6 while the co-applied opening guardrail says 'Do NOT ground a specific deep completing cell ... the lesson is the opening'. The two instructions pull in opposite directions and left the model with book-adherence as the only sanctioned reason. | render_decision is byte-identical across both runs; no divergence.

> **eval-20** (prompt_confusion) — render_decision.link (L6) supplied both completing cells verbatim ('forced win via c5r5 … opponent force their own win via c5r2') and a guardrail demanding both lines be named with horizons, yet both runs replaced the board mechanism with a generic 'stay in the book opening' narration that never names c5r2 or the fork-creating move, and run 1 additionally misattributed the player-1 fork at c5r5/c7r6 to the opponent (projectedDeep board 33333111155551520002222300012444566666 shows the major threat at col5 row5 is X, i.e. the player, not the opponent).
>
> A2/A1 verified on decision board 3333311115: scr row gives col6(display)=+1 (win, bestCol=5) and col4(display)=-3 (loss, playedCol=3) — matches case win_to_lose. | A3/A4 run1 FAIL: 'let your opponent take over the long two-way threat idea later, including the two squares you would have used to finish it' — c5r5/c7r6 are the MOVER's (X) fork squares per lostResource.forkCells and the projectedDeep board (Major threats: col5 row5 (X); c7r6 becomes X's second threat after ply 39 c5r4 completing window c4r3,c5r4,c6r5,c7r6). Attributing the fork to the opponent is board-false. | A5 run1 FAIL (A5a): cleaned prose says 'once the sequence reaches that horizon' — 'horizon' is banned render terminology. Run0 clean ('parity path' treated as CF jargon, noted). | A6 run1 FAIL: cleaned prose never names column 6 — [zone:col6] wraps 'central-column opening line', so the better column appears only as a zone handle. Run0 passes ('column 6'). | A7 FAIL both runs: (a) reason given is book-departure/outcome ('turned the game into your opponent's winning sequence'), not what changed on the board; (b) 'the forcing line'/'the tougher defense'/'forces the hardest reply' promise specific objects and resolve to nothing (opponentPunishment.completingCell c5r2 and its window c4r2..c7r2 were rendered and unused); (c) mechanism IS a double threat but the fork-creating move is never named — lostResource.entryCell c6r3 is in fieldPartition.rendered yet render_decision.zones offers no pivot alias (OI-182); (d) abstract 'stay on the book line' rule with no squares in prose anchoring it. | G2 FAIL both runs: L6 guardrail 'name both lines with their horizons' not honored — neither run names the opponent's winning line (c5r2, parity register, 27 plies) nor either horizon. | G7 FAIL run1: [zone:col6] (role 'the column of the better move') bound to the phrase 'central-column opening line', and [zone:future:windows:c5r5,c7r6] (role 'BOTH of the two squares YOU can finish on') bound to a phrase framing the fork as the opponent's — both semantically wrong bindings. annotationRepairs empty in both runs, so G7c does not fire. | render_decision identical across both runs (verified by deep string compare) — no divergence bug.

> **eval-21** (render_bug) — Both runs assert column 6 is "more central" than column 2 - board-false (columns 2 and 6 are equidistant from centre column 4) and contradicted by openingContext.defense.centralityGrounded:false - because composeOpeningFrame (openingFrame.mjs) emitted the O2 guardrail "Explain the blunder through the opening - book line, centrality, parity" while suppressing the centrality clause AND omitting GUARDRAIL_NO_CENTRALITY (the guardrail rider is gated on centralityQualitative(fv)===null, which is false here since it returns much_easier, while the clause is gated on centralityGrounded=false); secondaries: run 0 hid the better column inside the [zone:better-col] handle (A6) and neither run turned the rendered replyHistogram 1-vs-7 into a concrete idea (A7d).
>
> A4 (both runs): run 0 says "kept the central, tougher defense ... instead of drifting to the side column ... staying more central"; run 1 says "the central column 6 line" / "the central-column book line". visualize_board 33333111155 shows centre = column 4; columns 2 and 6 are BOTH 2 away, so neither is more central. The vector states openingContext.defense.centralityGrounded:false and the O2 frame text actually shown to the model made NO centrality claim. || A6 (run 0 only, intermittent): cleaned prose is "You should have kept the central, tougher defense by playing there" - the digit 6 appears only inside [zone:col6]. The Decision block (prompt line 3) states "Better move: column 6 (lands at c6r3)" verbatim, so prompt_confusion. Run 1 says "central column 6" and passes. || A7d (both runs): the only anchors are the two move columns themselves; the named idea (resilience/centrality) is never instantiated on a square or line. replyHistogram.afterBest=1 vs afterPlayed=7 was rendered (prompt lines 70-73, with a reading-key gloss) and cited in fields_relied_on by both runs, yet neither expressed the concrete "after column 6 your opponent has exactly one way to keep it, after column 2 seven". unsure_about is empty and confidence is "high", so the honest-minimal exception is void. || A5 pass incl. A5b (player 2 + opening): neither run tells the player they are lost; both give a hold-the-line frame ("tougher defense", "most resilient", "keeps your opponent working harder"). "practical swindle" is explicitly allowed; "parity battle" read as plain Connect Four jargon, not a field name. || A3 pass: the decision board carries no tactics (visualize_board "Major threats: none"; prompt threat list "(no tactics)"), and the resilience/swindle framing both runs give IS the engine decisive reason (L7, lostResource.kind=conditional_swindle). || G3 pass, but render_decision is NOT artifact-faithful here: render_decision.boards marks projectedDeep shown:true while the assembled prompt renders ONLY the decision board (renderReasonModel.mjs:194 hard-sets boards:[decisionBoard] on the opening-frame path, whereas buildRenderDecision at :311 still reports boardSelectionDecisions). Likewise render_decision.link.text ("Column 6 is your most stubborn defense...") is NOT the text shown - the O2 opening frame replaced it. Neither answer needed a shown:false board, so G3 itself holds. || render_decision identical across both runs; annotationRepairs empty on both; no parse_error / call_error.

> **eval-22** (render_bug) — Both runs fail A7c: the mechanism names the opponent double threat only by its two finishing squares (c5r3, c7r4) and never the square that creates the fork, because render_decision.zones.aliases offers ONLY the combined `future:windows:c5r3,c7r4` group (handle opp-future-fork) — neither opponentPunishment.entryCell c6r3 nor the fork-creating move c7r3 (opponentPunishment.line ply 35) is offered as a zone, so the pivot was never available to name (OI-182); secondary, run 0 leaves "the long forcing line" as an unlocatable referent (A7b) and mis-anchors the after-played fork onto the after-best branch.
>
> A1/A2 ok: better_move 6 - 1 === bestCol 5; case lose_to_faster_lose -> both loss; visualize_board.sh 33333111155 scr row confirms every column negative for Gray (col6 = -1 best, col1 = -3). | A3/A4 ok: the named double threat is board-true on render_decision.finalMovestring 33333111155051310020002242224555666 — final board Major threats: col5 row3 (X) [GT] and col7 row4 (X) [GT], exactly the offered future:windows spec. replyHistogram 1 vs 7 backs "fewer clean ways". key_cells are pure zone expansions (col1 x6, col6 x6, c5r3, c7r4) -> condition-D overlay exception applies. | A5 ok on both runs (2nd person, no internal terminology; A5b applies since player 2 + opening and both runs give a hold-the-line frame — "toughest defensive shape" / "tougher defense" — with no defeatist clause). A6 ok: cleaned prose says "column 6" verbatim. | A7c FAIL (both runs): fork pivot unnamed. entryCell c6r3 and line[].cell c7r3 are in fieldPartition.rendered but absent from zones.aliases and requiredSet -> render_bug, not a model failure. | A7b FAIL (run 0 only): "keeps the long forcing line alive" promises a specific line and resolves to nothing — not named in prose, not zone-wrapped. Run 1 has no such dangling referent. | Run 0 secondary mis-anchoring (not charged to A4): it attributes the c5r3/c7r4 fork to the after-BEST branch, but that fork lives on the after-played line (opponentPunishment, 23 plies); after the best move the vector carries a parity conditional_swindle completing at c5r4 over window c3r4-c6r4, 27 plies. | G1-G7 all pass: guardrail honored (no win claim, no defeatist clause); confidence high so no hedge needed; shown:false boards (afterBest/afterPlayed) not needed; all named cells trace to render_decision.finalMovestring; L7 fires on lostResource.kind=conditional_swindle with patternOnAfterBestBoard null so no L2/L3 branch question; annotationRepairs empty; the stored [zone:col6]/[zone:col1]/[zone:future:windows:c5r3,c7r4] tags are processAnnotations expansions of the offered handles better-col/played-col/opp-future-fork, each wrapping a role-matching phrase, and [term:double_threat] is the one offered slug. | render_decision is byte-identical across both runs (no divergence bug).

> **eval-23** (prompt_confusion) — Everything needed was supplied (render_decision.zones offered opp-future-fork + the double_threat term, and requiredSet obliged the fork group), but run 1 dropped the required opp-future-fork zone, invented an unoffered [term:centrality] slug that processAnnotations silently stripped, and left "their four-in-a-row line" pointing at nothing, while run 0 leaked the vector echo "the reply tree is looser" into coach prose.
>
> run 0 A5a: cleaned prose says "so the reply tree is looser" — an engine/search-vocabulary prose echo of replyHistogram.afterBest(1)/afterPlayed(3); render_decision.link.text is clean ("watch columns 1, 2, 3, 5, 6, 7"), so the model introduced it -> prompt_confusion. A5b itself is fine: no defeatist clause, positively framed as the tougher central defense. | run 1 A7b: "your opponent gets the cleaner path to build their four-in-a-row line" names a specific line and points at nothing — the only board objects in the run are the col3/col4 overlays; the real line (opponentPunishment.window c6r3,c5r4,c4r5,c3r6) was offered as alias opp-future-fork and never used. | run 1 A7d: idea ("central grip") is pure opening-principle recitation with no square instantiating it — key_cells was emitted EMPTY in the raw answer; the stored list is only the col3/col4 zone expansion. | run 1 G7b: emitted [term:centrality]…[/term:centrality]; render_decision.zones.terms offers only slug double_threat, so dropUnoffered (zoneAnnotations.mjs:255) silently deleted it and annotationRepairs stayed [] — the drop is invisible downstream. | run 1 G7 (required set): render_decision.requiredSet demands spec future:windows:c5r4,c7r3 (handle opp-future-fork); run 1 emitted no such zone. compute.mjs -cond D does not run the production required-set retry, so the non-compliance persisted. | Board observation (./visualize_board.sh 32655): P1 holds c4r1,c7r1,c6r2, P2 holds c3r1,c6r1; bestCol 3 = display column 4 (the centre file), playedCol 2 = column 3 — centrality claim board-true, matching openingContext.defense.centralityGrounded=true / bestDefenseCol=3. | G4/G5 verified on render_decision.finalMovestring 32655232205200200033311111134455564: col5 row4 (X) [GT] and col7 row3 (X) [GT] are both listed major threats there, so run 0’s "two finishing squares" (c5r4, c7r3) and the opp-future-fork alias spec are board-true on truthBoard projectedDeep. | G6: route=sign, lostResource.kind=conditional_swindle, patternOnAfterBestBoard=null -> L7 is the correct pick per causalLinks.mjs L7 when-clause; no routing defect. render_decision is byte-identical across both runs (no divergence bug). | Intermittency: run 0 grounds the fork correctly and satisfies the required set; run 1 does neither — same prompt, same render_decision, divergent grounding behaviour.

> **eval-24** (prompt_confusion) — render_decision.link.text states "Column 4 is your most stubborn defense" verbatim (L7) and hands over the swindle/watch-columns detail, yet both runs name the better move only as "the more central column" inside a [zone:better-col] handle and anchor nothing to a square — A6 fails and A7d fails as abstract centrality recitation; secondary G7a on run 0 (the better-col handle wrapping the abstract noun "centrality", plus an unoffered [term:parity] that dropUnoffered silently removed with no annotationRepairs entry).
>
> render_decision is byte-identical across both runs (no divergence). | Board observed: 32655, Gray (P2) to move at move 6; after-best 326553 puts O on c4r2 (col 4), after-played 326555 puts O on c6r3 (col 6). Solver: after-best Green best +2, after-played Green best +4 -> both lose for Gray, played loses faster; case lose_to_faster_lose confirmed, A2 loss/loss correct. A1: better_move 4 - 1 === bestCol 3. | A6 fail (both runs): cleaned prose contains no "column 4" token; the column appears only inside the zone handle (run0 "the more central column", run1 "the more central column ... the right-side column you chose") — exactly the stated FAIL condition. Decision block was present and correct, so triage is prompt_confusion. | A7d fail (both runs): a named idea (stay central / central hold is the tougher defense) with zero squares instantiating it. The render offered groundable material the answers ignored — projectedDeep board shown, resource.completingCell c2r5, lostResource.parityAttribution.controllingGroup c1r2-c4r2, anchorCells c2r1, and link.text watch columns 1,2,3,5,6,7. | A7b fail (run 0 only): "the long parity battle that follows" promises a specific fight and resolves to no cell or line, although lostResource.parityAttribution.controllingGroup (c1r2,c2r2,c3r2,c4r2) and completingCell c1r2 were rendered. | A5b applies (player 2, boardState opening) and PASSES both runs: no defeatist wording, both positively frame the better move as the tougher/most-resilient defense that makes the opponent work harder — the L7 guardrail was honored (G2a pass). | A3/A4 pass: no tactic or cell claim is contradicted by visualize_board.sh (neither board has any major threat); key_cells are purely the col4/col6 zone expansion (condition-D overlay exception); "book line" is true — openingContext.defense allen-third-row-gambit with matchedPrefixLen 5 covers the whole 5-move movestring. | G6 pass: route "sign", lostResource.kind conditional_swindle -> L7 is the correct catalog entry (causalLinks.mjs L7 when-clause); patternOnAfterBestBoard null, no L2/L3 branch involved. | G4 vacuous pass: neither answer names any cell or line, so nothing to check against render_decision.finalMovestring 32655532622056002000211133335544411. | G7 fail (run 0 only, intermittent across runs): raw emitted [zone:better-col]centrality[/zone:better-col] — the handle role is "the column of the better move" and "centrality" is not a column phrase (semantically wrong binding); raw also emitted [term:parity] while render_decision.zones.terms is EMPTY, so dropUnoffered stripped it and annotationRepairs stayed [] (the served text is clean, but the model reached for a term vocabulary that was never offered).

> **eval-25** (render_bug) — The opening path of buildReasonRenderModel emits self-contradictory obligations — the composed guardrail concatenates L6 ("name both lines with their horizons") with the O1 openingFrame guardrail ("Do NOT ground a specific deep completing cell"), the pruned JSON residue strips lostResource.completingCell/forkCells, and requiredSet still demands [zone:you-future-fork] whose truthBoard (projectedDeep) plus the afterBest board are never rendered (boards:[decisionBoard]) although render_decision.boards records both as shown:true — so both runs faithfully produced a book-line/centrality narration with zero annotations and no named tactic, even though column 6 makes a gravity-top vertical major threat at c6r5 (verified on 32655333535) leading to the fork c5r6/c7r3.
>
> A3 (both runs): mechanism names no tactic at all — visualize_board on the after-best board 32655333535 shows "Major threats: col6 row5 (X) [GT]" (the vertical c6r2-c6r5), which is the decisive reason column 6 wins (decision-board solver row: col6 +2, col7 -3); run 0 has empty key_cells, run 1 key_cells are only the two landing squares c6r4/c7r2. | A7a/A7d (both): the reason given is "you left the book line / column 6 is more central", an outcome plus a rule with no board object; A7b (both): "your own winning line" / "the four-in-a-row line you were aiming for" promise a specific line and resolve to nothing — the you-immediate-line and you-future-fork handles existed but were never emitted and their truth boards were not rendered. A7c not charged: the narrated mechanism is not a fork (the engine's is), and no fork-PIVOT square was offered (OI-182). | G2 (both): L6 guardrail requires naming BOTH winning lines with their horizons; neither run mentions the opponent forced win (completingCell c1r5, 27 plies) or any horizon — the same Guardrail line simultaneously forbids grounding the deep cell. | G3 (both): the prompt renders ONLY the decision board, yet the required handle you-future-fork is labelled "(on the projectedDeep board)" and you-immediate "(on the afterBest board)"; render_decision.boards claims afterBest and projectedDeep shown:true — a ground-truth mismatch with assembleGroundedPrompt. | G7 (both): requiredSet [you-future-fork] never emitted; zero [zone:]/[term:] tags in either mechanism; annotationRepairs empty so G7c is clean. | G5/G6 pass: every offered alias spec is board-true (c6r5 gravity-top X on afterBest; c6r2-c6r5 vertical; c5r6 and c7r3 both listed as "[GT]" X major threats at the terminal of finalMovestring 3265533353553000225000211111122444644; decision board "Major threats: none" matches the rendered "(no tactics)"), and L6 is the correct link (route sign, both halves winning_line). | render_decision identical across both runs. | Not intermittent: both runs fail the same axes.

> **eval-26** (render_bug) — Both runs sell a double threat at c5r6/c7r3 but never name the square that CREATES it (c5r5, lostResource.line ply 37) because render_decision.zones.aliases offers c5r5 only as opp-future-fork (“their later forcing square”) and requiredSet obliges only the two finish squares — A7c fails on every run; secondarily run 1 never names column 6 in prose (A6, prompt_confusion) even though the better column is stated verbatim in the Decision block/better-col alias.
>
> A7c (both runs): visualize_board.sh on render_decision.finalMovestring 3265533353553000225000211111122444644 shows X major threats at col5 row6 [GT] and col7 row3 [GT] created by X 37 at c5r5 — the pivot; no run names it, and no alias frames c5r5 as the players own fork-creating square. | A7a (run 1): “you broke the opening rhythm and lost the parity fight that makes your win work” restates an outcome and contradicts render_decision.openingContext.parityFavor.favorsMover=false. | A6 (run 1): cleaned prose says only “the better move” / “the book line” — no “column 6”; run 0 passes with “column 6”, hence intermittent. | A1/A2 verified: solver row on the decision board 3265533353 gives col6=+2 (win), col3=-1 (loss), better_move 6 = bestCol 5+1. | A3/A4 verified true: lost-resource fork c5r6+c7r3 on the engine line, opponent fork c5r5 (col5 row5 [GT] and col5 row6 for O) on opponentPunishment.finalMovestring 3265533353225510120112200011666035664444; “column 6 is the booked move” matches openingContext.namedOpening.bookNextCol=5 (0-indexed). | G-checks: render_decision identical across both runs; annotationRepairs empty (G7c clean); every emitted zone spec (col6, col3, future:windows:c5r6,c7r3, future:c5r5) expands from an offered alias and both requiredSet specs were emitted in both runs; you-immediate c6r5 is board-true on afterBest (32655333535 shows col6 row5 (X) [GT]) so G5 holds; route=sign with both halves winning_line → L6 is the correct link (causalLinks.mjs L6 when-clause), G6 holds; afterPlayed (shown:false) was never needed, G3 holds.

> **eval-27** (prompt_confusion) — Both runs dropped the render's own supplied cause — render_decision.link.text (L5) names the parity line completing at c7r3 and lostResource.window [c7r3,c6r4,c5r5,c4r6] — and instead recited opening-book narration ('you left the book line'), while emitting [zone:col2]/[zone:col1] specs instead of the offered handles better-col/played-col from render_decision.zones.aliases.
>
> A3 (both runs): mechanism names no board tactic at all; the decisive reason (the deep parity winning group c7r3/c6r4/c5r5/c4r6, verified reachable on render_decision.finalMovestring 326553335355311140001110002244222444566) is replaced by circular book-line reasoning ('column 2 preserves the opening plan'). visualize_board 32655333535531 shows scr col2=+2 (win) vs col1=0 (draw), so the sign claim is right but unexplained.
> A7b (both runs): 'the forced win that comes many plies later' / 'the parity fight' / 'the built-in parity advantage' promise specific board objects and resolve to nothing — no cell or line is named in prose, and the only zones emitted span whole columns 1 and 2, which are not where the resource completes (c7r3).
> A7d (both runs): abstract rule recitation ('follow the opening', 'keep the built-in parity advantage, not chase a local square') with zero squares anchoring it.
> G7a (both runs): emitted handles 'col2' and 'col1' are the alias SPECS, not the offered handles; render_decision.zones.aliases lists only handles 'better-col' and 'played-col'. annotationRepairs is empty, so G7c did not fire; the failure is the model choosing non-offered handles.
> A4 pass: key_cells are a whole-column zone expansion (condition-D exception), and no per-cell threat claim is made. A5 pass: 2nd person, no field names; 'parity' used as plain C4 jargon; A5b N/A (player===1). A6 pass: 'column 2' appears in the cleaned prose in both runs. G2 pass: L5 guardrail honored (horizon stated as deep, denial mentioned). G6 pass: route 'sign', L9 correctly skipped because opponentPunishment.tie.sharedCells contains c7r3, so L5 is the right rule. render_decision is byte-identical across both runs.

> **eval-28** (prompt_confusion) — render_decision.link (L5) stated verbatim "You had a forced win ... The played move let the opponent deny it at c7r4", yet run 0 inverted ownership of the winning line ("let your opponent keep the decisive diagonal alive") and reframed the forced win as "the toughest defense", while run 1 reduced the whole cause to the opponent taking c7r4 away 37 plies later — the info was present and correct, the model mis-anchored it (secondary: no vector field carries a near-term cause for a ply-3 opening, which is what pushes run 1 to the deep-denial-as-cause framing).
>
> Board observed: decision "32" scr col6=+2 (win) vs col3=0 (draw) — win_to_draw confirmed; after-best "325" all Gray scores negative, after-played "322" Gray best 0. render_decision identical across both runs. | A4 run0: "let your opponent keep the decisive diagonal alive" is board-false — on render_decision.finalMovestring 325223334642441000000211113123446666655 the window c4r1/c5r2/c6r3/c7r4 is ALL GREEN (moves 1,11,35,39) i.e. the PLAYER own winning line, completed by X at c6r3 on ply 39; the opponent DENIES it, never keeps it alive. | G2 run0: L5 guardrail "You had a forced win; state its horizon honestly" not honored — prose says "By playing column 6, you keep the toughest defense", the L7 practical-defense frame, contradicting the run own best_outcome:"win". | A7a run1: the entire stated cause is "you let your opponent take the reply that hits the square that matters later" — the instruction explicit fail pattern (square-taken-away-later as the WHOLE reason); no near-term board change is named, and none exists in the vector for a 3-disc opening. | Not failed: A6 both runs name "column 6" (bestCol 5 + 1) in cleaned prose; G4 all named cells verified on render_decision.finalMovestring; G6 patternOnAfterBestBoard=null matches the tag-free after-best board so L5 (not L2/L3) is correct routing; G7 zone tags are post-expansion specs (processAnnotations expands offered handles to specs and drops unoffered ones) and annotationRepairs is empty on both runs. | Minor, not charged: run 1 emitted only 2 of the 3 requiredSet specs (future:c6r3 / you-key-square missing); both runs put raw cNrM coordinates in coach-facing prose.

> **eval-29** (prompt_confusion) — Both runs fail A7a/A7d: the rendered afterPlayed threat list literally read "immediate at c3r2 (opp)" while the decision board read "major at c3r2 (opp)" — i.e. the played column-3 disc filled c3r1 and turned the opponent's not-yet-reachable four into a next-move win (solver: after-played col3 scores +9 for Green, an immediate mate; after-best col1 only +5) — yet both answers restated only the outcome ("speeds things up by giving your opponent an easier follow-up") and never named the board change, so the blunderer learns nothing locatable about why column 1 resists.
>
> A1 pass: better_move 1 -> 0 === bestCol 0 (decision-board solver row: col1/col2/col7 = -5, col3 = -9, so col1 is a max). A2 pass: case lose_to_faster_lose, both outcomes reported loss, confirmed by the all-negative decision-board score row for Gray. A3 pass: c3r2 is a real opponent (X/P1) major-threat completing square on the decision board (visualizer: "Major threats: col3 row2 (X)") and window c2r1-c3r2-c4r3-c5r4 holds three X discs (c2r1=X17, c4r3=X3, c5r4=X13) plus the empty c3r2 — it is the load-bearing resource and both required-set specs were emitted. A4 pass (marginal): every named cell/line is board-true; the only imprecision is calling c3r2 a "next-move four" on the decision board, where col3 has height 0 so the square is [X] non-gravity (tagBoard kind = major) and only becomes kind=immediate/<X>[GT] on the afterPlayed board — the render's own L3 text ("threat to make four next move at c3r2 is coming no matter what you play here") and the offered term immediate_threat supplied that wording, so it is not charged to the model. A5 pass: 2nd person, no vector/render/solver vocabulary, no defeatist clause; A5b N/A (boardState mid-game). Note only: raw cNrM tokens ("c3r2", "c2r1-c3r2-c4r3-c5r4") appear as player-visible prose. A6 pass: "column 1" is named in the cleaned prose in both runs and bestCol+1 = 1. A7 FAIL (A7a, A7d) on both runs — see failure_summary; A7b passes (every promised object is named/zone-wrapped), A7c N/A (the mechanism is a single immediate threat, not a fork). G1 pass (graded against boards + threat list actually rendered). G2 pass: L3 guardrail honored — neither run says the played move caused/enabled the pattern, neither says the player is lost, no defeatist final clause; no covers code was needed-and-missing (D28: covered-but-absent is normal); confidence high so no hedge required. G3 pass: afterBest was correctly omitted (tagBoard tag-set is byte-identical to the decision board — verified) and nothing the answers asserted required it. G4 pass: c3r2 and window c2r1/c3r2/c4r3/c5r4 are exactly the cells on render_decision.finalMovestring 333430643364446615001462. G5 pass: every rendered threat-list entry is board-true on its stated board (decision: major c3r2, double c3r2/c6r3, major c6r3 — all confirmed by visualize_board.sh). G6 pass: L3 fired on route=realized_denied + direction=enabled_opponent + case=lose_to_faster_lose per D30 (patternOnAfterBestBoard=true is informational only, and is geometrically correct — the opponent tag at c3r2 persists on base+0). G7 pass: raw output used the offered handles [zone:opp-major] and [zone:opp-major-line] (the stored specs are the post-processing expansion), both required-set members, roles matched, terms limited to the offered immediate_threat slug, annotationRepairs empty. unsure_about empty on both runs — no abstention signal.

> **eval-30** (render_bug) — Both runs fail A7c: the mechanism names the opponent double threat only by its finishing square c6r2 (+ its diagonal window), while the square that CREATES the stacked fork — c3r5 on the engine finalMovestring 3334302233464054222 — is carried in opponentPunishment.line[].cell and marked rendered, yet renderReasonModel.mjs deriveRequiredSet/halfForkCellsSpec (OI-182) neither required nor even OFFERED it as a zone alias, so the coach lists the effect and never the cause.
>
> A1 pass (better_move 1, bestCol 0). A2 pass (lose_to_faster_lose -> loss/loss; visualize_board on 333430223346405 shows every column negative for Gray, best col1 -9 vs played col5 -11). A3/A4 pass: on the render finalMovestring board (move 19) Green has major threats at col6 row2 (gravity-top, completing diagonal c6r2-c5r3-c4r4-c3r5 with X13/X5/X19) and col6 row3 (completing row3 X17/X3/X13) — the named fork square and window are board-true; key_cells are the zone-expanded window cells (condition-D overlay exception). A5 pass on stripped prose (2nd person, no banned vector/render vocabulary; the phrase "once the forced sequence reaches it" is the render own alias role text, not model-introduced jargon); A5b N/A (boardState mid-game). A6 pass ("Column 1" named in prose, bestCol+1 = 1). A7c fail on both runs — mechanism IS a double threat, only the finishing/completing square is named; the fork-creating column-3 climb (c3r3 ply17, c3r5 ply19) is unnamed and was never offered as a zone (zones.aliases contains only future:c6r2 and future:windows:c6r2,c5r3,c4r4,c3r5). A7a/A7b/A7d pass. G1 pass (answer faithful to the composed L7 text). G2 pass: L7 guardrail honored — no "you win", no "you are lost", no defeatist closing caveat; confidence high so no hedge required; no needed covers code missing (D28 family-wide covers). G3 pass: afterPlayed shown:false was not needed — the fork claim lives on projectedDeep, which is shown. G4 pass: all named cells traced on render_decision.finalMovestring 3334302233464054222, no alternate PV used. G5 pass: every alias spec is board-true on its truthBoard (decision: c2r2 [O], row-2 window O14/-/O8/O2, c3r4 [X], diagonal c6r1/c5r2/c4r3/c3r4; afterBest 3334302233464050: c1r4 <O> gravity-top, column-1 window O6/O14/O16/empty, and both cells of you-double are genuine Gray majors). G6 pass: route sign, lostResource.kind conditional_swindle -> L7 is the correct link (no L2/L3 branch involved; patternOnAfterBestBoard null). G7 pass: both emitted zones expanded from offered handles opp-future-fork / opp-key-line with phrases matching their roles verbatim, [term:double_threat] is an offered slug correctly denoting the concept, annotationRepairs empty (no G7c). render_decision identical across both runs.

> **eval-31** (prompt_confusion) — Run 1 broke the L9 guardrail ("hedge — do not fabricate a crisp cause") by asserting the opponent has a next-move four at c6r2, which visualize_board.sh on the after-played board 33333444463010112 shows as a NON-gravity [O] threat (col6 height 0, opponentPunishment.pliesToEnd 21), while run 0 never named column 5 in prose even though bestCol was in fieldPartition.rendered; a secondary render gap is that causalLinks.mjs L9 is the only sign-family template that never states "Column N".
>
> A6 (run 0): cleaned prose says only "The better column" / "the played move" — no "column 5" anywhere; bestCol=4 (display 5) is listed in render_decision.fieldPartition.rendered, so the info was present. | A7b (run 0): "lets the other side take control of the last important landing spots" is a definite description of specific board objects that is neither named in prose nor wrapped in any emitted [zone:]; "on the next branch" is likewise unlocatable. | A4 (run 1): "your opponent’s own [term:immediate_threat]next-move four[/term:immediate_threat] on c6r2" is board-false — on 33333444463010112 the visualizer marks col6 row2 as [O] (non-gravity, column 6 is empty so the landing square is c6r1); the opponent win is 21 plies out. | G2 (run 1): link L9 confidence "low" with guardrail "The culprit square is not cleanly isolable; hedge — do not fabricate a crisp cause"; run 1 instead asserts a crisp cause ("you gave up c6r5, and your opponent’s next-move four on c6r2 now decides the position") with no hedge. | Verified board-true (no failure): decision board 3333344446301011 shows col3 row2 [X] and col6 row2 [O]; render_decision.finalMovestring 33333444463010114004002222226665551161655 ends with X at c6r5 completing c4r3·c5r4·c6r5·c7r6 — the you-key-line/you-key-square aliases are real on projectedDeep (G4/G5 pass). | G6 pass: route "sign", patternOnAfterBestBoard null, L9 fires correctly per causalLinks.mjs:97-102 (winning_line + register parity + tie.kind "independent" ⇒ no shared cell). | G7 pass both runs: stored mechanisms contain expanded specs because processAnnotations (zoneAnnotations.mjs:317-321) rewrites offered HANDLES to specs and dropUnoffered would have deleted raw specs; all three requiredSet handles (you-key-square, opp-major, you-key-line) were used and role-matched, annotationRepairs empty. | render_decision is byte-identical across both runs — no divergence.

> **eval-32** (prompt_confusion) — Run 1 never names the better column in prose — render_decision.link.text supplies it verbatim ("The better move (col 6) occupies c6r2") and the solver confirms display col 6 is the only non-losing move (scr row: col6=0, all others -11), but the model referred to it only as the raw token c6r2 while explicitly naming "column 5" (the played column), so a reader would take column 5 as the recommendation.
>
> A6 run 1 FAIL: cleaned prose = "You had to take the blocking square at c6r2 ... By playing in column 5 instead ..."; bestCol+1=6 never appears as "column 6"; the only column named is 5, the played column. Run 0 passes A6 ("the block in column 6 is the tougher defense"). | A1/A2 verified: better_move=6 === bestCol(5)+1; visualize_board scr row on 33333444463010112215 gives col6=0 (draw) and col5=-11 (loss), matching draw_to_lose. | A3/A4 pass both runs: c6r2 is the gravity-top major threat for O (visualizer "Major threats: col6 row2 (O) [GT]") and c7r1/c5r3/c4r4 are all O discs, so the diagonal c7r1-c6r2-c5r3-c4r4 is real and blocking it at c6r2 is the decisive reason. | A5 pass: 2nd person, no banned vector/render vocabulary after stripping markup (note: both runs leak raw cNrM coordinates into player-facing prose, which is not on the A5a closed ban list but is the same class of defect that caused run 1 to fail A6). | A7 pass both: cause-first (unblocked completing square), referents locatable and zone-wrapped, not a fork so A7c N/A, named idea + squares. | G7a pass: the stored mechanism holds expanded specs ([zone:c6r2], [zone:windows:c7r1,c6r2,c5r3,c4r4]); zoneAnnotations.mjs dropUnoffered runs BEFORE handle->spec expansion, so surviving specs prove the model emitted the offered handles opp-immediate and opp-immediate-line — both requiredSet entries used in both runs. annotationRepairs empty, so no G7c auto-fail. | G6 pass: route=realized_denied + direction=defensive_miss selects L4 in causalLinks.mjs; patternOnAfterBestBoard=null is informational only and does not drive routing. | G3 pass: afterPlayed shown:false was not needed — the whole reason lives on the decision board. | G4/G5 pass: render_decision.finalMovestring is the decision position itself and every named cell is board-true on it. | render_decision is byte-identical across both runs (no divergence bug).

> **eval-34** (prompt_confusion) — Both runs fail A6: render_decision.link.text states "The better move (col 5) completes your threat to make four next move at c5r6" verbatim, yet neither mechanism names column 5 in prose — run 0 names only the played column ("By playing column 1 instead") and run 1 says only "By playing elsewhere", so the player is never told where to play; the board confirms c5r6 is a gravity-top X major threat (scr col5 = 2 win, col1 = 0 draw).
>
> A6 run0: cleaned prose mentions only "column 1" (the played col, playedCol=0); the better column (bestCol=4 -> display 5) appears nowhere outside the [zone:c5r6]/[zone:windows:...] handles. A6 run1: no column token at all ("By playing elsewhere"). Not intermittent — both runs fail identically. A1 passes on both (better_move=5, bestCol+1=5), so the model KNEW the column and simply omitted it from the coach prose. A3/A4 verified on ./visualize_board.sh 33333111155545355220244122462616660064: row 6 is X at c2,c3,c4 and c6,c7 with c5r6 empty and gravity-top ([GT] major threat, ht col5 = 5), so c5r6 completes c4r6-c7r6 and c2r6-c5r6; G4 traced on render_decision.finalMovestring 3333311115554535522024412246261666006404 whose ply-40 opponent move lands exactly on c5r6, matching opponentPunishment.line. G7: both runs emitted only offered handles (you-immediate -> c5r6, you-key-line -> windows:c4r6,c5r6,c6r6,c7r6 = exactly the requiredSet; run1 additionally used the offered term slug immediate_threat on its canonical phrase); annotationRepairs empty on both. G5: every alias spec is board-true on the decision board (c1r6 and c5r6 are both X major threats per the visualizer threat list). G6: L1 is the correct route for realized_denied + missed_own (causalLinks.mjs:48-52) and its guardrail is honored — both answers attribute the pattern to the player, not the opponent. render_decision is byte-identical across the two runs. Minor render observation (not scored): alias you-double has spec "windows:c1r6,c5r6" while its role text describes "the single fork square" — a role/spec mismatch, unused by both answers.

> **eval-35** (prompt_confusion) — Both runs fail A6: the better column (bestCol=3 -> "column 4") is stated in the rendered Decision block (fieldPartition.rendered includes bestCol, and both runs set better_move:4 correctly), yet the coach prose never says "column 4" — it appears only inside the [zone:better-col] handle (expanded to [zone:col4]) and as the vague "central-column opening line"/"central column move"; run 1 additionally fails A7b with the dangling referent "the better central connection", which points at no cell even though render_decision.link.text supplied the winning group c2r5-c3r5-c4r5-c5r5.
>
> Board (movestring 33, two discs in display col 4): solver scr row gives col4=+1 (win) and col3=-2 (loss), confirming case win_to_lose and A2 (best=win, played=loss); A1 holds (better_move 4 - 1 === bestCol 3). | A6 run0+run1 fail: cleaned prose (markup stripped) contains no "column 4"; the only column token is inside the emitted zone handle, which A6 explicitly rejects. | A7b run1 fail: "your attack no longer reaches the better central connection" names a specific board object with no cell/line named and no zone wrapping it. | A7 run0 passes: both referents ("central-column opening line", "the side-branch move") are wrapped in emitted zones better-col/played-col; honest-minimal exception is VOID because lostResource.completingCell c5r5 + window were rendered in link.text. | A3/A4 pass: no concrete board claim is made beyond the opening/parity framing, and the 12 key_cells are the D-exception zone expansion of col3+col4 (processAnnotations expandSpec), not per-cell threat assertions. | A5 pass: 2nd person throughout, no internal/vector terminology ("parity fight" and "book line" are ordinary jargon); A5b N/A (player===1). | G1-G7 pass: L9 correctly fired (route sign, lostResource.kind winning_line, register parity, tie.kind independent), confidence low and both answers hedge with confidence:"low" + non-empty unsure_about honoring the "do not fabricate a crisp cause" guardrail; boards marked shown:false (afterBest/afterPlayed) were not needed; no cell is named in prose so G4 has nothing ungrounded; decision board shows "Major threats: none" so the threat list is board-true; patternOnAfterBestBoard is null and the link is not L2/L3; both emitted handles better-col/played-col are in zones.aliases with role-matching phrases and annotationRepairs is empty. | render_decision is byte-identical across both runs. | Abstention: both runs abstain on isolating a concrete finishing square, although lostResource.completingCell (c5r5) and lostResource.window were rendered and even restated in link.text.

> **eval-36** (prompt_confusion) — Run 1 never names the better column in the coach prose ("By playing elsewhere") even though render_decision.link.text states "the better move (col 3)" verbatim and alias better-col (spec col3) was offered — A6 fail; run 0 says "column 3" and passes, so the defect is intermittent; secondary: better-col is absent from render_decision.requiredSet, so naming/highlighting the better column is only suggested, never obliged.
>
> A6 run1 FAIL: cleaned prose = "You needed the move in c1r4 to keep your opponent from finishing that four-in-a-row line. By playing elsewhere, you left that defense undone, and your opponent can force a win later from the same central threat." — no "column 3" (bestCol 2 + 1) anywhere; the only column-ish token is the raw cell c1r4, which A6 explicitly disallows as a column reference (and which points at column 1, not 3). | render_decision identical across both runs (deep-equal), annotationRepairs empty in both, so G7c does not fire. | Board check (visualize_board.sh 33211333455011222): c1r4 IS a gravity-blocked major threat for X/P1 and the window c4r1(X1),c3r2(X15),c2r3(X13),c1r4(empty) is a real P1 diagonal — A3/A4 hold. Solver rows: col3 (idx2) = 0 -> draw, col6 (idx5) = -4 -> loss, matching case draw_to_lose (A1/A2). | G4: replaying render_decision.finalMovestring 33211333455011222520112355566666600 puts P1 on c1r4 at the FINAL ply 35, completing c4r1/c3r2/c2r3/c1r4 — every named cell is grounded on the engine own line, not an alternate PV. | lostResource.finalMovestring 332113334550112222341000 has P2 occupying c1r4 at ply 24, so "you needed the move in c1r4" is a legitimate compression of the denial/occupation resource, NOT an A4 fabrication (c1r4 is not playable this turn — col1 height 1 — but the instruction forbids ruling a finalMovestring-real cell false from board absence). | A5b N/A: player 2 but boardState is mid-game. A5a passes: 2nd person, no field names/engine slugs; both runs do surface the raw coordinate token c1r4 in player-facing prose, which is not on the A5a banned list but reads as render notation to a player — flagged, not charged. | G7a: both runs emitted only offered handles (opp-major, opp-major-line = exactly render_decision.requiredSet), roles match the wrapped phrases, postprocessAnswer expanded them to specs with zero repairs. G7b: no [term:] used; the offered double_threat term was not needed. | G5 spot-check of offered aliases on their truthBoards: opp-major c1r4 and you-major c1r5 are both major threats on the decision board; you-major-2 c5r3 and windows c3r3,c4r3,c5r3,c6r3 are board-true on afterPlayed (33211333455011222+5). | G6: route sign, patternOnAfterBestBoard null, case draw_to_lose -> L8 is the correct fire (causalLinks.mjs:92-96); no L2/L3 branch involved. G3: only afterBest was shown:false and neither answer needed it.

> **eval-38** (prompt_confusion) — Run 1 never names the better column in prose (“the more central column”, number only inside the [zone:col3] overlay) even though render_decision.link.text states it verbatim — “the better move (col 3) holds it by occupying c4r3” — and the solver confirms col index 2 (display 3) is the only-scoring-0 reply alongside 4/5/6 while the played col index 1 scores -2.
>
> A6 run 1: cleaned prose is “You needed the more central column to keep more four-in-a-row lines alive… By playing the side column you chose…” — the digit 3 appears nowhere outside the zone handle; run 0 passes with “the more central column 3”, so the defect is intermittent, not systematic. | A1/A2 verified on the board: ./visualize_board.sh 2 shows one green disc at c3r1, scr row = [-2,-2,0,0,0,0,-3] for the side to move (P2), so bestCol 2 (display 3) draws and playedCol 1 (display 2) loses — case draw_to_lose, better_move 3, best_outcome draw, played_outcome loss all correct on both runs. | A5b applies (player 2, boardState opening) and both runs pass: neither says the position is lost and both frame column 3 as the tougher, harder-to-break holding move. | Borderline, not failed: run 1’s “the tougher book move here” is unsupported — render_decision.openingContext.lead is all-null (id/family/bookCol null), so no book line was matched; it is not a board claim so it is not an A4 fabrication, but it is manufactured opening authority. | G7 passes: the stored [zone:col3]/[zone:col2] are the post-expansion form of the offered handles better-col/played-col (zoneAnnotations.mjs processAnnotations expands handle→spec), annotationRepairs is empty on both runs, and each zone wraps a phrase matching its role. | G6 passes: patternOnAfterBestBoard is null and L8 is the correct sign-family link for case draw_to_lose (causalLinks.mjs:92-96). | render_decision is byte-identical across both runs.

> **eval-39** (prompt_confusion) — Both runs fail A6: render_decision.link.text states the better move verbatim as “The better move (col 4) occupies c4r1”, yet neither mechanism ever names column 4 in words — run 0 says only “You had to take c4r1” and run 1 “You needed the block at c4r1”, so the better column reaches the player only as a raw cNrM token (run 1 does say “column 5”, but that is the PLAYED column, which risks reading as the recommendation).
>
> A6 (both runs): bestCol=3 ⇒ display column 4; cleaned prose contains no “column 4”, only “c4r1” / “the block at c4r1”. Consistent across both runs — not intermittent. | Secondary (not charged): the player-facing prose leaks internal cNrM coordinate notation throughout (“c4r1”, “the c3r1-c4r1-c5r1-c6r1 line”, “c5”); A5a’s ban list enumerates field names, not coordinate tokens, so A5 is scored pass, but this is the same defect class A6 exists to catch. | A5b applies (player=2, boardState=opening) and PASSES: neither run says the position is lost; both frame it as the necessary defensive block. | Board truth (visualize_board.sh 2152254): opponent (X/P1) has a gravity-top major threat at col4 row1 on the row c3r1·c4r1·c5r1·c6r1 (c3r1=X, c5r1=X, c6r1=X) — A3/A4 claims all true. | afterPlayed 21522544: <X> at c4r1 still live AND [O] at c4r2 (row c3r2·c4r2·c5r2·c6r2 = O,_,O,O), so run 0/1’s “your own c4r2 threat comes too late” is board-true. | afterBest 21522543: “Major threats: none” ⇒ render_decision.patternOnAfterBestBoard=null is correct, L4 routing correct (G6 pass). | G7: stored mechanism is post-expansion (compute.mjs postprocessAnswer → processAnnotations), annotationRepairs=[] ⇒ nothing dropped, so every emitted zone came from an offered handle (opp-immediate→c4r1, opp-immediate-line→windows:c3r1..c6r1, you-major→c4r2); LINE_STEER honored (line phrasing wrapped in the line handle); both requiredSet specs emitted in both runs. | G5: every alias spec is board-true on its truthBoard (col4/col5 on decision; c4r1 + windows on decision; c4r2 + windows:c3r2..c6r2 on afterPlayed). | G3: only projectedDeep is shown:false and no run needed it. | G2: L4 guardrail “frame it as a missed defense” honored by both runs; confidence high, no hedge owed.

> **eval-40** (prompt_confusion) — Run 0 fails A6: it names the better move only as the raw cell token "c5r1" and the only column word in the prose is "column 3" (the played, wrong column), even though render_decision.link.text states verbatim "The better move (col 5) occupies c5r1" — run 1, same record, says "column 5", so this is intermittent model phrasing, not missing info.
>
> A6 run 0: cleaned prose = "You needed to take the blocking square at c5r1 ... By playing column 3 instead ..."; bestCol=4 => display column 5 is never named as a column; the raw cNrM token is an explicit A6 FAIL. Board check (./visualize_board.sh 35201): X holds c2r1/c3r1/c4r1 with a gravity-top major threat at col5 row1, scr col5=-2 vs -18 elsewhere, so both moves lose (case lose_to_faster_lose, A2 pass) and the block at c5r1 is the decisive mechanism (A3/A4 pass). After the played move (352012) col5 scores +18 for X, confirming the threat survived. render_decision identical across both runs; annotationRepairs empty on both; all emitted zone specs (col5, col3, c5r1, windows:c2r1,c3r1,c4r1,c5r1) map to offered aliases better-col/played-col/opp-immediate/opp-immediate-line and both requiredSet specs were emitted in both runs (G7 pass). Route realized_denied + direction defensive_miss => L4 is the correct link (G6 pass); afterPlayed board omitted was not needed (G3 pass). A5b applies (player 2, opening): neither run says the player is lost and both frame the better move as the missed defense, so A5b passes despite render_decision.openingContext being null.

> **eval-41** (prompt_confusion) — Both runs fail A6 — neither mechanism names the better column in prose even though render_decision.link.text states it verbatim ("The better move (col 5) completes your threat to make four next move at c5r3"); run 0 additionally fails A4 by calling the better move a threat-preserving "toughest defense" when 2345153551111014334 is GAME OVER (X completes c3r1-c4r2-c5r3-c6r4 immediately).
>
> A6 run0: prose says only "the better move was the toughest defense" — no column named; the played column is not named either. A6 run1: names only "column 7" (the played column, playedCol=6); bestCol+1=5 never appears. A4 run0: visualize_board.sh 2345153551111014334 prints [GAME OVER] — playing col5 lands on c5r3 and completes the diagonal, so "preserved your next-move four and forced them to answer it" is board-false, and the L3-style "toughest defense" frame is wrong for a win_to_lose L1 case. A3/A4 otherwise hold: on 234515355111101433 the visualizer shows <X> at col5 row3 [GT] with c3r1=X1, c4r2=X7, c6r4=X9 and scr col5=+12 vs col7=-2. G7a: both runs emitted only offered handles (you-immediate, you-immediate-line) — the jsonl mechanism shows post-expansion specs; raw shows handles; requiredSet fully covered; annotationRepairs empty. G7b: [term:immediate_threat] is offered and wraps "the next-move four-in-a-row threat", matching its canonicalPhrase. G5: every alias spec is board-true on its truthBoard (checked decision + afterBest, incl. you-double windows:c3r3,c7r5 and you-major-line c4r2,c5r3,c6r4,c7r5). G6: L1 routing correct (route=realized_denied, direction=missed_own); patternOnAfterBestBoard:null is informational only per the D30 comment in causalLinks.mjs. render_decision identical across both runs. Minor, not charged: both runs speak raw cNrM coordinates in the coach prose ("c5r3", "c3r1, c4r2, c5r3, and c6r4"), which A5a does not list as banned but reads as internal notation to a player.

> **eval-42** (render_bug) — L3 fired with patternOnAfterBestBoard=false and its guardrail/covers forbade and removed the only true reason — playing column 1 OCCUPIES c1r4 (lostResource.kind='denial'/verdict='occupation', both in L3's covers), which on the board kills the opponent's 7-fork (after-best 31133025134544600550 leaves only col3row3 as an X major, scores flip -10 to +2, while after the played move X takes c1r4 and gets the gravity-top double threat c3r2/c3r3) — so both runs wrote vacuous 'toughest defense' prose and neither named c1r4.
>
> A3 (both runs): the decisive reason is never named — column 1 lands on c1r4 and denies the opponent the square that builds the 7-fork; run 0 says only that col 1 "keeps the pressure pointed at c3r2", run 1 only "meets the key square in the most resistant way". | A4 run 0: "[zone:played-col]Column 4[/zone:played-col] lands on the same shared support" is board-false — column 4 has height 4 and lands at c4r5 (visible as O 20 in 311330251345446005530); the shared cell c1r4 (tie.sharedCells) is where COLUMN 1 lands. | A4 both runs: "your own / your four-in-a-row line" wrapped in [zone:you-key-line] = windows:c4r1,c3r2,c2r3,c1r4, which on the decision board holds X 1 at c4r1 and X 9 at c2r3 and no gray disc — it is the OPPONENT line, not yours. Render-sourced (see G5). | A7c (both runs): the fork pivot is c1r4 — the opponent creates the double threat by taking it (render finalMovestring 311330251345446005530 ends with X at c1r4, after which c3r2 is a gravity-top X major and c3r3 an X major). It was offered as you-key-square and sits in requiredSet; neither run named it. | A7a/A7d run 1: pure resistance abstraction ("most resistant way", "as intact as possible", "reaches the same forcing idea with less work") with no board change named and no square anchoring the idea. | G2 (both runs): over-removal — lostResource.kind=denial and lostResource.verdict=occupation are in L3 covers/fieldPartition.covered, so the prompt never carried WHY column 1 resists; they are present in the vector and were the answer. Run 0 additionally ends on the defeatist clause "your own four-in-a-row line never has time to matter", which L3 guardrail forbids. | G5 (both runs): two render-layer falsehoods on the decision board — (a) aliases you-key-square (c1r4) and you-key-line (windows:c4r1,c3r2,c2r3,c1r4) carry roleText "...you are playing for" although the window is the opponent diagonal (zoneAnnotations.mjs hardcodes owner=you for the lostResource half even when kind=denial); (b) link.text "Your opponent 7-shaped double threat at c3r2 is coming no matter what you play here" is false — after 31133025134544600550 the c3r2 fork does not exist (only col3row3 X major remains). | G6 pass: L3 is the by-design pick under D30 (case=lose_to_faster_lose gates the outcome sentence, patternOnAfterBestBoard is informational), so this is not a wrong L2/L3 pick — the defect is L3 text/guardrail asserting non-causation on a board where patternOnAfterBestBoard=false. | G7 pass: raw handles used (better-col, played-col, opp-key-square, you-key-line) are all in zones.aliases, wraps match their stated roles, annotationRepairs empty. A5/A6 pass: both runs name "column 1" (bestCol+1=1) in 2nd person with no vector terminology; run 0 does leak the raw coordinate token "c3r2" into coach prose (not in the A5a banned list, noted only).

> **eval-43** (render_bug) — Both runs fail A7 (a+c): buildAnnotationOffer in zoneAnnotations.mjs gates the fork aliases/term on half.tacticTag==="double_threat" while this record carries opponentPunishment.tag/cells/windows, so the second fork square c6r2, the row-2 window c3r2-c4r2-c5r2-c6r2 and the fork pivot c4r2 were never offered, and L3’s template supplies only a tempo frame (“only speeds up the finish”) — the visualizer on 43421122112604010042053 shows X gravity-top majors at BOTH c4r3 and c6r2 after the pivot at c4r2, the real board cause the coach never states.
>
> render_decision identical across both runs; annotationRepairs empty on both. A7a: run0 "column 6 gives them an easier path to press it" / run1 "lets that pressure resolve more cleanly and gives them the easier finish" state tempo/result, never the board change (playing col6 fills c6r1, making c6r2 reachable so the opponent’s col-4 drop at c4r2 forks c4r3 + c6r2 — decision board shows col6 height 0 and only minor (*) marks at c6r2). A7c: mechanism IS a double threat (opponentPunishment.tag=double_threat, cells c4r3+c6r2) yet neither run names the fork-creating square c4r2 nor the second finishing square c6r2; per OI-182 neither was offered in render_decision.zones.aliases (only col1, col6, c4r3, windows:c2r1..c5r4, c4r5, windows:c1r2..c4r5). A3/A4 pass: c4r3 major and the diagonal c2r1-c3r2-c4r3-c5r4 (X at c2r1,c3r2,c5r4) are board-true on the decision board; col1/col6 key_cells are zone-overlay expansions (condition-D exception). A5 passes (2nd person, no vector terms; A5b N/A — boardState mid-game); A6 passes (both name “Column 1” in prose, bestCol+1=1). G2 guardrail honored: no “your move created it”, no defeatist closing clause. G6: L3 correctly routed (realized_denied + enabled_opponent + lose_to_faster_lose). G3: afterBest/afterPlayed omitted but their major-threat sets really are identical to the decision board, and projectedDeep (shown) carries c6r2.

> **eval-44** (prompt_confusion) — Run 1 ignored the L2 link text/guardrail that verbatim supplies the conceded cell c3r1 and the opponent double threat on c3r1-c4r1-c5r1-c6r1 (board-confirmed on render_decision.finalMovestring 44315, where Green holds c4r1/c5r1/c6r1 with gravity-top majors at c3r1 and c7r1), giving only generic centrality prose and mis-binding both offered column zones (played-col wrapped "the move that lets your opponent answer most cleanly", better-col wrapped "the stronger central hold" attributed to the opponent).
>
> render_decision identical across both runs; annotationRepairs empty in both. Board facts: decision board 443 has no major threats and solver scr row gives 0 (draw) only at display cols 3 and 6, -18 (loss) at played col 2 - confirms case draw_to_lose, A1/A2 on both runs. After-best 4432 shows no double_threat, so patternOnAfterBestBoard:false and the L2 route are correct (G6 pass). Only the decision board was shown (afterBest/afterPlayed omitted as tag-identical, projectedDeep omitted as register:immediate) and neither run needed a withheld board (G3 pass). Run 0: names the conceded window c3r1..c6r1, which is exactly opponentPunishment.window and is real on finalMovestring 44315 (G4 pass); hold-the-line framing present for a player-2 opening board (A5b pass); "column 3" appears in the cleaned prose (A6 pass). Run 0 secondary observation (not scored): the coach prose exposes raw coordinate tokens "c3r1 to c6r1" to the player, which is a UX/TTS smell but is not on the A5a banned list. Run 1 A3 fail: mechanism names no tactic at all - only centrality plus "their side can force the better result from there" - while the decisive resource (occupying c3r1 to deny the horizontal four-window) went unnamed. Run 1 G2 fail: link L2 guardrail "name the conceded cell" was not honored - no cell appears anywhere in the prose. Run 1 G7a fail: both emitted aliases are bound to semantically wrong phrases relative to their declared roles (played-col role "the column you played" wrapped on a move said to be GIVEN UP; better-col role "the column of the better move" wrapped on a hold said to be HANDED to the opponent). Run 1 A7b fail: "the move that lets your opponent answer most cleanly" and "the stronger central hold" name specific objects that resolve to the wrong columns; A7d fail: pure abstract recitation ("more central", "the tougher book move") with no square anchoring it - key_cells are only the two zone-expanded columns. Run 1 also asserts "the tougher book move" although render_decision.openingContext.lead.bookCol is null (no book data offered); not separately charged.

> **eval-45** (render_bug) — Run 0 only: the L2 template's trailing clause 'the better move (col 1) denied it at c4r6' (causalLinks.mjs L2 / render_decision.link.text) compresses a 4-ply forced denial into an immediate-block phrasing, and the model rendered it as 'You should have played the block on [zone:c4r6]', pointing the blunderer at a square in the column he was just told NOT to play (c4r6 is row 6 of col 4, ht=4 on the decision board, so it is not even playable) — the same referent then does double duty as the square the opponent takes.
>
> A7b (run 0): mechanism opens 'You should have played the block on [zone:c4r6]the square that stops your opponent's four-in-a-row line' while better_move=column 1; visualize_board 22142430221041333001166044 shows col4 ht=4 so c4r6 is NOT gravity-top and cannot be played this turn, and the after-best board 221424302210413330011660440 still shows [O] at col4 row6 — the promised 'block' resolves to an unplayable square in the played column, and c4r6 is reused in the next clause as the square the opponent takes. Run 1 is clean: 'Column 1 ... takes that square away' is grounded on the engine's own lostResource.finalMovestring 2214243022104133300116604401233, whose ply-31 you-move occupies c4r6. Case fails on run 0 only => intermittent. A1: better_move 1 = bestCol 0 + 1 on both runs. A2: case draw_to_lose -> draw/loss, matches solver (decision-board scr row: col1..col7 = 0 except col4 = -8). A5b N/A (player 1, mid-game). A6 pass: both runs say 'Column 1'. G5: all 8 offered alias specs verified board-true on their stated truthBoards (opp-major c4r6 and you-major c6r4 on decision; you-major-2 c6r3 and window c7r2,c6r3,c5r4,c4r5 on afterPlayed). G6: L2 is the correct route per D30 (route=realized_denied, direction=enabled_opponent, case!=lose_to_faster_lose); patternOnAfterBestBoard=true is informational only. G7c: annotationRepairs empty on both runs; every emitted zone spec (c4r6, col1, col4, windows:c1r3,c2r4,c3r5,c4r6) expands from an offered alias (opp-major, better-col, played-col, opp-major-line) and both requiredSet entries were used. render_decision byte-identical across the two runs. Minor, not charged: both runs leak raw cNrM coordinates into coach prose (not on the A5a banned list).

> **eval-46** (prompt_confusion) — Run 1 mis-anchored the offered zone handles — it wrapped the literal text "c2r4" with handle opp-major-2 (spec c6r3) and asserted the c6r3/c5r4/c4r5/c3r6 diagonal "runs through c2r4", a square the visualizer shows on a different Gray threat line (c2r4,c3r4,c4r4,c5r4), while run 0 used the same correctly-offered handles cleanly.
>
> Board (2444242213536034432362, Green to move, all cols -8..-10): Gray majors are c2r4, c6r3, c6r4; the figure_7 window c6r3/c5r4/c4r5/c3r6 is 3 Gray + empty c6r3 — engine fields are board-true, so this is not vector_error. | A4 run1: "the key finish is the four-in-a-row line ... that runs through c2r4" is false — c2r4 is not on the c6r3 diagonal (visualize_board decision board). | G4 run1: named cell c2r4 is not on the line carried by render_decision.finalMovestring 244424221353603443236205 / opponentPunishment.window; the correct completing cell offered was c6r3. | G7a run1: handle opp-major-2 (spec c6r3, role "a single square completing your opponent’s four-in-a-row line") wraps the phrase "c2r4" — handle offered but bound to a semantically different square; annotationRepairs was empty so G7c not triggered. | A7b run1: the token c2r4 is reused for two different objects (the opp-double fork spec and the c6r3 line), so the promised referent is unlocatable. | Run 0 is clean on every axis: names c6r3 + its line via the requiredSet handles opp-major-2 / opp-major-line-2, says "column 7" in prose (A6), honors the L3 guardrail (no blame, no defeatist clause), and both runs answer loss/loss for lose_to_faster_lose (A2). | G6: route realized_denied + direction enabled_opponent + case lose_to_faster_lose routes to L3 per causalLinks.mjs — correct; patternOnAfterBestBoard is informational only (D30). | G5: every offered alias spec is board-true (c2r4, c6r3, c6r4, the two Gray windows, and c7r4/<X> GT plus c7r1-c7r4 on the afterBest board).

> **eval-47** (render_bug) — The L1 composer in causalLinks.mjs ('The better move (col 5) completes your double threat at c3r6', render_decision.link.text) binds lostResource.completingCell (c3r6) to the better move, but the better move col5 lands on c5r4 and c3r6 is exactly where the PLAYED column-3 move lands (visualize_board on 3321153130453320125221100542 shows X29 at c3r6) - both runs mis-anchored the fork pivot as a result, and no alias for the pivot cell c5r4 on afterBest was offered (only 'better-col'=col5 whole-column) so neither run could name it.
>
> Board truth (visualize_board): decision board scr col5=+6, col3=0 -> win_to_draw confirmed. afterBest (append 4, X29 at c5r4) shows TWO gravity-top X major threats c3r6 and c6r5 = the double threat; afterPlayed (append 2) puts X29 at c3r6 and leaves c5r4 as the single gravity-top X threat that the opponent then occupies (render_decision.finalMovestring 332115313045332012522110054424, ply30 mover2 col4 -> c5r4). | A3/A4 run0: "column 3 gave your opponent the chance to take [zone:c3r6]" is board-false twice over - c3r6 is occupied by the PLAYER via the played column-3 move, and the opponent punishment cell is c5r4 (opponentPunishment.cell/completingCell). The decisive reason (opponent occupies the fork pivot c5r4) is never stated. | A3/A4 run1: "keep your double threat alive by playing [zone:c3r6]the square at c3r6" names the BLUNDER square as the better move; the better move lands on c5r4. Its second clause (opponent answers c5r4, killing the fork) is correct. | A6 run1: cleaned prose never says "column 5" - it names only "the square at c3r6" and "column 3"; bestCol+1 = 5. run0 passes ("column 5"). | A7b both runs: "your double threat" / "that fork" promise a specific board object but the two winning squares (c3r6 and c6r5) are never both located; the offered alias you-double (windows:c3r6,c6r5,c7r2, truthBoard afterBest) would have resolved it and was unused. | A7c run1: the fork-creating square is c5r4 (col 5); run1 names c5r4 only as the opponent reply and claims the pivot is c3r6. Per OI-182, no afterBest alias for the pivot cell was offered - only the whole-column handle better-col (col5). | G4 both runs: the c3r6 attributions contradict render_decision.finalMovestring 332115313045332012522110054424 (played col2 -> c3r6 by the PLAYER, then col4 -> c5r4 by the opponent). | G5 pass: every offered alias spec is board-true on its truthBoard (decision: c7r4 X / c7r5 O and their windows; afterBest: c3r6, c6r5, c7r2 all X majors; afterPlayed: c5r4 GT and c7r4 X). Note only: alias you-double has role text "the single fork square" but a 3-cell spec (windows:c3r6,c6r5,c7r2) - a role/spec wording mismatch, cells still true. | G6 pass: L1 fires on route=realized_denied + direction=missed_own (causalLinks.mjs L1 when-clause); patternOnAfterBestBoard is null and is only a L2/L3 concern (and retired as discriminator per D30). | G2 pass: L1 guardrail (your pattern, not the opponent) honored in both runs; confidence high so no hedge required; covered codes absent from the answers is D28-normal. | render_decision identical across both runs; annotationRepairs empty in both (G7c not triggered); every emitted [zone:...] spec (col5, col3, c3r6, c5r4, windows:c6r3,c5r4,c4r5,c3r6) maps to an offered alias.

> **eval-48** (prompt_confusion) — Both runs had render_decision.link.text stating verbatim "The better move (col 2) completes your double threat ... at c1r1", yet run 0 inverted it into a defensive frame ("keep your double threat alive" / "Column 2 is the tougher defense ... forces your opponent to answer") which the decision board 3323 refutes (Major threats: none — the fork does not exist until col 2 is played) and the after-best board 33231 refutes (every Gray reply scores -18, so the opponent cannot answer), while run 1 never named the better column at all ("the move" / "by playing elsewhere"), failing A6.
>
> A4 (run 0): mechanism says "You needed to keep your [double threat] alive" and "Column 2 ... preserves your threat". visualize_board.sh 3323 (the decision board) reports "Major threats: none" — there is no double threat to keep alive or preserve; col 2 CREATES it (33231 -> "Major threats: col1 row1 (X) [GT], col5 row1 (X) [GT]"). | A4 (run 0): "forces your opponent to answer instead" is board-false — on 33231 the scr row is -18 for all seven columns, i.e. every Gray reply loses; the fork is unanswerable, not a move that merely forces a reply. | A6 (run 1): cleaned prose contains no column number anywhere — "taking the move that lets you keep pressure on ..." and "By playing elsewhere". bestCol+1 = 2 and render_decision.link.text names "col 2" verbatim, so the information was present in the Decision block. | A5 (both): 2nd person, no vector/render/solver terminology after stripping markup; A5b N/A (player === 1). Pass. | G6: route=realized_denied + direction=missed_own -> L1 per causalLinks.mjs; patternOnAfterBestBoard=null is informational only under D30. Routing correct. | G4: every named cell traces to render_decision.finalMovestring 332331 (ply 6 Gray -> c2r1) or to a render-offered alias verified on its truthBoard (c1r1/c5r1 are X gravity-top majors on afterBest 33231). | G7: annotationRepairs is empty on both runs and every emitted zone/term expanded from an offered handle/slug (stored mechanism already shows post-processAnnotations specs); roles matched the wrapped phrases. Pass. | render_decision identical across both runs (byte-equal JSON) — no divergence bug. | RENDER OBSERVATION (no axis failed on it): zones.aliases[you-double] has spec "windows:c1r1,c5r1" (two cells) but role "the single fork square where you gets two winning squares at once" — singular/plural mismatch plus a grammar error; run 0 faithfully echoed it as "the fork square that gives you two winning finishes", pointing a singular noun at two squares. The real fork PIVOT (c2r1, where col 2 lands) is offered only as opp-key-square. | RENDER OBSERVATION: zones.aliases[opp-key-square] spec c2r1 is board-true on the decision board, but its role reads "a single square completing your opponent's four-in-a-row line" while the window c1r1-c4r1 is the PLAYER's line (X holds c3r1,c4r1). Run 0 ignored the role and phrased it correctly; a run that trusted the role would have inverted ownership.

> **eval-49** (render_bug) — The offered alias opp-key-square (c3r4) is labelled with the completing-a-four role even though opponentPunishment.kind is denial/occupation and c3r4 completes no Green four on the decision board (visualizer: the only major threat there is col5 row3, Gray), a board-false rendered region on every run; secondarily run 1 fails A6 by never naming column 3 as the better move.
>
> G5: render_decision.zones.aliases[opp-key-square] spec c3r4 role="a single square completing your opponent's four-in-a-row line" on truthBoard=decision, but visualize_board.sh 334553333255262 lists the decision board's ONLY major threat as col5 row3 (O/Gray) — c3r4 is merely a (*) minor cell and completes NO Green four (checked all 4 orientations); opponentPunishment.kind=denial/verdict=occupation, so Green occupies it to DENY, never to complete. | G5 root cause: zoneAnnotations.mjs roleText() falls through to the default `major` branch for the opponentPunishment half whenever cellKind==="major", so a denial/occupation completingCell is advertised as a square that COMPLETES the opponent's four. Both runs resisted it and correctly narrated c3r4 as the opponent taking the square away, so this is a report-not-narrate render defect (uniform, both runs). | A6 run 1: markup-stripped prose is "You should have played the move that kept your threat to make four next move alive on c5r2 ... By playing column 7 instead ..." — the better column (bestCol 2 -> display column 3) is never named; the only column named is the PLAYED one (7). render_decision.link.text states "The better move (col 3)" verbatim, so the information was present => prompt_confusion. Run 0 does say "column 3" and passes. | A1/A2 both runs: better_move 3 - 1 === bestCol 2; case win_to_draw => win/draw, and solver scores confirm (decision board scr: col3=+13 win, col7=0 draw). | A3/A4 both runs: after-best board 3345533332552622 shows <O> gravity-top major at col5 row2 and [O] at col5 row3; the named window c6r1,c5r2,c4r3,c3r4 is O,empty,O,O — board-true. opponentPunishment.finalMovestring 33455333325526262 has Green playing col3 at ply 17 landing on c3r4, so "your opponent takes c3r4" is engine-line grounded (G4). | G3: afterPlayed is shown:false but neither answer needed it — its tag set is identical to the decision board, and every claim resolves on decision/afterBest. | G6: route=realized_denied + direction=missed_own => L1 is the correct rule in causalLinks.mjs; patternOnAfterBestBoard (null) is informational only per D30 and does not drive routing. | G7: annotationRepairs is empty on both runs; every emitted tag expands from an offered handle (col3=better-col, col7=played-col, c5r2=you-immediate, windows:c6r1,c5r2,c4r3,c3r4=you-immediate-line, c3r4=opp-key-square) and all three requiredSet entries are present in both runs; run 1's [term:immediate_threat] wraps the exact canonicalPhrase. | Non-axis observation: lostResource.tag=figure_7 sits in link.covers and figure_7 is NOT in zones.terms (buildAnnotationOffer reads half.tacticTag, which these halves do not carry), so the only fork signal was the link text; neither run conveyed that the win rests on the STACKED pair c5r2 + c5r3 (you-major was offered and unused), leaving the prose implying a single blockable threat.

> **eval-50** (prompt_confusion) — Both runs dropped the better column: render_decision.link.text says verbatim "The better move (col 3) completes your 7-shaped double threat at c5r2" and the better-col/col3 alias was offered, yet neither mechanism names column 3 (only "column 1", the played column), and neither names the stacked second threat c5r3 that makes the c5r2 threat unblockable (solver: decision board col3 = +12 win, col1 = 0 draw).
>
> A6 FAIL (both runs): cleaned prose names only "column 1" (the played column); bestCol=2 => column 3 never appears; better-col alias (spec col1-index col3) offered and unused. | A7c FAIL (both runs): the engine mechanism is figure_7 (link.text: "7-shaped double threat"); visualize_board on afterBest 334553333255262662 shows TWO stacked Gray majors — c5r2 [GT] and c5r3 — so Green cannot block; both runs reduce it to a single blockable immediate threat at c5r2 and never name c5r3 (offered as alias you-major, truthBoard=decision) nor column 3 as the fork-creating move. | A1-A5 pass: better_move 3 == bestCol+1; win/draw matches case win_to_draw; c5r2 is a real gravity-top Gray major on afterBest completing the diagonal c6r1,c5r2,c4r3,c3r4 (c6r1=O4, c4r3=O6, c3r4=O18); on render finalMovestring 3345533332552626602 Green occupies c3r4 at ply 19, confirming the denial; prose is 2nd person with no vector/render jargon; mid-game so A5b N/A. | G1-G7 pass: L1 routing correct for realized_denied+missed_own; guardrail honored (own pattern, not attributed to opponent); afterPlayed shown:false was not needed; all named cells trace to render_decision.finalMovestring / the afterBest board; annotationRepairs empty; all three emitted zone specs (c5r2, c3r4, windows:c6r1,c5r2,c4r3,c3r4) expand from offered handles you-immediate / opp-key-square / you-immediate-line, and term immediate_threat wraps its exact canonicalPhrase. | SECONDARY render observation (not scored): alias opp-key-square (spec c3r4) carries the generic major role text "a single square completing your opponent's four-in-a-row line", but on its truthBoard (decision) c3r4 is only a MINOR (*) cell for Green — after Green actually plays it, Green's major is c3r5, not c3r4. The half is kind=denial/verdict=occupation, so roleText's major fallback in zoneAnnotations.mjs mislabels every denial completingCell. Both runs resisted it, so no axis failed.

> **pin-L1-completes-your-tactic** (render_bug) — Both runs fail G5: the rendered decision board asserts tactics that are not board-true on it — boardSelectionDecisions' namedPatternOpts overlay prints 'double_threat at c2r1 (you)' on the decision board 3343 (visualize_board: 'Major threats: none'; the fork only exists after the better move, on 33432), and zoneAnnotations.mjs roleText's 'major' fallback labels the denial half's completingCell as 'a single square completing your opponent's four-in-a-row line' when c3r1 is a denial-by-OCCUPATION (on the engine's finalMovestring 334332 gray has only c3r1/c4r2/c4r3 and completes nothing) — run 1 faithfully narrated that false role ('the square that finished their line', an A4 falsehood), and separately never named column 3 (A6) or the fork-creating square (A7c).
>
> A1/A2 verified: bestCol 2 -> better_move 3, solver on 3343 gives col3 +18 (win) and col4 -2 (loss), matching case win_to_lose. | A3 verified on afterBest 33432: green c3r1-c4r1-c5r1 gives two gravity-top majors at c2r1 and c6r1 (visualizer 'Major threats: col2 row1 (X) [GT], col6 row1 (X) [GT]', all columns -18 for gray) — the double threat is real and decisive. | A4 run 1 FAIL: '[zone:c3r1]the square that finished their line[/zone:c3r1]' — on 334332 gray has no line through c3r1; the square is a denial-by-occupation of GREEN's c2r1-c5r1 window. | A6 run 1 FAIL: cleaned prose names only 'column 4' (played); the better column 3 appears in no prose form (the Decision block states 'Better move: column 3 (lands at c3r1)' verbatim, and the better-col handle was offered but unused). | A7c run 1 FAIL: the mechanism is a fork, but only the two finishing squares (zone windows:c2r1,c6r1) are named; the pivot c3r1/column 3 that CREATES the fork is never presented as such — the pivot WAS offered (better-col=col3), so this is model-side. | G5 FAIL both runs (identical render_decision, verified byte-identical across runs). | G6 pass: L1 fires on route=realized_denied + direction=missed_own, independent of patternOnAfterBestBoard (null here). | G7 pass: annotationRepairs empty on both runs; every emitted spec traces to an offered handle (better-col, played-col, you-double, you-immediate-line, opp-key-square) and to the offered term double_threat, with term and zone on adjacent (never nested) phrases. | Secondary: neither run emitted the REQUIRED [zone:you-immediate] (c2r1), so the square where you actually make four is never highlighted, despite the 'You MUST build the explanation around these' block. | Run 0's 'keep a double threat alive' / 'preserves your four-in-a-row line' framing (the fork is CREATED, not preserved) is charged to the same decision-board overlay under G5, not to A4.

> **pin-L2-enabled-opponent** (render_bug) — The required-set alias `you-key-line` (zoneAnnotations.mjs buildAnnotationOffer half-geometry loop + roleText(owner,"line")) offers the OPPONENT's window c2r1-c3r1-c4r1-c5r1 as "the whole four-in-a-row line YOU are playing for", but on board 334 that window holds two player-1 discs and zero of player 2's, so both runs were obliged to tell the player it was their line; secondaries: the decision board's rendered Tactics list asserts a double_threat that does not exist on that board, and the only board where the fork is real (33432) is marked shown:false.
>
> A3/A4 (both runs): the mechanism rests on "your four-in-a-row line c2r1-c5r1" (run 1) / "preserved the four-in-a-row line from c2 to c5 for you" (run 0). visualize_board.sh 334 shows c4r1 and c5r1 are X = player 1 = the OPPONENT (you = player 2), and c2r1/c3r1 carry only (x) minor-threat marks for X, never (*). Player 2 can never complete four in that window; playing c3r1 BLOCKS the opponent line, it does not preserve one of yours. | A4/G4 (run 0 only): "you let your opponent take c2r1 and build a double threat". The engine finalMovestring is 33432 - the opponent plays c3r1, not c2r1. visualize_board.sh 33431 (the opponent actually taking c2r1) shows a SINGLE major threat at col3 row1 and scr +5 for player 2 at col3: taking c2r1 creates no fork and loses. | A7b (both runs): run 0 "the fork" / "a double threat across the bottom" never resolves to squares (c2r1 and c6r1; c6r1 is never mentioned). Run 1 "the shared spot" and "the winning fork on the bottom row" name something specific and point at no cell or zone. | A7c (run 0): the fork PIVOT is c3r1 (opponentPunishment.tie.sharedCells, and the move played in finalMovestring 33432). Run 0 names c2r1 as the square that builds the fork and casts c3r1 only as "your key block" - the pivot is attributed to the wrong square. The pivot WAS offered (you-key-square = c3r1, tie.sharedCells in the JSON residue), so this is render-layer non-obligation, not missing info (OI-182). | G3 (both runs): the only board where the double threat is real is opponentPunishment.finalMovestring 33432 (visualizer: Major threats col2 row1 [GT], col6 row1 [GT]). render_decision.boards marks projectedDeep shown:false ("the resource is not deep (register is immediate) - no projected board") and afterBest/afterPlayed shown:false, so no rendered board ever shows the fork the whole explanation is about. | G5 (both runs): the decision board Tactics line "double_threat at c2r1 (opp, window c2r1-c3r1-c4r1-c5r1)" is board-FALSE on its stated board - visualize_board.sh 334 reports "Major threats: none". It is injected by reasonBoardSelect.mjs namedPatternOpts() overlaying opponentPunishment.tag onto decisionTags. Separately the alias you-key-line spec is board-false for owner "you" on its stated truthBoard "decision". | G7b (run 0 only): the raw mechanism emitted [term:double_threat] but render_decision.zones.terms is [] and the prompt printed "(no named terms apply here)"; dropUnoffered silently stripped it, so annotationRepairs stayed empty. Root cause of the empty vocabulary: zoneAnnotations.mjs reads half.tacticTag, but this half carries opponentPunishment.tag = "double_threat", so the KB term never fired. | G6 pass: patternOnAfterBestBoard=false and case=win_to_lose, so L2 (not L3) is the correct pick per D30 / causalLinks.mjs. | A1/A2 pass both runs: better_move 3 - 1 === bestCol 2, and solver scr on 334 is +2 at display col 3 (win) vs -18 at display col 4 (loss), matching best=win / played=loss for case win_to_lose. | render_decision is byte-identical across both runs (no divergence). | Per-axis divergence between runs (G4, G7, A7c fail only on run 0), but BOTH runs fail the case, so intermittent=false.

> **pin-L3-no-causation** (render_bug) — render_decision.requiredSet for this L3 board obliges only the opponent-threat handles (opp-major c4r3, opp-major-line c6r1,c5r2,c4r3,c3r4) and never the offered you-immediate alias (c2r4), the gravity-top immediate threat that visualize_board.sh shows column 2 creates on the shown afterBest board (afterBest scr: col2=10, every other column -12, i.e. Green MUST answer c2r4) — so both runs explained why the opponent wins and never named what makes column 2 the toughest defense; secondarily causalLinks.mjs L3 template() interpolates the raw completingCell into link.text ("...double threat at c4r3..."), which run 0 echoed verbatim into player-facing prose.
>
> A3 (both runs): the only tactic the mechanism rests on is the opponent inevitable figure_7 at c4r3 on the diagonal c6r1,c5r2,c4r3,c3r4 — real on the decision board (visualizer Major threats: col4 row3 (X), col4 row4 (X)) but NOT the decisive reason column 2 holds longest; after best (325564424544512121) column 2 lands at c2r3 and makes O three-high with a gravity-top major at c2r4 (visualizer: Major threats col2 row4 (O) [GT]; solver row -12 everywhere except col2=+10), which is the whole practical-resistance mechanism and is unnamed in both runs. Run 0 additionally asserts column 2 "keeps the pressure on" the opponent diagonal — column 2 is not a cell of that window and does nothing to it.
> A5 (run 0 only): cleaned prose reads "the most resistance against the square at c4r3 that finishes it" — a raw cNrM render coordinate in player-facing text; supplied verbatim by render_decision.link.text, hence render_bug not prompt_confusion. Run 1 is clean ("finishing square").
> A7a (both runs): the mechanism gives effort/speed outcomes ("gives your opponent a quicker finish", "forces your opponent to work much harder", "gives them a cleaner path") and never names what changed on the board; A7c is N/A (the fork is already realized on the decision board — there is no creating pivot move); A7b and A7d hold (every specific referent is inside an emitted zone).
> A1/A2 hold: better_move 2 = bestCol 1 + 1; case lose_to_faster_lose and both outcomes reported loss (decision-board solver row is all-negative, best col2 -10 vs played col6 -11).
> G2 guardrail honored on both runs — no causation claim ("that same threat", "the pattern is coming"), no "you are lost", no defeatist closing caveat. G4: render_decision.finalMovestring 3255644245445121253 ends with Green holding stacked gravity-top c4r3 + c4r4, so both named objects are on the engine own line. G5: every alias spec is board-true on its truthBoard (checked opp-major, opp-major-line, opp-major-2, opp-major-line-2 on decision; you-immediate, you-immediate-line on afterBest). G6: L3 routing correct per D30 (realized_denied + enabled_opponent + lose_to_faster_lose). G7: both emitted specs expand from offered handles (opp-major, opp-major-line), roles match the wrapped phrases, no [term:] used, annotationRepairs empty. render_decision identical across both runs.

> **pin-L4-missed-defense** (prompt_confusion) — Everything needed was supplied — render_decision.link.text says verbatim 'The better move (col 5) occupies c5r4' and the offered aliases better-col/opp-immediate/opp-immediate-line are all board-true on the decision board (visualize_board 42224253264 shows X at c5r1-c5r3 with c5r4 a gravity-top major threat) — yet run 0 never told the player to play column 5 (A6) and run 1 echoed the raw coordinate 'c5r4' straight into coach prose (A5a); the link.text template's own cNrM wording is a secondary contributor to the run-1 leak.
>
> A6 run 0: bestCol=4 => display column 5; cleaned prose says only 'You had to take that one square', and 'column 5' appears solely as the location of the opponent's line, never as the move to play; the only column named as an action is the played column 4. A5a run 1: cleaned prose reads 'to make the block on c5r4' — a raw cNrM render coordinate in player-facing coach text (the zone-wrapped phrase IS the coordinate). A5b (player=2, boardState=opening) holds on both runs: neither says the player is lost and both frame the better move as the necessary defensive block. G-checks all pass: render_decision identical across both runs; L4 correctly routed (route=realized_denied, direction=defensive_miss, patternOnAfterBestBoard=null and after-best board 422242532644 shows 'Major threats: none'); guardrail 'frame it as a missed defense' honored; every emitted zone handle (better-col, played-col, opp-immediate, opp-immediate-line) and the term slug immediate_threat are in the offered set (verified against raw pre-expansion output); annotationRepairs empty on both runs; all named cells trace to render_decision.finalMovestring 42224253264; afterPlayed board was shown:false and neither answer needed it. Solver cross-check of A2: after-best scores are -2 with col4=0 for Green to move (draw), after-played col5=+15 for Green (loss) — best=draw / played=loss confirmed.

> **pin-L5-deep-fork** (prompt_confusion) — Both runs drop the better column entirely (A6) although the prompt Decision block states it verbatim (renderReasonModel.mjs renderDecision -> "Better move: column 1 (lands at c1r1). Outcome: win.", bestCol=0 and solver scr row on 422242532 gives col1=+2 win vs col7=0 draw), and run 0 goes further and tells the player to PLAY the deep fork square c4r3, which is not even a legal landing square now (column 4 height 1 -> next disc lands c4r2); secondary contributors are the render-layer requiredSet, which obliges only the three deep future: zones and never the better-col / you-immediate pivot handles (A7c), run 1s raw cNrM coordinates in coach prose (A5a) and its presentation of a 28-ply-deep fork as an immediate consequence of the move (L5 horizon guardrail, G2).
>
> A4 (run 0 only): "keep the double threat alive by playing the fork square that still matters later" [zone:future:c4r3] asserts the better move is c4r3; visualize_board.sh 422242532 shows column 4 at height 1, so a disc there lands c4r2, and the real better move is column 1 (c1r1). Run 1 makes no such action claim -> intermittent. | A5 (run 1 only, A5a): coach prose carries raw render coordinates - "a double threat at c4r3", "meet your plan with c6r5", "the four-in-a-row line through c4r3-c5r4-c6r5-c7r6" - which is render/vector notation, not plain English or Connect Four jargon. Run 0 phrases the same zones in words -> intermittent. | A6 (both runs): cleaned prose never says "column 1". Run 0 names only column 7 (the PLAYED column) and calls the better move "the fork square that still matters later"; run 1 says only "the move that creates a double threat at c4r3". The Decision block supplies "Better move: column 1 (lands at c1r1)" verbatim -> prompt_confusion, not missing_info. | A7c (both runs): the mechanism IS a double threat (lostResource.tacticTag=double_threat, forkCells=[c4r3]) but neither run names the square/column that CREATES it. On 4222425320 the visualizer shows a gravity-top Gray major threat at col2 row1 - column 1 creates the immediate threat at c2r1 that starts the forced sequence (lostResource.entryCell=c2r1, line ply 11 = Greens forced block at c2r1). The pivot WAS offered (aliases better-col spec col1 and you-immediate spec c2r1 on the afterBest board) but render_decision.requiredSet obliges only future:c4r3, future:c6r5 and the future window -> render_bug per OI-182. | G2 (run 1 only): link L5 guardrail is "You had a forced win; state its horizon honestly (may be deep)" and lostResource.pliesToEnd=28; run 1 presents the fork as immediate ("that forces your opponent to answer one of two winning chances") with no horizon at all. Run 0 honors it ("still matters later", "once the forced sequence reaches it"). | G4/G5 verified board-true: on render_decision.finalMovestring 42224253201100134400101124465555566666 the visualizer shows Gray discs at c5r4(18), c6r5(32), c7r6(38) with a gravity-top Gray major threat at col4 row3 plus further Gray threats at col4 row4/row5 - the c4r3-c5r4-c6r5-c7r6 window and the fork are real. The denial is real on the played branch: on 422242532635445011155 c6r5 is Green (ply 21) and every column scores 0 (draw). | G6 pass: route=sign, lostResource.kind=winning_line, opponentPunishment.kind=denial -> causalLinks.mjs L5 when() matches exactly; patternOnAfterBestBoard is null so no L2/L3 branch-invariance question arises. | G7 pass: all emitted specs (future:c4r3, future:c6r5, future:windows:c4r3,c5r4,c6r5,c7r6) are expansions of offered handles you-future-fork / opp-key-square / you-key-line (zoneAnnotations.processAnnotations rewrites handle->spec after dropping unoffered ones), line words sit on the line handle, [term:double_threat] is offered and correctly bound, and annotationRepairs is empty on both runs -> no G7c auto-fail. | render_decision is byte-identical across both runs - no divergence bug. | A5b precondition misfire worth reporting: player===2 AND boardState==="opening" both hold, so the rubric would demand a hold-the-line frame and forbid claiming a win - but this is a win_to_draw board where the second player really did have a forced win (afterBest 4222425320 scores -16 for Green in every column), openingContext is null, and the L5 guardrail itself instructs "You had a forced win". A5 was therefore graded on A5a only; applying A5b literally here would penalize the model for obeying the render.

> **pin-L6-lost-win-and-gave-one** (prompt_confusion) — Both runs fail A6 - the prose names only “column 1” (the column played) and never states the better column 2, although bestCol=1 and the better-col/col2 alias are in render_decision.fieldPartition.rendered and zones.aliases; run 1 additionally inverts ownership, calling opponent-punishment square c2r6 your line and your own deep fork square c2r5 the opponent's reply, which render_decision.finalMovestring 422242532643343015330451665102146556600 contradicts (c2r5 is Green's gravity-top winning square there).
>
> A6 (both runs): cleaned prose says only “By playing column 1 ...”; column 2 is never named. Contributing render factor: causalLinks.mjs L6 template (line 114) never names a column in link.text, unlike L7 (line 90, “Column N is your most stubborn defense”). | A3/A4 (run 1 only): “you let your opponent answer on c2r5” - on the engine's finalMovestring board c2r5 is <X> gravity-top for GREEN (row-5 window c1r5,c2r5,c3r5,c4r5 has X at c1r5/c3r5/c4r5), i.e. YOUR fork square, not an opponent reply; the whole story is recast as defense although case=win_to_lose. | G2 (run 1): L6 guardrail “name both lines with their horizons” not honored - the opponent's top-row line c2r6,c3r6,c4r6,c5r6 is never identified as theirs (opp-key-line alias offered, unused). | G4 (run 1): named-cell ownership contradicts render_decision.finalMovestring. | G7a (run 1): [zone:future:c2r5] (handle you-future-fork, role = YOUR later fork square) is bound to “your opponent answer on c2r5”; [zone:c2r6] (single-square handle you-major) is used while the words say “line”, which the alias role explicitly steers to the line handle. | annotationRepairs is empty on both runs, so G7c does not fire; render_decision is byte-identical across the two runs (no divergence). | G5 audit: all 10 offered aliases verified board-true on their truthBoards (decision: [X] c2r6 + diagonal c5r3,c4r4,c3r5,c2r6; afterPlayed: <X> c1r5 GT and [X] c2r6; projectedDeep: <X> c2r5, the row-5 window, and O's c2r6..c5r6). | Minor, not charged: run 1 leaks raw grid tokens (c2r6, c2r5, “c1 to c4 on row 5”) into player-facing prose - not on the A5a banned list but poor coach voice.

> **pin-L7-practical-swindle** (prompt_confusion) — Run 1 opens with “Your move in column 4 keeps the toughest defense alive” although the Decision block states verbatim “Better move: column 4 … Played move: column 6” and the answer itself then says “By playing column 6” — the model mis-anchored played-vs-better despite correct, explicit render information (secondary, render-side: the requiredSet binds opponentPunishment.completingCell c2r4 to the you-owned alias you-major-2, and the offered alias opp-key-line is board-false on its stated truthBoard).
>
> render_decision identical across both runs; annotationRepairs empty on both (no G7c). | A1/A2: bestCol 3 -> column 4; decision board scr row = col4 -1, col6 -4, both losing => lose_to_faster_lose, both outcomes loss. Correct in both runs. | A3/A4 run 0: the named deep fork c2r3 and the line c1r3,c2r3,c3r3,c4r3 are board-TRUE on the projectedDeep board (movestring 42442424426330113223336666600, move 29): c1r3=X, c3r3=X, c4r3=X and c2r3 is a gravity-top MAJOR for X (<X> [GT]). “the opponent finishes faster” is true (col6 -4 vs col4 -1). | A4 run 1 FAIL: “Your move in column 4” is contradicted by the record and by its own next sentence (“By playing column 6”); the played disc is c6r1 (move 13 on 4244242442635). | A5: markup-stripped prose in both runs is 2nd person and free of vector/render vocabulary; guardrail honored (no win claim, no “you are lost”, no defeatist closing caveat). A5b N/A (player 1). Cosmetic: run 0 renders “before your your four-in-a-row line” — the zone-wrapped phrase duplicates the preceding “your”. | A6: both runs name “column 4” in plain prose as the better/toughest move. | A7c: mechanism is a double threat and the fork pivot c2r3 (lostResource.forkCells) is the square both runs wrap in [zone:you-future-fork] — pivot named, pass. | G5: every rendered Tactics entry checks out on its own board (afterBest majors c2r2/c2r4/c6r2 for X; projectedDeep immediate c2r3, majors c2r4/c2r6/c6r2/c6r4). | G6: route=sign, patternOnAfterBestBoard=null, lostResource.kind=conditional_swindle -> L7 is the correct link (causalLinks.mjs:77-89). No L2/L3 branch-invariance decision involved. | G7: every emitted handle (you-future-fork, you-key-line) and slug (double_threat) is offered, role-shape matches (line words on the line handle), term and zone are adjacent not nested, nothing over-wrapped. | LATENT RENDER DEFECTS (not charged against either run, neither was used/needed): (a) requiredSet entry {half: opponentPunishment, spec: c2r4, handle: you-major-2} — deriveRequiredSet (renderReasonModel.mjs:139-176) matches by spec STRING only, so the opponent-punishment completing cell was bound to an alias whose role reads “a single square completing you’s four-in-a-row line”; no correctly-owned handle for the opponent square is offered, and BOTH runs silently omitted this MUST-appear handle (the eval harness, unlike prod, has no required-set retry). (b) alias opp-key-line spec future:windows:c1r3,c2r4,c3r5,c4r6 declares truthBoard=projectedDeep, but projectedDeep is the lostResource line where c1r3=X, c3r5=O, c4r6=O — the opponent line can never complete there, so highlighting it would be board-false. (c) render_decision.finalMovestring is opponentPunishment’s line (424424244263501331000002526333666611) while the projectedDeep board actually shown is lostResource’s (42442424426330113223336666600) — a literal G4 read against render_decision.finalMovestring would wrongly condemn the required, correctly-grounded zones.

> **pin-L8-draw-abandoned** (prompt_confusion) — Run 1 inverted replyHistogram — it wrote that the better move “keeps more replies available” although afterBest=2 < afterPlayed=3 and the reading key states fewer opponent replies means the tougher defense (solver on 4222423 gives [-9,-15,0,0,-13,-4,-2]: exactly 2 draw-holding replies for the opponent, no more than after the played move); run 0 stated the same field correctly, so the defect is intermittent model misreading, not a vector or render defect.
>
> A4 (run 1): “the better move keeps more replies available” is unsupported/inverted. Board+solver: after best 4222423 the opponent (P2) has 2 replies scoring 0 (cols idx 2,3) that hold the draw; after played 4222425 the opponent has win-preserving replies (score 2 at cols idx 2,3). replyHistogram in the record is afterBest=2, afterPlayed=3, i.e. the better move leaves the opponent FEWER ways, and the reading key (renderReasonModel.mjs:326) says fewer = tougher defense. Not in unsure_about. | A1/A2 verified: better_move 4 -1 = bestCol 3; solver on 422242 = [-2,-2,-2,0,0,-2,-2] so col idx 3 draws and the played col idx 5 loses (draw_to_lose). | A3/A4 (run 0) verified on the board: c4r1 lies in 7 four-windows vs 4 through c6r1, so “column 4 keeps more four-in-a-row lines alive than column 6” is board-true, and centrality is exactly the reason the O3 opening frame obliges (guardrail forbids grounding the deep completing cell c4r4). | A5b not applicable (player === 1). A5a clean after stripping markup in both runs: 2nd person, no field names; “parity”/“centrality” are frame-supplied Connect Four wording, not banned slugs. | A6 pass: cleaned prose says “column 4” literally (bestCol+1 = 4) in both runs, not only as a handle. | A7c N/A (mechanism is not a fork). A7d passes weakly: named idea (central column sits in more four-in-a-row lines) plus the two named/highlighted columns; the frame also offered c4r1 vs c6r1, which neither run used. | G7 pass: stored mechanism shows [zone:col4]/[zone:col6] because processAnnotations expands offered handles to specs; the emitted handles were better-col/played-col, both offered, each wrapping the phrase matching its role; zones.terms is empty and none were emitted; annotationRepairs is [] on both runs. | G6 pass: route sign, case draw_to_lose, patternOnAfterBestBoard null -> L8 is the correct link per causalLinks.mjs. | render_decision is byte-identical across both runs. Minor record/prompt discrepancy noted, not charged: render_decision.boards marks projectedDeep shown:true, but the opening path in buildReasonRenderModel renders only the decision board (boards: [decisionBoard]) when composeOpeningFrame fires.

> **pin-L9-hedged-parity** (prompt_confusion) — Both runs drop the Decision block's verbatim 'Better move: column 4' and L9's verbatim winning group c2r5·c3r5·c4r5·c5r5, producing opening-plan generalities that never name column 4 in prose (A6) and never anchor a cause to any square (A7); run 0 additionally calls that horizontal row-5 group a 'diagonal' (A4).
>
> A6 (both runs): stripped prose says only "the central-column opening/move"; the digit 4 exists only inside the expanded [zone:col4] handle. renderReasonModel.renderDecision emits "- Better move: column 4 (lands at c4r3)" verbatim, so the info was present. | A4 (run 0): "the long fight for the diagonal/parity line" — the mover's winning group is the HORIZONTAL row-5 window c2r5·c3r5·c4r5·c5r5 (feature_vector.lostResource.window, restated verbatim in render_decision.link.text); the diagonal c2r1·c3r2·c4r3·c5r4 belongs to the OPPONENT's punishment, so the direction claim is board-false. Run 1 has no such misstatement. | A7a (both): only outcome/plan language ("keeps your shape in the middle", "gave up the better parity fight", "the opponent's reply became easier") — nothing about what changed on the board. | A7b (both): "the diagonal/parity line", "the stronger central response" (run 0), "the tough central race", "the better parity fight" (run 1) all promise a specific board object and point at nothing. visualize_board.sh 332 shows the opponent's only winning replies are display columns 2 and 5 (score +2); the most central reply, column 4, scores -18 — so "the stronger central response" is board-false as well. | A7d (both): abstract "stay with the opening plan" recitation with no square anchoring it; the only concrete cells available (c5r5 completing cell, the c2r5..c5r5 group) were rendered in the prompt and unused. | A3 pass (both): L9 guardrail mandates hedging and no crisp culprit; no decisive tactic was fabricated. A5 pass: 2nd person, no internal vocabulary ("parity" is allowed CF jargon); A5b N/A (player 1). | A1/A2 verified on the board: after-best 333 scores -1 for Gray to move (Green wins); after-played 332 scores +2 for Gray (Green loses) — win_to_lose confirmed. | G7 pass: the stored mechanism is POST-processAnnotations, so [zone:col4]/[zone:col3] are the expanded specs of the offered handles better-col/played-col; annotationRepairs is empty. Minor note (not scored a fail): run 0 binds better-col to the phrase "central-column opening", which names an opening rather than a column. | render_decision is byte-identical across both runs — no divergence bug.

> **pin-branch-invariance-false** (render_bug) — buildAnnotationOffer labels the DENIAL half `you`, so `you-key-line` (windows:c2r1,c3r1,c4r1,c5r1) and `you-key-square` (c3r1) are offered as YOUR line/square when on the decision board (44443) Green already holds c4r1 and c5r1 — the line is the OPPONENT`s; the same dedup suppressed `opp-key-line`, and L2`s template plugs opponentPunishment.completingCell (c2r1) into "let the opponent occupy X, completing their double threat" when the engine`s own finalMovestring 4444332 shows the fork is created at c3r1 (4444331 = a single blockable threat).
>
> A4 (both runs): each mechanism says the opponent takes c2r1 to create/open the double threat. Board: after 4444331 (Green takes c2r1) there is ONE major threat (col3 row1) which Gray blocks; after 4444332 (Green takes c3r1) there are TWO gravity-top major threats (col2 row1, col6 row1). The engine`s finalMovestring is 4444332 and never plays c2r1. Both runs echo render_decision.link.text verbatim, so the falsehood is render-supplied. | A4 (run 1): "keeps your four-in-a-row line from c2 to c5" is board-false — on the decision board 44443 c4r1 and c5r1 are GREEN discs, so Gray (player 2) can never complete c2r1-c5r1. Faithful echo of alias you-key-line`s role text. | A7b/A7c (run 1): "two ways to keep the attack going" names neither finishing square (c2r1/c6r1 per opponentPunishment.cells), and the fork PIVOT c3r1 is mentioned only as the better move`s claim, never as the square that creates the fork. Per OI-182 the pivot was never offered: buildAnnotationOffer gates the fork aliases on half.tacticTag, but this half carries `tag`, so no opp-fork-square/opp-fork-lines alias exists. | G3 (both runs): the only board that exhibits the fork is 4444332, one ply past afterPlayed; boards[] marks projectedDeep shown:false ("the resource is not deep (register is immediate)") and afterPlayed/afterBest shown:false, so no rendered board could show the model which square makes the fork. | G4 (both runs): c2r1 is named as the square the opponent takes; render_decision.finalMovestring = 4444332 ends at c3r1 and contains no c2r1 move. | G5 (both runs): offered alias you-key-line (spec windows:c2r1,c3r1,c4r1,c5r1, role "the whole four-in-a-row line you are playing for", truthBoard decision) and you-key-square (c3r1, role "a single square completing you`s four-in-a-row line") are board-false on the decision board — ownership inverted for a lostResource.kind === denial half. | G7a (run 0): emitted [zone:opp-key-line], not in zones.aliases (only better-col, played-col, you-key-square, you-key-line, opp-key-square) — dropped by dropUnoffered, leaving the sentence "...they need to start the four-in-a-row line running across the bottom" ungrounded. The opponent`s line handle is unofferable because the identical spec was already consumed by you-key-line via buildAnnotationOffer`s `seen` dedup. | G7b (run 1): emitted [term:double_threat] but render_decision.zones.terms is EMPTY — the term loop reads half.tacticTag while this record`s opponentPunishment carries `tag`, so the record`s own double_threat tag was never offered as a KB term; the tag was stripped from the served text. | G6 pass: case=draw_to_lose + direction=enabled_opponent + route=realized_denied correctly routes to L2 per D30 (patternOnAfterBestBoard=false is informational only). render_decision is byte-identical across both runs. | A5b applies (player 2, boardState opening) and PASSES on both runs — no defeatist claim, both frame column 3 as the tougher/defensive move. | Not intermittent: both runs fail A4/G3/G4/G5/G7, though on partly different sentences.

> **pin-branch-invariance-true-3** (prompt_confusion) — Run 0 inverted replyHistogram: it justified column 3 as “the tougher defense because it leaves them more replies to sort through”, but afterBest=3 / afterPlayed=1 are the OPPONENT’s non-losing replies (glossary §8), and the solver rows confirm the inversion — after best (…02) Gray wins with all three legal cols (+5/+5/+4) while after played (…05) only col6 wins (+6, cols 3/7 are −2/−3) — so more replies means the opponent is MORE comfortable, and render_decision.link.text had already supplied the correct reason verbatim (“column 3 makes your opponent work hardest … the move you played only speeds up the finish”); secondary: glossary §8 gives no reading for afterBest > afterPlayed.
>
> A3 run 0: the mechanism’s decisive “because” clause is a counterplay-count inversion, not the board reason; the real differentiator (visible on the shown afterPlayed board) is that column 6 fills c6r3 directly beneath the opponent’s completing cell c6r4, flipping the diagonal c3r1-c4r2-c5r3-c6r4 from a non-gravity major threat [O] on the decision/afterBest board to gravity-top <O>. Run 1 states this correctly (“your played move in column 6 gives them a more direct path to the same threat”) — hence intermittent. render_decision is byte-identical across both runs; annotationRepairs empty on both. G1-G7 all hold: L3 routing correct (route=realized_denied, direction=enabled_opponent, case=lose_to_faster_lose, D30), patternOnAfterBestBoard=true verified on the visualizer (afterBest still shows major threat col6 row4 (O)), all four alias specs (col3, col6, c6r4, windows:c3r1,c4r2,c5r3,c6r4) board-true on the decision board, every named cell lies on render finalMovestring …00005, guardrail honored (no “you created it”, no defeatist clause), all emitted handles (opp-major, opp-major-line, better-col, played-col) are in zones.aliases with role-matching wrapped phrases and both requiredSet handles used. Style note (not scored under A5a’s enumerated ban list): both runs leave raw cNrM tokens (“c6r4”, “c3r1, c4r2, c5r3”) in player-facing prose inside the zone spans — production reasonRenderGuard rewrites these, the eval postprocess does not.

## Failure triage (root cause per failing case)

Count: **vector_error 0 · missing_info 0 · prompt_confusion 41 · render_bug 17**.

Not a single case was triaged `vector_error` or `missing_info`: **the reason engine's evidence was
right and complete in every failing case.** The split is entirely between the render layer
(17) and the prompt/model consuming a correct render (41).

| id | category | triage | what went wrong |
|---|---|---|---|
| eval-1 | lose_to_faster_lose | prompt_confusion | Both defects are the model mishandling information the render already supplied: run 1 never wrote the column number even though render_decision.link.text opens with "Column 4 is your most stubborn defense" (A6), and run 0 emitted an unoffered [term:central] tag although render_decision.zones.terms is empty (G7b, silently dropped by dropUnoffered so annotationRepairs stayed []). |
| eval-3 | win_to_lose | prompt_confusion | Both runs fail A6 — neither mechanism ever says "column 2" even though the prompt Decision block prints "Better move: column 2 (lands at c2r1)" verbatim and a better-col->col2 zone alias was offered; run 0 additionally fails A7a/A7b by reducing the cause to a race ("finish ... before you can cash in your own") and pointing at an unnamed, unwrapped "deeper four-in-a-row line" while the offered opp-key-line handle went unused. |
| eval-4 | win_to_lose | prompt_confusion | Both runs fail A6 — neither prose ever writes "column 2" although bestCol=1 is in render_decision.fieldPartition.rendered and offered as the better-col alias (spec col2); run 0 additionally mis-attributes opponentPunishment.entryCell c5r2 to the played move (col index 2 actually lands on c3r1 per visualize_board 3333342) and binds the you-key-square / opp-key-square handles to the wrong cell words (G7a). |
| eval-5 | lose_to_faster_lose | prompt_confusion | Both runs dropped the better column from the prose even though render_decision.link.text states it verbatim ("Column 3 is your most stubborn defense"), leaving column 3 visible only inside the [zone:better-col] handle (A6), and neither run grounded the reason on any square although opponentPunishment.completingCell c2r3 / lostResource.parityAttribution.controllingGroup were rendered (A7b/A7d). |
| eval-6 | lose_to_faster_lose | prompt_confusion | The render supplied every concrete anchor for this deep-parity swindle (render_decision.resource.completingCell c1r4, the projectedDeep board shown:true, both parityAttribution windows c3r1-c6r4 and c1r4-c4r4, and link.text naming "Column 3" verbatim) yet both runs recited generic centrality with no square instantiating it (A7d), and run 0 additionally never wrote the digit 3 outside a zone handle (A6) and over-wrapped [zone:col3] onto "central pressure", a phrase denoting the opponent rather than the alias role "the column of the better move" (G7a). |
| eval-7 | win_to_lose | prompt_confusion | Run 1 ignored the verbatim render_decision.link (L6) text — “You had a forced win via c2r5 … gives it up AND lets the opponent force their own win via c6r2” — and narrated the winning move (col 3, solver +3 on 3332 vs -3 for col 1) as a “more resilient defense”/“tougher opening choice” while never naming column 3 in the cleaned prose (A6), so the sufficient info was present and mis-read, not missing; run 0 on the identical record passed every axis (intermittent). |
| eval-8 | win_to_lose | prompt_confusion | Both runs ignored the high-confidence L6 link text and the fully rendered lostResource/opponentPunishment lines (forced win completing at c2r5, opponent win at c6r2 — c2r5 is a real gravity-top X major threat on render_decision.finalMovestring 33322232332414001244445556666660011) and instead recited generic openingContext.centrality.text, violating the L6 guardrail (G2) and emitting zone specs col3/col2 instead of the offered handles better-col/played-col (G7a), with figure_7 bound to the phrase "central line" in run 0 (G7b). |
| eval-9 | win_to_draw | render_bug | render_decision.zones.aliases offers no handle for the load-bearing parity line c3r5-c6r5 (nor its completing cell c6r5 / the denial cell c3r5) and requiredSet is empty, so both runs dropped the decisive resource that link.text names and narrated only "you left the allen-3-4 book move" — the after-best board 333222266 has no major threats, so the parity line completing at c6r5 (all four of c3r5,c4r5,c5r5,c6r5 empty, engine finalMovestring 33322226664420600000211111313344445556655) is the ONLY board-level reason available; secondary prompt_confusion since link.text stated both cells verbatim. |
| eval-10 | win_to_draw | prompt_confusion | Run 0 never names the better column in prose - it hides col 7 inside [zone:better-col] wrapped around the words "book line" and reduces the reason to the outcome ("preserves the long, parity-based win"), even though render_decision.openingContext.lead.bookCol=7 and fieldPartition.rendered includes bestCol/openingContext.namedOpening.bookNextCol verbatim; run 1, from the identical render_decision, says "column 7" and passes. |
| eval-11 | win_to_lose | prompt_confusion | render_decision.link (L6) handed the model the composed text 'You had a forced win via c2r5 ... lets the opponent force their own win via c2r4' plus rendered lostResource.completingCell/window and opponentPunishment.completingCell, yet both runs dropped every cell and narrated generic opening centrality — and both emitted [zone:col4]/[zone:col5], the alias SPECS, instead of the offered handles better-col/played-col (render_decision.zones.aliases), so G7a auto-fails on both; run 1 additionally mislocated the opponent's winning line 'around column 5' when opponentPunishment.window is c4r2/c3r3/c2r4/c1r5 (display cols 4,3,2,1). |
| eval-12 | win_to_lose | prompt_confusion | render_decision.link (L6) text verbatim named BOTH real lines with cells and horizons ("forced win via c2r5 ... opponent force their own win via c2r4") and the Decision block gave bestCol=3, yet both runs dropped all of it and wrote generic openingContext.centrality prose, never naming column 4 in words (A6) nor either winning line (G2/A7); a secondary render gap is that zones.aliases offered only better-col/played-col, so the fork pivot c2r5 was never annotatable (A7c). |
| eval-13 | lose_to_faster_lose | prompt_confusion | Run 0 never names the better column in prose (A6 fail) even though render_decision.link.text states "Column 4 is your most stubborn defense" verbatim — the column survives only inside the [zone:better-col] handle; secondaries: neither run names the fork-creating square c6r4 (A7c, render_bug — no such alias in render_decision.zones.aliases) and run 1 emitted an unoffered [term:central_column] slug (G7b). |
| eval-14 | lose_to_faster_lose | prompt_confusion | Run 1 never names the better column in prose ("the central column hold", column 4 appears only as the [zone:better-col] handle) even though render_decision.link.text states it verbatim ("Column 4 is your most stubborn defense"), and it inverts the board geometry by calling the played move "the higher side drop" when the played cell c5r1 is the bottom row and the better cell c4r4 sits three rows higher. |
| eval-15 | win_to_draw | prompt_confusion | Both runs mis-consumed a render_decision that was correct and complete: run 0 never named the better column at all (A6) despite openingContext.lead.bookCol=7 and zones.aliases better-col being stated verbatim, and run 1 emitted [zone:col7]/[zone:col2] using the alias SPEC strings instead of the listed handles better-col/played-col (G7a) and echoed the pliesToEnd field as "many plies away" (A5); secondarily, the fork pivot c7r3 (lostResource.forkCells / opponentPunishment.completingCell, on finalMovestring 333222336212244151100550446) was never offered as a zone alias, so A7c is a render_bug. |
| eval-16 | win_to_draw | prompt_confusion | Both runs fail A6 and A7 even though the assembled prompt hands over the answer verbatim - the Decision block reads 'Better move: column 7 (lands at c7r1). Outcome: win.' yet neither mechanism writes 'column 7' in prose (it survives only inside the expanded [zone:col7] handle), and run 1 additionally drops the tactic entirely and mis-binds [term:figure_7] to the phrase 'opening pattern'; the secondary, genuinely render-layer defect is that buildAnnotationOffer still offers the figure_7 term on this opening record while openingHorizon:true empties the half-geometry alias family (zones.aliases = better-col/played-col only, requiredSet = []), so a named 7-shaped fork has no offered zone to point at (A7b/A7c). |
| eval-17 | win_to_draw | prompt_confusion | Both runs had the fork fully rendered and REQUIRED (render_decision.requiredSet / zones.aliases you-future-fork = future:windows:c5r5,c7r6, board-true: after the engine finalMovestring 333331111555515200022223000124445666664 both c5r5 and c7r6 are gravity-top X major threats), yet run 0 dropped it entirely and explained only "you left the book line / column 6 keeps the win" (outcome restatement, A3+A7b/A7d), and run 1 used the fork zone but never named column 6 in prose (A6) and never named the fork pivot c5r4 (A7c, unoffered alias -> secondary render_bug per OI-182). |
| eval-18 | win_to_lose | render_bug | Both runs fail A7c because render_decision.zones.aliases/requiredSet offer no alias for the fork PIVOT c5r4 (present in lostResource.anchorCells and lostResource.line[] ply 39) - only the two finishing squares c5r5/c7r6 are offered - so neither coach names the move that actually creates the double threat (visualize_board on the engine finalMovestring prefix 33333111155551520002222300012444566666 shows only ONE major threat col5 row5 before c5r4, two after); secondary and intermittent: run 0 never names the better column in prose (A6) and frames the reason as outcome (A7a), aggravated by L6 being the one sign-family frame whose composed text omits "col N". |
| eval-19 | win_to_draw | render_bug | The O1 opening frame composed by openingFrame.mjs ('The solver confirms this resolves deep (~28 plies, a deep forced line) - too far to pin to one square; the lesson is the opening' + its 'Do NOT ground a specific deep completing cell' guardrail) both leaked the internal unit 'plies' into the coach prose (A5a) and forbade naming the one concrete board cause the L5 link.text itself supplies - the opponent's denial at c3r5, which occupies the shared c3r5-c6r5 window - so both runs could only restate the outcome ('column 6 preserves your forced win') instead of a board cause (A7a); the fork pivot c5r4 was never offered as a zone (A7c). |
| eval-20 | win_to_lose | prompt_confusion | render_decision.link (L6) supplied both completing cells verbatim ('forced win via c5r5 … opponent force their own win via c5r2') and a guardrail demanding both lines be named with horizons, yet both runs replaced the board mechanism with a generic 'stay in the book opening' narration that never names c5r2 or the fork-creating move, and run 1 additionally misattributed the player-1 fork at c5r5/c7r6 to the opponent (projectedDeep board 33333111155551520002222300012444566666 shows the major threat at col5 row5 is X, i.e. the player, not the opponent). |
| eval-21 | lose_to_faster_lose | render_bug | Both runs assert column 6 is "more central" than column 2 - board-false (columns 2 and 6 are equidistant from centre column 4) and contradicted by openingContext.defense.centralityGrounded:false - because composeOpeningFrame (openingFrame.mjs) emitted the O2 guardrail "Explain the blunder through the opening - book line, centrality, parity" while suppressing the centrality clause AND omitting GUARDRAIL_NO_CENTRALITY (the guardrail rider is gated on centralityQualitative(fv)===null, which is false here since it returns much_easier, while the clause is gated on centralityGrounded=false); secondaries: run 0 hid the better column inside the [zone:better-col] handle (A6) and neither run turned the rendered replyHistogram 1-vs-7 into a concrete idea (A7d). |
| eval-22 | lose_to_faster_lose | render_bug | Both runs fail A7c: the mechanism names the opponent double threat only by its two finishing squares (c5r3, c7r4) and never the square that creates the fork, because render_decision.zones.aliases offers ONLY the combined `future:windows:c5r3,c7r4` group (handle opp-future-fork) — neither opponentPunishment.entryCell c6r3 nor the fork-creating move c7r3 (opponentPunishment.line ply 35) is offered as a zone, so the pivot was never available to name (OI-182); secondary, run 0 leaves "the long forcing line" as an unlocatable referent (A7b) and mis-anchors the after-played fork onto the after-best branch. |
| eval-23 | lose_to_faster_lose | prompt_confusion | Everything needed was supplied (render_decision.zones offered opp-future-fork + the double_threat term, and requiredSet obliged the fork group), but run 1 dropped the required opp-future-fork zone, invented an unoffered [term:centrality] slug that processAnnotations silently stripped, and left "their four-in-a-row line" pointing at nothing, while run 0 leaked the vector echo "the reply tree is looser" into coach prose. |
| eval-24 | lose_to_faster_lose | prompt_confusion | render_decision.link.text states "Column 4 is your most stubborn defense" verbatim (L7) and hands over the swindle/watch-columns detail, yet both runs name the better move only as "the more central column" inside a [zone:better-col] handle and anchor nothing to a square — A6 fails and A7d fails as abstract centrality recitation; secondary G7a on run 0 (the better-col handle wrapping the abstract noun "centrality", plus an unoffered [term:parity] that dropUnoffered silently removed with no annotationRepairs entry). |
| eval-25 | win_to_lose | render_bug | The opening path of buildReasonRenderModel emits self-contradictory obligations — the composed guardrail concatenates L6 ("name both lines with their horizons") with the O1 openingFrame guardrail ("Do NOT ground a specific deep completing cell"), the pruned JSON residue strips lostResource.completingCell/forkCells, and requiredSet still demands [zone:you-future-fork] whose truthBoard (projectedDeep) plus the afterBest board are never rendered (boards:[decisionBoard]) although render_decision.boards records both as shown:true — so both runs faithfully produced a book-line/centrality narration with zero annotations and no named tactic, even though column 6 makes a gravity-top vertical major threat at c6r5 (verified on 32655333535) leading to the fork c5r6/c7r3. |
| eval-26 | win_to_lose | render_bug | Both runs sell a double threat at c5r6/c7r3 but never name the square that CREATES it (c5r5, lostResource.line ply 37) because render_decision.zones.aliases offers c5r5 only as opp-future-fork (“their later forcing square”) and requiredSet obliges only the two finish squares — A7c fails on every run; secondarily run 1 never names column 6 in prose (A6, prompt_confusion) even though the better column is stated verbatim in the Decision block/better-col alias. |
| eval-27 | win_to_draw | prompt_confusion | Both runs dropped the render's own supplied cause — render_decision.link.text (L5) names the parity line completing at c7r3 and lostResource.window [c7r3,c6r4,c5r5,c4r6] — and instead recited opening-book narration ('you left the book line'), while emitting [zone:col2]/[zone:col1] specs instead of the offered handles better-col/played-col from render_decision.zones.aliases. |
| eval-28 | win_to_draw | prompt_confusion | render_decision.link (L5) stated verbatim "You had a forced win ... The played move let the opponent deny it at c7r4", yet run 0 inverted ownership of the winning line ("let your opponent keep the decisive diagonal alive") and reframed the forced win as "the toughest defense", while run 1 reduced the whole cause to the opponent taking c7r4 away 37 plies later — the info was present and correct, the model mis-anchored it (secondary: no vector field carries a near-term cause for a ply-3 opening, which is what pushes run 1 to the deep-denial-as-cause framing). |
| eval-29 | lose_to_faster_lose | prompt_confusion | Both runs fail A7a/A7d: the rendered afterPlayed threat list literally read "immediate at c3r2 (opp)" while the decision board read "major at c3r2 (opp)" — i.e. the played column-3 disc filled c3r1 and turned the opponent's not-yet-reachable four into a next-move win (solver: after-played col3 scores +9 for Green, an immediate mate; after-best col1 only +5) — yet both answers restated only the outcome ("speeds things up by giving your opponent an easier follow-up") and never named the board change, so the blunderer learns nothing locatable about why column 1 resists. |
| eval-30 | lose_to_faster_lose | render_bug | Both runs fail A7c: the mechanism names the opponent double threat only by its finishing square c6r2 (+ its diagonal window), while the square that CREATES the stacked fork — c3r5 on the engine finalMovestring 3334302233464054222 — is carried in opponentPunishment.line[].cell and marked rendered, yet renderReasonModel.mjs deriveRequiredSet/halfForkCellsSpec (OI-182) neither required nor even OFFERED it as a zone alias, so the coach lists the effect and never the cause. |
| eval-31 | win_to_lose | prompt_confusion | Run 1 broke the L9 guardrail ("hedge — do not fabricate a crisp cause") by asserting the opponent has a next-move four at c6r2, which visualize_board.sh on the after-played board 33333444463010112 shows as a NON-gravity [O] threat (col6 height 0, opponentPunishment.pliesToEnd 21), while run 0 never named column 5 in prose even though bestCol was in fieldPartition.rendered; a secondary render gap is that causalLinks.mjs L9 is the only sign-family template that never states "Column N". |
| eval-32 | draw_to_lose | prompt_confusion | Run 1 never names the better column in prose — render_decision.link.text supplies it verbatim ("The better move (col 6) occupies c6r2") and the solver confirms display col 6 is the only non-losing move (scr row: col6=0, all others -11), but the model referred to it only as the raw token c6r2 while explicitly naming "column 5" (the played column), so a reader would take column 5 as the recommendation. |
| eval-34 | win_to_draw | prompt_confusion | Both runs fail A6: render_decision.link.text states "The better move (col 5) completes your threat to make four next move at c5r6" verbatim, yet neither mechanism names column 5 in prose — run 0 names only the played column ("By playing column 1 instead") and run 1 says only "By playing elsewhere", so the player is never told where to play; the board confirms c5r6 is a gravity-top X major threat (scr col5 = 2 win, col1 = 0 draw). |
| eval-35 | win_to_lose | prompt_confusion | Both runs fail A6: the better column (bestCol=3 -> "column 4") is stated in the rendered Decision block (fieldPartition.rendered includes bestCol, and both runs set better_move:4 correctly), yet the coach prose never says "column 4" — it appears only inside the [zone:better-col] handle (expanded to [zone:col4]) and as the vague "central-column opening line"/"central column move"; run 1 additionally fails A7b with the dangling referent "the better central connection", which points at no cell even though render_decision.link.text supplied the winning group c2r5-c3r5-c4r5-c5r5. |
| eval-36 | draw_to_lose | prompt_confusion | Run 1 never names the better column in the coach prose ("By playing elsewhere") even though render_decision.link.text states "the better move (col 3)" verbatim and alias better-col (spec col3) was offered — A6 fail; run 0 says "column 3" and passes, so the defect is intermittent; secondary: better-col is absent from render_decision.requiredSet, so naming/highlighting the better column is only suggested, never obliged. |
| eval-38 | draw_to_lose | prompt_confusion | Run 1 never names the better column in prose (“the more central column”, number only inside the [zone:col3] overlay) even though render_decision.link.text states it verbatim — “the better move (col 3) holds it by occupying c4r3” — and the solver confirms col index 2 (display 3) is the only-scoring-0 reply alongside 4/5/6 while the played col index 1 scores -2. |
| eval-39 | lose_to_faster_lose | prompt_confusion | Both runs fail A6: render_decision.link.text states the better move verbatim as “The better move (col 4) occupies c4r1”, yet neither mechanism ever names column 4 in words — run 0 says only “You had to take c4r1” and run 1 “You needed the block at c4r1”, so the better column reaches the player only as a raw cNrM token (run 1 does say “column 5”, but that is the PLAYED column, which risks reading as the recommendation). |
| eval-40 | lose_to_faster_lose | prompt_confusion | Run 0 fails A6: it names the better move only as the raw cell token "c5r1" and the only column word in the prose is "column 3" (the played, wrong column), even though render_decision.link.text states verbatim "The better move (col 5) occupies c5r1" — run 1, same record, says "column 5", so this is intermittent model phrasing, not missing info. |
| eval-41 | win_to_lose | prompt_confusion | Both runs fail A6 — neither mechanism names the better column in prose even though render_decision.link.text states it verbatim ("The better move (col 5) completes your threat to make four next move at c5r3"); run 0 additionally fails A4 by calling the better move a threat-preserving "toughest defense" when 2345153551111014334 is GAME OVER (X completes c3r1-c4r2-c5r3-c6r4 immediately). |
| eval-42 | lose_to_faster_lose | render_bug | L3 fired with patternOnAfterBestBoard=false and its guardrail/covers forbade and removed the only true reason — playing column 1 OCCUPIES c1r4 (lostResource.kind='denial'/verdict='occupation', both in L3's covers), which on the board kills the opponent's 7-fork (after-best 31133025134544600550 leaves only col3row3 as an X major, scores flip -10 to +2, while after the played move X takes c1r4 and gets the gravity-top double threat c3r2/c3r3) — so both runs wrote vacuous 'toughest defense' prose and neither named c1r4. |
| eval-43 | lose_to_faster_lose | render_bug | Both runs fail A7 (a+c): buildAnnotationOffer in zoneAnnotations.mjs gates the fork aliases/term on half.tacticTag==="double_threat" while this record carries opponentPunishment.tag/cells/windows, so the second fork square c6r2, the row-2 window c3r2-c4r2-c5r2-c6r2 and the fork pivot c4r2 were never offered, and L3’s template supplies only a tempo frame (“only speeds up the finish”) — the visualizer on 43421122112604010042053 shows X gravity-top majors at BOTH c4r3 and c6r2 after the pivot at c4r2, the real board cause the coach never states. |
| eval-44 | draw_to_lose | prompt_confusion | Run 1 ignored the L2 link text/guardrail that verbatim supplies the conceded cell c3r1 and the opponent double threat on c3r1-c4r1-c5r1-c6r1 (board-confirmed on render_decision.finalMovestring 44315, where Green holds c4r1/c5r1/c6r1 with gravity-top majors at c3r1 and c7r1), giving only generic centrality prose and mis-binding both offered column zones (played-col wrapped "the move that lets your opponent answer most cleanly", better-col wrapped "the stronger central hold" attributed to the opponent). |
| eval-45 | draw_to_lose | render_bug | Run 0 only: the L2 template's trailing clause 'the better move (col 1) denied it at c4r6' (causalLinks.mjs L2 / render_decision.link.text) compresses a 4-ply forced denial into an immediate-block phrasing, and the model rendered it as 'You should have played the block on [zone:c4r6]', pointing the blunderer at a square in the column he was just told NOT to play (c4r6 is row 6 of col 4, ht=4 on the decision board, so it is not even playable) — the same referent then does double duty as the square the opponent takes. |
| eval-46 | lose_to_faster_lose | prompt_confusion | Run 1 mis-anchored the offered zone handles — it wrapped the literal text "c2r4" with handle opp-major-2 (spec c6r3) and asserted the c6r3/c5r4/c4r5/c3r6 diagonal "runs through c2r4", a square the visualizer shows on a different Gray threat line (c2r4,c3r4,c4r4,c5r4), while run 0 used the same correctly-offered handles cleanly. |
| eval-47 | win_to_draw | render_bug | The L1 composer in causalLinks.mjs ('The better move (col 5) completes your double threat at c3r6', render_decision.link.text) binds lostResource.completingCell (c3r6) to the better move, but the better move col5 lands on c5r4 and c3r6 is exactly where the PLAYED column-3 move lands (visualize_board on 3321153130453320125221100542 shows X29 at c3r6) - both runs mis-anchored the fork pivot as a result, and no alias for the pivot cell c5r4 on afterBest was offered (only 'better-col'=col5 whole-column) so neither run could name it. |
| eval-48 | win_to_lose | prompt_confusion | Both runs had render_decision.link.text stating verbatim "The better move (col 2) completes your double threat ... at c1r1", yet run 0 inverted it into a defensive frame ("keep your double threat alive" / "Column 2 is the tougher defense ... forces your opponent to answer") which the decision board 3323 refutes (Major threats: none — the fork does not exist until col 2 is played) and the after-best board 33231 refutes (every Gray reply scores -18, so the opponent cannot answer), while run 1 never named the better column at all ("the move" / "by playing elsewhere"), failing A6. |
| eval-49 | win_to_draw | render_bug | The offered alias opp-key-square (c3r4) is labelled with the completing-a-four role even though opponentPunishment.kind is denial/occupation and c3r4 completes no Green four on the decision board (visualizer: the only major threat there is col5 row3, Gray), a board-false rendered region on every run; secondarily run 1 fails A6 by never naming column 3 as the better move. |
| eval-50 | win_to_draw | prompt_confusion | Both runs dropped the better column: render_decision.link.text says verbatim "The better move (col 3) completes your 7-shaped double threat at c5r2" and the better-col/col3 alias was offered, yet neither mechanism names column 3 (only "column 1", the played column), and neither names the stacked second threat c5r3 that makes the c5r2 threat unblockable (solver: decision board col3 = +12 win, col1 = 0 draw). |
| pin-L1-completes-your-tactic | win_to_lose | render_bug | Both runs fail G5: the rendered decision board asserts tactics that are not board-true on it — boardSelectionDecisions' namedPatternOpts overlay prints 'double_threat at c2r1 (you)' on the decision board 3343 (visualize_board: 'Major threats: none'; the fork only exists after the better move, on 33432), and zoneAnnotations.mjs roleText's 'major' fallback labels the denial half's completingCell as 'a single square completing your opponent's four-in-a-row line' when c3r1 is a denial-by-OCCUPATION (on the engine's finalMovestring 334332 gray has only c3r1/c4r2/c4r3 and completes nothing) — run 1 faithfully narrated that false role ('the square that finished their line', an A4 falsehood), and separately never named column 3 (A6) or the fork-creating square (A7c). |
| pin-L2-enabled-opponent | win_to_lose | render_bug | The required-set alias `you-key-line` (zoneAnnotations.mjs buildAnnotationOffer half-geometry loop + roleText(owner,"line")) offers the OPPONENT's window c2r1-c3r1-c4r1-c5r1 as "the whole four-in-a-row line YOU are playing for", but on board 334 that window holds two player-1 discs and zero of player 2's, so both runs were obliged to tell the player it was their line; secondaries: the decision board's rendered Tactics list asserts a double_threat that does not exist on that board, and the only board where the fork is real (33432) is marked shown:false. |
| pin-L3-no-causation | lose_to_faster_lose | render_bug | render_decision.requiredSet for this L3 board obliges only the opponent-threat handles (opp-major c4r3, opp-major-line c6r1,c5r2,c4r3,c3r4) and never the offered you-immediate alias (c2r4), the gravity-top immediate threat that visualize_board.sh shows column 2 creates on the shown afterBest board (afterBest scr: col2=10, every other column -12, i.e. Green MUST answer c2r4) — so both runs explained why the opponent wins and never named what makes column 2 the toughest defense; secondarily causalLinks.mjs L3 template() interpolates the raw completingCell into link.text ("...double threat at c4r3..."), which run 0 echoed verbatim into player-facing prose. |
| pin-L4-missed-defense | draw_to_lose | prompt_confusion | Everything needed was supplied — render_decision.link.text says verbatim 'The better move (col 5) occupies c5r4' and the offered aliases better-col/opp-immediate/opp-immediate-line are all board-true on the decision board (visualize_board 42224253264 shows X at c5r1-c5r3 with c5r4 a gravity-top major threat) — yet run 0 never told the player to play column 5 (A6) and run 1 echoed the raw coordinate 'c5r4' straight into coach prose (A5a); the link.text template's own cNrM wording is a secondary contributor to the run-1 leak. |
| pin-L5-deep-fork | win_to_draw | prompt_confusion | Both runs drop the better column entirely (A6) although the prompt Decision block states it verbatim (renderReasonModel.mjs renderDecision -> "Better move: column 1 (lands at c1r1). Outcome: win.", bestCol=0 and solver scr row on 422242532 gives col1=+2 win vs col7=0 draw), and run 0 goes further and tells the player to PLAY the deep fork square c4r3, which is not even a legal landing square now (column 4 height 1 -> next disc lands c4r2); secondary contributors are the render-layer requiredSet, which obliges only the three deep future: zones and never the better-col / you-immediate pivot handles (A7c), run 1s raw cNrM coordinates in coach prose (A5a) and its presentation of a 28-ply-deep fork as an immediate consequence of the move (L5 horizon guardrail, G2). |
| pin-L6-lost-win-and-gave-one | win_to_lose | prompt_confusion | Both runs fail A6 - the prose names only “column 1” (the column played) and never states the better column 2, although bestCol=1 and the better-col/col2 alias are in render_decision.fieldPartition.rendered and zones.aliases; run 1 additionally inverts ownership, calling opponent-punishment square c2r6 your line and your own deep fork square c2r5 the opponent's reply, which render_decision.finalMovestring 422242532643343015330451665102146556600 contradicts (c2r5 is Green's gravity-top winning square there). |
| pin-L7-practical-swindle | lose_to_faster_lose | prompt_confusion | Run 1 opens with “Your move in column 4 keeps the toughest defense alive” although the Decision block states verbatim “Better move: column 4 … Played move: column 6” and the answer itself then says “By playing column 6” — the model mis-anchored played-vs-better despite correct, explicit render information (secondary, render-side: the requiredSet binds opponentPunishment.completingCell c2r4 to the you-owned alias you-major-2, and the offered alias opp-key-line is board-false on its stated truthBoard). |
| pin-L8-draw-abandoned | draw_to_lose | prompt_confusion | Run 1 inverted replyHistogram — it wrote that the better move “keeps more replies available” although afterBest=2 < afterPlayed=3 and the reading key states fewer opponent replies means the tougher defense (solver on 4222423 gives [-9,-15,0,0,-13,-4,-2]: exactly 2 draw-holding replies for the opponent, no more than after the played move); run 0 stated the same field correctly, so the defect is intermittent model misreading, not a vector or render defect. |
| pin-L9-hedged-parity | win_to_lose | prompt_confusion | Both runs drop the Decision block's verbatim 'Better move: column 4' and L9's verbatim winning group c2r5·c3r5·c4r5·c5r5, producing opening-plan generalities that never name column 4 in prose (A6) and never anchor a cause to any square (A7); run 0 additionally calls that horizontal row-5 group a 'diagonal' (A4). |
| pin-branch-invariance-false | draw_to_lose | render_bug | buildAnnotationOffer labels the DENIAL half `you`, so `you-key-line` (windows:c2r1,c3r1,c4r1,c5r1) and `you-key-square` (c3r1) are offered as YOUR line/square when on the decision board (44443) Green already holds c4r1 and c5r1 — the line is the OPPONENT`s; the same dedup suppressed `opp-key-line`, and L2`s template plugs opponentPunishment.completingCell (c2r1) into "let the opponent occupy X, completing their double threat" when the engine`s own finalMovestring 4444332 shows the fork is created at c3r1 (4444331 = a single blockable threat). |
| pin-branch-invariance-true-3 | lose_to_faster_lose | prompt_confusion | Run 0 inverted replyHistogram: it justified column 3 as “the tougher defense because it leaves them more replies to sort through”, but afterBest=3 / afterPlayed=1 are the OPPONENT’s non-losing replies (glossary §8), and the solver rows confirm the inversion — after best (…02) Gray wins with all three legal cols (+5/+5/+4) while after played (…05) only col6 wins (+6, cols 3/7 are −2/−3) — so more replies means the opponent is MORE comfortable, and render_decision.link.text had already supplied the correct reason verbatim (“column 3 makes your opponent work hardest … the move you played only speeds up the finish”); secondary: glossary §8 gives no reading for afterBest > afterPlayed. |

## Counterexample list (THE DELIVERABLE)

Grouped by the render-layer element / feature field the failure attributes to, ordered by frequency.

| # cases | render gap / field | axes hit | triage | evidence (board finding) |
|---|---|---|---|---|
| 44 | causalLinks.mjs link.text / guardrail — the composed frame text | A6×20, A3×8, G2×12, A7×8, A4×5, G3×1, G5×1, A7a×1, A5×2, G4×1 | prompt_confusion×42, render_bug×17 | `eval-1` — Run 1 mechanism with markup stripped names no column at all; bestCol=3 (display 4) and the L7 text supplied it, so nothing was missing — the model routed the column into the [zone:better-col] handle instead of the prose. |
| 27 | render_decision.zones.aliases — offered set and handle→spec→role binding | abstention×2, G7×12, A6×7, A7×1, G5×7, A4×2, A7b×1 | prompt_confusion×20, render_bug×11 | `eval-2` — Run 0 abstains: "I could not determine any specific tactical square from the vector, only that the move is judged through opening centrality and a deep parity fight." The vector and render DO name squares - lostResource.completingCell c6r2 (window c3r2-c6r2), opponentPunishment.completingCell c6r3 (window c3r3-c6r3), render_decision.resource.completingCell c6r3 at horizon deep-parity, r |
| 24 | render_decision.requiredSet — the reason was offered but never obliged | A7×13, A3×4, A7c×2, G7×3, A6×4 | prompt_confusion×15, render_bug×11 | `eval-3` — Run 0 wrote "finish a deeper four-in-a-row line" with no zone wrapper; the opponent line c3r2,c4r2,c5r2,c6r2 is real on opponentPunishment.finalMovestring (move 38 = O at c6r2) but the reader has no way to locate it — the requiredSet obliges you-key-line but not opp-key-line. |
| 15 | zones.aliases — no fork-PIVOT alias, only the finishing squares (OI-182) | A7×11, abstention×2, A7c×1, A4×3, G7×2, A3×1 | prompt_confusion×12, render_bug×8 | `eval-11` — The A7b/A7c referents ('the deep fork fight', 'your winning line', the fork pivot) have no zone handle to bind to; the only emitted overlays span columns 4 and 5, which contain neither c2r5 nor c2r4 — the pivot was never offered (OI-182). |
| 12 | render_decision.zones.terms — term vocabulary too narrow; unoffered slugs invented and silently dropped | G7×7, A7×3, A4×2, G7b×1 | prompt_confusion×10, render_bug×3 | `eval-1` — Run 0 raw emitted [term:central]…[/term:central] though zero term slugs were offered; dropUnoffered silently removed it (annotationRepairs === []), so the defect is invisible downstream — an unoffered-slug emission should be recorded as a repair. |
| 11 | openingContext / opening frame O1–O3 — centrality prose displaces the grounded reason | A7×4, A6×2, A3×2, A4×1, A5×1, G3×1, abstention×1 | prompt_confusion×10, render_bug×2 | `eval-7` — Run 1 says ‘the winning line’ with no locatable referent; opponentPunishment.window = c3r2,c4r2,c5r2,c6r2 (completing c6r2) is rendered in the prompt but has no legal zone handle, so a specific-sounding phrase had nothing to bind to. |
| 6 | lostResource / opponentPunishment cells & windows — rendered but never surfaced | A4×4, A7×2 | prompt_confusion×5, render_bug×1 | `eval-4` — visualize_board 3333342 shows the played move (col index 2) landing on c3r1; c5r2 is an opponent disc in the punishment line, yet run 0 says the played move lands on c5r2. |
| 6 | replyHistogram — direction of the count (glossary §8) | A7×1, A5×1, A4×2, abstention×1, A3×1 | render_bug×1, prompt_confusion×4 | `eval-21` — afterBest=1 vs afterPlayed=7 is the one concrete, countable idea available on this tactic-free opening board; both runs list it in fields_relied_on yet neither states the counts, leaving only an unanchored "more resilient" abstraction. |
| 5 | parityAttribution.* — the deep parity resource is unnarratable | A7×2, abstention×3, G3×1 | prompt_confusion×5, render_bug×1 | `eval-6` — visualize_board.sh on 33322 shows no major threats and only minor threats; the only nameable anchors are the deep parity cells c6r4 (yours, 33 plies) and c1r4 (opponent, 29 plies), and neither run mentions any cell at all. |
| 5 | other | A6×2, G4×2, A4×1 | prompt_confusion×4, render_bug×1 | `eval-17` — feature_vector.bestCol=5 and after-best board 33333111155 is a P1 win (all solver scores negative for Gray), so column 6 is the better move, but run 1 prose says only "the better move". |
| 3 | horizon / register / pliesToEnd | A7×1, A5×1, A7a×1 | prompt_confusion×2, render_bug×1 | `eval-3` — Run 0 called the opponent line "deeper" while the vector has opponent 31 plies vs your 34 — the horizon the L6 guardrail demands was available and neither run used it. |
| 3 | render_decision.boards — selection / omission | G5×2, G4×1 | render_bug×2, prompt_confusion×1 | `pin-L1-completes-your-tactic` — Prompt's decision board (movestring 3343) prints 'Tactics: - double_threat at c2r1 (you, window c2r1·c3r1·c4r1·c5r1)', but ./visualize_board.sh 3343 reports 'Major threats: none' (green has only c4r1,c5r1; c2r1 is a minor threat). The double threat exists only on 33432. |

### Full evidence per group

**causalLinks.mjs link.text / guardrail — the composed frame text** — 44 cases: eval-1, eval-3, eval-4, eval-5, eval-6, eval-7, eval-8, eval-10, eval-11, eval-12, eval-13, eval-14, eval-18, eval-19, eval-20, eval-21, eval-22, eval-24, eval-25, eval-27, eval-28, eval-29, eval-31, eval-32, eval-34, eval-35, eval-40, eval-41, eval-42, eval-43, eval-44, eval-45, eval-47, eval-48, eval-49, eval-50, pin-L2-enabled-opponent, pin-L3-no-causation, pin-L4-missed-defense, pin-L5-deep-fork, pin-L6-lost-win-and-gave-one, pin-L9-hedged-parity, pin-branch-invariance-false, pin-branch-invariance-true-3

- `eval-1` — Run 1 mechanism with markup stripped names no column at all; bestCol=3 (display 4) and the L7 text supplied it, so nothing was missing — the model routed the column into the [zone:better-col] handle instead of the prose.
- `eval-3` — link.text = "You had a forced win via c5r5 (deep, via a parity battle); the played move gives it up AND lets the opponent force their own win via c6r2" — no column; both runs consequently produced prose with no "column 2", even though renderDecision() emits "- Better move: column 2".
- `eval-4` — bestCol=1 (display column 2, solver score +1 on 333334, played column 3 scores -3); both runs describe the better move without ever using the word column.

**render_decision.zones.aliases — offered set and handle→spec→role binding** — 27 cases: eval-2, eval-4, eval-6, eval-7, eval-8, eval-9, eval-11, eval-12, eval-15, eval-16, eval-20, eval-21, eval-26, eval-27, eval-31, eval-36, eval-42, eval-44, eval-46, eval-47, eval-49, eval-50, pin-L1-completes-your-tactic, pin-L5-deep-fork, pin-L7-practical-swindle, pin-L9-hedged-parity, pin-branch-invariance-false

- `eval-2` — Run 0 abstains: "I could not determine any specific tactical square from the vector, only that the move is judged through opening centrality and a deep parity fight." The vector and render DO name squares - lostResource.completingCell c6r2 (window c3r2-c6r2), opponentPunishment.completingCell c6r3 (window c3r3-c6r3), render_decision.resource.completingCell c6r3 at horizon deep-parity, reachableInPlies 38 - but zones.aliases offers only better-col(col4)/played-col(col6), so the deep-parity square has no annotatable handle and the model treated it as unusable. All three boards show "Major threats: none" (the cells are 38 plies out), so this is a render-offer gap, not a vector error; it did not cost any axis on this case.
- `eval-4` — run 0 wraps the literal text "c2r1" in the c5r5 handle and "c5r2" in the c6r2 handle — the highlight and the words denote different squares; the role text ("this single square matters later") is not what the wrapped phrase denotes.
- `eval-6` — Run 0 wraps "central pressure" (an opponent-side object) in [zone:col3], whose declared role is "the column of the better move" - over-wrap onto a semantically different referent.

**render_decision.requiredSet — the reason was offered but never obliged** — 24 cases: eval-3, eval-4, eval-5, eval-9, eval-12, eval-13, eval-17, eval-18, eval-20, eval-23, eval-24, eval-25, eval-26, eval-30, eval-36, eval-38, eval-39, eval-42, eval-47, pin-L1-completes-your-tactic, pin-L2-enabled-opponent, pin-L3-no-causation, pin-L5-deep-fork, pin-L7-practical-swindle

- `eval-3` — Run 0 wrote "finish a deeper four-in-a-row line" with no zone wrapper; the opponent line c3r2,c4r2,c5r2,c6r2 is real on opponentPunishment.finalMovestring (move 38 = O at c6r2) but the reader has no way to locate it — the requiredSet obliges you-key-line but not opp-key-line.
- `eval-4` — run 1 refers to "the better move" with no column and no better-col zone, leaving the blunderer with no locatable move; requiredSet contains only you-key-square, opp-key-square and you-key-line.
- `eval-5` — Engine finalMovestring 3332203133450000054444455556611 completes the opponent line at c2r3 on window c4r1/c3r2/c2r3/c1r4; no run mentions any square, so the answer is pure centrality rhetoric with nothing locatable on the board.

**zones.aliases — no fork-PIVOT alias, only the finishing squares (OI-182)** — 15 cases: eval-11, eval-15, eval-17, eval-19, eval-20, eval-22, eval-23, eval-25, eval-43, eval-46, eval-48, pin-L2-enabled-opponent, pin-L5-deep-fork, pin-L6-lost-win-and-gave-one, pin-branch-invariance-false

- `eval-11` — The A7b/A7c referents ('the deep fork fight', 'your winning line', the fork pivot) have no zone handle to bind to; the only emitted overlays span columns 4 and 5, which contain neither c2r5 nor c2r4 — the pivot was never offered (OI-182).
- `eval-11` — Run 1's unsure_about claims it 'can't tell whether the two lines differ by a specific tactical motif'; lostResource.tacticTag='figure_7' with tacticCells c5r3,c4r4,c5r5,c4r5,c3r5 and forkCells [c2r5] were supplied, and the term figure_7 was offered in render_decision.zones.terms.
- `eval-15` — The engine finalMovestring 333222336212244151100550446 ends with P1 playing c7r2 to fork at c7r3, but the only offered aliases are col7, col2, c5r4 and the c2r1-c5r4 diagonal, none of which is the fork pivot.

**render_decision.zones.terms — term vocabulary too narrow; unoffered slugs invented and silently dropped** — 12 cases: eval-1, eval-13, eval-16, eval-23, eval-24, eval-28, eval-29, eval-31, eval-43, eval-50, pin-L2-enabled-opponent, pin-branch-invariance-false

- `eval-1` — Run 0 raw emitted [term:central]…[/term:central] though zero term slugs were offered; dropUnoffered silently removed it (annotationRepairs === []), so the defect is invisible downstream — an unoffered-slug emission should be recorded as a repair.
- `eval-13` — Run 1 raw emitted [term:central_column]; only double_threat is offered. dropUnoffered strips the wrapper but records no repair, so annotationRepairs stayed [] and G7c could not catch it.
- `eval-16` — zones.aliases = [better-col(col7), played-col(col5)] only and requiredSet = []; the real fork square c7r3 is on the engine finalMovestring 333222336212244151100550446 (lostResource.completingCell / forkCells / window c4r3-c7r3) but pruneOpeningResidue strips it, so the prompt's own rule that a term must sit next to a separate [zone:] is unsatisfiable for figure_7 on this record.

**openingContext / opening frame O1–O3 — centrality prose displaces the grounded reason** — 11 cases: eval-7, eval-8, eval-10, eval-12, eval-14, eval-15, eval-16, eval-19, eval-25, eval-35, pin-L8-draw-abandoned

- `eval-7` — Run 1 says ‘the winning line’ with no locatable referent; opponentPunishment.window = c3r2,c4r2,c5r2,c6r2 (completing c6r2) is rendered in the prompt but has no legal zone handle, so a specific-sounding phrase had nothing to bind to.
- `eval-8` — Prose names zero cells; key_cells are only the two whole-column overlays, so nothing anchors the stated idea to squares (A7d). Run 0 additionally promises "the more central line" with no locatable referent (A7b).
- `eval-10` — Run 0 emitted [zone:better-col] around the phrase "book line", so after expansion the reader sees a highlighted column 7 but the sentence never says "column 7"; the render supplied bookCol:7 and bestCol:6 explicitly, so the information was present and was dropped by the model, not missing.

**lostResource / opponentPunishment cells & windows — rendered but never surfaced** — 6 cases: eval-4, eval-11, eval-29, eval-44, eval-47, pin-L9-hedged-parity

- `eval-4` — visualize_board 3333342 shows the played move (col index 2) landing on c3r1; c5r2 is an opponent disc in the punishment line, yet run 0 says the played move lands on c5r2.
- `eval-11` — Run 1 places the opponent's deep winning line 'around column 5'; the engine's window is c4r2,c3r3,c2r4,c1r5 (display cols 4,3,2,1) completing at c2r4 — column 5 is not in it.
- `eval-29` — reachableInPlies is null and there is no pliesToEnd/plies-to-loss differential in the vector, so "makes your opponent work hardest" could not be quantified; replyHistogram (afterBest 5, afterPlayed 4) is the only proxy and both runs mis-narrated it as "fewer clean ways to press that attack".

**replyHistogram — direction of the count (glossary §8)** — 6 cases: eval-21, eval-23, eval-48, pin-L8-draw-abandoned, pin-branch-invariance-true-1, pin-branch-invariance-true-3

- `eval-21` — afterBest=1 vs afterPlayed=7 is the one concrete, countable idea available on this tactic-free opening board; both runs list it in fields_relied_on yet neither states the counts, leaving only an unanchored "more resilient" abstraction.
- `eval-23` — Run 0 renders the 1-vs-3 reply counts as "the reply tree is looser" — search jargon shown to a player; render_decision.link.text never uses that wording, so the leak is the model paraphrasing the field name.
- `eval-48` — afterBest reply count 0 plus the 33231 scr row (-18 across all seven columns) both say the opponent has no answer, yet run 0 wrote "forces your opponent to answer instead".

**parityAttribution.* — the deep parity resource is unnarratable** — 5 cases: eval-6, eval-13, eval-27, eval-31, pin-L2-enabled-opponent

- `eval-6` — visualize_board.sh on 33322 shows no major threats and only minor threats; the only nameable anchors are the deep parity cells c6r4 (yours, 33 plies) and c1r4 (opponent, 29 plies), and neither run mentions any cell at all.
- `eval-6` — Run 0 says it "does not let me name a concrete finishing threat or a specific deep cell", but the vector renders completingCell c6r4 with the window c3r1,c4r2,c5r3,c6r4 and its parity breakdown - the field was present in fieldPartition.rendered and was missed.
- `eval-13` — visualize_board on 333 shows no major/minor threats at all; the only grounded resource cells (completingCell c5r4, controllingGroup c3r4-c6r4) resolve 35 plies out, so run 1 correctly reported it had no concrete near-term threat square to name.

**other** — 5 cases: eval-17, eval-46, eval-47, pin-L7-practical-swindle, pin-L9-hedged-parity

- `eval-17` — feature_vector.bestCol=5 and after-best board 33333111155 is a P1 win (all solver scores negative for Gray), so column 6 is the better move, but run 1 prose says only "the better move".
- `eval-46` — The engine line and opponentPunishment.window both terminate on c6r3; c2r4 appears nowhere in that line, so the run-1 grounding is to an unrelated square.
- `eval-47` — 332115313045332012522110054424 puts the player on c3r6 and the opponent on c5r4; both runs name c3r6 for a role that line assigns elsewhere.

**horizon / register / pliesToEnd** — 3 cases: eval-3, eval-15, eval-18

- `eval-3` — Run 0 called the opponent line "deeper" while the vector has opponent 31 plies vs your 34 — the horizon the L6 guardrail demands was available and neither run used it.
- `eval-15` — pliesToEnd=18 was surfaced and run 1 rendered it to the player as "many plies away", using engine units instead of the allowed "about N moves later".
- `eval-18` — run 0 explains the blunder purely as result ("your winning line stays alive" / "their own finish"); the decision board 3333311115 has no major threats, so the real change is which forced line stays reachable from column 6 (scr +1) vs column 2 (scr -3)

**render_decision.boards — selection / omission** — 3 cases: pin-L1-completes-your-tactic, pin-L2-enabled-opponent, pin-L7-practical-swindle

- `pin-L1-completes-your-tactic` — Prompt's decision board (movestring 3343) prints 'Tactics: - double_threat at c2r1 (you, window c2r1·c3r1·c4r1·c5r1)', but ./visualize_board.sh 3343 reports 'Major threats: none' (green has only c4r1,c5r1; c2r1 is a minor threat). The double threat exists only on 33432.
- `pin-L2-enabled-opponent` — The decision board (movestring 334) renders "Tactics: double_threat at c2r1 (opp, window c2r1-c3r1-c4r1-c5r1)" while visualize_board.sh 334 reports "Major threats: none" - a present-threat assertion for a fork that only exists after 33432.
- `pin-L7-practical-swindle` — render_decision.finalMovestring traces the parity punishment line, but every required zone (future:c2r3, future:windows:c1r3..c4r3) is grounded on the forced_sequence line shown as projectedDeep; the two halves disagree, so the field named as the grounding line is not the line the offered zones live on.

## Abstentions (`unsure_about`) — every non-empty entry

- **eval-2** run 0: I could not determine any specific tactical square from the vector, only that the move is judged through opening centrality and a deep parity fight.
- **eval-6** run 0: The vector supports the opening-based reason and the relative resilience of the two candidate moves, but it does not let me name a concrete finishing threat or a specific deep cell.
- **eval-11** run 1: I can’t tell from the vector whether the two lines differ by a specific tactical motif beyond the opening/centrality/parity reading, so I kept the explanation at the opening level.
- **eval-13** run 1: I could not determine any specific tactical cell from the provided vector beyond the opening/centrality story, so I did not name a concrete threat square.
- **eval-20** run 1: The vector does not let me name a specific future finishing square for the deep line, and the exact parity group is not provided.
- **eval-25** run 0: I can tell this is an opening-line blunder and that the better move is the central book move, but the vector does not let me name a specific future finishing square for the win.
- **eval-31** run 0: I can identify the long line that mattered and the opponent's key finishing square, but the vector does not let me isolate a single crisp tactical square as the sole mistake; the loss comes from the parity fight over that line.
- **eval-35** run 0: I can tell the opening choice and the parity-based horizon mattered, but the vector does not let me isolate a single concrete finishing square for the deep resolution.
- **eval-35** run 1: The vector does not let me isolate a single present tactical square; the difference is about the opening line and the later parity fight, not an immediate threat.
- **pin-branch-invariance-true-1** run 1: I could not determine from the vector alone whether the move difference was mainly about tempo or about a subtle parity detail; I only know column 1 is the tougher defense against the same threat.

Total non-empty abstentions: 10 of 126 runs.

## fields_relied_on distribution (across all 126 answers)

| count | field |
|---|---|
| 119 | `replyHistogram.afterBest` |
| 119 | `replyHistogram.afterPlayed` |
| 87 | `case` |
| 61 | `opponentPunishment.completingCell` |
| 53 | `lostResource.pliesToEnd` |
| 48 | `opponentPunishment.pliesToEnd` |
| 48 | `lostResource.completingCell` |
| 39 | `opponentPunishment.window` |
| 37 | `lostResource.window` |
| 30 | `opponentPunishment.tie.sharedCells` |
| 29 | `gate.verdict` |
| 26 | `openingContext.namedOpening.family` |
| 25 | `openingContext.namedOpening.matchedPrefixLen` |
| 22 | `openingContext.namedOpening.id` |
| 18 | `openingContext.centrality.betterHasMoreLines` |
| 18 | `opponentPunishment.cells` |
| 17 | `opponentPunishment.tag` |
| 16 | `openingContext.defense.family` |
| 16 | `openingContext.defense.matchedPrefixLen` |
| 15 | `openingContext.defense.centralityGrounded` |
| 14 | `gate.witness.devCols` |
| 14 | `opponentPunishment.windows` |
| 12 | `openingContext.centrality.resistAndWait` |
| 11 | `opponentPunishment.entryCell` |
| 11 | `decision` |
| 11 | `lostResource.cells` |
| 10 | `gate.witness.devCol` |
| 10 | `gate.witness.oppPlies` |
| 10 | `lostResource.tag` |
| 9 | `opponentPunishment.parityAttribution.controllingGroup` |
| 8 | `lostResource.parityAttribution.controllingGroup` |
| 8 | `openingContext.defense.id` |
| 8 | `lostResource.tacticTag` |
| 7 | `lostResource.parityAttribution.ownDiscs` |
| 7 | `opponentPunishment.parityAttribution.ownDiscs` |
| 7 | `opponentPunishment.cell` |
| 6 | `opponentPunishment.parityAttribution.empties` |
| 6 | `lostResource.register` |
| 5 | `lostResource.parityAttribution.empties` |
| 5 | `lostResource.anchorCells` |
| 5 | `lostResource.entryCell` |
| 5 | `opponentPunishment.tacticTag` |
| 5 | `lostResource.windows` |
| 5 | `lostResource.forkCells` |
| 4 | `lostResource.parityAttribution.completingCell` |
| 4 | `opponentPunishment.parityAttribution.completingCell` |
| 4 | `opponentPunishment.register` |
| 3 | `decision board` |
| 2 | `player` |
| 2 | `opponent` |
| 2 | `lostResource.witness.devCol` |
| 2 | `lostResource.witness.oppPlies` |
| 2 | `opponentPunishment.tie.playedPlies` |
| 2 | `opponentPunishment.tie.swindlePlies` |
| 2 | `lostResource.forkWindows` |
| 1 | `decision.betterMove` |
| 1 | `decision.playedMove` |
| 1 | `openingContext.matchedPrefixLen` |
| 1 | `decision board, played move c3r2 vs better move c6r1` |
| 1 | `opponentPunishment.forkCells` |
| 1 | `opponentPunishment.forkWindows` |
| 1 | `opponentPunishment.kind` |
| 1 | `decision.better move` |
| 1 | `decision.played move` |
| 1 | `decision.Tactics` |
| 1 | `afterBest board` |
| 1 | `boardState` |
| 1 | `decision.board` |
| 1 | `decision.tactics` |
| 1 | `afterPlayed.board` |
| 1 | `afterPlayed.tactics` |
| 1 | `projectedDeep.board` |
| 1 | `projectedDeep.tactics` |
| 1 | `decision.better_move` |
| 1 | `decision.played_move` |
| 1 | `opponentPunishment.owner` |
| 1 | `afterBest` |
| 1 | `projectedDeep` |

## Raw answers (per case)

### eval-1 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `3` · played col 1 (display 2) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "In the opening, [zone:col4]column 4[/zone:col4] is the tougher defensive choice because it stays more central and keeps more four-in-a-row lines alive for your next moves. [zone:col2]Column 2[/zone:col2] gives up that central hold, so it is easier for your opponent to steer the game and keep the practical swindle going.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed the more [zone:col4]central column[/zone:col4] to keep the position as hard as possible for your opponent and preserve the most future four-in-a-row lines. By playing [zone:col2]the edge-leaning column you chose[/zone:col2], you gave up some of that opening flexibility, so your opponent could steer the fight more cleanly and hold the tougher defense to the end.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-2 — lose_to_faster_lose — PASS

Board: `3` · played col 5 (display 6) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "In the opening, the tougher defense is to stay [zone:col4]more central in column 4[/zone:col4], because that keeps more four-in-a-row lines alive and gives you the most flexible way to resist and wait. By going [zone:col6]out on column 6[/zone:col6], you give up some of that central hold and make it easier for your opponent to keep the pressure on; the deeper fight is a long parity battle, so the opening choice matters a lot for how resilient your position feels.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "case",
  "player",
  "opponent"
 ],
 "unsure_about": "I could not determine any specific tactical square from the vector, only that the move is judged through opening centrality and a deep parity fight.",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the fight in the center: [zone:col4]column 4[/zone:col4] is the tougher defensive hold because it stays in the most useful part of the board and preserves more four-in-a-row lines for your future threats. By drifting to [zone:col6]column 6[/zone:col6], you give up some of that central control and make it easier for your opponent to steer the game into the stronger reply sequence.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-3 — win_to_lose — FAIL (prompt_confusion)

Board: `333334` · played col 3 (display 4) · best col 1 (display 2) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r5 (deep, via a parity battle); the played move gives it up AND lets the opponent force their own win via c6r2."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the fight on [zone:future:windows:c2r5,c3r5,c4r5,c5r5]your later four-in-a-row line[/zone:future:windows:c2r5,c3r5,c4r5,c5r5] and play the column that preserves [zone:future:c5r5]the key square you still need later[/zone:future:c5r5]. By playing the other column, you let your opponent take [zone:future:c6r2]their key square[/zone:future:c6r2] and then finish a deeper four-in-a-row line before you can cash in your own.",
 "key_cells": [
  "c2r5",
  "c3r5",
  "c4r5",
  "c5r5",
  "c6r2"
 ],
 "fields_relied_on": [
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.empties",
  "lostResource.anchorCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep the deep [zone:future:windows:c2r5,c3r5,c4r5,c5r5]four-in-a-row line[/zone:future:windows:c2r5,c3r5,c4r5,c5r5] alive through [zone:future:c5r5]c5r5[/zone:future:c5r5]; that line is the hard win you had to preserve. By playing [zone:col4]column 4[/zone:col4], you let your opponent seize [zone:future:c6r2]c6r2[/zone:future:c6r2] and turn that into their own finishing line, so you gave up your win and handed them one back.",
 "key_cells": [
  "c2r5",
  "c3r5",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r5",
  "c6r2"
 ],
 "fields_relied_on": [
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.empties",
  "lostResource.parityAttribution.completingCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.parityAttribution.completingCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-4 — win_to_lose — FAIL (prompt_confusion)

Board: `333334` · played col 2 (display 3) · best col 1 (display 2) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r5 (deep, via a parity battle); the played move gives it up AND lets the opponent force their own win via c6r2."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the deep [zone:future:windows:c2r5,c3r5,c4r5,c5r5]four-in-a-row line that runs through c2r5-c5r5[/zone:future:windows:c2r5,c3r5,c4r5,c5r5] alive by playing the move that lands on [zone:future:c5r5]c2r1[/zone:future:c5r5]; that is the tougher defense and keeps your own long win available later. By playing the move that lands on [zone:future:c6r2]c5r2[/zone:future:c6r2], you let your opponent take over and finish their own [zone:future:windows:c3r2,c4r2,c5r2,c6r2]four-in-a-row line through c3r2-c6r2[/zone:future:windows:c3r2,c4r2,c5r2,c6r2], so your move turns a win into a loss.",
 "key_cells": [
  "c2r5",
  "c3r2",
  "c3r5",
  "c4r2",
  "c4r5",
  "c5r2",
  "c5r5",
  "c6r2"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You gave up the only move that keeps your deep four-in-a-row line alive, so you let your opponent take over the finish. The better move keeps pressure on [zone:future:windows:c2r5,c3r5,c4r5,c5r5]your four-in-a-row line[/zone:future:windows:c2r5,c3r5,c4r5,c5r5] and preserves [zone:future:c5r5]the key square there[/zone:future:c5r5], while your played move hands them [zone:future:c6r2]their key square[/zone:future:c6r2] and lets them force the reply at c6r2.",
 "key_cells": [
  "c2r5",
  "c3r5",
  "c4r5",
  "c5r5",
  "c6r2"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.empties",
  "lostResource.parityAttribution.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.entryCell",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.parityAttribution.completingCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-5 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `33322` · played col 0 (display 1) · best col 2 (display 3) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 3 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have kept the [zone:col3]central column[/zone:col3] shape, because that move is the tougher defense in this book line and preserves the most resistance against your opponent's forking chances. By playing [zone:col1]on the edge[/zone:col1] instead, you gave up central control too fast, and your opponent can force the finish more easily from the same opening structure.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "lostResource.pliesToEnd",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "In this [zone:col3]central column move[/zone:col3], you keep the opening shape tighter and make your opponent work harder to convert the pressure; [zone:col1]the edge-side reply[/zone:col1] gives up centrality too quickly and lets the position unravel faster. The difference is not a short tactic on one square, but which opening choice best preserves the practical resistance in a deep parity battle.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-6 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `33322` · played col 5 (display 6) · best col 2 (display 3) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 3 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have kept the tougher [zone:col3]central-column reply[/zone:col3] alive instead of drifting to [zone:col6]the wider side drop[/zone:col6]. In this opening line, the central move holds the fight together and slows your opponent’s [zone:col3]central pressure[/zone:col3] more than the side move, which gives ground faster and makes the practical swindle easier for them to steer.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "decision",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols"
 ],
 "unsure_about": "The vector supports the opening-based reason and the relative resilience of the two candidate moves, but it does not let me name a concrete finishing threat or a specific deep cell.",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the fight centered with [zone:col3]column 3[/zone:col3]; that move lands on the stronger central track and keeps your four-in-a-row chances more compact and harder to break. [zone:col6]Column 6[/zone:col6] drifts away from the book opening, gives up the central rhythm faster, and leaves your opponent with a much easier path to outlast you in the long central battle.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "decision.betterMove",
  "decision.playedMove",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-7 — win_to_lose — FAIL (prompt_confusion)

Board: `3332` · played col 0 (display 1) · best col 2 (display 3) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c2r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c6r2."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the fight in the center with [zone:col3]column 3[/zone:col3], because central moves participate in more four-in-a-row lines and preserve more ways to build and defend. [zone:col1]Column 1[/zone:col1] is too far from the action, so it gives up those future lines and lets your opponent’s best reply steer the game into a losing finish.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "case",
  "openingContext.centrality.betterHasMoreLines",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played the [zone:col3]more central column[/zone:col3]: it keeps more four-in-a-row lines alive, so it’s the tougher opening choice and gives you more ways to build. By instead taking [zone:col1]the edge column[/zone:col1], you gave up that central shape and let your opponent steer the game into the winning line from much farther out; the good move is the book-like, more resilient defense, while the played move hands them the cleaner path.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": ""
}
```

### eval-8 — win_to_lose — FAIL (prompt_confusion)

Board: `3332` · played col 1 (display 2) · best col 2 (display 3) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c2r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c6r2."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the more [term:figure_7]central line[/term:figure_7] alive by playing [zone:col3]column 3[/zone:col3]; that move preserves more four-in-a-row routes through the middle, so you stay on the strongest book path and make the opponent work harder. By contrast, [zone:col2]column 2[/zone:col2] steps away from the center and gives up some of those opening connections, so your attack loses the tougher defense and the position turns against you over the long forced line.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played the more central [zone:col3]column 3[/zone:col3], because it keeps more four-in-a-row lines alive and gives you the strongest opening shape. By choosing [zone:col2]column 2[/zone:col2] instead, you gave up that central reach and made it easier for your opponent to outplay you in the long run.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-9 — win_to_draw — FAIL (render_bug)

Board: `33322226` · played col 5 (display 6) · best col 6 (display 7) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep, via a parity battle via a parity line completing at c6r5. The played move let the opponent deny it at c3r5."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to stay with the book move in the [zone:col7]column 7[/zone:col7] line; that keeps the opening and parity on your side and preserves the deep winning path. By playing [zone:col6]column 6[/zone:col6] instead, you stepped out of that line and let your opponent take the defense that turns your win into a draw; the real issue is the opening plan, not an immediate one-move tactic. The winning idea is still deep — about 32 plies away — so this is about keeping the forced sequence alive, not about a nearby square.",
 "key_cells": [
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You were still in the opening line, and the book move was to keep following that central-column plan. By playing [zone:col6]column 6[/zone:col6] instead of [zone:col7]column 7[/zone:col7], you stepped out of the line and gave up the opening plan that keeps your win alive. The winning finish is still far away — a deep parity battle — so the mistake is that you abandoned the book continuation and let your opponent steer the game into a draw.",
 "key_cells": [
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-10 — win_to_draw — FAIL (prompt_confusion)

Board: `33322226` · played col 4 (display 5) · best col 6 (display 7) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep, via a parity battle via a parity line completing at c6r5. The played move let the opponent deny it at c3r5."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep following the [zone:col7]book line[/zone:col7] in this opening; that move preserves the long, parity-based win the position is built around. By playing [zone:col5]the other move[/zone:col5], you left that line and only held the draw instead of keeping the forced win alive.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You were still following the book line for this opening, and the tough defense was to keep that line intact with [zone:col7]column 7[/zone:col7]. By [zone:col5]playing column 5[/zone:col5] instead, you left the opening path and let your opponent steer the game away from the forced win; the resolution is deep, so this is a book-and-parity mistake rather than a one-move tactic.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-11 — win_to_lose — FAIL (prompt_confusion)

Board: `333222` · played col 4 (display 5) · best col 3 (display 4) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c2r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c2r4."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "By playing the central [zone:col4]column 4[/zone:col4], you keep more four-in-a-row lines open and make your opponent work through a deep [term:figure_7]fork[/term:figure_7] fight that only settles many plies later. Your [zone:col5]column 5[/zone:col5] move gives up that opening flexibility and lets the position swing toward your opponent’s long forcing finish instead of the tougher defense.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "By playing [zone:col4]column 4[/zone:col4], you keep the opening line more central and give yourself the toughest chance to build and answer future threats; [zone:col5]column 5[/zone:col5] gives up that central opening edge. The better move is also the one that holds the winning line alive for the deep finish around [zone:col4]column 4[/zone:col4], while the played move lets your opponent steer the game to their own deep winning line around [zone:col5]column 5[/zone:col5] instead.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait"
 ],
 "unsure_about": "I can’t tell from the vector whether the two lines differ by a specific tactical motif beyond the opening/centrality/parity reading, so I kept the explanation at the opening level.",
 "confidence": "high"
}
```

### eval-12 — win_to_lose — FAIL (prompt_confusion)

Board: `333222` · played col 6 (display 7) · best col 3 (display 4) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c2r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c2r4."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You gave up the [term:figure_7]7-shaped double threat[/term:figure_7] idea in the center and played on [zone:col7]the edge column you chose[/zone:col7] instead of [zone:col4]the central column that keeps more four-in-a-row lines alive[/zone:col4]. In the opening, that central move is the tougher book continuation because it preserves more ways to build and more ways to answer later threats, while the edge move lets your opponent steer the fight into a winning line for them.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played the [zone:col4]more central column[/zone:col4], because in the opening it keeps more four-in-a-row lines alive and gives you more ways to build future threats. By choosing [zone:col7]the edge column[/zone:col7], you gave up that flexibility and let the deep fight tilt against you; the better move was the tougher book continuation that kept your winning chances open longer.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-13 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `333` · played col 6 (display 7) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You drifted away from the [term:double_threat]two-way danger[/term:double_threat] and into the edge, so your opponent gets a much easier time keeping the attack alive. [zone:col4]Staying in the central column[/zone:col4] keeps your stack more connected and makes the defense harder to break; [zone:col7]the edge move[/zone:col7] gives up that central hold and hands them the cleaner practical route. The deeper finish only shows up later through the [zone:future:windows:c6r5,c7r4]pair of finishing squares[/zone:future:windows:c6r5,c7r4], so the lesson here is to keep the opening central and resilient.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r5",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "decision",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the opening central and answer with the [zone:col4]more resilient column 4[/zone:col4], because that keeps your structure tighter and makes your opponent work harder to break through. Playing [zone:col7]column 7[/zone:col7] gives up that central hold too early and lets the position unravel faster; the safer defense is the one that keeps the central connection alive and delays the later [zone:future:windows:c6r5,c7r4]fork your opponent can eventually build toward[/zone:future:windows:c6r5,c7r4].",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r5",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "case"
 ],
 "unsure_about": "I could not determine any specific tactical cell from the provided vector beyond the opening/centrality story, so I did not name a concrete threat square.",
 "confidence": "high"
}
```

### eval-14 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `333` · played col 4 (display 5) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the defense more central with [zone:col4]column 4[/zone:col4]: it lands deeper in the middle and stays in the central fight, so your opponent has fewer easy ways to steer the game and build their own line. [zone:col5]Column 5[/zone:col5] drops your support too far to the side, giving up that central hold faster and making your opponent's path easier to keep alive over the long opening battle.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "lostResource.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have kept the [zone:col4]central column[/zone:col4] hold instead of drifting to [zone:col5]the higher side drop[/zone:col5]. In this opening line, the central reply is the tougher defense because it keeps your pieces tied together and gives your opponent less room to build the four-in-a-row they want; the side drop gives them the easier path and a cleaner grip on the middle.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-15 — win_to_draw — FAIL (prompt_confusion)

Board: `33322233` · played col 1 (display 2) · best col 6 (display 7) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep on a forced line via a fork completing at c7r3. The played move let the opponent deny it at c7r3."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to keep the book line alive; the better move is the one that stays on that path and keeps your forcing chances intact. By playing the other column, you stepped out of the opening and let your opponent steer the game into a drawn defense instead of the deeper forced win you still had available.",
 "key_cells": [],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "case",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to keep the book line alive by playing [zone:col7]column 7[/zone:col7], which preserves your [term:figure_7]7-shaped double threat[/term:figure_7] and keeps the central opening plan intact. By playing [zone:col2]column 2[/zone:col2] instead, you left that opening path and gave your opponent the chance to hold the draw against your deep win that was still many plies away.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-16 — win_to_draw — FAIL (prompt_confusion)

Board: `33322233` · played col 4 (display 5) · best col 6 (display 7) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep on a forced line via a fork completing at c7r3. The played move let the opponent deny it at c7r3."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep the [zone:col7]book move[/zone:col7] from the [zone:col5]line you actually chose[/zone:col5]; that move stays on the opening’s central-column idea and preserves the deep [term:figure_7]7-shaped fork[/term:figure_7] that makes your win possible many moves later. By switching to column 5, you left the book line and let your opponent deny that long forced finish, so the result drops to a draw instead of a win.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to stay on the [zone:col7]book line[/zone:col7] of the [term:figure_7]opening pattern[/term:figure_7] to keep the win alive many plies later. By switching to [zone:col5]your played column[/zone:col5], you left that line and gave your opponent the defense that turns the position into a draw instead of the forced win.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-17 — win_to_draw — FAIL (prompt_confusion)

Board: `3333311115` · played col 4 (display 5) · best col 5 (display 6) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep on a forced line via a fork completing at c5r5. The played move let the opponent deny it at c5r5."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You left the book line of the central opening and gave up the continuation that keeps your advantage alive. [zone:col6]Column 6[/zone:col6] is the move that preserves the forced win; [zone:col5]column 5[/zone:col5] lets your opponent steer the game into a draw instead of the winning line you had available.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You left the opening book line and played a move that only holds the draw, instead of keeping the central opening that preserves the forced win. The better move keeps your [zone:future:windows:c5r5,c7r6]fork with the two squares you can finish on[/zone:future:windows:c5r5,c7r6] alive later; the move you played lets your opponent steer the game away from that winning path and into a drawn ending instead.",
 "key_cells": [
  "c5r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-18 — win_to_lose — FAIL (render_bug)

Board: `3333311115` · played col 1 (display 2) · best col 5 (display 6) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c5r2."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You left the book line in a [term:double_threat]double threat[/term:double_threat] race and played away from the central opening plan. The better move keeps the opening’s parity and timing aligned so your winning line stays alive; your played move lets your opponent steer the deep fight to their own finish instead. The deciding fork is still far off: [zone:future:windows:c5r5,c7r6]the two squares you could later finish on[/zone:future:windows:c5r5,c7r6].",
 "key_cells": [
  "c5r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have kept the book line in the central-column opening by playing [zone:col6]column 6[/zone:col6], which preserves the best winning route. By switching to [zone:col2]column 2[/zone:col2], you leave that opening line and let your opponent steer the game into their own deep win later; the issue is the opening path and parity, not an immediate four-in-a-row threat. Your move also drops the chance to reach [zone:future:windows:c5r5,c7r6]the two finishing squares you would later use for the fork[/zone:future:windows:c5r5,c7r6], so you gave up the winning continuation and handed over the losing one.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c5r5",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "decision",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-19 — win_to_draw — FAIL (render_bug)

Board: `3333311115` · played col 6 (display 7) · best col 5 (display 6) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep on a forced line via a fork completing at c5r5. The played move let the opponent deny it at c3r5."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep following the central opening line; [zone:col6]column 6[/zone:col6] preserves that book path, while [zone:col7]column 7[/zone:col7] lets your opponent steer the game away from your forced win. The win is still deep — about 28 plies away — so the lesson is that you left the opening plan and gave up the line that kept your [term:double_threat]double threat[/term:double_threat] alive later, at [zone:future:windows:c5r5,c7r6]the two squares you can finish on[/zone:future:windows:c5r5,c7r6].",
 "key_cells": [
  "c5r5",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to keep following the central opening line, because that is what preserves your forced win many plies later. By playing [zone:col7]column 7[/zone:col7] instead of [zone:col6]column 6[/zone:col6], you stepped off the book path and let your opponent steer the game into a draw instead of letting your [term:double_threat]double threat[/term:double_threat] stay alive at [zone:future:windows:c5r5,c7r6]the two squares you can finish on[/zone:future:windows:c5r5,c7r6] later.",
 "key_cells": [
  "c5r5",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-20 — win_to_lose — FAIL (prompt_confusion)

Board: `3333311115` · played col 3 (display 4) · best col 5 (display 6) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c5r2."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to stay on the book’s central-column opening and keep the position on the same parity path; [zone:col6]column 6[/zone:col6] does that, while [zone:col4]column 4[/zone:col4] lets your opponent take over the forcing line. By leaving the opening line, you gave up the tougher defense and turned the game into your opponent’s winning sequence instead of your own [zone:future:windows:c5r5,c7r6]fork that only matters later, after the forced line reaches it[/zone:future:windows:c5r5,c7r6].",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r5",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have kept the book [zone:col6]central-column opening line[/zone:col6] going; that line is what preserves your best chance and forces the hardest reply. By playing [zone:col4]the off-book column[/zone:col4], you stepped out of the opening and let your opponent take over the long [term:double_threat]two-way threat[/term:double_threat] idea later, including [zone:future:windows:c5r5,c7r6]the two squares you would have used to finish it[/zone:future:windows:c5r5,c7r6] once the sequence reaches that horizon.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r5",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "The vector does not let me name a specific future finishing square for the deep line, and the exact parity group is not provided.",
 "confidence": "high"
}
```

### eval-21 — lose_to_faster_lose — FAIL (render_bug)

Board: `33333111155` · played col 1 (display 2) · best col 5 (display 6) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 6 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 4, 5, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have kept the [zone:col6]central, tougher defense[/zone:col6] by playing there instead of drifting to [zone:col2]the side column[/zone:col2]. In this opening line, staying more central preserves the most resilient reply and keeps the practical swindle alive longer, while the side move lets your opponent steer the fight into the deeper parity battle on their terms.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the fight in the [zone:col6]central column 6[/zone:col6] line instead of drifting to [zone:col2]column 2[/zone:col2]. This is an opening choice: the central-column book line stays more flexible and keeps your opponent working harder over the long parity fight, while column 2 gives up that resilience too early.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-22 — lose_to_faster_lose — FAIL (render_bug)

Board: `33333111155` · played col 0 (display 1) · best col 5 (display 6) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 6 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 4, 5, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the opening as tight as possible: [zone:col6]column 6[/zone:col6] stays in the central-column opening and preserves the toughest defensive shape, while [zone:col1]column 1[/zone:col1] drifts off that book line and gives your opponent more freedom to steer the position. The practical difference is that the better move keeps the long forcing line alive and makes your opponent work toward the later [term:double_threat]double threat[/term:double_threat] on [zone:future:windows:c5r3,c7r4]the two finish squares they can eventually aim at[/zone:future:windows:c5r3,c7r4].",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c5r3",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r4"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the opening more compact with [zone:col6]column 6[/zone:col6], because that is the tougher defense in this central-book line and it gives your opponent fewer clean ways to keep the attack going. By playing [zone:col1]column 1[/zone:col1], you drift away from the opening's central balance and let the position unravel into the later [term:double_threat]double threat[/term:double_threat] around [zone:future:windows:c5r3,c7r4]the two finishing squares your opponent can later aim at[/zone:future:windows:c5r3,c7r4].",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c5r3",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r4"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-23 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `32655` · played col 2 (display 3) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed to keep the more central defense alive. [zone:col4]Column 4[/zone:col4] lands on the stronger central square, which keeps your four-in-a-row chances more connected and makes your opponent work through a longer, narrower defense. [zone:col3]Column 3[/zone:col3] gives that central ground away faster, so the reply tree is looser and your opponent keeps more ways to press the attack; the later fork only matters after that central structure has already been surrendered, including [zone:future:windows:c5r4,c7r3]the two finishing squares they can aim at later[/zone:future:windows:c5r4,c7r3].",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r4",
  "c7r3"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "opponentPunishment.pliesToEnd",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have kept the central grip by playing the tougher [zone:col4]column 4[/zone:col4], which lands one step more resiliently in the opening. Your played [zone:col3]column 3[/zone:col3] gives up that central cover faster, so your opponent gets the cleaner path to build their four-in-a-row line and squeeze your defense more easily.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-24 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `32655` · played col 5 (display 6) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 2, 3, 5, 6, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have played the more [zone:col4]central column[/zone:col4] to keep your opening structure as sturdy as possible and make your opponent work harder through the middle. By choosing [zone:col6]the farther-right column[/zone:col6], you gave up central hold too quickly in a book line where the main fight is about [zone:col4]centrality[/zone:col4] and the long parity battle that follows.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "decision"
 ],
 "unsure_about": ""
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should keep the fight in the [zone:col4]more central column[/zone:col4] rather than drop to [zone:col6]the right-side column you chose[/zone:col6]. In this opening line, the central hold is the tougher defense: it keeps your shape more connected and makes your opponent work harder to break through and build their own four-in-a-row line.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.defense.id",
  "openingContext.defense.family",
  "openingContext.defense.matchedPrefixLen",
  "openingContext.defense.centralityGrounded",
  "gate.verdict",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-25 — win_to_lose — FAIL (render_bug)

Board: `3265533353` · played col 6 (display 7) · best col 5 (display 6) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r6 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c1r5."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have kept the book line and played the more central column 6, which preserves the stronger path through the opening. By going to column 7 instead, you left that line and gave your opponent the tougher side of the fight on the wrong edge, so their reply survives while your own winning line becomes too slow to hold.",
 "key_cells": [],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "I can tell this is an opening-line blunder and that the better move is the central book move, but the vector does not let me name a specific future finishing square for the win.",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the book line and play the more central move in column 6; that keeps your attack aligned with the opening and gives you the strongest chance to build the four-in-a-row line you were aiming for. By going to column 7 instead, you drifted off the opening path and gave up the tougher central fight, so your opponent gets the easier defense and you lose the winning line you had.",
 "key_cells": [
  "c6r4",
  "c7r2"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-26 — win_to_lose — FAIL (render_bug)

Board: `3265533353` · played col 2 (display 3) · best col 5 (display 6) · case `win_to_lose` · player 1 · opening

Link: `L6` (high) — "You had a forced win via c5r6 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c5r5."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep following the opening book: [zone:col6]column 6[/zone:col6] is the booked move here, while [zone:col3]column 3[/zone:col3] leaves the line and gives up the best defense. By staying with the book, you keep the long forced fight alive toward your [term:double_threat]double threat[/term:double_threat] on [zone:future:windows:c5r6,c7r3]the two finish squares[/zone:future:windows:c5r6,c7r3]; after the played move, your opponent gets to steer the game to their own late [term:double_threat]double threat[/term:double_threat] on [zone:future:c5r5]the square that matters later[/zone:future:c5r5].",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c5r5",
  "c5r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6",
  "c7r3"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.matchedPrefixLen",
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You left the book line in the opening: the better move keeps you on the [term:double_threat]two-way finish[/term:double_threat] tied to [zone:future:windows:c5r6,c7r3]the two squares you can finish on later[/zone:future:windows:c5r6,c7r3], while your played move lets your opponent answer and steer into [zone:future:c5r5]their later forcing square[/zone:future:c5r5]. In other words, you broke the opening rhythm and lost the parity fight that makes your win work; the book move keeps the pressure, your move gives it away.",
 "key_cells": [
  "c5r5",
  "c5r6",
  "c7r3"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-27 — win_to_draw — FAIL (prompt_confusion)

Board: `32655333535531` · played col 0 (display 1) · best col 1 (display 2) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep, via a parity battle via a parity line completing at c7r3. The played move let the opponent deny it at c7r3."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You should have kept the [zone:col2]book line[/zone:col2] alive with column 2; that move preserves the opening plan and the forced win that comes many plies later. By switching to [zone:col1]column 1[/zone:col1], you left the [zone:col2]opening line[/zone:col2] and let your opponent steer into the longer defensive path that only ends in a draw.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to stay on the book line: [zone:col2]column 2[/zone:col2] keeps the opening structure and the parity fight alive, while [zone:col1]column 1[/zone:col1] leaves that line and lets your opponent steer the rest of the game toward a draw instead of your forced win. The win is still deep — many plies away — so the lesson is to follow the opening and keep the built-in parity advantage, not to chase a local square.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.id",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": ""
}
```

### eval-28 — win_to_draw — FAIL (prompt_confusion)

Board: `32` · played col 2 (display 3) · best col 5 (display 6) · case `win_to_draw` · player 1 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep, via a parity battle via a parity line completing at c6r3. The played move let the opponent deny it at c7r4."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "Your played move gave up the deep parity fight and let your opponent keep the decisive diagonal alive. By playing column 6, you keep the toughest defense and steer the game through the [zone:future:windows:c4r1,c5r2,c6r3,c7r4]four-in-a-row line from c4r1 to c7r4[/zone:future:windows:c4r1,c5r2,c6r3,c7r4], with the key squares [zone:future:c6r3]c6r3[/zone:future:c6r3] and [zone:future:c7r4]c7r4[/zone:future:c7r4] still to be fought over later.",
 "key_cells": [
  "c4r1",
  "c5r2",
  "c6r3",
  "c7r4"
 ],
 "fields_relied_on": [
  "decision board, played move c3r2 vs better move c6r1",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.empties",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep the deep four-in-a-row line alive, because that line decides the game once the sequence reaches it. By playing column 3, you let your opponent take the reply that hits [zone:future:c7r4]the square that matters later[/zone:future:c7r4] and deny your [zone:future:windows:c4r1,c5r2,c6r3,c7r4]four-in-a-row line on the diagonal from c4r1 through c7r4[/zone:future:windows:c4r1,c5r2,c6r3,c7r4]; column 6 keeps that resource and gives you the tougher finish.",
 "key_cells": [
  "c4r1",
  "c5r2",
  "c6r3",
  "c7r4"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.entryCell",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.empties",
  "lostResource.parityAttribution.completingCell",
  "lostResource.anchorCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.entryCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-29 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `33343064336444661500146` · played col 2 (display 3) · best col 0 (display 1) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's threat to make four next move at c3r2 is coming no matter what you play here — your move didn't create it. Column 1 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You want the move that makes your opponent work hardest against their [term:immediate_threat]next-move four[/term:immediate_threat] at [zone:c3r2]c3r2[/zone:c3r2]; column 1 is the tougher defense because it keeps that pressure on the full [zone:windows:c2r1,c3r2,c4r3,c5r4]c2r1-c3r2-c4r3-c5r4 line[/zone:windows:c2r1,c3r2,c4r3,c5r4] without handing you a slower reply. Your played column speeds things up by giving your opponent an easier follow-up, so it is the weaker defense.",
 "key_cells": [
  "c2r1",
  "c3r2",
  "c4r3",
  "c5r4"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You want the move that makes your opponent work hardest against the [term:immediate_threat]next-move four[/term:immediate_threat] at [zone:c3r2]c3r2[/zone:c3r2], because that same threat is already tied to the [zone:windows:c2r1,c3r2,c4r3,c5r4]four-in-a-row line from c2r1 through c5r4[/zone:windows:c2r1,c3r2,c4r3,c5r4]. Column 1 is the tougher defense: it leaves your opponent fewer clean ways to press that attack, while the move you played gives them a cleaner follow-up and speeds up the finish.",
 "key_cells": [
  "c2r1",
  "c3r2",
  "c4r3",
  "c5r4"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-30 — lose_to_faster_lose — FAIL (render_bug)

Board: `333430223346405` · played col 4 (display 5) · best col 0 (display 1) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L7` (high) — "Column 1 is your most stubborn defense: it keeps a practical swindle alive — if your opponent slips within about 6 moves (watch columns 6), you can climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 1 is the toughest defense because it keeps your practical swindle alive and makes your opponent work longer before their attack lands. By contrast, column 5 gives them a much faster [term:double_threat]double threat[/term:double_threat] on [zone:future:c6r2]this square that matters later, once the forced sequence reaches it[/zone:future:c6r2], tied to [zone:future:windows:c6r2,c5r3,c4r4,c3r5]the four-in-a-row line that decides it later, once the forced sequence reaches it[/zone:future:windows:c6r2,c5r3,c4r4,c3r5].",
 "key_cells": [
  "c3r5",
  "c4r4",
  "c5r3",
  "c6r2"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "lostResource.entryCell",
  "lostResource.witness.devCol",
  "lostResource.witness.oppPlies",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.tacticTag",
  "opponentPunishment.tie.playedPlies",
  "opponentPunishment.tie.swindlePlies",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 1 is the toughest defense because it keeps your practical swindle alive and makes your opponent work for a clean finish. By playing column 5 instead, you let them convert a [term:double_threat]double threat[/term:double_threat] on [zone:future:c6r2]this single square that matters later, once the forced sequence reaches it — not a threat right now[/zone:future:c6r2], tied to [zone:future:windows:c6r2,c5r3,c4r4,c3r5]the whole four-in-a-row line that decides this later, once the forced sequence reaches it — not a threat right now[/zone:future:windows:c6r2,c5r3,c4r4,c3r5].",
 "key_cells": [
  "c3r5",
  "c4r4",
  "c5r3",
  "c6r2"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.pliesToEnd",
  "lostResource.entryCell",
  "lostResource.witness.devCol",
  "lostResource.witness.oppPlies",
  "lostResource.anchorCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.entryCell",
  "opponentPunishment.forkCells",
  "opponentPunishment.forkWindows",
  "opponentPunishment.tacticTag",
  "opponentPunishment.tie.playedPlies",
  "opponentPunishment.tie.swindlePlies",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-31 — win_to_lose — FAIL (prompt_confusion)

Board: `3333344446301011` · played col 2 (display 3) · best col 4 (display 5) · case `win_to_lose` · player 1 · mid-game

Link: `L9` (low) — "You had a parity/zugzwang win (resolves deep, via a parity battle); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through c4r3·c5r4·c6r5·c7r6."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should keep the fight on the [zone:future:windows:c4r3,c5r4,c6r5,c7r6]later four-in-a-row line[/zone:future:windows:c4r3,c5r4,c6r5,c7r6] instead of drifting into the move that lets your opponent use [zone:c6r2]their key finishing square[/zone:c6r2] on the next branch. The better column keeps your [zone:future:c6r5]later key square[/zone:future:c6r5] alive in the long parity battle, while the played move gives up that fight and lets the other side take control of the last important landing spots.",
 "key_cells": [
  "c4r3",
  "c5r4",
  "c6r2",
  "c6r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.register",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.parityAttribution.ownDiscs",
  "lostResource.parityAttribution.completingCell",
  "opponentPunishment.kind",
  "opponentPunishment.parityAttribution.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "I can identify the long line that mattered and the opponent's key finishing square, but the vector does not let me isolate a single crisp tactical square as the sole mistake; the loss comes from the parity fight over that line.",
 "confidence": "low"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played the tougher defense in column 5, because that keeps the late parity fight alive around [zone:future:windows:c4r3,c5r4,c6r5,c7r6]the four-in-a-row line running through c4r3, c5r4, c6r5, and c7r6[/zone:future:windows:c4r3,c5r4,c6r5,c7r6]. By playing column 3 instead, you gave up [zone:future:c6r5]c6r5[/zone:future:c6r5], and your opponent’s own [term:immediate_threat]next-move four[/term:immediate_threat] on [zone:c6r2]c6r2[/zone:c6r2] now decides the position for them.",
 "key_cells": [
  "c4r3",
  "c5r4",
  "c6r2",
  "c6r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.register",
  "lostResource.completingCell",
  "lostResource.parityAttribution.controllingGroup",
  "lostResource.anchorCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.tacticTag",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "low"
}
```

### eval-32 — draw_to_lose — FAIL (prompt_confusion)

Board: `33333444463010112215` · played col 4 (display 5) · best col 5 (display 6) · case `draw_to_lose` · player 1 · mid-game

Link: `L4` (high) — "The better move (col 6) occupies c6r2, blocking the opponent's threat on c7r1·c6r2·c5r3·c4r4; the played move skipped that defense."

```json
// run 0
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed to make the block at [zone:c6r2]c6r2[/zone:c6r2] because it sits on your opponent’s [zone:windows:c7r1,c6r2,c5r3,c4r4]four-in-a-row line from c7r1 through c4r4[/zone:windows:c7r1,c6r2,c5r3,c4r4]. By playing elsewhere, you left that threat open, so your opponent could take the finishing square next turn and turn the position against you; the block in column 6 is the tougher defense.",
 "key_cells": [
  "c4r4",
  "c5r3",
  "c6r2",
  "c7r1"
 ],
 "fields_relied_on": [
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.entryCell",
  "lostResource.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 6,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You had to take [zone:c6r2]the blocking square at c6r2[/zone:c6r2] to stop your opponent from making four on [zone:windows:c7r1,c6r2,c5r3,c4r4]the c7r1-c6r2-c5r3-c4r4 diagonal[/zone:windows:c7r1,c6r2,c5r3,c4r4]. By playing in column 5 instead, you let that direct win stay alive, so your opponent could answer by taking the threatened square and convert your position into a loss.",
 "key_cells": [
  "c4r4",
  "c5r3",
  "c6r2",
  "c7r1"
 ],
 "fields_relied_on": [
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.entryCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-33 — draw_to_lose — PASS

Board: `3333311115554535522024412246261666006` · played col 4 (display 5) · best col 0 (display 1) · case `draw_to_lose` · player 2 · closing

Link: `L2` (high) — "Your move let the opponent occupy c5r6, completing their threat to make four next move on c4r6·c5r6·c6r6·c7r6; the better move (col 1) denied it at c5r6."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "Your move let your opponent take [zone:c5r6]c5r6[/zone:c5r6], which gives them an immediate four-in-a-row threat on the top row. The better move was to play [zone:col1]column 1[/zone:col1] and keep the [zone:future:windows:c4r6,c5r6,c6r6,c7r6]four-in-a-row line that matters later[/zone:future:windows:c4r6,c5r6,c6r6,c7r6] under your control instead of handing over that square.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c4r6",
  "c5r6",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tag",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed to take [zone:col1]column 1[/zone:col1] to stop your opponent from taking [zone:c5r6]c5r6[/zone:c5r6], which is the square that lets them finish a four-in-a-row line on the top row. By playing [zone:col5]column 5[/zone:col5] instead, you handed them that square and let them claim [term:immediate_threat]a next-move threat[/term:immediate_threat] on [zone:future:windows:c4r6,c5r6,c6r6,c7r6]the four-in-a-row line across the top row[/zone:future:windows:c4r6,c5r6,c6r6,c7r6].",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-34 — win_to_draw — FAIL (prompt_confusion)

Board: `33333111155545355220244122462616660064` · played col 0 (display 1) · best col 4 (display 5) · case `win_to_draw` · player 1 · closing

Link: `L1` (high) — "The better move (col 5) completes your threat to make four next move at c5r6; the played move let the opponent take c5r6, denying it."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep [zone:c5r6]the square at c5r6[/zone:c5r6] because it also sits on [zone:windows:c4r6,c5r6,c6r6,c7r6]your four-in-a-row line across the top row[/zone:windows:c4r6,c5r6,c6r6,c7r6]. By playing column 1 instead, you let your opponent take that square and shut off your clean finish, so the best you can do from there is a draw instead of the win you had available.",
 "key_cells": [
  "c4r6",
  "c5r6",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "decision board",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.cells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You had to keep [term:immediate_threat]the threat to make four next move[/term:immediate_threat] on [zone:c5r6]c5r6[/zone:c5r6] alive. By playing elsewhere, you gave your opponent the chance to take that square and shut down your [zone:windows:c4r6,c5r6,c6r6,c7r6]four-in-a-row line[/zone:windows:c4r6,c5r6,c6r6,c7r6], so the move only held a draw instead of preserving the stronger win plan.",
 "key_cells": [
  "c4r6",
  "c5r6",
  "c6r6",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-35 — win_to_lose — FAIL (prompt_confusion)

Board: `33` · played col 2 (display 3) · best col 3 (display 4) · case `win_to_lose` · player 1 · opening

Link: `L9` (low) — "You had a parity/zugzwang win (resolves deep, via a parity battle); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through c2r5·c3r5·c4r5·c5r5."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to stay with the [zone:col4]central-column opening line[/zone:col4]; that move keeps your attack most compact and gives your opponent the hardest defense. By playing [zone:col3]the side-branch move[/zone:col3] instead, you stepped off the book path and let the position turn into a long parity fight that favors your opponent.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "decision.better move",
  "decision.played move",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.register",
  "lostResource.pliesToEnd",
  "opponentPunishment.register",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "I can tell the opening choice and the parity-based horizon mattered, but the vector does not let me isolate a single concrete finishing square for the deep resolution.",
 "confidence": "low"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to stay in the [zone:col4]central column move[/zone:col4], because that keeps the position aligned with the opening and gives you the toughest parity battle later. By dropping in [zone:col3]the side column instead[/zone:col3], you left that book line and gave your opponent the stronger long-term defense, so your attack no longer reaches the better central connection.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "decision",
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.register",
  "lostResource.pliesToEnd",
  "opponentPunishment.register",
  "opponentPunishment.pliesToEnd"
 ],
 "unsure_about": "The vector does not let me isolate a single present tactical square; the difference is about the opening line and the later parity fight, not an immediate threat.",
 "confidence": "low"
}
```

### eval-36 — draw_to_lose — FAIL (prompt_confusion)

Board: `33211333455011222` · played col 5 (display 6) · best col 2 (display 3) · case `draw_to_lose` · player 2 · mid-game

Link: `L8` (high) — "The position was a draw; the better move (col 3) holds it by occupying c1r4. The played move abandons it — the opponent now has a forced win (deep, via a parity battle, completing at c1r4)."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed to keep the defense on [zone:c1r4]c1r4[/zone:c1r4], because that square is the key block in your opponent’s [zone:windows:c4r1,c3r2,c2r3,c1r4]four-in-a-row line[/zone:windows:c4r1,c3r2,c2r3,c1r4]. By playing column 6 instead, you gave up that block and let your opponent keep a forced winning attack alive, while column 3 was the tougher hold that kept the game drawn.",
 "key_cells": [
  "c1r4",
  "c2r3",
  "c3r2",
  "c4r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.tacticTag",
  "opponentPunishment.completingCell",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed the move in [zone:c1r4]c1r4[/zone:c1r4] to keep your opponent from finishing [zone:windows:c4r1,c3r2,c2r3,c1r4]that four-in-a-row line[/zone:windows:c4r1,c3r2,c2r3,c1r4]. By playing elsewhere, you left that defense undone, and your opponent can force a win later from the same central threat.",
 "key_cells": [
  "c1r4",
  "c2r3",
  "c3r2",
  "c4r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tacticTag",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-37 — lose_to_faster_lose — PASS

Board: `3321133345501122252551125036666` · played col 0 (display 1) · best col 6 (display 7) · case `lose_to_faster_lose` · player 2 · closing

Link: `L3` (high) — "Your opponent's threat to make four next move at c1r4 is coming no matter what you play here — your move didn't create it. Column 7 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have played column 7 because it makes your opponent work hardest to reach [zone:c1r4]that threat square[/zone:c1r4]; the key danger is the [zone:windows:c4r1,c3r2,c2r3,c1r4]four-in-a-row line your opponent is aiming at[/zone:windows:c4r1,c3r2,c2r3,c1r4]. The move you played in column 1 gives them a cleaner route, so they get to that finish faster.",
 "key_cells": [
  "c1r4",
  "c2r3",
  "c3r2",
  "c4r1"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.entryCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed the tougher defense that leaves your opponent's [term:immediate_threat]next-move four[/term:immediate_threat] at [zone:c1r4]c1r4[/zone:c1r4] as hard to cash in as possible. Column 7 keeps that [zone:windows:c4r1,c3r2,c2r3,c1r4]four-in-a-row line[/zone:windows:c4r1,c3r2,c2r3,c1r4] under the most resistance; the move you played gives them the cleaner, faster finish.",
 "key_cells": [
  "c1r4",
  "c2r3",
  "c3r2",
  "c4r1"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-38 — draw_to_lose — FAIL (prompt_confusion)

Board: `2` · played col 1 (display 2) · best col 2 (display 3) · case `draw_to_lose` · player 2 · opening

Link: `L8` (high) — "The position was a draw; the better move (col 3) holds it by occupying c4r3. The played move abandons it — the opponent now has a forced win (deep, via a parity battle, completing at c4r3)."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "In the opening, you should have kept the more [zone:col3]central column 3[/zone:col3] so you keep more four-in-a-row lines alive and make your position harder to break. By choosing [zone:col2]column 2[/zone:col2] instead, you gave up some central reach and a tougher holding shape, so your opponent had an easier path to keep the game going in their favor.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "case",
  "opponentPunishment.pliesToEnd"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed the more [zone:col3]central column[/zone:col3] to keep more four-in-a-row lines alive and make your defense harder to break. By playing [zone:col2]the side column you chose[/zone:col2], you gave up that extra reach and left your position easier for your opponent to press; the central reply keeps the game more balanced and is the tougher book move here.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-39 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `2152254` · played col 4 (display 5) · best col 3 (display 4) · case `lose_to_faster_lose` · player 2 · opening

Link: `L4` (high) — "The better move (col 4) occupies c4r1, blocking the opponent's threat on c3r1·c4r1·c5r1·c6r1; the played move skipped that defense."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You had to take [zone:c4r1]c4r1[/zone:c4r1] to stop your opponent's [term:immediate_threat]next-move four[/term:immediate_threat] on [zone:windows:c3r1,c4r1,c5r1,c6r1]the c3r1-c4r1-c5r1-c6r1 line[/zone:windows:c3r1,c4r1,c5r1,c6r1]. By playing c5 instead, you left that block open and only made your own c4r2 threat, which comes too late to matter.",
 "key_cells": [
  "c3r1",
  "c4r1",
  "c5r1",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed the block at [zone:c4r1]c4r1[/zone:c4r1] because it stops your opponent's [term:immediate_threat]threat to make four next move[/term:immediate_threat] on [zone:windows:c3r1,c4r1,c5r1,c6r1]the row of four from c3r1 through c6r1[/zone:windows:c3r1,c4r1,c5r1,c6r1]. By playing in column 5 instead, you left that line open, so your opponent can still win immediately and your extra [zone:c4r2]c4r2[/zone:c4r2] idea does not matter in time.",
 "key_cells": [
  "c3r1",
  "c4r1",
  "c4r2",
  "c5r1",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-40 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `35201` · played col 2 (display 3) · best col 4 (display 5) · case `lose_to_faster_lose` · player 2 · opening

Link: `L4` (high) — "The better move (col 5) occupies c5r1, blocking the opponent's threat on c2r1·c3r1·c4r1·c5r1; the played move skipped that defense."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed to take the blocking square at [zone:c5r1]c5r1[/zone:c5r1] to stop your opponent's [term:immediate_threat]next-move four[/term:immediate_threat] on [zone:windows:c2r1,c3r1,c4r1,c5r1]the bottom-row line from c2 to c5[/zone:windows:c2r1,c3r1,c4r1,c5r1]. By playing column 3 instead, you left that four-in-a-row line open, so your opponent still got the same immediate finish.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "decision board",
  "decision.Tactics",
  "afterBest board",
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed to play [zone:col5]column 5[/zone:col5] to take away [term:immediate_threat]your opponent's next-move four[/term:immediate_threat] on [zone:c5r1]c5r1[/zone:c5r1], which sits on [zone:windows:c2r1,c3r1,c4r1,c5r1]the bottom-row line from c2 to c5[/zone:windows:c2r1,c3r1,c4r1,c5r1]. By playing [zone:col3]column 3[/zone:col3], you left that block open and let your opponent keep the threat alive.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "lostResource.completingCell",
  "lostResource.window",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-41 — win_to_lose — FAIL (prompt_confusion)

Board: `234515355111101433` · played col 6 (display 7) · best col 4 (display 5) · case `win_to_lose` · player 1 · mid-game

Link: `L1` (high) — "The better move (col 5) completes your threat to make four next move at c5r3; the played move let the opponent take c5r3, denying it."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep [zone:c5r3]c5r3[/zone:c5r3] alive, because that move also holds the [zone:windows:c3r1,c4r2,c5r3,c6r4]four-in-a-row line running through c3r1, c4r2, c5r3, and c6r4[/zone:windows:c3r1,c4r2,c5r3,c6r4]. By playing elsewhere, you let your opponent take that square and shut off your threat, while the better move was the toughest defense because it preserved your next-move four and forced them to answer it.",
 "key_cells": [
  "c3r1",
  "c4r2",
  "c5r3",
  "c6r4"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You had to keep [term:immediate_threat]the next-move four-in-a-row threat[/term:immediate_threat] at [zone:c5r3]c5r3[/zone:c5r3] alive on [zone:windows:c3r1,c4r2,c5r3,c6r4]your four-in-a-row line[/zone:windows:c3r1,c4r2,c5r3,c6r4]. By playing column 7 instead, you let your opponent take c5r3 and remove that winning threat, so your strongest chance disappeared.",
 "key_cells": [
  "c3r1",
  "c4r2",
  "c5r3",
  "c6r4"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-42 — lose_to_faster_lose — FAIL (render_bug)

Board: `3113302513454460055` · played col 3 (display 4) · best col 0 (display 1) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's 7-shaped double threat at c3r2 is coming no matter what you play here — your move didn't create it. Column 1 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You want the toughest defense: [zone:col1]column 1[/zone:col1] keeps the pressure pointed at [zone:c3r2]c3r2[/zone:c3r2], where your opponent already has the forcing fork. [zone:col4]Column 4[/zone:col4] lands on the same shared support and gives them an easier finish, while your own [zone:windows:c4r1,c3r2,c2r3,c1r4]four-in-a-row line[/zone:windows:c4r1,c3r2,c2r3,c1r4] never has time to matter.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c2r3",
  "c3r2",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "decision",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 1 is the tougher defense because it meets your opponent’s [zone:c3r2]key square[/zone:c3r2] in the most resistant way while keeping your [zone:windows:c4r1,c3r2,c2r3,c1r4]four-in-a-row line[/zone:windows:c4r1,c3r2,c2r3,c1r4] as intact as possible. The move you played instead gives up that resistance sooner, so your opponent reaches the same forcing idea with less work.",
 "key_cells": [
  "c1r4",
  "c2r3",
  "c3r2",
  "c4r1"
 ],
 "fields_relied_on": [
  "decision board",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-43 — lose_to_faster_lose — FAIL (render_bug)

Board: `434211221126040100420` · played col 5 (display 6) · best col 0 (display 1) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's double threat (two winning squares at once) at c4r3 is coming no matter what you play here — your move didn't create it. Column 1 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed the toughest defense against your opponent’s [zone:c4r3]threat on c4r3[/zone:c4r3] and the [zone:windows:c2r1,c3r2,c4r3,c5r4]four-in-a-row line running c2r1-c3r2-c4r3-c5r4[/zone:windows:c2r1,c3r2,c4r3,c5r4]. [zone:col1]Column 1[/zone:col1] leaves them the least room to finish that attack, while [zone:col6]column 6[/zone:col6] gives them an easier path to press it.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c2r1",
  "c3r2",
  "c4r3",
  "c5r4",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tag",
  "opponentPunishment.completingCell",
  "opponentPunishment.windows",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 1 is the toughest defense because it keeps your opponent's two-way threat at [zone:c4r3]c4r3[/zone:c4r3] tied to the [zone:windows:c2r1,c3r2,c4r3,c5r4]four-in-a-row line running c2r1-c3r2-c4r3-c5r4[/zone:windows:c2r1,c3r2,c4r3,c5r4] while making them work harder to cash it in. Column 6 lets that pressure resolve more cleanly and gives them the easier finish.",
 "key_cells": [
  "c2r1",
  "c3r2",
  "c4r3",
  "c5r4"
 ],
 "fields_relied_on": [
  "decision",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-44 — draw_to_lose — FAIL (prompt_confusion)

Board: `443` · played col 1 (display 2) · best col 2 (display 3) · case `draw_to_lose` · player 2 · opening

Link: `L2` (high) — "Your move let the opponent occupy c3r1, completing their double threat (two winning squares at once) on c3r1·c4r1·c5r1·c6r1; the better move (col 3) denied it at c3r1."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "In the opening, [zone:col3]column 3[/zone:col3] is the tougher central choice because it keeps more four-in-a-row lines alive for you than [zone:col2]column 2[/zone:col2]. By playing the less central move, you gave your opponent the key line through c3r1 to c6r1, so they can build the pressure they need while you have fewer ways to answer.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "boardState",
  "player",
  "opponent",
  "case",
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You should have played the more central column 3 move to keep more four-in-a-row lines alive; that is the tougher book move and it keeps your next threats more flexible. By playing column 2 instead, you gave up [zone:col2]the move that lets your opponent answer most cleanly[/zone:col2] and handed them [zone:col3]the stronger central hold[/zone:col3] on the board, so their side can force the better result from there.",
 "key_cells": [
  "c2r1",
  "c2r2",
  "c2r3",
  "c2r4",
  "c2r5",
  "c2r6",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6"
 ],
 "fields_relied_on": [
  "case",
  "openingContext.centrality.betterHasMoreLines",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-45 — draw_to_lose — FAIL (render_bug)

Board: `22142430221041333001166044` · played col 3 (display 4) · best col 0 (display 1) · case `draw_to_lose` · player 1 · mid-game

Link: `L2` (high) — "Your move let the opponent occupy c4r6, completing their threat to make four next move on c1r3·c2r4·c3r5·c4r6; the better move (col 1) denied it at c4r6."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You should have played the block on [zone:c4r6]the square that stops your opponent’s four-in-a-row line[/zone:c4r6], because your move on [zone:col4]column 4[/zone:col4] let them take [zone:c4r6]c4r6[/zone:c4r6] and finish that line from [zone:windows:c1r3,c2r4,c3r5,c4r6]c1r3 through c4r6[/zone:windows:c1r3,c2r4,c3r5,c4r6] next turn. [zone:col1]Column 1[/zone:col1] was the tougher defense because it kept that threat from landing there and held the game to a draw instead of giving up the win.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c2r4",
  "c3r5",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tag",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "By playing column 4, you left [zone:c4r6]the opponent’s finishing square at c4r6[/zone:c4r6] open, so they could complete [zone:windows:c1r3,c2r4,c3r5,c4r6]the four-in-a-row running c1r3-c2r4-c3r5-c4r6[/zone:windows:c1r3,c2r4,c3r5,c4r6] on the very next move. Column 1 is the tougher defense because it takes that square away and stops that immediate threat.",
 "key_cells": [
  "c1r3",
  "c2r4",
  "c3r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "decision.board",
  "decision.tactics",
  "afterPlayed.board",
  "afterPlayed.tactics",
  "projectedDeep.board",
  "projectedDeep.tactics",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-46 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `2444242213536034432362` · played col 0 (display 1) · best col 6 (display 7) · case `lose_to_faster_lose` · player 1 · mid-game

Link: `L3` (high) — "Your opponent's 7-shaped double threat at c6r3 is coming no matter what you play here — your move didn't create it. Column 7 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 7,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your opponent already has the strong two-way finish lurking at [zone:c6r3]c6r3[/zone:c6r3], tied to [zone:windows:c6r3,c5r4,c4r5,c3r6]the four-in-a-row line they are building there[/zone:windows:c6r3,c5r4,c4r5,c3r6]. Playing in column 7 is the toughest defense because it keeps their finish as hard to realize as possible; column 1 gives them a cleaner, quicker route to it.",
 "key_cells": [
  "c3r6",
  "c4r5",
  "c5r4",
  "c6r3"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 7,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your opponent already has a [term:double_threat]double threat[/term:double_threat] building around [zone:windows:c2r4,c6r3]c2r4[/zone:windows:c2r4,c6r3], and the key finish is the four-in-a-row [zone:windows:c6r3,c5r4,c4r5,c3r6]line[/zone:windows:c6r3,c5r4,c4r5,c3r6] that runs through [zone:c6r3]c2r4[/zone:c6r3]. Column 7 is the tougher defense because it leaves them with only one clean way to press the attack, while column 1 gives them a more comfortable finish.",
 "key_cells": [
  "c2r4",
  "c3r6",
  "c4r5",
  "c5r4",
  "c6r3"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-47 — win_to_draw — FAIL (render_bug)

Board: `3321153130453320125221100544` · played col 2 (display 3) · best col 4 (display 5) · case `win_to_draw` · player 1 · mid-game

Link: `L1` (high) — "The better move (col 5) completes your double threat (two winning squares at once) at c3r6; the played move let the opponent take c5r4, denying it."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You should have played [zone:col5]column 5[/zone:col5], because that keeps your [term:double_threat]double threat[/term:double_threat] alive and preserves [zone:windows:c6r3,c5r4,c4r5,c3r6]the four-in-a-row line you were building[/zone:windows:c6r3,c5r4,c4r5,c3r6]. Instead, [zone:col3]column 3[/zone:col3] gave your opponent the chance to take [zone:c3r6]the square that makes four next move[/zone:c3r6], so your attack dropped from a win to only a draw.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r5",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c6r3"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep [term:double_threat]your double threat[/term:double_threat] alive by playing [zone:c3r6]the square at c3r6[/zone:c3r6], because that also protects [zone:windows:c6r3,c5r4,c4r5,c3r6]the four-in-a-row line running through c6r3, c5r4, c4r5, and c3r6[/zone:windows:c6r3,c5r4,c4r5,c3r6]. By playing column 3 instead, you let your opponent answer with [zone:c5r4]the square at c5r4[/zone:c5r4], which takes away that fork and turns your best result into only a draw.",
 "key_cells": [
  "c3r6",
  "c4r5",
  "c5r4",
  "c6r3"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-48 — win_to_lose — FAIL (prompt_confusion)

Board: `3323` · played col 3 (display 4) · best col 1 (display 2) · case `win_to_lose` · player 1 · opening

Link: `L1` (high) — "The better move (col 2) completes your double threat (two winning squares at once) at c1r1; the played move let the opponent take c2r1, denying it."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep your [term:double_threat]double threat[/term:double_threat] alive on [zone:windows:c1r1,c5r1]the fork square that gives you two winning finishes[/zone:windows:c1r1,c5r1]. By playing column 4, you let your opponent take [zone:c2r1]the blocking square that stops your four-in-a-row line[/zone:c2r1], so you gave up [zone:windows:c1r1,c2r1,c3r1,c4r1]the row of four you were building[/zone:windows:c1r1,c2r1,c3r1,c4r1] and the winning follow-up with it. Column 2 is the tougher defense because it preserves your threat and forces your opponent to answer instead.",
 "key_cells": [
  "c1r1",
  "c2r1",
  "c3r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep your [term:double_threat]double threat[/term:double_threat] alive by taking the move that lets you keep pressure on [zone:c1r1]the square where you can make four next move[/zone:c1r1] and the matching [zone:windows:c1r1,c2r1,c3r1,c4r1]four-in-a-row line you are playing for[/zone:windows:c1r1,c2r1,c3r1,c4r1]. By playing elsewhere, you let your opponent take [zone:c2r1]the square that completes your own line[/zone:c2r1], and that takes away your winning follow-up.",
 "key_cells": [
  "c1r1",
  "c2r1",
  "c3r1",
  "c4r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-49 — win_to_draw — FAIL (render_bug)

Board: `334553333255262` · played col 6 (display 7) · best col 2 (display 3) · case `win_to_draw` · player 2 · mid-game

Link: `L1` (high) — "The better move (col 3) completes your 7-shaped double threat at c5r2; the played move let the opponent take c3r4, denying it."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You should have played [zone:col3]column 3[/zone:col3] to keep [zone:c5r2]the square at c5r2 that makes four next move[/zone:c5r2] alive on [zone:windows:c6r1,c5r2,c4r3,c3r4]your four-in-a-row line[/zone:windows:c6r1,c5r2,c4r3,c3r4]. By playing [zone:col7]column 7[/zone:col7], you let your opponent take [zone:c3r4]c3r4[/zone:c3r4] and remove that threat, so your strongest attack turned into only a draw.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r3",
  "c5r2",
  "c6r1",
  "c7r1",
  "c7r2",
  "c7r3",
  "c7r4",
  "c7r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "decision.better_move",
  "decision.played_move",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You should have played the move that kept your [term:immediate_threat]threat to make four next move[/term:immediate_threat] alive on [zone:c5r2]c5r2[/zone:c5r2], which also preserved your [zone:windows:c6r1,c5r2,c4r3,c3r4]four-in-a-row line[/zone:windows:c6r1,c5r2,c4r3,c3r4] running through c6r1, c5r2, c4r3, and c3r4. By playing column 7 instead, you let your opponent take [zone:c3r4]c3r4[/zone:c3r4] and knock out that winning pattern, so the best you could do was a draw.",
 "key_cells": [
  "c3r4",
  "c4r3",
  "c5r2",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### eval-50 — win_to_draw — FAIL (prompt_confusion)

Board: `33455333325526266` · played col 0 (display 1) · best col 2 (display 3) · case `win_to_draw` · player 2 · mid-game

Link: `L1` (high) — "The better move (col 3) completes your 7-shaped double threat at c5r2; the played move let the opponent take c3r4, denying it."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep [zone:c5r2]the square at c5r2 where you can make four next move[/zone:c5r2] alive, because it supports [zone:windows:c6r1,c5r2,c4r3,c3r4]your four-in-a-row line[/zone:windows:c6r1,c5r2,c4r3,c3r4]. By playing column 1, you let your opponent take [zone:c3r4]c3r4[/zone:c3r4] and cut off that plan, so you only held on to a draw instead of the winning attack.",
 "key_cells": [
  "c3r4",
  "c4r3",
  "c5r2",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.windows",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep your [term:immediate_threat]threat to make four next move[/term:immediate_threat] alive on [zone:c5r2]c5r2[/zone:c5r2]. By playing column 1, you let your opponent take [zone:c3r4]c3r4[/zone:c3r4] and break the [zone:windows:c6r1,c5r2,c4r3,c3r4]four-in-a-row line you were building[/zone:windows:c6r1,c5r2,c4r3,c3r4], so your best result drops from a win to a draw.",
 "key_cells": [
  "c3r4",
  "c4r3",
  "c5r2",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L1-completes-your-tactic — win_to_lose — FAIL (render_bug)

Board: `3343` · played col 3 (display 4) · best col 2 (display 3) · case `win_to_lose` · player 1 · opening

Link: `L1` (high) — "The better move (col 3) completes your double threat (two winning squares at once) at c2r1; the played move let the opponent take c3r1, denying it."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You had to keep [term:double_threat]a double threat[/term:double_threat] alive on [zone:windows:c2r1,c6r1]the fork square[/zone:windows:c2r1,c6r1] by playing [zone:col3]column 3[/zone:col3]. That move preserves your [zone:windows:c2r1,c3r1,c4r1,c5r1]four-in-a-row line[/zone:windows:c2r1,c3r1,c4r1,c5r1] and forces your opponent to answer both of your winning chances; after [zone:col4]column 4[/zone:col4], they can take [zone:c3r1]the key square[/zone:c3r1] and shut that idea down.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.windows",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.cell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played the move that kept your [term:double_threat]double threat[/term:double_threat] alive on [zone:windows:c2r1,c6r1]the fork square[/zone:windows:c2r1,c6r1], because that set up two winning follow-ups your opponent could not cover at once. By playing [zone:col4]column 4[/zone:col4] instead, you let your opponent grab [zone:c3r1]the square that finished their line[/zone:c3r1] and take away your [zone:windows:c2r1,c3r1,c4r1,c5r1]four-in-a-row line[/zone:windows:c2r1,c3r1,c4r1,c5r1].",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c6r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tag",
  "lostResource.cells",
  "lostResource.window",
  "lostResource.completingCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L2-enabled-opponent — win_to_lose — FAIL (render_bug)

Board: `334` · played col 3 (display 4) · best col 2 (display 3) · case `win_to_lose` · player 2 · opening

Link: `L2` (high) — "Your move let the opponent occupy c2r1, completing their double threat (two winning squares at once) on c2r1·c3r1·c4r1·c5r1; the better move (col 3) denied it at c3r1."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "By playing column 4, you let your opponent take [zone:c2r1]c2r1[/zone:c2r1] and build a double threat across the bottom. The tougher defense was column 3, which kept [zone:c3r1]c3r1[/zone:c3r1] as your key block and preserved [zone:windows:c2r1,c3r1,c4r1,c5r1]the four-in-a-row line from c2 to c5[/zone:windows:c2r1,c3r1,c4r1,c5r1] for you instead of handing them the fork.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "decision",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.windows",
  "opponentPunishment.tie.sharedCells",
  "lostResource.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have played [zone:col3]column 3[/zone:col3] to take away [zone:c3r1]c3r1[/zone:c3r1] and keep [zone:windows:c2r1,c3r1,c4r1,c5r1]your four-in-a-row line on c2r1-c5r1[/zone:windows:c2r1,c3r1,c4r1,c5r1] from being turned against you. By playing [zone:col4]column 4[/zone:col4], you left [zone:c2r1]c2r1[/zone:c2r1] open, so your opponent could claim the shared spot and set up the winning fork on the bottom row.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L3-no-causation — lose_to_faster_lose — FAIL (render_bug)

Board: `32556442454451212` · played col 5 (display 6) · best col 1 (display 2) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's 7-shaped double threat at c4r3 is coming no matter what you play here — your move didn't create it. Column 2 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 2 is the toughest defense because it keeps the pressure on the [zone:windows:c6r1,c5r2,c4r3,c3r4]four-in-a-row line your opponent is building[/zone:windows:c6r1,c5r2,c4r3,c3r4] and gives you the most resistance against the [zone:c4r3]square at c4r3[/zone:c4r3] that finishes it. Your move in column 6 lets that same threat become easier to cash in, so it gives your opponent a quicker finish instead of making them work for it.",
 "key_cells": [
  "c3r4",
  "c4r3",
  "c5r2",
  "c6r1"
 ],
 "fields_relied_on": [
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.entryCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You should have played column 2, because that is the toughest defense: it forces your opponent to work much harder before their [zone:c4r3]finishing square[/zone:c4r3] and the [zone:windows:c6r1,c5r2,c4r3,c3r4]four-in-a-row line they are aiming for[/zone:windows:c6r1,c5r2,c4r3,c3r4] can matter. Your played column 6 gives them a cleaner path and leaves them with more ways to keep the pressure going.",
 "key_cells": [
  "c3r4",
  "c4r3",
  "c5r2",
  "c6r1"
 ],
 "fields_relied_on": [
  "opponentPunishment.tag",
  "opponentPunishment.owner",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.entryCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.devCol",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L4-missed-defense — draw_to_lose — FAIL (prompt_confusion)

Board: `42224253264` · played col 3 (display 4) · best col 4 (display 5) · case `draw_to_lose` · player 2 · opening

Link: `L4` (high) — "The better move (col 5) occupies c5r4, blocking the opponent's threat on c5r1·c5r2·c5r3·c5r4; the played move skipped that defense."

```json
// run 0
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You had to take [zone:c5r4]that one square[/zone:c5r4] to stop [term:immediate_threat]your opponent's immediate threat[/term:immediate_threat] on [zone:windows:c5r1,c5r2,c5r3,c5r4]the four-in-a-row line running through column 5[/zone:windows:c5r1,c5r2,c5r3,c5r4]. By playing column 4 instead, you skipped the block and left that line open, so your opponent can finish there next turn.",
 "key_cells": [
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4"
 ],
 "fields_relied_on": [
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 5,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You needed to play [zone:col5]column 5[/zone:col5] to make the block on [zone:c5r4]c5r4[/zone:c5r4], which is the square that would finish your opponent's [zone:windows:c5r1,c5r2,c5r3,c5r4]four-in-a-row line down column 5[/zone:windows:c5r1,c5r2,c5r3,c5r4]. By playing [zone:col4]column 4[/zone:col4] instead, you left that threat alive and your opponent could take it next move.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "opponentPunishment.entryCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L5-deep-fork — win_to_draw — FAIL (prompt_confusion)

Board: `422242532` · played col 6 (display 7) · best col 0 (display 1) · case `win_to_draw` · player 2 · opening

Link: `L5` (high) — "You had a forced win — it resolves deep on a forced line via a fork completing at c4r3. The played move let the opponent deny it at c6r5."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You needed to keep the [term:double_threat]double threat[/term:double_threat] alive by playing the [zone:future:c4r3]fork square that still matters later[/zone:future:c4r3]; that move preserves [zone:future:windows:c4r3,c5r4,c6r5,c7r6]the four-in-a-row line that decides the fight[/zone:future:windows:c4r3,c5r4,c6r5,c7r6] once the forced sequence reaches it. By playing column 7 instead, you gave your opponent the chance to hit [zone:future:c6r5]the later blocking square[/zone:future:c6r5] and stop the fork, so your best line only held a draw.",
 "key_cells": [
  "c4r3",
  "c5r4",
  "c6r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.entryCell",
  "lostResource.pliesToEnd",
  "opponentPunishment.completingCell",
  "opponentPunishment.entryCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "draw",
 "best_outcome": "win",
 "mechanism": "You should have kept the pressure on with the move that creates [term:double_threat]a double threat[/term:double_threat] at [zone:future:c4r3]c4r3[/zone:future:c4r3], because that forces your opponent to answer one of two winning chances. By playing elsewhere, you let them meet your plan with [zone:future:c6r5]c6r5[/zone:future:c6r5] and take away the [zone:future:windows:c4r3,c5r4,c6r5,c7r6]four-in-a-row line through c4r3-c5r4-c6r5-c7r6[/zone:future:windows:c4r3,c5r4,c6r5,c7r6] that should decide the game.",
 "key_cells": [
  "c4r3",
  "c5r4",
  "c6r5",
  "c7r6"
 ],
 "fields_relied_on": [
  "decision",
  "afterBest",
  "projectedDeep",
  "lostResource.completingCell",
  "lostResource.forkCells",
  "lostResource.forkWindows",
  "lostResource.tacticTag",
  "lostResource.entryCell",
  "opponentPunishment.completingCell",
  "opponentPunishment.entryCell",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L6-lost-win-and-gave-one — win_to_lose — FAIL (prompt_confusion)

Board: `422242532643343015330451665102` · played col 0 (display 1) · best col 1 (display 2) · case `win_to_lose` · player 1 · closing

Link: `L6` (high) — "You had a forced win via c2r5 (deep on a forced line); the played move gives it up AND lets the opponent force their own win via c2r6."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to keep [zone:future:c2r5]this later fork square[/zone:future:c2r5] alive because it leads to your [zone:future:windows:c1r5,c2r5,c3r5,c4r5]row of four[/zone:future:windows:c1r5,c2r5,c3r5,c4r5] on the forced line. By playing column 1 instead, you gave up that line and also let your opponent grab their own four-in-a-row threat on the top row, so they can force their win while you no longer have the stronger reply.",
 "key_cells": [
  "c1r5",
  "c2r5",
  "c3r5",
  "c4r5"
 ],
 "fields_relied_on": [
  "decision",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.tacticTag",
  "lostResource.forkCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have kept the fight on the central line at [zone:c2r6]c2r6[/zone:c2r6] and the later [zone:future:windows:c1r5,c2r5,c3r5,c4r5]row of four across c1 to c4 on row 5[/zone:future:windows:c1r5,c2r5,c3r5,c4r5]: that is the hard line you were threatening. By playing column 1, you let your opponent answer on [zone:future:c2r5]c2r5[/zone:future:c2r5], so they keep their own chance to force a win while your best defense disappears.",
 "key_cells": [
  "c1r5",
  "c2r5",
  "c2r6",
  "c3r5",
  "c4r5"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "lostResource.forkCells",
  "lostResource.tacticTag",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "opponentPunishment.parityAttribution.controllingGroup",
  "opponentPunishment.parityAttribution.ownDiscs",
  "opponentPunishment.parityAttribution.empties",
  "opponentPunishment.parityAttribution.completingCell",
  "opponentPunishment.tacticTag",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L7-practical-swindle — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `424424244263` · played col 5 (display 6) · best col 3 (display 4) · case `lose_to_faster_lose` · player 1 · opening

Link: `L7` (high) — "Column 4 is your most stubborn defense: it keeps a practical swindle alive — one slip by your opponent (watch columns 1, 3, 7) could let you climb back in. The move you played gives that up and lets your opponent finish faster."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You needed the tougher defense in column 4 because it keeps your [term:double_threat]double threat[/term:double_threat] alive on [zone:future:c2r3]the square that matters later once the forcing line reaches it[/zone:future:c2r3]. By playing column 6, you gave up that resistance and let your opponent's reply line come faster, so they can finish before your [zone:future:windows:c1r3,c2r3,c3r3,c4r3]your four-in-a-row line that would decide the later swindle[/zone:future:windows:c1r3,c2r3,c3r3,c4r3] ever gets a chance to matter.",
 "key_cells": [
  "c1r3",
  "c2r3",
  "c3r3",
  "c4r3"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.tacticTag",
  "lostResource.completingCell",
  "lostResource.window",
  "lostResource.pliesToEnd",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your move in column 4 keeps the toughest defense alive because it preserves [term:double_threat]a double threat[/term:double_threat] on [zone:future:c2r3]the key square that matters later[/zone:future:c2r3], so your opponent still has to respect the central fight and cannot cash in immediately. By playing column 6, you let them answer more cleanly and remove the pressure on [zone:future:windows:c1r3,c2r3,c3r3,c4r3]the four-in-a-row line that later decides the position[/zone:future:windows:c1r3,c2r3,c3r3,c4r3], which is why the opponent finishes faster.",
 "key_cells": [
  "c1r3",
  "c2r3",
  "c3r3",
  "c4r3"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.tacticTag",
  "lostResource.forkCells",
  "opponentPunishment.completingCell",
  "opponentPunishment.tacticTag",
  "opponentPunishment.parityAttribution.controllingGroup",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L8-draw-abandoned — draw_to_lose — FAIL (prompt_confusion)

Board: `422242` · played col 5 (display 6) · best col 3 (display 4) · case `draw_to_lose` · player 1 · opening

Link: `L8` (high) — "The position was a draw; the better move (col 4) holds it by occupying c4r4. The played move abandons it — the opponent now has a forced win (deep, via a parity battle, completing at c4r4)."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You should keep the fight in the center: [zone:col4]column 4[/zone:col4] keeps more four-in-a-row lines alive than [zone:col6]column 6[/zone:col6], so it preserves the tougher defense and makes your opponent work harder. By playing wider, you gave up some central connection and let your opponent hold the position more comfortably.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "case",
  "openingContext.centrality.betterHasMoreLines",
  "openingContext.centrality.resistAndWait",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You should keep the fight in the center: [zone:col4]column 4[/zone:col4] preserves more four-in-a-row lines and gives you the toughest defense, while [zone:col6]column 6[/zone:col6] gives up some of that central reach. In this opening line, the choice is about centrality and parity over many moves, so the better move keeps more replies available and steers the game toward a draw instead of letting your opponent finish the long battle better.",
 "key_cells": [
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "openingContext.centrality.betterHasMoreLines",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "case"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-L9-hedged-parity — win_to_lose — FAIL (prompt_confusion)

Board: `33` · played col 2 (display 3) · best col 3 (display 4) · case `win_to_lose` · player 1 · opening

Link: `L9` (low) — "You had a parity/zugzwang win (resolves deep, via a parity battle); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through c2r5·c3r5·c4r5·c5r5."

```json
// run 0
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You needed to stay with the [zone:col4]central-column opening[/zone:col4] and keep the [zone:col3]other column[/zone:col3] from handing the initiative away. The better move keeps your shape in the middle and makes the long fight for the diagonal/parity line much harder for your opponent; the played move leaves that plan and gives them the stronger central response.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.register",
  "lostResource.pliesToEnd",
  "opponentPunishment.register",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "low"
}
```

```json
// run 1
{
 "better_move": 4,
 "played_outcome": "loss",
 "best_outcome": "win",
 "mechanism": "You should have stayed with the [zone:col4]central-column move[/zone:col4]; that keeps the position aligned with the opening plan and the tough central race. By playing [zone:col3]the side move you chose[/zone:col3], you left that plan and gave up the better parity fight, so the opponent’s reply became easier to steer to the finish.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c4r2",
  "c4r3",
  "c4r4",
  "c4r5",
  "c4r6"
 ],
 "fields_relied_on": [
  "openingContext.namedOpening.family",
  "openingContext.namedOpening.matchedPrefixLen",
  "lostResource.register",
  "lostResource.pliesToEnd",
  "opponentPunishment.register",
  "opponentPunishment.pliesToEnd",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "low"
}
```

### pin-branch-invariance-false — draw_to_lose — FAIL (render_bug)

Board: `44443` · played col 3 (display 4) · best col 2 (display 3) · case `draw_to_lose` · player 2 · opening

Link: `L2` (high) — "Your move let the opponent occupy c2r1, completing their double threat (two winning squares at once) on c2r1·c3r1·c4r1·c5r1; the better move (col 3) denied it at c3r1."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "You should have played the tougher defense in column 3, because that denies your opponent the square they need to start the four-in-a-row line running across the bottom. By playing column 4 instead, you let them take [zone:c2r1]c2r1[/zone:c2r1] and create a [zone:c3r1]your own saving square on c3r1[/zone:c3r1] is no longer enough to matter.",
 "key_cells": [
  "c2r1",
  "c3r1"
 ],
 "fields_relied_on": [
  "decision",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.cells",
  "opponentPunishment.tie.sharedCells",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "draw",
 "mechanism": "Your played move let your opponent take the square at [zone:c2r1]c2r1[/zone:c2r1], which opens their double threat and gives them two ways to keep the attack going. The better move was to play [zone:col3]column 3[/zone:col3], which claims [zone:c3r1]c3r1[/zone:c3r1] and keeps your [zone:windows:c2r1,c3r1,c4r1,c5r1]four-in-a-row line from c2 to c5[/zone:windows:c2r1,c3r1,c4r1,c5r1] from being handed over.",
 "key_cells": [
  "c2r1",
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r1",
  "c5r1"
 ],
 "fields_relied_on": [
  "case",
  "lostResource.completingCell",
  "lostResource.window",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "opponentPunishment.cells",
  "opponentPunishment.tie.sharedCells"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-branch-invariance-true-1 — lose_to_faster_lose — PASS

Board: `3152332536215522346266536` · played col 4 (display 5) · best col 0 (display 1) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's 7-shaped double threat at c5r4 is coming no matter what you play here — your move didn't create it. Column 1 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your opponent already has the same [zone:windows:c7r2,c6r3,c5r4,c4r5]four-in-a-row line[/zone:windows:c7r2,c6r3,c5r4,c4r5] built around [zone:c5r4]c5r4[/zone:c5r4], so the job here is just to make that finish as awkward as possible. [zone:col1]Column 1[/zone:col1] is the toughest defense because it leaves your opponent with the least room to sort out the finishing attack; [zone:col5]column 5[/zone:col5] is a looser defense that lets them cash it in more cleanly.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c4r5",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c6r3",
  "c7r2"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.windows",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 1,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your opponent already has the [zone:c5r4]finishing square at c5r4[/zone:c5r4] for the [zone:windows:c7r2,c6r3,c5r4,c4r5]four-in-a-row line running through c7r2, c6r3, c5r4, and c4r5[/zone:windows:c7r2,c6r3,c5r4,c4r5]. The better defense is [zone:col1]column 1[/zone:col1], because it keeps you from handing over extra tempo and makes them work hardest to cash in that threat; [zone:col5]column 5[/zone:col5] does not improve your hold on that key square.",
 "key_cells": [
  "c1r1",
  "c1r2",
  "c1r3",
  "c1r4",
  "c1r5",
  "c1r6",
  "c4r5",
  "c5r1",
  "c5r2",
  "c5r3",
  "c5r4",
  "c5r5",
  "c5r6",
  "c6r3",
  "c7r2"
 ],
 "fields_relied_on": [
  "opponentPunishment.tag",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols"
 ],
 "unsure_about": "I could not determine from the vector alone whether the move difference was mainly about tempo or about a subtle parity detail; I only know column 1 is the tougher defense against the same threat.",
 "confidence": "high"
}
```

### pin-branch-invariance-true-2 — lose_to_faster_lose — PASS

Board: `315233253621552234626653641` · played col 4 (display 5) · best col 1 (display 2) · case `lose_to_faster_lose` · player 2 · mid-game

Link: `L3` (high) — "Your opponent's threat to make four next move at c5r4 is coming no matter what you play here — your move didn't create it. Column 2 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 2 is the tougher defense because it keeps your opponent’s [term:immediate_threat]next-move four[/term:immediate_threat] at [zone:c5r4]c5r4[/zone:c5r4] contained while you preserve more room to answer the rest of [zone:windows:c7r2,c6r3,c5r4,c4r5]that four-in-a-row line[/zone:windows:c7r2,c6r3,c5r4,c4r5]. The move you played at column 5 gives that same threat a cleaner path and lets your opponent finish it more directly.",
 "key_cells": [
  "c4r5",
  "c5r4",
  "c6r3",
  "c7r2"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols",
  "gate.witness.oppPlies"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 2,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Column 2 is the tougher defense because it keeps your opponent’s [term:immediate_threat]next-move four[/term:immediate_threat] as hard to reach as possible while you still answer the live [zone:c5r4]square on c5r4[/zone:c5r4]. By contrast, column 5 lets your opponent’s [zone:windows:c7r2,c6r3,c5r4,c4r5]four-in-a-row line on c7r2-c6r3-c5r4-c4r5[/zone:windows:c7r2,c6r3,c5r4,c4r5] come through with less resistance, so it gives them the cleaner finish.",
 "key_cells": [
  "c4r5",
  "c5r4",
  "c6r3",
  "c7r2"
 ],
 "fields_relied_on": [
  "case",
  "opponentPunishment.tag",
  "opponentPunishment.cells",
  "opponentPunishment.window",
  "opponentPunishment.completingCell",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

### pin-branch-invariance-true-3 — lose_to_faster_lose — FAIL (prompt_confusion)

Board: `334531345414414102133022210000` · played col 5 (display 6) · best col 2 (display 3) · case `lose_to_faster_lose` · player 1 · closing

Link: `L3` (high) — "Your opponent's threat to make four next move at c6r4 is coming no matter what you play here — your move didn't create it. Column 3 makes your opponent work hardest for it; the move you played only speeds up the finish."

```json
// run 0
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "You want to spend your turn making your opponent work hardest against [zone:c6r4]c6r4[/zone:c6r4], which sits on their [zone:windows:c3r1,c4r2,c5r3,c6r4]four-in-a-row line[/zone:windows:c3r1,c4r2,c5r3,c6r4]. [zone:col3]Column 3[/zone:col3] is the tougher defense because it leaves them more replies to sort through, while [zone:col6]column 6[/zone:col6] gives them a cleaner path to that same threat.",
 "key_cells": [
  "c3r1",
  "c3r2",
  "c3r3",
  "c3r4",
  "c3r5",
  "c3r6",
  "c4r2",
  "c5r3",
  "c6r1",
  "c6r2",
  "c6r3",
  "c6r4",
  "c6r5",
  "c6r6"
 ],
 "fields_relied_on": [
  "opponentPunishment.cells",
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCols"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

```json
// run 1
{
 "better_move": 3,
 "played_outcome": "loss",
 "best_outcome": "loss",
 "mechanism": "Your best defense is to play column 3, which keeps the fight focused on [zone:c6r4]c6r4[/zone:c6r4] instead of giving your opponent a cleaner finish. That move is the tougher hold because it leaves your opponent only [zone:windows:c3r1,c4r2,c5r3,c6r4]the four-in-a-row line through c3r1, c4r2, c5r3, and c6r4[/zone:windows:c3r1,c4r2,c5r3,c6r4] to press, while your played move in column 6 gives them a more direct path to the same threat.",
 "key_cells": [
  "c3r1",
  "c4r2",
  "c5r3",
  "c6r4"
 ],
 "fields_relied_on": [
  "opponentPunishment.completingCell",
  "opponentPunishment.window",
  "replyHistogram.afterBest",
  "replyHistogram.afterPlayed",
  "gate.verdict",
  "gate.witness.devCol"
 ],
 "unsure_about": "",
 "confidence": "high"
}
```

