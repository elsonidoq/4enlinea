# Full-App QA Pass — Plan (2026-09-08)

> **For agentic workers:** this is a **QA plan**, not an implementation plan. Tasks are
> *observations*, not code changes. Do NOT fix anything inline. Steps use checkbox
> (`- [ ]`) syntax for tracking. Methodology: `.claude/skills/app-qa/SKILL.md`
> (browser driving, evidence discipline, token discipline). Root-cause procedure:
> `scientific-method-debugging` skill.

**Goal:** Drive every screen, lesson, login CTA, checkout CTA and sparring flow of DecodeC4 in
a real browser, produce a PASS/FAIL/PARTIAL verdict for each task, and file every defect in
`docs/open_issues.md` with an established root cause.

**Architecture:** The app is a single-page React app with a custom screen router
(`src/lib/urlMapping.js` — **20** URL patterns, `urlMapping.js:7-29`) driven by a
`go(screenKey, params)` callback threaded from `App.jsx`. `screenRegistry.jsx`'s `SCREENS` map
has **21** keys — the 20 URL-mapped ones plus `onboardingImportOffer` and `onboardingMission`,
which are session-only and deliberately absent from `URL_MAP` *and* from `SESSION_ONLY_SCREENS`
(`screenRegistry.jsx:45-52`). Note the two mistake screens are **swapped relative to their
names**: `mistakeDetail: (p) => <MistakesListScreen {...p} />` and
`blunderDetail: MistakeDetailScreen` (`screenRegistry.jsx:37-38`) — so `/mistakeDetail/<category>`
renders the *list*, and `MistakeDetailScreen.jsx` is served at **`/blunder/<id>`**.
There is a **second, parallel routing layer** the SPA router never sees: `App.jsx:203-227`
branches on `window.location.pathname.startsWith('/admin')` before `Navigator` mounts.
Tasks are partitioned by **prerequisite account state**, because the state flips (IndexedDB
reset, tier flip, Paddle rollback) are the expensive operations — everything reachable from one
state is grouped and driven in one pass.

**Tech Stack:** Vite dev server + Express API + Supabase (local) + Paddle sandbox; driven via
the `chrome-devtools` MCP.

**Spec:** the QA brief in this session (scope, out-of-scope, traps) + `.claude/skills/app-qa/`.

---

## Global Constraints

Copied verbatim from the brief / project conventions. Every task implicitly includes these.

- **Ports:** `eval "$(./worktree-ports.sh)"` from the worktree root before starting, restarting
  or killing any server, every time. This worktree: **`API_PORT=4799`, `VITE_PORT=6799`**
  (verified 2026-09-08 — both already listening, API `/api/puzzles/counts` → 200, Vite → 200).
  Never a bare port number, never `pkill node`.
- **App URL:** `http://localhost:6799`. API: `http://localhost:4799`.
- **Server log:** `$LOG_PATH` = `<scratchpad>/app-qa-server.log`. Delta-read only
  (`START=$(wc -l < "$LOG_PATH")` before an action, `tail -n +$((START+1))` after).
  If the running server was not launched by this session it has no log file — relaunch it
  under `$LOG_PATH` before Task 1 so evidence is capturable.
- **No inline fixes.** Every defect → `scientific-method-debugging` → root cause →
  `docs/open_issues.md`. Next free id: **OI-163**.
- **Findings file:** `agentic_QA_2026-09-08-1929.md` at repo root. One stamped file for the
  whole run; append on discovery, never buffer.
- **Do not re-file:** OI-156, OI-157, OI-158, OI-159, OI-160, OI-161, OI-162.
- **Out of scope (do not test, do not report as a gap):** `past_due` downgrade, Google OAuth,
  `DeepRevealPane` and its auth/checkout CTAs, webhook payload drift.
- **Sign in** = the `🛠 Dev: skip auth` button at the bottom of `AuthModal`. There is no
  email/password or magic-link sign-in — its absence is NOT a bug.
- **Full reset** = Settings → `🛠 Dev: clear IndexedDB & sign out`. A bare sign-out is NOT a reset.
- **After ANY direct tier/DB change, reload the page before judging the UI.** The entitlement
  cache is module-scoped (`src/lib/entitlement.js`); `invalidateEntitlement()` is soft and can
  re-pin a stale `entitled: true`.
- **Rate limit:** 120 req/min per IP, shared with the browser. A 429 body is **plain text** and
  surfaces as an opaque JSON-decode error with **no server log line**. Suspect it first.
- **Coordinates 0-indexed** (row 0 = bottom, col 0 = leftmost) everywhere except the UI, which
  shows 1-based. Never reason about a movestring by hand — `./visualize_board.sh <movestring>`.
- **Two players only:** `X` = P1 = **green** = code string `'red'`; `O` = P2 = **gray** = code
  string `'yellow'`. In findings, say green/gray.
- **Suite:** `npm run test:fast` inside `connect-four/` only. Baseline 1785 tests / 271 suites /
  0 fail. ESLint runs first — "0 tests ran" means a lint error.
- **Screenshots only for a confirmed visual defect**, one per defect, written to disk with
  `take_screenshot filePath=<scratchpad>/<slug>.png`. Never to confirm a page loaded.
- **`grep` lies about several `.jsx` files.** `grep` here is `ugrep`, and it treats files containing
  multibyte characters (em-dashes in comments) as binary, returning **zero matches with no warning**.
  `PricingScreen.jsx` was silently dropped this way in two independent passes of the 2026-09-08 audit.
  Always use `grep -a` when checking a claim against `connect-four/src`. A zero-match result is not
  evidence of absence until you have re-run it with `-a`.
- **The plan's correctness record lives at the end of this file** — see
  `## Coverage audit (2026-09-08)` for the screen/affordance/endpoint inventory, the 21 factual
  claims that were corrected, and the three that remain `UNVERIFIED`. Read §4 and §5 before trusting
  any number in this plan.

---

## Verified environment facts (harvested 2026-09-08, cite these — do not re-derive)

