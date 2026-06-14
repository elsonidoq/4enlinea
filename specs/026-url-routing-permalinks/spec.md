# Feature Specification: URL Routing & Permalinks

**Feature Branch**: `026-url-routing-permalinks`
**Created**: 2026-06-08
**Status**: Draft
**Epic**: Routing & Permalinks

---

## Context & What Already Exists

The app uses a custom state-machine navigator defined in spec 011. `react-router-dom` was deliberately removed in that spec — this epic must never reintroduce it. All URL work is a purely additive layer on top of the existing `go(screenKey, params)` dispatcher.

**Authoritative baseline — spec 011 invariants that MUST NOT be violated:**

- **FR-001** (spec 011): `BrowserRouter`, `Routes`, `Route`, `NavLink`, and `Link` are gone. Do not add them back.
- **FR-002** (spec 011): `go()` replaces the current screen; back-stack is the `history` array.
- **FR-004** (spec 011): `params` passed to `go()` are accessible to screen components as **direct props** (spread via `{...params}`), not nested under a `params` key.
- **FR-008** (spec 011): `track.js` uses `setActiveScreen(screenKey)` for analytics — NOT `window.location.pathname`. This invariant is unchanged.
- **FR-010** (spec 011): `track('screen_viewed', { screen: key })` fires on every `go()` call and on every back-navigation.

**Already built and unchanged by this epic:**

- `go(screenKey, params = {})` dispatcher in `src/App.jsx`
- `SCREENS` registry in `src/lib/screenRegistry.jsx` — 15 screen keys
- `SURFACE_BG` in `src/lib/surfaceGroups.js` — background token per screen
- `setActiveScreen` / `track` in `src/lib/track.js`
- Admin shell detection: `window.location.pathname.startsWith('/admin')` in `App.jsx` — preserved as-is
- `ReviewScreen` cold-boot path: `POST /api/games/analyze` with `{ gameId }` — no changes needed

**Current navigator implementation (ground truth):**

```js
// App.jsx — Navigator component
const [screen, setScreen] = useState('home');
const [params, setParams] = useState({});
const [history, setHistory] = useState([]);

const go = useCallback((key, newParams = {}) => {
  if (!SCREENS[key]) { console.warn(`[navigator] unknown screen key: ${key}`); return; }
  setActiveScreen(key);
  track('screen_viewed', { screen: key });
  setHistory(h => [...h, { screen, params }]);
  setParams(newParams);
  setScreen(key);
}, [screen, params]);

const goBack = useCallback((n = 1) => {
  setHistory(h => {
    const steps = Math.min(n, h.length);
    if (steps === 0) return h;
    const prev = h[h.length - steps];
    setActiveScreen(prev.screen);
    track('screen_viewed', { screen: prev.screen });
    setScreen(prev.screen);
    setParams(prev.params);
    return h.slice(0, h.length - steps);
  });
}, []);
```

**`goBack()` call-site audit (completed):** All call sites in `src/` use `goBack()` with no argument — `n` always defaults to 1. No call site uses `goBack(2)` or higher. This means changing `goBack()` to delegate to `window.history.back()` requires zero call-site changes.

---

## User Scenarios & Testing

### User Story 1 — Navigate with clean URLs and browser back button (Priority: P1)

A user navigates through the app and every transition produces a clean, bookmarkable URL. The browser back button works to return to the previous screen. Refreshing the page re-renders the same screen.

**Why this priority**: URL sync is the spine of the entire permalink feature. Without it, direct links and browser navigation both break. All other stories depend on it.

**Independent Test**: Open the app at `/`. Tap "Challenges" → URL becomes `/setpicker`. Tap a set → URL becomes `/challenge/immediate_threat`. Press the browser back button → URL returns to `/setpicker` and the Set Picker screen re-renders.

**Acceptance Scenarios**:

