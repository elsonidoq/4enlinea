# Phase 0 Research: Server/API Data Integrity & Environment Correctness

All "unknowns" in this feature are resolved by reading the epic (`docs/epics/open-issues-epics.md`
§Epic 4), the spec's own "Context this spec inherits" section, and the current code at the cited
sites — not by external research. This doc records the decisions that shape Phase 1 design and the
concrete current-state findings each decision rests on.

## D1 — Device-identifier mechanism (US1 / FR-001, FR-002)

**Decision**: Client-supplied `profile.device_uuid` first; server-minted, cookie-backed UUID as
fallback, echoed in the response body.

**Rationale**: The spec's "Context this spec inherits" section already settles this as a scoped
amendment to the epic's Settled decision #1. Two facts from the current code make the mechanism
concrete rather than speculative:

- `cookie-parser` is already wired (`connect-four/server/index.js:7` `import cookieParser from
  'cookie-parser'`, `:197` `app.use(cookieParser())`), and `cookieOpts()` (`:335-342`) already
  produces the `{ httpOnly, sameSite: 'lax', secure: NODE_ENV==='production', path: '/' }` shape
  used for the existing `sb_access_token`/`sb_refresh_token` cookies. The device-identifier cookie
  reuses this exact helper — no new cookie-security decision needed.
- `connect-four/src/store/IndexedDBStore.js:42-51` (`getProfile()`) already mints a real
  `generateUUID()`-based `device_uuid` into IndexedDB for every anonymous client on first read —
  `GameScreen.jsx:60-77`'s `''` fallback only fires if `store.getProfile()` throws. So the
  overwhelming majority of anonymous traffic already carries a real, stable, reproducible
  identifier; the cookie fallback exists for the request that has no cookies, no prior session,
  and a `getProfile()` failure (or, for the two `POST /api/puzzles/:id/check` /
  `POST /api/puzzles/:id/sequence/move` sites, simply because nothing wires `profile.device_uuid`
  into their request bodies yet).

**Implementation shape**: both fix sites (`server/index.js:2514` and `:1897`) resolve the identifier
via one shared helper, `resolveDeviceUuid(req, res, bodyValue)` — reads `bodyValue` (or
`req.cookies?.dc4_device_uuid`) first, else mints via `crypto.randomUUID()` and calls
`res.cookie('dc4_device_uuid', uuid, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE })` before
returning it — rather than duplicating the same read/mint/cookie-set logic at both call sites
(Constitution Principle II).

**Alternatives considered**:
- *Reject with 400 when absent* — rejected per the epic's Settled decision #1 explicitly: this
  would 500/400 `SupabaseStore.recordPuzzleAttempt`-style callers that forward no `deviceUuid` at
  all, and is out of scope regardless since neither cited handler is `SupabaseStore`'s target.
- *Mint a fresh UUID per request with no cookie* — rejected per the spec's own "cross-endpoint join
  key" analysis: `resolveGameBlunderOwner`/`resolveQueueOwner`
  (`server/anonBlunderAccess.js:17`/`:29-33`) require the *same* identifier to be reproducible by
  the client on a later `GET /api/coach/queue?device_uuid=` read — a fresh-per-request UUID would
  satisfy "never shared" while orphaning every row it wrote.

**Cookie design (left open by the spec, decided here)**:
- **Cookie name**: `dc4_device_uuid` — namespaced like the existing `sb_access_token`/
  `sb_refresh_token` pair, distinct from Supabase's own `sb_*` prefix so it reads unambiguously as
  this app's own cookie, not an auth token.
- **Expiry**: `maxAge` matching `REFRESH_TOKEN_MAX_AGE` (`:345`, 60 days) — the device identifier is
  a long-lived per-client anchor, not a session token; there is no reason for it to expire sooner
  than the longest-lived cookie already on this domain, and reusing the constant avoids inventing a
  new magic number.
