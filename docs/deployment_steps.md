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
   production? Note the staging pooler drift: `.env.staging` (and the live Railway-injected value,
   re-confirmed 2026-08-04) uses the **transaction pooler (6543)** while production uses **5432**.
   This is **not** a DDL blocker — `migrate.js` wraps each migration in an explicit `BEGIN…COMMIT`,
   which pins a backend connection under pgBouncer's transaction mode, and staging has empirically
   applied migrations through 6543 (`schema_migrations` ledger, most recently `061_security_lints.sql`).
   Treat 6543 as configuration drift to converge on 5432 on its own schedule, not as a broken deploy —
   see `docs/architecture/server-conventions.md`'s Migration Runner section and OI-31 (closed
   documentation-sync 2026-08-04).
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

**AMENDED 2026-08-04 (spec 057, Epic 10, US3, T041/T048) — the OI-98 gap below is now half-closed.**
`PricingScreen.jsx` now calls `getPaddle()` unconditionally on mount and, when `?_ptxn=` is present,
opens the checkout for that transaction id (`paddle.Checkout.open({ transactionId })`), including the
expired/invalid-id edge case (Paddle.js still initializes; the auto-open just fails gracefully). This
is the **client-code half** of the fix and is agent-shipped, verified locally, and covered by
`tests/dom/PricingScreenPaddleInit.dom.test.jsx`. The **owner-gated half is unchanged and still
pending**: a real Paddle sandbox transaction must confirm the payment-method-update email actually
lands an open checkout end-to-end (no `VITE_PADDLE_CLIENT_TOKEN` locally, so this cannot be exercised
in this environment) — see `staging_checks.md`'s new sign-off item under this heading. **The Default
payment link table row below is unchanged in substance** (`/pricing`, never `/pricing-legal`) but its
rationale is now stronger: `/pricing` actually honors `?_ptxn=` today, so pointing the dashboard
setting there is both the current recommendation and, as of this change, a page that can complete the
flow once the setting is confirmed. Do not read this as a second, separate deploy prerequisite — it
amends the single "Paddle dashboard config" action already queued above; there is nothing new to run.

**Known gap, partially fixed (OI-98)**: pointed at `/pricing`, the `?_ptxn=` auto-open now works on
the client side (see AMENDED note above) — `useUpgradeCheckout`'s `getPaddle` initializes on mount and
the page reads `_ptxn`. What remains open is the owner-only verification that a real Paddle-sent
payment-method-update link, clicked end-to-end, actually opens the checkout in production. This was
**pre-existing** before spec 057: the old static `/pricing` contained no Paddle.js at all, so the flow
was already broken before spec 053. Spec 057 US3 fixes the code gap; the owner verification is the
last mile. Track under OI-98 (now partially-fixed, not open).

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

### 0. NOTE (not a blocker, not forbidden) — staging's `DATABASE_URL` is on the transaction pooler (port 6543)

Measured 2026-08-02, re-confirmed read-only 2026-08-04 (`railway variables --service 4enlinea-staging
--environment staging --kv`): staging's `DATABASE_URL` (both the Railway-injected value and local
`server/.env.staging`) is on port **6543**, the transaction-mode pooler. Production is on **5432**.
`docs/architecture/server-conventions.md:1501-1504` (updated 2026-08-02, per OI-31's documentation-sync
closeout) no longer declares 6543 forbidden — it explicitly names 6543 as "configuration drift to fix
on its own schedule, not a broken deploy." Do not re-derive the old "6543 forbidden" rationale from an
earlier version of that doc or from memory.

**The evidence says it works.** Staging's `schema_migrations` ledger shows migrations applying
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

## Spec 057 — retire-and-refill for stale overcut/undercut/z_threat rows (D1)

**Status**: PENDING — not yet run in any environment (added 2026-08-04)
**When**: **After** the spec 057 code deploy (T005's `evalOvercut`/`evalUndercut`/`evalZThreat`
`correctCols` cross-check must be live first — re-deriving against the current detector requires the
current detector to be deployed). Also depends on `061_correct_cols.sql` — see the ordering note
below.
**Blocks**: nothing new ships broken without it (T005 already makes a correct answer un-blockable by
stale metadata once `correct_cols` is populated on live rows — see the Spec 057 content-pools entry
below for that dependency); it closes out the data half of OI-92 and the new undercut-drift issue
(see `docs/open_issues.md`).
**Applies to**: staging, production.

