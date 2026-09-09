---
name: project_deploy_execution_traps
description: "Traps when EXECUTING a deploy (not writing one): the auto-migration runner defeats every 'after the code deploy' ordering, ADD COLUMN never populates, confirm-prompts exit 0 without writing, and deployment_steps.md commands were never run by their authors"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-04T15:56:08.040Z
  originSessionId: 89067d69-d03f-40cf-89e0-ff63b4fcf3ed
---

Read before **running** a deploy against staging or production. Procedure lives in
`docs/deploy-runbook.md` (§1a two-deploy pattern, §1b ADD COLUMN, §1c non-interactive scripts, §2
smoke-test table) and the per-change queue in `docs/deployment_steps.md`. These are the traps that
made the 2026-08-04 staging deploy go sideways — all measured, none theoretical.

**1. `docs/deployment_steps.md` entries were written by sessions that never ran them.** Treat every
command as a draft. Of 9 PENDING entries, real defects found: two `psql "$STAGING_DATABASE_URL"`
commands whose variable **is defined nowhere** (expands to `psql ""` → silently hits the *local*
database instead of erroring); a pre-flight query that errors in the pre-deploy state it is meant to
run in; a verify block checking `template_version` inside `deep_reveal_json` when it is a **top-level
column** (returns null, reads as failure on a correct row); a success condition missing one of the
three migrations its own table lists as unapplied; and two entries prescribing **conflicting
remedies for the same rows** (repair-in-place vs retire-and-refill). **Phase-1 review the queue
before executing it.**

**2. "Migration must run AFTER the code deploy" is unsatisfiable in one deploy.** `railpack.json`'s
start command is `node server/migrate.js && node server/index.js`, so migrations apply at **container
start**, before the new server boots and while the old instance still serves. Hand-running
`migrate.js` doesn't fix it (if the file is on the branch the deploy already applied it; if not you
desync branch from schema). **Split into two deploys** — see runbook §1a. Confirm the premise at
source first: `git show <deployed-sha>:connect-four/server/index.js | /usr/bin/grep -c "<column>"`.
PostgREST **errors** on a selected-but-missing column, so one `.select()` string is enough to
hard-fail those endpoints. Conversely a *narrowing* migration (`063`) IS satisfiable in one deploy —
`migrate.js` finishes before `index.js` starts.

**3. `ADD COLUMN` never populates — and the backfill may not be queued.** `061_correct_cols.sql` added
`puzzles.correct_cols`; nothing backfilled it; the deployed code reads that field **exclusively**. All
122 active staging puzzles served `"correct_cols":null` the moment Deploy A landed — a live break, not
a pre-flight nicety. The fix (`server/scripts/backfill-correct-cols.mjs`) existed but had never been
added to the queue. **Per migration ask: what populates this, and is that step queued?**

**4. The operational scripts abort on closed stdin and still exit 0.** `backfill-correct-cols.mjs`,
`fill-candidate-pools.mjs`, `repair-overcut-highlight-metadata.js` all prompt for a typed `Yes`
(twice for production). Backgrounded/CI → EOF → `Aborted` → **exit 0**, nothing written. Cost a false
"done" on staging; only re-measuring the DB caught it. Use `printf 'Yes\n' | node …` and **judge by
re-measurement, never by exit code** ([[OI-146]]). Same class as `cmd | tail` returning tail's exit
code — which also masked an `npm error` this session.

**5. The `064` pre-flight's "must be 0" gate is unsatisfiable as written** ([[OI-147]]). It counts
**all** `puzzles` (not just `is_active`) and **all** `candidates` (not just `status='pending'`), while
its prescribed remedy only processes active/pending rows. Post-backfill staging: raw puzzles 48,
active 0; candidates 102, pending 0. The gates that matter are `puzzles WHERE is_active AND
correct_cols IS NULL = 0` and `candidates WHERE status='pending' AND …= 0`. Inactive rows are content
the backfill deliberately retired.

