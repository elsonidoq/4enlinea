# Deep Reveal Eval Report — eval_set_large_2_results_2026-06-25T14-42-33Z.jsonl

> Note: the raw results file does not carry the `is_sparse` flag (run_eval.mjs does not yet propagate it). This report uses an enriched copy (`*.enriched.jsonl`) produced by joining each record to `eval_set_large_2.json` on `id`. A fix prompt to make run_eval emit the flag natively is saved at `PROMPT_run_eval_propagate_is_sparse.md`.

## Summary

- Total entries: 54
- Pipeline failures: 0
- Annotation failures: 4 (eval-13, eval-19, eval-25, eval-37)
- Successes evaluated: 50
- Rubric pass rate: 390/450 item-scores passed (86.7%) across the 50 success entries
- `is_sparse:true` entries: 10 (eval-0, eval-3, eval-5, eval-10, eval-12, eval-14, eval-15, eval-16, eval-17, eval-20)
- Look-ahead section fired on: eval-20 (1 of 10)

## Sparse-board look-ahead subsection (the point of this run)

The newly-shipped sparse forward look-ahead engine is supposed to fire on `is_sparse:true` anchorless blunders and surface a concrete winning structure under `## What the better move leads to`.

### Fire vs. honest-null

| is_sparse id | category | sev | look-ahead fired? | item2 | item3 | item8 | item9 |
|---|---|---|---|---|---|---|---|
| eval-0 | suboptimal_move | 1 | no (honest-null — likely opponent-indifference dead-end) | fail | pass | fail | partial |
| eval-3 | suboptimal_move | 1 | no (honest-null — likely opponent-indifference dead-end) | fail | fail | fail | partial |
| eval-5 | drawing_move | 0 | no (honest-null — likely opponent-indifference dead-end) | pass | pass | fail | fail |
| eval-10 | suboptimal_move | 1 | no (honest-null — likely opponent-indifference dead-end) | fail | pass | fail | fail |
| eval-12 | drawing_move | 0 | no (honest-null — likely opponent-indifference dead-end) | pass | pass | partial | fail |
| eval-14 | suboptimal_move | 0 | no (honest-null — likely opponent-indifference dead-end) | pass | pass | pass | partial |
| eval-15 | suboptimal_move | 0 | no (honest-null — likely opponent-indifference dead-end) | pass | fail | pass | partial |
| eval-16 | drawing_move | 0 | no (honest-null — likely opponent-indifference dead-end) | pass | fail | fail | fail |
| eval-17 | suboptimal_move | 0 | no (honest-null — likely opponent-indifference dead-end) | fail | pass | fail | partial |
| eval-20 | suboptimal_move | 0 | **YES** | fail | fail | partial | partial |

**Fired: 1/10** (eval-20). **Did not fire: 9/10** — all flagged as look-ahead-did-not-fire (likely opponent-indifference dead-end), per the known limitation; these are NOT scored as content failures for a missing section.

### Did the feature move items 2 / 8 / 9 on the sparse boards?

Across the 10 sparse entries:

- **Item 2 (no hallucination):** 5 pass / 0 partial / 5 fail
- **Item 8 (other issues):** 2 pass / 2 partial / 6 fail
- **Item 9 (reproducible reasoning):** 0 pass / 6 partial / 4 fail

**Verdict: the feature did not move items 2/8/9 in the intended direction.** It fired on only 1 of 10 sparse boards (eval-20), and on that one board it scored item2=fail, item8=partial, item9=partial — the look-ahead section itself was emitted *without a concrete cell* (it literally says "one way to reach it" and "(no specific cell references — use the allowed columns above and describe patterns in general terms)"), so the model stayed vague AND fabricated a player "major threat" the boards do not show. The 9 non-firing sparse boards fell back to the pre-existing behavior, where the prompt's mandatory "name the tactical pattern" instruction + injected KB terms (minor_threat / parity / gravity_top) drove the model to **fabricate threat/parity structures on near-empty boards** — the dominant item2/item8/item9 failure cluster in this run.

### eval-20 — the one board where look-ahead fired

```
You gave ground by playing [zone:col4]column 4[/zone:col4] instead of [zone:col6]column 6[/zone:col6], which was the stronger [term:major_threat]major threat[/term:major_threat] move. The better move would have let you build a winning line with your next play, while your move on [zone:col4]column 4[/zone:col4] only placed a disc on [zone:c4r3]that cell[/zone:c4r3] and did not create that same immediate pressure.
```

Look-ahead section that was injected into the prompt:

```
## What the better move leads to

This is a future possibility, not a fact on the board yet. If your opponent does not defend perfectly, the better move lets you reach a winning move:
- [zone:future-immediate_threat-1]one way to reach it[/zone:future-immediate_threat-1]
Describe it as something you could build next, never as already present.
```

## Pipeline failures

None.

## Annotation failures

| id | category | sparse | attempt1_failures | attempt2_failures |
|---|---|---|---|---|
| eval-13 | double_threat | false | `P1:invalid_spec:zone:c3r6, P5:out_of_bounds:zone:c3r6` | `P1:invalid_spec:zone:c3r6, P1:invalid_spec:zone:c3r5, P5:out_of_bounds:zone:c3r6, P5:out_of_bounds:zone:c3r5` |
| eval-19 | suboptimal_move | false | `P3:engine_jargon` | `P3:engine_jargon` |
| eval-25 | odd_even_threat | false | `P3:engine_jargon` | `P3:engine_jargon` |
| eval-37 | z_threat | false | `P5:blocked:c6r6, P5:blocked:c2r5` | `P5:blocked:c2r5` |

> **eval-13 attempt 1** (`P1:invalid_spec:zone:c3r6, P5:out_of_bounds:zone:c3r6`):
>
> Playing [zone:col7]column 7[/zone:col7] let your opponent keep the [term:double_threat]double threat[/term:double_threat] setup around [zone:cells:c5r4,c5r5]the threat cluster[/zone:cells:c5r4,c5r5], so you gave them a way to pressure you in two places at once. The better move was [zone:col3]column 3[/zone:col3], which would have placed your disc on [zone:zone:c3r5]that cell[/zone:c3r5] and also created [term:immediate_threat]immediate threat[/term:immediate_threat] on [zone:zone:c3r6]that cell[/zone:zone:c3r6], while the undercut around [zone:cells:c5r4,c5r5]the threat cluster[/zone:cells:c5r4,c5r5] kept that area from helping your opponent.
>
> **eval-13 attempt 2** (`P1:invalid_spec:zone:c3r6, P1:invalid_spec:zone:c3r5, P5:out_of_bounds:zone:c3r6, P5:out_of_bounds:zone:c3r5`):
>
> By playing [zone:col7]column 7[/zone:col7], you let your opponent keep the [term:double_threat]double threat[/term:double_threat] setup around [zone:cells:c5r4,c5r5]that threat cluster[/zone:cells:c5r4,c5r5] while also leaving their immediate threat on [zone:zone:c3r6]that cell[/zone:zone:c3r6] available. The better move was [zone:col3]column 3[/zone:col3], which would have let you take [zone:zone:c3r5]that cell[/zone:zone:c3r5] and use [term:undercut]undercut[/term:undercut] on the threats in [zone:cells:c5r4,c5r5]that threat cluster[/zone:cells:c5r4,c5r5], so your opponent would not be able to press both ideas at once.

> **eval-19 attempt 1** (`P3:engine_jargon`):
>
> Your move in [zone:col2]column 2[/zone:col2] only landed on [zone:c2r2]that cell[/zone:c2r2], while the better move in [zone:col5]column 5[/zone:col5] would have let you play [zone:c5r2]that cell[/zone:c5r2] and build a [term:minor_threat]minor threat[/term:minor_threat]. That better move would have left you with [zone:windows:c3r2|c4r2|c7r2]3[/zone:windows:c3r2|c4r2|c7r2] minor threats instead of [zone:tg]0[/zone:tg], so you gave away a stronger setup and settled for a quieter position.
>
> **eval-19 attempt 2** (`P3:engine_jargon`):
>
> By playing [zone:col2]column 2[/zone:col2], you put your disc on [zone:c2r2]that cell[/zone:c2r2], but the stronger idea was to play [zone:col5]column 5[/zone:col5] and take [zone:c5r2]that cell[/zone:c5r2]. That better move would have built a [term:minor_threat]minor threat[/term:minor_threat] for you — [zone:windows:c3r2|c4r2|c7r2]3[/zone:windows:c3r2|c4r2|c7r2] versus [zone:tg]0[/zone:tg] — while your actual move left you with [zone:tg]0[/zone:tg], so you gave up a little of your own pressure.

> **eval-25 attempt 1** (`P3:engine_jargon`):
>
> Your move in [zone:col2]column 2[/zone:col2] was a small inaccuracy because it put a disc on [zone:c2r1]that cell[/zone:c2r1] and gave your opponent room to keep both row parities in play against you. The better move was [zone:col3]column 3[/zone:col3], where you could have played [zone:c3r4]that cell[/zone:c3r4] to build a [term:minor_threat]minor threat[/term:minor_threat] plan; that line would have left you with [zone:windows:c1r4|c2r4|c5r4|c6r4]4[/zone:windows:c1r4|c2r4|c5r4|c6r4] minor threats instead of [zone:tg]0[/zone:tg].
>
> **eval-25 attempt 2** (`P3:engine_jargon`):
>
> Your move in [zone:col2]column 2[/zone:col2] was a small inaccuracy because it let your opponent keep a [term:odd_even_threat]odd-even threat[/term:odd_even_threat] shape alive on both parities, while the better move in [zone:col3]column 3[/zone:col3] would have put your disc on [zone:c3r4]that cell[/zone:c3r4] and given you more active chances to build on the even rows you need. That stronger move also left you with [zone:windows:c1r4|c2r4|c5r4|c6r4]4[/zone:windows:c1r4|c2r4|c5r4|c6r4] minor threats instead of [zone:tg]0[/zone:tg], so it kept more useful pressure in the position.

> **eval-37 attempt 1** (`P5:blocked:c6r6, P5:blocked:c2r5`):
>
> By playing [zone:col6]column 6[/zone:col6], you gave your opponent the [term:parity]parity[/term:parity] advantage: your disc landed on [zone:c6r6]that cell[/zone:c6r6], which left [zone:col2]column 2[/zone:col2] as the better way to keep control with a move on [zone:c2r5]that cell[/zone:c2r5]. That better move would have kept the odd-row plan in your hands, while your played move handed your opponent the better timing to steer the rest of the game.
>
> **eval-37 attempt 2** (`P5:blocked:c2r5`):
>
> Your move in [zone:col6]column 6[/zone:col6] handed your opponent the parity advantage, because it filled [zone:col6]column 6[/zone:col6] on an even row and let them keep control of the key odd-row timing you need. The better move was [zone:col2]column 2[/zone:col2]: it would have played on [zone:c2r5]that cell[/zone:c2r5], keeping the useful odd-row tempo for you and avoiding the [term:z_threat]z threat[/term:z_threat]-style parity swing that your move gave away.

## Per-entry rubric scores (success entries)

| id | category | sev | sparse | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| eval-0 | suboptimal_move | 1 | Y | pass | **FAIL** | pass | pass | pass | pass | pass | **FAIL** | _part_ |
| eval-1 | double_threat | 6 |  | pass | _part_ | pass | pass | pass | pass | pass | pass | pass |
| eval-2 | immediate_threat | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-3 | suboptimal_move | 1 | Y | pass | **FAIL** | **FAIL** | pass | pass | pass | _part_ | **FAIL** | _part_ |
| eval-4 | immediate_threat | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-5 | drawing_move | 0 | Y | pass | pass | pass | pass | pass | pass | pass | **FAIL** | **FAIL** |
| eval-6 | j_shape | 1 |  | pass | pass | pass | pass | pass | pass | _part_ | **FAIL** | pass |
| eval-7 | double_threat | 2 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-8 | immediate_threat | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-9 | drawing_move | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-10 | suboptimal_move | 1 | Y | pass | **FAIL** | pass | pass | pass | pass | pass | **FAIL** | **FAIL** |
| eval-11 | immediate_threat | 3 |  | pass | pass | pass | pass | pass | pass | pass | _part_ | pass |
| eval-12 | drawing_move | 0 | Y | pass | pass | pass | pass | pass | pass | _part_ | _part_ | **FAIL** |
| eval-14 | suboptimal_move | 0 | Y | pass | pass | pass | pass | pass | pass | _part_ | pass | _part_ |
| eval-15 | suboptimal_move | 0 | Y | pass | pass | **FAIL** | pass | pass | pass | pass | pass | _part_ |
| eval-16 | drawing_move | 0 | Y | pass | pass | **FAIL** | pass | pass | pass | _part_ | **FAIL** | **FAIL** |
| eval-17 | suboptimal_move | 0 | Y | pass | **FAIL** | pass | pass | pass | pass | pass | **FAIL** | _part_ |
| eval-18 | suboptimal_move | 0 |  | pass | pass | pass | pass | pass | pass | pass | _part_ | pass |
| eval-20 | suboptimal_move | 0 | Y | pass | **FAIL** | **FAIL** | pass | pass | pass | _part_ | _part_ | _part_ |
| eval-21 | forced_block | 3 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-22 | forced_block | 3 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-23 | j_shape | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-24 | undercut | 1 |  | pass | pass | pass | pass | pass | pass | _part_ | pass | pass |
| eval-26 | forced_win | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-27 | j_shape | 1 |  | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | **FAIL** | pass |
| eval-28 | forced_win | 0 |  | pass | pass | pass | pass | pass | pass | pass | _part_ | pass |
| eval-29 | overcut | 1 |  | pass | **FAIL** | pass | pass | pass | pass | pass | **FAIL** | pass |
| eval-30 | undercut | 0 |  | pass | _part_ | pass | _part_ | pass | pass | _part_ | **FAIL** | pass |
| eval-31 | double_threat | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-32 | figure_7 | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-33 | double_threat | 4 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-34 | j_shape | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-35 | figure_7 | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-36 | forced_win | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-38 | immediate_threat | 8 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-39 | forced_block | 7 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-40 | forced_win | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-41 | z_threat | 0 |  | pass | _part_ | pass | pass | pass | pass | pass | pass | pass |
| eval-42 | z_threat | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-43 | figure_7 | 0 |  | pass | pass | pass | pass | pass | pass | **FAIL** | **FAIL** | pass |
| eval-44 | overcut | 0 |  | pass | _part_ | pass | pass | pass | pass | **FAIL** | **FAIL** | pass |
| eval-45 | odd_even_threat | 1 |  | pass | pass | pass | pass | pass | pass | _part_ | pass | pass |
| eval-46 | odd_even_threat | 1 |  | pass | **FAIL** | _part_ | pass | pass | pass | pass | pass | _part_ |
| eval-47 | figure_7 | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-48 | odd_even_threat | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-49 | claimeven | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | _part_ |
| eval-50 | claimeven | 1 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-51 | claimeven | 1 |  | pass | pass | pass | pass | pass | pass | _part_ | pass | pass |
| eval-52 | claimeven | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| eval-53 | z_threat | 0 |  | pass | pass | pass | pass | pass | pass | pass | pass | pass |

> **eval-0** _(sparse)_: item2 fail — credits col4 with a 'stronger minor threat' but that board shows no threats; the minor threats are on the played col3 board (inverted/misattributed). item8 fail — board factual error from same inversion. item9 partial — cites cells c4r3/c3r1 but the differentiator is filler ('more dangerous stack').
> Causes: Empty threat-comparison block + injected minor_threat KB term on a near-empty sparse board → model fabricated a minor threat for the better move.

> **eval-1**: item2 partial — labels opponent's c2r1/c6r1 a 'double threat setup' though all boards print 'Major threats: none' (they are only minor threats); softened by 'setup'.
> Causes: Move-context key insight ('set up two winning threats at once') + injected double_threat KB term nudged labeling early minor threats as a fork.

> **eval-3** _(sparse)_: item2 fail — claims better move's gain was a minor threat; col4 board shows none, minor threats are on the played board (inverted). item3 fail — primary diagnosis is generic 'gave ground'. item7 partial — names minor_threat but justifies via odd-row parity. item8 fail — backwards threat attribution. item9 partial — mixes real odd-row feature with filler.
> Causes: Mandatory 'name the tactical pattern' + minor_threat KB injection on a sparse board with no real pattern; key insight seeds 'gave ground' filler.

> **eval-5** _(sparse)_: item8 fail — claims col4 'preserved safer even-odd structure' but par row shows col4 and col5 both 5O after move 0; no parity distinction exists (fabricated). item9 fail — invented parity distinction + filler; real feature (col4 centrality) ignored.
> Causes: Prompt injects parity KB term and forces naming a pattern on an empty-board opening where none applies.

> **eval-6**: item7 partial — better-move rationale cites only 'building your own threat' (0→1), never explains how col3 dismantles the j-shape. item8 fail — parity error: new major threat at c2r4 (row4 = EVEN) is called 'your own odd-row threat'.
> Causes: j-shape insight and threat-count delta supplied as disjoint inputs; 'you win on ODD rows' framing + parity KB term led to mislabeling an even-row threat as odd.

> **eval-10** _(sparse)_: item2 fail — claims col4 built a row-3 minor threat but board shows none; minor threats are only on played col5 board row1 (fabricated/inverted). item8 fail — reversed threat direction. item9 fail — fabricated row-3 minor threat + filler.
> Causes: Empty threat-comparison rows + minor_threat KB injection → invented minor-threat narrative for the better move.

> **eval-11**: item8 partial — 'let your opponent keep'/'still have an immediate threat' implies the threat pre-existed; before the move c2r2 was only latent — the played move enabled the gravity-top win (created, not failed-to-remove).
> Causes: Before-board still lists col2row2 (Gy) as a major threat → model conflated the latent pre-move threat with the post-move gravity-top one.

> **eval-12** _(sparse)_: item7 partial — better-move rationale loosely tied to named parity weakness. item8 partial — on a near-empty board 'left key odd-row landing in wrong place' is a fabricated parity consequence; real distinction is center control. item9 fail — invented non-verifiable parity story; col4=center never mentioned.
> Causes: Sparse opening drawing_move, empty board, parity KB term injected, forced pattern naming → fabricated parity rationale; true differentiator (center) absent from prompt.

> **eval-14** _(sparse)_: item7 partial — rationale ('control of top side','even rows') loosely tied to named gravity-top weakness. item9 partial — mixes concrete feature (even-row cell c4r6) with filler.
> Causes: Empty threat comparison, severity 0, no lookahead section → no genuinely distinguishing feature, so model padded with filler.

> **eval-15** _(sparse)_: item3 fail — primary diagnosis is generic 'gave ground / keep best shape on bottom row', not a reproducible feature (fails suboptimal_move bar). item9 partial — mixed filler + partial concrete hook (minor-threat cells c3r1/c7r4).
> Causes: Key insight literally 'There was a stronger move — this one gives ground' seeds filler; empty threat rows give no concrete anchor.

> **eval-16** _(sparse)_: item3 fail — primary 'gave up a gravity top hold' is a gravity framing, not the drawing-resource concept for drawing_move. item7 partial — diagnosis vs remedy mismatch. item8 fail — on empty board col4/col5 are symmetric; 'gravity top hold' distinction is board-unsupported. item9 fail — fabricated gravity-top + filler.
> Causes: Forced KB-term naming on a zero-feature opening; only gravity_top/parity offered → model latched on gravity_top to manufacture a distinction.

> **eval-17** _(sparse)_: item2 fail — claims col3 built a minor threat but board shows none; minor threats appear on played col6 board (hallucinated). item8 fail — factual reversal of threat direction. item9 partial — concrete-but-false feature + filler.
> Causes: Empty threat-comparison rows + minor_threat KB injection + 'say what the better move accomplished' invited inventing an accomplishment.

> **eval-18**: item8 partial — 'left that winning chance sitting there instead of taking it yourself' implies an immediate win existed before col4, but boards show 'Major threats: none' until col4 completes the bottom row and creates the c7r1 threat (frames a setup as a takeable win).
> Causes: Best-move tactical evidence lists immediate_threat cell c7r1 without clarifying it only materializes AFTER col4; key insight ('gives ground') nudged 'already sitting there' framing.

> **eval-20** _(sparse)_ _(look-ahead fired)_: FIRED (look-ahead section present). item2 fail — calls col6 'the stronger major threat move' implying a player major threat, but boards list only the opponent's major threat (col3 row3); no player major threat exists. item3 fail — primary is score-flavored ('gave ground','stronger move'). item7 partial — circular rationale. item8 partial — misleading major-threat attribution. item9 partial — references the look-ahead only loosely ('build a winning line with your next play'), cites no concrete winning cell.
> Causes: The look-ahead section itself was vague — 'one way to reach it', and explicitly '(no specific cell references — use the allowed columns above and describe patterns in general terms)' — so the model had no concrete landing square and fell back on 'stronger'; injected major_threat KB term nudged the false 'major threat move' label.

> **eval-24**: item7 partial — better-move rationale pivots to 'kept your position safer' + minor-threat count 10→9 but never explains how col7 avoids the named undercut.
> Causes: Threat comparison only exposes a minor-threat delta; no lookahead section to give a concrete consequence.

> **eval-27**: item2 fail — asserts opponent 'j-shape around the center'/'central trap' the boards don't show (opponent threats are in col2; you in fact hold c3r4). item4 fail — who-benefits confusion: j_shape (odd-row, your-favoring per KB) attributed to the even-row opponent. item8 fail — wrong-direction/location framing.
> Causes: Key insight 'You let your opponent build a J-shape trap' with no board evidence; best-move evidence actually lists undercut + immediate_threat, not j_shape.

> **eval-28**: item8 partial — 'let your opponent keep a major threat on c6r4' is misleading; that opponent threat persists in the after-best board too, so col3 doesn't remove it. Real distinguishing feature (col3 makes your c3r4 threat gravity-top) is omitted.
> Causes: c6r4 (Gy) threat unchanged across all three snapshots while the distinguishing <Gn> gravity-top at c3r4 is only implicit; no 'what the better move leads to' framing.

