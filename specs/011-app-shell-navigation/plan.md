# Implementation Plan: App Shell & Navigation Migration

**Branch**: `101-new-design` | **Date**: 2026-05-29 | **Spec**: `specs/011-app-shell-navigation/spec.md`

---

## Summary

Replace `react-router-dom` routing in `App.jsx` with a single state-machine navigator (`screen` + `go(screenKey, params)` + `prevScreen`). Ship two real screens — Home Hub and Stats — backed by Epic 7 store stubs. Modify `track.js` to send the active screen key as `path` instead of `window.location.pathname`. All 15 screen-registry keys are wired; 13 render a placeholder component until later epics.

---

## Technical Context

**Language/Version**: JavaScript (ES2022) + React 18, JSX  
**Primary Dependencies**: React, react-i18next, Vite; `react-router-dom` is being fully removed  
**Storage**: IndexedDB (IndexedDBStore) / Supabase (SupabaseStore), accessed through `useStore()` from ProfileStoreProvider  
**Testing**: Manual verification (UI features per Constitution §III); no new server-side logic, no solver dependency  
**Target Platform**: Mobile-first PWA, Chrome/Safari  
**Performance Goals**: Home Hub renders < 500 ms with zero network requests  
**Constraints**: Five store methods absent until Epic 7 — Stats must compile and render safely without them  
**Scale/Scope**: 2 new screen components, 1 placeholder component, 1 registry file, 1 surface-group map, ~17 i18n keys (7 home.* + 1 coach.* + 9 stats.*)

---

## Constitution Check

**§I — Explanation Engine**: Not applicable. This epic adds no move evaluations or pattern labels.

**§II — Code Quality**:
- ✅ State machine is flat: `{ screen, params, prevScreen }` — no nested state, no external library.
- ✅ Stats async pattern uses optional-chaining fallbacks — no defensive handling for impossible states, only for genuinely-absent store methods.
- ✅ No speculative abstractions (PlaceholderScreen is minimal; surfaceGroups.js is a plain object map).

**§III — Testing Standards**:
- ✅ Manual golden path verification required before marking complete (US-1 navigation flow, US-2 anonymous Home Hub, admin route preservation).
- ✅ Edge cases: `go()` with unknown key, Stats with no store data, anonymous user Stats.
- ⚠️ US-3 and US-4 (Stats with real data) are blocked until Epic 7; acceptance scenarios marked as such in spec.

**§IV — UX Consistency**:
- ✅ Background tint applied consistently via CSS custom property tokens defined in Epic 1a.
- ✅ Coach nudge on Home Hub uses `CoachDialog` component (from Epic 1a).
- ✅ Stats `--` placeholder for no-data accuracy (not `0%`) follows FR-016.

**§V — Performance**:
- ✅ Home Hub: no API calls, no async state — renders synchronously.
- ✅ Analytics are fire-and-forget; `track()` never blocks rendering.
- ✅ Stats renders immediately with placeholders; store calls are non-blocking.

**§VI — Implementation Methodology**:
- ✅ Admin detection mechanism verified against current `App.jsx` — confirmed `window.location.pathname` check is viable and must precede all providers.
- ✅ Store method absence confirmed by grep before designing Stats stub pattern.
- ✅ `setActiveScreen('home')` → `track('session_start', ...)` ordering documented as a correctness invariant in research.md.

**§VII — Design Philosophy**:
- ✅ Flat is better than nested: three state fields, not a history stack.
- ✅ Explicit: `setActiveScreen` call order is explicit in the mount effect, not inferred.
- ✅ Special cases (admin shell) handled at the outermost level, not buried.

**§VIII — Documentation**:
- ✅ `docs/architecture/frontend-conventions.md` must be updated with screen-key navigator pattern and `setActiveScreen` convention (task T010).
- ✅ Navigator API contract documented at `contracts/navigator-api.md`.
- ✅ Data model at `data-model.md`.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-app-shell-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output — all decisions resolved
├── data-model.md        # Phase 1 output — navigation state + Stats fields
├── contracts/
│   └── navigator-api.md # go() + setActiveScreen + screen-key registry (cross-epic contract)
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (affected files)

