---
id: allen-opening-tables
type: definition
canonical: true
source:
  doc: allen_2010
  location: "Ch. 9 (Opening Tables), p. 145-148 (Table 1: three-move; Table 2: five-move; Table 3: seven-move); Opening Lottery, p. 167-168"
  verbatim_quote: |
    Ch. 9, p. 145: "Table 1 shows the result of every possible three-move opening. (Only
    one form of each mirror-image pair is shown.) A red R means that First Player can force
    victory after the indicated three-move opening; a black b means that Second Player can
    force victory; an equal sign (=) means the game is drawn with best play."

    Ch. 9, p. 146: "Tables 2 and 3 are similar to Table 1 but show the results of some
    five- and seven-move openings. To save space, most poorly played openings are omitted."

    Ch. 12, p. 167 (Opening Lottery): "In Chapter 9 you can find which openings lead,
    theoretically, to a draw or to Red or Black victory ..."
short_summary: |
  Allen's Chapter 9 gives result tables for every 3-move opening and many 5- and 7-move
  openings, each marked R (first player forces a win), b (second player forces a win), or
  = (draw). The headline result: the centre-column start is a first-player win; most other
  openings favour the second player or draw.
statement: |
  Chapter 9 is Allen's compact opening book. Three tables give the theoretical result of
  short openings under best play, using the notation R = First Player (Red/Green) forces
  victory, b = Second Player (Black/Gray) forces victory, = = draw. Only one of each
  mirror-image pair is listed.

  - Table 1 (three-move openings): every possible opening of the form (move1, move2, move3).
  - Table 2 (five-move openings): selected well-played five-move openings.
  - Table 3 (seven-move openings): selected seven-move openings; poorly played lines omitted.

  Key structural results a lesson/challenge author needs:
  - The centre-column first move (0-indexed col 3, Allen's D) is the decisive first move:
    Table 1's D-rows are dominated by R, and it is the only opening square with which the
    first player forces a win. Non-central first moves (A, B, C, E, F, G) mostly yield
    Second-Player wins (b) or draws (=). This matches the classical Allis/Tromp solution
    (first player wins iff the game opens in the centre).
  - Because Red's advantage is razor-thin, a single imprecise Red move typically flips the
    result to b: the tables are sparse with R outside the strong central lines.
  - Allen's "Opening Lottery" (p. 167-168) distils the tables into three ready-made sets of
    six three-disc openings each — six drawing openings, six that win for Red, six that win
    for Black — for players who want a randomised but known-result start.

preconditions:
  - "The opening is one of the enumerated short openings (3, 5, or 7 plies)."
  - "Both sides are assumed to play perfectly thereafter — the table entry is the game-theoretic value, not a heuristic."
  - "Columns are read in Allen's A-G notation (translate A=0 … G=6); a lowercase letter denotes a second-player (Black) move, uppercase a first-player (Red) move."
formal_predicate: |
  # This entry encodes a LOOKUP TABLE, not an algorithm. A downstream consumer stores the
  # published results keyed by the opening's column sequence (0-indexed).
  #
  # result(opening_movestring) in { 'R', 'b', '=' }
  #   'R' : first player (mover on odd plies) forces a win
  #   'b' : second player forces a win
  #   '=' : draw with best play
  #
  # Anchor results verified in this KB (0-indexed movestrings):
  #   ""          -> centre (col 3) is the uniquely best first move; D-opening = 'R'
  #   "333334444" -> 5-4 opening, First-Player win ('R')   [see allen-5-4-opening]
  #   "3332222"   -> 3-4 opening, First-Player win ('R')   [see allen-3-4-opening]
  #
  # Allen's Opening Lottery sets (his letter notation; '?' = a free reply, translate A=0..G=6):
  #   Drawing openings:  B??b?E!, B??d?D, C?eC, C?fF, D!cC?, D!bE?
  #   Red-win openings:  A??a??F, B??f??E, C?b?F!, C?g?C, C?g?F, D!aG
  #   Black-win openings:B??d?G?, B??e??E??, C?a?G??, D!cA??, D!dC??, D!gF??
  #
  # NOTE: full transcription of Tables 1-3 is intentionally NOT reproduced here (the OCR of
  # the printed grid is unreliable). Store the anchor results above and cite the book for
  # the exhaustive grid.

worked_examples:
  - movestring: ""
    description: |
      Empty board — the entry point of Table 1. Only the centre column (0-indexed col 3,
      Allen's D) is a First-Player win; it is the strongest opening move on the board.
    expected_behavior: "Solver scores: col 3 = +2 (strictly highest), cols 2 & 4 = +1, edge cols 0,1,5,6 = 0. Consistent with Table 1 marking the D-opening 'R'."
    solver_verified: 2026-07-03
    notes: |
      The full R/b/= verdict for each first move is Allen's canonical table result; this
      example verifies only that the centre is the uniquely best opening move, not the exact
      win/loss margin of every edge column.
  - movestring: "333334444"
    description: |
      A five-move (extended to nine-ply) central line, the 5-4 opening — Allen's tables and
      Ch. 12 both classify the central D-column openings as First-Player wins.
    expected_behavior: "9 plies, second player to move, all solver scores negative → First-Player win ('R'). Matches Table 2 / Ch. 12."
    solver_verified: 2026-07-03
    notes: "Dedicated entry: [[allen-5-4-opening]]."

false_positives:
  - movestring: "3332222"
    why_not: |
      A table verdict is a GAME-THEORETIC value under perfect play, not a claim that the
      losing side has no tries. The 3-4 opening is marked a First-Player win ('R'), yet Allen
      stresses it is 'difficult' and that a single Red slip (e.g. a mistimed D4) hands Black
      the draw or win. Reading 'R' as 'Red wins easily' is the trap. See [[allen-3-4-opening]].
  - movestring: "0000000"
    why_not: |
      Not every column string is a legal or listed opening. A full column (seven discs in
      col 0 is impossible — max 6) or an opening Allen omitted as 'poorly played' has no
      table entry; absence from Tables 2/3 is not a result, it is an omission. Do not infer
      '=' or 'b' from a missing row.

known_limitations:
  - "The exhaustive Tables 1-3 are NOT transcribed here — the OCR of the printed grid is garbled and cannot be trusted cell-by-cell. Only anchor results verified against c4solver, plus the Opening-Lottery sets, are recorded. Consult the book (p. 145-148) for the full grid."
  - "Table entries assume perfect subsequent play; they say nothing about practical winning chances after an opponent error."
  - "Only one member of each mirror-image pair is listed; the mirrored opening (columns reflected about col 3) has the same result."
  - "Allen's letter notation marks the mover by case (uppercase = first player, lowercase = second). When translating to a 0-indexed digit movestring the case information is lost — recover the mover from ply parity (odd ply = first player)."

related:
  - "[[allen-opening-principles]] — the strategic aims that explain WHY the central openings win"
  - "[[community-center-control]] — geometric account of the centre's superiority (the empty-board anchor)"
  - "[[allen-5-4-opening]] — a Table-classified First-Player win, verified"
  - "[[allen-3-4-opening]] — a First-Player win that is 'difficult', illustrating the perfect-play caveat"
  - "[[allen-parity]] — parity theory underlying the win/draw/loss pattern across openings"

last_verified: 2026-07-03
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 9, p. 145-148:

> "Table 1 shows the result of every possible three-move opening. (Only one form of each mirror-image pair is shown.) A red R means that First Player can force victory after the indicated three-move opening; a black b means that Second Player can force victory; an equal sign (=) means the game is drawn with best play."

> "Tables 2 and 3 are similar to Table 1 but show the results of some five- and seven-move openings. To save space, most poorly played openings are omitted."

From Chapter 12, p. 167 (Opening Lottery):

> "In Chapter 9 you can find which openings lead, theoretically, to a draw or to Red or Black victory, or you can fashion a set of six three-disk openings from the following lists."
>
> *Drawing openings:* B??b?E!, B??d?D, C?eC, C?fF, D!cC?, D!bE?
> *Openings that win for Red:* A??a??F, B??f??E, C?b?F!, C?g?C, C?g?F, D!aG
> *Openings that win for Black:* B??d?G?, B??e??E??, C?a?G??, D!cA??, D!dC??, D!gF??

## Notes

- **Why not transcribe the grid.** Tables 1-3 are dense printed grids; the OCR in the source `.md` mangles rows, columns and the R/b/= glyphs (e.g. spurious blanks, merged tokens). Transcribing them blindly would inject errors into a "canonical" entry. The honest record is: anchor results verified with `c4solver`, plus the cleanly-OCR'd Opening-Lottery lists, plus a pointer to the book for the full grid. A future pass with the original PDF (not the OCR) could add the full tables.
- **Coordinate translation.** Allen's A–G → 0-indexed 0–6. Uppercase letter = first-player (Red/Green) move, lowercase = second-player (Black/Gray) move; in a digit movestring this is recovered from ply index parity.
- **Downstream use.** Challenges: the Opening-Lottery sets are ready-made "play this forced opening, then find the plan" seeds with a known result label. Lessons: the headline "centre wins, edges lose" is the single most teachable table fact. Reason engine: the anchor results give ground-truth opening values for a handful of positions.