**6. `forced_win` needs ~16 invocations of `fill-candidate-pools.mjs`, not one.** It hits the
400-solver-attempt cap almost every run and yields **0–4** boards per invocation (staging:
3→4→5→6→6→10→14→15→15→20). Every other category reached the N=20 floor in one or two runs. The script
warns honestly rather than failing, so a single `--apply` leaves the category short and looks fine.
[[OI-83]]. Use `--category forced_win` in a loop.

**7. Verifying in the browser: onboarding intercepts deep links.** With no onboarding state the
first-run auto-route redirects `/pricing`, `/pricing?_ptxn=…` and `/challenge` to `/` — you measure
the redirect, not the page. Complete/dismiss onboarding first. (That redirect is itself a real defect
for the Paddle payment-method-update email flow: [[OI-144]].) Also: `POST /api/puzzles/:id/check`
takes **`candidateCol`**, not `column`; `resize_page` is dead, use `emulate`.

Related: [[project_migration_ledger_and_pooler]] (filename ledger; 6543 is drift not a blocker),
[[feedback_implemented_vs_deployable]] (the queue is a WORK QUEUE; reset only after all-DONE-in-prod),
[[project_live_envs_have_no_real_users]] (pre-launch disposability — expires at launch),
the merged section below (build-time vs runtime vars, strict `npm ci`),
[[feedback_verify_at_the_source_layer]].


---

## (merged from `project_spec031_staging_production_deploy` — which branch deploys where, the `stagging`-ahead-of-`main` hotfix trap, and Railway/migrate.js deploy architecture)

**Which branch deploys where (verified 2026-08-25 from the Railway service configs):**

