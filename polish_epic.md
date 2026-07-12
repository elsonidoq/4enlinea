# Polish Epics — `feature/polish`

Consolidated, spec-ready epic backlog covering **every** issue in `new_TODOs.md` (26 items) and
`agentic_QA.md` (2026-07-07 round 2: 1 blocker, 4 major, 5 minor). Overlapping items are folded into a single
epic and cross-referenced.

**Sizing floor:** every epic carries **≥ 4 user stories**, and every user story lists **≥ 5 concrete tasks**.
Result: **8 epics**, each in the full-speckit sweet spot (20+ tasks, multi-subsystem, ≥1 open decision).

**Epic numbers ARE the execution order.** Epics are numbered so that running them 1 → 8 never hits an
unbuilt dependency: the only hard dependency (mistake-review needs the unified counts + reachable queue) is
satisfied because Epic 1 (data integrity) precedes Epic 2 (review). Two soft dependencies are also respected —
Epic 6 (Lessons) upgrade CTA follows Epic 5 (checkout), and Epic 7 (hardening) follows Epic 5 (payment
secrets). Run each with `/epics-manager <file> N` in ascending order.

**Grouping rule:** issues are grouped by **code proximity** (same screen/component, endpoint cluster, or
subsystem), verified against the QA "Suspected code location" fields and the codebase.

**Origin tags:** `[new_TODOs #n]` · `[QA:<sev>]` · `[DUP]` = appears in both files (counted once).

**Section conventions (for `/epics-manager`).** Each epic below carries these headings verbatim, because the
`epics-manager` Reading contract reads them and reflects them into the spec without re-deriving:
`Settled decisions`, `Non-obvious facts`, `Authoritative sources of truth`, `Acceptance criteria`,
`NOT included`. The only `##` headings that name an epic are `## Epic 1 …` through `## Epic 8 …` — the
`## Overview` and `## Appendix` sections are not epics, so `/epics-manager <file> N` selects the Nth `Epic`.

**Staging-checks convention (MANDATORY for every epic).** Any epic acceptance/QA item that cannot be
fully confirmed in local dev — because it depends on a real external provider, a real cross-origin
redirect round-trip, a genuinely clean signed-out session, deploy-time config/migrations, or
production-like data — MUST be appended to **`staging_checks.md`** (repo root), under that epic's own
`## Epic N — <title>` heading, rather than being marked silently done. Record each check with its
**What / Why staging / Expected / Source** and a `- [ ]` sign-off checkbox, per the "How to add
checks" instructions at the top of `staging_checks.md`. `staging_checks.md` is the single staging
sign-off log across all epics; do not scatter staging TODOs into individual specs. Epic 3 (spec 043)
seeded this file with the persistent-logo/logged-out-CTA OAuth checks as the worked example to follow.