1. **Given** the app is loaded at `/`, **When** `go('setpicker')` is called, **Then** `window.location.pathname` changes to `/setpicker` without a page reload.
2. **Given** the app is loaded at `/`, **When** `go('challenge', { category: 'immediate_threat' })` is called, **Then** `window.location.pathname` becomes `/challenge/immediate_threat`.
3. **Given** the user has navigated home → setpicker → challenge, **When** the browser back button is pressed, **Then** the Set Picker screen renders and the URL is `/setpicker`.
4. **Given** the app is loaded fresh at `/challenge/immediate_threat`, **When** the page finishes loading, **Then** the Challenge screen renders with `category='immediate_threat'` as a direct prop.
5. **Given** the app is loaded fresh at `/saga/claimeven`, **When** the page finishes loading, **Then** the Saga Map screen renders with `highlightSlug='claimeven'` as a direct prop.
6. **Given** the app is loaded fresh at an unrecognized URL (e.g. `/xyz/unknown`), **When** the page finishes loading, **Then** the Home screen renders and the URL is replaced with `/`.
7. **Given** `window.location.pathname.startsWith('/admin')` is true, **When** the app boots, **Then** `AdminCuratePage` renders and the Navigator is never mounted.
8. **Given** the user navigates to a session-only screen (summary, explorer, mistakeDetail) by direct URL, **When** the page loads, **Then** the Home screen renders and the URL is replaced with `/`.

---

### User Story 2 — Share a game review via permalink (Priority: P2)

A user finishes a sparring game, opens the Post-Game Review screen, and copies the permalink URL. They send it to a friend. The friend opens the URL in an incognito window and sees the same game review without signing in.

**Why this priority**: The permalink is the primary viral distribution mechanism. It requires URL sync (Story 1) to be in place.

**Independent Test**: Complete a sparring game. On the Review screen, tap the share button. Paste the copied URL into an incognito window. Verify the Review screen loads and shows the same game data (accuracy, move timeline).

**Acceptance Scenarios**:

1. **Given** the user is on `ReviewScreen` for game `id=abc123`, **When** they tap the Share button, **Then** `window.location.href` (the `/game/abc123` URL) is copied to the clipboard and a "Link copied!" toast appears for ≤2 seconds.
2. **Given** an unauthenticated user loads `/game/abc123` in a fresh browser tab, **When** the page finishes loading, **Then** `ReviewScreen` renders with the correct game analysis (accuracy card, move timeline) without requiring sign-in.
3. **Given** an unauthenticated user loads `/game/abc123`, **When** the game is not found (invalid or deleted ID), **Then** a user-friendly "Game not found" error message renders — no blank page, no JavaScript error.
4. **Given** a user loads `/game/abc123`, **When** the page HTML is inspected (or an OG debugger is used), **Then** `<meta property="og:title">` and `<meta property="og:description">` tags are present with content derived from the game's difficulty and result.

---

### User Story 3 — OG preview card in messaging apps (Priority: P3)

A user pastes a `/game/:id` URL into a messaging app (WhatsApp, Slack, iMessage). The app shows a preview card with the game title and description.

**Why this priority**: Requires Story 2 as a prerequisite. Adds sharing polish but does not block basic permalink functionality.

**Independent Test**: Paste `/game/:id` into Facebook's OG Debugger. Verify the preview card shows a title like "Connect Four game — Hard — Win" and a description.

**Acceptance Scenarios**:

1. **Given** a valid `/game/:id` URL is served by Express, **When** the HTML response body is inspected, **Then** it contains `<meta property="og:title" content="Connect Four game — {difficulty} — {result}">` and `<meta property="og:description" content="Review this Connect Four game on DecodeC4.">`.
2. **Given** the game row does not exist or Supabase is unavailable, **When** Express handles a `/game/:id` request, **Then** it serves `dist/index.html` without OG tags — a 404 is never returned for the HTML page itself.
3. **Given** any non-`/api/`, non-`/game/:id` path is requested from Express, **When** the server responds, **Then** `dist/index.html` is served without modification.

---

### Edge Cases

- What happens when `go()` is called with an unrecognized screen key? Stay on current screen, emit `console.warn('[navigator] unknown screen key: <key>')` (preserving spec 011 FR-002 behavior). `pushState` is NOT called for unknown keys.
- What happens when `event.state` is null in a `popstate` event (browser back from a page outside the app)? Fall back to parsing `window.location.pathname` to derive the screen. If unparseable, navigate to `home`.
- What happens when `goBack()` is called on the home screen (empty history)? `window.history.back()` is called; the browser handles it (returns to previous browser tab or does nothing). The in-app `history` guard prevents double-navigation.
- What happens if `dist/index.html` does not exist when the server starts? Log an error; do not crash. The catch-all returns 500 if the file is missing (do not serve an empty body).
- What happens when the `summary` screen is navigated to via `go('summary', { results: [...] })`? `pushState` is called with URL `/summary`. On cold-boot at `/summary`, the app redirects to `home` (the `results` array cannot be reconstructed from the URL). The user navigating normally from the same session is not affected.
- What happens if the OG injection mutates `dist/index.html` on disk? This is a bug — the spec explicitly forbids it. The in-memory patched string must be derived from a cached read of the file, not written back.

