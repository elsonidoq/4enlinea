# Phase 1 Data Model: Global UI/UX & Accessibility Polish

No database schema, API request/response shape, or persisted server-side entity is introduced or
changed by this feature (spec Assumptions: "Out of scope for this feature: server/API changes").
All entities below are **client-side, transient, in-memory or `sessionStorage`** shapes.

## ColumnA11yProps (derived, not stored)

Pure derivation consumed by `Board.jsx`'s per-column wrapper render. Not a persisted entity — a
function's return shape, extracted for unit-testability (see `research.md` R6).

| Field | Type | Derivation | Notes |
|---|---|---|---|
| `role` | `'button' \| undefined` | `canPlay ? 'button' : undefined` | Read-only board (FR-002) → `undefined` (no `role` attribute at all) |
| `ariaLabel` | `string \| undefined` | `canPlay ? \`column ${col + 1}\` : undefined` | 1-based per FR-003; `col` stays 0-indexed internally |
| `tabIndex` | `number \| undefined` | `canPlay ? (tappable ? 0 : -1) : undefined` | `tappable = canPlay && !colFull` (existing local) |
| `ariaDisabled` | `true \| undefined` | `canPlay && colFull ? true : undefined` | FR-006: non-playable column inside an otherwise-interactive board |

**Validation rule**: on a read-only board (`canPlay === false`), all four fields MUST be
`undefined` — no attribute is rendered — enforced by the unit test in `research.md` R6, not by
runtime validation (no user input crosses this boundary; Constitution II — validate only at
system boundaries).

## PostLoginReturnTo (sessionStorage entry)

| Field | Type | Notes |
|---|---|---|
| key | `'postLoginReturnTo'` (literal) | Single well-known `sessionStorage` key; not namespaced further — one pending return-destination at a time is the product requirement (a second gated-CTA tap before consumption overwrites the first, which is acceptable: the user's most recent intent wins) |
| value | `string` (JSON) | `JSON.stringify({ screenKey, params })` |
| `screenKey` | `string` | Must be a key present in `SCREENS` (`src/lib/screenRegistry.jsx`) at consumption time; unknown/stale keys are dropped silently (no crash) |
| `params` | `object` | Passed through verbatim to `go(screenKey, params)`; for both in-scope call sites (`pastGames` and `stats`) this is `{}` |

**Lifecycle**: written by `stashReturnTo(screenKey, params)` at the moment a gated CTA is
activated (before `setAuthOpen(true)`/opening `AuthModal`); read and deleted exactly once by
`consumeReturnTo()`, called from the single named consumption point (`Navigator`'s `session`
effect in `App.jsx` — see `research.md` R3). Written for **both** in-scope call sites
(`pastGames` and `stats` — see resolved note below); cleared without being consumed by
`clearReturnTo()` if the sign-in prompt is dismissed instead of completed (see `research.md` R3
point 4 and the `State transitions` entry below).

**State transitions**:
1. `absent` → `present` (gated CTA tapped, `AuthModal` opens)
2. `present` → `absent` (consumption fires and deletes it) — happens on any subsequent page
   load/mount where `session` is truthy, whether that came from a fresh OAuth login or an
   already-valid cookie restore (see `research.md` R3's safety-property note)
3. `present` → `present` (overwritten if the user backs out and taps a *different* gated CTA
   before completing sign-in) — last-intent-wins, no queue
4. `present` → `absent` (cleared, not consumed, by `clearReturnTo()` when `AuthModal` is closed —
   backdrop click, dismiss button, or dev skip-auth button — without the stashed destination ever
   being routed to; prevents a stale stash from firing on a later, unrelated sign-in)

## Key Entities (from spec, cross-referenced to concrete code)

- **Column control** — see `ColumnA11yProps` above. Exists only when `canPlay === true`
  (`Board.jsx` prop, already threaded through every caller).
- **Sign-in intent / return destination** — see `PostLoginReturnTo` above. Two write sites in
  scope: `HomeScreen.jsx`'s past-games `FeatureCard.onClick` (stashes `{ screenKey: 'pastGames',
  params: {} }`), and the new Stats `signup_prompt` `onClick` (stashes `{ screenKey: 'stats',
  params: {} }`).

  **Resolved (was previously deferred to implementation as "resolve empirically" — no longer
  open):** the Stats CTA MUST stash, it cannot omit the stash. The earlier assumption in this
  document — that a no-stash Stats CTA would leave the user "simply remaining on Stats
  post-login" — is **false** and has been removed. Verified against `server/index.js:207`: the
  OAuth redirect target is `FRONTEND_URL`, the site root `/`, not the screen the user started
  from. There is no per-screen OAuth return route, so `Navigator` always mounts at its default
  screen (Home) after a fresh Google sign-in. A signed-out user who taps the Stats `signup_prompt`
  CTA and completes sign-in **without** a stash would therefore land on Home, not Stats — a
  regression relative to where they started, and inconsistent with the Past Games CTA's
  return-to-intended-destination behavior. Stashing `{screenKey:'stats'}` is required for FR-014's
  "leave them on the screen they started from" spirit to actually hold once sign-in redirects
  through the site root. See `research.md` R3 point 5 for the full trace.
- **Persistent logo** — a `TopBar` render-tree element (see `research.md` R4), not a data entity;
  no state beyond the `onLogoClick` handler each screen wires to `go('home')`.
