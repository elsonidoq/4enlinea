---
id: allen-3-4-opening
type: strategic_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 12 (Central-Column Openings), p. 179-180 (3-4 Opening); Diagrams 224-229"
  verbatim_quote: |
    Ch. 12, p. 179: "In Diagram 224, players alternate play up the central columns just as
    in the 3-4 opening, except that Black doesn't play d4. Although Red hasn't blundered yet,
    Red would probably have an easier win if he or she just played D4 as disk 5 or disk 7.
    Once Red delays D4, however, and plays as shown in the diagram, his or her game becomes
    difficult and future play at D4 is likely to be a blunder."

    "Consequently, this opening is one that Black should try occasionally in order to probe
    Red's response but should probably avoid if Red plays an early D4 rather than playing as
    shown in Diagram 224."

    "An experienced Red will probably not allow the 3-4 opening to develop."
short_summary: |
  The 3-4 opening: instead of following the first player up the centre, the second player
  peels off into an adjacent column, declining to play d4. It is still a first-player win,
  but a difficult one — the second player uses it to probe, and once the first player delays
  D4, later playing D4 can itself become a blunder.
statement: |
  The 3-4 opening is a central-column opening in which, after the first three central plies
  (D1 d2 D3, 0-indexed "333"), the second player declines to keep answering up the centre
  (does not play d4) and instead the players build up an adjacent column (0-indexed col 2,
  Allen's C): c1 C2 c3 C4. The canonical stem is D1 d2 D3 c1 C2 c3 C4 → 0-indexed movestring
  "3332222" (three discs in the centre, four in the neighbour — hence 3-4). It remains a
  first-player win, but Allen flags it as difficult: the first player would usually win more
  easily by taking D4 early (as disk 5 or 7), and once D4 is delayed, later playing D4 can
  become a blunder because it hands the second player d5 and a strong fifth-row disc. Precise
  first-player play (e.g. 9.G2 to deny the second player the right-side lockout, 15.G4 to
  limit the threats a later d4 would create) is required. The second player should use the
  3-4 as an occasional probe but avoid it if the first player takes an early D4.

preconditions:
  - "Centre column (0-indexed col 3) has exactly three discs (first player rows 0, 2; second player row 1) — the second player has NOT played d4."
  - "An adjacent column (0-indexed col 2 = C, or mirror col 4 = E) has four discs stacked."
  - "It is the second player's turn (here after 7 plies)."
formal_predicate: |
  # 0-indexed: col 3 = centre (Allen D), col 2 = adjacent (Allen C), row 0 = bottom.

  def is_3_4_opening(movestring):
      if len(movestring) < 7:
          return False
      center = 3
      for adj in (2, 4):                    # C (left) or mirror E (right)
          seq = [center]*3 + [adj]*4        # D×3 then C×4
          if list(map(int, movestring[:7])) == seq:
              return True
      return False

  # Strategic flags (not victory conditions):
  #   - First player still wins with precise play, but 'easier win' was available via an
  #     early D4 (playing col 3 as disk 5 or 7).
  #   - After the centre is left at three high, a LATER col-3 (D4) play by the first player
  #     is often a blunder (gives the second player d5 / a strong fifth-row disc).
  #
  # Canonical instance: "3332222"  (D1 d2 D3 c1 C2 c3 C4)

worked_examples:
  - movestring: "3332222"
    description: |
      The canonical 3-4 opening stem: D1 d2 D3 c1 C2 c3 C4. The second player peeled off into
      col 2 rather than playing d4; centre col 3 stands three high, adjacent col 2 four high.
      Second player (Gray/Black) to move and lost — but Allen stresses the ensuing first-player
      win is difficult and precise.
    expected_behavior: "7 plies, Gray to move; solver scores negative in every column → the side to move loses → First-Player win. Matches Allen Diagram 224 ('Black to play (will lose)')."
    solver_verified: 2026-07-03
    notes: |
      The mirror "3334444" (adjacent column E) is the same opening. Note that even though the
      value is a Red win, columns 2 and 3 (the contested centre) score only -1, reflecting how
      thin and difficult the advantage is compared with, say, the 5-4.
  - movestring: "333222266"
    description: |
      3-4 opening with Allen's recommended first-player continuation (Diagram 225 stem):
      D1 d2 D3 c1 C2 c3 C4 g1 G2 — the first player answers 8.g1 with 9.G2 to deny the second
      player the right-side second-row lockout. This is the position after Red's precise 9.G2.
    expected_behavior: "9 plies, second player to move; playing out optimal moves for both sides (optimal_line.mjs) reaches a First-Player (Green) win at the fifth-row window ending c6r5. Confirms 9.G2 keeps the win, matching Allen Diagram 225."
    solver_verified: 2026-07-03
    notes: |
      Verified via `optimal_line.mjs 333222266` (winner: first player). This checks the value
      of the position after Red's key 9.G2, not the entire 30-ply Diagram 225/226 line (whose
      later precise moves 15.G4 etc. are Allen's; the position value here already confirms the
      win is intact after 9.G2).

