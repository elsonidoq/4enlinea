# Phase 0 Research: Onboarding Experience

All "NEEDS CLARIFICATION" items from the spec are resolved below by inspecting the actual
codebase (not by inventing new mechanisms). Every decision reuses an existing seam per the
epic's Settled decisions; none introduces a new storage layer, a new store implementation, or a
new reconciliation service.

## R1 — Where the onboarding flag lives, and how it's written

**Decision**: `onboarding_status` is a field on the existing profile record, one per storage
backend, using each backend's existing `getProfile()` read path plus a **new**
`updateProfile(patch)` write method added to both backends symmetrically:

- `IndexedDBStore.updateProfile(patch)` (`connect-four/src/store/IndexedDBStore.js`) — reads the
  existing `profile` object-store row (keyPath `device_uuid`), merges `patch`, `put()`s it back.
  This is the FR-011 "small profile-write capability" — today `getProfile()` (lines 42–58) is the
  *only* writer, and only on first-time creation. No new object store, no new DB version bump
  (the `profile` store already exists at `DB_VERSION` 1).
- `SupabaseStore.updateProfile(patch)` (`connect-four/src/store/SupabaseStore.js`) — POSTs to the
  **existing** `PUT /api/user/profile` endpoint (`connect-four/server/userRoutes.js:106`), which
  already updates a single field (`papergames_id`) on the caller's own `users` row by the exact
  pattern this feature needs. Extending it (not replacing it) to also accept an optional
  `onboarding_status` is a same-shape, low-risk change — no new endpoint required.

**Rationale**: `PUT /api/user/profile` already exists and already does "validate one field →
`supabase.from('users').update({...}).eq('id', req.user.id)`". This is a closer, cheaper match to
FR-011's "small profile-write capability" than building anything new, and it symmetrically
resolves how a **signed-in** user's onboarding state gets written (relevant for Settings
re-launch/skip on an already-authenticated device — see R6), without a bespoke reconciliation
path (which the epic explicitly rejects).

**Alternatives considered**: A brand-new `/api/user/onboarding` endpoint — rejected, duplicates
`PUT /api/user/profile`'s exact shape for one more field; violates "one obvious way to do it."

**Correction (blocking issue, resolved)**: The above is necessary but not sufficient — `req.user`
in `GET`/`PUT /api/user/profile` (and everywhere else server code reads `req.user.*`) is not
populated by `userRoutes.js` itself. It comes from `loadUser` (`server/index.js`), which selects
`USER_PROFILE_SELECT_COLUMNS` (`connect-four/server/userHelpers.js:13-14`) for the row-found path
and falls back to `defaultUserProfile()` (`userHelpers.js:22-31`) when no `users` row exists yet
(anonymous/just-created accounts). **Both** must gain `onboarding_status` or
`req.user.onboarding_status` is `undefined` regardless of what the DB migration adds — the column
existing on `public.users` is not enough by itself. See R10.

## R10 — `userHelpers.js`: the actual `req.user` population seam (blocking issue, resolved)

**File**: `connect-four/server/userHelpers.js`

**Decision**: Add `onboarding_status` to both:
1. `USER_PROFILE_SELECT_COLUMNS` (line 13-14) — so `loadUser`'s `select(...)` query for an
   existing `users` row includes the new column.
2. `defaultUserProfile()` (lines 22-31) — add `onboarding_status: 'not_encountered'` to the
   anonymous-fallback object, so a user with no `users` row yet (mirrors the DB column's own
   `DEFAULT 'not_encountered'`) still reads a defined, correct value from `req.user` rather than
   `undefined`.