> **eval-29**: item2 fail — claims the better move neutralizes 'the higher threat there' in column 3, but no opponent major threat is in col3 (all major threats are col5). item8 fail — mislocates the overcut/'higher threat' to col3 (the better-move column) when it lives in col5.
> Causes: Key insight names 'overcut' + 'better move column 3' while best-move evidence places the overcut at c5r3/c5r4 (col5); model collapsed the better-move column and the overcut column into one.

> **eval-30**: item2 partial — calls c4r3 'your line on the odd row' but the Major-threats list marks col4 row3 as opponent (Gy). item4 partial — attributes the undercutting 'lower disc' to 'you' though the insight says it is the opponent's. item7 partial — threat-count framing garbled; invented [zone:windows:] tags. item8 fail — self-contradiction ('your lower disc now blocks the higher one' vs 'no longer safe').
> Causes: Prompt grounding self-contradicts: 'YOUR threat cells: [c4r3,c4r4]' vs board Major-threats showing col4row3 (Gy); undercut definition gives no fixed subject for whose disc undercuts whom; threat comparison supplies only bare counts.

> **eval-41**: item2 partial — says the played move 'left them at 0' major threats, but the played-move board still shows col2 row5 (Gn) [GT], a real gravity-top Green major threat (denies an existing threat).
> Causes: Prompt's threat-comparison row ('Your major threats: 0') contradicts the played-move board ('Major threats: col2 row5 (Gn) [GT]'); model copied the comparison count.

> **eval-43**: item7 fail — threat-count clause scrambled: says better move (col4) keeps '1' then cites '4 after the best move', conflating the better move with a separate best move and underselling col4's actual benefit. item8 fail — self-contradiction; played-move value (1) misassigned to the better move.
> Causes: Parallel three-snapshot threat comparison (best=4 vs played=1) + instruction to copy zone-tag counts → model mixed best/played counts and treated 'better move' and 'best move' as different moves.

> **eval-44**: item2 partial — 'your lower disc at c6r4' but board shows that cell empty ([*]). item7 fail — ties playing col3 (lands c3r6) to neutralizing the col6 overcut cells; col3 has no effect on col6. item8 fail — locates the overcut 'on column 3' but the overcut cells (c6r4,c6r6) are in col6; phantom disc at c6r4.
> Causes: Overcut label + correct-move column 3 presented together without their relationship explained → model conflated the overcut column (6) with the move column (3).

> **eval-45**: item7 partial — names 'threats on both parities' but the better-move rationale cites only a minor-threat count drop (11→10), not how col3 confines threats to one parity.
> Causes: Key insight frames the mistake as parity while threat comparison supplies only a minor-threat count delta; no parity-specific metric.

> **eval-46**: item2 fail — says the major threat was created 'on that cell c5r5', but c5r5 is only the landing disc; the boards list the major threat at col3 row3. item3 partial — primary framing is generic 'gave ground / keep pressure' + bare 'major threat'; never invokes the odd-even parity that defines odd_even_threat. item9 partial — mixes one concrete feature with filler and mislocates the threat.
> Causes: Move-context line 'The better move places a disc on c5r5' led the model to attach the threat to the landing square instead of the boards' 'Major threats: col3 row3'; key insight ('gives ground') steered to generic framing.

> **eval-49**: item9 partial — names claimeven/'pairing control' but reasoning stays abstract ('steer the endgame','control the pairing') without citing concrete pairing cells or parity.
> Causes: Threat-comparison rows empty + no lookahead section; the supplied key insight is itself abstract.

> **eval-51**: item7 partial — names given-away claimeven/pairing control but the better-move rationale pivots to reducing opponent minor threats (4→2) without explaining how col4 regains pairing control or the c4r6 immediate threat.
> Causes: Claimeven key insight as diagnosis hook but only quantitative minor-threat rows fed in threat comparison; immediate_threat best-move evidence (c4r6) not foregrounded.

## Systematic issues

### Item 8 — Other issues (17 entries, 8 sparse)

- Entries: eval-0, eval-3, eval-5, eval-6, eval-10, eval-11, eval-12, eval-16, eval-17, eval-20, eval-27, eval-28, eval-29, eval-30, eval-43, eval-44, eval-18
- Categories: suboptimal_move, drawing_move, j_shape, immediate_threat, forced_win, overcut, undercut, figure_7
- Misleading framing and board factual errors — inverted threat direction, conflating a latent pre-move threat with a created one, mislocating an overcut/undercut/j-shape to the better-move column, scrambled threat counts.

### Item 2 — No hallucinated win/structure (12 entries, 5 sparse)

- Entries: eval-0, eval-1, eval-3, eval-10, eval-17, eval-20, eval-27, eval-29, eval-30, eval-41, eval-44, eval-46
- Categories: suboptimal_move, double_threat, j_shape, overcut, undercut, z_threat, odd_even_threat
- On near-empty / sparse boards the model fabricates or misattributes threat structures (claims a minor/major threat the boards mark as 'none', or pins the opponent's threat on the player / the wrong column).

### Item 7 — Internal consistency (12 entries, 5 sparse)

- Entries: eval-3, eval-6, eval-12, eval-14, eval-16, eval-20, eval-24, eval-30, eval-43, eval-44, eval-45, eval-51
- Categories: suboptimal_move, j_shape, drawing_move, undercut, figure_7, overcut, odd_even_threat, claimeven
- The better-move rationale is justified by a generic count delta or 'safer/stronger' rather than mechanically addressing the specific named weakness.

### Item 9 — Reproducible reasoning (12 entries, 10 sparse)

- Entries: eval-0, eval-3, eval-5, eval-10, eval-12, eval-14, eval-15, eval-16, eval-17, eval-20, eval-46, eval-49
- Categories: suboptimal_move, drawing_move, odd_even_threat, claimeven
- Reasoning leans on fabricated parity/threat stories or score-flavored filler ('gave ground', 'more pressure') instead of a genuine player-findable board feature; clusters on the sparse drawing_move / suboptimal_move boards.

### Item 3 — Pattern match (5 entries, 4 sparse)

- Entries: eval-3, eval-15, eval-16, eval-20, eval-46
- Categories: suboptimal_move, drawing_move, odd_even_threat
- Primary diagnosis drifts from the labeled category — generic 'gave ground' or a gravity/parity framing replaces the expected concept (esp. suboptimal_move / drawing_move / odd_even_threat).

### Item 4 — Player perspective (2 entries)

- Entries: eval-27, eval-30
- Categories: j_shape, undercut
- Who-benefits confusion — a structure (j_shape, undercut) is attributed to the wrong player.

## Raw explanations (success entries)

### eval-0 — suboptimal_move (sev 1) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      | Gn 3 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   0  |   0  |   1  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r3.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 3):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave up the stronger [term:minor_threat]minor threat[/term:minor_threat] idea by playing [zone:col3]column 3[/zone:col3] instead of taking [zone:col4]column 4[/zone:col4]. The better move would have let you place on [zone:c4r3]that cell[/zone:c4r3], building a more dangerous stack in the middle, while your move only landed on [zone:c3r1]that cell[/zone:c3r1] and left you with a much weaker setup.
```

### eval-1 — double_threat (sev 6)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   0  |   0  |   1  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gy) |      |      |      |      |      |
  3  |      |      | (gy) |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | Gy 4 |      |      |

  ht |   0  |   0  |   1  |   2  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   1  |   0  |   1  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 1
- Your move placed a disc on c1r1.
- Better move: column 5
- The better move places a disc on c5r1.
- Key insight: Your move let your opponent set up two winning threats at once.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: 0
- Opponent minor threats: [zone:opponent-minor-pre]4[/zone:opponent-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 1):
- Your minor threats: 0
- Opponent minor threats: [zone:opponent-minor-played]3[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r1, c6r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
Playing [zone:col1]column 1[/zone:col1] was the mistake because it let your opponent keep the pressure on [zone:c2r1]that cell[/zone:c2r1] and [zone:c6r1]that cell[/zone:c6r1], giving them a [term:double_threat]double threat[/term:double_threat] setup instead of relieving it. The better move was [zone:col5]column 5[/zone:col5]: it would have put your disc on [zone:c5r1]that cell[/zone:c5r1] and left you with [zone:windows:c2r4|c3r3]2[/zone:windows:c2r4|c3r3] minor threats while cutting your opponent’s minor threats from [zone:windows:c1r1|c2r1|c5r1|c6r1]4[/zone:windows:c1r1|c2r1|c5r1|c6r1] to [zone:windows:c1r1|c2r1]2[/zone:windows:c1r1|c2r1], instead of leaving them at [zone:windows:c2r1|c5r1|c6r1]3[/zone:windows:c2r1|c5r1|c6r1].
```

### eval-2 — immediate_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | <Gn> | Gn 3 | Gn 1 | Gn 5 | <Gn> | Gy 6 |

  ht |   1  |   0  |   1  |   2  |   1  |   0  |   1  |  (discs in column)
 par |  5O  |  6E  |  5O  |  4E  |  5O  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 7  |  Next: Gray  [GAME OVER]

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |Gn |Gn |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | Gn 7 | Gn 3 | Gn 1 | Gn 5 | <Gn> | Gy 6 |

  ht |   1  |   1  |   1  |   2  |   1  |   0  |   1  |  (discs in column)
 par |  5O  |  5O  |  5O  |  4E  |  5O  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  | (gn) |      | (gn) |      |      |      |      |
  3  |      | (gn) | (gn) |      |      |      |      |
  2  |      |      | Gn 7 | Gy 2 |      |      |      |
  1  | Gy 4 | <Gn> | Gn 3 | Gn 1 | Gn 5 | <Gn> | Gy 6 |

  ht |   1  |   0  |   2  |   2  |   1  |   0  |   1  |  (discs in column)
 par |  5O  |  6E  |  4E  |  4E  |  5O  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 2
- The better move places a disc on c2r1.
- Key insight: You had a winning move right there and didn't take it.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r1, c6r1]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:immediate_threat]immediate threat[/term:immediate_threat] sitting in [zone:col2]column 2[/zone:col2] at [zone:c2r1]that cell[/zone:c2r1], and moving in [zone:col3]column 3[/zone:col3] instead only dropped a disc onto [zone:c3r2]that cell[/zone:c3r2]. The better move would have placed your disc in [zone:col2]column 2[/zone:col2], completing the line on [zone:row1]row 1[/zone:row1] right away.
```

### eval-3 — suboptimal_move (sev 1) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   4  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   5  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  1O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      | (gn) | (gn) | Gn 1 | Gn 5 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   4  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 5):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave ground by playing [zone:col5]column 5[/zone:col5]; that only put a disc on [zone:c5r1]that cell[/zone:c5r1], while the stronger move was to play [zone:col4]column 4[/zone:col4] and land on [zone:c4r5]that cell[/zone:c4r5]. The missed pattern was [term:minor_threat]minor threat[/term:minor_threat]: the better move would have kept your build on the odd row and strengthened your position, while your move just filled a side spot with no such gain.
```

### eval-4 — immediate_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 32  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gy |   |Gn |   |
  5  |Gy |   |Gy |Gn |   |Gn |Gy |
  4  |Gy |   |Gy |Gy |   |Gn |Gy |
  3  |Gn |   |Gy |Gn |   |Gy |Gn |
  2  |Gy |Gy |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gy) | Gn17 | Gy14 |      | Gn31 | (gn) |
  5  | Gy32 |      | Gy16 | Gn 9 | [Gy] | Gn29 | Gy30 |
  4  | Gy22 | [Gy] | Gy10 | Gy 4 | [Gn] | Gn27 | Gy28 |
  3  | Gn21 |      | Gy 8 | Gn 3 | (*)  | Gy26 | Gn25 |
  2  | Gy18 | Gy20 | Gn 7 | Gy 2 | Gn23 | Gn13 | Gy24 |
  1  | Gn15 | Gn19 | Gy 6 | Gn 1 | Gn 5 | Gn11 | Gy12 |

  ht |   5  |   2  |   6  |   6  |   2  |   6  |   5  |  (discs in column)
 par |  1O  |  4E  |  0E  |  0E  |  4E  |  0E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gy)   col5 row4 (Gn)   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 33  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gy |   |Gn |   |
  5  |Gy |   |Gy |Gn |   |Gn |Gy |
  4  |Gy |   |Gy |Gy |   |Gn |Gy |
  3  |Gn |   |Gy |Gn |Gn |Gy |Gn |
  2  |Gy |Gy |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | Gn17 | Gy14 |      | Gn31 | (gn) |
  5  | Gy32 |      | Gy16 | Gn 9 | [Gy] | Gn29 | Gy30 |
  4  | Gy22 | [Gy] | Gy10 | Gy 4 | <Gn> | Gn27 | Gy28 |
  3  | Gn21 |      | Gy 8 | Gn 3 | Gn33 | Gy26 | Gn25 |
  2  | Gy18 | Gy20 | Gn 7 | Gy 2 | Gn23 | Gn13 | Gy24 |
  1  | Gn15 | Gn19 | Gy 6 | Gn 1 | Gn 5 | Gn11 | Gy12 |

  ht |   5  |   2  |   6  |   6  |   3  |   6  |   5  |  (discs in column)
 par |  1O  |  4E  |  0E  |  0E  |  3O  |  0E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gy)   col5 row4 (Gn) [GT]   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 33  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gy |   |Gn |   |
  5  |Gy |   |Gy |Gn |   |Gn |Gy |
  4  |Gy |   |Gy |Gy |   |Gn |Gy |
  3  |Gn |Gn |Gy |Gn |   |Gy |Gn |
  2  |Gy |Gy |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gy) | Gn17 | Gy14 |      | Gn31 | (gn) |
  5  | Gy32 |      | Gy16 | Gn 9 | [Gy] | Gn29 | Gy30 |
  4  | Gy22 | <Gy> | Gy10 | Gy 4 | [Gn] | Gn27 | Gy28 |
  3  | Gn21 | Gn33 | Gy 8 | Gn 3 | (*)  | Gy26 | Gn25 |
  2  | Gy18 | Gy20 | Gn 7 | Gy 2 | Gn23 | Gn13 | Gy24 |
  1  | Gn15 | Gn19 | Gy 6 | Gn 1 | Gn 5 | Gn11 | Gy12 |

  ht |   5  |   3  |   6  |   6  |   2  |   6  |   5  |  (discs in column)
 par |  1O  |  3O  |  0E  |  0E  |  4E  |  0E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gy) [GT]   col5 row4 (Gn)   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r3.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: That move handed your opponent an immediate win.

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c5r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col2]column 2[/zone:col2], you gave your opponent the direct landing spot at [zone:c2r4]that cell[/zone:c2r4], which is an [term:immediate_threat]immediate threat[/term:immediate_threat] on the very next turn. The better move was [zone:col5]column 5[/zone:col5]: it would have let you place on [zone:c5r3]that cell[/zone:c5r3] and keep control of [zone:c5r4]that cell[/zone:c5r4], instead of handing your opponent that one-move win.
```

### eval-5 — drawing_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 0  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      |      |      |      |

  ht |   0  |   0  |   0  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 5):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
This was a drawing move: the position is a draw, not a win for either side. Do NOT claim you or your opponent had a winning position or a winning line — explain only the loss of the move that would have held the draw.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a move that would have kept the draw balance, but [zone:col5]column 5[/zone:col5] gave that away by spending your disc on [zone:c5r1]that cell[/zone:c5r1] instead of [zone:col4]column 4[/zone:col4]. The missed idea was [term:parity]parity[/term:parity]: playing [zone:col4]column 4[/zone:col4] would have preserved the safer even-odd structure, while your move shifted the balance in a way that was less favorable for you.
```

### eval-6 — j_shape (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |Gy |Gn |Gy |   |   |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      |      | (gy) |      |
  4  | (gy) | (gn) | (gy) | Gn 9 | [Gy] | (gn) | (gy) |
  3  |      | (gy) | (gn) | Gy 8 | (gn) | (gy) |      |
  2  |      |      | Gy12 | Gn 7 | Gy 4 | (gn) |      |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   1  |   2  |   4  |   2  |   1  |   1  |  (discs in column)
 par |  5O  |  5O  |  4E  |  2E  |  4E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gn |Gy |   |   |   |
  2  |   |   |Gy |Gn |Gy |   |   |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      | (gn) |      |
  5  | (gn) | (gy) |      |      | (gn) | (gy) |      |
  4  | (gy) | [Gn] | (gy) | Gn 9 | [Gy] | (gn) | (gy) |
  3  |      | (gy) | Gn13 | Gy 8 | (gn) | (gy) |      |
  2  |      | (gn) | Gy12 | Gn 7 | Gy 4 | (gn) |      |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   1  |   3  |   4  |   2  |   1  |   1  |  (discs in column)
 par |  5O  |  5O  |  3O  |  2E  |  4E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gn)   col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |Gn |Gy |Gn |Gy |   |   |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gn) | (gy) |      |
  4  | (gy) | (gn) | (gy) | Gn 9 | [Gy] | (gn) | (gy) |
  3  |      | (gy) | (gn) | Gy 8 | (gn) | (gy) |      |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) |      |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   2  |   2  |   4  |   2  |   1  |   1  |  (discs in column)
 par |  5O  |  4E  |  4E  |  2E  |  4E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You let your opponent build a J-shape trap.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: 0

After the best move (column 3):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 2):
- Your major threats: 0

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c4r1, c3r2, c4r3, c3r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col2]column 2[/zone:col2], you put your disc on [zone:c2r2]that cell[/zone:c2r2] and let your opponent keep the [term:j_shape]j shape[/term:j_shape] idea alive around the center instead of taking away its setup. The better move was [zone:col3]column 3[/zone:col3]: by playing [zone:c3r3]that cell[/zone:c3r3], you would have built your own odd-row threat, raising your major threats from 0 to [zone:windows:c2r4]1[/zone:windows:c2r4] while your move left you at 0.
```

### eval-7 — double_threat (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gy |   |   |   |
  2  |   |Gn |Gy |Gn |Gy |   |   |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) | (gy) |      |      | (gy) |      |
  4  | (gy) |      | (gy) | Gn 9 | [Gy] | (gn) | (gy) |
  3  | (gy) | (gy) | Gy14 | Gy 8 | (*)  | (gy) |      |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) |      |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   2  |   3  |   4  |   2  |   1  |   1  |  (discs in column)
 par |  5O  |  4E  |  3O  |  2E  |  4E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |Gn |Gy |Gy |   |   |   |
  2  |   |Gn |Gy |Gn |Gy |   |   |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (*)  | (gy) |      |      | (gy) |      |
  4  |      | (gn) | (gy) | Gn 9 | [Gy] | (gn) | (gy) |
  3  |      | Gn15 | Gy14 | Gy 8 | (*)  | (gy) |      |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) |      |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   3  |   3  |   4  |   2  |   1  |   1  |  (discs in column)
 par |  5O  |  3O  |  3O  |  2E  |  4E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gy |   |   |   |
  2  |   |Gn |Gy |Gn |Gy |   |Gn |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) | (gy) |      |      | (gy) |      |
  4  | (gy) |      | (gy) | Gn 9 | [Gy] | (gn) | (*)  |
  3  | (gy) | (gy) | Gy14 | Gy 8 | (*)  | (gy) | (gn) |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) | Gn15 |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   2  |   3  |   4  |   2  |   1  |   2  |  (discs in column)
 par |  5O  |  4E  |  3O  |  2E  |  4E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 7
- Your move placed a disc on c7r2.
- Better move: column 2
- The better move places a disc on c2r3.
- Key insight: Your move let your opponent set up two winning threats at once.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]9[/zone:opponent-minor-pre]

After the best move (column 2):
- Opponent minor threats: [zone:opponent-minor-best]6[/zone:opponent-minor-best]

After the move played (column 7):
- Opponent minor threats: [zone:opponent-minor-played]9[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c5r3, c2r1, c3r2, c2r3, c3r3, c4r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col7]column 7[/zone:col7], you let your opponent keep a [term:double_threat]double threat[/term:double_threat] idea alive on the board and left them with [zone:windows:c1r3|c1r4|c2r3|c2r5|c3r4|c3r5|c5r3|c6r3|c7r4]9[/zone:windows:c1r3|c1r4|c2r3|c2r5|c3r4|c3r5|c5r3|c6r3|c7r4] minor threats, instead of trimming that to [zone:windows:c2r5|c3r4|c3r5|c5r3|c6r3|c7r4]6[/zone:windows:c2r5|c3r4|c3r5|c5r3|c6r3|c7r4]. If you had played [zone:col2]column 2[/zone:col2], your disc would have gone on [zone:c2r3]that cell[/zone:c2r3] and taken away more of your opponent’s setup, making it much harder for them to keep two winning plans alive at once.
```