- **Response-body field name**: `deviceUuid` (camelCase, matching every other JSON response field
  in `POST /api/puzzles/:id/check`'s existing response shape at `:2545-2550` — `correctCol`,
  `tiedWith`, `threatCells`, `forbiddenCols` — and matching the request-body key the client already
  sends, `deviceUuid`, not the DB column name `device_uuid`).
- **Cookie value = response value = DB-written value**: on any request where the server mints a new
  UUID (no cookie, no body field), it sets the cookie AND echoes the same value in the response body
  AND uses that same value for the `device_uuid` column write in the same request — one UUID, three
  places, not three independent mints.
- **Client adoption**: the client has no existing "adopt a server-issued device_uuid into the local
  profile" method (`IndexedDBStore.js`'s `getProfile()`/`updateProfile()` are the only profile
  writers). A minimal adoption path is in scope only if a caller can receive the echoed value with
  nothing to do with it; per FR-001/FR-002 the cookie itself is what makes the identifier
  reproducible across requests (via `credentials: 'include'`, already set on every fetch in
  `GameScreen.jsx`/`ChallengeScreen.jsx`), so client-side adoption into IndexedDB is NOT required
  for correctness — the cookie alone satisfies "stable across requests, reproducible by that
  client." Tasks should not add IndexedDB-write plumbing beyond what FR-001/FR-002 require.

**Decision 2 amendment (plan-critique step): `ChallengeScreen.jsx` sends nothing.** The design above
already concedes client-side adoption "is NOT required for correctness" — the plan-critique step
takes this one step further and drops the *sending* side too for `ChallengeScreen.jsx`'s two sites.
Verified: `ChallengeScreen.jsx` has zero references to `profile`/`getProfile` today, so
"add `profile.device_uuid` to the request body" (the earlier design) would require introducing a
brand-new client dependency into a component that has none, plus an async-ordering hazard (a
profile load racing the first request). Since both sites already use `credentials: 'include'`, the
server-minted `dc4_device_uuid` cookie reaches the handler with zero client-side change. This is
Decision 2 in the plan-critique record; it strikes FR-001's client-body clause and removes the two
`ChallengeScreen.jsx` request-body touches from the epic's client-side scope (see `spec.md` Out of
Scope §, amended). `server/index.js:1897` (`GameScreen.jsx`'s games-insert path) is unaffected —
`GameScreen.jsx` already has `profile.device_uuid` to send, unlike `ChallengeScreen.jsx`.

## D2 — `GET /api/games` tiebreaker shape (US2 / FR-010, FR-011)

**Decision**: The tiebreaker is a **JS comparator addition**, not a SQL `ORDER BY id ASC` clause —
because `GET /api/games` (`server/index.js:1971-2072`) has no `.range()`/`OFFSET`/`LIMIT` at the SQL
level at all. It fetches ALL matching rows from both `games` and `papergames_games`
(`aiQuery`/`pgQuery`, `:2012-2029`, no `.order()` on either), normalizes them into one `unified`
array (`:2104-2090`), sorts that array in JS (`unified.sort(...)`, `:2101-2114`, one of three
comparators depending on `sortBy`), then slices `unified.slice(offset, offset + limit)`
(`:2116-2117`) — the "pagination" is an in-memory array slice over a result set re-fetched in full
on every request.

**Root cause of the actual risk**: `Array.prototype.sort` in V8/Node is a **stable** sort (has been
since Node 11 / ES2019), so ties in the comparator preserve the *original array order* — but that
original order is the order Postgres returned rows in, from a query with **no `ORDER BY` clause at
all**. Postgres does not guarantee a stable return order across separate executions of an
unordered query. So two rows sharing the same `created_at` (the default `'recent'` sort's tiebreak
value) can land in a different relative order on page N's request vs. page N+1's request, purely
because the underlying (unordered) fetch returned them differently — `unified.slice()` then skips
or duplicates whichever row crossed the page boundary in the reordering.

**Fix**: add a final deterministic key to each of the three JS comparators
(`sortBy === 'played_well'`/`'worst_blunders'`/else) — when the primary key ties, break by `a.id`
vs `b.id` (string compare; `unified[].id` is the row's own `games.id`/`papergames_games.id` UUID,
already present in the unified shape at `:2059`/`:2079`). This does **not** require adding
`.order('id')` to `aiQuery`/`pgQuery` — the deterministic order is enforced entirely at the JS
`unified.sort()` layer, since that is where all rows converge into one page-able sequence. This is
the audit-not-copy shape the epic explicitly requires: `/api/coach/queue`'s `id ASC` tiebreaker
lives in a SQL `.order()` clause because that endpoint's `.range()` does real SQL-level
`OFFSET`/`LIMIT`; `GET /api/games` has no SQL-level pagination to add a SQL tiebreaker to.

**Alternatives considered**: Adding `.order('id')` to `aiQuery`/`pgQuery` was considered and
rejected as insufficient on its own — even with both source queries individually ordered, the
`unified` array interleaves two source tables and re-sorts by `created_at`/`accuracy`/
`blunder_count`, so the source-query order only matters as the stable-sort input; the tiebreak still
has to live in the `unified.sort()` comparator to be effective post-merge.

## D3 — `GET /api/admin/candidates` tiebreaker (US2 / FR-012a, FR-012b)

**Decision**: Add `.order('id', { ascending: true })` after the existing
`.order('created_at', { ascending: true })` at `server/index.js:3142` — this endpoint **does** use
real SQL-level `.range(offset, offset + limit - 1)` (`:3143`), so the fix is the direct SQL
`ORDER BY created_at ASC, id ASC` pattern, matching `/api/coach/queue`'s precedent exactly (unlike
`GET /api/games`, this endpoint has no in-JS merge to complicate the fix).

