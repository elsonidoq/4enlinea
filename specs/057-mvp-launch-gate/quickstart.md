# Quickstart: MVP Launch Gate

How to exercise each user story's Independent Test locally, once its tasks are implemented. This is
a verification quickstart, not a build/install guide — the app is already runnable per the repo's
standing dev setup.

## Before any story

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
eval "$(./worktree-ports.sh)"     # always, unconditionally — see docs/architecture/worktree-conventions.md
cd connect-four
npm run test:fast                  # baseline — expect 5 RED until US5 lands, 0 RED after
```

## US1 — pool health & grading correctness

```bash
# a) Re-measure active-puzzle counts per category, per environment (read-only, safe to run anytime):
node -e '... see research.md "Pool counts per environment" for the exact query shape ...'

# b) verify-undercut-puzzles.mjs must return real rows (FR-002/OI-130):
node scripts/verify-undercut-puzzles.mjs   # expect: 25 active undercut rows returned, not 0

# c) Regression test — a stale-metadata row cannot grade a correct answer wrong (FR-006):
node --test server/tests/<the new or extended test file for FR-006>

# d) Fill any below-floor category.
# LOCAL (agent-run OK — requireLocalhost admin endpoints are reachable):
node server/scripts/generate_all_candidates.mjs --category <cat> --count 10 --port $API_PORT
# then promote via POST /api/admin/candidates/approve-batch or the CurationWorkspace admin UI.
# STAGING/PRODUCTION (owner-run only — the admin endpoints above cannot reach these environments):
node server/scripts/fill-candidate-pools.mjs --env staging          # dry-run report
node server/scripts/fill-candidate-pools.mjs --env staging --apply  # promotes/inserts, typed confirmation
# production requires the script's explicit --i-understand-this-is-production flag too
```

**Independent Test success condition** (from spec.md): every servable category ≥ 20 active puzzles
on staging AND production (not local-only), and every live `overcut`/`undercut`/`z_threat` row
re-derives identically or has been dispositioned per D1.

## US2 — no internal token or unhighlightable claim reaches player-facing prose

```bash
# Real reproduction (not an invented fixture) — the OI-126 board:
node -e "
  const { stripInternalTokens } = require('./server/reasonRenderGuard.mjs');
  // load the real served explanation string for board 455c5272-3143-43d4-aa3f-c10f9d061666
  // (see OI-126's repro in docs/open_issues.md for how to fetch/reconstruct it)
  console.log(stripInternalTokens(realExplanationText, 'en'));
  console.log(stripInternalTokens(realExplanationText, 'es'));
