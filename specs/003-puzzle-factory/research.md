# Research: Puzzle Factory

**Phase 0 output** | Feature: `003-puzzle-factory` | Date: 2026-05-04

---

## Decision 1: "Forbidden Columns" is category 7 — a gap in the existing schema

**Decision**: Treat Forbidden Columns as a new, distinct category (category 7) that requires a schema extension to the `puzzles` table (`CHECK (category BETWEEN 1 AND 7)`), a new predicate type string `'forbidden_columns'`, and a new implementation in `predicates.js`.

**Rationale**: The internal_tool.md spec lists 7 categories including Forbidden Columns. The existing DB migration (`003_puzzles.sql`) only supports categories 1–6. The generator and predicate checklist both need to handle this category. It cannot be collapsed into an existing category — its predicate logic (simulate each legal column; check whether opponent has an immediate win after) is distinct.

**Alternatives considered**:
- Scope Forbidden Columns out of this feature and treat it as a future addition — rejected because the spec explicitly lists it and the generator must produce candidates for it.
- Map it to category 2 (Forced Block) — rejected because the semantics differ: Forced Block is "only one column prevents loss"; Forbidden Columns is "which columns must be avoided (≥1 forbidden column exists)".

---

## Decision 2: Candidate storage — new Supabase tables (not files)

**Decision**: Persist candidates and false-positive records in new Supabase PostgreSQL tables (`candidates`, `false_positive_records`) created via a new migration.

**Rationale**: The existing project already uses Supabase as its persistence layer. Using the same storage means the existing `requireLocalhost` server handles queries consistently, the annotator UI can use the same API pattern (fetch + REST), and records survive server restarts. File-based storage (JSON files) would require manual cleanup and would not support the dashboard count queries efficiently.

**Alternatives considered**:
- In-memory storage (lost on restart) — rejected: generation jobs can take minutes; annotator should be able to pick up where they left off.
- Flat JSON files — rejected: harder to query counts per category; duplicate detection requires full file scan.

---

## Decision 3: Generation job execution — synchronous per-category batch (no background workers)

**Decision**: Generation jobs run synchronously in the request handler with a generous timeout (60s). The frontend polls or uses a loading state while generation completes. No message queue, no worker threads beyond Node's event loop.

**Rationale**: The tool is single-user and internal. A generation run for one category producing ~30–50 candidates takes a few seconds at most (game simulation + solver calls per position). The complexity of a job queue (Bull, Redis) is not justified. A 60-second HTTP timeout is sufficient for MVP batch sizes.

**Alternatives considered**:
- Server-Sent Events / WebSocket for streaming progress — deferred to a future enhancement if generation time proves unacceptable.
- Worker threads — overkill for single-user internal tool.

---

## Decision 4: Reuse existing `predicates.js` logic for candidate filtering

**Decision**: The candidate generator reuses the predicate evaluation logic already in `predicates.js` (server-side) to filter positions. It does NOT duplicate predicate logic in a separate module.

**Rationale**: `predicates.js` already implements correct predicate evaluation for all 6 existing categories. The generator needs to check whether a generated position satisfies a category's goal predicate — the same logic the solver uses to score user attempts. Sharing the implementation avoids drift between "what counts as a valid puzzle" and "what counts as a correct user answer."

**Alternatives considered**:
- Separate "lighter" predicate filter for generation — rejected: would create two divergent implementations of the same logic, which is the exact class of bug the Constitution (Principle II) warns against.

---

## Decision 5: Cleanliness is enforced by the generator, not a UI toggle

**Decision**: Distractor detection (FR-009) is fully automated in the candidate generator. Any position where (a) an immediate winning move exists for a non-category-1 puzzle, or (b) the goal predicate is satisfied by more than one move, is rejected before being inserted into the candidate queue. No Cleanliness Check toggle appears in the curation workspace for single-move categories.

A lightweight shortcut-move indicator is retained only inside the MultiMoveSequencer (Fork Setup / Parity): at each intermediate step, columns that would immediately win the game are visually flagged so the annotator avoids shortcutting the sequence.

**Rationale**: The generator already has all solver scores and can apply the check programmatically with zero annotator effort. Moving the check to generation time reduces cognitive load, eliminates a source of human error, and simplifies the workspace UI. The multi-move case is the only one where the generator cannot pre-check cleanliness, because cleanliness depends on the specific AI response moves the annotator will choose.

**Alternatives considered**:
- UI toggle in the curation workspace — rejected: adds annotator cognitive load for a check the generator can perform automatically.
- Remove all cleanliness feedback from the UI — rejected: the multi-move sequence shortcut case is genuinely undecidable at generation time.

---

## Decision 6: Multi-move cooperative response — server validates legal moves only

**Decision**: When an annotator defines cooperative AI response moves for Fork Setup / Parity puzzles, the server validates only that the chosen column is a legal move (column not full). It does NOT automatically filter out "non-cooperative" moves — it only flags them visually by showing the solver score for each column so the annotator can make an informed choice.

**Rationale**: Determining whether a move "prematurely blocks the pattern" requires understanding the specific pattern being taught, which is subjective and context-dependent. The annotator is the human expert here. The UI displays solver scores per column so the annotator can see which moves are strong or weak for the opponent — this is sufficient signal without requiring a complex "cooperativeness" classifier.

---

## Decision 8: Non-deterministic generation with optional seed for reproducibility

**Decision**: The generator uses a seeded PRNG for all random choices (opening move selection, weighted move sampling). When no seed is supplied by the caller, one is drawn from `Math.random()` at the start of the run. The seed is returned in the API response and stored on every candidate row, so any batch can be reproduced exactly by re-running `POST /api/admin/generate` with the same `category`, `count`, and `seed`.

The UI displays the seed after each generation run so the annotator can note it. An optional seed input on the Generate form allows deliberately reusing a previous seed.

**Rationale**: Default non-determinism ensures consecutive "generate more" runs produce different boards, preventing the annotator from seeing the same positions repeatedly. Storing the seed provides a reproducibility escape hatch for debugging or re-auditing a batch without adding operational complexity (no migration history table needed — the seed is on every row).

**Alternatives considered**:
- No seed tracking at all — rejected: makes it impossible to reproduce a batch if a question arises about a specific candidate later.
- A separate `generation_runs` table — rejected: over-engineered; the seed stored on each candidate row is sufficient for reproduction.

## Decision 7: False-positive records are never soft-deleted — only appended

**Decision**: False-positive records are append-only. Once created, they are never deleted or updated. A developer reads them to understand classifier failures.

**Rationale**: These records are a bug log. Deleting or modifying them would destroy the audit trail. The volume will be small (internal tool, bounded usage).
