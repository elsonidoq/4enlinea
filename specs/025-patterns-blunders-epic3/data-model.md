# Data Model: Patterns → Blunders Epic 3 — Coach Explanation Rebuild

## DB Schema Changes

### Migration 035: `explanation_cache.template_version`

**File**: `connect-four/server/migrations/035_explanation_cache_template_version.sql`

```sql
ALTER TABLE explanation_cache ADD COLUMN IF NOT EXISTS template_version TEXT;
```

- No DEFAULT clause — old rows remain NULL.
- New rows written with `template_version = 'v2'` by the `POST /api/explain-move-llm` endpoint.
- No data backfill. No index.
- NULL = pre-Epic-3 entry; 'v2' = written after this epic.

**No other migrations required.** Blunders schema (migrations 032–034) is unchanged.

---

## Module Data Shapes

### `REASON_TEMPLATES` (server/blunderReasons.js)

```
Map<"${tag}:${direction}", string>
```

23 entries. Keys are `tag:direction` pairs; values are plain-language sentences for the
LLM prompt. Applied only inside `buildBlunderExplainPrompt`. Never stored to DB.

Generic fallback (caller-side, not in the map): `"A stronger move was available."`

### `POSITIVE_TEMPLATES` (server/blunderReasons.js)

```
Map<"${tag}", string>
```

12 entries. Keys are tag names (no direction suffix); values are "this is strong because..."
sentences for the optimal-move path prompt. Never stored to DB.

Generic fallback (caller-side): `"This was the strongest move available."`

---

### `classifyPattern` return value (classifier.js)

```
Promise<Map<string, { cells: string[] }>>
```

- Key: tactical pattern tag (e.g. `'immediate_threat'`, `'figure_7'`)
- Value: `{ cells: string[] }` — array of wire-format cell coordinates
- Wire format: `"c{col+1}r{row+1}"` (1-indexed; e.g. `"c4r3"`)
- `cells: []` when detector has no spatial output (ABSTRACT-ONLY)
- Map is empty when no patterns matched

**Backward-compat adapter** for callers needing only tag names:
```js
new Set(result.keys())
```

---

### `buildBlunderExplainPrompt` input shape (llmCoachHelpers.js)

```js
{
  tag:                string | null,           // null on optimal-move path
  direction:          string | null,           // 'missed_own'|'enabled_opponent'|'defensive_miss'|null
  humanReason:        string | null,           // REASON_TEMPLATES sentence or null
  positiveReason:     string | null,           // POSITIVE_TEMPLATES sentence or null
  correctMovePatterns: Map<string, {cells: string[]}>,  // from classifyPattern(ms + bestCol, ...)
  boardViz:           string,                  // pre-move board visualization
  postBoardViz:       string,                  // post-move board visualization
  playerName:         'Green' | 'Grey',
  gap:                number,
  gapBucket:          'small' | 'moderate' | 'large',
  allowedSet:         AllowedSetEntry[],        // passed to validateAnnotation
}
→ string (prompt)
```

---

### `buildExplainContext` return shape (server/index.js, unchanged)

```js
null                                        // no contrast move available
{ prompt: null, allowedSet: null, allMovesEqual: true }  // all moves settled
{ prompt: string, allowedSet: AllowedSetEntry[] }        // normal path
```

---

### `explanation_cache` INSERT shape (updated in T11)

```js
{
  position_hash:    string,   // SHA-256 of `${movestring}:${col}`
  one_liner:        string,   // empty string (unchanged)
  deep_reveal_json: { explanation: string, prompt: string },
  template_version: 'v2',    // NEW — set on all inserts after migration 035
}
```

---

## Entity Relationships (unchanged)

No new tables. No FK changes. The `blunders` table (with `reason`, `direction` columns from
Epic 2 migrations 033–034) is read-only from this epic's perspective — `tagBlunder` already
writes to it via the Epic 2 wiring.
