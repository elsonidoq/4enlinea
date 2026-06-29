# Deep Reveal Eval Report — eval_set_large_2_nonfiring_lookup_evals_results_2026-06-25T18-00-09Z.jsonl

## Summary

- Total entries: 8
- Pipeline failures: 0
- Annotation failures: 0
- Successes evaluated: 8
- Rubric pass rate: 51/72 items passed across all success entries

## Pipeline failures

_None._

## Annotation failures

_None._

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----|----------|-----|---|---|---|---|---|---|---|---|---|
| eval-3 | suboptimal_move | 1 | P | P | P | P | P | P | P | P | P |
| eval-5 | drawing_move | 0 | P | P | P | P | P | P | ~ | P | F |
| eval-10 | suboptimal_move | 1 | P | F | F | P | P | P | P | P | F |
| eval-12 | drawing_move | 0 | P | P | P | P | P | P | ~ | F | F |
| eval-14 | suboptimal_move | 0 | P | P | ~ | P | P | P | ~ | ~ | F |
| eval-15 | suboptimal_move | 0 | P | P | P | P | P | P | P | P | ~ |
| eval-16 | drawing_move | 0 | P | ~ | P | P | P | P | P | ~ | F |
| eval-17 | suboptimal_move | 0 | P | F | F | P | P | P | ~ | F | F |

_(P = pass, ~ = partial, F = fail)_

> **eval-5**: item 7 partial — rationale is generic positional filler ('safer structure', 'hold the odd-row control') tied to no concrete board weakness; item 9 fail — decisive outcome_flip (col4=+1 win vs col5=0 draw) but reasoning grounds only on landing squares + generic safety language, not reproducible.
> Causes: item 7/9: sparse opening, lookahead_fired=false (sparse_no_winner), no '## What the better move leads to' section and empty threat comparison; the win-vs-draw distinction was never surfaced to the prompt.

> **eval-10**: item 2 fail — claims col4 was 'the stronger minor threat setup'/'more useful three-disc stack'; visualizer shows after-best (333) col4 is alternating discs with NO threats, and the minor threats actually appear on the PLAYED board (334) — fabricated/backwards; item 3 fail — primary concept is an invented minor-threat, not a reproducible feature; item 9 fail — decisive outcome_flip (col4=+1 vs col5=-2 loss) but rationale is invented.
> Causes: item 2/3/9: decisive flip, but no '## What the better move leads to' section (sparse_no_winner) and empty threat rows; the task still asks to name a tactical pattern, so the model fabricated a minor-threat for col4.

> **eval-12**: item 7 partial — [term:gravity_top] misapplied, wrapping 'held at least a draw' which has nothing to do with the next-playable-cell definition; item 8 fail — contentless filler ('kept the position steady on the bottom row') gives no reason col4 beats col3 (both bottom-row first moves), and mischaracterizes a win as a draw; item 9 fail — decisive win-vs-draw (col4 premove=1/center=2 vs col3=0) with no differentiating reproducible reason.
> Causes: item 7/8/9: classifier labeled a winning better-move (center) as drawing_move sev0; the prompt's hard-grounding rule forced a 'this is a draw, not a win' framing that contradicts premove scores; sparse_no_winner so no winning line surfaced.

> **eval-14**: item 3 partial / item 7 partial — rationale is score-flavored filler ('preserved a stronger path for you instead of giving ground'); item 8 partial — gravity_top misapplied: playing c4r6 FILLS col4 (par 1O->0E), removing the gravity top rather than 'keeping the gravity top on an even row' — internally incoherent; item 9 fail — both moves lose (col4=-1 vs col5=-2), a speed difference, conveyed only as filler.
> Causes: item 3/7/8/9: lost-position speed scenario coached as if it had tactical structure; LLM grabbed gravity_top from KB terms and applied it incorrectly to a column-filling move; empty threat comparison left only filler.

> **eval-15**: item 9 partial — both moves win (col3=+2 sooner vs col7=+1 later): a small speed gap, not an outcome flip; explanation leans on soft positional framing ('keeps your plan anchored on an odd row') but col3 does carry (gn) minor-threat glyphs so it is grounded enough; for gap=1, sev0 this gentle framing is acceptable.
> Causes: item 9: small speed gap with no decisive consequence; sparse, lookahead not fired so no concrete follow-up line to cite.

