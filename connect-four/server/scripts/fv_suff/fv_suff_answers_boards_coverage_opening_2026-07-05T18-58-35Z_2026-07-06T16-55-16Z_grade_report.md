# Feature-Vector Sufficiency Report — fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_2026-07-06T16-55-16Z.jsonl

## Summary
- Answer rows: 57   parse failures: 0
- Cases (id × condition): 57   passed (A1–A5 + G1–G7 on all runs): 40   failed: 17
- All 57 cases are **condition D** (grounded-render), single run each (run_index 0).
- Per-axis pass rate (all gradeable runs): A1 57/57 · A2 57/57 · A3 57/57 · A4 55/57 · A5 41/57 · G1 57/57 · G2 57/57 · G3 57/57 · G4 57/57 · G5 57/57 · G6 57/57 · G7 43/57

## Pass/fail by condition (only condition D present)
| condition | cases | passed | A3 | A4 | A5 | G7 |
|---|---|---|---|---|---|---|
| D | 57 | 40 | 57/57 | 55/57 | 41/57 | 43/57 |

No A/B/C ablation arms in this batch — only the grounded-render (D) prompt was run, so the A-vs-D delta is not measurable here.

## Per-case verdict
| id | category | cond | A1 | A2 | A3 | A4 | A5 | G7 | pass |
|---|---|---|---|---|---|---|---|---|---|
| eval-1 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-2 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-3 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-4 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-5 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-6 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-7 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-8 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-9 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-10 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-11 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-12 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-13 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-14 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-15 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-16 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-17 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-18 | win_to_lose | D | pass | pass | pass | fail | pass | pass | ❌ |
| eval-19 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-20 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-21 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-22 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-23 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | pass | ❌ |
| eval-24 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | pass | ❌ |
| eval-25 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-26 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-27 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-28 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-29 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-30 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-31 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-32 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-33 | win_to_draw | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-34 | draw_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-35 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-36 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-37 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-38 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-39 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-40 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-41 | lose_to_faster_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-42 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-43 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-44 | draw_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-45 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-46 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-47 | lose_to_faster_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-48 | draw_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-49 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-50 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-51 | draw_to_lose | D | pass | pass | pass | fail | fail | fail | ❌ |
| eval-52 | win_to_lose | D | pass | pass | pass | pass | pass | pass | ✅ |
| eval-53 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-54 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-55 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-56 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |
| eval-57 | win_to_lose | D | pass | pass | pass | pass | fail | fail | ❌ |

> **eval-18** (win_to_lose): Model fabricated an asymmetric centrality claim ('the stronger central column' for col6 vs 'the side column' for col2) though betterCell c6r2 and playedCell c2r5 are equidistant from center col4 and centralityComparison.qualitative was null.
> **eval-23** (lose_to_faster_lose): For a player-2 opening the mechanism is defeatist ("both lines still end poorly with best play" = both moves lose) with no hold-the-line reframe, though render_decision.link L7.text supplied the stubborn-defense/practical-swindle frame the model failed to use.
> **eval-24** (lose_to_faster_lose): A5b: for player-2 in an opening the mechanism declares 'the final result still goes against you' (telling the player they are lost), which the clean L7 hold-the-line link.text did not supply — model-introduced defeatism.
> **eval-30** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-37** (lose_to_faster_lose): Model emitted malformed bare tag(s) [zone:col1] [zone:col2] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-42** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:double_threat] [zone:col1] [zone:col4] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-43** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-45** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-46** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:double_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-47** (lose_to_faster_lose): Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-49** (win_to_lose): Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-51** (draw_to_lose): Model mislabeled the opponent's single-square immediate win at c4r2 (two Green lines converging on one cell) as a 'two-way double_threat' and misattributed the offered you-double fork to the opponent (A4 fabrication); AND emitted malformed bare tags [term:immediate_threat]/[term:double_threat]/[zone:c4r2]/[zone:col4]/[zone:col1] that leak verbatim to the user (A5/G7).
> **eval-53** (win_to_lose): Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-54** (win_to_lose): Model emitted malformed bare tag(s) [term:double_threat] [zone:col4] [zone:col5] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-55** (win_to_lose): Model emitted malformed bare tag(s) [term:double_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-56** (win_to_lose): Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).
> **eval-57** (win_to_lose): Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect).

