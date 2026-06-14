# Tasks: URL Routing & Permalinks

**Input**: Design documents from `/specs/026-url-routing-permalinks/`  
**Branch**: `101-new-design` | **Date**: 2026-06-09  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

---

## Phase 2: Foundation — URL Mapping Module

**Purpose**: Create the canonical URL ↔ screen-key mapping module. This is a blocking prerequisite for ALL user story phases. No Navigator or test work can start until T001 is done.

**⚠️ CRITICAL discrepancy**: `contracts/url-mapping-api.md` and `research.md` Decision 6 list only 3 entries in `SESSION_ONLY_SCREENS` (summary, explorer, mistakeDetail). However **spec FR-010 and plan section A are authoritative**: the correct set is 4 entries — `new Set(['summary', 'explorer', 'mistakeDetail', 'game'])`. Use the spec, not the contract.

- [x] T001 Create `connect-four/src/lib/urlMapping.js` — export `URL_MAP` (16-entry ordered array per plan section A table, with `/game/:id` before `/game`), `SESSION_ONLY_SCREENS` (Set of 4: summary, explorer, mistakeDetail, game), `buildUrl(screenKey, params)` (special-cases: saga with/without highlightSlug, review→/game/:id, game→/game, unknown→'/'), and `parseUrl(pathname)` (iterates URL_MAP in order, returns `{ screenKey: 'home', params: {} }` for unrecognized paths, never throws)

- [x] T002 Create `connect-four/src/__tests__/urlMapping.test.js` — Jest unit tests covering all 12 cases from plan section G: (1) no two URL_MAP entries share the same (screenKey × params-shape); (2-6) buildUrl for saga/{}, saga/{highlightSlug}, game/{}, review/{id}, home/{}; (7-11) parseUrl for /challenge/immediate_threat, /game/abc123, /game, /saga/claimeven, /xyz/unknown; (12) buildUrl returns a non-null non-undefined string for every screen key in the 15-entry SCREENS registry

**Checkpoint**: `npm run test:fast` in `connect-four/` must pass T002 before proceeding to Phase 3.

---

## Phase 3: User Story 1 — Clean URLs, Browser Back, Cold Boot (Priority: P1)

**Goal**: Every `go()` call produces a URL update. The browser back button restores the prior screen. Any deep-linked URL cold-boots to the correct screen. Session-only and unrecognized URLs redirect to home.

**Independent Test**: Open the app at `/`. Navigate home → `/setpicker` → `/challenge/immediate_threat`. Press browser back twice. Verify URL and screen restore correctly each time. Then open a fresh tab at `/challenge/immediate_threat` and verify ChallengeScreen renders with `category='immediate_threat'`.

- [x] T003 [US1] Modify `connect-four/src/App.jsx` — import `buildUrl`, `parseUrl`, `SESSION_ONLY_SCREENS` from `../lib/urlMapping`; rewrite `go()` to call `window.history.pushState({ screenKey: key, params: newParams }, '', buildUrl(key, newParams))` and remove the `history` array push and `screen`/`params` from the useCallback deps array (deps become `[]`); add `goReplace()` function that calls `window.history.replaceState` with the same args (plan section B item 3); rewrite `goBack()` to call `window.history.back()` only (tracking moves to popstate handler — do not call track() inside goBack itself)

- [x] T004 [US1] Modify `connect-four/src/App.jsx` — add mount useEffect (runs once, empty deps): parse `window.location.pathname` via `parseUrl`, check `SESSION_ONLY_SCREENS`, resolve to `home/{}` if session-only, call `setScreen`/`setParams`/`setActiveScreen` directly (do NOT call `go()` to avoid double pushState), call `window.history.replaceState({ screenKey, params }, '', resolvedUrl)`, and move `track('session_start', { screen: resolved })` into this effect replacing the old mount effect; add second useEffect for `popstate` listener: read `event.state?.screenKey` or fall back to `parseUrl(window.location.pathname)`, redirect to `home` if session-only, call `setScreen`/`setParams`/`setActiveScreen`/`track('screen_viewed', ...)`, clean up listener on unmount (plan section B items 1 and 5)

- [x] T005 [US1] Modify `connect-four/src/App.jsx` — remove the `history` state variable and `setHistory` entirely; pass `goReplace` as a direct prop to `ScreenComponent` alongside `go` and `goBack` in the JSX render (plan section B item 6); verify the `history` array is referenced nowhere after removal

- [x] T006 [US1] Modify `connect-four/src/screens/GameScreen.jsx` — add `goReplace` to the destructured props signature: `export function GameScreen({ go, goBack, goReplace, difficulty, side, initialMoves = '' })`; find the `saveGame()` function and change `go('review', { id: gameId })` to `goReplace('review', { id: gameId })` so the `/game` history entry is replaced with `/game/:id` without creating an extra history entry (plan section C)

