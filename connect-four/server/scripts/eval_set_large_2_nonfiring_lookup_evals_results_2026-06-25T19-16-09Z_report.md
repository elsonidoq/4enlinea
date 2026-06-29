# Deep Reveal Eval Report — eval_set_large_2_nonfiring_lookup_evals_results_2026-06-25T19-16-09Z.jsonl

## Summary

- Total entries: 8
- Pipeline failures: 0
- Annotation failures: 3
- Successes evaluated: 5
- Rubric pass rate: 42/45 items passed across all success entries (3 partials, 0 fails)

## Pipeline failures

None.

## Annotation failures

| id | category | attempt1_failures | attempt2_failures |
|----|----------|------------------|------------------|
| eval-3 | suboptimal_move | P3:engine_jargon | P3:engine_jargon |
| eval-10 | suboptimal_move | P3:engine_jargon | P3:engine_jargon |
| eval-17 | suboptimal_move | P3:engine_jargon | P3:engine_jargon |

> **eval-3 attempt 1** (`P3:engine_jargon`):
> You gave ground by playing [zone:col5]column 5[/zone:col5]; the better move was [zone:col4]column 4[/zone:col4], which would have extended your stack there to [zone:c4r5]that cell[/zone:c4r5] instead of letting your opponent keep the better structure in the middle. This was about a [term:minor_threat]minor threat[/term:minor_threat]: your move left you with [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1], while the better move kept it at [zone:tg]0[/zone:tg] just like before, so you traded away a stronger central plan for a less useful edge placement.
>
> **eval-3 attempt 2** (`P3:engine_jargon`):
> You gave ground by playing [zone:col5]column 5[/zone:col5] instead of [zone:col4]column 4[/zone:col4]: the better move would have extended your stack to [zone:c4r5]that cell[/zone:c4r5] and kept your shape focused on the middle, while your move only added a side disc on [zone:c5r1]that cell[/zone:c5r1]. The missed pattern was a [term:minor_threat]minor threat[/term:minor_threat]: the better move left you with [zone:tg]0[/zone:tg], but your move created [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1], and that gave your opponent much more room to steer the position.

> **eval-10 attempt 1** (`P3:engine_jargon`):
> You gave ground by playing [zone:col5]column 5[/zone:col5] instead of [zone:col4]column 4[/zone:col4]: the stronger move would have built [term:minor_threat]minor threat[/term:minor_threat] pressure from [zone:tg]0[/zone:tg] to [zone:tg]0[/zone:tg] while your move left you with [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1] such lines, which means you spent a move on a side column and let your position drift. The better move would have placed your disc on [zone:c4r3]that cell[/zone:c4r3], keeping the center under your control and giving you a much stronger setup for your odd-row win plan on [zone:row3]row 3[/zone:row3].
>
> **eval-10 attempt 2** (`P3:engine_jargon`):
> You gave ground by playing in [zone:col5]column 5[/zone:col5], which only put a disc on [zone:c5r1]that cell[/zone:c5r1] and left your position flatter. The better move was to play [zone:col4]column 4[/zone:col4], where you would have built [term:minor_threat]a minor threat[/term:minor_threat] on [zone:c4r3]that cell[/zone:c4r3]; that line leaves you with [zone:tg]0[/zone:tg] before the move, [zone:tg]0[/zone:tg] after the better move, and [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1] after your move, so your choice handed over a much stronger looking setup instead of keeping the position quieter.

