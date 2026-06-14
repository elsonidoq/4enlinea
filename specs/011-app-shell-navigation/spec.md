# Feature Specification: App Shell & Navigation Migration

**Feature Branch**: `011-app-shell-navigation`
**Created**: 2026-05-29
**Status**: Draft
**Epic**: Epic 1b — App Shell & Navigation Migration

---

## Context & What Already Exists

This spec targets the replacement of the current routing architecture. Understanding what is already built is essential to avoid rebuilding working pieces.

**Already built and reused as-is:**
- `react-i18next` wired in `src/i18n/index.js`; `en.json` has existing keys — this epic extends it, does not rewrite it
- `ProfileStoreProvider` in `src/store/ProfileStore.jsx` — manages IndexedDB/Supabase store switching on auth state; keep untouched
- `DebugProvider` context — keep untouched
- `ErrorBoundary` — keep untouched
- `track()` in `src/lib/track.js` — exists, fire-and-forget POST to `/api/track`; only the `path` field needs to change from `window.location.pathname` to the active screen key
- `/api/track` server endpoint — already exists, no changes needed
- `AuthModal` — already built; not restyled in this epic (Epic 7 owns that)

**Retired by this epic:**
- `BrowserRouter`, `Routes`, `Route`, `NavLink`, `Link` from `react-router-dom`
- `BottomNav` component (inline in `App.jsx`)
- `AppHeader` component (inline in `App.jsx`)
- `CoachPage.jsx` and its `/coach` route — deleted; the URL ceases to exist (BrowserRouter is gone)
- `DashboardPage.jsx` — deleted; Home Hub screen is its replacement

**Not touched by this epic:**
- `AdminCuratePage.jsx` — kept; admin shell detection logic preserved
- `HomePage.jsx` (Sparring), `PuzzlesPage.jsx` — remain importable; not yet wired to new navigator (later epics do that)
- Auth flow, store extensions (Epic 7)

---

## User Scenarios & Testing

### User Story 1 — Navigate between surfaces without page reloads (Priority: P1)

A user on any screen taps a button that takes them to another screen. The transition is instant (no full-page reload), the background tint changes to match the new surface, and analytics records the navigation.

**Why this priority**: This is the spine of the entire app. Every subsequent epic depends on `go()` working correctly.

**Independent Test**: Launch the app, tap "Challenges" from Home Hub, verify the Challenges background tint appears. Tap "Progress & Stats", verify the home tint returns. All without any URL change or page reload.

**Acceptance Scenarios**:

1. **Given** the app is loaded at `/`, **When** a user taps "Challenges" on the Home Hub, **Then** the Challenges surface renders with `--bg-challenges` background and the URL does not change.
2. **Given** the user is on any screen, **When** `go(screenKey)` is called, **Then** `track('screen_viewed', { screen: screenKey })` fires before the screen component mounts.
3. **Given** the app is loaded, **When** `go('challenge', { category: 'immediate_threat' })` is called, **Then** the params object `{ category: 'immediate_threat' }` is accessible to the challenge screen component.
4. **Given** the user navigates A → B → C, **When** they tap Back on screen C, **Then** they return to screen B (back-navigation pops one level).

---

### User Story 2 — View Home Hub as an anonymous user (Priority: P2)

A first-time visitor who has never signed in opens the app and sees the Home Hub: three feature cards (Lessons, Challenges, Sparring), a Coach nudge, and a "Progress & Stats" button. All cards are tappable and navigate to the correct first screen of each surface.

**Why this priority**: The Home Hub is the first screen every user sees. It must render correctly without any auth state.

**Independent Test**: Open app with no authenticated session. Verify all three feature cards are visible and tappable. Verify `session_start` fires once.

**Acceptance Scenarios**:

1. **Given** no authenticated session exists, **When** the app mounts, **Then** the Home Hub renders with all three feature cards and the profile icon is present.
2. **Given** the Home Hub is visible, **When** it mounts, **Then** `track('session_start', { screen: 'home' })` fires exactly once per app load.
3. **Given** the Home Hub is visible, **When** the user taps the profile icon (top-right), **Then** the `AuthModal` opens.
4. **Given** the Home Hub is visible, **When** the user taps "Progress & Stats", **Then** the Stats screen appears.
5. **Given** the Home Hub is visible, **When** the user taps the Lessons card, **Then** the Saga Map screen (`saga`) appears.
6. **Given** the Home Hub is visible, **When** the user taps the Challenges card, **Then** the Set Picker screen (`setpicker`) appears.
7. **Given** the Home Hub is visible, **When** the user taps the Sparring card, **Then** the Difficulty Picker screen (`difficulty`) appears.