- [x] T007 [P] [US1] Modify `connect-four/src/screens/CLChallengeScreen.jsx` — add cold-boot useEffect: when `lessonTitle` is falsy and `lessonId` is present, fetch `GET ${API}/api/lessons/${lessonId}`, on success set local state for `resolvedTitle`, `resolvedCategory`, `resolvedCount`, `resolvedChallenges`; on error set `fetchError = true`; render `<div>Loading…</div>` when `resolvedTitle` is null and no error, render `<div>Lesson not found.</div>` on error; replace all uses of the direct `lessonTitle`/`confirmationCategory`/`confirmationCount`/`confirmationChallenges` props in the render body with the resolved state variables (plan section H); confirm the useEffect is a no-op when `lessonTitle` is already present (existing call sites unaffected)

- [x] T008 [P] [US1] Modify `connect-four/server/index.js` — add imports `import { readFileSync } from 'node:fs'` and `import { join } from 'node:path'` if not already present; read `dist/index.html` at startup into a module-level `let indexHtml = null` with a try/catch that logs `[server] dist/index.html not found — SPA catch-all will return 500` on failure; register `app.use(express.static(join(__dirname, '../dist')))` AFTER all `/api/*` routes; register a catch-all `app.get('*', ...)` as the LAST route that returns 500 if `indexHtml` is null, otherwise serves `indexHtml` as `res.type('html').send(indexHtml)` (OG injection to be added in T011) (plan section F items 1–3, non-OG path only)

**Checkpoint**: Cold-booting `/challenge/immediate_threat`, `/stats`, `/saga/claimeven` must each render the correct screen. Cold-booting `/summary` and `/game` must both render home at `/`. Browser back must work across a 3-step navigation sequence. **US1 is not complete until T012 (architecture doc) also lands** — T012 is a hard gate, not optional polish.

---

## Phase 4: User Story 2 — Game Review Permalink + Share Button (Priority: P2)

**Goal**: The Share button on ReviewScreen copies the current URL to the clipboard and shows a toast. Unauthenticated users can load `/game/:id` directly and see the full game review.

**Independent Test**: Complete a sparring game. On ReviewScreen, tap Share → verify `window.location.href` (a `/game/:id` URL) is copied to clipboard and "Link copied!" toast appears and disappears within 2 seconds. Open the copied URL in an incognito tab → ReviewScreen renders with accuracy card and move timeline without sign-in.

- [x] T009 [P] [US2] Modify `connect-four/src/i18n/en.json` — add `"review"` top-level key (or extend if it exists) with nested `"share": { "button": "Share", "copied": "Link copied!" }`; verify no existing keys are removed or renamed (spec FR-018, data-model.md new i18n keys section)

- [x] T010 [US2] Modify `connect-four/src/screens/ReviewScreen.jsx` — add `const [copied, setCopied] = useState(false)`; add `handleShare()`: reads `window.location.href`, calls `navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => console.warn('[share] clipboard write failed'))`; add a Share button (visible to all users, no auth or tier gate) using `t('review.share.button')` and show `{copied && <span>{t('review.share.copied')}</span>}` immediately adjacent; place in TopBar right slot or below accuracy card (plan section D); confirm FR-016 (404 renders "Game not found." error) is already satisfied by existing `error = t('sparring.reviewNotFound')` path — no additional 404 handling needed

**Checkpoint**: Share button copies correct URL; toast renders and clears within 2 seconds; unauthenticated load of `/game/:id` shows full review.

---

## Phase 5: User Story 3 — OG Preview Card (Priority: P3)

**Goal**: Pasting a `/game/:id` URL into a messaging app shows a preview card with the game's difficulty and result. Non-`/game/:id` paths serve plain `index.html` unchanged.

**Independent Test**: Use Facebook's OG Debugger or `curl` on a `/game/:id` URL. Verify the response HTML contains `<meta property="og:title" content="Connect Four game — Hard — Win">` and `<meta property="og:description" content="Review this Connect Four game on DecodeC4.">`.

- [x] T011 [US3] Modify `connect-four/server/index.js` — extend the catch-all added in T008: before serving `indexHtml`, check `const gameMatch = req.path.match(/^\/game\/([^/]+)$/)` ; if matched and `supabase` is available, `await supabase.from('games').select('id, difficulty, result').eq('id', gameMatch[1]).single()`; if data exists, build the OG title using a one-line capitalize helper (`const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s`) so that DB lowercase values (`"hard"`, `"win"`) become Title Case in the title (e.g. `"Connect Four game — Hard — Win"`): `ogTitle = \`Connect Four game — ${capitalize(data.difficulty)} — ${capitalize(data.result)}\`` and `ogDesc = 'Review this Connect Four game on DecodeC4.'`, inject both `<meta property="og:title" ...>` and `<meta property="og:description" ...>` immediately before `</head>` in a local `patched` variable derived from `indexHtml` (NEVER mutate `indexHtml` itself), and `return res.type('html').send(patched)`; all error paths (Supabase unavailable, game not found, Supabase throws) MUST fall through to serving plain `indexHtml` (spec FR-019 item 3, FR-020, plan section F item 3)

**Checkpoint**: OG debugger shows correct title and description for a valid `/game/:id`, with difficulty and result in Title Case (e.g. `"Connect Four game — Hard — Win"`, not `"Connect Four game — hard — win"`). Missing game ID and Supabase errors both gracefully serve plain HTML (no 500, no OG tags).

