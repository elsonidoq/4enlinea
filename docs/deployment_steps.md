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

## RESOLVED DEPLOY SEQUENCE for this queue (written 2026-08-04 by the deploy agent)

Read this before running any individual entry. The entries below were each written by a producer
session in isolation; several of their `When` fields describe an ordering that **the deploy mechanism
cannot actually produce**, and two of them prescribe conflicting remedies for the same rows. This
section is the reconciliation. Where it disagrees with an entry below, **this section wins** and the
entry has been annotated in place.

### The fact every `When` field has to be reconciled against

`connect-four/railpack.json:11` — verbatim:

```json
    "startCommand": "node server/migrate.js && node server/index.js"
```

**Migrations are applied automatically by every Railway deploy**, inside the new container, *after*
the new image is built and *before* the new server process starts — while the **outgoing instance may
still be serving traffic**. There is no deploy in which a migration on the deployed branch runs
"after the code deploy". A migration file present on the branch runs at the *start* of that deploy.

Consequences for the two hard ordering constraints in this queue:

| Migration | Documented constraint | Satisfiable in one deploy? |
|---|---|---|
| `063_puzzle_attempts_outcome_narrow.sql` | must run **before** its code deploy (FR-023a) | **YES.** `migrate.js` completes before `index.js` starts, so the new code that emits `outcome:'incorrect'` never runs against the un-narrowed CHECK. Residual: during rollover the *outgoing* instance can still write `'correct_retry'`/`'revealed'`, which the narrowed CHECK now rejects and the fire-and-forget `.catch` swallows. Measured on staging 2026-08-04: `puzzle_attempts` holds **0 rows** and nobody is using the environment, so the lost-write window is empty. On production, re-measure. |
| `064_drop_correct_col.sql` | must run **after** its code deploy | **NO — this is the conflict.** It would run at the start of the same deploy, while the outgoing instance still reads the column. Verified at source: `git show 44c33573:connect-four/server/index.js \| /usr/bin/grep -c "correct_col"` → **22**, including PostgREST selects such as `.select('id, category, move_string, …, highlight_metadata, correct_col, user_player, created_at')` (line 969). PostgREST **errors** on a selected column that does not exist, so the puzzle-detail, `/api/puzzles/draw` and admin-list endpoints hard-fail for the length of the rollover. Worse: if the new build then fails to boot, the environment is left running old code against a schema that no longer has the column. |

**Resolution: `064` gets its own, second deploy.** It is held off the deploy branch for Deploy A and
added back for Deploy B. Do not attempt to satisfy it by running `migrate.js` by hand after Deploy A
— if the file is on the deployed branch, Deploy A's own automatic runner has already applied it, and
the hand-run is both redundant and too late.

### The ordered sequence

Staging deploys from branch **`stagging`** (doubled `g` — verified 2026-08-04 against Railway:
service `4enlinea-staging`, `source.branch = "stagging"`, `rootDirectory = /connect-four`, custom
domain `staging.decodec4.xyz`). Production deploys from `main`. **Pushing to that branch is the
deploy trigger** — see `docs/deploy-runbook.md` §0.

1. **Deploy A — code + migrations `061_correct_cols` / `062` / `063`.**
   Merge the feature branch into the deploy branch, then, **in a separate commit on the deploy branch
   only**, remove `connect-four/server/migrations/064_drop_correct_col.sql`. Push. Railway's automatic
   runner applies `061_correct_cols`, `062` and `063`; the new server then starts.
   *Nothing else in this queue may run before this step* — every remaining entry depends either on the
   new code being live or on `correct_cols` existing.
2. **Verify Deploy A healthy** — Railway deploy status SUCCESS, the site loads, and the ledger shows
   the three filenames. This is the last safe revert point before `064`.
3. **`backfill-correct-cols.mjs --env <env>`** — **MISSING ENTRY, added 2026-08-04 by the deploy
   agent.** `061_correct_cols.sql` only `ADD COLUMN`s `correct_cols`; it does **not** populate it.
   Nothing else in this queue did either, so Deploy A leaves every pre-existing row with
   `correct_cols IS NULL` while the newly deployed code reads `correct_cols` **exclusively**. This is
   a live functional break, not just a `064` pre-flight problem — see the new entry
   "## Spec 051 backfill — populate `correct_cols` on pre-existing rows" below. Run this **before**
   step 4, because it deactivates rows whose recomputed answer set is empty and therefore changes the
   per-category active counts step 4 is trying to top up.
4. **Content pools** — `fill-candidate-pools.mjs --env <env> --apply` (one run; it is the *same*
   invocation for both the "retire-and-refill" and the "content pools" entries below).
   Requires step 1 for `puzzles.correct_cols`; the script hard-stops (exit 1) naming
   `061_correct_cols.sql` otherwise.
4. **`TRUNCATE explanation_cache`** — requires the US2 response-seam fix from step 1 to be live.
5. **`TRUNCATE blunders`** — requires the US4 single-criterion grader from step 1 to be live.
6. **`064` pre-flight** — the at-risk query (Spec 056 entry). **It can only run after step 1**, because
   it references `correct_cols`, which does not exist until `061_correct_cols` applies. Before step 1
   it fails with `column "correct_cols" does not exist` (measured on staging, 2026-08-04) — an error
   the Spec 056 entry did not anticipate; it only anticipated the mirror-image `correct_col does not
   exist`.
7. **Deploy B — restore `064_drop_correct_col.sql` on the deploy branch and push.** Railway's runner
   drops the column at container start. By now the only code that has ever served against this schema
   is the post-056 code from Deploy A, which never reads `correct_col`.
