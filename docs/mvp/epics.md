# DecodeC4 — Implementation Epic Breakdown (Revised v4)

*Based on the mockup prototype (`docs/mvp/mockup/project/`), existing codebase audit, product_vision.md, product_decisions.md, lesson-curriculum.md, db-schema.md, and product decisions from the planning session.*

---

## Cross-cutting concerns (apply to every epic)

**Analytics (`tracks` table):** Already in the DB schema. Every epic that adds a user-facing action must instrument it with a `track(event, data)` call. The `tracks` table records `uid` (device hash, always present), `user_id` (Supabase ID when signed in, nullable), `path` (feature area), `event`, `event_data` (JSON), `created_at`. **Reuse, do not rebuild:** the shared `track()` utility (`src/lib/track.js`) and the `POST /api/track` endpoint **already exist** and are already called across pages. Epic 1b *modifies* `track.js` (it currently sends `path: window.location.pathname`, which becomes a constant `/` once the router is removed — change it to send the active screen key); it does not create either from scratch.

Core events to instrument across all epics: `session_start`, `screen_viewed`, `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `set_completed`, `deep_reveal_viewed`, `deep_reveal_flagged`, `signup_initiated`, `signup_completed`, `waitlist_submitted`, `lesson_started`, `lesson_completed`, `game_started`, `game_ended`, `game_reviewed`, `mistake_reviewed`. (Matches Gap 28 exactly.)

**i18n:** react-i18next stays wired throughout. All user-facing strings go through translation keys (English at launch). Spanish is post-MVP content work — the infrastructure must support it from day one. No epic removes i18n.

**Key-namespace convention (locked here so keys don't get refactored mid-build — first strings appear in Epic 1a):** dot-separated, lowercase, snake_case segments. Top-level namespaces:
- `common.*` — shared labels (`common.back`, `common.next`, `common.continue`)
- `nav.*` — screen titles, keyed by screen key (`nav.home`, `nav.setpicker`)
- `coach.<category>.<quality>.<n>` — Coach phrases, a **pool** of numbered variants (`coach.immediate_threat.optimal.0`, `.1`, …); the client picks one at random per move (Gap 29 — pooled). `category` matches the `categories.js` slugs, `quality` ∈ `optimal|suboptimal|blunder`
- `eval.*` / `board.badge.*` — evaluation labels and badge text (`eval.optimal`, `board.badge.good`)
- `home.*`, `stats.*`, `setpicker.*`, `summary.*`, `upgrade.*`, `mistakes.*` — per-surface strings (`home.*` added by Epic 1b)
- `lesson.<id>.slide.<n>.*` — lesson content (`lesson.lesson-05-claimeven.slide.1.text`)

**Coach phrase library is pooled keys, not English.** Epic 2a's "Coach phrase library" maps each quality bucket to an **array** of i18n keys — `{ [category]: { optimal: key[], suboptimal: key[], blunder: key[] } }` — and the `/api/evaluate-move` response carries the `category` + `quality` (or a single randomly-chosen key); the client resolves the chosen key with `t()` and varies wording by picking one variant at random per move (Gap 29). No raw English strings cross the API or live in the phrase object.

**Prompt caching (`explanation_cache` table):** Already in DB (`position_hash`, `one_liner`, `deep_reveal_json`). Every endpoint that calls the LLM for a Deep Reveal must check this cache first and write on miss. Cache key: `SHA256(movestring + ":" + col)`. Wired in Epic 2b; reused in Epics 3b and 3c.

**User flag for bad LLM answers:** A "Flag this explanation" button on every Deep Reveal panel writes a row to the `llm_feedback` table (already in DB). No moderation UI in MVP — just capture.

**Hints never show raw scores.** No surface displays raw solver score values to the user. Hints derive from the solver + `classify()` internally, but present pattern-based guidance only:
- **Sparring** (Epic 3a): the Coach highlights the **best move(s)** on the board — every column whose solver score ties the maximum — and names the reason. Second-best moves are never surfaced (they matter only to the AI's internal deliberate-mistake mechanic).
- **Challenges** (Epic 2a): the Coach gives a **contextual nudge** that names the task/threat **without revealing the column**, preserving the recognition task.
- The 7-column numeric/colored score row shown on Hint in the Sparring mockup (`screens_sparring.jsx`) is **not** built — mockup divergence.

---

## Revised Epic Breakdown

---

### Epic 1a — Design Tokens & Component Library

All shared primitives. Nothing surface-specific. No API calls.

**Visual + prop ground truth:** the mockup files are authoritative for layout and prop shapes — `primitives.jsx` (TopBar/ProgressBar/Stars/Toolbar), `board.jsx`, `coach.jsx`, `styles.css`. Match them; introduce no colors outside the established token set.

**Scope:**

*CSS design tokens:*
- Semantic color variables: `--disc-green`, `--disc-gray`, `--eval-good`, `--eval-mid`, `--eval-bad`, `--eval-good-bg`; surface tints `--bg-lessons`, `--bg-challenges`, `--bg-sparring`, `--bg-home`; `--lock`, `--lock-bg`, `--claim`, `--threat-gray`
- Typography: Baloo 2 (display/headings) + Nunito (body); size + weight scale
- Spacing, border-radius, shadow scale
- `@keyframes`: disc drop, pulse ring, bubble slide-in, spinner

*Shared primitives:*
- `Icon` — SVG stroke icon set: back, chevR/L/D, gear, user, bulb, undo, flag, lock, check, star, arrowUp, play, search, retry, grad, target, swords, chart
- `StatusBar` — time + signal + battery
- `TopBar` — title, back button, meta slot, right icon slots
- `ProgressBar` — horizontal fill strip (value/max or pct prop)
- `Stars` — N of total filled stars
- `Toolbar` + `ToolButton` — fixed bottom action row

*Coach components:*
- `CoachAvatar` — SVG cartoon figure (bearded, glasses), 3 moods: happy / think / oops; size prop
- `CoachDialog` — fixed-height chat feed; avatar left + bubble stack right; `faded` + `lead` bubble props; `fixed` prop for sparring compact mode; new bubble slides in, old scrolls up

*Board component (complete redesign of existing `Board.jsx`):*
- 7×6 grid, column-major; green + dark-gray discs (replacing current red/yellow)
- Column tap handler + hover arrow (chevD)
- Drop animation via `lastDrop` prop
- Overlay system: `tg` (green translucent threat), `td` (gray translucent threat), `tr` (red "your move" — Position Explorer), `claim` (claimeven cell), `win` (win-line flash). **Locked cross-epic enum — consumed by Epics 2a/2b/3b/3c/4.**
- Column badge: `good` ✓ / `mid` ? / `bad` ✕. **Locked cross-epic enum.**
- **Column multi-select mode**: columns toggled as "forbidden" (red tint + ✕ badge); used by Forbidden Columns puzzle type; `selectedCols` prop + `onColToggle` handler
- Compact mode (shrinks for post-game review)
- `fullCols` prop to block tapping full columns
- **Sequence-mode support**: the `forced_win` category is multi-move (`interaction_mode === 'sequence'`, driven by `completionStrategies.js`) and is **kept as-is** — an explicit exception to Gap 8's single-move rule. The redesigned `Board` must preserve the existing sequence-play interaction already in `PuzzlesPage.jsx:507` (`interactionMode === 'sequence'`): the user plays through a forcing line, the engine plays the best response between moves. Port this branch; do not collapse it to single-move.

*Other shared components:*
- `FeatureCard` — icon + title + subtitle + optional badge; square and wide variants
- `SetCard` — title + difficulty stars + position count; locked variant (grayed + padlock)
- `UpgradeModal` — sheet overlay: icon + heading + waitlist email input + "Notify me" + dismiss (no Stripe for MVP). **Replaces the existing `PaywallModal.jsx`**, which still calls `POST /api/stripe/create-checkout` and redirects. This epic must retire `PaywallModal` and update **all three** importers (`PuzzlesPage.jsx`, `CoachPage.jsx`, and `DeepRevealButton.jsx`) so no Stripe-redirect path survives behind a locked feature (Gap 19). **Note:** `DeepRevealButton.jsx` is reused as the Deep Reveal foundation in Epic 2b, so leaving its `PaywallModal` import in place would keep a live Stripe path on the Challenges surface — swap it to `UpgradeModal` here.

**Reuse from existing code (do not rebuild):**
- The Forbidden-Columns **multi-select interaction** is already fully implemented in `PuzzlesPage.jsx` (`handleForbiddenSubmit`: toggle set, parallel per-column check, exact-match scoring, missed-column reveal, opponent-threat overlay). Port this logic into the redesigned `Board` rather than writing it fresh.
- `DeepRevealButton.jsx` and `ExplainMoveButton.jsx` already render LLM explanations with flag flows — usable foundations for the Deep Reveal panel (Epic 2b).

**NOT included:** routing, screens, API calls, per-surface background application. `CurationWorkspace.jsx` Board migration — it uses ~12 curation-specific highlight roles (`z_range`, `hint`, `ghost_mirror`, etc.) with no equivalent in the locked overlay enum; `Board` retains `highlightedCells` as a deprecated shim prop for this caller only, to be removed in a future curation epic.

**Estimated spec:** 160–180 lines. **Estimated tasks:** 15–17.

---

### Epic 1b — App Shell & Navigation Migration

Replace the existing routing architecture. Wire Home Hub, Stats, analytics utility, and i18n.

**Scope:**

*Routing migration:*
- Remove `BrowserRouter`, `react-router-dom` routes, `BottomNav`, `AppHeader`
- **Keep** react-i18next and `ProfileStoreProvider` — do not remove
- Replace routing with a single `screen` state variable and `go(screenKey, params = {})` dispatcher. `params` is an opaque object stored alongside the current screen key (e.g., `go('challenge', { category: 'immediate_threat' })`); later epics read it to pass context between screens. Back-stack is not required for MVP — `go()` always replaces the current screen with no history.
- Screen registry mapping key → component (mockup ground truth: `app.jsx` `SCREENS` map). Keys: `home`, `stats` (`screens_home.jsx`); `saga`, `concept`, `socratic`, `clchallenge` (`screens_lessons.jsx`); `setpicker`, `challenge`, `summary` (`screens_challenges.jsx`); `difficulty`, `game`, `review`, `explorer` (`screens_sparring.jsx`); `mistakes`, `mistakeDetail` (`screens_mistakes.jsx`)
- **Screen → surface group → background tint mapping (cross-epic contract with Epic 1a tokens):**

  | Screen keys | Surface group | Token |
  |---|---|---|
  | `home`, `stats` | home | `--bg-home` |
  | `saga`, `concept`, `socratic`, `clchallenge` | lessons | `--bg-lessons` |
  | `setpicker`, `challenge`, `summary` | challenges | `--bg-challenges` |
  | `difficulty`, `game`, `review`, `explorer` | sparring | `--bg-sparring` |
  | `mistakes`, `mistakeDetail` | home (accessed from Stats) | `--bg-home` |

- Keep `/admin/curate` accessible: detect `window.location.pathname.startsWith('/admin')` at app boot and render admin shell separately, bypassing the state navigator
- **Retire the `/coach` route and `CoachPage.jsx`:** delete both files. Its blunder-review UI and `coach/queue` endpoints are *reused* by Epic 3c (Past Mistakes) — see Epic 3c. Because `BrowserRouter` is removed entirely, no redirect from `/coach` is needed; the URL simply ceases to exist.
- **Delete `DashboardPage.jsx`:** it uses `useNavigate` which breaks on router removal; the new Home Hub screen is its full replacement. No redirect needed.

*Analytics utility (cross-cutting foundation):*
- **Reuse the existing `track()` (`src/lib/track.js`) and `POST /api/track` endpoint — both already exist.** The only change here is *modifying* `track.js` to send the active screen key instead of `window.location.pathname` (which becomes a constant `/` once the router is removed). The endpoint already resolves `uid` from the authenticated profile / request body and `user_id` from the bearer token.
- Call `track('session_start', { screen })` on app mount
- Call `track('screen_viewed', { screen })` on every `go()` navigation

*Home Hub screen:*
- TopBar: "DecodeC4" left, profile icon right (→ auth modal if unauthenticated, → Stats if authenticated)
- 2+1 feature card grid: Lessons (blue tint), Challenges (peach tint), Sparring (lavender tint)
- Daily Coach nudge: static `CoachDialog` with placeholder phrase; i18n key `coach.home.welcome.0`, English text "Let's sharpen your Connect Four tactics."; mood: `happy`
- "Progress & Stats" ghost button → Stats screen

*Stats screen:*
- **Unauthenticated data sources (all from `IndexedDBStore`, set by Epic 7):**
  - Session accuracy: `getLastChallengeSession()` → `session.accuracy` (or `--` if null)
  - Lessons done: `getLessonProgress()` → count of entries with `status === 'complete'`
  - Sparring record: `getSparringRecord()` → `{ W, L, D }`
  - Shows "Sign up to track your progress over time" prompt.
- **Authenticated data sources (all from `SupabaseStore`, set by Epic 7):**
  - All-time accuracy + total puzzles solved + per-pattern accuracy: `getAllSessionStats()` → aggregated across all rows
  - Lessons complete: `getLessonProgress()` → count of `status === 'complete'` rows
  - Sparring record: `getSparringRecord()` → `{ W, L, D }`
  - Day streak: `getStreak()` → `{ streak_count, last_active_date }`
  - Accuracy-by-pattern bars: per-pattern accuracy from `getAllSessionStats()`
  - Weakest-lesson recommendation: lowest per-pattern accuracy across all-time stats, tie-break by earliest lesson order (`lesson.order` from `GET /api/lessons`); locked lesson → `UpgradeModal`
  - "Review past mistakes" link → `go('mistakes')`
- **Empty state:** show zeros for all numeric fields; no paywall gate (Stats is free and always visible, even with no activity recorded yet)

*i18n:*
- All user-facing strings in this epic go through `t('key')` translation keys
- English strings defined in `en.json`; `es.json` stub created but empty (Spanish is post-MVP content)

**Acceptance criteria:**
- No `react-router-dom` import survives outside the `/admin` branch
- Every `go()` call fires `track('screen_viewed', { screen: screenKey })` before the component mounts
- `track('session_start', ...)` fires exactly once on app mount
- Background tint changes correctly when switching between surface groups
- Home Hub renders without any authenticated state (anonymous user sees all three feature cards)
- Stats screen shows `--` for accuracy when no challenge session exists (not `0%` or empty)
- Stats screen's "Review past mistakes" link is absent for unauthenticated users

**NOT included:** actual surface screens, auth flow (Epic 7), deep data writes.

**Estimated spec:** 130–150 lines. **Estimated tasks:** 11–14.

**Depends on:** Epic 1a.

---

### Epic 7 — Auth & Progress Persistence

Ship early so every subsequent surface writes to the right store from day one.

**Scope:**

*Auth UI reskin:*
- Redesign `AuthModal` to match new visual style using the mockup (`docs/mvp/mockup/project/`) as the visual source of truth. The mockup auth screen uses the `modal-card` + `sheet-backdrop` pattern (same as the challenges screen). Fields: email input, "Continue with email" primary button, "Maybe later" ghost button. Confirmation state ("sent"): check-icon, "Check your inbox" heading, "We sent a magic link to your email" copy, "Back" ghost button. Keep magic-link OTP flow and i18n keys.
- Profile icon on Hub TopBar: **conditional** — unauthenticated → `AuthModal`; authenticated → Stats screen. The mockup `isAuthed` prop controls this routing.
- On sign-in: existing `switchToSupabase` migration flow runs (IndexedDB → Supabase); already implemented in `ProfileStore.jsx`
- `track('signup_initiated', ...)` and `track('signup_completed', ...)` already in existing code; verify they fire correctly

*Persistence medium note:* Gap 2 says device-local data lives in "localStorage," but the existing store layer uses **IndexedDB** (`IndexedDBStore`). Keep IndexedDB (already built and wired); treat the Gap 2 wording as a medium-agnostic requirement, not a mandate to switch.

*Extend `IndexedDBStore` for new data types:*
- `saveLessonProgress(lessonId, status)` / `getLessonProgress()`
- `saveSparringRecord(result)` / `getSparringRecord()` → `{ W, L, D }`
- `saveChallengeSession(session)` / `getLastChallengeSession()`
- `recordActivityDay()` / `getStreak()` — daily streak (Gap 13): persist a `last_active_date` + `streak_count`; on any puzzle attempt or sparring game, bump the count if the last active day was yesterday, reset to 1 if a calendar day was skipped, no-op if same day. Stats (Epic 1b) only reads `getStreak()`.
- Update `migrateToSupabase` to also migrate lesson progress, sparring record, challenge session history, and streak state (`last_active_date` + `streak_count`)

*Extend `SupabaseStore` for new data types:*
- Same interface as IndexedDBStore above
- Fix `saveSessionStats`: it currently early-returns on `if (profile.tier !== 'paid') return;` (`SupabaseStore.js`) — drop that paid-only guard so stats save for any authenticated user
- `getAllSessionStats()` for Stats screen aggregation; **per-pattern all-time accuracy** is computed as a GROUP BY over `session_stats.stats` (no dedicated column needed)
- **New columns on `users` table** (add via migration): `streak_count INTEGER DEFAULT 0`, `last_active_date DATE`, `sparring_record JSONB DEFAULT '{}'` (stores W/L/D counts)
- **New `lesson_progress` table** (add via migration): keyed by `(user_id, lesson_id)` with a `completed_at TIMESTAMPTZ` column; replaces the "decide during spec" note
- `session_stats` table (migration 006) is kept as-is for per-date accuracy; the new columns/table handle the singleton user-scoped state that doesn't fit the per-date shape

*Deep Reveal weekly limit (Gap 3):*
- **Anonymous users have no access to Deep Reveal.** Tapping "Learn more" while unauthenticated shows the `AuthModal` (sign-up prompt) — no quota counter, no cap to exhaust.
- Authenticated users: weekly cap of **20 per week**, enforced server-side on `users.deep_reveal_count` + `users.deep_reveal_reset_at`; reset Monday 00:00 UTC.
- When weekly limit reached (authenticated): hide "Learn more" button; tap → `UpgradeModal` (waitlist capture).
- Pro users (`tier === 'paid'`): no limit (future-proofed; the codebase keys all gating on the `'paid'` slug — `checkAndDecrementQuota`, `requirePaid`, `saveSessionStats` — so the doc uses `'paid'`, not `'pro'`. `tier` stays `'free'` for all users until the payment epic ships).

  **⚠️ Existing quota code must be changed, not extended as-is:**
  - `checkAndDecrementQuota` in `server/index.js` currently enforces **`count >= 3` per day**, reset at the **next UTC midnight** (`setUTCHours(24,…)`). This must become **20 per week, reset Monday 00:00 UTC** (Gap 3). The magic `3` and the daily reset are wrong for MVP.
  - Write a migration to update the `deep_reveal_reset_at` column default from next-UTC-midnight semantics to next-Monday 00:00 UTC semantics. Do not backfill existing rows.
  - The existing guard rejects anonymous users: `/api/explain-move` returns `403` when `requestDeepReveal && !req.user`, and `checkAndDecrementQuota` returns `{ allowed: false, reason: 'anonymous' }` for any non-`paid`/`free` tier. Keep and reinforce this: anonymous users must not reach the quota check at all — the client gate (AuthModal prompt) is the first line of defense, and the server continues to reject unauthenticated Deep Reveal requests.
  - **The cap is currently enforced on the wrong endpoint.** MVP Deep Reveal calls `/api/explain-move-llm` (Epics 2b, 3b, 3c), which has **no quota enforcement today**. Move the weekly-cap check onto `/api/explain-move-llm`: server-side decrement for authenticated `free`-tier users; reject with `401` for unauthenticated requests. Remove any IndexedDB counter paths from this flow.

*Payments (deferred):*
- Existing Stripe routes left untouched; `UpgradeModal` shows waitlist email capture only
- `track('waitlist_submitted', { feature })` on "Notify me" submit

**NOT included:** Stripe checkout, subscription management, tier upgrades.

**Estimated spec:** 130–150 lines. **Estimated tasks:** 12–15.

**Depends on:** Epic 1b.

---

### Epic 2a — Challenges: Set Picker, Single-Move Board & Tier-1 Feedback

First fully interactive surface. Redesigns `PuzzlesPage.jsx` (708 lines). **Reuse, don't rewrite:** `PuzzlesPage` already implements category listing, session accuracy, optimistic placement, solved-puzzle exclusion, stable per-category selection, and the claimeven trace overlay — port these into the new screens.

**Frontend screens:**

*Set Picker (`setpicker` screen):*
- Scrollable list of `SetCard` components with category metadata from server config
- Dynamic position count per set: fetch approved puzzle count per category; hide set if count is 0 (Gap 6a)
- Free sets unlocked; locked sets grayed + padlock; tap locked → `UpgradeModal`
- **Mockup divergence:** the mockup lock sheets (`screens_challenges.jsx`, `screens_lessons.jsx`) show Stripe-style "Upgrade to Pro" / "Maybe later" copy; the build uses `UpgradeModal` (waitlist email + "Notify me", no Stripe — Gap 19). Same applies to the Saga Map lock modal (Epic 4). Gap 19 governs.
- `track('screen_viewed', { screen: 'set_picker' })`

*Challenge Board — pre-move, single-move type (`challenge` screen):*
- `CoachDialog`: category-specific prompt (no category label shown). **Prompt source:** resolved client-side from per-category i18n key pools — `coach.<category>.prompt.*` (e.g. `coach.immediate_threat.prompt.0`, `.1`, …); the client picks one at random per puzzle. **Never use `goal_prompt` from the puzzle row.** This key pool is defined in `en.json` alongside the existing `coach.<category>.<quality>.*` pools and follows the same pooled-key convention (cross-cutting i18n rule).
- **Hint text source:** resolved client-side from `coach.<category>.hint.*` key pool (e.g. `coach.immediate_threat.hint.0`); client picks one at random. Hint text names the task/threat without revealing the column — see cross-cutting *Hints* for the constraint. These keys are authored in `en.json` for each free category delivered in this epic.
- Progress indicator: "N / M" + `ProgressBar`
- Interactive `Board` (no overlays until move committed)
- Toolbar: Hint only — **no Undo** (Gap 8). The Hint is a **contextual nudge** (see cross-cutting *Hints*): the Coach names the task/threat for the position (from the solver + `classify()`) **without revealing the column** and **without any numeric scores** — e.g. *"There's an immediate win on the bottom row — find the column."* *Note: the mockup `ChallengeBoard` shows an Undo/Retry button; the mockup is wrong here — Gap 8 governs.*
- Back-navigation confirmation dialog (Gap 14)
- `track('puzzle_attempted', { puzzleId, category })`

*Challenge Board — post-move feedback (Tier 1):*
- **Variant A only** (Tier 1 strip below board); Variants B/C deferred to post-MVP
- Evaluation badge on played column (✓ / ? / ✕); quality = Optimal/Suboptimal/Blunder (Gap 1)
- `CoachDialog` updates with phrase + mood
- Tier 1 strip: quality tag + summary line + "Learn more ▼" (no Flag icon — deferred to Epic 2b where an actual LLM response exists to flag)
- "Learn more ▼": if weekly limit reached → `UpgradeModal`; otherwise → Deep Reveal Panel (Epic 2b)
- `track('puzzle_solved_correct', ...)` or `track('puzzle_solved_wrong', ...)`

**Backend / API (new):**
- **Shared move-quality scorer (Gap 1) — NEW module.** The Optimal/Suboptimal/Blunder classification (sign-of-score comparison: `score(played)=score(best)` → Optimal; same sign but slower → Suboptimal; outcome-category drop → Blunder; losing-position rule) does **not** exist today — the predicate engine only returns `correct`/`wrong`/`tied`. Build a single shared scorer module consumed by `POST /api/evaluate-move` (this epic) **and** `POST /api/games/analyze` (Epic 3b). This is the spine of all feedback and timeline coloring.
- `POST /api/evaluate-move` — `{ movestring, col, category?: string }` → `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`. The optional `category` field, when present, drives the phrase-pool key (pedagogical intent of the challenge puzzle); when absent the server falls back to `classify()` output — covering Sparring (Epic 3a) reuse. The server picks one i18n key from the appropriate quality-bucket pool (e.g. `coach.immediate_threat.optimal.2`) and returns it as `coachPhraseKey`; similarly `summaryLineKey` is one key from the summary pool. **The server never returns resolved English strings for these fields** — the client resolves them with `t(coachPhraseKey)` and `t(summaryLineKey)`. Uses the shared scorer + existing `classify()` + c4solver. **New endpoint.**
- `GET /api/puzzles/draw?category=<cat>&n=8` — random draw without replacement from approved puzzles (Gap 9). **New endpoint.** Must support `category=mixed` (see below).
- `GET /api/puzzles/counts` — returns `{ [category]: approvedCount }` for all categories. **New endpoint.** The Set Picker calls this on mount to determine approved puzzle counts per category; sets with count = 0 are hidden (Gap 6a). Lightweight: a single GROUP BY query over approved puzzles, no per-puzzle data.
- Challenge-set metadata: `server/challengeSets.js` — `category → { displayName, stars, description, free: bool }`. **New module.**

  **Free / Pro mapping — follows Gap 3 (authoritative over the current code):**
  - **Free (single-move, this epic):** `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat` (the Lesson-1–7 content sets). `forbidden_columns` (multi-select, Epic 2b) is also free.
  - **Free (sequence-mode, Epic 2b):** `forced_win` — moved to Epic 2b because it is multi-move (`interaction_mode === 'sequence'`). See Epic 2b for its full scope.
  - **Free (Epic 6):** `odd_even_threat` — the category does not exist yet; its detector, `challengeSets.js` entry, i18n key pools, and count-hiding behavior (hide if approved count = 0) are all specified and built in Epic 6. **Do not include `odd_even_threat` in Epic 2a's free set list.**
  - **Pro:** `mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`.
  - **`server/categories.js` `PAID_CATEGORIES` must be remapped:** remove `claimeven` and `z_threat` (they are now free); they are currently incorrectly paid. Add the `mixed` pseudo-category to the paid set.
  - **`mixed` pseudo-category:** not a stored puzzle category. `GET /api/puzzles/draw?category=mixed` samples without replacement across all approved puzzles of all *free-or-owned* categories. Add handling in the draw endpoint and a `mixed` entry in `challengeSets.js` (Pro-gated).
  - **Provisional star ratings in `challengeSets.js`:** `double_threat=2`, `forbidden_columns=2`. These are provisional values; Epic 6 confirms final ratings for all deferred categories (`double_threat`, `forced_win`, `forbidden_columns`, `odd_even_threat`) once puzzle quality is assessed.
  - **Mockup `CHAL_SETS` disclaimer:** the mockup `CHAL_SETS` array (`screens_challenges.jsx`) is **illustrative only** — its contents, order, star ratings, and locked flags do not match the authoritative free/Pro mapping above. The build is driven by `challengeSets.js` + dynamic approved counts from `GET /api/puzzles/counts`, not the mockup array. Gap 3 (as amended in this epic) governs.
- Coach phrase library: `{ [category]: { optimal: key[], suboptimal: key[], blunder: key[] } }` — each quality bucket is a **pool** of i18n keys, client picks one at random per move (Gap 29). Free/stable categories here (excluding `odd_even_threat`, added in Epic 6); Pro-category pools added in Epic 5.

**NOT included:** Deep Reveal / Tier 2, Forbidden Columns multi-select, `forced_win` sequence set (all Epic 2b); `odd_even_threat` category (Epic 6); `lessonMode` prop on `ChallengeBoard` (Epic 4 — defined and consumed there); Post-Set Summary (Epic 2b); lesson confirmation mode (Epic 4); detector improvements (Epic 5).

**Estimated spec:** 150–175 lines. **Estimated tasks:** 14–17.

**Depends on:** Epic 1a, Epic 1b, Epic 7.

---

### Epic 2b — Challenges: Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary

Completes the Challenges surface: the Tier-2 panel, the multi-select puzzle type, the `forced_win` sequence set, and the set-end summary.

**Frontend screens:**

*Challenge Board — pre-move, `forced_win` (sequence-mode) type:*
- **`forced_win` is sequence-mode (multi-move), not single-move.** It is already implemented (`completionStrategies.js`, `interaction_mode === 'sequence'`) and is kept as a deliberate exception to Gap 8. The sequence interaction was ported in Epic 1a's Board; this epic wires it to a challenge set entry.
- `CoachDialog`: *"Force the win — play the line that leaves your opponent no escape."*
- **Scoring is whole-line pass/fail via `SequenceHandler` completion result.** `/api/evaluate-move` is NOT called per move within the sequence; the existing `SequenceHandler`/`completionStrategies.js` path handles evaluation end-to-end. "Next" advances only after the full forcing line is completed.
- `forced_win` is a **free** set. Its `challengeSets.js` entry gets a **provisional star rating of 3** (hardest free pattern; multi-move recognition) to be confirmed in Epic 6.
- **Mockup/vision note:** the Set Picker mockup and the `product_vision` prompt table both omit `forced_win`; the decision is to include it as a free sequence set in Epic 2b.

*Challenge Board — pre-move, Forbidden Columns type:*
- `CoachDialog`: "Mark every column where playing immediately hands your opponent a win."
- Board in **multi-select mode**: user taps columns to toggle forbidden (red tint + ✕ badge); tap again to untoggle
- **Reuse:** the scoring + reveal logic already exists in `PuzzlesPage.handleForbiddenSubmit` — port it
- "Submit" button in Toolbar (replaces Next); disabled until ≥1 column selected
- On submit: correct columns flash green, incorrect tags + missed columns revealed simultaneously
- Feedback strip shows how many were correct ("3 / 4 forbidden columns found")
- Both false positives and false negatives count as wrong (exact-match predicate)
- `track('puzzle_attempted', { puzzleId, category: 'forbidden_columns', submittedCols, correctCols })`
- **Mockup note:** the Set Picker mockup lists no Forbidden Columns set; the type exists per Gap 30 and gets a **free** entry in `challengeSets.js`. Each Forbidden Columns puzzle counts as **one scored item** in session accuracy and the by-pattern breakdown.

*Deep Reveal Panel (Tier 2):*
- **Data contract:** `patternTag`, `quality`, and `badge` come from the already-held `/api/evaluate-move` response (Epic 2a client state) — no duplicate classifier call. The panel calls `/api/explain-move-llm`, which Epic 2b extends to return `{ explanation, bestLine }` (solver principal variation as a column array). No other fields are added to the endpoint response.
- **Cache wiring (added this epic):** `/api/explain-move-llm` reads `explanation_cache` first (key: `SHA256(movestring + ":" + col)`). On hit, return `deep_reveal_json` immediately. On miss, call LLM, then write result to `explanation_cache.deep_reveal_json`.
- **Quota enforcement:** weekly-cap decrement runs **only on cache miss**, after the cache check. Cache hits do not consume quota. This is a correction to the current handler, which decrements before the cache check.
- **Reuse:** `DeepRevealButton.jsx` / `ExplainMoveButton.jsx` already do most of this
- Loading spinner until response (cache hit = no spinner)
- Loaded: pattern tag(s) and badge/quality (from evaluate-move state), LLM explanation, "Best line" chips (solver PV from endpoint), "Flag this explanation" button
- LLM timeout >6s: show Tier 1 text + "Detailed explanation unavailable." (Gap 6b)
- On open: `track('deep_reveal_viewed', { puzzleId, cached })`
- On flag: write to `llm_feedback` table; `track('deep_reveal_flagged', { puzzleId })`

*Post-Set Summary (`summary` screen):*
- Accuracy %, by-pattern breakdown, Coach recommendation (Gap 15 tie-break)
- CTA to recommended lesson; "Back to Challenges"
- `store.saveChallengeSession(...)` on load
- `track('set_completed', { category, accuracy, optimalCount, blunderCount, byPattern })` — `category` is `'mixed'` for Mixed sets; `byPattern` object carries per-pattern data so it is not lost from analytics.
- **Single-category vs. Mixed distinction:** for a single-category set, the by-pattern breakdown shows one row. If accuracy < threshold, recommend re-doing that category's lesson. If 100%, show a congratulatory CTA instead of a lesson link. This behavior must be called out explicitly in the spec to avoid ambiguity when there is only one pattern row.

**NOT included:** lesson confirmation challenge mode (Epic 4), detector improvements (Epic 5), game history, `odd_even_threat` category (Epic 6).

**Estimated spec:** 130–150 lines. **Estimated tasks:** 12–15.

**Depends on:** Epic 2a (Set Picker, single-move board, scorer, draw endpoint, `GET /api/puzzles/counts`).

---

### Epic 3a — Sparring: Difficulty Picker & Game Board

Redesigns `HomePage.jsx` (560 lines). Saves game record on completion.

**Frontend screens:**

*Difficulty Picker (`difficulty` screen):*
- Radio-row list: Easy / Medium (default) / Hard / Perfect with description subtitles (Gap 11)
- "Play as" toggle: Green (first) vs Gray (second)
- Start → Game Board
- `track('game_started', { difficulty, side })`

*Game Board (`game` screen):*
- `CoachDialog` with `fixed` prop
- Interactive `Board`: no overlays during play
- Optional Hint (toggle; dismissed on next move — Gap 10): the Coach **highlights the best move(s)** on the board — every column whose solver score ties the maximum — and names the reason from `classify()`; **no numeric scores shown** (see cross-cutting *Hints*). **Mockup divergence:** `screens_sparring.jsx` renders a numeric column-score row on Hint; the build does not.
- When the user plays as **Gray** (second), the AI auto-plays move 1 on game start. **Verify move-perspective correctness when the AI opens** (`project_parity_bug_ai_first`: human/AI evaluation was historically swapped in AI-first games).
- Toolbar: Hint + Resign (→ Post-Game Review, records Loss — Gap 17)
- Game end: 4-in-a-row detection (win/loss) or board full (draw) → save game → Post-Game Review
- `track('game_ended', { result, moveCount, difficulty })`

*Game record persistence:*
- On game end: `POST /api/games` saves record to new `games` table: `{ id, user_id (nullable), device_uuid, moves (movestring), difficulty, side, result, created_at }`
- **New DB migration required**: `games` table
- Game ID returned from API; passed to Post-Game Review for analysis

**Client-side AI logic (extending `aiDifficulty.js`):**
- Deliberate mistake rate per difficulty (Gap 11): Easy ~every 4, Medium ~every 7, Hard ~every 15, Perfect never
- Deliberate mistake: select second-best move by `/api/scores`; emit Coach phrase "Oops. Did I just give you something?"
- `POST /api/evaluate-move` for real-time Coach phrase after user moves
- Win detection: `checkWin(board)` client-side; verify reusability from existing codebase first

**NOT included:** post-game analysis, timeline, Position Explorer.

**Estimated spec:** 160–180 lines. **Estimated tasks:** 15–17.

**Depends on:** Epic 1a, Epic 1b, Epic 7, Epic 2a (reuses `POST /api/evaluate-move`).

---

### Epic 3b — Post-Game Review & Position Explorer

Lazy analysis, timeline, position rewind, blunder capture.

**Frontend screens:**

*Post-Game Review (`review` screen):*
- `CoachDialog` summary phrase (once analysis completes)
- Compact `Board` frozen at game end
- Accuracy card: accuracy % + quality dot legend
- Move timeline: nodes start gray "pending"; update as scores arrive; `?` for timeouts (Gap 4). **Mockup divergence:** the mockup timeline (`screens_sparring.jsx`) renders *every* move including the AI's, numbered 1–N; the build shows **only the user's moves** numbered in user-move order (Gap 12). Gap 12 governs — do not follow the mockup here.
- Tap non-optimal node → Position Explorer
- "Clean game" Coach phrase + disabled Prev/Next if no mistakes (Gap 12)

*Lazy analysis + blunder capture:*
- On review screen open: `POST /api/games/analyze` with game ID (fetches movestring from `games` table)
- Per-move quality resolved as scores stream in; timeline updates node by node
- 8s timeout per move → `?`, excluded from accuracy (Gap 4)
- **On analysis complete**: for each move with `quality === 'blunder'`, write to the **existing** `blunders` table (created in migration `001`/`005`: `{ id (uuid), user_id, puzzle_id, board_state, move_played, correct_move, pattern_category, resolved_at, created_at }`). **No migration needed** — only the *write trigger* is new (today blunders are written by `/api/puzzles/:id/check`; here they come from game analysis, so `puzzle_id` is null). Writes are fire-and-forget (don't block UI).
- `track('game_reviewed', { gameId, accuracy, blunderCount })`

*Position Explorer (`explorer` screen):*
- `Board` rewound to mistake position: `tr` overlay on played column, `td` on threat cells
- Interactive "try alternative" board; AI responds at same difficulty (Gap 16)
- Deep Reveal on tap: check `explanation_cache` first; call `/api/explain-move-llm` on miss; write to cache
- "Flag this explanation" → `llm_feedback` table
- "Start new game from here" → `POST /api/games/from-position`
- Prev / Next mistake navigation (Gap 12)
- `track('mistake_reviewed', { gameId, moveIndex, category })`
- `track('deep_reveal_viewed', { context: 'position_explorer', cached })`

*Deep Reveal on `?` nodes:*
- Show Tier 1 classifier phrase inline + "Detailed explanation unavailable." (no LLM call — Gap 4)

**Backend / API (new):**
- `POST /api/games/analyze` — `{ gameId }` → fetches movestring from `games` table; returns per-move `{ moveIndex, col, quality, score, bestScore }` array + `accuracy` + `summaryPhrase`. 8s timeout per move.
- `POST /api/games/from-position` — `{ gameId, N, difficulty, side }` → game init payload for Game Board. Handles turn parity: N moves played → `(N % 2 === 0) ? firstPlayer : secondPlayer`.

**NOT included:** server-side async job (dropped); blunder review surface (Epic 3c).

**Estimated spec:** 185–205 lines. **Estimated tasks:** 16–19.

**Depends on:** Epic 3a, Epic 2a (shared move-quality scorer), Epic 2b (Deep Reveal panel component).

---

### Epic 3c — Past Mistakes Review

Lets authenticated users revisit blunders captured during post-game analysis and ask the Coach what the better move was.

**Frontend screens — mockup `screens_mistakes.jsx`** (`MistakesList` → `mistakes` screen, list-state variants `in`/`empty`/`out`(anonymous); `MistakeDetail` → `mistakeDetail` screen; the Stats "Review past mistakes" link is already wired in `screens_home.jsx`).

*Past Mistakes list (`mistakes` screen, accessible from Stats):*
- List of blunder cards: board thumbnail (compact Board, non-interactive), pattern category tag, date, "Reviewed" badge if `resolved_at` is set
- Filter tabs: All / Unreviewed / Reviewed
- Tap a card → Mistake Detail view
- Empty state: "No mistakes captured yet — play a game and review it after."
- `track('screen_viewed', { screen: 'mistakes' })`

*Mistake Detail view (`mistakeDetail` screen):*
- `CoachDialog`: "You played col N here. Let me show you what worked better."
- `Board` at the mistake position with `tr` overlay on the move played + `td` on opponent threat
- "What should I have played?" CTA → Deep Reveal for the best move
  - Check `explanation_cache` first; call `/api/explain-move-llm` on miss; write to cache on response
  - "Flag this explanation" → `llm_feedback` table
- "Mark as reviewed" button → sets `resolved_at` on `blunders` row; updates card badge
- Prev / Next navigation through blunder list
- `track('mistake_reviewed', { blunderId, category })`
- `track('deep_reveal_viewed', { context: 'past_mistakes', cached })`

**Backend / API — REUSE existing endpoints (do not build `/api/blunders`):**
The server already has a blunder-review API and `CoachPage.jsx` already implements a review-mode UI. This epic is a *reskin + small extension* of that, not a new backend.
- **Reuse `GET /api/coach/queue`** — already returns the user's unresolved blunders ordered, with the next puzzle. Extend it to: (a) drop the `requirePaid` gate (Past Mistakes is free for any authenticated user, Gap 24); (b) accept a `?status=all|unreviewed|reviewed` filter and pagination (20/page) for the list view; (c) return enough fields per blunder for the card (board thumbnail, category, date, `resolved_at`).
- **Reuse `POST /api/coach/queue/:blunderId/resolve`** for "Mark as reviewed" (sets `resolved_at`). **Fix the pre-existing bug:** it calls `parseInt(blunderId)` but `blunders.id` is a `uuid` — use the raw string id.
- Deep Reveal still uses `/api/explain-move-llm` + `explanation_cache` (cross-cutting).
- The existing `CoachPage` review UI and `/coach` route are retired in Epic 1b; its review logic moves into the new `mistakes` screen.

**NOT included:** spaced-repetition scheduling (out of scope), weakness map / prescriptive drills (Gap 22), anonymous blunder history (blunders require `user_id`; anonymous users see "Sign up to save your mistakes" prompt).

**Estimated spec:** 100–120 lines. **Estimated tasks:** 8–11. *(Smaller than first drafted because the queue + resolve endpoints already exist.)*

**Depends on:** Epic 3b (blunders written there), Epic 7 (requires authenticated user).

---

### Epic 4 — Lesson Infrastructure & Saga Map

Entirely greenfield. Lesson content = JSON files in repo (Gap 5); progress in IndexedDB/Supabase via store.

**Frontend screens:**

*Saga Map (`saga` screen) — Variant C only for MVP:*
- Clean list spine (Variant C); Variants A/B deferred to post-MVP
- Node states: done, current (pulse ring), unlocked (dashed outline), locked (padlock)
- Pro badge on Lessons 8–11; tap locked → `UpgradeModal`
- `track('screen_viewed', { screen: 'saga_map' })`

*Concept Screen (`concept` screen):*
- TopBar: lesson name + slide counter "N / M"
- `CoachDialog` multi-message feed
- Static annotated `Board` with overlays from lesson JSON; legend row; info card
- Continue → next slide / Socratic / first Confirmation Challenge
- `track('lesson_started', { lessonId })` on first slide

*Socratic Board (`socratic` screen):*
- Interactive `Board` at lesson's Socratic position
- States: `ask` → `correct` (Coach affirms) / `wrong` (retry) / 2nd wrong (correct column highlighted → auto-advance) — Gap 7
- Toolbar: Hint (static)

*Confirmation Challenges (`clchallenge` screen):*
- Reuses `ChallengeBoard` from Epic 2a with `lessonMode` flag. **`lessonMode` prop contract (defined here, consumed here):** when `lessonMode={true}`, `ChallengeBoard` swaps the header to the lesson name (i18n key from the lesson JSON `title`) and on set completion navigates to the Saga Map screen instead of the Post-Set Summary screen. The `lessonMode` prop is added to `ChallengeBoard` in Epic 4's implementation — it is not part of Epic 2a's deliverables.
- Header: "← [Lesson Name] — Practice"
- Last challenge complete → return to Saga Map; lesson marked done
- Completion: past all slides + ≥1 correct answer; Lesson 4 completes on last slide only (Gap 7)
- `store.saveLessonProgress(lessonId, 'complete')` written immediately on last step
- `track('lesson_completed', { lessonId })`

**Backend / API:**
- Server loads all `lessons/lesson-NN-*.json` at startup; validates schema
- `GET /api/lessons` — `[{ id, title, order, free: bool }]`
- `GET /api/lessons/:id` — full lesson JSON

**Lesson JSON schema:**
```json
{
  "id": "lesson-05-claimeven",
  "title": "Claimeven",
  "free": true,
  "slides": [{
    "coachMessages": [{ "text": "...", "lead": "...", "faded": false }],
    "boardSpec": ["dg", "g", "dgd", "gdg", "dg", "d", ""],
    "overlays": [{ "c": 2, "r": 3, "type": "claim" }],
    "legendItems": [{ "type": "claim", "label": "Even square Yellow should own" }],
    "infoProse": "By answering above each Red disc..."
  }],
  "socratic": { "boardSpec": ["d", "g", "dg", "gd", "d", "", ""], "correctCol": 4 },
  "confirmationCategory": "claimeven"
}
```

**NOT included:** actual lesson content (Epic 5), puzzle data (Epic 6).

**Estimated spec:** 195–220 lines. **Estimated tasks:** 17–20.

**Depends on:** Epic 1a, Epic 1b, Epic 7, Epic 2a (Confirmation Challenges reuse `ChallengeBoard`).

---

### Epic 5 — Lesson Content (11 Lessons)

Content authoring + targeted backend additions per lesson-curriculum.md.

| Lesson | Socratic? | Backend addition |
|--------|-----------|-----------------|
| 1: Spot the Win | Yes | Add `immediate_threat` to `PATTERN_KB` in `llmCoachHelpers.js` |
| 2: Block Before You Build | Yes | Add `forced_block` to `PATTERN_KB` |
| 3: The Fork | Yes | None (already complete) |
| 4: Odd Rows Belong to Red | No | None (reading-only) |
| 5: Claimeven | Yes | Basic narration prose for simulation trace |
| 6: Z-Threats | Yes | Narration template in `buildPromptContext` citing `badgeCount` from `highlightMetadata` |
| 7: Claimodd | Yes | New `detectClaimodd` (~25 lines sync) + `PATTERN_KB.claimodd` |
| 8: Undercut | Yes | Generation-time query: `detectUndercut` fires on non-`correct_col` column |
| 9: Overcut | Yes | Add `reason: string` (~10 lines) to `detectOvercut` result |
| 10: Figure-7 Trap | Yes | Narration template citing both threat rows from `categoryEvidence.threat_cells` |
| 11: J-Shape | Yes | Narration template citing triple-threat directions |

**Additional:**
- Extend `server/challengeSets.js` (Epic 2a) with Pro-category entries: undercut, overcut, figure_7, j_shape
- Add Pro-category Coach phrase **pools** (arrays of i18n keys) to the phrase library (Epic 2a)
- All new user-facing strings go through i18n translation keys

**NOT included:** puzzle DB population (Epic 6).

**Estimated spec:** 175–200 lines. **Estimated tasks:** 18–22.

**Depends on:** Epic 4.

---

### Epic 6 — Data Pipeline & Puzzle Counts

Ensure puzzle DB has sufficient approved positions for all active sets and lessons.

**Scope:**
- Audit per-category approved counts; target ≥ 8 per active set
- Run puzzle factory for under-populated categories
- Claimeven: pre-filter by `colHeights` parity count ≤ 2 odd columns before expensive simulation
- Claimodd generation predicate (blocked on Epic 5's `detectClaimodd`): all-even parity + Red's turn + center col not full + `scores[3]` is max and positive
- Undercut framing (blocked on Epic 5): `detectUndercut` fires on non-`correct_col` column
- Forbidden Columns puzzle set: generate positions where ≥1 column is forbidden (opponent wins immediately on that column) and ≥1 safe column exists
- **New `odd_even_threat` category (drill for the Lesson 4 "Odd Rows" concept).** The mockup's "Odd & Even Threats" set needs a puzzle source, but Lesson 4 is reading-only with no detector today. Add a new category + generation predicate: **positions where the player has (at least) two distinct moves that each create a major threat — one landing on an odd row, one on an even row — and exactly one is the player's natural parity row** (odd for Red, even for Yellow). `correct_col` = the parity-aligned choice; the off-parity threat is the distractor ("which threat do you prefer?"). Requires:
  - adding `odd_even_threat` to `VALID_CATEGORIES` / `CATEGORY_ORDER` (free per Gap 3) and a new generation predicate (sync; parity check + immediate-threat enumeration, no extra solver work beyond existing scores);
  - a one-line `PATTERN_KB.odd_even_threat` (or reuse `derived-parity-formula`) for the Deep Reveal — coordinate with Epic 5;
  - a `challengeSets.js` entry for `odd_even_threat` (free, with a provisional star rating — author's choice, confirmed here in Epic 6);
  - i18n key pools in `en.json`: `coach.odd_even_threat.prompt.*`, `coach.odd_even_threat.hint.*`, `coach.odd_even_threat.optimal.*`, `coach.odd_even_threat.suboptimal.*`, `coach.odd_even_threat.blunder.*` — following the same pooled-key convention as all other categories;
  - **count-hiding behavior:** the Set Picker calls `GET /api/puzzles/counts` on mount; if the approved count for `odd_even_threat` is 0, the set is hidden from the picker. This uses the same mechanism as all other categories (Gap 6a) and requires no special-casing beyond having an entry in `challengeSets.js`.
  - This is a free-standing challenge set; Lesson 4 itself still has **no confirmation challenges** (Gap 7), so the set is not wired as a lesson confirmation category.
- Hand-select Socratic positions for applicable lessons; document movestrings in lesson JSON. **Source all movestrings from the DB/KB (project rule) — never hand-construct positions.**
- **Confirm and finalize star ratings** for sets absent from the mockup: `forbidden_columns`, `double_threat` (both assigned provisional values of `2` in Epic 2a), `forced_win` (provisional in Epic 2b), and `odd_even_threat` (provisional value set in this epic). Epic 6 performs post-generation quality assessment and updates these values in `challengeSets.js` if warranted. The mockup rates only 8 sets; the provisional values are the build defaults until this epic runs.
- Validation script: assert all `confirmationCategory` puzzles exist as approved with correct category

**Estimated spec:** 120–145 lines. **Estimated tasks:** 12–15.

**Depends on:** Epic 5 for claimodd/undercut predicates. Stable categories can start from Epic 1b onward.

---

## Dependency Graph

```
Epic 1a (Design Tokens & Component Library)
  └─► Epic 1b (App Shell, Navigation, Analytics, i18n)
        └─► Epic 7 (Auth & Progress Persistence)
              ├─► Epic 2a (Challenges: Set Picker, single-move board, Tier-1, scorer)
              │     ├─► Epic 2b (Challenges: Deep Reveal, Forbidden Columns, Summary)
              │     ├─► Epic 3a (Sparring: Game Board)
              │     │         └─► Epic 3b (Post-Game Review & Explorer)
              │     │                   └─► Epic 3c (Past Mistakes Review)
              │     └─► Epic 4 (Lesson Infrastructure & Saga Map)
              │               └─► Epic 5 (Lesson Content)
              │                         └─► Epic 6 (Data Pipeline)
              └─► Epic 3a (also depends on 7 for store writes)

