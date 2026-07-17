# Feature-Vector Sufficiency Report — fv_suff_answers_eval28_2026-07-02T14-51-23Z.jsonl

Targeted re-grade of the single case **eval-28** after the glossary disambiguation note
(feature-vector-glossary.md §3b: `completingCell` is EMPTY, not the played square) was added.
Engine vector is unchanged (eval-28 was never an engine bug); only the glossary the answerer reads changed.

## Summary
- Answer rows: 2   parse failures: 0
- Cases (id × condition): 1   passed (A1–A4 on all runs): **1**   failed: 0
- Per-axis pass rate (over all gradeable runs): A1 2/2 · A2 2/2 · A3 2/2 · A4 2/2

## Per-case verdict
| id | category | condition | A1 | A2 | A3 | A4 | pass | intermittent |
|----|----------|-----------|----|----|----|----|------|--------------|
| eval-28 | win_to_lose (figure_7) | A | pass | pass | pass | pass | ✅ | no |

> eval-28 (cond A): **FIXED.** The originally-reported A4 fabrication — the answerer concluding
> "column 6 takes c7r3 and completes the window" — is gone on both runs. Both now correctly say
> column 6 (display) **builds** the figure_7 by landing the third disc **c6r3**, with **c7r3 the empty
> completing cell** the opponent later occupies to deny it. Verified on after-best board
> `333330422246442530655`: `visualize_board.sh` shows `col7 row3 (Gn) [GT]` + `col7 row4 (Gn)` major
> threats, window cells c4r3/c5r3/c6r3 are Green discs, c7r3 empty.

## Counterexample list (residual, non-blocking)
| field / glossary gap | axis | cases affected | evidence (board finding) | model's unsure_about |
|---|---|---|---|---|
| `opponentPunishment` (win_to_lose denial half) | abstention | eval-28 (run 1) | The denial half only exhibits the opponent denying Green's figure_7 at c7r3; it does not name the opponent's OWN winning line that makes the played move a loss. Honest abstention, excluded from A4. Unrelated to the disambiguation fix. | "…it does not name the opponent's eventual winning pattern beyond the case result and this denial line." |

## fields_relied_on distribution
Both runs leaned on: `bestCol`, `case`, `route`, `tag`, `direction`, `lostResource.{kind,tag,window,completingCell}`,
`opponentPunishment.{kind,verdict,line,cell,tie.*}`, `replyHistogram.{afterBest,afterPlayed}`.
The glossary note made `lostResource.window` load-bearing in the correct way — the model now reads the
window as "3 owner discs + 1 empty completingCell" instead of treating `completingCell` as the played square.

## Conclusion
The glossary note resolves the eval-28 A4 fabrication (landing-square vs completing-cell conflation).
The only residual signal is an honest abstention about the opponent's own winning line not being named
in the `win_to_lose` denial half — a separate, pre-existing feature-completeness question, not a regression.
