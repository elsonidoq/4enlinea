# Deployment steps

Actions that must happen **around** a deploy, not inside it — schema migrations, data migrations,
secrets, one-off backfills, cache invalidations, and content-pool repairs.

Shipping code is not the whole of shipping a change. A detector that changes which cells it reports
also changes the meaning of every row already stored under the old behavior; a new env var is
invisible until it exists in Railway. Those steps live here so they are not rediscovered at deploy
time or, worse, after.

## How to use this file

- **Each entry is a runbook**: what it is, when it must run relative to the code deploy, the exact
  command, how to verify, and how to roll back.
- **Entries are dated, and stay until they are DONE everywhere.** While a step is outstanding in any
  environment, mark it `DONE <date>` for the environments that received it rather than deleting it —
  that per-environment history is what tells the next person whether staging or production ever got
  it. Deleting happens only at the reset below.
- **Ordering matters.** Each entry states whether it runs *before* the code deploy (expand-then-
  migrate), *after* it, or *either*. When in doubt, prefer a step that is safe to run before and
  idempotent afterwards.
- Related: `docs/open_issues.md` (deferred defects), `docs/deploy-runbook.md` (the standing deploy
  procedure this file does *not* restate), `docs/architecture/db-schema.md` (schema of record),
  `connect-four/server/migrations/` (DDL, applied by `migrate.js`).

## Lifecycle — this file is a work queue, not an archive

This file exists to be **consumed by an agent driving a deploy**. It accumulates entries while a
branch is being built, is worked through at deploy time, and is reset once production has received
everything in it. Three roles read or write it, and they must not be confused:

1. **Producers** — `/coordinate-implementation` (Step 8) and `/finish-session` **append** entries for
   prerequisites the work just created. They never run a step against staging or production and never
   delete an entry.
2. **The deploy agent** — reads this file top to bottom as the queue for a staging or production
   deploy: run each PENDING entry whose `Applies to` includes the target environment, in the order its
   `When` field dictates relative to the code deploy, verify with the entry's own verification command
   and success condition, and mark it `DONE <date> (<env>)`.
3. **The reset** — once **every** entry in this file is `DONE` in **production**, replace the whole
   per-change section (everything below the standing checklist, above "Template for new entries")
   with nothing. The file returns to: this header, the standing checklist, and the template. The
   history is not lost — it is in git, and any step whose outcome must stay discoverable should
   already have a `staging_checks.md` sign-off or an `OI-N`.

**The reset is a production-deploy action, not a cleanup chore.** Never reset because entries look
old, because they were done in staging, or to tidy the file. An entry that is DONE in staging and
PENDING in production is still live work. Equally: a non-empty file means *the branch is not fully
shipped* — read it before claiming a change is deployed.

**Never write to staging or production from a producer role.** Measuring is read-only and fine;
mutating live data is the owner's call.

## Standing checklist for any deploy

1. **Schema migrations** — anything new in `connect-four/server/migrations/`? Applied to staging and
   production? Note the staging pooler trap: `.env.staging` uses the **transaction pooler (6543)**,
   which cannot run DDL. Swap to port 5432 for `migrate.js`.
2. **Data migrations / backfills** — did any code change alter the meaning of already-stored rows?
   (New enum value, changed detector output, renamed tag, new required column.)
3. **Secrets / env vars** — any new key read by server code? It must exist in Railway for both
   environments before the code that reads it goes live.
4. **Content pools** — did a puzzle/candidate predicate change? Existing rows were generated under
   the old predicate; see the overcut entry below for the shape of that problem.
5. **Caches** — `explanation_cache` and any TTS/audio artifacts keyed by text or i18n key can serve
   stale content across a copy change.
6. **Verify after**, not just before: re-run the entry's verification command against the deployed
   environment.

---

## Spec 052 (Epic 2) — overcut pool repair

**Status**: PENDING — not yet run in any environment (added 2026-07-30)
**When**: **After** the spec-052 code deploy, per environment. The repair re-derives metadata using
the new detector, so the new code must already be present. The rows are wrong either way; running it
before the deploy would write values the old code disagrees with.
**Blocks**: shipping spec 052 to staging or production. Tracked as **OI-92**.
**Applies to**: staging, production. Local needs it only if the local pool predates the change.

### What's wrong

Spec 052 US1 split `detectOvercut` into role-named functions, and US2 added two new match branches
(`minor_threat`, `active_forcing`). Rows generated by the old, narrower detector are stale two ways:

