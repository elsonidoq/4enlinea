# Tasks: Patterns → Blunders Epic 2 — Production Wiring

**Input**: Design documents from `/specs/024-patterns-blunders-epic2/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/analyze-endpoint.md ✓

**Organization**: Tasks follow the dependency-ordered groups from plan.md (A → B/C/D → E → F/G/H).
Group A (T001) is the single foundational blocker. B-group and C/D-group run in parallel after T001.
E-group (T007 → T008) follows T002. Groups F (T010), G (T011), and H (T012) are independent or
post-backfill.

---

## Phase 1: Foundational — Shared Tag Constant (Group A)

**Purpose**: Create the single authoritative blunder-tag set that every other task imports.
No other task in this epic may write an inline valid-tag Set; they must all import from this file.

**⚠️ CRITICAL**: T002, T003, T004, and T011 all block on T001. Do not start them until T001 is complete.

- [x] T001 Create `connect-four/server/blunderTags.js` exporting `VALID_BLUNDER_TAGS` as a `Set` of exactly 15 tags: `immediate_threat`, `forced_block`, `forced_win`, `double_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`, `z_threat`, `odd_even_threat`, `claimeven`, `claimodd`, `drawing_move`, `suboptimal_move`, `forbidden_columns` — verify `'unknown'` is absent and count is exactly 15 (FR-002a, SC-005)

**Checkpoint**: `connect-four/server/blunderTags.js` exists and exports a 15-entry `Set` with no `'unknown'` entry. T002–T004 and T011 can now proceed.

---

## Phase 2: User Stories 1 & 2 — Authenticated Blunder Storage + Anonymous Gate (P1)

**Stories**: US1 (authenticated blunder stored with full tag) + US2 (anonymous request runs tagger but does not insert)

**Goal**: Wire `tagBlunder` into `POST /api/games/analyze`; persist `pattern_category`, `reason`, and `direction` server-side for authenticated users; return `patternTag`, `reason`, `direction` in the JSON response for all users.

**Independent Test**:
- Authenticated: play a sparring game, make a deliberate blunder, query `blunders` table — row has non-null `pattern_category`, `reason`, `direction`.
- Anonymous: call `POST /api/games/analyze` without `Authorization` header — response contains `patternTag` per blunder ply; `blunders` table gains no new row.

### Implementation for US1 + US2

- [x] T002 [US1] Patch `POST /api/games/analyze` in `connect-four/server/index.js`: import `tagBlunder` from `./classifier.js` and `VALID_BLUNDER_TAGS` from `./blunderTags.js`; replace the `classify(movesBeforeThisPly, col, scores)` call with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)` gated on `quality === 'blunder'`; destructure `{ tag, reason, direction }` from the result; apply guard `const safeTag = VALID_BLUNDER_TAGS.has(tag) ? tag : 'suboptimal_move'`; **`safeTag` is used ONLY inside the INSERT row (`pattern_category: safeTag`) — it MUST NOT appear in the JSON response or in `analyzedMoves.push()`; the response and push use raw `tag` (and raw `reason`, `direction`)**; add fire-and-forget INSERT block (wrapped in `try/catch`, `req.user`-gated, `23505` silenced); add `reason` and `direction` to each move entry in `analyzedMoves.push()`; **note: non-blunder plies do NOT call `tagBlunder` — their `patternTag`, `reason`, and `direction` fields in `analyzedMoves` are `null`; this is accepted behaviour; the review UI must handle null gracefully**; add comment "tagBlunder may issue 60+ solver queries per blunder ply — acceptable because this endpoint is called post-game, not during interactive play"; verify `classify()` is NOT removed (still used on non-blunder paths) (FR-003 through FR-010, SC-001, SC-003, SC-008)