## Failure triage (root cause per failing case)
| id | category | triage | one-sentence: what went wrong |
|---|---|---|---|
| eval-18 | win_to_lose | prompt_confusion | Model fabricated an asymmetric centrality claim ('the stronger central column' for col6 vs 'the side column' for col2) though betterCell c6r2 and playedCell c2r5 are equidistant from center col4 and centralityComparison.qualitative was null. |
| eval-23 | lose_to_faster_lose | prompt_confusion | For a player-2 opening the mechanism is defeatist ("both lines still end poorly with best play" = both moves lose) with no hold-the-line reframe, though render_decision.link L7.text supplied the stubborn-defense/practical-swindle frame the model failed to use. |
| eval-24 | lose_to_faster_lose | prompt_confusion | A5b: for player-2 in an opening the mechanism declares 'the final result still goes against you' (telling the player they are lost), which the clean L7 hold-the-line link.text did not supply — model-introduced defeatism. |
| eval-30 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-37 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [zone:col1] [zone:col2] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-42 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:double_threat] [zone:col1] [zone:col4] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-43 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-45 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-46 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:double_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-47 | lose_to_faster_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-49 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-51 | draw_to_lose | prompt_confusion | Model mislabeled the opponent's single-square immediate win at c4r2 (two Green lines converging on one cell) as a 'two-way double_threat' and misattributed the offered you-double fork to the opponent (A4 fabrication); AND emitted malformed bare tags [term:immediate_threat]/[term:double_threat]/[zone:c4r2]/[zone:col4]/[zone:col1] that leak verbatim to the user (A5/G7). |
| eval-53 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:immediate_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-54 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:double_threat] [zone:col4] [zone:col5] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-55 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:double_threat] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-56 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |
| eval-57 | win_to_lose | prompt_confusion | Model emitted malformed bare tag(s) [term:figure_7] (opened with no closing tag / no wrapped phrase); parseAnnotatedText requires paired open+close, so the raw markup+internal slug leaks verbatim into the player-visible coach text (A5 coach-voice + G7 annotation-fidelity defect). |

**Counts:** vector_error 0 · missing_info 0 · prompt_confusion 17 · render_bug 0

**Headline:** the dominant failure is a single systemic defect — **the answerer emits malformed, unclosed `[term:slug]` / `[zone:spec]` tags** (a bare tag with no closing `[/term:…]`/`[/zone:…]` and no wrapped phrase). `parseAnnotatedText` (annotatedText.js) and `processAnnotations`/`dropUnoffered` (zoneAnnotations.mjs) both require a **paired** open+close, so an unclosed bare tag is neither stripped nor expanded — the raw markup + internal slug (e.g. `[term:immediate_threat]`) renders **verbatim to the player**. 13 of the 17 failures are this leak (eval-51 additionally fabricates an opponent double threat). The vector/glossary/render_decision are all correct; the fault is the annotation-emission contract in the prompt (and/or a missing sanitizer in `processAnnotations`). This is a **prompt-builder / pipeline-hardening** fix, not a vector or glossary gap.

## Counterexample list (THE DELIVERABLE)
| field / prompt / render gap | axis | triage | cases affected | evidence |
|---|---|---|---|---|
| malformed unclosed `[term:]`/`[zone:]` emission — `processAnnotations` does not sanitize a bare tag; `parseAnnotatedText` needs paired open+close | A5, G7 | prompt_confusion | eval-30, eval-37, eval-42, eval-43, eval-45, eval-46, eval-47, eval-49, eval-51, eval-53, eval-54, eval-55, eval-56, eval-57 (14) | `cleanText` from the production `parseAnnotatedText` regex still contains the raw token(s) (e.g. `[term:immediate_threat]`, `[zone:col1]`) — the internal slug/markup shows in the coach text the player reads |
| `openingContext.centralityComparison.qualitative` (null) — model invented an asymmetric centrality claim | A4 | prompt_confusion | eval-18 (1) | qualitative is null yet model calls col6 'stronger central' vs col2 'side'; on 3333311115 both are 2 cols from center col4 — no asymmetry |
| causalLinks **L7** hold-the-line frame — model discarded it and introduced defeatist 'both/you lose' wording on a player-2 opening | A5 | prompt_confusion | eval-23, eval-24 (2) | L7.link.text supplied a clean toughest-defense frame; model added 'both lines still end poorly' / 'the final result still goes against you' (A5b) |
| `opponentPunishment.tie` / `you-double` alias — model mislabeled a one-cell immediate win (a tie of two lines) as an opponent 'double threat' | A4 | prompt_confusion | eval-51 (1) | after-played board: opponent's only winning square is c4r2; the real fork c4r3/c7r4 is the player's and moot |

