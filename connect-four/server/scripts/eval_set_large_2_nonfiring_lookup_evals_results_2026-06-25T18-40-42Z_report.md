# Deep Reveal Eval Report — eval_set_large_2_nonfiring_lookup_evals_results_2026-06-25T18-40-42Z.jsonl

## Summary

- Total entries: 8
- Pipeline failures: 0
- Annotation failures: 0
- Successes evaluated: 8
- Rubric pass rate: **44/72 items passed** across all success entries (61%)
- Human feedback joined onto: eval-3, eval-10, eval-14, eval-15, eval-16, eval-17

Headline: every entry in this batch is a **sparse / near-empty position** where the look-ahead either didn't fire or was discarded. The dominant failure is **fabricated `minor_threat` claims** (4 entries assert a minor threat that does not exist on the after-best board) and **generic positional filler** (item 9 fails 7/8). Both trace to two prompt/generator defects: `[term:minor_threat]` injected without any supporting threat data, and the sparse look-ahead failing to surface the real distinguishing reason (outcome-flip, speed, or center control).

## Pipeline failures

None.

## Annotation failures

None — all 8 records passed validation on attempt 1.

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----|----------|-----|---|---|---|---|---|---|---|---|---|
| eval-3 | suboptimal_move | 1 | P | **F** | **F** | P | P | P | ~ | **F** | **F** |
| eval-5 | drawing_move | 0 | P | P | P | P | P | P | P | ~ | **F** |
| eval-10 | suboptimal_move | 1 | P | **F** | **F** | P | P | P | ~ | **F** | **F** |
| eval-12 | drawing_move | 0 | P | P | P | P | P | P | P | ~ | P |
| eval-14 | suboptimal_move | 0 | P | ~ | ~ | P | P | P | P | ~ | **F** |
| eval-15 | suboptimal_move | 0 | P | **F** | **F** | P | P | P | ~ | **F** | **F** |
| eval-16 | drawing_move | 0 | P | P | P | P | P | P | P | **F** | **F** |
| eval-17 | suboptimal_move | 0 | P | **F** | ~ | P | P | P | P | **F** | **F** |

(P = pass, ~ = partial, **F** = fail)

> **eval-3** (sev 1): item 2 fail — after-best board "33333" shows "Major threats: none" and zero `(gn)` minor cells, yet the response claims the better move "would have built a minor threat"; the minor threats actually appear on the *played* board. item 3 fail — named primary pattern "minor threat" doesn't exist on after-best, fails the suboptimal_move reproducible-feature bar. item 7 partial — rationale is coherent but rests on the false minor-threat/undercut premise. item 8 fail — factual error confirmed by human note ("column 4 does not create a minor threat"); framing is backwards. item 9 fail — core reason is fabricated; rest is generic filler; outcome_flip means honest-minimal exception does not apply.
> Causes: `[term:minor_threat]` injected with no threat-comparison data + speculative future-undercut section invited asserting a developing structure; decisive after-best fact (5-stack holds opponent to a loss) never surfaced.

> **eval-5** (sev 0): item 8 partial — "gave up that balance" implies col5 forfeits the draw, but played_scores[4]=0 means col5 still draws; the real distinction is win-speed/center-control, not draw-vs-loss. item 9 fail — only reason offered is generic filler ("good enough to at least hold a draw"); the true reason (center control / more options) is never stated because the prompt supplies no concrete fact.
> Causes: empty-board first move with no look-ahead section; landing-square difference alone cannot explain why col4 > col5.

> **eval-10** (sev 1): item 2 fail — fabricates an *opponent* minor_threat with an incoherent cell set (c3r1,c4r2,c3r3,c4r3 is not a 4-window); on board the only minor threats are `(gn)` = YOURS, so ownership is wrong; ignores the look-ahead's provided `opp-future-j_shape` zone. item 3 fail — named pattern matches no real board feature. item 7 partial — dangling minor-threat claim sits oddly. item 8 fail — closing "If you had played..." phrase restates move location + empty qualifier "tighter" (reviewer flag confirmed). item 9 fail — decisive outcome_flip (col4 +1 holds, col5 −2 loses) but the response never says the played move loses.
> Causes: generator discarded the look-ahead's `opp-future-j_shape` zone and substituted a KB-defined minor_threat; the look-ahead names a "J-shape" the KB terms don't define, so the model couldn't name it and substituted.

