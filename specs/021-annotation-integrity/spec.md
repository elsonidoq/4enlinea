# Feature Specification: Deep Reveal Annotation Integrity

**Feature Branch**: `021-annotation-integrity`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description from Deep Reveal Epic A — a server-side validate-then-cache gate for the shipped Deep Reveal annotation/highlight feature

## User Scenarios & Testing

### User Story 1 - User receives honest, highlightable explanations (Priority: P1)

A user opens a Deep Reveal explanation in Challenges, Position Explorer, or Past Mistakes. Every highlighted reference lights up a real board location, the text and the highlight agree on what is named, and the language uses only vocabulary the user can perceive (green/grey discs, not R/Y or engine jargon). When the LLM produces an invalid output, the system corrects it before the user can read it rather than silently dropping invalid highlights after the explanation is cached.

**Why this priority**: This is the core value of the feature. Without the integrity gate, invalid highlights reach the user today (documented in llm_feedback rows). Every subsequent user story is a specific facet of this one guarantee.

**Independent Test**: Can be fully tested by replaying known-failing llm_feedback fixtures through the validate-then-cache path and asserting the gate rejects them before caching. No user interface is needed.

**Acceptance Scenarios**:

1. **Given** a Deep Reveal explanation whose zone spec references an occupied cell that can never form a winning line (e.g., `[zone:cells:c2r1,c2r2]` where both cells are filled), **When** the LLM output is processed by the validate-then-cache gate, **Then** the output is rejected and either retried or served as Tier-1 fallback, never cached.
2. **Given** a Deep Reveal explanation where the zone spec names `col4` but the enclosed text says "column 1", **When** the gate checks P2, **Then** the output is rejected.
3. **Given** a Deep Reveal explanation that contains the phrase "forced win" or the bare token `R` or the player name "Yellow", **When** the gate checks P3 blocklists, **Then** the output is rejected.
4. **Given** a zone spec that references only in-bounds cells with at least one live 4-window (e.g., a non-existent threat), **When** the gate checks the board-only P5, **Then** the zone passes (the strong P5 check is deferred to Epic B).
5. **Given** a zone spec that references an out-of-bounds cell (e.g., col 8, row -1), **When** the gate checks P5, **Then** the output is rejected.
6. **Given** a Deep Reveal explanation where the inner text of a zone tag contains a raw coordinate token matching `\bc\d+r\d+\b` or `\bcol\d+\b`, **When** the gate checks P6 natural-language references, **Then** the output is rejected.

---

### User Story 2 - Quota is consumed only for valid delivered explanations (Priority: P1)

The user's weekly Deep Reveal quota unit is decremented only when a valid Tier-2 explanation is returned to the user. Internal retries and Tier-1 fallback cases do not consume quota.

**Why this priority**: Incorrect quota accounting is a user trust issue. If quota is consumed for an invalid explanation (Tier-1 fallback), the user loses a paid allocation for an unrecoverable failure. The epic explicitly flags this as a critical side-effect fix.

**Independent Test**: Can be tested by asserting the quota decrement runs after the validation gate and is skipped on retry and fallback paths. No UI needed.

**Acceptance Scenarios**:

1. **Given** the user has quota remaining, **When** the LLM output passes validation on the first attempt, **Then** one quota unit is decremented and the explanation is cached.
2. **Given** the user has quota remaining, **When** the LLM output fails validation, is retried once, and passes on retry, **Then** one quota unit is decremented (not two).
3. **Given** the user has quota remaining, **When** both the initial attempt and the retry fail validation, **Then** no quota unit is decremented and a Tier-1 fallback is served.

---

### User Story 3 - Invalid outputs are logged for offline analysis (Priority: P2)

When the gate rejects an LLM output and the retry also fails, the system records the failure details in a durable log before serving the Tier-1 fallback. This log is available for offline analysis to improve the explanation engine.

**Why this priority**: This is a diagnostic instrument, not a user-facing feature. It enables the team to identify and fix recurring failure modes in the coach. Critical for the iterative improvement loop but not part of the core user experience.

**Independent Test**: Can be tested by asserting failure rows are written to the deep_reveal_failures table with the correct content when the gate rejects output. No UI needed.

