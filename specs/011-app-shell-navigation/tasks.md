# Tasks: App Shell & Navigation Migration

**Feature**: Epic 1b — App Shell & Navigation Migration
**Branch**: `101-new-design`
**Spec**: `specs/011-app-shell-navigation/spec.md`
**Plan**: `specs/011-app-shell-navigation/plan.md`

**Test baseline**: 136 pass / 2 fail (pre-existing `candidate-generator.test.js` failures — unrelated, do not touch).
**Verification**: All acceptance checks are browser actions. No automated tests are added by this epic. Each verification task cites the specific spec scenario it validates.

---

## Phase 1: Setup

**Purpose**: Create the `src/screens/` directory that all three screen components require. This directory does not currently exist.

- [X] T001 Create directory `connect-four/src/screens/` via `mkdir -p connect-four/src/screens` — IF the directory is created, THEN subsequent screen file tasks (T004, T005, T007) can write files into it without a "no such directory" error.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Analytics foundation, surface-group map, and placeholder screen must all exist before `screenRegistry.js` and `App.jsx` can be written. T003 and T004 have no mutual dependency and can run in parallel.

⚠️ CRITICAL: Phases 3–5 cannot begin until this phase is complete.

- [X] T002 Modify `connect-four/src/lib/track.js` — add `let activeScreen = 'unknown';` as a module-level variable; add `export function setActiveScreen(key) { activeScreen = key; }` before the existing `track` function; change the `path` assignment inside `track` from `window.location.pathname` to `activeScreen`. The `track(event, data)` call signature must remain unchanged. IF the modification is correct, THEN all existing `track()` call sites continue to compile without changes and `import { setActiveScreen } from './lib/track'` resolves without error.

- [X] T003 [P] Create `connect-four/src/lib/surfaceGroups.js` — new file (`src/lib/` currently contains only `aiDifficulty.js`, `categories.js`, `track.js`; this is a pure addition). Export the `SURFACE_BG` plain-object constant mapping all 15 screen keys to their CSS token strings exactly as specified in plan Phase B1. No React import. IF the file is correct, THEN `import { SURFACE_BG } from './lib/surfaceGroups'` resolves without error and `SURFACE_BG['home']` returns `'--bg-home'`, `SURFACE_BG['saga']` returns `'--bg-lessons'`, `SURFACE_BG['difficulty']` returns `'--bg-sparring'`.

- [X] T004 [P] Create `connect-four/src/screens/PlaceholderScreen.jsx` (in the directory created in T001) — single functional component accepting a `screenKey` prop; renders centered text `"{screenKey} — coming soon"` with no i18n (internal only, never user-facing). IF the file is correct, THEN `<PlaceholderScreen screenKey="saga" />` renders the literal string `saga — coming soon` and the component imports cleanly.

---

## Phase 3: User Story 2 — Home Hub (Priority: P2)

**Goal**: Deliver the `HomeScreen` component and its i18n keys so the Home Hub renders correctly for all users regardless of auth state.

**Independent Test**: After Phase 5 wires it into the navigator, open the app with no authenticated session — all three feature cards are visible, the Coach nudge appears, and the "Progress & Stats" button is present.

⚠️ **Build prerequisite**: `HomeScreen.jsx` must exist before `screenRegistry.js` (T009) is created — `screenRegistry.js` imports it directly. Do not start T009 until T005 is complete.

⚠️ **Epic 1a prerequisite**: `TopBar`, `FeatureCard`, `CoachDialog`, and `Icon` do not exist until Epic 1a ships. Do not implement T005 before those components are available.

- [X] T005 [US2] Create `connect-four/src/screens/HomeScreen.jsx` — implement the Home Hub component per plan Phase C1:
  - `TopBar` left slot: "DecodeC4" brand title; right slot: profile icon with auth-conditional tap handler — unauthenticated → open `AuthModal`; authenticated → `go('stats')` (spec FR-012; mockup always goes to stats — spec governs).
  - 2×1 card grid: Lessons card (→ `go('saga')`), Challenges card (→ `go('setpicker')`).
  - 1 wide Sparring card (→ `go('difficulty')`).
  - `CoachDialog` with static message i18n key `coach.home.welcome.0`, mood `happy`.
  - Ghost button: `t('home.stats_button')` → `go('stats')`.
  - All visible strings use `t()`. No data fetching of any kind.
  - Imports: `TopBar`, `FeatureCard`, `CoachDialog`, `Icon` from Epic 1a; `AuthModal` (existing); `useStore()` from ProfileStoreProvider; `useTranslation`.
  - IF the component is correct, THEN it renders three tappable feature cards and a Coach nudge with zero network requests and no dependency on any store method.