**`GET /api/puzzles/draw` confirmed out of scope for SC-002**: `server/index.js`'s draw handler
uses `.range()` with a `Math.floor(Math.random() * ...)`-derived randomized offset (confirmed by
reading the handler, not merely inherited from the prior agent's inference) — each call is an
independent random single-page fetch, not a page-to-page traversal a client repeats with
incrementing offsets, so "provably unique sort key across page boundaries" does not apply to it.
FR-012a still requires it in the inventory (documented, not fixed).

## D4 — Candidate-insert duplicate-safety mechanism (US2 / FR-012)

**Decision**: `CREATE UNIQUE INDEX ... ON candidates (generation_run_id, move_string)`, and switch
the retry loop's `.insert(rows)` to `.upsert(rows, { onConflict: 'generation_run_id,move_string',
ignoreDuplicates: true })`.

**Why upsert-ignore over "catch 23505 and treat as success"**: the insert at
`server/index.js:3002` (`supabase.from('candidates').insert(rows)`) is a **single batched INSERT of
the whole `rows` array**, not a per-row insert. If the first attempt fully succeeded and only the
network acknowledgment was lost (the exact scenario OI-50/FR-012 targets), retrying with plain
`.insert(rows)` would send the identical `rows` payload again — every row in the batch would
violate the new unique constraint simultaneously, and a bulk `INSERT` is one atomic statement, so a
single `23505` fails the *entire* statement (Postgres does not partially apply a multi-row
`VALUES` insert). Catching that error and declaring the retry "successful" would be correct in this
specific all-or-nothing case, but `.upsert(..., { ignoreDuplicates: true })` is the more direct
expression of the same intent (idempotent replay), and also degrades correctly if `generateCandidates()`
ever produces a batch with an internal near-duplicate (should not happen today, but the upsert
doesn't depend on that never happening the way a bare "catch 23505" would if attempted per-row
later).

**Existing index confirmed non-unique**: `connect-four/server/migrations/007_puzzle_factory.sql:34-37`
— `idx_candidates_run ON candidates(generation_run_id)` and `idx_candidates_move_string ON
candidates(move_string)` are both plain (non-unique) B-tree indexes on a single column each; neither
constrains the pair.

**Spec-text amendment**: `spec.md`'s original FR-012 wording said "treating a resulting Postgres
`23505` (duplicate key) error as a successful no-op" — this literal mechanism is not viable, per the
"why upsert-ignore" reasoning above (a bulk multi-row `INSERT` fails atomically on one `23505`,
discarding every good row in the batch). `spec.md` FR-012 has been amended to name the `upsert`/
`ignoreDuplicates` mechanism directly, recording this substitution inline rather than leaving the
plan to silently diverge from the spec's literal words.

## D4a — Migration 062 needs FR-017's pre-check discipline too (Blocking issue 1, plan-critique step)

**Decision**: Migration 062 (D4 above) gets the same live-DB pre-check + deterministic dedupe
discipline FR-017 already mandates for migration 063, applied to `(generation_run_id, move_string)`
duplicate groups instead of non-conforming `outcome` values.

**Why this was missing and why it matters**: `CREATE UNIQUE INDEX IF NOT EXISTS` only guards against
the *index* already existing — it does nothing to prevent the statement from erroring if duplicate
*rows* already violate the intended uniqueness. Duplicate `(generation_run_id, move_string)` pairs
are exactly what OI-50's retry bug produces (`server/index.js:3000-3005`, the `MAX_INSERT_ATTEMPTS`
loop re-sending the identical `rows` batch on any error, including a false-negative
post-commit-but-lost-ack error). If even one such pair is live in any environment this migration
runs against, `CREATE UNIQUE INDEX` fails, `server/migrate.js:98`'s `process.exit(1)` fires, and
`connect-four/railpack.json`'s `deploy.startCommand` (`"node server/migrate.js && node
server/index.js"`) means the server never boots — a single duplicate row blocks the entire Railway
deploy. This is strictly higher-severity than 063's failure mode (a stray non-conforming `outcome`
value fails `VALIDATE CONSTRAINT` loudly but doesn't block `CREATE INDEX`/deploy the same way), so
062 deserved the discipline at least as much as 063, not less.