- [x] T007 Extract `insertGameBlunder(supabase, row)` helper from `connect-four/server/index.js` into `connect-four/server/insertGameBlunder.js`: function signature `async function insertGameBlunder(supabase, row)`; auth gate — if `row.user_id` is falsy, return immediately without calling supabase; `VALID_BLUNDER_TAGS` guard inside the helper — if `row.pattern_category` is not in the set, substitute `'suboptimal_move'` before INSERT; `23505` conflicts caught specifically and silenced (debug-level log only); all other INSERT errors caught and logged, never thrown; returns `void`; update `connect-four/server/index.js` to import and call the helper instead of the inlined block — no behavior change (refactor only, SC-001, SC-008)

- [x] T008 Write `node --test` unit tests for `insertGameBlunder` in `connect-four/tests/blunder/insertGameBlunder.test.js`: use a plain stub object `{ from: () => ({ insert: async () => ({ error: null }) }) }` for the supabase client — no mocking library; **auth-gate test**: call with `row.user_id = null`, verify stub's `insert` is never called; **15-tag guard test**: call with `row.pattern_category = 'totally_invalid_tag'`, stub captures INSERT call, verify captured `pattern_category` is `'suboptimal_move'`; **23505-as-success test**: stub returns `{ error: { code: '23505' } }`, verify helper resolves without throwing; run with `node --test connect-four/tests/blunder/insertGameBlunder.test.js` and confirm all three tests pass (SC-001, SC-003, SC-008, US1 AC 1–3, US2 AC 1–2)

