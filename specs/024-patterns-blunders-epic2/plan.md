# Implementation Plan: Patterns → Blunders Epic 2 — Production Wiring

**Branch**: `101-new-design` | **Date**: 2026-06-07 | **Spec**: `specs/024-patterns-blunders-epic2/spec.md`

---

## Summary

Wire `tagBlunder` (implemented in Epic 1) into every production code path that records
blunders. Move blunder persistence server-side into `POST /api/games/analyze`, create the
shared `VALID_BLUNDER_TAGS` constant in `server/blunderTags.js`, eliminate all `'unknown'`
tag references, and patch `reprocess_blunders.mjs` to populate the new `reason`/`direction`
columns on historical rows.

---

## Technical Context

**Language/Version**: Node 20 (ESM `.mjs` scripts, CJS-compat `server/index.js`)
**Primary Dependencies**: Supabase JS client (`@supabase/supabase-js`), `classifier.js`
(exports `tagBlunder`), `moveQualityScorer.js` (exports `scoreMove`, `computeBlunderSeverity`)
**Storage**: PostgreSQL via Supabase — `blunders` table (no new migrations)
**Testing**: Node built-in `node --test` — `npm run test:fast` inside `connect-four/`
**Target Platform**: Node 20 server + React frontend (Vite)
**Project Type**: Web service (server) + SPA (frontend)
**Performance Goals**: `tagBlunder` may issue 60+ solver queries per blunder ply. Acceptable
because `POST /api/games/analyze` is a post-game background call, not on the interactive hot path.
**Constraints**: The analyze endpoint's HTTP response must not be blocked by the blunder INSERT
(fire-and-forget). Duplicate INSERTs (pg `23505`) must silently succeed.
**Scale/Scope**: Touches 5 files (`server/index.js`, `ReviewScreen.jsx`,
`reprocess_blunders.mjs`, `import_papergames_blunders.mjs`) + 1 new file (`server/blunderTags.js`)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth (PASS)**:
`tagBlunder` is part of the explanation engine's pattern-classifier layer. This epic routes
all blunder tagging through it, eliminating the old `classify()` shortcut on the blunder path.

**Principle II — Code Quality & Simplicity (PASS)**:
`server/blunderTags.js` is a minimal new file (one exported `Set`, ~20 lines). The analyze
endpoint patch is a mechanical replacement of one function call + an added INSERT block. No
new abstractions are introduced.

**Principle III — Testing Standards (PASS)**:
The core `tagBlunder` algorithm is tested by Epic 1. This epic requires: extracting a thin
`insertGameBlunder(supabase, row)` helper from the analyze endpoint so it can be unit-tested
in isolation with `node --test` (no supertest, no app export, no supabase injection seam exists
at the endpoint level). Tests cover: auth gate (helper is not invoked when `row.user_id` is
absent), 15-tag guard (invalid tag substituted with `'suboptimal_move'`), and 23505-as-success
(pg unique violation does not throw). A companion task documents these testing conventions in
`docs/architecture/testing-conventions.md`.

**Principle V — Performance Requirements (ATTENTION)**:
`tagBlunder` is called post-game, not on the interactive path. The 60+-query cost is
acceptable and must be documented with a comment at the call site: "tagBlunder may issue 60+
solver queries per blunder ply; this is acceptable because the analyze endpoint is called
post-game, not during interactive play."

**Principle VI — Implementation Methodology (PASS)**:
All data dependencies traced before planning (see `data-model.md`). The blunder INSERT shape
is locked to the existing `POST /api/blunders` endpoint shape as the ground-truth template.

**Principle VIII — Documentation (PASS)**:
`server/blunderTags.js` must be documented in `docs/architecture/server-conventions.md`
(Category Registry section). The analyze endpoint contract change is documented in
`contracts/analyze-endpoint.md`. Architecture docs read before this plan was drafted.

---

## Project Structure

### Documentation (this feature)