### eval-8 — immediate_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |Gy |Gy |Gy |   |   |Gn |
  2  |   |Gn |Gy |Gn |Gy |   |Gn |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) | (gy) |      |      | (gy) | (gn) |
  4  | [Gy] |      | (gy) | Gn 9 | [Gy] | (gn) | <Gn> |
  3  | [Gy] | Gy16 | Gy14 | Gy 8 | <Gy> | (gy) | Gn17 |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) | Gn15 |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   3  |   3  |   4  |   2  |   1  |   3  |  (discs in column)
 par |  5O  |  3O  |  3O  |  2E  |  4E  |  5O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy)   col1 row4 (Gy)   col5 row3 (Gy) [GT]   col5 row4 (Gy)   col7 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 18  |  Next: Green  [GAME OVER]

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |Gy |Gy |Gy |Gy |   |Gn |
  2  |   |Gn |Gy |Gn |Gy |   |Gn |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) | (gy) |      | (gy) | (gy) | (gn) |
  4  | [Gy] |      | (gy) | Gn 9 | <Gy> |      | <Gn> |
  3  | [Gy] | Gy16 | Gy14 | Gy 8 | Gy18 | [Gy] | Gn17 |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 |      | Gn15 |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   3  |   3  |   4  |   3  |   1  |   3  |  (discs in column)
 par |  5O  |  3O  |  3O  |  2E  |  3O  |  5O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy)   col1 row4 (Gy)   col5 row4 (Gy) [GT]   col6 row3 (Gy)   col7 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |Gy |
  3  |   |Gy |Gy |Gy |   |   |Gn |
  2  |   |Gn |Gy |Gn |Gy |   |Gn |
  1  |Gy |Gy |Gn |Gy |Gn |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) | (gy) |      |      | (gy) |      |
  4  | [Gy] |      | (gy) | Gn 9 | [Gy] | (gn) | Gy18 |
  3  | [Gy] | Gy16 | Gy14 | Gy 8 | <Gy> | [Gy] | Gn17 |
  2  |      | Gn13 | Gy12 | Gn 7 | Gy 4 | (gn) | Gn15 |
  1  | Gy10 | Gy 2 | Gn11 | Gy 6 | Gn 1 | Gn 5 | Gn 3 |

  ht |   1  |   3  |   3  |   4  |   2  |   1  |   4  |  (discs in column)
 par |  5O  |  3O  |  3O  |  2E  |  4E  |  5O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy)   col1 row4 (Gy)   col5 row3 (Gy) [GT]   col5 row4 (Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r4.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: You had a winning move right there and didn't take it.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col5]column 5[/zone:col5], [zone:col1]column 1[/zone:col1]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r3, c2r1, c3r2, c2r3, c3r3, c4r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed a [term:immediate_threat]immediate threat[/term:immediate_threat] in [zone:col5]column 5[/zone:col5]: playing there yourself would have landed on [zone:c5r3]that cell[/zone:c5r3] and finished the game right away. By choosing [zone:col7]column 7[/zone:col7] instead, you only filled [zone:c7r4]that cell[/zone:c7r4] and gave up the chance to end it on the spot.
```

### eval-9 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |Gy |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      | Gy12 |      |
  4  |      |      |      | Gy 4 |      | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) |      | Gy 2 |      | Gn 7 |      |
  1  | Gy10 | (gn) | Gn11 | Gn 1 | (gn) | Gy 6 |      |

  ht |   1  |   0  |   1  |   5  |   0  |   5  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  1O  |  6E  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |Gy |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |Gn |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      | Gy12 |      |
  4  |      |      |      | Gy 4 | (gn) | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) | (gn) | Gy 2 |      | Gn 7 |      |
  1  | Gy10 | Gn13 | Gn11 | Gn 1 | <Gn> | Gy 6 |      |

  ht |   1  |   1  |   1  |   5  |   0  |   5  |   0  |  (discs in column)
 par |  5O  |  5O  |  5O  |  1O  |  6E  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |Gy |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |Gn |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      | Gy12 |      |
  4  |      |      |      | Gy 4 |      | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) |      | Gy 2 |      | Gn 7 |      |
  1  | Gy10 | <Gn> | Gn11 | Gn 1 | Gn13 | Gy 6 |      |

  ht |   1  |   0  |   1  |   5  |   1  |   5  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  1O  |  5O  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 2
- The better move places a disc on c2r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 2):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 5):
- Your minor threats: 0

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c5r1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
This was a drawing move: the position is a draw, not a win for either side. Do NOT claim you or your opponent had a winning position or a winning line — explain only the loss of the move that would have held the draw.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r1]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You should have played [zone:col2]column 2[/zone:col2] instead of [zone:col5]column 5[/zone:col5], because that move would have kept your [term:minor_threat]minor threat[/term:minor_threat] count at [zone:windows:c2r1|c5r1]2[/zone:windows:c2r1|c5r1] rather than dropping it to 0. It also would have kept [zone:c5r1]that cell[/zone:c5r1] as an [term:immediate_threat]immediate threat[/term:immediate_threat] on the board, while your move to [zone:c5r1]that cell[/zone:c5r1] removed that pressure and gave away the draw-keeping balance.
```

### eval-10 — suboptimal_move (sev 1) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      | Gn 3 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      | (gn) | (gn) | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   2  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r3.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 5):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave ground by playing [zone:col5]column 5[/zone:col5] and settling on [zone:c5r1]that cell[/zone:c5r1] instead of using [zone:col4]column 4[/zone:col4] to take [zone:c4r3]that cell[/zone:c4r3]. The better move would have built your [term:minor_threat]minor threat[/term:minor_threat] on [zone:row3]row 3[/zone:row3], while your move only added a low [zone:c5r1]that cell[/zone:c5r1] on [zone:row1]row 1[/zone:row1] and left you with less room to press your plan.
```

### eval-11 — immediate_threat (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gy |   |Gy |Gy |Gn |   |   |
  1  |Gn |   |Gy |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      |      |      |      | (gy) |
  4  |      |      | (*)  |      |      | [Gy] | (gn) |
  3  |      |      | (gy) | Gn 5 | Gy 8 | (gn) |      |
  2  | Gy10 | [Gy] | Gy 6 | Gy 2 | Gn 7 |      |      |
  1  | Gn 9 |      | Gy 4 | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   2  |   0  |   2  |   3  |   3  |   0  |   0  |  (discs in column)
 par |  4E  |  6E  |  4E  |  3O  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gy |   |Gy |Gy |Gn |   |   |
  1  |Gn |   |Gy |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (gn) |      |      | (gy) |
  4  |      |      | (*)  | Gn11 |      | [Gy] | (gn) |
  3  |      |      | (*)  | Gn 5 | Gy 8 | (gn) |      |
  2  | Gy10 | [Gy] | Gy 6 | Gy 2 | Gn 7 |      |      |
  1  | Gn 9 |      | Gy 4 | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   2  |   0  |   2  |   4  |   3  |   0  |   0  |  (discs in column)
 par |  4E  |  6E  |  4E  |  2E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gy |   |Gy |Gy |Gn |   |   |
  1  |Gn |Gn |Gy |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      |      |      |      | (gy) |
  4  |      |      | (*)  |      |      | [Gy] | (gn) |
  3  |      |      | (gy) | Gn 5 | Gy 8 | (gn) |      |
  2  | Gy10 | <Gy> | Gy 6 | Gy 2 | Gn 7 |      |      |
  1  | Gn 9 | Gn11 | Gy 4 | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   2  |   1  |   2  |   3  |   3  |   0  |   0  |  (discs in column)
 par |  4E  |  5O  |  4E  |  3O  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy) [GT]   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r4.
- Key insight: That move handed your opponent an immediate win.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col2]column 2[/zone:col2], you dropped on [zone:c2r1]that cell[/zone:c2r1] and let your opponent keep the immediate threat on [zone:col2]column 2[/zone:col2]: they still have [term:immediate_threat]an immediate threat[/term:immediate_threat] at [zone:c2r2]that cell[/zone:c2r2], and that’s the kind of mistake that can hand over the game at once. The better move was [zone:col4]column 4[/zone:col4], which would have put your disc on [zone:c4r4]that cell[/zone:c4r4] and kept the position under control instead of giving your opponent a direct winning chance.
```

### eval-12 — drawing_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 0  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      |      |      |      |

  ht |   0  |   0  |   0  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 |      |      |      |      |

  ht |   0  |   0  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 3):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
This was a drawing move: the position is a draw, not a win for either side. Do NOT claim you or your opponent had a winning position or a winning line — explain only the loss of the move that would have held the draw.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave up the [term:parity]parity[/term:parity] balance by playing [zone:col3]column 3[/zone:col3], because that put your disc on [zone:c3r1]that cell[/zone:c3r1] and left the key odd-row landing in the wrong place. The better move was [zone:col4]column 4[/zone:col4], which would have placed your disc on [zone:c4r1]that cell[/zone:c4r1] and kept the position drawn for you.
```

### eval-14 — suboptimal_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |Gn |   |
  3  |   |Gy |   |Gn |   |Gy |   |
  2  |   |Gn |   |Gy |   |Gn |   |
  1  |   |Gy |   |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      | Gn 9 |      | Gy 4 |      | Gn13 |      |
  3  |      | Gy 8 |      | Gn 3 |      | Gy12 |      |
  2  |      | Gn 7 |      | Gy 2 |      | Gn11 |      |
  1  |      | Gy 6 |      | Gn 1 |      | Gy10 |      |

  ht |   0  |   4  |   0  |   5  |   0  |   4  |   0  |  (discs in column)
 par |  6E  |  2E  |  6E  |  1O  |  6E  |  2E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |Gn |   |
  3  |   |Gy |   |Gn |   |Gy |   |
  2  |   |Gn |   |Gy |   |Gn |   |
  1  |   |Gy |   |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy14 |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      | Gn 9 |      | Gy 4 |      | Gn13 |      |
  3  |      | Gy 8 |      | Gn 3 |      | Gy12 |      |
  2  |      | Gn 7 |      | Gy 2 |      | Gn11 |      |
  1  |      | Gy 6 |      | Gn 1 |      | Gy10 |      |

  ht |   0  |   4  |   0  |   6  |   0  |   4  |   0  |  (discs in column)
 par |  6E  |  2E  |  6E  |  0E  |  6E  |  2E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |Gn |   |
  3  |   |Gy |   |Gn |   |Gy |   |
  2  |   |Gn |   |Gy |   |Gn |   |
  1  |   |Gy |   |Gn |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      | Gn 9 |      | Gy 4 |      | Gn13 |      |
  3  |      | Gy 8 |      | Gn 3 |      | Gy12 |      |
  2  |      | Gn 7 |      | Gy 2 |      | Gn11 |      |
  1  |      | Gy 6 |      | Gn 1 | Gy14 | Gy10 |      |

  ht |   0  |   4  |   0  |   5  |   1  |   4  |   0  |  (discs in column)
 par |  6E  |  2E  |  6E  |  1O  |  5O  |  2E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 5):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
Your move in [zone:col5]column 5[/zone:col5] was a small inaccuracy because it only filled [zone:c5r1]that cell[/zone:c5r1] and gave up the chance to take the stronger [term:gravity_top]gravity top[/term:gravity_top] in [zone:col4]column 4[/zone:col4]. If you had played there, you would have claimed [zone:c4r6]that cell[/zone:c4r6] instead, keeping better control of the top side and making your position harder to ignore on the even rows you need.
```

### eval-15 — suboptimal_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 24  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gn |   |Gy |   |
  5  |   |Gy |   |Gn |   |Gn |   |
  4  |   |Gn |   |Gy |   |Gn |   |
  3  |   |Gy |   |Gn |   |Gy |Gy |
  2  |   |Gn |   |Gy |Gn |Gn |Gn |
  1  |Gy |Gy |   |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gn23 | (gn) | Gn17 | (gn) | Gy16 | (gn) |
  5  |      | Gy20 | (gn) | Gn 5 | (*)  | Gn15 | (gn) |
  4  |      | Gn 9 |      | Gy 4 | (gn) | Gn13 |      |
  3  | (gn) | Gy 8 | (gy) | Gn 3 |      | Gy12 | Gy22 |
  2  |      | Gn 7 | (gn) | Gy 2 | Gn19 | Gn11 | Gn21 |
  1  | Gy24 | Gy 6 |      | Gn 1 | Gy14 | Gy10 | Gy18 |

  ht |   1  |   6  |   0  |   6  |   2  |   6  |   3  |  (discs in column)
 par |  5O  |  0E  |  6E  |  0E  |  4E  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 25  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gn |   |Gy |   |
  5  |   |Gy |   |Gn |   |Gn |   |
  4  |   |Gn |   |Gy |   |Gn |   |
  3  |   |Gy |   |Gn |   |Gy |Gy |
  2  |   |Gn |   |Gy |Gn |Gn |Gn |
  1  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gn23 | (gn) | Gn17 | (gn) | Gy16 | (gn) |
  5  |      | Gy20 | (gn) | Gn 5 | (*)  | Gn15 | (gn) |
  4  |      | Gn 9 |      | Gy 4 | (gn) | Gn13 |      |
  3  | (gn) | Gy 8 | (gy) | Gn 3 |      | Gy12 | Gy22 |
  2  |      | Gn 7 | (gn) | Gy 2 | Gn19 | Gn11 | Gn21 |
  1  | Gy24 | Gy 6 | Gn25 | Gn 1 | Gy14 | Gy10 | Gy18 |

  ht |   1  |   6  |   1  |   6  |   2  |   6  |   3  |  (discs in column)
 par |  5O  |  0E  |  5O  |  0E  |  4E  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 25  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gn |   |Gy |   |
  5  |   |Gy |   |Gn |   |Gn |   |
  4  |   |Gn |   |Gy |   |Gn |Gn |
  3  |   |Gy |   |Gn |   |Gy |Gy |
  2  |   |Gn |   |Gy |Gn |Gn |Gn |
  1  |Gy |Gy |   |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gn23 | (gn) | Gn17 | (gn) | Gy16 | (gn) |
  5  |      | Gy20 | (gn) | Gn 5 | (*)  | Gn15 | (gn) |
  4  |      | Gn 9 |      | Gy 4 | (gn) | Gn13 | Gn25 |
  3  | (gn) | Gy 8 | (gy) | Gn 3 |      | Gy12 | Gy22 |
  2  |      | Gn 7 | (gn) | Gy 2 | Gn19 | Gn11 | Gn21 |
  1  | Gy24 | Gy 6 |      | Gn 1 | Gy14 | Gy10 | Gy18 |

  ht |   1  |   6  |   0  |   6  |   2  |   6  |   4  |  (discs in column)
 par |  5O  |  0E  |  6E  |  0E  |  4E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r4.
- Better move: column 3
- The better move places a disc on c3r1.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 3):


After the move played (column 7):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave ground by playing [zone:col7]column 7[/zone:col7] instead of taking [zone:col3]column 3[/zone:col3], which would have let you place on [zone:c3r1]that cell[/zone:c3r1] and keep your best shape on the bottom row. The better move preserved your [term:minor_threat]minor threat[/term:minor_threat] setup there, while your actual move shifted the new disc to [zone:c7r4]that cell[/zone:c7r4] and left that plan unused.
```

### eval-16 — drawing_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 0  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      |      |      |      |

  ht |   0  |   0  |   0  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 5):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
This was a drawing move: the position is a draw, not a win for either side. Do NOT claim you or your opponent had a winning position or a winning line — explain only the loss of the move that would have held the draw.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave up a [term:gravity_top]gravity top[/term:gravity_top] hold by playing [zone:col5]column 5[/zone:col5], where your disc landed on [zone:c5r1]that cell[/zone:c5r1] and left [zone:col4]column 4[/zone:col4] untouched. The better move would have been to play [zone:col4]column 4[/zone:col4], placing your disc on [zone:c4r1]that cell[/zone:c4r1] and keeping the balance that held at least a draw.
```

### eval-17 — suboptimal_move (sev 0) [sparse]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gy |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gy 2 |      | Gn 1 |      |      |

  ht |   0  |   0  |   1  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |Gn |   |   |   |   |
  1  |   |   |Gy |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      | Gn 3 |      |      |      |      |
  1  |      |      | Gy 2 |      | Gn 1 |      |      |

  ht |   0  |   0  |   2  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gy |   |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gy 2 | (gn) | Gn 1 | Gn 3 | (gn) |

  ht |   0  |   0  |   1  |   0  |   1  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  5O  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 3
- The better move places a disc on c3r2.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 3):


After the move played (column 6):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
Your move in [zone:col6]column 6[/zone:col6] only took [zone:c6r1]that cell[/zone:c6r1], while the stronger play in [zone:col3]column 3[/zone:col3] would have taken [zone:c3r2]that cell[/zone:c3r2] and built a [term:minor_threat]minor threat[/term:minor_threat] for you. By choosing [zone:col6]column 6[/zone:col6] instead, you gave ground and missed the chance to keep a stronger attacking plan on [zone:row2]row 2[/zone:row2] and [zone:col3]column 3[/zone:col3].
```

### eval-18 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |Gy |   |
  1  |   |   |Gy |   |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      | Gy 4 |      |
  1  |      |      | Gy 2 | (gn) | Gn 1 | Gn 3 | (gn) |

  ht |   0  |   0  |   1  |   0  |   1  |   2  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |Gy |   |
  1  |   |   |Gy |Gn |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      | Gy 4 |      |
  1  |      |      | Gy 2 | Gn 5 | Gn 1 | Gn 3 | <Gn> |

  ht |   0  |   0  |   1  |   1  |   1  |   2  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col7 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |Gy |   |
  1  |   |Gn |Gy |   |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      | Gy 4 |      |
  1  |      | Gn 5 | Gy 2 | (gn) | Gn 1 | Gn 3 | (gn) |

  ht |   0  |   1  |   1  |   0  |   1  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  6E  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 2):


## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c7r1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c7r1]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave away the stronger [term:immediate_threat]immediate threat[/term:immediate_threat] on [zone:c7r1]that cell[/zone:c7r1]: by playing [zone:col2]column 2[/zone:col2], you put your disc on [zone:c2r1]that cell[/zone:c2r1] but left that winning chance sitting there instead of taking it yourself. The better move was [zone:col4]column 4[/zone:col4], which would have placed your disc on [zone:c4r1]that cell[/zone:c4r1] and kept the direct winning line available on the bottom row.
```

### eval-20 — suboptimal_move (sev 0) [sparse] [look-ahead fired]
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gy |   |   |   |   |   |
  2  |   |Gy |   |Gn |   |Gy |   |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gn) |      |      |      |      |      |      |
  4  |      | Gn11 |      | (*)  |      |      |      |
  3  |      | Gy10 | [Gn] | (gn) | (gy) |      |      |
  2  |      | Gy 6 |      | Gn 9 |      | Gy 4 |      |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   2  |   1  |   2  |   1  |  (discs in column)
 par |  6E  |  2E  |  5O  |  4E  |  5O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gy |   |   |   |Gy |   |
  2  |   |Gy |   |Gn |   |Gy |   |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gn) |      |      |      |      | (gy) |      |
  4  |      | Gn11 |      | (*)  |      | (gy) |      |
  3  |      | Gy10 | [Gn] | (gn) | (gy) | Gy12 |      |
  2  |      | Gy 6 |      | Gn 9 |      | Gy 4 |      |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   2  |   1  |   3  |   1  |  (discs in column)
 par |  6E  |  2E  |  5O  |  4E  |  5O  |  3O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gy |   |Gy |   |   |   |
  2  |   |Gy |   |Gn |   |Gy |   |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gn) |      |      |      |      |      |      |
  4  |      | Gn11 |      | (gy) |      |      |      |
  3  | (gy) | Gy10 | [Gn] | Gy12 | (gy) |      |      |
  2  |      | Gy 6 |      | Gn 9 |      | Gy 4 |      |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   3  |   1  |   2  |   1  |  (discs in column)
 par |  6E  |  2E  |  5O  |  3O  |  5O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 4
- Your move placed a disc on c4r3.
- Better move: column 6
- The better move places a disc on c6r3.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 6):


After the move played (column 4):


## What the better move leads to

This is a future possibility, not a fact on the board yet. If your opponent does not defend perfectly, the better move lets you reach a winning move:
- [zone:future-immediate_threat-1]one way to reach it[/zone:future-immediate_threat-1]
Describe it as something you could build next, never as already present.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col6]column 6[/zone:col6]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave ground by playing [zone:col4]column 4[/zone:col4] instead of [zone:col6]column 6[/zone:col6], which was the stronger [term:major_threat]major threat[/term:major_threat] move. The better move would have let you build a winning line with your next play, while your move on [zone:col4]column 4[/zone:col4] only placed a disc on [zone:c4r3]that cell[/zone:c4r3] and did not create that same immediate pressure.
```

### eval-21 — forced_block (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |Gn |Gy |   |
  3  |   |Gy |   |Gy |Gy |Gn |   |
  2  |   |Gy |   |Gn |Gy |Gy |Gn |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      |      |      |      |
  5  | (gn) | (gy) |      | <Gn> |      |      |      |
  4  | (gn) | Gn11 | [Gn] | Gn15 | Gn17 | Gy18 |      |
  3  | (gy) | Gy10 | [*]  | Gy12 | Gy16 | Gn13 |      |
  2  |      | Gy 6 |      | Gn 9 | Gy14 | Gy 4 | Gn19 |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   4  |   4  |   4  |   2  |  (discs in column)
 par |  6E  |  2E  |  5O  |  2E  |  2E  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy)   col3 row4 (Gn)   col4 row5 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |Gn |   |Gn |Gn |Gy |   |
  3  |   |Gy |   |Gy |Gy |Gn |   |
  2  |   |Gy |   |Gn |Gy |Gy |Gn |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | (gy) |      |      |
  5  | (gn) | (gy) |      | Gy20 |      |      |      |
  4  | (gn) | Gn11 | [Gn] | Gn15 | Gn17 | Gy18 |      |
  3  | (gy) | Gy10 | [*]  | Gy12 | Gy16 | Gn13 |      |
  2  | (gy) | Gy 6 |      | Gn 9 | Gy14 | Gy 4 | Gn19 |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   5  |   4  |   4  |   2  |  (discs in column)
 par |  6E  |  2E  |  5O  |  1O  |  2E  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy)   col3 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |Gy |   |
  4  |   |Gn |   |Gn |Gn |Gy |   |
  3  |   |Gy |   |Gy |Gy |Gn |   |
  2  |   |Gy |   |Gn |Gy |Gy |Gn |
  1  |   |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      |      |      |      |
  5  | (gn) | (gy) |      | <Gn> |      | Gy20 |      |
  4  | (gn) | Gn11 | [Gn] | Gn15 | Gn17 | Gy18 |      |
  3  | (gy) | Gy10 | [*]  | Gy12 | Gy16 | Gn13 |      |
  2  |      | Gy 6 |      | Gn 9 | Gy14 | Gy 4 | Gn19 |
  1  |      | Gn 5 | Gy 2 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   0  |   4  |   1  |   4  |   4  |   5  |   2  |  (discs in column)
 par |  6E  |  2E  |  5O  |  2E  |  2E  |  1O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy)   col3 row4 (Gn)   col4 row5 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r5.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]4[/zone:player-minor-best]

After the move played (column 6):
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c4r5]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed a [term:forced_block]forced block[/term:forced_block]: [zone:cells:c4r5]that cell[/zone:cells:c4r5] was your opponent’s direct threat, so [zone:col6]column 6[/zone:col6] did nothing to stop the immediate danger. If you had played [zone:col4]column 4[/zone:col4] instead, you would have occupied that key square yourself and also kept more of your own buildup alive — your minor threats would have been [zone:windows:c1r2|c2r5|c3r4|c5r6]4[/zone:windows:c1r2|c2r5|c3r4|c5r6] rather than staying at [zone:windows:c2r5|c3r4]2[/zone:windows:c2r5|c3r4].
```

