# Pending TODOs — Implementation Epic Breakdown

*Decomposes the open items in [`TODOs.md`](./TODOs.md) into `/speckit-specify`-ready epics.
Each epic maps to ~3–4 user stories (smaller where the items are tightly coupled and unrelated
to anything else). Items already shipped were verified against the live codebase and excluded —
notably the `classifyPattern` / `tagBlunder` / `insertGameBlunder` classifier rebuild
(`docs/mvp/patterns_blunders_challenges_epics.md`) is **done** and is not re-listed here.*

*Where this file conflicts with an authoritative design doc (`docs/architecture/*`,
`docs/mvp/*`), the design doc wins.*

---

## Source-of-truth docs

| Doc | Role |
|---|---|
| [`docs/architecture/api-conventions.md`](docs/architecture/api-conventions.md) | Route naming, status codes, error shape, auth threading — ground every endpoint-touching epic here. |
| [`docs/architecture/frontend-conventions.md`](docs/architecture/frontend-conventions.md) | Store interface, screen registry, URL mapping, CSS token systems, Board API. |
| [`docs/architecture/server-conventions.md`](docs/architecture/server-conventions.md) | Solver IPC, classifier API, blunder write path, env vars. |
| [`docs/architecture/data-model.md`](docs/architecture/data-model.md) | PKs, column naming, category slugs, soft delete, jsonb. |
| [`docs/architecture/db-schema.md`](docs/architecture/db-schema.md) | Live table columns/constraints — ground all DB-touching epics here. |
| [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md) | KB schema — source for term-glossary content (Epic 11). |

---

## Verified-pending facts (must be encoded in implementing specs)

1. **`SupabaseStore` queries the DB directly from the client.** `src/store/SupabaseStore.js` makes
   `.from('users' | 'session_stats' | 'puzzle_attempts' | 'lesson_progress')` calls with the anon
   key. Epic 1 must replace every one with a server endpoint. The store *interface* (the method
   table in `frontend-conventions.md`) is a hard contract and must be preserved.
2. **`MistakeDetailScreen` cannot cold-boot from a blunder id.** It takes `blunderNavList` + `index`
   props passed by `MistakesListScreen`; `blunderDetail` is in `SESSION_ONLY_SCREENS`. There is **no**
   `GET /api/blunders/:id` endpoint (`server/index.js` has only `POST /api/blunders`). Epic 8 must add
   both.
3. **`SetPickerScreen` (84 lines) renders only `set.stars`** — no progress bar, cleared indicator, or
   accuracy. Epic 6 adds these.
4. **`SequenceHandler` renders `overlays={[]}`** — the two threats at the `forced_win` double-threat
   step are not highlighted. Epic 5 adds the overlays.
5. **Papergames is half-built.** Server has a `papergames_games` table, a `GET /api/games` merge, and
   `PastGamesListScreen` rendering imports — but there is **no** user-triggered import endpoint and
   **no** `papergames_id` field on the profile. Epic 9 adds the user-facing import flow only.
6. **`CandidateDashboard` renders one row per category** (`stats.map`), not a category dropdown.
   Epic 11 (curation) converts this to a single generator with a category selector.
7. **`'red'`/`'yellow'` are the canonical *internal* board-cell values** (`'red'`→green disc,
   `'yellow'`→gray disc; see `frontend-conventions.md`). The green/gray naming cleanup (Epic 12)
   targets **user-facing** strings and tooling output only — it must NOT rename the internal cell
   enum or the Board API.

---

## Epic order

```
Epic 1  Server-Mediated Data Access      → unblocks Epic 2 (cannot ship insecure client-DB to prod)
Epic 2  Staging/Production Infra & Deploy → depends on Epic 1
Epic 3  Repo Hygiene & Tech-Debt Sweep    → best done early; shrinks surface for later epics
Epic 4  Global Light Color Scheme         → foundational UI; do before further UI polish to avoid rework
Epic 5  Board Interaction Feedback        → independent
Epic 6  Challenge Progression & Variety   → independent
Epic 7  Auth & Onboarding                 → independent (UX), but ship after Epic 2 (prod email infra)
Epic 8  Review & Blunder Sharing          → independent
Epic 9  Papergames Self-Service Import    → depends on Epic 1 (profile write goes through server)
Epic 10 Audio & Coach Pacing             → independent
Epic 11 Curation Category Selector        → internal tool; independent
Epic 12 Coach Text Interactivity          → independent; lowest priority
```