**Acceptance Scenarios**:

1. **Given** the gate rejects an LLM output after retry, **When** the failure handling runs, **Then** a row is inserted into `deep_reveal_failures` with the position_hash, movestring, col, raw LLM output, failure reason, and timestamp.
2. **Given** the gate passes an LLM output, **When** the gate completes, **Then** no row is inserted into `deep_reveal_failures`.

---

### User Story 4 - Regression harness validates the gate (Priority: P2)

A developer runs the test suite after modifying the validation gate or any related code. The harness replays all known-failing llm_feedback fixture rows through the gate and asserts they are correctly handled: the blocked-group fixtures are rejected by the gate, and the deferred strong-P5 fixture is noted as such.

**Why this priority**: This protects the gate against regressions as the codebase evolves. It is a first-class deliverable of the epic per the definition of done.

**Independent Test**: Can be tested by running the regression harness with no server running. It exercises only the validation functions, not the HTTP endpoint. Fixtures are static.

**Acceptance Scenarios**:

1. **Given** the regression harness is run, **When** fixture `e86eeac9` (cells on occupied cells) is replayed through the P5 check, **Then** the gate rejects the output.
2. **Given** the regression harness is run, **When** fixture `8d83947e` (diagonal through own disc) is replayed through the P5 check, **Then** the gate rejects the output.
3. **Given** the regression harness is run, **When** fixture `403a21c9` (non-existent threat, 4-window live) is replayed through the P5 check, **Then** the gate passes the output (deferred to Epic B).
4. **Given** the regression harness is run, **When** each P3 fixture is replayed through the blocklist check, **Then** the gate rejects each one.
5. **Given** the regression harness is run, **When** the P2 fixture is replayed through the text-highlight agreement check, **Then** the gate rejects the output.

### Edge Cases

- What happens when a zone spec uses an unrecognized format (e.g., `[zone:invalid_spec]`)? The parser must reject it — the zone fails P1 (cannot resolve to any cell).
- What happens when a zone spec is syntactically valid but closes on a column with an empty-cell count of zero (full column)? The column zone `colN` includes rows 0–5; a full column still has in-bounds cells (occupied cells are still valid board locations). The check is for blocked 4-windows, not occupancy, so a full column passes P5 if any 4-window through it is live. The out-of-bounds check is the only hard geometry rejection.
- What happens when there is no `explanation_cache` row for the Tier-1 fallback path? The gate returns the static string `"Detailed explanation unavailable."`.
- What happens when the same position is re-opened after a Tier-1 fallback? The invalid output is never cached, so the next request retries the LLM.
- What happens when all zones pass but the explanation is empty or whitespace-only? The gate should still produce an output; empty explanations are a Tier-1 path concern, not an annotation-integrity concern. The existing LLM timeout (6 s) handles the case where no output is produced.

## Requirements

### Functional Requirements

- **FR-001**: The server MUST validate every `[zone:...]` annotation in Deep Reveal LLM output against the actual board position before writing to the cache or returning to the user.
- **FR-002**: The P1 check MUST reject any zone spec that cannot be parsed or that resolves to zero in-bounds board cells. This is a mechanical check only (no content heuristic).
- **FR-003**: The P2 check MUST, for every zone spec naming a column (e.g., `col4`), scan the text inside the zone tags for the regex `col(?:umn)?\s*([1-7])` (case-insensitive). If any captured group does not match the spec's column number (both 1-indexed), the output MUST be rejected. THIS check does not extend to general NLP prose analysis.
- **FR-004**: The P3 check MUST scan the entire explanation string (not just zone content) against three blocklists:
  - Disc-notation blocklist: `\bR\b`, `\bY\b` (word-boundary, case-insensitive)
  - Player-name blocklist: `\bRed\b`, `\bYellow\b`, `\bBlack\b` (whole word, case-insensitive)
  - Engine-jargon blocklist: `forced win`, `leaf position`, `the solver`, `forced_win`, `the simulation`, `your score`, `the score is`, `patterns in data` (phrase, case-insensitive)