---

### User Story 3 — View Stats as an unauthenticated user (Priority: P3)

An anonymous user taps "Progress & Stats" and sees session-only data: accuracy from their last challenge session (or `--` if none), lessons done count, and sparring record W/L/D. A prompt encourages them to sign up for full history.

**Why this priority**: Stats must render for anonymous users without crashing or gating. This is the empty-state contract for the store layer.

**Independent Test** *(blocked until Epic 7 store methods exist)*: Navigate to Stats with no session data. Verify `--` appears for accuracy (not `0%`). Verify "Sign up" prompt is visible. Verify "Review past mistakes" link is absent.

**Acceptance Scenarios**:

1. **Given** an anonymous user with no challenge session, **When** they open Stats, **Then** accuracy shows `--`, lessons done shows `0`, sparring record shows `0W / 0L / 0D`.
2. **Given** an anonymous user with a recent challenge session, **When** they open Stats, **Then** accuracy shows the session's accuracy percentage from `getLastChallengeSession()`.
3. **Given** an anonymous user, **When** Stats renders, **Then** "Review past mistakes" button is absent.
4. **Given** an anonymous user, **When** Stats renders, **Then** a "Sign up to track your progress over time" prompt is visible.

---

### User Story 4 — View Stats as an authenticated user (Priority: P4)

A signed-in user opens Stats and sees all-time metrics (accuracy, lessons complete, day streak), per-pattern accuracy bars, a Coach recommendation for their weakest area, and a link to Past Mistakes.

**Why this priority**: The full Stats view is the primary engagement loop for retained users but depends on Epic 7's store extensions; its shape must be specced here so Epic 7 knows exactly what to provide.

