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
  The Candlesticks opening: instead of one central stack, three separated columns are each
  built straight up so the board looks like candlesticks. Played "I play where you play", it
  is an easy first-player win via a triple threat.
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
  # Canonical instance (13-ply stem, second player to move & lost):
  #   "3333311115555"  (D1 d2 D3 d4 D5 b1 B2 b3 B4 f1 F2 f3 F4)

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
      empty. Allen's full Diagram 236 line adds b5 F5 (ending in a first-player win); the
      13-ply stem already shows the second player lost, so the win is verified at the stem.
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