> **eval-12** (sev 0): item 8 partial — "left you in the stronger shape" is an unsupported center-control claim on an empty board (mild, not a hallucinated threat). All other items pass; the response honestly follows the prompt's "at least a draw" wording and cites the exact landing-square change. (Grounding gap still recorded: the win-vs-draw basis cannot be named.)

> **eval-14** (sev 0): item 2 partial — "leaves you with less pressure on the even rows you need" asserts an even-row pressure differential nothing on the boards shows. item 3 partial — gentle suboptimal framing but no reproducible feature. item 8 partial — same unsupported comparative. item 9 fail — "building higher on the board where you want it" is pure positional filler; never says WHY higher is better; both moves lose so the honest reason is "col4 loses more slowly" (tempo) — nameable but absent. Reviewer's hypothesis (col4 builds two minor threats / blocks a threat) is NOT surfaced by the detector — no minor-threat glyphs on the after-best board.
> Causes: look-ahead didn't fire on a both-lose position (runSparseLookahead's "explore opponent mistakes" logic is mismatched for a fully-losing position); no tempo/"loses slower" section provided.

> **eval-15** (sev 0): item 2 fail — claims the better move "built your minor threat on the bottom row" near c3r1/c2r2, but no completable Green minor threat exists there (all bottom-row windows blocked by Gray; up-left diagonal runs off the board at col 0 — reviewer confirmed). item 3 fail — invented pattern. item 7 partial — minor-threat narrative built on false premise. item 8 fail — "that cell" twice is uninformative; false threat. item 9 fail — true reason is speed (premove 2 vs 1, both winning, better wins sooner); response invents a non-existent minor threat instead.
> Causes: `[term:minor_threat]` injected on a sparse no-threat position; sparse look-ahead non-fire left speed unexpressed.

