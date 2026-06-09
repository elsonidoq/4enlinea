# Research: URL Routing & Permalinks

All unknowns resolved through codebase audit. No external research required.

---

## Decision 1 — `POST /api/games/analyze` auth gate

**Researched**: `grep -n "analyze\|loadUser" connect-four/server/index.js`  
**Finding**: Line 1244 explicitly comments `// No auth required — anonymous users can analyze games.` The handler has no `if (!req.user)` guard.  
**Decision**: No change needed. FR-015 is satisfied.

---

## Decision 2 — ReviewScreen 404 handling already exists

**Researched**: `connect-four/src/screens/ReviewScreen.jsx` and `en.json`  
**Finding**: `ReviewScreen` already sets `error = t('sparring.reviewNotFound')` when the analyze endpoint returns 404. `en.json` maps this to "Game not found."  
**Decision**: FR-016 is satisfied. Only the Share button (FR-017) needs to be added.

---

## Decision 3 — `goReplace` for game → review URL transition

**Researched**: `GameScreen.jsx` save flow; spec FR-007 Notes  
**Finding**: `saveGame()` in GameScreen calls `go('review', { id: gameId })`. With URL sync, this would call `pushState('/game/:id')` — correct URL but extra history entry vs the `/game` placeholder already pushed. The spec requires `replaceState` to convert without a new entry.  
**Decision**: Expose `goReplace(screenKey, params)` on Navigator. GameScreen calls `goReplace('review', { id: gameId })`.  
**Alternatives considered**: `go(key, params, { replace: true })` — rejected for adding conditional to `go()`.

---

## Decision 4 — `goBack()` call site audit

**Researched**: `rg "goBack" connect-four/src/`  
**Finding**: 14 files use `goBack()`. All use zero arguments. No file uses `goBack(2)` or higher.  
**Decision**: `goBack()` can be safely changed to `window.history.back()` with zero call-site changes. The `n` parameter is removed. The `history` array is removed.

---

## Decision 5 — `GET /api/lessons/:id` endpoint existence

**Researched**: `rg "lessons/" connect-four/server/index.js`  
**Finding**: `app.get('/api/lessons/:id', ...)` exists.  
**Decision**: `clchallenge` cold-boot fetch is unblocked.

---

## Decision 6 — Session-only screens list

**Researched**: spec FR-010, FR-007 mapping table Notes  
**Finding**: `summary`, `explorer`, `mistakeDetail` are explicitly marked "not cold-bootable". `game` (no id) is also session-only because `difficulty` and `side` are not encoded in the URL and cannot be reconstructed on cold boot.  
**Decision**: `SESSION_ONLY_SCREENS = new Set(['summary', 'explorer', 'mistakeDetail', 'game'])` in `urlMapping.js`. URL parser redirects these to `home`.

---

## Decision 7 — OG injection approach (in-memory vs per-request read)

**Researched**: spec FR-019, FR-020  
**Finding**: Spec says "at startup or on first request — not on every request if caching at startup."  
**Decision**: Read `dist/index.html` once at startup into `indexHtml` module-level variable. Per-request, inject tags via string replace into a local variable. Never write to disk.

---

## Decision 8 — No new API endpoints needed

**Researched**: `POST /api/games/analyze`, `GET /api/lessons/:id`  
**Finding**: Both exist and are sufficient for their respective cold-boot paths.  
**Decision**: No new endpoints required for this epic.