### Abstentions (non-empty `unsure_about`, all on passing cases)
| id | field gap | model's unsure_about |
|---|---|---|
| eval-17 | deep completing cell suppressed (deepResourceGrounded:false) / L9 parity has no single culprit cell | The vector does not identify the exact tactical squares behind the deep win, only that the better move keeps a forced win alive many plies later. |
| eval-29 | deep completing cell suppressed (deepResourceGrounded:false) / L9 parity has no single culprit cell | The vector does not let me isolate a single exact square as the sole mistake; the loss is from the parity fight shifting away from your deep winning resource. |
| eval-40 | deep completing cell suppressed (deepResourceGrounded:false) / L9 parity has no single culprit cell | The vector does not let me isolate a single exact move-order mistake beyond the parity fight on the central line. |

## fields_relied_on distribution (top cited)
| count | field |
|---|---|
| 54 | `replyHistogram.afterBest` |
| 54 | `replyHistogram.afterPlayed` |
| 42 | `case` |
| 32 | `lostResource.pliesToEnd` |
| 24 | `opponentPunishment.pliesToEnd` |
| 21 | `lostResource.completingCell` |
| 21 | `opponentPunishment.completingCell` |
| 14 | `gate.verdict` |
| 14 | `lostResource.window` |
| 12 | `boardState` |
| 12 | `opponentPunishment.tie.sharedCells` |
| 12 | `opponentPunishment.tag` |
| 11 | `openingContext.namedOpening.id` |
| 11 | `openingContext.namedOpening.family` |
| 11 | `openingContext.namedOpening.matchedPrefixLen` |
| 9 | `opponentPunishment.window` |
| 9 | `opponentPunishment.cells` |
| 8 | `openingContext.defense.family` |
| 8 | `openingContext.defense.matchedPrefixLen` |
| 8 | `openingContext.defense.centralityGrounded` |
| 6 | `openingContext.centrality.betterHasMoreLines` |
| 6 | `openingContext.centrality.resistAndWait` |
| 6 | `lostResource.parityAttribution.controllingGroup` |
| 6 | `opponentPunishment.parityAttribution.controllingGroup` |
| 6 | `opponentPunishment.parityAttribution.ownDiscs` |

Most load-bearing: `replyHistogram.afterBest/afterPlayed` (54 each), `case` (42), `pliesToEnd` and `completingCell` on both halves, `gate.verdict`, `lostResource.window`, and the `openingContext.{namedOpening,defense,centrality}` lookups. Parity-attribution sub-fields and `tie.*` are cited but rarely decisive. (Field names are noisy — the model freely coined labels like `decision.better move`, so exact-string counts undercount real usage.)

## Raw answers (per case)
### eval-1 — lose_to_faster_lose — PASS
- board: `3`  playedCol 1 (disp 2) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: Playing [zone:col2]column 2[/zone:col2] drifts away from the center and gives up some of the future four-in-a-row lines you want to keep open in the opening. [zone:col4]Column 4[/zone:col4] is the tougher defense because it stays more central, contests more lines, and leaves you the most practical chance to keep the game messy and hard to break through.

### eval-2 — lose_to_faster_lose — PASS
- board: `3`  playedCol 5 (disp 6) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: You should keep your disc in the more central column, because in the opening that gives you more four-in-a-row lines to work with and makes it harder for your opponent to build and break through your setup. [zone:col4]Column 4[/zone:col4] is the tougher defensive hold here; [zone:col6]column 6[/zone:col6] gives up some of that central reach, so it leaves you with fewer ways to keep the swindle alive and force your opponent to do the most work.

### eval-3 — win_to_lose — PASS
- board: `333334`  playedCol 3 (disp 4) · bestCol 1 (disp 2) · player 1 · opening
- mechanism: You should have played the central block that keeps your deep parity fight alive. Instead, your played move lets your opponent make a separate four-in-a-row line from below, so you lose both the winning chance you had and the defense you needed against their immediate reply.

### eval-4 — win_to_lose — PASS
- board: `333334`  playedCol 2 (disp 3) · bestCol 1 (disp 2) · player 1 · opening
- mechanism: You needed to take the tougher central defense on column 2, because that keeps your own deep winning line alive and blocks your opponent from cashing in their own deep four-in-a-row line later. By playing column 3 instead, you gave up your forced win and let them answer with a stronger central line that finishes first.

