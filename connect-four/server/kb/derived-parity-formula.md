---
id: derived-parity-formula
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§2.2 Parity Detection Formula"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  For a given column c with current height h (discs already placed in c), the next
  disc played in c lands on row h+1. A threat at (c, r) is parity-aligned for Red
  if r is odd (rows 1, 3, 5); for Yellow if r is even (rows 2, 4, 6). The intuition
  is that Red moves first, so in a fully filled column Red always occupies odd rows
  (1, 3, 5) and Yellow occupies even rows (2, 4, 6). Parity-aligned threats are
  strategically valuable because, all else being equal, if a column must fill, the
  owning player lands on their threat row naturally.

preconditions:
  - "Board is a standard 7×6 Connect Four grid with rows 1–6 (1 = bottom)."
  - "Red moves first (odd move numbers). Yellow moves second (even move numbers)."
  - "Threat at (c, r) is latent: r > height(c), i.e., not yet immediately playable."

formal_predicate: |
  # Row ownership by move number (independent of column height):
  row_owner(move_number) = Red   if move_number % 2 == 1
                         = Yellow if move_number % 2 == 0

  # Parity alignment of a threat cell (c, r):
  parity_aligned_for_Red(c, r)    = (r % 2 == 1)   # odd row → Red's natural row
  parity_aligned_for_Yellow(c, r) = (r % 2 == 0)   # even row → Yellow's natural row

  # Whether the currently-to-move player "owns" row r in column c at current height h:
  # (Simplified: assumes column fills straight through from h to r without branching)
  will_place_on(player, c, r, board):
      h = board.height(c)
      cells_to_fill = r - h      # moves needed in col c before r is reached
      # The player who plays the cells_to_fill-th move in col c reaches row r.
      # Combine with overall move parity to determine which player that is.
      # In practice: for endgame analysis, use r % 2 directly as the column-fill parity.
      return parity_aligned_for(player, r)   # valid at game start; recompute mid-game

worked_examples:
  - movestring: "3"
    description: |
      After Red's first move in col D (D1 = Red). Col D now has height 1.
      Threat at (col4, row3) would be parity-aligned for Red (row3 is odd).
      Threat at (col4, row4) would be parity-aligned for Yellow (row4 is even).
      Col4 remaining empty cells: rows 2–6 = 5 (odd count → col4 is a Z-Threat
      column for Red's row3 threat). Solver confirms Red wins from this position
      (all Yellow scores negative).
    expected_behavior: "col4 height=1 after move; rows 3,5 are Red parity-aligned; rows 2,4,6 are Yellow parity-aligned; col4 has 5O empty cells"
    solver_verified: 2026-05-17

false_positives: null

known_limitations:
  - "The simple formula r % 2 is exact only when a column is filled straight from bottom in uninterrupted alternating play. In real games, players skip columns, so the actual player to reach row r depends on the global move count and the play sequence, not just r alone. Use the Z-Threat count formulation for mid-game accuracy."
  - "Parity alignment is a necessary but not sufficient condition for a threat to be strategically decisive. A parity-aligned threat can still be a ghost threat (neutralised by opponent's Z-Threats) or a deceptive threat (undercut by opponent)."
  - "The formula assumes rows are 1-indexed (row 1 = bottom) and Red moves on all odd move numbers. If a different indexing convention is used, adjust the modulus accordingly."
  - "Derived from Allis §3.3 ('White likes to get odd threats') and Allen (T-rules apply parity). The formula itself is a logical consequence of Red moving first, not a separate theorem."

related:
  - "[[community-z-threat]] — the operational generalisation of parity alignment to mid-game column heights"
  - "[[community-ghost-threat]] — parity-aligned threats that are nonetheless unreachable"
  - "[[allis-claimeven]] — Allis §6.1 proves claimeven using the fact that Black always responds on even rows"
  - "[[allen-v3]] — Red wins with one uncontested odd-row (parity-aligned) threat"
  - "[[allen-t6]] — isolated Red even-row threats (opposite parity) are always worthless"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §2.2:

> For a given column c with current height h (discs already in c), the next disc played in c lands on row h+1. Whether that row belongs to Red or Black depends on whose turn it is when that disc is played:
>
> ```
> row_owner(c, move_number) = (move_number % 2 == 1) ? Red : Black
> ```
>
> A threat at (c, r) is parity-aligned for Red if r is odd; for Black if r is even.

*Note: §2.2 is derived from Allis 1988 §3.3 ("White likes to get odd threats") and is consistent with Allen Ch. 4. The formula itself is a logical consequence of Red moving first in a 6-row column.*

## Notes

- **Why the formula is a derived entry:** The parity formula is a fundamental building block for Z-Threat detection, claimodd reasoning, and the victory rules (V1–V5). It is documented as a standalone entry so implementations can cite it explicitly rather than re-deriving it inline.
- **Mid-game subtlety:** The simple `r % 2` formula is accurate at game start and valid when columns fill in strict alternating order. In practice, use the Z-Threat count `(r - height(c)) % 2` for mid-game positions where partial column fills have shifted the local parity.