- **Stale metadata** — the detector now matches an earlier column via a new mechanism, so stored
  `highlight_metadata` names a different cell pair than the current code derives. This is
  player-facing: `evalOvercut` grades against the **stored** metadata (overcut rows carry
  `correct_col: null`), so a player who plays the newly-valid column is **marked wrong**.
- **Ambiguous** — the widened detector finds two valid overcut columns, tripping
  `checkOvercutPredicate`'s singleton guard. These boards were always ambiguous; the old detector
  could not see the second column. They violate the unique-answer rule and must be retired, not
  rewritten.

Measured 2026-07-30 against the final code:

| Env | identical | stale | ambiguous | no longer matches |
|---|---|---|---|---|
| local | 21 of 30 legacy rows | 8 | 1 | 0 |
| staging | 12 | 4 | 4 | 0 |
| production | 12 | 8 | 2 | 0 |

Freshly generated rows are unaffected: a local run of 40 new candidates produced **40/40 identical,
0 ambiguous**. The drift is confined to pools built by the old detector.

### Run it

```bash
cd connect-four

# 1. Dry run first — always. Reports, writes nothing. Exit 2 means drift was found.
node server/scripts/repair-overcut-highlight-metadata.js --env staging

# 2. Repair stale metadata only (leaves ambiguous rows alone).
node server/scripts/repair-overcut-highlight-metadata.js --env staging --apply

# 3. Also retire ambiguous rows — puzzles.is_active=false, candidates.status='rejected'.
#    This is a PRODUCT decision: it removes content. Confirm before running.
node server/scripts/repair-overcut-highlight-metadata.js --env staging --apply --retire

# 4. Production requires an explicit acknowledgement flag in addition to --apply.
node server/scripts/repair-overcut-highlight-metadata.js \
  --env production --apply --retire --i-understand-this-is-production
```

The script prompts for a typed `Yes` before any write, and twice for production. `--env` is
required and has no default; it cross-checks that the env file's project ref actually matches the
environment you named, so a copied or edited `.env` cannot silently redirect the run.

### Verify

Re-run the dry run. **Exit code 0 and "Pool is in sync with the current detector"** is the success
condition:

```bash
node server/scripts/repair-overcut-highlight-metadata.js --env staging; echo "exit: $?"
```

Exit codes: `0` = clean, `1` = error, `2` = drift found. The `2` makes it usable as a CI/deploy gate.

### Roll back

The script overwrites `highlight_metadata` in place with no snapshot. If you need reversibility,
dump the affected rows first:

```bash
# adjust --env; writes a JSON backup you can restore from
psql "$DATABASE_URL" -c "\copy (SELECT id, highlight_metadata FROM puzzles WHERE category='overcut') TO 'overcut-puzzles-backup.csv' CSV HEADER"
```

Retirement is reversible by hand (`is_active=true` / `status='approved'`), but the row will fail the
predicate again — retiring is the correct end state for those boards.

### Open question for the owner

The ambiguous rows can instead be kept by allowing `overcut` to accept **multiple** correct columns.
That is a product decision about the category's answer model, not a code fix, and it would also
require changing `checkOvercutPredicate`'s singleton guard. Retiring 6 legacy rows is the smaller
change, and freshly generated content shows a 0% ambiguity rate, so retirement is the recommended
default.

---

## Spec 053 (Epic 3) — Entitlement & Payments Consolidation

**Status**: PENDING — one **Paddle dashboard config check** (owner action, see below). No migration,
backfill, secret, or cache step; both manual verifications completed and passed.
**When**: n/a for data (nothing to migrate). The **Paddle dashboard config check runs before or with
the code deploy** — see below. Both manual verifications (CSP, Paddle domain re-review) are already
done.
**Blocks**: nothing in the database. The **Default payment link** setting is the one item with real
consequences: if it points at a page without Paddle.js, every transaction checkout link and every
payment-method-update email Paddle sends lands on a page that cannot open a checkout.
**Applies to**: local (verification), production (the `/pricing` route swap + the Paddle dashboard
settings)

### What this sets up

This epic ships **no schema migration, no data backfill, no new env var, and no cache invalidation.**
That conclusion was reached by walking the checklist against the final accumulated diff, not by
assuming — what was actually checked:

- **Schema migration** — none. `git status connect-four/server/migrations/` is clean; the newest file
  is still `061_correct_cols.sql` from a prior spec. The new `upgrade_completed` dedupe reuses
  `payment_events`' existing `UNIQUE(event_id)` constraint with a synthetic, namespaced key
  (`upgrade_completed_track:<transactionId>`), so it needs no DDL.