8. **Smoke-test after Deploy B** — per the Spec 056 entry's item 4 (an `undercut`/`overcut` puzzle
   grades a correct answer *correct*, and a lesson inline challenge does the same).

Steps 3–6 may be done in any order among themselves; they are ordered here only for reporting.

### Running this queue against PRODUCTION — what differs from the staging run

The whole queue was executed against **staging on 2026-08-04** and every entry below is marked
`DONE … (staging)` / `PENDING (production)`. The sequence above is the tested one; reuse it. What
changes for production:

| | staging (executed) | production (pending) |
|---|---|---|
| Deploy branch | `stagging` (doubled `g`) | **`main`** |
| `DATABASE_URL` pooler | 6543 (transaction) — worked | 5432 (session) — no pooler question arises |
| `063`'s `correct_retry` remap | **0 rows** — proven no-op | **2 rows** — real, lossless (the retry signal lives in `first_attempt_correct`) |
| Rollover write-loss window for `063` | empty (`puzzle_attempts` had 0 rows) | **re-measure** before deploying |
| Spec 051 backfill | 122 rows → 69 updated, 53 deactivated | **will also be needed** — production gets `061_correct_cols` for the first time on this deploy, so every pre-existing row starts NULL. `--dry-run` first; production's pool is older and larger (~279 active), so expect a different deactivation count |
| `TRUNCATE blunders` | already 0 rows — confirmed no-op | **a real discard.** Re-derived from stored games, but say so before running |
| `TRUNCATE explanation_cache` | 13 rows discarded | a real discard; regenerates on next request |
| Pool fill | 171 generated, 0 promoted | 4 categories below floor per the table below — **but re-measure**, the backfill's deactivations will change it, likely substantially |
| `064` pre-flight | active puzzles 0, pending candidates 0 → proceeded | use the **corrected** gates (see the Spec 056 entry); the shipped query cannot clear |
| `forced_win` | ~16 invocations to reach 20 | budget the same loop |

Two things to do **before** starting, both of which the staging run showed matter:

1. **Confirm `ADMIN_EMAILS` holds the intended list.** Per the Spec 054 entry §2, `requireAdmin`
   starts actually working in production on this deploy (`req.user.email` was always `undefined`
   before, so admin routes failed closed for everyone). This was never exercised — it is reasoned
   from the code, not measured.
2. **Re-measure everything.** Every count in this file is dated. The staging run invalidated several
   of them within the same session.

Note also that `CLAUDE.md` §"Staging and production databases are disposable (pre-launch)" — which
justifies every truncate and retire-rather-than-repair decision in this queue — **expires at launch**.
Re-confirm it still holds before running the destructive steps against production.

### Do NOT run: `repair-overcut-highlight-metadata.js`

The **Spec 052 (Epic 2) — overcut pool repair** entry below and the **Spec 057 — retire-and-refill**
entry prescribe **conflicting remedies for the same rows**: Spec 052 *repairs* drifted `overcut`
`highlight_metadata` in place, Spec 057's D1 (resolved 2026-08-03) *retires* those same rows and
refills the category. D1 supersedes. Running the repair script first would rewrite rows that
`fill-candidate-pools.mjs` is about to retire — wasted work at best, and it re-activates the
ambiguous-row problem D1 closed. The Spec 052 entry is marked SUPERSEDED in place below.

---

## Spec 052 (Epic 2) — overcut pool repair

> **SUPERSEDED 2026-08-04 — DO NOT RUN.** Replaced by the **Spec 057 — retire-and-refill** entry
> below, per Decision D1 (resolved 2026-08-03): drifted `overcut` rows are **retired and the category
> refilled**, not repaired in place. `fill-candidate-pools.mjs` is D1's single mechanism and covers
> `overcut`, `undercut` and `z_threat` together. Running
> `repair-overcut-highlight-metadata.js` would rewrite `highlight_metadata` on rows that
> `fill-candidate-pools.mjs` then retires, and would leave the ambiguous rows in the state D1
> retires them out of. The entry is retained below as the historical record of *why* the drift
> exists and what was measured — its **Run it** section is dead. OI-92's data half closes via the
> Spec 057 entry.

**Status**: SUPERSEDED by "Spec 057 — retire-and-refill" (was: PENDING, added 2026-07-30)
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
lands an open checkout end-to-end — this was recorded as unable to be exercised in this environment
because `VITE_PADDLE_CLIENT_TOKEN` was unset locally; **that premise was disproven 2026-09-08 by
spec 058 (e2e-qa-enablement)**, which completed a real Paddle sandbox transaction end to end
against the local app once the token was configured in `connect-four/.env.local` — see
`staging_checks.md`'s new sign-off item under this heading. **The Default
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
any rebuild or it serves stale asset hashes that 404 into the SPA catch-all; (b) at the time of this
2026-08-01 result, a live transaction was recorded as not exercisable locally because
`VITE_PADDLE_CLIENT_TOKEN` was unset, so Paddle showed its own in-iframe "Something went wrong"
*after* all CSP-governed loads succeeded — that boundary was exactly what the CSP check needed, so
it did not weaken the result. **That local-unavailability premise was disproven 2026-09-08 by spec
058 (e2e-qa-enablement)**: the Paddle sandbox checkout overlay, including a completed live sandbox
transaction, works locally once `VITE_PADDLE_CLIENT_TOKEN` is configured in
`connect-four/.env.local`.

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

