---
id: allen-opening-principles
type: heuristic
canonical: true
source:
  doc: allen_2010
  location: "Ch. 8 (\"I Play Where You Play\", p. 142); Ch. 12 (Central-Column Openings, p. 169); Ch. 13 (First-Row Openings, p. 191)"
  verbatim_quote: |
    Ch. 12, p. 169: "Openings can be divided broadly into two categories: central-column
    openings, in which players first play up D, and first-row openings in which three or
    more of the early disks are played in the first row. In central-column openings, many
    issues are settled immediately; after the initial moves D1 d2 D3 d4, only Red has a
    chance for third-row horizontal threats and only Black can create threats on the
    important diagonals that pass through d4."

    Ch. 12, p. 177 (6-1 opening): "This is in accordance with the general rule that B1 and
    F1 are better cells than E1 because the B1-E4 and F1-C4 diagonals are better than the
    E1-B4 diagonal."

    Ch. 10, p. 149 (Diagram 139): "It is quite common for a fifth-row play to be best, as
    Red's 11 C5 is here, because it gives up only a comparatively valueless sixth-row point."

    Ch. 8, p. 142 ("I Play Where You Play"): "Surprisingly often, the best play for a
    player will be to play above the opposing player's just-played disk ... When you can
    identify a situation where this imitative play is good enough, it makes successful play
    very easy."
short_summary: |
  In the opening, control the centre and race to build an odd-row (third/fifth-row) threat:
  the first player wins by starting in the middle column, central squares sit on more
  winning lines, and the B1-E4 / F1-C4 corner diagonals are worth more than the E1-B4
  diagonal. Often the simplest good plan is to imitate — play directly on top of the
  opponent's last disc.
