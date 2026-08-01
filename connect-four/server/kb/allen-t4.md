---
id: allen-t4
type: transformation_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 98 (Transformation Rules section, T4)"
  verbatim_quote: |
    T4: Threats with the same row parity have no influence on each other.

    There's no bonus for two odd-row threats in the same column.

    When both players have odd-row threats in the same column, the rows of the
    threats don't matter.

statement: |
  Two major threats in the same column that share the same row parity (both odd
  or both even) do not interact, regardless of which player owns each threat.
  Same-coloured same-parity pairs in one column give no cumulative bonus over a
  single odd-row threat for V1/V2 counting purposes. Opposite-coloured same-parity
  pairs in one column do not cancel each other — neither threat is removed when
  applying V1/V2/V3. T4 applies only to *major* threats; minor threats are out
  of scope. T4 is the same-parity counterpart to T2 (cross-parity neutralization)
  and complements T5 (different-parity threats in one column are also non-interacting,
  but for an entirely different reason — playability rather than parity).

preconditions:
  - "Position contains only major threats (or has been simplified to such via T1–T3)."
  - "Two major threats exist at cells (c, r1) and (c, r2) with r1 ≠ r2 in the same column c."
  - "row_parity(r1) == row_parity(r2), where row_parity(r) = r mod 2 (rows 1,3,5 odd; rows 2,4,6 even)."

formal_predicate: |
  # Input: position P with set of major threats T = {(player, col, row), ...}
  # Output: bool indicating whether T4 applies to the column

  def t4_applies(threats, col):
      column_threats = [t for t in threats if t.col == col]
      if len(column_threats) < 2:
          return False
      # Find any pair with matching parity
      for i in range(len(column_threats)):
          for j in range(i+1, len(column_threats)):
              t1, t2 = column_threats[i], column_threats[j]
              if t1.row % 2 == t2.row % 2:
                  return True
      return False

  # Effect on V1/V2 counting when t4_applies():
  #   Case A (same player, same parity in one column):
  #     Treat the column as contributing exactly ONE odd-threated column
  #     (if odd parity) or ONE even-row threat (if even parity) to that
  #     player's count — not two. No cumulative bonus.
  #   Case B (opposite players, same parity in one column):
  #     Both threats remain; neither is removed. Each is counted toward its
  #     owner's tally. T7 cancellation (if applicable) must then be checked
  #     across *different* columns, not within this one.

worked_examples:
  - movestring: "0004111444466662552525506"
    description: |
      Case A — same player, same parity, same column. Red has two major threats
      at col 4 row 3 and col 4 row 5 (both odd). Column 4 is entirely empty
      (par=6E). No other Red odd-row major threats on the board. Yellow to move.
      T4 predicts the two Red threats give no cumulative V1 bonus — Red is still
      losing because Yellow has a faster winning structure elsewhere, not because
      the two Red threats stack.
    expected_behavior: "solver scores all negative (Yellow wins); col4 row3 and col4 row5 are the only major threats reported; Red's two same-column odd threats do not produce a V1 or V3 win for Red"
    solver_verified: 2026-05-17
    notes: |
      Column 4 is entirely empty so neither threat cell is immediately reachable.
      T4 is a structural/parity rule independent of playability, so this is valid.
      The Yellow win comes from external structure, not from T4 interaction.

  - movestring: "33104201250010221152"
    description: |
      Case B — opposite players, same parity, same column. Red has a major
      threat at col 4 row 3 (odd) and Yellow has a major threat at col 4 row 5
      (odd). T4 predicts neither threat cancels the other — both remain active.
      T7 (cross-column cancellation) does not apply here because both threats
      are in the same column. Red to move; col 4 scores +11 because Red claims
      the row-3 threat immediately, winning before Yellow can use row 5.
    expected_behavior: "Both col4 row3 (R) and col4 row5 (Y) appear in the major threats list; neither is removed. Solver confirms Red wins (+11) by acting first on the lower threat, not by any cancellation of Yellow's threat."
    solver_verified: 2026-05-17
    notes: |
      Illustrates that coexistence is the rule — Red winning here is a consequence
      of move order, not of Yellow's threat being neutralized by T4.