> **eval-17 attempt 1** (`P3:engine_jargon`):
> You gave away a real advantage by playing [zone:col6]column 6[/zone:col6] instead of [zone:col3]column 3[/zone:col3]: the better move would have built your own [term:minor_threat]minor threat[/term:minor_threat] on [zone:c3r2]that cell[/zone:c3r2] while keeping the position cleaner. With your move, you left yourself with [zone:windows:c4r1|c7r1]2[/zone:windows:c4r1|c7r1] minor threats, but the stronger move kept that at [zone:tg]0[/zone:tg], so you gave ground rather than creating a more useful long-range plan.
>
> **eval-17 attempt 2** (`P3:engine_jargon`):
> Playing [zone:col6]column 6[/zone:col6] gave away a real advantage because it only made a [term:minor_threat]minor threat[/term:minor_threat] for you ([zone:windows:c4r1|c7r1]2[/zone:windows:c4r1|c7r1]), while [zone:col3]column 3[/zone:col3] would have kept your position cleaner with [zone:tg]0[/zone:tg]. The better move would have kept your opponent from getting easy counterplay and would have left you with a stronger long-range plan around the middle instead of spending your turn on the edge.

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----|----------|-----|---|---|---|---|---|---|---|---|---|
| eval-5 | drawing_move | 0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| eval-12 | drawing_move | 0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| eval-14 | suboptimal_move | 0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| eval-15 | suboptimal_move | 0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| eval-16 | drawing_move | 0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

(✓ pass, ~ partial, ✗ fail)

> eval-5: item 9 partial — names center ('holding the center more firmly') but wraps it in filler ('preserving the safer balance'); undersells the win as 'at least drawn'.
> Causes: item 9 — empty-board position has no classifier structure; lookahead null (expected), so coach falls to honest center path but still leaks 'balance' filler.

> eval-12: item 9 partial — center named ('more central') plus 'more room for your next choices' filler.
> Causes: item 9 — same empty-board no-structure path; center is honest but 'more room' is generic.

> eval-14: item 9 partial — 'keeping the board more active in the middle' (center, findable) plus 'better chances on the rows you need' (generic).
> Causes: item 9 — true reason is speed (both lose, best loses slower: premove -1 vs -2); no generator surfaces tempo, so coach falls back to center+filler.

## Systematic issues

**New systematic issue — `[zone:tg]` leak on zero-count threat rows (3 entries: eval-3, eval-10, eval-17; all `suboptimal_move`).**
All three annotation failures share one cause. The new non-directional threat-comparison section (Fix 1) renders the pre-move and after-best minor-threat counts as a bare `0` with NO zone tag, while the after-played count carries a real tag (`[zone:player-minor-played]`). The prompt instruction tells the model to wrap every cited count in its line's zone tag; with no tag on the `0` lines the model invents `[zone:tg]` (the internal no-cell placeholder), which `checkP3` bans -> `P3:engine_jargon`. The explicit guard at llmCoachHelpers.js:804 ("never use [zone:tg]") is present in all three prompts but the model ignored it in 6/6 attempts. Structural (data/render) defect, not a wording one.

**Attribution direction is now CORRECT (Defect 1 fixed).** In the prior run these same three entries fabricated a minor threat and attributed it backwards to the better move. The new responses correctly attribute the minor threat to the PLAYED move and frame it as insufficient (eval-3: "the better move left you with 0, but your move created 4"; eval-17: "column 6 made a minor threat for you (2), while column 3 kept that at 0"). The grounding fix worked; only the tag-citation mechanics block acceptance.

**Residual item-9 softness (3 partials: eval-5, eval-12, eval-14).** Center/tempo reason is named honestly but still padded with generic filler ("safer balance", "more room for your next choices", "better chances on the rows you need"). No fabrication, no landing-square-as-reason. Large improvement over the prior run (item 9 failed 7/8 there); Fix 3/4 held.

## Systematic prompt defects

| defect type | entries | ids | evidence |
|-------------|---------|-----|----------|
| instruction_data_contradiction | 3 | eval-3, eval-10, eval-17 | `## Threat comparison`: zero-count lines render bare `0` (no zone tag) while the instruction 'copy the zone tag shown on that line and wrap the count with it' + the 'X vs 0' worked example demand a wrapper; model supplies banned `[zone:tg]`. |
| missing_expected_section | 5 | eval-5,12,14,15,16 | No `## What the better move leads to` look-ahead section on sparse positions (la_fired=false). For empty boards (eval-5,12,16) this is the accepted honest-path per spec; for eval-14/15 the board par/minor-threat rows supply grounding. |

## Decisive-but-ungrounded cases