```text
specs/024-patterns-blunders-epic2/
├── plan.md              # This file
├── research.md          # Phase 0 output — all unknowns resolved
├── data-model.md        # Phase 1 output — blunders row shape + blunderTags module
├── contracts/
│   └── analyze-endpoint.md   # POST /api/games/analyze contract change
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (files touched by this epic)

```text
connect-four/server/
├── blunderTags.js              # NEW — VALID_BLUNDER_TAGS shared constant
├── index.js                    # MODIFY — analyze endpoint: tagBlunder + server-side INSERT
├── classifier.js               # MODIFY — delete classifyBestMove if zero callers confirmed; classifyAll PRESERVED (active callers, deferral to Epic 3)
└── scripts/
    ├── reprocess_blunders.mjs  # MODIFY — tagBlunder, reason/direction, blunderTags import
    └── import_papergames_blunders.mjs  # MODIFY — compilability: tagBlunder sig + blunderTags import

connect-four/src/screens/
└── ReviewScreen.jsx            # MODIFY — remove client-side blunder-write block + unknown fallback

docs/architecture/
└── server-conventions.md       # MODIFY — document blunderTags.js module
```

**Structure Decision**: Monorepo, single-project. No new directories. The one new file
(`server/blunderTags.js`) follows the existing `server/*.js` module convention.

---

## Phase 0: Research

All unknowns resolved — see `research.md`. Key findings:

1. `tagBlunder` and `classifyPattern` are confirmed exported from `classifier.js` (Epic 1 done).
2. `server/blunderTags.js` does not yet exist → must be created.
3. `classifyAll` has active callers (debug script + debug endpoint) → preserve.
4. `classifyBestMove` has zero callers → eligible for deletion per FR-021, pending pre-implementation audit.
5. `'unknown'` appears as a pattern-category write/emit site in `ReviewScreen.jsx` line 84
   (inside the block being removed). It also appears as read-only display filters in
   `MistakesListScreen.jsx:274` and `MistakeDetailScreen.jsx:160` (`pattern_category !== 'unknown'`).
   Those read-only comparisons do not write to the DB and are harmless; they are left as-is.
   The SC-002 verification grep must target write/emit sites only (not all occurrences of the
   string `'unknown'`) to avoid false positives.
6. `movesBeforeThisPly` in the analyze endpoint is a string (substring of the game movestring).
7. `computeSeverity` is already defined as a local helper in `server/index.js`.

---

## Phase 1: Design & Contracts

See `data-model.md` for the entity shape and `contracts/analyze-endpoint.md` for the
API contract change.

### Key design decisions

#### D1 — `server/blunderTags.js` as a named-export Set

The file exports a single `Set` named `VALID_BLUNDER_TAGS`. Consumers call
`VALID_BLUNDER_TAGS.has(tag)` for the guard substitution. Using `Set` (not array) makes
`.has()` O(1) and mirrors the pattern of `server/categories.js`.

#### D2 — Analyze endpoint blunder INSERT is fire-and-forget

Per spec edge case and Constitution Principle V (analytics writes must not block UI): the
INSERT is inside a `try/catch` that logs and continues. The response is returned regardless
of INSERT outcome. `23505` conflicts are caught specifically and logged at debug level.

```js
// Pattern for the INSERT block (inside the quality === 'blunder' branch)
if (req.user) {
  try {
    const { error: insertErr } = await supabase.from('blunders').insert({
      user_id: req.user.id,
      board_state: movesBeforeThisPly,
      move_played: col,
      correct_move: bestCol,
      pattern_category: tag,
      reason,
      direction,
      severity: computeSeverity(bestScore, score),
      blunder_severity: blunderSeverity,
      puzzle_id: null,
    });
    if (insertErr && insertErr.code !== '23505') {
      console.error('blunder insert failed:', insertErr.message);
    }
  } catch (e) {
    console.error('blunder insert threw:', e.message);
  }
}
```

**Critical**: The INSERT block must be placed AFTER the `blunderSeverity` computation block
(which already runs earlier in the loop). Both `tag` and `blunderSeverity` must be in scope.

#### D3 — tagBlunder call placement in the analyze loop

Current structure in the loop:
1. Compute scores (solver query)
2. `scoreMove()` → `{ quality, bestCol }`
3. `classify()` call → `patternTag` ← REPLACE THIS with `tagBlunder()`
4. `computeBlunderSeverity()` → `blunderSeverity` (already gated on `quality === 'blunder'`)
5. `analyzedMoves.push(...)` ← ADD `reason`, `direction` here
6. NEW: INSERT block ← ADD after step 4 and before step 5 (so `blunderSeverity` is in scope)

The `tagBlunder` call itself should also be gated on `quality === 'blunder'` (unlike the
current `classify()` which runs for all user plies). This avoids 60+ solver queries per
non-blunder ply. For non-blunder plies, `patternTag`, `reason`, and `direction` are all `null`.

#### D4 — `reprocess_blunders.mjs` dedup strategy unchanged

The script already deletes all game blunders before inserting. This is sufficient for
idempotency. No per-row conflict handling is needed in the script (only in the analyze endpoint
where concurrent client+server writes could occur). Retain the delete-all strategy.

#### D5 — `classifyBestMove` deletion: guard with pre-implementation audit

FR-002 requires running `rg 'classifyBestMove' connect-four/server/` before any deletions.
The research phase found zero callers. Confirm this before deleting. If a caller appears,
document it and preserve the function.

#### D6 — `classifyAll` is preserved (non-blunder path)

`/api/debug/classify-all` endpoint and `scripts/classify_all.mjs` both use `classifyAll`.
Neither is a blunder-tagging path. No change required.

---

## Task Ordering

Tasks are ordered by dependency:

### Group A — Foundation (no dependencies)

**T001**: Create `connect-four/server/blunderTags.js`
- Export `VALID_BLUNDER_TAGS` as a `Set` of the 15 tags (FR-002a)
- Verify it contains exactly 15 entries and that `'unknown'` is absent
- Add documentation entry to `docs/architecture/server-conventions.md` (Principle VIII)

### Group B — Server and script wiring (all depend on T001)

**T002**: Patch `POST /api/games/analyze` in `server/index.js`
- Import `tagBlunder` from `./classifier.js` (add to existing import)
- Import `VALID_BLUNDER_TAGS` from `./blunderTags.js` (new import)
- Replace `classify(movesBeforeThisPly, col, scores)` call with
  `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`, gated on `quality === 'blunder'`
- Destructure `const { tag, reason, direction } = tagResult`
- Apply guard: `const safeTag = VALID_BLUNDER_TAGS.has(tag) ? tag : 'suboptimal_move'`
- Add server-side INSERT block (D2 pattern above) after `blunderSeverity` is computed
- Add `reason` and `direction` to each move entry in `analyzedMoves.push()`
- Add comment: "tagBlunder may issue 60+ solver queries per blunder ply — acceptable because this endpoint is called post-game, not during interactive play"
- Verify: `classify()` is NOT removed from the file (still used on non-blunder paths)
- Acceptance: FR-003 through FR-010

**T003**: Patch `server/scripts/reprocess_blunders.mjs`
- Add import: `import { tagBlunder } from '../classifier.js'`
- Add import: `import { VALID_BLUNDER_TAGS } from '../blunderTags.js'`
- Remove the local `VALID_PATTERN_CATEGORIES` Set definition
- Replace `classify(movesBeforeThisPly, col, scores)` with
  `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)` (note: `bestCol` from `scoreMove()`)
- Update the guard: `const patternTag = VALID_BLUNDER_TAGS.has(tag) ? tag : 'suboptimal_move'`
- Add `reason` and `direction` to the `toInsert` object
- Acceptance: FR-011 through FR-014

**T004**: Patch `server/scripts/import_papergames_blunders.mjs` (compilability only)
- Add import: `import { tagBlunder } from '../classifier.js'`
- Add import: `import { VALID_BLUNDER_TAGS } from '../blunderTags.js'`
- Remove the local `VALID_PATTERN_CATEGORIES` Set definition
- Update the `tagBlunder` call to use the correct 4-argument signature:
  `tagBlunder(movesBefore, col, bestCol, solver)` — note `bestCol` must be in scope
- Update the guard to use `VALID_BLUNDER_TAGS`
- Verify: `node --check connect-four/server/scripts/import_papergames_blunders.mjs` passes
- Acceptance: FR-015 through FR-017

### Group C — Frontend patch (independent of A/B)

**T005**: Patch `connect-four/src/screens/ReviewScreen.jsx`
- Remove lines 74–101 (the `POST /api/blunders` fire-and-forget loop and its guards)
- Remove line 30: `const blundersWrittenRef = useRef(false)`
- Remove lines 32–35: the `useEffect` that resets `blundersWrittenRef.current = false`
- Remove the `VALID_CATEGORIES` constant definition (dead code once the write block is gone)
- Remove the `CATEGORY_ORDER` import (dead code once `VALID_CATEGORIES` is removed)
- Remove the `useRef` import if `blundersWrittenRef` was its only consumer (dead import)
- Verify: `rg "POST.*api/blunders" connect-four/src/` returns zero hits after patch
- Verify: `npm run lint` inside `connect-four/` passes (no `no-unused-vars` errors)
- Acceptance: FR-018, FR-019, FR-020, SC-007

### Group D — Conditional cleanup (independent, run after T002–T004)

**T006**: Audit `classifyBestMove` (conditional retire) and `classifyAll` (preserve)
- Run `rg 'classifyBestMove' connect-four/server/'` — IF zero callers: delete from `classifier.js` (FR-021); IF callers found: document and skip deletion.
- Run `rg 'classifyAll' connect-four/server/` — enumerate all callers; expected: `/api/debug/classify-all` endpoint, `scripts/classify_all.mjs`, `explainSimulate.js`. Record each. Produce finding: **"PRESERVE — classifyAll has active callers; removal deferred to Epic 3"**. Do NOT delete `classifyAll`.
- Acceptance: FR-021, FR-021a

### Group E — Tests (depends on T002)

The repo uses Node's built-in `node --test` test runner (not Jest). The app (`server/index.js`)
is not exported and there is no supertest harness. The supabase client has no injection seam at
the endpoint level. The testing strategy is therefore: extract a thin `insertGameBlunder(supabase, row)`
helper from the analyze endpoint and unit-test it directly — no HTTP layer involved.

**T007**: Extract `insertGameBlunder(supabase, row)` helper from `server/index.js`
- Extract the INSERT block (D2 pattern) into `connect-four/server/insertGameBlunder.js`
- Function signature: `async function insertGameBlunder(supabase, row)` where `row` is the
  full blunder object already built by the caller
- The helper returns `void` — errors are caught internally (fire-and-forget contract preserved)
- `23505` conflicts are caught specifically and silenced (debug-level log only)
- Auth gate: if `row.user_id` is falsy, the helper returns immediately without calling supabase
- `VALID_BLUNDER_TAGS` guard: if `row.pattern_category` is not in the set, substitute
  `'suboptimal_move'` before the INSERT call
- Update `server/index.js` to import and call the helper instead of inlining the block
- Acceptance: refactor only — no behavior change, SC-001, SC-008

**T008**: Write `node --test` unit tests for `insertGameBlunder`
- Test file: `connect-four/tests/blunder/insertGameBlunder.test.js`
- Test fixture: use an existing movestring from the DB or KB examples (never invent)
- Use a plain stub object `{ from: () => ({ insert: async () => ({ error: null }) }) }` in place
  of the supabase client — no mocking library required
- **Test: auth gate** — call with `row.user_id = null`; verify the stub's `insert` is never called
- **Test: 15-tag guard** — call with `row.pattern_category = 'totally_invalid_tag'`; stub captures
  the INSERT call; verify the captured `pattern_category` is `'suboptimal_move'`
- **Test: 23505-as-success** — stub returns `{ error: { code: '23505' } }`; verify helper resolves
  without throwing (does not propagate)
- Run with: `node --test connect-four/tests/blunder/insertGameBlunder.test.js`
- Acceptance: SC-001, SC-003, SC-008, US 1 acceptance scenarios 1–3, US 2 acceptance scenarios 1–2

**T009**: (absorbed into T008 — 23505 test is one of the three cases above)

### Group F — Testing conventions doc (independent)

**T012**: Write `docs/architecture/testing-conventions.md`
- Document the testing approach for this repo's server code
- Include: pure function extraction pattern (why it's the primary testability seam); why
  endpoint-level tests are hard (no supertest, app not exported, supabase has no injection seam);
  `node --test` conventions (file naming, assertion style, how to run a single file); `test:fast`
  vs `npm test` (omits candidate-generator.test.js which hangs 10+ min due to solver IPC deadlock)
- Reference Epic 2's `insertGameBlunder` as the canonical example of the extraction pattern
- Add a pointer to this file from `docs/architecture/index.md` (or `docs/index.md` if that is
  the architecture index used in this repo — check before editing)
- Acceptance: doc exists and covers the four topics above

---

### Group G — Backfill (depends on T003, done manually by operator)

**T010**: Run `reprocess_blunders.mjs` backfill (operator step)
- Run: `node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs`
- Verify: sample 5–10 newly inserted rows; confirm `reason` and `direction` are non-null
- Acceptance: FR-022, SC-006

### Group I — Stale-client hardening (depends on T001)

**T013**: Harden `POST /api/blunders` against stale-client `'unknown'` writes
- In `server/index.js` at the `POST /api/blunders` handler, import `VALID_BLUNDER_TAGS` from `./blunderTags.js` (if not already imported by T002).
- Before INSERT: `const safeCategory = VALID_BLUNDER_TAGS.has(req.body.pattern_category) ? req.body.pattern_category : 'suboptimal_move'`; emit `console.warn` when substitution fires.
- Use `safeCategory` for `pattern_category` in the INSERT.
- Acceptance: FR-023, SC-009

### Group H — Documentation (depends on T001)

**T011**: Update `docs/architecture/server-conventions.md`
- Add a "Blunder Tag Registry" subsection alongside the existing "Category Registry" section
- Document: `server/blunderTags.js` exports `VALID_BLUNDER_TAGS` (15-tag Set); must be
  imported wherever a blunder tag is validated; never duplicate the set locally
- Note: `VALID_BLUNDER_TAGS` is distinct from `VALID_CATEGORIES` in `server/categories.js`
  (puzzle categories); do not conflate

---

## Dependency Graph

```
T001 (blunderTags.js)
  ├── T002 (analyze endpoint)
  │     └── T007 (extract insertGameBlunder helper)
  │           └── T008 (node --test unit tests)
  ├── T003 (reprocess_blunders.mjs)
  │     └── T010 (operator backfill) — manual, not a release gate
  ├── T004 (import_papergames)
  ├── T011 (server-conventions docs)
  └── T013 (POST /api/blunders stale-client hardening)

T005 (ReviewScreen)               — independent
T006 (classifyBestMove+All audit) — independent
T012 (testing-conventions.md)     — independent
```

**Parallel groups**:
- T001 first (or in parallel with T005, T006, T012)
- T002, T003, T004, T011, T013 can be done in parallel after T001
- T005, T006, T012 can be done any time
- T007 after T002; T008 after T007
- T010 after T003 (operator-run, not CI)

---

## Complexity Tracking

No Constitution violations.

---

## Appendix: Acceptance Verification Commands

After all tasks complete, run these to verify:

```bash
# SC-002: no 'unknown' in pattern-category write/emit sites
# (Targets only assignment/emit contexts; excludes read-only display filters in MistakesListScreen/MistakeDetailScreen)
rg "pattern_category.*'unknown'|'unknown'.*pattern_category" connect-four/src/ connect-four/server/scripts/ connect-four/server/index.js

# SC-005: no local VALID_PATTERN_CATEGORIES in scripts
rg "VALID_PATTERN_CATEGORIES" connect-four/server/scripts/

# SC-007: no client-side blunder POST in frontend
rg "POST.*api/blunders" connect-four/src/

# SC-004: papergames script is syntactically valid
node --check connect-four/server/scripts/import_papergames_blunders.mjs
```
