# Implementation Plan: URL Routing & Permalinks

**Branch**: `101-new-design` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/026-url-routing-permalinks/spec.md`

---

## Summary

Wire the existing `go()` / `goBack()` state-machine navigator to the browser History API so
every navigation produces a clean URL, the browser back button works, and the app boots
correctly from any deep-linked URL. Add a Share button to `ReviewScreen` and inject Open Graph
meta tags for `/game/:id` paths in the Express server. No screen or call-site changes beyond
those explicitly listed below.

---

## Technical Context

**Language/Version**: JavaScript (ESM, Node 20.10+), React 18  
**Primary Dependencies**: React (hooks), Express 4, `@supabase/supabase-js` (server-side OG fetch)  
**Storage**: Supabase (games table — server reads `id`, `difficulty`, `result` for OG injection)  
**Testing**: Jest (frontend unit), `node --test` (server helpers), `npm run test:fast`  
**Target Platform**: Browser (Chrome/Firefox/Safari modern); Express server (production SPA host)  
**Project Type**: Web SPA (React) + Express API server  
**Performance Goals**: Cold-boot URL parse must be synchronous (< 1 ms); OG fetch must not delay HTML for missing games  
**Constraints**: No `react-router-dom`. No SSR. Admin shell detection preserved. All `go()` call sites unchanged.  
**Scale/Scope**: 15 screen keys, ~20 go() call sites, 1 server file

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine**: Not affected. This epic adds URL/navigation infrastructure only.  
**Principle II — Simplicity**: URL sync is a transparent additive layer. No new abstractions beyond `urlMapping.js` (a pure data module) and one `goReplace` helper. ✅  
**Principle III — Testing**: Unit test on `urlMapping.js` (FR-009, SC-010). Integration test on `pushState` after `go()`. Manual golden-path verification required for cold-boot and share-button. ✅  
**Principle IV — UX Consistency**: Share button follows existing Toast pattern. No color/terminology changes. ✅  
**Principle V — Performance**: URL parse is synchronous O(1). OG Supabase fetch is non-blocking (graceful degradation on error). ✅  
**Principle VI — Methodology**: Pre-implementation audit of all `goBack()` call sites completed (14 screens, all use `goBack()` with no arg). `POST /api/games/analyze` confirmed unauthenticated. `GET /api/lessons/:id` confirmed exists. ✅  
**Principle VII — Design**: One URL mapping module, used in both directions. No duplication. ✅  
**Principle VIII — Documentation**: Architecture docs were read. New URL conventions must be documented in `docs/architecture/frontend-conventions.md` (navigation section). ✅

**Constitution Check re-check post-Phase 1 design**: Contracts and data model introduce no new principles; all existing ones remain satisfied.

---

## Project Structure

### Documentation (this feature)

```text
specs/026-url-routing-permalinks/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── url-mapping-api.md   # urlMapping.js public interface contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (affected paths)

```text
connect-four/src/
├── lib/
│   └── urlMapping.js         # NEW — URL mapping table + buildUrl + parseUrl
├── App.jsx                   # MODIFIED — Navigator: pushState, popstate, init, goReplace
└── screens/
    ├── ReviewScreen.jsx      # MODIFIED — Share button + toast
    ├── GameScreen.jsx        # MODIFIED — saveGame() uses goReplace('review', { id })
    └── CLChallengeScreen.jsx # MODIFIED — cold-boot fetch for lessonTitle + confirmationChallenges

connect-four/src/i18n/
└── en.json                   # MODIFIED — review.share.button, review.share.copied

connect-four/server/
└── index.js                  # MODIFIED — express.static, catch-all, OG injection
```

**Structure Decision**: Single web-application project (SPA + API server). No new directories
beyond the contracts folder under this spec.

---

## Phase 0: Research

*All unknowns resolved from codebase audit. No external research required.*

### Decision 1 — Auth gate on `POST /api/games/analyze`

**Decision**: No change needed. The endpoint already allows unauthenticated access.  
**Evidence**: `server/index.js` line 1244: `// No auth required — anonymous users can analyze games.` — no `req.user` guard before the handler body.  
**Implication**: FR-015 is satisfied out-of-the-box.

### Decision 2 — ReviewScreen 404 handling

**Decision**: No change needed for the error rendering. `ReviewScreen` already sets `error = t('sparring.reviewNotFound')` when `POST /api/games/analyze` returns 404. The i18n key maps to "Game not found." in en.json (line 54).  
**Implication**: FR-016 is satisfied. Only the Share button (FR-017) needs to be added.

