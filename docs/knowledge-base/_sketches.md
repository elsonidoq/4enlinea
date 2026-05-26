# Schema stress-test sketches

These are deliberately incomplete drafts used to validate the schema against three other entry types before bulk migration. **Do not consume these as authoritative.** Only `allen-t4.md` is template-quality.

For each sketch we record: which fields fit cleanly, which were awkward, and any schema changes the sketch motivated.

---

## Sketch 1: `allis-claimeven` — canonical strategic rule

```yaml
id: allis-claimeven
type: strategic_rule
canonical: true
source:
  doc: allis_1988
  location: "Ch. 6 §6.1 (formal definition); Ch. 5 §5.2 (informal intro)"
  verbatim_quote: |
    A Claimeven is a single square of even row, occupied by White, such that
    the square directly below it is occupied by Black, … [exact wording TBD
    on verification]
statement: |
  A Claimeven is a single even-row square owned by Black where the cell below
  is owned by Red. Black uses it as a "claim" on the even square: whenever Red
  plays the column, Black takes the even cell directly above. Claimevens are
  the most fundamental of the nine Allis rules and the only one needed if the
  whole board is composed of Claimeven pairs.
preconditions:
  - "row is even (rows 2, 4, 6)"
  - "the cell directly below is occupied (any colour, in practice typically Red)"
formal_predicate: |
  def is_claimeven(board, col, row):
      return (row % 2 == 0
              and 2 <= row <= 6
              and board[col][row-1] is not EMPTY)
worked_examples:
  - movestring: PENDING
    description: "Standard Black-wins-from-claimeven endgame position."
    expected_behavior: "c4solver: Black wins; every column has even empty count."
    solver_verified: PENDING
false_positives:
  - movestring: PENDING
    why_not: "Even cell with empty cell below — not yet a Claimeven, only a 'potential' Claimeven."
known_limitations:
  - "Requires Black to also control zugzwang (no unrefuted Red odd-row threat). Allis §4.5."
  - "Cell (col, row) must not already be part of a more complex construction (BaseInverse, AfterEven, etc.)."
related:
  - "[[allis-baseinverse]]"
  - "[[allen-t6]] — Red even-row threats are worthless, mechanism-adjacent"
last_verified: PENDING
```

**Fit check:** Schema accommodated cleanly. `canonical: true` + Allis source location works. `formal_predicate` is shorter than T4's because the test is purely local; that's fine — schema doesn't mandate a minimum size.

**Awkwardness:** None. `preconditions` lists are short for strategic rules versus transformation rules. Acceptable.

---

## Sketch 2: `community-figure-7` — project-local heuristic

```yaml
id: community-figure-7
type: heuristic
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§6 (Tactical Patterns)"
  verbatim_quote: |
    [project-local heuristic; no canonical source. The L-shape / Figure-7
    refers to a 4-cell pattern frequently seen in winning sequences …
    exact wording per project doc]
statement: |
  A "Figure 7" is a project-local label for a specific L-shaped 4-cell
  occupation pattern in which a player has two horizontally-adjacent discs
  at row r and one vertically-adjacent disc above, forming a 90° tactical
  outline. It is a *heuristic* visual cue, not a proven win condition.
preconditions:
  - "Three discs of one colour at (c, r), (c+1, r), (c+1, r+1) — or any rotation."
formal_predicate: |
  def is_figure_7(board, player, c, r):
      # canonical orientation; rotate for the other three
      return (board[c][r] == player
              and board[c+1][r] == player
              and board[c+1][r+1] == player)
worked_examples:
  - movestring: PENDING
    description: "Common Figure-7 from puzzle dataset, leading to a diagonal win."
    expected_behavior: "Pattern detector fires; solver confirms Red wins within N plies."
    solver_verified: PENDING
false_positives:
  - movestring: PENDING
    why_not: "Pattern present but opponent has a faster threat — pattern is not predictive in this context."
  - movestring: PENDING
    why_not: "Pattern present but blocked by opponent disc at the diagonal extension cell — no win sequence."
known_limitations:
  - "Heuristic, not a theorem. Empirically correlates with winning sequences in the project's puzzle dataset but admits counter-examples."
  - "Pattern detection has 4-way rotational symmetry; implementations must check all rotations."
  - "Useful as a UI highlight or a candidate generator; NOT safe as a win predicate. Use solver to verify."
  - "Definition has drifted in informal team discussion (some include reflections, some not). Canonicalize against project doc only."
related:
  - "[[community-j-shape]] — similar L-shape with different orientation"
  - "[[allen-t1]] — when the Figure-7 includes a vertical adjacent threat pair, T1 may apply and the heuristic becomes a theorem"
last_verified: PENDING
```

