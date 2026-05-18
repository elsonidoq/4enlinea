---
id: community-parity-trap
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§2.4 Parity Traps and Ghost Threats"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  A parity trap is a structural state where a player is compelled to play the
  cells beneath the opponent's major threat, eventually handing the opponent the
  winning cell. It occurs when: (a) the opponent has a latent threat at (c, r)
  for some column c, (b) column c has k > 0 cells below row r that must be filled
  before r is reachable, and (c) the trapped player has no Z-Threats elsewhere to
  pass zugzwang back to the opponent. The opponent simply waits while the trapped
  player fills in below their own doom.

preconditions:
  - "Opponent has a latent major threat at (c, r) with r > height(c) + 1 (not immediately playable)."
  - "k = r - height(c) - 1 cells lie between the current column top and the threat cell."
  - "No dead-space or Z-Threats exist for the trapped player that could shift zugzwang away from column c."
  - "Board is in zugzwang: trapped player must make the next meaningful move."

formal_predicate: |
  # A parity trap for player P in column c (opponent's threat at (c, r)):

  def is_parity_trap(board, player, col, threat_row):
      h = board.height(col)
      cells_below = threat_row - h - 1     # cells P must fill before reaching threat_row
      if cells_below <= 0:
          return False   # threat is directly playable or already filled — not a trap
      # Check that player has no Z-Threats elsewhere to escape zugzwang
      player_z_threats = [t for t in board.major_threats(player) if t.col != col
                          and is_z_threat(t, board)]
      if player_z_threats:
          return False   # player can toggle zugzwang; trap may not resolve
      return True        # player is structurally forced into col eventually

worked_examples:
  - movestring: "PENDING"
    description: |
      Illustrative near-endgame: all columns filled except col3 (3 empty cells, rows 4–6)
      and col5 (1 empty cell, row 6). Yellow has a major threat at (col3, row4) —
      the next playable cell in col3. Red is to move and must play col3 (the only
      remaining column with multiple empty cells). Red plays col3 row4 — but that
      is Yellow's threat cell; Yellow wins immediately.
      Red has no Z-Threat elsewhere (col5 is a 0-Threat: 1 empty cell at row6,
      which is even-count to itself — wait, 1 is odd, so col5 IS a Z-Threat for
      whoever reaches it. This makes the example more nuanced; a clean parity-trap
      worked example requires a board where the trapped player's only column truly
      has no Z-Threat escape. Deferred to PENDING.)
    expected_behavior: "PENDING — solver verification required once a clean movestring is constructed"
    solver_verified: PENDING
    notes: |
      A definitive worked example requires constructing an endgame where: one column
      has the opponent's threat at its top, all other columns are full or dead,
      and the trapped player's parity count leaves them to play first into that column.
      Use c4solver to confirm the position is a forced loss for the trapped player.

false_positives: null

known_limitations:
  - "Project-local label; the phenomenon maps to Allen's zugzwang resolution (G2–G3) and Allis §3.3 cases 2–3. 'Parity trap' does not appear in Allis, Allen, or Tromp."
  - "A player with an escaping Z-Threat elsewhere is NOT trapped — they can pass zugzwang back to the opponent. The trap only holds when the player has no Z-Threat escape route."
  - "The trap can dissolve mid-game if a dead column becomes live (creating a Z-Threat) or if the opponent's threat is blocked. Parity-trap status must be re-evaluated after each move."
  - "If the opponent's threat cell is also the trapped player's threat cell (mutual/# threat), the parity trap becomes a #-Threat configuration — a special case with different resolution logic."

related:
  - "[[community-z-threat]] — the escape mechanism: a player with a Z-Threat is not parity-trapped"
  - "[[community-ghost-threat]] — threats that become ghost threats because the player is parity-trapped in the column that would resolve them"
  - "[[derived-dead-space-parity]] — formula determining which player is forced first after dead-space exhaustion; the formula identifies who is parity-trapped at endgame"
  - "[[allen-t7]] — opposite-player odd-row threats in separate columns cancel; this cancel mechanism can release or create parity traps"
  - "[[allis-claimeven]] — Black's systematic response that converts Red into a parity trap: Black always responds above Red, forcing Red to fill odd rows while Black claims even rows"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §2.4:

> A **parity trap** is a structural state where a player is compelled to fill the cell beneath their opponent's threat, handing the opponent the win. It occurs when a column has k empty cells, the opponent's threat sits at the top, and the player has no Z-threats elsewhere to toggle zugzwang.

*Note: "Parity trap" is a project-local label. The phenomenon corresponds to Allen's general description of zugzwang resolution (G2–G3) and is the operative mechanism in Allis's claimeven proof (§5.2–§6.1). The term does not appear in Allis, Allen, or Tromp.*

## Notes

- **Relationship to claimeven:** Black's claimeven strategy is a systematic method for constructing a parity trap in every column simultaneously. By always responding directly above Red's move, Black ensures that Red is the player forced to play first into every odd-row position. Allis §5.2 proves this is a forced win for Black when the position has no unundercut Red odd-row threats.
- **Relationship to dead-space parity:** The `derived-dead-space-parity` formula (`(n + S_dead) mod 2`) determines which player is forced first after all dead moves are exhausted — i.e., which player falls into the parity trap at endgame. If Result = 0 (Red forced first), Red is in the parity trap.
