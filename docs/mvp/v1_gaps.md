# DecodeC4 v1 Gap Analysis

Identified by running the app at `http://localhost:5173` and comparing against `mvp_product_spec.md` and `specs/001-decodec4-mvp/tasks.md`.

---

## Critical blockers — app cannot be used end-to-end

### G1 · No puzzle content and no empty-state handling
**Tasks:** T031, T032, T038 (all uncomplete — human content work)

All 6 categories show "0 puzzles". When a user clicks into a category with 0 puzzles, `loadPuzzle()` silently returns early (no puzzles found) but `selectedCategory` is set, so the render falls into the `if (!puzzle)` branch and shows "Loading…" indefinitely. There is no empty state, no back-button, and no recovery path.

**Fix needed:**
- Add a "no puzzles yet" empty state in `PuzzlesPage.jsx` when the fetched category is empty.
- Create placeholder puzzles (≥1 per category, solver-verified) so the full puzzle flow can be tested locally before hand-curation is complete.

### G2 · No puzzle curation tool
**Not in spec — identified as additional gap.**

There is no internal tool to author, solver-verify, and seed puzzles. The hand-curation work (T031, T032) produces JSON files that then need a seed migration (T038). Without a lightweight interface (even a CLI script), the loop is: edit JSON → manually run solver → edit migration → re-seed. This is error-prone and slows content iteration.

**Fix needed:** A minimal internal tool — even a simple CLI or admin-only web form — that lets a curator paste a move string, see the board, run the solver against it, tag the goal predicate, and write the record directly to the DB.

### G3 · External services not connected
**Tasks:** T001, T002, T005 (Railway/Supabase/solver-on-Railway), T050 (Stripe)

None of the three external services are configured in the local environment:

| Service | Impact |
|---|---|
| Supabase missing | Auth doesn't work; all DB writes silently no-op; explanation cache disabled; blunder tracking disabled; analytics `tracks` table never written |
| Anthropic missing | All explanations fall back to `"Move in column N. Pattern: <tag>."` — the entire product value proposition is absent |
| Stripe missing | Payments don't work; paywall upgrade button calls an endpoint that returns an error |

**Fix needed:** Create a `.env` file at `connect-four/.env` (or `connect-four/server/.env`) with the required keys. The frontend also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `connect-four/.env.local`.

---

## Feature gaps — implemented but incomplete or wrong

### G4 · Multi-move puzzle flow not implemented (Fork Setup, Parity Control)
**Tasks:** T033, T041 — partially done

The spec requires: user plays → server returns `await_next` + cooperative AI move → UI applies AI piece → user plays again → final predicate evaluated.

Neither side is implemented:
- `predicates.js` never returns `await_next` for categories 4 or 6; it evaluates the move immediately as `correct`/`wrong`/`tied`.
- `PuzzlesPage.jsx` has no handler for `await_next`; it doesn't apply an AI cooperative move or advance the move sequence.

Even if puzzle content were loaded, multi-move puzzles (categories 4 and 6) would behave identically to single-move puzzles, which is incorrect.

### G5 · Coach "Start review" button non-functional
**Task:** T065

The `CoachPage` renders a "Start review" button with `onClick={() => {}}`. Clicking it does nothing. The review queue session (fetching the next blunder, presenting it as a `PuzzleBoard`, resolving on correct solve) is not wired up.

### G6 · Sparring hints-on mode: no hover hints, no heatmap, no score display
**Task:** T048

The spec says that when Commit-first is OFF, hovering over a column calls `/api/explain-move` to surface contextual warnings ("opponent can create a double threat"). No hover handler exists in `HomePage.jsx` for columns. There is also no heatmap or per-column score display in hints-on mode — these are the overlays that Commit-first is supposed to suppress, but they don't exist in either mode.

### G7 · Sparring post-commit reveal is incomplete
**Task:** T047

The spec requires the post-commit reveal to show:
1. Score of the move played
2. Engine's best move and its score
3. Pattern tag (if meaningful delta)

