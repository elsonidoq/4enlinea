# Deep Reveal Eval Report — eval_set_large_2_nonfiring_lookup_evals_results_2026-06-25T15-30-01Z.jsonl

## Summary

- Total entries: 8
- Pipeline failures: 0
- Annotation failures: 0
- Successes evaluated: 8
- Rubric pass rate: 42/72 items passed across all success entries

**Context:** All 8 entries are the `is_sparse:true` cases that previously returned `lookaheadFired:false`. After the depth-8 fix, **none** of them produced a `## What the better move leads to` section — look-ahead still returned null for every one. The honest-minimal exception on rubric item 9 therefore applies to all 8.

## Pipeline failures

None.

## Annotation failures

None. (eval-17 failed validation on attempt 1 with P2:col_mismatch/P6:raw_coordinate but passed on attempt 2.)

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----|----------|-----|---|---|---|---|---|---|---|---|---|
| eval-3 | suboptimal_move | 1 | P | F | F | P | P | P | F | F | F |
| eval-5 | drawing_move | 0 | P | F | P | P | P | P | ~ | F | ~ |
| eval-10 | suboptimal_move | 1 | P | F | ~ | P | P | P | ~ | F | F |
| eval-12 | drawing_move | 0 | P | F | ~ | P | P | P | ~ | F | F |
| eval-14 | suboptimal_move | 0 | P | P | P | P | P | P | P | ~ | P |
| eval-15 | suboptimal_move | 0 | P | ~ | P | P | P | P | ~ | P | ~ |
| eval-16 | drawing_move | 0 | P | P | P | P | P | P | ~ | ~ | F |
| eval-17 | suboptimal_move | 0 | P | F | P | P | P | P | ~ | F | ~ |

_(P = pass, ~ = partial, F = fail)_

> **eval-3:** item 2 fail — labels column 4 the 'minor threat setup', but the best-move board shows no minor threats (the (gn) markers appear after the PLAYED move); structure misattributed. item 3 fail — primary concept is generic positional claim + wrong minor-threat label. item 7 fail — rationale doesn't address a real weakness and contradicts the boards. item 8 fail — 'extending your vertical line in column 4' is wrong: col4 is alternating Gn/Gy, no vertical line. item 9 fail — score-flavored/generic filler ('gives ground','more active','less pressure').
> **Causes:** item 2/3/7 — bare key insight ('There was a stronger move — this one gives ground'), empty threat-comparison rows, no look-ahead section; injected [term:minor_threat] nudged the model to invent a minor threat. item 8 — model misread the alternating col4 stack. item 9 — no distinguishing feature supplied, model padded with generic filler instead of honest-minimal.

> **eval-5:** item 2 fail — fabricates a 'parity control' difference between col4 and col5; both are a single disc on row 1 leaving identical 5O parity. item 7 partial — remedy rests on a false parity premise. item 8 fail — col4 and col5 are parity-equivalent on an empty board; the real difference (center control) is not parity. item 9 partial — names parity (concrete) but it is fabricated; honest-minimal was the correct path.
> **Causes:** item 2/8 — generic 'held at least a draw' insight + injected parity KB term + empty threat rows invited applying parity even though both moves are parity-identical. item 9 — no look-ahead section, gap filled with a fabricated parity claim.

> **eval-10:** item 2 fail — claims the better move 'built your minor threat higher', but the after-best board shows 'Major threats: none' and no minor threats. item 3 partial — names minor_threat but misapplies it. item 7 partial — remedy loosely tied to diagnosis, rests on a fabricated threat. item 8 fail — says the played move 'didn't create the same pressure', yet the played board shows minor threats (gn cols 2,3,5,6) while the best board shows none. item 9 fail — generic filler ('much more active','pressure').
> **Causes:** item 2/8 — empty threat-comparison rows; model invented a minor-threat narrative contradicting visible (gn) markers. item 3/7 — injected minor_threat term. item 9 — no look-ahead section/threat counts, fell back on score-flavored filler.

> **eval-12:** item 2 fail — claims a 'parity edge' was given up, but col3 and col4 both leave identical 5O parity on the empty board. item 3 partial — primary clause leads with parity (different pattern) though it references holding a draw. item 7 partial — remedy ('held a draw') doesn't connect to the 'parity edge' weakness. item 8 fail — no parity difference between the two landing squares. item 9 fail — fabricated 'parity edge' + score-flavored filler.
> **Causes:** item 2/8/9 — KB injects 'parity' as applying to this position, inviting an unsupported parity edge. item 3/7 — generic 'held at least a draw' insight + no look-ahead section.