```text
connect-four/src/
├── App.jsx                            # REWRITE: remove router; add Navigator; admin detection
├── lib/
│   ├── track.js                       # MODIFY: setActiveScreen export + activeScreen variable
│   ├── screenRegistry.js              # NEW: 15-key → component map
│   └── surfaceGroups.js               # NEW: screen key → CSS token map
├── screens/
│   ├── HomeScreen.jsx                 # NEW: Home Hub
│   ├── StatsScreen.jsx                # NEW: Stats (stubs for Epic 7 store methods)
│   └── PlaceholderScreen.jsx          # NEW: renders "{screenKey} — coming soon"
├── pages/
│   ├── DashboardPage.jsx              # DELETE
│   └── CoachPage.jsx                  # DELETE
└── i18n/
    ├── en.json                        # EXTEND: home.* + stats.* namespaces
    └── es.json                        # EXTEND: stub (empty object) if not already present
```

**Note on directory**: `screenRegistry.js` and `surfaceGroups.js` both live under `src/lib/` alongside `track.js`. The `screens/` directory is new — it holds screen-level components distinct from the existing `pages/` directory (which held router-bound pages). The naming distinction is intentional: `screens/` are navigator-driven, `pages/` is a legacy namespace being retired.

---

## Implementation Phases

### Phase A — Analytics foundation (no React dependencies)

**A1: Modify `src/lib/track.js`**

Add module-level state and export before the existing `track` function:
```js
let activeScreen = 'unknown';
export function setActiveScreen(key) { activeScreen = key; }
```
Change the `path` assignment inside `track`:
```js
const path = activeScreen;  // was: window.location.pathname
```
The `track(event, data)` signature is unchanged. All existing call sites continue to work.

**Correctness invariant**: `setActiveScreen('home')` MUST be called before `track('session_start', ...)` fires on app mount. This is enforced by sequential calls in the Navigator mount `useEffect` (see Phase C).

---

### Phase B — Screen registry and surface groups

**B1: Create `src/lib/surfaceGroups.js`**

Plain object export — no React:
```js
export const SURFACE_BG = {
  home: '--bg-home', stats: '--bg-home',
  mistakes: '--bg-home', mistakeDetail: '--bg-home',
  saga: '--bg-lessons', concept: '--bg-lessons',
  socratic: '--bg-lessons', clchallenge: '--bg-lessons',
  setpicker: '--bg-challenges', challenge: '--bg-challenges',
  summary: '--bg-challenges',
  difficulty: '--bg-sparring', game: '--bg-sparring',
  review: '--bg-sparring', explorer: '--bg-sparring',
};
```

**B2: Create `src/screens/PlaceholderScreen.jsx`**

Single component, accepts `screenKey` prop. Renders centered text: `"{screenKey} — coming soon"`. No i18n needed (internal only, never user-facing).

**B3: Create `src/lib/screenRegistry.js`**

Imports `HomeScreen`, `StatsScreen`, `PlaceholderScreen`. Maps all 15 keys. The 13 placeholder entries:
```js
saga: (props) => <PlaceholderScreen {...props} screenKey="saga" />,
// ... 12 more
```

---

### Phase C — Home Hub screen

> **Prerequisite**: Epic 1a must be complete. `TopBar`, `FeatureCard`, `CoachDialog`, and `Icon` do not exist until Epic 1a ships — do not implement this phase before those components are available.

**C1: Create `src/screens/HomeScreen.jsx`**

Dependencies: `TopBar`, `FeatureCard`, `CoachDialog`, `Icon` from Epic 1a; `AuthModal` (existing); `useStore()` from ProfileStoreProvider; `useTranslation`.

Structure (matching `screens_home.jsx` mockup, applying spec overrides):
- `TopBar` left: "DecodeC4" brand title. Right: profile icon.
  - Profile icon tap: `profile.isAuthenticated` → `go('stats')`; else → open `AuthModal`. *(Spec FR-012 — auth-conditional; mockup always goes to stats.)*
- 2×1 card grid: Lessons card (→ `go('saga')`), Challenges card (→ `go('setpicker')`)
- 1 wide card: Sparring (→ `go('difficulty')`)
- `CoachDialog` with static message: i18n key `coach.home.welcome.0`, text "Let's sharpen your Connect Four tactics.", mood `happy`
- Ghost button: `t('home.stats_button')` → `go('stats')`

All visible strings use `t()`. No data fetching.