---

## Requirements

### Functional Requirements

**Navigator — URL sync layer:**

- **FR-001**: On every `go(screenKey, params)` call, the navigator MUST call `window.history.pushState({ screenKey, params }, '', <url>)` after computing the URL from the mapping table. No other `go()` behavior changes. No call-site changes are required.
- **FR-002**: On app mount, the navigator MUST parse `window.location.pathname` against the URL mapping table, derive `screenKey` and `params`, and initialize the screen via the internal setter — bypassing `pushState` on first load to avoid a duplicate history entry. It MUST also call `window.history.replaceState({ screenKey, params }, '', <canonical-url>)` to populate the browser history state object.
- **FR-003**: The admin check (`window.location.pathname.startsWith('/admin')`) MUST run BEFORE any Navigator logic, preserving the existing `App.jsx` guard.
- **FR-004**: The Navigator MUST add a `popstate` event listener on mount and remove it on unmount. On `popstate`: derive `screenKey` and `params` from `event.state` (or fall back to pathname parsing if state is null); set the active screen via internal setters WITHOUT calling `go()` (to avoid a duplicate `pushState`); call `setActiveScreen(screenKey)` and `track('screen_viewed', { screen: screenKey })` (preserving spec 011 FR-010).
- **FR-005**: `goBack()` MUST be changed to call `window.history.back()` instead of popping the in-app `history` array. `track('screen_viewed', ...)` for back-navigation MUST fire in the `popstate` handler (not in `goBack()` itself) to avoid double-firing. The in-app `history` array MAY be kept as a thin mirror or removed — no call site uses `n > 1`.
- **FR-006**: `track.js` behavior MUST be unchanged. `setActiveScreen` continues to receive the screen key (not the pathname). URL sync does not alter any analytics event.

**URL mapping table (authoritative — every screen key in the registry):**

- **FR-007**: The following URL-to-screen mapping table MUST be implemented. It is the canonical source of truth for both the URL computation (used in `go()`) and the URL parser (used on cold boot and `popstate` fallback).

  | URL Pattern | Screen Key | Params |
  |---|---|---|
  | `/` | `home` | none |
  | `/stats` | `stats` | none |
  | `/mistakes` | `mistakes` | none |
  | `/saga` | `saga` | none |
  | `/saga/:highlightSlug` | `saga` | `{ highlightSlug }` |
  | `/concept/:lessonId` | `concept` | `{ lessonId }` |
  | `/socratic/:lessonId` | `socratic` | `{ lessonId }` |
  | `/clchallenge/:lessonId` | `clchallenge` | `{ lessonId }` (cold-boot fetches remaining props from `GET /api/lessons/:lessonId`) |
  | `/setpicker` | `setpicker` | none |
  | `/challenge/:category` | `challenge` | `{ category }` |
  | `/summary` | `summary` | session-only — not cold-bootable |
  | `/difficulty` | `difficulty` | none |
  | `/game` | `game` | none (URL has no params; `difficulty`/`side` are not encoded) |
  | `/game/:id` | `review` | `{ id }` |
  | `/explorer` | `explorer` | not cold-bootable |
  | `/mistakeDetail` | `mistakeDetail` | not cold-bootable |

  Notes:
  - `/game/:id` maps to `review` (post-game analysis). Cold-booting `/game/:id` always lands on `ReviewScreen`.
  - `/game` (no id segment) maps to the live `game` screen. It is pushed immediately when a game starts (before a server-side game row exists). Once the game row is created and its `id` is returned from `POST /api/games`, `GameScreen.saveGame()` MUST call `goReplace('review', { id: gameId })` — this transitions to `ReviewScreen` and replaces the `/game` history entry with `/game/:id` with no extra history entry. Cold-booting `/game` (no id) routes to `home` because `game` is a session-only screen (see FR-010).
  - `clchallenge` encodes only `lessonId` in the URL. On cold boot, the app calls `GET /api/lessons/:lessonId` and spreads `{ lessonId, lessonTitle: lesson.title, confirmationCategory: lesson.confirmationCategory, confirmationCount: lesson.confirmationCount, confirmationChallenges: lesson.confirmationChallenges }` as direct props to `CLChallengeScreen`. `go('clchallenge', { lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges })` encodes only `lessonId` into the URL.
  - Screens marked "not cold-bootable" redirect to `/` on direct-URL load (see FR-010).

