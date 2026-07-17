---
id: allen-candlesticks-opening
type: strategic_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 12 (Central-Column Openings), p. 182-183 (Candlesticks Opening); Ch. 8, p. 142 ('I Play Where You Play'); Glossary p. 231; Diagrams 236-243"
  verbatim_quote: |
    Ch. 12, p. 182: "Diagram 236 is called a Candlesticks Opening since separated columns
    are played up to look like candlesticks. Red wins easily with a triple threat. (This is
    the same as Diagram 61.)"

    Ch. 8, p. 142: "the best play for a player will be to play above the opposing player's
    just-played disc; the Candlesticks Opening, in Diagram 236 ..., is one example."

    Glossary: "Candlesticks Opening: A sequence of initial moves that leads to two or three
    separated columns played up ... like candlesticks."
short_summary: |
  The Candlesticks opening: instead of one central stack, separated columns are each built
  straight up so the board looks like candlesticks. Played "I play where you play", it is an
  easy first-player win via a triple threat. It is a family, not a single line — a two-column
  form (centre + one flank), a three-column form (centre + two flanks), and their mirrors all
  win — but only when the imitative move order is kept: the same heights in the wrong fill order
  can flip the result to the second player.
statement: |
  The Candlesticks opening is a central-column-family opening in which two or three
  *separated* columns are each stacked straight up — the discs alternate in colour up each
  column because both sides play "I play where you play" (each disc goes directly on top of
  the opponent's last). The resulting silhouette of separated equal-height stacks looks like
  candlesticks. The canonical line (Allen Diagram 236) is
  D1 d2 D3 d4 D5 b1 B2 b3 B4 f1 F2 f3 F4 b5 F5, using centre col 3 (D) and the two
  separated columns col 1 (B) and col 5 (F). It is an easy first-player win: the imitative
  stacking hands the first player a routine odd-row triple threat, and the second player's
  even-row major threat (e.g. at f2) is to no avail. Because imitation is sound here, the
  opening is a textbook case of "I play where you play".

  Candlesticks is a FAMILY, not a single line. A two-column form (centre col 3 + a single flank,
  e.g. "333331111") and the three-column form ("3333311115555", full "333331111555515") are both
  first-player wins, as are the left/right mirrors of the flank (e.g. "3333355551"), at various
  depths — all verified col-3-centred. What is load-bearing is the imitative colour-alternation
  produced by the RIGHT move order, not merely the height silhouette: the same three stacks at
  the same heights in the wrong fill order ("333331111155555", col 1 topped out before col 5 is
  begun) flip col 5's bottom-disc parity and become a SECOND-player win.

preconditions:
  - "Two or three separated columns are each built straight up, discs alternating in colour (imitative play)."
  - "The centre column (0-indexed col 3) and separated flanking columns (e.g. 0-indexed cols 1 and 5) are the stacks."
  - "It is the second player's turn and the first player has (or is one imitative step from) a triple odd-row threat."
formal_predicate: |
  # 0-indexed: col 3 = centre (Allen D); flanks e.g. col 1 (B) and col 5 (F); row 0 = bottom.
  # Recognise the candlesticks silhouette: a small set of columns, each stacked contiguously,
  # each internally colour-alternating (a consequence of imitative 'I play where you play').

  def is_candlesticks(board, movestring):
      used = sorted(set(int(c) for c in movestring))
      if not (2 <= len(used) <= 3):
          return False
      for col in used:
          h = board.col_height(col)
          if h < 2:
              return False
          # each occupied column alternates colour from the bottom up
          for r in range(h - 1):
              if board[col][r] == board[col][r+1]:
                  return False
      # columns are 'separated' (not all adjacent) — candlestick look
      return (used[-1] - used[0]) >= 3

  # Effect: with the stacks completed and imitative play maintained, the first player holds a
  # winning odd-row triple threat; the second player's even-row major threat does not save them.
  #
  # NECESSARY BUT NOT SUFFICIENT: this silhouette+alternation check passes positions that are
  # NOT candlesticks wins. In particular it would wrongly pass "333331111155555" (right heights,
  # each column internally colour-alternating) which is a SECOND-player win — the WINNER depends
  # on the imitative fill ORDER, which this predicate does not capture. To decide the result,
  # confirm the first player's triple odd-row threat with the solver / threat detectors; do not
  # rely on the silhouette alone.
  #
  # Instances (all col-3-centred, verified first-player wins):
  #   "333331111"        two-column form (centre + one flank)
  #   "3333311115555"    three-column 13-ply stem (D1 d2 D3 d4 D5 b1 B2 b3 B4 f1 F2 f3 F4)
  #   "333331111555515"  full Diagram 236 (adds b5 F5 in that order)
  #   "3333355551"       mirror (flank on col 5)

worked_examples:
  - movestring: "3333311115555"
    description: |
      Candlesticks stem: centre col 3 stacked five high, flanking cols 1 (B) and 5 (F) each
      stacked four high — three separated candlesticks, each colour-alternating. Second player
      (Gray/Black) to move and lost; the first player's triple odd-row threat is decisive.
    expected_behavior: "13 plies, Gray to move; every column's solver score is negative → the side to move loses → First-Player win. Matches Allen 'Red wins easily with a triple threat.'"
    solver_verified: 2026-07-03
    notes: |
      The board shows the literal candlestick silhouette: cols 1, 3, 5 filled, cols 0, 2, 4, 6
      empty. This 13-ply stem is a prefix of Allen's full Diagram 236 line; the completed line is
      "333331111555515" (below). The stem already shows the second player lost, so the win is
      verified at the stem.
  - movestring: "333331111555515"
    description: |
      Allen's COMPLETE Diagram 236 line: D1 d2 D3 d4 D5 b1 B2 b3 B4 f1 F2 f3 F4 b5 F5 — centre
      col 3 five high, flanking cols 1 (B) and 5 (F) each five high, three separated candlesticks.
      Note the exact fill order: cols 1 and 5 are built to FOUR alternately, then topped off (b5,
      then F5). Second player (Gray/Black) to move and lost.
    expected_behavior: "15 plies, Gray to move; every column's solver score is <= 0 -> the side to move loses -> First-Player win, completing the D4-E3-F2-G1-family corner diagonal (window c4r3-c7r6). Matches Allen Diagram 236 exactly."
    solver_verified: 2026-07-04
    notes: |
      CRITICAL — fill order is load-bearing. The move order "b5 F5" (col 1 then col 5) yields
      this first-player win. The naive-looking "fully alternate each stack" order
      "333331111155555" (col 1 filled all the way to five BEFORE col 5 is touched) flips col 5's
      bottom-disc parity and becomes a SECOND-player win — see false_positives. Verified via
      visualize_board.sh (Gray to move, scr all <= 0) and optimal_line.mjs (first-player win).
  - movestring: "33333111115"
    description: |
      Diagram 237 variant: the second player tries 10.b5 (0-indexed col 1, extending the B
      candlestick) instead of f1; the first player answers 11.F1 (col 5). Allen: now the first
      player has only one forcing first-row play, so 11.F1 is appropriate.
    expected_behavior: "11 plies; playing out optimal moves for both sides (optimal_line.mjs) reaches a First-Player (Green) win completing at c1r3 (third-row window). The candlesticks win survives the 10.b5 deviation, matching Allen Diagram 237."
    solver_verified: 2026-07-03
    notes: |
      Verified via `optimal_line.mjs 33333111115` (winner: first player); the deviation point
      itself, `3333311111` (after 10.b5, first player to move), also solves to a first-player win.

false_positives:
  - movestring: "333331111155555"
    why_not: |
      Same three columns (1, 3, 5) at the same final heights as Allen's Diagram 236, and the same
      candlestick silhouette — but the WRONG fill order: col 1 is stacked all the way to five
      before any disc is played in col 5. This flips col 5's bottom-disc parity relative to
      Allen's alternating build, and the position becomes a SECOND-player win (Gray to move with
      a positive solver score at 0-indexed col 4). Verified: optimal_line.mjs -> second(Gray)
      win, completing a second-row horizontal. This is the concrete proof that "candlesticks" is
      NOT a pure height silhouette — the coloring/parity from the imitative move order is
      load-bearing. The correct complete line is "333331111555515" (see worked_examples).
  - movestring: "3333322222"
    why_not: |
      Two ADJACENT stacks (cols 2 and 3), not separated — this is the 5-4 / central-column
      look, not candlesticks. The 'candlesticks' character requires the built-up columns to be
      separated (a gap between them); adjacent stacks belong to [[allen-5-4-opening]].
  - movestring: "3131313535"
    why_not: |
      The right columns are used but NOT built as clean contiguous imitative stacks — play
      hops between columns so a column may not alternate colour cleanly, breaking the 'I play
      where you play' structure the candlesticks win relies on. The silhouette matters, but so
      does the imitative colour-alternation inside each stack. (Illustrative, not verified.)