**i18n keys added (`home.*`)**:
- `home.stats_button` — "Progress & Stats"
- `home.lessons_title` — "Lessons"
- `home.lessons_subtitle` — "Learn why patterns win"
- `home.challenges_title` — "Challenges"
- `home.challenges_subtitle` — "Find the best move"
- `home.sparring_title` — "Sparring"
- `home.sparring_subtitle` — "Play a bot that teaches as you go"
- `coach.home.welcome.0` — "Let's sharpen your Connect Four tactics."

---

### Phase D — Stats screen

> **Prerequisite**: Epic 1a must be complete. `TopBar`, `CoachDialog`, `Icon`, and `UpgradeModal` do not exist until Epic 1a ships — do not implement this phase before those components are available.

**D1: Create `src/screens/StatsScreen.jsx`**

Dependencies: `TopBar`, `CoachDialog`, `Icon` from Epic 1a; `useStore()` from ProfileStoreProvider; `useTranslation`; `UpgradeModal` (from Epic 1a); `AuthModal`.

**Async rendering pattern** (Constitution §V — no spinner):
Each store method call is in its own `useEffect`. Each field is its own `useState` initialized to placeholder. Optional-chaining so Stats compiles and renders safely before Epic 7:
```js
const [accuracy, setAccuracy] = useState('--');
useEffect(() => {
  store?.getLastChallengeSession?.()
    ?.then(s => s?.accuracy != null && setAccuracy(`${Math.round(s.accuracy)}%`))
    .catch(() => {});
}, [store]);
```
Same pattern for all five methods.

**Per-pattern accuracy bar color** (spec FR-015 / US-4 scenario 2): color the bar fill using CSS token `--eval-good` (accuracy ≥ 75%), `--eval-mid` (50–74%), or `--eval-bad` (< 50%) based on the integer accuracy percentage for each pattern.

**Auth-conditional rendering**:
- `isAuthenticated` from `useStore()` / ProfileStore context
- Unauthenticated: show `accuracy` from `getLastChallengeSession`, `lessonsCount` from `getLessonProgress`, `sparringRecord` from `getSparringRecord`; show "Sign up to track your progress over time" prompt; hide "Review past mistakes"
- Authenticated: show all-time accuracy + streak + per-pattern bars + Coach recommendation + "Review past mistakes" link

**Coach recommendation** (authenticated only):
- Source: lowest per-pattern accuracy from `getAllSessionStats()`. Tie-break: earliest `lesson.order` from `GET /api/lessons`.
- Graceful no-op: if `GET /api/lessons` not yet deployed (Epic 4), omit recommendation section entirely.
- If recommended lesson is locked (Pro tier): `UpgradeModal` opens on tap.

**"Review past mistakes"** (authenticated only): `go('mistakes')`.

**i18n keys added (`stats.*`)**:
- `stats.title` — "Progress & Stats"
- `stats.avg_accuracy` — "Avg accuracy"
- `stats.lessons_done` — "Lessons done"
- `stats.day_streak` — "Day streak"
- `stats.accuracy_by_pattern` — "Accuracy by pattern"
- `stats.review_mistakes` — "Review past mistakes"
- `stats.signup_prompt` — "Sign up to track your progress over time"
- `stats.coach_recommendation_cta` — "Go to {{lessonTitle}} lesson"
- `stats.sparring_record` — "{{W}}W / {{L}}L / {{D}}D"

---

### Phase E — App.jsx rewrite

**E1: Rewrite `App.jsx`**

The new structure:

```jsx
// 1. Admin detection — outermost conditional, before all providers
// AdminCuratePage is a lazy() import and needs its own Suspense boundary here
// because no ErrorBoundary or BrowserRouter wrapper exists on this path.
// Alternative: change AdminCuratePage to an eager import (simpler, fine for internal tooling).
if (window.location.pathname.startsWith('/admin')) {
  return <Suspense fallback={null}><AdminCuratePage /></Suspense>;
}

// 2. Provider nesting matches current order, BrowserRouter replaced by Navigator
return (
  <DebugProvider>
    <ProfileStoreProvider>
      <ErrorBoundary>
        <Navigator />
      </ErrorBoundary>
    </ProfileStoreProvider>
  </DebugProvider>
);
```

**Navigator component** (defined in same file or extracted to `src/lib/Navigator.jsx`):