No hard grounding gaps requiring an upstream generator fix. The empty-board entries (eval-5/12/16) are decisive (center wins vs played draws) but center-control is intentionally not a classifier pattern, and the coach grounds honestly on center — the accepted outcome, not a failure. eval-14/15 are `speed` cases grounded by the board parity rows. No cluster sharing a broken `runSparseLookahead`.

| id | category | true_reason | lookahead_fired | suspected_generator | missing |
|----|----------|-------------|-----------------|---------------------|---------|
| eval-5 | drawing_move | parity_positional (center) | false | none (center not a classifier pattern) | honest center path used - acceptable |
| eval-12 | drawing_move | parity_positional (center) | false | none | acceptable |
| eval-16 | drawing_move | parity_positional (center) | false | none | acceptable |
| eval-14 | suboptimal_move | speed (lose slower) | false | n/a (board parity grounds it) | acceptable |
| eval-15 | suboptimal_move | speed (win sooner) | false | n/a (board parity grounds it) | acceptable |

## Raw explanations (success entries)

### eval-5 — drawing_move (sev 0)
**Final response:**

[zone:col5]Column 5[/zone:col5] was a minor inaccuracy because it let the position settle without preserving the safer balance you had available. [zone:col4]Column 4[/zone:col4] would have been better: it would have kept the position at least drawn while holding the center more firmly, instead of giving up that balance with your move to [zone:col5]column 5[/zone:col5].

<details><summary>Full prompt</summary>

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

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

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

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played] vs [zone:player-minor-best]0[/zone:player-minor-best] for the better move), the better move was still stronger because …". If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```
</details>

### eval-12 — drawing_move (sev 0)
**Final response:**

Your move in [zone:col3]column 3[/zone:col3] was a small inaccuracy because it gave up the steadier balance you could have kept with [zone:col4]column 4[/zone:col4]. Playing there would have kept your position holding at least a draw while also staying more central and leaving more room for your next choices, instead of narrowing things so quickly with the play in [zone:col3]column 3[/zone:col3].

<details><summary>Full prompt</summary>

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

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

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

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played] vs [zone:player-minor-best]0[/zone:player-minor-best] for the better move), the better move was still stronger because …". If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```
</details>

### eval-14 — suboptimal_move (sev 0)
**Final response:**

You gave up the stronger central play by choosing [zone:col5]column 5[/zone:col5], which only filled [zone:c5r1]that cell[/zone:c5r1] on the bottom edge. You could have played [zone:col4]column 4[/zone:col4] instead, placing a disc in [zone:c4r6]that cell[/zone:c4r6] and keeping the board more active in the middle while preserving your better chances on the rows you need.

<details><summary>Full prompt</summary>

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

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

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

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played] vs [zone:player-minor-best]0[/zone:player-minor-best] for the better move), the better move was still stronger because …". If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```
</details>

### eval-15 — suboptimal_move (sev 0)
**Final response:**

Your move in [zone:col7]column 7[/zone:col7] just added a disc on the far side and gave up the chance to play [zone:col3]column 3[/zone:col3], which would have filled [zone:c3r1]that cell[/zone:c3r1] on the bottom row. That better move kept more of the middle connected for you and was the stronger way to build toward your odd-row lines, while your played move was a smaller, looser step.

<details><summary>Full prompt</summary>

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

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

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

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played] vs [zone:player-minor-best]0[/zone:player-minor-best] for the better move), the better move was still stronger because …". If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```
</details>

### eval-16 — drawing_move (sev 0)
**Final response:**

Your move in [zone:col5]column 5[/zone:col5] was a small slip because it gave up the safer balance that [zone:col4]column 4[/zone:col4] would have kept: the better move would have held at least a draw, while your move let that edge slip away. On this empty board, playing the center-left column also did a better job of keeping the middle open for your future options, instead of drifting one step farther out.

<details><summary>Full prompt</summary>

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

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

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

When you write a major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows a bare "0" with no zone tag, write "0" without any zone tag — never use [zone:tg] or any other invented tag for a zero count.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played] vs [zone:player-minor-best]0[/zone:player-minor-best] for the better move), the better move was still stronger because …". If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```
</details>