- [ ] T009 (stub — absorbed into T008; the 23505 test is T008's third case. Task ID reserved for stability.)

**Checkpoint**: `npm run test:fast` passes. Calling `POST /api/games/analyze` with an auth token inserts a `blunders` row with non-null `reason` and `direction`. Calling it without a token returns 200 with `patternTag`/`reason`/`direction` per blunder ply and inserts nothing.

---

## Phase 3: User Story 3 — `'unknown'` Elimination Across All Code Paths (P1)

**Story**: US3 — No server or frontend code path can produce or accept `'unknown'` as a `pattern_category` value.

**Goal**: Remove the client-side blunder-write block from `ReviewScreen.jsx` (which is the only remaining `'unknown'` write/emit site) and update `import_papergames_blunders.mjs` to use the shared tag set and correct `tagBlunder` signature.

**Independent Test**:
```bash
# After patch — zero hits on pattern-category write/emit sites:
rg "pattern_category.*'unknown'|'unknown'.*pattern_category" connect-four/src/ connect-four/server/scripts/ connect-four/server/index.js

# No client-side blunder POST:
rg "POST.*api/blunders" connect-four/src/

# No local VALID_PATTERN_CATEGORIES in scripts:
rg "VALID_PATTERN_CATEGORIES" connect-four/server/scripts/

# Papergames script syntactically valid:
node --check connect-four/server/scripts/import_papergames_blunders.mjs
```

### Implementation for US3

- [x] T005 [P] [US3] Patch `connect-four/src/screens/ReviewScreen.jsx`: remove lines 74–101 (the `POST /api/blunders` fire-and-forget loop and its `blundersWrittenRef` guard); remove `const blundersWrittenRef = useRef(false)` and the `useEffect` that resets it; remove the `VALID_CATEGORIES` constant definition (dead code once the write block is gone); remove the `CATEGORY_ORDER` import (dead once `VALID_CATEGORIES` is removed); remove the `useRef` import **only if** `blundersWrittenRef` was its sole consumer — verify before removing; run `npm run lint` inside `connect-four/` and confirm zero `no-unused-vars` errors; note: `MistakesListScreen.jsx:274` and `MistakeDetailScreen.jsx:160` have read-only `!== 'unknown'` filters — leave them untouched (FR-018, FR-019, FR-020, SC-007)

- [x] T004 [P] [US3] Patch `connect-four/server/scripts/import_papergames_blunders.mjs` for compilability: add `import { tagBlunder } from '../classifier.js'`; add `import { VALID_BLUNDER_TAGS } from '../blunderTags.js'`; remove local `VALID_PATTERN_CATEGORIES` Set definition; update `tagBlunder` call to use the correct 4-argument signature `tagBlunder(movesBefore, col, bestCol, solver)` ensuring `bestCol` is in scope; update the guard to use `VALID_BLUNDER_TAGS.has(raw) ? raw : 'suboptimal_move'`; run `node --check connect-four/server/scripts/import_papergames_blunders.mjs` and confirm it exits 0 (FR-015, FR-016, FR-017, SC-004)

**Checkpoint**: All four verification greps above return zero hits. `node --check` on the papergames script exits 0. `npm run lint` passes.

---

## Phase 4: User Story 4 — `reprocess_blunders.mjs` Backfill (P2)

**Story**: US4 — Historical game blunder rows populated with `reason` and `direction` from `tagBlunder`.

**Goal**: Patch the reprocess script so it calls `tagBlunder` with the correct signature and writes the new columns. Operator then runs the script as a best-effort backfill; not a release gate.

**Independent Test**: Run the script against a test DB with at least one game row; sample inserted `blunders` rows — verify non-null `reason` and `direction`; run again — verify no duplicates (idempotent delete-all-then-insert strategy).

### Implementation for US4

- [x] T003 [US4] Patch `connect-four/server/scripts/reprocess_blunders.mjs`: add `import { tagBlunder } from '../classifier.js'`; add `import { VALID_BLUNDER_TAGS } from '../blunderTags.js'`; remove the local `VALID_PATTERN_CATEGORIES` Set definition; replace `classify(movesBeforeThisPly, col, scores)` with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)` (where `bestCol` comes from the existing `scoreMove()` result); update the guard to `const patternTag = VALID_BLUNDER_TAGS.has(tag) ? tag : 'suboptimal_move'`; add `reason` and `direction` fields to the `toInsert` object; retain the existing delete-all-then-insert idempotency strategy unchanged (FR-011 through FR-014, SC-005, SC-006)

- [ ] T010 [US4] **Operator step (not a CI gate)** — run the backfill: `node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs`; sample 5–10 newly inserted rows and confirm `reason` and `direction` are non-null; if interrupted, re-run from the beginning (idempotent). Epic 2 ships regardless of this step's completion (FR-022, SC-006)

**Checkpoint**: Script exits 0. Sampled rows have non-null `reason` and `direction`. Second run produces no duplicates.

---

## Phase 5: User Story 5 — Conditional `classifyBestMove` Retirement (P3)

**Story**: US5 — Dead export `classifyBestMove` removed from `classifier.js` if zero callers confirmed.

**Goal**: Audit callers and conditionally delete the dead export. `classifyAll` is preserved (has active callers on debug path).

**Independent Test**:
```bash
# Confirm classifyBestMove is gone (or documented if caller found):
rg 'classifyBestMove' connect-four/server/
# Confirm classifyAll is still present:
rg 'classifyAll' connect-four/server/classifier.js
```

### Implementation for US5

- [x] T006 [P] [US5] Audit `classifyBestMove` and `classifyAll` in `connect-four/server/classifier.js`:
  - Run `rg 'classifyBestMove' connect-four/server/` — IF zero callers found (expected per research.md): delete the `classifyBestMove` function definition and its export from `classifier.js`; IF callers found: add a comment documenting each caller and skip deletion.
  - Run `rg 'classifyAll' connect-four/server/` — enumerate **all** callers; expected active callers: (1) the `/api/debug/classify-all` debug endpoint in `server/index.js`, (2) `server/scripts/classify_all.mjs`, (3) `explainSimulate.js`. Record each caller with its file and line. Produce an explicit finding: **"PRESERVE — classifyAll has active callers; removal is deferred to Epic 3 (coach explanation rebuild)"**. Do NOT delete `classifyAll` in this task.
  - Run `npm run test:fast` to confirm no breakage.
  (FR-021, US5 AC 1–2)

**Checkpoint**: `rg 'classifyBestMove' connect-four/server/` returns zero hits (or a comment documenting retained callers). `npm run test:fast` passes.

---

## Phase 5b: `POST /api/blunders` Stale-Client Hardening

**Purpose**: The existing `POST /api/blunders` backward-compat endpoint accepts `pattern_category` directly from the request body with no validation. Any stale browser still firing this endpoint with `pattern_category: 'unknown'` will hit the DB CHECK constraint (removed by Epic 1 migration) and receive a 500. This task adds a VALID_BLUNDER_TAGS guard to substitute `'suboptimal_move'` before the INSERT, closing the 500 window with ~3 lines of code.

**Dependency**: T001 (needs `VALID_BLUNDER_TAGS` import).

- [x] T013 [US3] Harden `POST /api/blunders` against stale-client writes: in `connect-four/server/index.js` at the `POST /api/blunders` handler, add `import { VALID_BLUNDER_TAGS } from './blunderTags.js'` if not already imported; before the INSERT, add guard: `const safeCategory = VALID_BLUNDER_TAGS.has(req.body.pattern_category) ? req.body.pattern_category : 'suboptimal_move'`; use `safeCategory` in the INSERT `pattern_category` field instead of `req.body.pattern_category` directly; add a `console.warn` when substitution fires: `"POST /api/blunders: unrecognized pattern_category '<value>' substituted with 'suboptimal_move'"` — so operator logs reveal stale clients without crashing; verify no behavioral change for valid tags; run `npm run test:fast` to confirm no breakage (SC-002, US3 AC4)

**Checkpoint**: A request to `POST /api/blunders` with `pattern_category: 'unknown'` returns 200/201 (not 500) and the inserted row has `pattern_category = 'suboptimal_move'`. A request with a valid tag inserts as-is.

---

## Phase 6: Polish & Documentation

**Purpose**: Architecture documentation required by Constitution Principle VIII. All tasks here are part of the definition of done.

- [x] T011 [P] Update `docs/architecture/server-conventions.md`: add a "Blunder Tag Registry" subsection alongside the existing "Category Registry" section documenting that `server/blunderTags.js` exports `VALID_BLUNDER_TAGS` (15-tag Set); must be imported wherever a blunder tag is validated; never duplicate the set locally; note that `VALID_BLUNDER_TAGS` is distinct from `VALID_CATEGORIES` in `server/categories.js` (puzzle categories) — do not conflate (Principle VIII)

- [x] T012 [P] Create `docs/architecture/testing-conventions.md` (new file — does not yet exist): document the testing approach for server code — pure function extraction pattern (why it is the primary testability seam); why endpoint-level tests are hard (no supertest, app not exported, supabase has no injection seam); `node --test` conventions (file naming, assertion style, how to run a single file); `test:fast` vs `npm test` (omits `candidate-generator.test.js` which hangs 10+ min due to solver IPC deadlock); reference `insertGameBlunder` as the canonical extraction-pattern example; add a pointer to this file from `docs/index.md` (check current index structure before editing to find the architecture section) (Principle VIII)

**Checkpoint**: Both docs exist. `docs/index.md` links to `testing-conventions.md`. `server-conventions.md` documents the blunder tag registry.

---

## Dependencies & Execution Order

### Phase Dependencies

```
T001 (blunderTags.js)           ← BLOCKS T002, T003, T004, T011, T013
  ├── T002 (analyze endpoint)   ← BLOCKS T007
  │     └── T007 (extract insertGameBlunder)  ← BLOCKS T008
  │           └── T008 (unit tests)
  │                 └── T009 (stub — absorbed into T008)
  ├── T003 (reprocess_blunders)
  │     └── T010 (operator backfill — not a release gate)
  ├── T004 (import_papergames compilability)
  ├── T011 (server-conventions docs)
  └── T013 (POST /api/blunders hardening)