### Decision 3 — `goReplace` helper for game → review URL transition

**Decision**: Expose `goReplace(screenKey, params)` on Navigator (alongside `go`). It behaves identically to `go()` except it calls `window.history.replaceState` instead of `pushState`. `GameScreen.saveGame()` calls `goReplace('review', { id: gameId })` instead of `go('review', { id: gameId })`.  
**Rationale**: The spec requires no extra history entry when the game ends. `go('review', ...)` would call `pushState`, creating an extra entry. `goReplace` uses `replaceState` and still updates the React screen state.  
**Alternative considered**: Pass `{ replace: true }` flag to `go()`. Rejected: adds conditional branching inside `go()` vs a clean separate path.  
**Tradeoff**: One more function on Navigator context. Callers other than `GameScreen` should not need it.

### Decision 4 — `goBack()` change: delegate to `window.history.back()`

**Decision**: `goBack()` is changed to call `window.history.back()`. The actual screen state update happens in the `popstate` handler — not in `goBack()` itself.  
**Rationale**: With URL sync, `window.history.back()` triggers a `popstate` event that already carries the prior screen's state via `event.state`. Doing the state update in both `goBack()` and `popstate` would cause double-navigation.  
**Audit**: All 14 `goBack()` call sites in `src/` use `goBack()` with no argument (confirmed via `rg "goBack"`). Zero call sites use `goBack(2)` or higher. The `n` parameter can be removed.  
**Track**: `track('screen_viewed', ...)` fires in the `popstate` handler (not in `goBack()`), preserving spec 011 FR-010.

### Decision 5 — History array

**Decision**: The `history` array in Navigator state is removed. Browser history (`event.state`) is authoritative. No in-app back-stack is needed since no call site uses `goBack(n > 1)`.  
**Rationale**: The array was used only to support multi-level back. With `window.history.back()`, the browser history IS the back-stack. Keeping the array would create two sources of truth.

### Decision 6 — `clchallenge` cold-boot

**Decision**: On cold-boot at `/clchallenge/:lessonId`, the URL parser initializes the screen with `{ lessonId }` only. A `useEffect` in `CLChallengeScreen` calls `GET /api/lessons/:lessonId` to fetch `{ title, confirmationCategory, confirmationCount, confirmationChallenges }` and sets them as local state, spreading all five props once loaded. The Navigator does NOT await the fetch — it passes only `{ lessonId }` as the initial param.  
**Evidence**: `GET /api/lessons/:id` confirmed in server/index.js and returns the full lesson object. `CLChallengeScreen` already receives `{ lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges }` as direct props from `go('clchallenge', {...})`.  
**Implication**: On cold-boot, `CLChallengeScreen` must handle missing `lessonTitle`/`confirmationCategory`/`confirmationCount`/`confirmationChallenges` (show a loading state until the fetch resolves). This is an additive change to `CLChallengeScreen`.

### Decision 7 — OG HTML caching strategy

**Decision**: Read `dist/index.html` once at server startup and cache the string in memory. Inject OG tags per-request by string replace. Write nothing to disk.  
**Rationale**: Startup read avoids per-request filesystem I/O. The spec explicitly forbids disk writes. If `dist/index.html` doesn't exist at startup, log a warning and set the cached string to `null`. The catch-all returns 500 when `null` and the request is for a game path (OG injection impossible), but for non-game paths, the catch-all should still try `res.sendFile` as a fallback.  
**Alternative**: Cache at first request. Rejected: startup read is simpler and the dist file doesn't change at runtime.

### Decision 8 — Session-only and unrecognized URL handling

**Decision**: A static `SESSION_ONLY_SCREENS` set in `urlMapping.js` lists `summary`, `explorer`, `mistakeDetail`, `game`. On cold-boot, if the parsed screen key is in this set, navigate to `home` and `replaceState('/')`.  
**Rationale**: These screens require params that cannot be reconstructed from URL alone.

### Decision 9 — `popstate` with `event.state === null`

**Decision**: Fall back to `parseUrl(window.location.pathname)`. If unparseable or session-only, navigate to `home`.  
**Rationale**: `event.state` is null when navigating from outside the app (e.g., external page back). The URL is the next best source of truth.

### Decision 10 — Share button toast implementation

**Decision**: Use a local `copied` state boolean in `ReviewScreen`. When `true`, render a small inline toast message. A `useEffect` clears `copied` after 2000 ms via `setTimeout`. No new toast infrastructure needed.  
**Rationale**: The spec requires ≤ 2 s display. A local state toggle is the simplest correct implementation.

---

