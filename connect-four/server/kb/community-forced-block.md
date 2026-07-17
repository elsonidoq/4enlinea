---
id: community-forced-block
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "universal assumption in Connect Four literature; not given a standalone definition in Allen or Allis"
  verbatim_quote: |
    No standalone definition found. The concept is implicit throughout Allen (2010)
    and Allis (1988) — any position with an opponent immediate threat requires an
    immediate response or the game is lost.
statement: |
  A forced block occurs when the opponent holds one or more immediate threats and
  the only moves that avoid an immediate loss are those that fill the opponent's
  threat cells. A player in a forced-block position has no strategic latitude: any
  column outside the blocking set loses on the opponent's very next turn. When the
  opponent holds a single immediate threat, the forced block is the column containing
  that threat cell. When the opponent holds two or more immediate threats in different
  columns — a double threat — no single move can block all of them and the position
  is lost by force regardless of the response.

short_summary: |
  A forced block is a situation where the opponent has an immediate threat and only
  one specific column prevents the loss. Every other legal move hands the opponent
  an immediate win.

preconditions:
  - "The opponent has at least one immediate threat (a gravity-top cell completing four-in-a-row)."
  - "At least one legal move neutralises all of the opponent's immediate threats."
  - "Not all legal moves neutralise the threat (otherwise there is no 'forced' restriction)."
formal_predicate: |
  # Input: board state, current player P, opponent Q
  # Output: set of blocking columns, or null if no block is required,
  #         or empty set if a double threat makes the position lost

  def forced_block_columns(board, player, opponent):
      opp_threats = immediate_threats(board, opponent)
      if len(opp_threats) == 0:
          return None   # no forced block required

      # Group threat cells by column
      threat_cols = {cell.col for cell in opp_threats}

      # A single move can block all threats only if all threat cells
      # are in the same column (and that column's gravity-top covers them).
      # If threats span multiple columns, the position is lost.
      if len(threat_cols) > 1:
          return set()  # double threat — no valid block

      return threat_cols  # exactly one blocking column
worked_examples:
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red has an immediate horizontal threat that
      Yellow must block. Confirm that all columns except the blocking one yield
      immediate Red win, and that blocking extends the game.
    expected_behavior: "Yellow has exactly one blocking column; all others lose next move."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      If the opponent's threat cell is not gravity-top — i.e., it is a latent major
      threat shown as [Gn] in the board, not <Gn> — then no block is required on
      this turn. The threat exists structurally but cannot be executed immediately.
    notes: null
known_limitations:
  - "A forced block is obligatory but may still lead to a losing position — the block may create new problems for the blocking player."
  - "When the opponent holds a double threat, the forced-block column set is empty; the position is lost regardless of the response."
  - "Forced-block detection depends on correct gravity-top identification — a buried threat cell cannot be immediately played and should not trigger a forced block."
related:
  - "[[community-immediate-threat]] — forced block responds to an opponent's immediate threat"
  - "[[community-double-threat]] — a double threat defeats all forced-block attempts"
last_verified: 2026-06-19
---

## Verbatim source

No standalone definition in Allen (2010) or Allis (1988). The concept is universally implied: when the opponent has a winning move, the only valid response is to play the same column.

## Notes

- The classifier tags a position as `forced_block` when the current player's only moves that avoid immediate loss are exactly the blocking columns. Non-blocking moves score as losses.
- Forced block is a purely defensive obligation — do not conflate with "forced win," which describes an unstoppable winning sequence.