---

## Cross-Cutting Concerns (Hard Gate for US1)

**⚠️ T012 is NOT optional polish. US1 is considered incomplete until T012 is merged.** The US1 checkpoint explicitly references T012. Do not mark the US1 phase done until this task is also done.

- [x] T012 Update `docs/architecture/frontend-conventions.md` — add a "URL Sync & Navigation" section documenting: `urlMapping.js` as the single source of truth for URL ↔ screen-key mapping; `pushState` on `go()`, `replaceState` on `goReplace()`, `window.history.back()` on `goBack()`; the `popstate` handler as the canonical place for back-navigation tracking; `SESSION_ONLY_SCREENS` (4 entries: summary, explorer, mistakeDetail, game) and the cold-boot redirect rule; the `clchallenge` cold-boot fetch pattern; note that `react-router-dom` is permanently absent (spec 011 FR-001 invariant)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundation (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Requires T001 (urlMapping.js) complete; T007 and T008 can start as soon as T001 is done; T003–T005 must be sequential (all modify App.jsx); T006 requires T005
- **US2 (Phase 4)**: Independent of Phase 3 — can start as soon as T001 is done (T009 has zero dependencies; T010 requires T009 for i18n keys)
- **US3 (Phase 5)**: Requires T008 (basic catch-all in server)
- **T012 (Hard gate on US1)**: Requires Phase 3 complete (T012 documents the patterns landed in T003–T007); US1 is not done without T012

### User Story Dependencies

- **US1 (P1)**: Requires T001, T002 from Foundation
- **US2 (P2)**: Can start after T001; independent of US1 Navigator changes
- **US3 (P3)**: Requires T008 (server catch-all) from US1

### Within User Story 1

- T001 → T002 (sequential — tests need the module)
- T001 → T003 → T004 → T005 → T006 (sequential — all App.jsx or depend on goReplace being passed through)
- T001 → T007 [P] (parallel with T003–T006, different file)
- T001 → T008 [P] (parallel with all frontend tasks, different subsystem)

### Within User Story 2

- T009 [P] → T010 (i18n keys needed before ReviewScreen compile)

### Parallel Opportunities

- T007 (CLChallengeScreen) can run in parallel with T003–T005 (different files)
- T008 (server catch-all) can run in parallel with all frontend tasks
- T009 (en.json) can run in parallel with T003–T008 (different file)
- T011 (OG injection) can start as soon as T008 is done, independent of US2

---

## Parallel Example: User Story 1

```bash
# After T001 + T002 (urlMapping.js foundation), launch in parallel:
Task T003/T004/T005/T006: App.jsx + GameScreen.jsx (sequential chain, one developer)
Task T007: CLChallengeScreen.jsx cold-boot fetch (independent file, can run concurrently)
Task T008: server/index.js express.static + catch-all (independent subsystem)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Foundation (T001, T002) — urlMapping.js + tests green
2. Complete US1 (T003–T008) — URL sync, back button, cold boot, server catch-all
3. **STOP and VALIDATE**: SC-001, SC-002, SC-003, SC-007, SC-008, SC-009 all verifiable
4. Ship US1 if validated — every navigation now produces clean URLs and cold boot works

### Incremental Delivery

1. Foundation (T001–T002) → URL mapping ready
2. US1 (T003–T008 + T012) → URL sync + cold boot + architecture docs → **MVP** (T012 is a hard gate; US1 not complete without it)
3. US2 (T009–T010) → Share button → permalink copyable
4. US3 (T011) → OG injection → messaging app previews

---

## Notes

- **`game` in SESSION_ONLY_SCREENS**: The contract file (`contracts/url-mapping-api.md`) lists only 3 entries and omits `game`. The spec (FR-010) and plan (section A) both include `game`. Use the spec — 4 entries total.
- **`history` array removal**: T005 removes the `history` React state array entirely. If any downstream code references it after T005, it will be a compile error — check for lingering references before marking T005 done.
- **`goBack()` tracking**: `track('screen_viewed', ...)` for back-navigation fires ONLY in the `popstate` handler (T004), not in `goBack()` itself (T003). This prevents double-firing.
- **`goReplace` thread**: `goReplace` is added in T003, wired to ScreenComponent in T005, and consumed by GameScreen in T006. T006 depends on T005 being complete.
- **CLChallengeScreen guard**: The plan's `useEffect` guard is `!lessonTitle` (falsy check). An empty string `""` would also trigger a re-fetch. Verify the guard is safe against empty-string values if the API could return `title: ""`.
- **OG injection immutability**: `indexHtml` (T008) is read-only at module scope. T011 must derive a local `patched` variable and never mutate `indexHtml`. Review this invariant explicitly during code review.
- **Test scope**: Tests are explicitly required by SC-010. Only T002 contains test tasks. No other test tasks are in scope unless `npm run test:fast` reveals regressions (in which case fix the regressions, not the test configuration).
- **[P] tasks**: Different files with no dependencies on incomplete tasks in the same phase. Single-developer workflow: execute sequentially in listed order.