## Phase 1: Design & Contracts

### Data Model (no DB changes)

No new database tables or columns. The games table already has `id`, `difficulty`, `result`.
See `data-model.md` for the browser state shape.

### Contracts

See `contracts/url-mapping-api.md` for the `urlMapping.js` public interface.

---

## Implementation Blueprint

This section defines the exact changes needed for each file. Tasks will be derived from this
blueprint by `/speckit-tasks`.

### A. `connect-four/src/lib/urlMapping.js` (NEW)

Pure ES module. No React, no side effects. Importable in both browser (Navigator) and test environment.

```js
// Public exports:
export const URL_MAP = [...]         // ordered array of { pattern, screenKey, paramNames }
export const SESSION_ONLY_SCREENS = new Set(['summary', 'explorer', 'mistakeDetail', 'game'])

export function buildUrl(screenKey, params = {}) → string
// Returns the URL for a given screen + params.
// saga with {} → '/saga'
// saga with { highlightSlug: 'x' } → '/saga/x'
// review with { id: 'abc' } → '/game/abc'
// game with {} → '/game'
// unknown screenKey → '/'

export function parseUrl(pathname) → { screenKey, params }
// Returns { screenKey: 'home', params: {} } for unrecognized paths.
// '/game/abc123' → { screenKey: 'review', params: { id: 'abc123' } }
// '/game' → { screenKey: 'game', params: {} }
// Ambiguity rule: check for id segment first, else fall through to '/game'.
```

**URL_MAP ordering rule**: More specific patterns MUST appear before less specific ones.
`/game/:id` must appear before `/game` in the array. The parser iterates in order and returns
the first match.

**Full mapping table** (implemented as pattern strings with `:param` segments):

| Pattern | screenKey | paramNames |
|---|---|---|
| `/` | `home` | `[]` |
| `/stats` | `stats` | `[]` |
| `/mistakes` | `mistakes` | `[]` |
| `/saga/:highlightSlug` | `saga` | `['highlightSlug']` |
| `/saga` | `saga` | `[]` |
| `/concept/:lessonId` | `concept` | `['lessonId']` |
| `/socratic/:lessonId` | `socratic` | `['lessonId']` |
| `/clchallenge/:lessonId` | `clchallenge` | `['lessonId']` |
| `/setpicker` | `setpicker` | `[]` |
| `/challenge/:category` | `challenge` | `['category']` |
| `/summary` | `summary` | `[]` |
| `/difficulty` | `difficulty` | `[]` |
| `/game/:id` | `review` | `['id']` |
| `/game` | `game` | `[]` |
| `/explorer` | `explorer` | `[]` |
| `/mistakeDetail` | `mistakeDetail` | `[]` |

**`buildUrl` special cases**:
- `screenKey === 'saga'` with no `params.highlightSlug` → `/saga`
- `screenKey === 'saga'` with `params.highlightSlug` → `/saga/${params.highlightSlug}`
- `screenKey === 'review'` → `/game/${params.id}`
- `screenKey === 'game'` → `/game`
- Default for screens with no params: `/${screenKey}`

---

### B. `connect-four/src/App.jsx` — Navigator changes

All changes are **internal to the `Navigator` function**. The `App` function (admin guard) is unchanged.

**Remove**: `history` state, `setHistory` call in `go()`, multi-level pop logic in `goBack()`.

**Add**:

1. **Mount effect** — parse URL and init screen:
```js
useEffect(() => {
  const { screenKey, params: initParams } = parseUrl(window.location.pathname);
  const isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
  const resolved = isSessionOnly ? 'home' : screenKey;
  const resolvedParams = isSessionOnly ? {} : initParams;
  const resolvedUrl = isSessionOnly ? '/' : buildUrl(resolved, resolvedParams);

  // Initialize screen state WITHOUT calling go() (avoids pushState on first load)
  setActiveScreen(resolved);
  setScreen(resolved);
  setParams(resolvedParams);
  // Populate browser history state for this entry
  window.history.replaceState({ screenKey: resolved, params: resolvedParams }, '', resolvedUrl);

  track('session_start', { screen: resolved });
}, []);
// Note: session_start moves from the old mount effect into this one.
```

2. **`go()` — add pushState**:
```js
const go = useCallback((key, newParams = {}) => {
  if (!SCREENS[key]) { console.warn(`[navigator] unknown screen key: ${key}`); return; }
  setActiveScreen(key);
  track('screen_viewed', { screen: key });
  setScreen(key);
  setParams(newParams);
  const url = buildUrl(key, newParams);
  window.history.pushState({ screenKey: key, params: newParams }, '', url);
}, []);
// Note: history array push is removed. Dependencies simplified (no longer depends on screen/params).
```

