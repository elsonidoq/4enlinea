---
id: community-sextuple-threat
type: heuristic
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§7.2 Figure-7 (footnote)"
  verbatim_quote: "no canonical source; see linked project doc"
statement: |
  A Sextuple Threat is a project-local label for the dense overlap that arises when
  a J Configuration and a Figure-7 structure share adjacent cells, most commonly
  D3 and E3. The J Configuration contributes two threats (horizontal + diagonal
  from E3 region); the Figure-7 contributes two more (F3 + F4 in the same column).
  The combined structure can produce up to six simultaneous winning continuations
  for the player, making refutation practically impossible. This is a project-specific
  heuristic label; no external source catalogues it.

preconditions:
  - "Player P has a J Configuration: owns {D1, D3, E2, E3} (canonical anchor)."
  - "Player P simultaneously has a Figure-7: owns {C1, C3, D2, D3, E3} (canonical anchor), sharing D3 and E3 with the J Configuration."
  - "The resulting combined disc set is {C1, C3, D1, D2, D3, E2, E3} — seven cells owned by P."
  - "All threat cells for both patterns are empty."

formal_predicate: |
  # Sextuple Threat = J Configuration ∩ Figure-7 with shared anchor cells

  def is_sextuple_threat(board, player):
      # Canonical check (one orientation; mirror and shifted variants require separate checks)
      j_cells    = [(4,1),(4,3),(5,2),(5,3)]      # D1, D3, E2, E3 (col, row)
      fig7_cells = [(3,1),(3,3),(4,2),(4,3),(5,3)] # C1, C3, D2, D3, E3
      all_cells  = set(j_cells + fig7_cells)       # {C1,C3,D1,D2,D3,E2,E3}
      if not all(board.owns(player, c) for c in all_cells):
          return False
      # Verify threat cells for both patterns are empty
      j_threats    = [(6,3),(7,4)]   # F3, G4 from J-Config
      fig7_threats = [(6,3),(6,4)]   # F3, F4 from Figure-7 (F3 shared with J-Config)
      all_threats  = set(j_threats + fig7_threats)  # {F3, G4, F4}
      if not all(board.empty(t) for t in all_threats if board.in_bounds(t)):
          return False
      return True

  # Shared threat: F3(col6,row3) appears in both J-Config (horizontal) and Figure-7.
  # Unique threats: G4(col7,row4) from J-Config diagonal, F4(col6,row4) from Figure-7.
  # Result: up to 3 distinct threat cells (F3, F4, G4) requiring simultaneous defence.

worked_examples:
  - movestring: "PENDING"
    description: |
      Canonical orientation: Red owns {C1, C3, D1, D2, D3, E2, E3} — the seven cells
      combining J-Config {D1,D3,E2,E3} and Figure-7 {C1,C3,D2,D3,E3}.
      Threat cells: F3(horizontal from both J and Fig7), F4(diagonal from Fig7),
      G4(diagonal from J-Config). Red has three distinct winning continuations;
      Yellow cannot block all three. Constructing this as a real game position
      requires seven Red discs in a specific arrangement — deferred to PENDING.
    expected_behavior: "PENDING — solver verification required once a clean movestring is constructed"
    solver_verified: PENDING
    notes: |
      Seven Red discs with interleaved Yellow is difficult to construct in a legal
      game sequence. Use c4solver to confirm the position is a forced Red win once
      a valid movestring is found.

false_positives:
  - movestring: "PENDING"
    why_not: |
      The naive Sextuple Threat predicate fires on any position where Red has all
      seven anchor cells, regardless of whether the threats are reachable. A false
      positive arises when F3 or G4 is already occupied by Yellow (removing the
      shared threat), reducing the structure to a plain J-Config or Figure-7 rather
      than a true Sextuple Threat. Detector must verify all three threat cells are
      empty. Specific movestring deferred to PENDING.
    notes: "predicate requires all threat cells empty; failure to check leads to false positives when shared threats are blocked"

known_limitations:
  - "Project-specific label: no external source (Allis, Allen, Tromp, community guides) names this structure 'Sextuple Threat'. The geometry is verified but the term is internal."
  - "Canonical orientation only: the formal predicate covers {C1,C3,D1,D2,D3,E2,E3}. Variants (mirror, shifted J-Config at {C1,C3,D2,D3}, different diagonal direction) require separate predicate instances."
  - "Constructability: seven Red discs in the specified pattern requires a specific legal game sequence. Not all abstract anchor combinations are reachable from a legal start. Verify any purported Sextuple Threat position with c4solver."
  - "The three threat cells (F3, F4, G4) are not all in the same column — F4 and G4 are adjacent but separate columns. The Figure-7 same-column property (F3+F4) is preserved; the J-Config adds G4 in a different column."
  - "Dependent on both J-Config and Figure-7 being present simultaneously; if either sub-pattern is broken (opponent disc in a key cell), the Sextuple Threat degrades to the remaining sub-pattern only."

related:
  - "[[allen-j-configuration]] — one of the two sub-patterns that combine into the Sextuple Threat"
  - "[[community-figure-7]] — the other sub-pattern; shares D3 and E3 with the J Configuration"
  - "[[allis-baseinverse]] — the Sextuple Threat is a multi-column generalisation of Baseinverse: three separate threats the opponent cannot all block"

last_verified: 2026-05-17
---

## Verbatim source

From `docs/connect-four-strategy-reference.md` §7.2 (footnote):

> *A denser overlap — sometimes called a "Sextuple Threat" in this project — can arise when J Configuration and Figure-7 structures share adjacent columns. This is a project-specific heuristic label; no external source catalogues it.*

## Notes

- **Origin:** The label arose during the puzzle-category taxonomy design for this project (see `specs/008-new-puzzle-categories/`). It was coined to describe positions where J-Config and Figure-7 co-occur and multiply the threat count beyond what either pattern alone would produce.
- **Why "sextuple":** In theory, the two patterns together can generate up to 3 distinct empty threat cells (F3, F4, G4). Combined with vertical and other minor threats that may also be present, the total can reach six. The name is aspirational/descriptive, not a strict count guarantee.
- **Practical use:** This label is used during puzzle generation to flag positions requiring extra explanation — a player facing a Sextuple Threat needs to recognise both the J-Config and Figure-7 sub-patterns to understand why defence is impossible.
