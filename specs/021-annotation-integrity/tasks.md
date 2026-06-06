# Tasks: Deep Reveal Annotation Integrity Gate

**Branch**: `021-annotation-integrity` | **Created**: 2026-06-04
**Spec**: specs/021-annotation-integrity/spec.md
**Plan**: specs/021-annotation-integrity/plan.md

---

## Task 1: Migration 031 — Create `deep_reveal_failures` table

**File**: `connect-four/server/migrations/031_deep_reveal_failures.sql`

Create the failure-logging table. Backend-only table (no RLS policies, no GRANT statements). Server writes via Supabase service-role-key client, which bypasses RLS.

**Schema**:
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `position_hash` | `text` | NOT NULL |
| `movestring` | `text` | NOT NULL |
| `col` | `integer` | NOT NULL |
| `endpoint` | `text` | NOT NULL, default `'/api/explain-move-llm'` |
| `llm_prompt` | `text` | NOT NULL |
| `raw_llm_output` | `text` | NOT NULL |
| `failure_reason` | `text` | NOT NULL (JSON array string, e.g. `'["P3:player_name","P5:blocked"]'`) |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |

**Definition**: UUID pk; all columns NOT NULL with appropriate types; no FK constraints (this is an append-only log, not a relational entity). Only `id` and `created_at` have defaults. No unique constraints — same position_hash can fail multiple times. Single DDL file, idempotent via `IF NOT EXISTS` guard.

**Acceptance**: Run against local dev Supabase (via `psql` or migration runner). Table is queryable with no RLS errors. Insert a test row via `supabase.from('deep_reveal_failures').insert(...)` and verify it appears.

---

## Task 2: Extract zone spec parser — `zoneParser.js`

**File**: `connect-four/server/zoneParser.js` (NEW)

Extract zone parsing from `connect-four/src/lib/annotatedText.js` into a server-side pure module. The client-side `annotatedText.js` is preserved unchanged — this is a server-only extraction.

**Required exports**:

1. `parseZoneSpecs(explanationText: string) → Array<{ spec: string, innerText: string }>`
   - Parses all `[zone:spec]...[/zone:spec]` tags from the explanation text using a regex similar to `annotatedText.js parseAnnotatedText` tag regex but WITHOUT tracking character offsets.
   - Returns only the spec string and the inner display text for each tag.
   - Unknown spec formats are still parsed (the regex captures everything between `[zone:` and `]`), but `expandSpec` handles validation.
   - Must handle multiple zones, zones with no inner text, and zones adjacent to each other.
   - Must handle the closing tag `[/zone:<spec>]` where the spec in the closing tag must match the opening tag.
   - Returns an empty array when no zone tags are found.

2. `expandSpec(spec: string) → Array<{ col: number, row: number }>`
   - Resolves a zone spec string to **0-indexed** coordinates (col 0..6, row 0..5).
   - Supported spec formats:
     - `colN` (1-indexed) → all 6 cells in column N-1. Example: `col4` → `[{c:3,r:0}, {c:3,r:1}, ..., {c:3,r:5}]`.
     - `cNrM` (1-indexed) → single cell at column N-1, row M-1. Example: `c4r3` → `[{c:3,r:2}]`.
     - `cells:c1r1,c2r2,...` → list of individual cells (each 1-indexed, comma-separated, no spaces).
     - `rowN` (1-indexed) → all 7 cells in row N-1. Example: `row3` → `[{c:0,r:2}, {c:1,r:2}, ..., {c:6,r:2}]`.
     - `tg` → returns `[]` (empty array). `tg` is a client-only rendering spec; any `tg` in server output resolves to zero cells for P5, making P5 vacuously pass. P1 on the other hand recognizes `tg` as a valid spec syntax, so `tg` passes P1.
   - Out-of-bounds cells (col < 0 or > 6, row < 0 or > 5 after -1 conversion): return `[]` for the entire spec (the spec is invalid). The gate module's P1 and P5 checks will handle this.
   - Unknown spec format (does not match any of the above patterns): return `[]`.

**DO NOT export**: `parseAnnotatedText`, `getZoneColor`, `regexFallbackParse` — those remain client-side only.