**Status**: **DONE 2026-08-04 (staging)** — `061_correct_cols.sql`, `062` and `063` applied automatically by Deploy A's `migrate.js`; verified in the ledger and against the live schema. **PENDING (production).** (Was: PENDING — nothing has been applied beyond local)
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

**CORRECTED 2026-08-04 — there is nothing to run by hand.** This section previously read:

```bash
# Staging — ONLY after step 0 is fixed.
cd connect-four
node --env-file=server/.env.staging server/migrate.js

# Production.
node --env-file=server/.env.production server/migrate.js
```

That duplicates what the deploy already does. `connect-four/railpack.json:11`'s start command is
`node server/migrate.js && node server/index.js`, so **`061_correct_cols`, `062` and `063` are applied
automatically by Deploy A**, inside the new container, before the new server starts. Running the
command above by hand before the deploy is harmless but pointless (the deploy's own runner then finds
0 pending); running it *after* the deploy is a no-op for the same reason. The one thing it is useful
for is a **dry read of what is still pending** — `migrate.js` prints the pending list before applying.

The FR-023a "063 before the code deploy" constraint is **satisfied by that automatic ordering**, not
by a manual pre-step — see the RESOLVED DEPLOY SEQUENCE section at the top of this file for the
rollover caveat (the outgoing instance can still emit `'correct_retry'`/`'revealed'` for the length of
the rollover; measured 0 rows on staging 2026-08-04, re-measure for production).

The **only** action for this entry is therefore: push Deploy A, then run the Verify block below.

### Verify

Runnable form (2026-08-04): these are SQL, and the file previously did not say how to execute them.
`DATABASE_URL` is **not** exported in your shell — it lives in `connect-four/server/.env.<env>`. Run
each query as:

```bash
cd connect-four
# staging (substitute .env.production for production)
node --env-file=server/.env.staging -e 'process.stdout.write(process.env.DATABASE_URL)' \
  | xargs -0 -I{} psql "{}" -c "<the SQL below>"
```

or paste the SQL into the target project's Supabase SQL editor. Staging's `DATABASE_URL` is on the
transaction pooler (6543); every query below is single-statement, so the pooler is irrelevant to
them.

```sql
-- 1. All three migrations recorded (corrected 2026-08-04 — 061_correct_cols.sql was missing from
--    this success condition even though the same entry's table lists it as unapplied):
SELECT filename FROM schema_migrations WHERE filename LIKE '06%' ORDER BY filename;
--    success: includes 061_correct_cols.sql AND
--             062_candidates_generation_run_unique.sql AND
--             063_puzzle_attempts_outcome_narrow.sql
--    (061_security_lints.sql and 060_* are already present from earlier deploys — their presence
--     is expected and is NOT evidence that 061_correct_cols.sql applied; migrate.js keys on the
--     full filename, so the two 061s are independent rows.)

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

**Status**: **DONE 2026-08-04 (staging)** — code shipped in Deploy A; `064_drop_correct_col.sql` applied by Deploy B. **PENDING (production).** (Was: PENDING — applied to local only)
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

**CORRECTED 2026-08-04 — steps 2 and 3 are TWO SEPARATE DEPLOYS, and step 1 moves after step 2.**
This entry as originally written is not executable as stated, for two independent reasons:

- **"Run the migration after the code deploy" is not something a single deploy can do.**
  `connect-four/railpack.json:11` — `"startCommand": "node server/migrate.js && node server/index.js"`
  — means any migration file *on the deployed branch* is applied at the **start** of that same deploy,
  while the outgoing instance is still serving. So if `064_drop_correct_col.sql` is on the branch for
  step 2's deploy, step 3 has already happened, in the wrong order, before the new server booted.
  **The file must be held off the branch for the code deploy and added in a second deploy.** See the
  RESOLVED DEPLOY SEQUENCE section at the top of this file (Deploy A / Deploy B).
- **The pre-flight in step 1 cannot run before the code deploy.** Its query references
  `correct_cols`, which is created by `061_correct_cols.sql` — a migration that is itself unapplied on
  staging and production and that lands *with* Deploy A. Run against staging on 2026-08-04 in the
  pre-deploy state, it fails: `column "correct_cols" does not exist`. The "Gotchas" note below
  anticipates only the mirror-image failure (`column correct_col does not exist`, meaning 064 already
  ran) and would lead a reader to misdiagnose this one. **Run the pre-flight after Deploy A and
  before Deploy B.**

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

**CORRECTED 2026-08-04 — the `candidates` half of this success condition is UNSATISFIABLE by its own
prescribed remedy, and must not be read as a hard gate.** The query above scans **every**
`candidates` row regardless of status, but `backfill-correct-cols.mjs` processes only
`candidates.status = 'pending'` (its `--help` states this: *"Active per table: puzzles.is_active =
true; candidates.status = 'pending'"*). On any environment carrying historical non-pending
candidates, the remedy cannot move the number and the gate can never clear. Measured on staging
after Deploy A and the backfill, 2026-08-04:

| table | at_risk | after the backfill |
|---|---|---|
| `puzzles` | 102 | **0** ✅ |
| `candidates` | 102 | **102** — all 122 rows are `status='approved'`, **0 pending** |

**AND the `puzzles` half needs an `is_active` filter it does not have.** Measured on staging
immediately before Deploy B, after the backfill: raw `puzzles.at_risk` = **48**, but
`puzzles WHERE is_active AND correct_cols IS NULL` = **0**. All 48 are rows the backfill
**deactivated** for failing their category predicate — retired content, which D1 says is the correct
end state. Dropping their legacy scalar discards nothing anyone wants.

Read the gate this way instead — the query that actually matters is:

```sql
SELECT count(*) AS active_at_risk FROM public.puzzles
 WHERE is_active AND correct_cols IS NULL;          -- must be 0