### eval-22 — forced_block (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gn |Gn |   |Gy |Gy |   |Gy |
  1  |Gn |Gy |   |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      |      |      |      |
  5  |      |      | (gy) | Gn 9 | (gy) |      | (gy) |
  4  | (gn) | (gy) | (gn) | Gy 4 | <Gy> | (gy) |      |
  3  | (gn) | (gn) | (gy) | Gn 3 | Gy14 |      |      |
  2  | Gn11 | Gn13 | (gy) | Gy 2 | Gy 8 | [Gy] | Gy10 |
  1  | Gn 7 | Gy12 | (gy) | Gn 1 | Gy 6 |      | Gn 5 |

  ht |   2  |   2  |   0  |   5  |   3  |   0  |   2  |  (discs in column)
 par |  4E  |  4E  |  6E  |  1O  |  3O  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy) [GT]   col6 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |Gn |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gn |Gn |   |Gy |Gy |   |Gy |
  1  |Gn |Gy |   |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) | (gn) |      |      |      | (gn) |
  5  |      |      | (gy) | Gn 9 |      | (gn) | (gy) |
  4  | (gn) | (gy) | (gn) | Gy 4 | Gn15 | (gy) |      |
  3  | (gn) | (gn) | (gy) | Gn 3 | Gy14 | (gn) |      |
  2  | Gn11 | Gn13 | (*)  | Gy 2 | Gy 8 | [Gy] | Gy10 |
  1  | Gn 7 | Gy12 | (gy) | Gn 1 | Gy 6 |      | Gn 5 |

  ht |   2  |   2  |   0  |   5  |   4  |   0  |   2  |  (discs in column)
 par |  4E  |  4E  |  6E  |  1O  |  2E  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col6 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |Gn |Gn |   |Gy |Gy |   |Gy |
  1  |Gn |Gy |Gn |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      |      |      |      |
  5  |      |      | (gy) | Gn 9 | (gy) |      | (gy) |
  4  | (gn) | (gy) | (gn) | Gy 4 | <Gy> | (gy) |      |
  3  | (gn) | (gn) | (gy) | Gn 3 | Gy14 |      |      |
  2  | Gn11 | Gn13 | (gy) | Gy 2 | Gy 8 | [Gy] | Gy10 |
  1  | Gn 7 | Gy12 | Gn15 | Gn 1 | Gy 6 |      | Gn 5 |

  ht |   2  |   2  |   1  |   5  |   3  |   0  |   2  |  (discs in column)
 par |  4E  |  4E  |  5O  |  1O  |  3O  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy) [GT]   col6 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 5
- The better move places a disc on c5r4.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]9[/zone:player-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c5r4]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed a [term:forced_block]forced block[/term:forced_block]: your opponent had a live win on [zone:c5r4]that cell[/zone:c5r4], so playing [zone:col3]column 3[/zone:col3] let the danger stay on the board instead of stopping it. The better move was to play [zone:col5]column 5[/zone:col5], which would have dropped your disc on [zone:c5r4]that cell[/zone:c5r4] and held your opponent’s immediate win in check; it also would have built your own minor threats from [zone:windows:c1r3|c1r4|c2r3|c3r4]4[/zone:windows:c1r3|c1r4|c2r3|c3r4] to [zone:windows:c1r3|c1r4|c2r3|c3r2|c3r4|c3r6|c6r3|c6r5|c7r6]9[/zone:windows:c1r3|c1r4|c2r3|c3r2|c3r4|c3r6|c6r3|c6r5|c7r6], while your played move left you at [zone:windows:c1r3|c1r4|c2r3|c3r4]4[/zone:windows:c1r3|c1r4|c2r3|c3r4].
```

### eval-23 — j_shape (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |Gy |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |   |   |
  3  |   |Gn |Gn |Gy |   |Gy |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gy |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gy) |      |      |      | (gn) |      |      |
  5  |      | Gy14 |      | Gn11 |      | (gy) |      |
  4  |      | Gn13 | (*)  | Gy10 | [Gy] |      |      |
  3  |      | Gn 9 | Gn17 | Gy 8 | (gy) | Gy16 | (gy) |
  2  | (gn) | Gn 7 | Gy12 | Gy 6 | (gy) | Gn 5 |      |
  1  | Gn15 | Gy 4 | Gn 1 | Gn 3 |      | Gy 2 |      |

  ht |   1  |   5  |   3  |   5  |   0  |   3  |   0  |  (discs in column)
 par |  5O  |  1O  |  3O  |  1O  |  6E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |Gy |   |Gn |   |   |   |
  4  |   |Gn |Gy |Gy |   |   |   |
  3  |   |Gn |Gn |Gy |   |Gy |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gy |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  | [Gy] |      |      |      |      |      |      |
  5  |      | Gy14 |      | Gn11 |      | (gy) |      |
  4  |      | Gn13 | Gy18 | Gy10 | [Gy] | (gy) |      |
  3  |      | Gn 9 | Gn17 | Gy 8 | (gy) | Gy16 | (gy) |
  2  |      | Gn 7 | Gy12 | Gy 6 | [Gy] | Gn 5 |      |
  1  | Gn15 | Gy 4 | Gn 1 | Gn 3 |      | Gy 2 |      |

  ht |   1  |   5  |   4  |   5  |   0  |   3  |   0  |  (discs in column)
 par |  5O  |  1O  |  2E  |  1O  |  6E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col1 row6 (Gy)   col5 row2 (Gy)   col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |   |   |
  3  |   |Gn |Gn |Gy |   |Gy |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gy |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy18 |      |      | (gn) |      |      |
  5  |      | Gy14 | (gy) | Gn11 |      | (gy) |      |
  4  |      | Gn13 | (*)  | Gy10 | [Gy] |      |      |
  3  |      | Gn 9 | Gn17 | Gy 8 | (gy) | Gy16 | (gy) |
  2  | (gn) | Gn 7 | Gy12 | Gy 6 | (gy) | Gn 5 |      |
  1  | Gn15 | Gy 4 | Gn 1 | Gn 3 |      | Gy 2 |      |

  ht |   1  |   6  |   3  |   5  |   0  |   3  |   0  |  (discs in column)
 par |  5O  |  0E  |  3O  |  1O  |  6E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r6.
- Better move: column 3
- The better move places a disc on c3r4.
- Key insight: You had a J-shape trap available and didn't use it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Opponent minor threats: [zone:opponent-minor-pre]3[/zone:opponent-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]3[/zone:player-major-best]
- Opponent minor threats: 0

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Opponent minor threats: [zone:opponent-minor-played]3[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- j_shape: cells [c3r2, c4r3, c3r4, c4r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r2, c4r3, c3r4, c4r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:j_shape]j shape[/term:j_shape] available, and playing [zone:col2]column 2[/zone:col2] only put a disc on [zone:c2r6]that cell[/zone:c2r6] instead of taking the more active placement in [zone:col3]column 3[/zone:col3] at [zone:c3r4]that cell[/zone:c3r4]. The better move would have built your major threats from [zone:windows:c5r4]1[/zone:windows:c5r4] to [zone:windows:c1r6|c5r2|c5r4]3[/zone:windows:c1r6|c5r2|c5r4] and cut your opponent’s minor threats from [zone:windows:c1r2|c3r4|c5r6]3[/zone:windows:c1r2|c3r4|c5r6] to 0, while your move left your major threats at [zone:windows:c5r4]1[/zone:windows:c5r4] and kept your opponent at [zone:windows:c1r2|c3r4|c5r6]3[/zone:windows:c1r2|c3r4|c5r6].
```

### eval-24 — undercut (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |Gy |   |
  3  |   |Gy |   |Gn |   |Gn |Gn |
  2  |   |Gn |   |Gy |   |Gn |Gy |
  1  |   |Gy |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      |      | (gn) | (gn) | (gn) |      | (gy) |
  4  |      |      | (gn) | Gn 9 |      | Gy14 | (gn) |
  3  |      | Gy 8 | (gn) | Gn 7 | [*]  | Gn13 | Gn15 |
  2  |      | Gn 3 |      | Gy 6 | (gn) | Gn11 | Gy12 |
  1  | (gn) | Gy 2 | Gy 4 | Gn 1 |      | Gn 5 | Gy10 |

  ht |   0  |   3  |   1  |   4  |   0  |   4  |   3  |  (discs in column)
 par |  6E  |  3O  |  5O  |  2E  |  6E  |  2E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |Gy |Gy |
  3  |   |Gy |   |Gn |   |Gn |Gn |
  2  |   |Gn |   |Gy |   |Gn |Gy |
  1  |   |Gy |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      |      | (gn) | (gn) | (gn) |      | (gy) |
  4  |      |      | (gn) | Gn 9 |      | Gy14 | Gy16 |
  3  |      | Gy 8 | (gn) | Gn 7 | [*]  | Gn13 | Gn15 |
  2  |      | Gn 3 |      | Gy 6 | (gn) | Gn11 | Gy12 |
  1  | (gn) | Gy 2 | Gy 4 | Gn 1 |      | Gn 5 | Gy10 |

  ht |   0  |   3  |   1  |   4  |   0  |   4  |   4  |  (discs in column)
 par |  6E  |  3O  |  5O  |  2E  |  6E  |  2E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |Gy |   |
  3  |   |Gy |   |Gn |   |Gn |Gn |
  2  |   |Gn |Gy |Gy |   |Gn |Gy |
  1  |   |Gy |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      |      | (gn) | (gn) | (gn) |      | (gy) |
  4  |      |      | (*)  | Gn 9 |      | Gy14 | (gn) |
  3  |      | Gy 8 | (*)  | Gn 7 | [*]  | Gn13 | Gn15 |
  2  |      | Gn 3 | Gy16 | Gy 6 | (gn) | Gn11 | Gy12 |
  1  | (gn) | Gy 2 | Gy 4 | Gn 1 |      | Gn 5 | Gy10 |

  ht |   0  |   3  |   2  |   4  |   0  |   4  |   3  |  (discs in column)
 par |  6E  |  3O  |  4E  |  2E  |  6E  |  2E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 7
- The better move places a disc on c7r4.
- Key insight: Your move let your opponent undercut your threat — their lower disc now kills your win.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]10[/zone:opponent-minor-pre]

After the best move (column 7):
- Opponent minor threats: [zone:opponent-minor-best]9[/zone:opponent-minor-best]

After the move played (column 3):
- Opponent minor threats: [zone:opponent-minor-played]10[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c3r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col3]column 3[/zone:col3], you gave your opponent the chance to undercut your plan: your disc landed on [zone:c3r2]that cell[/zone:c3r2], but your opponent already had the key cell at [zone:c3r3]that cell[/zone:c3r3], so their lower disc now blocks the higher one from mattering. That was an [term:undercut]undercut[/term:undercut]; if you had played [zone:col7]column 7[/zone:col7] instead, your disc would have gone to [zone:c7r4]that cell[/zone:c7r4] and kept your position safer while also trimming your opponent’s minor threats from [zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5|c7r4]10[/zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5|c7r4] to [zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5]9[/zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5], instead of leaving them at [zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5|c7r4]10[/zone:windows:c1r1|c3r3|c3r4|c3r5|c4r5|c4r6|c5r2|c5r3|c5r5|c7r4].
```

### eval-26 — forced_win (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gn |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |Gn |Gy |Gn |   |Gn |   |
  1  |Gy |Gy |Gy |Gn |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gn) |      | (gn) |      | (gn) |      |      |
  5  | (gn) | (gn) | (gn) | Gn 9 |      |      |      |
  4  |      | (gn) | Gn13 | Gy 8 |      |      |      |
  3  | (gn) | (gn) | Gn11 | Gn 7 | (gn) | (gn) |      |
  2  | (gn) | Gn15 | Gy10 | Gn 5 | (gn) | Gn 3 | (gn) |
  1  | Gy 6 | Gy12 | Gy 4 | Gn 1 | Gy14 | Gy 2 |      |

  ht |   1  |   2  |   4  |   5  |   1  |   2  |   0  |  (discs in column)
 par |  5O  |  4E  |  2E  |  1O  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gn |Gy |   |   |   |
  3  |   |Gy |Gn |Gn |   |   |   |
  2  |   |Gn |Gy |Gn |   |Gn |   |
  1  |Gy |Gy |Gy |Gn |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gn) |      | (gn) |      |      |      |      |
  5  | (gn) | (gn) | (gn) | Gn 9 |      |      |      |
  4  |      | (gn) | Gn13 | Gy 8 |      |      |      |
  3  |      | Gy16 | Gn11 | Gn 7 | (gn) | (gn) |      |
  2  |      | Gn15 | Gy10 | Gn 5 | (gn) | Gn 3 | (gn) |
  1  | Gy 6 | Gy12 | Gy 4 | Gn 1 | Gy14 | Gy 2 |      |

  ht |   1  |   3  |   4  |   5  |   1  |   2  |   0  |  (discs in column)
 par |  5O  |  3O  |  2E  |  1O  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gn |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |Gy |Gn |Gy |Gn |   |Gn |   |
  1  |Gy |Gy |Gy |Gn |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gn) |      | (gn) |      | (gn) |      |      |
  5  | (gn) | (gn) | (gn) | Gn 9 |      |      |      |
  4  | (gy) | (gn) | Gn13 | Gy 8 |      |      |      |
  3  | (*)  | (gn) | Gn11 | Gn 7 | (gn) | (gn) |      |
  2  | Gy16 | Gn15 | Gy10 | Gn 5 | (gn) | Gn 3 | (gn) |
  1  | Gy 6 | Gy12 | Gy 4 | Gn 1 | Gy14 | Gy 2 |      |

  ht |   2  |   2  |   4  |   5  |   1  |   2  |   0  |  (discs in column)
 par |  4E  |  4E  |  2E  |  1O  |  5O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 2
- The better move places a disc on c2r3.
- Key insight: Your move handed your opponent a forced win.
- Pattern mechanism: Your move gave your opponent a forced win — a sequence of forcing moves that guarantees their win regardless of your defense. Column 2 would have kept this sequence unavailable.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]14[/zone:opponent-minor-pre]

After the best move (column 2):
- Opponent minor threats: [zone:opponent-minor-best]10[/zone:opponent-minor-best]

After the move played (column 1):
- Opponent minor threats: [zone:opponent-minor-played]13[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col1]column 1[/zone:col1], you gave your opponent a [term:minor_threat]minor threat[/term:minor_threat] on [zone:c2r3]that cell[/zone:c2r3], and that was enough to let them set up a winning sequence later. The better move was [zone:col2]column 2[/zone:col2], where you could have landed on [zone:c2r3]that cell[/zone:c2r3] yourself and kept the danger from taking shape, leaving your opponent with [zone:windows:c1r5|c1r6|c2r4|c2r5|c3r5|c3r6|c5r2|c5r3|c6r3|c7r2]10[/zone:windows:c1r5|c1r6|c2r4|c2r5|c3r5|c3r6|c5r2|c5r3|c6r3|c7r2] minor threats instead of [zone:windows:c1r3|c1r5|c1r6|c2r3|c2r4|c2r5|c3r5|c3r6|c5r2|c5r3|c5r6|c6r3|c7r2]13[/zone:windows:c1r3|c1r5|c1r6|c2r3|c2r4|c2r5|c3r5|c3r6|c5r2|c5r3|c5r6|c6r3|c7r2].
```

### eval-27 — j_shape (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gy |Gn |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |   |
  1  |Gy |   |Gn |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      |      | (gy) |      |
  5  | (gy) | (gn) | (gy) | Gn 5 | (gy) | (gn) | (gy) |
  4  | (gn) | [Gy] | (gn) | Gy 4 | (gn) | (gy) | (gn) |
  3  |      | (gn) | Gy10 | Gn 3 | Gy12 | (gn) |      |
  2  |      | [Gy] | Gn 9 | Gy 2 | Gn11 | (gy) |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | Gy 8 | (gn) | (gy) |

  ht |   1  |   0  |   3  |   5  |   3  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  3O  |  1O  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy)   col2 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gn |Gy |   |   |   |
  3  |   |   |Gy |Gn |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |   |
  1  |Gy |   |Gn |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  | (gn) | (gy) |      |      | (gn) | (gy) |      |
  5  | (gy) | [Gn] | (gy) | Gn 5 | (gy) | (gn) | (gy) |
  4  | (gn) | [Gy] | Gn13 | Gy 4 | (gn) | (gy) | (gn) |
  3  |      | (gn) | Gy10 | Gn 3 | Gy12 | (gn) |      |
  2  | (gn) | [Gy] | Gn 9 | Gy 2 | Gn11 | (gy) |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | Gy 8 | <Gn> | (gy) |

  ht |   1  |   0  |   4  |   5  |   3  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  2E  |  1O  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy)   col2 row4 (Gy)   col2 row5 (Gn)   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gy |Gn |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |   |
  1  |Gy |   |Gn |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      |      | (gy) |      |
  5  | (gy) | (gn) | (gy) | Gn 5 | (gy) | (gn) | (gy) |
  4  | (gn) | [Gy] | <Gn> | Gy 4 | (gn) | (gy) | (gn) |
  3  |      | (gn) | Gy10 | Gn 3 | Gy12 | (gn) |      |
  2  |      | [Gy] | Gn 9 | Gy 2 | Gn11 | (gy) |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | Gy 8 | Gn13 | (gy) |

  ht |   1  |   0  |   3  |   5  |   3  |   1  |   0  |  (discs in column)
 par |  5O  |  6E  |  3O  |  1O  |  3O  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gy)   col2 row4 (Gy)   col3 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 3
- The better move places a disc on c3r4.
- Key insight: You let your opponent build a J-shape trap.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: 0
- Your minor threats: [zone:player-minor-pre]10[/zone:player-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]9[/zone:player-minor-best]

After the move played (column 6):
- Your major threats: 0
- Your minor threats: [zone:player-minor-played]7[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c6r1]
- undercut: cells [c2r2, c2r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r1, c2r2, c2r5]
- YOUR OPPONENT's threat cells: [c4r2, c3r3, c4r4, c3r4]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col6]column 6[/zone:col6], you let your opponent build a [term:j_shape]j shape[/term:j_shape] around the center instead of taking the stronger [zone:col3]column 3[/zone:col3] play that dropped on [zone:c3r4]that cell[/zone:c3r4]. That better move would have given you a stronger holding there and kept your opponent from settling into the central trap, with your major-threat count going from 0 to [zone:windows:c2r5]1[/zone:windows:c2r5] while your minor-threat count stayed much healthier at [zone:windows:c1r2|c1r4|c2r1|c2r3|c5r4|c5r6|c6r3|c6r5|c7r4]9[/zone:windows:c1r2|c1r4|c2r1|c2r3|c5r4|c5r6|c6r3|c6r5|c7r4] instead of falling to [zone:windows:c1r4|c2r1|c2r3|c5r4|c6r3|c6r5|c7r4]7[/zone:windows:c1r4|c2r1|c2r3|c5r4|c6r3|c6r5|c7r4].
```

### eval-28 — forced_win (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gy |Gn |   |   |
  3  |   |   |   |Gn |Gy |   |Gy |
  2  |   |   |Gy |Gy |Gn |   |Gy |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) | (gn) | Gn17 |      |      | (gn) |
  5  |      | (gn) | (*)  | Gn 5 | Gn15 | (gn) | (*)  |
  4  |      | (gy) | [Gn] | Gy 4 | Gn13 | [Gy] | (*)  |
  3  |      |      | (gy) | Gn 3 | Gy12 | (gn) | Gy18 |
  2  | (gy) | (gy) | Gy 8 | Gy 2 | Gn11 | (gy) | Gy14 |
  1  |      | Gy16 | Gy 6 | Gn 1 | Gy10 | Gn 7 | Gn 9 |

  ht |   0  |   1  |   2  |   6  |   5  |   1  |   3  |  (discs in column)
 par |  6E  |  5O  |  4E  |  0E  |  1O  |  5O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gy |Gn |   |   |
  3  |   |   |Gn |Gn |Gy |   |Gy |
  2  |   |   |Gy |Gy |Gn |   |Gy |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) | (gn) | Gn17 |      |      | (gn) |
  5  |      | (gn) | (*)  | Gn 5 | Gn15 | (gn) | (*)  |
  4  |      |      | <Gn> | Gy 4 | Gn13 | [Gy] | (*)  |
  3  | (gn) | (gn) | Gn19 | Gn 3 | Gy12 | (gn) | Gy18 |
  2  | (gy) | (gy) | Gy 8 | Gy 2 | Gn11 | (gy) | Gy14 |
  1  |      | Gy16 | Gy 6 | Gn 1 | Gy10 | Gn 7 | Gn 9 |

  ht |   0  |   1  |   3  |   6  |   5  |   1  |   3  |  (discs in column)
 par |  6E  |  5O  |  3O  |  0E  |  1O  |  5O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gn) [GT]   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |Gn |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gy |Gn |   |   |
  3  |   |   |   |Gn |Gy |   |Gy |
  2  |   |   |Gy |Gy |Gn |   |Gy |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      | (*)  | (gn) | Gn17 | Gn19 | (gn) | (gn) |
  5  |      | (gn) | (*)  | Gn 5 | Gn15 | (gn) | (*)  |
  4  |      | (gy) | [Gn] | Gy 4 | Gn13 | [Gy] | (*)  |
  3  |      | (gn) | (gy) | Gn 3 | Gy12 | (gn) | Gy18 |
  2  | (gy) | (gy) | Gy 8 | Gy 2 | Gn11 | (gy) | Gy14 |
  1  |      | Gy16 | Gy 6 | Gn 1 | Gy10 | Gn 7 | Gn 9 |

  ht |   0  |   1  |   2  |   6  |   6  |   1  |   3  |  (discs in column)
 par |  6E  |  5O  |  4E  |  0E  |  0E  |  5O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r6.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: Your move handed your opponent a forced win.
- Pattern mechanism: Your move gave your opponent a forced win — a sequence of forcing moves that guarantees their win regardless of your defense. Column 3 would have kept this sequence unavailable.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]10[/zone:opponent-minor-pre]

After the best move (column 3):
- Opponent minor threats: [zone:opponent-minor-best]7[/zone:opponent-minor-best]

After the move played (column 5):
- Opponent minor threats: [zone:opponent-minor-played]10[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c3r4]
- j_shape: cells [c4r3, c5r4, c4r5, c5r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r3, c5r4, c4r5, c5r5, c3r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
Your move in [zone:col5]column 5[/zone:col5] let your opponent keep a [term:major_threat]major threat[/term:major_threat] on [zone:c6r4]that cell[/zone:c6r4], which gave them a forcing line you could no longer safely ignore. The better move was [zone:col3]column 3[/zone:col3], where you could have played [zone:c3r3]that cell[/zone:c3r3] to build your own [term:j_shape]j shape[/term:j_shape] around [zone:cells:c4r3,c5r4,c4r5,c5r5]the threat cluster[/zone:cells:c4r3,c5r4,c4r5,c5r5], while also cutting your opponent’s minor threats from [zone:windows:c1r2|c2r2|c2r4|c2r6|c3r3|c3r4|c3r5|c6r2|c7r4|c7r5]10[/zone:windows:c1r2|c2r2|c2r4|c2r6|c3r3|c3r4|c3r5|c6r2|c7r4|c7r5] to [zone:windows:c1r2|c2r2|c2r6|c3r5|c6r2|c7r4|c7r5]7[/zone:windows:c1r2|c2r2|c2r6|c3r5|c6r2|c7r4|c7r5] instead of leaving them at [zone:windows:c1r2|c2r2|c2r4|c2r6|c3r3|c3r4|c3r5|c6r2|c7r4|c7r5]10[/zone:windows:c1r2|c2r2|c2r4|c2r6|c3r3|c3r4|c3r5|c6r2|c7r4|c7r5].
```