**Fix**: before `CREATE UNIQUE INDEX`, the migration runs a deterministic `DELETE` that, for every
`(generation_run_id, move_string)` group with more than one row, keeps exactly one row (ordered by
`(created_at, ctid)` — NOT `id`, since `candidates.id` is a random UUID,
`007_puzzle_factory.sql:18`, and "keep the lowest id" would pick a random surviving row rather than
a deterministic one) and deletes the rest — safe because a retry resends identical row data, so the
surviving row already carries the correct values. The migration's pre-check query result (count of duplicate
groups found, on whichever of staging/production is reachable) is recorded in the migration comment
before finalizing, matching FR-017's "must not assume zero without recording that it checked" rule.
See `data-model.md`'s `062_candidates_generation_run_unique.sql` for the exact SQL.

## D5 — `puzzle_attempts.outcome` migration mechanics (US3 / FR-016, FR-017)

**Decision**: One migration (see Phase 1 `data-model.md` for the exact SQL) that:
1. Remaps any pre-existing row whose `outcome` is `'correct_retry'` to `'correct_first'`, and any
   row whose `outcome` is `'revealed'` (or any other unforeseen non-conforming value) to
   `'abandoned'`. **Amended (Decision 1, plan-critique step)**: the original single-query design
   ("remap `'revealed'`/`'correct_retry'` to `'abandoned'`") is wrong for `'correct_retry'`
   specifically — that value records a *success* (a correct answer, reached on retry), so
   collapsing it into `'abandoned'` relabels a success as an abandonment, the opposite semantic,
   which the epic's Settled decision #3 forbids (remaps must carry no information loss). The
   retry-vs-first distinction is already preserved by the separate `first_attempt_correct` boolean
   column, so `'correct_retry' -> 'correct_first'` is genuinely lossless; `'revealed'` has no
   better-fitting conforming value, so it remains mapped to `'abandoned'`, matching the same
   information-loss class the epic already accepts for the historical incorrect/abandoned
   collapse.