T005 (ReviewScreen)               ← independent; can run any time
T006 (classifyBestMove+All audit) ← independent; can run any time
T012 (testing-conventions)        ← independent; can run any time
```

### User Story Dependencies

- **US1 + US2 (P1)**: Depends on T001 (Phase 1). T007 depends on T002. T008 depends on T007.
- **US3 (P1)**: T005 is fully independent. T004 depends on T001. T013 depends on T001.
- **US4 (P2)**: T003 depends on T001. T010 depends on T003 (operator-run, not CI).
- **US5 (P3)**: T006 is independent of all other task groups.

### Parallel Opportunities

After T001 completes, the following can proceed in parallel:
- T002, T003, T004, T011 (all depend only on T001)
- T005, T006, T012 (fully independent, can run even before T001 if desired)

Within US1/US2: T007 → T008 is a strict sequential chain (T007 must complete before T008).

T010 (backfill) is always last for US4 and is an operator action, not a CI task.

---

## Parallel Execution Examples

### Immediately parallelizable (after T001)

```bash
# These five can run concurrently once T001 is done:
Task T002: Patch POST /api/games/analyze in connect-four/server/index.js
Task T003: Patch connect-four/server/scripts/reprocess_blunders.mjs
Task T004: Patch connect-four/server/scripts/import_papergames_blunders.mjs
Task T011: Update docs/architecture/server-conventions.md
Task T013: Harden POST /api/blunders against stale-client unknown writes
```

### Always parallelizable (independent of T001)

```bash
Task T005: Patch connect-four/src/screens/ReviewScreen.jsx
Task T006: Audit classifyBestMove in connect-four/server/classifier.js
Task T012: Create docs/architecture/testing-conventions.md
```

---

## Implementation Strategy

### MVP (P1 Stories Only — US1/US2/US3)

1. Complete Phase 1 (T001) — foundational blocker
2. Complete Phase 2 (T002 → T007 → T008) — core server-side wiring
3. Complete Phase 3 (T005 + T004) — unknown elimination and client-side write removal
4. **STOP and VALIDATE**: Run `npm run test:fast`; verify `rg "POST.*api/blunders" connect-four/src/` returns zero; verify `node --check` on papergames script exits 0
5. Ship — P2/P3 are non-blocking

### Full Delivery (all stories)

1. Foundation: T001
2. Core wiring: T002 → T007 → T008 (sequential within US1/US2)
3. Parallel: T003, T004, T005, T006, T011, T012
4. Operator: T010 (post-deploy, best-effort)

---

## Notes

- `[P]` tasks operate on different files with no intra-group dependencies.
- T009 is a stable-ID stub (absorbed into T008's third test case).
- T010 is explicitly non-blocking for release — it is an operator-run backfill step.
- `useRef` removal in T005 is conditional — verify `blundersWrittenRef` is the only `useRef` consumer before removing the import.
- `MistakesListScreen.jsx:274` and `MistakeDetailScreen.jsx:160` have read-only `!== 'unknown'` display filters — these are NOT write sites and must not be touched.
- `classifyAll` is preserved (active callers: debug endpoint, `classify_all.mjs`, `explainSimulate.js`). Its removal is deferred to Epic 3 (coach explanation rebuild). T006 must confirm this by running `rg 'classifyAll' connect-four/server/` and recording all callers explicitly. Only `classifyBestMove` is eligible for deletion in Epic 2.
- `safeTag` in T002 is used exclusively in the INSERT row (`pattern_category: safeTag`). The JSON response and `analyzedMoves.push()` must use raw `tag`. Never put `safeTag` in the response.
- Non-blunder plies return `patternTag: null`, `reason: null`, `direction: null` in the analyze response. This is accepted behaviour. The review UI must handle null gracefully.
- T013 reuses the T001 `VALID_BLUNDER_TAGS` import and closes the stale-client 500 window on `POST /api/blunders` with ~3 lines. It is independent of T002–T008 but depends on T001.
- The analyze endpoint's blunder INSERT is fire-and-forget — a DB failure (other than `23505`) must be logged but must NOT cause a non-200 response.
- `docs/architecture/testing-conventions.md` is a new file. Check `docs/index.md` for the architecture docs section before adding the pointer.