**User decisions already resolved** (asked this session; also recorded in each epic's `Settled decisions`):
1. Blunder unique-index → **add `user_id` to the unique index** (Epic 1).
2. Classifier-based correctness → **every category that has a classifier judges correctness by running that
   classifier on the resulting position** (not `correctCol`) (Epic 4).
3. "Mistakes" count → **blunders + suboptimal, applied consistently everywhere** (Epic 2).
4. Stripe → **thin `PaymentProcessor` adapter** with a Stripe impl behind it (Epic 5).
5. Remember-me → **long-lived by default** (extend refresh token, silent refresh, no UI toggle) (Epic 5).
6. Security → **audit + fix the safe items in-scope**; risky items become follow-up tickets (Epic 7).

---

## Overview

**Execution order = numeric order (1 → 8).** Rationale per step:

1. **Epic 1 — Server Data Integrity.** First: contains the QA blocker (unique-index data loss) and the data
   foundation (reachable queue + correct counts) that Epic 2 builds on.
2. **Epic 2 — Mistake Review Overhaul.** Depends on Epic 1's unified counts + queue reachability.
3. **Epic 3 — UI/UX & Accessibility Polish.** Independent, high-visibility quick wins.
4. **Epic 4 — Puzzle Generation & Correctness.** Independent; content-quality work.
5. **Epic 5 — Account: Session & Paid Checkout.** Enables paid tier; must precede Epic 6's upgrade CTA and
   Epic 7's payment-secret hardening.
6. **Epic 6 — Lessons.** Its tier-lock upgrade CTA wires into Epic 5's checkout.
7. **Epic 7 — Platform Hardening & Cost Observability.** Pre-launch; hardens Epic 5's payment secrets.
8. **Epic 8 — Onboarding.** Last: most open design; benefits from the rest being stable.

| # | Epic | Merged from (draft) | Issues | Subsystem / shared surface | Stories | Verdict |
|---|------|---------------------|--------|----------------------------|---------|---------|
| **1** | Past Games & Mistakes: Server Data Integrity | E4+E5 | #11[QA:C],#10, QA:A(blocker),#26[QA:B] | `/api/coach/queue`,`/api/puzzles/counts`,`/api/stats`,`/api/games`,`/api/coach/weakness-map`; index migration; `insertGameBlunder.js`,`papergamesImporter.js`; MistakesListScreen, SettingsScreen | 6 | Full speckit |
| **2** | Mistake Review Unification & Deep-Reveal Overhaul | E1+E2+E3 | #21,#16,#23,#7,#18, QA:D/E/F/G/H/I | MistakeDetailScreen, ReviewScreen, DeepRevealPane/SplitReveal, `urlMapping.js`, reason render, `/api/games`,`/api/stats` | 6 | Full speckit |
| **3** | Global UI/UX & Accessibility Polish | E14 | #1[DUP],#2,#5,#6,#25 | Board.jsx, TopBar.jsx, PastGamesListScreen, HomeScreen, AuthModal | 4 | Full speckit |
| **4** | Puzzle Generation & Correctness | E10+E11 | #9,#13,#15,#14 | `candidate-generator.js`,`classifier.js`,`categories.js`, CompletionStrategy, `docs/knowledge-base/` | 5 | Full speckit |
| **5** | Account: Session Persistence & Paid Checkout | E6+E7 | #22,#24 | `server/index.js` auth/cookies, new `payments/` module, UpgradeModal, user tier | 4 | Full speckit |
| **6** | Lessons: Progression, Audio & Polish | E9 | #8,#17,#3 | SagaScreen, lesson JSON, `/admin/lessons`, ConceptScreen/Board, CoachDialog TTS | 5 | Full speckit |
| **7** | Platform Hardening & Cost Observability | E8+E12 | #12,#19,#20 | `package.json`/audit, `index.js`/`adminAuth.js` deploy gates + headers, repo hygiene, `llmCoachHelpers.js` `callLLM`, `mechanismExplainer.mjs` — grounded in **`docs/security_audit_fable.md`** | 5 | Full speckit |
| **8** | Onboarding Experience | E13 | #4 | new onboarding flow/screens, first-run routing, store flag | 4 | Full speckit |

**Coverage:** every `new_TODOs.md` #1–#26 and every QA finding (A/blocker, C/D/E/I majors, B/F/G/H minors)
maps to exactly one epic (traceability table in the Appendix).

---

## Epic 1 — Past Games & Mistakes: Server Data Integrity

**Intent:** Make all persisted blunders reviewable, all aggregate counts correct at scale, and fix the latent
import blocker where a second user loses all blunders.

**Issues covered**
- `[QA:major C]` `[DUP new_TODOs #11]` `/api/coach/queue` hard-capped `.limit(50)` (`server/index.js:2508`), no
  pagination → 87/137 blunders + whole categories (undercut ×8, forced_win ×1) unreachable (cards derived from
  the truncated page).
- `[new_TODOs #10]` `/api/puzzles/counts`, `/api/stats`, `/api/games` (blunder counting), `/api/coach/weakness-map`
  fallback fetch all rows + aggregate in JS, missing `.limit()` → silent 1000-row truncation.
- `[QA:blocker A]` `idx_blunders_papergames_unique` omits `user_id` → 2nd user importing an overlapping
  papergames account: every insert collides (`23505`), silently dropped → 0 blunders.
- `[QA:minor B]` `[DUP new_TODOs #26]` No "view imported games" CTA after a successful import.

**Non-obvious facts** (confirmed code locations + traps)
- `server/index.js` — `/api/coach/queue` (`:2477`, `.limit(50)` `:2508`), `/api/stats` (`:1242`),
  `/api/games` (`:1808`), `/api/coach/weakness-map` fallback. `/api/puzzles/counts` (`:1333`) **already uses
  DB-side `count()`** — no conversion needed; not part of US1.3.
- `src/screens/CategoryListScreen.jsx:35` — category cards derived from `fetch /api/coach/queue?status=all`
  (the truncated, `.limit(50)` page), not `MistakesListScreen.jsx`. `MistakesListScreen.jsx` is the
  per-category detail list and already fetches server-filtered by `?category=` (also capped at 50).
- `server/insertGameBlunder.js` treats `23505` as a benign dup; `server/papergamesImporter.js` counts the
  collision as `ok` → `blunderErrors:0`. This is a symptom, not the root cause of the silent loss: the real
  cause is `papergames_games` (see below) flipping game ownership before any blunder insert happens.
- `papergames_games` has a **global** `UNIQUE (papergames_room_uid)` (`db-schema.md:149`).
  `papergamesImporter.js:163` `upsertGame` upserts with `onConflict: 'papergames_room_uid',
  ignoreDuplicates: false` — when user B imports a room user A already imported, this **updates the
  existing row and flips its `user_id` to B**, returning the same `papergames_games.id`. Result: A's game
  vanishes from A's Past Games (row now owned by B), and B's blunders point at the same shared
  `papergames_game_id`. Fixing only `idx_blunders_papergames_unique` (adding `user_id`) does not fix this —
  the game row itself must be per-user.
- `src/screens/SettingsScreen.jsx` — import success state renders plain text, no CTA.
- Current blunder index: `UNIQUE (papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL` —
  **no `user_id`**.
- `VALID_BLUNDER_TAGS` (`server/blunderTags.js:12,14`) includes `undercut`+`forced_win` — their omission from
  the card list is a bug, not an intentional exclusion.
- `/api/stats` computes `byPattern` correctly from `puzzle_attempts JOIN puzzles` — it **is** populated. The
  "always empty `byPattern`" trap belongs to `GET /api/user/session-stats/all`, not `/api/stats`
  (memory `project_stats_architecture`); do not conflate the two.
- The migration-041-style batch-rollback trap does **not** apply here: `insertGameBlunder` inserts row-by-row
  with per-row `23505` handling, not a batch insert that can partially roll back.

**Authoritative sources of truth**
- **Spec 030** (`030-server-mediated-data-access`) — the governing contract for these endpoints: **all data
  flows through `/api/*`; no direct client DB access**. Any pagination/count change here must keep aggregation
  server-side — do not push a client-side aggregation that reads rows directly. Memory
  `project_spec030_server_mediated_data_access` (asymmetric write shapes — must not unify).
- Memory `project_stats_architecture`, `project_spec038_papergames_self_service_import` (loadUser 3-site trap),
  `reference_supabase_connection`, `project_secret_scan_placeholders`.
- `docs/architecture/api-conventions.md`, `db-schema.md`, `data-model.md` — read/update.
- `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- Change the blunder index to `UNIQUE (user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`
  (a DB-level constraint, not app-level dedupe).
- **Root-cause fix (expanded):** change `papergames_games` from a global `UNIQUE (papergames_room_uid)` to
  `UNIQUE (user_id, papergames_room_uid)`, and update `upsertGame`'s (`papergamesImporter.js:163`)
  `onConflict` key from `'papergames_room_uid'` to `'user_id,papergames_room_uid'`. Each user then gets
  their own game row for a shared room; the blunder-index change alone is necessary but not sufficient.
- **Count-semantics scope (D1):** US1.3's `count()` conversion is scale-only — it fixes the >1000-row
  truncation bug but preserves the current blunder-only definition of "count" exactly as-is. Redefining
  *what* is counted (e.g. mistakes vs. blunders) is out of scope here and belongs to Epic 2 (US2.2).
- **Category-count delivery (D2):** add a dedicated `GET /api/coach/category-counts` (or
  `/api/coach/queue/counts`) endpoint returning `{ category: count }` via DB-side `count()`. This lets the
  `/api/coach/queue` list stay paginated while `CategoryListScreen` cards stay complete at any scale,
  honoring Spec 030 (server-side aggregation).

### User stories & tasks

**US1.1 — Review all blunders (queue pagination).**
*As a player with many blunders, I want to reach all of them.*
1. Add pagination (offset/limit or cursor) to `/api/coach/queue`, keeping severity-desc/created_at-asc ordering.
2. Raise/remove the `.limit(50)` cap so no blunder is permanently unreachable.
3. Update MistakesList/coach consumers to page (load-more or full fetch).
4. Preserve the existing response contract (`api-conventions.md`); pagination params additive.
5. Test: with 137 blunders all are reachable; "N to review" reflects the full count.

**US1.2 — Category cards from DB-side counts.**
*As a player, I want a card for every category that has blunders.*
1. Replace `CategoryListScreen.jsx`'s cards (currently derived from the truncated `/api/coach/queue?status=all`
   page) with the new `/api/coach/category-counts` (D2) DB-side per-category `count()`.
2. Ensure every category with ≥1 blunder gets a card (verify undercut, forced_win appear).
3. Confirm categories map to `VALID_BLUNDER_TAGS`; no valid tag omitted.
4. Wire `?category=` drill-down to `MistakesListScreen.jsx`'s full per-category list.
5. Test: cards present for all DB categories at 137-blunder scale.

**US1.3 — Correct aggregates at scale (no 1000-row truncation).**
*As a player, I want counts to stay correct beyond 1000 rows.*
1. Convert `/api/stats` aggregates to `count()`/pagination. (`/api/puzzles/counts` already uses DB-side
   `count()` — no change needed there.)
2. Fix `/api/games` blunder counting to `count()` not unbounded select.
3. Fix `/api/coach/weakness-map` fallback aggregation.
4. Add the new `/api/coach/category-counts` endpoint (D2), DB-side `count()` grouped by category.
5. Preserve the current blunder-only definition of "count" in every endpoint touched here (D1); do not
   redefine what is counted — that is Epic 2 (US2.2) scope.
6. Test each endpoint with >1000 rows returns a correct count.

**US1.4 — Second-user import persistence (game ownership + unique index).**
*As a second user importing a public account, I want my own game and my own blunders.*
1. Migration: change `papergames_games` from global `UNIQUE (papergames_room_uid)` to
   `UNIQUE (user_id, papergames_room_uid)`.
2. Update `upsertGame` (`papergamesImporter.js:163`) `onConflict` from `'papergames_room_uid'` to
   `'user_id,papergames_room_uid'` so each user gets their own game row.
3. Migration: drop & recreate the blunder partial unique index as
   `UNIQUE (user_id, papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`; name it.
4. Decide/execute backfill vs clean recreate (single-user DB).
5. Verify `insertGameBlunder` collision semantics against the new blunder index.
6. Update `db-schema.md` / `data-model.md` for both constraint changes.
7. Test: user A imports id X, user B imports same X → B has its own game row and own blunders; A's game
   row and blunders are untouched.

**US1.5 — Honest importer error reporting (surface existing counts; verify post-B1).**
*As a user importing, I want to see real success/error counts.*
1. Surface the already-computed `blunderErrors`/`skipped` counts (`papergamesImporter.js:355-356`,
   `insertGameBlunder.js` already returns `false`/logs on genuine non-`23505` errors) in the import result
   payload returned to the client.
2. Reflect these counts in the `SettingsScreen` import copy (e.g. "N blunders skipped as duplicates").
3. Regression test: post-US1.4, a cross-user import of the same room no longer hits `23505` at all (since
   each user now gets their own game row); `23505` on the blunder index means exclusively a genuine
   same-user re-import.
4. Test: re-import same id same user → no dup rows, no false errors.

**US1.6 — View-imported-games CTA.**
*As a user who just imported, I want a button to my imported games.*
1. Add an interactive CTA in the SettingsScreen import success state → Past Games.
2. Pass imported filter/context so the CTA lands on the right list.
3. Handle partial-import result copy.
4. i18n the CTA.
5. Test: post-import snapshot has an interactive element linking to Past Games.

**Acceptance criteria**
- With 137 blunders, all are reachable and every category with ≥1 blunder (incl. undercut, forced_win) has a card.
- Each aggregate endpoint returns a correct count with >1000 rows (no silent truncation).
- User A imports id X, user B imports same X → B has its own game row and its own blunders; A's game
  remains visible in A's Past Games and A's blunders are intact.
- Re-import same id as the same user → no dup rows, no false `blunderErrors`.
- Post-import, SettingsScreen shows an interactive element linking to Past Games.

**NOT included:** the mistake-count *definition* (Epic 2); MistakesList redesign beyond count-driven cards.

**Sizing verdict — Full speckit.** 6 stories × ≥5 tasks; server + frontend + DB migration; open decisions
(pagination style; backfill). Migration + data-integrity risk warrant `/plan` + contracts.

**Open questions (`/clarify`):** offset vs cursor pagination; lazy load-more vs full-count cards; backfill need.

---

## Epic 2 — Mistake Review Unification & Deep-Reveal Overhaul

**Intent:** Make suboptimal moves and blunders one concept in one review screen, make that screen survive
deep-links/reload/back, actually replay moves, and stop leaking internal data into user-facing UI and prose.

**Issues covered**
- `[new_TODOs #21]` Unify sub-optimal move with blunder; same screens; merge blunder view + explorer view; the
  "start a game from here", "what should I have played", "mark as reviewed" buttons in the merged window; no
  dead code remains.
- `[new_TODOs #16]` "No mistakes" must not mean "no blunders" — mistakes = blunders + suboptimal.
- `[QA:major E]` Direct-URL/reload `/blunder/:id` → wrong "Move N / 1", "1 of 1", drops "Start new game from here".
- `[QA:major I]` `/mistakeDetail` reload silently redirects to Home.
- `[new_TODOs #23]` Back button toggles game↔blunder forever; expected blunder → game → past games → home.
- `[QA:major D]` ReviewScreen stepper (Prev/Next + chips) doesn't drive the board; blunder chips don't navigate.
- `[QA:minor H]` Raw debug fields leak (`sev:6 tree:0.28`, raw movestring).
- `[QA:minor G]` double_threat fork square (e.g. `c2r1`) not highlighted.
- `[new_TODOs #7]` Draggable split un-zooms the board when dragged too high.
- `[new_TODOs #18]` `[QA:minor F]` Deep reveal must never emit `community-*` labels or raw `cXrY` tokens in prose.

**Non-obvious facts** (confirmed code locations + traps — reflect verbatim, do not re-derive)
- `src/screens/MistakeDetailScreen.jsx` renders debug fields around `:359` (`blunder.board_state`, i.e. the raw
  movestring content), `:362` (`sev:{severity}`), `:364` (`tree:{blunder_severity}`); header/pagination/actions
  live here too.
- `src/screens/ReviewScreen.jsx` — `navigateToMistake`, the chip row + Prev/Next stepper.
- `src/screens/PastGamesListScreen.jsx` — `blunder_count` chip / `no_blunders` label at `:108–115`.
- `src/components/DeepRevealPane.jsx`, `src/components/SplitReveal.jsx` — deep-reveal + split drag.
- `src/lib/urlMapping.js` (URL_MAP) + `handleBack` — routing/back-stack.
- `server/index.js` — `/api/games`, `/api/coach/queue`, `/api/coach/weakness-map` counts (NOT `/api/stats` —
  that endpoint aggregates `puzzle_attempts` only and is out of scope for this epic). Reason render:
  `server/scripts/reason_engine/reasonEngine.mjs`, `server/explainContext.js`, `server/llmCoachHelpers.js`.
- Already shipped, do not re-do: `src/lib/urlMapping.js:22` already has exactly `/blunder/:id` (no bare
  `/blunder`) — the "URL_MAP must replace, not add" trap is already satisfied. `is_owner !== false` (treating
  `undefined` as truthy) is already implemented at `MistakeDetailScreen.jsx:441` — do NOT simplify to
  `blunder.is_owner`, but no fix is needed here either.
- Already shipped, do not re-do: the per-game mistake count is already inclusive — `blunderCountsForGames.js`
  applies no `quality` filter, and both `quality === 'blunder'` and `quality === 'suboptimal'` rows are
  persisted at post-game analysis (`server/index.js:~2150`); the coach-queue count has an explicit comment at
  `index.js:2437` confirming both qualities are counted. The residual gap is **labeling only** (see US2.2).
- Trap: `GET /api/blunders/:id` is the only blunder endpoint without a `user_id` filter (intentional public
  permalink). Papergames blunders key on `papergames_game_id`, not `game_id`.
- Trap: reason render is **render-only** — do not weaken the engine or alter stored evidence (reason-INVARIANTS I0).

**Authoritative sources of truth** (read before speccing)
- Memory `project_suboptimal_blunder_unification` — **partial/shipped:** `blunders.quality` column exists,
  `ExplorerScreen` deleted, `navigateToMistake` routes all non-optimal nodes to `blunderDetail`. Remaining
  delta: surface both qualities in one screen, guarantee the 3 buttons, dead-code sweep, count redefinition.
- **Spec 037** + memory `project_spec037_review_blunder_sharing` — permalink endpoint, `is_owner`, URL_MAP
  replace rule, cold-boot single-item `blunderNavList`, back-from-cold-boot → `home`; 4 open bugs.
- `docs/architecture/reason-render-grounded-prompt.md` + `reason-INVARIANTS.md`.
- Memory `reference_review_screen_nav`, `project_highlight_cell_colors` (`userIsYellow` role assignment).
- `docs/architecture/api-conventions.md`, `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- Mistake count = **blunders + suboptimal, everywhere** (Past Games, coach queue, weakness-map, any "N
  mistakes" label). This is already true in code today (no server change required — see Non-obvious facts);
  the remaining work is renaming the *surfaced concept* from "blunders" to "mistakes" in labels/i18n/copy, and
  auditing that no endpoint silently filters to `quality='blunder'`.
- Wire name: **keep `blunder_count` as the API field name.** Only user-facing labels/i18n change to
  "mistakes." A field rename to `mistake_count` is a follow-up ticket, not in scope here (isolates risk, keeps
  the diff reviewable).
- Severity UI: **two severities, one layout.** Suboptimal and blunder plies share the same component/structure
  in the unified detail screen; only a severity chip differs (distinct color + label "Blunder" vs
  "Suboptimal"). This keeps the "same screen, all 3 buttons" acceptance criterion trivially satisfiable.

### User stories & tasks

**US2.1 — Unified mistake detail screen (suboptimal + blunder).**
*As a player, I want suboptimal moves and blunders shown in one consistent detail view.*
1. Audit every route/component that renders a non-optimal ply; confirm no explorer-era route/component remains (`rg -i explorer src/`).
2. Render any `blunders` row in `MistakeDetailScreen` regardless of `quality`; add severity-aware styling (blunder vs suboptimal).
3. Guarantee the merged screen always exposes "Start new game from here", "What should I have played?" (deep reveal), "Mark as reviewed" (honor `is_owner !== false` gate).
4. Update `ReviewScreen.navigateToMistake` to route both qualities to the unified screen; verify no explorer fallback path.
5. Remove dead explorer props/i18n; add a test that a suboptimal ply and a blunder ply both mount the same component with all 3 buttons.

**US2.2 — Rename the surfaced concept from "blunders" to "mistakes" (terminology/labeling).**
*As a player, I want "N mistakes" to include suboptimal moves so a lost game never reads "no mistakes."*
The count arithmetic already includes suboptimal moves everywhere that matters (`/api/games`, coach queue,
weakness-map) — `blunderCountsForGames.js` applies no `quality` filter and both qualities are persisted at
analysis time. This story is **not** about adding suboptimal to a sum; it is about relabeling what users see,
and about proving (not assuming) no endpoint quietly filters to `quality='blunder'`.
1. Audit `/api/games`, `/api/coach/queue`, and `/api/coach/weakness-map` to confirm none filters on
   `quality='blunder'` (they should not — this is a regression check, not new server logic). `/api/stats` is
   explicitly **out of scope**: it aggregates `puzzle_attempts` only and has no blunders/suboptimal concept to
   fix.
2. Update `PastGamesListScreen` chip + `no_blunders` copy/i18n (`en.json`) to say "mistakes" instead of
   "blunders" (e.g. `no_blunders` → a "no mistakes" string), keeping the wire field name `blunder_count`
   unchanged (see Settled decisions).
3. Sweep other user-facing labels/i18n keys that say "blunder" where the underlying count already includes
   suboptimal moves (chips, headers, coach copy) and rename to "mistake"/"mistakes".
4. Add/keep a regression test: a game with 0 blunders + ≥1 suboptimal shows a non-zero mistake count in Past
   Games (this should already pass — it guards against a future regression, it is not new behavior).

**US2.3 — Permalink & reload survival.**
*As a player opening a blunder link or reloading, I want correct move number, pagination, and all actions.*
1. Derive header "Move N / M" (M = parent game total move count) from `/api/blunders/:id` + `game_id`, not router/list state.
2. Derive sibling pagination ("X of Y") from the game's blunder set, not a passed-in list.
3. Ensure "Start new game from here" renders on cold/direct load.
4. Give `/mistakeDetail` a URL param (`/mistakeDetail/:category`) or state-recovery so reload restores the category list instead of redirecting home.
5. Reconcile the fresh-load-vs-direct-load nav divergence (QA note on D/E); add tests for direct-URL `/blunder/:id` and `/mistakeDetail` reload.

**US2.4 — Back navigation & move-replay stepper.**
*As a player, I want linear Back and a stepper/chips that actually move the board.*
1. Fix `handleBack` so a game-link-reached blunder walks blunder → game → past games → home (no cycle).
2. Make ReviewScreen Prev/Next drive the rendered board (`__bsig` must change per step).
3. Make move-quality chips change the board on click; a red blunder chip navigates to `/blunder/:id`.
4. Resolve papergames blunders via `papergames_game_id` (not only `game_id`) when building the chip→blunder map.
5. Add a nav-trail test (pathname sequence) + a stepper board-signature test.

**US2.5 — Remove internal-token & debug leakage.**
*As a player, I never want raw debug fields or internal tokens in the UI/prose.*
1. Remove raw debug fields from the `MistakeDetailScreen` legend (`sev:`, `tree:`, raw movestring, `:359–364`).
2. Strip the `community-` prefix from every KB slug/label before it reaches prose (generalize all `community-*`).
3. Translate raw `cXrY` tokens to "column N" (0-idx→1-based at display) or defer to the highlight — render-only, no engine change (respect I0).
4. Find the single render choke-point across `reasonEngine.mjs`/`explainContext.js`/`llmCoachHelpers.js`; apply the guard once (avoid a partial fix).
5. Add a render-layer test asserting no `community-` and no `cXrY` substring; run `npm run test:fast` (reason tests green).

**US2.6 — Deep-reveal highlight & split-pane integrity.**
*As a player, I want every named cell highlighted and a stable board zoom while dragging the split.*
1. Highlight every cell named in prose (correct block, played move, and the fork/threat square).
2. Reuse existing highlight-role assignment (`userIsYellow` / P1–P2 color table) so coloring stays correct.
3. Fix `SplitReveal` so dragging the split too high does not un-zoom / re-enlarge the board.
4. Clamp/persist board zoom independent of split position.
5. Add an interaction test for the double_threat highlight using the two detector-verified boards below, and
   for split-drag zoom stability.

*Verified double_threat boards* (movestring `33243432244` / cell `c2r1` was invalid — that cell is occupied on
that board and `detectDoubleThreat` returns `matched:false` for it; replaced 2026-07-08 with the following,
both verified via `detectDoubleThreat` in `server/classifier.js`):
- `41442625312235115445550126400` — double threat for **P1 (Green)**; detector-reported cells `c1r4` and
  `c4r3` (cols 0-indexed [0,3]).
- `3333364101252113121524` — double threat for **P2 (Gray)**; detector-reported cells `c5r3` and `c7r2` (cols
  0-indexed [4,6]).

**Acceptance criteria**
- A suboptimal ply and a blunder ply open the same screen component with all 3 action buttons.
- A game with 0 blunders + ≥1 suboptimal shows a non-zero mistake count in Past Games.
- Direct-load `/blunder/:id` shows correct "Move N / <total>", real "X of Y", and "Start new game from here".
- `/mistakeDetail` reload stays on the category list (not Home).
- Past games → game → blunder → game-link → Back ×3 → Home, no cycle (verified by pathname trail).
- ReviewScreen Prev/Next + chips change `__bsig`; a red chip opens `/blunder/:id`.
- No `sev:`/`tree:`/movestring, no `community-`, no `cXrY` in any blunder-detail text node.
- The cells the detector reports are highlighted for both verified double_threat boards: `c1r4`/`c4r3` on
  `41442625312235115445550126400` (P1) and `c5r3`/`c7r2` on `3333364101252113121524` (P2); split-drag keeps
  board zoom stable.
- `npm run test:fast` green.

**NOT included:** coach-queue pagination / DB-side counts (Epic 1 owns scale/reachability); tagging/severity
assignment logic; changes to which patterns fire.

**Sizing verdict — Full speckit.** 6 stories × ≥5 tasks (30+); multiple subsystems (server counts + routing +
two screens + panes + render layer); open decisions (URL-param vs state-recovery; nav-divergence root cause).
**Depends on Epic 1.**

**Open questions (`/clarify`):** `/mistakeDetail` route vs state-recovery; one render choke-point or three;
i18n scope for the count copy.

---

## Epic 3 — Global UI/UX & Accessibility Polish

**Intent:** Fix cross-cutting shell issues: board accessibility, button affordances, dead CTAs for logged-out
users, branding logo, and mobile spacing.

**Issues covered**
- `[new_TODOs #1]` `[DUP QA a11y note]` Board cells have no ARIA `role`/`aria-label`; add
  `role="button" aria-label="column N"`.
- `[new_TODOs #2]` "Review past mistakes" doesn't look like a button.
- `[new_TODOs #5]` Past Games (mobile): separator line too close to the chip filters.
- `[new_TODOs #6]` Every CTA must be clickable/tappable — logged-out tap on "past games" → register/login.
- `[new_TODOs #25]` Add a "DecodeC4" logo at the top; clicking it goes home.

**Non-obvious facts** (confirmed code locations + traps)
- **CORRECTED (spec 043 review):** `src/components/Board.jsx` **already has one interactive control per column.**
  The per-column wrapper `<div>` at `:211-229` has `onClick={handleClick}` → `onColumnClick?.(col)` (7 of these,
  one per column). The per-cell `onClick={onCellClick(col, r)}` at `:287` only fires when the optional
  `onCellClick` prop is passed (the CurationWorkspace shim) — it is not the primary interaction and does not run
  on ordinary playable boards. A11y work therefore does **not** need to "introduce" a per-column control; it adds
  `role`/`aria-label`/`tabIndex`/`onKeyDown`/focus-outline to the wrapper that already exists at `:211`. Do not
  label the 42 individual cells. Also: `handleClick` branches into `multiSelectMode` (`onColToggle`, curation) —
  keyboard activation must call the same `handleClick` branch, not hardcode `onColumnClick`. (The previous version
  of this note, claiming the click was attached per-cell at `:287` and that a per-column control had to be
  introduced, was factually wrong and is superseded by this entry.)
- `src/screens/HomeScreen.jsx:25` — already renders the DecodeC4 lockup
  (`title={<>Decode<span style={{color:'var(--disc-green)'}}>C4</span></>}`) as the home screen's TopBar title.
  The lockup is not new; the new work is making it clickable and persisting it across every screen. **Per spec 043
  Decision 2, this per-screen title is now SUPPRESSED on Home once the persistent logo ships** (see Settled
  decisions below — this overrides the earlier "Home's title is unaffected" resolution).
- `src/components/TopBar.jsx` — renders `title` as a plain non-interactive `<div>` and accepts only
  `title, onBack, meta, rightIcon/onRight, right2/onRight2` (Spec 010 FR-013/FR-014). There is no navigation/`go`
  prop and no slot for a persistent logo alongside a per-screen title today.
- `src/screens/StatsScreen.jsx:132` — "review past mistakes" is **already** a `<button>` element. US3.2 is
  styling/affordance work only (bg/border/cursor/hover/active/focus states), not adding a button.
- `src/components/AuthModal.jsx` — signature is `{ onClose, reason }` only; no `onSuccess`/`returnTo`. It performs
  a full-page redirect to Express for auth (comment at `:38`), so there is no client-side return path today.
- `src/screens/HomeScreen.jsx:80` — already calls `go('pastGames')` for every user (logged in or not).
  `src/screens/PastGamesListScreen.jsx:206` is the actual dead end: it shows "Sign in to see your past games"
  with **no sign-in control**, just icon + text.
- Trap: Board role/color assignment goes through `userIsYellow` — keep P1/P2 semantics intact when adding a11y attrs.

**Authoritative sources of truth**
- Memory `project_highlight_cell_colors`, `feedback_mockup_production_gap`; **Spec 010** (design tokens,
  TopBar contract FR-013/FR-014); `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- **Logo placement (amends Spec 010 FR-013/FR-014):** add a compact DecodeC4 logo element to the LEFT of the
  title, with a handler that navigates home (`go('home')`). This is a new prop/handler on the TopBar contract, not
  a replacement of the title slot. **SUPERSEDED (spec 043 review, Decision 2):** on Home specifically, the
  per-screen title is now suppressed so the persistent logo is the single DecodeC4 mark shown there (previously
  this decision said Home's title was "unaffected," producing a duplicate wordmark — that outcome was rejected).
  All other screens keep their per-screen titles unchanged alongside the logo.
- **Logged-out gating + return-to-target:** gate at the HomeScreen past-games card — a logged-out tap opens
  `AuthModal` instead of calling `go('pastGames')`. Stash the intended destination in `sessionStorage` before the
  full-page auth redirect and consume it after reload so the user lands where they meant to go. This fixes the
  concrete dead end at `PastGamesListScreen.jsx:206`. Spec 043 additionally names the consumption point: a single
  reader/clearer in the app's post-login bootstrap/routing path, not per-screen logic.
- **Board a11y control granularity:** add ARIA attributes/keyboard handling to the per-column control that
  **already exists** at `Board.jsx:211-229` (`aria-label="column N"`, 1-based label; internal coords stay
  0-indexed) — not `role`/`aria-label` on all 42 individual cells, and not a newly-introduced wrapper (see the
  corrected Non-obvious fact above). **Scoping added by spec 043 review:** this control is added only to
  *playable* boards (an active `onColumnClick`/`canPlay`); read-only boards (review, mistake-detail, lesson,
  past-game replay, admin/eval) must expose zero per-column interactive controls, not seven.
- **Additional in-scope elements (spec 043 review, one-pass inventory):** beyond the Home past-games card and
  Stats "review past mistakes" button, exactly one more element is in scope — the Stats screen's signed-out
  "Sign up to track your progress over time" text (`StatsScreen.jsx:141-145`), which is currently a plain `<div>`
  with no click handler. It gets both the button-affordance treatment (US3.2) and sign-in routing (US3.3). No
  other Home/Stats elements were found to need either treatment; see the spec's Appendix for the full inventory.
- Bundled deliberately because these small fixes share the frontend shell surface and are cheaper to spec/verify
  together than five micro-tickets.

### User stories & tasks

**US3.1 — Board accessibility.**
*As a screen-reader/keyboard user, I want board columns announced and operable.*
1. Add ARIA attributes to the per-column wrapper that **already exists** at `Board.jsx:211-229`
   (`role="button" aria-label="column N"`, 1-based label; internal coords stay 0-indexed) — do not introduce a
   new wrapper and do not touch the per-cell handler at `:287`. Apply only to playable boards (active
   `onColumnClick`/`canPlay`); read-only boards get zero per-column controls.
2. Add keyboard operability (focus + activate a column) on that per-column control, routing through the same
   `handleClick` branch used for mouse clicks (including the `multiSelectMode`/curation branch), not a hardcoded
   `onColumnClick` call.
3. Add visible focus indicators on the per-column control.
4. Preserve P1/P2 role/color semantics (`userIsYellow`).
5. a11y-tree test asserting 7 column controls on a playable board (not 42 cell controls) AND zero column controls
   on a read-only board; confirm it removes the QA verbose-tree-walk fallback.

**US3.2 — Button affordances.**
*As any user, I want buttons to look like buttons.*
1. Restyle "review past mistakes" (`StatsScreen.jsx:132`, already a `<button>`) to read as a button
   (bg/border/cursor) — styling only, no new element.
2. Restyle the Stats screen's signed-out "Sign up to track your progress over time" text (`StatsScreen.jsx:141-145`)
   as a button — it is currently a plain `<div>` with no styling and no click handler (see US3.3 task 2 for the
   click-handler half of this fix). This is the one and only additional element found by the spec 043 one-pass
   inventory; no other audit is in scope.
3. Add hover/active/focus states.
4. Align with design tokens (spec 010).
5. Visual/interaction test.

**US3.3 — Clickable CTAs & logged-out routing.**
*As a logged-out user, I want gated CTAs to route me to sign in, not do nothing.*
1. ~~Audit inert CTAs for logged-out users~~ — superseded by the spec 043 one-pass inventory (see Settled
   decisions); the bounded result is: the Home past-games card (task 2 below) and the Stats "Sign up..." text
   (task 2a below). No further audit is in scope.
2. Gate at the card: change `HomeScreen.jsx:80`'s past-games card so a logged-out tap opens `AuthModal`
   (`{ onClose, reason }`) instead of calling `go('pastGames')`, eliminating the `PastGamesListScreen.jsx:206`
   dead end.
2a. Add an `onClick` to the Stats screen's signed-out "Sign up to track your progress over time" text
   (`StatsScreen.jsx:141-145`) that opens the same `AuthModal` flow.
3. Ensure both CTAs are genuinely tappable (superseded the open-ended "every CTA" framing — see task 1).
4. Stash the intended destination in `sessionStorage` before AuthModal's full-page auth redirect; consume it via a
   single named reader/clearer in the app's post-login bootstrap/routing path (not per-screen) to restore the
   return-to-target.
5. Test: logged-out past-games tap opens auth and returns to the intended target after sign-in; logged-out
   "Sign up..." tap opens auth.

**US3.4 — Branding logo + mobile spacing.**
*As any user, I want a home logo and clean mobile spacing.*
1. Add a compact DecodeC4 logo element to the left of the title in `TopBar`, with a handler that navigates home
   (`go('home')`); amend Spec 010 FR-013/FR-014 to add this prop/handler to the TopBar contract. Other screens'
   per-screen titles are unchanged alongside the logo.
2. Reuse the existing DecodeC4 text/color treatment (`HomeScreen.jsx:25`) for the TopBar logo — no new asset work.
   **On Home specifically, suppress the existing per-screen title (`HomeScreen.jsx:25`'s lockup) so the persistent
   logo is the single DecodeC4 mark** (spec 043 Decision 2 — supersedes the earlier "Home's title is unaffected"
   resolution).
3. Fix Past Games mobile spacing between chip filters and the separator line.
4. Responsive check at 390×844.
5. Test: logo navigates home from every screen; Home shows exactly one DecodeC4 mark (no duplicate); spacing
   corrected.

**Acceptance criteria**
- Each *playable* board column (not each cell) exposes `role`/`aria-label` in the a11y tree and is
  keyboard-operable; read-only boards expose zero per-column controls.
- "Review past mistakes" and the Stats "Sign up..." text both read as buttons; a logged-out past-games tap and a
  logged-out "Sign up..." tap both open auth, and the past-games flow returns to the intended target after
  sign-in via the named post-login consumption point.
- The DecodeC4 logo navigates home from every screen; Home shows exactly one DecodeC4 mark (title suppressed);
  Spec 010 FR-013/FR-014 is amended to document the new logo prop/handler and the Home title-suppression
  exception; Past Games mobile chip/separator spacing is corrected at 390×844.

**NOT included:** data/endpoint changes; onboarding (Epic 8); count semantics (Epic 2).

**Sizing verdict — Full speckit (bundled).** 4 stories × ≥5 tasks; touches Board + TopBar (+ Spec 010 FR
amendment) + two screens + AuthModal; a11y + logged-out routing carry real design/QA work.

**Open questions (`/clarify`):** ~~full inventory of inert logged-out CTAs~~ — RESOLVED by the spec 043 one-pass
inventory (spec Appendix); see Settled decisions above.

---

## Epic 4 — Puzzle Generation & Correctness

**STATUS: COMPLETE (2026-07-11).** US4.1–US4.5 all done; spec 044 tasks T001–T051 all pass. Implemented across
four batches: US1 (candidate-generator color-cast guard), US2 (stray forced_block guard), US3 (multi-solution
acceptance, server `evaluatePredicate` + client Challenge screen), US4 (Allen T1–T7 detectors in
`server/allenTransforms.js`), US5 (Allen V1–V5 + T4 Case A/B operators in `server/allenVRules.js`, after the
FR-020a KB backfill/reconciliation). Final validation: `npm run test:fast` = 1061 pass / 0 fail / 147 suites
(up from the 1039/138 pre-epic baseline); full `npm test` (incl. `tests/integration/candidate-generator.test.js`,
real solver) = 652 pass / 0 fail / 103 suites, no hang. SC-001–SC-006 re-verified end-to-end, including a fresh
solver-generated sample batch (immediate_threat, forced_block, z_threat, double_threat) confirming color-cast
and predicate-acceptance behavior on out-of-fixture boards.

**Intent:** Enforce player-color and pattern constraints in generated puzzles, audit and correct the
per-category correctness predicates at both the generation and solve seams, and add net-new Allen
transformations + V-rules sourced from the knowledge base.

**Issues covered**
- `[new_TODOs #9]` immediate_threat: user = green (P1); forced_block: user = gray (P2). *(Generated-puzzle rule
  only — QA confirmed it does NOT apply to real-game blunders.)*
- `[new_TODOs #13]` No non-forced_block puzzle may contain a forced_block unless it is the answer move.
- `[new_TODOs #15]` double_threat correctness must accept any move that generates a fork, not just the stored
  `correctCol`.
- `[new_TODOs #14]` Incorporate Allen T1–T7 transformations + the Allen-V rules beyond the currently-verified
  V1–V5, sourced from `docs/knowledge-base/`.

**Non-obvious facts** (confirmed code locations + traps)
- The per-category correctness predicates **already exist in two layers** — this epic audits/corrects them,
  it does not build them from scratch:
  - **Generation-time:** `server/candidate-generator.js` has per-category `check*Predicate` fns dispatched by
    `checkPredicate` (~line 431). `checkUndercutPredicate` (line 331) already computes `correctCols` as every
    legal column **except** the killing column (undercut's avoid-the-pattern semantics — already correct;
    do not invert it). Unique-answer categories (`z_threat`, `overcut`, `claimeven`) already return a single
    `correctCol` (accept-any-generating-column would be a no-op for these). Multi-solution categories
    (`immediate_threat`/`forced_block`/`double_threat`) filter legal columns via `evaluatePredicate` but
    generation currently **requires `correctCols.length === 1`** to pass — this is the real gap for #15.
  - **Solve-time:** `server/predicates.js:evaluatePredicate` dispatches per category; `evalDoubleThreat`
    already returns `'tied'` for multiple fork columns, but `'tied'` is **not currently counted as `'correct'`**
    in the generator's `checkPredicate` acceptance logic — this mismatch is the concrete bug, not a missing
    feature. Fixing this requires an **exhaustive audit of every `evaluatePredicate` caller** (not just the
    known ones), since one missed caller that still branches on `result === 'correct'` only reintroduces a
    "false wrong" verdict for a legitimately tied answer.
  - `CompletionStrategy` (spec 007) is the **forced-win sequence validator** — relevant only to `forced_win`
    sequence puzzles, not to the single-move correctness categories in this epic.
  - `blunderReasons.js` / `blunderTags.js` are **sparring-game** blunder tagging, unrelated to puzzle-generation
    correctness — not part of this epic's file list.
  - The client **Challenge** screen compares `col === correctCol`-equivalent logic (in practice, a pure
    solver-score comparison via `scoreMove` that never consults `evaluatePredicate`), bypassing the server's
    category-aware evaluator entirely. This bypass is **in scope** for this epic (see US4.3 and NOT included).
    `SocraticScreen.jsx` has an equivalent bare `col === correctCol` comparison but is **not applicable**:
    `lesson.socratic` is hand-authored single-teaching-move content with no `category` field and no
    accepted-answer *set* to source from, so there is nothing for it to consult even if rewired.
- Trap: `classify` (sync, 8-tag) vs `classifyPattern` (async, 15-detector) are different — use the right one
  when judging a resulting position (memory `reference_classify_vs_classifyPattern`).
- Trap: never hand-construct movestrings — source via `playGame`/DB/KB; validate through the **production**
  detector (invariant I12), not just the motivating example.
- The color mapping (P1 green / P2 gray) is in the CLAUDE.md color table; user-facing text says green/gray.
- All T1–T7 rules are **already solver_verified in the KB** — no backfill needed for them. Only V1/V2/V4/V5
  have `movestring: PENDING` in their KB entries (real backfill from memory required); V3 needs only a
  re-verify pass; T4 Case B is **already `solver_verified` in the KB** — the memory file
  (`reference_verified_tactical_movestrings.md`) calling it "still PENDING" is the stale source, not the KB.

**Authoritative sources of truth**
- **Spec 008** + memory `project_new_category_wiring_checklist` (per-category wiring, incl. `check*Predicate`
  dispatch). Spec 007 + memory `project_forced_win_refactor` for `CompletionStrategy` context only (sequence
  puzzles, not this epic's correctness categories).
- `docs/knowledge-base/` is the enumeration source for Allen T1–T7 transforms and V-rules — **not** the Allen
  PDF. Memory `reference_verified_tactical_movestrings` (Allen V1–V5 + Allis 9 rules + T4 Case-A, all
  solver-verified) and `project_kb_status` identify which rules already have verified fixtures.
- `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- The per-category correctness predicates already exist in `candidate-generator.js` (generation-time) and
  `predicates.js` (solve-time). This epic **audits and corrects** those existing predicates per category — it
  does **not** introduce a blanket "run the classifier on the result, accept if present" rule, and it does
  **not** override `undercut`'s avoid-the-pattern semantics or `claimeven`/`overcut`'s unique-answer semantics.
- The genuine gap is the **multi-solution accept path**: generation-side `checkPredicate` currently requires
  `correctCols.length === 1`, and solve-time `'tied'` results are not treated as `'correct'`. Fixing this,
  scoped to the categories that are actually multi-solution (`immediate_threat`, `forced_block`,
  `double_threat`), is what resolves #15.
- Allen T1–T7 and the Allen-V rules (V1–V5, T4 Case A and Case B) are **net-new implementation** — no existing
  transform/V-rule engine exists to diff or extend. Scope is **all of T1–T7 + V1–V5 + T4 Case A and Case B**
  (see US4.4/US4.5 below) — every one of these already has, or (via the FR-020a KB backfill) will have, a
  solver-verified KB worked example, so none of the T/V-rule work needs to be deferred. (US4.2's
  already-stored-puzzle remediation IS deferred — see the `### Deferred` subsection at the end of this epic.)
- The client-side Challenge-screen bypass is **in scope** for this epic (US4.3): the fix is scoped to
  `ChallengeScreen.jsx` only; `SocraticScreen.jsx` is confirmed non-applicable (no `category`/accepted-answer-
  set concept on its hand-authored `lesson.socratic` data).

### User stories & tasks

**US4.1 — Player-color constraints in generated puzzles.**
*As a learner, I want puzzles to cast me as the correct color for the concept.*
1. immediate_threat generation forces user = P1 (green).
2. forced_block generation forces user = P2 (gray).
3. Map colors via the CLAUDE.md table; user-facing text says green/gray.
4. Reject/regenerate puzzles violating the color rule.
5. Test: 100% of sampled generated puzzles have the correct user color.

**US4.2 — No stray forced_block in non-forced_block puzzles.**
*As a learner, I don't want an unrelated forced_block muddying a puzzle.*
1. Detect forced_block presence in candidate boards.
2. Allow it only when it is the answer move (creates the pattern).
3. Reject otherwise during generation/curation.
4. Define "answer move is the forced block" precisely in generator terms.
5. Test: stray forced_block rejected; answer-move forced_block allowed.

**US4.3 — Audit and correct the per-category correctness predicates (server AND client).**
*As a learner solving a multi-solution puzzle, I want any move that produces the pattern accepted — without
disturbing categories whose correctness is unique-answer or avoid-the-pattern — and I want this to hold
wherever my move is judged, not only on the server.*
1. Enumerate every category's correctness **semantics** (accept-any-generating-column / avoid-pattern /
   unique-answer) against the predicates that already exist in `candidate-generator.js:check*Predicate` and
   `predicates.js:evaluatePredicate` — do not invent new semantics.
2. For the multi-solution categories only (`immediate_threat`, `forced_block`, `double_threat`): fix generation
   to accept `correctCols.length >= 1`, and fix acceptance logic to treat solve-time `'tied'` as `'correct'`.
3. **Gating sub-task**: run an exhaustive `rg 'evaluatePredicate'` sweep across the codebase and classify every
   caller as "branches on `result === 'correct'` only" (needs the `'tied'`-as-correct fix) or not. This sweep
   must close — every caller reconciled — before US4.3 is considered done; a single missed caller
   reintroduces the "false wrong" bug for a legitimately tied answer.
4. Fix the client-side bypass: `ChallengeScreen.jsx` currently trusts `/api/evaluate-move`'s `quality`, which
   is computed purely via `scoreMove` (solver-score comparison) and never calls `evaluatePredicate` — so the
   category-aware `'tied'`-as-correct fix from step 2 does not reach the learner today. Extend
   `/api/evaluate-move` to also carry `category` + `movestring` in its request and add an
   `evaluatePredicate`-gated accepted-answer check, gated to the three multi-solution categories only, exposed
   as an additive response field (never repurposing `quality`/`badge`/`coachPhraseKey`, which other callers
   depend on); update `ChallengeScreen.jsx` to read it. Recompute at solve time — no schema change, no
   persistence of the full `correctCols` array needed. **`SocraticScreen.jsx` is confirmed non-applicable**:
   its `lesson.socratic` data is hand-authored single-teaching-move content with no `category` field and no
   accepted-answer set, so bare `col === correctCol` is correct there and is left untouched.
5. Before relying on `scoreMove` as a stand-in anywhere, empirically verify with a concrete board that a
   `double_threat` fork column need not be the single max-score column (score-tie != fork-tie) — do not assume
   they coincide.
6. Explicitly preserve `checkUndercutPredicate`'s avoid-the-pattern `correctCols` computation and the
   unique-answer categories' single-`correctCol` behavior — add a regression test asserting these are
   unchanged.
7. Validate each corrected category against its full case-space + a counterexample, through the **production**
   detector (I12), not the motivating example alone.
8. Test: a double_threat board with two fork columns accepts both (server AND Challenge screen); a non-fork
   move is rejected; an undercut board's killing column is still rejected; a claimeven/overcut board still
   requires its unique `correctCol`.

**US4.4 — Allen T1–T7 threat-simplification detectors (net-new).**
*As the puzzle pipeline, I want programmatic detectors for Allen's T1–T7 rules — each a threat-set-in,
`(player, col)`-winner-out function, not a board transformation — so the pipeline has a verified implementation
of each rule to feed into the V1–V5 win/loss/draw evaluation (US4.5).*
1. Implement `t{1..7}_winner(threats) -> (player, col) | None` (or the rule's own declared shape, e.g. T4's
   `t4_applies(threats, col) -> bool` — confirm each entry's shape individually, do not assume uniformity) as
   pure functions over an externally-supplied **threat set**, defined and sourced strictly from each relevant
   `docs/knowledge-base/allen-t{1..7}.md` entry's `formal_predicate` (not the Allen PDF).
2. No board-mutation or board-legality step applies — a threat set with no corresponding coherent board is a
   valid input, not an error case.
3. Compose T1–T7's output as an input-simplification step feeding V1–V5 (US4.5): extract a board's threat set,
   run applicable T-rules, pass the simplified set into the V-rule evaluation.
4. All seven rules are **already solver_verified in the KB** — no backfill needed; implement directly against
   existing `worked_examples`.
5. Add a test per detector sourced from its KB `worked_examples` (positive) and `false_positives` (negative,
   where present).

**US4.5 — Allen-V rule operators, all rules in scope (net-new).**
*As the puzzle pipeline, I want reusable operators for all of the Allen-V rules (V1–V5) and both T4 variants
(Case A and Case B), each backed by a solver-verified KB worked example.*
1. **Prerequisite (FR-020a backfill/reconciliation, MUST complete first, per-rule gated)**: V1, V2, V4, and V5
   currently have `movestring: PENDING` in their KB entries — backfill each from the verified movestring in
   memory (`reference_verified_tactical_movestrings.md`), re-verified via `optimal_line.mjs`/`playGame` (not
   copied uncritically). V3 already has a KB movestring — re-verify only, do not skip verification. T4 Case A
   is already `solver_verified` in the KB. **T4 Case B is already `solver_verified` in the KB** — independently
   re-run `optimal_line.mjs` against it to confirm (per I12, do not trust the existing stamp at face value),
   then correct the memory file (which stale-labels it "still PENDING") — the KB is not the stale source here.
2. Implement V1–V5, T4 Case A, and T4 Case B as reusable, KB-sourced operators, each defined strictly from its
   own (now-verified) `docs/knowledge-base/` entry — no operator implemented before its own rule's
   backfill/reconciliation step above completes.
3. Verify each operator against its KB worked example using `optimal_line.mjs`.
4. Regression test: existing verified movestrings still classify correctly.

**Acceptance criteria**
- 100% of sampled generated immediate_threat/forced_block puzzles cast the user green/gray respectively.
- A stray forced_block is rejected; an answer-move forced_block is allowed.
- Each per-category correctness predicate matches its documented semantics: multi-solution categories
  (`immediate_threat`, `forced_block`, `double_threat`) accept any generating column including `'tied'`
  results; `undercut` still rejects its killing column; unique-answer categories (`z_threat`, `overcut`,
  `claimeven`) still require their single `correctCol` — each verified through the production detector (I12),
  not the motivating example alone — **on both the server and the Challenge screen**.
- The exhaustive `evaluatePredicate` caller sweep (US4.3.3) is closed with every caller reconciled.
- Every implemented Allen T-rule (T1–T7) and every implemented V-rule/T4 operator (V1–V5, T4 Case A, T4 Case B)
  has a solver-verified worked example sourced from the KB; existing verified movestrings still classify
  correctly; no operator is implemented outside this approved set.

**NOT included:** real-game blunder color rules (explicitly excluded); reason-engine changes; new UI
categories; using Allen T1–T7 to generate net-new candidate boards for the sampler (they have no
board-mutation model — that is a distinct, separately-considerable widening of the candidate pool, not part of
this epic); de-duplication/canonicalization of equivalent boards via Allen transformations;
`SocraticScreen.jsx`'s bypass (confirmed non-applicable, not a deferral — see US4.3.4).

### Deferred

- **US4.2 stray-forced_block remediation for already-stored puzzles is out of scope.** The generation-time
  fix (US4.2) prevents new candidates from being accepted with a stray, unrelated forced-block. Sweeping or
  re-auditing already-generated/already-stored puzzles in the database for this same defect is explicitly
  **out of scope** for this epic — owner decision. If a backfill/remediation pass is wanted later, it should be
  scoped as a separate, later piece of work.

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; generation + solve-time-and-client evaluator audit
across categories + net-new algorithmic detectors/operators; the multi-solution accept-path fix needs
per-category I12 validation plus an exhaustive caller sweep. Hard algorithms stay in the spec.

**Open questions (`/clarify`):** exact "answer move is the forced block" definition.

---

## Epic 5 — Account: Session Persistence & Paid Checkout

**Intent:** Keep users signed in, and add Stripe checkout behind a swappable payment interface.

**Issues covered**
- `[new_TODOs #22]` Browser forgets sign-in quickly; remember me.
- `[new_TODOs #24]` Setup Stripe checkout; code must allow a future payment processor.

**Non-obvious facts** (confirmed code locations + traps)
- `server/index.js` — `ACCESS_TOKEN_MAX_AGE = 3600_000` (1h, `:213`), `REFRESH_TOKEN_MAX_AGE = 7*24*3600_000`
  (7d, `:214`); cookie sets at `:240/242`, `:277/279`, `:332/334`; refresh flow.
- Trap: auth is httpOnly cookies only (`credentials:'include'`, **not** an Authorization header); client SDK removed.
- Trap: tier is read from `store.getProfile()`, not `session.tier`; tier is written **only** by the Stripe webhook.
- Trap: magic-link/OAuth flows must preserve `window.location.hash` on `replaceState`.
- Trap: `GET /api/auth/session` (`:290`) currently returns 401 and **clears cookies** on access-token expiry — it
  does **not** auto-refresh. US5.2 changes this behavior.

**Already implemented (unvalidated scaffold) — reframe as refactor + wire, not greenfield**
The following surfaces already exist in code and must be wrapped/wired, not rebuilt from scratch:
- `POST /api/auth/refresh` (`:257`) — refresh-token exchange endpoint already exists.
- `POST /api/stripe/create-checkout` (`:2697`, `mode: 'subscription'`) — Stripe Checkout session creation.
- `POST /api/stripe/webhook` (`:2729`) — signature-verified, flips `users.tier` on successful payment.
- `POST /api/stripe/portal` (`:2787`) — Stripe customer portal session creation.
- `STRIPE_*` env vars already wired into config.
- `UpgradeModal` (`src/components/UpgradeModal.jsx`) — already has an `onUpgrade` callback with
  idle/loading/success states. **Preserve this API**; do not redesign it (per CLAUDE.md
  `feedback_spec_existing_apis`) — the plan/annual toggle (Decision 2) is additive UI on top of it.
- **CORRECTION — this scaffold is unvalidated, not battle-tested.** Stripe has never been exercised end-to-end.
  A read-only Stripe MCP check of the connected sandbox account (DecodeC4 sandbox, `acct_1TrxCXET4Rc2BDFf`)
  confirms the account exists but has **zero products and zero prices configured** — so
  `STRIPE_MONTHLY_PRICE_ID`/`STRIPE_ANNUAL_PRICE_ID` currently resolve to nothing. Provisioning the sandbox and
  validating the full checkout → webhook → tier-flip round-trip is **in-scope for this epic**, not assumed done.
  (See US5.5.)

**Authoritative sources of truth**
- Memory `project_auth_payments_state` (**stale framing** — it describes `UpgradeModal` as "waitlist email
  capture only" and Stripe as "deferred"; both are false as of this epic — the routes and modal callback above
  already exist and this epic is the payment-validation epic), `reference_tier_source`,
  `project_auth_flow_traps` (merged home of the former `project_magic_link_auth_race` and
  `project_spec036_google_oauth` — includes the `location.hash`-preservation trap for US5.2, `App.jsx:29`).
- `docs/architecture/api-conventions.md`, `server-conventions.md`, `docs/best_practices_spec_driven_development.md`.
- Stripe MCP tooling (available in this environment): ground Stripe specifics against
  `stripe:stripe-best-practices` and `search_stripe_documentation` rather than memory; use `stripe:test-cards`
  for test-mode checkout runs.

**Settled decisions**
- Session = **long-lived by default** — **60-day rolling refresh cookie, rotated on each successful refresh**
  (resolves the prior "pick a value" open question), refresh silently on load, **no** "remember me" UI toggle.
  Dependency: extending `REFRESH_TOKEN_MAX_AGE` only lengthens the *cookie*; Supabase's own dashboard
  session/inactivity-timeout config must independently permit a 60-day window. This is an owner-run
  verification, tracked as a `staging_checks.md` item under Epic 5 (analogous to Epic 7 §6) — see US5.1 task 5.
- Payments = **thin `PaymentProcessor` adapter** (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`)
  with a Stripe implementation behind it. Not a full processor-agnostic catalog layer — the bar is "adding a
  second impl needs no call-site change," satisfied by a 3-method interface over the existing Stripe calls.
- Billing model = **recurring subscription** (monthly/annual), matching the existing `mode: 'subscription'`
  checkout code — no rewrite needed.
- Plan selection = **monthly + annual toggle added to `UpgradeModal`**, both prices exposed at launch. The
  toggle is additive UI; `UpgradeModal`'s existing `onUpgrade` contract is preserved, with the chosen plan
  passed through to `create-checkout`'s required `plan` param.
- Subscription status persistence = **tier only, no schema change.** `getSubscriptionStatus` derives from the
  existing `tier` + `stripe_customer_id` columns; no new `subscription_status` column, no migration. See
  Deferred, below.

### User stories & tasks

**US5.1 — Stay signed in (long-lived session).**
*As a returning user, I want to stay signed in for weeks.*
1. Extend `REFRESH_TOKEN_MAX_AGE` to 60 days.
2. Keep the httpOnly/Secure/SameSite cookie model (no Authorization header).
3. Update all cookie-set sites (`:240/277/332`); rotate the refresh cookie on every successful refresh.
4. Document the chosen window + rotation rationale.
5. Add a `staging_checks.md` item under Epic 5 (analogous to Epic 7 §6): owner verifies the Supabase dashboard
   session/inactivity-timeout config permits a 60-day window (the cookie alone is not sufficient).
6. Test: reopen the browser days later within the window → still authenticated.

**US5.2 — Silent token refresh (fix `/api/auth/session` to auto-refresh).**
*As a user, I don't want to be logged out mid-session.*
1. Change `GET /api/auth/session` (`:290`) so that on access-token expiry it attempts a refresh via
   `POST /api/auth/refresh` (`:257`, already exists) **before** falling back to 401 + clearing cookies.
2. On app load, detect an expired access token and refresh from the refresh cookie transparently.
3. Handle refresh failure → clean re-auth (401 + cookie clear stays as the failure path).
4. Avoid refresh races (preserve `window.location.hash` on `replaceState` per `project_auth_flow_traps`,
   `App.jsx:29`).
5. Test: access-token expiry mid-session → transparent refresh, no logout.

**US5.3 — Stripe checkout with plan selection + post-payment activation.**
*As a free user, I want to upgrade via checkout and know immediately that it worked.*
1. Wrap the existing `POST /api/stripe/create-checkout` (`:2697`) behind the `PaymentProcessor` interface
   (see US5.4); confirm it accepts a `plan=monthly|annual` param and returns success/cancel URLs.
2. Add a monthly/annual toggle to `UpgradeModal`; wire the selected plan into the existing `onUpgrade` callback
   → checkout (preserve `onUpgrade`'s idle/loading/success contract).
3. Env-only secrets (coordinate with Epic 7).
4. Return-flow: on `?checkout=success`, re-fetch session/profile and **poll with bounded retry/backoff** (a few
   attempts over ~10s) until `tier === 'paid'`, showing an explicit "activating your subscription…"
   acknowledgment state while the webhook is in flight — **never** silently render the free-tier UI to a user
   who just paid. If polling times out before the webhook lands, show "payment received — activating, this can
   take a moment" (still not the bare free-tier screen), with a clear next step (e.g. refresh / contact
   support).
5. Test: a free user completes a test-mode checkout on both monthly and annual plans and reaches the paid UI
   (via immediate flip or the activating-state fallback), never a silent free-tier render.

**US5.4 — Processor-agnostic interface + webhook tier flip.**
*As the founder, I want to swap processors later without rewriting call sites.*
1. Define `PaymentProcessor` interface (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`) as a thin
   seam — not a processor-agnostic catalog layer.
2. Implement `StripeProcessor` wrapping the existing `POST /api/stripe/create-checkout` (`:2697`),
   `POST /api/stripe/webhook` (`:2729`), `POST /api/stripe/portal` (`:2787`); call sites depend on the
   interface, not on Stripe directly.
3. Confirm the webhook endpoint verifies the Stripe signature and flips `tier` idempotently (the tier source
   used by `getProfile()`); add idempotency test coverage if missing.
4. Scope "persist subscription status" to the existing `tier` column: implement `getSubscriptionStatus` as a
   derivation from `tier` + `stripe_customer_id` — **no schema change, no migration** (`docs/architecture/
   db-schema.md` and `data-model.md` need no change for this epic).
5. Test: webhook flips the user to paid; features unlock without re-login (bounded by US5.3's polling); adding
   a second `PaymentProcessor` impl requires no call-site change in `UpgradeModal` or tier-gate code.

**US5.5 — Provision the Stripe sandbox & verify test-mode checkout end-to-end.**
*As the founder, I need the Stripe sandbox actually configured before any of the above can be validated.*
1. Using Stripe MCP, create a product in the sandbox account (`acct_1TrxCXET4Rc2BDFf`) with monthly and annual
   recurring prices; populate `STRIPE_MONTHLY_PRICE_ID`/`STRIPE_ANNUAL_PRICE_ID` env vars.
2. Register a webhook endpoint for the local/staging environment and populate `STRIPE_WEBHOOK_SECRET`.
3. Ground all Stripe API usage against `stripe:stripe-best-practices` and `search_stripe_documentation` (MCP)
   rather than memory, since this account was previously unconfigured.
4. Run a test-mode checkout end-to-end locally using `stripe:test-cards`, confirming: checkout session creation
   → test payment → webhook delivery → `users.tier` flips to `paid`.
5. Document that the genuine **deployed**-webhook-delivery round-trip (a reachable public URL) is a separate
   `staging_checks.md` item under Epic 5 — local/test-mode product+price setup and a test-mode checkout are
   fully doable via MCP now, but deployed webhook delivery can only be verified post-deploy.
6. Test: local test-mode checkout completes and `users.tier` is observed to flip to `paid` via the registered
   webhook.

**Acceptance criteria**
- Reopen the browser days later within the 60-day window → still authenticated; mid-session expiry →
  transparent refresh via `/api/auth/session`, not a logout.
- A free user completes a test-mode Stripe checkout on either plan; the webhook flips them to paid; paid
  features unlock without re-login. A user who just paid **never** sees a silent free-tier fallback — they see
  either the paid UI or an explicit "activating" acknowledgment state, per US5.3 task 4.
- Adding a second processor is a new `PaymentProcessor` impl + config, with no change to `UpgradeModal` or
  tier-gate call sites.
- The Stripe sandbox is provisioned (product + monthly/annual prices + webhook registered) and a local
  test-mode checkout has been run end-to-end (US5.5).
- The Supabase dashboard session-timeout verification is recorded in `staging_checks.md` under Epic 5.

**NOT included:** a second processor impl; billing/invoice UI; proration; dunning; a "remember me" checkbox; a
`subscription_status` DB column (see Deferred); verifying deployed (non-local) webhook delivery (that's a
staging_checks.md item, not an epic deliverable).

### Deferred
- **`subscription_status` column** — every consumer it would serve (dunning, billing/invoice UI) is either
  explicitly out of scope for this epic or already handled by Stripe's `cancel_at_period_end` plus the existing
  webhook (access-until-period-end falls out of tier-only). Deferred as an additive, reversible migration to
  add later if a concrete consumer emerges.

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; server auth + payments + external + frontend + DB
tier + third-party sandbox provisioning; interface shape, session window, and the post-checkout activation UX
are real design points. Money + webhooks + an unvalidated Stripe scaffold warrant the full pipeline.

**Open questions (`/clarify`):** cancellation/downgrade → tier behavior (does downgrade happen immediately or
at period end?); exact polling backoff schedule for US5.3 task 4.

---

## Epic 6 — Lessons: Progression, Audio & Polish

**Intent:** Gate lessons in saga order, add pre-generated coach audio per slide, and stop the board flicker
during narration.

**Issues covered**
- `[new_TODOs #8]` Lessons doable only in saga order; free user clicking a locked lesson → upgrade CTA.
- `[new_TODOs #17]` Coach must speak in lessons: "generate audios" button in `/admin/lessons`, save audio path
  in the lesson JSON, serve + play per slide.
- `[new_TODOs #3]` Board flickers when clicking a disc while the coach speaks.

**Non-obvious facts** (confirmed code locations + traps)
- `src/screens/SagaScreen.jsx` locks by **tier only** today: `isLocked = lesson.free === false && tier !== 'paid'`
  (`:172`); there is **no order gate** yet — this epic adds it, and the order gate deliberately **overrides**
  spec 018 FR-003 rule 4 (locked = `free===false && tier!==paid`) with an additional order-based condition.
- Lesson editor lives at `src/screens/admin/` (+ `AdminLessonEditorScreen.jsx`/`AdminLessonListScreen.jsx`);
  content is lesson JSON.
- Slide runtime: `src/screens/ConceptScreen.jsx`/`SocraticScreen.jsx` + `src/components/Board.jsx` +
  `CoachDialog.jsx` — the flicker is a Board re-render on coach state change.
- **Corrected trap:** spec 039's TTS pipeline is keyed **end-to-end by i18n keys**, not text hash —
  `generate-tts.js` scans the `coach.*` namespace in `en.json`, the registry/manifest is keyed by i18n key, and
  runtime playback is `speakCoachMessage(key)`. Lesson slide coach messages are **inline raw text** inside
  lesson JSON (`Slide.coachMessages[].text`), not i18n keys, so none of that registry/manifest/`en.json`-scan
  machinery or `speakCoachMessage(key)` applies here. The only reusable seam is `server/ttsProvider.js`
  `synthesize(text)`; this epic defines a **new** text-hash-keyed generation path and a **new** playback path
  parallel to `speakDeepReveal(audio)` (play a stored path directly), not `speakCoachMessage(key)`.
  TRUNCATE `explanation_cache` before deploy remains a spec-039-specific step, unrelated to lesson audio.
- Trap: Socratic correctness is client-side `col === correctCol`.
- **Already landed via Epic 5 (do not re-build):** per-lesson completion tracking —
  `saveLessonProgress`/`getLessonProgress` exist in `SupabaseStore.js` and `IndexedDBStore.js` (spec 018 marks
  this "already implemented"), with completion written from `ConceptScreen.jsx:73`, `SocraticScreen.jsx:65`, and
  `ChallengeScreen.jsx:355`. The tier-locked upgrade CTA is also already wired: `SagaScreen.jsx` calls
  `setUpgradeOpen(true)` on a locked tap and imports `useUpgradeCheckout`. The only genuinely new work in
  US6.1/US6.2 is the **order-gate lock rule** in `SagaScreen.deriveNodeState` (still tier-only today) and
  tier-lock-vs-order-lock messaging.

**Authoritative sources of truth**
- **Spec 018/019** (lesson infra + content), **Spec 039** + memory `project_spec039_audio_interactive_coach`
  (reference for the i18n-keyed pattern, NOT directly reusable machinery for lessons).
- `server/ttsProvider.js` (`synthesize(text)` — the actual reusable seam).
- Memory `project_lesson_interactivity_evaluation`. `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- **TTS reuse scope:** reuse only `server/ttsProvider.js` `synthesize(text)`. Define a *new* generation path
  that hashes each slide message's text, writes an MP3, and stores the path in the lesson JSON; and a *new*
  playback path that plays the stored path directly (parallel to `speakDeepReveal(audio)`), not
  `speakCoachMessage(key)`.
- **Audio granularity:** one MP3 per `coachMessage` (not per slide). Add an explicit `audio` field to the
  lesson JSON schema: `coachMessages[].audio`. Regeneration = re-hashing that message's text.
- **Audio storage:** new `public/audio/lessons/` directory, committed static files, named by a hash of the
  message text, regenerated when text changes, no manifest. Mirrors spec-039's static-asset serving without
  forcing lesson text into `en.json`.
- **Order-unlock completion criterion:** reuse the existing `'complete'` progress record already written by
  `saveLessonProgress` at each lesson's terminal step (via `ConceptScreen.jsx`/`SocraticScreen.jsx`/
  `ChallengeScreen.jsx`). No second progress concept, no new store work.
- **Order-gate scope:** the order gate is an *additional* condition layered on top of the existing tier gate,
  and deliberately overrides spec 018 FR-003 rule 4 (tier-only lock) to also require the previous lesson's
  `'complete'` record.
- The tier-lock upgrade CTA wires into Epic 5's checkout (`useUpgradeCheckout`) and is already largely landed;
  this epic's work is to audit/finish it, not build it from scratch.

### User stories & tasks

**US6.1 — Order-based lesson unlocking.**
*As a learner, I want lessons unlocked in order so I follow the intended progression.*
1. Add order-based lock computation to `SagaScreen.deriveNodeState`: lesson N is locked until lesson N−1 has a
   `'complete'` progress record (via existing `getLessonProgress`), layered on top of (not replacing) the
   existing tier gate. Document that this overrides spec 018 FR-003 rule 4.
2. Update `SagaScreen` node states (locked/unlocked/current/done) to reflect the combined tier + order gate.
3. Test: fresh learner sees only lesson 1 unlocked; completing it (existing `'complete'` write) unlocks the
   next; a tier-locked-but-order-unlocked lesson still shows as tier-locked.

**US6.2 — Upgrade CTA on tier-locked lessons.**
*As a free user clicking a paid lesson, I want an upgrade prompt, not a dead tap.*
1. Audit the already-wired CTA: `SagaScreen.jsx` already calls `setUpgradeOpen(true)` on a locked tap and
   imports `useUpgradeCheckout` (Epic 5). Verify it fires correctly for tier-locked nodes and fix any gaps.
2. Distinguish tier-lock vs order-lock messaging/UI (order-lock should NOT open `UpgradeModal` — it's not a
   paywall).
3. i18n the CTA copy if not already covered.
4. Test: free user clicking a tier-locked lesson → upgrade CTA; free user clicking an order-locked lesson →
   order-lock messaging (no upgrade CTA).

**US6.3 — Admin: generate lesson audio.**
*As an admin, I want to pre-generate per-message narration.*
1. Add a "generate audios" action in `/admin/lessons`.
2. For each `coachMessage` in each slide, hash the message text and call `server/ttsProvider.js`
   `synthesize(text)` to produce an MP3 written to `public/audio/lessons/<hash>.mp3`.
3. Store the path in the lesson JSON at `coachMessages[].audio`.
4. Regeneration: when a message's text changes, its hash changes, so a new file is generated (no stale-cache
   invalidation needed); prune orphaned files as a cleanup step.
5. Verify generated paths are saved and resolvable from `public/audio/lessons/`.

**US6.4 — Per-message audio playback.**
*As a learner, I want the coach to speak each message.*
1. Load and play the stored `coachMessages[].audio` path in the lesson runtime, parallel to
   `speakDeepReveal(audio)` (play the stored path directly), not `speakCoachMessage(key)`.
2. Add playback controls (play/replay/mute).
3. Serve audio as a static asset from `public/audio/lessons/`.
4. Graceful fallback when `audio` is missing (e.g., not yet generated).
5. Test: opening a lesson plays audio per coach message.

**US6.5 — Fix board flicker during narration.**
*As a learner, I don't want the board to flicker when the coach speaks.*
1. Reproduce: clicking a disc while the coach speaks re-renders the board.
2. Identify the cause (Board re-mount vs prop churn from `CoachDialog` state).
3. Memoize/isolate `Board` from coach-state updates.
4. Verify the disc signature stays stable during narration.
5. Regression test for board stability on coach state change.

**Acceptance criteria**
- Fresh learner: only lesson 1 unlocked; completing it (existing `'complete'` record) unlocks the next.
- Free user clicking a tier-locked lesson → UpgradeModal; clicking an order-locked lesson → order-lock
  messaging (no UpgradeModal).
- Admin "generate audios" writes `coachMessages[].audio` paths into the lesson JSON as files under
  `public/audio/lessons/`; opening a lesson plays audio per coach message.
- Clicking a disc during narration: board disc signature stays stable (no flicker).

**NOT included:** new lesson content (spec 019); live/streaming TTS in lessons (uses stored audio); deep-reveal
TTS (Epic 2/7 territory); a manifest/registry for lesson audio (spec-039-style — explicitly not reused here).

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; frontend saga + admin + lesson JSON schema change +
TTS backend + render-perf.

**Open questions (`/clarify`):** flicker root cause (remaining empirical open item — reproduction and fix
approach still need investigation).

---

## Epic 7 — Platform Hardening & Cost Observability

**Intent:** Reduce runtime attack surface and preserve the (already-sound) codebase/credential posture, then
record token/cost metadata for every LLM call. Grouped as the cross-cutting platform/ops epic.

**Issues covered**
- `[new_TODOs #12]` `npm install` reports 15 vulnerabilities (1 low, 10 moderate, 2 high, 2 critical).
- `[new_TODOs #19]` Security checkup: could a hacker access the codebase? Explore access vectors.
- `[new_TODOs #20]` Every OpenAI call must register token/dollar metadata.

**Non-obvious facts** (from the security audit — reflect verbatim)
- **The #19 exposure assessment is already done.** `docs/security_audit_fable.md` (2026-07-07) found **no real
  secret committed in any tracked file or in git history** (every credential-shaped string is a placeholder);
  the frontend has no Supabase client SDK, the service-role key is server-only, RLS is deny-by-default, the
  solver is spawned with array args (no shell injection). **No secret rotation is indicated** (memory
  `project_secret_scan_placeholders`). So #19 is *remediation of findings F1–F9 + running checklist C1–C12*,
  not "explore whether we're exposed."
- **F1** (High) — `concurrently` is mis-scoped as a **production** dependency; it drags in `shell-quote`
  (critical). `ws` (high), `qs`/`ip-address`/`@opentelemetry/core`/`brace-expansion` (moderate).
- **F2** (High, verify) — `NODE_ENV=production` gates **both** the auth-cookie `Secure` flag (`index.js:208`)
  **and** the `requireAdmin` gate (`adminAuth.js:2`); if unset in prod, admin write endpoints go world-open and
  cookies drop `Secure`.
- **F3** (Medium) — no security headers (no `helmet`/CSP/HSTS/XFO/XCTO/Referrer-Policy).
- **F4** (Medium, verify) — admin `requireLocalhost` trusts `req.ip` behind `trust proxy = 1` (`index.js:2763`).
- **F5** (Low) — raw `err.message` echoed on ~53 500-handlers.
- **F6** (Low) — 673 KB dev log `connect-four/log` tracked (user IDs/IPs). **F7** (Low) — `.DS_Store` tracked;
  root `.gitignore` omits it. **F8** (Info) — `/api/debug/classify-all` (`index.js:2720`) skips movestring
  validation. **F9** (Info) — `.claude/` memory tracked (recon-useful; no secrets).
- **F10** (Info) — positive controls verified sound; record so later epics don't regress them (service-role key
  server-only, RLS, no shell injection, no CORS footgun, no unsafe HTML, server-enforced tier, signed webhook).
- **LLM call sites are NOT a single choke-point — there are 4-5 independent call sites.** Verified on
  `feature/polish`: the production `POST /api/explain-move-llm` (deep reveal) path calls
  `computeMechanism` → `defaultCallLLM` in `server/mechanismExplainer.mjs` — **this is the primary production
  OpenAI chat path**, not `callLLM`. `callLLM` (`server/llmCoachHelpers.js:199`) is **offline-only**, used by
  `run_eval.mjs`; it returns only `data.choices[0].message.content` and discards `data.usage`, and receives only
  a prompt string (no user/endpoint/purpose context) — that context lives one layer up in `index.js` request
  handlers. `compute.mjs` (`--llm`, ~line 264) has its **own** independent OpenAI fetch (`EXPLAIN_MODEL`).
  `index.js` also holds a **live Anthropic path** (`composeExplanation` → `anthropic.messages.create`,
  ~`index.js:499`) with `input_tokens`/`output_tokens` — separate token semantics from OpenAI. OpenAI TTS
  (~`index.js:3760`) is billable but char-priced, not token-priced. `OPENAI_MODEL=mini` for prod chat endpoints;
  `EXPLAIN_MODEL=full` for `compute.mjs` — names mislead. Wrap each call individually; an uncaught error
  silently drops the entry.
- **Line numbers throughout this epic (`index.js:208`/`:499`/`:3760`, `llmCoachHelpers.js:199`,
  `mechanismExplainer.mjs:33`) are as of the audit/critique pass and will drift** — re-confirm exact lines at
  `/plan` time rather than trusting them verbatim.

**Authoritative sources of truth**
- **`docs/security_audit_fable.md`** — its §7 "Prioritized Remediation Checklist" is the task backbone; §5 is
  the C1–C12 production verification checklist; §6 lists owner-run (dashboard-side) verifications.
- Memory `project_secret_scan_placeholders`, `bug_railway_trust_proxy`, `reference_llm_model_env_vars`,
  `feedback_calllm_error_handling`; `docs/architecture/server-conventions.md`, `llm-coach-endpoints.md`,
  `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- **Audit + fix the safe items in-scope**; breaking/risky remediations → tracked tickets. (The audit's severity
  ranking + per-finding fix already say which is which.)
- **Telemetry scope: unify OpenAI chat calls only.** `defaultCallLLM` (`mechanismExplainer.mjs`, primary
  production path), `callLLM` (`llmCoachHelpers.js`, offline-only), and `compute.mjs`'s own OpenAI fetch route
  through one instrumented helper returning `{ content, usage }` plus a per-call context object. The Anthropic
  path (`composeExplanation`) and OpenAI TTS are separately-ticketed follow-ups, not v1 scope (see US7.5
  Deferred).
- **Usage storage target: new `llm_usage` table.** Append-only ledger (endpoint/purpose, model, user, tokens,
  cost, timestamp), decoupled from `explanation_cache`'s lifecycle and never truncated on deploy, so cost
  history survives.

### User stories & tasks

**US7.1 — Dependency vulnerability remediation (audit F1, checklist C12).**
*As the founder, I want known vulns fixed without breaking the build.*
1. Move `concurrently` from `dependencies` to `devDependencies` in `connect-four/package.json` (it is dev-only; drags in `shell-quote`).
2. Run `npm audit fix` (audit says all fixable items have non-breaking fixes); file tickets for any breaking major bump with justification.
3. Re-run `npm audit --production`; confirm 0 critical/high (F1 target).
4. Verify build + `npm run test:fast` after the changes.
5. Rebuild/redeploy the image so fixes land in prod; verify via C12 (`npm audit --production` in the deployed context).

**US7.2 — Deploy & transport hardening (audit F2, F3; checklist C1–C6).**
*As the founder, I want prod to fail safe on session security and admin authz.*
1. Confirm `NODE_ENV=production` on Railway; add a boot-time assertion/warning that refuses/loudly warns if `NODE_ENV` isn't `production` while `SUPABASE_URL` points at prod (F2).
2. Add `helmet` with a tuned CSP + HSTS (`maxAge` 1y, includeSubDomains) + `nosniff` + `frame-ancestors`/XFO +
   Referrer-Policy (F3). The CSP must not be a bare `default-src 'self'` placeholder if the app has real
   external origins that a naive default would silently break — but planning (`specs/047.../research.md`
   §2/§4/§5) found the two originally-assumed external origins don't actually apply here: `@sentry/react`'s
   `Sentry.init()` is never called anywhere in `src/`, so `captureException` is currently a no-op that issues
   no network request (frontend error reporting is dead code — tracked separately in `docs/open_issues.md`,
   not fixed by this epic); and Google OAuth's redirect is a full top-level `window.location.href` navigation,
   which standard CSP source directives (`connect-src`/`frame-src`/`form-action`) do not restrict. Neither
   needs a CSP source directive. Enumerate sources explicitly:
   - `connect-src`: `'self'` only (same-origin API — no client Supabase SDK, no Sentry ingest to allow).
   - `img-src` / `media-src`: `'self'` + the Supabase Storage signed-URL host (`coach-tts` bucket audio),
     derived from `SUPABASE_URL` at runtime.
   - `frame-ancestors`: `'none'`.
   - `script-src`/`style-src`: scope to `'self'` (ship `style-src 'self'`; add `'unsafe-inline'` only if the
     step-3 smoke test surfaces a real violation).
3. Add a smoke test (manual or scripted) verifying, with `helmet`/CSP enabled: deep-reveal TTS audio still
   plays in the browser and a full Google OAuth sign-in round-trip still succeeds (no CSP `media-src`/
   `connect-src`/script/style console violation). **Error-reporting is N/A for this smoke test** — no
   error-reporting service is currently wired for the frontend (see Deferred, below); do not gate the CSP
   ship on a Sentry check. Do not ship the CSP without the TTS + OAuth legs passing.
4. Verify auth cookies ship `HttpOnly; Secure; SameSite=Lax` on `sb_access_token` + `sb_refresh_token` in prod (C3).
5. Verify HTTPS is enforced (HTTP → 301/308) and that `.env`/`.git`/source maps are not served (C2, C4).
6. Verify the admin gate is active in prod: unauthenticated `GET/POST /api/admin/lessons` → 401/403, not 200 (C5, C6).

**US7.3 — Admin-gate & server-response hardening (audit F4, F5, F8; checklist C7).**
*As the founder, I want admin endpoints unspoofable and error bodies leak-free.*
1. Verify the localhost admin gate is not XFF-bypassable: `curl -H 'X-Forwarded-For: 127.0.0.1' …/api/admin/candidates` → 403 (F4/C7).
2. Consider adding an admin-session requirement to the `requireLocalhost` endpoints so localhost is a second factor, not the only one (F4).
3. Return a generic `{ error: 'internal error' }` on 500 for public endpoints; keep raw messages in `logError`/Sentry only (F5, ~53 sites).
4. Apply the standard `^[0-6]{0,42}$` movestring validation in `POST /api/debug/classify-all` before `solver.query` (F8).
5. Add a regression test asserting 500 bodies carry no raw `err.message` and that the debug endpoint rejects malformed movestrings.

**US7.4 — Repo hygiene, secret-posture guardrails & live config verification (audit F6, F7, F9, F10; C8–C11; §6).**
*As the founder, I want no tracked traces/recon and verified live config.*
1. `git rm --cached connect-four/log` and add `log`/`connect-four/log` to `.gitignore` (F6); add `.DS_Store` to the **root** `.gitignore` and `git rm --cached` the tracked ones (F7).
2. Decide deliberately whether `.claude/` memory stays tracked given its recon content; document the call (F9).
3. Verify live Supabase RLS (anon key can't read `blunders`), the `coach-tts` bucket is private (public URL 403), and the OAuth/magic-link redirect allowlist has no wildcard (C8–C10).
4. Verify rate limiting is per-IP behind the proxy (429s appear after the limit) (C11); confirm GitHub `main` branch protection + audit CI for secret leakage (§6).
5. Record the F10 positive controls as regression guards (service-role key server-only, RLS, no shell injection, no unsafe HTML, server-enforced tier, signed Stripe webhook) so later epics don't reintroduce them.

**US7.5 — LLM token/cost telemetry (#20; scope: OpenAI chat only).**
*As the founder, I want per-request token/cost accounting for the OpenAI chat call sites.*

Scope decision: unify **OpenAI chat calls only** — `defaultCallLLM` (`mechanismExplainer.mjs`), `callLLM`
(`llmCoachHelpers.js`), and `compute.mjs`'s own OpenAI fetch. The Anthropic path (`composeExplanation` in
`index.js`) and OpenAI TTS are **out of scope for v1** (see Deferred, below) — this resolves the #20 ("every
OpenAI call") vs the original AC ("deep-reveal + compute") scope gap in favor of the narrower, currently-real
call sites.

1. Change the return shape of the unified OpenAI-chat helper to `{ content, usage }` (currently every call
   function — `callLLM`, `defaultCallLLM`, `compute.mjs`'s fetch — discards `data.usage` and returns only the
   string content). Each caller must be updated to destructure `{ content, usage }` instead of a bare string.
2. Change each caller to also pass a context object `{ endpoint, userId, purpose }` into the helper, since usage
   context (which endpoint, which user, why) is known one layer up in the `index.js` request handlers, not
   inside the call function itself. Enumerate the exact caller edits:
   - `mechanismExplainer.mjs`'s `defaultCallLLM`, invoked from `POST /api/explain-move-llm` (deep reveal) —
     pass `{ endpoint: 'explain-move-llm', userId: req.user?.id, purpose: 'deep-reveal' }`.
   - `compute.mjs --llm`'s own OpenAI call — pass `{ endpoint: 'compute-eval', userId: null, purpose: 'offline-eval' }` (CLI, no request-scoped user).
   - `llmCoachHelpers.js`'s `callLLM`, invoked from `run_eval.mjs` — pass `{ endpoint: 'run-eval', userId: null, purpose: 'offline-eval' }`.
3. Derive a dollar estimate from a per-model rate table (respect `OPENAI_MODEL=mini` for prod chat endpoints vs
   `EXPLAIN_MODEL=full` for `compute.mjs`).
4. Persist each call's usage as a row in a **new, append-only `llm_usage` table** (endpoint, purpose, user_id,
   model, prompt_tokens, completion_tokens, total_tokens, cost, timestamp). This table is decoupled from
   `explanation_cache`'s lifecycle and must **not** be truncated on deploy — cost history must survive across
   deploys (unlike `explanation_cache`, see memory `project_spec039_audio_interactive_coach`).
5. Centralize so new OpenAI-chat call sites inherit the wrapper automatically; never swallow the underlying
   call error (per `feedback_calllm_error_handling` — wrap each call individually, an uncaught error must not
   silently drop the entry).
6. Test: the deep-reveal path (`defaultCallLLM`) and the `compute.mjs --llm` path each record a usage row in
   `llm_usage` with the correct model + cost.

### Deferred
- **Anthropic path (`composeExplanation` → `anthropic.messages.create`, ~`index.js:499`) instrumentation** —
  separately-ticketed follow-up; Anthropic's usage shape (`input_tokens`/`output_tokens`) differs from OpenAI's
  (`prompt_tokens`/`completion_tokens`), so it needs its own rate table and cannot share the unified OpenAI-chat
  helper without complicating it.
- **OpenAI TTS (~`index.js:3760`) cost telemetry** — separately-ticketed follow-up; TTS is billed per-character,
  not per-token, so it needs a different usage shape and rate calculation than the chat helper produces.
- **Frontend error-reporting (Sentry) wiring, and FR-005's error-reporting smoke-test leg** — not wired in prod;
  `@sentry/react`'s `Sentry.init()` is never called, so `ErrorBoundary.jsx`'s `captureException` is currently a
  no-op, and server-side Sentry's `SENTRY_DSN` is commented out/not confirmed set — FR-005's error-reporting leg
  is therefore N/A this epic (CSP smoke test covers only TTS + Google OAuth); tracked as a `docs/open_issues.md`
  backlog item (frontend Sentry init), not fixed here.

**Acceptance criteria**
- `npm audit --production` → 0 critical/high (or explicitly ticketed); `concurrently` is in `devDependencies`.
- Prod: cookies `HttpOnly; Secure; SameSite=Lax`; unauth admin endpoints → 401/403; security headers present;
  `.env`/`.git`/source maps → 404; HTTP → HTTPS redirect.
- `X-Forwarded-For: 127.0.0.1` → 403 on localhost admin endpoints; 500 bodies carry no raw `err.message`; the
  debug endpoint rejects malformed movestrings.
- Tracked `connect-four/log` + `.DS_Store` removed and gitignored; live RLS / private TTS bucket / redirect
  allowlist verified.
- `helmet` CSP is enabled with the enumerated sources (`connect-src 'self'`, Supabase Storage signed-URL host
  via `media-src`, `frame-ancestors 'none'`); the smoke test confirms deep-reveal audio still plays and a full
  Google OAuth round-trip still succeeds. (Error-reporting is N/A this epic — see Deferred.)
- The deep-reveal path (`defaultCallLLM`) and the `compute.mjs --llm` path each record a usage row in the new
  `llm_usage` table with the correct model + cost. (Anthropic path and OpenAI TTS are explicitly deferred —
  see US7.5 Deferred.)

**NOT included:** full pen-test/third-party audit (the audit is a static defensive review); breaking dependency
upgrades (ticketed); a cost dashboard UI; spend rate-limiting; the Stripe-secret setup itself (Epic 5 owns keys;
Epic 7 verifies handling); Anthropic-path token/cost telemetry (deferred — different usage shape, see US7.5
Deferred); OpenAI TTS cost telemetry (deferred — char-priced, not token-priced, see US7.5 Deferred). C1–C12
items whose *authoritative* confirmation is dashboard-side (Railway env, Supabase config, GitHub settings —
audit §6) are owner-run verifications, not code tasks.

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; deps + deploy config + server hardening + repo/live
verification + LLM instrumentation; the audit resolves most "which vuln is safe" decisions but F2/F4 remain
open (usage-storage target and CSP source list are now resolved — see Settled decisions / US7.5 / US7.2).
Report already exists (`docs/security_audit_fable.md`); this epic is its `/plan` + remediation. Line numbers
cited throughout are re-confirmed at `/plan` time (see Non-obvious facts).

**Open questions (`/clarify`):** F2 boot-assertion behavior (refuse-to-boot vs warn); F4 add mandatory
admin-session to localhost endpoints or leave localhost-only; keep `.claude/` tracked (F9)?; rate-table source
(constants vs config).

---

## Epic 8 — Onboarding Experience

**Intent:** Design and implement a first-run onboarding flow. *(Content undefined in source — heavily
`/clarify`-driven; the canonical "unresolved design decision" epic.)*

**Issues covered**
- `[new_TODOs #4]` "We need to design and implement the onboarding experience."

**Non-obvious facts** (confirmed code locations + traps)
- New onboarding screens/flow; first-run routing via `src/lib/urlMapping.js`; HomeScreen entry; a store
  "onboarded" flag (persisted).
- Trap: onboarding must not collide with the auth/OAuth entry flows (Epic 5) — decide pre- vs post-signup.

**Authoritative sources of truth**
- No spec covers onboarding. Product framing: `docs/mvp/mvp_product_spec.md`, `docs/launch_tactic.md`
  (retention gate: 7-day unprompted return), `docs/product/*`. Papergames import (spec 038) is a candidate
  first-run action. `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- None. The onboarding **content** is intentionally unresolved — this epic's `/clarify` + brainstorming phases
  must define it before planning. See **Open questions**.

### User stories & tasks

**US8.1 — First-run detection & routing.**
*As a first-time user, I want to be guided in once.*
1. Persist an "onboarded" flag (store + backend).
2. Route a new user into onboarding once on first load.
3. Prevent re-show after completion/skip.
4. Handle anonymous vs signed-in entry.
5. Test: a brand-new user is routed exactly once.

**US8.2 — Value-proposition introduction.**
*As a first-time user, I want to quickly understand the app's value.*
1. Decide intro format (clarify: carousel vs interactive walkthrough).
2. Implement the intro screen(s).
3. Communicate the core value + the one focused workflow.
4. Responsive/mobile layout (390×844).
5. Instrument completion analytics (ties to the 7-day-return gate).

**US8.3 — Guided first workflow.**
*As a first-time user, I want to reach a first "aha" fast.*
1. Route the user into one end-to-end workflow (first puzzle or lesson, or Papergames import).
2. Add lightweight in-flow guidance/coach.
3. Provide a success/reward moment.
4. Hand off to Home afterward.
5. Test: the guided workflow completes end-to-end.

**US8.4 — Skip & re-access.**
*As a user, I want to skip onboarding and revisit it later.*
1. Make onboarding skippable at any step.
2. Make it re-accessible from Settings.
3. Preserve progress if interrupted.
4. i18n all copy.
5. Test: skip works; re-access works.

**Acceptance criteria**
- A brand-new user is routed into onboarding exactly once; not re-shown after completion/skip.
- The guided first workflow completes end-to-end.
- Onboarding is skippable at any step and re-accessible from Settings.

**NOT included** *(pending clarify):* auth/account-creation flow changes (auth epics own that).

**Sizing verdict — Full speckit.** 4 stories × ≥5 tasks; routing + new screens + store flag + copy; **entirely
unresolved design** — exactly what `/clarify` + brainstorming exist for.

**Open questions (`/clarify` — this epic is mostly open):** onboarding content (tutorial / value-prop /
first guided puzzle / import prompt); trigger (pre- vs post-signup; anonymous?); the success metric it drives.

---

## Appendix — issue → deliverable traceability

| Source issue | Epic |
|---|---|
| new_TODOs #1 (board ARIA) | 3 |
| new_TODOs #2 (review-mistakes button look) | 3 |
| new_TODOs #3 (lesson board flicker) | 6 |
| new_TODOs #4 (onboarding) | 8 |
| new_TODOs #5 (past games separator spacing) | 3 |
| new_TODOs #6 (every CTA clickable) | 3 |
| new_TODOs #7 (deep-reveal split un-zoom) | 2 |
| new_TODOs #8 (saga-order lock + upgrade CTA) | 6 |
| new_TODOs #9 (immediate_threat green / forced_block gray) | 4 |
| new_TODOs #10 (missing .limit()/count() endpoints) | 1 |
| new_TODOs #11 = QA:C (coach queue cap 50) | 1 |
| new_TODOs #12 (npm vulns) | 7 |
| new_TODOs #13 (no stray forced_block in puzzles) | 4 |
| new_TODOs #14 (Allen T1–T7 + V-rules) | 4 |
| new_TODOs #15 (double_threat correctness) | 4 |
| new_TODOs #16 (mistakes = blunders + suboptimal) | 2 |
| new_TODOs #17 (lesson coach audio) | 6 |
| new_TODOs #18 = QA:F (community-* label) | 2 |
| new_TODOs #19 (codebase-access security) | 7 |
| new_TODOs #20 (LLM token/cost metadata) | 7 |
| new_TODOs #21 (suboptimal/blunder unification) | 2 |
| new_TODOs #22 (remember me) | 5 |
| new_TODOs #23 (back-button toggle loop) | 2 |
| new_TODOs #24 (Stripe checkout) | 5 |
| new_TODOs #25 (DecodeC4 logo → home) | 3 |
| new_TODOs #26 = QA:B (view imported games CTA) | 1 |
| QA:A blocker (unique index omits user_id) | 1 |
| QA:D major (ReviewScreen stepper) | 2 |
| QA:E major (direct-URL /blunder/:id) | 2 |
| QA:F minor (raw cXrY in prose) | 2 |
| QA:G minor (fork square not highlighted) | 2 |
| QA:H minor (raw sev/tree/movestring leak) | 2 |
| QA:I major (/mistakeDetail reload → home) | 2 |