- **Data migration / backfill** — none required. No enum, tag, detector output, or column meaning
  changed. Entitlement is *derived* from the existing `users.tier` at request time; no stored row
  changes meaning. One knowingly-accepted gap: payments that activated via the `verify-transaction`
  fallback **before** this change are still missing their `upgrade_completed` analytics row.
  Backfilling them is explicitly out of scope per spec 053's Out of Scope section. This is
  analytics-only — no user-facing effect, and no account's paid status is wrong because of it.
- **Content pools** — unaffected. No predicate or detector changed, so no `puzzles` / `candidates`
  row was derived under superseded code. This epic touches entitlement and pricing only.
- **Secrets / env vars** — none new. The only env read across every changed and new file is the
  pre-existing `import.meta.env.VITE_API_BASE_URL` (verified by grepping the diff and each new module;
  the new server modules read no env at all).
- **Caches** — unaffected. `explanation_cache` is untouched. No `coach.spoken.*` or `eval.*` i18n key
  was added, so no TTS/audio artifact needs regenerating (the new keys are all under the `pricing.*`
  namespace, which is rendered, never synthesized — verified by grepping the i18n diff, 0 hits).
  The service worker (`connect-four/public/sw.js`) is **network-first for navigations** and
  cache-first only for hash-immutable `/assets/`, so a returning visitor cannot be served a stale
  bundle lacking the new `/pricing` route.

### Ordering — the one real constraint

The server-side change (removing the static `/pricing` registration, adding `/pricing-legal`) and the
client-side change (the `PricingScreen` route in `URL_MAP` / `screenRegistry`) **must ship in the same
deploy**. Between them, `/pricing` falls through to the SPA catch-all and renders a bare shell — it
serves neither the old static legal page nor the new pricing page. Both halves are in this one change,
so a normal single deploy is safe; the hazard exists only if someone cherry-picks the server commits.

Note for anyone holding an external link: `/pricing` no longer serves the static legal page. Its
content lives at `/pricing-legal`, unchanged and byte-identical, linked from `/terms`, `/privacy`,
`/refunds`, and the app footer.

### Paddle dashboard config — check before or with the deploy (owner action)

`/pricing` no longer serves the legal/compliance copy; that content now lives at `/pricing-legal`.
Anywhere Paddle holds a URL for this site, the correct target differs by setting — and getting these
two backwards would break checkout, so they are listed explicitly:

| Paddle setting | Point it at | Why |
|---|---|---|
| **Checkout → Checkout settings → Default payment link** | `https://<domain>/pricing` (the React page) — **never `/pricing-legal`** | Paddle appends `?_ptxn=<txn>` and requires the page to *include Paddle.js* so it can auto-open a checkout. `/pricing-legal` is deliberately static and JS-free (OI-41) and can never satisfy this. |
| Any **legal / compliance / pricing-policy URL** recorded for website approval or support | `https://<domain>/pricing-legal` | This is where the merchant-of-record clause, 14-day refund statement, and terms link now live. |

Note this does **not** require a domain re-submission (T047 — Paddle documents no content-change
trigger for re-review). It is a settings check, not a re-approval.

**Known gap, not fixed by this epic (OI-98)**: even pointed at `/pricing`, the `?_ptxn=` auto-open
does not work — `useUpgradeCheckout` never initializes Paddle.js on mount, and nothing reads `_ptxn`.
This is **pre-existing**: the old static `/pricing` contained no Paddle.js at all, so the flow was
already broken before this change. Spec 053 does not make it worse. Track under OI-98.

### Run it

Nothing to run. No script, no SQL, no backfill.

### Verify

**0. Paddle dashboard config (the one outstanding item).** In **Paddle > Checkout > Checkout
settings**, read the **Default payment link** and confirm it points at a page that includes Paddle.js
— `https://<domain>/pricing`, not `/pricing-legal`. Then confirm any legal/compliance URL recorded for
website approval points at `https://<domain>/pricing-legal`.

**Success condition**: Default payment link resolves to the React `/pricing` route (loads the SPA, not
the static legal page), and the compliance URL renders the merchant-of-record clause. Quick check
without the dashboard:

```bash
curl -s https://<domain>/pricing-legal | grep -c "Merchant of Record"   # expect 1
curl -s https://<domain>/pricing | grep -c "assets/index-"              # expect 1 (SPA shell)
```

**The two verifications below are already DONE** (2026-08-01 — see `staging_checks.md` §Epic 3, and
OI-96/OI-97). They are retained as reproduction recipes:

```bash
# 1. CSP against the PRODUCTION build (FR-027/SC-008) — never `npm run dev`, which sends no CSP header.
eval "$(./worktree-ports.sh)"          # from the repo root, always — this is a worktree
cd connect-four && npm run build
node server/index.js                    # serves the built dist/ on $API_PORT
# then, in a real browser with DevTools open: load /pricing, click the checkout CTA.
```
**Success condition**: zero `Refused to …` lines in the console, for both the page load and the
checkout overlay. **Result 2026-08-01: PASS.** The overlay opened (`cdn.paddle.com/paddle/v2/paddle.js`
304; `sandbox-buy.paddle.com` iframe rendered) with zero violations from our policy. Two gotchas worth
knowing on a re-run: (a) the Express server resolves `dist/index.html` **at boot**, so restart it after
any rebuild or it serves stale asset hashes that 404 into the SPA catch-all; (b) a live transaction is
not exercisable locally — `VITE_PADDLE_CLIENT_TOKEN` is unset, so Paddle shows its own in-iframe
"Something went wrong" *after* all CSP-governed loads succeed. That boundary is exactly what the CSP
check needs, so it does not weaken the result.

```bash
# 2. Confirm no Paddle domain re-submission is needed for the /pricing content change (T047).
# Requires authenticating the `paddle-docs` MCP server interactively.
```
**Success condition**: a recorded answer either way in `staging_checks.md`. **Result 2026-08-01: no
re-submission required.** Paddle documents no content-change trigger for re-review — a domain is
approved once and stays approved, and `resubmit` applies only to a domain in `action_required` after a
soft decline. A client-rendered pricing page is Paddle's own recommended pattern. **Not a pre-deploy
step.**

Already verified by `curl` against the built `dist/` on the real Express server: `/pricing` returns
200, `/pricing-legal` returns the byte-identical legal page, `GET /api/paddle/config` and
`GET /api/limits` return the live values the page renders, and the CSP header already carries every
Paddle origin the overlay needs (`cdn.paddle.com`, `*.paddle.com`, `pay.google.com`,
`www.google.com`). **This epic added no new origin or directive** — which is why the residual CSP risk
is low, though not zero.

### Roll back

Reverting the code fully reverts the behavior — there is no migrated data to restore. The only
externally visible change is the `/pricing` ↔ `/pricing-legal` split; a revert restores the old static
page at `/pricing` and removes `/pricing-legal`.

**If you rolled back after changing the Paddle settings**, revert the compliance URL to
`https://<domain>/pricing` — `/pricing-legal` stops existing on the old code, so leaving it pointed
there would give Paddle a 404 on the page they check. The Default payment link needs no change on
rollback: it should point at `/pricing` either way (note that on the old code that page had no
Paddle.js at all — see OI-98).

---

## Spec 054 (Epic 4) — Server/API data integrity & environment correctness

**Status**: PENDING (nothing has been applied beyond local)
**When**: migrations run BEFORE the code deploy — one of them is a hard ordering constraint, see below
**Blocks**: every wrong-answer puzzle write; the candidate-insert retry fix
**Applies to**: staging and production (local is already fully applied)

All counts below were measured on **2026-08-02** against the real environments (read-only), not
reasoned about. Re-measure before running — a count taken mid-epic is stale by deploy time.

### 0. CAUTION (not a blocker) — staging's `DATABASE_URL` is on the transaction pooler (port 6543)

Measured 2026-08-02: staging's `DATABASE_URL` (both the Railway-injected value and local
`server/.env.staging`) is on port **6543**, the transaction-mode pooler. Production is on **5432**.
`docs/architecture/server-conventions.md:1440` declares 6543 **forbidden** for `migrate.js`.

**But the evidence says it works.** Staging's `schema_migrations` ledger shows migrations applying
successfully through that 6543 connection five times, most recently `061_security_lints.sql` on
**2026-07-30**:

```
2026-07-30  061_security_lints.sql
2026-07-18  060_paddle_rename_and_payment_events.sql
2026-07-15  059_explanation_cache_locale.sql
2026-07-14  058_blunders_device_uuid.sql
2026-07-14  057_users_onboarding_status.sql
```

So treat this as **convention drift to fix on its own schedule, not a gate on this deploy.** The
doc's stated rationale — "each statement may execute on a different backend connection" — describes
pgbouncer *statement* mode; in *transaction* mode a server connection is pinned for the duration of
an explicit `BEGIN…COMMIT`, which is exactly what `migrate.js` issues (`server/migrate.js:82-92`).
That is consistent with the ledger above. The genuine transaction-mode limitations (prepared
statements, session state, `pg_dump`) are not exercised by this runner.