### eval-5 — lose_to_faster_lose — PASS
- board: `33322`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 2 · opening
- mechanism: You should have played the central move in [zone:col3]column 3[/zone:col3], because it keeps your stack tied into the middle and gives you the toughest defense. Playing [zone:col1]column 1[/zone:col1] gives up that central support much faster, so your opponent can force the decisive fight more easily while you have fewer ways to hold the position.

### eval-6 — lose_to_faster_lose — PASS
- board: `33322`  playedCol 5 (disp 6) · bestCol 2 (disp 3) · player 2 · opening
- mechanism: Column 3 is the tougher central defense: it keeps your structure tighter and makes your opponent work harder to convert the long opening battle. Column 6 drifts away from that central setup too soon, so you give up resilience and your opponent’s route becomes easier in the long run.

### eval-7 — win_to_lose — PASS
- board: `3332`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 1 · opening
- mechanism: You should have played the more central column, because it keeps more four-in-a-row lines available and makes your position harder to break. Your played move gave up that extra central reach and let your opponent’s reply stay easier to hold; the better move was the tougher defense and kept the best winning path alive much longer.

### eval-8 — win_to_lose — PASS
- board: `3332`  playedCol 1 (disp 2) · bestCol 2 (disp 3) · player 1 · opening
- mechanism: You should have played the more central column 3, because it keeps more four-in-a-row lines alive for you and gives your opponent fewer easy ways to answer. Playing column 2 gives up that flexibility, so you lose the deeper forced line that column 3 preserves and let your opponent reach their own deep winning line instead.

### eval-9 — win_to_draw — PASS
- board: `33322226`  playedCol 5 (disp 6) · bestCol 6 (disp 7) · player 1 · opening
- mechanism: You should have kept the book line and played the central [zone:col7]column 7[/zone:col7], which preserves the deep winning route. By going to [zone:col6]column 6[/zone:col6] instead, you stepped off that line and let your opponent hold the game to a draw after a long parity fight.

### eval-10 — win_to_draw — PASS
- board: `33322226`  playedCol 4 (disp 5) · bestCol 6 (disp 7) · player 1 · opening
- mechanism: You should keep to the central-book line: [zone:col7]column 7[/zone:col7] preserves the winning path and forces your opponent to defend a deep four-in-a-row race. By playing [zone:col5]column 5[/zone:col5], you left that line and gave away the best continuation, so your opponent can steer the game to a draw instead of the win.

### eval-11 — win_to_lose — PASS
- board: `333222`  playedCol 4 (disp 5) · bestCol 3 (disp 4) · player 1 · opening
- mechanism: You should have played the more central column, because it keeps more four-in-a-row lines available for your future threats and makes your position harder to break. By playing the other column, you gave up some of those central ways to build and let your opponent’s reply be the stronger one in the long forced fight.

### eval-12 — win_to_lose — PASS
- board: `333222`  playedCol 6 (disp 7) · bestCol 3 (disp 4) · player 1 · opening
- mechanism: By playing [zone:col4]column 4[/zone:col4], you keep the position in the center, where more four-in-a-row lines run through your discs, so you leave yourself the toughest winning chances and the hardest defense for your opponent. Playing [zone:col7]column 7[/zone:col7] gives up that central presence and makes it easier for your opponent to steer the game away from your chances over the long forced line.

### eval-13 — lose_to_faster_lose — PASS
- board: `333`  playedCol 6 (disp 7) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: Column 4 is the tougher central defense: it keeps your stones tied into the middle and makes it harder for your opponent to build the long four-in-a-row line they want. Column 7 gives up the center too quickly, so your opponent gets a much easier path to keep control and finish the long fight more cleanly.

### eval-14 — lose_to_faster_lose — PASS
- board: `333`  playedCol 4 (disp 5) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: You held the center more tightly with column 4, which is the tougher defense in this opening because it keeps your pieces better connected and makes it harder for your opponent to steer the game. Column 5 gives up that central grip sooner, so your opponent gets a cleaner path to pressure you through the middle and finish the fight faster.

### eval-15 — win_to_draw — PASS
- board: `33322233`  playedCol 1 (disp 2) · bestCol 6 (disp 7) · player 1 · opening
- mechanism: You should have kept to the central opening and played the tougher book move in [zone:col7]column 7[/zone:col7]. That move preserves your winning line; by playing [zone:col2]column 2[/zone:col2] you left the book path, and your opponent can steer the game into a draw instead of being forced to defend your win.

