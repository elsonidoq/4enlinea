---
id: community-double-threat
type: definition
canonical: false
source:
  doc: allen_2010
  location: "Ch. 4 (T1 covers the same-column adjacent-row case)"
  verbatim_quote: |
    T1 (adjacent threats): Threats in the same column on rows r and r+1 win
    unconditionally — blocking the lower threat exposes the upper as the new
    gravity-top. (Paraphrased; Allen does not define "double threat" as a standalone
    term but T1 describes the same-column case.)
statement: |
  A double threat (fork) arises when one move creates two positions each satisfying
  the immediate-threat predicate. The two threat cells may be in different columns
  (the opponent can block at most one column per turn) or on adjacent rows of the
  same column (Allen T1: blocking the lower row exposes the upper row as the new
  gravity-top). Because both threats are simultaneously immediate after the fork
  move, the player who creates a double threat wins on the very next move
  unconditionally — the opponent cannot cover both.

short_summary: |
  A double threat (fork) is a single move that creates two simultaneous immediate
  threats. Since the opponent can play only one column per turn, one threat is always
  left open — guaranteeing a win on the very next move.
short_summary_es: |
  Una amenaza doble (bifurcación) es una sola jugada que crea dos amenazas inmediatas
  al mismo tiempo. Como el rival solo puede jugar una columna por turno, siempre queda
  una amenaza sin bloquear, lo que garantiza la victoria en la próxima jugada.

preconditions:
  - "After the player's move, at least two distinct immediate threats exist for that player."
  - "The two threat cells are in different columns, OR in the same column on adjacent rows (T1)."
formal_predicate: |
  # Input: board state before the move, player P, column C to play
  # Output: bool — whether playing C creates a double threat for P

  def creates_double_threat(board, player, col):
      board_after = board.drop(col, player)
      threats = immediate_threats(board_after, player)
      return len(threats) >= 2
worked_examples:
  - movestring: "PENDING"
    description: |
      PENDING: construct a position where Red's best move creates two simultaneous
      immediate threats in different columns. Verify both threat cells are gravity-top
      after the move.
    expected_behavior: "After Red's move, two distinct <Gn> cells appear; solver confirms forced win."
    solver_verified: null
    notes: "Substitute a solver-verified movestring before merging."
false_positives:
  - movestring: "PENDING"
    why_not: |
      Two major threats in different rows of the same column where the lower is NOT
      gravity-top do not constitute a double threat — the gravity constraint allows
      only the topmost empty cell to be played. The upper threat cannot be reached
      until after the lower is filled, so they are sequential, not simultaneous.
    notes: null
known_limitations:
  - "The T1 (same-column adjacent-row) case requires the lower threat to be gravity-top first; blocking it makes the upper row the new gravity-top."
  - "Two major threats that are not gravity-top are a strategic setup, not an immediate double threat."
  - "A double threat in the same column is only unconditional (T1) when the two cells are on adjacent rows — non-adjacent same-column threats can be sequentially blocked."
related:
  - "[[community-immediate-threat]] — each branch of a double threat is an immediate threat"
  - "[[community-forced-block]] — a player facing a double threat has no valid forced block"
  - "[[allen-j-configuration]] — J-shape is one structural source of double threats in different columns"
  - "[[community-figure-7]] — figure-7 generates a same-column double threat via zugzwang"
last_verified: 2026-06-19
---

## Verbatim source

Allen (2010) Ch. 4 Transformation Rule T1 covers the same-column adjacent-row variant. "Double threat" as a standalone term is not defined in Allen or Allis; it corresponds to the combinatorial game theory concept of a "fork."

## Notes

- "Fork" is the chess-inherited term; "double threat" is preferred in this project's user-facing copy.
- The different-column case is the more common in-game occurrence; T1 is important for forced wins in late endgame positions.
