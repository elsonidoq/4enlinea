# Implementation Plan: Puzzle Factory (Internal Tool)

**Branch**: `main` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/003-puzzle-factory/spec.md`

---

## Summary

Build an internal web tool that automates puzzle candidate generation for all 7 puzzle categories using the existing `c4solver` binary and `predicates.js` engine, provides a curation workspace UI for annotators to approve/reject candidates (with a false-positive reporting flow for classifier bugs), and exports approved puzzles to the existing `puzzles` table. The feature extends the existing Express + React stack with two new DB tables (`candidates`, `false_positive_records`), new admin API routes, and an enhanced `AdminCuratePage`.

---

## Technical Context

**Language/Version**: JavaScript/Node.js 18+ (backend); React 18 + Vite (frontend)  
**Primary Dependencies**: Express, Supabase JS client, React, react-router-dom; existing `c4solver` binary, `classifier.js`, `predicates.js`  
**Storage**: Supabase PostgreSQL — two new tables via migration `007_puzzle_factory.sql`  
**Testing**: Vitest (unit); real `c4solver` binary (integration, following Constitution Principle III)  
**Target Platform**: localhost only (requireLocalhost middleware); development environment  
**Project Type**: Internal web tool — admin extension of existing web-service  
**Performance Goals**: Column score response <2s (SC-005); predicate filter <100ms cats 1–3, <3s cats 4–6 (Constitution Principle V)  
**Constraints**: No LLM usage (FR-013); no auth beyond network isolation; single annotator  
**Scale/Scope**: ~150 candidates generated to yield 50 approved puzzles; 7 categories

---

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I — Explanation Engine as SSOT | **Not applicable** | Internal tool; no user-facing move evaluations or annotations. Solver and classifier are used as raw services, not through the Explanation Engine interface. |
| II — Code Quality & Simplicity | **Pass** | Candidate generator reuses existing `predicates.js` (no duplication). No speculative abstractions planned. |
| III — Testing Standards | **Requires action** | Predicate evaluation in the generation engine uses the real C++ solver binary → integration tests required. Category 7 (Forbidden Columns) needs positive + negative board fixtures. Tier-gating tests: N/A (internal tool). |
| IV — UX Consistency | **Pass with note** | Curation workspace reuses `Board.jsx` (same color scale). Category 7 label "Forbidden Columns" must match terminology when this category is later surfaced in the main app. |
| V — Performance | **Pass** | SC-005 (2s column response) aligns with Principle V budget. Generation is batch background — loading indicator required within 200ms of job start. |

**Post-design re-check**: No violations introduced by Phase 1 design. Migration is additive only (no existing data modified).

---

## Project Structure

### Documentation (this feature)

```text
specs/003-puzzle-factory/
├── plan.md              ← this file
├── spec.md
├── research.md          ← Phase 0: 7 key decisions (generation strategy, storage, category 7, etc.)
├── data-model.md        ← Phase 1: candidates + false_positive_records tables, migration SQL
├── contracts/
│   └── api.md           ← Phase 1: all 8 admin API endpoint contracts
└── checklists/
    └── requirements.md
```

### Source Code

This feature extends the existing project — no new top-level directories.

```text
connect-four/
├── server/
│   ├── index.js                          MODIFIED — new admin routes (see contracts/api.md)
│   ├── candidate-generator.js            NEW — game simulation + predicate filtering engine
│   ├── predicates.js                     MODIFIED — add category 7 (forbidden_columns)
│   └── migrations/
│       └── 007_puzzle_factory.sql        NEW — candidates, false_positive_records, puzzles extension
├── src/
│   ├── pages/
│   │   └── AdminCuratePage.jsx           MODIFIED — full Puzzle Factory UI replacing stub
│   └── components/
│       ├── CandidateDashboard.jsx        NEW — per-category queue counts + Reject All
│       ├── CurationWorkspace.jsx         NEW — interactive board + solver scores + predicate checklist
│       ├── PredicateChecklist.jsx        NEW — goal predicate verification panel
│       ├── RejectModal.jsx               NEW — reason selector + optional note field
│       └── MultiMoveSequencer.jsx        NEW — fork setup / parity sequence definition
└── tests/
    ├── predicates/
    │   └── forbidden_columns.test.js     NEW — positive + negative fixtures for category 7
    └── integration/
        └── candidate-generator.test.js   NEW — real solver binary, end-to-end generation smoke test