### eval-16 — win_to_draw — PASS
- board: `33322233`  playedCol 4 (disp 5) · bestCol 6 (disp 7) · player 1 · opening
- mechanism: You stayed in the central opening plan, but the stronger central move is [zone:col7]column 7[/zone:col7]. Your played [zone:col5]column 5[/zone:col5] breaks the book line and gives up the deep winning continuation, so the opponent can steer the game to a draw instead of having to face the harder winning path.

### eval-17 — win_to_draw — PASS
- board: `3333311115`  playedCol 4 (disp 5) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have stayed with the central-column opening and played the central move, because that keeps your strongest long-term line alive. By going to [zone:col5]column 5[/zone:col5] instead, you stepped off the book line and let your opponent hold the position to a draw; the central reply in [zone:col6]column 6[/zone:col6] preserves the deeper forced win, even though it finishes many moves later.

### eval-18 — win_to_lose — FAIL
- board: `3333311115`  playedCol 1 (disp 2) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have kept with the central opening and played the stronger central column; that move preserves the deep winning line, while your played move in the side column breaks away from the book plan and lets your opponent take over the long forced fight. The better move is the tougher defense because it stays on the line that still reaches your win, while the played move hands your opponent the better endgame.

### eval-19 — win_to_draw — PASS
- board: `3333311115`  playedCol 6 (disp 7) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: By staying with the central-column opening, you keep the strongest central shape and preserve the long forced win that comes from it. Playing [zone:col7]column 7[/zone:col7] leaves that book line and gives your opponent the chance to hold the draw instead of facing the harder central continuation in [zone:col6]column 6[/zone:col6].

### eval-20 — win_to_lose — PASS
- board: `3333311115`  playedCol 3 (disp 4) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have stayed with the central opening and played [zone:col6]column 6[/zone:col6]; that keeps the position on the book line and makes your opponent work through a long, forced fight. By switching to [zone:col4]column 4[/zone:col4], you left that line and handed them a much easier path to a winning reply in the same deep central battle.

### eval-21 — lose_to_faster_lose — PASS
- board: `33333111155`  playedCol 1 (disp 2) · bestCol 5 (disp 6) · player 2 · opening
- mechanism: You should play the more resilient central defense in [zone:col6]column 6[/zone:col6] because it keeps your position harder to crack and gives your opponent only one clean way to continue the long fight. [zone:col2]Column 2[/zone:col2] gives up that resistance too quickly, so your opponent has many more good replies and the same bad end comes around faster.

### eval-22 — lose_to_faster_lose — PASS
- board: `33333111155`  playedCol 0 (disp 1) · bestCol 5 (disp 6) · player 2 · opening
- mechanism: [zone:col1]Column 1[/zone:col1] lets your opponent get back to work on the center faster, so your defense runs out of room sooner. [zone:col6]Column 6[/zone:col6] is the tougher holding move here: it keeps the position more compact and gives your opponent fewer ways to keep the attack going.

### eval-23 — lose_to_faster_lose — FAIL
- board: `32655`  playedCol 2 (disp 3) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: You should have played the more central column, because it gives your opponent fewer easy replies and keeps your own connection more flexible. Playing the other column gives ground faster in the opening, so your defense becomes easier to handle even though both lines still end poorly with best play.

### eval-24 — lose_to_faster_lose — FAIL
- board: `32655`  playedCol 5 (disp 6) · bestCol 3 (disp 4) · player 2 · opening
- mechanism: Column 4 is the tougher, more central defense: it keeps your shape more compact and makes your opponent work harder to break through. Column 6 gives ground faster on the edge, so your position becomes easier to squeeze; in this opening line, the resilient central hold is the better practical swindle even though the final result still goes against you.

### eval-25 — win_to_lose — PASS
- board: `3265533353`  playedCol 6 (disp 7) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have played the [zone:col6]central column[/zone:col6] instead of the [zone:col7]right edge[/zone:col7]. That book move keeps your shape together and leads to a long forced win line; the move you actually played leaves that line and gives your opponent the tougher reply that flips the result. The deciding idea is the opening plan and central control, not an immediate [term:immediate_threat]threat[/term:immediate_threat] on the board.

### eval-26 — win_to_lose — PASS
- board: `3265533353`  playedCol 2 (disp 3) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have kept the book line with [zone:col6]column 6[/zone:col6]; that move stays on the opening plan and keeps the central fight on your terms. By playing [zone:col3]column 3[/zone:col3], you left the line and let your opponent force the better ending for them in a long forced sequence instead of the winning one for you.