**Independent Test** *(blocked until Epic 7 store methods and Epic 4's `GET /api/lessons` are available)*: Sign in, navigate to Stats. Verify all-time accuracy and streak appear, per-pattern bars render, Coach recommendation names a specific lesson, and "Review past mistakes" link navigates to `mistakes` screen.

**Acceptance Scenarios**:

1. **Given** an authenticated user with session history, **When** Stats renders, **Then** all-time accuracy (from `getAllSessionStats()`), lessons complete (from `getLessonProgress()`), and day streak (from `getStreak()`) are displayed.
2. **Given** accuracy-by-pattern data exists, **When** Stats renders, **Then** per-pattern accuracy bars appear for each category, color-coded: ≥75% green, 50–74% amber, <50% red.
3. **Given** per-pattern accuracy data exists, **When** Stats renders, **Then** a Coach recommendation names the lesson tied to the lowest per-pattern accuracy (tie-break: earliest lesson order); if that lesson is locked, `UpgradeModal` opens on tap.
4. **Given** an authenticated user, **When** Stats renders, **Then** "Review past mistakes" link navigates to `go('mistakes')`.
5. **Given** an authenticated user with zero activity, **When** Stats renders, **Then** all fields show `0` or `0%`; no paywall gate appears.

---

### User Story 5 — Admin curate route is preserved (Priority: P5)

A developer navigating to `/admin/curate` in the browser continues to see the curation workspace without the new state-machine navigator wrapping it.

**Why this priority**: Curation is an internal tool that must survive the routing migration intact.

**Independent Test**: Navigate browser to `/admin/curate`. Verify `AdminCuratePage` renders with no Home Hub chrome around it.

**Acceptance Scenarios**:

1. **Given** the browser URL is `/admin/curate`, **When** the app boots, **Then** the admin shell renders and the state-machine navigator is bypassed entirely.
2. **Given** the browser URL is any other path (e.g., `/`), **When** the app boots, **Then** the state-machine navigator renders starting on `home`.

---

### Edge Cases

- What happens when `go()` is called with an unrecognised screen key? Stay on current screen and emit `console.warn('[navigator] unknown screen key: <key>')`. Do not throw or crash.
- What happens if `getAllSessionStats()` is unavailable (store error)? Stats renders with `--` for affected fields; does not crash.
- What happens if `go()` is called before the component tree mounts? Queue the navigation and apply it after mount.
- What happens when `goBack()` is called on the home screen (`prevScreen === null`)? Stay on the current screen silently — no warning, no crash.
- **Stats async loading**: Store methods are async. Stats MUST render immediately with `--` / `0` placeholder values and replace them in-place when each promise resolves. No spinner or blocked render.

---

## Clarifications

### Session 2026-05-29

- Q: What does the Stats screen show while async store calls are pending? → A: Render immediately with `--` / `0` placeholders; replace in-place when promises resolve. No spinner.
- Q: What value does `track.js` use as `path` when `session_start` fires before any `go()` call? → A: App initialisation calls `setActiveScreen('home')` before `track('session_start', ...)` fires.
- Q: Should `go()` with an unrecognised screen key fail silently or log a warning? → A: Stay on current screen AND emit `console.warn` with the unrecognised key.

---

## Requirements

### Functional Requirements

**Navigation:**
- **FR-001**: The app MUST replace `BrowserRouter`, `Routes`, `Route`, `NavLink`, and `Link` with a single `screen` state variable and `go(screenKey, params = {})` dispatcher.
- **FR-002**: `go()` MUST replace the current screen immediately with no back-stack for MVP. One exception: back-navigation (via TopBar back button) pops to the previous screen; a simple one-level history (`prevScreen`) is sufficient.
- **FR-003**: The screen registry MUST map all 15 keys to their component: `home`, `stats`, `saga`, `concept`, `socratic`, `clchallenge`, `setpicker`, `challenge`, `summary`, `difficulty`, `game`, `review`, `explorer`, `mistakes`, `mistakeDetail`.
- **FR-004**: `params` passed to `go()` MUST be accessible to the rendered screen component as props.
- **FR-005**: The app MUST apply the surface background tint based on the active screen group using the mapping defined in Epic 1a:

  | Screen keys | Token |
  |---|---|
  | `home`, `stats`, `mistakes`, `mistakeDetail` | `--bg-home` |
  | `saga`, `concept`, `socratic`, `clchallenge` | `--bg-lessons` |
  | `setpicker`, `challenge`, `summary` | `--bg-challenges` |
  | `difficulty`, `game`, `review`, `explorer` | `--bg-sparring` |

- **FR-006**: The admin shell MUST render when `window.location.pathname.startsWith('/admin')` is true at app boot, bypassing the state navigator.
- **FR-007**: `DashboardPage.jsx` and `CoachPage.jsx` MUST be deleted.

**Analytics:**
- **FR-008**: `track.js` MUST be modified to send `screen` (the active screen key) instead of `window.location.pathname` as the `path` field in every call. `track.js` MUST export a `setActiveScreen(key: string): void` function; the navigator MUST call `setActiveScreen(screenKey)` on every `go()` invocation so that `track()` can read the stored value internally as the `path` field. The `track(event, data)` call signature at all existing call sites is unchanged — no callers need updating. App initialisation MUST call `setActiveScreen('home')` before firing `track('session_start', ...)` so the first analytics event carries the correct path.
- **FR-009**: `track('session_start', { screen: 'home' })` MUST fire exactly once on app mount.
- **FR-010**: `track('screen_viewed', { screen: screenKey })` MUST fire on every `go()` call and on every `goBack()` call (back-navigations are tracked as screen views).

**Home Hub:**
- **FR-011**: Home Hub MUST render three feature cards — Lessons (→ `saga`), Challenges (→ `setpicker`), Sparring (→ `difficulty`) — for all users regardless of auth state.
- **FR-012**: Home Hub TopBar MUST show a profile icon: unauthenticated → opens `AuthModal`; authenticated → navigates to `stats`. *(Mockup divergence: `screens_home.jsx` always navigates to `stats` — the auth-conditional branch is per epics design, not the prototype.)*
- **FR-013**: Home Hub MUST display a static Coach nudge with i18n key `coach.home.welcome.0`, English text "Let's sharpen your Connect Four tactics.", mood `happy`. *(Mockup divergence: `screens_home.jsx` shows a personalized, dynamic-seeming phrase; this epic ships a static placeholder. Dynamic daily nudge is post-MVP.)*
- **FR-014**: Home Hub MUST show a "Progress & Stats" ghost button that navigates to `stats`.
- **FR-014b**: Stats TopBar MUST show title `t('stats.title')` and a back button that calls `goBack()`. No right-side icon slot. *(Mockup `screens_home.jsx` shows `onBack={() => go("home")}` — replaced by `goBack()` per the one-level prevScreen pattern.)*

**Stats:**
- **FR-015**: Stats screen MUST display different data depending on auth state, sourced exclusively from the store layer (no direct API calls) *(requires Epic 7 prerequisites — see Assumptions)*:
  - Unauthenticated: `getLastChallengeSession()` → accuracy, `getLessonProgress()` → done count, `getSparringRecord()` → W/L/D.
  - Authenticated: `getAllSessionStats()` → all-time accuracy + per-pattern accuracy; `getLessonProgress()` → done count; `getSparringRecord()` → W/L/D; `getStreak()` → streak count.
- **FR-015b**: Stats MUST render immediately with `--` / `0` placeholders for all async fields and replace each value in-place when its store promise resolves. No spinner or blocked mount.
- **FR-016**: Stats MUST show `--` (not `0%`) for accuracy when no challenge session data exists.
- **FR-017**: Stats MUST NOT show a paywall gate; all fields default to zero when data is absent.
- **FR-018**: "Review past mistakes" link MUST appear only for authenticated users and MUST call `go('mistakes')`.
- **FR-019**: Authenticated Stats MUST show a Coach recommendation naming the lesson with the lowest per-pattern accuracy (tie-break: earliest `lesson.order`); fetches lesson order from `GET /api/lessons` *(requires Epic 4; graceful no-op — omit the recommendation section entirely — if the endpoint is not yet deployed)*.
- **FR-020**: If the recommended lesson is locked (Pro tier), tapping the CTA opens `UpgradeModal`.

**i18n:**
- **FR-021**: All new user-facing strings in this epic MUST use `t('key')` with keys defined in `en.json`. Namespace changes: `nav.*` extended (already exists in `en.json`), `stats.*` new, `home.*` new. `home.*` is hereby added to the cross-cutting key-namespace convention defined in `docs/mvp/epics.md` (see that file for the updated list). `es.json` stub created (empty).
- **FR-022**: Existing i18n keys in `en.json` MUST NOT be removed or renamed.

### Key Entities

- **Screen registry**: maps 15 screen keys → React components; the canonical source of truth for navigation targets.
- **Navigation state**: `{ screen: string, params: object, prevScreen: string | null }` — held in root App component state.
- **Surface group**: a grouping of screen keys that share a background tint token.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: No `react-router-dom` import survives anywhere in the app.
- **SC-002**: Every `go()` call produces a `screen_viewed` analytics event before the target screen mounts — verifiable by inspecting the `tracks` table after navigation.
- **SC-003**: `session_start` fires exactly once per cold app load — verifiable by counting rows in `tracks` for a fresh session.
- **SC-004**: Home Hub renders in under 500 ms with no network requests required (all data is static for this screen). Verified using Chrome DevTools Performance tab with CPU 4× throttle and network set to offline.
- **SC-005**: Stats screen shows the correct auth-state variant with no flash of the wrong state — the auth-conditional branch resolves synchronously from `useStore()` before first paint, so anonymous users never see the "Review past mistakes" link even for a single frame.
- **SC-006**: Navigating to `/admin/curate` continues to show the curation workspace with no regression in existing functionality.
- **SC-007**: All 7 acceptance scenarios from User Story 2 (spec §User Story 2, scenarios 1–7) pass on a fresh anonymous session.

---

## Assumptions

- `ProfileStoreProvider`, `DebugProvider`, and `ErrorBoundary` wrappers remain at the root and are not moved or removed.
- `getLastChallengeSession()`, `getLessonProgress()`, `getSparringRecord()`, `getStreak()`, `getAllSessionStats()` are implemented by Epic 7; this epic wires calls to them but does not implement the store methods. **None of these methods currently exist in `IndexedDBStore.js` or `SupabaseStore.js` — the Stats screen will not be independently testable (US-3, US-4) until Epic 7 ships.**
- `GET /api/lessons` (for lesson order in weakest-lesson recommendation) is implemented by Epic 4; Stats renders the recommendation only when the endpoint is available — graceful no-op if not yet deployed.
- The `UpgradeModal` component is available from Epic 1a before this epic runs.
- The `CoachDialog`, `TopBar`, `Icon`, and `FeatureCard` components from Epic 1a are available.
- Back-navigation is one level only (prevScreen); no full back-stack is needed for MVP.
- The `mistakes` and `mistakeDetail` screens are registered in the screen registry but render as placeholder components until Epic 3c builds them.