Note: Epic 3a needs only Epic 2a (the shared move-quality scorer + `/api/evaluate-move`); it does not depend on Epic 2b.
Epic 6 stable-category work can start from Epic 1b onward.
```

---

## Suggested Ship Order

```
Epic 1a → Epic 1b → Epic 7 → Epic 2a → Epic 2b → Epic 3a → Epic 3b → Epic 3c
                            → Epic 4 → Epic 5 → Epic 6
```

**Milestone 1** — first deployable loop: 1a + 1b + 7 + 2a + 2b  
Home Hub, Stats (session-only for anon), auth, analytics, full Challenges (including Forbidden Columns multi-select), Tier 1 + Tier 2 with caching and flagging.

**Milestone 2:** + 3a — Sparring game board with Coach commentary and game persistence.

**Milestone 3:** + 3b — Post-Game Review, Position Explorer, blunder capture.

**Milestone 4:** + 3c — Past Mistakes review surface.

**Milestone 5:** + 4 + 5 + 6 — Full Lessons surface with all 11 lessons.

---

## Summary Table

| Epic | Screens / work | New backend | Spec (lines) | Tasks |
|------|---------------|-------------|-------------|-------|
| 1a. Design Tokens & Components | Shared primitives | None | 160–180 | 15–17 |
| 1b. App Shell, Navigation, Analytics, i18n | Home Hub, Stats; retire `/coach` route + `CoachPage` | `track()` + `POST /api/track` already exist — modify, not build | 130–150 | 11–14 |
| 7. Auth & Progress Persistence | Auth reskin, store extensions, Deep Reveal limit (rework existing quota: 20/wk Mon reset, move to `/api/explain-move-llm`, drop anon lockout) | None (server auth already wired) | 130–150 | 12–15 |
| 2a. Challenges: Picker + Single-Move + Tier-1 | Set Picker, single-move Challenge Board, Tier-1 feedback | shared move-quality scorer (Gap 1, NEW), `POST /api/evaluate-move` (returns keys not strings), `GET /api/puzzles/draw` (+`mixed`), `GET /api/puzzles/counts`, `challengeSets.js`, phrase library + prompt/hint pools, `PAID_CATEGORIES` remap | 150–175 | 14–17 |
| 2b. Challenges: Deep Reveal + Forbidden + Forced Win + Summary | Forbidden Columns multi-select, `forced_win` sequence set, Deep Reveal (cached + flaggable), Post-Set Summary | reuses `/api/explain-move-llm` + `explanation_cache`; `forced_win` entry in `challengeSets.js` | 130–150 | 12–15 |
| 3a. Sparring: Game Board | Difficulty Picker, Game Board | `POST /api/games` (new `games` table migration), extend `aiDifficulty.js` | 160–180 | 15–17 |
| 3b. Post-Game Review + Explorer | Post-Game Review, Position Explorer, blunder writes (table already exists) | `POST /api/games/analyze` (uses 2a scorer), `POST /api/games/from-position` | 185–205 | 16–19 |
| 3c. Past Mistakes Review | Past Mistakes list + detail | **reuses** `GET /api/coach/queue` + `POST /api/coach/queue/:id/resolve` (extend + fix uuid bug) | 100–120 | 8–11 |
| 4. Lesson Infrastructure & Saga Map | Saga Map (C only), Concept, Socratic, Confirmation Challenges | `GET /api/lessons`, `GET /api/lessons/:id` | 195–220 | 17–20 |
| 5. Lesson Content | 11 lesson JSON files + backend additions | detectClaimodd, PATTERN_KB entries, narration templates, overcut reason | 175–200 | 18–22 |
| 6. Data Pipeline | Puzzle counts, generation, `odd_even_threat` category, Socratic selection, validation | Puzzle factory, filter predicates (incl. `odd_even_threat`), validation script | 120–145 | 12–15 |
| **Total** | | | **1605–1825** | **149–178** |

---

## Post-MVP (not in this breakdown)

- Payments epic (Stripe or alternative; provider TBD)
- Papergames.io integration
- Spanish language content (`es.json` population)
- Saga Map variants A and B
- Lessons 12–13: Zugzwang Basics, Ghost Threats
- Full all-time Stats for unauthenticated users
- Dynamic daily Coach nudge on Home Hub
- Weakness map / prescriptive drills based on blunder patterns
- Advanced Training Paths
- **Settings screen** — the `[⚙]` gear shown on the Sparring Game Board (product_vision Screen 11) and the `gear` icon in Epic 1a's icon set are a non-functional placeholder for MVP; no Settings screen is specced. Wire it post-MVP.
- Premium Analytics (win rate by opening, ELO estimate, error trend over time)