### eval-27 — win_to_draw — PASS
- board: `32655333535531`  playedCol 0 (disp 1) · bestCol 1 (disp 2) · player 1 · opening
- mechanism: You should have stayed with the book line and played the [zone:col2]central reply[/zone:col2] that keeps your long-term winning plan alive. By playing [zone:col1]the side column[/zone:col1] instead, you stepped out of that opening line and let your opponent hold the draw with the right defense.

### eval-28 — win_to_draw — PASS
- board: `32`  playedCol 2 (disp 3) · bestCol 5 (disp 6) · player 1 · opening
- mechanism: You should have played the tougher central defense in [zone:col6]column 6[/zone:col6], because that keeps your hidden four-in-a-row line alive and leaves your opponent without the easy denial they got after your move in [zone:col3]column 3[/zone:col3]. By playing column 3, you let them take away the deep parity-based win and turn your forcing line into a draw.

### eval-29 — win_to_lose — PASS
- board: `3333344444666116262122`  playedCol 4 (disp 5) · bestCol 2 (disp 3) · player 1 · mid-game
- mechanism: You should keep the fight on the deep parity line instead of dropping the move that gives your opponent the cleaner reply. The better column preserves your tight four-square resource on the top side, while the played column hands over the parity battle and lets your opponent’s follow-up decide the race on the lower line.

### eval-30 — lose_to_faster_lose — FAIL
- board: `334533`  playedCol 2 (disp 3) · bestCol 1 (disp 2) · player 1 · opening
- mechanism: You needed to keep the [term:immediate_threat] on c2 alive because it is your toughest practical defense: it keeps a swindle going and makes your opponent answer under pressure. By playing c3 instead, you give up that hold and let your opponent cash in faster with the central four-in-a-row race on the far side.

### eval-31 — lose_to_faster_lose — PASS
- board: `33453321`  playedCol 1 (disp 2) · bestCol 2 (disp 3) · player 1 · opening
- mechanism: Your move in column 3 is the toughest defense because it keeps the pressure on the key central fight and leaves your opponent with far fewer clean replies. Playing column 2 hands your opponent a faster forcing line: they can exploit the lower-left connection and finish the same kind of threat sooner, so you give up the most resilient swindle defense.

### eval-32 — lose_to_faster_lose — PASS
- board: `334533211215`  playedCol 2 (disp 3) · bestCol 4 (disp 5) · player 1 · opening
- mechanism: You needed to block your opponent’s immediate four-in-a-row threat on the lower right. By playing [zone:col5]5[/zone:col5], you cover that square and make them spend a move elsewhere; by playing [zone:col3]3[/zone:col3], you leave the threat alive and let your opponent answer with the winning block you missed.

### eval-33 — win_to_draw — PASS
- board: `333332222256`  playedCol 6 (disp 7) · bestCol 0 (disp 1) · player 1 · opening
- mechanism: Your better defense is to play the leftmost column so you keep the deep parity fight under control. The move you played gives your opponent the chance to seize the key reply on the right side and deny your hidden four-in-a-row line, turning a winning continuation into only a draw.

### eval-34 — draw_to_lose — PASS
- board: `33333222225666006600`  playedCol 1 (disp 2) · bestCol 0 (disp 1) · player 1 · mid-game
- mechanism: You needed to keep the defensive hold on [zone:col1]column 1[/zone:col1], because that move takes away your opponent’s deep winning resource and leaves only the toughest defense. By playing [zone:col2]column 2[/zone:col2], you give up that hold and let your opponent force a long parity battle that finishes in their favor.

### eval-35 — lose_to_faster_lose — PASS
- board: `33333222225666006600104461`  playedCol 1 (disp 2) · bestCol 0 (disp 1) · player 1 · mid-game
- mechanism: Your opponent already has a next-move four-in-a-row threat at c2r4, so your choice is about which defense makes them work hardest. Playing [zone:col1]column 1[/zone:col1] is the tougher hold because it leaves fewer ways for your opponent to keep the attack going than the move you played, which gives them more ways to force the finish sooner. 

### eval-36 — lose_to_faster_lose — PASS
- board: `3332223633664`  playedCol 6 (disp 7) · bestCol 4 (disp 5) · player 2 · opening
- mechanism: Column 5 is the toughest defense because it keeps your practical swindle alive and makes your opponent work through the longest, messiest finish. By playing column 7, you let them finish faster and give up that extra breathing room to hold the position together.

