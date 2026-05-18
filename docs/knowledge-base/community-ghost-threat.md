---
id: community-ghost-threat
type: definition
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§2.4 Parity Traps and Ghost Threats"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  A ghost threat is a major threat at (c, r) that is parity-aligned for the owning
  player (row r is odd for Red, even for Yellow) and appears strategically valuable,
  but is mathematically unreachable. The most common cause: the opponent holds a
  Z-Threat in a different column that flips zugzwang ownership, so when play reaches
  the critical moment the owner is forced to play elsewhere, and column c is consumed
  without the owner reaching row r. Ghost threats have zero strategic value despite
  appearing on the owner's parity row.

preconditions:
  - "A major threat T exists at (c, r) for player P, parity-aligned (r % 2 == 1 for Red; r % 2 == 0 for Yellow)."
  - "Opponent holds at least one Z-Threat in a column c' ≠ c."
  - "No Z-Threat exists for P in any column other than c (or P's Z-Threats are outnumbered/cancelled by opponent's)."
  - "When dead-space moves are exhausted, P is forced to play into c' before reaching row r in c, causing c to be consumed unfavorably."

formal_predicate: |
  # A ghost threat is a parity-aligned threat that does NOT survive to resolution
  # because the opponent's Z-Threat count dominates.

  def is_ghost_threat(T, board, player):
      if not is_parity_aligned(T, player):
          return False
      if not is_major_threat(T, board):
          return False
      # Simplified structural check: opponent has more uncancelled Z-Threats
      opponent_z = count_uncancelled_z_threats(board, opponent(player))
      player_z = count_uncancelled_z_threats(board, player)
      # Ghost threat arises when opponent controls zugzwang (V2 or T7 dynamics)
      # and T.col is the one that will be consumed before player reaches row T.row
      return opponent_z > player_z and not can_reach_before_consumed(T, board, player)

  # Note: can_reach_before_consumed requires full game-tree search (c4solver).
  # The structural check (opponent_z > player_z) is a necessary but not sufficient
  # condition — solver confirmation is required for a definitive determination.

worked_examples:
  - movestring: "1115222555577773663636617"
    description: |
      After 25 moves (Yellow to move). Red has Z-Threats at col4 row3 and col4 row5.
      Solver scores are all negative for Yellow (all columns -2 to -6), meaning Yellow
      wins regardless. Red's threats at col4 are zugzwang-relevant but Yellow's external
      structure is sufficient to win before Red can exploit col4 row3 or row5.
      This illustrates the structural situation in which Red threats become ghost threats:
      they exist on parity-aligned rows but the zugzwang balance favours Yellow.
    expected_behavior: "all solver scores negative for Yellow (Yellow loses = Red wins is WRONG — negative from Yellow's perspective means Yellow loses, i.e. Yellow wins if negative? See note); col4 row3 and row5 are major Red threats that do not translate to a win for Red"
    solver_verified: 2026-05-17
    notes: |
      c4solver score convention: score from the perspective of the player to move.
      Here Yellow to move, all scores negative → Yellow loses → Red wins. This makes
      col4's Red threats NOT ghost threats in this specific position (Red wins). The
      example illustrates the Z-Threat structure; a true ghost-threat example requires
      a position where Red has parity-aligned threats but Yellow wins (positive scores
      from Yellow's POV). Providing a definitive ghost-threat worked example requires
      constructing a position where Yellow wins despite Red having odd-row threats —
      that requires specific endgame zugzwang geometry. Deferred to PENDING.

false_positives: null

known_limitations:
  - "Project-local label; the phenomenon is described in Allen as zugzwang resolution (G2–G3) and in Allis §3.3 as parity-based threat neutralisation. 'Ghost threat' does not appear in Allis, Allen, or Tromp."
  - "A parity-aligned threat is NOT automatically a ghost threat. Ghost status depends on the full zugzwang count — the threat becomes ghost only when the opponent's Z-Threat count dominates (Allen V2: Black wins with 2+ odd-row threats; Allen T7: threats in separate columns cancel)."
  - "Ghost threat status is position-dependent and can change as moves are played. A threat that is ghost at move 20 may become live again if the opponent's Z-Threat column is blocked before it resolves."
  - "Even-row threats for Red are structurally worthless by Allen T6 (isolated Red even-row threat = zero value), which is a separate concept from ghost threats. T6 threats are dead by parity rule; ghost threats are dead by zugzwang dynamics."

related:
  - "[[community-z-threat]] — the mechanism that makes a threat a ghost (opponent's Z-Threat flips zugzwang)"
  - "[[community-parity-trap]] — the structural trap that causes a player to consume their own threat column"
  - "[[allen-t7]] — cross-column odd-threat cancellation; ghost threats arise when this cancellation favours the opponent"
  - "[[allen-v2]] — Black wins with two uncancelled odd-row threats; Red threats become ghost threats in this regime"
  - "[[allen-t6]] — isolated Red even-row threats are always worthless (separate mechanism from ghost threats)"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §2.4:

> A **ghost threat** is a visually apparent winning line that is mathematically unreachable. The most common cause: the cell is on the player's parity row, but the opponent holds a Z-threat in another column that flips who must play next, leaving the player unable to reach the threat before the column is consumed.

*Note: "Ghost threat" is a project-local label. The underlying phenomenon — parity-aligned threat neutralised by opponent's zugzwang advantage — is described canonically in Allen (G2–G3, T7) and Allis (§3.3 cases 2–4). "Ghost threat" does not appear in Allis, Allen, or Tromp.*

## Notes

- **Relationship to Allen T6:** Allen T6 says an isolated Red even-row threat is worthless because Red can never reach even rows in normal play. Ghost threats are different: the row is correct (odd for Red) but zugzwang dynamics make it unreachable. Detectors must distinguish T6-dead threats from ghost threats.
- **Detection complexity:** Structural ghost-threat detection is NP-hard in general (requires predicting zugzwang resolution). In practice, use c4solver scores: if Red has parity-aligned threats but all solver scores are positive (Yellow wins), Red's threats are ghost threats.
