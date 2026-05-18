---
id: community-claimodd
type: heuristic
canonical: false
source:
  doc: "weakc4:2swap.github.io/WeakC4/explanation/"
  location: "Steady-State Language section"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  Claimodd is Red's structural response to an all-even position (all columns have an
  even number of empty cells). Because claimeven would give Red even rows (wrong parity
  for Red), Red instead plays "claimeven everywhere except claimodd in the center
  column": Red responds above Black in all non-center columns, but in column D (center)
  Red plays *below* Black's moves (or plays first in D). This secures Red an odd-row
  threat in the center column while Black collects even rows everywhere else, giving
  Red zugzwang control via the center Z-Threat. The term is coined by the WeakC4
  project; the underlying concept appears in Allis under "odd threats", Baseinverse,
  and Vertical.

preconditions:
  - "It is Red's turn to move."
  - "All columns have an even number of empty cells (all-even position)."
  - "Red has no uncontested odd-row threat already established."
  - "Center column (col D, col 4) is not full."

formal_predicate: |
  # Claimodd strategy for Red in an all-even position:

  def claimodd_strategy(board, current_player, red_move):
      # Guard: validate all four preconditions before applying the strategy
      # (1) It must be Red's turn
      if current_player != RED:
          return None  # strategy does not apply
      # (2) All columns must have an even number of empty cells (all-even position)
      if any(count_empty(board, col) % 2 != 0 for col in range(1, 8)):
          return None
      # (3) Red must have no uncontested odd-row threat already established
      if has_uncontested_odd_threat(board, RED):
          return None
      # (4) Center column (col 4) must not be full
      if count_empty(board, CENTER_COL) == 0:
          return None

      if red_move.col == CENTER_COL:
          # In center column: Red plays *at or below* Black's previous disc —
          # i.e., Red plays first in col D when possible, establishing an
          # odd-row anchor before Black can claim the even row above.
          return "claimodd: play first (or low) in center column"
      else:
          # In all other columns: Red plays the cell *directly above* Black's
          # most recent disc in that column (claimeven response).
          return "claimeven: respond directly above Black in this column"

  # Outcome: Red secures odd rows in col D while Black secures even rows everywhere.
  # The center Z-Threat gives Red zugzwang control. Red wins via the center column
  # before Black's even-row structure resolves.

worked_examples:
  - movestring: "4"
    description: |
      After Red's first move in col D (D1 = Red, move 1). This is the canonical
      claimodd opening: Red plays center first, establishing an odd-parity anchor
      in the center column (col4 now has 5 empty cells — odd parity).
      Yellow to move. Solver scores: col3 = -2, col4 = -1 (best for Yellow), col5 = -2,
      cols 1,7 = -4. All negative → Yellow loses → Red wins. The center opening
      gives Red the decisive Z-Threat advantage.
    expected_behavior: "all solver scores negative for Yellow (Red wins); col4 has 5O empty cells (odd) confirming the Z-Threat; Red's center anchor is the structural basis for claimodd"
    solver_verified: 2026-05-17

false_positives:
  - movestring: "444444"
    why_not: |
      After 6 moves (all col D), the center column is completely full (0 empty).
      All other columns have 6E empty cells — the all-even trigger fires. But
      the naive claimodd instruction ("play first in col D") is impossible: col D
      is full. The heuristic does not specify a fallback column for establishing
      the odd-row threat, so it silently fails. Red must adapt to adjacent columns
      (col C or E) as the claimodd anchor, which requires separate analysis.
      Solver shows col3 and col5 score +1 (Red wins by playing there), col2 and
      col6 score 0 (draw), col1 and col7 score -1 (Red loses).
    notes: "center-column-full is the canonical false-positive for naive claimodd implementations"

known_limitations:
  - "Project-local label coined by WeakC4 (2swap.github.io/WeakC4/explanation/); the underlying concept is canonical (Allis §5.2 'odd threats', Baseinverse, Vertical) but the specific term 'claimodd' is not used in Allis, Allen, or Tromp."
  - "Applies only when all columns are even AND Red has no uncontested odd-row threat. If Red already has an odd-row threat, the claimodd strategy is unnecessary — exploit the existing threat directly."
  - "Assumes center column is available. When col D is blocked, Red must identify the best available column for the odd-row anchor via solver analysis."
  - "The claimodd strategy does not specify how Red handles a Yellow incursion into col D before Red establishes the odd-row threat. Mid-game deviations require case-by-case zugzwang analysis."
  - "All-even positions can arise at any stage of the game, not just at the opening. The formula applies whenever the all-even precondition holds."

related:
  - "[[allis-claimeven]] — Black's complementary strategy; claimodd is Red's structural counter"
  - "[[community-z-threat]] — the center-column Z-Threat that claimodd establishes"
  - "[[derived-parity-formula]] — defines parity-aligned rows; claimodd seeks odd rows (parity-aligned for Red)"
  - "[[allen-v3]] — Red wins with one uncontested odd-row threat; claimodd creates this threat"
  - "[[allen-t7]] — cross-column cancellation; claimodd is designed so Yellow cannot establish a second odd-row threat to cancel Red's center Z-Threat"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §4.4:

> *Note: "Claimodd" is not one of Allis's nine original strategic rules, nor does the term appear in Allen or any other canonical source. The label was coined by the WeakC4 project (2swap.github.io/WeakC4/explanation/) as part of its Steady-State Language.*
>
> When Red faces an all-even position, simple claimeven would give Red even rows — the wrong parity. Red's strategy is **"claimeven everywhere except claimodd in the center column."**
>
> By responding above Black in all columns *except* column D, and playing *below* Black's moves in column D (or playing first in D), Red secures an odd-row threat in the center column while Black gets even rows everywhere else. Red then wins via the center column threat before the even-row resolution is needed.

## Notes

- **Canonical basis:** The underlying idea is proven in Allis. Allis §4.5 ("An odd threat for White gives him control of the Zugzwang") explains why Red winning an odd-row threat in any column converts an all-even position into a Red win. Claimodd is the operational recipe for achieving that in the center column.
- **WeakC4 origin:** The WeakC4 project (tromp's community, 2swap.github.io) coined the term as part of a structured language for describing claimeven/claimodd dynamics in automated analysis. The term has spread to tutorial sites but remains absent from academic literature.