- **FR-005**: The board-only P5 check MUST expand each zone spec to its cell set:
  - `col\d+` → all 6 cells in that column (rows 0–5 after -1 for 1-indexed col)
  - `c\d+r\d+` → single cell (subtract 1 from both col and row: `c4r3` → col=3, row=2)
  - `cells:c1r1,...` → each listed cell (same -1 conversion)
  - `row\d+` → all 7 cells in that row (subtract 1 from row)
  - `tg` → always passes (entire board; out-of-bounds check is vacuous)
- **FR-006**: The board-only P5 check MUST examine every 4-window (horizontal, vertical, diagonal) that contains at least one cell from the expanded set. A zone FAILS if every such 4-window is blocked (contains at least one disc of each color). A zone PASSES if any such 4-window is still live (only one color or all empty).
- **FR-007**: The board-only P5 check MUST reject any cell that is out of bounds (col < 0 or > 6, row < 0 or > 5 in 0-indexed coordinates) regardless of 4-window status.
- **FR-008**: The board-only P5 check MUST treat a zone referencing partially-occupied cells with at least one live 4-window as passing — occupancy alone is not grounds for rejection.
- **FR-009**: The P6 check MUST, for every `[zone:<spec>]...[/zone:<spec>]` tag, scan the inner text (the visible explanation content, not the spec portion) against two regex patterns: `\bc\d+r\d+\b` and `\bcol\d+\b` (case-insensitive, word-boundary). If EITHER pattern matches anywhere inside the zone tag's inner text, the zone fails. Example passing cases: `[zone:c4r3]the cell on row 3[/zone:c4r3]`, `[zone:col4]this column[/zone:col4]`. Example failing cases: `[zone:c4r3]c4r3[/zone:c4r3]`, `[zone:col4]col4[/zone:col4]`. P6 has no traceability-table fixtures; the regression harness MUST test P6 with synthetic strings constructed from the pass/fail examples above.
- **FR-010**: If ANY zone annotation fails ANY check (P1 through P6), the ENTIRE LLM output MUST be rejected. The gate MUST NOT strip individual failing zones and retain the rest. All-or-nothing rejection applies across all checks, across all zones, in a single invocation.
- **FR-011**: On validation failure, the server MUST retry the LLM once via a direct call to `callLLM`, bypassing the cache check and quota machinery. Both attempts are scoped within a single request handler invocation.
- **FR-012**: If the retry also produces invalid output, the server MUST serve the Tier-1 fallback: read the `explanation_cache` row for this `position_hash` where `deep_reveal_json` has the Tier-1 shape, or return the static string `"Detailed explanation unavailable."` The response MUST contain no zone annotations (plain text only).
- **FR-013**: If the retry also produces invalid output, the server MUST insert a row into a new `deep_reveal_failures` table with columns: `id` (uuid PK), `position_hash` (text), `movestring` (text), `col` (int), `endpoint` (text, value `'/api/explain-move-llm'`), `llm_prompt` (text), `raw_llm_output` (text), `failure_reason` (text, JSON array format e.g. `["P3:player_name","P5:blocked"]`), `created_at` (timestamptz). Writes use the server's Supabase service-role-key client (`supabase.from(...).insert(...)`), not PostgREST.
- **FR-014**: The server MUST NOT cache any explanation that fails validation. If the Tier-1 fallback is served, `explanation_cache` receives no Tier-2 write for this position.
- **FR-015**: The server MUST only write a fully-valid explanation to `explanation_cache.deep_reveal_json`. This is the cache invariant: the cross-user cache stores only honest explanations.
- **FR-016**: The weekly quota decrement MUST be moved to after the validation gate completes successfully. A quota unit is consumed only when a valid Tier-2 explanation is delivered to the user. Internal retries are transparent to quota. Tier-1 fallback does not consume quota.
- **FR-017**: The server MUST reuse the `Board` class (already imported in `index.js`) for board reconstruction and occupancy data. The 4-window enumeration is a new small adapter function; `getMajorThreatCells` and `checkWin` have the wrong semantics (threat detection and win completion, not blocked-vs-live enumeration) and MUST NOT be reused for this purpose.
- **FR-018**: The zone parse logic (parsing `[zone:spec]...[/zone:spec]` markup and expanding specs to cell sets) MUST be extracted/ported from `annotatedText.js` into a shared module importable by the server gate. The client-side parse is kept for rendering only.
- **FR-019**: The response shape of `POST /api/explain-move-llm` MUST remain `{ explanation, prompt, cached? }` unchanged. The gate is internal.
- **FR-020**: The regression harness MUST replay every `llm_feedback` row from the traceability table through the gate and assert correct handling. Rows `58f99d33` (P2), `e094ee00`, `b6071ab4`, `5a10047c`, `972f74e1`, `092f4340`, `0f0d66b3` (P3), `e86eeac9`, `8d83947e` (P5 board-only) MUST be rejected. Row `403a21c9` (P5 strong form) MUST be noted as deferred to Epic B. Rows `59a11a79`, `f4241ea6` (P1) MUST pass (they test the Epic B grounding contract, not the Epic A gate).