3. **`goReplace()` — new helper, uses replaceState**:
```js
const goReplace = useCallback((key, newParams = {}) => {
  if (!SCREENS[key]) { console.warn(`[navigator] unknown screen key: ${key}`); return; }
  setActiveScreen(key);
  track('screen_viewed', { screen: key });
  setScreen(key);
  setParams(newParams);
  const url = buildUrl(key, newParams);
  window.history.replaceState({ screenKey: key, params: newParams }, '', url);
}, []);
```

4. **`goBack()` — delegate to browser**:
```js
const goBack = useCallback(() => {
  window.history.back();
}, []);
// track() fires in the popstate handler below.
```

5. **`popstate` listener** — mount/unmount:
```js
useEffect(() => {
  function handlePopState(event) {
    let screenKey, params;
    if (event.state?.screenKey) {
      ({ screenKey, params } = event.state);
    } else {
      ({ screenKey, params } = parseUrl(window.location.pathname));
    }
    const isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
    const resolved = isSessionOnly ? 'home' : screenKey;
    const resolvedParams = isSessionOnly ? {} : params;

    if (isSessionOnly) {
      window.history.replaceState({ screenKey: 'home', params: {} }, '', '/');
    }

    setActiveScreen(resolved);
    track('screen_viewed', { screen: resolved });
    setScreen(resolved);
    setParams(resolvedParams);
  }
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

6. **Pass `goReplace` to screen components**:
```jsx
<ScreenComponent go={go} goBack={goBack} goReplace={goReplace} {...params} />
```

---

### C. `connect-four/src/screens/GameScreen.jsx`

Change the `saveGame()` call from `go('review', ...)` to `goReplace('review', ...)`:

```js
// Before:
go('review', { id: gameId });