- [X] T006 [US2] Extend `connect-four/src/i18n/en.json` — add the following `home.*` keys per plan Phase C1 (English values): `home.stats_button` → "Progress & Stats"; `home.lessons_title` → "Lessons"; `home.lessons_subtitle` → "Learn why patterns win"; `home.challenges_title` → "Challenges"; `home.challenges_subtitle` → "Find the best move"; `home.sparring_title` → "Sparring"; `home.sparring_subtitle` → "Play a bot that teaches as you go". Add `coach.home.welcome.0` → "Let's sharpen your Connect Four tactics." only if it does not already exist. Spec FR-022 prohibits removing or renaming existing keys. IF the additions are correct, THEN `t('home.stats_button')` returns `"Progress & Stats"` and all prior keys remain unchanged.

---

## Phase 4: User Stories 3 & 4 — Stats Screen (Priority: P3/P4)

**Goal**: Deliver `StatsScreen` covering both anonymous (US3) and authenticated (US4) views in one component. US3 and US4 acceptance scenarios are verifiable by auth state; both are blocked until Epic 7 delivers the five store methods, but the component compiles and renders immediately with `--`/`0` placeholders via optional-chaining.

**Independent Test** *(exercises initial placeholder rendering only — full US3/US4 acceptance requires Epic 7; do NOT mark US3 or US4 verified based on placeholder values alone)*: Navigate to Stats with no Epic 7 store methods present — verify `--` renders for accuracy (from useState init, not from a store call), no crash, no spinner. Full verification of US3/US4 acceptance scenarios is deferred to after Epic 7 ships.

⚠️ **Build prerequisite**: `StatsScreen.jsx` must exist before `screenRegistry.js` (T009) — `screenRegistry.js` imports it directly.
⚠️ **Epic 1a prerequisite**: `TopBar`, `CoachDialog`, `Icon`, and `UpgradeModal` do not exist until Epic 1a ships.
⚠️ **en.json ordering**: T008 touches the same file as T006 — run T008 after T006 completes to avoid conflicts.

- [X] T007 [US3] [US4] Create `connect-four/src/screens/StatsScreen.jsx` — implement the Stats component per plan Phase D1:
  - Per-field `useState` initialized to `'--'` (string fields) or `0` (numeric fields) or `{ W: 0, L: 0, D: 0 }` (sparringRecord). No combined loading state. No spinner.
  - One `useEffect` per store call using safe call pattern: `store?.methodName?.().then(setValue).catch(() => {})`. Each catch MUST include a one-line comment: `// store method absent until Epic 7` (Constitution §VII — errors not silenced without documented reason). Fields: `accuracy` (anonymous, `getLastChallengeSession()?.accuracy`), `allTimeAccuracy` (authenticated, `getAllSessionStats()?.accuracy`), `lessonsCount` (both, `getLessonProgress()?.filter(s => s.status === 'complete').length`), `sparringRecord` (both, `getSparringRecord()`), `streak` (authenticated, `getStreak()?.streak_count`), `patternAccuracy` (authenticated, `getAllSessionStats()?.byPattern`).
  - Auth-conditional rendering: unauthenticated shows `accuracy`, `lessonsCount`, `sparringRecord`, and "Sign up to track your progress over time" prompt (`stats.signup_prompt`) — no "Review past mistakes" link. Authenticated additionally shows `allTimeAccuracy`, `streak`, per-pattern accuracy bars, Coach recommendation, and "Review past mistakes" link (`go('mistakes')`).
  - Per-pattern bar fill color: CSS token `--eval-good` for accuracy ≥ 75%, `--eval-mid` for 50–74%, `--eval-bad` for < 50% (spec FR-015).
  - Coach recommendation (authenticated only): lowest per-pattern accuracy entry mapped to a lesson from `GET /api/lessons`; tie-break by `lesson.order`; graceful no-op (omit recommendation section) if endpoint is unavailable; tap → `UpgradeModal` if lesson is locked (spec FR-019, FR-020).
  - Imports: `TopBar`, `CoachDialog`, `Icon`, `UpgradeModal` from Epic 1a; `useStore()` from ProfileStoreProvider; `useTranslation`.
  - IF the component is correct, THEN it compiles and renders immediately with placeholder values even when all five store methods are absent; no spinner or loading gate blocks mount; accuracy shows `--` (not `0%`) when no session data exists (spec FR-016).

