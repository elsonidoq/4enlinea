---
id: community-figure-7
type: heuristic
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§7.2 Figure-7"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  The Figure-7 (or "Figure Seven Trap") is a five-disc configuration for one player
  whose shape resembles the digit "7": three discs on a diagonal arm (ascending),
  three discs on a horizontal arm, sharing one disc at the hinge (top-right of the
  diagonal). The defining property is that it generates exactly two major threats in
  the same column — one from the horizontal arm extension and one from the diagonal
  arm extension. Because both threats are in the same column on adjacent rows,
  the opponent cannot block both: blocking the lower threat immediately exposes the
  upper one as a Major Direct threat, and vice versa. The winning mechanism is
  zugzwang, not a direct fork: at least one threat must be above gravity (not
  immediately playable) so the opponent cannot simply block both in sequence.

short_summary: |
  A five-disc "7"-shaped configuration that generates two major threats in the same
  column; the opponent cannot block both because one is above gravity, making it a
  zugzwang trap rather than a direct fork.
short_summary_es: |
  Figura 7: una configuración de cinco fichas con forma de "7" que genera dos amenazas
  mayores en la misma columna; el rival no puede bloquear las dos porque una está por
  encima de la gravedad (gravity-top), así que es una trampa de zugzwang y no una
  bifurcación directa.

preconditions:
  - "Player P owns all five cells: diagonal arm {(x,y), (x+1,y+1), (x+2,y+2)} and horizontal arm {(x,y+2), (x+1,y+2), (x+2,y+2)}, with (x+2,y+2) as the shared hinge."
  - "Threat cells (x+3,y+2) [horizontal extension] and (x+3,y+3) [diagonal extension] are both in column x+3 — the same-column property."
  - "Both threat cells are empty."
  - "At most one of the two threat cells is gravity-top (the next legally playable cell in col x+3). Two gravity-top threats = direct fork, not Figure-7 zugzwang."
  - "At least one threat cell is above gravity (not immediately playable), providing the zugzwang element."
  - "The hinge cell (x+2,y+2) must be owned by P — if occupied by the opponent, both arms are broken simultaneously."

formal_predicate: |
  # Input: board state, player P
  # Output: list of (x, y) anchors where a valid Figure-7 exists for P

  def find_figure7(board, player):
      results = []
      for x in range(1, 5):        # col x+3 must be within A..G (cols 1..7)
          for y in range(1, 5):    # y+3 must be within rows 1..6
              # Check all five Figure-7 cells owned by player
              cells = [(x,y), (x+1,y+1), (x+2,y+2),   # diagonal arm
                       (x,y+2), (x+1,y+2)]              # horizontal arm (hinge shared)
              if not all(board.owns(player, c) for c in cells):
                  continue
              # Threat cells
              t_horiz = (x+3, y+2)    # horizontal extension
              t_diag  = (x+3, y+3)    # diagonal extension
              if not (board.empty(t_horiz) and board.empty(t_diag)):
                  continue
              # Gravity-top check: count how many threats are immediately playable
              h = board.height(x+3)   # current top of col x+3
              gravity_top_count = sum(1 for t in [t_horiz, t_diag] if t[1] == h + 1)
              # DEAD CODE (noted 2026-07-30, spec 052 / OI-62): this branch can never be
              # taken. Both threat cells live in the SAME column x+3 at ADJACENT rows
              # (t_horiz = (x+3, y+2), t_diag = (x+3, y+3)), and only one row per column can
              # equal the gravity top h+1 — so gravity_top_count is structurally in {0, 1}
              # and never reaches 2. Kept verbatim because it is the source's own wording;
              # do NOT treat "direct fork rejected here" as a live rule when porting this
              # predicate to code. The check that actually does the work is the
              # `above_gravity == 0` test below.
              if gravity_top_count >= 2:
                  continue    # direct fork, not Figure-7 zugzwang — skip
              # Above-gravity requirement: at least one threat is latent
              # (Also dead, for the same reason — see the note above.)
              if gravity_top_count == 2:
                  continue    # already rejected above
              above_gravity = sum(1 for t in [t_horiz, t_diag] if t[1] > h + 1)
              if above_gravity == 0:
                  continue    # both threats immediately playable — plain fork
              results.append((x, y))
      return results

  # Note: (x+4,y+2) — one more step along the horizontal arm — is NOT a valid
  # completing cell for an Incomplete-7. A naive predicate treating col x+4 as
  # a threat column will fire on positions that are not Figure-7 traps.