### Key Entities

- **Zone spec**: A spatial reference in the LLM output enclosed in `[zone:<spec>]...[</zone>]` tags. The spec is a coordinate expression in the wire format (1-indexed): `colN`, `cNrM`, `cells:c1r1,...`, `rowN`, or `tg` (entire board).
- **4-window**: Any set of 4 contiguous cells in a horizontal, vertical, or diagonal line on a 7x6 board. A 4-window is "blocked" if it contains at least one disc of each color. A 4-window is "live" if it contains discs of at most one color, or no discs.
- **deep_reveal_failures**: A new table recording rejected LLM outputs for offline analysis. Not read at runtime by the application.
- **llm_feedback**: Existing table of user-flagged explanation quality issues. Read-only consumer in Epic A (the regression harness queries fixture rows).

## Success Criteria

### Measurable Outcomes

- **SC-001**: All known-failing `llm_feedback` rows of types P2, P3, and board-only P5 (9 rows total) are rejected by the validate-then-cache gate before reaching the user. Measured by the regression harness returning pass for all 9 fixture assertions.
- **SC-002**: The occupant-cell fixtures `e86eeac9` and `8d83947e` are no longer visible as invalid explanations to users. The blocked 4-window check catches them structurally. Measured by replaying the original movestring through the gate and asserting rejection.
- **SC-003**: The non-existent-threat fixture `403a21c9` is explicitly deferred to Epic B; the Epic A gate passes it without rejecting (correct per the P5 seam). Measured by the regression harness marking it as deferred.
- **SC-004**: No quota unit is consumed for an explanation that ends up as a Tier-1 fallback. Measured by auditing the quota counter before and after a guaranteed-failure position is requested.
- **SC-005**: Only fully-valid explanations are stored in `explanation_cache.deep_reveal_json`. Measured by asserting no invalid zone annotations appear in any cached entry after the gate is deployed.
- **SC-006**: Failed validations are reliably logged to `deep_reveal_failures` with all expected fields populated. Measured by asserting a row is written for each known-failing fixture when replayed through the full gate.

## Assumptions

- The zone parse logic from `annotatedText.js` can be extracted into a shared module that works in the server-side Node.js environment without DOM dependencies.
- The `Board` class is sufficient for occupancy data. The 4-window enumeration is a new small adapter (approximately 25 lines) that enumerates all horizontal/vertical/diagonal windows through each zone cell and checks the blocked-vs-live condition. `getMajorThreatCells` and `checkWin` are not suitable because they detect threats and win completions, not blocked-vs-live window status.
- The quota decrement location can be identified and relocated without breaking other code paths. The existing code has a single decrement path near the 429 rate-limit check block.
- The `llm_feedback` fixture rows exist in the database with the expected `id` values and can be queried by the regression harness. The harness may embed the fixture data statically if DB access is unsuitable for a unit test.
- The `deep_reveal_failures` table migration will write via the server's existing Supabase service-role-key client (`supabase.from(...).insert(...)`), already imported in `index.js`. No raw `pg` pool is involved.
- The existing rate limit of 5 req/min on `/api/explain-move-llm` is preserved and is adequate for the retry mechanism (one retry is still within the same request).
- The LLM retry (direct call to `callLLM`) does not consume a second quota unit and does not hit the rate limit.
- The existing `/api/explain-move` endpoint (Tier-1 path, `index.js:436–439`) writes `deep_reveal_json` with a shape that includes `fullText` for fallback consumption.