> **eval-16**: item 2 partial — 'parity balance' asserted as a structural mechanism on a bare opening (par all 6E, Major threats: none); item 8 partial — same unsupported parity claim + the prompt itself says 'draw, not a win' while premove[3]=1; item 9 fail — decisive outcome_flip (col4=+1 win vs col5=0 draw) grounded only in ungrounded 'parity balance' + filler ('let that safety slip away').
> Causes: item 2/8/9: classifier labeled a winning center move as drawing_move; sparse_no_winner suppressed lookahead; KB parity term injected without data, so the model used parity as a stand-in mechanism.

> **eval-17**: item 2 fail — claims you 'gave away the stronger minor threat' by playing col6, but boards show the PLAYED move created minor threats (gn at c4r1,c7r1) while the best move left none — backwards/hallucinated; item 3 fail — invented minor-threat, not a reproducible feature; item 7 partial — coherent but built on a false premise; item 8 fail — vague filler ('cleaner odd-row plan', 'drifting to the edge') never names the draw-vs-loss consequence; item 9 fail — decisive outcome_flip (col3=0 draw vs col6=-1 loss) ungrounded.
> Causes: item 2/3/7/8/9: decisive draw-to-loss flip explained with a hallucinated/backwards minor-threat and positional filler; sparse run, no lookahead section, no concrete grounding for the loss.

## Systematic issues

- **Item 9 (Reproducible reasoning)** — 7 entries (eval-5:fail, eval-10:fail, eval-12:fail, eval-14:fail, eval-15:partial, eval-16:fail, eval-17:fail); categories: drawing_move, suboptimal_move. Decisive outcome_flip / speed positions left ungrounded; explanation falls back to score-flavored or generic positional filler.
- **Item 7 (Internal consistency)** — 4 entries (eval-5:partial, eval-12:partial, eval-14:partial, eval-17:partial); categories: drawing_move, suboptimal_move. Better-move rationale not tied to a concrete board weakness; KB terms (gravity_top) misapplied.
- **Item 8 (Other issues)** — 4 entries (eval-12:fail, eval-14:partial, eval-16:partial, eval-17:fail); categories: drawing_move, suboptimal_move. Vague filler that never names the actual draw-vs-loss / win-vs-draw consequence; misapplied KB vocabulary.
- **Item 2 (Hallucinated win/structure)** — 3 entries (eval-10:fail, eval-16:partial, eval-17:fail); categories: suboptimal_move, drawing_move. Explanation asserts a minor-threat / parity structure that the boards do not show (often backwards — the threat is on the played board).
- **Item 3 (Pattern match)** — 3 entries (eval-10:fail, eval-14:partial, eval-17:fail); categories: suboptimal_move. Primary diagnosis is a fabricated tactical pattern or generic positional claim, not a reproducible board feature.

## Systematic prompt defects

| defect type | entries | ids | evidence |
|-------------|---------|-----|----------|
| empty_section | 8 | eval-3, eval-5, eval-10, eval-12, eval-14, eval-15, eval-16, eval-17 | ## Threat comparison has three labels (Before / After best col4 / After played col5) with blank bodies, no threat rows. |
| missing_expected_section | 6 | eval-5, eval-10, eval-12, eval-15, eval-16, eval-17 | is_sparse=true, decisive (col4=+1 vs col5=0), but no '## What the better move leads to' section. |
| vocab_without_data | 4 | eval-10, eval-14, eval-16, eval-17 | Task says 'Name the tactical pattern that was missed' + KB defines minor_threat, but no threat rows for the best move exist; model invented 'stronger minor threat setup' for col4. |
| instruction_data_contradiction | 2 | eval-12, eval-16 | Hard grounding rule states 'the position is a draw, not a win for either side' but premove_scores[3]=1 (>0) and visualizer scr center=2 — col4 is a winning move. |

