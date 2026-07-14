# Phase 0 Research: Global UI/UX & Accessibility Polish

All items below were empirically verified against the current codebase (no speculation); each
resolves a Technical Context unknown from `plan.md`.

## R1 — Board a11y: control shape and playable/read-only gating source

**Decision**: Add `role="button"`, `aria-label="column N"` (1-based), `tabIndex={tappable ? 0 : -1}`,
and `onKeyDown` (Enter/Space → same `handleClick`) to the existing per-column wrapper `<div>` at
`connect-four/src/components/Board.jsx:211-229`. Gate all of it behind a single boolean derived
from the existing `tappable` local (`canPlay && !colFull`), which itself derives from the
already-passed `canPlay` prop. No new prop is introduced — `canPlay` is already the playable/
read-only signal every caller sets today (default `false`).

**Rationale**: `canPlay` already exists and is already false on every read-only rendering site
(review, mistake-detail, lesson, past-game replay thumbnails, curation/admin/eval). Reusing it
means FR-002 ("read-only boards expose zero controls") falls out for free — no per-caller audit
or new prop plumbing is needed, and there is no risk of drift between "is this board playable"
and "does it get column controls."

**Alternatives considered**:
- A new explicit `interactive`/`a11yEnabled` prop — rejected: `canPlay` already carries this
  exact semantic; a second prop would be redundant and could disagree with `canPlay` at a call site.
- Adding `role`/`tabIndex` unconditionally and only gating `aria-label`/keydown — rejected: FR-002
  requires *zero* interactive controls on read-only boards, not merely non-functional ones; a
  `role="button"` with no keyboard handler is a worse a11y regression than nothing.

**Non-playable-column state (FR-006)**: when `tappable` is false *inside an otherwise-playable
board* (i.e. `canPlay===true && colFull===true`), keep `role="button"` but set
`aria-disabled="true"` and `tabIndex={-1}` (removes it from the Tab sequence, per FR-006's "MUST
NOT drop a disc when activated" — `handleClick` already no-ops via the `if (!tappable) return`
guard at line 197, so no logic change is needed, only the ARIA/tabIndex attributes).

**Keyboard activation must not bypass `multiSelectMode`**: `handleClick` (`Board.jsx:196-203`)
already branches `onColToggle` (curation multi-select) vs `onColumnClick?.(col)`. `onKeyDown` MUST
call the same `handleClick` function reference, not reimplement the branch, so curation's Enter/
Space behavior stays correct automatically (FR-004).

**Verified during plan review: no admin site actually needs a different gate.** A plan-review
critique raised the concern that `canPlay===true` sites without an `onColumnClick` handler (e.g.
per-cell-only admin editors) would incorrectly gain focusable, keyboard-activatable column
wrappers with nothing behind them. This was checked against the current codebase directly: every
call site in the repo that passes `canPlay={true}` (`GameScreen.jsx`, `SocraticScreen.jsx`,
`PlayOnlineScreen.jsx`, `ChallengeScreen.jsx`, `CurationWorkspace.jsx:326-327`, and
`BoardEditor.jsx:109-111` when `mode==='disc'`) **also** passes `onColumnClick` in that same call —
there is no site today where `canPlay` is `true` and `onColumnClick` is absent. `BoardEditor.jsx`'s
`mode==='overlay'` state (per-cell `onCellClick`) sets `canPlay={false}`, not `true`, so it already
falls into the read-only/no-controls branch under the existing `canPlay` gate. **Decision: keep the
gate as `canPlay` (no gate change to `onColumnClick` presence).** Gating on `onColumnClick`
presence instead would be behaviorally identical today (every `canPlay===true` site already has an
`onColumnClick`), so it would add indirection without fixing anything real; if a future caller ever
sets `canPlay={true}` without `onColumnClick`, that would itself be a bug at the call site (a
"playable" board with no click handler), not something the a11y gate should paper over.

## R2 — Button-affordance & CTA-routing scope

**Decision**: Scope is closed — exactly one restyle/routing target beyond the two already-known
ones (`StatsScreen.jsx:132` "review past mistakes", `HomeScreen.jsx:80` past-games card): the
signed-out `stats.signup_prompt` `<div>` at `StatsScreen.jsx:141-145`. This was independently
re-verified by reading `HomeScreen.jsx` and `StatsScreen.jsx` in full during spec authoring (see
spec Appendix) — no further audit is in scope for FR-011/FR-015.

