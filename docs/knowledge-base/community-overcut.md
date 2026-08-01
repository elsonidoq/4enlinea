---
id: community-overcut
type: tactical_pattern
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§6.2 Overcutting"
  verbatim_quote: |
    Overcutting occurs when your major threat at (c, r) neutralizes the opponent's
    minor threat at (c, r′) with r′ < r. Because your major threat is in the same
    column and at a higher row, the opponent is forced to play column c to build
    toward their threat — but playing c eventually delivers the column to you,
    completing your major threat first.

    Overcutting is less absolute than undercutting; it depends on the column filling
    order and parity.

statement: |
  Overcutting is the structural condition where a player's major threat at (col C,
  row R) wins despite the opponent having a lower threat at (col C, row R') with
  R' < R in the same column. The upper threat "overcuts" the lower one when T2
  cannot fire to neutralize R — because the opponent's lower threat is minor,
  because both threats share the same row parity (T4: no interaction), because
  T5 protects the row-3+row-6 pair, or because a chained lower friendly threat
  neutralizes the opponent's R' first (chain T2). In the active-forcing sub-case,
  the current player plays into the column voluntarily with odd-column parity,
  blocking the opponent's lower threat and immediately threatening from R.

short_summary: |
  When a player's major threat at a higher row wins despite the opponent having a
  lower threat in the same column, because the lower threat lacks the parity needed
  to neutralize the upper one.

preconditions:
  - "Current player has a major threat at (col C, row R)."
  - "Opponent has a threat at (col C, row R') with R' < R in same column C — the structural overcut pattern."
  - "T2 is blocked from neutralizing R by exactly one of four mechanisms:"
  - "  (a) Minor-threat exception: opponent's R' threat is MINOR (two discs + two empties) — T2 applies only to major threats."
  - "  (b) Same-parity exception (T4): R and R' have the same parity (both odd or both even) — same-parity threats in the same column do not interact."
  - "  (c) T5 exception: {R, R'} = {3, 6} — T5 overrides T2 for the row-3+row-6 pair even though their parities differ."
  - "  (d) Chain-T2 exception: current player has a second major threat at R'' < R' with parity opposite to R'; T2 applied bottom-up first neutralizes opponent's R' from below, leaving R untouched."
  - "Solver confirms: playing column C gives a positive score for the current player."
  - "Active-forcing sub-case (applies to cases where T2 would fire statically but column parity prevents it): column C has ODD number of empty cells AND it is the current player's turn — the current player plays first in the column, physically blocking the opponent's R' threat cell and creating an immediate check at R."

formal_predicate: |
  # Checks whether the current player has a valid overcut in column `col`.
  # All rows are 1-indexed; parity = row % 2 (1=odd, 0=even).
  # `threats` is a list of (player, col, row, is_major) tuples.

  def is_overcut(board, col, current_player, threats, col_empty_count, current_player_to_move):
      opponent = BLACK if current_player == RED else RED

      # Collect threats in this column, split by player
      cp_major = sorted(
          [row for (p, c, row, major) in threats if c == col and p == current_player and major],
          reverse=True
      )
      opp_threats = [(row, major) for (p, c, row, major) in threats
                     if c == col and p == opponent]

      for R in cp_major:
          for R_prime, opp_is_major in opp_threats:
              if R_prime >= R:
                  continue  # opponent's threat must be strictly below current player's

              # --- Guard: T1 must not apply (same-player adjacent pair is a guaranteed win,
              #     not an overcut) ---
              if any(row == R - 1 for row in cp_major):
                  continue

              # --- T2 exception check ---

              # (a) Minor-threat exception
              if not opp_is_major:
                  return True, R, R_prime, "minor_threat"

              # (b) Same-parity exception (T4)
              if R % 2 == R_prime % 2:
                  return True, R, R_prime, "same_parity_t4"

              # (c) T5 exception: rows 3 and 6 do not interact
              if {R, R_prime} == {3, 6}:
                  return True, R, R_prime, "t5_exception"

              # (d) Chain-T2 exception: current player has a lower major threat that
              #     neutralizes R' from below before R' can neutralize R.
              #     Apply T2 bottom-up: check if any cp_lower kills R'.
              cp_lower_major = [row for row in cp_major if row < R_prime]
              for R_double_prime in cp_lower_major:
                  # T2 sub-case 2: CP even below opponent odd
                  if R_double_prime % 2 == 0 and R_prime % 2 == 1:
                      return True, R, R_prime, "chain_t2"
                  # T2 sub-case 3: CP odd immediately below opponent even (adjacent only)
                  if R_double_prime % 2 == 1 and R_prime == R_double_prime + 1:
                      return True, R, R_prime, "chain_t2"

              # (e) Active-forcing sub-case: column has odd parity, current player moves
              #     first, can block R' and create immediate check at R.
              #     Applies when T2 would fire statically but the current player
              #     acts first in the column.
              if col_empty_count % 2 == 1 and current_player_to_move:
                  # Verify R is the first-reachable cell for current player
                  # after playing into col (current player fills R', then R in sequence)
                  if R == R_prime + 1:  # R immediately above R' — direct check after blocking
                      return True, R, R_prime, "active_forcing"

      return False, None, None, None

  # Notes:
  # - Neutralized threats (via chain T2) should not themselves be used as lower threats
  #   for further T2 checks — apply bottom-up.
  # - The active_forcing sub-case requires R = R'+1 (adjacent) so that blocking R'
  #   makes R immediately playable. Non-adjacent active forcing is possible but rarer.

worked_examples:
  - movestring: "26533454144531123345224155"
    description: |
      Move 26, Red to move. Column 7 (1-indexed) has 5 empty cells (rows 2–6, parity 5O).
      Red has a major threat at col7 row6 (even). Yellow has a major threat at col7 row4
      (even). Both threats are at even rows — same parity. T4 applies: same-parity threats
      in the same column do not interact, so T2 does not fire. Red plays col7 first (odd
      column parity). The fill sequence in col7 is Red(row2), Yellow(row3), Red(row4),
      Yellow(row5), Red(row6). Red places at row4 — blocking Yellow's row4 major threat —
      and then places at row6 — completing Red's own major threat.
    expected_behavior: "scr col7 = +3 (Red wins by playing col7). Red's row6 threat completes; Yellow's row4 threat is blocked when Red fills that cell."
    solver_verified: true
    notes: |
      Same-parity sub-case (T4). Both threats are at even rows (4 and 6). T2 requires
      opposite parity; same-parity threats do not interact, so Red's upper even-row threat
      is not undercut. Red's odd column parity (5O) guarantees Red fills the even-indexed
      cells within the column (rows 2, 4, 6) — reaching both the block and the win.

  - movestring: "2365213030023306446354465055546"
    description: |
      Move 31, Yellow to move. Column 3 has 3 empty cells (rows 4–6, parity 3O).
      Yellow has a major threat at col3 row5 (odd). Red has a major threat at col3 row4
      (even, lower). Opposite parity: T2 sub-case 1 would normally fire (Red even at row4
      neutralizes Yellow odd at row5). But column 3 has odd parity and Yellow moves first.
      Yellow plays col3 → disc at row4, blocking Red's major row4 threat. Row5 is now the
      next empty cell in col3 — Yellow's row5 major threat becomes a direct (immediately
      playable) check. Red must respond to col3 (row5) to avoid losing. Yellow then fills
      col3 row6. Net: Yellow forced Red to spend a tempo at col3 row5, shifting zugzwang
      advantage to Yellow.
    expected_behavior: "scr col3 = +1 (Yellow wins by playing col3). Only col3 gives a positive score; all other columns score -5."
    solver_verified: true
    notes: |
      Active-forcing sub-case. Opposite parity (Red even row4, Yellow odd row5) means T2
      would fire in passive endgame analysis. But Yellow acts first (col3 parity=3O,
      Yellow's turn), physically blocks Red's row4 threat, and forces a defensive response
      at row5. The tempo gained shifts zugzwang to Yellow's advantage elsewhere.

  - movestring: "32640344326334662063620"
    description: |
      Move 23, Yellow to move. Column 2 is completely empty (6 empty cells, parity 6E).
      Yellow has major threats at col2 row2 (even) and col2 row4 (even). Red has a major
      threat at col2 row3 (odd). The stated overcut pair: Yellow row4 (upper, even) vs
      Red row3 (lower, odd). T2 sub-case 3 would normally fire (Red odd at row3,
      Yellow even at row4 immediately above → Yellow row4 dead). But Yellow also has a
      major threat at col2 row2 (even, below Red row3). T2 sub-case 2 fires first
      (bottom-up): Yellow even at row2 neutralizes Red odd at row3. Red's row3 threat
      is dead. With row3 neutralized, T2 sub-case 3 cannot fire — Yellow's row4 survives.
    expected_behavior: "scr col2 = +4 (Yellow wins by playing col2). Yellow's row2 major threat is the surviving winning threat; Red has no surviving odd-row threats in col2."
    solver_verified: true
    notes: |
      Chain-T2 sub-case. Yellow's lower major threat (row2, even) kills Red's lower
      threat (row3, odd) via T2 sub-case 2 before T2 sub-case 3 can neutralize Yellow's
      upper threat (row4, even). Apply T2 bottom-up: the lowest interacting pair resolves
      first. Yellow's row4 is then a surviving even-row threat; combined with Yellow's
      surviving row2, Yellow wins via V4 (Black even-row threats with no Red odd-row
      counter in col2).

  - movestring: "2124220033341151151"
    description: |
      Move 19, Yellow to move. Column 4 has 3 empty cells (rows 4–6, parity 3O).
      Yellow has a major threat at col4 row5 (odd). Red has a major threat at col4 row4
      (even, lower). Also: Yellow has a major threat at col7 row2 (even, in a different
      column). Opposite parity in col4: T2 sub-case 1 would normally fire (Red even row4
      neutralizes Yellow odd row5). But col4 has odd parity (3O) and Yellow moves first.
      Yellow plays col4 (row4), blocking Red's major row4 threat. Row5 is now the next
      empty cell — Yellow's row5 major threat is directly playable. Red must block at row5.
      Yellow takes col4 row6. The forced col4 exchange eliminates both col4 threats;
      Yellow's separate col7 row2 major threat (even row, claimeven type) then wins.
    expected_behavior: "scr col4 = +10 (Yellow wins by playing col4). Red at col4 row4 is blocked; Yellow's row5 check forces Red's tempo; Yellow's col7 row2 even-row threat closes the game."
    solver_verified: true
    notes: |
      Active-forcing sub-case (same mechanism as 7fef078d). Red's even-row major
      threat at row4 would undercut Yellow's odd-row major threat at row5 under T2,
      but Yellow acts first in the odd-parity column. The forced block at row5 costs
      Red a move, and the resulting zugzwang position yields to Yellow's independent
      col7 even-row major threat.

false_positives:
  - movestring: "331324244556605142"
    why_not: |
      Move 18, Red to move. Column 4 contains Red major threat at row5 (odd, upper)
      and Yellow major threat at row4 (even, lower). This is the structural overcut
      pattern — but T2 sub-case 2 DOES apply here: Yellow's even-row major threat at
      row4 is below Red's odd-row major threat at row5 (opposite parity, no T4/T5/chain
      exception). T2 neutralizes Red's row5 threat. Precondition (b), (c), and (d) all
      fail: threats have opposite parity (not T4), rows are 4+5 (not T5's 3+6 pair), and
      Red has no lower major threat in col4 to chain-neutralize Yellow's row4. All columns
      score -12 (Red loses). Playing col4 in particular is dominated by Yellow's row4
      major threat completing first.

  - movestring: "10231405030112342031435"
    why_not: |
      Move 23, Yellow to move. Column 3 shows the structural overcut pattern: Yellow
      major threat at col3 row5 (odd, upper) vs Red major threat at col3 row4 (even,
      lower). However, col3 row5 is marked [*] — Red ALSO has a major threat at row5
      via a separate winning line. When Yellow tries the active-forcing sequence
      (play col3 row4 to block Red's row4 and create a check at row5), Red wins
      immediately by playing col3 row5 — completing Red's own row5 major threat.
      Score col3 = -9 (Yellow loses by playing col3). The overcut requires that row R
      is exclusively the current player's threat; here row5 is mutual ([*]), so the
      "active forcing" sequence backfires. Yellow wins instead via col7 row1 (score
      +10): an immediate [*] at col7 row1 that Yellow reaches first.

known_limitations:
  - "The §6.2 base definition specifies opponent's MINOR threat; all three original verified examples involve MAJOR opponent threats. Overcut applies more broadly via T4, T5, or chain T2 — the minor-threat case is the conceptually simplest but not the only form."
  - "T2 interaction is asymmetric: sub-case 3 (Red odd at r, Yellow even at r+1) requires ADJACENT rows; sub-cases 1 and 2 work at any vertical distance. The chain-T2 sub-case depends on which T2 sub-case neutralizes the lower threat first — always apply bottom-up."
  - "Active-forcing detection is dynamic, not static: the column must have odd parity AND it must be the current player's turn at the moment of evaluation. A parity change (opponent plays elsewhere first) can invalidate an active-forcing overcut."
  - "Same-player threats at R and R-1 (adjacent) trigger T1 first — a guaranteed win, not an overcut. T1 must be checked before overcut detection."
  - "Overcut does not guarantee a full game win — it guarantees the current player wins by playing column C. Other threats or zugzwang conditions must still resolve favorably."
  - "A threat resurrected after blocking (§6.4 of the strategy reference) can create false overcut readings; detectors must account for dynamic threat state."

related:
  - "[[allen-t2]] — the undercut mechanism; overcut is the complementary winning case when T2 does not apply"
  - "[[allen-t4]] — same-parity same-column rule; T4 is the direct enabler of the same-parity overcut sub-case"
  - "[[allen-t5]] — row-3+row-6 exception; T5 explicitly overrides T2 for this pair, creating an overcut opportunity"
  - "[[allen-t1]] — adjacent same-player pair; check T1 before overcut (T1 is a guaranteed win, not an overcut)"
  - "[[community-z-threat]] — odd-column parity underpins the active-forcing sub-case; Z-threat columns give the current player first-move advantage"
  - "[[community-undercut]] — mirror concept: the upper threat is the dead one (T2 fires normally)"

implementation:
  status: "shipped 2026-07-30 — spec 052 (Epic 2) US1/US2, see docs/architecture/reason-DECISIONS.md D36/D38"
  notes: |
    `connect-four/server/classifier.js`'s single-role `detectOvercut(board, scores, perspective)`
    (which took a caller-supplied `perspective` that could diverge from the side to move — OI-76)
    was replaced by a role-split pair, mirroring `detectUndercutVictim`/`Beneficiary`:
      - `detectOvercutBeneficiary(board, scores)` — the mover's threat R survives (a rescue
        mechanism applies), `scores[col] > 0`.
      - `detectOvercutVictim(board, scores)` — no rescue applies (default T2 kill), `scores[col] < 0`.
    Both share a private kernel, `detectOvercutCore`, which now recognizes all five mechanisms this
    entry documents, each with its own `reason` string:
      - `'minor_threat'` — mechanism (a); the opponent has NO major threat below R at all, only a
        minor one, sourced via `getMinorThreatWindows`/`minorThreatRowsInColumn` (research.md
        Decision D2 — structurally unreachable before spec 052 Epic 2 US2, since
        `board.reachableThreats` only returns major threats).
      - `'same_parity_t4'` — mechanism (b), `isT4SameParity`.
      - `'t5_row3_row6'` — mechanism (c), `isT5Exception`. **Renamed** from the misapplied
        `'active_forcing'` (D38) — this branch is the Allen T5 rows-3/6 pair, unrelated to the
        mechanism below despite the prior shared label.
      - `'chain_t2'` — mechanism (d), `isT2Blocking` applied bottom-up.
      - `'active_forcing'` — mechanism (e), the NEW branch added by spec 052 Epic 2 US2
        (`isActiveForcing`: `R === Rp + 1` and the column has an odd empty-cell count). Unlike the
        other four, this is NOT a standalone theorem — the false-positive board
        `331324244556605142` below has the identical local shape yet the mover still loses, so the
        production branch additionally requires `scores[col] > 0` directly (not merely the
        caller's role-based score gate) before treating the geometric match as a genuine rescue.
    `classifyPattern`'s `'overcut'` entry calls `detectOvercutVictim` (Phase-C blunder attribution);
    `candidate-generator.js`'s `checkOvercutPredicate` calls `detectOvercutBeneficiary` (puzzle-pool
    candidates) — see D37 for why the two call sites need opposite halves of the split.

last_verified: 2026-07-30
---

## Verbatim source

From `docs/connect-four-strategy-reference.md`, §6.2:

> **Overcutting** occurs when your major threat at (c, r) neutralizes the opponent's
> minor threat at (c, r′) with r′ < r. Because your major threat is in the same
> column and at a higher row, the opponent is forced to play column c to build toward
> their threat — but playing c eventually delivers the column to you, completing your
> major threat first.
>
> Overcutting is less absolute than undercutting; it depends on the column filling
> order and parity.

## Notes

**Relationship to T2 (undercut):** Overcut is the complementary case to T2. T2
describes when the upper threat is *dead* (neutralized by the lower opposite-parity
threat). Overcut describes when T2 fails to fire — the upper threat *survives* and
wins. The four mechanisms that prevent T2 from firing are: (a) minor lower threat, (b)
same-parity pair (T4), (c) T5's row-3+row-6 special case, (d) chain neutralization
from below.

**Three verified sub-cases from the worked examples:**
1. *Same-parity (T4)* — `26533454144531123345224155`: both threats at even rows (4 and
   6). T4 says same-parity threats don't interact; the upper even-row threat wins when
   the current player fills the odd-parity column first.
2. *Active forcing* — `2365213030023306446354465055546` and `2124220033341151151`:
   opposite parity (Red even below Yellow odd), but the current player acts first in
   the odd-parity column, physically blocking the opponent's lower threat and turning
   the upper threat into an immediate check. T2 describes passive endgame resolution;
   active forcing bypasses it.
3. *Chain T2* — `32640344326334662063620`: a third friendly threat below the opponent's
   lower threat kills it via T2 (bottom-up application) before T2 can neutralize the
   upper threat.

**§6.2 says "minor threat" — why do all examples have major lower threats?**
The base definition covers the simplest case (opponent's minor threat → T2 can't fire).
The three given examples are harder cases where T2 *could* fire but is prevented by T4,
active forcing, or chain neutralization. The minor-threat case is subsumed: if the
opponent's threat is minor, T2 simply does not apply regardless of parity or column
height.

**Column parity:** In the same-parity and active-forcing sub-cases, the column having
ODD empty cells is critical — the current player fills the column's odd-indexed positions
(counting from the current height), reaching the cells that block the opponent and
complete their own threat. Even-column parity shifts this advantage to the opponent.
The chain-T2 sub-case (example 3) operates on an even-parity column (6E) because the
mechanism is purely structural (T2 interaction order), independent of who moves first.