SELECT count(*) AS pending_at_risk  FROM public.candidates
 WHERE status = 'pending' AND correct_cols IS NULL AND correct_col IS NOT NULL;  -- must be 0
```

- **`puzzles` where `is_active` — must be 0. That is the genuine hard gate** — those rows are served
  to players, and dropping `correct_col` while `correct_cols` is NULL destroys the only answer a live
  puzzle has. Inactive rows are retired content and do not gate anything.
- **`candidates.at_risk` is advisory.** `candidates` is the generation/promotion staging table; it is
  never served to a player, and a non-`pending` row is a terminal historical artifact whose content
  has already been promoted into `puzzles` (which now carries `correct_cols`). Losing its legacy
  `correct_col` scalar costs nothing recoverable or wanted. Pre-launch this data is explicitly
  disposable (`CLAUDE.md` §"Staging and production databases are disposable"). Record the number and
  proceed.
- If an environment ever has **pending** candidates with `correct_cols IS NULL AND correct_col IS NOT
  NULL`, that *is* a real stop — run the backfill, which will pick them up.

Staging proceeded to Deploy B on 2026-08-04 under exactly this reading: **active** `puzzles` 0,
**pending** `candidates` 0; advisory-only counts were inactive `puzzles` 48 and non-pending
`candidates` 102.

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

**Step 3 — run the migration** (only after step 2 is deployed and healthy).

**CORRECTED 2026-08-04.** This step previously read:

```bash
cd connect-four
# Staging first.
node --env-file=server/.env.staging server/migrate.js
# Then production — only after staging is verified below.
node --env-file=server/.env.production server/migrate.js
```

That is wrong in both directions. If `064_drop_correct_col.sql` is **on** the deployed branch, step
2's own deploy already applied it (at container start, in the unsafe order) and this hand-run finds
0 pending — it looks like it worked and proves nothing. If the file is **held off** the branch, as
the corrected sequence requires, then hand-running `migrate.js` from a local checkout that *does*
have the file would drop the column while the deployed branch has no record of it — leaving the
branch and the schema permanently out of step, and the next deploy's runner would try to apply it
again (harmless only because of `DROP COLUMN IF EXISTS`).

**Do this instead — Deploy B:**

```bash
# On the deploy branch (`stagging` for staging, `main` for production), restore the migration file
# that Deploy A held back, and push. The push is the deploy trigger; Railway's own
# `node server/migrate.js` applies 064 at container start, with only post-056 code ever having
# served against the resulting schema.
git checkout stagging
git revert --no-edit <sha of Deploy A's "hold back 064" commit>
git push origin stagging
```

Verify Deploy B reached SUCCESS in Railway before running the Verify block below.

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

## Spec 051 backfill — populate `correct_cols` on pre-existing rows

**Status**: **DONE 2026-08-04 (staging)** — 69 rows updated, 53 deactivated; verified `active AND correct_cols IS NULL` = 0. **PENDING (production).** (Added 2026-08-04 by the deploy agent — this entry did not exist and should have)
**When**: **After** the deploy that applies `061_correct_cols.sql` (Deploy A), and **before**
`fill-candidate-pools.mjs` and before `064`. It deactivates rows, so it must precede any step that
measures or tops up per-category active counts.
**Blocks**: puzzle grading working at all on the target environment, for every category whose answer
is a column set rather than stored `highlight_metadata`; and the `064` pre-flight, which cannot
return 0 until this runs.
**Applies to**: staging, production. (Local was backfilled when spec 051 shipped.)

### What's wrong

**This is a gap in this queue, not in the code.** `061_correct_cols.sql` is *only*
`ALTER TABLE … ADD COLUMN IF NOT EXISTS correct_cols integer[] DEFAULT NULL` — it adds the column
and populates nothing. No entry in this file ever queued the population step. Spec 056 then made
`correct_cols` the **sole** storage contract every reader uses. The result, measured on staging
immediately after Deploy A on 2026-08-04:

| measure | staging, post-Deploy-A |
|---|---|
| active `puzzles` | 122 |
| active `puzzles` with `correct_cols IS NULL` | **122 (all of them)** |
| …of which `correct_col IS NOT NULL` (the `064` at-risk set) | 102 |
| …of which both are NULL (metadata-graded `overcut`/`undercut`) | 20 |

Confirmed live rather than inferred — `curl https://staging.decodec4.xyz/api/puzzles/draw?category=immediate_threat`
returned `"correct_cols":null` on every row served by the newly deployed code.