| Fact | Source |
|---|---|
| Ports 4799 / 6799, both already up | `./worktree-ports.sh`; curl 200 |
| `connect-four/node_modules` present; `.env.local` + `server/.env` present | `ls` |
| Local DB is **populated**: 34 users, 20 games, 890 blunders, 48 lesson_progress, 18 puzzle_attempts | service-role count query |
| Puzzle pool is **full** — every category 20–100 rows (`immediate_threat` 66, `forced_block` 100, `double_threat` 100, `forced_win` 21, `forbidden_columns` 40, `odd_even_threat` 20, `z_threat` 20, `claimeven` 20, `undercut` 25, `overcut` 49, `figure_7` 21, `j_shape` 20) | `GET /api/puzzles/counts` |
| Challenge sets: 8 free (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `forbidden_columns`, `odd_even_threat`, `forced_win`), 4+ paid (`mixed`, `undercut`, `overcut`, `figure_7`…) | `GET /api/puzzles/counts` `.sets` |
| **Lessons 1–10 are `free: true`; lessons 11–15 are `free: false`** | `connect-four/lessons/*.json`, `GET /api/lessons` |
| Lesson slide counts: L1 4, L2 4, L3 10, L4 5, L5 3, L6 4, L7 4, L8 4, L9 4, L10 4, L11 5, L12 4, L13 4, L14 4, L15 3 = **66 slides total** (re-summed 2026-09-08; the earlier "62" was an arithmetic error — the per-lesson numbers were and are right) | `lessons/*.json`, `node -e` sum over `slides.length` |
| Lessons **with** a confirmation challenge (embedded inline, not DB-sourced): L1(4), L2(2), L6(4), L7(2), L8(2), L9(2), L11(2), L12(2), L13(2), L14(2). **L3, L4, L5, L10, L15 have none** | `confirmationChallenges` key (verified 2026-09-08 by counting the array in each file) |
| Lesson ids (needed for `/concept/<lessonId>` direct URLs, they are **not** numbers): `immediate-threat, block-before-build, threat-vocabulary, opening-centre, opening-imitate, the-fork, odd-rows-belong-to-red, claimeven, z-threats, zugzwang-tempo, undercut, overcut, figure-7, j-shape, opening-sharp` (order 1…15) | `lessons/*.json` `id`/`order` |
| Lesson flow: `concept` → `socratic` (`ConceptScreen.jsx:116` `go('socratic', { lessonId });`) → `clchallenge` (`ConceptScreen.jsx:121`) → `saga` (`ConceptScreen.jsx:131`); Socratic also jumps straight to `clchallenge` (`SocraticScreen.jsx:96`) | verified 2026-09-08 |
| Lock derivation: `deriveLockReason()` → `'none'\|'tier'\|'order'\|'both'\|'signin'`; **signed-out collapses tier/order to `'signin'`** (`sagaLock.js:27` — `if (!authenticated && (tierLocked \|\| orderLocked)) return 'signin';`); a **completed** lesson short-circuits to allowed (`sagaLock.js:64` — `if (isDone) return 'allowed';`) | `src/screens/sagaLock.js:18-33` (`deriveLockReason`), `:38-43` (`dispatchLockAction`), `:59-67` (`deriveLessonAccess`) — **corrected**, the old "19-67" was one span over three functions |
| Unlock is **pairwise**: lesson N unlocked iff the lesson with the next-lower `order` has `status === 'complete'` — `sagaLock.js:24-25`: `const orderLocked = predecessor !== null &&` / `    !progress.some(p => p.lessonId === predecessor.id && p.status === 'complete');` | **corrected** from `:25-27` |
| **20** routes in `URL_MAP` (`urlMapping.js:7-29`, counted); `summary` and `game` are `SESSION_ONLY_SCREENS` (`urlMapping.js:37` — `export const SESSION_ONLY_SCREENS = new Set(['summary', 'game']);`) | **corrected** from "21 routes … `:6-38`" |
| `parseUrl` unknown-path fallback is `urlMapping.js:103` — `  return { screenKey: 'home', params: {} };` | **corrected** from `:98` (which is `return { screenKey, params };`, the *match* branch) |
| `/mistakeDetail/:category` → **MistakesListScreen** (a list); `/blunder/:id` → **MistakeDetailScreen** (the detail). `screenRegistry.jsx:37` — `  mistakeDetail: (p) => <MistakesListScreen {...p} />,`; `:38` — `  blunderDetail: MistakeDetailScreen,` | **new row** — the plan previously attributed `MistakeDetailScreen.jsx:530` to `/mistakeDetail/<category>` |
| 7 in-scope login-CTA sites (6 distinct screens; Home has two): `HomeScreen.jsx:64` (avatar) + `:136` (Past games card), `StatsScreen.jsx:151`, `SagaScreen.jsx:254`, `MistakeDetailScreen.jsx:530` (**at `/blunder/<id>`**), `OnboardingMissionScreen.jsx:76`, `OnboardingImportOfferScreen.jsx:72`. An 8th, `DeepRevealPane.jsx:162`/`:201`, is **out of scope** | `grep -a setAuthOpen\(true\)/setSigninOpen\(true\)` 2026-09-08 |
| 5 in-scope checkout-CTA sites: `SettingsScreen.jsx:48` (`const handleUpgrade = useUpgradeCheckout('/settings');`), `SagaScreen.jsx:154`, `SetPickerScreen.jsx:46`, `PostSetSummaryScreen.jsx:22` (`useUpgradeCheckout('/setpicker')`), `PricingScreen.jsx:31`. A 6th, `DeepRevealPane.jsx:62`, is **out of scope** | `grep -a "useUpgradeCheckout("` 2026-09-08. **Trap:** plain `grep` treats several of these `.jsx` files as binary (em-dashes) and silently drops `PricingScreen.jsx` — use `grep -a` |
| **Only 3 of the 5 upgrade CTAs are tier-gated.** `SettingsScreen.jsx:549` — `{tier === 'paid' ? (` — swaps the CTA for a billing-portal button. `SagaScreen.jsx:250-256` gates via `deriveLockReason(…, tier, …)`. `PostSetSummaryScreen.jsx:124` fires only `else if (isProLesson && isFreeUser)`. **`SetPickerScreen` and `PricingScreen` are NOT tier-aware** — `SetPickerScreen.jsx:173-177`: `set.free ? () => go('challenge', …) : () => setUpgradeOpen(true)` keys off the **static** `CHALLENGE_SETS` constant, and `PricingScreen.jsx:221` renders `onClick={handleCheckoutClick}` unconditionally | **new row; corrects "four of them disappear at paid tier"** |
| `successUrl` is deliberately **never** passed to `Paddle.Checkout.open()` — the overlay closes in place, there is no landing page. `useUpgradeCheckout.js:161-163`: `// create-checkout contract (server-side open-redirect guard via` / `// sanitizeReturnPath) but is deliberately NOT forwarded to` / `// Paddle.Checkout.open() below`; the actual call is `useUpgradeCheckout.js:172` | **corrected** from `:160-170` |
| Post-login destination is `consumeReturnTo()` at `App.jsx:143` (`const dest = consumeReturnTo();`), navigated at `:145`; the no-stash fallback is `App.jsx:155` — `if (shouldRouteHomeAfterSignIn({ screenKey: screenRef.current, hasStashedDestination: false })) {` | `src/App.jsx` |
| **`shouldRouteHomeAfterSignIn` returns true for exactly ONE screen.** `onboardingRouting.js:38` — `export const ANONYMOUS_ONLY_SCREENS = new Set(['onboardingMission']);` and `:70-71` — `  if (hasStashedDestination) return false;` / `  return ANONYMOUS_ONLY_SCREENS.has(screenKey);`. ⇒ signing in from **home**, **saga** or **blunderDetail** routes **nowhere**: the user stays on the origin route | **new row** — the plan previously left these three destinations as "whatever `App.jsx:155` decides" |
| Only 3 of the 7 login CTAs stash a destination: Home's Past-games card→`'pastGames'` (`HomeScreen.jsx:135`), Stats→`'stats'` (`StatsScreen.jsx:150`), ImportOffer Accept→`'settings'` (`OnboardingImportOfferScreen.jsx:71`). Home's avatar, Saga's, MistakeDetail's stash nothing **and are not anonymous-only ⇒ they stay put**; OnboardingMission's stashes nothing **and IS anonymous-only ⇒ it goes home** | `grep -a stashReturnTo`, `App.jsx:148-156`, `onboardingRouting.js:38` |
| `go()` **pushes** (`App.jsx:119` — `window.history.pushState({ screenKey: key, params: newParams }, '', buildUrl(key, newParams));`). `goReplace()` replaces (`App.jsx:131`). Boot-time replaces at `App.jsx:80` and `:98` | **corrects** the plan's "`go()` uses `history.replaceState` in one path (`App.jsx:131`)" |
| **GameScreen has no undo control.** Its `Toolbar` is exactly: hint toggle (`GameScreen.jsx:221`), resign (`:238`), onboarding-only skip (`:255`), SFX (`:271`), music (`:287`), speech (`:303`). `grep -ria undo src/` returns only admin-editor and `movestring.js` hits | **new row; corrects Task C6's "use undo at least twice"** |
| Every sparring game ends on **`review`** — `onboardingGameEnd.js:23-25`: `export function pickGameEndScreen() {` / `  return 'review';`, called at `GameScreen.jsx:107`. The onboarding import offer is reached from a CTA **on ReviewScreen** (`ReviewScreen.jsx:517` — `onClick={() => go('onboardingImportOffer')}`), not directly from the game | **new row** |
| Challenge sets: **8 free** and **5 paid** (`mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`) — `server/challengeSets.js:4-18`, `free: false` on the last five | **corrected** from "4+ paid" |
| `pendingSetResults` shape `{nonce, results, category, savedAt}` is written by `savePendingSetResults` at `src/lib/pendingSetResults.js:33-40` | **corrected** from `:36-44` |
| `UpgradeModal` clears a stuck `'loading'` on overlay dismiss at `UpgradeModal.jsx:80-82` — `    function handleDismissed() {` / `      if (uiState === 'loading') setUiState('idle');` | **corrected** from `:78` (a comment line) |
| `/terms`, `/privacy`, `/refunds`, `/pricing-legal`, `/legal.css` are **Express-served static HTML** (`server/index.js:4109,4110,4115,4116,4123`) and **are proxied under `npm run dev`** (`vite.config.js` `proxy` block: `'/terms': …`, `'/privacy': …`, `'/refunds': …`, `'/pricing-legal': …`, `'/legal.css': …`). `/pricing` is deliberately **NOT** proxied — it is the in-app SPA route | **new row** |
| `AuthModal`'s Google button hardcodes `http://localhost:3001` in DEV (`AuthModal.jsx:47` — `const oauthBase = import.meta.env.DEV ? 'http://localhost:3001' : API;`), i.e. **the wrong port for this worktree (4799)**. Google OAuth is out of scope — do **not** file this, and do not mistake a failed Google redirect for an app bug | **new row** |

---

## State map — what each group costs to enter

| Group | Prerequisite state | How to enter | Cost |
|---|---|---|---|
| **A** | signed out, fresh IndexedDB | Settings → `🛠 Dev: clear IndexedDB & sign out` | 1 reset |
| **B** | signed out, fresh — **once per task** | same, repeated | 7 resets |
| **C** | signed in, tier `free` | `🛠 Dev: skip auth` from A's end state | free |
| **D** | signed in, tier `paid` | one real sandbox purchase | 1 checkout |
| **E** | signed in, tier `free` again | `POST /api/admin/qa-rollback` + **reload** | 1 rollback |
| **F** | any (mobile viewport) | `resize_page` 390×844 | free |

Ordering rationale: A and B are all the signed-out work, batched so the 8 resets (1 for A, 7 for B)
happen consecutively. C holds the bulk of the run (free-tier everything) in one uninterrupted session.
D flips to paid exactly once. E flips back exactly once. F is a viewport-only re-walk that
needs no state change.

---

## Task 0: Bring up the environment and open the findings file

**Prereq:** none.
**Entry point:** shell at the worktree root.

- [ ] `eval "$(./worktree-ports.sh)"`; confirm `API_PORT=4799 VITE_PORT=6799`.
- [ ] Health-probe the API: `curl -s -o /dev/null -w '%{http_code}' http://localhost:$API_PORT/api/puzzles/counts` — any non-`000` = up.
- [ ] Relaunch the API under a readable log so evidence is capturable:
      `lsof -ti tcp:$API_PORT | xargs kill` → `: > "$LOG_PATH"` →
      `cd connect-four && node --env-file=server/.env server/index.js > "$LOG_PATH" 2>&1 &`
      Wait for `Connect4 server running on port 4799`.
- [ ] Create `agentic_QA_2026-09-08-1929.md` at repo root from `.claude/skills/app-qa/references/bug-template.md`, with a task table pre-seeded with every task id below.
- [ ] `new_page` → `navigate_page` to `http://localhost:6799`.

**PASS:** API answers, Vite serves, app renders a screen, findings file exists.
**FAIL:** either server down and not relaunchable; app renders a blank/error boundary at `/`.

---

# GROUP A — signed-out, fresh IndexedDB (1 reset)

## Task A1: Cold-boot first-run routing

**Goal (observable):** A user with `session === null` and no `onboarding_status` lands on the
onboarding **mission** screen — not Home, and with **zero intermediate screens** flashing.
**Prereq:** fresh reset (Settings → `🛠 Dev: clear IndexedDB & sign out`).
**Entry point:** `http://localhost:6799/`.

- [ ] Reset, then hard-reload `/`.
- [ ] `take_snapshot`; confirm the mission screen, not Home.
- [ ] Cold-boot each `SESSION_ONLY_SCREENS` URL directly: `/game`, `/summary`.
- [ ] Cold-boot 3 unknown URLs: `/nonsense`, `/game/`, `/blunder/` .
- [ ] `list_console_messages` + `list_network_requests` (`resourceTypes:['xhr','fetch']`, `pageSize:20`).

**PASS:** mission screen on `/`; `/game` and `/summary` redirect to `/`; unknown paths render Home
(`parseUrl` fallback, `urlMapping.js:98`) without a crash; no uncaught console errors; no 4xx/5xx XHR.
**FAIL:** Home flashes before the redirect; any route renders a blank screen or error boundary;
any uncaught exception.

## Task A2: Onboarding mission → first game → import offer

**Goal:** A signed-out first-run user can complete the whole onboarding chain and land somewhere
coherent, with the game playable and the import offer's three exits all working.
**Prereq:** A1's end state (signed out, on the mission screen).
**Entry point:** the mission screen's primary CTA (`OnboardingMissionScreen.jsx:106`).

- [ ] Read the mission copy — is it coherent and free of untranslated keys?
- [ ] Start the mission game; play to a natural end (win, loss or draw). Watch for illegal moves,
      wrong terminal detection, coach text contradicting the board.
- [ ] Verify the import-offer screen appears (`onboardingImportOffer`).
- [ ] Exercise **Decline** → expect Home (`OnboardingImportOfferScreen.jsx:78`).
- [ ] Reset; redo; exercise **Skip** (`onboardingSkipHandlerRef`).
- [ ] Console/network read after each transition.

**PASS:** every leg reaches its screen; the game accepts only legal moves and detects the terminal
correctly (cross-check the final movestring with `./visualize_board.sh`); Decline → Home; Skip →
its documented destination; no console errors.
**FAIL:** any dead CTA, wrong destination, illegal move accepted, wrong win/draw call, or raw i18n
key rendered.

## Task A3: All 7 login CTAs — **dismiss** exit

**Goal:** Dismissing `AuthModal` from each of the 7 in-scope sites returns the user to the **exact
origin screen** with no stranded state and no leaked stashed destination.
**Prereq:** signed out. Dismiss does not change state, so all 7 run in one session — `clearReturnTo()`
fires on dismiss (`AuthModal.jsx:14-17` — `  function handleDismiss() {` / `    clearReturnTo();` /
`    onClose();`), so **verify `sessionStorage.postLoginReturnTo` is absent after each dismiss** via
`evaluate_script`.
**Entry points (7 — routes corrected 2026-09-08):**
1. `/` avatar — `HomeScreen.jsx:64`
2. `/` Past games card — `HomeScreen.jsx:136`
3. `/stats` signup prompt — `StatsScreen.jsx:151`
4. `/saga` locked node — `SagaScreen.jsx:254`
5. **`/blunder/<id>`** — "What should I have played?" once the free anon reveal is spent,
   `MistakeDetailScreen.jsx:530`. **NOT `/mistakeDetail/<category>`**: that URL renders
   `MistakesListScreen` (`screenRegistry.jsx:37` — `  mistakeDetail: (p) => <MistakesListScreen {...p} />,`),
   which has no auth CTA. Get a real id by `/mistakes` → a category card
   (`CategoryListScreen.jsx:151`) → a blunder card (`MistakesListScreen.jsx:237`).
