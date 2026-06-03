# Data Model: Challenges — Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary

**Feature**: specs/014-challenges-deep-reveal  
**Date**: 2026-05-31

---

## No new DB tables or columns required

This epic adds no migrations. All storage is either:
- Existing Supabase tables with JSONB fields that absorb new fields without schema changes.
- Existing `IndexedDBStore`/`SupabaseStore` method interface (already provides `saveChallengeSession`).

---

## Modified server-side data shape

### `explanation_cache.deep_reveal_json` (extended)

No migration needed.

**Before this epic** (shape written by `/api/explain-move` old endpoint):
```json
{
  "patternTag": "double_threat",
  "fullText": "...",
  "continuationLine": [],
  "boardAnnotation": []
}
```

**After this epic** (shape written by extended `/api/explain-move-llm`):
```json
{
  "explanation": "Playing column 5 completes four..."
}
```

Note: existing cached rows from the old `/api/explain-move` endpoint have a different shape. The new endpoint reads `cached.deep_reveal_json.explanation`. Rows from the old endpoint lack `explanation` — they will return `undefined` for `explanation`, which the client handles as a timeout fallback. This is acceptable: old cache entries will not serve Deep Reveal responses in the new format; they will fall through to the LLM call path (cache miss behavior) since `explanation` is falsy.

**Cache key**: `SHA256(movestring + ":" + col)` — unchanged from spec FR-010.

---

## Client-side entity shapes

### `MoveEvaluation` (Epic 2a, unchanged)

The evaluate-move response held in `ChallengeScreen.evaluation` state:
```ts
{
  badge: 'good' | 'mid' | 'bad'
  quality: 'optimal' | 'suboptimal' | 'blunder'
  coachPhraseKey: string      // i18n key
  coachMood: 'happy' | 'think' | 'oops'
  summaryLineKey: string      // i18n key
  patternTag: string          // e.g. 'double_threat'
}
```

### `DeepRevealResult` (NEW — endpoint response)

Returned by `POST /api/explain-move-llm`:
```ts
{
  explanation: string         // LLM explanation paragraph
  cached?: boolean            // true if served from explanation_cache
}
```

`cached` is `true` on cache hit; absent (undefined) on cache miss.

### `DeepRevealPanelState` (NEW — client-side composition)

Assembled in `ChallengeScreen` from two sources:
```ts
{
  // From MoveEvaluation (already held in state):
  patternTag: string
  quality: 'optimal' | 'suboptimal' | 'blunder'
  badge: 'good' | 'mid' | 'bad'
  summaryLineKey: string        // used in timeout fallback
  
  // From DeepRevealResult (fetched on panel open):
  explanation: string
  cached: boolean
}
```

### `ForbiddenColumnsResult` (NEW — computed on submit)

Computed locally in `ChallengeScreen.handleForbiddenSubmit()`:
```ts
{
  selectedCols: number[]        // 0-indexed columns the user toggled
  correctCols: number[]         // 0-indexed forbidden columns from API (forbiddenCols)
  truePositives: number[]       // selectedCols ∩ correctCols
  falsePositives: number[]      // selectedCols \ correctCols
  missed: number[]              // correctCols \ selectedCols
  quality: 'optimal' | 'suboptimal' | 'blunder'
  badge: 'good' | 'mid' | 'bad'
}
```

**Quality predicate**:
- `optimal`: `falsePositives.length === 0 && missed.length === 0`
- `suboptimal`: `falsePositives.length === 0 && missed.length > 0`
- `blunder`: `falsePositives.length > 0` (takes priority over missed)

### `ChallengeSessionResult` (Epic 2a, unchanged)

Each puzzle's result accumulated in `results` array in `ChallengeScreen`:
```ts
{
  puzzleId: string
  quality: 'optimal' | 'suboptimal' | 'blunder'
  category: string              // slug, e.g. 'forbidden_columns'
}
```

For `forced_win`: `quality` is `'optimal'` on sequence success, `'blunder'` on sequence fail.

### `PostSetSummaryParams` (NEW — navigation params)

Passed to `go('summary', params)` from `ChallengeScreen.handleNext()` on session end:
```ts
{
  category: string              // the challenge set slug (e.g. 'forbidden_columns')
  results: ChallengeSessionResult[]
  accuracy: number              // pre-computed, rounded to nearest integer (0-100)
  optimalCount: number
  blunderCount: number
  byPattern: {
    [slug: string]: {
      optimal: number
      total: number
    }
  }
}
```

`byPattern` is keyed by category slug. For single-category sets, it has one key. For `mixed`, it has one key per category that appeared.

---

## Store interface (no changes)

Both `IndexedDBStore` and `SupabaseStore` already provide `saveChallengeSession(session)`.

The session shape written is:
```ts
{
  category: string
  results: ChallengeSessionResult[]
  accuracy: number
  timestamp: number             // Date.now()
}
```

No new store methods are required for this epic.

---

## `challengeSets.js` entry shape (changed)

**Before** (Epic 2a shape):
```ts
{
  slug: string
  displayName: string           // literal English string
  stars: number
  description: string           // literal English string
  free: boolean
}
```

**After** (Epic 2b shape — i18n keys):
```ts
{
  slug: string
  displayNameKey: string        // e.g. 'challengeSet.forbidden_columns.displayName'
  descriptionKey: string        // e.g. 'challengeSet.forbidden_columns.description'
  stars: number
  free: boolean
}
```

`SetPickerScreen.jsx` resolves display name via `t(set.displayNameKey)`. Callers that previously read `set.displayName` directly must be updated (only `SetPickerScreen.jsx` in Epic 2b scope).

---

## `categories.js` change (PAID_CATEGORIES)

`server/categories.js` and `src/lib/categories.js` both define `PAID_CATEGORIES`. Both must be updated to remove `forced_win` and `forbidden_columns` (they are free in Epic 2b):

```js
// Before (Epic 2a):
export const PAID_CATEGORIES = new Set([
  'forced_win', 'forbidden_columns',
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

// After (Epic 2b):
export const PAID_CATEGORIES = new Set([
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);
```