false_positives:
  - movestring: "333222266644203"
    why_not: |
      The genuine "late D4 is a blunder" position — verified. This is Allen's Diagram 225 line
      (D1 d2 D3 c1 C2 c3 C4 g1 G2 g3 E1 e2 C5 a1) after the first player throws away the win at
      move 15 by playing D4 (0-indexed col 3) instead of the ONLY winning move G4 (0-indexed
      col 6). Before move 15 (movestring "33322226664420", Green to move) the solver shows +1 at
      col 6 (G4, the sole win) and 0 at cols 3 and 4 (D4/E4 both draw); after the D4 blunder the
      second player draws (Allen: "Black will answer with 16 d5 or e5 for a draw"). Recognising
      the 3-4 shape must NOT recommend this deep, mistimed D4. NOTE: playing D4 EARLY (as disk 5
      or 7, e.g. "3332223") is the OPPOSITE — Allen's recommended easier win, the D3-D4 opening
      ([[allen-d3-d4-opening]]), a first-player win, NOT a blunder. The blunder is only the
      much-later D4 out of the difficult delayed structure.
  - movestring: "3334444"
    why_not: |
      Same-family MIRROR (adjacent column E instead of C) — it is the *same* opening, not a
      different one. A detector that treats left/right adjacent columns as distinct openings
      would double-count. By Allen's mirror-image symmetry the result is identical.

known_limitations:
  - "First-player win only under precise play; Allen: 'Red's game becomes difficult'. Several first-player continuations lose, and some drawing lines exist if the first player mis-times D4/E4 (Allen: after 15.D4 or E4, Black answers d5 or e5 for a draw)."
  - "The delayed D4 by the first player is usually a blunder — the shape carries a built-in trap for the stronger side, unusual among 'winning' openings."
  - "The mirror (adjacent column E, '3334444') is the same opening."
  - "Distinct from the D3-D4 opening (where the first player gets both central key cells early) — that is a separate, easier first-player plan. See [[allen-d3-d4-opening]]. Playing D4 EARLY (disk 5 or 7) is good; only a FAR-later D4 out of the delayed 3-4 structure is the blunder."

related:
  - "[[allen-5-4-opening]] — the sibling central-column opening where the second player keeps following up the centre"
  - "[[allen-d3-d4-opening]] — the easier first-player alternative Allen recommends: take D4 early (disk 5/7) instead of delaying it"
  - "[[allen-opening-principles]] — centrality and the early-D4 recommendation"
  - "[[allen-opening-tables]] — 3-4 is a First-Player win but a difficult one (perfect-play caveat)"
  - "[[allen-parity]] — the fifth-row-disc strength argument behind 'delayed D4 is a blunder' is a parity point"
  - "[[allen-third-row-gambit]] — another opening where the second player concedes central tempo for compensation"

last_verified: 2026-07-03
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 12, p. 179-180:

> "In Diagram 224, players alternate play up the central columns just as in the 3-4 opening, except that Black doesn't play d4. Although Red hasn't blundered yet, Red would probably have an easier win if he or she just played D4 as disk 5 or disk 7. Once Red delays D4, however, and plays as shown in the diagram, his or her game becomes difficult and future play at D4 is likely to be a blunder."

> "Consequently, this opening is one that Black should try occasionally in order to probe Red's response but should probably avoid if Red plays an early D4 rather than playing as shown in Diagram 224."

> "An experienced Red will probably not allow the 3-4 opening to develop."

## Notes

- **Coordinate translation.** Allen D = 0-indexed col 3; C = col 2; E = col 4; G = col 6. Rows 1–6 → 0-indexed 0–5. Movestring digits are 0-indexed column indices.
- **Verification.** `./visualize_board.sh 3332222` → 7 plies, Gray to move, all columns negative: a First-Player win, matching Allen's "Black to play (will lose)". The board shows col 3 three discs high (no d4) and col 2 four discs high — the literal 3-4 shape.
- **The self-trap.** What makes this opening pedagogically valuable is that the "winning" side carries a live blunder (the delayed D4). That is why it is filed as a `strategic_rule` with a prominent `false_positives` warning against recommending D4.
- **Downstream use.** Challenges: "3332222" is a "the position is won but sharp — find the *only* safe continuation (NOT D4)" seed; the delayed-D4 move is the built-in distractor. Reason engine: `is_3_4_opening` plus the delayed-D4 flag lets the opening-phase blunder detector recognise the classic mistake.