The current implementation only shows `oneLiner` (the pattern explanation text). There is no score comparison and no best-move highlight. The `/api/explain-move` endpoint doesn't return scores at all — this would need a new response field or a separate `/api/scores` call at reveal time.

### G8 · Coach page has no sign-in CTA for anonymous users
**Task:** T063

When an anonymous user visits `/coach`, the page shows the text "Sign in to access your Personal AI Coach." but provides no button or link to trigger sign-in. The `AuthModal` is never opened from this page. Anonymous users have no path forward.

### G9 · Deep Reveal quota not shown to user
**Task:** T010 (DeepRevealButton spec)

The spec positions the daily quota (3/day) as the primary driver for anonymous→free conversion. The `DeepRevealButton` never displays how many reveals the user has left. Users don't know their quota until they hit the 429 paywall gate. Showing "See why (2 left)" would add meaningful conversion pressure.

### G10 · Coach page sign-in gate is shown instead of paywall gate
**Task:** T063

Coach is a paid-only feature. An anonymous user sees "Sign in…" (correct first gate), but a signed-in free user has no explicit UI message telling them Coach is paid — they only see a `PaywallModal` that opens automatically when the API returns 403. The UX is abrupt; there is no visible "paid feature" label or locked state before the modal fires.

### G11 · `hard` difficulty is identical to `perfect`
**Task:** T045

T045 specifies: "hard (best with configurable error rate)". The implementation (`getAiColumn`) has no error rate for `hard` — both `hard` and `perfect` fall through to the same code path (pick randomly among columns with the highest score). There is no degraded play in `hard` mode; it is as strong as `perfect`.

### G12 · `signup_completed` and `upgrade_completed` events never fired
**Task:** T057

`AuthModal` tracks `signup_initiated` (when the user submits their email), but `signup_completed` (when the magic-link auth succeeds and the session is established) is never tracked. Similarly `upgrade_completed` (after `checkout.session.completed` webhook updates `tier='paid'`) is not tracked anywhere in the server webhook handler. Both are required KPI events for the launch funnel.

### G13 · `paywall_viewed` not tracked when DeepRevealButton quota is exhausted
**Task:** T056

When an authenticated free user's quota is exhausted, the `DeepRevealButton` receives a 429 and opens `PaywallModal`. The spec says to track `paywall_viewed` at this trigger point. The `paywall_viewed` event is only tracked in `PuzzleCategoryList` (locked category click) — it is absent from `DeepRevealButton`.

### G14 · `005_coach.sql` migration file missing despite task marked done
**Task:** T058

T058 is marked `[X]` but `connect-four/server/migrations/005_coach.sql` does not exist. The blunders table schema happens to exist inside `003_puzzles.sql`, but the migration file itself is absent. When Supabase is set up, the migration runner will find only three files — `005_coach.sql` will never be applied and the index `idx_blunders_user_unresolved` created there would be missing.

### G15 · Blunder capture fires on every failed attempt, not just the first
**Task:** T062

The blunder insert condition is `moveHistory.length === 0`. The client always sends `moveHistory: []` regardless of how many times the user has attempted the puzzle. On a two-attempt failure (attempt 1 wrong, attempt 2 wrong), two separate blunder rows are inserted for the same puzzle. The spec says "every puzzle the user fails **on the first attempt**". The server needs the client to pass the current attempt number so it can guard on `attemptNumber === 1`.

### G16 · `session_stats` table missing from all migrations
**Task:** T066

`SupabaseStore.saveSessionStats()` and `getSessionStats()` write to a `session_stats` table. This table is not defined in any of the three migration files (`001_initial.sql`, `002_explanation_cache.sql`, `003_puzzles.sql`). When Supabase is set up and migrations are applied, the table will not exist and all session-stats reads/writes will silently fail.

---

## Infrastructure / deployment not done

### G17 · Railway not deployed, Cloudflare not configured
**Tasks:** T001, T003, T005

The app only runs locally. No production deployment exists. The solver binary has not been verified on Railway Linux x64.

### G18 · Supabase project not created, migrations not applied
**Tasks:** T002, T018, T027, T030, T038, T058