The remedy was documented only as a footnote inside the Spec 056 pre-flight ("Non-zero: STOP … Run
spec 051's backfill"), where it reads as an unlikely contingency. It is not a contingency: it is
**guaranteed** on any environment that receives `061_correct_cols.sql` for the first time, because
the migration cannot populate the column and nothing else does.

`backfill-correct-cols.mjs` recomputes the answer set with the same `checkPredicate` generation uses,
and per FR-016b **deactivates** (rather than storing an empty array on) any row whose recomputed set
is empty — i.e. content that no longer matches its category's current predicate. Expect that to
remove a substantial fraction of a legacy pool; on staging the dry-run planned **69 updates and 53
deactivations** out of 122 rows. That is the intended outcome, and `fill-candidate-pools.mjs`
regenerates back to the floor afterwards.

### Run it

```bash
cd connect-four

# 1. Dry run first — always. Prints the per-category before/deactivated/after plan, writes nothing.
node server/scripts/backfill-correct-cols.mjs --env staging --dry-run

# 2. Apply. The script prompts for a typed `Yes` on stdin before any write.
node server/scripts/backfill-correct-cols.mjs --env staging
```

**Trap — do not run this backgrounded or with stdin closed.** The confirmation prompt
(`server/scripts/backfill-correct-cols.mjs:330`) reads from `process.stdin`; with no TTY it gets EOF,
aborts, **and still exits 0**. It looks like a successful run and writes nothing. Hit this on staging
2026-08-04. Either run it interactively or pipe the confirmation: `printf 'Yes\n' | node
server/scripts/backfill-correct-cols.mjs --env staging`. Never judge this script by its exit code —
judge it by re-measuring `correct_cols IS NULL` afterwards.

### Verify

```bash
cd connect-four
node --env-file=server/.env.staging -e '
  const pg = require("pg");
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  c.connect().then(() => c.query(`SELECT count(*) FILTER (WHERE is_active) AS active,
      count(*) FILTER (WHERE is_active AND correct_cols IS NULL) AS active_cols_null
    FROM public.puzzles`))
   .then(r => { console.log(r.rows[0]); return c.end(); });
'
```

**Success**: `active_cols_null` = **0**. (`active` will have dropped by the number of deactivations —
that is expected, and `fill-candidate-pools.mjs` restores it to the N=20 floor.)

### Roll back

**Not reversible in the useful direction, and not needed.** The `correct_cols` writes are
recomputations from the current predicates, so re-running the script reproduces them exactly; there
is no prior value worth restoring. The deactivations are reversible by hand (`is_active = true`) but
the row will fail its predicate again — deactivation is the correct end state, matching D1's
retire-rather-than-repair policy. Pre-launch, this data is disposable
(`CLAUDE.md` §"Staging and production databases are disposable").

---

## Spec 057 — retire-and-refill for stale overcut/undercut/z_threat rows (D1)

**Status**: **DONE 2026-08-04 (staging)** — `fill-candidate-pools.mjs --env staging --apply` run; its post-run audit reports `identical` only, `stale=0 ambiguous=0 no_longer_matches=0` for all three of `overcut`/`undercut`/`z_threat`, and 0 rows needed retiring at that point (the spec-051 backfill had already deactivated the drifted rows — see the new Spec 051 entry above). **PENDING (production).**
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

**Status**: **DONE 2026-08-04 (staging)** — all 12 categories at the N=20 floor. Verified by this entry's own success condition: `fill-candidate-pools.mjs --env staging` exits **0** with `✅ Every category is at/above the N=20 floor and overcut/undercut/z_threat show no drift.` **PENDING (production).**

**Operational note for the production run — `forced_win` needs repeated invocations.** Its generator hits the 400-solver-attempt cap on almost every run and yields only **0–4 accepted boards per invocation** (observed on staging: 3→4→5→6→6→10→14→15→15→20 across ~16 runs, several of which returned 0). A single `--apply` will **not** bring it to floor, and the script reports this honestly rather than failing — `WARNING: only generated N/M for forced_win (solver attempt cap reached)`. Budget a loop:

```bash
for i in $(seq 1 16); do
  printf 'Yes\n' | node server/scripts/fill-candidate-pools.mjs \
    --env production --apply --i-understand-this-is-production --category forced_win
done
```

Every other category reached floor in one or two runs. This is the practical face of OI-83.
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

**Re-measured directly against staging 2026-08-04 (deploy agent).** The table above is **confirmed
accurate**, with one number corrected. Two independent measurements, which read differently and must
not be confused:

- **Raw, read-only, service-role client counting `puzzles WHERE is_active = true`** — the pool as it
  stands *before* any retirement: `immediate_threat` 15, `forced_win` 7, **`overcut` 10**, and 10 for
  each of the other nine. Total **122** active. **0** pending `candidates`.
- **`fill-candidate-pools.mjs --env staging` dry-run** — reports `overcut active=6 shortfall=14`,
  because its `active` column is *net of the rows it is about to retire*: `10 − 4 retired = 6`. Every
  other category matches the raw count exactly.

So the table's `overcut` figure of **6 is correct as a post-retire number** — but its parenthetical
"(after retiring **8** drifted rows)" is wrong for staging: the script's own dry-run reports
**4** drifted `overcut`/`undercut`/`z_threat` rows across `puzzles`+`candidates`, not 8. (The 8 came
from the Spec 052 entry's 2026-07-30 measurement of `4 stale + 4 ambiguous`; the retire-and-refill
table above still carries those older per-disposition numbers.)

Treat `fill-candidate-pools.mjs`'s own dry-run output at run time as the authoritative count, and
note which of the two senses of "active" it is reporting — these tables go stale the moment anything
runs.

**The script's `061_correct_cols` guard was exercised and works as documented** (staging, 2026-08-04,
before Deploy A): it printed `ABORT: staging puzzles.correct_cols does not exist
(061_correct_cols.sql not applied on this target)` and refused, having planned `0 promote + 122
generate row(s)`. The clean refusal described in this entry's `When` field is real, not aspirational.

**Production — 4/12 categories below floor after retire-and-refill (`odd_even_threat`, `claimeven`,
`overcut`, `figure_7`), zero promotable candidates for any of them** (corrected 2026-08-04: this said
"3/12" while naming four categories and listing four table rows):

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