### eval-29 — overcut (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 24  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |Gy |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |Gn |   |Gy |   |Gy |   |
  3  |   |Gy |Gy |Gn |   |Gy |   |
  2  |Gy |Gn |Gn |Gy |   |Gy |Gn |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn15 |      | Gy18 | (gn) |
  5  |      |      | (*)  | Gn 5 | [Gy] | Gn17 | (*)  |
  4  |      | Gn23 | (*)  | Gy 4 | [Gn] | Gy16 | (gy) |
  3  | (gn) | Gy22 | Gy24 | Gn 3 | [Gy] | Gy14 |      |
  2  | Gy20 | Gn21 | Gn11 | Gy 2 | (gn) | Gy12 | Gn13 |
  1  | Gn19 | Gy 6 | Gy10 | Gn 1 | Gn 7 | Gn 9 | Gy 8 |

  ht |   2  |   4  |   3  |   6  |   1  |   6  |   2  |  (discs in column)
 par |  4E  |  2E  |  3O  |  0E  |  5O  |  0E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gy)   col5 row4 (Gn)   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 25  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |Gy |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |Gn |Gn |Gy |   |Gy |   |
  3  |   |Gy |Gy |Gn |   |Gy |   |
  2  |Gy |Gn |Gn |Gy |   |Gy |Gn |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) |      |      | Gn15 |      | Gy18 | (gn) |
  5  |      | (gn) | (*)  | Gn 5 | [Gy] | Gn17 | (*)  |
  4  |      | Gn23 | Gn25 | Gy 4 | [Gn] | Gy16 | (gy) |
  3  | (gn) | Gy22 | Gy24 | Gn 3 | [Gy] | Gy14 |      |
  2  | Gy20 | Gn21 | Gn11 | Gy 2 | <Gn> | Gy12 | Gn13 |
  1  | Gn19 | Gy 6 | Gy10 | Gn 1 | Gn 7 | Gn 9 | Gy 8 |

  ht |   2  |   4  |   4  |   6  |   1  |   6  |   2  |  (discs in column)
 par |  4E  |  2E  |  2E  |  0E  |  5O  |  0E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row2 (Gn) [GT]   col5 row3 (Gy)   col5 row4 (Gn)   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 25  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |Gy |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |Gn |   |Gy |   |Gy |   |
  3  |Gn |Gy |Gy |Gn |   |Gy |   |
  2  |Gy |Gn |Gn |Gy |   |Gy |Gn |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn15 |      | Gy18 | (gn) |
  5  |      |      | [Gn] | Gn 5 | [Gy] | Gn17 | (*)  |
  4  |      | Gn23 | (*)  | Gy 4 | [Gn] | Gy16 | (gy) |
  3  | Gn25 | Gy22 | Gy24 | Gn 3 | [Gy] | Gy14 |      |
  2  | Gy20 | Gn21 | Gn11 | Gy 2 | (gn) | Gy12 | Gn13 |
  1  | Gn19 | Gy 6 | Gy10 | Gn 1 | Gn 7 | Gn 9 | Gy 8 |

  ht |   3  |   4  |   3  |   6  |   1  |   6  |   2  |  (discs in column)
 par |  3O  |  2E  |  3O  |  0E  |  5O  |  0E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)   col5 row3 (Gy)   col5 row4 (Gn)   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r3.
- Better move: column 3
- The better move places a disc on c3r4.
- Key insight: You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]3[/zone:opponent-minor-pre]

After the best move (column 3):
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 1):
- Opponent minor threats: [zone:opponent-minor-played]3[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c5r2]
- overcut: cells [c5r3, c5r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r3, c5r4, c5r2]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:overcut] **overcut** (overcut): When a player's major threat at a higher row wins despite the opponent having a
lower threat in the same column, because the lower threat lacks the parity needed
to neutralize the upper one.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed an [term:overcut]overcut[/term:overcut]: by playing [zone:col1]column 1[/zone:col1], you put a disc on [zone:c1r3]that cell[/zone:c1r3] and left the key stack in [zone:col3]column 3[/zone:col3] untouched, while the better move would have let you play [zone:c3r4]that cell[/zone:c3r4] and neutralize the higher threat there. It also cut your opponent’s minor threats from [zone:windows:c3r4|c5r4|c7r4]3[/zone:windows:c3r4|c5r4|c7r4] to [zone:windows:c5r4|c7r4]2[/zone:windows:c5r4|c7r4]; your move left them at [zone:windows:c3r4|c5r4|c7r4]3[/zone:windows:c3r4|c5r4|c7r4], so you gave away a real advantage instead of reducing their chances.
```

### eval-30 — undercut (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 26  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |   |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |   |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | (gy) |      |      |      | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 |      |
  4  | (gn) | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | (gn) | Gn15 | Gn13 | [Gy] | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | [Gn] | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 | Gy 8 |

  ht |   2  |   5  |   5  |   0  |   5  |   5  |   4  |  (discs in column)
 par |  4E  |  1O  |  1O  |  6E  |  1O  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row3 (Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 27  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |   |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |Gn |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | (gy) |      |      |      | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 |      |
  4  | (gn) | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | Gn27 | Gn15 | Gn13 | [*]  | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | [Gn] | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 | Gy 8 |

  ht |   3  |   5  |   5  |   0  |   5  |   5  |   4  |  (discs in column)
 par |  3O  |  1O  |  1O  |  6E  |  1O  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row3 (Gn+Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 27  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gn |   |   |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |   |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |   |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | (gy) | Gn27 |      |      | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 |      |
  4  | (gn) | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | (gn) | Gn15 | Gn13 | [Gy] | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | [Gn] | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 | Gy 8 |

  ht |   2  |   5  |   6  |   0  |   5  |   5  |   4  |  (discs in column)
 par |  4E  |  1O  |  0E  |  6E  |  1O  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row3 (Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r6.
- Better move: column 1
- The better move places a disc on c1r3.
- Key insight: Your move let your opponent undercut your threat — their lower disc now kills your win.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]2[/zone:player-major-pre]

After the best move (column 1):
- Your major threats: [zone:player-major-best]3[/zone:player-major-best]

After the move played (column 3):
- Your major threats: [zone:player-major-played]2[/zone:player-major-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- undercut: cells [c4r3, c4r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col1]column 1[/zone:col1]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r3, c4r4]
- YOUR OPPONENT's threat cells: [c4r2, c7r1, c6r2, c7r3, c6r3, c5r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing in [zone:col3]column 3[/zone:col3], you gave your opponent the [term:undercut]undercut[/term:undercut] on [zone:cells:c4r3,c4r4]the key cells in column 4[/zone:cells:c4r3,c4r4]: your lower disc now blocks the higher one, so your line on the odd row is no longer safe. If you had played in [zone:col1]column 1[/zone:col1] instead, you would have placed a disc on [zone:c1r3]that cell[/zone:c1r3] and kept your extra threat alive, with your major threats holding at [zone:windows:c4r2|c4r4]2[/zone:windows:c4r2|c4r4] rather than building the stronger setup you could have had at [zone:windows:c4r2|c4r3|c4r4]3[/zone:windows:c4r2|c4r3|c4r4].
```

### eval-31 — double_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |Gn |   |Gy |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |   |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |Gn |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy30 | Gn27 |      | Gy28 | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 |      |
  4  | (gn) | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | Gn29 | Gn15 | Gn13 | [*]  | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | [Gn] | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 | Gy 8 |

  ht |   3  |   6  |   6  |   0  |   6  |   5  |   4  |  (discs in column)
 par |  3O  |  0E  |  0E  |  6E  |  0E  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row3 (Gn+Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 31  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |Gn |   |Gy |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |   |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |Gn |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy30 | Gn27 |      | Gy28 | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 |      |
  4  | <Gn> | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | Gn29 | Gn15 | Gn13 | [*]  | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | <Gn> | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | Gn31 | Gn 3 | Gy 4 | Gy 8 |

  ht |   3  |   6  |   6  |   1  |   6  |   5  |   4  |  (discs in column)
 par |  3O  |  0E  |  0E  |  5O  |  0E  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gn) [GT]   col4 row2 (Gn) [GT]   col4 row3 (Gn+Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 31  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |Gn |   |Gy |   |   |
  5  |   |Gy |Gy |   |Gn |Gy |Gn |
  4  |   |Gn |Gy |   |Gn |Gn |Gn |
  3  |Gn |Gn |Gn |   |Gy |Gy |Gy |
  2  |Gn |Gy |Gn |   |Gn |Gy |Gn |
  1  |Gy |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy30 | Gn27 |      | Gy28 | (gn) |      |
  5  | (*)  | Gy22 | Gy26 | (gy) | Gn21 | Gy24 | Gn31 |
  4  | (gn) | Gn19 | Gy14 | [*]  | Gn 9 | Gn23 | Gn17 |
  3  | Gn29 | Gn15 | Gn13 | [*]  | Gy 6 | Gy20 | Gy16 |
  2  | Gn25 | Gy12 | Gn 7 | [Gn] | Gn 5 | Gy18 | Gn11 |
  1  | Gy10 | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 | Gy 8 |

  ht |   3  |   6  |   6  |   0  |   6  |   5  |   5  |  (discs in column)
 par |  3O  |  0E  |  0E  |  6E  |  0E  |  1O  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row3 (Gn+Gy)   col4 row4 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r5.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You could have built a double threat — two winning columns at once — and missed it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 4):


After the move played (column 7):


## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c1r4, c4r2]
- double_threat: cells [c1r4, c4r2]
- undercut: cells [c4r3, c4r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r3, c4r4, c1r4, c4r2]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:overcut] **overcut** (overcut): When a player's major threat at a higher row wins despite the opponent having a
lower threat in the same column, because the lower threat lacks the parity needed
to neutralize the upper one.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col7]column 7[/zone:col7], you missed the [term:double_threat]double threat[/term:double_threat] you could have made with [zone:col4]column 4[/zone:col4]. That better move would have given you two [term:immediate_threat]immediate threats[/term:immediate_threat] at [zone:c1r4]that cell[/zone:c1r4] and [zone:c4r2]that cell[/zone:c4r2], while also setting up the [term:undercut]undercut[/term:undercut] between [zone:cells:c4r3,c4r4]the threat cluster[/zone:cells:c4r3,c4r4] so your opponent would have had a much harder time stopping both lines.
```

### eval-32 — figure_7 (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |Gn |
  5  |   |Gn |   |Gn |   |   |Gy |
  4  |   |Gn |Gn |Gy |   |Gn |Gn |
  3  |   |Gy |Gy |Gn |   |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] |      |      | Gn13 | (gn) | (*)  | Gn19 |
  5  | (gn) | Gn11 | (gn) | Gn 5 | (*)  | (gn) | Gy16 |
  4  | (gn) | Gn 9 | Gn29 | Gy 4 | (gn) | Gn25 | Gn15 |
  3  | (gn) | Gy 8 | Gy28 | Gn 3 |      | Gy24 | Gy14 |
  2  | Gn27 | Gn 7 | Gy22 | Gy 2 | Gy26 | Gn21 | Gy12 |
  1  | Gn17 | Gy 6 | Gy18 | Gn 1 | Gn23 | Gy20 | Gy10 |

  ht |   2  |   5  |   4  |   6  |   2  |   4  |   6  |  (discs in column)
 par |  4E  |  1O  |  2E  |  0E  |  4E  |  2E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row6 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |Gn |
  5  |   |Gn |Gy |Gn |   |   |Gy |
  4  |   |Gn |Gn |Gy |   |Gn |Gn |
  3  |   |Gy |Gy |Gn |   |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] | (gy) |      | Gn13 | (gn) | (*)  | Gn19 |
  5  |      | Gn11 | Gy30 | Gn 5 | (gy) | (gn) | Gy16 |
  4  | (gn) | Gn 9 | Gn29 | Gy 4 | (gn) | Gn25 | Gn15 |
  3  | (gn) | Gy 8 | Gy28 | Gn 3 | (gy) | Gy24 | Gy14 |
  2  | Gn27 | Gn 7 | Gy22 | Gy 2 | Gy26 | Gn21 | Gy12 |
  1  | Gn17 | Gy 6 | Gy18 | Gn 1 | Gn23 | Gy20 | Gy10 |

  ht |   2  |   5  |   5  |   6  |   2  |   4  |   6  |  (discs in column)
 par |  4E  |  1O  |  1O  |  0E  |  4E  |  2E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row6 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |Gn |
  5  |   |Gn |   |Gn |   |   |Gy |
  4  |   |Gn |Gn |Gy |   |Gn |Gn |
  3  |Gy |Gy |Gy |Gn |   |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] |      |      | Gn13 | (gn) | (*)  | Gn19 |
  5  | (gn) | Gn11 | (gn) | Gn 5 | (*)  | (gn) | Gy16 |
  4  |      | Gn 9 | Gn29 | Gy 4 | (gn) | Gn25 | Gn15 |
  3  | Gy30 | Gy 8 | Gy28 | Gn 3 |      | Gy24 | Gy14 |
  2  | Gn27 | Gn 7 | Gy22 | Gy 2 | Gy26 | Gn21 | Gy12 |
  1  | Gn17 | Gy 6 | Gy18 | Gn 1 | Gn23 | Gy20 | Gy10 |

  ht |   3  |   5  |   4  |   6  |   2  |   4  |   6  |  (discs in column)
 par |  3O  |  1O  |  2E  |  0E  |  4E  |  2E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row6 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r3.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: You let your opponent build a Figure-7 fork you can't answer.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]9[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]4[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]6[/zone:opponent-minor-best]

After the move played (column 1):
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]7[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c4r3, c3r4, c4r5, c3r5, c2r5]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col1]column 1[/zone:col1], you let your opponent build [term:figure_7]figure 7[/term:figure_7] pressure around [zone:c4r3]that cell[/zone:c4r3], [zone:c3r4]that cell[/zone:c3r4], [zone:c4r5]that cell[/zone:c4r5], [zone:c3r5]that cell[/zone:c3r5], and [zone:c2r5]that cell[/zone:c2r5] instead of taking away the key support in [zone:col3]column 3[/zone:col3]. The better move would have been [zone:col3]column 3[/zone:col3], landing on [zone:c3r5]that cell[/zone:c3r5], which would have raised your minor threats from [zone:windows:c5r5|c6r6]2[/zone:windows:c5r5|c6r6] to [zone:windows:c2r6|c5r3|c5r5|c6r6]4[/zone:windows:c2r6|c5r3|c5r5|c6r6] while holding your opponent to [zone:windows:c1r3|c1r4|c5r4|c5r6|c6r5|c6r6]6[/zone:windows:c1r3|c1r4|c5r4|c5r6|c6r5|c6r6] instead of [zone:windows:c1r5|c3r5|c5r4|c5r5|c5r6|c6r5|c6r6]7[/zone:windows:c1r5|c3r5|c5r4|c5r5|c5r6|c6r5|c6r6].
```

### eval-33 — double_threat (sev 4)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   1  |   0  |   1  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | <Gn> | Gn 3 | Gn 1 | Gn 5 | <Gn> | (gn) |

  ht |   1  |   0  |   1  |   2  |   1  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  4E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      | Gn 5 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | Gy 4 | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   1  |   0  |   1  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 4
- Your move placed a disc on c4r3.
- Better move: column 5
- The better move places a disc on c5r1.
- Key insight: You could have built a double threat — two winning columns at once — and missed it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 5):


After the move played (column 4):


## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c2r1, c6r1]
- double_threat: cells [c2r1, c6r1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r1, c6r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing in [zone:col4]column 4[/zone:col4], you spent your move on [zone:c4r3]that cell[/zone:c4r3] and missed the chance to build the [term:double_threat]double threat[/term:double_threat] at [zone:cells:c2r1,c6r1]the threat cluster[/zone:cells:c2r1,c6r1]. The better move in [zone:col5]column 5[/zone:col5] would have placed your disc on [zone:c5r1]that cell[/zone:c5r1] and left you with two immediate threats at once, so your opponent would not have been able to cover both.
```

### eval-34 — j_shape (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gn |   |   |   |   |   |   |
  5  |Gy |   |   |Gn |   |   |   |
  4  |Gy |   |Gy |Gn |Gn |   |   |
  3  |Gy |   |Gn |Gy |Gy |   |   |
  2  |Gn |   |Gy |Gy |Gn |   |   |
  1  |Gn |   |Gy |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  | Gn19 |      | (gn) |      |      | (gn) |      |
  5  | Gy18 |      |      | Gn17 | (gn) |      | (gy) |
  4  | Gy16 |      | Gy20 | Gn15 | Gn13 | [Gy] | (gn) |
  3  | Gy14 |      | Gn 9 | Gy12 | Gy 6 | (*)  | (gy) |
  2  | Gn11 | [Gn] | Gy 8 | Gy10 | Gn 5 |      | (gn) |
  1  | Gn 3 |      | Gy 4 | Gn 1 | Gy 2 | Gn 7 |      |

  ht |   6  |   0  |   4  |   5  |   4  |   1  |   0  |  (discs in column)
 par |  0E  |  6E  |  2E  |  1O  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gn |   |   |   |   |   |   |
  5  |Gy |   |Gn |Gn |   |   |   |
  4  |Gy |   |Gy |Gn |Gn |   |   |
  3  |Gy |   |Gn |Gy |Gy |   |   |
  2  |Gn |   |Gy |Gy |Gn |   |   |
  1  |Gn |   |Gy |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  | Gn19 |      | (gn) |      |      | (gn) |      |
  5  | Gy18 | (gn) | Gn21 | Gn17 | (gn) | (gn) | (gy) |
  4  | Gy16 |      | Gy20 | Gn15 | Gn13 | [Gy] | (gn) |
  3  | Gy14 |      | Gn 9 | Gy12 | Gy 6 | (*)  | (gy) |
  2  | Gn11 | [Gn] | Gy 8 | Gy10 | Gn 5 |      | (gn) |
  1  | Gn 3 |      | Gy 4 | Gn 1 | Gy 2 | Gn 7 |      |

  ht |   6  |   0  |   5  |   5  |   4  |   1  |   0  |  (discs in column)
 par |  0E  |  6E  |  1O  |  1O  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gn |   |   |Gn |   |   |   |
  5  |Gy |   |   |Gn |   |   |   |
  4  |Gy |   |Gy |Gn |Gn |   |   |
  3  |Gy |   |Gn |Gy |Gy |   |   |
  2  |Gn |   |Gy |Gy |Gn |   |   |
  1  |Gn |   |Gy |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  | Gn19 | (gn) | (gn) | Gn21 |      | (gn) |      |
  5  | Gy18 |      |      | Gn17 | (gn) |      | (gy) |
  4  | Gy16 |      | Gy20 | Gn15 | Gn13 | [Gy] | (gn) |
  3  | Gy14 |      | Gn 9 | Gy12 | Gy 6 | (*)  | (gy) |
  2  | Gn11 | [Gn] | Gy 8 | Gy10 | Gn 5 |      | (gn) |
  1  | Gn 3 |      | Gy 4 | Gn 1 | Gy 2 | Gn 7 |      |

  ht |   6  |   0  |   4  |   6  |   4  |   1  |   0  |  (discs in column)
 par |  0E  |  6E  |  2E  |  0E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row2 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 4
- Your move placed a disc on c4r6.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: You had a J-shape trap available and didn't use it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]5[/zone:player-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]8[/zone:player-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]6[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- j_shape: cells [c3r3, c4r4, c3r5, c4r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r3, c4r4, c3r5, c4r5]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had the [term:j_shape]j shape[/term:j_shape] available, but by playing in [zone:col4]column 4[/zone:col4] you filled [zone:c4r6]that cell[/zone:c4r6] instead of taking [zone:col3]column 3[/zone:col3] to land on [zone:c3r5]that cell[/zone:c3r5] and complete the trap. That better move would have left you with more pressure on the board, with your minor threats at [zone:windows:c3r6|c6r3|c6r4|c7r2|c7r4]5[/zone:windows:c3r6|c6r3|c6r4|c7r2|c7r4] before the move, [zone:windows:c2r5|c3r6|c5r5|c6r3|c6r4|c6r5|c7r2|c7r4]8[/zone:windows:c2r5|c3r6|c5r5|c6r3|c6r4|c6r5|c7r2|c7r4] after the better move, but only [zone:windows:c2r6|c3r6|c6r3|c6r4|c7r2|c7r4]6[/zone:windows:c2r6|c3r6|c6r3|c6r4|c7r2|c7r4] after the move you actually played.
```

### eval-35 — figure_7 (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |   |Gn |Gn |   |   |Gy |
  2  |   |   |Gn |Gy |   |   |Gn |
  1  |   |Gy |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn15 |      |      | (gy) |
  5  |      |      |      | Gn 5 |      | (gn) | (gy) |
  4  | (*)  | (gy) | Gy12 | Gy 4 | (*)  | (gy) | Gy16 |
  3  | (gn) | (gn) | Gn11 | Gn 3 | (*)  | (gn) | Gy14 |
  2  |      |      | Gn 9 | Gy 2 |      | (gy) | Gn13 |
  1  |      | Gy 8 | Gn 7 | Gn 1 | Gn17 | Gy10 | Gy 6 |

  ht |   0  |   1  |   4  |   6  |   1  |   1  |   4  |  (discs in column)
 par |  6E  |  5O  |  2E  |  0E  |  5O  |  5O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |Gy |Gn |   |   |   |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |   |Gn |Gn |   |   |Gy |
  2  |   |   |Gn |Gy |   |   |Gn |
  1  |   |Gy |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      | Gn15 |      |      | (gy) |
  5  |      |      | Gy18 | Gn 5 |      | (gn) | (gy) |
  4  | (*)  | (gy) | Gy12 | Gy 4 | (*)  | (gy) | Gy16 |
  3  | (gn) | (gn) | Gn11 | Gn 3 | (*)  | (gn) | Gy14 |
  2  |      |      | Gn 9 | Gy 2 |      | (gy) | Gn13 |
  1  |      | Gy 8 | Gn 7 | Gn 1 | Gn17 | Gy10 | Gy 6 |

  ht |   0  |   1  |   5  |   6  |   1  |   1  |   4  |  (discs in column)
 par |  6E  |  5O  |  1O  |  0E  |  5O  |  5O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |   |Gn |Gn |   |   |Gy |
  2  |   |Gy |Gn |Gy |   |   |Gn |
  1  |   |Gy |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn15 |      |      | (gy) |
  5  |      |      |      | Gn 5 |      | (gn) | (gy) |
  4  | (*)  | (gy) | Gy12 | Gy 4 | (*)  | (gy) | Gy16 |
  3  | (gn) | (*)  | Gn11 | Gn 3 | (*)  | (gn) | Gy14 |
  2  |      | Gy18 | Gn 9 | Gy 2 |      | (gy) | Gn13 |
  1  |      | Gy 8 | Gn 7 | Gn 1 | Gn17 | Gy10 | Gy 6 |

  ht |   0  |   2  |   4  |   6  |   1  |   1  |   4  |  (discs in column)
 par |  6E  |  4E  |  2E  |  0E  |  5O  |  5O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: You let your opponent build a Figure-7 fork you can't answer.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 3):


After the move played (column 2):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c4r1, c3r2, c4r3, c3r3, c2r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col2]column 2[/zone:col2], you let your opponent build a [term:figure_7]figure 7[/term:figure_7] around [zone:cells:c4r1,c3r2,c4r3,c3r3,c2r3]the threat cluster[/zone:cells:c4r1,c3r2,c4r3,c3r3,c2r3], which you can’t cover all at once. The better move was [zone:col3]column 3[/zone:col3], where you would have placed on [zone:col3]that cell[/zone:col3] and kept the position from giving your opponent that kind of forked pressure.
```

### eval-36 — forced_win (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gy |Gy |   |   |   |
  5  |   |   |Gy |Gn |   |   |   |
  4  |Gn |   |Gn |Gy |   |   |   |
  3  |Gn |   |Gy |Gy |   |   |   |
  2  |Gy |Gy |Gn |Gn |Gy |   |   |
  1  |Gn |Gn |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  | (*)  | (gy) | Gy16 | Gy14 | (*)  | (gy) |      |
  5  | (gn) |      | Gy10 | Gn 9 | [Gy] |      |      |
  4  | Gn21 |      | Gn 7 | Gy 8 |      | (gn) | (gy) |
  3  | Gn15 | (*)  | Gy 4 | Gy 6 | (*)  | (gy) |      |
  2  | Gy12 | Gy18 | Gn 3 | Gn 5 | Gy20 | (gy) |      |
  1  | Gn11 | Gn17 | Gn 1 | Gy 2 | Gn19 |      | Gn13 |

  ht |   4  |   2  |   6  |   6  |   2  |   0  |   1  |  (discs in column)
 par |  2E  |  4E  |  0E  |  0E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 22  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gy |Gy |   |   |   |
  5  |   |   |Gy |Gn |   |   |   |
  4  |Gn |   |Gn |Gy |   |   |   |
  3  |Gn |   |Gy |Gy |Gy |   |   |
  2  |Gy |Gy |Gn |Gn |Gy |   |   |
  1  |Gn |Gn |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  | (*)  | [Gy] | Gy16 | Gy14 | (*)  | (gy) |      |
  5  | (gn) |      | Gy10 | Gn 9 | [Gy] |      |      |
  4  | Gn21 |      | Gn 7 | Gy 8 | (gy) |      | (gy) |
  3  | Gn15 | <Gy> | Gy 4 | Gy 6 | Gy22 | [Gy] | (gy) |
  2  | Gy12 | Gy18 | Gn 3 | Gn 5 | Gy20 | [Gy] |      |
  1  | Gn11 | Gn17 | Gn 1 | Gy 2 | Gn19 |      | Gn13 |

  ht |   4  |   2  |   6  |   6  |   3  |   0  |   1  |  (discs in column)
 par |  2E  |  4E  |  0E  |  0E  |  3O  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gy) [GT]   col2 row6 (Gy)   col5 row5 (Gy)   col6 row2 (Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 22  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gy |Gy |   |   |   |
  5  |   |   |Gy |Gn |   |   |   |
  4  |Gn |   |Gn |Gy |   |   |   |
  3  |Gn |Gy |Gy |Gy |   |   |   |
  2  |Gy |Gy |Gn |Gn |Gy |   |   |
  1  |Gn |Gn |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  | (*)  | (gy) | Gy16 | Gy14 | (gy) | (gy) |      |
  5  | (gn) | (gy) | Gy10 | Gn 9 | [Gy] |      |      |
  4  | Gn21 | (gy) | Gn 7 | Gy 8 |      | (gn) | (gy) |
  3  | Gn15 | Gy22 | Gy 4 | Gy 6 | <Gy> | (gy) |      |
  2  | Gy12 | Gy18 | Gn 3 | Gn 5 | Gy20 | (gy) |      |
  1  | Gn11 | Gn17 | Gn 1 | Gy 2 | Gn19 |      | Gn13 |

  ht |   4  |   3  |   6  |   6  |   2  |   0  |   1  |  (discs in column)
 par |  2E  |  3O  |  0E  |  0E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gy) [GT]   col5 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r3.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: You had a forced win and let it slip.
- Pattern mechanism: Column 5 would have started a forced win — a sequence of moves that guarantees a win regardless of your opponent's defense.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 5):
- Your major threats: [zone:player-major-best]4[/zone:player-major-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c2r3]
- forced_win (position-level pattern)
- j_shape: cells [c4r1, c5r2, c4r3, c5r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r3, c4r1, c5r2, c4r3, c5r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You let a [term:forced_win]forced win[/term:forced_win] slip: instead of playing [zone:col5]column 5[/zone:col5] to drop on [zone:c5r3]that cell[/zone:c5r3] and start the winning sequence, you played [zone:col2]column 2[/zone:col2] on [zone:c2r3]that cell[/zone:c2r3]. The better move would have completed the [term:j_shape]j shape[/term:j_shape] with [zone:c4r1]that cell[/zone:c4r1], [zone:c5r2]that cell[/zone:c5r2], [zone:c4r3]that cell[/zone:c4r3], and [zone:c5r3]that cell[/zone:c5r3], while also lifting your major threats from [zone:windows:c5r5]1[/zone:windows:c5r5] to [zone:windows:c2r6|c5r5|c6r2|c6r3]4[/zone:windows:c2r6|c5r5|c6r2|c6r3]; after your move, they stayed at [zone:windows:c5r5]1[/zone:windows:c5r5].
```

### eval-38 — immediate_threat (sev 8)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |   |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |   |   |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      |      |
  4  |      | (gn) | [Gy] |      | (gy) |      |      |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | <Gy> |
  2  |      |      |      | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  | (gn) | <Gn> | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   0  |   0  |   1  |   3  |   3  |   3  |   2  |  (discs in column)
 par |  6E  |  6E  |  5O  |  3O  |  3O  |  3O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col3 row3 (Gy)   col3 row4 (Gy)   col7 row3 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray  [GAME OVER]

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |   |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |   |Gn |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      |      |
  4  |      | (gn) | [Gy] |      | (gy) |      |      |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | <Gy> |
  2  |      |      |      | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  | <Gn> | Gn13 | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   0  |   1  |   1  |   3  |   3  |   3  |   2  |  (discs in column)
 par |  6E  |  5O  |  5O  |  3O  |  3O  |  3O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col1 row1 (Gn) [GT]   col3 row3 (Gy)   col3 row4 (Gy)   col7 row3 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |Gn |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |   |   |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      | (gn) |
  4  |      | (gn) | [Gy] |      | (gy) |      | (gn) |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | Gn13 |
  2  |      |      |      | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  | (gn) | <Gn> | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   0  |   0  |   1  |   3  |   3  |   3  |   3  |  (discs in column)
 par |  6E  |  6E  |  5O  |  3O  |  3O  |  3O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col3 row3 (Gy)   col3 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 7
- Your move placed a disc on c7r3.
- Better move: column 2
- The better move places a disc on c2r1.
- Key insight: You had a winning move right there and didn't take it.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had [term:immediate_threat]an immediate threat[/term:immediate_threat] in [zone:col2]column 2[/zone:col2] at [zone:c2r1]that cell[/zone:c2r1], and playing [zone:col7]column 7[/zone:col7] instead gave that up. The better move would have put your disc on [zone:c2r1]that cell[/zone:c2r1] and ended the game at once by completing your line on an odd row, which is exactly what you needed here.
```

### eval-39 — forced_block (sev 7)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |Gn |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |   |   |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      | (gn) |
  4  |      | (gn) | [Gy] |      | (gy) |      | (gn) |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | Gn13 |
  2  |      |      |      | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  | (gn) | <Gn> | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   0  |   0  |   1  |   3  |   3  |   3  |   3  |  (discs in column)
 par |  6E  |  6E  |  5O  |  3O  |  3O  |  3O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col3 row3 (Gy)   col3 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |Gn |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |   |Gy |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      | (gn) |
  4  |      | (gn) | [Gy] |      | (gy) |      | (gn) |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | Gn13 |
  2  |      |      | (gy) | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  |      | Gy14 | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   0  |   1  |   1  |   3  |   3  |   3  |   3  |  (discs in column)
 par |  6E  |  5O  |  5O  |  3O  |  3O  |  3O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col3 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |Gy |Gy |Gn |
  2  |   |   |   |Gn |Gy |Gn |Gn |
  1  |Gy |   |Gn |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      | (gn) |
  4  |      | (gn) | [Gy] |      | (gy) |      | (gn) |
  3  |      | (gy) | [Gy] | Gy12 | Gy10 | Gy 8 | Gn13 |
  2  |      |      |      | Gn11 | Gy 2 | Gn 5 | Gn 7 |
  1  | Gy14 | <Gn> | Gn 9 | Gn 3 | Gn 1 | Gy 4 | Gy 6 |

  ht |   1  |   0  |   1  |   3  |   3  |   3  |   3  |  (discs in column)
 par |  5O  |  6E  |  5O  |  3O  |  3O  |  3O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col3 row3 (Gy)   col3 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 1
- Your move placed a disc on c1r1.
- Better move: column 2
- The better move places a disc on c2r1.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 2):
- Your minor threats: [zone:player-minor-best]3[/zone:player-minor-best]

After the move played (column 1):
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- figure_7: cells [c6r1, c5r2, c6r3, c5r3, c4r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r1, c5r2, c6r3, c5r3, c4r3]
- YOUR OPPONENT's threat cells: [c2r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed a [term:forced_block]forced block[/term:forced_block]: your opponent was about to win on [zone:c2r1]that cell[/zone:c2r1], so playing [zone:col1]column 1[/zone:col1] let that threat stay alive. If you had played [zone:col2]column 2[/zone:col2] instead, you would have taken away that immediate danger and also kept building your own [zone:windows:c5r4|c5r5]minor threats[/zone:windows:c5r4|c5r5] from [zone:windows:c3r2|c5r4|c5r5]3[/zone:windows:c3r2|c5r4|c5r5] rather than leaving yourself with only [zone:windows:c5r4|c5r5]2[/zone:windows:c5r4|c5r5].
```

### eval-40 — forced_win (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 28  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |Gn |   |   |
  5  |   |Gn |   |   |Gy |Gy |   |
  4  |   |Gn |   |   |Gn |Gy |Gn |
  3  |   |Gy |   |Gn |Gy |Gn |Gy |
  2  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |
  1  |Gn |Gy |Gn |Gy |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gy28 | (gn) | [Gy] | Gn21 |      |      |
  5  | (gn) | Gn15 | (gy) | (*)  | Gy16 | Gy14 | (gy) |
  4  | [Gy] | Gn 7 | [Gn] | (*)  | Gn13 | Gy10 | Gn27 |
  3  | (gn) | Gy 6 | (*)  | Gn25 | Gy12 | Gn 9 | Gy26 |
  2  | Gn19 | Gy 4 | Gy18 | Gn23 | Gn11 | Gn 5 | Gy24 |
  1  | Gn17 | Gy 2 | Gn 1 | Gy20 | Gy 8 | Gn 3 | Gy22 |

  ht |   2  |   6  |   2  |   3  |   6  |   5  |   4  |  (discs in column)
 par |  4E  |  0E  |  4E  |  3O  |  0E  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy)   col3 row4 (Gn)   col4 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |Gn |   |   |
  5  |   |Gn |   |   |Gy |Gy |   |
  4  |   |Gn |   |   |Gn |Gy |Gn |
  3  |   |Gy |Gn |Gn |Gy |Gn |Gy |
  2  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |
  1  |Gn |Gy |Gn |Gy |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gy28 | (gn) | [Gy] | Gn21 |      |      |
  5  | [Gn] | Gn15 | (gy) | (*)  | Gy16 | Gy14 | (gy) |
  4  | [Gy] | Gn 7 | <Gn> | (*)  | Gn13 | Gy10 | Gn27 |
  3  | (gn) | Gy 6 | Gn29 | Gn25 | Gy12 | Gn 9 | Gy26 |
  2  | Gn19 | Gy 4 | Gy18 | Gn23 | Gn11 | Gn 5 | Gy24 |
  1  | Gn17 | Gy 2 | Gn 1 | Gy20 | Gy 8 | Gn 3 | Gy22 |

  ht |   2  |   6  |   3  |   3  |   6  |   5  |   4  |  (discs in column)
 par |  4E  |  0E  |  3O  |  3O  |  0E  |  1O  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy)   col1 row5 (Gn)   col3 row4 (Gn) [GT]   col4 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |Gn |Gn |   |
  5  |   |Gn |   |   |Gy |Gy |   |
  4  |   |Gn |   |   |Gn |Gy |Gn |
  3  |   |Gy |   |Gn |Gy |Gn |Gy |
  2  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |
  1  |Gn |Gy |Gn |Gy |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | Gy28 | (gn) | [Gy] | Gn21 | Gn29 | (gn) |
  5  | (gn) | Gn15 | (gy) | (*)  | Gy16 | Gy14 | (gy) |
  4  | [Gy] | Gn 7 | [Gn] | (*)  | Gn13 | Gy10 | Gn27 |
  3  | (gn) | Gy 6 | (*)  | Gn25 | Gy12 | Gn 9 | Gy26 |
  2  | Gn19 | Gy 4 | Gy18 | Gn23 | Gn11 | Gn 5 | Gy24 |
  1  | Gn17 | Gy 2 | Gn 1 | Gy20 | Gy 8 | Gn 3 | Gy22 |

  ht |   2  |   6  |   2  |   3  |   6  |   6  |   4  |  (discs in column)
 par |  4E  |  0E  |  4E  |  3O  |  0E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy)   col3 row4 (Gn)   col4 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r6.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You had a forced win and let it slip.
- Pattern mechanism: Column 3 would have started a forced win — a sequence of moves that guarantees a win regardless of your opponent's defense.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]5[/zone:opponent-minor-pre]

After the best move (column 3):
- Opponent minor threats: [zone:opponent-minor-best]4[/zone:opponent-minor-best]

After the move played (column 6):
- Opponent minor threats: [zone:opponent-minor-played]5[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c3r4]
- forced_win (position-level pattern)
- undercut: cells [c1r4, c1r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r4, c1r4, c1r5]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:forced_win]forced win[/term:forced_win] available, but by playing [zone:col6]column 6[/zone:col6] you missed the key move in [zone:col3]column 3[/zone:col3] that would have put your disc on [zone:c3r3]that cell[/zone:c3r3] and started the winning sequence. The better move also kept your opponent’s minor threats lower, from [zone:windows:c3r3|c3r5|c4r4|c4r5|c7r5]5[/zone:windows:c3r3|c3r5|c4r4|c4r5|c7r5] to [zone:windows:c3r5|c4r4|c4r5|c7r5]4[/zone:windows:c3r5|c4r4|c4r5|c7r5], while your move left them at [zone:windows:c3r3|c3r5|c4r4|c4r5|c7r5]5[/zone:windows:c3r3|c3r5|c4r4|c4r5|c7r5].
```

### eval-41 — z_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 38  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gn |   |Gy |Gn |Gy |   |Gn |
  5  |Gy |   |Gn |Gn |Gn |Gy |Gn |
  4  |Gn |   |Gy |Gy |Gn |Gn |Gn |
  3  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gn |Gn |Gy |
  1  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | Gn27 |      | Gy28 | Gn31 | Gy30 |      | Gn29 |
  5  | Gy26 | [Gn] | Gn15 | Gn 5 | Gn21 | Gy38 | Gn25 |
  4  | Gn19 |      | Gy14 | Gy 4 | Gn11 | Gn37 | Gn23 |
  3  | Gy18 | Gy36 | Gn13 | Gn 3 | Gy10 | Gy34 | Gy22 |
  2  | Gn17 | Gn35 | Gy12 | Gy 2 | Gn 9 | Gn33 | Gy20 |
  1  | Gy 6 | Gy24 | Gn 7 | Gn 1 | Gy 8 | Gy32 | Gy16 |

  ht |   6  |   3  |   6  |   6  |   6  |   5  |   6  |  (discs in column)
 par |  0E  |  3O  |  0E  |  0E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col2 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 39  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gn |   |Gy |Gn |Gy |Gn |Gn |
  5  |Gy |   |Gn |Gn |Gn |Gy |Gn |
  4  |Gn |   |Gy |Gy |Gn |Gn |Gn |
  3  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gn |Gn |Gy |
  1  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | Gn27 |      | Gy28 | Gn31 | Gy30 | Gn39 | Gn29 |
  5  | Gy26 | [Gn] | Gn15 | Gn 5 | Gn21 | Gy38 | Gn25 |
  4  | Gn19 |      | Gy14 | Gy 4 | Gn11 | Gn37 | Gn23 |
  3  | Gy18 | Gy36 | Gn13 | Gn 3 | Gy10 | Gy34 | Gy22 |
  2  | Gn17 | Gn35 | Gy12 | Gy 2 | Gn 9 | Gn33 | Gy20 |
  1  | Gy 6 | Gy24 | Gn 7 | Gn 1 | Gy 8 | Gy32 | Gy16 |

  ht |   6  |   3  |   6  |   6  |   6  |   6  |   6  |  (discs in column)
 par |  0E  |  3O  |  0E  |  0E  |  0E  |  0E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col2 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 39  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gn |   |Gy |Gn |Gy |   |Gn |
  5  |Gy |   |Gn |Gn |Gn |Gy |Gn |
  4  |Gn |Gn |Gy |Gy |Gn |Gn |Gn |
  3  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |
  2  |Gn |Gn |Gy |Gy |Gn |Gn |Gy |
  1  |Gy |Gy |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | Gn27 |      | Gy28 | Gn31 | Gy30 |      | Gn29 |
  5  | Gy26 | <Gn> | Gn15 | Gn 5 | Gn21 | Gy38 | Gn25 |
  4  | Gn19 | Gn39 | Gy14 | Gy 4 | Gn11 | Gn37 | Gn23 |
  3  | Gy18 | Gy36 | Gn13 | Gn 3 | Gy10 | Gy34 | Gy22 |
  2  | Gn17 | Gn35 | Gy12 | Gy 2 | Gn 9 | Gn33 | Gy20 |
  1  | Gy 6 | Gy24 | Gn 7 | Gn 1 | Gy 8 | Gy32 | Gy16 |

  ht |   6  |   4  |   6  |   6  |   6  |   5  |   6  |  (discs in column)
 par |  0E  |  2E  |  0E  |  0E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col2 row5 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r4.
- Better move: column 6
- The better move places a disc on c6r6.
- Key insight: You had the parity advantage — an odd vertical capsule — and abandoned it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 2):
- Your major threats: 0

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- z_threat (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col6]column 6[/zone:col6]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had the [term:z_threat]z threat[/term:z_threat] and an odd vertical capsule in [zone:col6]column 6[/zone:col6], but playing in [zone:col2]column 2[/zone:col2] threw that away and let your opponent keep control of the position. The better move in [zone:col6]column 6[/zone:col6] would have preserved your advantage on the board and left your major threats at [zone:windows:c2r5]1[/zone:windows:c2r5], while your move left them at 0.
```

