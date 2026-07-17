---
id: allen-d3-d4-opening
type: strategic_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 12 (Central-Column Openings), p. 180-181 (D3-D4 Opening); Diagrams 230-235"
  verbatim_quote: |
    Ch. 12, p. 180: "I use the term D3-D4 opening when Red gets both these key cells early
    in the game. This position often is very powerful for Red (although when Red already has
    C4 or E4, as shown in variations of the 3-4 opening, it's often better for Red to wait and
    try to get D5)."

    Ch. 12, p. 180 (Diagram 230): "Diagram 230 indicates how easy it often is for Red to win
    when he or she gets D3-D4 early. Red starts by building an attack in the lower right side;
    by the time Black counters that, Red has overwhelming strength in the upper center of the
    board."

    Ch. 12, p. 181 (Diagram 231, caption): "Red to play, with only one move to win."

    Ch. 12, p. 181 (Diagram 234): "The key idea is to recall the great offensive value of the
    D4-E3-F2-G1 diagonal."
short_summary: |
  The D3-D4 opening: the first player grabs both central key cells (Allen's D3 and D4) early.
  It is usually a powerful and comparatively EASY first-player win — unlike the thin, difficult
  3-4 opening — though if the first player already holds C4 or E4 it is often better to wait and
  play for D5 instead.
statement: |
  The D3-D4 opening is a central-column opening in which the first player (Red/Green) secures
  BOTH central key cells early: 0-indexed col 3 rows 2 and 3 (Allen's D3 and D4). Because the
  first player owns the two most valuable central squares, the position is usually powerful and
  the win is comparatively easy — in contrast to the sibling 3-4 opening ([[allen-3-4-opening]]),
  where the first player never gets D4 and the win is thin and difficult. Allen's recommended
  route is to play D4 early — "as disk 5 or disk 7" — rather than delaying it; the clean stem
  D1 d2 D3 c1 C2 c3 D4 (0-indexed "3332223", D4 played as disk 7) already secures the shape and
  is a first-player win. Typical winning plans build an attack on the lower-right side (Diagram
  230) or exploit the great offensive value of the D4-E3-F2-G1 corner diagonal (Diagram 234,
  where the first player's 9.G1 is "hard to find"). The win still requires precision: some lines
  have a single winning move (Diagram 231), and prematurely building a quick third-row threat
  with F1 F2 turns the position into a Third-Row Gambit that the second player wins (Diagram 232).
  The caveat: when the first player already holds C4 or E4, grabbing D3-D4 is often inferior to
  waiting for D5.

preconditions:
  - "First player (Green) occupies 0-indexed col 3 rows 2 AND 3 (Allen's D3 and D4) — both central key cells."
  - "Position is in the opening phase (both players building up the centre; the named lines here run <= ~20 plies)."
  - "The first player does not already hold C4 or E4 (0-indexed col2 row3 / col4 row3) — in that case waiting for D5 is often better (Allen p.180)."
formal_predicate: |
  # 0-indexed board: col 3 = centre (Allen D); row 0 = bottom.
  # Allen's D3 = 0-indexed col 3 row 2; Allen's D4 = 0-indexed col 3 row 3.
  # (Allen row N, 1-based -> 0-indexed row N-1.)

  CENTER = 3

  def is_d3_d4_opening(board):
      # First player owns both central key cells early.
      return (board[CENTER][2] == FIRST and    # Allen D3
              board[CENTER][3] == FIRST and     # Allen D4
              board.is_opening_phase())

  # Strategic flags (not victory conditions):
  #   - Usually an EASY first-player win (contrast the thin 3-4 opening, which lacks D4).
  #   - Prefer playing D4 EARLY (disk 5 or 7); a much-later D4 out of the difficult 3-4
  #     structure is instead a blunder (see [[allen-3-4-opening]]).
  #   - If the first player already holds C4 or E4, waiting for D5 is often better than
  #     grabbing D3-D4.
  #   - A premature F1 F2 (quick third-row major threat) LOSES: it becomes a Third-Row
  #     Gambit the second player wins (Diagram 232, see [[allen-third-row-gambit]]).
  #
  # Canonical stem: "3332223"  (D1 d2 D3 c1 C2 c3 D4 — D4 as disk 7)

worked_examples:
  - movestring: "3332223"
    description: |
      The clean D3-D4 stem: D1 d2 D3 c1 C2 c3 D4 — the first player plays D4 as disk 7 (Allen's
      "easier win"). The first player (Green) now owns col 3 at 0-indexed rows 0, 2 and 3
      (D1, D3, D4), securing both central key cells. Second player (Gray/Black) to move and lost.
    expected_behavior: "7 plies, Gray to move; solver scores negative in every column (best -3) -> the side to move loses -> First-Player win. Green owns 0-indexed col3 rows 0/2/3 (D3 and D4 both present)."
    solver_verified: 2026-07-04
    notes: |
      This is precisely Allen's recommended "play D4 as disk 5 or 7" easier win — it is NOT a
      blunder (a common mislabel; contrast the FAR-later D4 in the difficult 3-4 structure, which
      draws — see [[allen-3-4-opening]]). Verified via visualize_board.sh (scr all <= 0) and
      optimal_line.mjs (first-player win).
  - movestring: "3332223362"
    description: |
      Allen Diagram 231: D1 d2 D3 c1 C2 c3 D4 d5 G1 c4 — a D3-D4 opening with the first player
      (Green) to move and "only one move to win". The unique winning move is 0-indexed col 1
      (Allen B1); every other column loses for the mover.
    expected_behavior: "10 plies, Green to move; solver scr = +7 at 0-indexed col 1 (Allen B1) and NEGATIVE at every other column -> col 1 is the UNIQUE winning move. optimal_line.mjs -> First-Player win. Matches Allen's caption 'Red to play, with only one move to win'."
    solver_verified: 2026-07-04
    notes: |
      A premium 'find the only winning move' position (analogous to [[allen-third-row-gambit]]'s
      Diagram 301). The losing deviation F1 F2 (Diagram 232) is the Third-Row Gambit that Black
      wins — recognising D3-D4 must not recommend that premature third-row push.
  - movestring: "33322233646646"
    description: |
      Allen Diagram 234 ("Red to play and win"): D1 d2 D3 c1 C2 c3 D4 d5 G1 e1 G2 g3 E2 g4. The
      first player has played very precisely (9.G1 exploits the D4-E3-F2-G1 diagonal); despite
      Black seeming to foil the odd-row threat, Red has a quick win.
    expected_behavior: "14 plies, Green to move; solver scr = +11 at 0-indexed cols 2, 4 and 5 (multiple winning moves) -> First-Player win. optimal_line.mjs -> First-Player win. Illustrates the D4-E3-F2-G1 diagonal theme Allen highlights."
    solver_verified: 2026-07-04
    notes: |
      Allen: "Red's move 9 G1 in this opening may be hard to find. The key idea is to recall the
      great offensive value of the D4-E3-F2-G1 diagonal." The losing alternative is Diagram 233's
      incomplete-J-shape line.
  - movestring: "3332326433444644222"
    description: |
      Allen Diagram 230 ("Black to play, will lose"): D1 d2 D3 c1 D4 c2 G1 e1 D5 d6 E2 e3 E4 g2
      E5 e6 C3 c4 C5. Shows how easy Red's win often is when D3-D4 is secured early — Red attacks
      the lower-right, then dominates the upper centre.
    expected_behavior: "19 plies, Gray to move; solver scores negative in every playable column -> the side to move loses -> First-Player win. optimal_line.mjs -> First-Player win."
    solver_verified: 2026-07-04
    notes: |
      The overwhelming central strength (cols 3 and 4 fill to the top) is the 'easy win' Allen
      describes on p.180.

false_positives:
  - movestring: "3332222"
    why_not: |
      This is the 3-4 opening ([[allen-3-4-opening]]), NOT the D3-D4 opening. The first player
      owns col 3 only at 0-indexed rows 0 and 2 (D1, D3) — there is NO D4 (col 3 stands three
      high). It is still a first-player win, but a THIN and difficult one (the contested centre
      columns score only -1), the opposite of the easy D3-D4. The defining D4 (0-indexed col3
      row 3) is exactly what is missing. A detector must require BOTH central key cells, not just
      a central build-up.
  - movestring: "3332223"
    why_not: |
      ILLUSTRATIVE CAVEAT (not a refutation of this very line — 3332223 IS a valid D3-D4 stem
      above). The caveat is Allen's: securing D3-D4 is not automatically best. "When Red already
      has C4 or E4 ... it's often better for Red to wait and try to get D5." A naive scorer that
      always grabs both central key cells over-applies the rule; the C4/E4-then-wait-for-D5
      exception must be checked. (Allen gives no single clean movestring for this exception, so
      this entry flags it as a scope boundary rather than a verified board.)

known_limitations:
  - "First-player win under precise play. Some lines have a single winning move (Diagram 231) and key moves are hard to find (Diagram 234's 9.G1); a mistimed later move can throw the win away."
  - "If the first player already holds C4 or E4, grabbing D3-D4 is often inferior to waiting for D5 (Allen p.180)."
  - "Distinct from the 3-4 opening (no D4, thin win) and from a FAR-later D4 played out of the difficult 3-4 structure, which is a blunder that draws (see [[allen-3-4-opening]])."
  - "A premature F1 F2 (building a quick third-row major threat) is a LOSING deviation — it becomes a Third-Row Gambit the second player wins (Diagram 232, see [[allen-third-row-gambit]])."

related:
  - "[[allen-3-4-opening]] — the sibling central-column opening where the first player never gets D4 (thin/difficult win); the D3-D4 opening is the easier alternative Allen recommends"
  - "[[allen-5-4-opening]] — another central-column first-player win"
  - "[[allen-opening-principles]] — centrality and the 'play D4 early' recommendation"
  - "[[allen-third-row-gambit]] — the LOSING F1 F2 deviation (Diagram 232) from the D3-D4 opening"
  - "[[allen-opening-tables]] — the D-column central openings are First-Player wins"
  - "[[allen-j-configuration]] — Diagram 233's 'incomplete J shape' is the winning structure in one D3-D4 line"

last_verified: 2026-07-04
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 12, p. 180-181:

> "I use the term D3-D4 opening when Red gets both these key cells early in the game. This position often is very powerful for Red (although when Red already has C4 or E4, as shown in variations of the 3-4 opening, it's often better for Red to wait and try to get D5)."

> **(Diagram 230)** "Diagram 230 indicates how easy it often is for Red to win when he or she gets D3-D4 early. Red starts by building an attack in the lower right side; by the time Black counters that, Red has overwhelming strength in the upper center of the board."

> **(Diagram 231, caption)** "Red to play, with only one move to win."

> **(Diagram 234)** "Red's move 9 G1 in this opening may be hard to find. The key idea is to recall the great offensive value of the D4-E3-F2-G1 diagonal."

Allen's Diagram move lists (uppercase = first player, lowercase = second player):
- Diagram 230: `D1 d2 D3 c1 D4 c2 G1 e1 D5 d6 E2 e3 E4 g2 E5 e6 C3 c4 C5 (20)`
- Diagram 231: `D1 d2 D3 c1 C2 c3 D4 d5 G1 c4 (11)`
- Diagram 234: `D1 d2 D3 c1 C2 c3 D4 d5 G1 e1 G2 g3 E2 g4 (15)`

## Notes

- **Coordinate translation.** Allen A-G -> 0-indexed 0-6 (D = col 3, C = col 2, E = col 4, G = col 6, B = col 1). Allen rows 1-6 -> 0-indexed rows 0-5, so Allen's D3 = 0-indexed col 3 row 2 and Allen's D4 = 0-indexed col 3 row 3. Movestring digits are 0-indexed column indices.
- **Why a dedicated entry.** Allen explicitly names this a distinct opening ("I use the term D3-D4 opening"). It was previously only mentioned in passing in [[allen-3-4-opening]]'s known_limitations; it has its own defining condition (both central key cells), a different result profile (easy win vs the 3-4's thin win), and its own worked examples.
- **Verification (2026-07-04).** All four worked examples verified with `./visualize_board.sh` (whose-move + `scr` row) and `reason_engine/TOOLS/optimal_line.mjs` (plays both sides optimally to terminal; reports First-Player win for each). `3332223` scr all <= 0 (Gray to move, lost); `3332223362` scr +7 only at 0-indexed col 1 (unique win); `33322233646646` scr +11 at 0-indexed cols 2/4/5; `3332326433444644222` scr all <= 0 (Gray to move, lost).
- **Relation to the delayed-D4 mislabel.** `3332223` (D4 as disk 7) is a first-player WIN, not a blunder — a correction propagated from [[allen-3-4-opening]] (which previously mislabeled it). The genuine late-D4 blunder is much deeper, out of the difficult 3-4 structure (Diagram 225: after `33322226664420`, only G4 wins; playing D4 -> `333222266644203` draws).
- **Downstream use.** Lessons: teaches "take both central key cells early (D3+D4) for the easy win". Challenges/Socratic: `3332223362` (Diagram 231) is a premium 'find the only winning move' seed (unique 0-indexed col 1). Reason engine: `is_d3_d4_opening` is a board-only opening classifier; the C4/E4-wait-for-D5 caveat is the scope boundary.