Epics 4–12 have no hard inter-dependencies; the numbering reflects suggested priority, not a
build chain. Epics 1–2 are the only strict prerequisite chain.

---

### Epic 1 — Server-Mediated Data Access (Security Hardening)

**Goal:** The browser never talks to Supabase for data; every read and write goes through a
server endpoint, and the app passes a vulnerability scan with no high-severity findings.

**Scope:**

- Audit every direct Supabase call in the client: `rg "\.from\(|\.rpc\(" src/store/SupabaseStore.js`
  and anywhere else in `src/`. Enumerate each as a `{method, table, operation}` row.
- For each `SupabaseStore` method (`getProfile`, `saveSessionStats`, `getSessionStats`,
  `recordPuzzleAttempt`, `saveLessonProgress`, `getLessonProgress`, `saveSparringRecord`,
  `getSparringRecord`, `saveChallengeSession`, `getLastChallengeSession`, `recordActivityDay`,
  `getStreak`), add a matching server endpoint and rewrite the method to `fetch` it with the
  `Authorization: Bearer <token>` header. **Preserve the method signatures and return shapes**
  exactly — the store interface is a contract (`frontend-conventions.md`).
- New endpoints follow `api-conventions.md`: `loadUser` threading, `{ error }` shape, correct
  status codes, service-role key server-side only.
- Keep the frontend anon key for **auth only** (`getSupabaseClient()` for `supabase.auth.*`).
  This is the one sanctioned client-side Supabase use and stays.
- Run a full vulnerability scan (dependency audit + the security-review skill over the diff +
  the auth/RLS surface). Triage findings into a remediation list; fix high/critical.

**Acceptance criteria:**

- `rg "\.from\(|\.rpc\(" src/` returns zero hits outside `supabase.auth.*`.
- Every former `SupabaseStore` DB operation has a corresponding `/api/*` endpoint that runs through
  `loadUser` and enforces ownership (`user_id = req.user.id`).
- A signed-in user's stats, puzzle attempts, lesson progress, sparring record, challenge sessions,
  and streak all persist and reload correctly through the server (no behavioral regression).
- Vulnerability scan produces a written report; no unresolved high/critical findings.

**NOT included:** Changing the store *interface*, the IndexedDB (anonymous) path, payments/Stripe
hardening beyond what the scan flags, or moving auth off the client.

#### API Contracts — new `/api/user/*` endpoints

All endpoints in this section:
- Route prefix: `/api/user/`
- Auth: **required** — `loadUser` runs; 401 if `req.user` is null
- Ownership enforced server-side: all queries filter `user_id = req.user.id`
- Error shape: `{ "error": "<message>" }` per `api-conventions.md`

| Method | Path | Request body | Response | Notes |
|---|---|---|---|---|
| GET | `/api/user/profile` | — | `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }` | Replaces `getProfile()` |
| GET | `/api/user/session-stats?date=YYYY-MM-DD` | — | stats object \| `null` (200) | Replaces `getSessionStats(date)` |
| POST | `/api/user/session-stats` | `{ date, ...stats }` | 204 | Upserts on `user_id, date`; replaces `saveSessionStats()` |
| GET | `/api/user/session-stats/all` | — | `{ rows: [...], byPattern: { [slug]: { accuracy, attempted } } }` | Replaces `getAllSessionStats()` (not in formal interface but queries DB directly) |
| POST | `/api/user/puzzle-attempts` | `{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }` | 204 | Replaces `recordPuzzleAttempt()`; `created_at` set server-side |
| GET | `/api/user/lesson-progress` | — | `Array<{ lessonId, status: 'complete'\|'incomplete' }>` | Replaces `getLessonProgress()` |
| POST | `/api/user/lesson-progress` | `{ lessonId, status }` | 204 | Upserts on `user_id, lesson_id`; replaces `saveLessonProgress()` |
| GET | `/api/user/sparring-record` | — | `{ W, L, D }` | Replaces `getSparringRecord()` |
| POST | `/api/user/sparring-record` | `{ result: 'win'\|'loss'\|'draw' }` | 204 | Server reads current record, increments matching key, writes back atomically; replaces `saveSparringRecord()` |
| GET | `/api/user/challenge-session` | — | session object \| `null` (200) | Returns most-recent row by date; replaces `getLastChallengeSession()` |
| POST | `/api/user/challenge-session` | `{ date, ...session fields }` | 204 | Upserts on `user_id, date`; replaces `saveChallengeSession()` |
| GET | `/api/user/streak` | — | `{ streak_count, last_active_date }` | Replaces `getStreak()` |
| POST | `/api/user/streak/record-day` | `{}` | 204 | No-op if `last_active_date` is today; increments if yesterday; resets to 1 otherwise; replaces `recordActivityDay()` |

