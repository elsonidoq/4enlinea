---
id: allen-5-4-opening
type: strategic_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 12 (Central-Column Openings), p. 169-177 (5-4 Opening; 5-1 and 6-1 variants)"
  verbatim_quote: |
    Ch. 12, p. 169: "The 5-4 opening gets its name because it starts with five disks played
    in column D (D1 d2 D3 d4 D5), followed by four disks played in a neighboring column E
    (e1 E2 e3 E4). By mirror-image symmetry, the same analysis applies if column C is played
    instead of column E."

    "In the 5-4 opening, Red's first plays at D1, D3, and D5 are all quite clear-cut; the
    central cells are the best cells on the board. When play shifts to column E, players
    continue to play right above the opposing player's previous disk ('I play where you
    play'); the plays E2 e3 E4 are logical because they block horizontal threats."

    "It would be a mistake for Black to play e5 on top of Red's E4."
short_summary: |
  The 5-4 opening: the first player builds five discs up the centre column, then four discs
  up an adjacent column, playing "I play where you play". It is a first-player win — the
  centre stack plus the neighbouring block gives the first player a routine odd-row triple
  threat on the far side.
statement: |
  The 5-4 opening is Allen's flagship central-column opening and a first-player (Red/Green)
  win. It is defined by the first player stacking five discs in the centre column (0-indexed
  col 3: plies at rows 0, 2, 4 for the first player; the second player fills rows 1, 3),
  followed by four discs in an immediately adjacent column (0-indexed col 4, Allen's E, or by
  mirror symmetry col 2). The canonical move order is D1 d2 D3 d4 D5 e1 E2 e3 E4 →
  0-indexed movestring "333334444". Red's central plays are clear-cut (central cells are the
  best on the board); once play shifts to the adjacent column both sides play "I play where
  you play", and Red's E2 e3 E4 block Black's horizontal threats while Red develops a winning
  odd-row triple threat on the opposite (left) side. Black locking up the far side with an
  even-row major threat (e.g. at f2) is to no avail. Variants: the 5-1 opening (Red answers
  6.e1 with 7.B1 — "DdDdDeB", fewer difficult lines) and the 6-1 / column-D opening (six discs
  in col 3 then one in col 2).

preconditions:
  - "Centre column (0-indexed col 3) has five discs: first player on rows 0, 2, 4; second player on rows 1, 3."
  - "An adjacent column (0-indexed col 4 = E, or mirror col 2 = C) has four discs stacked, filled 'I play where you play'."
  - "It is the second player's turn (even ply count; here after 9 plies) and the second player has no faster winning structure."
formal_predicate: |
  # 0-indexed: col 3 = centre (Allen D), col 4 = adjacent (Allen E), row 0 = bottom.
  # Recognise the completed 5-4 shape from a movestring.

  def is_5_4_opening(movestring):
      if len(movestring) < 9:
          return False
      center = 3
      # find the adjacent column actually used (col 2 or col 4)
      for adj in (4, 2):
          seq = [center]*5 + [adj]*4       # D×5 then E×4 (or C×4)
          if list(map(int, movestring[:9])) == seq:
              return True
      return False

  # Effect: with the shape completed and the second player to move, the first player
  # holds a winning odd-row triple threat on the side OPPOSITE the adjacent column
  # (here the left side). Every second-player reply loses under best play.
  #
  # Canonical instance: "333334444"  (D1 d2 D3 d4 D5 e1 E2 e3 E4)

worked_examples:
  - movestring: "333334444"
    description: |
      The canonical 5-4 opening: D1 d2 D3 d4 D5 e1 E2 e3 E4. Centre col 3 stacked five high,
      adjacent col 4 stacked four high via 'I play where you play'. Second player (Gray/Black)
      to move and lost; the first player has the winning odd-row structure on the left.
    expected_behavior: "9 plies, Gray to move; solver score negative in every column (best is -1) → the side to move loses everywhere → First-Player (Red) win. Matches Allen p. 169."
    solver_verified: 2026-07-03
    notes: |
      By mirror symmetry the reflection "333332222" (adjacent column C) is the same opening
      with the same result.
  - movestring: "333334140222212"
    description: |
      5-1 opening, Allen Diagram 218 (full 15-ply line): D1 d2 D3 d4 D5 e1 B1 e2 A1 c1 C2 c3
      C4 b2 C5. After the centre stack and Black's 6.e1, Red answers 7.B1 (0-indexed col 1)
      instead of continuing up col 4. Allen: the 5-1 is still a Red win but with fewer
      difficult variations than the pure 5-4.
    expected_behavior: "15 plies, second player (Gray/Black) to move; solver scr negative in every column. Playing out optimal moves for both sides (reason_engine/TOOLS/optimal_line.mjs) reaches a First-Player (Green) win at ply 41, completing the fifth-row window c3r5-c6r5 — an odd-row win, matching Allen's plan."
    solver_verified: 2026-07-03
    notes: |
      Verified via `optimal_line.mjs 333334140222212` (winner: first player) and
      `visualize_board.sh` (scr all-negative, second player to move). The fifth-row completion
      confirms Allen's odd-row-threat theme.

