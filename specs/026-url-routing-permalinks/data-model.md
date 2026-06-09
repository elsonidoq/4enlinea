# Data Model: URL Routing & Permalinks

No new database tables or columns are introduced by this epic.

---

## Browser History State Shape

Each `pushState` / `replaceState` call stores this object as `event.state`:

```ts
{
  screenKey: string,   // one of the 15 screen keys from SCREENS registry
  params: object       // flat object of URL-extracted params; {} if none
}
```

**Invariant**: `event.state` is always populated for every history entry created by this app.
External entries (navigating from another site) may have `event.state === null` — handled by
falling back to `parseUrl(window.location.pathname)`.

---

## URL Mapping Table (Runtime Shape)

The `URL_MAP` exported from `urlMapping.js` is an ordered array of route descriptors:

```ts
type RouteDescriptor = {
  pattern: string,        // e.g. '/game/:id', '/challenge/:category', '/saga/:highlightSlug'
  screenKey: string,      // one of the 15 registered screen keys
  paramNames: string[],   // ordered list of :param names in the pattern
}
```

Ordering rule: more specific patterns (more segments, or with required params) before less specific.
`/game/:id` must come before `/game`.

---

## Supabase Reads (OG injection — server only)

The catch-all handler reads from the `games` table for `/game/:id` paths:

```sql
SELECT id, difficulty, result FROM games WHERE id = $1 LIMIT 1
```

No writes. No new columns. `difficulty` and `result` already exist (see `project_sparring_games_table.md`).

---

## New i18n Keys

Added to `connect-four/src/i18n/en.json`:

```json
"review": {
  "share": {
    "button": "Share",
    "copied": "Link copied!"
  }
}
```

No existing keys are removed or renamed.