```jsx
function Navigator() {
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});
  const [prevScreen, setPrevScreen] = useState(null);

  // Mount effect: setActiveScreen before session_start (correctness invariant)
  useEffect(() => {
    setActiveScreen('home');
    track('session_start', { screen: 'home' });
  }, []);

  const go = useCallback((key, newParams = {}) => {
    if (!SCREENS[key]) {
      console.warn(`[navigator] unknown screen key: ${key}`);
      return;
    }
    setActiveScreen(key);
    track('screen_viewed', { screen: key });
    setPrevScreen(screen);
    setParams(newParams);
    setScreen(key);
  }, [screen]);

  const goBack = useCallback(() => {
    if (prevScreen) {
      setActiveScreen(prevScreen);
      track('screen_viewed', { screen: prevScreen });
      setScreen(prevScreen);
      setParams({});
      setPrevScreen(null);
    }
  }, [prevScreen]);

  const bgToken = SURFACE_BG[screen] ?? '--bg-home';

  return (
    <div style={{ minHeight: '100vh', background: `var(${bgToken})`, transition: 'background 0.2s' }}>
      {SCREENS[screen]?.({ go, goBack, ...params })}
    </div>
  );
}
```

**Removed from App.jsx**: `BrowserRouter`, `Routes`, `Route`, `NavLink`, `Link` imports; `BottomNav` component; `AppHeader` component; lazy imports for `DashboardPage` and `CoachPage`.

**Kept in App.jsx**: `AdminCuratePage` lazy import; `DebugProvider`; `ProfileStoreProvider`; `ErrorBoundary`; `i18n` import.

**E2: Delete `DashboardPage.jsx` and `CoachPage.jsx`**

Both files are confirmed retired by spec FR-007. The admin shell (`AdminCuratePage`) is preserved.

---

### Phase F — i18n and documentation

**F1: Add `home.*` and `stats.*` keys to `en.json`**

All keys from Phases C and D above. Existing keys must not be removed or renamed (FR-022). `coach.home.welcome.0` may already exist if Epic 1a has run; add only if absent.

**F2: Ensure `es.json` stub exists**

If `es.json` doesn't exist or lacks top-level keys, add an empty object stub `{}`. Spanish content is post-MVP but infrastructure must support it (cross-cutting i18n concern from epics.md).

**F3: Update `docs/architecture/frontend-conventions.md`**

Add a new section "Screen Navigation" covering:
- `go(screenKey, params)` as the sole navigation mechanism; no router API calls
- `setActiveScreen(key)` export from `track.js` — must be called before `track()` to set `path`
- Surface group → background token mapping (cross-epic contract)
- `src/lib/screenRegistry.js` as the canonical screen registry
- `prevScreen` one-level back-stack pattern

---

## Non-Obvious Constraints (reference for task author)

1. **Provider order is load-bearing**: Navigator wraps *inside* ErrorBoundary, not outside. Current nesting `DebugProvider → ProfileStoreProvider → BrowserRouter → ErrorBoundary` becomes `DebugProvider → ProfileStoreProvider → ErrorBoundary → Navigator`. Do not reorder.

2. **Admin detection before all providers**: `window.location.pathname.startsWith('/admin')` check must be the outermost conditional in `App.jsx`. ProfileStoreProvider and DebugProvider must not render on the admin path.

3. **`setActiveScreen` before `track`**: On app mount, `setActiveScreen('home')` and `track('session_start', ...)` must be sequential in that order. They are both synchronous calls in the same `useEffect`.

4. **Stats: no spinner, immediate render**: Stats renders the placeholder values (`'--'`, `0`) synchronously on mount. Store methods resolve asynchronously and update values in-place. There is no loading gate and no spinner.

5. **Five store methods are absent**: `getAllSessionStats`, `getLessonProgress`, `getSparringRecord`, `getStreak`, `getLastChallengeSession` do not exist in either store until Epic 7. Use `store?.method?.()` optional-chaining. Stats screen must compile and render without them.

6. **13 stub screens in one task**: All 13 non-home/stats registry entries resolve to `PlaceholderScreen`. This is one task, not 13.

7. **react-router-dom removal is complete**: No `BrowserRouter`, `Routes`, `Route`, `NavLink`, or `Link` import should survive anywhere outside the admin branch. SC-001 is a hard success criterion.

8. **Mockup divergence — profile icon**: `screens_home.jsx` always navigates to `stats`. Spec FR-012 requires auth-conditional: unauthenticated → `AuthModal`; authenticated → `go('stats')`. Spec governs.

---

## Complexity Tracking

No constitution violations. The state machine is the simplest mechanism that satisfies all requirements.