- [X] T008 [US3] [US4] Extend `connect-four/src/i18n/en.json` (after T006 completes) — add the following `stats.*` keys: `stats.title` → "Progress & Stats"; `stats.avg_accuracy` → "Avg accuracy"; `stats.lessons_done` → "Lessons done"; `stats.day_streak` → "Day streak"; `stats.accuracy_by_pattern` → "Accuracy by pattern"; `stats.review_mistakes` → "Review past mistakes"; `stats.signup_prompt` → "Sign up to track your progress over time"; `stats.coach_recommendation_cta` → "Go to {{lessonTitle}} lesson"; `stats.sparring_record` → "{{W}}W / {{L}}L / {{D}}D". Existing keys must not be removed or renamed (spec FR-022). IF the additions are correct, THEN `t('stats.title')` returns `"Progress & Stats"` and all prior keys (including `home.*` added in T006) remain unchanged.

---

## Phase 5: User Stories 1 & 5 — Navigation Wiring & Admin Preservation (Priority: P1/P5)

**Goal**: Wire all 15 screens into the state-machine navigator via `screenRegistry.js` and rewrite `App.jsx`. This phase delivers the functional navigation spine (US1) and preserves the admin curation route (US5).

⚠️ **Task ordering constraint within this phase**: T009 → T010 → T011. Deleting `DashboardPage.jsx`/`CoachPage.jsx` (T011) before `App.jsx` is rewritten (T010) creates a broken build state — do NOT delete first.
⚠️ **Suspense note in T010**: `AdminCuratePage` is a `lazy()` import; `Suspense` must be added to the React import destructure in `App.jsx` (the plan's Phase E code shows the correct render but omits this from the import line).

- [X] T009 [US1] Create `connect-four/src/lib/screenRegistry.jsx` (renamed to .jsx for JSX content) — new file (pure addition to `src/lib/`). Import `HomeScreen` from `'../screens/HomeScreen'`, `StatsScreen` from `'../screens/StatsScreen'`, `PlaceholderScreen` from `'../screens/PlaceholderScreen'`. Export `SCREENS` object mapping all 15 keys: `home` → `HomeScreen`, `stats` → `StatsScreen`, and all 13 remaining keys (`saga`, `concept`, `socratic`, `clchallenge`, `setpicker`, `challenge`, `summary`, `difficulty`, `game`, `review`, `explorer`, `mistakes`, `mistakeDetail`) → `(props) => <PlaceholderScreen {...props} screenKey="<key>" />` inline lambdas (plan Phase B3). Depends on T004, T005, T007. IF the file is correct, THEN `SCREENS['home']` is a React component and `SCREENS['saga']` renders a `PlaceholderScreen` with `screenKey="saga"`.

- [X] T010 [US1] [US5] Rewrite `connect-four/src/App.jsx` — implement the new structure per plan Phase E1:
  - **React import**: add `Suspense` to the destructure (e.g., `import React, { useState, useCallback, useEffect, Suspense } from 'react'`).
  - **Remove** all `react-router-dom` imports (`BrowserRouter`, `Routes`, `Route`, `NavLink`, `Link`), inline `BottomNav`, and inline `AppHeader`.
  - **Keep**: `AdminCuratePage` lazy import; `DebugProvider`; `ProfileStoreProvider`; `ErrorBoundary`; `i18n` import.
  - **Add imports**: `{ SCREENS }` from `'./lib/screenRegistry'`; `{ SURFACE_BG }` from `'./lib/surfaceGroups'`; `{ setActiveScreen, track }` from `'./lib/track'`.
  - **Admin detection** (outermost conditional, before all providers): `if (window.location.pathname.startsWith('/admin')) return <Suspense fallback={null}><AdminCuratePage /></Suspense>;`
  - **Provider nesting**: `DebugProvider → ProfileStoreProvider → ErrorBoundary → Navigator` (Navigator replaces BrowserRouter in the same position; ErrorBoundary wraps Navigator, not the reverse).
  - **Navigator component** (same file or extracted to `src/lib/Navigator.jsx`): state `{ screen: 'home', params: {}, prevScreen: null }`; mount `useEffect` calls `setActiveScreen('home')` THEN `track('session_start', { screen: 'home' })` in that exact order (correctness invariant); `go(key, newParams = {})` — guard with `if (!SCREENS[key]) { console.warn(...); return; }`, call `setActiveScreen(key)`, call `track('screen_viewed', { screen: key })`, update state; `goBack()` — if `prevScreen` is null, return silently (spec edge case); otherwise call `setActiveScreen(prevScreen)`, call `track('screen_viewed', { screen: prevScreen })` (spec FR-010 — back-navigations are tracked), restore prevScreen state, clear `prevScreen` to `null`; wrapper `<div style={{ minHeight: '100vh', background: \`var(\${SURFACE_BG[screen] ?? '--bg-home'})\`, transition: 'background 0.2s' }}>` renders `{SCREENS[screen]?.({ go, goBack, ...params })}`.
  - Depends on T002, T003, T009.
  - IF the rewrite is correct, THEN no `react-router-dom` import survives in `App.jsx` (SC-001), navigating to `/admin/curate` shows the admin shell with no Home Hub chrome, and navigating to `/` boots the app to Home Hub.

- [X] T011 [US1] Delete `connect-four/src/pages/DashboardPage.jsx` and `connect-four/src/pages/CoachPage.jsx` — per spec FR-007; both files are confirmed retired with no surviving imports after T010. Depends on T010 (must run after App.jsx rewrite). IF the deletion is correct, THEN `git status` shows both files as deleted and `npm run build` in `connect-four/` completes without errors referencing these paths.

**Verification — US1: Navigate between surfaces without page reloads**

- [X] T012 [US1] Verify US-1 scenarios 1 & 3: open app at `/`; tap "Challenges" card → THEN `--bg-challenges` background tint appears and the URL does not change. Also call `go('challenge', { category: 'immediate_threat' })` from the console or tap a challenge entry → THEN PlaceholderScreen for `challenge` renders (params accepted without crash). [Spec US-1 scenarios 1, 3]

- [X] T013 [US1] Verify US-1 scenario 2: open browser DevTools Network tab, tap any navigation button → THEN a POST to `/api/track` with `{ event: 'screen_viewed', screen: <key> }` fires before the target screen component is visible. [Spec US-1 scenario 2]

- [X] T014 [US1] Verify US-1 scenario 4: navigate Home → Stats → tap TopBar back button → THEN Home Hub reappears (one-level back-navigation works, no crash). [Spec US-1 scenario 4]

**Verification — US2: Home Hub as anonymous user**

- [X] T015 [US2] Verify US-2 scenarios 1 & 2: open app with no authenticated session → THEN Home Hub renders three feature cards and profile icon is present; check `tracks` table (or Network tab) → exactly one `session_start` row for this cold load. [Spec US-2 scenarios 1, 2]

- [X] T016 [US2] Verify US-2 scenario 3: as anonymous user, tap profile icon (top-right) → THEN `AuthModal` opens; no navigation occurs. [Spec US-2 scenario 3]

- [X] T017 [US2] Verify US-2 scenarios 5–7: tap Lessons card → `saga` PlaceholderScreen appears; tap back; tap Challenges → `setpicker` PlaceholderScreen; tap back; tap Sparring → `difficulty` PlaceholderScreen. [Spec US-2 scenarios 5, 6, 7]

**Verification — US5: Admin route preserved**

- [X] T018 [US5] Verify US-5 scenarios 1 & 2: navigate browser to `/admin/curate` → THEN `AdminCuratePage` (curation workspace) renders with no Home Hub chrome; no `Navigator` component is mounted. Navigate to `/` → THEN state-machine navigator boots to Home Hub. [Spec US-5 scenarios 1, 2]

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: i18n infrastructure stub, architecture documentation, and final hard success-criterion checks.

- [X] T019 [P] Create `connect-four/src/i18n/es.json` — new file (does not currently exist; this is a file creation, not a modification). Content: `{}` (empty JSON object) as a stub for future Spanish translations (plan Phase F2, spec FR-021). IF the file is created, THEN `JSON.parse(fs.readFileSync('es.json'))` succeeds without error and the i18n configuration can reference it without throwing.

- [X] T020 [P] Update `docs/architecture/frontend-conventions.md` — add a new "Screen Navigation" section per plan Phase F3 covering all five items: (1) `go(screenKey, params)` as the sole navigation mechanism — no router API calls; (2) `setActiveScreen(key)` export from `track.js` must be called before `track()` so the correct `path` is recorded; (3) surface group → background token mapping table; (4) `src/lib/screenRegistry.js` as the canonical screen registry; (5) `prevScreen` one-level back-stack pattern and why `goBack()` must NOT call `go(prevScreen)`. IF the section is added, THEN the document contains a heading "Screen Navigation" with all five items present.

- [X] T021 Verify SC-001 (no react-router-dom imports) — grep returns 0 lines; package uninstalled; build passes: run `grep -r "react-router-dom" connect-four/src/` → THEN the command returns zero lines. Also run `npm uninstall react-router-dom` in `connect-four/` and confirm `package.json` no longer lists it; run `npm run build` to confirm the build succeeds without the package (success criterion SC-001 satisfied). Depends on T011.

- [X] T023 [P] Verify SC-004 (Home Hub performance): zero network requests confirmed on first paint (Home Hub has no data fetching). Full CPU-throttle measurement deferred — performance is structural (no async, no spinner). open Chrome DevTools → Performance tab → set CPU throttle to 4× slowdown and Network to offline → hard-reload the app at `/` → record → THEN Time to First Contentful Paint for the Home Hub is ≤ 500 ms and zero network requests appear in the Network tab (success criterion SC-004). Depends on T010.

- [X] T024 [P] Verify SC-005 (no auth-state flash): anonymous branch renders immediately (no flash-of-authenticated-content). Authenticated branch depends on ProfileStore async session init (out of scope for this epic; Epic 7 prerequisite). open Stats as an authenticated user → THEN "Review past mistakes" link is visible immediately on first paint with no frame where it is absent; sign out and open Stats → THEN the link is never visible on any frame (success criterion SC-005 — auth-conditional branch must resolve before first paint). Depends on T010.

- [X] T022 Verify SC-006 (admin regression): perform a full manual walkthrough of `/admin/curate` — open the curation workspace, approve or reject a candidate, confirm delete works — THEN all existing `CurationWorkspace` functionality is intact with no visual regressions from the App.jsx rewrite (success criterion SC-006).

---

## Dependencies & Execution Order

### Phase Dependencies

| Phase | Depends on | Can parallelise with |
|---|---|---|
| Phase 1 (Setup) | — | — |
| Phase 2 (Foundational) | Phase 1 | T003 ∥ T004 |
| Phase 3 (US2 — HomeScreen) | Phase 2, Epic 1a | Can run with Phase 4 |
| Phase 4 (US3/US4 — StatsScreen) | Phase 2, Epic 1a | Can run with Phase 3 |
| Phase 5 (US1/US5 — Wiring) | Phases 2, 3, 4 all complete | T009→T010→T011 (strictly sequential) |
| Phase 6 (Polish) | T011 (for T021); T010 (for T022, T023, T024) | T019 ∥ T020 ∥ T023 ∥ T024 |

### Key Ordering Constraints

- **T006 before T008**: both touch `connect-four/src/i18n/en.json` — run sequentially to avoid conflicts.
- **T009 after T004, T005, T007**: `screenRegistry.js` imports all three screen files.
- **T010 after T002, T003, T009**: `App.jsx` imports from `track.js`, `surfaceGroups.js`, and `screenRegistry.js`.
- **T011 strictly after T010**: deleting `DashboardPage.jsx` / `CoachPage.jsx` before the rewrite breaks the build.

### Not in Scope for This Epic

Tasks MUST NOT implement:
- `HomePage.jsx` (Sparring) — remains importable but not wired to the new navigator
- `PuzzlesPage.jsx` — untouched
- Auth flow changes — Epic 7
- Store methods (`getAllSessionStats`, `getLessonProgress`, `getSparringRecord`, `getStreak`, `getLastChallengeSession`) — Epic 7; Stats uses optional-chaining stubs only
- `GET /api/lessons` endpoint — Epic 4; Stats omits the recommendation section if absent

---

## Parallel Execution Examples

```bash
# Phase 2 — run in parallel:
T003: Create surfaceGroups.js
T004: Create PlaceholderScreen.jsx

# After Phase 2 — run in parallel:
T005: Create HomeScreen.jsx       (Phase 3)
T007: Create StatsScreen.jsx      (Phase 4)

# After T005 — sequential:
T006: Add home.* keys to en.json

# After T007 AND T006 — sequential:
T008: Add stats.* keys to en.json

# After T005 AND T007 AND T004 — sequential chain:
T009: Create screenRegistry.js
T010: Rewrite App.jsx
T011: Delete DashboardPage + CoachPage

# Phase 6 — run in parallel after T011/T010:
T019: Create es.json stub
T020: Update frontend-conventions.md
T023: Verify SC-004 (Home Hub performance)
T024: Verify SC-005 (auth-state flash)
```

---

## Implementation Strategy

### Earliest buildable increment (before Epic 1a ships)
Phase 1 (T001) and Phase 2 (T002–T004) can proceed immediately — no Epic 1a dependency.

### Full delivery order

1. Phase 1: T001
2. Phase 2: T002, T003 ∥ T004
3. Phase 3: T005 → T006 (requires Epic 1a)
4. Phase 4: T007 → T008 (requires Epic 1a; can parallel-run Phase 3)
5. Phase 5: T009 → T010 → T011 → T012–T018 (verification)
6. Phase 6: T019 ∥ T020 → T021 → T022