### eval-37 — lose_to_faster_lose — FAIL
- board: `33322236336646424420466`  playedCol 1 (disp 2) · bestCol 0 (disp 1) · player 2 · mid-game
- mechanism: Your move on the right gives up the toughest defense and lets your opponent cash in faster. Playing in [zone:col1] keeps the central fight alive and preserves the stubborn swindle that can still make them work for it; [zone:col2] hands them the quicker finish instead.

### eval-38 — lose_to_faster_lose — PASS
- board: `3332223633664642442046611`  playedCol 1 (disp 2) · bestCol 0 (disp 1) · player 2 · mid-game
- mechanism: [zone:col1]Column 1[/zone:col1] is the tougher defense because it makes your opponent’s [term:figure_7] 7-shaped double threat[/term:figure_7] work from the least helpful setup. [zone:col2]Column 2[/zone:col2] still ends badly too, but it gives your opponent the faster finish; the better move is the one that slows their attack down the most.

### eval-39 — win_to_lose — PASS
- board: `333331134644155465555622446022`  playedCol 2 (disp 3) · bestCol 1 (disp 2) · player 1 · closing
- mechanism: You needed the block in [zone:col2]column 2[/zone:col2] to stop your opponent's four-in-a-row line on the fourth row. By playing [zone:col3]column 3[/zone:col3] instead, you left that threat alive, so your opponent could answer with the block and keep the winning line. 

### eval-40 — win_to_lose — PASS
- board: `3334316411331606010021`  playedCol 2 (disp 3) · bestCol 0 (disp 1) · player 1 · mid-game
- mechanism: You needed the move that keeps your central parity resource alive and makes your opponent do the hardest defending. By playing the other column, you gave up that parity fight and let your opponent take over the deep central line instead of you controlling it.

### eval-41 — lose_to_faster_lose — PASS
- board: `33343164113316060100212202`  playedCol 5 (disp 6) · bestCol 0 (disp 1) · player 1 · mid-game
- mechanism: Your opponent already has a [term:immediate_threat]four next move[/term:immediate_threat] on c6r2, so the job is to make that defense as awkward as possible. Playing column 1 is the toughest cover here because it keeps the reply options narrower, while column 6 gives your opponent a cleaner, faster path to cashing in that threat.

### eval-42 — lose_to_faster_lose — FAIL
- board: `34022043042501225`  playedCol 3 (disp 4) · bestCol 0 (disp 1) · player 2 · mid-game
- mechanism: Your opponent already has a [term:double_threat] sitting there, so the job is to make it as hard as possible to cash it in. [zone:col1] is the tougher defense because it delays the finish and leaves your opponent fewer ways to keep the attack going, while [zone:col4] lets the position resolve more quickly.

### eval-43 — lose_to_faster_lose — FAIL
- board: `3410101`  playedCol 0 (disp 1) · bestCol 1 (disp 2) · player 2 · opening
- mechanism: You needed to take [term:immediate_threat] right away by playing the blocking move in [zone:col2]column 2[/zone:col2]. That move stops your opponent’s four-in-a-row line on the c2 stack; by playing in [zone:col1]column 1[/zone:col1] instead, you left that threat alive and allowed the stronger defensive move to be missed.

### eval-44 — draw_to_lose — PASS
- board: `31545511344`  playedCol 2 (disp 3) · bestCol 5 (disp 6) · player 2 · opening
- mechanism: You needed the defensive move in [zone:col6]column 6[/zone:col6] because it takes away your opponent’s strongest central support and keeps their fork from landing cleanly. By playing [zone:col3]column 3[/zone:col3], you left that resource intact, so your opponent can force a double threat and then finish with a four-in-a-row line.

### eval-45 — lose_to_faster_lose — FAIL
- board: `33332410453451`  playedCol 3 (disp 4) · bestCol 0 (disp 1) · player 1 · opening
- mechanism: [term:figure_7]Your opponent already has a 7-shaped double threat on the board, so your job is only to make that finish as hard as possible. Playing in [zone:col1]column 1[/zone:col1] is the tougher defense because it forces the longest resistance, while [zone:col4]column 4[/zone:col4] lets the attack land sooner.

### eval-46 — lose_to_faster_lose — FAIL
- board: `333442202`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 2 · opening
- mechanism: Your opponent has a [term:double_threat] built around the center-right, and both of your candidate moves still let that idea stand. The move in [zone:col3]column 3[/zone:col3] is the tougher defense because it delays the finish as much as possible, while [zone:col1]column 1[/zone:col1] gives up the same result more quickly.

