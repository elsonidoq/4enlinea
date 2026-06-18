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

- Map technical debt: enumerate dead screens (cross-check `screenRegistry.jsx`, `urlMapping.js`, and
  actual `go(...)` call sites) and unreferenced components. Produce a written debt inventory before
  deleting anything.
- Remove confirmed-dead screens/components/code. For anything ambiguous, surface it in the
  inventory rather than deleting on a guess.
- Green/gray terminology sweep: audit `rg -iw "yellow|red"` across `src/`,
  `server/`, `lessons/`, and tooling (`visualize_board.sh`, `scripts/`). Replace **in-scope**
  strings with green/gray. **Do NOT** touch the internal `'red'`/`'yellow'`
  board-cell enum, the Board API, or solver coordinate logic (verified-pending fact #7).

**Acceptance criteria:**

- A debt inventory document exists, listing each removed item and each deferred item with rationale.
- Removed code is gone with no remaining imports; `npm run test:fast` and `npm run lint` pass.
- No user-facing surface or tool output says "red"/"yellow" for discs; internal cell-enum usage is
  unchanged and tests still pass.

**NOT included:** Large architectural refactors, renaming the internal cell enum, performance work,
rewriting any still-live screen, or per-symbol dead-export pruning (this epic operates at file
granularity only).

#### Decisions

- **Sweep boundary.** The green/gray sweep is **in scope** for: UI strings rendered to users,
  i18n catalog values (`en.json`, `es.json`), lesson content JSON under `lessons/`, and CLI/script
  output strings (stdout). **Out of scope**: code comments, variable names, identifiers, and
  internal enum values.

- **Deletion bar.** Use category-specific evidence to call a file "dead". The reachability model
  is **transitive**: a file is live if it is reachable from the entrypoint roster via the transitive
  import graph (not a single-hop check). If the only file importing X is itself unreachable from the
  entrypoints, X is dead.

  - **Screens** (`src/screens/*.jsx`, `src/pages/*.jsx`): dead when (1) not a key in `SCREENS` map
    in `screenRegistry.jsx`, AND (2) not lazy-loaded in `App.jsx`, AND (3) not transitively
    reachable from any production importer in `src/` (test-only imports do not count).
  - **Components / lib utilities** (`src/components/**`, `src/lib/**`): dead when not transitively
    reachable from any production importer in `src/` (or `server/` for shared utils). Test-only
    imports do not count.
  - **Server modules** (`server/**`): dead when not transitively reachable from the server
    entrypoint roster. The **server entrypoint roster** is: `index.js`, `migrate.js`, all targets
    listed in `package.json` `"scripts"`, all files that use `process.argv` or
    `require.main === module`, and all `*.test.*` files.

- **Verdict taxonomy.** Each audited file receives exactly one of three verdicts:
  - **DELETE** — all dead checks pass; file is removed.
  - **SURFACE** — ambiguous (e.g. a CLI tool with no importer and no entrypoint signal, or a file
    whose purpose is unclear); logged in the inventory but not deleted; owner decides.
  - **DEFER** — owner has explicitly added this file to a keep-list in the inventory; logged but not
    deleted. DEFER is a deliberate owner decision, not inferred from source-code comments (there are
    zero `// TODO:` comments in this codebase).

  Each audited file is logged in the debt inventory with columns: File | Category | Verdict | Reason.

  Rationale: Screens have two distinct alive paths (registry route + admin lazy-load in `App.jsx`)
  that must both be absent; a single import-only rule would miss the registry contract and produce
  false negatives. Transitive reachability prevents false "live" verdicts via dead-importer chains
  and false "dead" verdicts on CLI scripts that have no importers. SURFACE gives a safe landing for
  anything that can't be confidently binned as DELETE or DEFER.

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

#### Decisions

- **Approach: Root flip + scoped dark admin tool (Approach A).** Flip `:root` in `index.css` to
  `color-scheme: light`; change body background from `#060c14` to `#fbf4e8`; change global text
  from `color: var(--text)` to `color: var(--ink)`. Fix the ~10 scattered dark-token uses in
  user-facing JSX. Add a `.dark-surface` scoped CSS block that re-declares the dark tokens, and
  apply it to `AdminCuratePage`'s root div. The `:root` flip and the `.dark-surface` block must
  land in the same commit so the curation tool is never left visually broken.

- **Token map (dark → light replacement):**
  | Dark token (old) | Light replacement |
  |---|---|
  | `--border` (#2d4060) | `--line` (#ece7dd) |
  | `--border-dim` (#1a2840) | `--line` |
  | `--surface` (#162032) | `--card` (#ffffff) |
  | `--surface-2` (#1e2d42) | `--line` |
  | `--surface-3` (#253347) | `--line` |
  | `--text` (#e2eaf5) | `--ink` (#2b2a28) |
  | `--text-sub` (#8ba3c0) | `--ink-soft` (#6b6862) |
  | `--text-muted` (#4a6480) | `--ink-faint` (#a6a299) |
  | `--bg` (#0d1520) body/root | `#fbf4e8` |

- **Dark holdout (permanent):** `AdminCuratePage` and its sub-components (`CandidateDashboard`,
  `CurationWorkspace`, `MultiMoveSequencer`, `PredicateChecklist`, `RejectModal`) are the only
  intentionally-dark surface. They are localhost-only internal tools. This is a permanent decision —
  migrating them to light is explicitly out of scope now and in the future. All user-facing screens
  stay light. `AdminLessonsPage` (the `/admin/lessons` route) has no dark-token dependencies and
  goes light by default without any code change.

- **Dark token definitions removed from `:root`:** After the flip, dark token definitions
  (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-dim`, `--text`,
  `--text-sub`, `--text-muted`) are deleted from `:root` and declared only inside `.dark-surface`.
  Any missed dark-token use will render obviously broken during testing rather than silently
  producing invisible text.

- **`#root` background included in the flip:** `index.css` sets the dark base in three places —
  `:root { background }`, `body { background }`, and `#root { background: var(--bg) }`. All three
  must be updated. `#root` gets `background: #fbf4e8` (or `var(--bg-home)`) to match.

- **Board.jsx — no code change needed:** `Board.jsx`'s `--bg`/`--border-dim` uses are confined to
  a deprecated `shimStyle()` function called exclusively by `CurationWorkspace` (a dark holdout).
  Once `CurationWorkspace` renders inside `.dark-surface`, those tokens resolve correctly. The spec
  task is to verify the curation board renders correctly inside `.dark-surface`, not to change
  Board.jsx props or code.

---

### Epic 5 — Board Interaction Feedback

**Goal:** Key tactical moments are highlighted on the board, and disc drop animations play only
during live gameplay — not on static board loads.

**Scope:**

- **forced_win double-threat highlight (verification).** When a `forced_win` sequence reaches the
  double-threat step, both created threat cells must be visibly highlighted. This is a
  **verification task, not a build task** — `ChallengeScreen` / `handleSequenceClick` already reads
  `data.threatCells` on a `success` response and renders `win`-type overlays. Confirm in a live
  forced_win sequence that both cells light up correctly. No code change is expected. Note:
  `threatCells` uses `{ c, r }` — **not** `{ col, row }` as the `/check` endpoint uses — do not
  mix the two shapes.
- **Challenge-set advance animation.** Discs must animate (drop) only when the user or coach makes
  a move during live gameplay. When a board is loaded statically — challenge-set advance, lesson
  board load, or any other `ChallengeScreen`-driven board swap — **all discs must appear instantly
  with no drop animation**. `Board` owns this logic internally (via internal state or ref); no new
  caller prop is needed. This applies uniformly to standalone challenge sets and
  lesson-confirmation challenges.

**Acceptance criteria:**

- At the `forced_win` double-threat step, both threat cells are visibly highlighted with `win`-type
  overlays (verified, no code change needed).
- When advancing within a challenge set or loading a new board statically, all discs appear
  instantly with no drop animation.
- During live gameplay (user or coach move), the placed disc drops with the standard animation.

**NOT included:** New sound effects (Epic 10), new overlay types beyond the existing
`OverlayType` enum, changes to puzzle correctness logic, or any fixes to `SocraticScreen` /
`ConceptScreen` disc-drop behavior (that bug has already been resolved).

---

### Epic 6 — Challenge Progression & Variety

**Goal:** The challenges view shows a learner's progress and accuracy at a glance, and consecutive
puzzles never repeat the same visual shape.

**Scope:**

- **SetPicker progress UI.** Each challenge set in `SetPickerScreen` shows: (1) a progress bar,
  (2) a clear visual "cleared" state when the set is complete, (3) accuracy expressed visually
  (not a number). The screen currently renders only `set.stars`. Source per-set progress/accuracy
  from the new `GET /api/user/challenge-progress` endpoint (auth-required; defined below), post-Epic 1.
- **No back-to-back same-shape puzzles (curation-time reindex).** A per-category shape descriptor
  `{orientation, subtype, col_zone, row_zone}` is computed once at curation time and stored in new
  `shape_key` and `position` columns on the puzzles table. A "reindex puzzles" button on the
  curation tool runs a round robin algorithm per category: group puzzles by `shape_key`, then
  interleave (A, B, C, A, B, C...) to assign sequential `position` values (0, 1, 2, ...). Puzzles
  with null `position` are skipped by the draw endpoint. Unindexed puzzles trigger a warning in
  the curation tool. Draw time uses sequential position ordering with NO shape algorithm at serve
  time — the reorder is purely a curation-time operation. The adjacency constraint is within-draw
  only; cross-draw adjacency is not guaranteed and is out of scope. `double_threat` shape uses a sorted pair of arm descriptors.
- **New DB columns on puzzles table**: `shape_key TEXT` (category-specific shape bucket identifier)
  and `position INTEGER` (global round-robin index within the category). A new migration adds both
  columns; `position` defaults to `NULL` (puzzles are not served until indexed).
- **forced_win highlight cells migration.** New migration to store `highlight_cells` on the
  puzzles table at curation time (populated from `computeForcedWinHighlight`) so the shape
  descriptor can derive from stored data without board replay. The puzzles table currently has no
  `highlight_cells` column; forced_win `highlight_metadata` is always `null`.
- **Curation tool: reindex puzzles button.** A button per category on the curation admin page that
  triggers the round robin reindex. The tool also warns when a category has puzzles with null
  `position`. The endpoint is server-side (POST-style, admin-only).

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

#### Decisions

- **Shape descriptor: curation-time, not draw-time.** The shape descriptor `{orientation, subtype, col_zone, row_zone}` is computed once at curation time from stored puzzle fields (`highlight_metadata`, `correct_col`, `move_string`, `highlight_cells` for forced_win). Categories with stored metadata (z_threat, undercut, overcut, figure_7, j_shape) derive the descriptor directly from stored fields. forced_win derives from the new `highlight_cells` column on puzzles (populated by a new migration from `computeForcedWinHighlight`). Categories without spatial metadata (immediate_threat, forced_block, double_threat, claimeven, claimodd, forbidden_columns, odd_even_threat) compute the descriptor at curation time via board analysis using the existing `Board` class. The result is stored in `shape_key TEXT` and `position INTEGER` columns on the puzzles table.
- **Reindex algorithm: round robin.** Group puzzles within a category by `shape_key`, then interleave (A, B, C, A, B, C...) to assign sequential `position` values. This guarantees no adjacent same-shape puzzles within a draw. Cross-draw adjacency is not guaranteed and is out of scope. Reindex is triggered from the curation tool via a "reindex puzzles" button (admin-only POST endpoint). The formula: `position = groupIndex + sortedGroupPosition * numGroups`, where groups are ordered by first-seen and positions within each group are shuffled per reindex.
- **Draw endpoint: sequential by position, no serve-time algorithm.** `GET /api/puzzles/draw` selects puzzles ordered by `position ASC`, skipping any with null `position`. The shape reorder was removed from draw time entirely (architectural pivot from the original design doc). The draw endpoint becomes simpler: sequential position ordering, no heap, no shape comparison at serve time.
- **forced_win: store highlight_cells on puzzles.** A new migration adds `highlight_cells` to the puzzles table. At candidate curation/approval time, `computeForcedWinHighlight` populates it (same 5-cell structure with roles hint/loser/hint/loser/winner currently stored only on the candidates table). This makes forced_win shape extraction consistent with other stored-metadata categories. Without this migration, `puzzle.highlight_metadata` is always null for forced_win — a null-dereference if the shape extractor tries to read it.
- **Visual accuracy on SetPickerScreen: colored bar fill.** Each SetCard shows a thin horizontal bar with width proportional to accuracy (0–100%). Color encoding: green (#4caf50) for accuracy >= 80%, yellow (#ffc107) for 50–79%, red (#f44336) for < 50%. No numeric text is shown — purely visual, respecting the constitution's "no raw scores surfaced" rule.
- **Design doc superseded.** The original design doc `docs/superpowers/specs/2026-06-16-shape-descriptor-ranker-design.md` described a draw-time greedy max-heap reorder. That architecture is superseded by the curation-time round robin approach described here. The shape descriptor taxonomy (orientation, subtype, col_zone, row_zone) from that doc remains valid; only the timing and algorithm changed.

---

### Epic 7 — Auth & Onboarding

**Goal:** Replace magic-link registration with Google OAuth as the sole sign-in method.

> Brainstorming decisions: [`docs/superpowers/specs/2026-06-16-epic7-auth-onboarding-design.md`](docs/superpowers/specs/2026-06-16-epic7-auth-onboarding-design.md)

**Scope:**

- **Replace magic-link with Google OAuth.** Remove the magic-link sign-in flow from `AuthModal` and
  replace it with a "Sign in with Google" button. Magic-link is removed entirely; no email+password.
  **Integration (server-mediated — no client Supabase SDK):** Add `GET /api/auth/oauth/google` on
  the server; it 302-redirects to
  `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${FRONTEND_URL}`. The "Sign in
  with Google" button in `AuthModal` navigates the browser to `/api/auth/oauth/google`. The return
  leg (`#access_token=` hash → `/api/auth/callback` → httpOnly cookie) is unchanged. Real contracts
  are the `/api/auth/*` endpoints in `server/index.js` and `ProfileStore.jsx`; there is no client
  Supabase SDK or anon key in the frontend.
- **Redirect-URL allowlist.** Add `FRONTEND_URL` to each Supabase project's Auth → URL
  Configuration → Redirect URLs (staging and production). Required for the Google OAuth callback to
  land correctly. (Same fix noted in open bug `bug_auth_magic_link_redirect.md`.)
- **Update `frontend-conventions.md` auth section** to reflect the current server-mediated
  httpOnly-cookie model, replacing the now-stale client-SDK description.

**Acceptance criteria:**

- A user can complete registration and sign-in via Google OAuth end-to-end.
- Magic-link sign-in is removed from the UI.
- The redirect-URL allowlist is configured for staging and production.

**NOT included:** Auth email redesign (Google OAuth sends no app-side auth emails; a styled template
with no live trigger is untestable — cut entirely). Account linking/merging across providers,
profile/settings redesign, or 2FA.

#### Decisions

- **Which providers.** Google OAuth only. Magic-link removed entirely. No email+password.
  Prerequisites per environment (staging and production):
  - Google Cloud Console: create OAuth 2.0 credential (Client ID + Secret); authorized redirect URI
    = `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
  - Supabase dashboard: Auth → Providers → Google → enable, paste Client ID + Secret.
  - `FRONTEND_URL` added to Auth → URL Configuration → Redirect URLs in each Supabase project.
  - **Initiation via server redirect endpoint** (`GET /api/auth/oauth/google`), not via
    `supabase.auth.signInWithOAuth()` — the client Supabase SDK was removed in commit `87f2818`.

- **Anonymous-→-account migration.** No changes needed. Google OAuth returns `#access_token=` in
  the URL hash after redirect — the existing `checkSession` in `ProfileStore.jsx` handles this
  identically to the old magic-link path, calling `switchToSupabase()` which triggers
  `migrateToSupabase`. The migration code has no auth-method dependency.

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
  by: games played well, games with horrible blunders, and recent. Add a `?sort=` query param to
  `GET /api/games`. Because `GET /api/games` fetches from `games` and `papergames_games` separately
  and merges them into a unified JS array before slicing, sorting happens in JS on the merged array
  (not via a single SQL `ORDER BY`). Implementation:
  - Each table query computes `blunder_count` via a `LEFT JOIN` aggregate at query time — no new
    column is added to either table.
  - The two result sets are concatenated, then JS-sorted by the requested key before slicing.
  - Secondary sort field is `created_at` (not `date`).
  - Sort semantics:
    - `sort=recent` (default, current behavior): by `created_at DESC`
    - `sort=played_well`: by `accuracy DESC NULLS LAST, created_at DESC` — null-accuracy games are
      included but sort after non-null games (JS comparator: null values treated as −∞), then by
      `created_at DESC` among themselves.
    - `sort=worst_blunders`: by `blunder_count DESC, created_at DESC`
  - Any other value returns `400 { "error": "invalid sort" }`.
  No new columns required; `blunder_count` is computed via aggregate JOIN at query time.
- **Blunder permalinks.** Make a blunder a shareable nugget. Add `GET /api/blunders/:id` and
  refactor `MistakeDetailScreen` to cold-boot from a single blunder id (today it requires a
  `blunderNavList[]` + `index` and is in `SESSION_ONLY_SCREENS`). Add a routable URL and OG meta
  (the SPA catch-all already injects OG tags for `/game/:id`; mirror for `/blunder/:id`).

  **`GET /api/blunders/:id` contract (auth/visibility rules resolved in brainstorming below):**
  - Path param: `id` — UUID string.
  - Response (`200 OK`): blunder object **field-for-field equal to a `GET /api/coach/queue` item**
    so `MistakeDetailScreen` needs no adapter. Fields: `id`, `board_state`, `move_played`,
    `correct_move`, `pattern_category`, `created_at`, `resolved_at`, `severity`,
    `blunder_severity`, `game_id`, `moveIndex`, `threat_cells`.
  - Errors: 400 (invalid UUID format), 404 (not found), 500, 503. No 401/403 — this endpoint is
    public (no auth check, no `user_id` filter).
  - **`blunderDetail` removed from `SESSION_ONLY_SCREENS`** once this endpoint exists; `/blunder/:id`
    added to `URL_MAP` in `urlMapping.js` using path param name `id`.

  **Non-owner / signed-out render path on `/blunder/:id`:**
  When the page is visited by a non-owner or a signed-out user the view is read-only:
  - "Mark as reviewed" is hidden (it is a write action scoped to the owner).
  - Deep Reveal is visible but shows a **"Sign in to unlock"** prompt for unauthenticated users
    (deliberate conversion hook — do not hide Deep Reveal entirely).

**Acceptance criteria:**

- Every review/blunder screen shows a persistent Green/Gray indicator for the user's side.
- The past-games list can be reordered by "played well", "worst blunders", and "recent", each
  producing the expected order on a fixture set.
- `GET /api/blunders/:id` returns a single blunder; visiting `/blunder/:id` cold (no prior nav
  state) renders `MistakeDetailScreen` fully; the URL has correct OG title/description.
- Visiting `/blunder/:id` while signed out renders a read-only view — "Mark as reviewed" is
  hidden; Deep Reveal shows a sign-in prompt.

**NOT included:** Public/unauthenticated blunder viewing if brainstorming rules it out, social
auto-posting, or a new sharing UI beyond a copyable link.

#### Decisions

- **Permalink visibility model.** Blunder permalinks are **unlisted-but-public**: anyone with the
  UUID-based URL can view without authentication; the page is not indexed (`noindex` injected).
  `GET /api/blunders/:id` has no `req.user` check and no `user_id` filter — returns the blunder
  row to any caller who knows the UUID. No 401/403; errors are 400 (bad UUID), 404, 500, 503.
  OG tags injected server-side mirroring the existing `/game/:id` pattern.
  Full design: `docs/superpowers/specs/2026-06-16-blunder-permalink-visibility-design.md`

---

### Epic 9 — Papergames Self-Service Import

**Goal:** A user can save their Papergames id to their profile and import their recent games with
one click.

**Scope:**

- Add a `papergames_id` field (internal Papergames hex account ID — not a username) to the user
  profile, written **through the server** (Epic 1 rule — no client-side DB write) and surfaced in
  the UI. **There is no existing profile/settings screen** — the spec must either create a new
  `profile` screen registered in `screenRegistry.jsx`, or embed the input in `PastGamesListScreen`
  (the most natural host, as it already renders papergames content). Next to the input field, add a
  "Find your account ID" link that opens `https://papergames.io/en/account` in a new tab (that
  page shows the account ID when the user is logged into Papergames). The user pastes the hex ID
  manually — no server-side username resolution.
- Add a user-triggered import endpoint. The import runs as a **background job**: `POST
  /api/user/papergames/import` returns `202 Accepted` immediately with a job id; the client polls
  `GET /api/user/papergames/import/status` for completion. The import runs full solver analysis
  (accuracy % computed, blunder rows written to the `blunders` table) and populates
  `papergames_games` rows. Free tier: up to 15 games lifetime (see Decisions). Imported games carry
  their Papergames metadata into `papergames_games` (table and the `GET /api/games` merge already
  exist). **`server/scripts/import_papergames_blunders.mjs` is a standalone CLI with module-level
  side effects and zero exports — it cannot be `import()`-ed from the server.** The spec must
  mandate extracting its core logic into `server/papergamesImporter.js` (a new importable module
  exporting `importForUser(...)`) before the background job handler can call it.
- An "Import" affordance in the UI with progress/result feedback (polling the status endpoint).

**Acceptance criteria:**

- A user can enter and persist their Papergames hex account ID from the profile (write goes through
  the server); a "Find your account ID" link next to the input opens
  `https://papergames.io/en/account` in a new tab.
- Clicking Import returns `202 Accepted` immediately with a job id; polling the status endpoint
  reports progress; once complete, imported games appear in the past-games list with Papergames
  metadata and a source chip, and blunder rows are written to the `blunders` table.
- Free-tier users are capped at 15 lifetime imported games.
- Re-importing is idempotent (no duplicate game rows).

**NOT included:** Real-time/auto sync, importing opponents' analyses, or paid-tier import limits
beyond the free-tier 15 (define the paid number in brainstorming if needed).

#### DB Change

Add two columns to the `users` table in a single migration:
- `papergames_id text NULLABLE` — no unique constraint; a user may correct/re-enter their account ID.
- `last_import_at timestamptz NULLABLE` — used by incremental import to stop pagination once rooms
  older than this timestamp are encountered (see Decisions — Incremental import).

No new table needed; `papergames_games` already exists (migration `038_papergames_games.sql`).
Note: `papergames_games` is absent from `docs/architecture/db-schema.md` — the spec should include
a task to add it.

#### API Contracts

**`PUT /api/user/profile` — save Papergames id** *(new endpoint — not yet registered in `userRoutes.js`)*

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
- **Processing**: enqueues a background job that calls `importForUser(...)` from the new
  `server/papergamesImporter.js` module (extracted from the CLI script) scoped to `req.user`;
  free-tier cap applied (15 lifetime games); newly fetched games upserted into `papergames_games`
  keyed on `papergames_room_uid` (idempotency key); blunder rows written to the `blunders` table.
- **Response** (`202 Accepted`):
  ```json
  { "jobId": "<uuid>" }
  ```
- **Errors**: 400 `{ "error": "no papergames_id configured" }` if profile has no `papergames_id`,
  401, 503, 500.

**`GET /api/user/papergames/import/status` — poll import job**

- **Auth**: required (401)
- **Query param**: `jobId` — UUID string returned by the `POST` above.
- **Response** (`200 OK`):
  ```json
  { "status": "pending"|"running"|"done"|"error", "imported": 3, "skipped": 2, "error": "<message>" }
  ```
  `imported` and `skipped` are `0` while in-progress; populated once `status` is `"done"`. `error`
  field is present only when `status` is `"error"`.
- **Errors**: 400 (invalid or missing `jobId`), 404 (job not found), 401, 500.

#### Decisions

- **Tier limits & rate.** Free tier is capped at **15 total imported games** (lifetime, across all
  imports). Each import run processes up to `max(0, 15 - current_count)` new games; if the user
  already has 15 or more `papergames_games` rows, the import is a no-op and returns
  `{ imported: 0, skipped: 0 }`. Paid tier is controlled by a single `IMPORT_GAME_LIMIT` config
  constant (currently `50`); setting it to `Infinity` enables full-history import with no code
  change. No per-run cooldown — redundant imports are self-limiting because incremental fetch finds
  0 new rooms and returns immediately.

- **Incremental import.** A `last_import_at` timestamp is stored on the `users` row. Each import
  fetches rooms from the Papergames API newest-first and stops pagination once it encounters a room
  older than `last_import_at`. After a successful import, `last_import_at` is updated to now
  (even if 0 new games were found, to avoid re-scanning old rooms on the next call).

- **Import trust & validation.** `papergames_id` is read from the authenticated user's DB row at
  import time; the client supplies nothing at the import call. Movestrings parsed from Papergames
  API responses must be validated explicitly before being passed to the solver — the `Board` class
  from `classifier.js` cannot be used for this: it silently skips out-of-range and overfull columns
  and never signals invalidity. Instead, validate by replaying the sequence move-by-move: each
  character must be in `'0'–'6'`; track per-column heights to detect overfull columns; call
  `hasWon()` after each ply to detect moves-after-game-over. Invalid games are silently skipped and
  counted in the `skipped` response field alongside idempotent re-imports.

---

### Epic 10 — Audio & Interactive Coach

*(formerly Epic 10 "Audio & Coach Pacing" + Epic 12 "Coach Text Interactivity" — merged because
Epic 12's narration half directly depends on Epic 10's TTS decision; running them as separate specs
would require rewriting Epic 12's plan after Epic 10 resolved TTS approach.)*

**Goal:** The app has sound and a spoken coach; coach messages are paced for readability; tactical
terms in coach text are tappable for definitions; and the coach can narrate a deep reveal with
board-synced highlighting.

**Scope:**

- **Sound effects + music.** Add: background music, disc-falling, disc-hits-another-disc, and
  disc-hits-board-bottom sounds. Wire to the Board drop lifecycle (`lastDrop` / drop animation).
  Provide a mute control and respect it app-wide.
- **Spoken coach (TTS).** Make the coach speak its messages aloud (reading on-screen while playing
  is hard). Applies to coach dialog during play and review.
- **Coach message pacing.** Insert a deliberate pause between the player-move commentary and the
  coach/AI-move commentary so the user has time to read both (today the gap is too short). This is a
  timing change in the coach-message sequencing on the sparring/challenge surfaces.
- **KB term glossary popups.** Words like "fork" / "double threat" are marked distinctly in coach
  text; tapping / hovering shows a small popup explaining the term, sourced from the knowledge base
  (`docs/knowledge-base/`). Reuse the annotated-text rendering infra (`src/lib/annotatedText.js`
  parses `[zone:...]` specs today; extend it — or add a sibling parser — for KB term spans).
- **Coach reads deep reveal with synced board highlighting** *(explicitly low priority).* As the
  coach narrates a deep reveal, the board highlights the row/column/cell/region being referenced;
  in the text, those references are tappable/hoverable to trigger the same board highlight. Builds
  on `zoneToOverlays` (already in `annotatedText.js`) and the spoken-coach work above.

**Acceptance criteria:**

- Dropping a disc plays the appropriate impact sound; background music plays and is mutable; the
  mute preference persists.
- Coach messages can be played as speech; toggling speech on/off works and persists.
- Between a player-move message and the following coach/AI message there is a perceptible,
  configurable pause; both messages are readable before the next state change.
- Designated tactical terms in coach text are visually marked and show a KB-sourced definition popup
  on tap/hover.
- During a deep-reveal narration, the board highlights the referenced zone in sync with the spoken
  text; tapping a reference in the text highlights the same zone.

**NOT included:** Voice input, multilingual TTS tuning beyond the default locale, custom-recorded
voice acting, a full audio settings panel beyond mute + speech toggles, authoring new KB content
(use existing entries), a full glossary screen, or narration for surfaces other than deep reveal.

#### Brainstorming needed

- **TTS approach.** Decide between the browser `SpeechSynthesis` API (free, offline, variable
  quality) and a hosted TTS service (cost, latency, quality). Output: the chosen approach and, if
  hosted, the provider + caching strategy (coach lines are largely templated/i18n keys and could be
  pre-rendered). **This decision gates the narration half of the glossary/deep-reveal scope.**
- **Sound assets & licensing.** Decide where the four SFX + background music come from and their
  license. Output: the asset source list and license clearance.
- **Pacing values.** Decide the default pause duration and whether it is user-configurable. Output:
  the default ms value and the config surface (if any).
- **Term-detection source.** Decide how a term in free coach text is recognized and linked to a KB
  entry — server-side annotation that emits term spans (like `[zone:...]`), a client-side dictionary
  match against KB titles/aliases, or KB-author-tagged terms. Output: the term→KB-entry resolution
  mechanism and where it runs (server vs client). This gates the glossary feature and should be
  settled before speckit-specify.

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

### Epic 12 — *Merged into Epic 10*

This epic's scope (KB term glossary popups and coach-narrated deep reveal with board-synced
highlighting) has been merged into **Epic 10 — Audio & Interactive Coach**. The merge was made
because the narration half depends on Epic 10's TTS decision, and running them as separate speckit
pipelines would have required rewriting Epic 12's plan after Epic 10 resolved that choice.
