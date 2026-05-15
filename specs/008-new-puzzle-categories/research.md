# Research: New Puzzle Categories (008)

All algorithms are fully specified in `spec.md` and locked there intentionally
(see feedback: hard-derived algorithms belong in spec, not plan). No NEEDS
CLARIFICATION items remain. This file documents the architectural decisions and
validates assumptions before implementation begins.

---

## Decision 1 — Claimeven simulation placement

**Decision**: Run the full claimeven simulation in `candidate-generator.js` at
candidate generation time, not at predicate evaluation time.

**Rationale**: The simulation calls the solver ~20 times per position (per the
existing memory reference). Doing this at generation time (offline, admin-only)
keeps latency off the learner path. At play time `evaluatePredicate` only needs
the pre-computed `correct_col` from the `puzzles` table — no extra solver calls.

**Alternatives considered**:
- Run at predicate evaluation time: rejected — violates the <3s latency budget
  for solver-required predicates (Principle V) by an order of magnitude.

---

## Decision 2 — highlight_metadata as a stored column, not computed on the fly

**Decision**: Store `highlight_metadata` in both `candidates` and `puzzles`
tables; compute once during candidate generation; copy on approve.

**Rationale**: Highlight metadata for z_threat requires knowing the column height
at generation time (which is stable; the position never changes). Recomputing on
every puzzle load would add solver overhead and risk drift if the classifier
changes. The spec (FR-022, FR-023) mandates this pattern.

**Alternatives considered**:
- Compute from puzzle `moveString` at serve time: rejected — z_threat `fromRow`
  and `toRow` can be computed cheaply from the move string, but undercut/overcut
  cell coordinates require the full predicate scan. Storing is simpler and
  consistent.

---

## Decision 3 — category_evidence stored on candidates only

**Decision**: `category_evidence` is stored in `candidates` (curation support,
FR-024) but NOT copied to `puzzles`. The `puzzles` table only gets
`highlight_metadata`.

**Rationale**: The spec (FR-024, out-of-scope section) explicitly excludes
claimeven subtype from the player-facing API. The simulation trace is curation
metadata, not player-facing data.

---

## Decision 4 — Goal predicate evaluation strategy per category

| Category | Predicate type | Approach at play time |
|---|---|---|
| `z_threat` | Solver-required | `highlightMetadata.column === candidateCol` → correct |
| `claimeven` | Solver-required | `correct_col` column stored on puzzle → check |
| `undercut` | Solver-required | Any col ≠ `highlightMetadata.cells.find(c=>c.role==='killing_threat').column` → correct |
| `overcut` | Solver-required | `highlightMetadata.cells.find(c=>c.role==='major_threat').column === candidateCol` → correct |
| `figure_7` | Solver-required | `correct_col` stored on puzzle → check |
| `j_shape` | Solver-required | `correct_col` stored on puzzle → check |

**Rationale**: All six use pre-computed `correct_col` (single integer) or
`highlight_metadata` to evaluate at play time without any solver call. The
solver was invoked during candidate generation. The `correct_col` column already
exists on `puzzles` for this purpose.

---

## Decision 5 — Multi-category priority

**Decision**: Classification priority order (when multiple classifiers match a
single position): `z_threat` > `undercut` > `overcut` > `claimeven` > `figure_7`
> `j_shape`. New categories run after the five existing categories.

**Rationale**: The spec leaves priority to implementation time. More specific
structural patterns (z_threat, undercut, overcut) are checked before general
strategic patterns (claimeven, figure_7, j_shape). This matches the existing
pattern where more specific cats (forced_win) run after bitboard cats.

---

## Decision 6 — Z-threat capsule rendering approach

**Decision**: Render the capsule in the existing Board component by adding a new
overlay element positioned absolutely over the board cells, using CSS border-radius
to achieve the stadium/capsule shape. The count badge floats above the board frame
using a `position: absolute` element anchored to the column.

**Rationale**: The spec (assumption) states the Board component supports additional
highlight overlays without requiring a fundamental rewrite. The capsule is a pure
CSS shape (two full border-radius ends, straight sides) drawable with a single div.

---

## Dependency validation

| Assumption | Status |
|---|---|
| `interaction_mode = 'single_move'` column exists on `puzzles` | Verified: migration 014 applies it |
| `correct_col` column exists on `puzzles` | Verified: present from earlier migrations |
| `c4solver` binary available at `server/c4solver` | Verified: checked into repo |
| Existing candidate generator uses solver via `createSolverProcess` | Verified: candidate-generator.js line 1 |
| Migration 012 pattern for explicit GRANTs | Verified: documented in memory |