**Status**: **DONE 2026-08-04 (staging)** — all four filenames present in staging's `schema_migrations`. **PENDING (production).**
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

No new commands.

**CORRECTED 2026-08-04.** This section previously read: *"Run the Spec 054 entry's 'Run it' (applies
`061_correct_cols.sql`, `062`, `063` together via `node --env-file=server/.env.<env> server/migrate.js`
— staging then production) **before** that entry's code deploy, then the Spec 056 entry's 'Run it'
(`064`) **after** its code deploy, following each entry's own pre-flight and ordering constraint."*

Both halves are wrong against the actual deploy mechanism (`connect-four/railpack.json:11`,
`"startCommand": "node server/migrate.js && node server/index.js"`):

- `061_correct_cols`/`062`/`063` need **no hand-run at all** — Deploy A's automatic runner applies
  them before the new server starts, which is exactly what FR-023a asks for.
- `064` **cannot** be run "after its code deploy" while it sits on that deploy's branch; it needs its
  own Deploy B.

See the **RESOLVED DEPLOY SEQUENCE** section at the top of this file for the executable ordering.
This entry contributes no commands of its own — only the single ledger query in Verify below.

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

**Status**: **DONE 2026-08-04 (staging)** — `TRUNCATE TABLE explanation_cache;` run; 13 rows → 0, verified by `SELECT count(*)`. **PENDING (production).**
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

**CORRECTED 2026-08-04 — `$STAGING_DATABASE_URL` / `$PRODUCTION_DATABASE_URL` do not exist.** Neither
name is set anywhere in this repo or in the shell environment (checked: no definition in any `.sh`,
`.js`, `.mjs` or `.json` outside `node_modules`). As written, `psql "$STAGING_DATABASE_URL" -c …`
expands to `psql "" -c …`, which connects to the **local default database** — i.e. it silently
truncates the wrong table on the wrong machine rather than erroring. Use the env file, which is the
only place these URLs live:

```bash
cd connect-four

# staging
node --env-file=server/.env.staging -e 'process.stdout.write(process.env.DATABASE_URL)' \
  | xargs -0 -I{} psql "{}" -c "TRUNCATE TABLE explanation_cache;"

# production (after staging is verified clean)
node --env-file=server/.env.production -e 'process.stdout.write(process.env.DATABASE_URL)' \
  | xargs -0 -I{} psql "{}" -c "TRUNCATE TABLE explanation_cache;"
```

Confirm the target before running: `server/.env.staging` must contain the staging project ref
`jkqilynpshutqcceopdn` and **not** the production ref `kxtqwsumojtexokrtlfp` (the constants are at
`connect-four/server/scripts/repair-overcut-highlight-metadata.js:54-55`). Check with
`/usr/bin/grep -o "jkqilynpshutqcceopdn\|kxtqwsumojtexokrtlfp" server/.env.staging | sort -u` — this
prints only the ref, never a credential.