`getStats()` already calls `GET /api/stats` via `fetch` — no change needed.

#### Brainstorming needed

- **Scan tooling & scope.** Decide which scanner(s) define "secure" (e.g. `npm audit`, the
  `security-review` skill, an external SAST/DAST pass) and what severity bar blocks the epic.
  Output: a one-paragraph "definition of secure" and the chosen toolchain.
- **RLS posture.** With all writes server-side via the service-role key, decide whether Supabase
  Row-Level Security is still configured as defense-in-depth or treated as out of scope. Output:
  a decision recorded in `db-schema.md`.

---

### Epic 2 — Staging/Production Infrastructure & Deploy

**Goal:** The team can deploy to an isolated staging environment and, separately, to production,
each backed by its own database.

**Scope:**

- Provision two Supabase projects (or two schemas/branches) — staging and production — and document
  the connection/env split (`.env` lives at `connect-four/server/.env`; see
  `reference_supabase_connection.md`).
- Parameterize all environment-specific config (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_*`, `FRONTEND_URL`, `PORT`,
  `DATABASE_URL` (Postgres pooler connection string used by `migrate.js` via the `pg` driver)) per
  environment.
- **Existing Supabase project is production.** The current live Supabase project is designated
  production as-is. A new, empty Supabase project is provisioned for staging only.
- A migration-application path that runs the same `server/migrations/*.sql` against staging then
  production, in order, with a record of what has been applied. `migrate.js` must self-bootstrap the
  `schema_migrations` ledger table (`CREATE TABLE IF NOT EXISTS`) as its very first step. Because the
  existing production DB already has all 39 migrations applied, a one-time ledger pre-seed step is
  required before the first production deploy: `INSERT INTO schema_migrations (filename) VALUES
  (<each of the 39 filenames>) ON CONFLICT DO NOTHING`. Without this, `migrate.js` sees an empty
  ledger and attempts to replay all 39 migrations, crashing on non-idempotent DDL.
- **Staging puzzle-data provisioning.** A fresh Supabase project has no puzzle rows; migrations only
  create schema. As a one-time staging-setup step, export puzzle rows from production (`pg_dump
  --data-only --table=puzzles`) and import into staging so the smoke test has data to work with.
- **Auth redirect URL allowlisting.** Add `FRONTEND_URL` as an allowed magic-link redirect URL in
  each Supabase project's Auth → URL Configuration → Redirect URLs. This is a per-environment
  deliverable; without it, magic-link sign-in fails regardless of code correctness.
- A repeatable deploy action for each target (build `dist/`, ship server, run migrations) and a
  documented promote-staging→prod flow.

**Acceptance criteria:**

- Staging and production each resolve to a distinct database; a write in one is invisible in the other.
- A documented command/pipeline deploys to staging and a separate one deploys to production.
- Migrations apply identically and idempotently to both targets; applied-migration state is tracked.
- A smoke test (load app, sign in via magic link, complete one puzzle) passes against staging after
  deploy. The smoke test presupposes: (a) the staging Supabase project's Auth redirect URLs include
  the staging `FRONTEND_URL` (otherwise magic-link sign-in fails), and (b) puzzle rows have been
  imported into staging (otherwise no puzzle is available to complete).

**NOT included:** CDN/edge tuning, autoscaling, blue-green or canary deploys, secret-manager
migration, observability dashboards beyond existing Sentry.

#### Decisions

- **Hosting model.** Railway PaaS hosts the Node/solver server. Express serves the Vite `dist/` as
  static files from the same service — no separate frontend host. One Railway project with two
  environments (staging and production), each getting its own build and env var set. `VITE_*` vars
  are baked into the Vite build at deploy time per environment. Railway supports persistent processes
  (required by c4solver's 2-second startup), has near-zero usage-based cost at MVP scale, and
  handles SSL/DNS automatically.
- **DB split mechanism.** Two separate Supabase projects — one for staging, one for production —
  each with its own URL, keys, auth users, and schema. Staging stays on Supabase's free tier;
  production upgrades to Pro when needed. This provides full isolation with independent migrations;
  schema separation would share auth users and complicate RLS; Supabase branching is designed for
  ephemeral PR previews, not persistent staging.
- **Migration runner.** A hand-rolled Node script (`server/migrate.js`) reads
  `server/migrations/*.sql` alphabetically, checks a
  `schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)` ledger table in each DB,
  and runs only unapplied files in order inside transactions. Railway deploy command:
  `node server/migrate.js && node server/index.js`. A failed migration aborts the deploy and blocks
  server start.

---

### Epic 3 — Repo Hygiene & Tech-Debt Sweep

**Goal:** Dead screens and dead code are removed, and user-facing disc terminology is uniformly
green/gray, leaving a cleaner tree for subsequent epics.

**Scope:**

- Map technical debt: enumerate dead screens (cross-check `screenRegistry.js`, `urlMapping.js`, and
  actual `go(...)` call sites), unreferenced components, and dead exports. Produce a written
  debt inventory ranked by impact before deleting anything.
- Remove confirmed-dead screens/components/code. For anything ambiguous, surface it in the
  inventory rather than deleting on a guess.
- Green/gray terminology sweep (user-facing only): audit `rg -iw "yellow|red"` across `src/`,
  `server/`, `lessons/`, and tooling (`visualize_board.sh`, `scripts/`). Replace **user-facing**
  strings and tool output with green/gray. **Do NOT** touch the internal `'red'`/`'yellow'`
  board-cell enum, the Board API, or solver coordinate logic (verified-pending fact #7).

**Acceptance criteria:**

- A debt inventory document exists, listing each removed item and each deferred item with rationale.
- Removed code is gone with no remaining imports; `npm run test:fast` and `npm run lint` pass.
- No user-facing surface or tool output says "red"/"yellow" for discs; internal cell-enum usage is
  unchanged and tests still pass.

**NOT included:** Large architectural refactors, renaming the internal cell enum, performance work,
or rewriting any still-live screen.

#### Brainstorming needed

- **Deletion bar.** Define the evidence required to call a screen/module "dead" (no registry entry +
  no `go()` caller + no import) vs. "keep". Output: a checklist the audit applies uniformly, so the
  delete/keep decision is mechanical rather than judgment-by-judgment.

---

### Epic 4 — Global Light Color Scheme

**Goal:** The app renders on a light base theme by default, so components no longer each override a
global dark scheme.

**Scope:**

- Invert the global theme: `src/index.css` currently sets a dark `color-scheme` and dark surface
  tokens at `:root`, forcing light-surface components (`tokens.css`) to override per-component
  (`project_dark_global_theme.md`, `frontend-conventions.md` two-token-system section).
- Establish light tokens as the global default and audit every component that currently sets
  `color-scheme: light` / scoped light overrides — those overrides become redundant and should be
  removed where the global default now suffices.
- Verify the two-token-system pairing rule still holds (dark surfaces keep dark-theme text) for any
  remaining intentionally-dark surface.

**Acceptance criteria:**

- The default `:root` theme is light; the app is legible on every screen with no invisible
  (light-on-light or dark-on-dark) text.
- Per-component light overrides that existed solely to fight the dark global are removed.
- A visual pass across all routes in `screenRegistry.js` shows no contrast regressions.

**NOT included:** A new design language, dark-mode toggle, restyling individual components beyond
token plumbing, or changing the Board disc colors.

#### Brainstorming needed

- **Token mapping & dark holdouts.** Decide the canonical light palette and which surfaces (if any)
  stay intentionally dark. Output: a token map (old dark token → new light token) and the explicit
  list of dark-holdout surfaces, since this is a cross-cutting CSS change with high rework risk.
  Recommend ASCII/screenshot before-after for the highest-traffic screens.

---

### Epic 5 — Board Interaction Feedback

**Goal:** Every board interaction gives the same drop animation and correct/incorrect feedback, and
key tactical moments are highlighted on the board.

**Scope:**

- **Socratic/practice disc drop + verdict (bug).** On the Socratic board, clicking the correct
  column must drop a disc and show correct/incorrect feedback exactly like the challenges board.
  The first board in a lesson currently doesn't drop on click; the second works. Trace
  `SocraticScreen.handleColumnClick` and `ConceptScreen` (the "practice boards") to find why the
  first board's `lastDrop`/overlay path doesn't fire on first interaction.
- **forced_win double-threat highlight.** When a `forced_win` sequence reaches the double threat,
  highlight the two created threats on the board. `SequenceHandler` currently passes `overlays={[]}`;
  this is a **frontend-only change** — no server modification needed. The
  `POST /api/puzzles/:id/sequence/move` endpoint already returns
  `{ outcome: 'success', threatCells: [{ c: number, r: number }] }` when the learner's move creates
  ≥ 2 threats (verified in `server/index.js`). `SequenceHandler` must read `response.threatCells`
  on a `success` response and convert each entry to an `overlays` item of type `tg`
  (current-player threat highlight): `{ c, r, type: 'tg' }`. Note: `threatCells` uses `{ c, r }`
  — **not** `{ col, row }` as the `/check` endpoint uses — do not mix the two shapes.
- **Challenge-set advance animation.** When advancing to the next board in a challenge set, discs
  shared with the previous board must just appear (no animation); only the newly introduced discs
  drop. On the first board, all discs drop. Diff consecutive boards to compute the "new since
  previous" disc set and gate the drop animation on it.

**Acceptance criteria:**

- Clicking the correct column on any Socratic/practice board drops a disc and shows the same
  correct/incorrect feedback as the challenges board, including the first board of a lesson.
- At the `forced_win` double-threat step, both threat cells are visibly highlighted via `overlays`.
- Advancing within a challenge set animates only the newly added discs; shared discs appear without
  animation; the first board animates all discs.

**NOT included:** New sound effects (Epic 10), new overlay types beyond the existing
`OverlayType` enum, or changes to puzzle correctness logic.

---

### Epic 6 — Challenge Progression & Variety

**Goal:** The challenges view shows a learner's progress and accuracy at a glance, and consecutive
puzzles never repeat the same visual shape.

**Scope:**

- **SetPicker progress UI.** Each challenge set in `SetPickerScreen` shows: (1) a progress bar,
  (2) a clear visual "cleared" state when the set is complete, (3) accuracy expressed visually
  (not a number). The screen currently renders only `set.stars`. Source per-set progress/accuracy
  from the new `GET /api/user/challenge-progress` endpoint (auth-required; defined below), post-Epic 1.
- **No back-to-back same-shape puzzles.** Add a per-puzzle "shape" extractor and a ranker that
  orders a drawn set so no two adjacent puzzles share a shape (e.g. immediate-threat: the
  orientation + coarse position of the group of three; double-threat: the union of involved pieces
  normalized to a corner). Apply the ordering where puzzle sets are drawn (`GET /api/puzzles/draw`).

**Acceptance criteria:**

- Each set card shows a progress bar, a distinct cleared state, and a non-numeric accuracy
  indicator.
- Within a drawn set, no two consecutive puzzles have the same extracted shape (verified on a
  fixture set that previously produced three consecutive identical-shape immediate-threats).
- The constitution's "no raw scores surfaced" rule is respected — accuracy is visual, not a number,
  on the learner surface.

**NOT included:** New challenge categories, changing star thresholds, or a global difficulty curve.

#### API Contract

**`GET /api/user/challenge-progress`**

- **Auth**: required (401 if unauthenticated; unauthenticated users see no progress, handled client-side)
- **Response** (`200 OK`):
  ```json
  {
    "progress": {
      "immediate_threat": { "attempted": 8, "correct": 6, "total": 10, "accuracy": 0.75, "cleared": false },
      "forced_win":        { "attempted": 5, "correct": 5, "total": 5,  "accuracy": 1.0,  "cleared": true  }
    }
  }
  ```
  - `total`: count of `is_active = true` puzzles in that category (from `puzzles` table).
  - `attempted`: count of `puzzle_attempts` rows for this user in this category.
  - `correct`: count of `puzzle_attempts` rows where `first_attempt_correct = true`.
  - `accuracy`: `correct / attempted`; `0` if `attempted = 0`.
  - `cleared`: `true` when the user has at least one correct attempt on every puzzle in the set
    (`correct = total` when each puzzle is attempted exactly once correct; use
    `COUNT(DISTINCT puzzle_id) WHERE first_attempt_correct = true` = `total` as the predicate).
  - Only categories present in `CHALLENGE_SETS` are included. Missing categories default to
    `{ attempted: 0, correct: 0, total: <live count>, accuracy: 0, cleared: false }`.
- **Errors**: 401, 503 (Supabase not configured), 500.

#### Brainstorming needed

- **Shape descriptor & ranker.** The shape-extraction function is per-category and currently
  unspecified. Decide the canonical descriptor for each category (what is normalized, how position
  is coarse-grained, how equality is defined) and the ranking/greedy-reorder algorithm. This is a
  hard-to-derive algorithm — per project policy it should be **fully specified in the spec, not
  deferred to plan.md**. Output: the descriptor definition per category + the reorder algorithm,
  with worked examples sourced from real DB puzzles (never hand-built movestrings).

---

### Epic 7 — Auth & Onboarding

**Goal:** A new user can register with more than just a magic link, and the auth emails they receive
look professional.

**Scope:**

- **Auth email redesign.** Replace the current ugly auth email with a branded, legible template
  (magic-link and any other transactional auth emails). Configured in Supabase email templates.
- **Additional sign-in methods.** Add at least one alternative to the magic link (e.g. email +
  password and/or an OAuth provider). Integrate via `supabase.auth.*` on the client
  (`frontend-conventions.md` — auth stays client-side via the anon key) and surface the options in
  `AuthModal`.
- Note the known open bug `bug_auth_magic_link_redirect.md` (Supabase rejects unlisted
  `emailRedirectTo` URLs) — allowlist the redirect URLs as part of this work.

**Acceptance criteria:**

- Auth emails render with brand styling in major mail clients (no raw/unstyled template).
- A user can complete registration and sign-in via at least one non-magic-link method end-to-end.
- The magic-link redirect bug is resolved (redirect URLs allowlisted for staging and prod).

**NOT included:** Account linking/merging across providers, profile/settings redesign, or 2FA.

#### Brainstorming needed

- **Which providers.** TODO names "password? gmail? meta?". Decide the exact set (password, Google,
  Meta/Facebook, …) weighing setup cost and audience. Output: the chosen provider list and, for each
  OAuth provider, the app-registration prerequisites (client IDs, redirect URIs per environment).
- **Anonymous-→-account migration.** Decide whether the existing IndexedDB→Supabase migration
  (`IndexedDBStore.migrateToSupabase`) needs changes for password/OAuth signups vs. magic link.
  Output: a yes/no with any required store-path adjustments.

---

### Epic 8 — Review & Blunder Sharing

**Goal:** When reviewing a game or blunder it is always clear which color the user played, past
games are sortable by usefulness, and any blunder has a shareable permalink.

**Scope:**

- **Player-color clarity.** On every game-review and blunder-review surface (`ReviewScreen`,
  `MistakeDetailScreen`, `MistakesListScreen`, `ExplorerScreen`), make it unmistakable whether the
  user played Green or Gray (the `side`/`userPlayer` data already exists; surface it as a persistent
  chip/label).
- **Game-navigation sorting.** Sort the past-games list (`PastGamesListScreen` / `GET /api/games`)
  by: games played well, games with horrible blunders, and recent. Sorting is **server-side** so it
  applies before the `limit` cap. Add a `?sort=` query param to `GET /api/games`:
  - `sort=recent` (default, current behavior): `ORDER BY date DESC`
  - `sort=played_well`: `ORDER BY accuracy DESC NULLS LAST, date DESC`
  - `sort=worst_blunders`: `ORDER BY blunder_count DESC, date DESC`
  - Any other value returns `400 { "error": "invalid sort" }`.
  All three values use the existing `accuracy`, `blunder_count`, and `date` columns — no new columns
  or joins required.
- **Blunder permalinks.** Make a blunder a shareable nugget. Add `GET /api/blunders/:id` and
  refactor `MistakeDetailScreen` to cold-boot from a single blunder id (today it requires a
  `blunderNavList[]` + `index` and is in `SESSION_ONLY_SCREENS`). Add a routable URL and OG meta
  (the SPA catch-all already injects OG tags for `/game/:id`; mirror for `/blunder/:id`).

  **`GET /api/blunders/:id` contract (auth/visibility rules resolved in brainstorming below):**
  - Path param: `blunderId` — UUID string.
  - Response (`200 OK`): blunder object matching the shape used by `GET /api/coach/queue` (see
    `api-conventions.md` — `id`, `board_state`, `move_played`, `correct_move`, `pattern_category`,
    `created_at`, `resolved_at`, `severity`, `game_id`, `moveIndex`, `threat_cells`).
  - Errors: 400 (invalid UUID format), 401 (if visibility rule requires auth), 403 (not owner, if
    owner-only), 404 (not found), 503, 500.
  - **`blunderDetail` removed from `SESSION_ONLY_SCREENS`** once this endpoint exists; `/blunder/:id`
    added to `URL_MAP` in `urlMapping.js`.

**Acceptance criteria:**

- Every review/blunder screen shows a persistent Green/Gray indicator for the user's side.
- The past-games list can be reordered by "played well", "worst blunders", and "recent", each
  producing the expected order on a fixture set.
- `GET /api/blunders/:id` returns a single blunder; visiting `/blunder/:id` cold (no prior nav
  state) renders `MistakeDetailScreen` fully; the URL has correct OG title/description.

**NOT included:** Public/unauthenticated blunder viewing if brainstorming rules it out, social
auto-posting, or a new sharing UI beyond a copyable link.

#### Brainstorming needed

- **Permalink visibility model.** Decide whether a blunder permalink is owner-only (auth required),
  unlisted-but-public (anyone with the link), or public. This drives the `GET /api/blunders/:id`
  auth rule and the OG/SEO behavior. "Shareable across social networks" implies public, which
  conflicts with the current owner-scoped blunder model — resolve explicitly. Output: the
  visibility rule and its auth/endpoint implications.

---

### Epic 9 — Papergames Self-Service Import

**Goal:** A user can save their Papergames id to their profile and import their recent games with
one click.

**Scope:**

- Add a `papergames_id` (or username) field to the user profile, written **through the server**
  (Epic 1 rule — no client-side DB write) and surfaced in the profile/settings UI.
- Add a user-triggered import endpoint that runs the existing PoC importer
  (`server/scripts/import_papergames_blunders.mjs`) for the signed-in user. Free tier imports the
  last 5 games; imported games carry their Papergames metadata into `papergames_games` (table and
  the `GET /api/games` merge already exist).
- An "Import" affordance in the UI with progress/result feedback.

**Acceptance criteria:**

- A user can enter and persist their Papergames id from the profile (write goes through the server).
- Clicking Import fetches and stores the user's games; free-tier users get exactly the last 5;
  imported games appear in the past-games list with Papergames metadata and a source chip.
- Re-importing is idempotent (no duplicate game rows).

**NOT included:** Real-time/auto sync, importing opponents' analyses, or paid-tier import limits
beyond the free-tier 5 (define the paid number in brainstorming if needed).

#### DB Change

Add column `papergames_id text NULLABLE` to the `users` table (no unique constraint — a user may
correct/re-enter their Papergames username). No new table needed; `papergames_games` already exists.

#### API Contracts

**`PUT /api/user/profile` — save Papergames id**

- **Auth**: required (401)
- **Body**: `{ "papergames_id": "<string>" }` — only this field is writable initially; validate as
  non-empty string, max 64 chars.
- **Response**: 204 No Content on success.
- **Errors**: 400 `{ "error": "papergames_id must be a non-empty string (max 64 chars)" }`,
  401, 503, 500.

**`POST /api/user/papergames/import` — trigger import**

- **Auth**: required (401)
- **Body**: `{}` — uses `papergames_id` from the authenticated user's profile row; no client-supplied
  Papergames id (prevents importing on behalf of other users).
- **Processing**: runs the existing importer logic from
  `server/scripts/import_papergames_blunders.mjs` scoped to `req.user`; free-tier cap applied
  (limit defined in brainstorming); newly fetched games upserted into `papergames_games` keyed on
  the Papergames game id (idempotency).
- **Response** (`200 OK`):
  ```json
  { "imported": 3, "skipped": 2 }
  ```
  `imported` = new rows written; `skipped` = rows already present (idempotent re-import).
- **Errors**: 400 `{ "error": "no papergames_id configured" }` if profile has no `papergames_id`,
  429 `{ "error": "import limit reached" }` if rate-limit/cooldown applies (values from
  brainstorming), 401, 503, 500.

#### Brainstorming needed

- **Tier limits & rate.** Confirm the free-tier cap (TODO says 5) and decide the paid-tier import
  count and any rate limit / cooldown. Output: the per-tier import caps and rate-limit rule.
- **Import trust & validation.** The PoC importer was written as an offline script; decide what
  validation/sanitization is needed when it runs on user-supplied input in a request path (ties into
  Epic 1's security posture). Output: the input-validation contract for the import endpoint.

---

### Epic 10 — Audio & Coach Pacing

**Goal:** The app has sound and a spoken coach, and coach messages are paced so the user can read
both their own and the coach's commentary.

**Scope:**

- **Sound effects + music.** Add: background music, disc-falling, disc-hits-another-disc, and
  disc-hits-board-bottom sounds. Wire to the Board drop lifecycle (`lastDrop` / drop animation).
  Provide a mute control and respect it app-wide.
- **Spoken coach (TTS).** Make the coach speak its messages aloud (reading on-screen while playing
  is hard). Applies to coach dialog during play and review.
- **Coach message pacing.** Insert a deliberate pause between the player-move commentary and the
  coach/AI-move commentary so the user has time to read both (today the gap is too short). This is a
  timing change in the coach-message sequencing on the sparring/challenge surfaces.

**Acceptance criteria:**

- Dropping a disc plays the appropriate impact sound; background music plays and is mutable; the
  mute preference persists.
- Coach messages can be played as speech; toggling speech on/off works and persists.
- Between a player-move message and the following coach/AI message there is a perceptible,
  configurable pause; both messages are readable before the next state change.

**NOT included:** Voice input, multilingual TTS tuning beyond the default locale, custom-recorded
voice acting, or a full audio settings panel beyond mute + speech toggles.

#### Brainstorming needed

- **TTS approach.** Decide between the browser `SpeechSynthesis` API (free, offline, variable
  quality) and a hosted TTS service (cost, latency, quality). Output: the chosen approach and, if
  hosted, the provider + caching strategy (coach lines are largely templated/i18n keys and could be
  pre-rendered).
- **Sound assets & licensing.** Decide where the four SFX + background music come from and their
  license. Output: the asset source list and license clearance.
- **Pacing values.** Decide the default pause duration and whether it is user-configurable. Output:
  the default ms value and the config surface (if any).

---

### Epic 11 — Curation Category Selector

**Goal:** The internal curation page generates puzzles from a single dropdown of puzzle types
(matching the blunder categories) instead of one component per category.

**Scope:**

- Replace `CandidateDashboard`'s per-category row layout (`stats.map` over every category) with a
  single generator that has a dropdown to choose the puzzle type to generate.
- The dropdown's options must be the blunder categories (align the selectable set with
  `VALID_BLUNDER_TAGS` / the category registry rather than an ad-hoc list — see
  `server-conventions.md` Category/Blunder-tag registries).
- Preserve the existing generate / review / approve-all / reject-all actions for the selected
  category (do not regress curation functionality).

**Acceptance criteria:**

- The curation page has one generator with a category dropdown; the options match the
  blunder-category set.
- Selecting a category and generating produces candidates for exactly that category; review,
  approve-all, and reject-all still work per-category.
- No category-specific duplicated UI blocks remain.

**NOT included:** Changing the generation algorithm, candidate schema, or approval workflow; this is
a UI consolidation of the localhost-only admin tool.

#### Brainstorming needed

- **"Same as blunder categories" reconciliation.** `VALID_CATEGORIES` (puzzle slugs) and
  `VALID_BLUNDER_TAGS` (blunder tags) are deliberately different sets (`server-conventions.md`).
  The TODO says the dropdown's types must match the *blunder* categories. Decide exactly which set
  the dropdown enumerates and how to handle tags that have no puzzle generator (e.g.
  `suboptimal_move`, `drawing_move`). Output: the definitive dropdown option list and the rule for
  excluded tags.

---

### Epic 12 — Coach Text Interactivity *(lowest priority)*

**Goal:** Tactical terms in coach text are tappable for a definition, and the coach can read a deep
reveal aloud while the board highlights the regions it mentions.

**Scope:**

- **KB term glossary popups.** Words like "fork" / "double threat" are marked distinctly; tapping /
  hovering shows a small popup explaining the term, sourced from the knowledge base
  (`docs/knowledge-base/`). Reuse the annotated-text rendering infra (`src/lib/annotatedText.js`
  parses `[zone:...]` specs today; extend it — or add a sibling parser — for KB term spans).
- **Coach reads deep reveal with synced highlighting** *(explicitly low priority in TODO).* As the
  coach narrates a deep reveal, the board highlights the row/column/cell/region being referenced;
  in the text, those references are tappable/hoverable to trigger the same board highlight. Builds
  on `zoneToOverlays` (already in `annotatedText.js`) and the spoken-coach work in Epic 10.

**Acceptance criteria:**

- Designated tactical terms in coach text are visually marked and show a KB-sourced definition popup
  on tap/hover.
- During a deep-reveal narration, the board highlights the referenced zone in sync with the spoken
  text; tapping a reference in the text highlights the same zone.

**NOT included:** Authoring new KB content (use existing entries), a full glossary screen, or
narration for surfaces other than deep reveal.

**Depends on:** Epic 10 (spoken coach) for the read-aloud half; the glossary half is independent.

#### Brainstorming needed

- **Term-detection source.** Decide how a term in free coach text is recognized and linked to a KB
  entry — server-side annotation that emits term spans (like `[zone:...]`), a client-side
  dictionary match against KB titles/aliases, or KB-author-tagged terms. Output: the term→KB-entry
  resolution mechanism and where it runs (server vs client). This gates the whole glossary feature
  and should be settled before speckit-specify.