```

---

## Complexity Tracking

No constitution violations requiring justification.

---

## Implementation Steps

### Step 1 — Database migration

**File**: `connect-four/server/migrations/007_puzzle_factory.sql`  
**Reference**: [data-model.md](data-model.md)

- Widen `puzzles.category` CHECK to 1–7
- Add `'forbidden_columns'` to `puzzles.goal_predicate_type` CHECK
- Create `candidates` table with all columns and indexes
- Create `false_positive_records` table with all columns and indexes

**Test**: Apply migration against local Supabase; verify `\d candidates` and `\d false_positive_records` match the schema in data-model.md.

---

### Step 2 — Category 7 predicate implementation

**File**: `connect-four/server/predicates.js`  
**Reference**: [research.md — Decision 1](research.md), [spec.md FR-002](spec.md)

Add `case 7` to `evaluatePredicate`:
- For each legal column `c` (where `heights[c] < ROWS`):
  - Build the board state after playing `c` (one extra move appended to `moveString`).
  - Call the `c4solver` binary for the resulting position to get the opponent's scores.
  - A column is "forbidden" if the opponent's best score after playing there equals `immediateWinScore(moveCount + 1)` (i.e., opponent has an immediate win on the next turn).
- A position satisfies the predicate when ≥1 forbidden column exists.
- Return `{ result: 'correct'|'wrong', forbiddenCols: number[] }`.
- **Note**: This requires one solver call per legal column (up to 7 calls). At <100ms per call for shallow positions, this stays within the 3-second budget for categories 4–7 (Constitution Principle V).

**Test**: `tests/predicates/forbidden_columns.test.js`
- Positive fixture: a board where ≥1 column gifts the opponent an immediate win.
- Negative fixture: a board where no column does this.
- Both fixtures must use deterministic move strings checked into the repo (Constitution Principle III).

---

### Step 3 — Candidate generation engine

**File**: `connect-four/server/candidate-generator.js`  
**Reference**: [research.md — Decisions 3, 4](research.md), [spec.md FR-001, FR-002, FR-003](spec.md)

Exports a single function: `generateCandidates(category, count, seed?)` → `{ candidates[], seed, durationMs }`.

- If `seed` is omitted, generate a random integer seed at the start of the run and use it throughout.
- Seed the PRNG (e.g., a seeded `mulberry32` or `xorshift` implementation — no external dependency) and use it for all random choices: opening moves and weighted move selection.
- Return the seed used so callers can store it for reproducibility.

Algorithm:
1. Start from empty board or a random 4–6 move opening.
2. At each ply, fetch solver scores for all 7 columns via the existing `c4solver` process.
3. Select the next move via weighted random: prioritise moves with high solver scores for the active player; occasionally pick sub-optimal moves.
4. After each move, run the category's goal predicate (via `evaluatePredicate` from `predicates.js`).
5. If predicate passes, apply cleanliness filters before recording (see [spec.md FR-009](spec.md)):
   - **Reject** if any column has score == `immediateWinScore(moveCount)` AND category ≠ 1 (no immediate winning distractors).
   - **Reject** if the predicate is satisfied by more than one move (ambiguous correct answer).
   - If both filters pass, record the candidate (board state, solver scores, classifier tags from `classifier.js`).
6. Continue until `count` candidates collected or simulation budget exhausted (e.g., 500 games max).

**Test**: `tests/integration/candidate-generator.test.js`
- Run `generateCandidates(1, 5)` against the real solver and assert ≥1 candidate is returned.
- Assert each candidate's `solver_scores` array has length 7.

---

### Step 4 — Admin API routes

**File**: `connect-four/server/index.js`  
**Reference**: [contracts/api.md](contracts/api.md), [research.md — Decision 3](research.md)

Add all 8 endpoints under `requireLocalhost`:

| Endpoint | Key logic |
|---|---|
| `POST /api/admin/generate` | Call `generateCandidates(category, count, seed?)`. If `seed` not provided, generator picks one randomly. Bulk-insert candidates with `seed` stored on each row. Return `{ generation_run_id, inserted, seed, duration_ms }`. |
| `GET /api/admin/candidates/stats` | GROUP BY category + status query on `candidates`. |
| `GET /api/admin/candidates` | Paginated SELECT with category + status filter. |
| `POST /api/admin/candidates/:id/approve` | INSERT into `puzzles`, UPDATE `candidates.status = 'approved'`. |
| `POST /api/admin/candidates/:id/reject` | UPDATE `candidates.status = 'rejected'` + `rejection_reason`. If reason = `'false_positive'`, INSERT into `false_positive_records`. |
| `POST /api/admin/candidates/reject-batch` | UPDATE WHERE category + status = 'pending'. |
| `GET /api/admin/false-positives` | SELECT from `false_positive_records`, optional category filter. |
| `GET /api/admin/scores` | Call the same `c4solver` process already used by `/api/explain`: spawn solver with `moves` arg, read 7 scores, run `classify()` from `classifier.js`, return `{ scores, classifier_tags, predicate_pass }`. Also evaluate the category's goal predicate server-side (via `evaluatePredicate` from `predicates.js`) so `PredicateChecklist` can display pass/fail without duplicating predicate logic in the browser. |

See [contracts/api.md](contracts/api.md) for request/response shapes.

---

### Step 5 — Frontend: CandidateDashboard component

**File**: `connect-four/src/components/CandidateDashboard.jsx`  
**Reference**: [spec.md User Story 2](spec.md), [contracts/api.md — GET /api/admin/candidates/stats, POST /api/admin/candidates/reject-batch](contracts/api.md)

- On mount, fetch `/api/admin/candidates/stats` and display per-category pending/approved/rejected counts.
- **"Generate" button per category**: opens an inline form with `count` (default 30) and optional `seed` field (empty = random). On submit, POST to `/api/admin/generate`, display the returned `seed` and `inserted` count so the annotator can record the seed for reproducibility if needed. Refresh stats after completion.
- Loading indicator within 200ms of clicking Generate (generation can take several seconds).
- "Reject All" button per category: POST to `/api/admin/candidates/reject-batch`, then refresh counts.
- Clicking a category's pending count navigates to the curation workspace for that category.
- Visual treatment for categories with 0 pending candidates (Generate button prominent; workspace entry greyed out).

---

### Step 6 — Frontend: CurationWorkspace + PredicateChecklist components

**Files**: `connect-four/src/components/CurationWorkspace.jsx`, `PredicateChecklist.jsx`  
**Reference**: [spec.md User Story 3](spec.md), [contracts/api.md — GET /api/admin/candidates, GET /api/admin/scores, POST /api/admin/candidates/:id/approve, POST /api/admin/candidates/:id/reject](contracts/api.md), [research.md — Decision 5](research.md)

`CurationWorkspace`:
- Load pending candidates for the selected category from `GET /api/admin/candidates`. Keep the full list in state so progress (`3 of 14 remaining`) can be shown without re-fetching.
- Show progress indicator: `"N remaining in this batch — generate more"` (the "generate more" link returns to the dashboard Generate form).
- Render `Board.jsx` with the candidate's move string.
- **Pre-highlight the correct move on initial render** — derive it from the candidate's stored `solver_scores` without any additional server call: for single-move categories the predicate-satisfying column is computable from scores directly (e.g., cat 1: column with score == `immediateWinScore`; cat 2: only column with score ≥ 0). Highlight it visually so the annotator immediately sees what the puzzle is about. The annotator's job is then pure judgment ("is this a good puzzle?"), not discovery.
- On column click: fetch `GET /api/admin/scores?moves=<moveString+col>&category=<cat>` and display solver score, classifier tags, and `predicate_pass` for that column. Loading indicator within 200ms (Constitution Principle V).
- "Approve" button: show approval panel with `goal_prompt` pre-populated with a category-specific default template (see table below) that the annotator can edit, plus difficulty selector (default: 2). Then POST to approve endpoint. Auto-advance to next candidate.
- "Reject" button: open `RejectModal`. Auto-advance to next candidate on confirm.
- No Cleanliness Check toggle — distractor filtering is done by the generator (Step 3).
- Keyboard shortcuts: **A** = open Approve panel, **R** = open Reject modal, **Enter** = confirm open modal. Reduces per-card interaction to 2 keystrokes for the common case.

**Category default `goal_prompt` templates** (pre-populated, annotator edits before approving):

| Category | Default template |
|---|---|
| 1 — Immediate Threat | "Find the winning move." |
| 2 — Forced Block | "Block your opponent's threat." |
| 3 — Double Threat | "Find the move that creates two simultaneous threats." |
| 4 — Fork Setup | "Set up a fork — a sequence that leads to two unstoppable threats." |
| 5 — Zugzwang | "Any move your opponent makes leads to their loss. Make your move." |
| 6 — Parity Control | "Control the parity of this column to secure the win." |
| 7 — Forbidden Columns | "Identify which columns you must avoid — playing there would hand your opponent an immediate win." |

`PredicateChecklist`:
- Accepts the `predicate_pass` boolean returned by `GET /api/admin/scores` (evaluated server-side by `evaluatePredicate` in `predicates.js` — see Step 4 table above; predicate logic is NOT duplicated in the browser).
- Lights up green/red based on that value, plus displays which goal criteria were met (derived from the `classifier_tags` array also returned by the scores endpoint).

---

### Step 7 — Frontend: RejectModal component

**File**: `connect-four/src/components/RejectModal.jsx`  
**Reference**: [spec.md User Story 3 scenarios 4–6](spec.md), [contracts/api.md — POST /api/admin/candidates/:id/reject](contracts/api.md)

- Reason dropdown: `Not educational` | `Too close to end-game` | `False Positive / Classifier Bug` | `Other`.
- Note textarea (optional): shown unconditionally but labelled as "especially useful for classifier bugs".
- Confirm button: POST to reject endpoint with `reason` and `note`. On success, advance to next candidate.

---

### Step 8 — Frontend: MultiMoveSequencer component

**File**: `connect-four/src/components/MultiMoveSequencer.jsx`  
**Reference**: [spec.md User Story 4](spec.md), [research.md — Decision 6](research.md), [contracts/api.md — POST /api/admin/candidates/:id/approve](contracts/api.md)

Only rendered for categories 4 (Fork Setup) and 6 (Parity Control).

- "Mark Start" button records the current board state as the sequence start.
- Click a column to play a move and advance the board; fetch scores for the new position.
- Per AI-response turn: display solver scores per column so annotator can select a cooperative move. Non-cooperative columns (high score for opponent) are visually flagged.
- For the human player's moves: visually flag any column that is an immediate win (score == `immediateWinScore`) — these shortcut the sequence and should be avoided (see [spec.md FR-009b](spec.md)).
- "Mark End" button records the sequence end.
- On approve: include `cooperative_ai_moves` array in the approve request.

---

### Step 9 — Wire AdminCuratePage

**File**: `connect-four/src/pages/AdminCuratePage.jsx`  
**Reference**: all components above

Replace the existing stub with routing logic:
- Default view: `CandidateDashboard`.
- Category-selected view: `CurationWorkspace` (+ `MultiMoveSequencer` for cats 4 and 6).

---

### Step 10 — Manual verification

**Reference**: [spec.md Success Criteria SC-001 through SC-005](spec.md), [spec.md Edge Cases](spec.md)

Golden path:
1. Open dashboard. Click "Generate" for category 1 with default count (no seed). Verify candidates appear and the returned seed is displayed.
2. Enter the curation workspace. Verify the correct move is pre-highlighted before any interaction.
3. Click a non-correct column. Verify solver score and `predicate_pass: false` appear within 2 seconds.
4. Press **A** to open the Approve panel. Verify `goal_prompt` is pre-populated with the category 1 template. Edit it, select difficulty 2, confirm. Verify puzzle appears in `puzzles` table and candidate advances automatically.
5. Press **R** to open the Reject modal. Select "False Positive / Classifier Bug", add a note, confirm. Verify record in `false_positive_records`.
6. Exhaust the batch (reject or approve all candidates). Verify progress indicator shows 0 remaining and "generate more" link is visible.
7. Return to dashboard. Click "Generate" again for category 1 using a different seed (or no seed). Verify new candidates appear (different boards — confirm at least one move_string differs from the prior batch).
8. "Reject All" for a category. Verify pending count drops to 0 instantly.
9. For category 4, define a 3-move sequence. Verify shortcut-win columns are flagged at each intermediate step. Approve. Verify `cooperative_ai_moves` in exported puzzle.

Edge cases to spot-check:
- Generation with an explicit seed: re-run with the same seed and verify identical `move_string` values are produced.
- Generation job that produces 0 candidates (simulator exhausted before hitting `count`) — verify the UI reports this gracefully rather than hanging.
- Reject without a note when reason is "False Positive" — record must still be saved.
- Solver timeout on a deep position — verify loading indicator appears within 200ms and an error message is shown rather than a silent hang.