> **eval-14:** item 8 partial — correctly cites the even-row cell c4r6 but the 'lets your opponent matter on later turns' framing is mildly misleading since c4r6 is your winning (even) row.
> **Causes:** item 8 — generic 'gives ground' insight + blank threat rows + no look-ahead section, so the model padded with a speculative opponent-benefit claim.

> **eval-15:** item 2 partial — col3 minor threats exist, but placing at c3r1 does not itself create one; attribution loose. item 7 partial — remedy ('stronger long-range plan') weakly connects to the 'gives ground' diagnosis. item 9 partial — cites minor threat + odd-row parity (concrete) but operative payoff is generic 'long-range plan'.
> **Causes:** item 2 — empty threat rows + 'gives ground' insight; model attached an existing col3 minor threat to the c3r1 landing square. item 7/9 — no look-ahead section/threat counts; padded with generic 'long-range plan'.

> **eval-16:** item 7 partial — remedy ('preserved safer odd-row structure') loosely connects to the draw-loss diagnosis. item 8 partial — both played (col5) and better (col4) land on odd row 1, so 'preserved the safer odd-row structure' implies a distinction that doesn't exist. item 9 fail — generic filler; the real distinguisher (col4 = center control) is never named.
> **Causes:** item 7/8/9 — empty board opening move, no threat rows, no look-ahead section, both candidates on odd row 1; the only real ground (center control) was not used, model invented a vague odd-row rationale.