known_limitations:
  - "First-player win under the assumption that imitative play stays sound; Allen shows variants (Diagrams 237-240) where the second player deviates and the first player must adjust (e.g. only one forcing first-row play remains)."
  - "The opening is a member of the central-column family; not every 'separated stacks' position is a candlesticks win — the imitative colour-alternation and the resulting triple threat are load-bearing."
  - "The winning silhouette is necessary but NOT sufficient: the same columns at the same heights in a different fill order can be a SECOND-player win (e.g. '333331111155555'). The imitative move ORDER (Allen tops col 1 then col 5: b5 F5), not just the final heights, decides the result — the height-only formal_predicate must be backed by a solver/threat check."
  - "Draw variants exist when either side deviates: Allen's Diagrams 240, 243, 245 and 247 are candlesticks-like positions that draw (some with a Red blunder). Membership in the family does not guarantee a first-player win."
  - "Related but distinct from the 5-4 opening (adjacent, not separated, stacks) and from first-row openings."

related:
  - "[[allen-opening-principles]] — the flagship example of 'I play where you play' / imitative play"
  - "[[allen-5-4-opening]] — adjacent-stack sibling in the central-column family"
  - "[[allen-opening-tables]] — a First-Player win result"
  - "[[community-sextuple-threat]] — the triple/multiple odd-row threat the candlesticks winner builds"
  - "[[allen-j-configuration]] — triple-threat machinery of the winning side"