- **empty_section** (8): `## Threat comparison` is emitted unconditionally even when every snapshot body is empty — priming the model to invent threat content. Guard: omit the whole section when no rows would render (explainContext.js section build).
- **missing_expected_section** (6): On sparse, decisive positions runSparseLookahead returns null (sparse_no_winner) so no `## What the better move leads to` section appears — the decisive reason is never surfaced. Root cause is in the look-ahead exploration logic.
- **vocab_without_data** (4): KB terms (minor_threat, parity, gravity_top) are injected into the glossary on positions with no instantiating data, so the model fabricates/misapplies them. The KB-term inclusion criterion and the data-section visibility criterion disagree (explainContext.js).
- **instruction_data_contradiction** (2): drawing_move positions whose better move is actually a WIN (center, premove +1/+2) carry a hard-grounding rule stating 'the position is a draw, not a win' — factually false. Upstream: blunder categorization labels a win-forfeiting move as drawing_move.

## Decisive-but-ungrounded cases (highest-value design signal)

| id | category | true_reason | lookahead_fired | suspected_generator | missing |
|----|----------|-------------|-----------------|---------------------|---------|
| eval-5 | drawing_move | outcome_flip | false | runSparseLookahead | No lookahead/threat/parity fact showing col4 holds a win (+1) while col5 only draws (0). |
| eval-10 | suboptimal_move | outcome_flip | false | runSparseLookahead | No supporting fact explaining why col4 keeps the win and col5 loses. |
| eval-12 | drawing_move | outcome_flip | false | runSparseLookahead | That col4 is a winning move (premove 1, center=2); explanation calls it merely holding a draw. |
| eval-16 | drawing_move | outcome_flip | false | runSparseLookahead | A concrete reason why col4 holds/wins and col5 does not; parity asserted with no threat data. |
| eval-17 | suboptimal_move | outcome_flip | false | runSparseLookahead | No fact establishing why col6 loses while col3 draws. |

All five grounding gaps share `(true_reason=outcome_flip, suspected_generator=runSparseLookahead)`. The look-ahead was *supposed* to produce a concrete forward line distinguishing the better move, but `compareOpportunities` returns null whenever no **near-term tactical structure** separates the two roots (`sparse_no_winner`). On these positions the decisive edge is deep/positional — e.g. an empty-board center play is a first-player win — so there is no shallow structure to surface, and the generator's logic (look for a tactical-structure delta) does not match what this class of position needs. The result: a decisive outcome_flip with an ungrounded prompt, into which the LLM either fabricates a threat (eval-10, eval-17) or invokes parity/gravity_top as a stand-in (eval-12, eval-16, eval-5). This is a design defect in the look-ahead, not a depth/budget tweak. eval-14 and eval-15 are `speed` (both-lose / both-win) and are correctly NOT gaps.

## Raw explanations (success entries)

### eval-3 — suboptimal_move (sev 1)
**board_state:** `3333`  •  **played:** col 5  •  **better:** col 4  •  **lookahead_fired:** true

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


## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward an undercut threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-undercut-1]the square that lands the undercut[/zone:future-undercut-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

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

Your move in [zone:col5]column 5[/zone:col5] gave ground because it simply filled [zone:c5r1]that cell[/zone:c5r1], while the stronger play in [zone:col4]column 4[/zone:col4] would have put your disc on [zone:c4r5]that cell[/zone:c4r5] and kept pressure where you already had the stack. That better move would have let you build next toward the [zone:cells:c3r3,c3r4]the square that lands the undercut[/zone:cells:c3r3,c3r4], which is the [term:minor_threat]minor threat[/term:minor_threat] plan you missed by playing low in the wrong column.

---

### eval-5 — drawing_move (sev 0)
**board_state:** `(empty / opening)`  •  **played:** col 5  •  **better:** col 4  •  **lookahead_fired:** false

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

You had a [term:parity]parity[/term:parity] move available in [zone:col4]column 4[/zone:col4]: playing [zone:c4r1]that cell[/zone:c4r1] would have kept the draw intact, while your actual move in [zone:col5]column 5[/zone:col5] gave that balance away. The missed idea was to hold the odd-row control on the bottom row; by choosing [zone:col4]column 4[/zone:col4], you would have preserved the safer structure instead of letting your opponent gain the more comfortable reply after your disc landed in [zone:c5r1]that cell[/zone:c5r1].