**Implementation notes**:
- Constants `COLS = 7`, `ROWS = 6` declared locally.
- Port the `isValidSpec` logic and the coordinate-expansion logic from `zoneToOverlays`, but adapted for the server:
  - `zoneToOverlays` returns `{c, r}` objects; `expandSpec` returns `{col, row}` to match the `Board` class convention.
  - `zoneToOverlays` takes `userMajorThreats`/`opponentMajorThreats` params for `tg` resolution; `expandSpec` does NOT take those params and treats `tg` as returning `[]`.
  - No console.warn calls for invalid specs (the gate reports failures programmatically).
- The `parseZoneSpecs` function is NEW — it extracts only the spec/innerText pairs without computing character offsets. Do NOT reuse `parseAnnotatedText` — write a simpler server-specific parse.

**Acceptance**: Unit-testable in isolation: `parseZoneSpecs` on known input strings returns the correct spec/innerText list. `expandSpec` on known spec strings returns the correct 0-indexed cells. Edge cases: `tg` returns `[]`, out-of-bounds spec returns `[]`, unknown spec returns `[]`, `cells:` with mixed valid/invalid cells returns only valid ones (or empty if none valid).

---

## Task 3: Annotation gate module — `annotationGate.js`

**File**: `connect-four/server/annotationGate.js` (NEW)

Pure-function validation gate. No side effects, no DB dependencies, no I/O. Accepts an explanation string (with `[zone:...]` tags) and a reconstructed `Board` object (imported from `./classifier.js`), returns validation results.

**Required exports**:

1. `validateAnnotation(explanation: string, board: Board) → { valid: boolean, failures: string[] }`
   - Entry point. Runs ALL checks (P1 through P6) on ALL zones.
   - Calls `parseZoneSpecs` to get zones.
   - For each zone, calls `expandSpec` to get 0-indexed cells.
   - Runs P1, P2, P3 (whole text), P5 (per zone with cells + board), P6 (per zone inner text).
   - Accumulates ALL failures across all zones in the `failures` array (not short-circuiting on first failure).
   - `valid` is `true` iff `failures` is empty.
   - Failure format: `"<principle>:<detail>"` e.g. `"P3:player_name"`, `"P5:blocked"`, `"P1:invalid_spec"`.

2. `checkP1(zoneSpecs: Array<{ spec: string, innerText: string }>) → string[]`
   - Known spec syntax passes (any spec matching `isValidSpec` semantics — `colN`, `cNrM`, `cells:...`, `rowN`, `tg`).
   - Unknown spec syntax fails. Failure code: `"P1:invalid_spec"`.
   - A spec that resolves to zero cells (e.g. out-of-bounds) also fails P1. Failure code per zone: `"P1:empty"`.
   - tg is recognized (valid syntax), so it does NOT fail P1 even though `expandSpec` returns `[]`.
   - One entry per failing zone. Use the zone's spec string in the detail for traceability: `"P1:invalid_spec:col9"`.

3. `checkP2(zones: Array<{ spec, innerText }>, expandedCellsMap: Map<spec, Array<{col,row}>>) → string[]`
   - Runs ONLY on zones whose spec is `colN` (column zone).
   - For each colN zone, scan `innerText` for regex: `/col(?:umn)?\s*([1-7])/gi`.
   - If ANY captured group's numeric value does not match the spec's column number (both 1-indexed), fail.
   - Multiple regex matches per zone: if any captured group mismatched, the zone fails.
   - Failure code: `"P2:col_mismatch:<spec>"`.
   - No false positives: the regex requires `col` or `column` followed by optional whitespace and a digit 1–7.

4. `checkP3(fullText: string) → string[]`
   - Scans the ENTIRE explanation string (not zone-specific content).
   - Three sub-checks, each with their own failure codes:
     - **Disc-notation blocklist**: regex `/\b[RY]\b/g` (case-insensitive). Failure: `"P3:disc_notation"`.
     - **Player-name blocklist**: regex `/\b(Red|Yellow|Black)\b/gi` (case-insensitive). Failure: `"P3:player_name"`.
     - **Engine-jargon blocklist**: phrases `forced win`, `leaf position`, `the solver`, `forced_win`, `the simulation`, `your score`, `the score is`, `patterns in data` — case-insensitive, phrase match (not whole-word). Failure: `"P3:engine_jargon"`.
   - All three sub-checks run independently. Failures are accumulated (same zone may contribute multiple failure codes).
   - Do NOT use a single combined regex — keep three separate checks for clear failure reporting.