### eval-42 — z_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 36  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gn |Gn |   |
  5  |Gy |   |Gy |Gn |Gy |Gn |Gy |
  4  |Gn |   |Gy |Gy |Gy |Gn |Gy |
  3  |Gy |   |Gn |Gn |Gy |Gy |Gn |
  2  |Gn |   |Gn |Gy |Gn |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 | [Gy] | Gn35 | Gy10 | Gn19 | Gn31 |      |
  5  | Gy28 |      | Gy30 | Gn 5 | Gy18 | Gn23 | Gy36 |
  4  | Gn27 | [Gy] | Gy26 | Gy 4 | Gy16 | Gn21 | Gy34 |
  3  | Gy24 | [Gn] | Gn25 | Gn 3 | Gy14 | Gy20 | Gn33 |
  2  | Gn17 |      | Gn 9 | Gy 2 | Gn13 | Gn15 | Gy22 |
  1  | Gy 6 | Gn29 | Gy 8 | Gn 1 | Gn 7 | Gn11 | Gy12 |

  ht |   6  |   1  |   6  |   6  |   6  |   6  |   5  |  (discs in column)
 par |  0E  |  5O  |  0E  |  0E  |  0E  |  0E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row4 (Gy)   col2 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 37  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gn |Gn |Gn |
  5  |Gy |   |Gy |Gn |Gy |Gn |Gy |
  4  |Gn |   |Gy |Gy |Gy |Gn |Gy |
  3  |Gy |   |Gn |Gn |Gy |Gy |Gn |
  2  |Gn |   |Gn |Gy |Gn |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 | [Gy] | Gn35 | Gy10 | Gn19 | Gn31 | Gn37 |
  5  | Gy28 |      | Gy30 | Gn 5 | Gy18 | Gn23 | Gy36 |
  4  | Gn27 | [Gy] | Gy26 | Gy 4 | Gy16 | Gn21 | Gy34 |
  3  | Gy24 | [Gn] | Gn25 | Gn 3 | Gy14 | Gy20 | Gn33 |
  2  | Gn17 |      | Gn 9 | Gy 2 | Gn13 | Gn15 | Gy22 |
  1  | Gy 6 | Gn29 | Gy 8 | Gn 1 | Gn 7 | Gn11 | Gy12 |

  ht |   6  |   1  |   6  |   6  |   6  |   6  |   6  |  (discs in column)
 par |  0E  |  5O  |  0E  |  0E  |  0E  |  0E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row4 (Gy)   col2 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 37  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gn |Gn |   |
  5  |Gy |   |Gy |Gn |Gy |Gn |Gy |
  4  |Gn |   |Gy |Gy |Gy |Gn |Gy |
  3  |Gy |   |Gn |Gn |Gy |Gy |Gn |
  2  |Gn |Gn |Gn |Gy |Gn |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 | [Gy] | Gn35 | Gy10 | Gn19 | Gn31 |      |
  5  | Gy28 |      | Gy30 | Gn 5 | Gy18 | Gn23 | Gy36 |
  4  | Gn27 | [Gy] | Gy26 | Gy 4 | Gy16 | Gn21 | Gy34 |
  3  | Gy24 | <Gn> | Gn25 | Gn 3 | Gy14 | Gy20 | Gn33 |
  2  | Gn17 | Gn37 | Gn 9 | Gy 2 | Gn13 | Gn15 | Gy22 |
  1  | Gy 6 | Gn29 | Gy 8 | Gn 1 | Gn 7 | Gn11 | Gy12 |

  ht |   6  |   2  |   6  |   6  |   6  |   6  |   5  |  (discs in column)
 par |  0E  |  4E  |  0E  |  0E  |  0E  |  0E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn) [GT]   col2 row4 (Gy)   col2 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 7
- The better move places a disc on c7r6.
- Key insight: You had the parity advantage — an odd vertical capsule — and abandoned it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 7):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 2):
- Your major threats: 0

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- z_threat (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col7]column 7[/zone:col7]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had the parity advantage with an odd vertical capsule, but by playing [zone:col2]column 2[/zone:col2] you filled [zone:c2r2]that cell[/zone:c2r2] and gave up the [term:z_threat]z threat[/term:z_threat] structure you were sitting on. The better move in [zone:col7]column 7[/zone:col7] would have let you keep that control on the board, preserving your major threat at [zone:windows:c2r3]1[/zone:windows:c2r3] instead of leaving you with 0 after the move you played, which was a significant loss of pressure.
```

### eval-43 — figure_7 (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |Gy |   |
  3  |   |   |   |   |Gn |Gn |   |
  2  |   |   |   |Gy |Gn |Gn |   |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) |      | (gn) |      |      |
  4  |      | (gy) | (gn) | (gn) | (gn) | Gy12 | [Gn] |
  3  |      |      | (*)  | (gn) | Gn11 | Gn 9 | (gn) |
  2  |      |      |      | Gy 8 | Gn 7 | Gn 5 |      |
  1  |      | Gy 2 | Gy10 | Gn 1 | Gy 4 | Gn 3 | Gy 6 |

  ht |   0  |   1  |   1  |   2  |   3  |   4  |   1  |  (discs in column)
 par |  6E  |  5O  |  5O  |  4E  |  3O  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |Gy |   |
  3  |   |   |   |Gn |Gn |Gn |   |
  2  |   |   |   |Gy |Gn |Gn |   |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) | (gn) |      | (gn) |      |      |
  4  |      | (gy) | [Gn] | (gn) | (gn) | Gy12 | [Gn] |
  3  |      | (gn) | [Gn] | Gn13 | Gn11 | Gn 9 | [Gn] |
  2  |      |      |      | Gy 8 | Gn 7 | Gn 5 |      |
  1  |      | Gy 2 | Gy10 | Gn 1 | Gy 4 | Gn 3 | Gy 6 |

  ht |   0  |   1  |   1  |   3  |   3  |   4  |   1  |  (discs in column)
 par |  6E  |  5O  |  5O  |  3O  |  3O  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn)   col3 row4 (Gn)   col7 row3 (Gn)   col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gn |Gy |   |
  3  |   |   |   |   |Gn |Gn |   |
  2  |   |   |   |Gy |Gn |Gn |   |
  1  |   |Gy |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      | (gn) |      |      |
  5  |      |      | (gn) | (gn) | <Gn> |      |      |
  4  |      | (gy) | (gn) | (gn) | Gn13 | Gy12 | [Gn] |
  3  |      |      | (*)  | (gn) | Gn11 | Gn 9 | (gn) |
  2  |      |      |      | Gy 8 | Gn 7 | Gn 5 | (gn) |
  1  |      | Gy 2 | Gy10 | Gn 1 | Gy 4 | Gn 3 | Gy 6 |

  ht |   0  |   1  |   1  |   2  |   4  |   4  |   1  |  (discs in column)
 par |  6E  |  5O  |  5O  |  4E  |  2E  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row5 (Gn) [GT]   col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r4.
- Better move: column 4
- The better move places a disc on c4r3.
- Key insight: You had a Figure-7 fork structure and didn't complete it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 4):
- Your major threats: [zone:player-major-best]4[/zone:player-major-best]

After the move played (column 5):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- figure_7: cells [c4r1, c5r2, c4r3, c5r3, c6r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col4]column 4[/zone:col4], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r1, c5r2, c6r3, c5r3, c4r1, c4r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had the [term:figure_7]figure 7[/term:figure_7] structure in place, but by playing [zone:col5]column 5[/zone:col5] you put your disc on [zone:c5r4]that cell[/zone:c5r4] and left the key idea unfinished. The better move was [zone:col4]column 4[/zone:col4], where you could have played [zone:c4r3]that cell[/zone:c4r3] to complete the setup and keep [zone:windows:c7r4]1[/zone:windows:c7r4] major threat compared with [zone:windows:c3r3|c3r4|c7r3|c7r4]4[/zone:windows:c3r3|c3r4|c7r3|c7r4] after the best move, instead of staying at [zone:windows:c7r4]1[/zone:windows:c7r4].
```

### eval-44 — overcut (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gn |   |   |Gn |   |   |   |
  5  |Gy |Gn |Gn |Gn |Gy |   |   |
  4  |Gn |Gn |Gy |Gy |Gy |   |   |
  3  |Gy |Gy |Gy |Gn |Gn |   |   |
  2  |Gy |Gn |Gy |Gn |Gy |   |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gn25 | (gn) | (gn) | Gn29 |      | [Gy] |      |
  5  | Gy14 | Gn17 | Gn27 | Gn21 | Gy28 |      | (gn) |
  4  | Gn13 | Gn11 | Gy26 | Gy10 | Gy22 | [*]  | (gy) |
  3  | Gy12 | Gy 6 | Gy20 | Gn 9 | Gn19 | (gn) | (gn) |
  2  | Gy 8 | Gn 5 | Gy16 | Gn 7 | Gy18 |      |      |
  1  | Gy 4 | Gn 3 | Gn15 | Gn 1 | Gy 2 | Gn23 | Gy24 |

  ht |   6  |   5  |   5  |   6  |   5  |   1  |   1  |  (discs in column)
 par |  0E  |  1O  |  1O  |  0E  |  1O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn+Gy)   col6 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gn |   |Gy |Gn |   |   |   |
  5  |Gy |Gn |Gn |Gn |Gy |   |   |
  4  |Gn |Gn |Gy |Gy |Gy |   |   |
  3  |Gy |Gy |Gy |Gn |Gn |   |   |
  2  |Gy |Gn |Gy |Gn |Gy |   |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gn25 |      | Gy30 | Gn29 |      | [Gy] |      |
  5  | Gy14 | Gn17 | Gn27 | Gn21 | Gy28 |      | (gn) |
  4  | Gn13 | Gn11 | Gy26 | Gy10 | Gy22 | [*]  | (gy) |
  3  | Gy12 | Gy 6 | Gy20 | Gn 9 | Gn19 | (gn) | (gn) |
  2  | Gy 8 | Gn 5 | Gy16 | Gn 7 | Gy18 |      |      |
  1  | Gy 4 | Gn 3 | Gn15 | Gn 1 | Gy 2 | Gn23 | Gy24 |

  ht |   6  |   5  |   6  |   6  |   5  |   1  |   1  |  (discs in column)
 par |  0E  |  1O  |  0E  |  0E  |  1O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn+Gy)   col6 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gn |   |   |Gn |   |   |   |
  5  |Gy |Gn |Gn |Gn |Gy |   |   |
  4  |Gn |Gn |Gy |Gy |Gy |   |   |
  3  |Gy |Gy |Gy |Gn |Gn |   |   |
  2  |Gy |Gn |Gy |Gn |Gy |   |Gy |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gn25 | (gn) | (gn) | Gn29 |      | [Gy] |      |
  5  | Gy14 | Gn17 | Gn27 | Gn21 | Gy28 |      | (gn) |
  4  | Gn13 | Gn11 | Gy26 | Gy10 | Gy22 | [*]  | (gy) |
  3  | Gy12 | Gy 6 | Gy20 | Gn 9 | Gn19 | (gn) | (*)  |
  2  | Gy 8 | Gn 5 | Gy16 | Gn 7 | Gy18 |      | Gy30 |
  1  | Gy 4 | Gn 3 | Gn15 | Gn 1 | Gy 2 | Gn23 | Gy24 |

  ht |   6  |   5  |   5  |   6  |   5  |   1  |   2  |  (discs in column)
 par |  0E  |  1O  |  1O  |  0E  |  1O  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn+Gy)   col6 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r2.
- Better move: column 3
- The better move places a disc on c3r6.
- Key insight: You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]4[/zone:opponent-minor-pre]

After the best move (column 3):
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 7):
- Opponent minor threats: [zone:opponent-minor-played]4[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- overcut: cells [c6r4, c6r6]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r4, c6r6]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:overcut] **overcut** (overcut): When a player's major threat at a higher row wins despite the opponent having a
lower threat in the same column, because the lower threat lacks the parity needed
to neutralize the upper one.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You missed the [term:overcut]overcut[/term:overcut] on [zone:col3]column 3[/zone:col3]: by playing [zone:col7]column 7[/zone:col7], you left [zone:windows:c2r6|c3r6|c6r3|c7r3]4[/zone:windows:c2r6|c3r6|c6r3|c7r3] minor threats in place, while the better move would have cut them to [zone:windows:c6r3|c7r3]2[/zone:windows:c6r3|c7r3]. Playing [zone:col3]column 3[/zone:col3] would have dropped a disc on [zone:c3r6]that cell[/zone:c3r6] and neutralized the higher threat at [zone:c6r6]that cell[/zone:c6r6] with your lower disc at [zone:c6r4]that cell[/zone:c6r4], which is the cleaner way to handle the position.
```

### eval-45 — odd_even_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gn13 |      |      |      |
  5  |      | (gy) | (gn) | Gy 8 | (gn) |      | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 |      | (gn) | (gy) |
  3  | (gy) | (*)  | (gn) | Gy 6 | Gn 3 | (gy) |      |
  2  | Gy12 | Gn11 |      | Gn 5 | Gy 2 | (gn) |      |
  1  | Gy10 | Gn 9 | (gn) | Gy 4 | Gn 1 | (gy) | (gn) |

  ht |   2  |   2  |   0  |   6  |   3  |   0  |   0  |  (discs in column)
 par |  4E  |  4E  |  6E  |  0E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |Gy |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gn13 |      |      |      |
  5  |      | (gy) | (gn) | Gy 8 | (gn) |      | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 |      | (gn) | (gy) |
  3  | (gy) | (*)  | (gn) | Gy 6 | Gn 3 | (gy) |      |
  2  | Gy12 | Gn11 |      | Gn 5 | Gy 2 | (gn) |      |
  1  | Gy10 | Gn 9 | Gy14 | Gy 4 | Gn 1 | (gy) | (gn) |

  ht |   2  |   2  |   1  |   6  |   3  |   0  |   0  |  (discs in column)
 par |  4E  |  4E  |  5O  |  0E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gn13 |      |      | (gy) |
  5  |      | (gy) | (gn) | Gy 8 | (gn) | (gy) | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 | Gy14 | (gn) | (gy) |
  3  | (gy) | (*)  | (gn) | Gy 6 | Gn 3 | (gy) |      |
  2  | Gy12 | Gn11 | (gy) | Gn 5 | Gy 2 | (gn) | (gy) |
  1  | Gy10 | Gn 9 | (gn) | Gy 4 | Gn 1 | (gy) | (gn) |

  ht |   2  |   2  |   0  |   6  |   4  |   0  |   0  |  (discs in column)
 par |  4E  |  4E  |  6E  |  0E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r4.
- Better move: column 3
- The better move places a disc on c3r1.
- Key insight: Your move gave Red threats on both row parities.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]11[/zone:opponent-minor-pre]

After the best move (column 3):
- Opponent minor threats: [zone:opponent-minor-best]10[/zone:opponent-minor-best]

After the move played (column 5):
- Opponent minor threats: [zone:opponent-minor-played]11[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r4]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col5]column 5[/zone:col5], you put a disc on [zone:c5r4]that cell[/zone:c5r4] and gave your opponent threats on both parities instead of keeping them confined. The missed idea was the [term:odd_even_threat]odd even threat[/term:odd_even_threat]: if you had played [zone:col3]column 3[/zone:col3], you would have taken [zone:c3r1]that cell[/zone:c3r1] and reduced your opponent’s minor threats from [zone:windows:c2r3|c2r4|c2r6|c3r1|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5]11[/zone:windows:c2r3|c2r4|c2r6|c3r1|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5] to [zone:windows:c2r3|c2r4|c2r6|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5]10[/zone:windows:c2r3|c2r4|c2r6|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5], while your move left them at [zone:windows:c2r3|c2r4|c2r6|c3r1|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5]11[/zone:windows:c2r3|c2r4|c2r6|c3r1|c3r3|c3r5|c5r5|c6r2|c6r4|c7r1|c7r5].
```

### eval-46 — odd_even_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gn13 |      |      | (gy) |
  5  |      | (gy) | (gn) | Gy 8 | (gn) | (gy) | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 | Gy14 | (gn) | (gy) |
  3  | (gy) | (*)  | (gn) | Gy 6 | Gn 3 | (gy) |      |
  2  | Gy12 | Gn11 | (gy) | Gn 5 | Gy 2 | (gn) | (gy) |
  1  | Gy10 | Gn 9 | (gn) | Gy 4 | Gn 1 | (gy) | (gn) |

  ht |   2  |   2  |   0  |   6  |   4  |   0  |   0  |  (discs in column)
 par |  4E  |  4E  |  6E  |  0E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gn13 |      | (gn) | (gy) |
  5  |      | (gy) | (gn) | Gy 8 | Gn15 | (gy) | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 | Gy14 | (gn) | (gy) |
  3  | (gy) | (*)  | [Gn] | Gy 6 | Gn 3 | (gy) | (gn) |
  2  | Gy12 | Gn11 | (gy) | Gn 5 | Gy 2 | (gn) | (gy) |
  1  | Gy10 | Gn 9 | (gn) | Gy 4 | Gn 1 | (gy) | (gn) |

  ht |   2  |   2  |   0  |   6  |   5  |   0  |   0  |  (discs in column)
 par |  4E  |  4E  |  6E  |  0E  |  1O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |Gy |Gn |   |Gn |Gy |   |   |
  1  |Gy |Gn |   |Gy |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gn13 |      |      | (gy) |
  5  |      | (gy) | (gn) | Gy 8 | (gn) | (gy) | (gn) |
  4  | (gy) | (gn) | (gy) | Gn 7 | Gy14 | (gn) | (gy) |
  3  | (gy) | (*)  | (gn) | Gy 6 | Gn 3 | (gy) |      |
  2  | Gy12 | Gn11 | (gy) | Gn 5 | Gy 2 | (gn) | (gy) |
  1  | Gy10 | Gn 9 | (gn) | Gy 4 | Gn 1 | Gn15 | (gn) |

  ht |   2  |   2  |   0  |   6  |   4  |   1  |   0  |  (discs in column)
 par |  4E  |  4E  |  6E  |  0E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 5
- The better move places a disc on c5r5.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: 0

After the best move (column 5):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 6):
- Your major threats: 0

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave ground by playing [zone:col6]column 6[/zone:col6], because that only landed on [zone:c6r1]the bottom cell[/zone:c6r1] and did not build anything concrete for you. The better move was [zone:col5]column 5[/zone:col5]: it would have created a [term:major_threat]major threat[/term:major_threat] for you on [zone:c5r5]that cell[/zone:c5r5], and that was the stronger way to keep pressure on the board.
```

### eval-47 — figure_7 (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |Gn |   |   |
  5  |   |   |   |   |Gy |   |   |
  4  |   |   |   |Gy |Gy |   |Gy |
  3  |Gy |   |   |Gn |Gn |   |Gn |
  2  |Gy |   |Gy |Gn |Gy |   |Gn |
  1  |Gn |Gn |Gy |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | Gn11 | (gy) |      |
  5  | (gy) |      |      |      | Gy10 |      | (gn) |
  4  | (gy) | (*)  | (gy) | Gy14 | Gy 8 | [Gy] | Gy20 |
  3  | Gy16 | (*)  | (*)  | Gn 7 | Gn 3 | [*]  | Gn19 |
  2  | Gy12 | (gy) | Gy18 | Gn 5 | Gy 2 |      | Gn17 |
  1  | Gn 9 | Gn15 | Gy 6 | Gy 4 | Gn 1 |      | Gn13 |

  ht |   3  |   1  |   2  |   4  |   6  |   0  |   4  |  (discs in column)
 par |  3O  |  5O  |  4E  |  2E  |  0E  |  6E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col6 row3 (Gn+Gy)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |Gn |   |   |
  5  |   |   |   |   |Gy |   |   |
  4  |   |   |   |Gy |Gy |   |Gy |
  3  |Gy |   |Gn |Gn |Gn |   |Gn |
  2  |Gy |   |Gy |Gn |Gy |   |Gn |
  1  |Gn |Gn |Gy |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | Gn11 |      |      |
  5  | (*)  |      |      |      | Gy10 |      | (gn) |
  4  | (gy) | [Gn] | (gy) | Gy14 | Gy 8 | [Gy] | Gy20 |
  3  | Gy16 | [Gn] | Gn21 | Gn 7 | Gn 3 | [*]  | Gn19 |
  2  | Gy12 |      | Gy18 | Gn 5 | Gy 2 |      | Gn17 |
  1  | Gn 9 | Gn15 | Gy 6 | Gy 4 | Gn 1 |      | Gn13 |

  ht |   3  |   1  |   3  |   4  |   6  |   0  |   4  |  (discs in column)
 par |  3O  |  5O  |  3O  |  2E  |  0E  |  6E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row4 (Gn)   col6 row3 (Gn+Gy)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |Gn |   |   |
  5  |   |   |   |   |Gy |   |   |
  4  |   |   |   |Gy |Gy |   |Gy |
  3  |Gy |   |   |Gn |Gn |   |Gn |
  2  |Gy |Gn |Gy |Gn |Gy |   |Gn |
  1  |Gn |Gn |Gy |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | Gn11 | (gy) |      |
  5  | (gy) |      |      |      | Gy10 |      | (gn) |
  4  | (gy) | (*)  | (gy) | Gy14 | Gy 8 | [Gy] | Gy20 |
  3  | Gy16 | (*)  | (*)  | Gn 7 | Gn 3 | [*]  | Gn19 |
  2  | Gy12 | Gn21 | Gy18 | Gn 5 | Gy 2 |      | Gn17 |
  1  | Gn 9 | Gn15 | Gy 6 | Gy 4 | Gn 1 |      | Gn13 |

  ht |   3  |   2  |   2  |   4  |   6  |   0  |   4  |  (discs in column)
 par |  3O  |  4E  |  4E  |  2E  |  0E  |  6E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col6 row3 (Gn+Gy)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You had a Figure-7 fork structure and didn't complete it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Opponent minor threats: [zone:opponent-minor-pre]7[/zone:opponent-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]3[/zone:player-major-best]
- Opponent minor threats: [zone:opponent-minor-best]3[/zone:opponent-minor-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Opponent minor threats: [zone:opponent-minor-played]6[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- figure_7: cells [c5r1, c4r2, c5r3, c4r3, c3r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r1, c4r2, c5r3, c4r3, c3r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:figure_7]figure 7[/term:figure_7] available, and the mistake was not taking [zone:col3]column 3[/zone:col3] to land on [zone:c3r3]that cell[/zone:c3r3] and complete it. The better move would have given you [zone:windows:c2r3|c2r4|c6r3]3[/zone:windows:c2r3|c2r4|c6r3] major threats while also holding your opponent to [zone:windows:c1r4|c1r5|c2r3]3[/zone:windows:c1r4|c1r5|c2r3] minor threats; by playing [zone:col2]column 2[/zone:col2] instead, you left yourself at only [zone:windows:c6r3]1[/zone:windows:c6r3] major threat and let your opponent keep [zone:windows:c1r4|c1r5|c2r3|c3r3|c3r4|c6r6]6[/zone:windows:c1r4|c1r5|c2r3|c3r3|c3r4|c6r6] minor threats.
```