"
# success: no c\d, c\d-c\d, or c\dr\d survives, in either locale
```

**Independent Test success condition**: bare/ranged/paired forms all stripped, in both locales, from
the real OI-126 string.

## US3 — billing recovery and conversion

```bash
eval "$(./worktree-ports.sh)"
npm run build
node server/index.js    # serves the built dist/ — CSP is only real under a production build
# then in a real browser: open /pricing?_ptxn=<any id>
```

**Independent Test success condition**: Paddle.js initializes on mount (visible in Network tab
without clicking anything), checkout auto-opens for a real `_ptxn`, zero `Refused to ...` CSP console
lines. (Real sandbox transaction verification is owner-only, per FR-014/FR-016 — recorded in
`staging_checks.md`, not exercised here.)

For the locked-lesson copy branch (FR-017): open a locked lesson signed-out, confirm "Sign in" copy;
sign in as a free-tier user, open the same lesson, confirm "Upgrade" copy.

## US4 — grading stability

```bash
# Exercise a known boundary-case move through both paths and diff the `quality` output:
node --test server/tests/<the new or extended test file for FR-020>
```

**Independent Test success condition**: identical `quality` label from `scoreMove` (live) and from
`reconstructAnalysisFromBlunders` → `classifyStoredMistake` (cached) for the same boundary-case move.

## US5 — release gate and deploy trustworthiness

```bash
cd connect-four
npm run test:fast
# success: 0 failures (this plan's target), or every remaining failure has a docs/open_issues.md OI-N
```

```bash
# OI-31/OI-105 — measurement, not code:
psql "$DATABASE_URL" -c "SELECT filename FROM schema_migrations WHERE filename LIKE '06%' ORDER BY filename;"
# compare against `ls server/migrations/` — see research.md for the expected current-state diff
```

OI-5's probe (`connect-four/scripts/probe-refresh-rotation.mjs`) is owner-only — requires a real
account's credentials; recorded as a `staging_checks.md` sign-off, not run here.

## Full launch-readiness check (FR-030, epic-wide)

```bash
# Once every story above is either shipped or explicitly deferred with a reason:
/usr/bin/grep -c "OI-9\[2568\]\|OI-8[36]\|OI-130\|OI-126\|OI-124\|OI-129\|OI-98\|OI-95\|OI-41\|OI-104\|OI-125\|OI-82\|OI-5\b\|OI-31\|OI-105" docs/open_issues.md
# manual check: each of the 16 has a disposition recorded, per FR-027
```

The closing summary must state, per story, shipped-or-deferred-with-reason, and a direct
launch-readiness answer (FR-030) — this quickstart verifies the mechanics; the launch-readiness
statement itself is a written closeout artifact, not a script output.

---

## Launch-readiness statement (FR-030, T054) — 2026-08-04

**Per-story disposition:**

- **US1 (pool-health & grading correctness) — SHIPPED, code-complete; live-data half is
  owner-gated.** `evalOvercut`/`evalUndercut`/`evalZThreat` now cross-check solver-gated
  `correctCols` everywhere, closing the player-facing half of OI-92 immediately, on every
  environment, with no data write required. The data half — retiring stale `overcut`/`undercut`
  rows and refilling every below-N=20 category — has a reviewed, dry-run-verified mechanism
  (`fill-candidate-pools.mjs`) but has **only been run locally**; staging (12/12 categories below
  floor) and production (4/12 below floor) still need the owner to run `--apply`. OI-130 (verify
  script's dead `approved` filter) is fully fixed. OI-133 (4 undercut rows, production-only) was
  newly discovered and is owner-gated the same way.
- **US5 (test-suite/deploy trustworthiness) — SHIPPED.** `test:fast`'s 5 pre-existing RED tests are
  now 0 RED (stale fixture paths fixed); the migration-ledger/pooler discrepancies (OI-31, OI-105)
  were measured live and documentation-reconciled. OI-5 (refresh-token-rotation probe) remains
  owner-gated — needs real account credentials no agent session has.
- **US2 (response-boundary text integrity) — SHIPPED.** `stripInternalTokens` now catches bare and
  ranged coordinate tokens (OI-126), and `validateAnnotation` is wired into the live response seam
  with strip-and-log enforcement (OI-124), per the owner's D3 ruling. OI-129 (unannotated named
  regions) was deliberately measured (60% on a 19-row sample, below the 50-row target) and left
  unfixed this batch — a real, non-trivial rate, but the fix is prompt-side/a new predicate, out of
  this batch's response-seam-integrity scope, and the sample should widen post-launch before
  committing to a design.
- **US4 (single quality-grading criterion) — SHIPPED.** `scoreMove` is now the sole grader of the
  game-move `quality` label (D4, FR-019a); `classifyStoredMistake`'s own grading was deleted. The
  puzzle-answer domain's "accepted gate" client-side override is a deliberately separate, unfixed
  domain (OI-134, filed per the owner's explicit scope ruling, T057) — FR-019a's "one criterion" is
  scoped to game moves only and this document does not overclaim it as covering puzzle answers too.
  `POST /api/blunders` was retired (no client caller and no in-scope score-pair grading path once
  `classifyStoredMistake` was narrowed to eligibility-only — recorded as a code comment at the
  former route in `server/index.js` ("POST /api/blunders — RETIRED"), not an open-issues entry;
  OI-134 is the separate, still-open issue about the puzzle-answer accepted-gate override above).
- **US3 (entitlement/payment last-mile UX) — SHIPPED, client half; owner sign-off pending.**
  `/pricing?_ptxn=` now initializes Paddle.js on mount and auto-opens the checkout for that
  transaction (T041, closing OI-98's code half); the signed-out-vs-free-tier lock-copy distinction
  is shipped end-to-end (`sagaLock.js` → `SagaScreen.jsx` → `AuthModal.jsx`, OI-95 fully fixed,
  including a real bug found and fixed en route — `getEntitlement()`'s own return statements were
  dropping `authenticated`). OI-41 is re-confirmed as a narrowed, accepted risk scoped to
  `/pricing-legal`'s literals only (not a launch blocker); the owner still needs to make the
  explicit won't-fix-or-keep-open call. Two owner-only verifications remain per T049: a real
  production-build browser CSP check on the new mount-time path, and a real Paddle sandbox
  transaction confirming the payment-method-update email actually opens a checkout.

**Owner-gated items still pending, named in full (nothing above is silently deferred):**

1. `fill-candidate-pools.mjs --apply` against staging AND production (US1, Decision D-b) —
   staging 12/12 categories below floor, production 4/12 below floor.
2. The `061_correct_cols`/`062`/`063`/`064` migration backlog — **unapplied on both staging and
   production**. This is the single hardest blocker: `correct_cols` does not exist as a column on
   either live environment, so US1's grader fix is inert there and item 1 above cannot even run
   until this ships.
3. OI-5's refresh-token-rotation probe (US5) — needs real account credentials.
4. FR-014's CSP check against a real production build in a real browser, and FR-016's real Paddle
   sandbox transaction (US3, T049) — `VITE_PADDLE_CLIENT_TOKEN` is unset locally; CSP is invisible
   under `npm run dev`.
5. `explanation_cache` TRUNCATE (US2) and `blunders` regenerate (US4) — both queued PENDING in
   `docs/deployment_steps.md`, not reversible, owner-run against staging then production.
6. OI-41's explicit won't-fix-or-keep-open call (US3, T047) — an accepted-risk framing is proposed;
   the owner has not yet signed off on either option.

**Direct answer: the owner cannot launch today.** Every story's *code* is shipped, tested (1725/1725
`test:fast`, 72/72 `test:dom`, 0 unexplained failures), and independently reviewable — but "the code
is done" and "the app is deployable" are different questions, and this feature's own binding
constraint (no agent writes to staging or production) means the second question has real,
unclosed items only the owner can close: two live schema migrations are unapplied (blocking US1's
grading fix from having any effect on live puzzle content), all 12 puzzle categories are below the
serving floor on staging, and two Paddle/CSP verifications and one auth probe still need a human in
a real browser or a real credential. None of these six items is a code defect — they are exactly the
live-data and owner-action choreography `CLAUDE.md`'s pre-launch disposability rule intentionally
deferred to this closeout. Once items 1-4 above are run and items 5-6 are explicitly closed, launch
is unblocked; until then, the honest status is **implemented, not yet deployable**.