A full `TRUNCATE`, not selective repair — per the owner directive (`CLAUDE.md` §"Staging and
production databases are disposable"), regenerate-from-scratch is preferred over surgically
identifying which rows carry which of the two stale shapes.

### Verify

```sql
SELECT count(*) FROM explanation_cache;
```
Success: `0`. Then exercise one real `/api/explain-move-llm` request against a known blunder in that
environment and confirm a fresh row is written with `template_version = 'v3'` and no raw `c\d+`
token in `deep_reveal_json->>'explanation'`.

**CORRECTED 2026-08-04 — `template_version` is a top-level COLUMN on `explanation_cache`, not a key
inside `deep_reveal_json`.** Checking `deep_reveal_json->>'template_version'` returns `null` and
reads as a failure when the row is in fact correct. The table's columns are `position_hash`,
`one_liner`, `deep_reveal_json`, `created_at`, `template_version`, `audio_path`,
`audio_generated_at`, `locale`. The runnable check:

```sql
SELECT template_version,
       (deep_reveal_json->>'explanation') ~ '\mc[0-9]+' AS has_raw_coord
  FROM explanation_cache ORDER BY created_at DESC LIMIT 1;
```

**Result on staging 2026-08-04**: after the truncate (13 → 0), one real deep-reveal request through
the deployed app repopulated the table — 1 row, `template_version = 'v3'`, `has_raw_coord = false`,
explanation beginning "You should have played the center move in column 4 because, in the opening,
…". Regeneration under the new code confirmed end-to-end.

### Roll back

**Not reversible — `explanation_cache` regenerates on next request.** There is no restore path for
the truncated rows (and none is needed — they are re-derived content, not user data); every future
`/api/explain-move-llm` cache-miss simply repopulates the table under the new code.

## Spec 057 (Epic 10) US4 — `blunders.quality` regenerate after making `scoreMove` the sole grader (T035/FR-019a)

**Status**: **DONE 2026-08-04 (staging)** — `TRUNCATE TABLE blunders;` run; verified `count(*) = 0`. (The table was already empty at 0 rows pre-truncate, so this was a confirmed no-op on staging, not a discard.) **PENDING (production).**
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

**CORRECTED 2026-08-04 — same undefined-variable defect as the `explanation_cache` entry above**
(`$STAGING_DATABASE_URL` is set nowhere; the unquoted expansion silently targets the local default
database instead of erroring). Use the env file:

```bash
cd connect-four

# staging
node --env-file=server/.env.staging -e 'process.stdout.write(process.env.DATABASE_URL)' \
  | xargs -0 -I{} psql "{}" -c "TRUNCATE TABLE blunders;"

# production (after staging is verified clean)
node --env-file=server/.env.production -e 'process.stdout.write(process.env.DATABASE_URL)' \
  | xargs -0 -I{} psql "{}" -c "TRUNCATE TABLE blunders;"
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

## Papergames account-ID validation (2026-08-25 production hotfix)

**Status**: PENDING — one manual data correction on production
**When**: after the code deploy (already deployed to production as `main`@231ef48, deployment `be005f16`)
**Blocks**: nothing — the app works; this one profile cannot import until its ID is corrected
**Applies to**: production

### What's wrong

The production profile for user `3a83545e-87e8-4dc8-9c87-3441a0342244` stores
`papergames_id = 69e77229f8f489b51eabd6eb`, which does not resolve on Papergames —
`GET https://papergames.io/api/profile/69e77229f8f489b51eabd6eb` answers 404
`{"message":"User with this email does not exist"}`. Every import attempt since at least
2026-08-19 failed. The correct ID for that account (`elsonidoq`) is
`69e773d36bf9938bffc1509a`, which answers 200 with `count: 1325`.

The deployed code now rejects a non-existent ID at save time and reports a 404 as
"Papergames account not found" rather than "API unreachable", but it does **not** rewrite
the value already stored — that is this step.

### Run it

Through the app, as the affected user (preferred — exercises the new validation):
Settings → Papergames Import → replace the ID with `69e773d36bf9938bffc1509a` → Save.
A wrong value now fails at Save with a plain error instead of failing minutes later inside
the import job.

### Verify

Re-run the import and read the production deploy logs (Railway service `4enlinea-production`,
filter `import`). Success looks like `[importForUser] API total rooms: <n>` followed by
`Done — imported: …`. Failure still looks like `Papergames account not found: <id>`.

### Roll back

Nothing to roll back — this only replaces one profile field with a correct value.

## QA remediation 2026-09-09 (OI-163…OI-181) — Coach TTS for the four new sparring-review summary keys

**Status**: PENDING (all environments — the clips do not exist in the repo at all yet)

**Applies to**: local, staging, production. This is a **content/asset** step, not a schema or data step.

**When**: **After** the code deploy, or any time — the app degrades gracefully. A coach key with no
approved clip ships **text-only**, which is the pre-existing behaviour for every un-approved
`coach.spoken.*` key. Nothing breaks while this is outstanding; two of the four post-game summary bands
are simply silent.

**Blocks**: nothing. It is a quality gap, not a functional prerequisite.

### What's wrong (or: what this sets up)

OI-174 subdivided the single post-game `coach.spoken.sparring.review.mistakes` pool into accuracy bands
(`server/selectReviewSummaryPool.js`). Four new i18n keys were added to **both** `src/i18n/en.json` and
`src/i18n/es.json`:

```
coach.spoken.sparring.review.mistakesStrong.0
coach.spoken.sparring.review.mistakesStrong.1
coach.spoken.sparring.review.mistakesRough.0
coach.spoken.sparring.review.mistakesRough.1
```

Coach audio is keyed by the **i18n key** (not by a text hash, unlike lesson audio), so a new key means a
new clip. All four sit at `status: "needs_audio"` in `server/tts-registry.json` and
`server/tts-registry.es.json` today, and the manifest the app actually plays contains **approved slugs
only** — so those two bands currently ship with text and no narration.

The eight clips (4 keys × en/es) **were** generated during the session and then **quarantined**, not
committed. Reason: `generate-tts.js` leaves a fresh clip at `status: "awaiting_approval"`, the manifest
filters to `status === 'approved'`, and `tests/unit/coachSpokenNamespace.test.js`'s orphan assertion
treats any on-disk mp3 absent from the manifest as an orphan — so `test:fast` went red (1831 → 1829/2)
with the clips present. Marking them `approved` by hand would falsify the registry's only purpose
(recording that a **human listened**), and relaxing the test to accommodate premature work is the wrong
trade. The contradiction — an `awaiting_approval` clip cannot exist without a red suite — is filed as
**OI-184**.

The quarantined mp3s are in this session's scratchpad:

```
/private/tmp/claude-501/-Users-elsonidoq-prog-cuatro-en-linea--claude-worktrees-e2e-qa-enablement/2840106b-5bd3-4958-bfd1-598b66d5693b/scratchpad/pending-coach-audio/{en,es}/
```

**That directory is ephemeral** — treat it as already gone. Regenerating costs one API call per clip;
do not build any recovery procedure around it.

### Run it

From `connect-four/`, one command per key (the `--key` form is what keeps the blast radius to these four):

```bash
cd connect-four
node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.mistakesStrong.0 --lang all
node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.mistakesStrong.1 --lang all
node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.mistakesRough.0  --lang all
node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.mistakesRough.1  --lang all
```

`--lang all` does en **and** es in one pass. `OPENAI_API_KEY` is present in `connect-four/server/.env`
(remote containers have no `.env` — run this locally).

> **Never run the generator without `--key` here.** `--all-new` synthesizes **every** key currently at
> `status: needs_audio`, which includes pre-existing keys that are none of this change's business
> (`coach.spoken.forfeited_win.*`, and `sparring.resignNoMoves` added by OI-163 — that one is a
> `sparring.*` UI string, not a `coach.spoken.*` key, so it is not in the registry at all and ships
> silent like the existing `sparring.draw` line). `--reset` is worse: it **discards every approval** in
> the registry. `--sync` is the safe one — it merges new keys in as `needs_audio` and preserves existing
> statuses.

Then **approve each clip in `/admin/audio`** (localhost-only admin page). Approval is a deliberate human
act: it records that someone listened. Until a clip is approved it is not in the manifest, the app will
not play it, and `test:fast` will fail on the orphan assertion — so **generate and approve in one
sitting**, or not at all. `/admin/audio` has two players on different paths; the one that matters is the
coach namespace.

### Verify

```bash
cd connect-four && npm run test:fast
```

**Success condition**: exits 0 with **1843 pass / 0 fail** or higher, and no orphan failure from
`tests/unit/coachSpokenNamespace.test.js`. Then confirm all four keys read `"status": "approved"`:

```bash
cd connect-four && node -e "
const r=JSON.parse(require('fs').readFileSync('server/tts-registry.json','utf8'));
const a=Array.isArray(r)?r:(r.clips||[]);
console.log(a.filter(c=>/mistakes(Strong|Rough)/.test(c.key)).map(c=>c.key+' '+c.status).join('\n'));
" # expect 4 lines, all 'approved'
```
Repeat against `server/tts-registry.es.json`. End-to-end narration in a deployed environment is
`staging_checks.md` § Epic 13 item 9.

### Roll back

Delete the eight mp3s and set the four registry entries in each language file back to
`"status": "needs_audio"` with `generated_at`/`approved_at` `null`. The app returns to shipping those two
bands text-only — the current behaviour — so the rollback is safe and lossless.

---

## QA remediation 2026-09-09 — OI-170 puzzle visibility: code-only, NO data step

**Status**: **N/A — nothing to run.** Recorded explicitly so nobody manufactures a backfill for it.

**Applies to**: none. **When**: n/a. **Blocks**: nothing.

### What's wrong (or: what this sets up)

OI-170 was that `/api/puzzles/counts` and `/api/puzzles/draw` disagreed about which rows are visible:
`draw` additionally required `position IS NOT NULL`, so `/setpicker` advertised sets the draw endpoint
returned nothing for. `promotePuzzleRow.js` never sets `position` (only
`POST /api/admin/puzzles/reindex` does), so in a freshly generated pool **every** row has
`position = NULL` and 3 of the 4 paid categories drew zero puzzles.

The fix **removed `position` from the visibility filter** (`server/puzzlePool.js`'s
`applyVisibilityFilter` is now exactly `is_active = true` + the optional category). It did **not** change
what any row means.

**Therefore: no backfill, no content regeneration, no reindex is required.** A pool full of
`position = NULL` rows is fully drawable as-is the moment this code deploys. Do not queue a data step
for this; do not read the deployed pools' NULL `position` values as damage needing repair. `position`
survives only as an **ordering hint** — `applyPoolOrder` sorts on it with `nullsFirst: false` plus `id`
as a stable tiebreak, so un-indexed rows sort last and are still served.

### Optional follow-up (a quality improvement, never a prerequisite)

`POST /api/admin/puzzles/reindex` assigns `position` round-robin over `shape_key` groups, which restores
**shape diversity in the draw order**. Running it makes a drawn set feel more varied. Not running it
costs nothing but ordering variety, and playability is unaffected either way. If you run it, run it
**after** the code deploy; it is idempotent.

### Verify

The thing worth measuring in a deployed environment is not this step but the **data** question:
per-category, does the count `/api/puzzles/counts` advertises equal the number `/api/puzzles/draw` can
serve? That is `staging_checks.md` § Epic 13 item 3, and it stays owed.

### Roll back

Nothing to roll back — no data was written.

---

## QA remediation 2026-09-09 — lesson-05 text change: two mp3s replaced (no deploy action)

**Status**: **N/A — no deploy step**, provided the working tree is committed as a whole. Recorded because
the file set is easy to split by accident.

**Applies to**: none (the assets ship inside the image).

### What's wrong (or: what this sets up)

OI-164 corrected `lessons/lesson-05-opening-imitate.json` slide 0 ("three times" → "twice", "tres veces"
→ "dos veces"). Lesson audio is keyed by `sha256(text)[:16]`, **not** by i18n key, so changing the text
changes the filename. The two replacement clips were regenerated in-session with the `locator` argument
(without it the generator re-synthesizes **every** clip in the lesson) and the two superseded files were
deleted from `connect-four/public/audio/lessons/`:

| | old (deleted) | new (added) |
|---|---|---|
| en | `bfc591f0df6cddbb.mp3` | `7612b7b4c00593c3.mp3` |
| es | `c02bdb6d2eedaad1.mp3` | `1e87d2b2dd1b1103.mp3` |

`public/` is copied verbatim by `vite build`, so the clips ship with the image and there is nothing to run
against a deployed environment.

**The one hazard**: the two additions are untracked and the two deletions are unstaged. Committing the
lesson JSON without them ships text that no clip matches — `tests/lessons/lessonAudioTextHashParity.test.js`
(new, wired into `test:fast`) turns that into a red gate rather than a silent stale recording, which is
the point of adding it. Commit all four paths together with the lesson JSON.

### Verify

```bash
cd connect-four && npm run test:fast
```
**Success condition**: exits 0; specifically `lessonAudioTextHashParity` and `lessonAudioCoverage`
(the "zero orphans" prune-parity check) both pass.

### Roll back

Restore the previous lesson JSON text and the two deleted mp3s from git; delete the two new ones.

---

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