2. Drops the existing (unnamed, Postgres-auto-named) CHECK constraint from
   `connect-four/server/migrations/003_puzzles.sql:26-27` and adds the narrowed one, `NOT VALID`
   then `VALIDATE CONSTRAINT`, per `db-schema.md`'s general safe-migration pattern (avoids a
   full-table lock during validation on a large table — the same reason migrations elsewhere in
   this repo use the two-step form).

**Live-database check (FR-017 precondition)**: not yet run as of this plan — Phase 2 tasks must
query `puzzle_attempts` for rows where `outcome NOT IN ('correct_first','tied','incorrect','abandoned')`
against whichever of staging/production is reachable (`reference_supabase_connection.md`) before
finalizing the remap step, and record the count found (0 or N) in the migration's own comment
per FR-017's "must not assume zero without recording that it checked."

## D6 — Anonymous analyze cache-check (US3 / FR-013)

**Decision**: Widen the existing `if (req.user) { ... }` guard at `server/index.js:2190` to
`if (req.user || gameDeviceUuid) { ... }`, and inside it, branch the `blunders` lookup filter:
`req.user` → unchanged `.eq('user_id', req.user.id)`; else → `.is('user_id', null).eq('device_uuid',
gameDeviceUuid)`. `gameDeviceUuid` is already captured at `:2169` (`aiGame.device_uuid ?? null`) for
the anonymous games-write path — this reuses the same variable, no new capture needed. Mirrors the
anon blunder-write ownership decided by `resolveGameBlunderOwner` (`server/anonBlunderAccess.js:17`),
which already stamps anonymous blunder rows with `user_id: null, device_uuid: <game's device_uuid>`
— so the cache-check's read-side filter is symmetric with the write-side filter already in
production.

**Implementation shape**: the reconstruction logic that runs once a cache hit is found
(`server/index.js:2202-2269`, ~70 lines building `cachedMoves`/counters/response) is identical for
both branches once the filter above selects the right `existingBlunders` set — only the Supabase
query's `.eq(...)`/`.is(...)` filter chain differs by caller type. Per Constitution Principle II (no
duplicated ~70-line block), this plan extracts that reconstruction into one shared function taking
`(existingBlunders, moves, side, created_at, ...)` and returning the response payload, called from
both the `req.user` and the new `gameDeviceUuid`-only branch — not copy-pasted.

## D7 — `resolveWorktreePortEnv()`/`resolvePorts()` fatal-in-worktree detection (US4 / FR-025, FR-026)

**Decision**: Re-implement `worktree-ports.sh`'s exact detection —
```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
```
(`worktree-ports.sh:16-17`) — as a Node `execSync('git rev-parse --git-dir')` /
`execSync('git rev-parse --git-common-dir')` pair inside both `resolvePorts()`
(`connect-four/vite.config.js`) and `resolveWorktreePortEnv()` (`connect-four/server/index.js`),
comparing the two paths the same way the shell script does. **Critical constraint, not optional**:
this detection call itself must be wrapped in its own try/catch, separate from the port-derivation
try/catch, and a failure there (no `.git` at all) must fall through to the *existing* non-fatal
default path — never fatal. `docs/architecture/worktree-conventions.md`'s "Production/Railway"
section, and its dated 2026-07-18 CORRECTION, document exactly why: Railway's build container runs
`vite build` (which executes `vite.config.js`'s top-level `resolvePorts()` call) with **no
`worktree-ports.sh` and no `.git` directory available at all** — a `git rev-parse` call there throws
`ENOENT`/`fatal: not a git repository`, which is indistinguishable at the exception level from "this
is a linked worktree whose self-derive is broken" unless the two failure modes are told apart
explicitly. The correct rule: (a) if the `git rev-parse` calls themselves throw → not a
worktree (or not a git checkout at all) → today's existing silent-default behavior, unchanged
(FR-026); (b) if the `git rev-parse` calls succeed AND `GIT_DIR !== GIT_COMMON` → this is
definitively a linked worktree → a subsequent `worktree-ports.sh` self-derive failure is fatal
(FR-025); (c) if they succeed and `GIT_DIR === GIT_COMMON` → main checkout → unchanged (FR-026).

**Alternatives considered**: Extracting the `GIT_DIR`/`GIT_COMMON` check into a shared module that
both `worktree-ports.sh` and the two JS consumers import — rejected, explicitly out of scope per the
spec's "Out of Scope" section: "`worktree-ports.sh` itself... is not extracted from or exported by
the script itself." Each consumer re-implements the check independently, in its own language (bash
vs. two separate Node call sites) — accepted duplication, not a violation, per that guard rail.