worked_examples:
  - movestring: "43222430403"
    description: |
      After 11 moves (Yellow to move). Red has the canonical Figure-7 at anchor (x=3, y=1):
      diagonal arm {C1(col3r1), D2(col4r2), E3(col5r3)}, horizontal arm {C3(col3r3), D3(col4r3)},
      hinge E3(col5r3). Threats at F3(col6r3) [horizontal] and F4(col6r4) [diagonal] — both
      in col6. Col6 is empty (height=0): F3 is gravity-top (immediately playable, row 3 = h+1?
      No: height of col6 = 0, so gravity-top is row1. F3 = row3, above gravity; F4 = row4,
      above gravity. Both above-gravity → pure zugzwang Figure-7.
      Solver: all Yellow scores −12 to −14 (Yellow loses = Red wins). Red wins via Figure-7.
    expected_behavior: "all Yellow solver scores negative (Red wins); major threats at col6 row3(R) and col6 row4(R) — both in same column; both above gravity (col6 height=0)"
    solver_verified: 2026-05-17
    notes: |
      Red also has additional threats at col2 row3(R) and col2 row4(R) — a mirror
      Figure-7 at the left side. The canonical example focuses on the right-side threats
      in col6. Red's extra disc at E1(col5r1) does not break the Figure-7 but does
      create additional threat complexity.

false_positives:
  - movestring: "30321143442"
    why_not: |
      After 11 moves (Yellow to move). Red has discs at B1, C2, D1, D2, E1, E2 forming
      a partially overlapping shape. The major threat is at col6 row2 (R) — the horizontal
      line C2-D2-E2 with F2 empty. A naive Figure-7 detector may fire if it treats F2
      (= col6 row2) as the far-arm-end (x+4, y+2) of a diagonal-base at (col2, row0)
      or similar. This is a false positive: F2 is the far-arm-end extension, not the
      standard completing cell adjacent to the hinge. The correct Figure-7 completing
      cells are only the hinge cell itself (when empty) or the cell immediately adjacent
      to an already-placed hinge. Far-arm-end cells produce horizontal-extension threats
      that pass a gravity check but are not a Figure-7 zugzwang trap.
      Additionally, Yellow wins here (solver: col3 = +15 for Yellow), so the position
      is a Red loss, confirming the shape does not constitute a functional Figure-7.
    notes: |
      Hard-derived invariant (see `known_limitations` below): "The far arm end (x+4,y+2)
      is NOT a valid completing cell — it creates a horizontal-extension above-gravity
      threat that passes the gravity check but is not a figure-7 trap." Documented
      2026-05-17 as the canonical far-arm-end false positive.

  - movestring: "22233535444"
    why_not: |
      After 11 moves (Yellow to move). Red has the full Figure-7 shape at anchor (3,1):
      {C1, C3, D2, D3, E3} ✓ plus extra disc E1. Col6 has F1=Yellow(row1) and F2=Yellow(row2),
      so both threat cells F3(row3) and F4(row4) are gravity-top (immediately playable
      as row3 = height+1 and row4 = height+2 with height=2).
      Gravity-top count = 1 (F3 is gravity-top, F4 is one above). Wait — height(col6)=2,
      so gravity-top = row3 (one gravity-top). F4 is above gravity.
      Despite gravity_top_count=1 (passes the ≤1 filter), the solver confirms all scores
      −15 for Yellow (Red wins), but the win mechanism is through the simultaneous
      availability of both threats in the same column — a more direct forcing sequence than
      the pure zugzwang that characterizes the canonical Figure-7 puzzle category.
      Puzzle curators should note: even if the predicate fires, positions where col x+3
      is heavily pre-filled (reducing the zugzwang depth) teach a weaker version of the
      concept.
    notes: |
      This is a borderline case: the predicate filters correctly (gravity_top_count=1,
      above_gravity=1), but the pedagogical quality is lower because F3 is immediately
      playable. The purest Figure-7 puzzles have col x+3 empty (both threats latent),
      as in the worked example above. This false positive documents the edge of the
      predicate's scope for puzzle selection.

known_limitations:
  - "Far-arm-end exclusion: (x+4,y+2) is not a valid completing cell for the Figure-7 predicate. Detectors that check 'any cell in col x+4' will fire false positives. Only (x+3,y+2) and (x+3,y+3) are the Figure-7 threat cells."
  - "Gravity-top count must be ≤ 1. Two gravity-top threats = direct fork; the Figure-7 zugzwang mechanism does not apply. Empirically derived during detector implementation (see 'Hard-derived invariants' note below)."
  - "At least one above-gravity threat is required. If both threats are gravity-top (pure fork), classify as plain double-threat, not Figure-7."
  - "Hinge cell (x+2,y+2) must be owned by the player. If the hinge is empty (Incomplete-7) or opponent-owned (both arms broken), the Figure-7 predicate does not fire."
  - "Community term: not found in Allis, Tromp, or Allen. The geometry and forced-win logic are independently verified but no peer-reviewed source names this pattern 'Figure-7'."
  - "Mirror-7 (horizontal reflection: f(col) = 7-col+1) and Inverted-7 (diagonal descends, rows 4-6) require separate predicate instances with reflected/inverted coordinates."

related:
  - "[[allen-j-configuration]] — J Configuration and Figure-7 can share cells in adjacent columns, producing the Sextuple Threat"
  - "[[community-sextuple-threat]] — dense overlap of J-Config and Figure-7 sharing D3/E3"
  - "[[community-z-threat]] — the Figure-7 zugzwang relies on at least one above-gravity threat acting as a Z-Threat"
  - "[[allis-baseinverse]] — the same-column double-threat is a specialised Baseinverse: opponent can block only one of the two threats"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §7.2:

> *(The "Figure-7" or "Figure Seven Trap" is a widely used community term — standard in play guides and tutorials (play4row, Reader's Digest, YouTube) but not found in academic Connect Four literature (Allis, Tromp, Allen). The geometry and forced-win logic are independently verified.)*
>
> **What it is:** Five discs forming the shape of the digit "7" — three in a diagonal, three in a horizontal, sharing one disc at the intersection. The defining property is that it generates two threats **in the same column** on adjacent rows, making it impossible to block both.

## Notes

- **Why same-column matters:** The Figure-7's forced win relies on the two threats occupying adjacent rows in the same column. Blocking the lower immediately makes the upper a Major Direct threat (height increases by one). This is structurally distinct from a two-column fork, where the opponent can choose which threat to block first.
- **Hard-derived invariants:** Three invariants were empirically derived during detector implementation and are not obvious from the shape alone: (1) far-arm-end exclusion, (2) gravity-top count ≤ 1, (3) above-gravity requirement (all three listed under `known_limitations` above). These belong in the detector's filter logic, not just in documentation.
- **Canonical shape variants:** Mirror-7, Inverted-7, and Incomplete-7 are documented in §7.2. Each requires a separate formal predicate instance.
