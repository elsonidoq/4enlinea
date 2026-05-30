# Research: App Shell & Navigation Migration

## Decision: Screen state machine approach

**Decision**: Single `{ screen, params, prevScreen }` `useState` in a `Navigator` component inside `App.jsx`. No router library.

**Rationale**: Spec FR-001 explicitly requires replacing BrowserRouter with a `screen` state variable and `go()` dispatcher. React `useState` is the canonical mechanism per frontend-conventions.md (Constitution §II — no external state libraries). Three values (`screen`, `params`, `prevScreen`) are sufficient for the one-level back-navigation required (FR-002).

**Alternatives considered**: React Context for `go()` propagation — rejected because the navigator is the root component and all screens receive `go` as a prop (matching mockup `app.jsx` pattern). No need for context overhead.

---

## Decision: Admin detection placement

**Decision**: `window.location.pathname.startsWith('/admin')` check is the **outermost conditional in `App.jsx`**, returning `<AdminCuratePage />` directly before any provider renders.

**Rationale**: Spec FR-006 requires the admin shell to bypass the state navigator. The check must precede `ProfileStoreProvider` because admin detection is URL-based, not auth-based. Placing it inside `ErrorBoundary` would cause the error boundary to catch navigator errors that don't occur in the admin shell, but more critically it must be outside providers because ProfileStore performs IndexedDB initialization that is unnecessary and potentially conflicting on the admin path.

**Alternatives considered**: Placing inside ErrorBoundary — rejected because the constraint in the handoff states "the new state-machine navigator wraps inside ErrorBoundary, not outside it." Admin detection is separate from the navigator and must be outside all providers.

---

## Decision: Provider nesting after migration

**Decision**: `DebugProvider → ProfileStoreProvider → ErrorBoundary → Navigator`

**Rationale**: Current nesting is `DebugProvider → ProfileStoreProvider → BrowserRouter → ErrorBoundary`. BrowserRouter is removed; Navigator replaces it in the same position. ErrorBoundary remains between ProfileStoreProvider and Navigator so it can catch errors thrown by the navigator and any screen component, while still having access to the store context above it. Moving Navigator inside ErrorBoundary (not outside it) ensures navigator errors are caught.

---

## Decision: track.js setActiveScreen implementation

**Decision**: Module-level `let activeScreen = 'unknown'` variable. `setActiveScreen(key)` sets it. `track()` reads it as `path` instead of `window.location.pathname`. No other change to `track()` signature or call sites.

**Rationale**: FR-008 requires `setActiveScreen` as an export without changing `track(event, data)` signature. Module-level variable is the simplest mechanism that doesn't require React context or prop threading through the analytics utility. Fire-and-forget POST contract remains unchanged.

**Call order requirement** (correctness invariant): On app mount, `setActiveScreen('home')` MUST be called before `track('session_start', ...)`. This is enforced by sequential calls in the mount `useEffect` of Navigator — not `Promise.then()` ordering.

---

## Decision: Stats async rendering

**Decision**: Each store method is called individually in a `useEffect`. Each field has its own `useState` initialized to `'--'` (strings) or `0` (numeric). Each `.then()` call sets its own state variable independently. No combined loading state, no spinner.

**Rationale**: FR-015b requires "render immediately with `--`/`0` placeholders and replace in-place when each promise resolves." Independent per-field state satisfies this without a shared loading gate. If a store method throws or doesn't exist (stub), the catch sets the field to its placeholder value — no crash.

**Safe fallback pattern**: Each call wrapped as `storeMethod?.().then(setValue).catch(() => {})`. The optional-chaining `?.()` handles the case where Epic 7 hasn't landed the method yet (it returns `undefined`, no call is made, field stays at placeholder).

---

## Decision: 14 stub screens as one PlaceholderScreen

**Decision**: One `PlaceholderScreen` component accepting a `screenKey` prop. Screen registry maps all 13 non-home/stats keys to `(props) => <PlaceholderScreen {...props} screenKey="<key>" />`.

**Rationale**: FR-003 requires all 15 keys in the registry. 13 of them have no implementation yet. A single placeholder avoids 13 nearly-identical files while satisfying the registry contract. Each lambda in the registry captures its key statically — no dynamic lookup needed.

---

## Decision: Surface background tint application

**Decision**: Navigator component wraps its rendered screen in a `<div style={{ minHeight: '100vh', background: `var(${SURFACE_BG[screen]})` }}>`. Transition via CSS `transition: background 0.2s`.

**Rationale**: FR-005 requires background tint to change when switching surface groups. A wrapper div controlled by the Navigator is the correct owner of this style — no screen component should manage its own background. CSS custom property reference allows Epic 1a's token values to flow through without hardcoding colors.

**Token mapping** (cross-epic contract with Epic 1a):
| Screen keys | Token |
|---|---|
| `home`, `stats`, `mistakes`, `mistakeDetail` | `--bg-home` |
| `saga`, `concept`, `socratic`, `clchallenge` | `--bg-lessons` |
| `setpicker`, `challenge`, `summary` | `--bg-challenges` |
| `difficulty`, `game`, `review`, `explorer` | `--bg-sparring` |

---

## Confirmed: Five store methods are absent

Grep of `IndexedDBStore.js` and `SupabaseStore.js` for `getAllSessionStats`, `getLessonProgress`, `getSparringRecord`, `getStreak`, `getLastChallengeSession` returned zero matches. Stats screen will use optional-chaining fallbacks for all five calls until Epic 7 lands them.

---

## Confirmed: No react-router-dom dependency outside App.jsx

The BrowserRouter, Routes, Route, NavLink, Link imports are confined to `App.jsx`. Pages use `useNavigate` (DashboardPage) — but those pages are being deleted. No other page imports react-router-dom navigation hooks.
