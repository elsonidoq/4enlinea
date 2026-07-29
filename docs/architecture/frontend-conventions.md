# Frontend Conventions

## CSS Token Systems

The codebase has **two separate CSS custom property systems** defined in different files. They MUST be paired with the correct background color.

| File | Surface type | Background tokens | Text tokens |
|---|---|---|---|
| `src/index.css` | Dark surfaces (`.dark-surface` only) | `--surface`, `--surface-2`, `--surface-3` | `--text`, `--text-sub`, `--text-muted` |
| `src/styles/tokens.css` | Light surfaces (`:root` default) | `--card` (#fff) | `--ink`, `--ink-soft`, `--ink-faint` |

**Global default:** `:root` is now `color-scheme: light` with `background: #fbf4e8` and `color: var(--ink)`. All user-facing surfaces inherit these light defaults.

**`.dark-surface`:** Defined in `index.css`, this is the sole home of the 9 dark tokens and `color-scheme: dark`. Any component that must render on a dark surface MUST be a descendant of a `.dark-surface` element. Currently applied to `AdminCuratePage` and `AdminLessonsPage` wrapper divs.

**Pairing rule:** Dark background → dark-theme text. Light background → light-theme text. Never mix across systems.
- `var(--surface)` (dark) + `var(--ink)` (dark) = invisible text
- `#fff` (light) + `var(--text)` (light) = invisible text

**Dark component in light context:** If a dark-surface component is placed in a light context without a `.dark-surface` ancestor, its `--text`/`--surface` tokens will be unresolved (visible failure, not silent). Always wrap dark components in `.dark-surface`.

**Mockup-first rule:** When a mockup exists in `docs/mvp/mockup/`, check the background color in the mockup before choosing tokens. The mockup determines which token system to use.

## CSS Layout Gotchas

**flex-basis percentages require definite heights.** Chrome does not resolve `flex-basis: N%` on children of flex containers whose height is determined algorithmically (e.g. `flex: 1` with no explicit height ancestor). Use a `ResizeObserver` to measure the container in pixels and pass explicit pixel values (`flex: 0 0 ${px}px`) instead of percentages.

**maxWidth percentage requires an explicit width sibling.** `maxWidth: "N%"` on a flex child resolves against `width`, not `maxWidth` — so if `width` is unset, `maxWidth` has no effect. Always pair `maxWidth` with `width: '100%'`.

**`SplitReveal`/`useDragSplit` containers need `minHeight: 0`.** Any flex item that contains `SplitReveal` (or anything backed by `useDragSplit`) **must** set `minHeight: 0` explicitly. Flex items default to `minHeight: auto`, which prevents shrinking below content size; without `minHeight: 0` the board pane expands to its natural (unscrolled) height, `useDragSplit`'s `ResizeObserver` measures that inflated height, computes an oversized `topPx`, and the board fills the entire viewport — the draggable divider is there but scrolled out of sight. Add `minHeight: 0` to the wrapping `flex` div in any bounded-height column (`height: 100vh; overflow: hidden`). Second gotcha: siblings adjacent to the `SplitReveal` wrapper eat into the `100vh` budget and can be clipped by `overflow: hidden` — move any such sibling (glossary, footer) **inside** the scrollable bottom pane, never as a sibling of the flex item holding `SplitReveal`.

**`SplitReveal` board width fits the LIVE pane.** The board's `maxWidth` is `Math.max(computeFrozenBoardWidth(containerH, splitPct), 120)` using the current (live) `splitPct` — so the board shrinks/grows to stay fully visible as the divider is dragged, and the floor keeps the cap strictly positive so it can never be dropped (dropping it falls back to `width:100%` = full-bleed). This replaced the earlier spec-042-US6 "frozen board width" (cap frozen to the open-time split + a `boardW >= 200` gate), which blew the board up to full viewport width and clipped it whenever the container's available height got small (short device, tall coach dialog, or a mobile dvh shift). `computeFrozenBoardWidth` remains a pure function; only its `splitPct` argument changed from frozen to live.

**`#root` is capped at `max-width: 480px`** (`src/index.css`) — the mobile-app shell shared by the game UI. `width: 100%` on a page does nothing; the cap dominates. **Do NOT raise/remove it globally** (the game UI depends on the 480px shell). For a full-width desktop/admin page, override `#root` **locally and reversibly** in a mount/unmount effect, restoring the previous `maxWidth`/`width` on cleanup:
```js
useEffect(() => {
  const root = document.getElementById('root');
  const prev = { maxWidth: root.style.maxWidth, width: root.style.width };
  root.style.maxWidth = 'none'; root.style.width = '100%';
  return () => { root.style.maxWidth = prev.maxWidth; root.style.width = prev.width; };
}, []);
```

**Tappable non-`<button>` elements need tap-highlight suppression.** Any clickable `<div>`/`<span>`/`<a>` must set `WebkitTapHighlightColor: 'transparent'` and `userSelect: 'none'` — otherwise mobile WebKit/Chrome shows a blue/gray tap flash and can trigger a text-selection gesture. Native `<button>` elements are exempt.

**Verify CSS class/token names before use.** Before referencing a CSS class or custom property (`var(--token)`) from a mockup or spec, grep `src/styles/tokens.css`, `src/index.css`, `src/App.css` — many mockup names (`.modal-card`, `.btn-primary`) and spec-worded tokens (`--bg-challenges`, actual is `--bg-chal`) do not exist in the app. If absent, use the correct token or inline styles; never assume verbatim.

## State Management

**MUST**: App-level state lives in `ProfileStore` (React Context, `src/store/ProfileStore.jsx`).
**MUST NOT**: Components reference `IndexedDBStore` or `SupabaseStore` directly — always go through `useStore()`.
**MUST NOT**: Use Redux, Zustand, or any external state library. React Context is the sole mechanism.
Rationale: Constitution §II — the storage-agnostic interface MUST be honored.

## Storage Abstraction

Two store implementations share the same method interface:
- `IndexedDBStore` (`src/store/IndexedDBStore.js`): anonymous users, browser-local.
- `SupabaseStore` (`src/store/SupabaseStore.js`): signed-in users, backend-synced.

`ProfileStore` selects the active store and swaps it transparently on sign-in.
On first sign-in, `IndexedDBStore.migrateToSupabase(supabaseStore, supabaseClient)` bulk-migrates local attempts to Supabase, then clears IndexedDB.

**Required store interface** (both implementations must provide):
| Method | Returns |
|---|---|
| `getProfile()` | `{ device_uuid, tier }` (IndexedDB only — does NOT return `deep_reveal_count` or `deep_reveal_reset_at`; `SupabaseStore.getProfile()` still returns those fields from the `users` table) |
| `saveSessionStats(stats)` | `void` |
| `getSessionStats(date)` | stats object or `null` |
| `recordPuzzleAttempt(attempt)` | `void` |
| `saveLessonProgress(lessonId, status)` | `void` |
| `getLessonProgress()` | `Array<{lessonId, status}>` |
| `saveSparringRecord(result)` | `void` |
| `getSparringRecord()` | `{W, L, D}` |
| `saveChallengeSession(session)` | `void` |
| `getLastChallengeSession()` | session object or `null` |
| `recordActivityDay()` | `void` |
| `getStreak()` | `{streak_count, last_active_date}` |
| `updateProfile(patch)` | `void` (fire-and-forget) |
| `peekProfile()` *(IndexedDBStore only)* | existing profile row or `null` (read-only, non-creating) |

`IndexedDBStore` additionally provides `getAllPuzzleAttempts()` (used only during migration) and `migrateToSupabase(supabaseStore, supabaseClient)`. `SupabaseStore.migrateToSupabase()` exists but throws — it is not part of the shared interface and must never be called on a `SupabaseStore` instance.

**`updateProfile(patch)` (Epic 8 — Onboarding Experience, spec 048, T006/T007)**: the FR-011 "small profile-write capability" — merges `patch` into the single existing profile record. `IndexedDBStore.updateProfile(patch)` reads the existing `profile` object-store row (keyPath `device_uuid`), merges `patch`, `put()`s it back (no new object store, no `DB_VERSION` bump). `SupabaseStore.updateProfile(patch)` `PUT`s `patch` straight through to `/api/user/profile` with `credentials: 'include'`. Both swallow errors client-side — this write must never block or interrupt the user-facing flow that triggered it (Constitution V), matching the existing `track()`/`_fetchPost` fire-and-forget posture. Callers never special-case which backend is active: `await store.updateProfile({ onboarding_status: 'seen' })`. Note `IndexedDBStore.updateProfile` is **create-safe**: if no profile row exists yet (the patch arrives before any `getProfile()` this session), it creates a well-formed row (`{ device_uuid: generateUUID(), tier: 'free', ...patch }`) rather than `put()`ing a `device_uuid: undefined` object, which the `device_uuid` keyPath would reject with `DataError`, silently dropping the write.

**`IndexedDBStore.peekProfile()` (read-only, non-creating)**: unlike `getProfile()` — which *initializes* an anonymous `profile` row on read if none exists — `peekProfile()` returns the existing row or `null` without ever creating one. It exists specifically for `src/lib/track.js`: `track()` reads the local profile's `device_uuid` to populate the analytics `uid` (FR-015), and must not side-effect-create a spurious anonymous profile for, e.g., a signed-in user on a fresh device whose local `profile` store is empty. `SupabaseStore` has no `peekProfile` (track always reads the local IndexedDB profile, never the account row). Consequence: `track()` is now gated on an async IndexedDB read before it fires its POST — it is still fire-and-forget and never throws, but no longer strictly synchronous.

**`recordPuzzleAttempt` canonical shape** — the store spreads its argument directly with no schema validation, so the 6-field snake_case shape is mandatory; any other shape silently writes an incompatible record that breaks Stats/accuracy aggregation:

```js
{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }
```

Do not introduce a new shape without migrating all callers and the store simultaneously. (Since spec 030, the server derives `device_uuid` from the session for `POST /api/user/puzzle-attempts`; the store method signature keeps the field.)

**`recordPuzzleAttempt` must be called on every correct answer** — puzzle advancement filters the pool by `solvedIds` from recorded attempts. A correct-answer branch that skips the call leaves the puzzle in the pool and "Next puzzle" reloads the same puzzle forever. Every correct-answer submit handler (normal column click, forbidden-columns submit, future categories) MUST record the attempt; wrong answers need recording only for blunder tracking, not advancement.

## IndexedDB Schema

Database name: `decodec4`, version 2.
Object stores: `profile` (keyPath: `device_uuid`), `puzzle_attempts` (autoIncrement), `session_stats` (keyPath: `date`), `lesson_progress` (keyPath: `lessonId`), `sparring_record` (keyPath: `id`), `streak` (keyPath: `id`).

## Auth Integration

The frontend has no Supabase SDK dependency. Auth is entirely server-mediated via httpOnly cookies:

1. **Sign-in initiation**: The "Sign in with Google" button navigates the browser to
   `GET /api/auth/oauth/google`, which issues a 302 redirect to Supabase's OAuth authorize endpoint.
2. **Return leg**: After Google consent, Supabase redirects to the app with `#access_token=…`
   in the URL hash. `ProfileStore.checkSession` detects the hash, calls `POST /api/auth/callback`
   with the token, and the server sets httpOnly `sb_access_token` and `sb_refresh_token` cookies.
3. **Session restore**: On page load, `checkSession` calls `GET /api/auth/session` to read the
   cookie and restore signed-in state.
4. **Sign-out**: `POST /api/auth/signout` clears the cookies.
5. **Store swap**: On successful sign-in, `ProfileStore.switchToSupabase` **`await`s
   `migrateToSupabase` before calling `setSession`** — the React `session` state flips only after the
   migration completes. `migrateToSupabase` begins with `await this._db()` (the IndexedDB open), so if
   that open ever hangs, the whole sign-in silently stalls with a valid server cookie but a
   still-signed-out UI (see memory `project_auth_flow_traps`). The migration errors are caught,
   but a *hang* is not — order any local-reset tooling accordingly (never `indexedDB.deleteDatabase`).

### `sessionChecked` + boot-gate render (Epic 8 — Onboarding Experience, spec 048, T016/T017, research.md R3)

`ProfileStore.jsx` exposes a `sessionChecked` boolean via context alongside `session`, set to `true` in a `finally` block wrapping the **entire body** of `checkSession()` (both the OAuth-hash branch and the cookie-restore branch). `session` staying `null` is ambiguous between "still checking" and "confirmed anonymous" — `sessionChecked` disambiguates it. Any consumer that needs to distinguish those two cases (not just `Navigator`) MUST read `sessionChecked` from `useStore()`, not infer it from `session`.

`Navigator` (`App.jsx`) render-gates on `!sessionChecked`: it returns a neutral, near-instant "booting" frame (a blank `minHeight: 100vh` div matching the app shell background, no content) **before** its normal `return (...)` whenever `sessionChecked` is `false`, so `ScreenComponent` never mounts — and no real screen, including the `useState('home')` initial value, ever flashes — before session/OAuth-hash restoration and the first-run onboarding decision (below) have resolved. `checkSession()` is fast (a single cookie fetch or the OAuth-callback POST), so this is a brief unstyled frame, not a spinner.

**First-run auto-route effect**: a third `Navigator` effect, gated on `sessionChecked && !session`, reads `store.getProfile()` and — if `onboarding_status` is `'not_encountered'` or `null`/`undefined` — calls `go('onboardingMission')`. The decision boolean itself is `shouldAutoRouteToOnboarding({ sessionChecked, session, onboardingStatus })`, extracted to `src/lib/onboardingRouting.js` — a **plain `.js` module, not inlined in `App.jsx`** — specifically so it is unit-testable via `node --test` (which cannot parse JSX; same constraint/pattern as `src/lib/postLoginReturn.js`). **Anonymous-only, by design** (settled decision, spec.md Assumptions): the `!session` guard means a signed-in user whose account has never been onboarded is never auto-routed on load — only `!session` (confirmed-anonymous) triggers it; they reach onboarding only via Settings "Replay intro".

**`OnboardingMissionScreen`** (`src/screens/OnboardingMissionScreen.jsx`, screen key `onboardingMission`) is the first screen a first-run anonymous user sees — a coach-voiced "mission" screen (three pillars: learn → practice → understand mistakes) with a single **"Start sparring"** CTA. It is a **session-only screen** (registered only in `screenRegistry.jsx`, given `--bg-home` in `surfaceGroups.js`, **not** in `urlMapping.js` — same pattern as `onboardingImportOffer` below). The CTA calls `go('game', ONBOARDING_GAME_PARAMS)` (`{ difficulty: 'easy', side: 'first', onboarding: true }`, from `onboardingRouting.js`), so the onboarding game still runs on the reused `game` screen key. **Analytics moved here**: `track('onboarding_started', {})` now fires on the mission screen's mount (ref-guarded against React 18 StrictMode double-invoke), **not** in the auto-route effect; the CTA additionally fires `track('onboarding_sparring_started', {})`. `onboarding_status` is untouched by this screen (still flips to `'seen'` on the first *move* in `GameScreen`), so reloading on the mission screen re-shows it. NOTE: the coach greeting is currently **text-only — it is not spoken** (the phrase lives under `onboarding.mission.*`, not the `coach.*` TTS namespace, and the screen does not call `speakCoachMessage`); see `docs/open_issues.md` OI-20.

### `OnboardingImportOfferScreen` + the `onboarding_offer_shown_v1` marker (Epic 8 — Onboarding Experience, spec 048, T032/T033/T036)

`OnboardingImportOfferScreen.jsx` is a **session-only screen**, registered only in `src/lib/screenRegistry.jsx` (key `onboardingImportOffer`) — it is **not** added to `URL_MAP`/`SESSION_ONLY_SCREENS` in `urlMapping.js`, matching the existing `game`/`summary`/`review` pattern of screens reached only via `go()`/`goReplace()`, never from a cold-boot URL (research.md R4).

It has two entry paths, both landing on the same screen component:
1. **Game-end** — `GameScreen.jsx`'s `saveGame()` branches its end-of-game `goReplace(...)` target on the `onboarding` prop via the pure helper `pickGameEndScreen(onboarding)` (`src/lib/onboardingGameEnd.js`): `'onboardingImportOffer'` for an onboarding session, `'review'` otherwise. This single branch point covers every outcome that funnels through `saveGame()` — win/loss/draw via the normal flow, and resign via `handleResign()`'s existing `onGameEnd?.(...)` call into that same seam — no separate resign-path handling exists or is needed.
2. **Home-fallback** — `HomeScreen.jsx`'s mount effect covers a user who engaged (`onboarding_status === 'seen'`) but exited before the game's natural end. It is **read-only**: it only ever reads the marker (`isOfferShownMarkerSet()`) and the profile's `onboarding_status`, feeding both into the pure decision `shouldShowHomeFallbackOffer({ onboardingStatus, offerShown })` (`src/lib/onboardingOfferMarker.js`); if true, it routes to `onboardingImportOffer`. It **never writes** the marker itself.

**The single-write-site invariant**: the one-time `localStorage` marker `onboarding_offer_shown_v1` is written in exactly **one** place in the whole app — `OnboardingImportOfferScreen`'s own mount effect (`setOfferShownMarker()`, guarded by a `useRef` flag so React 18 StrictMode's dev-only double-invoke can't double-fire it), regardless of which of the two paths above reached it. This is what makes the cross-path guard hold: whichever path (game-end or Home-fallback) reaches the offer screen first sets the marker, so the other path's later check always sees it already set and never re-shows the offer. The marker is a plain, device-scoped `localStorage` boolean — **not** part of the profile record, **not** synced to the server, **not** written via `store.updateProfile(...)` (data-model.md "Storage location 1", FR-013 spirit) — because a user can be `'seen'` with the offer not yet shown (engaged, then left early), and adding a fourth persisted value to the three-state `onboarding_status` enum would blur that model. `setOfferShownMarker()`/`isOfferShownMarkerSet()`/`shouldShowHomeFallbackOffer(...)` live in `src/lib/onboardingOfferMarker.js`, extracted as a plain `.js` module (not inlined in either screen) for the same `node --test`-cannot-parse-JSX reason as `onboardingRouting.js`/`postLoginReturn.js`.

The offer screen's own mount effect also fires `track('onboarding_finished', {})` at the same single call site as the marker write (FR-015); `onboarding_import_offer_accepted`/`onboarding_import_offer_declined` fire from the corresponding user-action handlers. Accepting composes with the existing sign-in flow using the same `stashReturnTo('settings')` + `AuthModal` pattern `HomeScreen`'s gated "Past games" card already uses, then lands on the existing `settings` screen (Papergames Import section, spec 038) — this feature does not rebuild that flow.

### Anon free deep reveal — the "one free reveal" client gate

Same extracted-plain-`.js`-gate-module pattern as `onboardingOfferMarker.js`: `src/lib/anonDeepReveal.js` (`canRevealAnon(key)` / `markRevealedAnon(key)`) fronts a device-local `localStorage` boolean `anon_deep_reveal_v1` that records **which** blunder the anonymous user spent their one free deep reveal on (key = `` `${movestring}:${col}` ``), so re-opening that same reveal stays free while any new one gates. Not synced to the server (the server does not track anon reveal usage — see `api-conventions.md` `/api/explain-move-llm`). **Two entry points enforce it with the identical key and MUST stay in sync**: `MistakeDetailScreen`'s "What should I have played?" trigger (`session || canRevealAnon(key)` — else it shows a "Sign in to unlock" button that opens `AuthModal` with `reason={t('auth.deepRevealGate')}`), and `DeepRevealPane`'s fetch effect (proceeds + `markRevealedAnon` on success when anon, else opens `AuthModal`). `ReviewScreen` fetches the anon blunder nav-list by appending `device_uuid` (from `store.getProfile()`) to `/api/coach/queue`, so anon mistake chips navigate to `blunderDetail` exactly like signed-in.

### Skip control + Settings "Replay intro" (Epic 8 — Onboarding Experience, spec 048, T041/T043, FR-009/FR-010)

**Skip** (FR-009): both `GameScreen.jsx` (a Toolbar button, rendered only when `onboarding === true`, alongside Hint/Resign) and `OnboardingImportOfferScreen.jsx` (a third button next to Accept/Decline, rendered unconditionally — every path that reaches that screen is already an onboarding pass) wire their skip control to the same pure factory, `createOnboardingSkipHandler({ updateProfile, track, go })` in `src/lib/onboardingSkip.js` — extracted for the same `node --test`-cannot-parse-JSX reason as the other onboarding lib modules. The returned handler fire-and-forgets `updateProfile({ onboarding_status: 'skipped' })`, fires `track('onboarding_skipped', {})`, and calls `go('home')` synchronously (it does not await the profile write). Because `'skipped'` is never `'seen'`, this is guaranteed by construction to bypass the Home-fallback import-offer check (`shouldShowHomeFallbackOffer`) — no separate bypass logic exists. On `OnboardingImportOfferScreen`, skip differs from the existing `handleDecline` only by *additionally* writing `onboarding_status: 'skipped'` — decline alone leaves `'seen'` standing (correct, since `'seen'` already suppresses nothing extra), while skip is an explicit opt-out.

**Settings "Replay intro"** (FR-010, research.md R6): `SettingsScreen.jsx` renders a "Replay intro" button — in **both** its unauthenticated and authenticated views, visible for any onboarding state — that calls `go('game', ONBOARDING_GAME_PARAMS)` **directly** (the same `{ difficulty: 'easy', side: 'first', onboarding: true }` constant `onboardingRouting.js` exports for the auto-route effect). This deliberately **bypasses** the `Navigator` auto-detect effect (T018/`shouldAutoRouteToOnboarding`) entirely — it is an explicit user action, not the anonymous-only auto-route, so it works regardless of `session`/`onboarding_status`.

**Home → Settings reachability (SC-004)**: `HomeScreen.jsx`'s gear icon (`onRight2`) navigates straight to `go('settings')` unconditionally — it no longer gates anonymous taps behind `AuthModal`. This was changed as part of T043: `SettingsScreen`'s unauthenticated view already rendered gracefully pre-Epic-8, but the gear icon's old `session ? go('settings') : setAuthOpen(true)` handler made Settings (and therefore "Replay intro") **unreachable without signing in first** for anonymous users — which defeats SC-004 ("re-launch from Settings in ≤2 nav actions"), since onboarding's auto-route (and therefore its skip path) is anonymous-only. Home gear → Settings → "Replay intro" is now 2 taps for any user, authenticated or not.

The only frontend environment variable required for auth is `VITE_API_BASE_URL`.
There is no `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or client-side Supabase SDK.

**The return leg always lands on the site root.** The server passes `redirect_to = FRONTEND_URL`
(`server/index.js`), i.e. `/` — never the screen the user started from. Sign-in is a full-page
redirect, so no in-memory callback survives it. Any "return the user to where they were headed"
behavior must therefore stash the destination client-side before the redirect (sessionStorage
survives it: same tab, same origin) and consume it after reload. Do not assume a user who signs
in from screen X is still on screen X afterward — they are on Home.

**There is no route-level auth guard.** Every screen key in `URL_MAP` is reachable while signed
out; `SESSION_ONLY_SCREENS` is a cold-boot-state guard, not an auth guard. Gating a CTA gates the
CTA, not the destination screen — a signed-out user can still reach that screen by bookmark, Back
button, refresh, or a shared link, and will see whatever signed-out state the screen renders.
When gating a feature, check what its screen shows to a signed-out visitor who arrives directly.

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Server base URL (default: `''` = same origin) |

## DEV Board Injector (spec 049 QA tooling)

A developer/QA aid for loading arbitrary board positions that normal play can't reach (e.g. the
puzzle-scoring repro boards). **Every surface is `import.meta.env.DEV`-gated**, so Vite
dead-code-eliminates it from production builds (verified: a prod `vite build` contains none of the
`Dev: load board` / `DEV_QA_FIXTURES` / `devBoard` strings). Same convention as the AuthModal
"🛠 Dev: skip auth" button.

- **Modules:** `src/lib/devFixtures.js` (`DEV_QA_FIXTURES` frozen QA boards + pure
  `buildDevPuzzle({movestring,category,correctCol,highlightMetadata})` → the inline puzzle shape),
  `src/lib/devBoardParam.js` (`parseDevBoardSearch` pure + `readDevBoardParam` DEV-gated wrapper),
  `src/components/DevBoardInjector.jsx` (the collapsed `🛠 Dev: load board ▾` panel — fixture
  dropdown + custom movestring/category form).
- **Challenge:** `ChallengeScreen` renders the panel (DEV-only) and its `loadPuzzles()` has a DEV
  branch that takes a `devPuzzles` prop (set by the panel via `go('challenge', {category, devPuzzles})`)
  **or** a `?devBoard=` URL param, in priority over the normal draw. The panel path re-navigates so
  the `/challenge/:category` **path segment stays the authoritative category** for the accepted-gate;
  there is no `devCategory` query param. `devPuzzles` is in the `loadPuzzles` effect deps so
  re-loading a second board of the same category (no remount, since `go()` to the current screen
  reuses the instance) actually re-runs.
- **Sparring:** `App.jsx`'s mount effect has a DEV-gated exception — `/game?devBoard=…&devSide=…&devDifficulty=…`
  cold-boots a seeded game via `GameScreen`'s existing `initialMoves` prop, bypassing the normal
  session-only→home redirect for `game`.
- **Gotcha:** fixture/deep-link boards go through the solver-backed `/api/evaluate-move`, which 500s
  on a terminal (already-won) position — see memory `project_dev_board_injector`. Boards must be
  solver-verified non-terminal, not hand-copied from predicate unit tests.

## Board Representation (Frontend)

Board is a 2D array `board[row][col]` where row 0 is the bottom row.
Cell values: `'empty'`, `'red'` (player 1), `'yellow'` (player 2).

> **Disc-color naming — kept for historical reasons.** `'red'`/`'yellow'` are
> internal **player-identity tokens, not display colors.** The game originally
> rendered red and yellow discs; the palette migrated to green/gray but the token
> names were retained to avoid a churning, error-prone rename across board logic,
> the movestring parser, the lesson schema, the DB, and the test suite. The Board
> renders **`'red'` → GREEN disc** (`--disc-green`) and **`'yellow'` → GRAY disc**
> (`--disc-gray`). Whenever you describe what the user *sees*, say green/gray;
> `'red'`/`'yellow'` only ever appear as data tokens. A holistic rename is tracked
> as Epic 12 — do not do it piecemeal.
Move strings are 0-indexed (columns `0–6`) throughout — in the DB, on the wire, and in all frontend logic. The +1 conversion to 1-indexed happens only inside `c4solver-wrapper.js` on the server.

## Board Component API

`Board` accepts the following props (defined in `src/components/Board.jsx`; cross-epic contract in `specs/010-design-tokens-component-library/contracts/board-api.md`):

| Prop | Type | Default | Description |
|---|---|---|---|
| `board` | `board[row][col]` 2D array | 6×7 `'empty'` | Cell values: `'red'` → green disc, `'yellow'` → gray disc |
| `onColumnClick` | `(col: number) => void` | — | Tap handler (0-indexed). Not called when `canPlay=false`, column full, or `onColToggle` provided. |
| `canPlay` | boolean | `false` | Global interactivity gate. Defaults to `false`, so a caller that omits it renders a read-only board. |
| `overlays` | `Array<{c, r, type: OverlayType}>` | `[]` | Cell overlays. Replaces retired `highlightedCells` + `highlightMetadata`. |
| `badge` | `{col, type: BadgeType, label}` | — | Single column evaluation badge |
| `lastDrop` | `{c, r}` | — | Triggers `drop` CSS animation on that disc |
| `compact` | boolean | `false` | 9px/6px padding/gap instead of 11px/7px |
| `fullCols` | `Array<number>` | `[]` | Columns treated as full regardless of board state |
| `selectedCols` | `Array<number>` | `[]` | Multi-select mode: columns show red tint + ✕ badge |
| `onColToggle` | `(col: number) => void` | — | When provided, activates multi-select mode; all taps call `onColToggle` instead of `onColumnClick` |
| `interactionMode` | `'single_move' \| 'sequence'` | `'single_move'` | `'sequence'` = Board never self-locks; required for `forced_win` multi-move type |
| `stepLabels` | `{ "row,col": number }` | `{}` | Renders a numbered label centered ON the green/gray disc (teal ring + white digit) WITHOUT recoloring it — unlike the deprecated red/yellow `highlightedCells` shim. Used by `/admin/fv-suff` to number lookahead moves; safe for game surfaces. |
| `windowCounts` | `(number\|null)[6][7] \| null` | `null` | Per-cell live-window counts for lesson overlays; `[row][col]`, row 0 = bottom, `null` where a disc sits. Renders a red tint (`--red`, rgb 232,57,46) + digit on EMPTY cells only; the tint is suppressed where a per-cell `overlays` entry already colours the cell — which is also what keeps it off any cell carrying the adjacent-but-opposite `tr` danger red. Must be memoized by the caller. See `lesson-editor.md` § Window counts. |

### Specing an existing component — preserve its API

When writing a spec that redesigns or replaces a component that already exists in the codebase,
read its current implementation first and preserve its API wherever the change is not strictly
required by the new design:

1. Read the component's current file and note its prop names, data encoding, and handler signatures.
2. In the spec, preserve every prop that doesn't *need* to change for the feature to work.
3. Flag explicitly which props *are* changing and why they are strictly necessary.
4. Mark preserved props in the spec with a note like "**Preserved from existing API — no caller migration required.**"

**Worked example (Board):** an early epic-1a spec invented a new Board API — a column-major
`cols[col]` array with `'g'`/`'d'` cell encoding and an `onColumn` handler — when the real
`Board.jsx` (table above) uses the row-major `board[row][col]` with `'red'`/`'yellow'`/`'empty'`
encoding and `onColumnClick`. Speccing the invented API would have forced every caller
(`PuzzlesPage.jsx`, `HomePage.jsx`, etc.) to migrate as part of a component-library-only epic that
had no product reason to touch them. The disc-encoding strings are just player-1/player-2 semantic
labels (see the naming note above); the visual palette can change (as it did, red/yellow → green/gray)
without touching the data model or prop names at all.

### Which boards are interactive (read this before touching Board interactivity)

The primary click target is a **per-column wrapper `<div>`** — one per column, carrying
`onClick={handleClick}`, which branches to `onColToggle` in multi-select mode and otherwise to
`onColumnClick`. It is *not* the per-cell handler. Anything that adds column-level behavior (keyboard
activation, ARIA roles, focus) belongs on the wrapper, and must route through the same
`handleClick` so the multi-select branch is preserved.

**`onCellClick` is a live per-cell seam, not a CurationWorkspace-only shim** (corrected 2026-07-28 —
this section previously said the latter). It is the *admin cell-annotation* handler: `BoardEditor`
passes it in overlay mode, and in `SlideEditor`'s window-highlight picking mode. It fires with
`(col, row)` and calls `stopPropagation`, so it suppresses the column wrapper's `handleClick`. The
genuinely deprecated prop is `highlightedCells` (see "Deprecated prop" below) — do not conflate the
two. New *game* surfaces should still use column-level clicks; `onCellClick` is for authoring UIs
that need a specific cell rather than a drop.

A board is interactive iff it passes `canPlay={true}`. Every such caller also passes
`onColumnClick`. **`CurationWorkspace` and `BoardEditor`'s disc-placement mode are interactive
boards**, despite being admin surfaces — do not classify them as read-only alongside the review,
lesson, replay, and admin *display* boards. Conversely, `BoardEditor`'s overlay-annotation mode
and every review/replay board are read-only. Verify a call site rather than inferring from the
screen's name.

### OverlayType enum (LOCKED — cross-epic contract)

| Value | Visual | Usage |
|---|---|---|
| `tg` | green translucent ring | current-player threat highlight |
| `td` | gray translucent ring | opponent threat highlight |
| `tr` | red translucent ring | user's last committed column / wrong-move indicator |
| `claim` | amber translucent fill | claimeven cell |
| `win` | pulsing green outline | winning-line flash |

### `zhCells` — capsule/zone highlights on `Board`

Separate from the per-cell `overlays` prop. `Board`'s `zhCells` prop draws translucent **capsules**
(SVG lines with `strokeLinecap="round"`, `strokeWidth = cellW * 0.85`, `opacity="0.4"`, in an
absolutely-positioned `<svg>` at `zIndex: 2` with `pointerEvents: 'none'`). Shape:

```js
zhCells = [{ color: '<css color>', cells: [{c,r}, …], windows: [[{c,r}, …], …] }]
```

Each entry renders independently, so overlapping zones keep their own colour. Two branches inside
the `zhSvg` memo:

- **`windows` present and non-empty** — the *structural* branch. Each window draws exactly one
  capsule from `w[0]` to `w[w.length - 1]`, no dots, **no validation of the cells between**. Callers
  must pass windows already ordered along the line; an unordered array silently yields a capsule of
  the wrong length or angle.
- **otherwise** — `groupCellsByCapsules(cells)` heuristically finds collinear runs (horizontal →
  vertical → diagonal↗ → diagonal↘), leftover cells becoming dots. Used by zone types that carry no
  window structure.

`color` is a raw CSS colour, not a type token, and it is composited **at 0.4 opacity** — pass opaque
values, never an already-translucent `rgba()`.

Consumers split by where the data comes from:

| Consumer | Source |
|---|---|
| `ChallengeScreen`, `MistakeDetailScreen`, `AdminDeepRevealEvalPage` | React state driven by `AnnotatedExplanation` — runtime, LLM-driven |
| `ConceptScreen` | **authored** lesson JSON (`slides[].windowHighlights`) mapped by `windowHighlightsToZhCells` in `src/lib/lessonWindows.js` |

Do not route authored content through `AnnotatedExplanation`. Memoize the array you pass —
`boardPropsAreEqual` falls back to `Object.is` for every non-`board` prop, so a fresh-but-equal array
defeats the memo. Authoring contract and its gates: `lesson-editor.md` §"Window highlights".

### BadgeType enum (LOCKED — cross-epic contract)

| Value | Background | Default glyph |
|---|---|---|
| `good` | `--eval-good` (green) | ✓ |
| `mid` | `--eval-mid` (amber) | ? |
| `bad` | `--eval-bad` (red) | ✕ |

### Z-threat badge visual spec (decided, do not reopen)

Not yet reflected in the `OverlayType`/`BadgeType` enums above — this is a settled UI decision for the z-threat (zugzwang-parity) puzzle category, captured here so it isn't relitigated:

- Vertical capsule/stadium-shaped border **outline** (semicircle top and bottom, straight vertical sides) spans all highlighted cells in the z-threat column. Outline only, not fill — pieces inside the capsule stay visible.
- A count badge floats above the board frame, above that column.
- Explanation text embeds the count, e.g. "Column X has N cells — an odd number forces your opponent's hand."

The detection algorithm (odd/even empty-cell parity) is owned by `docs/knowledge-base/` and is out of scope here.

### Deprecated prop (curation shim — do not use in game surfaces)

`highlightedCells: Array<[row, col, role, step?]>` — retained solely to keep `CurationWorkspace.jsx` functional without migration. Accepts the old tuple format from `Piece.jsx` and renders curation-specific roles (`z_range`, `hint`, `ghost_mirror`, `wrong_move`, `correct_reveal`, `pattern_piece`, `figure7_threat`, etc.).

**Do not use in any game-surface component.** Will be removed when CurationWorkspace is redesigned.

`highlightMetadata` is fully retired — no shim. No caller other than `PuzzlesPage.jsx` used it (the old `SequenceHandler.jsx` no longer exists); all callers are now on `overlays`.

### Per-column a11y attributes (spec 043 US1, `contracts/board-a11y-contract.md`)

No new `Board` prop was added for this. `getColumnA11yProps({ col, canPlay, colFull })` (a pure
function exported from `Board.jsx`) derives ARIA/keyboard attributes for the existing per-column
wrapper `<div>` (`Board.jsx:211-229`) entirely from props that already exist (`canPlay`, `board`,
`fullCols`) — it is not itself a `Board` prop.

| Condition | `role` | `aria-label` | `tabIndex` | `aria-disabled` | Keyboard |
|---|---|---|---|---|---|
| `canPlay === false` (read-only board) | *(absent)* | *(absent)* | *(absent)* | *(absent)* | not focusable |
| `canPlay === true`, column not full | `"button"` | `"column N"` (1-based) | `0` | *(absent)* | Enter/Space → same action as click |
| `canPlay === true`, column full | `"button"` | `"column N"` | `-1` | `true` | not reachable by Tab; Enter/Space no-ops (same guard as click) |

Invariants:

- **I1 (FR-001/FR-002)**: A board renders either exactly 7 column controls (playable) or exactly
  0 (read-only) — never a per-cell control count (42) and never a partial count.
- **I2 (FR-004)**: Keyboard activation (Enter/Space) on a column control MUST call the exact same
  `handleClick` function the mouse `onClick` calls — including its `multiSelectMode` branch
  (`onColToggle` vs `onColumnClick`). No parallel/duplicated branch logic.
- **I3 (FR-007)**: This addendum touches only the column wrapper's ARIA/tabIndex attributes. Disc
  color rendering (`value === 'red'`/`'yellow'` → green/gray, `Board.jsx:303-317`) and all
  `shimRole`/`overlays` highlight logic are untouched.
- **I4 (FR-005)**: A focused column control (`:focus-visible`, `.board-col:focus-visible` in
  `src/index.css`) MUST show a visible outline/ring distinct from the existing hover state
  (`isHovered` background, `Board.jsx:223-224`) — focus and hover are visually distinguishable
  states.

**Verified: the gate is `canPlay`, not `onColumnClick` presence.** A plan-review critique raised
the concern that admin boards with per-cell-only interaction (`canPlay={true}` but no
`onColumnClick`) would incorrectly gain column controls with nothing behind them, and proposed
gating on `onColumnClick` presence instead of `canPlay`. This was checked directly against the
codebase: every call site that passes `canPlay={true}` (`GameScreen.jsx`, `SocraticScreen.jsx`,
`PlayOnlineScreen.jsx`, `ChallengeScreen.jsx`, `CurationWorkspace.jsx:326-327`,
`BoardEditor.jsx:109-111` when `mode==='disc'`) also passes `onColumnClick` in that same call.
There is no site today where `canPlay` is `true` and `onColumnClick` is absent —
`BoardEditor.jsx`'s per-cell overlay mode sets `canPlay={false}`, not `true`. The `canPlay` gate
is therefore kept as-is; do not relitigate this — see `research.md` R1 in
`specs/043-global-ui-ux-polish/` for the full verification trace.

## Shared Board Utility

`src/lib/board.js` is the canonical location for `buildBoard(moves)`. Do not inline this function in individual screens or pages — import it instead:
```js
import { buildBoard } from '../lib/board.js';
```
`buildBoard(moves)` accepts a 0-indexed move string and returns a `board[row][col]` 2D array using `'empty'`/`'red'`/`'yellow'` cell values (matching the Board component's expected format).

`boardSpecToBoard(boardSpec)` — converts a lesson `boardSpec` (Array[7] of `'g'`/`'d'` strings,
bottom→top per column) to the `Board` component's `board` prop format (`board[row][col]` 6×7
array with `'empty'`/`'red'`/`'yellow'` values). `'g'`→`'red'` (renders green disc),
`'d'`→`'yellow'` (renders gray disc). Exported from `src/lib/board.js`. Used by ConceptScreen
and SocraticScreen.

## Shared Board State Hook (`useBoardState`)

`src/lib/useBoardState.js` is the lower-level board-mechanics hook shared by `useGameBoard` (sparring, which layers AI/hints/coach on top) and `PlayOnlineScreen` (live online play, which feeds it moves from a WebSocket). It owns only pure board state — no AI, no side effects.

**Signature:**
```js
const {
  moveHistory,   // number[] — column indices committed so far
  board,         // string[][] 6×7 — 'empty'|'red'|'yellow', row 0 = bottom
  heights,       // number[7] — discs per column
  fullCols,      // number[] — full columns
  lastDrop,      // {c, r} | null — for the drop animation
  gameOver,      // {result:'win'|'loss'|'draw', winnerColor?} | null
  userTurn,      // boolean
  userColor,     // 'red' | 'yellow'
  commitMove,    // (col) => {won, draw, row, color}
  reset,         // (newSide?) => void
} = useBoardState({ initialMoves = '', side });
```

**`commitMove(col)` contract — pure mechanics, no side effects.** It appends the move, rebuilds the board via `buildBoard`, runs `checkWin`, sets `gameOver` on a win/draw, and **returns `{ won, draw, row, color }`**. There is no `onGameEnd` callback — the caller inspects the return value to decide what to do next (e.g. navigate to review, show a coach message). This avoids the interleaved-async double-fire problem that arises when win handling lives inside the hook.

**The `boardApiRef` rule (load-bearing).** Any code that runs inside a long-lived closure — a WebSocket `onmessage` handler, a `setTimeout`/`setInterval`, an animation-frame callback — must **not** close over hook values (`commitMove`, `heights`, `gameOver`, `moveHistory`) or any non-stable callback that depends on them (e.g. a `saveAndReview` with `[go, store]` deps) directly from render scope. Those are recreated each render; a closure created once captures the first render's frozen values (empty board, `gameOver=null`). Instead, mirror the live values into a single ref refreshed every render and read through it:
```js
const boardApiRef = useRef(null);
boardApiRef.current = { commitMove, heights, gameOver, moveHistory, saveAndReview };
// inside ws.onmessage: boardApiRef.current.commitMove(...), boardApiRef.current.saveAndReview(...)
```
Handlers invoked by React's event system (e.g. an `onClick`) are re-created each render and may close over hook values directly — the ref is only required for closures that outlive the render that created them. See `PlayOnlineScreen.jsx` for the canonical usage.

## Challenge Session State Machine

Multi-puzzle challenge sessions (`ChallengeScreen`) follow a three-phase state machine driven by a `phase` string:

| Phase | Description |
|---|---|
| `'loading'` | Fetching puzzles from `GET /api/puzzles/draw`. Board and controls not yet visible. |
| `'pre-move'` | Puzzle displayed, board interactive. CoachDialog shows a prompt. |
| `'post-move'` | Move committed (commit-first: disc placed before server responds). Board locked. Evaluation arrives asynchronously; Tier-1 strip renders once it arrives. |

Transitions: `loading → pre-move` (on draw response), `pre-move → post-move` (on column tap, immediately — no confirmation step), `post-move → pre-move` (on "Next →", advance `currentIdx`) or `post-move → summary` (on "Next →" when all puzzles exhausted).

New challenge-type screens MUST follow this phase machine. Do not add a `'confirm'` phase — the project uses commit-first with no confirmation step (see project memory `project_commit_first_no_confirm.md`).

### Forbidden Columns branch (`category === 'forbidden_columns'`)

When the drawn puzzle has `category === 'forbidden_columns'`, the `'pre-move'` phase uses multi-select mode instead of single-column commit:

- The Board is rendered with `onColToggle` (not `onColumnClick`) and `selectedCols` state.
- The Toolbar shows a "Submit" button (disabled when `selectedCols.length === 0`) in place of the Hint button.
- After submit, `handleForbiddenSubmit()` calls `POST /api/puzzles/:id/check` with the selected columns and transitions to `'post-move'`.
- The "Learn more ▼" Tier-1 strip button is suppressed for this category.

### Forced Win / sequence branch (`puzzle.interaction_mode === 'sequence'`)

When the drawn puzzle has `interaction_mode === 'sequence'`, `ChallengeScreen` handles the multi-move interaction **inline** via `handleSequenceClick` — there is no standalone `SequenceHandler` component. The standard Board, CoachDialog, and Toolbar are still rendered; `ChallengeScreen` wires `onColumnClick` to `handleSequenceClick` instead of `handleColumnClick`.

`handleSequenceClick` (defined in `ChallengeScreen.jsx`) drives a server-side state machine via `POST /api/puzzles/:id/sequence/move`:

- **`outcome === 'continue'`**: The user's move was correct but the sequence is not finished. The function appends both `col` and `data.aiCol` to `seqPosition`, rebuilds the board, and animates both the user's placed disc and the AI's response disc using a staged `setLastDrop` call (user disc first, AI disc after ~300 ms delay).
- **`outcome === 'success'`**: The sequence is complete (double-threat reached). `setLastDrop` is called for the user's final disc. `data.threatCells` is mapped to `win` overlays. The phase transitions to `'post-move'`.
- **`outcome === 'wrong'`**: An incorrect move. A coach message is shown; the board is not updated; the user can retry.

The Tier-1 strip and "Learn more ▼" button are not rendered for sequence puzzles.

**Note:** Any reference in memory docs or older specs to a `SequenceHandler` component is stale. The component was removed; its logic lives entirely in `ChallengeScreen.handleSequenceClick`.

**`threatCells` shape mismatch**: `POST /api/puzzles/:id/sequence/move` returns `threatCells` as `{ c, r }` objects — **not** `{ col, row }` as the `/check` endpoint uses.

**`isSubmitting` is cleared per-branch, never in `finally`**: `handleSequenceClick` deliberately has no `finally` block. `setIsSubmitting(false)` is explicit in each branch — inside the `setTimeout` callback for `continue` (~300 ms, async), after `setPhase('post-move')` for `success`, after the coach message for `wrong`, and in `catch`. Any new branch MUST include its own `setIsSubmitting(false)`; a `finally` would clear it synchronously and break the animated `continue` path.

### Evaluation state shape (polymorphic)

`ChallengeScreen`'s `evaluation` state object differs by category:

- **Standard single-move categories**: `{ quality, badge, summaryLineKey, patternTag?, coachMood? }` — `summaryLineKey` is an i18n key passed to `t()` at render time.
- **forbidden_columns**: `{ quality, badge, summaryLine }` — `summaryLine` is a **pre-rendered string** (the suboptimal case needs `{{found}}/{{total}}` interpolation that can't be deferred); there is no `summaryLineKey` field.

The Tier-1 strip renders `evaluation.summaryLine ?? t(evaluation.summaryLineKey)` — always use this fallback pattern; never assume one field is present. New categories needing interpolation in the summary line should use the pre-rendered `summaryLine` approach.

**Mode extensions must audit bare `category` references**: when a new mode replaces the `category` prop (e.g. lesson mode with `confirmationCategory`), introduce `const effectiveCategory = newMode ? altCategory : category` and grep `ChallengeScreen.jsx` for bare `category` uses — a missed one silently produces raw i18n keys like `coach.undefined.prompt.0` at runtime.

### Deep Reveal bottom-sheet panel

After `'post-move'`, `ChallengeScreen` renders a bottom-sheet panel ("Learn more ▼") for categories that support it (all except `forbidden_columns` and sequence puzzles). Tapping the strip calls `POST /api/explain-move-llm` and displays the LLM explanation inside the sheet.

### `challengeSets.js` i18n-key shape convention

All entries in `connect-four/server/challengeSets.js` use `displayNameKey` and `descriptionKey` fields (i18n key strings, e.g. `'challengeSet.immediate_threat.displayName'`). No literal `displayName`/`description` strings are stored. `SetPickerScreen` resolves display names via `t(set.displayNameKey) ?? set.slug`.

The registry is **server-side only** — there is no `src/lib/challengeSets.js` and none must be created. `SetPickerScreen` reads set data from the `GET /api/puzzles/counts` response, which returns the `challengeSets.js` entries verbatim. To add or modify a set, edit the server file only.

## Category Constants

**MUST**: Frontend category constants are defined in `src/lib/categories.js` and MUST be kept in sync with `server/categories.js` whenever categories are added or renamed. Both files define `CATEGORY_ORDER`, `CATEGORY_NAMES`, and `PAID_CATEGORIES`.
`CATEGORY_CHIPS` (styling) is frontend-only.

## i18n: `en.json` / `es.json` (spec 049)

**MUST**: Route all player-facing copy through `t('...')` keys, and add every new key to **both** `src/i18n/en.json` and `src/i18n/es.json`. `es.json` has full nested key-parity with `en.json`, enforced by `tests/unit/i18nKeyParity.test.js` (fails on any key divergence). `src/i18n/index.js` registers both bundles and reads the initial `lng` via `readStoredLang()` (`src/lib/useLanguage.js`, localStorage key `app_language`); the Settings language `<select>` is wired to `useLanguage().changeLanguage`.

**Spanish MUST be Argentinian / Rioplatense (voseo)** — not neutral or Iberian *tú*-Spanish. The first `es.json` pass shipped in *tú*-Spanish and had to be corrected wholesale. Conversion rules:

- **Affirmative imperatives** lose the diphthong, take final-syllable stress, and drop the esdrújula accent when a clitic attaches: `encuéntrala`→`encontrala`, `juega`→`jugá`, `mira`→`mirá`, `busca`→`buscá`, `elige`→`elegí`, `prueba`→`probá`, `piensa`→`pensá`, `fíjate`→`fijate`, `sigue`→`seguí`.
- **Present indicative**: `tienes`→`tenés`, `puedes`→`podés`, `quieres`→`querés`, `sabes`→`sabés`, `eres`→`sos`.
- **Pronoun**: `tú`→`vos` (`te`, `tu`, `ti` are unchanged — voseo keeps those).
- Leave keys, `{{placeholders}}`, and disc-color terms (`verde`/`gris`) untouched — only string *values* change, so key-parity still passes.
- Preserve the original punctuation/tone; do not add exclamation marks wholesale.

Two Spanish gaps are backlogged and are **not** visible to the parity guard (they are not `es.json` keys): lesson-slide body content has no i18n mechanism (OI-18), and some hardcoded-English JSX strings were never wired to `t()` (OI-19).

## API Calls

**MUST**: All fetch calls use `const API = import.meta.env.VITE_API_BASE_URL || ''` as the base.
**MUST**: Authenticated requests use `credentials: 'include'` so the browser sends the httpOnly `sb_access_token` cookie. The `loadUser` middleware reads the token from the cookie as a fallback (see server-conventions.md). Do NOT send an `Authorization` header — `session.access_token` is `undefined` (the session stores only `{ user }`; the token never leaves the httpOnly cookie).

## Analytics

**MUST**: Track user events via the `track(eventName, data)` helper in `src/lib/track.js`.
**MUST NOT**: Call `fetch('/api/track', ...)` directly from components — use the helper.
`track()` behavior: posts `{ event, path, data }` to `${VITE_API_BASE_URL}/api/track`. When `VITE_API_BASE_URL` is absent it falls back to `''` (same origin) — events are sent, not dropped. All fetch errors are intentionally swallowed (`.catch(() => {})`). No buffering. The frontend never awaits the result.

## Pages Structure

Pages live in `src/pages/`. Router is defined in `src/App.jsx` using `react-router-dom` with lazy imports.

| Route | File | Purpose |
|---|---|---|
| `/` | `DashboardPage.jsx` | Home / stats overview |
| `/sparring` | `HomePage.jsx` | Sparring (lazy-imported as `SparringPage`) |
| `/puzzles` | `PuzzlesPage.jsx` | Puzzle training flow |
| `/coach` | `CoachPage.jsx` | Coach queue + weakness map (paid) |
| `/admin/curate` | `AdminCuratePage.jsx` | Candidate curation (localhost-only) |
| `/admin/audio` | `AdminAudioPage.jsx` | TTS audio approval |
| `/admin/lessons` | `AdminLessonsPage.jsx` | Lesson content editor |
| `/admin/deep-reveal-eval` | `AdminDeepRevealEvalPage.jsx` | Deep reveal eval set browser |
| `/admin/fv-suff` | `AdminFvSuffPage.jsx` | Feature-vector sufficiency browser (board + FV + one LLM answer) |

**MUST**: Add new `/admin/*` routes as `pathname.startsWith('/admin/...')` branches in `App.jsx` **before** the catch-all `/admin` branch (lines 98–108). Each branch lazy-imports its page component.

**Admin pages and `ProfileStoreProvider`**: Admin pages bypass `Navigator` and therefore have no `ProfileStoreProvider` in scope. If an admin page uses `DeepRevealPane` (or any component that calls `useStore()`), wrap the page root in `<ProfileStoreProvider>` explicitly. See `AdminDeepRevealEvalPage.jsx` for the pattern.

**Admin page + DeepRevealPane on dark background**: `DeepRevealPane` uses light-surface CSS tokens. Wrap it in a `background: '#fff'` container scoped to the admin page — do not change DeepRevealPane itself. Pass `noSpeech` prop to suppress TTS audio on admin pages.
Components shared across pages live in `src/components/`.

## RecommendCoach + BadgeRow Pattern

`RecommendCoach` (`src/components/RecommendCoach.jsx`) manages all LLM coach UI state for the sparring page: the "✦ Recommend" and "💡 Why?" pill buttons, the inline coach card, and the flag button.

**State ownership**: `RecommendCoach` owns `mode`, `loading`, `text`, `colRankings`, and `prompt` internally. It does NOT own the badge state — it delegates badge updates upward via `onBadgesChange(colRankings | null)`.

**Props**:
- `moves`: current movestring (for Recommend)
- `lastHumanMovestring`: movestring before human's last move; `null` if no human move yet (disables Why)
- `lastHumanCol`: column human last played; `null` if no human move yet
- `gameOver`: boolean — disables Recommend when true
- `onBadgesChange(colRankings | null)`: callback so the parent can render `BadgeRow`

`BadgeRow` (`src/components/BadgeRow.jsx`) renders star badges above board columns. It is a stateless presentational component.

**Props**: `colRankings: Array<{col: number, tier: string}> | null`

**Placement**: `BadgeRow` renders immediately above `<Board>` inside the same `padding: '0 16px'` wrapper, using `display: flex, justifyContent: center, padding: '0 8px 3px'` so its cells align with Board's columns. Each cell is `48px` wide (= `CELL_SIZE(40) + 2 * COL_PAD_H(4)` from `Column.jsx`).

**Column display convention**: Column rank pills show `Col X` where X is 1-indexed (`col + 1`). No solver scores are surfaced (constitution Principle IV).

**Reset rule**: The parent (`HomePage`) must call `setRecommendBadges(null)` on every move commit, undo, and game reset. `RecommendCoach` calls `onBadgesChange(null)` at the start of each fetch, before the response arrives.

## Audio Preferences (`useAudio`)

**MUST**: All audio preference state lives in `src/lib/useAudio.js`. This is the single source of truth — components MUST NOT read or write audio-related `localStorage` keys directly.

Three preferences are managed via `localStorage` with these defaults:

| Key | Default | Description |
|---|---|---|
| `audio_sfx_enabled` | `true` | Sound effects (disc drop, win, wrong move) |
| `audio_music_enabled` | `true` | Background music loop |
| `audio_speech_enabled` | `false` | TTS coach speech |

**Hook API**:
```js
const {
  sfxEnabled,      // boolean
  musicEnabled,    // boolean
  speechEnabled,   // boolean
  toggleSfx,       // () => void
  toggleMusic,     // () => void
  toggleSpeech,    // () => void
  playSfx,         // (name: string) => void
  playMusic,       // () => void
  pauseMusic,      // () => void
} = useAudio();
```

- `playSfx(name)` plays an MP3 from `/audio/sfx/{name}.mp3`. No-ops when `sfxEnabled` is `false`. Names include `disc_fall`, `disc_land_disc`, `disc_land_bottom`, `win`, `correct_move`, `wrong_move`.
- `playMusic()` starts the background music loop from `/audio/sfx/bg_music.mp3`. No-ops when `musicEnabled` is `false`.
- `pauseMusic()` pauses the background music.

## Coach Audio Manifest (`useCoachSpeech`)

**MUST**: Coach speech audio availability is determined by a manifest file at `/audio/coach/coach-audio-manifest.json`. The manifest is fetched once at mount by `useCoachSpeech` — do not blind-fetch individual audio files (causing 404s).

**Manifest format**: `["key1", "key2", ...]` — an array of approved coach phrase key strings. Empty `[]` when no keys have been approved.

**Manifest lifecycle**: The manifest is regenerated by the admin audio page (`/admin/audio`) on every approve action. The approve handler reads `tts-registry.json`, filters for `status: 'approved'` keys, and writes the slug array to `public/audio/coach/coach-audio-manifest.json`.

### Module-level speech queue

A single queue (`Array<string | HTMLAudioElement>`) serializes all speech playback across the app. Items are either slug strings (pre-recorded coach MP3s, constructed as `/audio/coach/<slug>.mp3`) or pre-built `HTMLAudioElement` instances (dynamic TTS like deep-reveal). Only one `currentSpeechAudio` plays at a time; the rest wait.

### Hook API

```js
const { speakCoachMessage, speechEnabled } = useCoachSpeech();
```

- `speakCoachMessage(key)` — plays the TTS audio for `key` if it exists in the manifest. Falls back silently when the key is not in the manifest (no 404). Pushes a slug string onto the queue.
- `speechEnabled` — boolean from `useAudio()`, exposed for callers to gate TTS fetches.

### Module-level exports (for dynamic TTS)

```js
import { speakDeepReveal, stopSpeech } from '../lib/useCoachSpeech.js';
```

- **`speakDeepReveal(audio: HTMLAudioElement)`** — pushes a pre-built Audio element (with `src` already set and `canplay` already fired) into the unified speech queue. Does NOT check the manifest — dynamic TTS bypasses pre-approval. Used by `DeepRevealPane.jsx` for on-demand TTS playback.
- **`stopSpeech()`** — pauses `currentSpeechAudio`, clears `src` (releases resources, prevents stale `ended`/`error` events), nulls `currentSpeechAudio`, and empties the queue. Call this when the user dismisses the panel that triggered the speech (e.g., deep-reveal close, navigation away).

## Lesson Audio Narration (spec 046 US3)

Lesson **concept slides** (never Socratic slides — see below) can carry pre-generated per-message
narration via an additive nullable `audio` field on each `coachMessages[]` entry:

```
Lesson.slides[].coachMessages[] = { text: string, audio?: string | null, ... }
```

`audio` is a static path under `public/audio/lessons/` (e.g. `/audio/lessons/<hash>.mp3`), written by
the admin "Generate audios" flow (see api-conventions.md `POST /api/admin/lessons/:id/generate-audio`).
`null`/absent means no narration has been generated yet for that message — playback simply skips it.

**`getNarrationQueue(coachMessages, speechEnabled)`** (`src/lib/lessonNarration.js`) — pure helper.
Returns `[]` if `speechEnabled` is false or `coachMessages` isn't an array; otherwise returns the
ordered list of non-empty `audio` paths (messages with no `audio` are silently skipped, not treated as
an error).

**`speakLessonAudio(path)`** (`src/lib/useCoachSpeech.js`) — thin wrapper: `speakDeepReveal(new
Audio(path))`. Reuses the same shared module-level speech queue as deep-reveal TTS (see "Coach Audio
Manifest" below) — it does NOT go through `speakCoachMessage(key)`/the manifest, since lesson audio is
identified by a stored path, not an i18n key.

`ConceptScreen.jsx` drives narration in an effect keyed `[lesson, slideIndex, speechEnabled]`, calling
`stopSpeech()` on cleanup (slide change, unmount, or narration/speech toggle) so playback never bleeds
across slides. **`SocraticScreen.jsx` is intentionally NOT wired to this** — Socratic-phase messages
(`ask`/`wrong1`/`wrong2`/`correct`/`hint`) are i18n-key-driven per spec 018/039 and stay on the
`speakCoachMessage(key)` path; no lesson JSON has `coachMessages[]` on a Socratic slide.

`CoachDialog.jsx` gained an optional `onReplay` prop rendering a replay button, for re-triggering the
current message's narration on demand.

## Admin Localhost Guard (FR-028)

All `/admin/*` frontend routes are localhost-only, enforced by a single guard in `App.jsx` **outside**
any `lazy()` import (so the block renders even if the lazy admin bundle would fail to load):

```js
if (window.location.pathname.startsWith('/admin')) {
  if (!isLocalhostOrigin()) return <AdminBlockedPage />;
  // ...per-sub-route lazy-imported branches follow
}
```

- **`isLocalhostOrigin(hostname = window.location.hostname)`** (`src/lib/isLocalhostOrigin.js`) — pure
  function; `true` iff hostname is `localhost`, `127.0.0.1`, or `::1`. Mirrors the server-side
  `requireLocalhost` middleware (api-conventions.md) so the frontend and backend gates agree.
- **`AdminBlockedPage.jsx`** (`src/pages/AdminBlockedPage.jsx`) — minimal, dependency-free component
  (no data fetch, no further lazy import) rendered for any `/admin/*` path reached from a non-localhost
  origin.

This is a frontend-only convenience gate (a non-localhost visitor never even requests the admin bundle);
the server-side `requireLocalhost` on every `/api/admin/*` route (server-conventions.md /
api-conventions.md) is the actual security boundary and must not be treated as redundant with this one.

## Saga Lock Reasons (`sagaLock.js`, spec 046 US1/US2)

`src/screens/sagaLock.js` is a plain `.js` module (not `.jsx`, so `node --test` can import it directly)
holding `SagaScreen`'s lock-derivation logic:

- **`deriveLockReason(lesson, lessons, progress, tier)` → `'none' | 'tier' | 'order' | 'both'`** —
  computes WHY a lesson is locked. `tierLocked` is the pre-existing spec-018 FR-003 rule
  (`lesson.free === false && tier !== 'paid'`). `orderLocked` is new: true when the lesson's
  predecessor (next-lower `order` in the full sorted lesson list; `null`/never-locked for the
  lowest-order lesson) has no `'complete'` entry in `progress` (from `getLessonProgress()`). The order
  gate is layered **on top of**, not a replacement for, the tier gate — deliberately overriding spec
  018 FR-003 rule 4's tier-only lock semantics.
- **`dispatchLockAction(reason)` → `'upgrade' | 'orderLock' | 'navigate'`** — `'tier'`/`'both'` →
  `'upgrade'` (tier always wins when both apply); `'order'` → `'orderLock'`; `'none'` → `'navigate'`.

`SagaScreen.jsx`'s `deriveNodeState` returns `'locked'` whenever `deriveLockReason(...) !== 'none'`.
`handleNodeTap` short-circuits already-`done` lessons, then dispatches on `dispatchLockAction`'s result:
`'upgrade'` opens `UpgradeModal` (via `useUpgradeCheckout`, Epic 5); `'orderLock'` shows a new
auto-dismiss inline banner (i18n key `saga.orderLock.message`) — never the `UpgradeModal`, since an
order-lock is not a paywall; `'navigate'` proceeds normally.

## Upgrade / Checkout flow (Epic 5)

**Reading the user's tier — profile, never session.** The `session` object exposed by `useStore()` is the **Supabase auth session** and has **no `tier` field**. Tier lives on the user profile and is read asynchronously:

```js
store.getProfile().then(p => setTier(p.tier))   // canonical precedent: PostSetSummaryScreen.jsx
```

Any screen or spec that gates on Pro/free (`locked` nodes, `UpgradeModal`, deep-reveal gates) MUST use this pattern. `session?.tier` is always `undefined`, so gating on it fails **silently and in the permissive direction** — every user reads as free tier.

**"Tier" has three unrelated meanings in this codebase — don't conflate them:**
1. **Subscription tier** (this section) — `free | paid`, read via `store.getProfile().tier`.
2. **Position tier** — `getPositionTier(scores, board)` in `server/llmCoachHelpers.js`, returns `'WINNING' | 'DRAWING' | 'LOSING'` from solver scores (best legal score `> 0` / `=== 0` / `< 0`).
3. **Pattern tier** — `TIER1_TAGS`/`TIER2_TAGS` in `server/explainContext.js`, a server-side grouping of `classifyPattern` tags used to build the deep-reveal `allowedSet` (Tier-1 = detectors with concrete `cells[]`; Tier-2 = `z_threat`; Tier-3 = position-global tags, not added to `allowedSet`). **Exception:** the three parity-aware threat detectors (`major_threat_parity`, `major_threat_nonparity`, `minor_threat`, added 2026-06-25) also emit concrete `cells[]` like a Tier-1 detector, but are deliberately **NOT** in `TIER1_TAGS` — "emits `cells[]`" is necessary but not sufficient for Tier-1 membership. They instead belong to a second, separate registry: `server/sparseLookahead.js`'s `THREAT_TAGS` (the three parity tags) and `LOOKAHEAD_TAGS` (`= [...TIER1_TAGS, ...THREAT_TAGS]`), which gates sparse-lookahead rendering, not the deep-reveal `allowedSet`. Don't assume a cell-emitting tag is in `TIER1_TAGS` — check which registry the call site actually reads.

`UpgradeModal.jsx` is opened by five paywall entry points (SetPickerScreen, SagaScreen, PostSetSummaryScreen, DeepRevealPane, SettingsScreen) — all reactive; there is no persistent/always-visible upgrade CTA. Shared pieces:

- **`useUpgradeCheckout(returnPathOverride?)`** (`src/lib/useUpgradeCheckout.js`) — returns the `onUpgrade(plan)` handler: POSTs `/api/paddle/create-checkout` with `{ plan, returnPath }`, then opens the Paddle.js overlay client-side (`Paddle.Checkout.open(...)`) with the server-returned `{ priceId, customerEmail, successUrl }` passed through verbatim — no full-page navigation, the overlay stays on top of the current screen. `returnPath` defaults to `window.location.pathname` so `successUrl` still points back to the originating screen (used if the flow ever needs to cold-boot). **SESSION_ONLY note**: a screen in `SESSION_ONLY_SCREENS` (`summary`, `game`) still can't be cold-booted (its ephemeral prop state, e.g. `PostSetSummaryScreen`'s `results`, wouldn't survive a reload) even though the overlay itself never navigates away — such call sites MUST still pass a cold-bootable `returnPathOverride`; `PostSetSummaryScreen` passes `'/setpicker'`. Any new paywall entry point on a session-only screen must do the same. **Environment** (`sandbox`/`production`) is derived from `token.startsWith('test_')`, not `import.meta.env.MODE` — see server-conventions.md's PaymentProcessor section for why `MODE` can't be trusted for this (a plain `vite build` always resolves to `'production'` regardless of deploy target).
- **`usePaddlePrices()` + `formatPrice(info, locale)`** (`src/lib/usePaddlePrices.js`) — fetches `GET /api/paddle/config` once and returns `{ monthly, annual }` live price info (or `null`); `UpgradeModal` renders the formatted amount under each plan toggle. On any failure (503 unconfigured, network) it degrades silently to plain plan labels — the toggle and checkout still work.
- **`UpgradeModal` uiState is a controlled prop, driven by each call site** (`uiState`/`onUiStateChange`, both required in practice as of 2026-07-18 — previously present but with "no existing call site," per the component's own then-comment, so a real payment left the modal stuck on `'loading'` forever). Every one of the 5 call sites now subscribes to `checkoutReturnFlow.js`'s shared store and: on `'activated'`, updates its own tier-dependent local state (e.g. `setTier('paid')`) and sets `uiState` to `'success'`; on `'failed'`, sets `uiState` to `'timeout'` (the existing retry-button state). **The modal itself, not the call site, owns auto-dismissal**: a `useEffect` inside `UpgradeModal` watches for `uiState === 'success'` and after `AUTO_DISMISS_DELAY_MS` (1500ms) calls its internal `dismiss()`, which plays the `slideDown`/`fadeOut` exit animation (mirroring the entrance `slideUp`/`fade`, both in `styles/tokens.css`) for `EXIT_ANIMATION_MS` (300ms) before finally calling the passed `onDismiss`. This centralization is load-bearing for the animation to play at all: a call site directly setting its own `upgradeOpen` state to `false` (the old pattern) unmounts the component synchronously, giving React no chance to run any exit transition — do not reintroduce a call-site-owned dismiss timer for the success path. Manual dismissal (backdrop click, "Not now") also routes through the same internal `dismiss()`, so it gets the same exit animation.
- **`CheckoutReturnBanner.jsx`** (mounted once at app root) is a pure renderer of `checkoutReturnFlow.js`'s `idle|confirming|activated|failed` store — it owns no network/confirmation logic itself, and is a second, independent subscriber alongside the 5 `UpgradeModal` call sites above (the store supports multiple listeners; nothing about the modal's subscriptions replaces or conflicts with the banner). `useUpgradeCheckout.js`'s Paddle.js `eventCallback` is the sole listener for `checkout.completed`; on that event it is the **sole caller** of `POST /api/paddle/verify-transaction` (the synchronous activation fallback for a delayed/undelivered webhook) and writes the resulting state into the shared store. See server-conventions.md "Activation: webhook primary + verify-transaction fallback".
- **`checkoutReturnFlow.js`'s `subscribeCheckoutReturn` replays the current state immediately at subscribe time** (fixed 2026-07-18, OI-59) — it does not only notify of future transitions. `useUpgradeCheckout.js`'s `checkout.completed` handler is a module-level singleton independent of which screen is mounted; without the replay, a screen whose subscription effect wasn't active at the exact instant `'activated'` broadcast would silently miss it forever (the store's internal `state` still held `'activated'` correctly — nothing read it again), leaving `UpgradeModal` stuck on its pristine `'idle'` state even though the account had already correctly become Pro server-side (the tier flip via webhook/`verifyTransaction` doesn't depend on any UI listener). Each of the 5 call sites' subscription callback now calls `resetCheckoutReturnState()` after consuming a terminal `'activated'`/`'failed'` state — required so the replay-on-subscribe fix doesn't leak that same stale outcome into some later, unrelated modal open. Any **new** `UpgradeModal` call site (or any other consumer of this store) must call `resetCheckoutReturnState()` after acting on a terminal state for the same reason.

## Board Memoization (`boardPropsAreEqual`, spec 046 US5)

`Board` is exported as `export const Board = memo(BoardImpl, boardPropsAreEqual)` — a custom
`React.memo` comparator, not the default shallow-prop-equality check.

- **`deriveBoardSignature(board)`** (`src/lib/board.js`) — pure function; walks the 6×7 `board[row][col]`
  array and builds a compact string of only non-`'empty'` cells (`"r,c,value|..."`). Two different
  array *references* holding the same disc layout hash to the same signature.
- **`boardPropsAreEqual(prevProps, nextProps)`** (`src/lib/board.js`) — for the `board` prop, compares
  `deriveBoardSignature(prev) !== deriveBoardSignature(next)` instead of `Object.is` reference equality;
  every other prop falls back to `Object.is` (React.memo's default semantics unchanged for
  `overlays`/`lastDrop`/etc.).

**Why**: a parent re-render that constructs a fresh `board` array with identical cell contents (e.g.
triggered by an unrelated state change during coach narration) no longer forces `Board` to re-render —
this was the fix for a board-flicker class of bug when narration state changes while the board is on
screen. Any new caller that constructs `board` inline on every render should rely on this memoization
rather than hand-rolling its own `useMemo` for the board array. Callers that need to stabilize other
reference-typed props (e.g. `overlays`) still need their own `useMemo` — this comparator only special-
cases `board`. See `tests/unit/boardMemoStability.test.js` for the reference-vs-content-equality
regression coverage. This memoization is retained as harmless referential-stability hardening, but it
was **not** the cause of the reported spec-046 "board flicker" — see the next section.

## Coach-message accumulation must not reflow the board (`CoachDialog fixed`)

The spec-046 "board moves down / flickers when the coach speaks" defect was **not** a disc re-render — it
was a **layout reflow**. `ChallengeScreen` (and other screens) render `<CoachDialog>` directly above the
board in a `flex column`. `CoachDialog` renders **all** `messages` stacked, and screens that **accumulate**
messages (append a post-move feedback bubble below the prompt, rather than replacing the single message)
grow the coach region's height — pushing the board, the next flow sibling, downward.

**Convention**: any screen that accumulates coach messages over a board MUST pass the `fixed` prop —
`<CoachDialog fixed …>`. `fixed` reserves a stable **outer** `height:140` plus a background/margin, so
appended bubbles scroll within the region instead of growing it. `GameScreen`,
`ReviewScreen`, and (as of the flicker fix) `ChallengeScreen` use `fixed`. Screens that only ever show a
single, *replaced* message (`ConceptScreen`, `SocraticScreen`, `HomeScreen`) do not accumulate and so do
not need it. If you add a board+coach screen and the board visibly shifts when feedback appears, the fix is
`fixed`, not board memoization.

**The `maxHeight:120, overflowY:auto` bubble cap is NOT part of `fixed`.** It sits on the inner bubbles
container in `CoachDialog.jsx`, outside the `fixed` ternary, so it applies on **every** screen including
the two lesson screens that omit `fixed`. Two consequences for anyone writing coach copy:

- **The cap is a silent truncation, not a layout change.** The box fits **5 rendered lines** of text
  (`scrollHeight` 119 fits; 139 overflows — 22px of any measurement is bubble padding), roughly
  **205 characters**. Longer copy scrolls instead of shrinking the font, and no test catches it.
- **More messages make it worse, not better.** `CoachDialog` renders all `messages` stacked inside that
  one box — it is not a sequential reveal — so splitting a long message into two costs ~28px more
  (6px gap + a second bubble's padding). The mount effect also sets `scrollTop = scrollHeight`, so the
  learner lands on the *last* bubble with earlier ones scrolled out of view.

To check copy, read `scrollHeight - clientHeight` off that container in the browser for every slide, in
**both** locales — Spanish runs ~15% longer than English and routinely overflows alone. Lesson-side
authoring limits: `docs/architecture/lesson-editor.md` §"Text length limits".

`CoachDialog` also takes two optional narration props. `onStop` renders a ⏹ button beside the 🔁
replay (both hidden unless narration exists), and `hasNarration` **overrides** the default derivation
from `messages[].audio` — `ConceptScreen` passes it because a slide whose only clip is the info-prose
narration has no message audio and would otherwise show no controls at all.

## Lesson concept slides: the board is pinned, the prose scrolls

`ConceptScreen`'s content column is `flex: 1; minHeight: 0; display: flex; flexDirection: column`.
The board + legend live in a `flexShrink: 0` wrapper; `<InfoProsePanel>`
(`src/components/InfoProsePanel.jsx`) is the only flexible child, at `flex: '0 1 auto'; minHeight: 96;
overflowY: auto`. Long prose therefore scrolls **inside its own panel** and never pushes the board —
the thing the prose is describing — off screen. The column keeps `overflowY: auto` purely as
graceful degradation for a viewport too short for the board plus that 96px floor.

**flex-grow must stay 0.** With `flex: '1 1 auto'` the panel stretched to absorb every leftover pixel,
so on a tall viewport short prose sat at the top of a huge empty white box. `0 1 auto` makes the panel
exactly as tall as its content when there is room, while flex-shrink 1 (against the board's
`flexShrink: 0`) still makes it the only thing that gives way when there is not.

The board is width-driven (square cells at `width: 100%`), so the only way to bound its **height** is
to bound its width: the board sits in a wrapper with `maxWidth: calc(34dvh * 7 / 6)`. On a tall
viewport that exceeds the column width and is inert; on a short one it shrinks the board so the prose
keeps a usable share. Measured across all 15 lessons at 390x740: prose 96-194px, zero page overflow.

`InfoProsePanel` also owns paragraph rendering — it splits the authored string on blank lines into
`<p>` elements (OI-77). Do not inline `{slide.infoProse}` back into a `<div>`; that is the bug.

## Debug Panel (`ClassifyAllPanel`)

A developer-only panel that shows the output of `classifyAll` for any board position: 11 detector rows (immediate_threat, double_threat, forced_block, forced_win, forbidden_columns, z_threat, undercut, overcut, figure_7, j_shape, claimeven) + board state (scores, threats, parity).

**Toggle**: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows/Linux). State persists in `localStorage` under key `c4_debug`. Managed by `DebugContext` in `src/context/DebugContext.jsx`.

**Future gating**: To restrict to developer users, replace the `localStorage` check in `DebugContext.jsx` with a role check (e.g. `session?.user?.role === 'developer'`).

**API**: `POST /api/debug/classify-all` (localhost-only). Body: `{ moves: string }`. Returns `{ detectors, boardState, scores }`. Do not call from prod-user-facing code.

**Adding to a new page** — two steps:

```jsx
// 1. Import at the top of the page file
import { ClassifyAllPanel } from '../components/ClassifyAllPanel.jsx';
import { useDebugMode } from '../context/DebugContext.jsx';

// 2. Inside the component, compute two movestings:
//    - humanMovestring: board right after the human's most recent move (odd-length slice)
//    - aiMovestring:    board right after AI's most recent move (even-length slice, '' if AI hasn't moved)
// Then render below the board (gate on !gameOver to avoid solver errors on won positions):
const { debugMode } = useDebugMode();
// ...
{debugMode && !gameOver && (
  <ClassifyAllPanel humanMovestring={humanMovestring} aiMovestring={aiMovestring} />
)}
```

**Sparring example** (the reference implementation, `src/pages/HomePage.jsx`):

```jsx
const humanMovestring = buildMovesString(
  moveHistory.slice(0, moveHistory.length % 2 === 1 ? moveHistory.length : Math.max(0, moveHistory.length - 1))
);
const aiMovestring = moveHistory.length < 2 ? '' : buildMovesString(
  moveHistory.slice(0, moveHistory.length % 2 === 0 ? moveHistory.length : moveHistory.length - 1)
);
// Human plays at even indices (0, 2, 4…), AI at odd indices (1, 3, 5…).
// humanMovestring = last odd-length prefix; aiMovestring = last even-length prefix.
```

For pages where only one perspective exists (e.g. Puzzles, where the position is fixed), pass the same string for both props or pass `''` for whichever is not applicable.

## Screen Navigation

**Sole navigation mechanism**: `go(screenKey, params)` is the only way to navigate between screens. Do not call any router API (no `BrowserRouter`, `navigate()`, `Link`, etc.).

**`setActiveScreen` ordering**: `setActiveScreen(key)` (from `src/lib/track.js`) MUST be called before `track()` on every navigation so the correct `path` is recorded in analytics. The Navigator mount effect calls `setActiveScreen('home')` and then `track('session_start', ...)` in that exact sequential order.

**Surface group → background token mapping**: Each screen key maps to a CSS custom property token via `SURFACE_BG` in `src/lib/surfaceGroups.js`:

| Surface group | Token | Screens |
|---|---|---|
| Home | `--bg-home` | home, stats, mistakes, mistakeDetail, blunderDetail |
| Lessons | `--bg-lessons` | saga, concept, socratic, clchallenge |
| Challenges | `--bg-challenges` | setpicker, challenge, summary |
| Sparring | `--bg-sparring` | difficulty, game, review |

### Three-level Mistakes route hierarchy

The mistakes feature has three independent screen routes:

- **Level 1**: `mistakes` -- `CategoryListScreen` -- entry point, groups blunders by tactical category sorted by severity. Requires auth (gated by `MistakesGate` with `renderSignedOut`).
- **Level 2**: `mistakeDetail` -- `MistakesListScreen` with `category` prop -- filtered blunder list for one category. Shows Unreviewed/Reviewed tabs.
- **Level 3**: `blunderDetail` -- `MistakeDetailScreen` with `blunderNavList`, `index`, `mistakeContext` (`'list'` | `'game'`), `mistakeSource` (`{ date, gameId, totalMoves }` | null), and `difficulty` (string | null, passed from `ReviewScreen` for "Start a new game from here") -- individual mistake detail with Prev/Next nav. Both suboptimal and blunder quality rows use this screen. Prev/Next navigates the full `blunderNavList` (all non-optimal moves for the game). Actions: **What should I have played** (deep reveal, updates overlay), **Start a new game from here** (calls `POST /api/games/from-position`; shows difficulty picker when difficulty is null), **Mark as reviewed**. Contextual Back: from a game review the Back button returns to `review`; from the list it calls `goBack()`.

**`ReviewScreen` navigation contract**: registered at `/game/:id`; navigate with `go('review', { id: game.id })` (game UUID) — do NOT pass `moveString`; it is not a prop and the URL mapping only knows `id`. The screen fetches `POST /api/games/analyze` with that id.

**Timeline-to-blunder matching (`ReviewScreen`)**: `navigateToMistake(moveIndex)` takes a **number** (the user-move ordinal, 1-indexed). It routes ALL non-optimal moves to `blunderDetail` via the `gameBlunderList` DB match (no Explorer fallback since the 2026-06-21 unification; the list includes both suboptimal and blunder rows since migration 051). When no row matches (queue still loading, or anonymous user) it is a no-op. The global ply index is `globalPlyIndex = 2*(moveIndex-1)` for `side === 'first'`, `2*(moveIndex-1)+1` for `side === 'second'`; the blunder row is matched where `board_state.length === globalPlyIndex`. `displayMoveNumber = board_state.length + 1` (1-indexed, display only); raw `board_state.length` is the internal join key. These two formulas are the most common source of off-by-one bugs in review navigation.

**Owner-only controls gate on `is_owner !== false`, never on `is_owner`** (`MistakeDetailScreen`'s "Mark as reviewed": `session && blunder.is_owner !== false`). The server sets `is_owner` only on the public permalink endpoint (`GET /api/blunders/:id` — see api-conventions.md); blunders reached by **in-app navigation** (coach queue / `gameBlunderList` items) carry **no `is_owner` field at all**, so it is `undefined` there. The `!== false` form deliberately treats `undefined` as owned and hides the control only on an explicit server `false`. Simplifying it to `blunder.is_owner` would silently hide "Mark as reviewed" from every owner navigating in-app.

**Screen registry**: `src/lib/screenRegistry.js` is the canonical map of all 14 screen keys to their React components. Add new screen components here; never wire them directly in `App.jsx`.

**Back-stack pattern**: The Navigator maintains a one-level back-stack via `prevScreen`. `goBack()` restores `prevScreen` and clears it to `null`. Do NOT implement `goBack()` by calling `go(prevScreen)` — that would overwrite `prevScreen` with the current screen instead of clearing it, breaking subsequent back navigations.

## URL Sync & Navigation

**`react-router-dom` is permanently absent** — spec 011 FR-001 invariant. Do NOT reintroduce it.

### Single source of truth: `urlMapping.js`

`src/lib/urlMapping.js` exports:
- `URL_MAP` — ordered array of `{ screenKey, pattern, buildPath }` entries for all 16 routable screens. This is the canonical URL ↔ screen-key mapping; no other file may hard-code URL paths.
- `SESSION_ONLY_SCREENS` — `Set` of 2 screen keys whose state cannot survive a cold page load: `summary`, `game`. On cold boot, these screens redirect to `home`. (`explorer` was removed when the Explorer screen was unified into `MistakeDetailScreen`.) `mistakeDetail` was removed from this set in spec 042: its route changed from a bare `/mistakeDetail` to `/mistakeDetail/:category` (`URL_MAP` entry `{ pattern: '/mistakeDetail/:category', screenKey: 'mistakeDetail', paramNames: ['category'] }`), so the `category` param now round-trips through the URL itself and the screen survives a cold reload by staying on the category list instead of redirecting to `home`.
- `buildUrl(screenKey, params)` — constructs the URL pathname for a given screen + params.
- `parseUrl(pathname)` — parses a pathname and returns `{ screenKey, params }` or `null`.

### Navigation API

| Function | History effect | When to use |
|---|---|---|
| `go(screenKey, params)` | `pushState` — adds a history entry | Normal forward navigation |
| `goReplace(screenKey, params)` | `replaceState` — no new history entry | Replacing current entry (e.g., after saving a game) |
| `goBack()` | `window.history.back()` | Back button / back gesture |

**Params are spread as direct props, not a `params` object.** The Navigator renders screens as `<ScreenComponent go={go} goBack={goBack} {...params} />`. Screens must destructure route params directly (`function MyScreen({ go, goBack, blunders, index })`) — destructuring `{ go, goBack, params }` leaves `params` undefined and silently loses every route param (caused a "No data" blank screen in `MistakeDetailScreen`).

### Event handling

The `popstate` handler in `App.jsx` is the **canonical place** for back-navigation tracking. `goBack()` itself does NOT call `track()` — tracking fires inside the `popstate` listener so it covers both programmatic back navigation and browser back-button gestures.

### Cold-boot behaviour

On initial page load, `App.jsx` calls `parseUrl(location.pathname)` and calls `replaceState` to normalise the URL. Screens in `SESSION_ONLY_SCREENS` cannot be loaded from a cold URL (their required state is absent); the mount effect redirects them to `home`.

### `clchallenge` cold-boot fetch pattern

The `clchallenge` screen encodes only `lessonId` in the URL. On cold boot (when `lessonTitle` is absent from navigation params), `CLChallengeScreen` fetches the remaining props from `GET /api/lessons/:lessonId`. Components that require data beyond what fits in a URL path parameter MUST follow this same fetch-on-missing-props pattern.

### `blunderDetail` cold-boot fetch pattern

The `blunderDetail` screen encodes only `id` (UUID) in the URL (`/blunder/:id`). On cold boot (when `blunderNavList` is absent from navigation params), `MistakeDetailScreen` fetches the blunder from `GET /api/blunders/:id` (no auth required), constructs a single-item `navList` array, and renders normally using the existing `blunderNavList + index` prop API. While fetching, a loading spinner is shown; on 404, a "Blunder not found" message; on network errors, a generic error state. The cold-boot render omits the "Mark as reviewed" button (no session) and shows a "Sign in to unlock" prompt in place of the Deep Reveal trigger.

## Service Worker (`public/sw.js`)

The service worker provides offline support and performance caching. Critical rules for modifying it:

### Caching strategy per request type

| Request type | Strategy | Rationale |
|---|---|---|
| Navigation (HTML pages) | **Network-first** | `index.html` changes every deploy (new hashed JS filenames). Cache-first would serve stale HTML → broken app. |
| Hashed assets (`/assets/*`) | **Cache-first** | Vite generates content-hashed filenames. Immutable — a cached version is always correct. |
| Other static (manifest, favicon, fonts) | **Cache-first with network update** | Rarely changes; cache for speed, update in background. |
| API requests (`/api/*`) | **Bypass** | Never cache API responses — they must be fresh. |
| Cross-origin requests | **Bypass** | Supabase, Google Fonts etc. are handled by their own CDNs. |

### Important: bump CACHE_NAME on any SW logic change

The `CACHE_NAME` constant (e.g., `'decodec4-shell-v2'`) must be bumped whenever the caching strategy changes. This purges all stale cached entries from old SW versions. Failing to bump it means users with the old SW installed will continue serving stale content.

### Never cache index.html with cache-first

**Doing so will break the app after every deploy.** The cached index.html references old hashed JS files that no longer exist on the server, causing MIME type errors ("Expected a JavaScript module but the server responded with text/html").

### SW lifecycle

`skipWaiting()` is called on install — the new SW activates immediately without waiting for all tabs to close. `clients.claim()` is called on activate — the SW takes control of all clients immediately. This means SW updates apply on the next navigation, not the next full page load.

## Audio Preferences (`useAudio`)

`src/lib/useAudio.js` is the single source of truth for all audio state. Components MUST NOT read `localStorage` audio keys directly.

**localStorage keys** (three booleans):

| Key | Default | Purpose |
|---|---|---|
| `audio_sfx_enabled` | `true` | Mute/unmute sound effects (disc drops, win, correct, wrong) |
| `audio_music_enabled` | `false` | Mute/unmute background music (default-off until real assets replace placeholders) |
| `audio_speech_enabled` | `false` | Mute/unmute coach speech (requires approved TTS audio files) |

**Hook API**:

```js
const {
  playSfx,         // (name: string) => void — plays /audio/sfx/<name>.mp3, no-op if sfx disabled
  playMusic,       // () => void — starts/resumes bg_music.mp3 loop, no-op if music disabled
  pauseMusic,      // () => void — pauses bg_music.mp3
  sfxEnabled,      // boolean
  musicEnabled,    // boolean
  speechEnabled,   // boolean
  toggleSfx,       // () => void — flips sfxEnabled, persists to localStorage
  toggleMusic,     // () => void — flips musicEnabled, persists, immediately starts/pauses audio
  toggleSpeech,    // () => void — flips speechEnabled, persists
} = useAudio();
```

- `playSfx(name)` creates a new `Audio` element per call so overlapping effects play correctly.
- `playMusic()`/`pauseMusic()` control a module-level singleton `<audio loop>` element — only one music track exists across all screen instances.
- SFX and Speech toggle buttons currently share the same `speaker`/`speakerOff` icons — a distinct icon for Speech is pending.

## Coach Audio Manifest (`useCoachSpeech`)

`src/lib/useCoachSpeech.js` provides speech playback for approved coach messages. It fetches `public/audio/coach/coach-audio-manifest.json` **once on mount** and stores the approved slug list in a ref — never makes blind-fetch 404s for individual MP3s.

**Manifest lifecycle**: `coach-audio-manifest.json` is regenerated by the server whenever an approve action runs on the `/api/admin/audio/approve` endpoint. It starts as `[]` (empty) and grows as coach keys are approved. `useCoachSpeech` handles an empty manifest gracefully — all `speakCoachMessage()` calls are no-ops until keys are approved.

```js
const { speakCoachMessage, speechEnabled } = useCoachSpeech();
// speakCoachMessage(key) — no-op if: speech disabled, manifest not loaded, or key's slug not in manifest
```

**Module-level exports for dynamic TTS** (do not go through the manifest):
```js
import { speakDeepReveal, stopSpeech } from '../lib/useCoachSpeech.js';
// speakDeepReveal(audio: HTMLAudioElement) — pushes a pre-built Audio element into the unified queue
// stopSpeech() — pauses current speech, clears queue; call on panel dismiss
```

Audio files live at `public/audio/coach/<slug>.mp3` served by static middleware. The slug is derived from the i18n key by replacing all `.` and `_` with `--` (e.g., `coach.immediate_threat.optimal.0` → `coach--immediate--threat--optimal--0.mp3`).
