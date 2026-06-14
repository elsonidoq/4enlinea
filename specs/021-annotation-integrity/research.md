# Research: Annotation Integrity Gate

## Unknowns Resolved

### 1. Board 4-window enumeration for P5

**Decision**: Write a dedicated `getWindowsForCell(board, col, row)` helper in the gate module rather than reusing `getMajorThreatCells` or `getWinningWindows` directly.

**Rationale**:
- `getMajorThreatCells` returns only major threats (3 discs + 1 empty) — not all 4-windows through a cell. It does not enumerate windows that contain 0, 1, or 2 discs, which are needed for the "blocked" check.
- `getWinningWindows` enumerates windows completed by placing a disc at a cell for a specific player. But for the P5 blocked-group check we need all windows *containing* the cell, not windows completed *by* it. And we check both colors simultaneously (blocked = contains at least one disc of each color).
- A dedicated helper is ~25 lines of straightforward geometry: for each of the 4 directions (horizontal, vertical, 2 diagonals), for each offset 0–3, construct the 4-cell window. Check if the window contains discs of both player 1 and player 2.

**Alternatives considered**: Could call `getWinningWindows(board, col, row, 1)` and `getWinningWindows(board, col, row, 2)` and merge results. But `getWinningWindows` filters windows that don't have the specified `player`'s disc in the other 3 cells — it assumes the cell is empty and the player is placing a disc there. This is fundamentally the wrong abstraction.

### 2. Quota decrement relocation point

**Decision**: Move `checkAndDecrementQuota` from its current position (line 762–767, before the LLM call) to after the validation gate passes. The gate runs after `injectDefaultActiveZone` and before the cache write.

**Rationale**: The current code decrements quota on cache miss before the LLM call. The new flow:
1. Cache check (unchanged — no quota decrement on cache hit)
2. LLM call (unchanged — no quota involvement)
3. Validation gate (NEW — P1–P6 checks)
4. If valid → decrement quota → write cache → respond
5. If invalid → retry LLM → validate again → if valid, decrement quota once → write cache → respond
6. If retry also invalid → insert `deep_reveal_failures` → serve Tier-1 fallback → no quota decrement

The `checkAndDecrementQuota` function uses `req.user` and calls `supabase` — it needs the original user object. The call site provides it.

### 3. Direct DB writes for `deep_reveal_failures`

**Decision**: Use the existing `supabase` service-role-key client for `deep_reveal_failures` inserts, not a new pg pool.

**Rationale**: The spec says "the pg pool already imported in index.js" but the actual codebase does NOT import `pg` — all server-side DB operations use the Supabase client initialized with the service role key (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS. Using `supabase.from('deep_reveal_failures').insert(...)` is the correct mechanism. The `deep_reveal_failures` table is a backend-only table (like `explanation_cache`, `tracks`, `puzzles`), so it needs RLS enabled with no public policies and no GRANT statements.

### 4. Zone parser extraction strategy

**Decision**: Extract `isValidSpec` and `zoneToOverlays` into `connect-four/server/zoneParser.js`.

**Rationale**:
- The functions `isValidSpec` and `zoneToOverlays` are pure and have no DOM dependencies. They can be extracted verbatim.
- `parseAnnotatedText` stays in `annotatedText.js` for client-side rendering — the server doesn't need character-offset tracking. The server gate needs only to parse zone specs to cell sets.
- The extraction creates a shared module at `connect-four/server/zoneParser.js`. The client imports from `annotatedText.js` (unchanged). If future refactoring wants true sharing, the server file can be re-exported from a `shared/` directory, but there is no need today.
- The server module exports: `parseZoneSpecs(explanation)` → `Array<{ spec: string, innerText: string }>` (parses all `[zone:spec]...[/zone:spec]` tags) and `expandSpec(spec)` → `Array<{ col: number, row: number }>` (resolves to 0-indexed cells, no `tg` support for server — `tg` is client-only rendering concern; any `tg` in server output would be an invalid spec that returns `[]`).

### 5. Regression harness fixture strategy

**Decision**: Embed fixture data statically in the test file.

**Rationale**: The spec says "may embed fixture data statically" and the regression harness is defined as a unit test ("no server running"). Querying actual `llm_feedback` DB rows would create a DB dependency for a unit test, which is fragile and slow. Static fixture data includes:
- The `movestring` for each fixture row
- The `llm_prompt` (for reconstruction context)
- The `llm_response` (the annotated explanation text to validate)
- The expected outcome (reject or pass)

The `llm_feedback` table stores `llm_response` (the LLM output). For P3 fixtures, the raw `llm_response` text is enough. For P5 fixtures, the `movestring` and `llm_response` are both needed (the gate reconstructs the board from `movestring`).

When fixture data cannot be extracted from existing DB rows (or is impractical to capture), synthetic fixtures are acceptable per the spec's guidance.

**Edge case**: The two P1 fixture rows (`59a11a79`, `f4241ea6`) are expected to PASS Epic A's gate — they test the Epic B grounding contract, not the mechanical gate. The regression harness must assert pass for these.

**P6 has no DB fixtures** — the spec requires synthetic test strings constructed from the pass/fail examples in FR-009.

### 6. Retry mechanism implementation

**Decision**: After validation failure, call `callLLM(prompt)` with the same prompt that was used for the initial attempt. The retry is a synchronous wait (inside the async handler). No cache check or quota decrement runs during the retry.

**Rationale**: `callLLM` is a pure function that takes a prompt string and returns an explanation string. There is no state to reset — simply call it again. The rate limit (5 req/min on the endpoint) bounds the total LLM calls per client. Inside a single request, one initial call + one retry = 2 LLM calls, which is well within the rate limit window.

### 7. P5 blocked-window enumeration via adapter

**Decision**: Write `getWindowsThroughCell(col, row, COLS=7, ROWS=6)` in the gate module. For each of 4 directions, for offsets 0–3, produce the 4-cell window. Check if the window is blocked (= has at least one disc of each color). If ANY window through the cell is live (= not blocked), the cell passes. If ALL windows through the cell are blocked, the cell fails.

The adapter checks the board for each window: `board[r][c]` values. Blocked = the set of values in the window contains both 1 and 2. Live = set contains only 0 + at most one of {1,2}, or only 0.

### 8. P2 regex mechanics

**Decision**: The P2 regex `col(?:umn)?\s*([1-7])` operates on the inner text of each zone tag whose spec names a column (e.g., `col4`). The captured group's numeric value is compared directly to the spec's numeric value (both 1-indexed). If they differ, reject.

### 9. P6 regex mechanics

**Decision**: Two regexes applied to zone inner text (case-insensitive, word-boundary):
- `\bc\d+r\d+\b` — raw coordinate like `c4r3`
- `\bcol\d+\b` — raw column like `col5`
If either matches anywhere inside the zone inner text, that zone fails P6.

### 10. Tier-1 fallback cache access

**Decision**: The Tier-1 fallback reads `explanation_cache` for the same `positionHash` and looks for `deep_reveal_json` with a `fullText` field. The old `/api/explain-move` endpoint writes `deep_reveal_json = { patternTag, fullText, continuationLine, boardAnnotation }`. If the cache row exists, extract `fullText`. If no row exists, return the static string `"Detailed explanation unavailable."`.

This is consistent with the existing codebase pattern where `/api/explain-move` at `index.js:436–439` writes the Tier-1 data to the same cache table.