Nothing in 062/063 is session-dependent — `CREATE UNIQUE INDEX`, `UPDATE`, `ALTER TABLE … ADD
CONSTRAINT … NOT VALID`, `VALIDATE CONSTRAINT`.

**Residual risk if it does fail**: Railway's start command is
`node server/migrate.js && node server/index.js`, and `migrate.js` calls `process.exit(1)` on a
failed migration (`server/migrate.js:96`) — so a failure short-circuits the `&&` and staging's
server never boots. Watch the deploy log rather than assuming success. Tracked as **OI-31**.

### 1. Migrations 062 and 063 (plus the unapplied 061)

Measured `schema_migrations` state:

| Env | 061_correct_cols | 062 | 063 |
|---|---|---|---|
| local | applied | applied | applied |
| staging | **NOT applied** | **NOT applied** | **NOT applied** |
| production | **NOT applied** | **NOT applied** | **NOT applied** |

Note a pre-existing numbering collision: staging and production both have a `061_security_lints.sql`
recorded in `schema_migrations`, but that file **is not on disk** — the on-disk 061 is
`061_correct_cols.sql`. Two different migrations share the number 061. `migrate.js` tracks by
filename, so `061_correct_cols.sql` will run on staging/production as part of this deploy even
though "061" already appears applied. Confirm that is intended before deploying; it is not this
epic's change.

**Ordering (FR-023a — a deployment constraint, not just a code one):** migration **063 must be
applied before the code deploy**. The new code emits `outcome: 'incorrect'`, which the *current*
five-value CHECK constraint rejects — and the rejected insert is swallowed by a fire-and-forget
`.catch`, so the failure is invisible. Deploying code first means silently losing every wrong-answer
attempt until the migration lands.

**What 063 changes in already-stored data** (measured):
- production: **2 rows**, both `outcome='correct_retry'` → remapped to `'correct_first'`
- staging: 0 rows
- local: 0 rows

**What 062 changes** (measured): its dedupe `DELETE` matches **0 rows** in all three environments
(0 duplicate `(generation_run_id, move_string)` groups everywhere), so it is a proven no-op; the
`CREATE UNIQUE INDEX` is the only real effect.

### Run it

```bash
# Staging — ONLY after step 0 is fixed.
cd connect-four
node --env-file=server/.env.staging server/migrate.js

# Production.
node --env-file=server/.env.production server/migrate.js
```

### Verify

```sql
-- 1. Both migrations recorded:
SELECT filename FROM schema_migrations WHERE filename LIKE '06%' ORDER BY filename;
--    success: includes 062_candidates_generation_run_unique.sql AND
--             063_puzzle_attempts_outcome_narrow.sql

-- 2. The narrowed constraint is live (name confirmed as puzzle_attempts_outcome_check
--    on BOTH staging and production on 2026-08-02):
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.puzzle_attempts'::regclass AND conname='puzzle_attempts_outcome_check';
--    success: CHECK (outcome = ANY (ARRAY['correct_first','tied','incorrect','abandoned']))

-- 3. Zero rows violate it:
SELECT count(*) FROM puzzle_attempts
 WHERE outcome NOT IN ('correct_first','tied','incorrect','abandoned');
--    success: 0

-- 4. The unique index exists:
SELECT indexname FROM pg_indexes WHERE indexname='idx_candidates_run_move_unique';
--    success: one row
```

### Roll back

- **062** — reversible: `DROP INDEX IF EXISTS idx_candidates_run_move_unique;`. Its dedupe DELETE is
  **not** reversible in general, but measured to affect 0 rows, so there is nothing to restore.
- **063** — the constraint swap is reversible (re-add the old five-value CHECK). The `UPDATE` remap
  is **not reversible**: production's 2 `'correct_retry'` rows become `'correct_first'` and the
  original label is gone. No information is actually lost — the first-vs-retry signal lives in the
  separate `first_attempt_correct` boolean — but back up `puzzle_attempts` first if you want the
  literal old values recoverable.

### 2. Behavior change to expect after deploy — `requireAdmin` starts working in production