| Railway service | env | watches branch | root |
|---|---|---|---|
| `4enlinea-production` | production | **`main`** | `/connect-four` |
| `4enlinea-staging` | staging | **`stagging`** (two g's) | `/connect-four` |

**The trap: `stagging` runs far ahead of `main`** — 133 commits on 2026-08-25. So the two branches are
**not** "staging is main plus a bit":

- A production hotfix must go to **`main`**, not through `stagging` — promoting `stagging` would ship
  every one of those unreleased commits alongside a one-file fix. The runbook's staging→production
  order does not fit a hotfix; say so rather than following it blindly.
- **Always back-merge `main` → `stagging` afterwards**, or the next promotion silently reverts the fix.
- That back-merge conflicts on **`connect-four/package.json`** (the `test`/`test:fast` lists) basically
  every time. Resolve as a **union, keeping the `stagging` side's line** — it carries `eslint . &&` and
  `--experimental-test-module-mocks`, which `main`'s does not — then append only the genuinely new
  files. **Do not blind-union the file lists:** `main` can still name a test that `stagging`
  deliberately deleted (2026-08-25: `tests/unit/reviewChipQuality.test.js`, removed in `820012d`), and
  resurrecting it puts a missing path in the runner. Diff the two file *sets* and check each
  main-only entry actually exists on disk before carrying it over.

**`gh` is not authenticated in this environment** (`gh auth login` / `GH_TOKEN` unset), so the PR flow
is unavailable to an agent. A fast-forward `git push origin <branch>:main` reaches the same end state —
but it skips review, so confirm that's wanted before using it.

**Deployment architecture gotchas:**

- **Host:** Railway PaaS, one project with `staging` and `production` environments. Express serves `dist/` as static files from the same service (no separate frontend host).
- **DB:** ~~Two separate Supabase projects~~ — **STALE: the staging Supabase project is GONE (NXDOMAIN 2026-08-25).** See [[reference_supabase_connection]]. The remaining project is production.
- **Migration runner:** `connect-four/server/migrate.js`. Uses `pg` driver + `DATABASE_URL` (session-mode pooler, port 5432, `sslmode=require`). Tracks applied files in a `schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)` ledger table self-bootstrapped by the script.
- **Baseline mode:** `node server/migrate.js --baseline` reads all `.sql` filenames from `server/migrations/` dynamically and INSERTs them `ON CONFLICT DO NOTHING` — records what's already applied on production without re-running any SQL. Must run before the first Railway production deploy.
- **nixpacks.toml:** `connect-four/nixpacks.toml`. Build command: `cd ../solver-src && make && npm run build` (`solver-src/` is at repo root, not inside `connect-four/`). Start command: `node server/migrate.js && node server/index.js`. Packages: `gcc`, `gnumake`.
- **`pg` must be in `dependencies`** (not `devDependencies`) — Railway's production build prunes devDeps.
- **The deploy install step is a STRICT `npm ci` that railpack auto-injects — it is NOT written in `railpack.json`** (railpack.json only lists `build` commands + `deploy.startCommand`, so an agent reading it won't see the install). `npm ci` (npm 7+) enforces peer-dependency resolution, so a **peer conflict that local `npm i --legacy-peer-deps` silently masks will fail the deploy build** with `ERESOLVE` → `Build Failed: process "npm ci" did not complete`. Keep the dependency tree **peer-clean**; fix mismatches at the source (align versions) rather than adding `--legacy-peer-deps`/`.npmrc` (a suppression that leaves the deploy fragile and can hide the next real conflict). Reproduce locally non-destructively with `npm ci --dry-run` (does the full peer resolution without touching `node_modules`, so it's safe while the dev server runs). Real 2026-07-14 failure: `global-jsdom@^29` peer-wanting `jsdom@29` vs the pinned `jsdom@^27` (OI-16) — fixed by aligning `global-jsdom` to `^27`. See [[project_repo_worktree_setup]] 2b.
- **VITE_\* vars** are build-time (must be in Railway before first build); `FRONTEND_URL` is runtime (set after domain assigned, triggers restart not rebuild).
- **Staging env vars:** Stripe, OpenAI, Anthropic, Sentry keys are optional on staging (app degrades to 503); 7 core vars required on both environments.
- **Puzzle data:** `pg_dump --data-only --table=puzzles` from production → import into staging as a one-time manual op. Requires Postgres 15 client locally (version must match Supabase server version).
- **Auth redirect:** Each Supabase project needs its own magic-link redirect URL allowlisted in Auth → URL Configuration → Redirect URLs (see `project_magic_link_auth_race.md`).

**Pre-existing test failure (unrelated to this deploy work):** `classifier.test.js` — `forbidden_columns board-based: col5 gives opponent gravity-top win` — was failing before this spec; do not treat as a regression.


---

## (merged from `bug_railway_trust_proxy` — express-rate-limit throws ValidationError on Railway unless trust proxy is set)

Railway injects `X-Forwarded-For` on every request. `express-rate-limit` detects this and throws a `ValidationError` if Express's `trust proxy` is false (the default), causing every rate-limited endpoint to return 500.

**Why:** Discovered 2026-06-13 from Railway access logs showing 500 on `/api/user/migrate`.

**How to apply:** `app.set('trust proxy', 1)` must appear right after `const app = express()` in `index.js`. Already fixed. If deploying to a new Railway service, verify this line is present before any other middleware.


---

## (merged from `project_railway_solver_clock_skew` — Railway builds fail when .depend file timestamp is ahead of builder clock; make skips linking silently, binary absent → all solver queries timeout)

## Trap

Railway's builder clock can be skewed relative to `.depend` file timestamps. When `.depend` is
in the future, `make` prints "Clock skew detected. Your build may be incomplete." and silently
skips the linking step — no `c4solver` binary is produced, but the build exits 0. Result: every
solver query times out at 30 s with `[solver.query] TIMEOUT`.

## Required build command in `railpack.json`

```json
"cd solver-src && make -B SERVER_DIR=../server && test -f ../server/c4solver"
```
- `-B`: unconditionally rebuild, ignoring timestamps
- `test -f ../server/c4solver`: fails the build immediately if the binary is absent

## Guard to add in `c4solver-wrapper.js`

```js
if (!existsSync(BINARY_PATH)) throw new Error('Solver binary not found: ' + BINARY_PATH);
process.on('error', (err) => { /* reject all queued entries */ });
```
Without this, a missing binary produces a silent dead process and 30 s timeouts on every query.

## Verification

Before deploying: check Railway build logs for `make -B` output showing the link step completed.
After deploying: `ls -la server/c4solver` in the container should show a recent binary.
