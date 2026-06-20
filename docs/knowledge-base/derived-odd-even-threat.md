---
id: derived-odd-even-threat
type: heuristic
canonical: false
source:
  doc: allen_2010
  location: "Ch. 4 T6 (odd-row threat parity) and Victory Rules V1/V3 (parity counting)"
  verbatim_quote: |
    T6: A Red odd-row threat may be neutralized by a Black even-row threat immediately
    above it in the same column. (Paraphrased; Allen's T6 establishes why odd-row
    threats are harder for Black to cancel than even-row threats.)
    V3: Red wins if Red's uncancelled odd-row threats outnumber Black's. (Paraphrased.)
    The odd-even threat selection heuristic is a project-local operational consequence
    of T6 + V3 — Allen does not state it as a standalone decision rule.
statement: |
  An odd-even threat position arises when the current player (Red) has two candidate
  moves, each of which places a disc and creates a new immediate threat one row above
  the disc just placed. Critically, neither of those threat cells is gravity-top
  before the move — they become gravity-top only after filling the cell below. One
  candidate creates a threat landing on an odd row (rows 1, 3, or 5 in 1-indexed
  notation), the other on an even row (rows 2, 4, or 6). The decisive principle:
  Yellow's claimeven strategy pairs empty even squares above odd squares and can
  always respond to even-row threats by filling the cell directly below them, gaining
  control. Odd-row threats have no claimeven counter. Therefore Red must prefer the
  candidate move that places the threat on an odd row.

short_summary: |
  An odd-even threat choice arises when the player can build toward a winning threat
  in two columns — one landing on an odd row, one on an even row, neither yet playable.
  The odd-row threat is always preferred because Yellow's claimeven strategy cannot
  neutralise threats on odd rows.

preconditions:
  - "It is Red's turn."
  - "Two candidate moves exist (columns A and B) each worth considering."
  - "Playing column A places a disc at row r_A and creates an immediate threat at row r_A+1 (the new gravity-top of A after the move)."
  - "Playing column B places a disc at row r_B and creates an immediate threat at row r_B+1 (the new gravity-top of B after the move)."
  - "Neither r_A+1 nor r_B+1 is gravity-top BEFORE the respective move — they become playable only after the disc below is placed."
  - "r_A+1 and r_B+1 have opposite parity (one odd, one even in 1-indexed rows)."
formal_predicate: |
  # Input: board state, Red's two candidate columns A and B
  # Output: which column to prefer under the odd-even threat heuristic

  def odd_even_threat_choice(board, col_A, col_B):
      board_A = board.drop(col_A, RED)
      board_B = board.drop(col_B, RED)

      # Threat row after playing A = new gravity-top of col_A (0-indexed)
      threat_row_A = board_A.col_height(col_A)
      threat_row_B = board_B.col_height(col_B)

      # Verify both are actually immediate threats in their post-move boards
      assert is_immediate_threat_at(board_A, RED, col_A, threat_row_A)
      assert is_immediate_threat_at(board_B, RED, col_B, threat_row_B)

      # Convert to 1-indexed rows; odd row = (0-indexed row) % 2 == 0
      A_is_odd_row = (threat_row_A % 2 == 0)   # 0-indexed row 0 = 1-indexed row 1 = odd
      B_is_odd_row = (threat_row_B % 2 == 0)

      if A_is_odd_row and not B_is_odd_row:
          return col_A   # prefer A (odd-row threat)
      elif B_is_odd_row and not A_is_odd_row:
          return col_B   # prefer B (odd-row threat)
      else:
          return None    # same parity — odd-even rule does not apply
worked_examples:
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has two candidate moves, one creating
      a threat at an odd row and one at an even row, with neither threat cell currently
      gravity-top. Verify that the odd-row candidate has the strictly higher solver score.
    expected_behavior: "Odd-row candidate scores higher; solver confirms."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      If one or both threat cells ARE already gravity-top before the candidate move,
      the situation is an immediate threat (or double threat), not an odd-even threat
      choice. The odd-even heuristic applies only when the threat must be built in
      one move rather than played immediately.
    notes: null
  - movestring: "PENDING"
    why_not: |
      Late-game positions with mostly-filled columns may violate the parity assumptions
      underlying claimeven. The heuristic is most reliable in mid-game where Yellow
      still has claimeven resources available.
    notes: null
known_limitations:
  - "The heuristic derives from Yellow's claimeven strategy. It may not apply when Yellow's claimeven resources are exhausted."
  - "Only the threat-cell row parity matters, not the disc-placement row. A disc placed on an even row that creates a threat on an odd row above it is correctly classified as an odd-row threat."
  - "Parity convention: 0-indexed row r is an odd row (1-indexed) when r % 2 == 0 (rows 0, 2, 4 in 0-indexed = rows 1, 3, 5 in 1-indexed). All internal code uses 0-indexed; user-facing descriptions use 1-indexed rows."
related:
  - "[[allen-t6]] — odd-row threat parity rule underlying this heuristic"
  - "[[allen-v3]] — Red wins when holding more uncancelled odd-row threats than Yellow can cancel"
  - "[[allis-claimeven]] — Yellow's claimeven strategy, which this heuristic circumvents"
  - "[[community-z-threat]] — Z-threat is the generalised mid-game formulation of parity control"
last_verified: 2026-06-19
---

## Verbatim source

Derived from Allen (2010) T6 (odd-row threat parity) and V3 (uncancelled odd-row threat counting). No single canonical source states the odd-even threat *selection* heuristic in this exact form.

## Notes

- The key invariant distinguishing this from immediate/double threat: neither threat cell is gravity-top before the move. The move *creates* the threat by filling the cell below it.
- The parity preference is Red-specific. When Yellow is the coached player, the logic inverts: Yellow prefers threats on even rows, which Yellow's own claimeven strategy can leverage.
- The classifier detects this at the pre-move position and tags it on whichever move would have created the odd-row threat (or flags the even-row move as the blunder when the player chose incorrectly).