### What's wrong

Same root cause as the existing "Spec 052 — overcut pool repair" entry above (a widened detector
makes old rows' stored `highlight_metadata` disagree with what the detector would produce today, or
makes some rows stop matching the predicate entirely), now measured for all three metadata-graded
categories (`overcut`, `undercut`, `z_threat`) via T008's read-only audit, re-confirmed by
`fill-candidate-pools.mjs`'s own dry-run (T011, 2026-08-04):

| Env | category | identical | stale | ambiguous | no_longer_matches |
|---|---|---|---|---|---|
| staging | overcut | 12 | 4 | 4 | 0 |
| staging | undercut | 20 | 0 | 0 | 0 |
| staging | z_threat | 20 | 0 | 0 | 0 |
| production | overcut | 12 | 8 | 2 | 0 |
| production | undercut | 56 | 0 | 0 | 4 |
| production | z_threat | 60 | 0 | 0 | 0 |

(Counts are per row across both `puzzles` and `candidates` tables combined, matching the existing
Spec 052 entry's convention.) `undercut`/`z_threat` are clean on staging; production `undercut` has 4
rows (2 `puzzles` + 2 `candidates`, movestrings `13365353214264620046` and `35054462343613031`) that
no longer match `detectUndercutVictim` at all — this is new drift `OI-92` never covered; see
`docs/open_issues.md` OI-92's closeout note for the disposition.

Per D1 (resolved 2026-08-03), the remedy is **retire, not repair in place**: every drifted row is
retired (`is_active=false` / `status='rejected'`) and its category refilled to the N=20 floor with
fresh content. No second repair script was written — `fill-candidate-pools.mjs` is D1's one
mechanism, covering all three categories (see `docs/architecture/db-schema.md`'s `puzzles` section
for the policy statement).

### Run it

```bash
cd connect-four

# 1. Dry run first — always. Reports the retire-and-refill plan, writes nothing.
node server/scripts/fill-candidate-pools.mjs --env staging

# 2. Apply — retires drifted overcut/undercut/z_threat rows AND refills every below-floor category
#    to N=20 in the same run (this entry and the "content pools" entry below are the SAME command;
#    they are two entries here only because they trace to different FRs, not because they are two
#    separate runs).
node server/scripts/fill-candidate-pools.mjs --env staging --apply

# 3. Production requires the explicit acknowledgement flag in addition to --apply.
node server/scripts/fill-candidate-pools.mjs \
  --env production --apply --i-understand-this-is-production
```

The script prompts for a typed `Yes` before any write, and twice for production. `--env` is
required and has no default.

### Verify

Re-run the dry run for the same environment. **Exit code 0** ("Every category is at/above the
N=20 floor and overcut/undercut/z_threat show no drift") is the success condition:

```bash
node server/scripts/fill-candidate-pools.mjs --env staging; echo "exit: $?"
```

Exit codes: `0` = clean/at floor, `1` = error, `2` = remedy still needed (below floor, or drift
found) — usable as a CI/deploy gate.

### Roll back

Retirement is reversible by hand (`is_active=true` / `status='approved'`) but the row will fail the
predicate again against current code — retiring is the correct end state, not a mistake to undo.
Refilled/generated rows have no prior state to roll back to; if a refill run inserted rows you want
to remove, delete by the `generation_run_id`/timestamp the script logs, or by `is_active=false` if
you'd rather retire than delete outright (data on staging/production is disposable pre-launch — see
`CLAUDE.md` § "Staging and production databases are disposable").

---

## Spec 057 — content pools: below-floor categories, all environments (FR-003, FR-004)

**Status**: PENDING — mechanism shipped, not yet run against staging or production (added 2026-08-04)
**Amendment (2026-08-04, same day)**: `checkForcedWinPredicate` was widened from
`passes: correctCols.length === 1` to `>= 1`, so multi-initiator boards are no longer discarded at
generation time. **This does NOT add a prerequisite and does NOT invalidate any existing row** —
verified: existing `forced_win` rows were generated under the *stricter* rule, so they all still
satisfy the wider one; the `correctCols` array-building logic is unchanged; and the grader
(`evalForcedWin`) was not touched. The only effect on this entry is that the `forced_win` generation
it calls for should now succeed at a **higher match rate** than the brute-force cost seen when local
was filled. No re-run of anything already applied is required.
**When**: **After** the spec 057 code deploy, and **after** `061_correct_cols.sql` is applied (see
the Standing Checklist's migration entry / the `061`–`064` backlog entry above). `correct_cols` is
not just cosmetic here: `buildPromotedPuzzleRow` (`server/promotePuzzleRow.js`) unconditionally
writes `correct_cols` on every inserted `puzzles` row, and `puzzles.correct_cols` does not exist on
staging or production until that migration runs. The script now **probes `puzzles.correct_cols` on
the target and hard-stops (exit 1) naming `061_correct_cols.sql`** before attempting any promote or
generate, so running it too early is a clean refusal rather than a partial run — but it still means
no pool work happens until the migration lands, so the ordering below is real, not advisory. (Before
the 2026-08-04 code-review fix the script only probed `candidates`, and an early `--apply` would
have skipped promotion, fallen through to generate, and failed every insert *after* burning solver
time.) Local was refilled without this constraint (`061` is already applied locally).
**Blocks**: SC-001 ("every category ≥20 active puzzles on staging and production, measured
directly"). Tracked as OI-86 (general below-floor) and OI-83 (`forced_win` specifically).
**Applies to**: staging, production. (Local was already brought to floor this session — see below.)

### What's wrong

Measured 2026-08-04 (T006/T011 — see `specs/057-mvp-launch-gate/research.md`'s dated subsections for
the full numbers; `fill-candidate-pools.mjs`'s own dry-run output independently reproduces the same
per-category counts):

**Staging — 12/12 categories below floor, zero promotable candidates for any category (generate for
all 12)**:

| category | active | shortfall | remedy |
|---|---|---|---|
| immediate_threat | 15 | 5 | generate |
| forced_block | 10 | 10 | generate |
| double_threat | 10 | 10 | generate |
| forced_win | 7 | 13 | generate |
| forbidden_columns | 10 | 10 | generate |
| odd_even_threat | 10 | 10 | generate |
| z_threat | 10 (10 more after retire-and-refill leaves it clean) | 10 | generate |
| claimeven | 10 | 10 | generate |
| undercut | 10 | 10 | generate |
| overcut | 6 (after retiring 8 drifted rows) | 14 | generate |
| figure_7 | 10 | 10 | generate |
| j_shape | 10 | 10 | generate |

**Production — 3/12 categories below floor after retire-and-refill (`odd_even_threat`, `claimeven`,
`overcut`, `figure_7` — see below), zero promotable candidates for any of them**:

| category | active | shortfall | remedy |
|---|---|---|---|
| odd_even_threat | 0 | 20 | generate |
| claimeven | 18 | 2 | generate |
| overcut | 6 (after retiring 8 drifted rows) | 14 | generate |
| figure_7 | 17 | 3 | generate |
| (all other 8 categories) | ≥20 | 0 | none |

Every category on both environments resolves to **generate**, not promote — staging and production
`candidates` tables have zero pending rows for any category (`correct_cols` is also absent there
today, so promotion is doubly unavailable — see the ordering note above). This is the same "generate,
not promote" finding `research.md`'s dated pool-count subsections already recorded; this entry exists
to give the owner one runnable command rather than a spreadsheet.

`forced_win` needs generation specifically (not promotion) per OI-83 — its only prior row was retired
as AMBIGUOUS, and the category has no salvageable promotable content on any environment.

### Run it

Same command as the retire-and-refill entry above — **it is the same script invocation**, not a
second run:

```bash
cd connect-four
node server/scripts/fill-candidate-pools.mjs --env staging --apply
node server/scripts/fill-candidate-pools.mjs \
  --env production --apply --i-understand-this-is-production
```

Generation calls the real c4solver once per accepted candidate and runs **locally** (against the
solver binary on the owner's machine) even though the target is a remote environment — expect
staging's full run (~132 candidates across 12 categories) to take significantly longer than
production's (~39 candidates across 4 categories). The script inserts each generated row directly
into the target environment's `puzzles` table via the service-role client; it does not use the
target environment's own `candidates` table for freshly generated content.

### Verify

```bash
# Re-run the dry run for the same environment — every category should report
# "active=NN — at/above floor (20)". Exit code 0 is full success.
node server/scripts/fill-candidate-pools.mjs --env staging; echo "exit: $?"
```

Then re-query active counts directly per `staging_checks.md`'s Spec 057 sign-off item (below) — the
dry-run's own count IS the direct measurement SC-001 requires, so no separate query is needed beyond
recording the numbers there.

### Roll back

Not meaningfully reversible and not needed — inserted rows are net-new content with no prior state.
If a run over-generates or a category should be pulled back, retire the surplus rows
(`is_active=false`) rather than deleting; data on staging/production is disposable pre-launch.

## Spec 057 (Epic 10) — Schema migration backlog closeout (061_correct_cols / 062 / 063 / 064)

**Status**: PENDING (staging and production; local already fully applied)
**When**: per the existing ordering constraints already documented in the entries this cross-references
— `063_puzzle_attempts_outcome_narrow.sql` must run **before** its code deploy (Spec 054 entry, item 1,
FR-023a); `064_drop_correct_col.sql` must run **after** its code deploy (Spec 056 entry, "Ordering
relative to the migration"). `061_correct_cols.sql` and `062` carry no ordering constraint of their own.
**Blocks**: SC-002 (verifying Batch 1's grader fix — `evalOvercut`/`evalUndercut`/`evalZThreat` accepting
a solver-gated `correctCols`) is inert on live data until `061_correct_cols.sql` is applied. Batch 2's
`fill-candidate-pools.mjs --apply` would fail its inserts on staging/production today —
`buildPromotedPuzzleRow` unconditionally writes `correct_cols`, a column neither live environment has.
**Applies to**: staging and production (local already fully applied — confirmed by this feature's T019
read-only measurement, 2026-08-04)

### What's wrong (or: what this sets up)

This feature (spec 057) authors **no new migration file**. The 4-migration backlog below was already
authored by specs 054 and 056 and remains unapplied on staging/production, re-confirmed read-only by
T019 (`psql "$DATABASE_URL" -c "SELECT filename FROM schema_migrations WHERE filename LIKE '06%'..."`,
2026-08-04, both environments queried directly):

| filename | staging | production |
|---|---|---|
| `061_correct_cols.sql` | NOT applied | NOT applied |
| `062_candidates_generation_run_unique.sql` | NOT applied | NOT applied |
| `063_puzzle_attempts_outcome_narrow.sql` | NOT applied | NOT applied |
| `064_drop_correct_col.sql` | NOT applied | NOT applied |

**Do not re-derive the ordering, backfill, or rollback mechanics for these four migrations here** —
they are fully specified already, and restating them risks drift between two copies:
- `061_correct_cols.sql`, `062`, `063`: see "Spec 054 (Epic 4) — Server/API data integrity &
  environment correctness", §"1. Migrations 062 and 063 (plus the unapplied 061)" for the measured
  row-level impact, the 063-before-code-deploy hard ordering constraint (FR-023a), and that entry's own
  Run it / Verify / Roll back.
- `064_drop_correct_col.sql`: see "Spec 056 — Legacy `correct_col` scalar retirement (Epic 9)" for the
  064-after-code-deploy hard ordering constraint, the required pre-flight NULL-row check, and that
  entry's own Run it / Verify / Roll back.

This entry exists only to record that spec 057's close (this feature) depends on the backlog above and
to keep the whole 4-migration set visible as a single work-queue item — not to re-author either
runbook. OI-105 (closed 2026-08-04) covers the `061` filename collision itself: `migrate.js` matches by
filename not number, so `061_security_lints.sql` (already applied) and `061_correct_cols.sql` (still
pending) coexist without conflict.

### Run it

No new commands. Run the Spec 054 entry's "Run it" (applies `061_correct_cols.sql`, `062`, `063`
together via `node --env-file=server/.env.<env> server/migrate.js` — staging then production) **before**
that entry's code deploy, then the Spec 056 entry's "Run it" (`064`) **after** its code deploy, following
each entry's own pre-flight and ordering constraint.

### Verify

Same verification queries as the two source entries (see each for the specific success conditions on
the CHECK constraint, unique index, and dropped column). The single query that confirms this whole
backlog is cleared for a given environment:
```sql
SELECT filename FROM schema_migrations WHERE filename IN
 ('061_correct_cols.sql','062_candidates_generation_run_unique.sql',
  '063_puzzle_attempts_outcome_narrow.sql','064_drop_correct_col.sql');
```
Success: 4 rows.

### Roll back

Not this entry's to restate — see the Spec 054 entry's "Roll back" (`062`/`063`: index drop is
reversible, the `063` outcome remap is not but affects 0 staging rows / 2 production rows with no
information loss) and the Spec 056 entry's "Roll back" (`064`: irreversible once its pre-flight passes
and the column drop runs — the pre-flight check itself is the safety gate).

## Spec 057 (Epic 10) US2 — `explanation_cache` truncate after the response-seam text-integrity fix (OI-126/OI-124)

**Status**: PENDING — not yet run in any environment (added 2026-08-04)
**When**: **After** this story's code deploy (T024-T026/T028), per environment — same ordering logic
as the "Spec 052 — overcut pool repair" entry above (re-derive/repair only makes sense once the code
that changes the output is already live; running it before would truncate a cache the old code is
about to repopulate with the same stale shape).
**Blocks**: shipping the OI-126 (`stripInternalTokens` bare/ranged coordinate fix) and OI-124
(annotation-gate strip-and-log wiring) fixes cleanly to staging or production — without this step, a
row cached under the OLD code (pre-widened regex, pre-gate) keeps serving its stale text on every
future cache hit, because a cache hit bypasses the producer entirely and is guarded ONLY at the
response seam this deploy just fixed.
**Applies to**: staging, production. Local does not need it — restart picks up the new code, and any
stale local rows are low-stakes dev data.

### What's wrong

`explanation_cache` rows written before this deploy can carry two now-superseded shapes:
1. A raw bare/ranged internal-coordinate token (`c3`, `c3-c6`) inside `deep_reveal_json.explanation`
   that the pre-T026 `stripInternalTokens` did not rewrite (OI-126) — `guardExplainMoveLlmPayload`
   re-runs `stripInternalTokens` on every read including cache hits, so this half is **actually
   already self-healing on read** (the NEW code re-sanitizes OLD cached text every time it's served).
2. A `[zone:...]` annotation that would fail `validateAnnotation` under the newly-wired gate (OI-124)
   — this half is likewise re-validated on every cache-hit read post-T028, since `guardExplainMoveLlmPayload`
   now runs the gate against the row's `explanation` field on each serve, not just at write time.

Both halves are technically self-healing on read given this deploy's code — the response-boundary
guard re-processes cached text every time, it does not just apply once at write time. **The truncate
is still required** because it is the simple, deploy-safe way to guarantee no environment is left
depending on that read-time reprocessing catching every shape correctly for content the fix was never
tested against, and because `explanation_cache` is disposable pre-launch content
(`CLAUDE.md` §"Staging and production databases are disposable") — regenerating on next request is
strictly cheaper than auditing every existing row for which of the two failure modes it carries.

### Run it

```bash
# staging
psql "$STAGING_DATABASE_URL" -c "TRUNCATE TABLE explanation_cache;"

# production (after staging is verified clean)
psql "$PRODUCTION_DATABASE_URL" -c "TRUNCATE TABLE explanation_cache;"
```

A full `TRUNCATE`, not selective repair — per the owner directive (`CLAUDE.md` §"Staging and
production databases are disposable"), regenerate-from-scratch is preferred over surgically
identifying which rows carry which of the two stale shapes.

### Verify

```sql
SELECT count(*) FROM explanation_cache;
```
Success: `0`. Then exercise one real `/api/explain-move-llm` request against a known blunder in that
environment and confirm a fresh row is written with `template_version: 'v3'` and no raw `c\d+`
token in `deep_reveal_json.explanation`.

### Roll back

**Not reversible — `explanation_cache` regenerates on next request.** There is no restore path for
the truncated rows (and none is needed — they are re-derived content, not user data); every future
`/api/explain-move-llm` cache-miss simply repopulates the table under the new code.

## Spec 057 (Epic 10) US4 — `blunders.quality` regenerate after making `scoreMove` the sole grader (T035/FR-019a)

**Status**: PENDING — not yet run in any environment (added 2026-08-04)
**When**: **After** this story's code deploy (T035), per environment — the regenerate only makes
sense once the code that grades correctly (the single-criterion `scoreMove` write path) is already
live; running it before would repopulate rows using the code about to be replaced.
**Blocks**: nothing ships broken without this — stale rows just keep displaying a wrong severity
label until re-derived. It DOES block the FR-019a "exactly one criterion" property from being true of
**data**, not just of code: until this runs, existing `blunders.quality` values on staging/production
were written by the now-deleted magnitude-threshold rule, not by `scoreMove`.
**Applies to**: staging, production. Local does not need it — local `blunders` rows are low-stakes dev
data and will be re-derived by ordinary local testing.

### What's wrong

Before T035 (spec 057, this batch), stored `blunders.quality` values were graded by
`classifyStoredMistake`'s `bestScore - playedScore > 4 ? 'blunder' : 'suboptimal'` threshold — a
second, independent grader from `scoreMove`'s outcome-class-change rule. The owner's binding FR-019a
directive ("there must be exactly ONE criterion") retired that second grader entirely; it is deleted
from the codebase (`server/mistakeStorageRule.js`), not merely superseded. Any existing row whose
grade differs under the two rules (any outcome-class change of magnitude ≤4 — the boundary case
`bestScore=2, playedScore=0` worked out in `docs/architecture/db-schema.md`'s `blunders` section and
regression-tested at `connect-four/tests/unit/qualitySingleCriterion.test.js`) is now labelled
inconsistently with what a fresh analysis of the same game would produce today, reproducing exactly
the OI-104 symptom ("a move's `quality` label can change between the live analysis and every later
cached view") this same batch closed in code.

Per `CLAUDE.md` §"Staging and production databases are disposable (pre-launch)" and the owner's
2026-08-03 directive ("Focus on developing these fixes as simple as possible... we can drop the entire
database and regenerate it if needed"), the remedy is a **documented regenerate**, not a repair
script: no live user depends on any existing `blunders` row today (pre-launch, disposable), so
writing idempotent in-place repair tooling to re-grade rows under the new rule would be over-
engineering for a database nobody is using.

### Run it

```bash
# staging
psql "$STAGING_DATABASE_URL" -c "TRUNCATE TABLE blunders;"

# production (after staging is verified clean)
psql "$PRODUCTION_DATABASE_URL" -c "TRUNCATE TABLE blunders;"
```

A full `TRUNCATE`, not selective repair — identifying exactly which existing rows disagree between
the two rules would require re-running the solver against every stored `board_state`, which is far
more expensive than letting ordinary play repopulate the table under the single current grader.
`blunders` has no downstream table that would be orphaned by a truncate (FKs point INTO it from
nothing; `puzzle_id`/`game_id`/`papergames_game_id` are nullable references OUT).

### Verify

```sql
SELECT count(*) FROM blunders;
```
Success: `0`. Then play one AI-sparring game to a loss with at least one deliberate mistake, run
`POST /api/games/analyze`, and confirm the response's per-move `quality` badges and the newly-inserted
`blunders` row(s) agree (spot-check via `GET /api/blunders/:id` on the returned id) — this exercises
the exact live-vs-stored agreement FR-019/FR-020 require.

### Roll back

**Not reversible — `blunders` regenerates from ordinary play going forward.** There is no restore path
for the truncated rows, and none is needed pre-launch: they are re-derived from solver analysis of
games already stored in `games`/`papergames_games`, not primary user data. A user's move history and
game outcomes are unaffected — only the mistake-review annotations are cleared and will repopulate as
that user's games are next reviewed or new games are analyzed.

## Plan A small fixes — deep-reveal TTS sanitization (fix 7 / fix 8)

**Status**: PENDING
**When**: after the code deploy (either is safe; the app self-heals, this just avoids a silent stale window)
**Blocks**: nothing hard — but until it runs, previously-cached deep reveals keep serving their OLD audio
**Applies to**: staging / production

### What's wrong

`GET /api/user/tts/deep-reveal` now runs `stripInternalTokens` before `stripAnnotationsForTTS`
(`buildTtsSpeechText`, `server/reasonRenderGuard.mjs`), so the coach speaks "column 5" where it used
to speak "c5". The stored audio path is derived from that text:

```js
const textHash = createHash('sha256').update(cleanText).digest('hex');
const audioPath = `tts/deep-reveal/${textHash}.mp3`;
```

compared against `explanation_cache.audio_path`. Every existing row's `audio_path` was computed from
the **unsanitized** string, so it no longer matches and each affected reveal re-synthesizes once —
correct, but it means the old clips linger as dead objects in the `coach-tts` bucket.

Separately, `RANGE_RE` now matches en/em-dash ranges, so cached *text* generated before this deploy
can still contain `c2–c5` renders that the guard would now fix. The guard runs at the response seam
on every read, so served text self-corrects; the **cached raw mechanism** does not change.

### Run it

Pre-launch, staging and production are disposable — this is a truncate, not a migration or a
backfill:

```sql
TRUNCATE explanation_cache;
```

Optionally clear the stale audio objects under `coach-tts/tts/deep-reveal/` in Supabase Storage.
Not required for correctness — orphaned objects are only wasted bytes.

### Verify

```sql
SELECT count(*) FROM explanation_cache;
```

Success: `0`. Then open one past mistake, tap the deep reveal, and play the audio. The **spoken**
text must match the **rendered** text: no "c5", no "c1r3", and a dash range must be spoken as
"columns 2 through 5" (en) / "columnas 2 a 5" (es). Check both locales — `buildTtsSpeechText`
takes the locale the route already resolved via `resolveTtsLocale(lang, req.locale)`.

### Roll back

**Not reversible, and does not need to be.** `explanation_cache` is a derived cache: every row
regenerates on the next reveal of that position. No user data is stored in it.

## Plan A small fixes — synthesize + approve the onboarding review tip audio

**Status**: PENDING
**When**: either, relative to the code deploy
**Blocks**: nothing hard — the app is unaffected; the tip renders on screen with no voice until this runs
**Applies to**: local (this is a content-generation step performed by a human on localhost, then committed)

### What's wrong

`coach.spoken.sparring.review.onboarding.0` was added in both `en.json` and `es.json` and registered
in both `server/tts-registry.json` / `.es.json` as `needs_audio`, but **deliberately not synthesized or
approved** in this branch — synthesizing without approving would have created orphan mp3s and turned
`tests/unit/coachSpokenNamespace.test.js` red. So the onboarding review tip currently **renders on
screen and is silently unspoken**: `speakCoachMessage` no-ops on any slug that isn't `approved`, by
design.

### Run it

From `connect-four/`:

```bash
node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.onboarding.0 --lang all
```

Then approve at `/admin/audio` in **both** `en` and `es`.

**A load-bearing warning that must be followed in this same pass:** `/admin/audio`'s approve route
calls `writeTtsManifest`, which **rebuilds the manifest from `status === 'approved'`** rather than
remapping in place (see OI-149). Five English slugs are currently in the manifest but only
`awaiting_approval`, so approving anything without also approving them **silently drops them**,
orphaning their mp3s (turns the parity suite red) and silencing clips that play today. The five:
`coach--spoken--figure--7--blunder--2`, `coach--spoken--immediate--threat--hint--0`,
`coach--spoken--sparring--outcome--loss`, `coach--spoken--sparring--outcome--win`,
`coach--spoken--undercut--optimal--2`. **Two of those are the sparring outcome clips that this same
branch just made audible**, so dropping them would partially undo the branch. Instruct the human to
listen to and approve those five in the same pass. Cross-reference `docs/open_issues.md` OI-149.

### Verify

A parity check over both languages: no orphan mp3, no manifest slug lacking a file, and the new slug
present and approved in both registries.

```bash
node -e "
const fs = require('fs');
const LANGS = [
  { lang: 'en', registry: 'server/tts-registry.json', dir: 'public/audio/coach' },
  { lang: 'es', registry: 'server/tts-registry.es.json', dir: 'public/audio/coach/es' },
];
const KEY = 'coach.spoken.sparring.review.onboarding.0';
let ok = true;
for (const { lang, registry, dir } of LANGS) {
  const entries = JSON.parse(fs.readFileSync(registry, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(\`\${dir}/coach-audio-manifest.json\`, 'utf8'));
  const onDisk = new Set(fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)));
  const missingMp3 = manifest.filter(s => !onDisk.has(s));
  const orphanMp3 = [...onDisk].filter(s => !manifest.includes(s));
  const entry = entries.find(e => e.key === KEY);
  console.log(lang, {
    entryStatus: entry && entry.status,
    inManifest: entry && manifest.includes(entry.slug),
    missingMp3,
    orphanMp3,
  });
  if (!entry || entry.status !== 'approved' || !manifest.includes(entry.slug) || missingMp3.length || orphanMp3.length) ok = false;
}
console.log(ok ? 'PASS' : 'FAIL');
"
```

Success: both `en` and `es` print `entryStatus: 'approved'`, `inManifest: true`, empty `missingMp3` /
`orphanMp3` arrays, and the script prints `PASS`. Then run `npm run test:fast` and confirm
`coachSpokenNamespace.test.js` is green.

### Roll back

`git checkout` the new mp3s, the two manifests, and the two registries. Nothing is deployed until
these are committed, so an aborted pass leaves no trace.

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
