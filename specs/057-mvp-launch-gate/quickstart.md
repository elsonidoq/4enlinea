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