- **FR-008**: The URL mapping table MUST be extracted into a dedicated module (`src/lib/urlMapping.js` or equivalent) that is importable by both the Navigator (for `pushState`) and any URL parser utilities. It MUST NOT be duplicated.
- **FR-009**: URL parsing MUST be unambiguous: each URL pattern MUST resolve to exactly one `(screenKey, params-shape)` pair. Screen-to-URL is a function of `(screenKey, params)` together, not `screenKey` alone — `saga` with no params produces `/saga`; `saga` with `{ highlightSlug }` produces `/saga/:highlightSlug`. Two different URL patterns MAY map to the same screen key provided their params shapes are distinct (e.g. `/saga` and `/saga/:highlightSlug` both map to `saga` — this is intentional). Tests MUST verify: (a) no two URL patterns resolve to the same `(screenKey, params-shape)` pair, and (b) for each screen key, the URL builder produces a valid, non-`undefined` path for any valid params shape (e.g. `saga` with and without `highlightSlug`, `game` with no params vs `review` with `{ id }`).
- **FR-010**: Cold-booting at a URL for a session-only screen (`summary`, `explorer`, `mistakeDetail`, `game`) or an unrecognized path MUST redirect the app to `home` and replace the history entry with `/`. `game` (no id) is session-only because `difficulty` and `side` are not encoded in the URL and cannot be reconstructed.

**Server — SPA catch-all and static assets:**

- **FR-011**: `connect-four/server/index.js` MUST serve `connect-four/dist/` as static assets via `express.static(join(__dirname, '../dist'))`, registered BEFORE the catch-all route. This enables JS, CSS, and image assets to be served without hitting the catch-all.
- **FR-012**: A catch-all GET route MUST be added AFTER all `/api/*` middleware and the static middleware. It MUST serve `dist/index.html` for every request not starting with `/api/` and not matched by a static file. `connect-four/index.html` (the Vite source template) MUST NOT be referenced in the catch-all.
- **FR-013**: The catch-all MUST never intercept `/api/*` requests. Express route registration order enforces this — the catch-all MUST be registered last.
- **FR-014**: For `/game/:id` paths specifically, the catch-all MUST inject OG meta tags into the served HTML (see FR-016 through FR-018).

**Permalink — game review:**

- **FR-015**: `POST /api/games/analyze` already accepts unauthenticated requests (`req.user` may be null). No auth-gate change is needed. The spec requires the implementer to verify this before shipping by reading the endpoint source and confirming `loadUser` is the only middleware.
- **FR-016**: `ReviewScreen` MUST handle the case where `POST /api/games/analyze` returns 404 (game not found): render a user-friendly "Game not found" message — no blank page, no uncaught error.
- **FR-017**: `ReviewScreen` MUST display a Share button visible to all users (no auth or tier gate). On tap: copy `window.location.href` to the clipboard using the Clipboard API; show a `review.share.copied` toast (i18n, English: "Link copied!") for ≤2 seconds.
- **FR-018**: New i18n keys MUST be added to `en.json`: `review.share.button` (English: "Share") and `review.share.copied` (English: "Link copied!"). Existing keys MUST NOT be removed or renamed.

**Open Graph injection:**

- **FR-019**: When Express handles a GET request for `/game/:id` (matched via the catch-all before serving), it MUST:
  1. Read `dist/index.html` into memory (at startup or on first request — not on every request if caching at startup).
  2. Fetch the game row from Supabase: `id`, `difficulty`, `result`.
  3. Derive OG title: `"Connect Four game — {difficulty} — {result}"` (e.g. `"Connect Four game — Hard — Win"`). The DB stores `difficulty` and `result` in lowercase; the title builder MUST capitalize the first letter of each before interpolation (e.g. `"hard"` → `"Hard"`, `"win"` → `"Win"`).
  4. Derive OG description: `"Review this Connect Four game on DecodeC4."`.
  5. Inject the two `<meta>` tags immediately before `</head>` in the in-memory HTML string.
  6. Send the patched string as the HTTP response.
  7. MUST NOT write the patched string to `dist/index.html` on disk.