This mirrors exactly how `stripe_customer_id` was added for spec 045 (per the file's own header
comment: "Single source of truth shared with `defaultUserProfile` below so the two paths ... never
drift apart") — same two-edit pattern, same file, same rationale.

**Pinning test**: `connect-four/server/userHelpers.test.mjs:317-340` already pins
`USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()`'s field set for `stripe_customer_id` as a
regression guard (spec 045 R3). This feature MUST extend those same two `it(...)` blocks (not add
a parallel describe block) with an `onboarding_status` assertion — `columns.includes
('onboarding_status')` in the first, `profile.onboarding_status === 'not_encountered'` in the
second — keeping one pinning test per file/behavior rather than duplicating the pattern.

## R2 — FR-012 three-layer migration extension

**Decision**: Extend the existing, currently-fixed-shape migration path in all three required
places:

1. **Client payload** (`IndexedDBStore.migrateToSupabase`, `connect-four/src/store/IndexedDBStore.js:206`):
   read the local profile's `onboarding_status` (via `getProfile()`, already called for other
   reasons at migration time is not required — call it fresh) and add it as one more key in the
   POST body to `/api/user/migrate`, alongside the existing `puzzle_attempts`, `session_stats`,
   `lesson_progress`, `sparring_record`, `streak` keys. The `profile` object store is **not**
   cleared by `migrateToSupabase` today (only the other 5 stores are) — this is unaffected;
   `onboarding_status` continues to exist locally too, redundantly but harmlessly, mirroring how
   `device_uuid`/`tier` already survive migration.