> **eval-17:** item 2 fail — claims a minor threat exists in col3 after the best move; no board shows one there (only the played move created minor threats at c4r1/c7r1). item 7 partial — rationale anchored on the fabricated minor threat. item 8 fail — 'built on your stack there' is wrong: c3r1 is Gy (opponent's disc), the player has no stack in col3. item 9 partial — concrete minor-threat claim is false; tail reason 'less useful shape' is generic filler.
> **Causes:** item 2/9 — empty threat rows + no look-ahead section + 'name the tactical pattern' instruction drove the model to invent a minor threat. item 8 — misread the 'Gn=yours/Gy=opponent' note, treating opponent's c3r1 disc as the player's stack.

## Systematic issues

### Item 7 — 7 entries affected
- Fails: eval-3(sub)
- Partials: eval-5(draw), eval-10(sub), eval-12(draw), eval-15(sub), eval-16(draw), eval-17(sub)
- The better-move rationale rests on a fabricated or generic premise rather than addressing a concrete weakness, so diagnosis and remedy are only loosely connected.

### Item 8 — 7 entries affected
- Fails: eval-3(sub), eval-5(draw), eval-10(sub), eval-12(draw), eval-17(sub)
- Partials: eval-14(sub), eval-16(draw)
- Factual board errors: misreading alternating stacks as vertical lines, treating the opponent's disc as the player's, or implying a parity/odd-row distinction between two moves that land on the same parity.

### Item 9 — 7 entries affected
- Fails: eval-3(sub), eval-10(sub), eval-12(draw), eval-16(draw)
- Partials: eval-5(draw), eval-15(sub), eval-17(sub)
- Core reasoning is score-flavored or generic positional filler ('gives ground', 'more active', 'less pressure', 'safer odd-row structure') because no look-ahead section and no threat counts gave the model a real distinguishing feature.

### Item 2 — 6 entries affected
- Fails: eval-3(sub), eval-5(draw), eval-10(sub), eval-12(draw), eval-17(sub)
- Partials: eval-15(sub)
- The model fabricates tactical structure — non-existent minor threats or a parity edge — on sparse early-game boards that show 'Major threats: none' and where both candidate moves are parity-identical.

### Item 3 — 3 entries affected
- Fails: eval-3(sub)
- Partials: eval-10(sub), eval-12(draw)
- The primary diagnosis leans on a misapplied/invented pattern (parity edge, minor threat) instead of a genuine reproducible board feature.

**Common root cause:** all five recurring failures trace to the same condition — these are sparse positions where forward look-ahead returned null (no `## What the better move leads to` section) and the threat-comparison rows are empty, leaving only a generic key insight ('gives ground' / 'held at least a draw'). The prompt still (a) injects KB term definitions (`minor_threat`, `parity`) asserting they 'apply to this position', and (b) instructs the model to 'name the tactical pattern that was missed'. With no real distinguishing feature on the board, the model satisfies these instructions by inventing one. The depth-8 look-ahead fix did **not** cause look-ahead to fire for any of these 8 cases.

## Raw explanations (success entries)

### eval-3 — suboptimal_move (sev 1)

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
You gave ground by playing [zone:col5]column 5[/zone:col5] instead of taking [zone:col4]column 4[/zone:col4], which was the stronger [term:minor_threat]minor threat[/term:minor_threat] setup. The better move would have placed your disc on [zone:c4r5]that cell[/zone:c4r5], extending your vertical line in [zone:col4]column 4[/zone:col4] and keeping the position more active on an odd row, while your move only added a new disc on [zone:c5r1]that cell[/zone:c5r1] and left you with less pressure.
```

### eval-5 — drawing_move (sev 0)

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
By playing [zone:col5]column 5[/zone:col5], you gave up the [term:parity]parity[/term:parity] control that [zone:col4]column 4[/zone:col4] would have kept for you, and that was the key reason the position stayed safe as a draw. The better move would have put your disc on [zone:c4r1]that cell[/zone:c4r1], preserving your hold on the odd-row landing and holding the draw instead of loosening it.
```

### eval-10 — suboptimal_move (sev 1)

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
You gave ground by playing [zone:col5]column 5[/zone:col5] instead of using [zone:col4]column 4[/zone:col4] to land on [zone:c4r3]that cell[/zone:c4r3]. The better move would have built your [term:minor_threat]minor threat[/term:minor_threat] higher in the same column, keeping your plan on an odd row and making your position much more active, while your played move only added a disc on [zone:c5r1]that cell[/zone:c5r1] and didn’t create the same pressure.
```

### eval-12 — drawing_move (sev 0)

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
You gave up a [term:parity]parity[/term:parity] edge by playing [zone:col3]column 3[/zone:col3] instead of [zone:col4]column 4[/zone:col4]: your disc landed on [zone:c3r1]that cell[/zone:c3r1], but the better move would have put your disc on [zone:c4r1]that cell[/zone:c4r1] and kept the position balanced. This was a small slip, but it mattered because the move in [zone:col4]column 4[/zone:col4] would have held at least a draw, while the move you played gave that balance away.
```

### eval-14 — suboptimal_move (sev 0)

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
Your move in [zone:col5]column 5[/zone:col5] gave away the stronger [term:gravity_top]gravity top[/term:gravity_top] on [zone:c4r6]that cell[/zone:c4r6]; instead of taking that high landing square, you filled [zone:c5r1]that cell[/zone:c5r1] and left [zone:col4]column 4[/zone:col4] open for your opponent to matter on later turns. The better move would have put your disc on [zone:c4r6]that cell[/zone:c4r6], keeping the key even-row placement for you and preserving your best chance to build along your winning rows.
```

### eval-15 — suboptimal_move (sev 0)

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
You gave ground by choosing [zone:col7]column 7[/zone:col7], which only dropped a disc on [zone:c7r4]that cell[/zone:c7r4] and left the key [zone:col3]column 3[/zone:col3] idea untouched. The better move was the [term:minor_threat]minor threat[/term:minor_threat] you could have made in [zone:col3]column 3[/zone:col3], placing on [zone:c3r1]that cell[/zone:c3r1] to build a stronger long-range plan on your odd-row side.
```

### eval-16 — drawing_move (sev 0)

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
You had a move that would have [term:parity]held the draw[/term:parity], and playing [zone:col5]column 5[/zone:col5] gave that balance up. By choosing [zone:col5]column 5[/zone:col5], you landed on [zone:c5r1]that cell[/zone:c5r1], but the better move in [zone:col4]column 4[/zone:col4] would have kept your disc on [zone:c4r1]that cell[/zone:c4r1] and preserved the safer odd-row structure you wanted.
```

### eval-17 — suboptimal_move (sev 0)

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
You gave away a [term:minor_threat]minor threat[/term:minor_threat] in [zone:col3]column 3[/zone:col3]: the better move was to play [zone:c3r2]that cell[/zone:c3r2], which built on your stack there instead of spending your turn on [zone:col6]column 6[/zone:col6]. After that better move, you would have kept the stronger two-step setup on the board, while your played move only added a single disc at [zone:c6r1]that cell[/zone:c6r1] and left you with a less useful shape.
```