`server/adminAuth.js` gates on `emails.includes(req.user.email)`. `req.user.email` was **always
`undefined`** in production before this epic, so that check failed closed for everyone, including
real admins — admin routes were effectively unreachable there. Threading `email` into `req.user`
(FR-006) repairs that. It failed *safe*, so this is not a leak being closed, but admin routes do
become reachable for listed emails on this deploy. Confirm `ADMIN_EMAILS` holds the intended list
before deploying. **Reasoned from the code, not exercised against production.**

### 3. Not required

- **Secrets / env vars**: none added by this epic.
- **Caches**: `explanation_cache` and TTS artifacts are untouched — no invalidation needed.
- **Content pools**: no predicate or detector that `puzzles`/`candidates` rows were generated under
  changed, and 062 deletes 0 rows, so no pool repair is needed.

---

## Spec 055 (Epic 8) — Dev infrastructure & test-quality baseline

**Status**: NONE REQUIRED — this change ships with the code alone
**When**: n/a
**Blocks**: nothing
**Applies to**: n/a

This entry exists because "no prerequisite" is a finding that has to be *reached by checking*, not by
not looking. Each category below was walked against the **final** accumulated branch diff
(`1ce54e7..HEAD`, 70 files) on **2026-08-02**, after all seven implementation batches had landed — not
mid-epic, when an earlier measurement could still have been invalidated by a later batch.

| Category | Checked how | Result |
|---|---|---|
| Schema migration | `git diff --name-only` filtered for `migration` | **None** — no file added to `server/migrations/` |
| Data migration / backfill | Reviewed every changed signature and predicate for an output change | **None** — see below |
| Content pools (`puzzles`/`candidates`) | Checked whether any detector/predicate *output* changed | **None** — see below |
| Secrets / env vars | `git diff` grepped for added `process.env.X` reads | **None** — no new env var |
| Caches (`explanation_cache`, TTS) | Checked whether any cached-content producer changed its output | **None** — see below |
| Ordering | n/a — nothing to sequence | n/a |

### Why no backfill, despite ~150 deletions across `src/`, `server/`, and `tests/`

The epic deleted roughly 150 unused bindings to get `npm run lint` to exit 0. Every one was the
removal of a binding **nothing read** — a non-behavior-changing deletion, never a refactor. Five
function signatures lost a parameter (`checkP2`, `checkFigure7Predicate`, `checkJShapePredicate`,
`zoneToOverlays`, `matchPattern`, `pickGameEndScreen`); in every case the removed parameter was
**trailing** and was **already unused inside the function body**, which is why `no-unused-vars`
reported it. Verified additionally that no code introspects function arity (`fn.length`), so no
caller's behavior changes by passing an argument that is now ignored.

Because no detector, predicate, or producer changed what it *outputs*, no row written under the old
behavior means anything different under the new one. That is the condition that would have forced a
backfill or a content-pool repair, and it is not met.

### The one carve-out worth knowing about

`server/explainContext.js`'s `buildExplainContext(movestring, col, rounds, solver, deps)` keeps its
unused `rounds` parameter behind a scoped `eslint-disable-next-line no-unused-vars` with a stated
reason: it is **non-trailing**, and all 12 call sites pass positionally, so removing it would be a
call-site refactor rather than the non-behavior-changing deletion the epic's triage policy allows.
No behavior change, nothing to deploy — recorded here only so a future reader does not mistake the
disable comment for a suppressed defect.

### CSP (OI-58) — verified, nothing to do

US3 verified the CSP fixes are live rather than merely present in `main`'s source. Measured
2026-08-02, read-only: a real `npm run build` served by the Express server returns the full expected
`Content-Security-Policy` header, and `curl -sS -D - https://decodec4.xyz/` returns `HTTP/2 200` with
an **identical** header, directive for directive, differing only in `media-src` pointing at the real
Supabase host instead of `127.0.0.1:54321`. So there is nothing to port, redeploy, or backfill for
OI-58. Nothing was written to staging or production.

### Deploy-time behavior changes that are *not* prerequisites

- **`test:fast` now runs `eslint . &&` first.** Railway's build runs `npm run build` (per
  `connect-four/railpack.json`), **not** `test:fast`, so the lint gate cannot fail a deploy. Verified
  by reading `railpack.json`.
- **`.githooks/pre-commit` now runs `npx eslint . --quiet`.** Developer-machine only. It needs no
  action: `core.hooksPath` is already set by `package.json`'s existing `prepare` script, which runs on
  `npm install` and also installs eslint. No dependency was added or changed, so the strict `npm ci`
  in the Railway build is unaffected.

## Spec 056 — Legacy `correct_col` scalar retirement (Epic 9)