2. **Server handler** (`POST /api/user/migrate`, `connect-four/server/userRoutes.js:445`): read
   `body.onboarding_status`, validate it is one of the three enum values (silently ignore/no-op if
   absent or invalid — do not fail the whole migration over this one optional field), and apply it
   with the same "backfill only if unset" pattern the handler already uses for `device_uuid`
   (`userRoutes.js:456-460`): only write `onboarding_status` if the account's current value is
   `NULL`/`not_encountered` — an account that already has a *different* prior onboarding history
   (e.g., a second device's profile migrating in later) must not clobber an already-recorded
   `seen`/`skipped` state with a fresh device's `not_encountered`. Concretely:
   `UPDATE users SET onboarding_status = $1 WHERE id = $2 AND onboarding_status = 'not_encountered'`
   (conditional update, not a blind overwrite).
3. **DB migration** (`connect-four/server/migrations/057_users_onboarding_status.sql`): add
   `onboarding_status text NOT NULL DEFAULT 'not_encountered' CHECK (onboarding_status IN
   ('not_encountered','seen','skipped'))` to `public.users`. **No new
   grant statements needed** — migration `012_explicit_grants.sql` already grants
   `SELECT, UPDATE` on the whole `users` table to `authenticated`, and `040_service_role_grants.sql`
   already grants full CRUD to `service_role`; both are table-level (not column-level), so a new
   column is covered automatically. Verified against `db-schema.md`'s grant conventions and the
   migration-044 column-level-grant pattern (which is the exception, only used where a table has
   deliberately restricted anon/authenticated access — not the case for `users`).

**Rationale**: This is the one item touching a live migration endpoint and needing its own DB
migration (per the handoff's risk flag) — sequencing it as three ordered, independently testable
steps (payload → handler → column) means each is verifiable in isolation before the next depends
on it.

## R3 — First-run redirect vs. OAuth-hash/session-restore race (FR-014)

**Confirmed seams** (`connect-four/src/App.jsx`, `connect-four/src/store/ProfileStore.jsx`):

- `Navigator`'s mount effect (`App.jsx:24-40`) runs synchronously on mount ( `useEffect(..., [])` ),
  parses the URL, and does NOT wait on session/profile state.
- `ProfileStore.jsx`'s own mount effect (`ProfileStore.jsx:12-14`) calls `checkSession()`
  (`ProfileStore.jsx:16-62`), an async function with two branches: (a) OAuth-hash present →
  `POST /api/auth/callback` → `switchToSupabase` → `setSession(...)`; (b) no hash → cookie-based
  `GET /api/auth/session` → `switchToSupabase` on success, otherwise silently stays anonymous.
  **Today there is no "session check has completed" signal** — `session` staying `null` is
  ambiguous between "still checking" and "confirmed anonymous."
- `Navigator`'s second effect (`App.jsx:99-103`) already depends on `[session]` and only fires
  once `session` transitions truthy (existing `consumeReturnTo()` mechanism, unrelated to
  onboarding but a proof this two-effect pattern already works in this codebase).

**Decision**: Add a **new** boolean, `sessionChecked`, to `ProfileStoreProvider`'s state
(`ProfileStore.jsx`), set to `true` in a `finally` block wrapping the entire body of
`checkSession()` (both branches), and expose it via the store context alongside `session`. Add a
**third** effect in `Navigator` (`App.jsx`), gated on `sessionChecked && !session`:

```js
useEffect(() => {
  if (!sessionChecked || session) return; // wait for confirmed-anonymous, never for a signed-in user
  (async () => {
    const profile = await store.getProfile();
    if (profile.onboarding_status === 'not_encountered' || profile.onboarding_status == null) {
      go('game', { difficulty: 'easy', side: 'first', onboarding: true });
    }
  })();
}, [sessionChecked, session]);
```

**Why this resolves the race**: the redirect decision is deferred until `checkSession()` has
*fully* resolved — including the OAuth-hash branch, if any. A user mid-way through a magic-link
sign-in therefore never sees the onboarding redirect fire: by the time `sessionChecked` flips
true, `session` is already non-null (the hash branch calls `switchToSupabase` → `setSession`
before returning), so the `!session` guard skips onboarding entirely for that mount, and control
passes to the pre-existing `consumeReturnTo()` effect instead. A genuinely first-time anonymous
visitor (no hash, cookie fetch returns 401) reaches `sessionChecked === true, session === null`
and is safely routed into onboarding. This is a two-line, additive change to `ProfileStore.jsx`
(new state + `finally`) plus one new effect in `Navigator` — no change to `urlMapping.js` (stays a
pure URL↔screen table) and no change to `checkSession()`'s existing control flow.

**Alternatives considered**: Polling `window.location.hash` directly in `Navigator`'s effect
instead of adding `sessionChecked` — rejected, because it only handles the hash-present case and
leaves the plain cookie-restore race (returning signed-in user, no hash) unresolved; `session`
alone is ambiguous while `checkSession()` is still in flight. Firing the redirect check
independently of session state and accepting a possible double-redirect — rejected outright, this
is exactly the race FR-014 exists to prevent.

**Correction (blocking issue, resolved) — the cold-boot Home flash**: the above sequencing alone
still lets the *first* render of `Navigator` paint the normal `home` screen (its `useState('home')`
initial value) before the mount effect and the async `checkSession()` call resolve — visibly
violating FR-002/SC-001's "zero intermediate screens" for a first-time visitor, who would see a
flash of Home before being redirected into the sparring game. **Decision**: add a render-gating
boot state. `Navigator` renders a neutral, near-instant "booting" frame (blank background matching
the app shell, no content, no flash of any real screen) whenever `!sessionChecked`, and only
mounts `ScreenComponent` once `sessionChecked` is `true`. Concretely:

```js
if (!sessionChecked) {
  return <div style={{ minHeight: '100vh', background: `var(${SURFACE_BG.home ?? '--bg-home'})` }} />;
}
```

placed before the existing `return (...)` in `Navigator`. This also protects the pre-existing
`consumeReturnTo()` effect (`App.jsx:99-103`) from the same class of race — it already depends on
`[session]` and only fires post-`checkSession()`, but without the render gate a returning
signed-in user could still see a one-frame flash of `home` before `consumeReturnTo()` redirects
them; the boot gate eliminates that flash for both paths (first-run onboarding redirect AND
`consumeReturnTo()`) with one change, since both are downstream of the same `sessionChecked`
signal. `checkSession()` is already fast (a single cookie-based fetch or the OAuth-callback POST),
so this is a brief, unstyled frame, not a spinner or loading screen — no new UI is designed here,
just a gate on when the real screen paints.

## R4 — Sparring game entry point (no "sparring" screen key)

**Confirmed**: `connect-four/src/lib/screenRegistry.jsx` has no `sparring` key. The existing path
is `DifficultyPickerScreen.jsx:25-26` calling `go('game', { difficulty: diff, side })`, landing on
the `game` screen key (`GameScreen.jsx`).

**Decision**: Onboarding routes directly to the existing `game` screen key with
`{ difficulty: 'easy', side: 'first', onboarding: true }`, bypassing `DifficultyPickerScreen`
entirely (per FR-002/FR-003 — no new difficulty tier, no intermediate screen). `GameScreen` gains
a new `onboarding` boolean prop threaded through from `params.onboarding`, gating the
onboarding-only UI additions (skip control, import offer — see R5). `useGameBoard.js` itself is
**unchanged** — it stays a pure, store-agnostic hook; `GameScreen` wraps the hook's exposed
`handleColumnClick` in a thin onboarding-only wrapper rather than threading `onboarding` into the
hook (see R5). This is additive to `GameScreen`'s existing props, not a new screen key, keeping
`SESSION_ONLY_SCREENS`/`urlMapping.js` untouched (the `game` screen is already listed in
`SESSION_ONLY_SCREENS`, so a cold-boot at `/game?onboarding=1` already correctly redirects to
home rather than trying to reconstruct ephemeral game state from a URL — consistent with
existing behavior).

## R5 — Engagement signal (owner decision: aha detection dropped), end-of-game branch, and import offer placement

**Owner decision**: aha/coach-reaction detection is dropped entirely (see spec.md Assumptions).
`useGameBoard.js` stays a pure, store-agnostic board hook — it does **not** import `useStore`,
does **not** call `updateProfile`, and gains no `onAhaReached` callback. The `onboarding_status`
write and all screen-routing/analytics concerns live in `GameScreen.jsx` (which already owns
`onGameEnd`/`saveGame`/`goReplace` — see below), not in the hook.

**Correction (blocking issue, resolved) — file path**: the hook lives at
`connect-four/src/lib/useGameBoard.js`, **not** `src/hooks/useGameBoard.js` as an earlier draft of
this plan stated. There is no `src/hooks/` directory for this file; plan.md's file list must say
`src/lib/useGameBoard.js`.

**Decision — "seen" trigger (FR-005)**: `GameScreen.jsx` tracks whether the onboarding user has
played at least one move via the existing human-move path already exposed by
`useGameBoard.js` (`handleColumnClick`, lines 294-341 — the guarded, human-only path, distinct
from the AI-move path). The simplest reliable seam: `GameScreen` passes a thin wrapper as the
column-click handler when `onboarding === true`, which sets a local `movePlayed` ref to `true` on
first invocation (before delegating to the hook's real handler) and, on that same first
invocation, calls `store.updateProfile({ onboarding_status: 'seen' })` (fire-and-forget, per
Constitution V — this write must never block the move/coach-reaction render the user is
watching). No detection of *what* the coach says is involved — only that a move was played.
(`onboarding_started` fires earlier, at the routing point that puts the user into this screen —
see R7 — not here; the `seen` write and the `onboarding_started` event are two different moments
in the flow.)

**Correction (blocking issue, resolved) — end-of-game branch**: `GameScreen.jsx`'s existing
`onGameEnd` → `saveGame` path (`GameScreen.jsx:76`, `goReplace('review', { id: gameId })`) runs
**unconditionally** today, including the resign/loss path (`useGameBoard.js:371`,
`handleResign()` → `onGameEnd?.('loss', moveHistory)`) and every other outcome branch (win, loss,
draw, abandonment). For an onboarding session this hard-coded `goReplace('review', ...)` must
instead route to the import offer:

```js
// inside saveGame(), after the existing store-write/analytics steps, replacing the
// unconditional goReplace('review', { id: gameId }):
if (onboarding) {
  goReplace('onboardingImportOffer', { id: gameId });
} else {
  goReplace('review', { id: gameId });
}
```

This one branch point covers **every** end-of-game path that already funnels through `saveGame`
(win/loss/draw via the normal flow, resign via `handleResign()`'s existing `onGameEnd?.(...)`
call) — no separate handling is needed for the resign path specifically, since it already calls
into the same `onGameEnd` → `saveGame` seam as every other outcome.

**Decision — import offer placement (FR-007)**: the `onboardingImportOffer` screen (**new**,
added to `screenRegistry.jsx`, not to `urlMapping.js` — reached only via `go()`/`goReplace()`,
never a cold-boot URL, matching the existing `game`/`summary` session-only-screen pattern) is
shown at the branch point above, unconditionally for every onboarding game-end — there is no
`ahaReached` gate to check anymore, since there is no aha state. Separately, per the owner's
"game-end + early-exit fallback" decision: `Home`'s mount effect checks
(`onboarding_status === 'seen'` AND the `localStorage` one-time marker is unset — see
data-model.md) and, if true, routes to `onboardingImportOffer` instead of rendering Home,
setting the `localStorage` marker immediately. This covers the user who played a move, then left
before the game's natural end (closed the tab, navigated away) — the offer is never silently
lost, it just surfaces on next Home arrival instead of at a game-end that never happened.

**Decision — skip control**: rendered whenever `onboarding === true`, visible both during the
sparring game and on the `onboardingImportOffer` screen; tapping it calls
`store.updateProfile({ onboarding_status: 'skipped' })` and routes to `home` directly (bypassing
the Home-fallback check above, since `skipped` is not `seen`).

**Rationale**: Dropping aha detection removes the one genuinely fragile piece of the original
design (inferring "the coach reacted" from a generic-vs-specific phrase pool) in favor of a
single, unambiguous engagement signal (a move was played) that `GameScreen` can observe directly
without any new coupling into `useGameBoard.js`. The offer's placement (game-end, with a Home
fallback for early exits) satisfies FR-007 without needing a finer-grained state machine.

## R6 — Settings re-launch, and why it needs no new persistence work

`SettingsScreen.jsx` gains a "Replay intro" control (any onboarding state) that calls
`go('game', { difficulty: 'easy', side: 'first', onboarding: true })` directly — bypassing the
first-run auto-detect gate in R3 entirely, since this is an explicit user action, not automatic
routing. If the user plays a move (`seen`) or skips again during this manual replay,
`store.updateProfile(...)` (R1) is called exactly as in a first-time session — for a signed-in
user this now resolves through the `PUT /api/user/profile` extension (R1), so the write path is
already symmetric and no additional endpoint or special-casing is needed for the manual-replay
case. FR-001's auto-suppression is unaffected either way, since the stored state was already
non-`not_encountered` before the replay began.

## R7 — Analytics device-uuid attribution (FR-015)

**Confirmed**: `connect-four/src/lib/track.js`'s `track(event, data)` sends `{ event, path, data }`
only — no `uid` field today. `connect-four/server/index.js:996` already does
`const uid = req.user?.device_uuid || req.body.uid || 'unknown';` — the server-side fallback
FR-015 requires already exists and is unused by the client.

**Decision**: Extend `track()` to always include the local profile's `device_uuid` as `uid` in
the POST body, for **all** events project-wide, not just the new onboarding ones. `track()` is a
single shared call site; special-casing it only for onboarding events would require the same
profile lookup at that call site anyway and leaves every other anonymous-user event still
reporting `uid: 'unknown'`, which is the same gap FR-015 is fixing, just left unfixed everywhere
else. This is a small, additive change (`track.js` gains a one-time cached `device_uuid` lookup
via the profile store) with no behavior change for authenticated users (server already prefers
`req.user.device_uuid` over `req.body.uid`).

**Onboarding lifecycle events fired from `GameScreen.jsx` (per R5, no aha-specific step)**:
`onboarding_started` (first move played, or manual Settings replay entry), `onboarding_finished`
(the import offer is shown, whichever path — game-end or Home fallback), `onboarding_skipped`
(FR-009). All three carry `uid` per FR-015.

**Scope flag for implementer**: `track()` currently has no access to the `store` context (it's a
plain module-level function called from anywhere, not a component) — it will need to read
`device_uuid` from `IndexedDBStore` directly (or a cached value set once at app boot), which is
a narrow, justified exception to "components must go through `useStore()`"
(`frontend-conventions.md`) since `track.js` is not a component. Confirm this doesn't regress the
"components MUST NOT reference `IndexedDBStore` directly" rule by keeping the direct read
confined to `track.js` itself (not exported for component use).

## R8 — Easy difficulty tier (FR-003), verbatim

`connect-four/src/lib/aiDifficulty.js`:
```js
export const DIFFICULTY_TEMPERATURES = { easy: 2, medium: 1, hard: 1, perfect: 0 };
export const MISTAKE_RATES = { easy: 1/2, medium: 1/4, hard: 1/8, perfect: 0 };
```
Reused as-is; no new tier, no new config.

## R9 — i18n (FR-016)

All new copy (reward toast, import-offer screen, skip control, coach lines if any onboarding-
specific phrase keys are added) goes through the existing translation-key system referenced
project-wide (`src/i18n/`), matching the pattern used by every other screen. No new i18n
mechanism.