5. `checkP5(board: Board, zoneSpecs: Array<{ spec, innerText }>) → string[]`
   - Board-only P5 check (deferred strong P5 goes in Epic B).
   - For each zone spec in `zoneSpecs`:
     - Expand spec to 0-indexed cells via `expandSpec`.
     - If all cells are out-of-bounds (empty array from `expandSpec` for reasons other than `tg`), the zone fails P5. Failure code: `"P5:out_of_bounds"`.
     - For `tg` spec: `expandSpec` returns `[]`. P5 is vacuous — no cells to check, so no windows to enumerate. `tg` passes P5. (P1 already handles `tg` passing.)
     - For each cell in the expanded set, enumerate all 4-windows that contain this cell. If ANY 4-window through ANY cell is LIVE, the zone PASSES. If EVERY 4-window through EVERY cell is BLOCKED, the zone FAILS.
     - A 4-window is BLOCKED if it contains at least one disc of each color (board value `1` AND `2`).
     - A 4-window is LIVE if it contains all empty cells (`0`) or cells of at most one color.
     - Failure code per zone: `"P5:blocked:<spec>"`.
   - The `getWindowsThroughCell` helper (see below) generates the 4-windows.

6. `checkP6(zones: Array<{ spec, innerText }>) → string[]`
   - For each zone, scan `innerText` against two regexes:
     - `/\bc\d+r\d+\b/gi` — raw coordinate like `c4r3` in the visible text.
     - `/\bcol\d+\b/gi` — raw column like `col5` in the visible text.
   - If EITHER pattern matches, the zone fails P6.
   - Example PASSING: `[zone:c4r3]the cell on row 3[/zone:c4r3]` (no raw coordinate visible).
   - Example FAILING: `[zone:c4r3]c4r3[/zone:c4r3]` (raw coordinate `c4r3` visible).
   - Failure code per zone: `"P6:raw_coordinate:<spec>"`.
   - IMPORTANT: P6 is an all-or-nothing check per zone. Any match in the inner text fails that zone.

**Helper functions (internal exports, tested)**: `getWindowsThroughCell(col, row)`, `isWindowBlocked(board, window)`.

- `getWindowsThroughCell(col, row)`: For each of 4 directions (horizontal, vertical, diagonal-up, diagonal-down), for each offset 0..3, construct the 4-cell window `[{c,r}, {c,r}, {c,r}, {c,r}]` that contains the given cell. Return all such windows (max ~24 for a given cell — some are partial near board edges, which are ignored: only include full 4-cell windows fully within the 7x6 board). Implementation: iterate offset 0..3, for each offset compute the 4 positions.

- `isWindowBlocked(board, window)`: For a 4-cell window array `[{c,r},...]`, check `board[r][c]` for each. If the set of non-zero values contains both `1` and `2`, the window is blocked. Otherwise it's live.

**Imports**: `Board` from `./classifier.js` (type-hint only for JSDoc; the function actually receives an instance). `parseZoneSpecs`, `expandSpec` from `./zoneParser.js`.

**Constants**: `COLS = 7`, `ROWS = 6` (same as zoneParser).

**Acceptance**: Each P-check function is independently testable with synthetic inputs. The `validateAnnotation` entry point correctly aggregates failures across checks and zones. Board occupancy tests: a board with all-empty cells causes all zones to pass P5. A board where every 4-window through zone cells is blocked causes P5 failure.

---

## Task 4: Regression harness — `annotationGate.test.js`

**File**: `connect-four/server/annotationGate.test.js` (NEW)

Unit test file using Jest (compatible with `npm run test:fast`). Static fixture data only — no DB, no server, no solver. Embedded fixtures include the `llm_feedback` rows from the traceability table as plain JS objects.

**Test structure**:

1. **P1 tests (1 fixture: synthetic)**:
   - Invalid spec format (e.g., `[zone:foo]text[/zone:foo]`): assert `checkP1` rejects with `"P1:invalid_spec"`.
   - Out-of-bounds spec (e.g., `col8`): assert `checkP1` rejects (P1 catches out-of-bounds via `expandSpec` returning `[]` simultaneously with P5's out-of-bounds check).
   - `tg` spec: assert passes P1 (recognized syntax).

2. **P2 fixture: `58f99d33`**:
   - Known-failing: column name in text does not match the zone spec's column number.
   - Assert `checkP2` returns failure with `"P2:col_mismatch"`.

3. **P3 fixtures (6 rows): `e094ee00`, `b6071ab4`, `5a10047c`, `972f74e1`, `092f4340`, `0f0d66b3`**:
   - Known-failing for various blocklist reasons.
   - Assert each fixture is rejected by `checkP3` with appropriate failure codes.
   - At minimum: one fixture exercises disc-notation blocklist, one exercises player-name, one exercises engine-jargon.

4. **P5 board-only fixtures (2 rows): `e86eeac9`, `8d83947e`**:
   - Known-failing: zone references occupied cells where every 4-window through those cells is blocked.
   - Includes `movestring` for board reconstruction.
   - Assert `checkP5` on a `new Board(movestring)` with the fixture's spec returns `"P5:blocked"`.

5. **P5 deferred fixture: `403a21c9`**:
   - Non-existent threat, but 4-window is live (one or more empty cells in the same 4-window).
   - Assert `checkP5` PASSES (returns empty failures array). Marked as `deferred` in metadata.

6. **P1 pass fixtures (Epic B ground): `59a11a79`, `f4241ea6`**:
   - These rows test the Epic B grounding contract, not the mechanical Epic A gate.
   - Assert they PASS the full `validateAnnotation` gate (not rejected by any check).

7. **P6 synthetic tests**:
   - No DB fixtures available. Construct synthetic strings from FR-009 examples:
     - PASS: `[zone:c4r3]the cell on row 3[/zone:c4r3]` — no raw coordinate in text.
     - PASS: `[zone:col4]this column[/zone:col4]` — no raw column in text.
     - FAIL: `[zone:c4r3]c4r3[/zone:c4r3]` — raw coordinate `c4r3` visible.
     - FAIL: `[zone:col4]col4[/zone:col4]` — raw column `col4` visible.
     - FAIL: `[zone:c4r3]look at c4r3[/zone:c4r3]` — raw coordinate in a phrase.
     - FAIL: `[zone:col4]play col4 here[/zone:col4]` — raw column in a phrase.

8. **`validateAnnotation` integration tests**:
   - Run the full gate on each fixture and assert pass/reject/deferred matches expectations.
   - Run on a clean explanation with valid zones and assert pass.
   - Run on a P5-only failing fixture and assert failure reason includes both zone and P5 code.

9. **Helper unit tests**:
   - `getWindowsThroughCell`: assert returns correct windows for center cell (col 3, row 3), corner cell (col 0, row 0), and edge cell (col 0, row 3). Assert direction count and window count.
   - `isWindowBlocked`: assert blocked when window has both colors, live when all empty, live when only one color.

**Fixture data format** (embedded in test file):
```js
const FIXTURES = [
  {
    id: 'e86eeac9',
    description: 'cells on occupied cells — all windows blocked',
    movestring: '...',
    col: 3,
    explanation: '[zone:...]...[/zone:...]',
    expected: 'reject', // 'reject' | 'pass' | 'deferred'
    checks: ['P5'],
  },
  // ...
];
```

**Acceptance**: `npm run test:fast` passes with all green assertions. Fixture IDs are traceable to `llm_feedback` table. P6 synthetic fixtures cover both pass and fail cases. All 9 known-failing fixture assertions return reject, `403a21c9` returns pass (deferred), `59a11a79`/`f4241ea6` return pass.

---

## Task 5: Endpoint modification — gate, retry, Tier-1 fallback, and quota relocation

**File**: `connect-four/server/index.js` (MODIFY: `POST /api/explain-move-llm` handler, lines 719–796)

This is a single atomic change to one handler function. Do NOT split into sub-tasks. The entire control flow change lives in this one file.

**Current flow** (lines 719–796):
1. Auth check
2. Input validation
3. Board reconstruction (`new Board(movestring)`)
4. Cache check: if `explanation_cache` has `deep_reveal_json` for `positionHash` → return cached
5. Quota decrement: `checkAndDecrementQuota(req.user)` → 429 if exceeded
6. Build context, call LLM, inject default active zone
7. Fire-and-forget cache write
8. Return `{ explanation, prompt }`

**New flow**:

1. Auth check (unchanged)
2. Input validation (unchanged)
3. Board reconstruction (unchanged)
4. Cache check (unchanged — return cached if found, no quota decrement)
5. Build context (unchanged)
6. Call LLM (unchanged — single call to `callLLM(prompt)`)
7. Inject default active zone (unchanged)
8. **Validate** via `validateAnnotation(explanation, board)`:

   a. **Gate pass**: Continue to step 9.

   b. **Gate fail (first attempt)**: Retry once:
      - Call `callLLM(prompt)` with the SAME prompt (no cache check, no quota).
      - Inject default active zone on retry output.
      - Validate retry output.
      - If retry passes → continue to step 9 (quota decrement once, cache write once).
      - If retry also fails → go to step 11 (fallback).

9. **Quota decrement** (RELOCATED from before LLM call to after validation):
   - Call `checkAndDecrementQuota(req.user)` only on the valid outcome path.
   - If user is free-tier, decrement exactly once (not twice on retry success).
   - If user is paid tier, `checkAndDecrementQuota` returns `{ allowed: true }` immediately (no decrement needed).

10. **Cache write** (fire-and-forget, unchanged pattern):
    - `supabase.from('explanation_cache').insert({ position_hash, one_liner: '', deep_reveal_json: { explanation, prompt } })`
    - No `await` — fire-and-forget per existing pattern (Plan Correction #2).
    - Return `{ explanation, prompt }` (response shape unchanged per FR-019).

11. **Fallback path** (both attempts failed):
    a. **Read Tier-1 fallback**: Query `explanation_cache` by `positionHash`. Look for a row where `deep_reveal_json` has a `fullText` key (the Tier-1 shape written by `/api/explain-move` endpoint). Use `.order('created_at', { ascending: false }).limit(1)` to handle the case of multiple rows with the same `position_hash`. Extract `fullText` from the first result row.
    b. If no Tier-1 row exists (cache miss for Tier-1 shape), use static fallback: `"Detailed explanation unavailable."`.
    c. **Log failure**: Insert a row into `deep_reveal_failures` table via `supabase.from('deep_reveal_failures').insert({...})`. Fields: `position_hash`, `movestring`, `col`, `endpoint: '/api/explain-move-llm'`, `llm_prompt` (the prompt), `raw_llm_output` (the retry's invalid output — the final failed attempt), `failure_reason` (JSON array string of all failure codes from `validateAnnotation`), `created_at: new Date().toISOString()`. Use `await` on the insert (synchronous within the handler) to ensure the log is written before responding. If the insert fails, log the error but do NOT crash the response.
    d. **Do NOT cache** the invalid output (per FR-014). **Do NOT decrement** quota (per FR-016).
    e. Return `{ explanation: fallbackText, prompt: null, cached: false }`.

**Implementation details**:

- Import `validateAnnotation` from `./annotationGate.js` at the top of the file.
- The existing quota block at lines 762–767 (`if (req.user.tier === 'free') { ... }`) must be REMOVED from its current location and placed after validation passes. The `checkAndDecrementQuota` function signature and behavior are unchanged — only the call site moves.
- The existing cache write at lines 782–788 must be replaced with the new conditional write (only on valid path).
- The retry must use the SAME `prompt` variable (the one from `buildExplainContext`). Do NOT rebuild context for the retry.
- The retry should use `await` on `callLLM(prompt)` (same as initial call).
- Error handling: wrap the entire LLM+gate+retry+fallback block in a try/catch. If ANY part throws an unhandled exception, fall through to the existing `catch` at line 792 which returns 500. Do NOT silently catch gate errors, retry errors, or fallback errors.
- Rate limit of 5 req/min is preserved (the rate limiter is on the route, not inside the handler). Two LLM calls within one request count against the same rate limit window but are transparent to the user (the request only counts once against the rate limit).
- The existing code structure uses `supabase` as a variable — if it is falsy (DB not configured), the cache check is skipped. The new code must preserve this: if `!supabase`, skip cache writes AND skip `deep_reveal_failures` inserts AND skip quota decrement. Return the explanation directly (no gate, no retry, no fallback — just the raw LLM output). Add a `console.warn` log for this path.

**Key invariants to preserve**:
- Response shape `{ explanation, prompt, cached? }` — unchanged (FR-019).
- Cache hit returns `{ explanation, prompt, cached: true }` — unchanged.
- Fire-and-forget cache write pattern — preserved (Plan Correction #2).
- Auth, validation, error responses — unchanged.
- No `pg` pool usage — use `supabase` client for all DB operations (Plan Correction #3).

**Acceptance** — manually verify each scenario end-to-end using `curl` against a local dev server:

**Scenario (a): Gate passes on first attempt**
- Use a position that produces a clean explanation (e.g., a short forced-win movestring where the LLM reliably emits valid zone tags).
- Expected: Single LLM call. Quota decremented once. Response has `{ explanation, prompt }` with zone annotations present. Row written to `explanation_cache`. No row in `deep_reveal_failures`.

**Scenario (b): Gate fails first attempt, passes on retry**
- Seed the fixture: temporarily patch `validateAnnotation` to fail on the first call and pass on the second.
- Expected: Two LLM calls total. Quota decremented exactly once (the retry success path). Response has valid explanation with zone annotations. Cache write fires (fire-and-forget). No row in `deep_reveal_failures`.

**Scenario (c): Both attempts fail — Tier-1 fallback row exists in `explanation_cache`**
- Pre-condition: `explanation_cache` contains a row with the same `position_hash` whose `deep_reveal_json` has a `fullText` key (written by the `/api/explain-move` endpoint).
- Trigger: Temporarily patch `validateAnnotation` to always return failures.
- Expected: Two LLM calls. Quota NOT decremented (`deep_reveal_count` unchanged before/after). Response is `{ explanation: <fullText from cache>, prompt: null, cached: false }`. One row inserted into `deep_reveal_failures` with all fields populated (`position_hash`, `movestring`, `col`, `endpoint: '/api/explain-move-llm'`, `llm_prompt`, `raw_llm_output` from the retry, `failure_reason` JSON array).

**Scenario (d): Both attempts fail — no Tier-1 row in `explanation_cache`**
- Pre-condition: `explanation_cache` has NO row for the given `position_hash`, or only has a Tier-2 shaped row (no `fullText` key).
- Trigger: Temporarily patch `validateAnnotation` to always return failures.
- Expected: Two LLM calls. Quota NOT decremented. Response is `{ explanation: "Detailed explanation unavailable.", prompt: null, cached: false }`. One row inserted into `deep_reveal_failures`.

**Additional assertions (all scenarios)**:
- Server does not crash on any branch of the control flow.
- Rate limit behavior is unchanged (the rate limiter fires on the route before the handler runs).
- DB-off mode (`!supabase`): set `supabase` to null/falsy in dev. Response returns raw LLM explanation with no gate, no retry, no fallback, no quota decrement. `console.warn` is emitted.

---

## Task 6: Update architecture documentation

**Files**:
- `docs/architecture/data-model.md` — add `deep_reveal_failures` table description
- `docs/architecture/server-conventions.md` — add gate insertion point documentation

**data-model.md changes**:
- Add `deep_reveal_failures` to the list of backend-only tables in the "Backend-only tables" section.
- Add a section describing the table schema (copied/adapted from `specs/021-annotation-integrity/data-model.md`):
  - Column list, types, constraints
  - Access pattern note: "Backend-only. Server writes via Supabase service-role-key client. RLS enabled, no public policies."
  - Purpose: "Records LLM outputs that failed validation after retry, for offline analysis."

**server-conventions.md changes**:
- Add a section under/after the `POST /api/explain-move-llm` endpoint description documenting:
  - The validate-then-cache gate insertion point.
  - The six checks (P1–P6) and what each validates.
  - The retry-on-fail mechanism (one retry after validation failure).
  - The Tier-1 fallback behavior (cache read or static string).
  - The quota relocation (decremented only after validation passes).
  - The `deep_reveal_failures` logging for double-failure.
- Reference the module locations: `zoneParser.js`, `annotationGate.js`.

**Acceptance**: `docs/architecture/data-model.md` contains the `deep_reveal_failures` table definition. `docs/architecture/server-conventions.md` describes the gate flow. Both docs are internally consistent with the final implementation. No stale information survives.