- **FR-020**: If Supabase is not configured or the game row is not found, Express MUST serve `dist/index.html` unchanged (no OG tags, no error response to the browser — graceful degradation).

### Key Entities

- **URL mapping table**: The canonical bidirectional map between URL patterns and `{ screenKey, params }` objects. Lives in a dedicated frontend module. Used by the Navigator on every `go()` call and on mount.
- **Browser history state**: The object stored with each `pushState` / `replaceState` call: `{ screenKey: string, params: object }`. The `popstate` handler reads this to restore screen state without parsing the URL.
- **OG-injected HTML**: An in-memory string derived from `dist/index.html` with two `<meta>` tags injected for game-review paths. Never written to disk.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every `go()` call produces a URL update in `window.location.pathname` without a page reload, verifiable by inspection of `window.location.pathname` after each call in a unit test.
- **SC-002**: Loading the app at any cold-boot URL (e.g. `/challenge/immediate_threat`, `/game/:id`, `/stats`) renders the correct screen with the correct props — zero blank pages, zero uncaught errors.
- **SC-003**: The browser back button restores the previous screen and URL on every navigation in a session, verifiable by manual navigation of a 3-step sequence and pressing back twice.
- **SC-004**: An unauthenticated user loading `/game/:id` in an incognito window sees the full game review (accuracy card, move timeline) within normal page-load time — no sign-in prompt, no gating error.
- **SC-005**: The share button on `ReviewScreen` copies the correct permalink URL to the clipboard in ≤500 ms and shows a toast that disappears within 2 seconds.
- **SC-006**: An OG debugger (e.g. Facebook Sharing Debugger) shows the correct title and description for a `/game/:id` URL.
- **SC-007**: No existing `go()` call site in `src/` requires any change — verifiable by diffing `git diff src/` for any call sites after implementation.
- **SC-008**: All `npm run test:fast` tests pass without modification after the routing changes.
- **SC-009**: `AdminCuratePage` renders correctly when navigating to `/admin/curate` — no regression in curation tooling.
- **SC-010**: Unit test verifies: (a) no two URL patterns in the mapping table resolve to the same `(screenKey, params-shape)` pair (two patterns sharing a screenKey with different params shapes — e.g. `/saga` and `/saga/:highlightSlug` — is explicitly allowed), and (b) for each screen key, `buildUrl(screenKey, validParams)` returns a non-`undefined`, non-`null` string for every valid params shape that screen accepts (e.g. `saga` tested with `{}` and `{ highlightSlug: 'claimeven' }`, `game` tested with `{}`, `review` tested with `{ id: 'abc' }`).

---

## Assumptions

- `dist/` is present and populated on the server host. In development, the SPA is served via Vite's dev server; the catch-all is a production concern. The spec does not require the catch-all to be wired in development.
- `POST /api/games/analyze` already allows unauthenticated access (as documented in `api-conventions.md`). If this is found to be incorrect during implementation, relaxing the auth guard takes priority.
- The `games` Supabase table has `id`, `difficulty`, `result`, and `side` columns — confirmed by `api-conventions.md` and `project_sparring_games_table.md` memory.
- `window.history.pushState` and `window.history.replaceState` are available in all supported browsers (no polyfill needed — all modern browsers support the History API).
- `navigator.clipboard.writeText` is available in all supported browsers over HTTPS (the Share button falls back silently to a `console.warn` if unavailable, e.g. in non-HTTPS development).
- The `review.share.button` and `review.share.copied` i18n keys do not yet exist in `en.json` — they must be added by this epic.
- Single-blunder permalinks (`/mistake/:id`) and `ExplorerScreen` permalinks are explicitly out of scope and deferred (documented in the "Not Included" section).

---

## Not Included (Deferred)

- **`react-router-dom`** — must not be added.
- **SSR or pre-rendering** — all rendering is client-side; the server only injects OG meta tags.
- **Twitter/X card metadata** — OG tags are sufficient.
- **Authentication-gated game reviews** — all `/game/:id` permalinks are public.
- **Single-blunder permalinks (`/mistake/:id`)** — `MistakeDetailScreen` takes a `blunders[]` array + index and cannot be cold-booted without a new `GET /api/blunders/:id` endpoint and a screen refactor. Deferred.
- **`ExplorerScreen` permalink** — `ExplorerScreen` requires a pre-analyzed `moves` array from `ReviewScreen` and cannot be independently cold-booted. Deferred.