last_verified: 2026-07-03
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 12, p. 182:

> "Diagram 236 is called a Candlesticks Opening since separated columns are played up to look like candlesticks. Red wins easily with a triple threat. (This is the same as Diagram 61.)"

From Chapter 8, p. 142 ("I Play Where You Play"):

> "Surprisingly often, the best play for a player will be to play above the opposing player's just-played disc; the Candlesticks Opening, in Diagram 236 ..., is one example."

From the Glossary:

> "Candlesticks Opening: A sequence of initial moves that leads to two or three separated columns played up ... like candlesticks."

Allen's Diagram 236 move list: `D1! d2 D3! d4 D5! b1 B2! b3 B4! f1 F2! f3 F4! b5 F5 (16)` — Black to play and lose.

## Notes

- **Coordinate translation.** Allen D = 0-indexed col 3; B = col 1; F = col 5. Rows 1–6 → 0-indexed 0–5.
- **Verification.** `./visualize_board.sh 3333311115555` → 13 plies, Gray to move, all columns negative: First-Player win, matching Allen. The rendered board is the literal candlestick silhouette (cols 1, 3, 5 stacked; cols 0, 2, 4, 6 empty), each stack alternating colour bottom-to-top — the signature of imitative play.
- **Why filed as `strategic_rule`.** Like the other named openings, this describes an opening *plan* with a game-theoretic result, not a single finished tactical shape. The triple threat it produces is the tactical payload (see [[community-sextuple-threat]] / [[allen-j-configuration]]).
- **Downstream use.** Lessons: the cleanest illustration of "I play where you play". Challenges: "3333311115555" (second player to move, lost) is a "the imitation has won — convert the triple threat" seed. Reason engine: `is_candlesticks` is a board-only silhouette classifier for opening-phase recognition.