false_positives:
  - movestring: "333334445"
    why_not: |
      NOT a 5-4 opening — the ninth disc goes to col 5 (F), not completing the four-stack in
      col 4. More importantly it hints at the 5-5 mistake Allen warns of: if the second
      player plays e5 on top of Red's E4 (extending col 4 to five) the shape is a different,
      worse structure for that player. The 5-4 win depends on the exact 5-then-4 stacking.
  - movestring: "3333044440"
    why_not: |
      The centre stack is broken — a disc was interleaved into col 0 before the centre reached
      five high, so col 3 is not filled to row 4 in the clean D1 d2 D3 d4 D5 order. A naive
      "five 3's and four 4's somewhere" match would fire; the opening requires the specific
      contiguous central build-up, because the odd/even row ownership of the centre stack is
      load-bearing.

known_limitations:
  - "First-player win only under precise play. Allen notes several difficult variations; Red's plays in Diagram 191 are not marked with exclamation points only because Red could have interposed temporising moves in column G — the win is real but not automatic."
  - "The mirror (adjacent column C, movestring '333332222') is the same opening; do not treat it as distinct."
  - "The 5-5 continuation (second player plays e5 on top of E4) is explicitly a mistake for that player, not a variant of the 5-4 win."
  - "Recognition of the completed shape does not by itself locate the winning triple threat; that lives on the side opposite the adjacent column and must be found tactically (see [[allen-j-configuration]] / [[community-sextuple-threat]])."

related:
  - "[[allen-opening-principles]] — centrality, odd-row quest and 'I play where you play' all appear in this line"
  - "[[allen-opening-tables]] — the 5-4 opening is a Table-classified First-Player win"
  - "[[allen-3-4-opening]] — the sibling central-column opening where Black declines to play d4"
  - "[[allen-candlesticks-opening]] — another central-column win, via separated stacks"
  - "[[allen-j-configuration]] — the triple-threat machinery the 5-4 winner aims to build"
  - "[[community-center-control]] — why the central stack is 'the best cells on the board'"

last_verified: 2026-07-03
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 12, p. 169:

> "The 5-4 opening gets its name because it starts with five disks played in column D (D1 d2 D3 d4 D5), followed by four disks played in a neighboring column E (e1 E2 e3 E4). By mirror-image symmetry, the same analysis applies if column C is played instead of column E."

> "In the 5-4 opening, Red's first plays at D1, D3, and D5 are all quite clear-cut; the central cells are the best cells on the board. When play shifts to column E, players continue to play right above the opposing player's previous disk ('I play where you play'); the plays E2 e3 E4 are logical because they block horizontal threats."

> "It would be a mistake for Black to play e5 on top of Red's E4."

## Notes

- **Coordinate translation.** Allen D = 0-indexed col 3; E = col 4; C = col 2; B = col 1. Rows 1–6 → 0-indexed rows 0–5. Movestring digits are 0-indexed column indices.
- **Verification.** `./visualize_board.sh 333334444` → 9 plies, Gray to move, all columns negative (best -1): the second player is lost everywhere, i.e. a First-Player win, matching Allen. The board shows col 3 five discs high and col 4 four discs high — the literal 5-4 shape.
- **Variants.** The 5-1 (Diagram 218) full line `333334140222212` is solver-verified above (`optimal_line.mjs` → first-player win). The 6-1 / column-D opening (Diagram 220) is described by Allen but has no worked example here yet; add one from Allen's Diagram 222 line (`D1 d2 D3 d4 D5 d6 C1 b1 F1 e1 E2 e3 E4 b2 C2`) if a 6-1 example is wanted.
- **Downstream use.** Challenges: "333334444" with the second player to move is a ready "the opening is won — find the plan / don't blunder" seed; the 5-5 mistake is a natural distractor. Lessons: teaches the central-stack-then-neighbour recipe. Reason engine: `is_5_4_opening` is a board-only opening classifier.
