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
- `src/screens/MistakeDetailScreen.jsx` renders debug fields at `:359` (movestring), `:362` (`sev:{severity}`),
  `:364` (`tree:{blunder_severity}`); header/pagination/actions live here too.
- `src/screens/ReviewScreen.jsx` — `navigateToMistake`, the chip row + Prev/Next stepper.
- `src/screens/PastGamesListScreen.jsx` — `blunder_count` chip / `no_blunders` label at `:108–115`.
- `src/components/DeepRevealPane.jsx`, `src/components/SplitReveal.jsx` — deep-reveal + split drag.
- `src/lib/urlMapping.js` (URL_MAP) + `handleBack` — routing/back-stack.
- `server/index.js` — `/api/games`, `/api/stats`, `/api/coach/queue` counts. Reason render:
  `server/scripts/reason_engine/reasonEngine.mjs`, `server/explainContext.js`, `server/llmCoachHelpers.js`.
- Trap (spec 037): **URL_MAP must *replace* `/blunder` with `/blunder/:id`, not add** (first-match ambiguity);
  the `is_owner !== false` gate treats `undefined` as truthy — do NOT simplify to `blunder.is_owner`.
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
- Mistake count = **blunders + suboptimal, everywhere** (Past Games, stats, queue, weakness-map, any "N
  mistakes" label). One shared server helper; no endpoint keeps a blunder-only count.

### User stories & tasks

**US2.1 — Unified mistake detail screen (suboptimal + blunder).**
*As a player, I want suboptimal moves and blunders shown in one consistent detail view.*
1. Audit every route/component that renders a non-optimal ply; confirm no explorer-era route/component remains (`rg -i explorer src/`).
2. Render any `blunders` row in `MistakeDetailScreen` regardless of `quality`; add severity-aware styling (blunder vs suboptimal).
3. Guarantee the merged screen always exposes "Start new game from here", "What should I have played?" (deep reveal), "Mark as reviewed" (honor `is_owner !== false` gate).
4. Update `ReviewScreen.navigateToMistake` to route both qualities to the unified screen; verify no explorer fallback path.
5. Remove dead explorer props/i18n; add a test that a suboptimal ply and a blunder ply both mount the same component with all 3 buttons.

**US2.2 — Consistent "mistakes = blunders + suboptimal" counts.**
*As a player, I want "N mistakes" to include suboptimal moves so a lost game never reads "no mistakes."*
1. Add one server helper computing count = blunders + suboptimal from `blunders.quality`.
2. Update `GET /api/games` mistake count to use the helper (preserve field name or migrate consumers).
3. Update `GET /api/stats` accuracy/mistake aggregates to include suboptimal (mind `byPattern` stored-shape caveat).
4. Update coach queue / weakness-map counts to the unified definition.
5. Update `PastGamesListScreen` chip + `no_blunders` copy/i18n (`en.json`) and add a test: a game with 0 blunders + ≥1 suboptimal shows non-zero mistakes.

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
5. Add an interaction test for the double_threat `c2r1` highlight and split-drag zoom stability.

**Acceptance criteria**
- A suboptimal ply and a blunder ply open the same screen component with all 3 action buttons.
- A game with 0 blunders + ≥1 suboptimal shows a non-zero mistake count in Past Games and in stats.
- Direct-load `/blunder/:id` shows correct "Move N / <total>", real "X of Y", and "Start new game from here".
- `/mistakeDetail` reload stays on the category list (not Home).
- Past games → game → blunder → game-link → Back ×3 → Home, no cycle (verified by pathname trail).
- ReviewScreen Prev/Next + chips change `__bsig`; a red chip opens `/blunder/:id`.
- No `sev:`/`tree:`/movestring, no `community-`, no `cXrY` in any blunder-detail text node.
- double_threat `33243432244` fork square `c2r1` is highlighted; split-drag keeps board zoom stable.
- `npm run test:fast` green.

**NOT included:** coach-queue pagination / DB-side counts (Epic 1 owns scale/reachability); tagging/severity
assignment logic; changes to which patterns fire.

**Sizing verdict — Full speckit.** 6 stories × ≥5 tasks (30+); multiple subsystems (server counts + routing +
two screens + panes + render layer); open decisions (URL-param vs state-recovery; nav-divergence root cause).
**Depends on Epic 1.**

**Open questions (`/clarify`):** suboptimal-vs-blunder visual treatment; `/mistakeDetail` route vs
state-recovery; one render choke-point or three; i18n scope for the count copy.

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
- `src/components/Board.jsx` — cells at `:287` have `onClick` but no `role`/`aria-label`.
- `src/components/TopBar.jsx` — add the logo → `go('home')`; verify the real TopBar shape first (mockup vs prod gap).
- `src/screens/PastGamesListScreen.jsx` — mobile chip/separator spacing.
- HomeScreen/StatsScreen — "review past mistakes" styling + the logged-out CTA routing (`AuthModal`).
- Trap: Board role/color assignment goes through `userIsYellow` — keep P1/P2 semantics intact when adding a11y attrs.

**Authoritative sources of truth**
- Memory `project_highlight_cell_colors`, `feedback_mockup_production_gap`; **Spec 010** (design tokens);
  `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- None requiring an owner decision. Bundled deliberately because these small fixes share the frontend shell
  surface and are cheaper to spec/verify together than five micro-tickets.

### User stories & tasks

**US3.1 — Board accessibility.**
*As a screen-reader/keyboard user, I want board columns announced and operable.*
1. Add `role="button"` + `aria-label="column N"` (1-based label; internal coords stay 0-indexed) to interactive cells/columns (`Board.jsx:287`).
2. Add keyboard operability (focus + activate a column).
3. Add visible focus indicators.
4. Preserve P1/P2 role/color semantics (`userIsYellow`).
5. a11y-tree test; confirm it removes the QA verbose-tree-walk fallback.

**US3.2 — Button affordances.**
*As any user, I want buttons to look like buttons.*
1. Restyle "review past mistakes" to read as a button (bg/border/cursor).
2. Audit other pseudo-buttons for affordance gaps.
3. Add hover/active/focus states.
4. Align with design tokens (spec 010).
5. Visual/interaction test.

**US3.3 — Clickable CTAs & logged-out routing.**
*As a logged-out user, I want gated CTAs to route me to sign in, not do nothing.*
1. Audit inert CTAs for logged-out users (HomeScreen/StatsScreen).
2. Logged-out tap on a gated CTA (past games) → register/login (`AuthModal`).
3. Ensure every CTA is genuinely tappable.
4. Preserve the deep-link intent through auth.
5. Test: logged-out past-games tap opens auth and returns to the target.

**US3.4 — Branding logo + mobile spacing.**
*As any user, I want a home logo and clean mobile spacing.*
1. Add a "DecodeC4" logo to `TopBar`; click → `go('home')`.
2. Finalize the logo asset/text treatment.
3. Fix Past Games mobile spacing between chip filters and the separator line.
4. Responsive check at 390×844.
5. Test: logo → home; spacing corrected.

**Acceptance criteria**
- Board cells expose `role`/`aria-label` in the a11y tree and are keyboard-operable.
- "Review past mistakes" reads as a button; a logged-out past-games tap opens auth and returns to the target.
- The DecodeC4 logo navigates home; Past Games mobile chip/separator spacing is corrected at 390×844.

**NOT included:** data/endpoint changes; onboarding (Epic 8); count semantics (Epic 2).

**Sizing verdict — Full speckit (bundled).** 4 stories × ≥5 tasks; touches Board + TopBar + two screens +
AuthModal; a11y + logged-out routing carry real design/QA work.

**Open questions (`/clarify`):** logo asset/text treatment; full inventory of inert logged-out CTAs.

---

## Epic 4 — Puzzle Generation & Correctness

**Intent:** Enforce player-color and pattern constraints in generated puzzles, judge correctness via the
classifier (not `correctCol`), and expand generation with Allen transformations + missing V-rules.

**Issues covered**
- `[new_TODOs #9]` immediate_threat: user = green (P1); forced_block: user = gray (P2). *(Generated-puzzle rule
  only — QA confirmed it does NOT apply to real-game blunders.)*
- `[new_TODOs #13]` No non-forced_block puzzle may contain a forced_block unless it is the answer move.
- `[new_TODOs #15]` double_threat correctness = position generates the fork, not `correctCol` equality.
- `[new_TODOs #14]` Incorporate Allen T1–T7 transformations + the missing Allen-V rules
  (prior session `cf6a4f19-…`).

**Non-obvious facts** (confirmed code locations + traps)
- `server/candidate-generator.js`, `server/classifier.js`, `server/categories.js`, `server/blunderReasons.js`,
  `server/blunderTags.js`; the completion/eval seam is `CompletionStrategy` (spec 007).
- Trap: `classify` (sync, 8-tag) vs `classifyPattern` (async, 15-detector) are different — use the right one
  when judging a resulting position (memory `reference_classify_vs_classifyPattern`).
- Trap: never hand-construct movestrings — source via `playGame`/DB/KB; validate through the **production**
  detector (invariant I12), not just the motivating example.
- The color mapping (P1 green / P2 gray) is in the CLAUDE.md color table; user-facing text says green/gray.

**Authoritative sources of truth**
- **Spec 007** (`CompletionStrategy`) + memory `project_forced_win_refactor`. **Spec 008** + memory
  `project_new_puzzle_categories`, `project_new_category_wiring_checklist`.
- Memory `reference_verified_tactical_movestrings` (Allen V1–V5 + Allis 9 rules + regression), `project_kb_status`,
  `reference_external_pdfs`; `docs/knowledge-base/` entry per category (read before touching its predicate).
- `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- **Every category that has a classifier judges answer-correctness by running that classifier on the resulting
  position** (position-generates-the-pattern), not by `correctCol` equality. This generalizes #15 beyond
  double_threat to all classifier-backed categories.

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

**US4.3 — Classifier-based answer correctness (generalized).**
*As a learner solving a multi-solution puzzle, I want any move that produces the pattern accepted.*
1. Enumerate categories currently keying correctness on `correctCol` vs the `classifyPattern` detectors.
2. Change the correctness check to run the category's classifier on the post-move position, for every classifier-backed category.
3. Integrate with `CompletionStrategy` (spec 007).
4. Validate per category against the full case-space + a counterexample through the **production** detector (I12).
5. Test: a double_threat board with two fork columns accepts both; a non-fork move is rejected.

**US4.4 — Allen T1–T7 board transformations.**
*As the puzzle pipeline, I want Allen's transformations for wider coverage.*
1. Implement T1–T7 as reusable operators over valid boards.
2. Ensure transformations preserve board legality (via `playGame`/solver).
3. Integrate the operators with `candidate-generator` sampling.
4. Solver-verify transformed boards for both players.
5. Add a KB/test worked example per transformation.

**US4.5 — Missing Allen-V rules.**
*As the puzzle pipeline, I want the full Allen-V rule set.*
1. Diff current V1–V5 against Allen's full V set; enumerate the missing rules.
2. Implement each missing V-rule predicate.
3. Solver-verify a worked example per rule; add to KB.
4. Reconcile with the prior session `cf6a4f19-…` exploration.
5. Regression test: existing verified movestrings still classify correctly.

**Acceptance criteria**
- 100% of sampled generated immediate_threat/forced_block puzzles cast the user green/gray respectively.
- A stray forced_block is rejected; an answer-move forced_block is allowed.
- A double_threat board with two fork columns accepts both; a non-fork move is rejected — verified through the
  production detector (I12), not the motivating example alone.
- Each Allen transform + each missing V-rule has a solver-verified worked example; existing verified
  movestrings still classify correctly.

**NOT included:** real-game blunder color rules (explicitly excluded); reason-engine changes; new UI categories.

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; generation + classification + eval seam across
categories + algorithmic transforms; the correctness generalization reshapes the check and needs per-category
I12 validation. Hard algorithms stay in the spec.

**Open questions (`/clarify`):** which categories key on `correctCol` today; exact "answer move is the forced
block" definition; exact list of missing V-rules; transforms for coverage vs canonicalization.

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

**Authoritative sources of truth**
- Memory `project_auth_payments_state`, `reference_tier_source`, `project_magic_link_auth_race`,
  `project_spec036_google_oauth`.
- `docs/architecture/api-conventions.md`, `server-conventions.md`, `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- Session = **long-lived by default** — extend the refresh token (~30–90d), refresh silently on load, **no**
  "remember me" UI toggle.
- Payments = **thin `PaymentProcessor` adapter** (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`)
  with a Stripe implementation behind it. Not a full processor-agnostic catalog layer.

### User stories & tasks

**US5.1 — Stay signed in (long-lived session).**
*As a returning user, I want to stay signed in for weeks.*
1. Extend `REFRESH_TOKEN_MAX_AGE` to a long window (30–90d; pick the value).
2. Keep the httpOnly/Secure/SameSite cookie model (no Authorization header).
3. Update all cookie-set sites (`:240/277/332`).
4. Document the chosen window + rationale.
5. Test: reopen the browser days later within the window → still authenticated.

**US5.2 — Silent token refresh.**
*As a user, I don't want to be logged out mid-session.*
1. On app load, detect an expired access token and refresh from the refresh cookie transparently.
2. Ensure mid-session expiry triggers a refresh, not a logout.
3. Handle refresh failure → clean re-auth.
4. Avoid refresh races (preserve `location.hash` per the magic-link trap).
5. Test: access-token expiry mid-session → transparent refresh.

**US5.3 — Stripe checkout.**
*As a free user, I want to upgrade via checkout.*
1. Checkout endpoint creates a Stripe (test-mode) session with success/cancel URLs.
2. `UpgradeModal` triggers checkout.
3. Env-only secrets (coordinate with Epic 7).
4. Return-flow routing back into the app.
5. Test: a free user completes a test-mode checkout.

**US5.4 — Processor-agnostic interface + webhook tier flip.**
*As the founder, I want to swap processors later without rewriting call sites.*
1. Define `PaymentProcessor` interface (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`).
2. Implement `StripeProcessor` behind it; call sites depend on the interface.
3. Webhook endpoint verifies the Stripe signature and flips tier idempotently (the tier source used by `getProfile()`).
4. Persist subscription status.
5. Test: webhook flips the user to paid; features unlock without re-login; adding a processor needs no call-site change.

**Acceptance criteria**
- Reopen the browser days later within the window → still authenticated; mid-session expiry → transparent refresh.
- A free user completes a test-mode Stripe checkout; the webhook flips them to paid; paid features unlock without re-login.
- Adding a second processor is a new `PaymentProcessor` impl + config, with no change to UpgradeModal or tier-gate call sites.

**NOT included:** a second processor impl; billing/invoice UI; proration; dunning; a "remember me" checkbox.

**Sizing verdict — Full speckit.** 4 stories × ≥5 tasks; server auth + payments + external + frontend + DB
tier; interface shape + session window are real design points. Money + webhooks warrant the full pipeline.

**Open questions (`/clarify`):** exact refresh window + rotation policy; plan/pricing model; subscription vs
one-time; cancellation/downgrade → tier.

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
  (`:172`); there is **no order gate** yet — this epic adds it.
- Lesson editor lives at `src/screens/admin/` (+ `AdminLessonEditorScreen.jsx`/`AdminLessonListScreen.jsx`);
  content is lesson JSON.
- Slide runtime: `src/screens/ConceptScreen.jsx`/`SocraticScreen.jsx` + `src/components/Board.jsx` +
  `CoachDialog.jsx` — the flicker is a Board re-render on coach state change.
- Trap (spec 039): TTS audio is keyed by **text hash, not position**; TRUNCATE `explanation_cache` before deploy.
- Trap: Socratic correctness is client-side `col === correctCol`.

**Authoritative sources of truth**
- **Spec 018/019** (lesson infra + content), **Spec 039** + memory `project_spec039_audio_interactive_coach`,
  `project_deep_reveal_tts` (reuse this TTS pipeline for generation; store the path).
- Memory `project_lesson_interactivity_evaluation`. `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- None requiring an owner decision were resolved this session. Reuse the spec-039 TTS pipeline for generation
  (store path in JSON, don't stream live). The tier-lock upgrade CTA wires into Epic 5's checkout. Key open
  choices are in **Open questions**.

### User stories & tasks

**US6.1 — Order-based lesson unlocking.**
*As a learner, I want lessons unlocked in order so I follow the intended progression.*
1. Add per-lesson completion tracking (store + persistence).
2. Compute lock state as order-based (N locked until N−1 complete) in addition to the tier gate.
3. Define the completion criterion (last slide viewed / Socratic answered) — see open questions.
4. Update `SagaScreen` node states (locked/unlocked/current/done) to reflect order.
5. Test: fresh learner sees only lesson 1 unlocked; completing it unlocks the next.

**US6.2 — Upgrade CTA on tier-locked lessons.**
*As a free user clicking a paid lesson, I want an upgrade prompt, not a dead tap.*
1. Clicking a tier-locked lesson opens `UpgradeModal` (not a no-op).
2. Distinguish tier-lock vs order-lock messaging.
3. Wire the upgrade entry point (ties to Epic 5 checkout).
4. i18n the CTA copy.
5. Test: free user clicking a paid lesson → upgrade CTA.

**US6.3 — Admin: generate lesson audio.**
*As an admin, I want to pre-generate per-slide narration.*
1. Add a "generate audios" action in `/admin/lessons`.
2. Reuse the spec-039 TTS pipeline to synthesize per-slide audio.
3. Store each audio path in the lesson JSON.
4. Handle regeneration when slide text changes (spec-039 keys by text hash).
5. Verify generated paths are saved and resolvable.

**US6.4 — Per-slide audio playback.**
*As a learner, I want the coach to speak each slide.*
1. Load and play the stored audio per slide in the lesson runtime.
2. Add playback controls (play/replay/mute).
3. Serve audio from the chosen storage location.
4. Graceful fallback when audio is missing.
5. Test: opening a lesson plays audio per slide.

**US6.5 — Fix board flicker during narration.**
*As a learner, I don't want the board to flicker when the coach speaks.*
1. Reproduce: clicking a disc while the coach speaks re-renders the board.
2. Identify the cause (Board re-mount vs prop churn from `CoachDialog` state).
3. Memoize/isolate `Board` from coach-state updates.
4. Verify the disc signature stays stable during narration.
5. Regression test for board stability on coach state change.

**Acceptance criteria**
- Fresh learner: only lesson 1 unlocked; completing it unlocks the next.
- Free user clicking a tier-locked lesson → UpgradeModal.
- Admin "generate audios" writes audio paths into the lesson JSON; opening a lesson plays audio per slide.
- Clicking a disc during narration: board disc signature stays stable (no flicker).

**NOT included:** new lesson content (spec 019); live/streaming TTS in lessons (uses stored audio); deep-reveal
TTS (Epic 2/7 territory).

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; frontend saga + admin + lesson JSON + TTS backend +
render-perf; open decisions (completion criterion; audio storage).

**Open questions (`/clarify`):** completion criterion for order-unlock; audio storage/format/versioning;
flicker root cause.

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
- LLM: `server/llmCoachHelpers.js` (`callLLM`, `:199`), `server/mechanismExplainer.mjs` (`:33`), `compute.mjs --llm`.
  `OPENAI_MODEL=mini` for prod endpoints; `EXPLAIN_MODEL=full` for compute — names mislead. Wrap each `callLLM`
  individually; an uncaught error silently drops the entry.

**Authoritative sources of truth**
- **`docs/security_audit_fable.md`** — its §7 "Prioritized Remediation Checklist" is the task backbone; §5 is
  the C1–C12 production verification checklist; §6 lists owner-run (dashboard-side) verifications.
- Memory `project_secret_scan_placeholders`, `bug_railway_trust_proxy`, `reference_llm_model_env_vars`,
  `feedback_calllm_error_handling`; `docs/architecture/server-conventions.md`, `llm-coach-endpoints.md`,
  `docs/best_practices_spec_driven_development.md`.

**Settled decisions**
- **Audit + fix the safe items in-scope**; breaking/risky remediations → tracked tickets. (The audit's severity
  ranking + per-finding fix already say which is which.)

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
2. Add `helmet` with a tuned CSP + HSTS (`maxAge` 1y, includeSubDomains) + `nosniff` + `frame-ancestors`/XFO + Referrer-Policy (F3).
3. Verify auth cookies ship `HttpOnly; Secure; SameSite=Lax` on `sb_access_token` + `sb_refresh_token` in prod (C3).
4. Verify HTTPS is enforced (HTTP → 301/308) and that `.env`/`.git`/source maps are not served (C2, C4).
5. Verify the admin gate is active in prod: unauthenticated `GET/POST /api/admin/lessons` → 401/403, not 200 (C5, C6).

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

**US7.5 — LLM token/cost telemetry (#20).**
*As the founder, I want per-request token/cost accounting.*
1. Capture usage (`prompt_tokens`/`completion_tokens`/`total_tokens`) at the `callLLM` choke-point (`llmCoachHelpers.js:199`).
2. Derive a dollar estimate from a per-model rate table (respect `OPENAI_MODEL=mini` endpoints vs `EXPLAIN_MODEL=full` compute).
3. Persist to a new `llm_usage` table (or column set) with context (endpoint/purpose, model, user, timestamp).
4. Cover `mechanismExplainer.mjs` (`:33`) and `compute.mjs --llm`; centralize so new call sites inherit; never swallow the underlying call error (per `feedback_calllm_error_handling`).
5. Test: deep-reveal + compute paths each record a usage row with the correct model + cost.

**Acceptance criteria**
- `npm audit --production` → 0 critical/high (or explicitly ticketed); `concurrently` is in `devDependencies`.
- Prod: cookies `HttpOnly; Secure; SameSite=Lax`; unauth admin endpoints → 401/403; security headers present;
  `.env`/`.git`/source maps → 404; HTTP → HTTPS redirect.
- `X-Forwarded-For: 127.0.0.1` → 403 on localhost admin endpoints; 500 bodies carry no raw `err.message`; the
  debug endpoint rejects malformed movestrings.
- Tracked `connect-four/log` + `.DS_Store` removed and gitignored; live RLS / private TTS bucket / redirect
  allowlist verified.
- Deep-reveal + compute LLM paths each record a usage row with the correct model + cost.

**NOT included:** full pen-test/third-party audit (the audit is a static defensive review); breaking dependency
upgrades (ticketed); a cost dashboard UI; spend rate-limiting; the Stripe-secret setup itself (Epic 5 owns keys;
Epic 7 verifies handling). C1–C12 items whose *authoritative* confirmation is dashboard-side (Railway env,
Supabase config, GitHub settings — audit §6) are owner-run verifications, not code tasks.

**Sizing verdict — Full speckit.** 5 stories × ≥5 tasks; deps + deploy config + server hardening + repo/live
verification + LLM instrumentation; the audit resolves most "which vuln is safe" decisions but F2/F4 and the
usage-storage target remain open. Report already exists (`docs/security_audit_fable.md`); this epic is its
`/plan` + remediation.

**Open questions (`/clarify`):** F2 boot-assertion behavior (refuse-to-boot vs warn); F4 add mandatory
admin-session to localhost endpoints or leave localhost-only; keep `.claude/` tracked (F9)?; `llm_usage` table
vs extending `explanation_cache`; rate-table source (constants vs config).

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