**Status**: PENDING (applied to local only)
**When**: **AFTER the code deploy** — this is a hard ordering constraint (see below), not a
preference. Running it first takes production down.
**Blocks**: nothing — but it is blocked BY the code deploy, and the code deploy is itself blocked by
the pre-flight check below
**Applies to**: staging and production (local is already fully applied)

### What's wrong (or: what this sets up)

Migration `connect-four/server/migrations/064_drop_correct_col.sql` drops the legacy scalar column
`correct_col` from both `public.puzzles` and `public.candidates`. `correct_cols integer[]` (migration
061) has been the sole storage contract read by server code since User Story 2 of this spec landed —
every sync-writer stopped writing `correct_col` and every reader was migrated to read `correct_cols`
exclusively (verified locally: zero remaining references outside the two historical migration files
and this drop migration — see "Verify" below). This closes `docs/open_issues.md` OI-81.

**This is also a breaking HTTP wire rename, not just a schema change.** The singular `correctCol`
request/response field is retired with **no deprecated alias** on `GET /api/puzzles/:id`, `GET
/api/puzzles/draw`, and `POST /api/evaluate-move` (request body and response) — only `correctCols:
number[]` is sent/accepted. **Server and frontend MUST deploy together.** A server-only deploy makes
`POST /api/evaluate-move` stop understanding a still-old frontend's `correctCol` singular field,
silently breaking lesson-sourced inline-challenge grading (the learner's answer always grades
`wrong`, with no error — the same hazard class `ChallengeScreen.jsx`'s T019 change and
`evaluateMoveMultiSolution.test.js`'s T027 update guard against locally). A frontend-only deploy has
the same failure in reverse. Do not split this deploy across two releases.

**Ordering relative to the migration: deploy the code FIRST, then run the migration. Running the
migration first causes a production outage.**

An earlier draft of this entry said the opposite, on the premise that "User Story 2 already shipped
and is running in production". That premise was false and the conclusion drawn from it was
dangerous. The facts, verified 2026-08-03:

- **Nothing from this spec has shipped anywhere.** The whole feature — User Stories 1, 2 and 3 —
  lives on the unmerged branch `worktree-epic-9-correct-col-retirement` (not present on any remote;
  114 commits ahead of `origin/main`). Staging and production are running **pre-056** code.
- **Pre-056 code reads `correct_col` explicitly.** `git show <pre-056-commit>:connect-four/server/index.js
  | /usr/bin/grep -c "correct_col"` → **21** occurrences, including PostgREST `.select(...)` strings
  such as `.select('id, category, move_string, …, highlight_metadata, correct_col, user_player, …')`.
  PostgREST **errors** on a selected column that does not exist — it does not silently omit it. So
  dropping the column while that code is live turns those endpoints (puzzle detail, `/api/puzzles/draw`,
  the admin puzzle lists) into hard failures.

The safe order therefore is:

1. **Pre-flight check** (below) against the target environment — gates everything else.
2. **Deploy the code** (server + frontend **together** — see the wire-rename warning above). The new
   code never reads `correct_col`, and the column still being present is harmless to it.
3. **Run the migration** to drop the now-unread column.

Note the consequence for rollback: once step 3 has run, **reverting the code deploy is no longer
safe** — the old code would again `SELECT` a column that no longer exists. If you need a revert
window, leave a gap between steps 2 and 3 and confirm the new code is healthy first.

### Pre-flight (REQUIRED — run per environment, immediately before that environment's migration)

**This was NOT measured for staging or production during implementation.** Local was measured
(2026-08-03: 322 active `puzzles`, of which **1** had `correct_cols IS NULL` — a stray `forced_win`
row created after the last backfill run; 179 pending `candidates`, 0 NULL). Staging and production
were **not reachable from the implementing session** and their counts are **unknown** — do not assume
they match local, and do not assume they are zero.

This matters because `DROP COLUMN` is irreversible: any row where `correct_cols` is NULL but
`correct_col` is not is a row whose only answer is about to be discarded.

Run this against the TARGET environment. Both counts must be 0.

```sql
SELECT 'puzzles' AS tbl, count(*) AS at_risk
  FROM public.puzzles     WHERE correct_cols IS NULL AND correct_col IS NOT NULL
UNION ALL
SELECT 'candidates', count(*)
  FROM public.candidates  WHERE correct_cols IS NULL AND correct_col IS NOT NULL;
```

**Success**: `at_risk` = 0 for BOTH rows.
**Non-zero**: STOP. Do not deploy and do not migrate. Run spec 051's backfill
(`connect-four/server/scripts/backfill-correct-cols.mjs`) against that environment, re-run this
query, and proceed only once it returns 0.

How to run it — either the Supabase SQL editor for the target project, or from the repo:

```bash
cd connect-four
# Substitute .env.production for the production run. Prints one line per table.
node --env-file=server/.env.staging -e '
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  (async () => {
    for (const t of ["puzzles", "candidates"]) {
      const { count, error } = await sb.from(t).select("*", { count: "exact", head: true })
        .is("correct_cols", null).not("correct_col", "is", null);
      if (error) { console.log(t, "ERROR:", error.message); process.exitCode = 1; continue; }
      console.log(t, "at_risk =", count);
    }
  })();
'
```

Gotchas that have bitten here before: the env file is at `connect-four/server/.env.*`, **not** the
repo root; the service key variable is `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`); and
the command must run from `connect-four/` so `@supabase/supabase-js` resolves. If the column has
already been dropped in that environment, the query errors with "column correct_col does not exist"
— which is itself proof the migration already ran there.