6. onboarding mission avatar — `OnboardingMissionScreen.jsx:76`
7. import-offer **Accept** — `OnboardingImportOfferScreen.jsx:72`

- [ ] For each site: open the modal and confirm it renders **exactly three** controls in dev —
      "Continue with Google" (`AuthModal.jsx:43`), dismiss (`:53`), `🛠 Dev: skip auth`
      (`:59`, DEV-gated). Record the `reason` string; only Saga passes one
      (`SagaScreen.jsx:331` — `          reason={t('saga.lock.signInReason')}`), the rest fall back to
      `t('auth.subtitle')` (`AuthModal.jsx:37`).
- [ ] Dismiss via the dismiss button; re-open and dismiss via the backdrop
      (`AuthModal.jsx:21` — `      <div className="sheet-backdrop" onClick={handleDismiss}></div>`).
- [ ] After each dismiss: `evaluate_script` → `[location.pathname, sessionStorage.getItem('postLoginReturnTo')]`.

**PASS:** for all 7 sites × both dismiss paths, `location.pathname` string-equals the pathname
recorded immediately before opening the modal; `sessionStorage.getItem('postLoginReturnTo') === null`;
no node with the auth-modal card remains in the a11y snapshot; and one further click on any control
of the origin screen produces a DOM change (proving no dead overlay).
**FAIL:** any pathname differing from the recorded origin; a non-null `postLoginReturnTo`; the modal
still present in the snapshot after the dismiss click; an origin-screen control whose click produces
no DOM change.

## Task A4: Signed-out Settings, the legal pages, and `/pricing`

