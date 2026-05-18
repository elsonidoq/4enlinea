---
id: allen-t1
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 96 (Transformation Rules section, T1)"
  verbatim_quote: |
    T1: Adjacent major threats win.

    Adjacent Red major threats win.

    Adjacent Black major threats win.

statement: |
  If a player has two major threats at consecutive rows r and r+1 in the same column,
  that player wins unconditionally. One of the two adjacent cells will necessarily be
  reached before the game ends: if the column fills bottom-up, row r is reached first,
  and the player immediately holds a Major Direct threat at row r+1 above it. T1 is the
  highest-priority transformation rule — it must be checked before T2–T7 because an
  adjacent pair resolves the column instantly rather than transforming it. Applies
  symmetrically to both Red and Black.

preconditions:
  - "Two major threats exist for the same player at (c, r) and (c, r+1) — consecutive rows in the same column."
  - "Both threat cells are empty."
  - "The game has not already ended (no four-in-row on the board)."

formal_predicate: |
  # Input: set of major threats T = {(player, col, row), ...}
  # Output: (player, col) pair where T1 applies, or None

  def t1_winner(threats):
      by_player_col = {}
      for t in threats:
          key = (t.player, t.col)
          by_player_col.setdefault(key, []).append(t.row)
      for (player, col), rows in by_player_col.items():
          rows_sorted = sorted(rows)
          for i in range(len(rows_sorted) - 1):
              if rows_sorted[i+1] == rows_sorted[i] + 1:
                  return player  # this player wins via adjacent pair
      return None

  # Effect: if T1 applies, the game outcome is decided — the player returned wins.
  # No further transformation rules need to be checked for this column.
  # T4 and T5 must NOT fire on an adjacent pair (T1 takes precedence).

worked_examples:
  - movestring: "44215312361121332263"
    description: |
      Red has a major threat at col 4 row 3 (odd) and Yellow has a major threat at col 4
      row 5 (odd). These are NOT adjacent (rows 3 and 5 differ by 2), so T1 does NOT apply
      here. This is the T4 Case B example. Used as a false-positive reference for T1.
    expected_behavior: "solver confirms Red wins by move order, not T1 — T1 does not apply to non-adjacent rows"
    solver_verified: 2026-05-17
    notes: "Included as a boundary case to show T1 requires consecutive rows."

  - movestring: "613461653556247156"
    description: |
      Red has adjacent major threats at col4 row3 and col4 row4. Red wins
      unconditionally because one of the two threats will be reached first and the other
      immediately becomes Major Direct. Solver confirms col4 score = +12.
    expected_behavior: "solver confirms Red wins; adjacent threat column shows highest score"
    solver_verified: 2026-05-18

false_positives:
  - movestring: "1115222555577773663636617"
    why_not: |
      Red has major threats at col 4 rows 3 and 5 in the same column — same parity
      (both odd) but NOT adjacent (differ by 2). T1 requires consecutive rows (r and r+1).
      A naive predicate checking only "two Red threats in the same column" without
      enforcing row adjacency would incorrectly fire T1 here. Correct rule: T4 (same
      parity, non-adjacent, no interaction).
  - movestring: PENDING
    why_not: |
      Two threats in the same column for different players at adjacent rows — not the
      same player. T1 requires both threats to belong to the same player. Cross-player
      adjacent pair is instead T2 territory (the lower threat undercuts the higher).

known_limitations:
  - "Applies only to major threats. Adjacent minor threats do not guarantee a win via T1."
  - "Must be checked before T2–T5 when multiple threats exist in a column. If T1 fires, the column is resolved and no other T rule applies to it."
  - "Does not require either threat to be currently playable (direct). The guarantee holds because gravity ensures the lower cell is reached before the upper."

related:
  - "[[allen-t2]] — cross-player adjacent pair is T2's undercut case, not T1"
  - "[[allen-t4]] — same-parity non-adjacent pair in one column (check T1 adjacency first)"
  - "[[allen-t5]] — different-parity non-adjacent pair (row 3 + row 6); must check T1 first"
  - "[[allen-g4]] — informal statement of the same principle (G4: Adjacent major threats win)"
  - "[[allen-v3]] — a single uncancelled odd-row threat that survives T1–T7 is a V3 win"

last_verified: 2026-05-17
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 96:

> **T1: Adjacent major threats win.**
>
> Adjacent Red major threats win.
>
> Adjacent Black major threats win.
>
> *[Diagram: column sketches showing two Red threat markers at adjacent rows → win; two Black threat markers at adjacent rows → win.]*

Note: Allen's G4 (General Principle 4) states the same idea informally: "G4: Adjacent major threats win." T1 is the formal transformation-rule version of G4.

## Notes

- **Same as G4:** Allen introduces adjacent pairs twice — first as G4 (informal) and then as T1 (transformation rule). They are the same principle; T1 is the actionable form used when simplifying columns before applying V1–V5.
- **Why T1 wins unconditionally:** Gravity fills columns bottom-up. If a player's threats are at rows r and r+1, the opponent cannot interleave other pieces between them — the column fills sequentially. Whichever threat is reached first, the other is immediately a Major Direct threat (atari), which the opponent cannot avoid.
- **Priority:** T1 fires before any other T rule on the same column. Implementations that loop over T2–T5 without first checking T1 will misclassify adjacent pairs.