**Fit check:** Schema accommodated. `canonical: false` flag is doing exactly the work intended — downstream consumer knows not to cite this as authoritative. `known_limitations` is *longer* for heuristics than for canonical rules; that's correct and the schema doesn't impose a ceiling.

**Awkwardness:** `source.verbatim_quote` for a project-local heuristic is awkward — there is no canonical wording to quote verbatim. Resolution: allow the field to contain "no canonical source; see linked project doc" plus the relevant project paragraph. The schema's `canonical: false` flag already signals this; no schema change needed.

---

## Sketch 3: `allen-j-configuration` — canonical tactical pattern

```yaml
id: allen-j-configuration
type: tactical_pattern
canonical: true
source:
  doc: allen_2010
  location: "Ch. 5, p. TBD (J Configuration section)"
  verbatim_quote: |
    [verbatim Allen wording to be extracted; J Configuration is a 4-cell
    arrangement where …]
statement: |
  The J Configuration is a 4-cell occupation pattern named for its J-shape
  outline, in which Red occupies … [details]. It guarantees Red a forced
  win-or-zugzwang resolution under specific surrounding-board conditions.
preconditions:
  - "Cells (c, r), (c+1, r), (c+1, r+1), (c+1, r+2) — or symmetric mirror."
  - "Row r is odd (the J-pattern's parity is load-bearing)."
formal_predicate: |
  def is_j_configuration(board, player, c, r):
      return (r % 2 == 1
              and board[c][r] == player
              and board[c+1][r] == player
              and board[c+1][r+1] == player
              and board[c+1][r+2] == player)
worked_examples:
  - movestring: PENDING
    description: "Allen's canonical J-configuration example from Ch. 5."
    expected_behavior: "Solver: Red wins via the J-configuration's implied forced sequence."
    solver_verified: PENDING
false_positives:
  - movestring: PENDING
    why_not: "Pattern present but Black has a row-(r-1) blocking threat — J does not fire."
  - movestring: PENDING
    why_not: "Same geometry on an even-r anchor — J Configuration requires odd anchor (preconditions)."
known_limitations:
  - "Allen defines the J Configuration as a canonical *pattern*, but its win-implying force is conditional on no Black counter-pattern at row (r-1). The pattern itself is necessary, not sufficient."
related:
  - "[[community-figure-7]] — looser, project-local cousin without the parity precondition"
  - "[[allen-v3]] — J typically resolves to a V3 odd-threat win"
last_verified: PENDING
```

**Fit check:** Schema accommodated. `formal_predicate` over a 4-cell configuration fits the same shape as `community-figure-7`'s, distinguished only by the `canonical: true` flag and the parity precondition.

**Awkwardness:** `preconditions` and `formal_predicate` overlap somewhat (the parity check appears in both). This is intentional — `preconditions` is for human/LLM context, `formal_predicate` is what gets implemented. They are allowed to restate each other.

---

## Schema changes motivated by sketches

None. The three sketches each fit cleanly with the schema as defined in `README.md` and exemplified in `allen-t4.md`. The schema is template-ready for bulk migration.

Minor convention decisions:

- For project-local heuristics, `source.verbatim_quote` may say "no canonical source; see linked project doc" rather than a literal quote — the `canonical: false` flag already disambiguates downstream use.
- `preconditions` and `formal_predicate` are *both* required even when they overlap; they serve different consumers.
- `solver_verified: PENDING` is the acceptable placeholder during entry drafting; entries are not considered template-quality until at least one worked example has a real date and confirmed movestring.
