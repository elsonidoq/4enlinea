You are a coordinator agent reviewing Connect Four puzzle candidates for correctness.

  ## Context

  You are working in the repository at /Users/elsonidoq/prog/cuatro_en_linea.

  There is a PostgreSQL database accessible via the server at connect-four/server. The candidates table has columns: id, movestring, category, correct_col, highlight_metadata, category_evidence, status.

  The six new puzzle categories being reviewed are: z_threat, claimeven, undercut, overcut, figure_7, j_shape. Each is defined in detail in specs/008-new-puzzle-categories/spec.md.

  The knowledge base for tactical patterns lives in docs/knowledge-base/ — read the relevant entries for each category before reviewing.

  **Important**: Read `docs/architecture/index-conventions.md` before evaluating any candidate. All coordinate fields in the DB (`correct_col`, `highlight_metadata.column`, `highlight_metadata.row`, `highlight_metadata.fromRow`, `highlight_metadata.toRow`) are **0-indexed** (columns 0–6, rows 0–5 bottom-to-top). The c4solver binary requires 1-indexed input, but that conversion happens only inside `c4solver-wrapper.js` — do not apply it yourself.

  ## Your Task

  Spawn exactly 6 sub-agents in parallel, one per category. Each sub-agent receives the instructions below (customised for its category). After all 6 complete, gather their reports and write a consolidated false-positive review to disk at
  `docs/candidate-review-2026-05-20.md` (today's date: 2026-05-20).

  ---

  ## Instructions for each sub-agent

  You are reviewing Connect Four puzzle candidates for the category: **{{CATEGORY}}**

  ### Step 0 — Read coordinate conventions

  Read `docs/architecture/index-conventions.md` before doing anything else. All DB fields (`correct_col`, `highlight_metadata` sub-fields, `movestring` digits) are **0-indexed**. The `par` and `scr` rows in `visualize_board.sh` output are also 0-indexed left-to-right.

  ### Step 1 — Fetch 3 candidates

  The DB connection string is in `connect-four/server/.env` as `DATABASE_URL`. Run:

  ```bash
  source connect-four/server/.env && psql "$DATABASE_URL" -c \
    "SELECT id, movestring, correct_col, highlight_metadata, category_evidence FROM candidates WHERE category='{{CATEGORY}}' AND status='pending' LIMIT 3;"
  ```

  ### Step 2 — Understand the category definition

  Read the following spec sections from `specs/008-new-puzzle-categories/spec.md`:

  - **z_threat**: FR-001, FR-010
  - **claimeven**: FR-002, FR-003, FR-004, FR-011, FR-012
  - **undercut**: FR-005, FR-013
  - **overcut**: FR-006, FR-014
  - **figure_7**: FR-007, FR-015
  - **j_shape**: FR-008, FR-016

  Also read the knowledge base file(s) for **{{CATEGORY}}**:

  - **z_threat**: `docs/knowledge-base/community-z-threat.md`
  - **claimeven**: `docs/knowledge-base/allis-claimeven.md`
  - **undercut**: `docs/knowledge-base/allen-t2.md`
  - **overcut**: `docs/knowledge-base/community-overcut.md` and `docs/knowledge-base/allen-t2.md`
  - **figure_7**: `docs/knowledge-base/community-figure-7.md`
  - **j_shape**: `docs/knowledge-base/allen-j-configuration.md`

  ### Step 3 — Visualize each candidate

  For each of the 3 candidates, run from the project root:

  ```bash
  ./visualize_board.sh <movestring>
  ```

  Read the output carefully:
  - The raw board and annotated board show piece placement and threats.
  - The `par` row shows per-column empty-cell parity (O = odd, E = even), columns 0–6 left-to-right.
  - The `scr` row shows c4solver scores per column, columns 0–6 left-to-right.
  - The major threats list shows every [R]/[Y] cell explicitly as `colC rowR (player)`, 0-indexed.

  ### Step 4 — Evaluate each candidate

  All coordinates below are 0-indexed. Apply the formal predicate for **{{CATEGORY}}** from the spec to what you observe on the board. For each candidate, determine:

  - **VALID**: The board position satisfies the category definition.
  - **FALSE POSITIVE**: The board position does not satisfy the definition — state exactly which condition fails.
  - **UNCERTAIN**: You cannot determine validity from the available information — state what is missing.

  Category-specific checks:

  - **z_threat**: Count empty cells from column height up to the first threat cell in the identified column. Is the count odd? Is there exactly one such column? Does the stored `correct_col` (0-indexed) match? Does `highlight_metadata.fromRow` equal the current column height (0-indexed) and `toRow` equal the threat row (0-indexed)?
  - **claimeven**: Check `category_evidence.subtype` (A or B). For subtype A: is there a unique move that makes all columns have even empty-space counts? For subtype B: are exactly two columns odd (the baseinverse pair), did the opponent (the player who just moved, not the player to move) play in one of those two columns, and is `correct_col` (0-indexed) the other odd column? Verify the `simulation_trace` in `category_evidence` is plausible (alternating players, ends in Yellow win).
  - **undercut**: Is there a column C where the current player has a threat at row R, and the opponent has a threat at R' < R in the same column? Does `highlight_metadata` name `killing_threat` and `dead_threat` cells (0-indexed) that match this? Does `correct_col` (0-indexed) point to a column other than C?
  - **overcut**: Is there a column C where the current player's threat at row R is above the opponent's threat at row R' < R in the same column, and the opponent cannot activate their lower threat? Does `highlight_metadata` name `major_threat` and `neutralised_threat` cells (0-indexed) matching this?
  - **figure_7**: Do the 4 cells in `highlight_metadata.cells` (role: pattern_piece, 0-indexed) plus the `correct_col` (0-indexed) form one of the Figure-7 structural variants defined in FR-007? Are the 4 cells actually occupied by the current player on the board?
  - **j_shape**: Do the 3 cells in `highlight_metadata.cells` (role: pattern_piece, 0-indexed) plus the `correct_col` (0-indexed) form the J-shape structure defined in FR-008? Are the 3 cells actually occupied by the current player? Is the completing cell playable (at column height)?

  ### Step 5 — Output your report

  Return a structured report in this format:

  Category: {{CATEGORY}}

  Candidate

  - Movestring:
  - correct_col:
  - Board summary: <2–3 sentences describing what you see — key threats, parity, relevant structure>
  - Verdict: VALID / FALSE POSITIVE / UNCERTAIN
  - Reasoning: <1–3 sentences citing the specific spec condition that passes or fails>

  Candidate

  ...

  Summary

  - Valid: N/3
  - False positives: N/3 (list IDs)
  - Uncertain: N/3 (list IDs)

  ---

  ## Coordinator: after all 6 agents finish

  Collect all six category reports. Write the file `docs/candidate-review-2026-05-20.md` with:

  1. A header summarising total valid / false positive / uncertain counts across all 6 categories.
  2. Each category's full report (pasted verbatim from the sub-agent).
  3. A "Recommended actions" section listing:
     - Any candidate IDs flagged as FALSE POSITIVE — recommend marking them `status = 'rejected'`.
     - Any UNCERTAIN candidates — recommend manual curator review.
     - Any category where all 3 sampled candidates are valid — mark as "classifier appears healthy for sampled positions".
