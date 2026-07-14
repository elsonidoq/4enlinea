---
id: allen-v3
type: victory_rule
canonical: true
source:
  doc: allen_2010
  location: "Ch. 4, p. 101 (Victory Rules section, V3)"
  verbatim_quote: |
    V3: Red wins with an odd-row threat.

    Red's odd-row threat wins.

statement: |
  After T1–T7 simplification, if Red holds exactly one uncancelled major odd-row
  threat and Black holds no uncancelled odd-row threats, Red wins. V3 is the most
  common Red winning scenario: a single uncontested odd-row threat gives Red zugzwang
  control — Black will eventually be forced to play into that column, handing Red the
  win. V3 is checked third among V1–V5, after V1 (three+ Red threats) and V2 (two+
  Black threats). In Allen's victory diagram, V3 explicitly shows Red's one threat
  surviving even when Black has even-row threats in separate columns — those don't
  matter (T6/V4 precedence order ensures V3 fires first).

preconditions:
  - "T1–T7 have been applied."
  - "Red holds exactly one uncancelled major odd-row threat."
  - "Black holds zero uncancelled major odd-row threats."
  - "V1 and V2 did not fire."

formal_predicate: |
  # Input: simplified threat set after T1–T7
  # Output: bool — does V3 apply (Red wins)?

  def v3_red_wins(threats_after_t1_t7):
      red_odd_cols = {t.col for t in threats_after_t1_t7
                      if t.player == RED and t.row % 2 == 1}
      black_odd_cols = {t.col for t in threats_after_t1_t7
                        if t.player == BLACK and t.row % 2 == 1}
      # V3: exactly one Red odd-row threat, zero Black odd-row threats
      return len(red_odd_cols) == 1 and len(black_odd_cols) == 0

  # V3 fires when V1 and V2 are both false. If V1 is already checked,
  # V3 could be simplified to: any odd count of Red odd-row threats (1 or 3+)
  # with no Black odd-row threats. V3 as stated by Allen is the count-1 case;
  # V1 covers count-3+.

worked_examples:
  - movestring: PENDING
    description: |
      After T1–T7, Red holds one uncancelled odd-row threat at (col D, row 3). Black
      holds no odd-row threats (Black may have even-row threats, but those don't
      prevent V3). V3 fires: Red wins.
    expected_behavior: "solver confirms Red wins; single Red odd-row threat controls zugzwang"
    solver_verified: PENDING
  - movestring: "333330211113120000012222"
    description: |
      0-indexed movestring; 24 discs, Red (Green, first player) to move. Columns 1–4
      (display) are full; Red holds a single odd-row major threat in column 5 at row 5
      (cell c5r5), a Z-Threat with a height-relative count of 5 (odd). Black has only an
      even-row threat above it (col5 row6) which, per V3, does not prevent the win. The
      solver scores Red's three legal moves (cols 5,6,7) all +1 — Red wins. This is the
      lock-in node of the reason engine's `namedRule: allen-v3` on the empty-board
      blunder (`""`, played col 4): the production `detectZThreat` confirms the capsule
      at column 5 / row 5 (badgeCount 5), the basis for the V3 name.
    expected_behavior: "solver: Red wins (cols 5/6/7 = +1); detectZThreat confirms one odd-count (5) Z-Threat at c5r5; single uncontested odd-row threat controls zugzwang"
    solver_verified: 2026-07-02
    reverified: |
      spec 044 / FR-020a / T033 (2026-07-11): independently re-ran a direct solver
      query against this exact movestring — confirmed unchanged: cols 0-3 (0-indexed)
      full (-1000, invalid), cols 4/5/6 score +1, matching this entry's description
      verbatim. Note: tasks.md/research.md/memory referred to this entry's existing
      movestring as `77273746`, but that string does not actually appear in this
      file — the entry's real existing movestring is the one above
      (`333330211113120000012222`), which is what was re-verified. (The `77273746`
      string, once corrected from Allen's 1-indexed digits to 0-indexed, equals
      `66162635` — which is a different, already-KB-verified position used as
      allen-t7.md's own second worked example, not this entry's.)

false_positives:
  - movestring: PENDING
    why_not: |
      Red holds one odd-row threat AND Black holds one odd-row threat in a different
      column. T7 would cancel this pair — after T7, neither player has an odd-row
      threat. V5 (Draw) applies, not V3. V3 requires Black to have ZERO odd-row
      threats after T7.
  - movestring: PENDING
    why_not: |
      Red holds one odd-row threat AND Red also holds an even-row threat in another
      column. T6 removes the even-row threat as worthless; the even-row threat does
      not add to V3's count. V3 still fires (one odd-row threat for Red, zero for
      Black). But a naive predicate might double-count Red's even-row threat as an
      extra odd threat — incorrect.

known_limitations:
  - "V3 is the single-threat subset of V1 (which covers three+). Allen lists them separately because V3 is by far the most common endgame scenario."
  - "V3 fires even when Black has even-row threats. Black's even-row threats are only relevant in V4 (when Red has NO odd-row threats at all)."
  - "Must apply T7 before V3: if both Red and Black have one odd-row threat each in separate columns, T7 cancels them — V5 (Draw) not V3."

related:
  - "[[allen-t7]] — must cancel Red-Black odd pairs before checking V3"
  - "[[allen-t6]] — Red's isolated even-row threats are removed before V3 counting"
  - "[[allen-v1]] — three+ Red odd-row threats (checked before V3)"
  - "[[allen-v2]] — Black's win condition (checked before V3)"
  - "[[allen-v4]] — Black's even-row win (checked after V3; only fires if V3 doesn't)"
  - "[[allen-v5]] — Draw when V3 doesn't fire and no other V rule applies"

last_verified: 2026-07-11
---

## Verbatim source

From Allen 2010, *The Complete Book of Connect 4*, Chapter 4, p. 101:

> **V3: Red wins with an odd-row threat.**
>
> Red's odd-row threat wins.
>
> *[Diagram: one column with Red odd-row marker plus other columns with even-row threats → Red wins.]*

## Notes

- **Most common Red win:** V3 is the typical endgame win for Red. After the opening and middle game, if Red has successfully planted one uncontested odd-row threat and Black has not built any countering odd-row threat, Red will win in the endgame.
- **V3 vs V1:** V1 covers the rarer case where Red ends up with three (or odd count ≥3) surviving odd-row threats. V3 covers the most common case: exactly one. The scan order is V1 → V2 → V3, so V3 is only evaluated when V1 doesn't apply.