**Rationale**: Constitution VI ("make load-bearing assumptions explicit") + the epic's closed-set
framing. Re-auditing here would be scope creep past what the epic and spec already fixed.

## R3 — Sign-in return-destination stash + single consumption point

**Decision**:
1. **Stash** (write side): at the two gated-CTA call sites (`HomeScreen.jsx:80`'s past-games
   `FeatureCard.onClick`, and the new `StatsScreen.jsx:141-145` `onClick`), before calling
   `setAuthOpen(true)`, write `sessionStorage.setItem('postLoginReturnTo', JSON.stringify({ screenKey, params }))`.
2. **Consume** (read side — the single named consumption point, FR-013): a new `useEffect` in
   `Navigator` (`connect-four/src/App.jsx`), keyed on the `session` value obtained from
   `useStore()` (Navigator does not currently call `useStore()` — this wiring is new). The effect
   fires whenever `session` transitions to a truthy value, and calls the `postLoginReturn.js`
   module's own `consumeReturnTo()` directly — it does **not** inline `sessionStorage.getItem`/
   `JSON.parse`/`SCREENS`-validity logic itself; that logic lives inside the module (see
   `contracts/post-login-return.md`), keeping `rg consumeReturnTo src/` at exactly one call site
   (the contract's greppability invariant):
   ```js
   useEffect(() => {
     if (!session) return;
     const dest = consumeReturnTo();
     if (dest && SCREENS[dest.screenKey]) go(dest.screenKey, dest.params);
   }, [session]);
   ```
3. **Safety property**: this effect also fires on an ordinary cookie-restored page load (every
   mount where a session cookie already exists), not only on a fresh OAuth completion — but it is
   a no-op unless `postLoginReturnTo` is present in `sessionStorage`, which is only ever true
   immediately after a gated CTA stashed it and before it was consumed. This makes "only consume
   once, only after a real gated-CTA trigger" fall out of the write/consume pairing rather than
   requiring a separate "is this session fresh" signal.

4. **Stale return-destination on dismiss (closes a correctness gap found in plan review)**: the
   "no-op unless present" safety property above is **not sufficient on its own**, because the key
   is not absent after a dismissed prompt — it persists for the tab's lifetime until consumed.
   Scenario: a logged-out user taps "Past games" (stash `pastGames` written) → the sign-in modal
   opens → the user dismisses it without signing in (FR-014) → keeps browsing → later signs in via
   an unrelated entry point (e.g. the profile icon) → the consumption effect fires on that
   unrelated sign-in and silently bounces them to Past Games. This violates the spec Edge Case
   ("the next visit should not silently redirect them anywhere unexpected") and the spirit of
   FR-014. **Resolution**: `AuthModal.jsx` calls a new `clearReturnTo()` export (see
   `contracts/post-login-return.md`) on **every** dismissal path — backdrop click, the "dismiss"
   button, and the dev-only skip-auth button — not only from the originating gated CTA's own
   handler. Centralizing the clear inside `AuthModal` itself (rather than per-caller) is required
   because `AuthModal` is opened from multiple unrelated call sites (`HomeScreen.jsx`,
   `DeepRevealPane.jsx`, `AuthGate`), and only a clear inside the modal component guarantees no
   dismissal path can leave a stale stash behind.

5. **OAuth redirect target is the site root, not the originating screen** (load-bearing fact,
   confirmed by reading `server/index.js:207`): Google sign-in redirects to `FRONTEND_URL`, which
   is the site root `/`. There is no per-screen OAuth return route. This means **every** signed-out
   user who completes Google sign-in lands on the `Navigator`'s default mount screen (Home) unless
   the stash/consume mechanism redirects them elsewhere — this is true for *every* gated CTA in
   this feature, not only Past Games. It falsifies the premise (previously stated in
   `data-model.md`) that a CTA which "omits the stash" would leave the user "simply remaining" on
   its own screen post-login: there is no such continuity: without the CTA's own key being
   stashed, the user is redirected all the way to Home. This is why the Stats `signup_prompt` CTA
   must stash `{screenKey:'stats'}` rather than omit the stash (see Decision below and
   `data-model.md`).

**Rationale (why not inside `ProfileStore.switchToSupabase`, line 76)**: `ProfileStore` owns
`session` but not `go()`; `Navigator` owns `go()` but not `session`. Wiring `Navigator` to
`useStore()` is the smaller, more correct change — it keeps the consumption point (routing) next
to the only other thing that ever calls `go()`, rather than teaching the store module about
screen keys. This was confirmed by reading both files in full: `ProfileStore.jsx` has no `go`
reference anywhere, and `App.jsx`'s `Navigator` has no `session` reference anywhere today — the
epic's premise "no OAuth-callback landing route was found" is confirmed. The consumption point
does not need a dedicated route/URL; hash-based detection in `checkSession` is path-agnostic
already (confirmed: `URL_MAP` has no `/auth/callback` entry, and none is needed).

**Alternatives considered**:
- A dedicated `/auth/callback` URL_MAP entry — rejected: would require Supabase's `redirect_to`
  config to change (`server/index.js:207`, `FRONTEND_URL`), a larger and riskier change than
  reusing the existing hash-detection path already used by `ProfileStore.checkSession`, and
  explicitly out of scope (no server/API changes per spec Assumptions).
- Consuming inside each individual gated screen (e.g. `PastGamesListScreen` checks for a stash on
  mount) — rejected: this is exactly the "scattered per-screen" anti-pattern FR-013 explicitly
  prohibits ("a single, well-defined consumption point... not scattered per-screen").

**sessionStorage survival across the redirect round-trip — empirically confirmed via code trace,
to be re-confirmed live in the dev environment as an implementation task**: the round trip is
client origin (`5173` dev) → Express (`3001` dev, different origin) → Supabase/Google (external)
→ back to `FRONTEND_URL` (`5173` dev) with `#access_token=...` appended (`server/index.js:207-210`,
`AuthModal.jsx:40-41`). The browser tab never opens a new tab/window (`window.location.href`
assignment, not `window.open`) — `sessionStorage` is scoped to the *tab* + *origin* pair and
survives cross-origin navigation within the same tab, becoming readable again once the tab returns
to the origin that wrote it. This resolves the spec's "must be empirically confirmed during
implementation" caveat at the code-trace level; Task in `tasks.md` will additionally verify this
live (manual browser check) before marking US3 done, per Constitution Principle VI
("reproduce before theorizing").

## R4 — TopBar logo contract amendment

**Decision**: Add two new optional props to `TopBar` (`connect-four/src/components/TopBar.jsx`):
`onLogoClick: () => void` (required by every caller in practice, since `App.jsx`'s `SCREENS`
render loop is the only place that can supply `go('home')`) and reuse the existing `title` slot
placement pattern — the logo renders to the *left* of `title`, inside the same flex row, as a new
`<span>`/`<div>` styled with the existing DecodeC4 lockup markup already used at
`HomeScreen.jsx:26` (`Decode<span style={{color:'var(--disc-green)')}}>C4</span>`). No new prop is
needed to *suppress* the per-screen title on Home — Home's own `TopBar` call
(`HomeScreen.jsx:25-31`) simply stops passing a `title` prop once the logo exists (FR-019); this
is a call-site change, not a `TopBar` API change, since `title` was always optional in the
existing contract (`title && (...)` guard at `TopBar.jsx:14`).

**Rationale**: Keeps `TopBar`'s existing prop contract (Spec 010 FR-013/FR-014) additive rather
than restructured — every other screen's `<TopBar title={...} onBack={...} .../>` call is
untouched. The logo becomes a new unconditional element in `TopBar`'s render tree, not a
conditional replacement of `title`.

**Amendment mechanics**: Spec 010's `FR-013`/`FR-014` text (`specs/010-design-tokens-component-library/spec.md:162-163`)
will be superseded in-place (visible strikethrough + new text, matching this epic's established
correction convention in `polish_epic.md`) to add: (a) the logo element in the FR-013 render list,
(b) `onLogoClick` in the FR-014 prop list, (c) a note that `title` is optional and Home omits it
by convention post-043. This is a **documentation deliverable of this feature**, not a follow-up
— Constitution Principle VIII requires the architectural decision to be documented as part of the
task, not after.

## R5 — Mobile spacing root cause (Past Games chip/separator, 390×844)

**Decision**: No root cause is assumed ahead of implementation (per spec Assumptions: "not yet
known"). The diagnosis step is itself a task: render `PastGamesListScreen` at 390×844 (Chrome
DevTools device emulation, per the `chrome-devtools-mcp` skill already available in this
environment) and inspect the computed box model between the filter-pills row
(`PastGamesListScreen.jsx:257-283`) and the content list (`PastGamesListScreen.jsx:286-334`) — both
currently plain `padding` values (`'8px 16px 4px'` and `'8px 16px 24px'`) with no visible
separator element in the current source (the epic's "separator line" may refer to a CSS border on
`.game-card`/a themed scroll boundary, not a literal `<hr>` — must be confirmed visually, not
assumed from source alone, per Constitution Principle VI).

**Rationale**: Constitution VI: "reproduce before theorizing" — since the cause is explicitly
unknown, research cannot resolve it; only implementation-time reproduction can. This is captured
as an explicit `tasks.md` step (visual repro before any CSS edit).

## R6 — Testing approach given no DOM/RTL harness in this repo

**Decision**: This repo has **no jsdom, `@testing-library/react`, or any React component-mount
test harness** (confirmed: no such packages in `connect-four/package.json`; the entire test suite
is `node:test` + pure-function extraction per `docs/architecture/testing-conventions.md`). Tests
for this feature follow the same pure-function-extraction pattern used elsewhere in the repo
(canonical example: `insertGameBlunder.js` extraction, `testing-conventions.md` §"Pure Function
Extraction Pattern"):

- **Board a11y** (US1): extract the per-column control's derived a11y attributes (`role`,
  `aria-label`, `tabIndex`, `aria-disabled`) into a small pure function
  `getColumnA11yProps({ col, canPlay, colFull })` that `Board.jsx` calls when rendering each
  column wrapper. Unit-test that function directly with `node:test` for: 7 columns on a playable
  board all get `role="button"` + correct 1-based labels; a full column gets `aria-disabled` +
  `tabIndex=-1`; `canPlay=false` (read-only) yields no `role`/`tabIndex` on any column. This tests
  the *logic* exhaustively without a DOM.
- **Manual verification** (Constitution III: "UI features MUST be manually verified on the golden
  path and at least one edge case") covers what pure-function tests cannot: actual keyboard
  navigation/focus-ring rendering, actual screen-reader announcement, actual visual restyle
  (US2), actual cross-screen logo click (US4), actual mobile-viewport spacing (US4) — via the
  `chrome-devtools-mcp` skill (already used elsewhere in this session) driving the local dev app,
  documented in `quickstart.md`.
- **Sign-in return-destination** (US3): the stash/consume logic (`JSON.stringify`/`parse`, key
  presence check, `SCREENS[screenKey]` guard) is pure and unit-testable in isolation
  (`node:test`) by extracting it into a small `postLoginReturn.js` module with
  `stashReturnTo(screenKey, params)` / `consumeReturnTo()` functions that `HomeScreen.jsx`/
  `StatsScreen.jsx` (write side) and `App.jsx` (read side) import — this also gives FR-013's
  "single named consumption point" a literal, greppable name in the codebase, not just a
  conceptual one.

**Rationale**: Matches the established repo convention exactly (Constitution II: "no speculative
abstractions" is satisfied because these are genuine logic/DOM boundaries, not premature
wrapping); avoids introducing a new test dependency (jsdom/RTL) for one feature, which would be a
larger, undiscussed infrastructure change.

## R7 — `userIsYellow` / player-color preservation (FR-007)

**Decision**: No change to color/role assignment logic anywhere in this feature. `Board.jsx`'s
disc-color rendering (`value === 'red'` → green disc, `'yellow'` → gray disc, lines 303-317) is
untouched; the a11y work only adds attributes to the column *wrapper*, never touches the disc
`<div>`s or their color branching. Verified: `userIsYellow`-driven role assignment
(`project_highlight_cell_colors` memory) lives entirely in the `highlightedCells`/`shimRole`
deprecated-shim path (`Board.jsx:276-282,352-370`) and the generic `overlays` path
(`ovMap`/`ovType`, lines 104-105, 340-350) — neither is touched by US1-US4.