### Run it

Do the whole sequence for **staging** first, verify it, then repeat for **production**.

**Step 1 — pre-flight** (above). `at_risk` must be 0 for both tables. Do not continue otherwise.

**Step 2 — deploy the code** (server + frontend together, one release — see the wire-rename warning
above). Merge the branch and deploy per the standing procedure in `docs/deploy-runbook.md`; this
entry does not restate it. Confirm the deployed app is healthy before step 3 — this is your last
safe revert point.

**Step 3 — run the migration** (only after step 2 is deployed and healthy):

```bash
cd connect-four

# Staging first.
node --env-file=server/.env.staging server/migrate.js

# Then production — only after staging is verified below.
node --env-file=server/.env.production server/migrate.js
```

### Verify

```bash
# 1. Migration recorded in the ledger for the target environment:
#    (psql "$DATABASE_URL" or the Supabase SQL editor)
SELECT filename FROM schema_migrations WHERE filename = '064_drop_correct_col.sql';
--    success: one row

# 2. The column is actually gone (query the live schema, not just the ledger):
SELECT table_name, column_name FROM information_schema.columns
 WHERE table_name IN ('puzzles','candidates') AND column_name = 'correct_col';
--    success: zero rows, for BOTH puzzles and candidates

# 3. Re-run the same zero-reference grep this spec used locally, against the code actually
#    checked out in the target environment's deploy. Run this BEFORE step 3 of "Run it" —
#    it is what proves the deployed code no longer needs the column:
/usr/bin/grep -rn "correct_col\b" server src scripts tests
--    success: matches in exactly three files — server/migrations/016_correct_col.sql,
--    server/migrations/061_correct_cols.sql (both historical), and
--    server/migrations/064_drop_correct_col.sql (this drop migration). Any other match means a
--    consumer was missed and this migration must NOT be applied to that environment yet.
```

**4. Smoke-test the app after the migration** — the failure this ordering protects against is silent
in logs but obvious in the product. On the deployed environment, open a puzzle and submit a **correct**
answer for an `undercut` or `overcut` puzzle and confirm it grades **correct** (not "wrong"), and play
one lesson with an inline/confirmation challenge and confirm the same. Those are the two paths the
wire rename and the display-suppression check touch; if the deploy was split or the migration ran
early, this is where it shows.

### Roll back

**Not reversible — back up first.** `DROP COLUMN` discards the column's data outright; there is no
`ADD COLUMN IF NOT EXISTS correct_col` that restores the original values, only one that recreates an
empty/NULL column. Before running against staging or production, take a snapshot/backup of the
`puzzles` and `candidates` tables (e.g. `pg_dump` scoped to those two tables, or a Supabase point-in-
time-recovery checkpoint) if you want the ability to restore the pre-drop `correct_col` values. Given
`correct_col` had already been fully superseded by `correct_cols` for the duration of this spec (User
Story 2), the dropped values are redundant with `correct_cols[0]` at drop time for every row that had
been backfilled — but any row's exact pre-drop `correct_col` value (e.g. for an unbackfilled row) is
only recoverable from a backup, not from `correct_cols`.

## Template for new entries

```markdown
## <spec / change name>

**Status**: PENDING | DONE <date, environments>
**When**: before | after | either, relative to the code deploy
**Blocks**: what cannot ship until this runs
**Applies to**: local / staging / production

### What's wrong (or: what this sets up)
### Run it          — exact commands
### Verify          — the command and the success condition
### Roll back       — or an explicit "not reversible; back up first"
```
