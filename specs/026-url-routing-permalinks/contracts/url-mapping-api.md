# Contract: `src/lib/urlMapping.js` Public Interface

**Module**: `connect-four/src/lib/urlMapping.js`  
**Status**: New (this epic)  
**Consumers**: `App.jsx` (Navigator), `__tests__/urlMapping.test.js`

---

## Exports

### `URL_MAP: RouteDescriptor[]`

Ordered array of all URL patterns. Exported so tests can enumerate it.

```ts
type RouteDescriptor = {
  pattern: string      // e.g. '/game/:id'
  screenKey: string    // e.g. 'review'
  paramNames: string[] // e.g. ['id']
}
```

**Invariant**: Must cover all 15 screen keys in `SCREENS` registry (spec FR-007).  
**Ordering rule**: More specific patterns must appear before less specific ones. `/game/:id` before `/game`.

---

### `SESSION_ONLY_SCREENS: Set<string>`

Set of screen keys that cannot be cold-booted from a URL. Exported so Navigator can check
before initializing screen.

**Value**: `new Set(['summary', 'explorer', 'mistakeDetail', 'game'])`

---

### `buildUrl(screenKey: string, params?: object): string`

Returns the URL string for a given screen key and params object.

**Signature**: `buildUrl(screenKey, params = {}) → string`

**Behavior**:

| Input | Output |
|---|---|
| `('home', {})` | `'/'` |
| `('stats', {})` | `'/stats'` |
| `('saga', {})` | `'/saga'` |
| `('saga', { highlightSlug: 'claimeven' })` | `'/saga/claimeven'` |
| `('challenge', { category: 'immediate_threat' })` | `'/challenge/immediate_threat'` |
| `('game', {})` | `'/game'` |
| `('review', { id: 'abc123' })` | `'/game/abc123'` |
| `('clchallenge', { lessonId: '05' })` | `'/clchallenge/05'` |
| `(unknownKey, {})` | `'/'` (fallback) |

**Contract**:
- MUST return a string for every valid screen key in `SCREENS`.
- MUST NOT return `undefined`, `null`, or empty string for valid inputs.
- MUST return `'/'` (not throw) for unknown screen keys.

---

### `parseUrl(pathname: string): { screenKey: string, params: object }`

Parses a URL pathname against the mapping table. Returns screen key and extracted params.

**Signature**: `parseUrl(pathname) → { screenKey, params }`

**Behavior**:

| Input | Output |
|---|---|
| `'/'` | `{ screenKey: 'home', params: {} }` |
| `'/stats'` | `{ screenKey: 'stats', params: {} }` |
| `'/saga'` | `{ screenKey: 'saga', params: {} }` |
| `'/saga/claimeven'` | `{ screenKey: 'saga', params: { highlightSlug: 'claimeven' } }` |
| `'/challenge/immediate_threat'` | `{ screenKey: 'challenge', params: { category: 'immediate_threat' } }` |
| `'/game'` | `{ screenKey: 'game', params: {} }` |
| `'/game/abc123'` | `{ screenKey: 'review', params: { id: 'abc123' } }` |
| `'/clchallenge/05'` | `{ screenKey: 'clchallenge', params: { lessonId: '05' } }` |
| `'/xyz/unknown'` | `{ screenKey: 'home', params: {} }` (fallback) |

**Contract**:
- MUST never throw.
- MUST return `{ screenKey: 'home', params: {} }` for unrecognized paths.
- MUST correctly disambiguate `/game` (→ `game`) from `/game/:id` (→ `review`).

---

## Invariants enforced by tests (SC-010)

1. No two `URL_MAP` entries resolve to the same `(screenKey, params-shape)` pair.
2. `parseUrl(buildUrl(screenKey, params)).screenKey === screenKey` for all valid screen keys and valid params shapes.
3. `buildUrl(screenKey, params)` is never `undefined`, `null`, or empty for any valid `(screenKey, params)` pair.
4. `parseUrl` on a session-only screen URL returns the correct screenKey (Navigator is responsible for redirecting to home — `parseUrl` itself does NOT redirect).