**Goal:** The signed-out-reachable surfaces that no other task touches — the unauthenticated Settings
branch, the four static legal pages, and `/pricing` — all render real content.
**Prereq:** signed out (A3's end state; **no extra reset**).
**Entry point:** `/` → TopBar gear (`HomeScreen.jsx:79` — `        onRight2={() => go('settings')}`;
this deliberately does **not** gate on auth, per the comment at `HomeScreen.jsx:73-78`).

- [ ] `/settings` signed out renders the unauthenticated branch (`SettingsScreen.jsx:392` —
      `  if (!isAuthenticated) {`): the sign-in prompt copy, "Replay intro" (`:403`), and the dev
      block. Assert the Papergames form is **absent** — it exists only in the authenticated branch.
- [ ] Tap "Replay intro" → assert the mission screen renders **and** `location.pathname === '/'`.
      (`handleReplayIntro` is `go('onboardingMission', …)`, `SettingsScreen.jsx:32-34`;
      `onboardingMission` has no `URL_MAP` entry so `buildUrl` returns `'/'`, `urlMapping.js:82`.
      A `/` URL showing mission content is CORRECT here — do not file it.)
- [ ] From `/` use the LegalFooter (`HomeScreen.jsx:154` — `      <LegalFooter go={go} />`): click
      **Pricing** (`LegalFooter.jsx:42` — in-app `go?.('pricing')`), then navigate to each of
      `/terms`, `/privacy`, `/refunds`, `/pricing-legal` (`LegalFooter.jsx:21-24`, plain `<a href>`
      full-page navigations; all four are Vite-proxied to the API — see the facts table).
- [ ] For each legal page assert a 200 in `list_network_requests` **and** styled content:
      `document.title` non-empty, `document.body.innerText.length > 200`, and the request for
      `/legal.css` returned 200.

**PASS:** the signed-out Settings branch shows Replay intro + dev block and no Papergames form;
Replay intro reaches the mission screen; all four legal URLs return 200 with >200 chars of body text
and a 200 for `/legal.css`; `/pricing` renders the SPA PricingScreen (a monthly/annual toggle is
present — `PricingScreen.jsx:158`), not the static page.
**FAIL:** a legal URL that 404s, white-screens, or whose `/legal.css` request did not return 200;
`/pricing` rendering the static `pricing.html` (no plan toggle); Replay intro not reaching the
mission screen; a Papergames form rendered to a signed-out visitor.

---

# GROUP B — 7 × (reset → one login CTA → **complete** exit)

Each task: full reset first, so the CTA is exercised from a genuine signed-out state, then sign in
with `🛠 Dev: skip auth`, then assert the landing screen against **that CTA's own contract**
(harvested above — do not assume).

## Task B1: HomeScreen "Past games" card → complete
**Contract (read at source):** `HomeScreen.jsx:135` stashes `'pastGames'`; `App.jsx:143-146`
consumes it. **Expected landing: `/pastGames`.**
- [ ] Reset → `/` → Past games card → `🛠 Dev: skip auth`.
- [ ] `evaluate_script` → `location.pathname`.
**PASS:** `/pastGames`, list renders (20 games exist), `postLoginReturnTo` consumed (null).
**FAIL:** anything else, incl. landing on `/` (would mean the stash was cleared or not consumed).

## Task B2: HomeScreen avatar → complete
**Contract (read at source, resolved 2026-09-08):** `HomeScreen.jsx:60-66` (`handleProfile`) stashes
**nothing**, so `App.jsx:155`'s `shouldRouteHomeAfterSignIn` decides — and it returns
`ANONYMOUS_ONLY_SCREENS.has('home')` (`onboardingRouting.js:71`), where
`onboardingRouting.js:38` is `export const ANONYMOUS_ONLY_SCREENS = new Set(['onboardingMission']);`.
⇒ **false ⇒ no navigation. Expected landing: still `/`.**
- [ ] Reset → `/` → avatar → skip auth → record `location.pathname`.
- [ ] Tap the avatar again while signed in.
**PASS:** `location.pathname === '/'` after sign-in, the Home screen is rendered (not a blank
frame), and the **second** avatar tap navigates to `/stats` (`HomeScreen.jsx:62` — `      go('stats');`)
rather than re-opening `AuthModal`.
**FAIL:** any pathname other than `/`; the avatar re-opening `AuthModal` while `session` is truthy.

## Task B3: StatsScreen signup prompt → complete
**Contract:** `StatsScreen.jsx:150` stashes `'stats'`. **Expected landing: `/stats`**, now showing
the signed-in variant (Review-mistakes + Sign-out buttons, `StatsScreen.jsx:140-160`).
- [ ] Reset → `/stats` → signup prompt → skip auth.
**PASS:** stays on `/stats`; the `!isAuthenticated` prompt is gone and the signed-in controls render.
**FAIL:** route change, or the prompt still rendered after sign-in (stale `isAuthenticated`).

## Task B4: SagaScreen locked node → complete
**Contract:** `SagaScreen.jsx:254` (`dispatchLockAction === 'signin'`) stashes nothing, and `'saga'`
is not in `ANONYMOUS_ONLY_SCREENS` ⇒ **expected landing: still `/saga`** (no navigation).
**Note OI-157 is already filed for SagaScreen's stale entitlement after in-place sign-in — do NOT
re-file it.** Report only *new* deviations.
- [ ] Reset → `/saga` → tap a node that is locked for a signed-out visitor → confirm the modal is
      `AuthModal` with `reason = saga.lock.signInReason` (NOT `UpgradeModal`) → skip auth.
- [ ] Also tap **lesson 1** (`order: 1`, `free: true`, no predecessor ⇒ `deriveLockReason` returns
      `'none'`, `sagaLock.js:32`) while signed out and assert it navigates straight into
      `/concept/immediate-threat` with **no** modal.
**PASS:** an `AuthModal` (not an upgrade modal) opens for every locked node while signed out
(`sagaLock.js:27`); lesson 1 opens with no modal; `location.pathname === '/saga'` after skip-auth.
**FAIL:** an UpgradeModal shown to a signed-out visitor; lesson 1 opening any modal; a pathname
other than `/saga` after sign-in.

## Task B5: MistakeDetailScreen "Sign in to unlock" → complete
**Contract:** `MistakeDetailScreen.jsx:530` (`onClick={() => setAuthOpen(true)}`) stashes nothing, and
`'blunderDetail'` is not in `ANONYMOUS_ONLY_SCREENS` ⇒ **expected landing: still `/blunder/<id>`**.
**Route corrected 2026-09-08:** this screen is served at **`/blunder/:id`**
(`screenRegistry.jsx:38` — `  blunderDetail: MistakeDetailScreen,`), not `/mistakeDetail/:category`.
- [ ] Reset → `/mistakes` → open a category card (`CategoryListScreen.jsx:151`) → on
      `/mistakeDetail/<category>` open a blunder card (`MistakesListScreen.jsx:237`) → you are now on
      `/blunder/<id>` → exhaust the free anon reveal so the gated variant renders → the sign-in
      button → skip auth.
- [ ] Record the exact `<id>` before signing in.
**PASS:** the `AuthModal` opens; `location.pathname` after skip-auth string-equals the
`/blunder/<id>` recorded before; and the primary CTA on that screen is now the ungated
"What should I have played?" (`MistakeDetailScreen.jsx:509` — `onClick={() => setDeepRevealOpen(true)}`)
**without a manual reload** — assert by the button's accessible name changing, not by opening the pane
(Deep Reveal itself is out of scope).
**FAIL:** wrong/absent modal; a pathname other than the recorded `/blunder/<id>`; the CTA still the
gated `setAuthOpen` variant after sign-in (report the stale-state mechanism, not just the symptom —
and check it is not a duplicate of OI-157's cache).

## Task B6: OnboardingImportOffer "Accept" → complete
**Contract:** `OnboardingImportOfferScreen.jsx:71` stashes `'settings'`. **Expected landing: `/settings`.**
- [ ] Reset → drive onboarding to the import offer → Accept → skip auth.
**PASS:** `/settings`, with the Papergames connect section reachable.
**FAIL:** anything else.

## Task B7: OnboardingMission avatar → complete (the ONE screen that routes home)
**Contract:** `OnboardingMissionScreen.jsx:76` (`onRight={() => setAuthOpen(true)}`) stashes nothing,
**but `'onboardingMission'` IS the sole member of `ANONYMOUS_ONLY_SCREENS`**
(`onboardingRouting.js:38`) ⇒ `shouldRouteHomeAfterSignIn` returns **true** ⇒ **expected landing: `/`,
showing Home** (not the mission screen). This is the only one of the 7 CTAs that navigates.
It was previously folded into B2's note; it needs its own reset because it is the **only** case that
can distinguish "routes home" from "stays put", and B2 asserts the opposite outcome.
- [ ] Reset → land on the mission screen (A1's auto-route) → tap the TopBar avatar → skip auth.
- [ ] `evaluate_script` → `location.pathname`.
**PASS:** `location.pathname === '/'` **and** the Home feature cards render (Lessons/Challenges/
Sparring/Past games) — i.e. the mission screen is gone. A byte-identical screen before and after
sign-in is the exact regression `App.jsx:148-156`'s comment says this code exists to prevent.
**FAIL:** still on the mission screen after a successful sign-in; a pathname other than `/`.

---

# GROUP C — signed in, tier `free` (one session, no state flips)

Enter once via `🛠 Dev: skip auth`. **Verify the tier is `free`** before starting
(`evaluate_script` on the entitlement/profile, or a service-role select on the session's user id).

## Task C1: Lessons 1–4 (free), full completion
**Goal:** Each of L1–L4 renders every slide, its Socratic step accepts the right column and
rejects wrong ones, its confirmation challenge is completable, and the **content is factually
correct and consistent with the board shown**.
**Entry:** `/saga` → node 1. Order matters — unlock is pairwise (`sagaLock.js:25`).
**Slides to read: L1 4, L2 4, L3 10, L4 5.** L1/L2 have confirmation challenges (4 and 2); **L3 and
L4 have none** — do not report their absence as a bug.
- [ ] For each slide: read `infoProse` and the coach messages against the rendered board; for any
      concrete board claim (a threat, a column, a win), verify with
      `./visualize_board.sh <slide.movestring>` before accepting or rejecting it.
- [ ] Socratic: play the stated correct column (accept) **and** at least one wrong column (reject).
- [ ] Confirmation challenge: complete it; then verify `lesson_progress` has a `status='complete'`
      row for that lesson id (service-role select) — the UI can mis-render.
- [ ] Where audio is present (`infoProseAudio`), play it and confirm it matches the on-screen text.
**PASS:** every slide renders with no clipped/overflowing text, no raw i18n key, no unrendered
field; every board claim verified true; Socratic accepts correct / rejects wrong; the DB row is
`complete`; the next node unlocks.
**FAIL:** a false or incoherent board claim; a Socratic step that accepts a wrong column or rejects
the right one; a lesson that cannot be completed; a `complete` UI state with no DB row.

## Task C2: Lessons 5–7 (free), full completion
Same procedure. **Slides: L5 3, L6 4, L7 4.** Confirmation challenges: L6 (4), L7 (2); **L5 has none.**
L7 (`odd-rows-belong-to-red`) makes parity claims — cross-check each with the `par` row of
`./visualize_board.sh` and with `docs/knowledge-base/` for the named concept before judging.
**PASS/FAIL:** as C1.

## Task C3: Lessons 8–10 (free), full completion
Same procedure. **Slides: L8 4, L9 4, L10 4.** Confirmation challenges: L8 (2), L9 (2); **L10 has none.**
L8 `claimeven` and L9 `z-threats` name canonical concepts — read
`docs/knowledge-base/claimeven.md` / the z-threat entry (`docs/knowledge-base/README.md` lists the
exact prefixed slugs; the unprefixed filename never exists) and check the lesson's predicate
against the KB's `formal_predicate` before calling it correct **or** wrong.
**PASS/FAIL:** as C1. After C3, lesson 10 is complete ⇒ lesson 11 is order-unlocked but tier-locked.

## Task C4: Saga tier-lock behavior at free tier (lessons 11–15)
**Goal:** With L1–L10 complete and tier `free`, nodes 11–15 are **tier-locked**, and each tap opens
an `UpgradeModal` (`dispatchLockAction('tier') === 'upgrade'`, `sagaLock.js:38`), never a sign-in
modal and never the lesson.
- [ ] Tap each of 11–15 → assert UpgradeModal.
- [ ] Direct-URL guard: navigate to `/concept/undercut`, `/socratic/undercut`, `/clchallenge/undercut`
      → expect a `goReplace('saga', { lockAction: 'upgrade' })` bounce (`ConceptScreen.jsx:60`,
      `SocraticScreen.jsx:67`, `CLChallengeScreen.jsx:49`). **Lesson ids are slugs, not numbers** —
      the paid five are `undercut`, `overcut`, `figure-7`, `j-shape`, `opening-sharp`.
- [ ] **Order-lock branch (previously untested).** Before completing anything in a fresh account,
      tap lesson **3** while lesson 2 is incomplete: `deriveLockReason` returns `'order'`
      (`sagaLock.js:31`) → `dispatchLockAction` returns `'orderLock'` (`sagaLock.js:41`) →
      `SagaScreen.jsx:258` `setOrderLockOpen(true)` shows a **toast, not a modal**
      (`SagaScreen.jsx:290-315`, copy key `saga.orderLock.message`). Assert (a) the toast text is a
      resolved string, not the raw key; (b) it disappears on tap (`SagaScreen.jsx:293` —
      `          onClick={() => setOrderLockOpen(false)}`); (c) it also self-dismisses on the 3.2 s
      timer at `SagaScreen.jsx:218` if left alone.
- [ ] Direct-URL order-lock: `/concept/threat-vocabulary` while lesson 2 is incomplete → expect the
      same bounce path, with `lockAction: 'orderLock'`.
**PASS:** all five paid nodes open an `UpgradeModal`; all three paid direct URLs land on `/saga`
(assert `location.pathname === '/saga'`) with an upgrade affordance visible; the order-locked node
shows the toast with resolved copy and both dismiss paths work.
**FAIL:** a paid lesson reachable at free tier by any of the three URLs (the lesson content renders);
an order-lock toast or sign-in modal where a tier lock applies, or an UpgradeModal where an order
lock applies; a raw `saga.orderLock.message` key on screen; a toast that never dismisses.

## Task C5: Challenge sets at free tier + PostSetSummary
**Goal:** All 8 free sets are enterable and completable; the **5** paid sets show an upgrade CTA;
finishing a set reaches `/summary`.
**Entry:** `/setpicker`.
- [ ] Enter and complete **one full free set** (`immediate_threat`) — every puzzle: correct answer
      accepted, a wrong answer rejected with coherent feedback. Also exercise **Hint**
      (`ChallengeScreen.jsx:983`), **Next** (`:1010`), and the three audio toggles (`:1035`, `:1052`,
      `:1069`). *Skip* "Learn more" (`:940`) — it opens `DeepRevealPane`, out of scope.
- [ ] **`forbidden_columns` has a different interaction model** and needs its own pass: columns are
      *multi-select toggles*, not single taps (`ChallengeScreen.jsx:860`/`:890` —
      `onColToggle={category === 'forbidden_columns' && phase === 'pre-move' ? …`), submitted by a
      dedicated button (`:965` — `onClick={handleForbiddenSubmit}`). Select, **deselect**, and submit.
- [ ] **Multi-move (`interaction_mode === 'sequence'`) puzzles need their own pass.** They route
      through `handleSequenceClick` (`ChallengeScreen.jsx:855`/`:885`), which POSTs
      `/api/puzzles/<id>/sequence/move` (`ChallengeScreen.jsx:636`) per ply and renders the engine's
      reply — a code path no single-move puzzle touches. Find one by watching
      `list_network_requests` for `sequence/move`; `forced_win` is the likeliest set. If **no**
      sequence puzzle appears in any free set, record that as "not exercised — no sequence-mode
      puzzle in the free pool", do **not** report it as a pass.
- [ ] Smoke-enter each of the other 6 free sets (`forced_block`, `double_threat`, `claimeven`,
      `z_threat`, `odd_even_threat`, `forced_win`) — first puzzle renders, board is legal, no console error.
- [ ] Tap each of the **5** paid sets (`mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`) →
      expect `setUpgradeOpen(true)` (`SetPickerScreen.jsx:176`).
- [ ] **Paid-set direct-URL guard (previously untested).** Navigate straight to
      `/challenge/undercut`. `ChallengeScreen.jsx` has **no tier guard at all** — unlike the three
      lesson screens, it never calls `deriveLessonAccess` (grep of `ChallengeScreen.jsx` for
      `entitle|deriveLessonAccess|requirePaid`: zero hits) — and the server's
      `GET /api/puzzles/draw` (`server/index.js:1609`) is registered with no gate middleware. So the
      expected-from-source outcome is **the paid set plays at free tier**. Record what actually
      happens; if it plays, file it as a **new** tier-bypass finding with this citation, not as a
      surprise.
- [ ] After the completed set: assert `/summary` renders with the results.
- [ ] Verify a `puzzle_attempts` row was written for a completed puzzle (service-role select) —
      **all four writers are fire-and-forget**, so a UI success can hide a swallowed write error;
      also delta-read `$LOG_PATH`.
**PASS:** all 8 free sets open and the first puzzle renders a legal board; `immediate_threat`
completes end-to-end; forbidden_columns select/deselect/submit works; all 5 paid sets open an
`UpgradeModal` from `/setpicker`; `/summary` renders with a result row per puzzle; a real
`puzzle_attempts` row exists for a completed puzzle; no error in the `$LOG_PATH` delta.
**FAIL:** a free set that won't open; a paid set opening its puzzles from `/setpicker`; a correct
answer marked wrong (verify with `./visualize_board.sh` before filing); a missing attempt row; a
`sequence/move` request that returns non-200 or leaves the board in an illegal state.

## Task C6: Sparring games (difficulty + side picker, board, toolbar, game end)
**Goal:** Several full games against the engine complete correctly, and every control the sparring
surface actually has is exercised.
**Entry:** `/` → Sparring card (`HomeScreen.jsx:119` — `            onClick={() => go('difficulty')}`)
→ `/difficulty` → Start (`DifficultyPickerScreen.jsx:213`) → `/game`.

> **Correction 2026-09-08 — there is no undo.** The previous version of this task said "use **undo**
> at least twice". `GameScreen`'s `Toolbar` contains exactly six controls: hint toggle (`:221`),
> resign (`:238`), onboarding-only skip (`:255`), SFX (`:271`), music (`:287`), speech (`:303`).
> `grep -ria undo connect-four/src/` returns only admin-editor and `movestring.js` hits — no player
> undo exists anywhere. Do not report its absence as a bug; do not test it.

- [ ] `/difficulty`: select **each** difficulty row (`DifficultyPickerScreen.jsx:56`, one per
      `DIFFICULTIES` entry) and **both** side options (`:161`, 2 per `SIDES`) — the side picker was
      previously untested and decides whether the user is P1 (green, `'red'`) or P2 (gray, `'yellow'`).
- [ ] Play **at least 3 full games** across different difficulties; aim for one win, one loss, one
      long/drawish game. Include **at least one game as the second player** so the parity/colour
      mapping is exercised in both directions.
- [ ] In each: attempt a move into a **full column** (must be refused — assert the disc count in
      that column is unchanged after the click); toggle **Hint** on and off and check the overlay
      columns it draws against `./visualize_board.sh`'s `scr` row; read the coach commentary against
      the board.
- [ ] Exercise **keyboard play** on at least one game: focus a column and press Enter, then Space
      (`Board.jsx:253` — `            onKeyDown={handleKeyDown}`; `Board.jsx:215` gates on
      `'Enter' | ' ' | 'Spacebar'` and then runs the same `handleClick` as a tap). A column that
      accepts a tap but not Enter/Space is an a11y defect.
- [ ] Exercise **Resign** (`GameScreen.jsx:238`) in one game and record where it routes and what
      result is persisted.
- [ ] Toggle SFX / music / speech and confirm each toggle's `aria-label` flips (`GameScreen.jsx:272`,
      `:288`, `:304`) — a stuck label means the state did not change.
- [ ] At the terminal position, capture the movestring and confirm the app's verdict with
      `./visualize_board.sh` (and `checkWin` semantics — a forced-win terminal reads FLAT in solver
      scores, so never judge the outcome from scores alone).
- [ ] End-of-game routing is **fixed at `review`**: `onboardingGameEnd.js:23-25` is
      `export function pickGameEndScreen() {` / `  return 'review';`, called from `GameScreen.jsx:107`
      via `goReplace(...)`. Assert `location.pathname === '/game/<id>'` after every game (a
      `goReplace`, so it must **replace** `/game` in history, not push).
- [ ] Verify the game row was persisted (`POST /api/games`, `GameScreen.jsx:72`) — a 200 in
      `list_network_requests` plus the id appearing in `/pastGames`.

**PASS:** every difficulty and both sides start a game; no move into a full column changes the board;
Enter and Space each drop a disc on a focused column; win/draw detection matches
`./visualize_board.sh` in every game; every audio toggle's `aria-label` flips; each game ends at
`/game/<id>` and its id appears in `/pastGames`; no coach line names a cell or column that the board
oracle contradicts.
**FAIL:** any of the above; a full-column click that adds a disc; a keyboard press that does nothing
where a tap works; `POST /api/games` non-200; a game absent from `/pastGames` after finishing.

## Task C7: Review / past games / mistakes / blunder detail
**Goal:** The whole "look at my history" chain renders and unwinds cleanly.
**Entry:** `/pastGames` (20 games), `/mistakes` (`CategoryListScreen`),
`/mistakeDetail/<category>` (`MistakesListScreen`), `/blunder/<id>` (`MistakeDetailScreen`),
`/game/<id>` (`ReviewScreen`). **Note the screen/route names are swapped** — see the facts table.
- [ ] `/pastGames`: exercise the **sort tabs** (`PastGamesListScreen.jsx:235`), the **filter chips**
      (`:265`, one per `FILTERS`), and **Load more** (`:314`) — assert the row count grows and the
      first row changes when the sort flips. Open a game (`:308`).
- [ ] `/game/<id>` (ReviewScreen): step forward/back with **Prev/Next mistake**
      (`ReviewScreen.jsx:470`/`:490`); click individual **move chips** (`:433`, one per analysed
      move) and check the rendered board matches the move list at that ply
      (`./visualize_board.sh` on the prefix); exercise **Share** (`:385`) and record what it does
      (clipboard / share sheet / nothing).
- [ ] `/mistakes` → a category card (`CategoryListScreen.jsx:151`) → `/mistakeDetail/<category>`:
      exercise the **filter tabs** (`MistakesListScreen.jsx:197`) → a blunder card (`:237`).
- [ ] `/blunder/<id>`: **"Play from here"** (`MistakeDetailScreen.jsx:475` → `handleStartFromHere`),
      including the **difficulty sheet** it can open (`:203` `setDiffPickerOpen(true)`, options at
      `:708`, start at `:789`, backdrop close at `:675`); **Mark reviewed** (`:581` — POSTs
      `/api/coach/queue/<id>/resolve`, `MistakeDetailScreen.jsx:283`) and confirm it persists across
      a reload; **Prev/Next blunder** (`:611`/`:644`); and the "back to game review" meta link
      (`:218` — `go('review', { id: mistakeSource.gameId })`).
- [ ] **Back-button chain:** home → pastGames → review → blunder → back → back → back must unwind to
      home without ping-ponging. **Corrected premise:** `go()` **pushes**
      (`App.jsx:119` — `window.history.pushState({ screenKey: key, params: newParams }, '', buildUrl(key, newParams));`);
      it is `goReplace()` that replaces (`App.jsx:131`). The replaces that can eat a back step are
      `GameScreen.jsx:107` (game → review) and the three lesson lock-guard bounces
      (`ConceptScreen.jsx:60`, `SocraticScreen.jsx:67`, `CLChallengeScreen.jsx:49`) — so test the
      chain **through a review reached from `/pastGames`** (a push) and separately **through a review
      reached from a just-finished game** (a replace), and expect them to differ by one step.
- [ ] Deep-reveal is **out of scope** — do not open `DeepRevealPane` (`MistakeDetailScreen.jsx:509`)
      or grade its content.
**PASS:** every listed control produces an observable change (row count, board ply, route);
mark-as-reviewed survives a reload (the flag is still set after `navigate_page` to the same URL); the
push-chain unwinds home in exactly the number of backs pushed, and the replace-chain in one fewer.
**FAIL:** any control with no observable effect; a board that disagrees with `./visualize_board.sh`
at the selected ply; a review flag lost on reload; a back chain that returns to a URL already
visited going backwards (a loop).

## Task C8: Settings (authenticated), Stats, and Pricing
**Prereq:** signed in, tier `free` (Group C's session).
- [ ] `/settings` authenticated branch (`SettingsScreen.jsx:414`+): type a Papergames id
      (`:436` `onChange`), **Save** (`:484` → `PUT /api/user/profile`, `SettingsScreen.jsx:149`),
      **Import games** (`:492` → `POST /api/user/papergames/import`, `:181`, then the status poll
      `GET /api/user/papergames/import/status`, `:210`), and **View imported games** (`:523` →
      `go('pastGames')`) once the import reports done. Record the import's terminal status.
      *(Known trap — do not re-file: Papergames skips are not duplicates, and reCAPTCHA blocks
      server-side login. An import that returns 0 games with a clean status is not automatically a bug.)*
- [ ] Language `<select>` EN↔ES (`SettingsScreen.jsx:573` — `onChange={(e) => changeLanguage(e.target.value)}`).
      Spanish falls back to English **silently**, so English text in ES mode is a real finding, not a
      crash. Re-walk `/`, `/saga`, one lesson slide, `/setpicker` and `/pricing` in ES.
- [ ] "Replay intro" (`SettingsScreen.jsx:535`, authenticated copy of `:403`) → mission screen.
- [ ] Confirm the **paid-only** billing-portal button is **absent** at free tier
      (`SettingsScreen.jsx:549` — `          {tier === 'paid' ? (`) and the upgrade CTA (`:554`) is present.
- [ ] `/stats`: signed-in variant renders the **coach lesson-recommendation CTA**
      (`StatsScreen.jsx:131` → `go('saga')`) and **Review mistakes** (`:139` →
      `go('mistakes', { navContext: 'stats' })`). Do **not** press **Sign out** (`:161`) here — it
      would end Group C's session; it is exercised at the end of Group F instead.
- [ ] `/pricing`: renders at free tier; the monthly/annual toggle (`PricingScreen.jsx:158`, 2
      buttons) changes the displayed price; the quota line resolves from `GET /api/limits`
      (`PricingScreen.jsx:82`) — note this fetch's success/failure is tracked **independently** of the
      price fetch (`PricingScreen.jsx:24-28`), so one degrading must not blank the other; the
      `/pricing-legal` link (`:249`) and the `LegalFooter` (`:254`) are present.
- [ ] Console + network read on each.
**PASS:** every listed control produces an observable change; `PUT /api/user/profile`,
`POST /api/user/papergames/import` and `GET /api/limits` all return 2xx; the plan toggle changes the
rendered price string; no raw i18n key (`/^[a-z]+\.[a-z]/` fragments in visible text) in either
language; no uncaught console error; no 4xx/5xx XHR other than an explained rate-limit 429.
**FAIL:** any of the above; the paid billing-portal button visible at free tier; an English string in
ES mode on any re-walked screen (file it, one entry per screen).

## Task C9: Play Online (Papergames live)
**Goal:** `/play-online` — a full screen with its own game loop that no other task drives — starts,
plays and finishes without breaking.
**Entry:** `/play-online` direct (there is no in-app link to it from Home; confirm that and record it).
- [ ] **Start** (`PlayOnlineScreen.jsx:545` → `POST /api/papergames/guest-registration` `:217`, then
      `GET /api/papergames/tournament/open` `:225`).
- [ ] If a match is found: play via the board (`:485` `onColumnClick={handleColumnClick}`); otherwise
      exercise **Resign** (`:511`) and **Retry** (`:497`/`:576`).
- [ ] On finish, assert the route becomes `/game/<id>` (`PlayOnlineScreen.jsx:158` — `go('review', { id });`)
      and that `POST /api/user/papergames/save-live-game` (`:143`) returned 2xx.
- [ ] Record whether the error state renders at all (`:576`) — both proxies talk to `papergames.io`
      and may be unreachable; an unreachable upstream is an **environment note**, not an app defect,
      but a *silent* failure with no error UI is a defect.
**PASS:** Start produces either a match or a rendered error state (never a blank screen or a spinner
that never resolves); if a game runs, it ends at `/game/<id>` with a 2xx save.
**FAIL:** a blank screen; an indefinite spinner with no error UI after the upstream call fails; a
finished game that does not reach `/game/<id>`; a non-2xx `save-live-game` with no user-visible error.

## Task C10: `/admin/*` — the second routing layer (smoke only)
**Goal:** The five admin pages, which the SPA router never sees, render without crashing on this
localhost origin.
**Why it is in scope at all:** `AdminLessonEditorScreen` / `AdminLessonListScreen` **are** routable —
`App.jsx:216-219` lazy-loads `AdminLessonsPage` for `/admin/lessons`, and `AdminLessonsPage.jsx:2-3`
imports both screens. The gate is `App.jsx:209-211` (`if (!isLocalhostOrigin()) { return <AdminBlockedPage />; }`),
and this QA run *is* on `localhost:6799`, so they are reachable. There is **no in-app link to
`/admin`** anywhere (no `go()`, no `<a href="/admin">`), so they are developer tooling, not product.
**Scope decision:** smoke only — render + one read-only control each. Full QA of the curation,
audio-generation and lesson-authoring workflows is **deliberately excluded** (they are destructive:
they write lesson JSON to disk, spend OpenAI TTS budget, and promote candidate rows).
**Prereq:** signed in, free tier (state-independent — these pages ignore tier).
- [ ] Navigate to each of `/admin`, `/admin/lessons`, `/admin/audio`, `/admin/deep-reveal-eval`,
      `/admin/fv-suff` (`App.jsx:212-227`).
- [ ] On `/admin/lessons`, click **Edit** on one lesson (`AdminLessonListScreen.jsx:106`) and then
      **← Back** (`AdminLessonEditorScreen.jsx:254`). **Do not** click Save (`:384`), Delete (`:406`),
      Generate audios (`:398`), or Prune orphaned audio (`AdminLessonListScreen.jsx:63`).
- [ ] Delta-read `$LOG_PATH` and `list_console_messages` after each page.
**PASS:** each of the five URLs renders a page with a visible heading and at least one control, none
renders `AdminBlockedPage`, and the Edit→Back round trip returns to the list. No uncaught console
error, no 4xx/5xx on the page's own admin XHR.
**FAIL:** a blank page or `Suspense fallback={null}` that never resolves (chunk load failure); an
`AdminBlockedPage` on localhost (would mean `isLocalhostOrigin()` is wrong); a 403 from a
`requireLocalhost` route; any uncaught exception.

## Task C11: Checkout CTAs — **open the overlay** from all 5 sites (still free)
**Goal:** Each of the 5 CTAs reaches a **live Paddle sandbox overlay**. Opening the overlay does not
change tier, so all 5 run in this one free session — **this is why they are here and not after the
purchase**: three of the five (Settings, Saga, PostSetSummary) become unreachable or change shape at
paid tier. **Corrected 2026-09-08:** the previous text said "four of them disappear at paid tier".
Only **three** are tier-gated — `SetPickerScreen` and `PricingScreen` render their upgrade CTA
regardless of tier (see the facts-table row). The ordering still holds, for the three that do.
- [ ] `SettingsScreen.jsx:554` (`onClick={() => setUpgradeOpen(true)}`) → UpgradeModal → Upgrade
      (`UpgradeModal.jsx:237`) → overlay opens.
- [ ] `SetPickerScreen.jsx:176` (a paid set) → overlay opens.
- [ ] `SagaScreen.jsx:256` (a tier-locked node, i.e. one of 11–15 after C3) → overlay opens.
- [ ] `PostSetSummaryScreen.jsx:124` — **this CTA has two preconditions the plan previously omitted.**
      `handleCTA` (`PostSetSummaryScreen.jsx:120-128`) opens the modal only on the
      `else if (isProLesson && isFreeUser)` branch: the set must be **imperfect** (a perfect set
      short-circuits to `go('setpicker')` at `:122`) **and** its recommended lesson must be a **Pro**
      lesson. So: finish a free set **deliberately getting at least one puzzle wrong**, and confirm
      the recommendation is one of lessons 11–15 before expecting the modal. If the recommendation
      lands on a free lesson, retry with a different category rather than filing a defect.
      Alternative entry: `/summary` is session-only with no stable URL — write a `pendingSetResults`
      entry (`{nonce, results, category, savedAt}`, written by `savePendingSetResults` at
      `src/lib/pendingSetResults.js:33-40`, max age 30 min) and navigate.
- [ ] `PricingScreen.jsx:221` (`onClick={handleCheckoutClick}`) → overlay opens. Also assert its
      local error state: `handleCheckoutClick` sets `checkoutError` in its `catch`
      (`PricingScreen.jsx:107-111`) — this is the only one of the five CTAs with its own error UI.
- [ ] `UpgradeModal`'s own plan toggle (`UpgradeModal.jsx:192`, 2 buttons) must change which
      `priceId` the subsequent `create-checkout` returns — check the request body's `plan` field.
- [ ] For each: confirm `POST /api/paddle/create-checkout` returns 200 with a `priceId`
      (`list_network_requests` filtered to xhr/fetch), and that the a11y tree penetrates the
      overlay iframe (email textbox / country combobox / Continue are addressable).
- [ ] Close each overlay without paying; confirm the `paddle:checkout-dismissed` event resets the
      modal's `uiState` to idle (the CTA must not stay disabled — `UpgradeModal.jsx:80-82`:
      `    function handleDismissed() {` / `      if (uiState === 'loading') setUiState('idle');` —
      corrected from the previous `:78`, which is a comment line).
**PASS:** all 5 open a real overlay; all 5 create-checkout calls 200; every dismiss returns the CTA
to a clickable idle state.
**FAIL:** an overlay that never opens (check for a synchronous `Paddle.Checkout.open` throw
swallowed by `UpgradeModal`'s `catch{}` at `UpgradeModal.jsx:70-72` — the mechanism is documented at
`useUpgradeCheckout.js:174-183`), a non-200 create-checkout, or a CTA permanently disabled after a
dismiss.

---

# GROUP D — one real sandbox purchase, then paid tier

## Task D1: Complete a sandbox purchase and assert in-place activation
**Goal:** A real sandbox payment completes and the app upgrades **in place**, with no manual reload.
**Prereq:** tier `free`, signed in. Seed an email first with `🛠 Dev: Set QA email`
(`qa-agent@example.test`) so the overlay has no `customer` collision.
**Entry:** the `SettingsScreen` CTA (its `returnPath` is `/settings`, `SettingsScreen.jsx:48`).
- [ ] Drive the overlay: email, country, card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC.
- [ ] Assert, in order: the overlay closes **in place**; the URL is still `/settings`; the
      `CheckoutReturnBanner` goes **confirming → activated**; the screen re-renders Pro
      **without a manual reload**. There is no post-payment landing page — its absence is not a bug.
- [ ] Verify server-side: `users.tier = 'paid'` **and** `paddle_customer_id` non-null for this
      user id (service-role select), and a `payment_events` row exists.
- [ ] Delta-read `$LOG_PATH` for the `verify-transaction` handling.
**PASS:** every assertion above.
**FAIL:** a banner stuck on confirming; Pro state requiring a reload; tier or customer id not
written; an error in the log delta. (Do **not** re-file OI-156 — the missing customer-id check in
`verifyTransaction` is already tracked.)

## Task D2: Paid-tier lessons 11–15, full completion
**Goal:** With tier `paid` and L10 complete, lessons 11–15 are reachable and completable.
**Slides: L11 5, L12 4, L13 4, L14 4, L15 3.** Confirmation challenges: L11 (2), L12 (2), L13 (2),
L14 (2); **L15 has none.**
- [ ] Same per-slide content discipline as C1–C3. L11 `undercut`, L12 `overcut`, L13 `figure_7`,
      L14 `j_shape` all name canonical KB concepts — read the matching
      `docs/knowledge-base/<prefixed-slug>.md` entry and check each lesson's claim against its
      `formal_predicate` and `false_positives` before judging.
- [ ] Note the known lesson-11 invariant: an undercut board is valid for **one side only** — verify
      the perspective (green/gray) before calling a claim wrong.
- [ ] Confirm each `lesson_progress` row reaches `complete`.
**PASS/FAIL:** as C1.

## Task D3: Paid-tier surfaces — and which CTAs actually disappear
**Prereq:** tier `paid`, **page reloaded** after the flip.

> **Corrected 2026-09-08.** The previous version asserted "the 4 paid sets now open" and "the four
> tier-gated checkout CTAs are correctly absent". Read at source, **only 3 of 5 CTAs are
> tier-gated**, and `SetPickerScreen` is **not one of them**. Judge each of the five against its own
> source-derived expectation below, not against a blanket rule.

| Site | Expected at paid tier | Citation |
|---|---|---|
| `SettingsScreen` | Upgrade CTA **gone**, replaced by a "Manage subscription" button | `SettingsScreen.jsx:549` — `          {tier === 'paid' ? (` |
| `SagaScreen` | Nodes 11–15 **navigate into the lesson**, no UpgradeModal | `sagaLock.js:19` — `  const tierLocked = lesson.free === false && tier !== 'paid';` |
| `PostSetSummary` | Upgrade branch **unreachable** (`isFreeUser` false) | `PostSetSummaryScreen.jsx:110` — `      setIsFreeUser(!entitled);`; `:124` |
| `SetPickerScreen` | **UNCHANGED** — paid sets still show as locked and still open the UpgradeModal | `SetPickerScreen.jsx:170-177`: `              locked={!set.free}` and `set.free ? () => go('challenge', …) : () => setUpgradeOpen(true)` — keyed off the **static** `CHALLENGE_SETS` constant; the screen's own comment (`SetPickerScreen.jsx:57-59`) says "This screen has no per-user tier state" |
| `PricingScreen` | **UNCHANGED** — "Become Pro" still renders and still opens a checkout | `PricingScreen.jsx:221` — `              onClick={handleCheckoutClick}`, with no tier condition anywhere in the file |

- [ ] `/setpicker` after reload: record whether the 5 paid sets open or still show the UpgradeModal.
      **The source says they will still be gated.** If so, this is a **product defect** (a paying user
      cannot reach paid content from the picker) — file it with the citation above. Do **not** record
      it as "expected".
- [ ] Reach a paid set the way that does work: `/challenge/undercut` direct (25 puzzles available)
      and complete it.
- [ ] `/settings`: assert "Manage subscription" is present and the upgrade CTA is gone.
- [ ] `/saga`: tap node 11 → assert it opens `/concept/undercut`, not an UpgradeModal.
- [ ] `/pricing`: assert "Become Pro" is **still present** (expected per source) and record whether
      the page shows any indication the user is already Pro. If it shows none, that is a finding
      (a Pro user is offered a second purchase with no warning) — file it once, here.
**PASS:** every one of the five sites matches the table above, and `/challenge/undercut` completes.
**FAIL:** a site deviating from its row (e.g. Saga still gating node 11 after a reload — that would
be a stale entitlement cache, not a design choice; check `getEntitlement()` before filing).

## Task D4: The Paddle billing portal (paid-tier only — the one CTA no other task can reach)
**Goal:** The "Manage subscription" button mints a real portal URL.
**Prereq:** tier `paid` with a non-null `paddle_customer_id` (D1 asserts both).
**Entry:** `/settings` → "Manage subscription" (`SettingsScreen.jsx:550` —
`            <button className="btn btn-ghost" onClick={openPortal} style={{ width: '100%', fontSize: 14, padding: '10px 0' }}>`).
This CTA exists **only** at paid tier, and `POST /api/paddle/portal` (`server/paddleRoutes.js:105`)
has no other frontend caller — so it is unreachable from Groups A–C and from Group E after rollback.
- [ ] Click it and capture the `POST /api/paddle/portal` request/response
      (`SettingsScreen.jsx:78-86`, body `{ returnPath: '/settings' }`).
- [ ] `openPortal` does `window.location.href = portalUrl` (`SettingsScreen.jsx:86`) — a **full
      navigation off the SPA**. Record the destination host, then navigate back to
      `http://localhost:6799/settings`; do **not** change anything inside Paddle's portal.
- [ ] Failure path: on any non-200 the handler sets `portalError` (`:84`) and the screen renders
      `t('settings.portalError')` (`:558-560`). If the call fails, assert that message appears —
      a silent failure is the defect, the failure itself may just be sandbox config.
**PASS:** `POST /api/paddle/portal` returns 200 with a `portalUrl`, and the browser navigates to a
Paddle-hosted host; **or** it returns non-200 and the `settings.portalError` alert is visible.
**FAIL:** a click with no network request at all; a 200 whose `portalUrl` does not navigate; a
non-200 with no visible error message; a raw `settings.portalError` i18n key on screen.

---

# GROUP E — rollback to free (1 rollback)

## Task E1: qa-rollback re-applies every limit
**Goal:** After `POST /api/admin/qa-rollback {userId}` **and a page reload**, every paid affordance
is gated again and the **three** tier-gated checkout CTAs reappear. (Corrected from "four" — see the
D3 table: `SetPicker` and `Pricing` never went away, so their presence here proves nothing.)
- [ ] `curl -s -X POST http://localhost:$API_PORT/api/admin/qa-rollback -H 'Content-Type: application/json' -d '{"userId":"<id>"}'`
      → expect `200 {reset:true, canceledSubscriptions:[…]}` (a `503 payments not configured`
      means `PADDLE_API_KEY` is unset — record it, it is not a UI bug).
- [ ] **Reload the page** (mandatory — the entitlement cache is module-scoped).
- [ ] Re-check, each against its own expectation: lessons 11–15 tier-locked again (`/saga` node 11
      opens an UpgradeModal); `/challenge/undercut` — record what it does now (per C5 the server has
      no gate, so it may still play; that is the same finding, not a new one); Settings shows the
      upgrade CTA and **no** "Manage subscription" (`SettingsScreen.jsx:549`); PostSetSummary's
      Pro branch is reachable again.
- [ ] Verify in the DB: `tier='free'` **and** `paddle_customer_id IS NULL`, written together.
- [ ] Re-check that `POST /api/paddle/portal` is now unreachable from the UI (D4's button is gone).
**PASS:** Saga, Settings and PostSetSummary all re-gate after **one** reload; the DB row shows
`tier='free'` and `paddle_customer_id IS NULL`.
**FAIL:** any paid affordance surviving the reload; a half-reset row (free tier but a surviving
customer id) — that would contradict `resetQaAccount`'s single-update guarantee, so establish the
root cause at source before filing.

---

# GROUP F — cross-cutting

## Task F1: Mobile viewport sweep (390×844)
**Goal:** The layout-sensitive screens are usable on a phone.
- [ ] `resize_page` to 390×844 **before** walking.
- [ ] Re-walk: `/pastGames` (chip filters + separator), the sparring board sizing, `/saga`, lesson
      slides (the 120px coach cap clips text on **every** screen, not just fixed layouts),
      `/challenge/<category>`, the nav/header, `/pricing`, `/settings`, **`/play-online`**,
      **`/blunder/<id>`** (its difficulty bottom-sheet, `MistakeDetailScreen.jsx:675-789`), and
      **`/summary`**.
- [ ] Check every CTA's tap-target size. Concretely: any control smaller than 44×44 CSS px is a
      finding. The 36×36 audio-toggle buttons in `GameScreen.jsx:271/287/303` and
      `ChallengeScreen.jsx:1035/1052/1069` are already below that threshold in source
      (`width: 36, height: 36`) — verify the rendered box and file **one** entry covering all six,
      not six entries.
- [ ] One screenshot **per confirmed visual defect only**, written to disk.
**PASS:** no horizontal overflow, no clipped text, no overlapping controls, every CTA tappable.
**FAIL:** any of the above — record the viewport (390×844) in the finding's input.

## Task F2: Console / network / server-log sweep
**Goal:** No systemic runtime error class is left unrecorded.
- [ ] Aggregate the console messages and failed XHRs collected across every task.
- [ ] Full-log grep at the end: `grep -iE 'error|throw|unhandled|ECONN' "$LOG_PATH"`.
- [ ] Distinguish rate-limit artifacts (429, plain-text body, **no** log line) from real bugs.
**PASS:** every error found is either filed as an OI or explained (e.g. rate limit).
**FAIL:** an unexplained recurring error left unfiled.

## Task F3: Suite baseline
- [ ] `cd connect-four && npm run test:fast`. Expected: **1785 tests / 271 suites / 0 fail**
      (`UNVERIFIED` — this number was not re-derived during the 2026-09-08 static audit, because the
      audit was forbidden from running anything. Treat the first run as establishing the baseline; a
      mismatch is only a regression if `git status` shows no source changes since it was recorded).
- [ ] "0 tests ran" ⇒ an ESLint error, not a pass.
**PASS:** 0 failing suites and a non-zero test count. **FAIL:** any failing suite (record the names),
or a zero test count (lint error).

## Task F4: Sign-out, and the error boundary
**Goal:** The two exit-shaped affordances no other task may touch, driven last because they destroy
session state.
**Prereq:** run **after** F1–F3; signed in at whatever tier Group E left.
- [ ] `/stats` → **Sign out** (`StatsScreen.jsx:161` — `              onClick={() => signOut()}`).
      Assert: the `!isAuthenticated` signup prompt (`StatsScreen.jsx:147-156`) reappears **without a
      manual reload**, `POST /api/auth/signout` returned 2xx (`ProfileStore.jsx:101`), and a reload
      of `/settings` shows the unauthenticated branch.
- [ ] **Entitlement-cache trap:** the cache is module-scoped, and a sign-out that does not call
      `clearEntitlement()` (`src/lib/entitlement.js:77`) can leave a stale `entitled: true` pinned
      forever. After signing out, load `/saga` and assert lessons 11–15 show the **signed-out**
      lock (`AuthModal`, `sagaLock.js:27`), not the paid state.
- [ ] `ErrorBoundary` (`src/components/ErrorBoundary.jsx:33` — `<button onClick={onRetry} …>Retry</button>`):
      if any task in this run tripped it, exercise Retry and record whether it recovers. If nothing
      tripped it, record "not reached" — do **not** manufacture a crash to test it.
**PASS:** sign-out flips the Stats screen in place with a 2xx; post-sign-out `/saga` shows sign-in
locks, not paid state.
**FAIL:** the signed-in Stats controls still rendered after sign-out; `/saga` still showing paid
access to lessons 11–15 (a stale entitlement — establish whether `clearEntitlement()` ran before
filing).

---

## Per-finding procedure (applies to every task)

1. Append the finding to `agentic_QA_2026-09-08-1929.md` **the moment it is confirmed**, using
   `.claude/skills/app-qa/references/bug-template.md`.
2. Invoke `scientific-method-debugging`; form a hypothesis, find the evidence that
   **distinguishes** it from the alternatives, and confirm at the source — the function, not a doc
   comment or a recollection of one.
3. Search `docs/open_issues.md` for a duplicate **before** filing. Never re-file OI-156…OI-162.
4. File as `OI-163`+ in that file's existing format: repro, observed evidence (exact symptom,
   request/response, wrong value), established root cause, why deferred, concrete first step.
5. If no root cause can be established, **say so explicitly** in the entry. A confident wrong root
   cause costs the next person more than an honest "unknown".

## Deliverables checklist

- [ ] This plan.
- [ ] `agentic_QA_2026-09-08-1929.md` with a PASS / FAIL / PARTIAL line for **every** task above,
      including the ones that passed.
- [ ] `docs/open_issues.md` entries OI-163+.
- [ ] A closing summary naming plainly what was **not** covered and why.

## Known coverage limits (declare up front, re-state in the closing summary)

- `past_due` downgrade, Google OAuth, `DeepRevealPane`, webhook payload drift — **out of scope by
  the brief**, not gaps found during the run.
- The local DB is **preserved, not reset** (34 users / 20 games / 890 blunders / 48 lesson_progress
  pre-exist). Consequence: `lesson_progress` may already carry `complete` rows, which
  **short-circuits the lock guard** (`sagaLock.js:64`). Task C1 must therefore start by recording
  the signed-in user's actual `lesson_progress` rows and, if any lesson is already complete, reset
  that account's rows or use a fresh anonymous account so the pairwise unlock is genuinely
  exercised rather than bypassed.

---

## Coverage audit (2026-09-08)

Adversarial static audit of this plan against the codebase. Method: derive the app's surface from
source (`urlMapping.js` `URL_MAP`, `screenRegistry.jsx` `SCREENS`, `App.jsx`'s `/admin` branch, every
`onClick`/`onChange`/`onKeyDown` in `src/screens` + `src/components`, every route registered in
`server/index.js` / `userRoutes.js` / `paddleRoutes.js`), then diff that against the tasks. Nothing
was run; no server was started or killed; no app code was changed.

**Tool trap that shaped this audit:** plain `grep` treats several `.jsx` files as binary (multibyte
em-dashes) and silently returns zero matches for them. `PricingScreen.jsx` was dropped this way in
two independent passes. Every count here was re-derived with `grep -a`. If you re-audit, use `-a`.

### 1. Screen inventory → covering task

`URL_MAP` has **20** patterns; `SCREENS` has **21** keys (the 20 plus two session-only screens).

| Screen key | Component | Route | Covered by |
|---|---|---|---|
| `home` | HomeScreen | `/` | A1, A4, B1, B2, B7, C6 |
| `stats` | StatsScreen | `/stats` | B3, C8, **F4** (sign-out) |
| `saga` | SagaScreen | `/saga`, `/saga/:highlightSlug` | B4, C1–C4, D3, E1 |
| `concept` | ConceptScreen | `/concept/:lessonId` | C1–C3, C4 (guard), D2 |
| `socratic` | SocraticScreen | `/socratic/:lessonId` | C1–C3, C4 (guard), D2 |
| `clchallenge` | CLChallengeScreen | `/clchallenge/:lessonId` | C1–C3, C4 (guard), D2 |
| `setpicker` | SetPickerScreen | `/setpicker` | C5, C11, D3, E1 |
| `challenge` | ChallengeScreen | `/challenge/:category` | C5 (incl. forbidden_columns + sequence mode), D3 |
| `summary` | PostSetSummaryScreen | `/summary` (session-only) | C5, C11, F1 |
| `difficulty` | DifficultyPickerScreen | `/difficulty` | **C6** (difficulty rows *and* the side picker) |
| `game` | GameScreen | `/game` (session-only) | A2, C6 |
| `review` | ReviewScreen | `/game/:id` | C6, **C7** (share, move chips, prev/next), C9 |
| `mistakes` | CategoryListScreen | `/mistakes` | C7 |
| `mistakeDetail` | **MistakesListScreen** | `/mistakeDetail/:category` | C7 (filter tabs, blunder cards) |
| `blunderDetail` | **MistakeDetailScreen** | `/blunder/:id` | **A3, B5** (route corrected), C7, F1 |
| `pastGames` | PastGamesListScreen | `/pastGames` | B1, **C7** (sort tabs, filter chips, load more), F1 |
| `playOnline` | PlayOnlineScreen | `/play-online` | **C9 (new task)** |
| `settings` | SettingsScreen | `/settings` | **A4** (signed-out branch, new), B6, **C8** (authenticated branch), D4, E1 |
| `pricing` | PricingScreen | `/pricing` | A4, C8, C11, D3 |
| `onboardingImportOffer` | OnboardingImportOfferScreen | none (session-only) | A2, B6 |
| `onboardingMission` | OnboardingMissionScreen | none (session-only) | A1, A2, A4, **B7 (new task)** |

Second routing layer, outside `URL_MAP` entirely (`App.jsx:203-227`): `/admin`, `/admin/lessons`,
`/admin/audio`, `/admin/deep-reveal-eval`, `/admin/fv-suff` → **C10 (new task, smoke only)**.

**AdminLessonEditorScreen / AdminLessonListScreen — routable? Yes.** They are not in
`screenRegistry.jsx` and have no `URL_MAP` entry, so `go()` can never reach them; but
`AdminLessonsPage.jsx:2-3` imports both, and `App.jsx:216-219` lazy-loads that page for
`/admin/lessons`, ahead of `<Navigator/>`. The only gate is `App.jsx:209-211`
(`if (!isLocalhostOrigin()) { return <AdminBlockedPage />; }`) — and this QA run is on
`localhost:6799`, so they **are** reachable. Reasoning for the scope decision: there is no in-app
link to `/admin` anywhere (no `go()`, no `<a href="/admin">`), so this is developer tooling rather
than product; and its primary controls are destructive (write lesson JSON to disk, spend OpenAI TTS
budget, promote candidate rows). C10 therefore covers **render + one read-only round trip** and
explicitly excludes the authoring/generation/curation workflows.

### 2. Affordance gaps found, and what was done

Folded into single entries without a dedicated task (stated explicitly, per the brief): the 7 board
columns are one affordance, not seven, on every Board-bearing screen; `TopBar`'s back/logo/right
icons are one affordance repeated on ~15 screens; list items rendered from a `.map` (lesson nodes,
set cards, game cards, blunder cards, category cards, move chips, difficulty rows) are one
affordance each.

| Gap | Disposition |
|---|---|
| **`GameScreen` has no undo** — C6 required using it "at least twice" | C6 rewritten. Replaced with the six controls that exist: hint, resign, onboarding skip, SFX, music, speech |
| **Resign untested** (`GameScreen.jsx:238`, `PlayOnlineScreen.jsx:511`) | Added to C6 and C9 |
| **Side picker untested** (`DifficultyPickerScreen.jsx:161`) — decides P1/P2 | Added to C6, with a required second-player game |
| **Keyboard board play untested** (`Board.jsx:253`, Enter/Space) | Added to C6 as an a11y check |
| **`/play-online` had no task** — start, board, resign, retry, 4 endpoints | New **Task C9** |
| **`/admin/*` had no task** — 5 pages, a whole routing layer | New **Task C10** (smoke) |
| **Signed-out `/settings` branch had no task** (`SettingsScreen.jsx:392`) | New **Task A4** |
| **Legal pages had no task** — `/terms`, `/privacy`, `/refunds`, `/pricing-legal`, `/legal.css` (`LegalFooter.jsx:21-24`); launch-relevant for Paddle | New **Task A4**, incl. the `legal.css` CSP trap |
| **Papergames save/import untested** (`SettingsScreen.jsx:484/492/523`) | Added to C8 with the endpoint chain |
| **Language toggle re-walk was one line** (`SettingsScreen.jsx:573`) | C8 now requires re-walking 5 screens in ES |
| **Billing portal unreachable from any task** (`SettingsScreen.jsx:550`, paid-only) | New **Task D4** |
| **Sign-out untested** (`StatsScreen.jsx:161`) | New **Task F4**, placed last because it destroys session state, with the entitlement-cache assertion |
| **Order-lock branch untested** (`sagaLock.js:41` → toast, not modal) | Added to C4, incl. the 3.2 s self-dismiss |
| **`forbidden_columns` multi-select untested** (`ChallengeScreen.jsx:860/965`) | Added to C5 |
| **Multi-move `sequence` puzzles untested** (`ChallengeScreen.jsx:636`) | Added to C5, with an explicit "not exercised" outcome if none is in the free pool |
| **Paid-set direct-URL guard untested** — C4 tested it for lessons only | Added to C5 with the source finding that no guard exists |
| **`ReviewScreen` share / move chips / prev-next untested** | Added to C7 |
| **`PastGamesListScreen` sort / filter / load-more untested** | Added to C7 |
| **`MistakeDetailScreen` difficulty sheet, prev/next, review-meta link untested** | Added to C7 |
| **Stats coach-recommendation CTA untested** (`StatsScreen.jsx:131`) | Added to C8 |
| **`UpgradeModal` plan toggle untested** (`UpgradeModal.jsx:192`) | Added to C11 |
| **`PricingScreen` `checkoutError` state untested** (`:107-111`) | Added to C11 |
| **`ErrorBoundary` retry** (`ErrorBoundary.jsx:33`) | Added to F4, explicitly "not reached" if nothing tripped it — no manufactured crash |
| `SplitReveal` drag divider (`useDragSplit.js:151-152`), `CurationWorkspace` A/R keyboard shortcuts, `RejectModal` Esc | **Left uncovered** — the first belongs to the out-of-scope Deep Reveal surface, the other two to the admin curation workflow C10 excludes |

### 3. Endpoint coverage

**114 API routes.** 52 are `requireLocalhost`-gated admin/curation/audio tooling driven only by
`/admin/*` pages (C10 smoke-covers the page render; their write operations are out of scope by the
same reasoning). Of the remaining product endpoints, the plan now causes every one to fire except:

| Endpoint | Why not covered |
|---|---|
| `POST /api/explain-move` (`index.js:1185`) | **Dead** — no frontend caller anywhere in `src`; unreachable from a browser |
| `POST /api/explain` (`index.js:1112`) | No frontend caller; curl-only solver passthrough |
| `POST /api/evaluate-move/inline` (`index.js:1805`) | No frontend caller (inline lesson challenges use the non-inline route) |
| `GET /api/puzzles/:id` (`index.js:2383`) | No frontend caller; puzzles arrive via `/api/puzzles/draw` |
| `GET /api/coach/weakness-map` (`index.js:2603`) | No frontend caller; the only `requirePaid` route in the app |
| `POST /api/explain-move-llm`, `POST /api/llm-feedback`, `GET /api/user/tts/deep-reveal` | Deep Reveal — **out of scope by the brief** |
| `GET /api/auth/oauth/google`, `POST /api/auth/callback` | Google OAuth — **out of scope by the brief** |
| `POST /api/paddle/webhook` | Webhook payload drift — **out of scope by the brief** |
| `POST /api/admin/qa-set-paid-state` | A state-setup primitive, not a UI-triggered endpoint |

Five orphaned endpoints (the first five rows) are a **latent finding, not a QA gap** — if they are
genuinely dead they are dead code, which belongs in `docs/open_issues.md` as a cleanup item, not in
this run. Do not spend browser time trying to make them fire.

### 4. Factual claims corrected (old → new)

Every row below was checked at source on 2026-09-08 by locating the symbol, not the line number.

| # | Claim (old) | Corrected to | Evidence |
|---|---|---|---|
| 1 | "21 URL patterns" / "21 routes in `URL_MAP`" | **20** | `urlMapping.js:7-29`, counted |
| 2 | `URL_MAP` cited as `urlMapping.js:6-38` | `:7-29`; `SESSION_ONLY_SCREENS` at `:37` | — |
| 3 | `parseUrl` fallback at `urlMapping.js:98` | **`:103`** (`:98` is the *match* branch) | `  return { screenKey: 'home', params: {} };` |
| 4 | "62 slides total" | **66** | 4+4+10+5+3+4+4+4+4+4+5+4+4+4+3; per-lesson figures were correct |
| 5 | `MistakeDetailScreen.jsx:530` is at `/mistakeDetail/<category>` | **`/blunder/<id>`** | `screenRegistry.jsx:37-38` — the two names are swapped |
| 6 | "four [checkout CTAs] disappear at paid tier" | **Three** are tier-gated; `SetPicker` and `Pricing` are not | `SetPickerScreen.jsx:170-177`, `PricingScreen.jsx:221` |
| 7 | D3: "the 4 paid sets now open" at paid tier | Source says they stay gated — a defect to file, not an expectation | `SetPickerScreen.jsx:57-59` + `:170-177` |
| 8 | "4+ paid" challenge sets | **5** (`mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`) | `server/challengeSets.js:13-17` |
| 9 | C6: "use **undo** at least twice" | No undo exists in `GameScreen` | Toolbar is `:221/:238/:255/:271/:287/:303` |
| 10 | C7: "`go()` uses `history.replaceState` … (`App.jsx:131`)" | `go()` **pushes** (`App.jsx:119`); `:131` is `goReplace` | — |
| 11 | Landing after Home/Saga/MistakeDetail sign-in = "whatever `App.jsx:155` decides" | **No navigation** — they stay put | `onboardingRouting.js:38` `new Set(['onboardingMission'])` |
| 12 | `sagaLock.js:19-67` for `deriveLockReason` | `:18-33`; `dispatchLockAction` `:38-43`; `deriveLessonAccess` `:59-67` | one span had covered three functions |
| 13 | Pairwise unlock at `sagaLock.js:25-27` | **`:24-25`** | — |
| 14 | `dispatchLockAction('tier')` at `sagaLock.js:38` | **`:40`** (`:38` is the declaration) | — |
| 15 | `UpgradeModal.jsx:78` resets `uiState` | **`:80-82`** (`:78` is a comment) | — |
| 16 | `useUpgradeCheckout.js:160-170` for the `successUrl` decision | **`:161-163`** (comment), call at `:172` | — |
| 17 | `useUpgradeCheckout.js:176-184` for the swallowed throw | **`:174-183`**; the `catch{}` is `UpgradeModal.jsx:70-72` | — |
| 18 | `pendingSetResults.js:36-44` for the entry shape | **`:33-40`** (`savePendingSetResults`) | — |
| 19 | "6 login-CTA sites" | **7** in scope (Home has two), + 1 out-of-scope in `DeepRevealPane` | `grep -a` |
| 20 | C11's PostSetSummary CTA reachable by "finishing a free set" | Needs an **imperfect** set **and** a Pro-lesson recommendation | `PostSetSummaryScreen.jsx:120-128` |
| 21 | `clearReturnTo()` on dismiss cited as `postLoginReturn.js:58-64` | Definition is `:62-64`; the *call* is `AuthModal.jsx:14-17` | — |

Verified correct and left alone: ports 4799/6799 (`./worktree-ports.sh` re-run); next free id OI-163
(`docs/open_issues.md` max is OI-162); lessons 1–10 `free: true` / 11–15 `false`; all per-lesson
slide and confirmation-challenge counts; the login-CTA and checkout-CTA line numbers; `ConceptScreen`
`:116/:121/:131` and `SocraticScreen:96`; the three lesson lock-guard bounces
(`ConceptScreen.jsx:60`, `SocraticScreen.jsx:67`, `CLChallengeScreen.jsx:49`); `App.jsx:143`/`:155`;
`sagaLock.js:27` and `:64`; `SetPickerScreen.jsx:176`, `SagaScreen.jsx:256`, `SettingsScreen.jsx:554`,
`PostSetSummaryScreen.jsx:124`, `PricingScreen.jsx:221`; `OnboardingImportOfferScreen.jsx:71/72/78`;
`OnboardingMissionScreen.jsx:76/106`.

### 5. Claims that could NOT be verified (marked `UNVERIFIED` in place)

- ~~**Test-suite baseline "1785 tests / 271 suites"** (Task F3)~~ — **RE-VERIFIED by the coordinator
  2026-09-08 at the end of the run**: `npm run test:fast` reported
  `tests 1785 / suites 271 / pass 1785 / fail 0 / duration_ms 33277`. The baseline is exact and the
  suite is green after the whole QA pass. No longer UNVERIFIED.
- ~~**DB population figures** and the **per-category puzzle counts**~~ — **RE-VERIFIED by the
  coordinator 2026-09-08 19:45**, after the audit, by live probe against the running server this
  session launched (API 4799). Service-role count query: `{"users":34,"games":20,"blunders":890,
  "lesson_progress":48,"puzzle_attempts":18}`. `GET /api/puzzles/counts`: `immediate_threat 66,
  forced_block 100, double_threat 100, forced_win 21, forbidden_columns 40, odd_even_threat 20,
  z_threat 20, claimeven 20, undercut 25, overcut 49, figure_7 21, j_shape 20`. These are no longer
  UNVERIFIED. They remain volatile only in the sense that the run itself mutates them
  (`puzzle_attempts` and `lesson_progress` grow as tasks execute).
- **"Challenge sets: 8 free / 5 paid"** — the *set list* is cited from source
  (`server/challengeSets.js`); the per-set row counts are the re-verified live probe above.

### 6. Deliberately left uncovered

- `past_due` downgrade (OI-158), Google OAuth, `DeepRevealPane` and its auth/checkout CTAs, webhook
  payload drift — **out of scope by the brief**. No tasks were added and no gaps reported for these,
  including for affordances that only exist inside them (`DeepRevealPane.jsx:162/201/369/432`,
  `AuthModal.jsx:43`'s Google button, `SplitReveal`'s drag divider).
- Admin **write** workflows (candidate curation, audio generation, lesson authoring/deletion) —
  destructive and non-product; C10 covers render only. `CurationWorkspace`'s A/R keyboard shortcuts
  and `RejectModal`'s Esc handler fall inside this exclusion.
- The five orphaned endpoints in §3 — unreachable from a browser by construction.
- **One app defect noted but not fixed** (per the brief, code was not touched): `AuthModal.jsx:47`
  hardcodes `http://localhost:3001` as the DEV OAuth base, which is the wrong port in any worktree
  (this one is 4799). It sits inside the out-of-scope Google-OAuth path, so it is recorded here
  rather than filed.