### eval-48 — odd_even_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gy |   |Gy |   |   |   |
  3  |   |Gn |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gn |   |Gn |Gy |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) | (gn) |      |      |      |      |      |
  4  | (*)  | Gy10 | (*)  | Gy12 | (*)  |      | (gn) |
  3  | (gn) | Gn 9 | [Gy] | Gn11 | (*)  | (gn) |      |
  2  |      | Gn 5 | (gn) | Gy 8 | Gn 7 | (gy) |      |
  1  | Gy 4 | Gn 3 |      | Gn 1 | Gy 2 | (gn) | Gy 6 |

  ht |   1  |   4  |   0  |   4  |   2  |   0  |   1  |  (discs in column)
 par |  5O  |  2E  |  6E  |  2E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gy |   |Gy |   |   |   |
  3  |   |Gn |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gn |   |Gn |Gy |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | (gn) |      |      |
  5  | (gy) | (gn) |      | Gn13 |      |      |      |
  4  | (*)  | Gy10 | (*)  | Gy12 | (*)  |      | (gn) |
  3  | (gn) | Gn 9 | [Gy] | Gn11 | (*)  | (gn) |      |
  2  | (gn) | Gn 5 | (gn) | Gy 8 | Gn 7 | (gy) |      |
  1  | Gy 4 | Gn 3 |      | Gn 1 | Gy 2 | (gn) | Gy 6 |

  ht |   1  |   4  |   0  |   5  |   2  |   0  |   1  |  (discs in column)
 par |  5O  |  2E  |  6E  |  1O  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gy |   |Gy |   |   |   |
  3  |   |Gn |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gn |Gn |Gn |Gy |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) | (gn) |      |      |      |      |      |
  4  | (*)  | Gy10 | (*)  | Gy12 | (*)  |      | (gn) |
  3  | (gn) | Gn 9 | [Gy] | Gn11 | (*)  | (gn) |      |
  2  |      | Gn 5 | (gn) | Gy 8 | Gn 7 | (gy) |      |
  1  | Gy 4 | Gn 3 | Gn13 | Gn 1 | Gy 2 | (gn) | Gy 6 |

  ht |   1  |   4  |   1  |   4  |   2  |   0  |   1  |  (discs in column)
 par |  5O  |  2E  |  5O  |  2E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]11[/zone:player-minor-pre]

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]13[/zone:player-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]11[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You gave up the stronger [term:odd_even_threat]odd-even threat[/term:odd_even_threat] plan by playing in [zone:col3]column 3[/zone:col3] instead of building on [zone:col4]column 4[/zone:col4]. The better move would have placed your disc on [zone:c4r5]that cell[/zone:c4r5], giving you more room to keep pressure on the odd row plan: your minor threats would have been [zone:windows:c1r2|c1r3|c1r4|c2r5|c3r2|c3r3|c3r4|c5r3|c5r4|c5r6|c6r1|c6r3|c7r4]13[/zone:windows:c1r2|c1r3|c1r4|c2r5|c3r2|c3r3|c3r4|c5r3|c5r4|c5r6|c6r1|c6r3|c7r4] there, while your move left them at [zone:windows:c1r3|c1r4|c2r5|c3r2|c3r3|c3r4|c5r3|c5r4|c6r1|c6r3|c7r4]11[/zone:windows:c1r3|c1r4|c2r5|c3r2|c3r3|c3r4|c5r3|c5r4|c6r1|c6r3|c7r4].
```

### eval-49 — claimeven (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gy |Gy |   |Gy |   |
  3  |   |   |Gn |Gn |   |Gn |   |
  2  |   |   |Gy |Gn |   |Gn |Gy |
  1  |   |   |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) | Gy16 |      |      |      |
  5  | (gn) |      |      | Gn15 | (gy) |      |      |
  4  | (gy) | (*)  | Gy 8 | Gy12 | [Gy] | Gy14 | (*)  |
  3  | (gn) | (gn) | Gn 7 | Gn11 | [Gn] | Gn13 | (*)  |
  2  |      |      | Gy 6 | Gn 9 | (gn) | Gn 5 | Gy10 |
  1  |      |      | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 |

  ht |   0  |   0  |   4  |   6  |   0  |   4  |   2  |  (discs in column)
 par |  6E  |  6E  |  2E  |  0E  |  6E  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn)   col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |Gn |Gn |   |   |   |
  4  |   |   |Gy |Gy |   |Gy |   |
  3  |   |   |Gn |Gn |   |Gn |   |
  2  |   |   |Gy |Gn |   |Gn |Gy |
  1  |   |   |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) | Gy16 |      |      |      |
  5  | (gn) | (gn) | Gn17 | Gn15 | (*)  | (gn) |      |
  4  | (gy) | (*)  | Gy 8 | Gy12 | [Gy] | Gy14 | (*)  |
  3  | (gn) | (gn) | Gn 7 | Gn11 | [Gn] | Gn13 | (*)  |
  2  |      |      | Gy 6 | Gn 9 | (gn) | Gn 5 | Gy10 |
  1  |      |      | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 |

  ht |   0  |   0  |   5  |   6  |   0  |   4  |   2  |  (discs in column)
 par |  6E  |  6E  |  1O  |  0E  |  6E  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn)   col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |   |Gy |Gy |   |Gy |   |
  3  |   |   |Gn |Gn |   |Gn |   |
  2  |   |   |Gy |Gn |   |Gn |Gy |
  1  |   |   |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) | Gy16 |      |      | (gn) |
  5  | (gn) |      | (gn) | Gn15 | (*)  | Gn17 | (gn) |
  4  | (gy) | (*)  | Gy 8 | Gy12 | [Gy] | Gy14 | (*)  |
  3  | (gn) | (gn) | Gn 7 | Gn11 | [Gn] | Gn13 | (*)  |
  2  |      |      | Gy 6 | Gn 9 | (gn) | Gn 5 | Gy10 |
  1  |      |      | Gy 2 | Gn 1 | (gn) | Gn 3 | Gy 4 |

  ht |   0  |   0  |   4  |   6  |   0  |   5  |   2  |  (discs in column)
 par |  6E  |  6E  |  2E  |  0E  |  6E  |  1O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col5 row3 (Gn)   col5 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r5.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: You gave Yellow a claimeven endgame — they now control the pairing.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 3):


After the move played (column 6):


## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col3]column 3[/zone:col3]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col6]column 6[/zone:col6], you gave your opponent a [term:claimeven]claimeven[/term:claimeven] finish, so they now control the pairing and can steer the endgame. If you had played [zone:col3]column 3[/zone:col3] instead, you would have taken [zone:c3r5]that cell[/zone:c3r5] and kept the position from handing your opponent that pairing control.
```

### eval-50 — claimeven (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (gn) | (gn) |      |      |
  4  | (gn) | Gn 9 | (gn) | Gn 7 | (gn) |      | (gn) |
  3  |      | Gy 8 | (gn) | Gn 5 |      | (gn) |      |
  2  |      | Gn 3 |      | Gy 4 | Gn11 |      |      |
  1  | Gy 6 | Gy 2 |      | Gn 1 | Gy10 | (gn) |      |

  ht |   1  |   4  |   0  |   4  |   2  |   0  |   0  |  (discs in column)
 par |  5O  |  2E  |  6E  |  2E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |Gy |   |   |
  2  |   |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (gn) | (gn) |      | (gy) |
  4  | (gn) | Gn 9 | (gn) | Gn 7 | (gn) | (gy) | (gn) |
  3  |      | Gy 8 | (gn) | Gn 5 | Gy12 | (gn) |      |
  2  |      | Gn 3 |      | Gy 4 | Gn11 |      |      |
  1  | Gy 6 | Gy 2 | (gy) | Gn 1 | Gy10 | (gn) |      |

  ht |   1  |   4  |   0  |   4  |   3  |   0  |   0  |  (discs in column)
 par |  5O  |  2E  |  6E  |  2E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |Gy |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (*)  | (gn) |      |      |
  4  | (*)  | Gn 9 | (*)  | Gn 7 | (gn) |      | (gn) |
  3  | (gy) | Gy 8 | (gn) | Gn 5 |      | (gn) |      |
  2  | Gy12 | Gn 3 |      | Gy 4 | Gn11 |      |      |
  1  | Gy 6 | Gy 2 |      | Gn 1 | Gy10 | (gn) |      |

  ht |   2  |   4  |   0  |   4  |   2  |   0  |   0  |  (discs in column)
 par |  4E  |  2E  |  6E  |  2E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: You had a claimeven endgame — the pairing was yours — and threw it away.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it.

Before the move:


After the best move (column 5):


After the move played (column 1):


## Best-move tactical evidence
The following tactical patterns were present after the best move:
- claimeven (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:claimeven]claimeven[/term:claimeven] endgame, and by playing [zone:col1]column 1[/zone:col1] you gave away the pairing instead of keeping it. The better move was [zone:col5]column 5[/zone:col5], where you could have played [zone:c5r3]that cell[/zone:c5r3] to hold the even-row control you wanted on your winning rows.
```

### eval-51 — claimeven (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |Gy |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (*)  | (gn) |      |      |
  4  | (*)  | Gn 9 | (*)  | Gn 7 | (gn) |      | (gn) |
  3  | (gy) | Gy 8 | (gn) | Gn 5 |      | (gn) |      |
  2  | Gy12 | Gn 3 |      | Gy 4 | Gn11 |      |      |
  1  | Gy 6 | Gy 2 |      | Gn 1 | Gy10 | (gn) |      |

  ht |   2  |   4  |   0  |   4  |   2  |   0  |   0  |  (discs in column)
 par |  4E  |  2E  |  6E  |  2E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |Gy |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | <Gn> |      |      |      |
  5  |      | (gn) |      | Gn13 | (gn) |      |      |
  4  | (*)  | Gn 9 | (gn) | Gn 7 | (gn) |      | (gn) |
  3  | (gy) | Gy 8 | (gn) | Gn 5 |      | (gn) |      |
  2  | Gy12 | Gn 3 |      | Gy 4 | Gn11 |      |      |
  1  | Gy 6 | Gy 2 |      | Gn 1 | Gy10 | (gn) |      |

  ht |   2  |   4  |   0  |   5  |   2  |   0  |   0  |  (discs in column)
 par |  4E  |  2E  |  6E  |  1O  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row6 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |Gn |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |Gy |Gn |   |Gy |Gn |   |   |
  1  |Gy |Gy |   |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  |      | (gn) |      | (*)  | (gn) |      |      |
  4  | (*)  | Gn 9 | (*)  | Gn 7 | (gn) |      | (gn) |
  3  | (gy) | Gy 8 | (gn) | Gn 5 | (gn) | (gn) |      |
  2  | Gy12 | Gn 3 |      | Gy 4 | Gn11 | (gn) |      |
  1  | Gy 6 | Gy 2 |      | Gn 1 | Gy10 | (gn) | Gn13 |

  ht |   2  |   4  |   0  |   4  |   2  |   0  |   1  |  (discs in column)
 par |  4E  |  2E  |  6E  |  2E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: You gave Yellow a claimeven endgame — they now control the pairing.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]4[/zone:opponent-minor-pre]

After the best move (column 4):
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 7):
- Opponent minor threats: [zone:opponent-minor-played]4[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c4r6]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r6]
- YOUR OPPONENT's threat cells: [c1r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
By playing [zone:col7]column 7[/zone:col7], you gave your opponent a [term:claimeven]claimeven[/term:claimeven] endgame, so they now control the pairing instead of you. The better move was [zone:col4]column 4[/zone:col4], which would have placed your disc on [zone:c4r5]that cell[/zone:c4r5] and kept your opponent’s minor threats lower, from [zone:windows:c1r3|c1r4|c3r4|c4r5]4[/zone:windows:c1r3|c1r4|c3r4|c4r5] to [zone:windows:c1r3|c1r4]2[/zone:windows:c1r3|c1r4], while your move left them at [zone:windows:c1r3|c1r4|c3r4|c4r5]4[/zone:windows:c1r3|c1r4|c3r4|c4r5].
```

### eval-52 — claimeven (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 31  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |Gn |Gn |Gy |   |   |
  5  |   |Gn |Gn |Gn |Gy |   |Gn |
  4  |   |Gy |Gy |Gy |Gn |   |Gy |
  3  |   |Gy |Gn |Gn |Gy |   |Gy |
  2  |Gy |Gn |Gy |Gy |Gn |   |Gn |
  1  |Gn |Gy |Gy |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  | [Gn] | Gn29 | Gn25 | Gn23 | Gy30 |      | (gn) |
  5  | [Gn] | Gn27 | Gn21 | Gn15 | Gy28 | (gn) | Gn31 |
  4  | [Gy] | Gy16 | Gy20 | Gy10 | Gn 9 | [Gy] | Gy26 |
  3  |      | Gy14 | Gn19 | Gn 7 | Gy 8 | [Gn] | Gy24 |
  2  | Gy22 | Gn13 | Gy18 | Gy 6 | Gn 5 |      | Gn11 |
  1  | Gn17 | Gy12 | Gy 2 | Gn 1 | Gy 4 |      | Gn 3 |

  ht |   2  |   6  |   6  |   6  |   6  |   0  |   5  |  (discs in column)
 par |  4E  |  0E  |  0E  |  0E  |  0E  |  6E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy)   col1 row5 (Gn)   col1 row6 (Gn)   col6 row3 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 32  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gn |Gn |Gn |Gy |   |   |
  5  |   |Gn |Gn |Gn |Gy |   |Gn |
  4  |   |Gy |Gy |Gy |Gn |   |Gy |
  3  |   |Gy |Gn |Gn |Gy |   |Gy |
  2  |Gy |Gn |Gy |Gy |Gn |   |Gn |
  1  |Gn |Gy |Gy |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  | [Gn] | Gn29 | Gn25 | Gn23 | Gy30 |      | (gn) |
  5  | [Gn] | Gn27 | Gn21 | Gn15 | Gy28 | (gn) | Gn31 |
  4  | [Gy] | Gy16 | Gy20 | Gy10 | Gn 9 | [Gy] | Gy26 |
  3  |      | Gy14 | Gn19 | Gn 7 | Gy 8 | [Gn] | Gy24 |
  2  | Gy22 | Gn13 | Gy18 | Gy 6 | Gn 5 |      | Gn11 |
  1  | Gn17 | Gy12 | Gy 2 | Gn 1 | Gy 4 | Gy32 | Gn 3 |

  ht |   2  |   6  |   6  |   6  |   6  |   1  |   5  |  (discs in column)
 par |  4E  |  0E  |  0E  |  0E  |  0E  |  5O  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy)   col1 row5 (Gn)   col1 row6 (Gn)   col6 row3 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 32  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gn |Gn |Gn |Gy |   |   |
  5  |   |Gn |Gn |Gn |Gy |   |Gn |
  4  |   |Gy |Gy |Gy |Gn |   |Gy |
  3  |Gy |Gy |Gn |Gn |Gy |   |Gy |
  2  |Gy |Gn |Gy |Gy |Gn |   |Gn |
  1  |Gn |Gy |Gy |Gn |Gy |   |Gn |

        1      2      3      4      5      6      7   
  6  | [Gn] | Gn29 | Gn25 | Gn23 | Gy30 |      | (gn) |
  5  | [Gn] | Gn27 | Gn21 | Gn15 | Gy28 | (gn) | Gn31 |
  4  | <Gy> | Gy16 | Gy20 | Gy10 | Gn 9 | [Gy] | Gy26 |
  3  | Gy32 | Gy14 | Gn19 | Gn 7 | Gy 8 | [Gn] | Gy24 |
  2  | Gy22 | Gn13 | Gy18 | Gy 6 | Gn 5 |      | Gn11 |
  1  | Gn17 | Gy12 | Gy 2 | Gn 1 | Gy 4 |      | Gn 3 |

  ht |   3  |   6  |   6  |   6  |   6  |   0  |   5  |  (discs in column)
 par |  3O  |  0E  |  0E  |  0E  |  0E  |  6E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gy) [GT]   col1 row5 (Gn)   col1 row6 (Gn)   col6 row3 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r3.
- Better move: column 6
- The better move places a disc on c6r1.
- Key insight: You had a claimeven endgame — the pairing was yours — and threw it away.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]2[/zone:player-major-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]

After the move played (column 1):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- undercut: cells [c6r3, c6r4]
- claimeven (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col6]column 6[/zone:col6]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r3, c6r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
You had a [term:claimeven]claimeven[/term:claimeven] endgame and threw it away by playing [zone:col1]column 1[/zone:col1], which let your disc land on [zone:c1r3]that cell[/zone:c1r3] and reduced your major threats from [zone:windows:c1r4|c6r4]2[/zone:windows:c1r4|c6r4] to [zone:windows:c6r4]1[/zone:windows:c6r4]. The better move was [zone:col6]column 6[/zone:col6]: by playing there you would have kept the pairing in place and used the [term:undercut]undercut[/term:undercut] on [zone:cells:c6r3,c6r4]the threat cluster[/zone:cells:c6r3,c6r4], preserving your stronger endgame setup instead of giving it away.
```

### eval-53 — z_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |   |Gy |   |   |   |   |
  2  |   |Gy |Gn |   |Gn |   |   |
  1  |Gy |Gn |Gn |   |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      |      | (gy) |      |      |
  4  |      | (gy) | Gn 9 | [Gy] | (gn) |      |      |
  3  |      |      | Gy 4 | (gn) |      |      |      |
  2  |      | Gy 6 | Gn 3 | (*)  | Gn 7 | (gn) |      |
  1  | Gy 8 | Gn 5 | Gn 1 | (gy) | Gy 2 | Gy10 | (gy) |

  ht |   1  |   2  |   4  |   0  |   2  |   1  |   0  |  (discs in column)
 par |  5O  |  4E  |  2E  |  6E  |  4E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |   |Gy |   |Gn |   |   |
  2  |   |Gy |Gn |   |Gn |   |   |
  1  |Gy |Gn |Gn |   |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      |      | (*)  |      |      |
  4  |      | (gy) | Gn 9 | [Gy] | (gn) | (gn) |      |
  3  |      |      | Gy 4 | (gn) | Gn11 |      |      |
  2  |      | Gy 6 | Gn 3 | (*)  | Gn 7 | (gn) |      |
  1  | Gy 8 | Gn 5 | Gn 1 | (gy) | Gy 2 | Gy10 | (gy) |

  ht |   1  |   2  |   4  |   0  |   3  |   1  |   0  |  (discs in column)
 par |  5O  |  4E  |  2E  |  6E  |  3O  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |   |Gy |   |   |   |   |
  2  |   |Gy |Gn |   |Gn |Gn |   |
  1  |Gy |Gn |Gn |   |Gy |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      |      | (gy) |      |      |
  4  |      | (gy) | Gn 9 | [Gy] | (gn) |      |      |
  3  |      |      | Gy 4 | (gn) |      |      |      |
  2  |      | Gy 6 | Gn 3 | [Gn] | Gn 7 | Gn11 | (gn) |
  1  | Gy 8 | Gn 5 | Gn 1 | (gy) | Gy 2 | Gy10 | (gy) |

  ht |   1  |   2  |   4  |   0  |   2  |   2  |   0  |  (discs in column)
 par |  5O  |  4E  |  2E  |  6E  |  4E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gn)   col4 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r2.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: Your move handed your opponent the parity advantage.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing a threat count, copy the zone tag shown on that line and wrap the count with it. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]5[/zone:player-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]7[/zone:player-minor-best]

After the move played (column 6):
- Your minor threats: [zone:player-minor-played]3[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.
- [term:gravity_top] **gravity top** (gravity_top): The gravity-top of a column is the next legally playable cell — the lowest empty
row in that column. Only gravity-top cells can be played immediately; all cells
above them require filling the rows below first.
- [term:parity] **parity** (parity): Parity describes whether a threat cell sits on an odd or even row (1-indexed from
the bottom). Threats on odd rows favour Green (first player); threats on even rows
favour Gray (second player). The board's par row shows column parity — the count
of remaining empty cells per column (O = odd, E = even).

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]", or similarly for minor threats). If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, ground your explanation in the concrete board change — cite the exact landing squares and columns that differ between the two moves — and do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

```
Playing [zone:col6]column 6[/zone:col6] was a small mistake because it handed your opponent the parity advantage around the central fight, and it only left you with [zone:windows:c2r5|c4r3|c5r4]3[/zone:windows:c2r5|c4r3|c5r4] minor threats. The better move was [zone:col5]column 5[/zone:col5], where you could have played on [zone:c5r3]that cell[/zone:c5r3] to keep more pressure with [zone:windows:c2r5|c4r2|c4r3|c5r4|c5r5|c6r2|c6r4]7[/zone:windows:c2r5|c4r2|c4r3|c5r4|c5r5|c6r2|c6r4] minor threats and keep the balance harder for your opponent to control.
```