// After:
goReplace('review', { id: gameId });
```

`goReplace` is passed as a direct prop (same pattern as `go` and `goBack`).

**Add `goReplace` to the destructured props**:
```js
export function GameScreen({ go, goBack, goReplace, difficulty, side, initialMoves = '' }) {
```

---

### D. `connect-four/src/screens/ReviewScreen.jsx`

**Add Share button** (FR-017):

```jsx
const [copied, setCopied] = useState(false);

function handleShare() {
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => console.warn('[share] clipboard write failed'));
  } else {
    console.warn('[share] clipboard API unavailable');
  }
}
```

Render in the TopBar or immediately below it:
```jsx
<button onClick={handleShare}>{t('review.share.button')}</button>
{copied && <span>{t('review.share.copied')}</span>}
```

Visual placement: a small ghost button in the TopBar right slot, or a text button below the accuracy card. Must be visible to all users (no auth gate, no tier gate).

---

### E. `connect-four/src/i18n/en.json`

Add under a `"review"` section (create if not present):
```json
"review": {
  "share": {
    "button": "Share",
    "copied": "Link copied!"
  }
}
```

---

### F. `connect-four/server/index.js`

**Three additions** (in order):

1. **Startup: cache dist/index.html** (at top, after existing imports):
```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let indexHtml = null;
try {
  indexHtml = readFileSync(join(__dirname, '../dist/index.html'), 'utf8');
} catch (e) {
  console.error('[server] dist/index.html not found — SPA catch-all will return 500');
}
```

2. **Before catch-all: static middleware** (after all `/api/*` routes):
```js
app.use(express.static(join(__dirname, '../dist')));
```

3. **Catch-all route** (LAST route, after static middleware):
```js
app.get('*', async (req, res) => {
  if (!indexHtml) return res.status(500).send('App not built. Run npm run build.');

  // OG injection for /game/:id
  const gameMatch = req.path.match(/^\/game\/([^/]+)$/);
  if (gameMatch && supabase) {
    const gameId = gameMatch[1];
    try {
      const { data } = await supabase
        .from('games')
        .select('id, difficulty, result')
        .eq('id', gameId)
        .single();

      if (data) {
        const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        const ogTitle = `Connect Four game — ${capitalize(data.difficulty)} — ${capitalize(data.result)}`;
        const ogDesc = 'Review this Connect Four game on DecodeC4.';
        const ogTags = `<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">`;
        const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
        return res.type('html').send(patched);
      }
    } catch (e) {
      // fall through to serve plain index.html
    }
  }

  res.type('html').send(indexHtml);
});
```

**Invariants**:
- Catch-all is registered AFTER all `/api/*` middleware and AFTER `express.static`.
- OG injection is in-memory only — `indexHtml` is never mutated (local `patched` variable).
- Graceful degradation: if Supabase is unavailable or game not found, serve plain HTML.

---

### G. Unit tests for `urlMapping.js`

File: `connect-four/src/__tests__/urlMapping.test.js` (or similar Jest location)

Required test cases (SC-010):
- No two URL patterns resolve to the same (screenKey, params-shape) pair (two patterns sharing a screenKey with distinct params shapes — e.g. `/saga` and `/saga/:highlightSlug` — is intentional and allowed)
- `buildUrl('saga', {})` returns `'/saga'`
- `buildUrl('saga', { highlightSlug: 'claimeven' })` returns `'/saga/claimeven'`
- `buildUrl('game', {})` returns `'/game'`
- `buildUrl('review', { id: 'abc' })` returns `'/game/abc'`
- `buildUrl('home', {})` returns `'/'`
- `parseUrl('/challenge/immediate_threat')` returns `{ screenKey: 'challenge', params: { category: 'immediate_threat' } }`
- `parseUrl('/game/abc123')` returns `{ screenKey: 'review', params: { id: 'abc123' } }`
- `parseUrl('/game')` returns `{ screenKey: 'game', params: {} }`
- `parseUrl('/saga/claimeven')` returns `{ screenKey: 'saga', params: { highlightSlug: 'claimeven' } }`
- `parseUrl('/xyz/unknown')` returns `{ screenKey: 'home', params: {} }`
- `buildUrl` returns a valid non-null string for every screen key in SCREENS registry

---

### H. `CLChallengeScreen.jsx` — cold-boot loading state

On cold-boot, the Navigator passes only `{ lessonId }`. The screen must fetch its remaining
props from `GET /api/lessons/:lessonId`. `GET /api/lessons/:id` returns the full lesson object,
so `confirmationChallenges` is available alongside `title`, `confirmationCategory`, and
`confirmationCount`.

```jsx
export function CLChallengeScreen({ go, goBack, lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges }) {
  // If lessonTitle is missing (cold-boot), fetch from API
  const [resolvedTitle, setResolvedTitle] = useState(lessonTitle ?? null);
  const [resolvedCategory, setResolvedCategory] = useState(confirmationCategory ?? null);
  const [resolvedCount, setResolvedCount] = useState(confirmationCount ?? null);
  const [resolvedChallenges, setResolvedChallenges] = useState(confirmationChallenges ?? null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!lessonTitle && lessonId) {
      fetch(`${API}/api/lessons/${lessonId}`)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(data => {
          setResolvedTitle(data.title);
          setResolvedCategory(data.confirmationCategory);
          setResolvedCount(data.confirmationCount);
          setResolvedChallenges(data.confirmationChallenges);
        })
        .catch(() => setFetchError(true));
    }
  }, [lessonId]);

  if (!resolvedTitle) return fetchError ? <div>Lesson not found.</div> : <div>Loading…</div>;
  // ... rest of existing render using resolvedTitle, resolvedCategory, resolvedCount, resolvedChallenges
}
```

**Note**: This change is additive. Existing `go('clchallenge', { lessonId, lessonTitle, confirmationChallenges, ... })` call sites continue to work — the `useEffect` is a no-op when `lessonTitle` is already present.

---

## Ordering Constraints (for task generation)

1. `urlMapping.js` must be created FIRST — Navigator and tests both depend on it.
2. Navigator changes (App.jsx) depend on `urlMapping.js`.
3. `GameScreen.jsx` change (`goReplace`) depends on Navigator adding `goReplace`.
4. `ReviewScreen.jsx` share button is independent (no urlMapping dependency).
5. `en.json` i18n keys can be added in parallel with ReviewScreen.
6. Server catch-all changes are independent of all frontend changes.
7. Unit tests for `urlMapping.js` should be written alongside the module (same task or immediately after).
8. `CLChallengeScreen.jsx` cold-boot change is independent (can be done in parallel with Navigator changes).
9. Architecture doc update (frontend-conventions.md navigation section) must happen after Navigator changes are confirmed working.

---

## Complexity Tracking

No constitution violations. All additions are strictly necessary for the spec.

| Addition | Why Needed |
|---|---|
| `urlMapping.js` new module | Spec FR-008 requires single canonical URL mapping source |
| `goReplace()` helper | Spec FR-007 requires /game → /game/:id with no extra history entry |
| `CLChallengeScreen` fetch-on-cold-boot | Spec FR-007 clchallenge note; `lessonTitle` cannot be URL-encoded |