### eval-47 — lose_to_faster_lose — FAIL
- board: `3333362111134554641045415556042200666`  playedCol 2 (disp 3) · bestCol 0 (disp 1) · player 2 · closing
- mechanism: Your opponent already has a [term:immediate_threat] at c3r5, so your move cannot remove the danger. The tougher defense is [zone:col1]column 1[/zone:col1], because it makes your opponent work hardest to convert that threat, while [zone:col3]column 3[/zone:col3] gives them the easier path.

### eval-48 — draw_to_lose — PASS
- board: `223`  playedCol 3 (disp 4) · bestCol 1 (disp 2) · player 2 · opening
- mechanism: By playing the column you chose, you let your opponent take the key bottom square that creates [term:double_threat]double threat[/term:double_threat] pressure across the bottom row, and you no longer have enough cover to stop both threats. The tougher defense was to play the other column and deny that key square, which keeps the position drawable instead of giving your opponent the easier winning setup.

### eval-49 — win_to_lose — FAIL
- board: `422432656162`  playedCol 5 (disp 6) · bestCol 6 (disp 7) · player 1 · opening
- mechanism: You should have played the central threat in column 7, because it keeps your [term:immediate_threat] alive and forces your opponent to answer it. By playing column 6 instead, you let your opponent take that same square and shut off your four-in-a-row line.

### eval-50 — win_to_lose — PASS
- board: `334`  playedCol 3 (disp 4) · bestCol 2 (disp 3) · player 2 · opening
- mechanism: You should have played [zone:col3]column 3[/zone:col3] to take away the key spot your opponent needed for [term:double_threat] two winning lines at once[/term:double_threat]. By playing [zone:col4]column 4[/zone:col4], you left that spot open and let your opponent land there to create an unstoppable fork.

### eval-51 — draw_to_lose — FAIL
- board: `211116254522655524514`  playedCol 3 (disp 4) · bestCol 0 (disp 1) · player 2 · mid-game
- mechanism: You should have blocked the central [term:immediate_threat] at [zone:c4r2] instead of playing [zone:col4]. Your move left that square available, and then your opponent could drop there to create a two-way [term:double_threat] with a four-in-a-row line your defense cannot cover in time. The better move in [zone:col1] takes that square away and forces the tougher draw defense.

### eval-52 — win_to_lose — PASS
- board: `2111162545226555245143`  playedCol 4 (disp 5) · bestCol 3 (disp 4) · player 1 · mid-game
- mechanism: You should have played the central block on column 4, because it takes away your own immediate threat and forces the safest defense. By playing column 5 instead, you let your opponent grab that central blocking square and turn off your winning chance.

### eval-53 — win_to_lose — FAIL
- board: `333236023355022566`  playedCol 4 (disp 5) · bestCol 0 (disp 1) · player 1 · mid-game
- mechanism: By playing [zone:col5]column 5[/zone:col5], you let your opponent take c5r2 and set up a [term:immediate_threat] to make four on c3r2-c4r2-c5r2-c6r2 next turn. The tougher defense was [zone:col1]column 1[/zone:col1], which denied that key square and kept the pressure on instead of handing them a direct block-or-lose shot.

### eval-54 — win_to_lose — FAIL
- board: `4555222111240253`  playedCol 4 (disp 5) · bestCol 3 (disp 4) · player 1 · mid-game
- mechanism: You needed to play the [term:double_threat] in [zone:col4] so you kept two winning threats alive at once. By playing [zone:col5] instead, you let your opponent take the key block on the lower center square and shut off that fork.

### eval-55 — win_to_lose — FAIL
- board: `3342331002110641340620`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 1 · mid-game
- mechanism: You needed the move in column 3 to keep your [term:double_threat] alive, with two winning finishes tied together so your opponent could not cover both. By playing column 1 instead, you let your opponent take the key spot that breaks that fork, so your best chance vanished and your position collapses under their reply.

### eval-56 — win_to_lose — FAIL
- board: `333314354066554405540530421`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 2 · mid-game
- mechanism: You should have played the central [term:figure_7] to keep your own 7-shaped double threat alive. By playing the other column, you gave your opponent the chance to take that key square and shut off both of your winning ideas at once.

### eval-57 — win_to_lose — FAIL
- board: `33331435406655440554053042166`  playedCol 0 (disp 1) · bestCol 2 (disp 3) · player 2 · mid-game
- mechanism: You needed to play column 3 to keep your [term:figure_7] alive: it creates the fork with two winning threats at once, so your opponent has too many things to cover. By playing column 1 instead, you let them take that central square and shut off your double threat.
