# Data Model: Annotation Integrity Gate

## New Table: `deep_reveal_failures`

Records LLM outputs that failed validation after retry, for offline analysis to improve the explanation engine. Never read at runtime by the application.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique identifier |
| `position_hash` | `text` | NOT NULL | `SHA256(movestring + ":" + col)` — same key as `explanation_cache` |
| `movestring` | `text` | NOT NULL | 0-indexed move string |
| `col` | `integer` | NOT NULL | 0-indexed column the user played |
| `endpoint` | `text` | NOT NULL | Constant value: `'/api/explain-move-llm'` |
| `llm_prompt` | `text` | NOT NULL | The full prompt sent to the LLM (both initial and retry use the same prompt) |
| `raw_llm_output` | `text` | NOT NULL | The invalid LLM output (from the retry — the final failed attempt) |
| `failure_reason` | `text` | NOT NULL | JSON array string, e.g. `'["P3:player_name","P5:blocked"]'`. Each element is `<principle>[:<detail>]` format |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | When the failure was recorded |

**Access pattern**: Backend-only table. RLS enabled, no public policies. Server accesses via service-role-key Supabase client (bypasses RLS). No GRANT statements needed.

**Migration file**: `031_deep_reveal_failures.sql`

## Existing Table: `explanation_cache` (read + write)

Used for both reading cached explanations AND writing new validated ones.

The gate reads the same `position_hash` to retrieve the Tier-1 fallback row (written by the old `/api/explain-move` endpoint at `index.js:436–439`).

The gate writes to `deep_reveal_json` only when validation passes. Shape unchanged:
```json
{ "explanation": "<string>", "prompt": "<string>" }
```

## Server-Side Module: `zoneParser.js`

Not a DB entity, but a shared parsing module.

**Exports**:
- `parseZoneSpecs(explanationText)` — extracts all `[zone:spec]...[/zone:spec]` pairs from the LLM output. Returns `Array<{ spec: string, innerText: string }>`. The `spec` is the wire-format zone spec (1-indexed: `col4`, `c4r3`, `cells:c1r1,c2r2`, `row3`, `tg`). `tg` is parsed but treated as always-passing for the gate (returns no cells; `tg` is a client-only rendering construct).
- `expandSpec(spec)` — resolves a zone spec to 0-indexed cells:
  - `colN` → all 6 cells in column N-1
  - `cNrM` → single cell at col N-1, row M-1
  - `cells:c1r1,...` → each listed cell
  - `rowN` → all 7 cells in row N-1
  - `tg` → returns `[]` (always passes P5 vacuously; P1 succeeds because the parser recognizes it)

**Does NOT** export: `parseAnnotatedText`, `getZoneColor`, `regexFallbackParse` — those remain client-side only in `annotatedText.js`.

## Server-Side Module: `annotationGate.js`

The validation gate module. Pure functions, no side effects, no DB dependencies. Accepts an explanation string and a reconstructed `Board` object, returns validation results.

**Exports**:
- `validateAnnotation(explanation, board)` → `{ valid: boolean, failures: string[] }`. Runs P1–P6 checks. Returns all failures found (not just the first). Empty failures array means valid.
- `getWindowsThroughCell(col, row)` → 0-indexed array of 4-window cell arrays. Pure geometry helper.
- `isWindowBlocked(board, window)` → `boolean`. Checks if a 4-window contains at least one disc of each color.
- `checkP1(zoneSpecs)` → `string[]`
- `checkP2(zones, expandedCells)` → `string[]`
- `checkP3(fullText)` → `string[]`
- `checkP5(board, zoneSpecs)` → `string[]`
- `checkP6(zones)` → `string[]`

All check functions return string arrays where each string is a failure code like `"P1:invalid_spec"`, `"P3:player_name"`, `"P5:blocked"`.

## Test Fixtures (static, in `annotationGate.test.js`)

Embedded directly in the test file, never read from the database.

Each fixture includes:
- `id` — the `llm_feedback` UUID for traceability
- `movestring` — board position
- `col` — column played
- `explanation` — the raw LLM output (with `[zone:...]` tags)
- `expected` — `"reject"` (gate must reject) or `"pass"` (gate must pass) or `"deferred"` (expected to pass now, deferred to Epic B)