statement: |
  Allen's general opening principles, distilled from Chapters 8, 12 and 13:

  (1) Centrality / central-column value. The first player's winning plan begins in the
  centre column (0-indexed col 3, Allen's D). Central squares participate in more
  four-in-a-row windows than edge squares, so early central play preserves the most ways
  to build a connection. Openings split into central-column openings (both players first
  build up col 3) and first-row openings (three or more of the early discs go on the
  bottom row); central-column openings settle the key diagonals and third-row horizontals
  early, while first-row openings keep long-term structure fluid and are harder to master.

  (2) The quest for an odd-row threat. Red (first player) wins by accumulating an
  uncancelled odd-row (row parity odd: 0-indexed rows 0, 2, 4) major threat, most often a
  third-row (0-indexed row 2) horizontal or a diagonal that resolves to one; Black (second
  player) seeks even-row threats and neutralises Red's odd-row threats. This is why the
  central-column opening is sharp: after D1 d2 D3 d4 only Red can make third-row
  horizontal threats and only Black can make threats on the diagonals through d4.

  (3) Diagonal / cell quality. Among first-row squares, B1 and F1 (0-indexed cols 1 and 5)
  are better than E1 (0-indexed col 4) because the B1-E4 and F1-C4 corner diagonals are
  stronger than the E1-B4 diagonal. Experts value the long corner diagonals
  (e.g. G1-F2-E3-D4, 0-indexed (6,0)-(5,1)-(4,2)-(3,3)).

  (4) Fifth-row economy. A fifth-row play (0-indexed row 4) is often the best move because
  it concedes only a comparatively worthless sixth-row point (0-indexed row 5) to the
  opponent.

  (5) Imitative play ("I play where you play"). Frequently the best move is to play
  directly on top of the opponent's just-played disc. When imitation is sound it makes the
  opening easy; several opening results (e.g. Black never losing against 1.B1) rest on it.

preconditions:
  - "Position is in the opening phase (few discs played; the named opening lines here run <= ~16 plies)."
  - "For centrality reasoning: no concrete major/minor threat yet distinguishes the candidate moves."
  - "For the odd-row-threat aim: rows are 0-indexed; odd row parity = rows 0, 2, 4 (Allen's rows 1, 3, 5)."
formal_predicate: |
  # 0-indexed board: col 0 = leftmost (Allen A), col 6 = rightmost (Allen G);
  #                  row 0 = bottom (Allen row 1), row 5 = top (Allen row 6).
  # These are HEURISTIC scorers for opening move choice, not a victory rule.

  CENTER_COL = 3

  def centrality(col):
      # More central columns sit in strictly more four-in-a-row windows.
      return -abs(col - CENTER_COL)          # higher = more central

  def is_central_column_opening(movestring):
      # Both players building up the centre column early.
      first4 = movestring[:4]
      return first4.count('3') >= 3

  def is_first_row_opening(board, movestring):
      # Three or more of the first five discs land on the bottom row (row 0).
      # (Each column's first disc is on row 0; count distinct columns opened
      #  among the first five plies.)
      cols = movestring[:5]
      return len(set(cols)) >= 3

  def first_row_cell_quality(col):
      # Relative value of a bottom-row square (0-indexed) for its diagonals.
      # B1/F1 (cols 1,5) beat E1 (col 4): corner diagonals B1-E4 and F1-C4
      # are stronger than the E1-B4 diagonal.
      RANK = {3: 3, 1: 2, 5: 2, 2: 1, 4: 1, 0: 0, 6: 0}   # higher = better
      return RANK[col]

  def imitative_reply(opponent_last_col):
      # "I play where you play": answer directly above the opponent's last disc.
      return opponent_last_col

worked_examples:
  - movestring: "333334444"
    description: |
      Central-column (5-4) opening: D1 d2 D3 d4 D5 e1 E2 e3 E4. Both players build up
      col 3 (centre), then Red shifts to the neighbouring col 4 playing "I play where you
      play" (E2 e3 E4 block Black's horizontals). Red has established the odd-row-threat
      machine on the left; Black (to move) is lost. Illustrates centrality + the odd-row
      quest + imitative play in one line.
    expected_behavior: "9 plies, Gray (second player / Black) to move; every column's solver score is negative → the side to move loses → Red (first player) wins. Matches Allen: Red prevails in the 5-4 opening."
    solver_verified: 2026-07-03
    notes: |
      See [[allen-5-4-opening]] for the dedicated entry. Column 3 filled to row 4 (five
      discs), column 4 filled to row 3 (four discs) — the 5-4 shape.
  - movestring: ""
    description: |
      Empty board, first player to move. The centre column (0-indexed col 3, Allen's D) is
      the strongest opening square: it lies on the most four-in-a-row windows, and it is the
      only first move with which the first player can force a win (Allis 1988 / Allen Table 1).
    expected_behavior: "Solver scores per column: col 3 = +2 (strictly highest), cols 2 & 4 = +1, edge cols 0,1,5,6 = 0. The centre is uniquely best. Allen's Table 1 marks the D-column opening as a First-Player win."
    solver_verified: 2026-07-03
    notes: |
      The finer claim that the four outer opening columns are outright LOSSES for the first
      player is Allen's (Table 1, canonical) and the classic Allis result; this KB entry
      does not independently reproduce the loss margin. See [[community-center-control]].

false_positives:
  - movestring: "3332222"
    why_not: |
      Centrality alone does not decide once concrete structure exists. Here Black has been
      lured off-centre into col 2 (the 3-4 opening) yet the position is still a Red win —
      but purely by centrality a naive scorer would over-rate any recentring move. Beyond
      the opening, parity, zugzwang and specific threats override the centrality prior. See
      [[allen-3-4-opening]].
  - movestring: "333334445"
    why_not: |
      "I play where you play" is not universal. Blindly imitating (or blindly playing E-then-
      neighbour) can walk into the 5-5 mistake Allen warns of (Black's e5 on top of Red's E4)
      or hand the opponent a better fifth-row point. Imitation is a heuristic that must be
      checked against concrete threats, not a rule. (Movestring shown is illustrative of an
      off-plan continuation, not a verified refutation position.)

known_limitations:
  - "Opening-only. Past the early game, tactical threats, zugzwang and parity dominate and can make a more central or imitative move worse."
  - "The cell-quality ranking (B1/F1 > E1) is a local diagonal-value heuristic stated by Allen for specific opening contexts; it is not an absolute ordering for all positions."
  - "Imitative play is sound only 'when it is good enough' (Allen's phrasing). Allen gives it as a recognition skill, not a mechanical rule; several openings refute naive imitation."
  - "The odd-row-threat aim is the first player's plan; it does not describe the second player's correct strategy, which is built on even-row threats and claimeven (see [[allis-claimeven]])."

related:
  - "[[community-center-control]] — the geometric centrality heuristic in isolation (project-local framing)"
  - "[[allen-parity]] — odd-row vs even-row threats: the parity engine behind the odd-row quest"
  - "[[allen-opening-tables]] — Ch. 9 result tables that quantify which openings win/draw/lose"
  - "[[allen-5-4-opening]] — the flagship central-column opening embodying these principles"
  - "[[allen-3-4-opening]] — a central-column opening Black uses to probe Red"
  - "[[allen-candlesticks-opening]] — imitative 'I play where you play' opening"
  - "[[allen-v1]] — victory by more uncancelled odd-row threats than the opponent can neutralise"
  - "[[allen-v3]] — parity-counting victory rule the odd-row quest feeds into"

last_verified: 2026-07-03
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*:

> **(Ch. 12, p. 169)** "Openings can be divided broadly into two categories: central-column openings, in which players first play up D, and first-row openings in which three or more of the early disks are played in the first row. In central-column openings, many issues are settled immediately; after the initial moves D1 d2 D3 d4, only Red has a chance for third-row horizontal threats and only Black can create threats on the important diagonals that pass through d4."

> **(Ch. 12, p. 177)** "This is in accordance with the general rule that B1 and F1 are better cells than E1 because the B1-E4 and F1-C4 diagonals are better than the E1-B4 diagonal."

> **(Ch. 10, p. 149)** "It is quite common for a fifth-row play to be best ... because it gives up only a comparatively valueless sixth-row point."

> **(Ch. 8, p. 142)** "Surprisingly often, the best play for a player will be to play above the opposing player's just-played disc ... When you can identify a situation where this imitative play is good enough, it makes successful play very easy."

## Notes

- **Coordinate translation.** Allen labels columns A–G (translate A=0 … G=6) and rows 1–6 from the bottom (translate to 0-indexed rows 0–5). Every predicate and worked example in this entry is stated 0-indexed per the project convention; the verbatim quotes retain Allen's own labels.
- **Why one unifying entry.** Rather than a separate file per aphorism, this collects Allen's opening *aims*. The named opening lines ([[allen-5-4-opening]], [[allen-3-4-opening]], [[allen-candlesticks-opening]], [[allen-third-row-gambit]]) are concrete embodiments; the Ch. 9 result tables ([[allen-opening-tables]]) quantify outcomes.
- **Downstream use.** Lessons: `short_summary` teaches the four aims plainly. Challenges: the empty-board and 5-4 examples are ready "find the best opening move" seeds. Reason engine: `centrality`, `first_row_cell_quality` and `imitative_reply` are board-only checks for opening-phase move quality (overlaps with `centerDominance.js`).