false_positives:
  - movestring: "0110101556565"
    why_not: |
      Two Red major threats at col2 row5 and col6 row5 — same parity (both odd)
      but DIFFERENT columns. T4 does not apply; each threat contributes
      independently to V1 counting as a separate odd-threated column. A naive
      predicate checking only "two same-parity Red threats" without enforcing
      the same-column constraint would incorrectly fire T4 here.
  - movestring: "061625051021"
    why_not: |
      Two Red major threats at col4 row1 (odd) and col4 row2 (even) — same
      column but DIFFERENT parity. T4 requires same parity; this case is T5
      territory. Additionally, rows 1 and 2 are adjacent (differ by 1), so T1
      (adjacent pair) takes precedence over both T4 and T5. A naive predicate
      checking only "two Red threats in the same column" without enforcing
      same-parity would incorrectly fire T4 here.
  - movestring: "05162506102"
    why_not: |
      Two Red major threats at col4 row1 (odd) and col4 row2 (even) — same
      column, adjacent rows (differ by 1). T1 (adjacent pair) takes precedence
      and must be checked before T4. A naive predicate that handles "two threats
      in one column" as a single branch and falls through to T4 before checking
      T1 adjacency would incorrectly fire T4 here.

known_limitations:
  - "Applies only to major threats. Allen explicitly notes (Ch. 4 p. 97) that the transformation rules cover only configurations with major threats; minor threats are outside scope."
  - "Assumes the position has already been simplified via T1 (adjacent pairs absorbed) and T3 (row-2 + row-5 same-colour pair recognized as double odd-row). T4 is applied *after* T1 and T3, not in parallel."
  - "Does not say anything about the *playability* of the upper threat. T4 only addresses non-interaction; whether either threat is actually reachable in a given game tree is a separate question handled by zugzwang analysis (§3 of the prose reference)."
  - "T4 does NOT imply same-parity threats in a column are 'worthless' — they remain individually decisive. The rule only denies *cumulative* effect."

related:
  - "[[allen-t1]] — adjacent pair (always check first; T1 takes precedence over T4 if rows differ by 1)"
  - "[[allen-t2]] — cross-parity neutralization in same column (complementary case)"
  - "[[allen-t3]] — same-colour row-2 + row-5 pair (special same-parity case where T3 fires *instead* of T4, treating the pair as two independent odd-row columns)"
  - "[[allen-t5]] — same-column non-interaction for *different*-parity rows (different mechanism: playability, not parity)"
  - "[[allen-t7]] — cross-column odd-threat cancellation (Black/Red threats in *separate* columns; T4 explicitly does not perform this cancellation within a single column)"
  - "[[allen-v1]] — uses T4's simplification when counting odd-threated columns"
  - "[[allen-v3]] — applies when T4 has collapsed a same-parity pair to a single effective odd-row threat"
  - "[[community-overcut]] — implementation: `detectOvercutCore`'s `isT4SameParity` rescue branch
    emits `reason: 'same_parity_t4'` (`detectOvercutVictim`/`detectOvercutBeneficiary`, spec 052
    Epic 2, `docs/architecture/reason-DECISIONS.md` D38 for the sibling branches' taxonomy)"

last_verified: 2026-07-30
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 98:

> **T4: Threats with the same row parity have no influence on each other.**
>
> There's no bonus for two odd-row threats in the same column.
>
> *[Diagram 1: a single column with two Red threat markers at rows 3 and 5 (abstract column sketch, no surrounding board context).]*
>
> When both players have odd-row threats in the same column, the rows of the threats don't matter.
>
> *[Diagram 2: a single column with one Red threat marker and one Black threat marker at two different odd rows.]*

Note: Allen's T4 illustration is **two abstract column sketches**, not a full board position. There is no Allen-numbered Problem labeled "this demonstrates T4." Worked examples below must be constructed and verified independently.

## Notes

- **Why two cases matter (audit finding):** The previous prose in `docs/connect-four-strategy-reference.md` §2.5 covered only the same-coloured case ("both remain active"). The opposite-coloured case is more common in real games and was lost. This entry makes both cases explicit in `formal_predicate` (Case A / Case B).
- **Interaction with T3:** Allen sequences his rules deliberately. A same-coloured row-2 + row-5 pair is *not* a T4 application — T3 fires first and treats the pair as two independent odd-row columns (i.e., it actually *adds* to the V1 count, opposite of T4). A correct implementation must check T3 before T4.
- **History:** Entry created 2026-05-17 as the template for the strategy KB migration. Source verbatim quote extracted from `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf` via `pdfminer.six`.