No Supabase project has been created. The three SQL migrations in `connect-four/server/migrations/` have not been applied. Missing migrations:
- `004_seed_puzzles.sql` — requires puzzle content (T031/T032) first
- `005_coach.sql` — file does not exist (marked done in tasks but never created; see G14)

### G19 · Stripe products not configured
**Task:** T050 (human task)

No Stripe products created; `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID` env vars are not set. The paywall upgrade flow will fail with a server error even when Stripe is connected.

---

## Quality gates not completed

### G20 · Mobile layout not audited (T073)
The board uses fixed 40px piece cells. At 375px viewport the board (352px) plus page padding (32px) totals 384px, which may produce horizontal overflow. T073 (Chrome DevTools iPhone SE audit) has not been run.

### G21 · Analytics funnel not verified (T074)
All 8 KPI events (`session_start`, `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`, `signup_completed`, `paywall_viewed`, `upgrade_completed`) have not been confirmed to fire correctly end-to-end. Additionally, `signup_completed` and `upgrade_completed` are not tracked anywhere in code (see G12), so the funnel cannot close even when Supabase is connected.

### G22 · Hallucination gate not re-run on final build (T075)
The re-run of 100 positions × 5 LLM generations with <2% error threshold has not been executed on the current build.

### G23 · Stripe webhook lifecycle not tested (T076)
No `stripe listen` end-to-end test has been run; `stripe_events` table population is unverified.

### G24 · Auth migration (IndexedDB → Supabase) not tested (T077)
The `migrateToSupabase()` flow on first sign-in has not been verified end-to-end.

---

## Summary table

| # | Area | Task(s) | Severity | Blocks launch? |
|---|---|---|---|---|
| G1 | No puzzle content + stuck Loading UI | T031, T032, T038 | Critical | Yes |
| G2 | No puzzle curation tool | — | Critical | Yes |
| G3 | External services not connected (Supabase, Anthropic, Stripe) | T001, T002, T050 | Critical | Yes |
| G4 | Multi-move puzzle flow missing (cats 4, 6) | T033, T041 | High | Yes |
| G5 | Coach "Start review" button non-functional | T065 | High | Yes (US3) |
| G6 | Sparring hints-on mode: no hover hints, no heatmap | T048 | Medium | No (degraded) |
| G7 | Post-commit reveal: no score comparison or best-move | T047 | Medium | No (degraded) |
| G8 | Coach page: no sign-in CTA for anonymous users | T063 | Medium | No (UX friction) |
| G9 | Deep Reveal quota not displayed to user | T010 | Low | No (conversion loss) |
| G10 | Coach page: wrong gate label for free users | T063 | Low | No (UX friction) |
| G11 | `hard` difficulty identical to `perfect` (no error rate) | T045 | Low | No (degraded) |
| G12 | `signup_completed` and `upgrade_completed` never tracked | T057 | High | No (KPI blind) |
| G13 | `paywall_viewed` missing from DeepRevealButton quota gate | T056 | Medium | No (KPI blind) |
| G14 | `005_coach.sql` migration file does not exist | T058 | Medium | Yes (on deploy) |
| G15 | Blunder capture fires on every failed attempt, not just first | T062 | Medium | No (data quality) |
| G16 | `session_stats` table missing from all migrations | T066 | Medium | Yes (on deploy) |
| G17 | Railway / Cloudflare not deployed | T001, T003, T005 | Critical | Yes (production) |
| G18 | Supabase not set up, migrations not applied | T002 | Critical | Yes (production) |
| G19 | Stripe products not configured | T050 | High | Yes (monetization) |
| G20 | Mobile layout not audited (potential board overflow) | T073 | Medium | No (quality risk) |
| G21 | Analytics funnel not verified end-to-end | T074 | Medium | No (data integrity) |
| G22 | Hallucination gate not re-run on final build | T075 | Medium | No (quality gate) |
| G23 | Stripe webhook lifecycle not tested | T076 | Medium | No (payments risk) |
| G24 | Auth migration (IndexedDB → Supabase) not tested | T077 | Medium | No (data loss risk) |