**Amendment (2026-08-02, plan-critique step — supersedes the "each consumer re-implements
independently" framing above for the two JS consumers specifically):** `server/index.js` exports
nothing at all (confirmed: no `export default app`/`module.exports = app` anywhere in the file), and
`resolveWorktreePortEnv()` is an unexported top-level function invoked unconditionally at module load
(`server/index.js:78`), with `app.listen(PORT, ...)` also called unconditionally at module scope
(`server/index.js:4203`) — importing `server/index.js` to unit-test `resolveWorktreePortEnv()` in
isolation boots the Express server and binds a port, which is infeasible in a test file. This forces
an extraction the Out-of-Scope boundary does not forbid: that boundary blocks rewriting
`worktree-ports.sh` **itself**, not creating a new Node-side module. The two JS consumers
(`resolveWorktreePortEnv()` in `server/index.js` and `resolvePorts()` in `vite.config.js`) now share
one new module, `connect-four/server/worktreePorts.js`, holding the `GIT_DIR`/`GIT_COMMON` detection
plus the fatal-vs-fallback decision from (a)/(b)/(c) above. This is a **different artifact** from
`worktree-ports.sh`, does not touch that script, and removes what would otherwise be genuinely
duplicated (not merely parallel-language) detection logic between the two JS call sites — the
"accepted duplication" framing above is retracted for those two consumers specifically; it remains
correct as between the shell script and the JS module pair.

## D9 — Staging pooler port (US4 / FR-029, OI-31)

**Finding**: the repo's local `connect-four/server/.env.staging` file (present in this worktree,
not committed — contents not reproduced here per the project's never-print-secrets convention) has
a `DATABASE_URL` on port **6543**, confirmed via `grep -o ':[0-9]\{4,5\}/' connect-four/server/.env.staging`
→ `:6543/`. Per `docs/architecture/server-conventions.md`'s "Migration Runner" section
(`:1437-1441`), port 6543 (transaction-mode pooler) is explicitly **forbidden** for `migrate.js`,
which wraps each migration in `BEGIN...COMMIT`; the required port is 5432 (session-mode pooler),
with `sslmode=no-verify` appended.

**What this does and doesn't settle**: this confirms OI-31's risk is real for any *local*
`node --env-file=server/.env.staging migrate.js` invocation. It does **not** settle FR-029, because
`connect-four/railpack.json`'s `deploy.startCommand` (`"node server/migrate.js && node server/index.js"`)
runs on Railway using whatever `DATABASE_URL` Railway's own environment-variable injection provides
for the staging service — which may or may not be the same value as this local file. **FR-029's
actual execution (checking Railway's injected value, e.g. via `railway variables` or the dashboard,
for the staging service specifically) is an ops-verification task to run during Phase 2/3, not
something resolvable from the repo alone at plan-writing time.** If Railway's injected value also
turns out to be 6543, the fix is a one-line port change in whatever config source Railway reads
(Railway environment variables, not necessarily this local `.env.staging` file, which may be
dev/reference-only). Do not assume the local file's value is what Railway actually injects.

## D10 — Test seams for FR-005/FR-011/FR-012b/FR-015 and the split test gate (US1-3/US-cross-cutting, Blocking issue 2)

**Decision**: `server/index.js` exports no `app` (confirmed: no `export default app`/`module.exports
= app` anywhere in the file), so none of FR-005 (`resolveDeviceUuid`), FR-011 (the `unified.sort()`
comparator), FR-012b (`GET /api/admin/candidates` tiebreaker), or FR-015/FR-023's outcome-vocabulary
normalization can be tested via an HTTP harness against `index.js` directly. `server/anonBlunderAccess.js:2-3`
documents the repo's established answer to exactly this problem: *"server/index.js is not
HTTP-harness-testable (the Express app is not exported), so the branch logic lives here and is
unit-tested; index.js only wires it."* The repo's precedent is extraction into a pure
decision/comparator module, imported by both `index.js` and its own `tests/unit/*.test.js` or
`server/*.test.mjs` file — e.g. `server/coachQueuePagination.js` imported by
`tests/unit/coachQueuePagination.test.js`. `tests/getGames.test.js` is the anti-pattern to avoid: it
re-declares `parseGamesParams` as a *copy* of the handler's logic inside the test file, so it tests
the test's own belief about the handler, not the handler itself (CLAUDE.md: "a green test is not
evidence").

**Fix**: name the extracted modules explicitly rather than leaving Phase 2 to invent test structure
ad hoc:
- `server/deviceIdentity.js` — `resolveDeviceUuid(req, res, bodyValue)` (D1 above), both branches
  (identifier supplied vs. absent) unit-tested directly, imported by `index.js` at both FR-001/FR-002
  fix sites (FR-005).
- `server/gamesSort.js` — the three `unified.sort()` comparators plus the `id` tiebreaker (D2 above),
  unit-tested by seeding rows with tied primary-sort values and asserting stable page-boundary
  behavior, imported by `index.js`'s `GET /api/games` handler (FR-011).
- A pure outcome-vocabulary map (`'correct'->'correct_first'`, `'wrong'->'incorrect'`,
  `'tied'->'tied'`) extracted alongside the FR-015 writer change, unit-tested directly (FR-023's
  server-writer-normalization test).
- `GET /api/admin/candidates`'s tiebreaker (D3 above) is plain SQL `.order()` — no extraction needed
  beyond a `tests/unit/*.test.js` (or integration-style) test that seeds rows with a shared
  `created_at` and confirms no skip/duplicate across a simulated page boundary (FR-012b); this one
  does not need the pure-module treatment since there's no comparator logic to isolate, only a query
  shape to assert against a seeded fixture.

**Client-test seam is different — do NOT apply the extraction pattern there.** FR-023 also mandates
tests for the four `ChallengeScreen.jsx` outcome sites; the point of those tests is to verify the
*component* writes the right `outcome:` value at each site, so a pure-helper extraction would test
the wrong thing (an extracted helper's correctness, not the component's actual write). These stay as
React component tests under `tests/dom/*.dom.test.jsx`, run by the separate `test:dom` npm script.

**Constitution Check §III and Technical Context (plan.md) amended** to name these seams explicitly
and to correct the testing-vehicle claim from "the existing `npm run test:fast` node-test suite is
the correct vehicle — no new integration-test category needed" (true for the server-side work, but
incomplete — FR-023's client tests need `test:dom`, a second, non-chained script) to naming both
scripts and both classes of test.

## D8 — Migration numbering

**Decision**: Next two available migration files are `062_candidates_generation_run_unique.sql`
(FR-012) and `063_puzzle_attempts_outcome_narrow.sql` (FR-016/FR-017) — `connect-four/server/migrations/`
currently ends at `061_correct_cols.sql`. FR-023a requires 063 (the outcome-narrowing migration) to
land and be **applied** before the writers in FR-015/FR-018/FR-019 start emitting `'incorrect'` — a
task-sequencing constraint carried into Phase 2 tasks.md, not resolved by numbering alone.