> **eval-16** (sev 0): item 8 fail — contains exactly the reviewer-flagged info-free filler ("column 4 would have put your disc on that cell", "column 5 moved your disc to that cell instead"). item 9 fail — no player-findable reason for center over col5; "kept the balance", "safer position" are generic filler. Reviewer flags this as a duplicate of eval-5 (and notes it shouldn't be in the eval).
> Causes: is_sparse true but look-ahead didn't fire; generator fell back to generic empty-board boilerplate restating landing cells.

> **eval-17** (sev 0): item 2 fail — central claim that the better move (col3) "created a minor threat" is false; after-best board shows Gn3 at c3r2 on opponent Gy2 with no `(gn)` markers; the *played* move (col6) is what creates minor threats. item 3 partial — pattern named but doesn't match board. item 8 fail — false minor-threat claim + redundant "only added a disc on that cell" phrasing (reviewer flag). item 9 fail — decisive outcome_flip (col3 draws=0, col6 loses=−1), honest-minimal exception doesn't apply; substitutes false threat + vague filler instead of grounding why col6 loses.
> Causes: runSparseLookahead failed to fire on a decisive sparse outcome_flip; `[term:minor_threat]` injected with no real data; LLM fabricated to fill the gap.

## Systematic issues

Grouped by rubric item, items with ≥2 failures, ordered by entries affected:

1. **Item 9 — reproducible reasoning: 7 fails (eval-3,5,10,14,15,16,17), 1 pass (eval-12).** Across both `suboptimal_move` and `drawing_move` categories. The core reason is consistently either a fabricated structure or generic positional filler ("kept the balance", "building higher where you want it", "stronger shape") with no board-findable feature. This is the headline defect of the batch.

2. **Item 8 — other issues: 5 fails (eval-3,10,15,16,17), 3 partials (eval-5,12,14).** Two sub-patterns: (a) factual errors — a claimed minor threat that the board does not show (eval-3,10,15,17); (b) information-free redundant phrasing — "would have put your disc on that cell", "only added a disc on that cell" (eval-10,16,17), all explicitly flagged by the human reviewer.

3. **Item 2 — no hallucinated structure: 4 fails (eval-3,10,15,17), 1 partial (eval-14).** All `suboptimal_move`. Every one asserts a `minor_threat` (sometimes mis-attributing ownership, eval-10) that the after-best board does not contain; in eval-3/eval-17 the minor threat ironically belongs to the *played* board.

4. **Item 3 — pattern match: 3 fails (eval-3,10,15), 2 partials (eval-14,17).** All `suboptimal_move`. The primary concept named ("minor threat") is not a real, reproducible board feature, so it fails the `suboptimal_move` bar regardless of fabrication.

5. **Item 7 — internal consistency: 3 partials (eval-3,10,15).** All cases where the rationale is narratively coherent but built on the false minor-threat premise.

## Systematic prompt defects

| defect type | entries | ids | evidence |
|-------------|---------|-----|----------|
| vocab_without_data | 6 | eval-3, eval-5, eval-14, eval-15, eval-16, eval-17 | `[term:minor_threat]` injected in KB term definitions while NO threat-comparison rows exist and the board shows "Major threats: none" / no `(gn)` cells; OR (eval-5/16) the only grounding offered is "cite the landing squares", which on an empty board is information-free |
| missing_expected_section | 6 | eval-5, eval-12, eval-14, eval-15, eval-16, eval-17 | `is_sparse=true` but no `## What the better move leads to` look-ahead section present (lookahead_fired=false), so the real distinguishing reason (outcome-flip / speed / center control) is never carried into the prompt |
| instruction_data_contradiction | 3 | eval-3, eval-10, eval-15 | Task instructs "name the tactical pattern from KB terms" / "do not invent a pattern the boards don't show" simultaneously while the KB section supplies `minor_threat` (eval-3,15) or the look-ahead names an undefined "J-shape" (eval-10) — contradictory pressure that drives fabrication |
| empty_section | 1 | eval-17 | All three boards show "Major threats: none" with no threat-comparison section, yet the Task still instructs naming a tactical pattern |

**Bridge to Phase 2:** the two recurring defects (`vocab_without_data` on `minor_threat`, `missing_expected_section` for the look-ahead) are the upstream cause of the item-2/3/8/9 failures. Fixing them in the prompt-builder / generator is the lever.

## Decisive-but-ungrounded cases

| id | category | true_reason | lookahead_fired | suspected_generator | missing |
|----|----------|-------------|-----------------|---------------------|---------|
| eval-3 | suboptimal_move | outcome_flip | true (discarded) | explainContext KB injection + runSparseLookahead | after-best 5-stack holds opponent to a loss — never surfaced; minor_threat term has no board support |
| eval-5 | drawing_move | parity_positional | false | explainContext sparse-lookahead non-fire | center-control / open-more-possibilities fact for empty-board col4 vs col5 |
| eval-12 | drawing_move | outcome_flip | false | drawing_move key-insight / explainContext | center-control basis for col4 over col3 (win-vs-draw) cannot be named |
| eval-14 | suboptimal_move | speed | false | runSparseLookahead (both-lose) + explainContext tempo section | "better move loses more slowly" (−1 vs −2); no structure to cite |
| eval-15 | suboptimal_move | speed | false | KB minor_threat injection + sparse look-ahead non-fire | "better move wins sooner" (2 vs 1) |
| eval-16 | drawing_move | parity_positional | false | runSparseLookahead | center-control reasoning a look-ahead should have surfaced |
| eval-17 | suboptimal_move | outcome_flip | false | runSparseLookahead | `## What the better move leads to` showing how col6 is punished into a loss |

Grouped by `(true_reason, suspected_generator)`:

- **outcome_flip × runSparseLookahead (eval-3, eval-17; eval-12 adjacent):** decisive positions where the played move *loses* and the better move *holds*, yet the look-ahead either didn't fire (eval-17) or its output was discarded (eval-3/eval-10). The generator was supposed to produce the concrete punishing line that shows the loss. **Question its logic:** runSparseLookahead's exploration strategy targets *opponent mistakes*; on a position the player can hold/win under best play, the relevant content is the *opponent's best reply that punishes the blunder* — exploring opponent mistakes surfaces nothing useful, so it returns null. This is a design mismatch, not a depth/budget tweak.
- **speed × runSparseLookahead / KB injection (eval-14, eval-15):** both moves agree on outcome but differ on tempo (wins sooner / loses slower). No prompt section expresses tempo, so there is no honest reason to give. The fix is to surface a "wins sooner / loses later" cue from the score magnitudes, OR to make the look-ahead fire on these positions — not to tune anything that already runs.
- **parity_positional × runSparseLookahead (eval-5, eval-16; eval-12):** near-empty boards where the only edge is center control / keeping options open. There is likely **no generator producing a parity/center-control reason at all**; the fix is to add one (or render an honest "center is the strongest opening" cue), not to tune an existing generator.

This is a **design defect spanning a whole class of sparse positions**, not per-entry tuning. Carry all three groups into Phase 2.

## Raw explanations (success entries)

### eval-3 — suboptimal_move (sev 1)
**Final response:**
> Your move in column 5 gave ground because it stayed on the edge of the position and did not improve your central control. The better move was to play column 4, landing on that cell, which would have built a minor threat and set you up to build next toward the square that lands the undercut.

### eval-5 — drawing_move (sev 0)
**Final response:**
> You were right to keep things calm, but column 4 was a little better because it would have put your disc on that cell and preserved the position that was good enough to at least hold a draw. By playing column 5 instead, you moved to that cell and gave up that balance.

### eval-10 — suboptimal_move (sev 1)
**Final response:**
> By playing column 5, you gave ground: instead of building on column 4, you opened a less useful spot and let your opponent look for a minor threat build with that square next. If you had played column 4, you would have placed your disc on that cell and kept the position tighter, with your disc stacked above your existing one instead of drifting off to that cell.

### eval-12 — drawing_move (sev 0)
**Final response:**
> By playing column 3, you put your disc on that cell instead of using column 4 to occupy that cell. That smaller choice gave up the chance to keep the position safely balanced; the better move in column 4 would have held at least a draw and left you in the stronger shape.

### eval-14 — suboptimal_move (sev 0)
**Final response:**
> You gave up the stronger move in column 4: playing there would have put your disc on that cell, building higher on the board where you want it. By choosing column 5 instead, your disc landed on that cell, which is much lower and leaves you with less pressure on the even rows you need to complete.

### eval-15 — suboptimal_move (sev 0)
**Final response:**
> You gave ground by playing column 7, which put your disc on that cell instead of using column 3 to take that cell. The better move would have built your minor threat on the bottom row and kept your plan aimed at the odd rows you need, rather than letting your position stay a bit more passive.

### eval-16 — drawing_move (sev 0)
**Final response:**
> You had a small choice here: column 4 would have put your disc on that cell and kept the balance you already had, while column 5 moved your disc to that cell instead. Since the board was still empty, the better move would have preserved the safer position and held at least a draw, but your actual move gave that balance up.

### eval-17 — suboptimal_move (sev 0)
**Final response:**
> You gave away the stronger plan by playing column 6 instead of column 3: your move only added a disc on that cell, while the better move would have put one on that cell and created a minor threat. That left you with a quieter position, while the better move would have built a stronger next-step plan on the board.

_(Full prompts omitted from this rendering for length; they are recoverable from the source JSONL `prompt` field. All eight share the same builder output: KB `[term:minor_threat]` definition present, no threat-comparison section, and — except eval-3/eval-10 — no `## What the better move leads to` section.)_
