---
id: derived-dead-space-parity
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§3.4 Dead-Space Parity Formula"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  After all dead-space moves are exhausted, the player forced to make the first
  meaningful (non-dead) move is determined by the formula (n + S_dead) mod 2,
  where n is the number of moves already played and S_dead is the count of
  remaining dead-space cells. Result = 0 means Red is forced first; Result = 1
  means Yellow is forced first. The formula is derived from the basic turn-order
  rule: when an even number of empty spaces remains it is Red's turn (Wikibooks).

preconditions:
  - "n is the number of moves already played at the time of analysis."
  - "S_dead is the number of dead-space cells still to be filled (dead = no four-in-a-row formable for either player in that cell)."
  - "S_dead is stable: no currently-dead cell will become live during remaining play."
  - "At least one non-dead move remains; the formula determines who is forced to make it first."

formal_predicate: |
  # Who is forced to move first after all dead-space moves are exhausted:

  def forced_first(n, S_dead):
      result = (n + S_dead) % 2
      if result == 0:
          return "Red"    # Red is forced to make the first non-dead move
      else:
          return "Yellow" # Yellow is forced to make the first non-dead move

  # Derivation sketch:
  # Total moves in a full game = 42.
  # After n moves played and S_dead dead moves remaining, non-dead moves start
  # at global move number n + S_dead + 1.
  # Move n + S_dead + 1 is Red's if (n + S_dead + 1) % 2 == 1
  #   ↔ (n + S_dead) % 2 == 0
  #   ↔ result == 0 → Red is forced first.

worked_examples:
  - movestring: "333333"
    description: |
      After 6 moves (all in col D). Col D is full (0 empty). All other cols have 6E
      empty cells. If col D's cells are "dead" (no four-in-a-row formable through col D
      after filling alternating R/Y), then S_dead = 0 (col D already filled, no dead
      cells remaining in that column; other columns are live).
      For illustration: n=6, S_dead=0 (no dead cells, all other cols are live).
      Result = (6 + 0) mod 2 = 0 → Red is forced first among non-dead columns.
      Red to move (move 7 is odd = Red). Solver confirms Red must choose next among
      live columns; cols 3 and 5 score +1 (Red wins), cols 2 and 6 score 0 (draw).
    expected_behavior: "n=6, S_dead=0, result=0 → Red forced first; Red should play col3 or col5 (score +1); formula matches observed turn order"
    solver_verified: 2026-05-17
    notes: |
      In this position S_dead=0 because col D is already filled, not because its
      cells are structurally dead. The example illustrates the formula's turn-order
      arithmetic; a richer dead-space example would have S_dead > 0 with truly
      non-formable cells. Deferred to a later worked example once a suitable
      mid-game position with clearly dead columns is constructed.

false_positives: null

known_limitations:
  - "The stability assumption (S_dead is constant) is the critical caveat. In mid-game positions, a currently-dead cell can become live as adjacent columns fill. The formula must be recomputed at each step when this is possible."
  - "The formula assumes the standard Connect Four rule that Red moves first on move 1. If the starting player changes, adjust: Result = 0 means the first player is forced (whoever that is)."
  - "At game start (n=0), the formula simplifies to S_dead mod 2. Some sources omit n, but that shortcut is only valid when n is known to be 0 or even."
  - "Derived from Wikibooks Connect Four ('when an even number of empty spaces remains, it is Red's turn'). The Wikibooks source uses a simplified single-column model; the formula here extends it to the full board with dead-space accounting."
  - "The formula gives who is forced first, not who wins. Being forced first is disadvantageous when the non-dead moves contain the opponent's threats, but it can be advantageous if the player to move has a winning threat available immediately."

related:
  - "[[community-parity-trap]] — the experiential consequence when Result=0: Red is parity-trapped if non-dead columns all contain Yellow threats"
  - "[[community-z-threat]] — Z-Threats can shift the zugzwang balance mid-game, effectively changing which player is 'forced first' in the live region"
  - "[[derived-parity-formula]] — the simpler per-column parity formula this formula generalises"
  - "[[allen-v5]] — draw by zugzwang exhaustion corresponds to Result=0 with no decisive threats remaining"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §3.4:

> After all dead-space moves are exhausted, the player forced to make the first meaningful (non-dead) move is determined by:
>
> ```
> (n + S_dead) mod 2
> ```
>
> where:
> - `n` = number of moves already played at the time of analysis
> - `S_dead` = number of dead-space cells remaining
>
> **Result = 0 → Red is forced** to make the next non-dead move.
> **Result = 1 → Black is forced.**
>
> **Why n matters:** Zugzwang depends on whose turn it is *after* all dead moves are exhausted, not just how many dead cells exist. At game start (n = 0) the formula simplifies to `S_dead mod 2`, which is why some sources omit n — but that shortcut is only valid at the start or when n is known to be even.
>
> **Derivation:** The formula follows from the basic turn-order rule: when an even number of empty spaces remains, it is Red's turn (source: en.wikibooks.org/wiki/Connect_Four). After n moves with S_dead dead-space moves still to come, the first non-dead move arrives when 42 − n − S_dead spaces remain; that count is even iff (n + S_dead) is even, giving Result = 0 → Red is forced.

## Notes

- **Why this is a derived entry:** The formula is a direct consequence of the turn-order rule (Red = odd moves) combined with dead-space accounting. It is not attributed to a specific published theorem but is a logical derivation consistent with Allis §3.3 and Allen Ch. 4.
- **Relationship to parity-trap:** When Result = 0 (Red forced first) and all live columns contain Yellow threats, Red falls into a parity trap in every live column simultaneously. This is the endgame resolved by Allis's claimeven proof.
- **Practical use:** Applied during puzzle generation to determine which player is forced first in the remaining live positions, used to validate zugzwang-based puzzle answers.