---

### eval-10 — suboptimal_move (sev 1)
**board_state:** `33`  •  **played:** col 5  •  **better:** col 4  •  **lookahead_fired:** false

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

You gave ground by playing [zone:col5]column 5[/zone:col5] instead of using [zone:col4]column 4[/zone:col4], which was the stronger [term:minor_threat]minor threat[/term:minor_threat] setup. By choosing [zone:c5r1]that cell[/zone:c5r1], you only added a disc beside your existing one, while [zone:c4r3]that cell[/zone:c4r3] would have built a more useful three-disc stack in [zone:col4]column 4[/zone:col4] and kept your plan on an odd row where you can aim to win.

---

### eval-12 — drawing_move (sev 0)
**board_state:** `(empty / opening)`  •  **played:** col 3  •  **better:** col 4  •  **lookahead_fired:** false

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

You had a move that would have [term:gravity_top]held at least a draw[/term:gravity_top], but playing [zone:col3]column 3[/zone:col3] gave that balance up by using [zone:c3r1]that cell[/zone:c3r1] instead of [zone:c4r1]that cell[/zone:c4r1]. The better move in [zone:col4]column 4[/zone:col4] would have kept the position steady on the bottom row and preserved the drawn outcome you could still secure.

---

### eval-14 — suboptimal_move (sev 0)
**board_state:** `3333311115555`  •  **played:** col 5  •  **better:** col 4  •  **lookahead_fired:** false

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

Your move in [zone:col5]column 5[/zone:col5] was a small slip because it only filled [zone:c5r1]that cell[/zone:c5r1], while the stronger choice was to play [zone:col4]column 4[/zone:col4] and land on [zone:c4r6]that cell[/zone:c4r6]. That better move would have kept the [term:gravity_top]gravity top[/term:gravity_top] where you wanted it on an even row and preserved a stronger path for you instead of giving ground with the lower column.

---

### eval-15 — suboptimal_move (sev 0)
**board_state:** `333331111555545536416610`  •  **played:** col 7  •  **better:** col 3  •  **lookahead_fired:** false

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

Your move in [zone:col7]column 7[/zone:col7] gave ground because it spent a turn on [zone:c7r4]that cell[/zone:c7r4] instead of using [zone:col3]column 3[/zone:col3] to take [zone:c3r1]that cell[/zone:c3r1], which keeps your own plan anchored on an odd row. The better move would have preserved that [term:minor_threat]minor threat[/term:minor_threat] shape in [zone:col3]column 3[/zone:col3] and made it harder for your opponent to steer the position away from your winning rows.

---

### eval-16 — drawing_move (sev 0)
**board_state:** `(empty / opening)`  •  **played:** col 5  •  **better:** col 4  •  **lookahead_fired:** false

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

By playing [zone:col5]column 5[/zone:col5], you gave up the [term:parity]parity[/term:parity] balance that [zone:col4]column 4[/zone:col4] would have kept for you: the stronger move would have put your disc on [zone:c4r1]that cell[/zone:c4r1] instead of [zone:c5r1]that cell[/zone:c5r1]. That was only a small inaccuracy, but [zone:col4]column 4[/zone:col4] was the move that would have held at least a draw, while [zone:col5]column 5[/zone:col5] let that safety slip away.

---

### eval-17 — suboptimal_move (sev 0)
**board_state:** `42`  •  **played:** col 6  •  **better:** col 3  •  **lookahead_fired:** false

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

You gave away the stronger [term:minor_threat]minor threat[/term:minor_threat] by playing [zone:col6]column 6[/zone:col6]: that move only filled [zone:c6r1]that cell[/zone:c6r1], while [zone:col3]column 3[/zone:col3] was the better [zone:c3r2]that cell[/zone:c3r2] to take. By playing there, you would have built a cleaner odd-row plan and kept more pressure on the central area instead of drifting to the edge.

---

