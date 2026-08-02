# Implementation Plan: Server/API Data Integrity & Environment Correctness

**Branch**: `054-server-api-data-integrity` | **Date**: 2026-08-02 | **Spec**: `specs/054-server-api-data-integrity/spec.md`
**Input**: Feature specification from `specs/054-server-api-data-integrity/spec.md` (Epic 4, `docs/epics/open-issues-epics.md`)

## Summary

Four independently-shippable fixes to `connect-four/server/`, one client file
(`src/screens/ChallengeScreen.jsx`, four touch points — see Decision 2 below), and two dev-tooling
files (`vite.config.js`, `server/index.js`'s worktree self-derive), plus two ops verifications:

1. **US1**: Replace two `'anonymous'`-literal `device_uuid` fallbacks (`server/index.js:2514`,
   `:1897`) with a stable, reproducible identifier — a server-minted `dc4_device_uuid` cookie only
   (see `research.md` D1, amended: FR-001's client-body clause is struck — `ChallengeScreen.jsx`
   sends nothing, the cookie alone makes the identifier reproducible via `credentials: 'include'`).
   Thread `data.user.email` into `req.user`. Fix `chooseSparringMove`'s `col: undefined` on a full
   board.
2. **US2**: Add a JS-comparator `id` tiebreaker to `GET /api/games`'s in-memory sort (no SQL
   pagination exists there — see `research.md` D2, the epic's explicit "audit, don't copy" case),
   a SQL `id ASC` tiebreaker to `GET /api/admin/candidates` (D3), and a unique index +
   upsert-ignore-duplicates fix to the candidate-insert retry, now with the same live-DB
   duplicate-row pre-check and dedupe discipline as migration 063 (D4).
3. **US3**: Normalize the server's raw `evaluatePredicate` outcome vocabulary before insert,
   narrow the `puzzle_attempts.outcome` CHECK constraint (migration 063, sequenced strictly before
   any `'incorrect'`-emitting writer per FR-023a), fix four `ChallengeScreen.jsx` outcome sites,
   and extend the anonymous-caller analyze cache-check (D6).
4. **US4**: Make the worktree self-derive fatal-on-failure only inside a linked worktree (D7,
   never inside the Railway build container or the main checkout), suppress leaked stderr, and run
   four ops verifications (migration 057 carryover, staging pooler port — local `.env.staging`
   confirmed on the forbidden 6543 transaction pooler, but Railway's actually-injected value is
   still unverified, see research.md D9 — refresh-rotation probe, and both fail-loudly injection
   tests), recording each in `staging_checks.md`.

Every open issue this epic covers gets a dated closeout entry in `docs/open_issues.md`
(`FR-033`), and both `npm run test:fast` (run from `connect-four/`, baseline 5 pre-existing RED per
`project_repo_worktree_setup` memory) AND `npm run test:dom` (baseline established during Phase 2/3
before being treated as a gate — see Decision 3) must pass after every user story (`FR-034`,
amended).

## Technical Context

**Language/Version**: Node.js (ESM, `"type": "module"` — `connect-four/package.json`), React 18 (client)
**Primary Dependencies**: Express 5.2 (`connect-four/package.json:27` `"express": "^5.2.1"` —
`connect-four/server/package.json` does not exist; there is one `package.json` for the whole repo),
`cookie-parser` 1.4.7 (already mounted, `server/index.js:7,197`; declared `connect-four/package.json:26`),
`@supabase/supabase-js` (service-role client), `pg` (raw pool, `server/migrate.js`)
**Storage**: Supabase Postgres — `puzzle_attempts`, `candidates`, `games`, `papergames_games`,
`blunders` tables (`docs/architecture/db-schema.md`)
**Testing**: Node's built-in `node --test` runner via three separate, non-chained npm scripts
(`connect-four/package.json` `scripts`), none of which use globs — each is an explicit,
hand-maintained list of file paths passed to `node --test`, so a new test file that is not appended
to the relevant list's array simply never runs (`connect-four/tests/blunder/blunderTagConstraint.test.js`
is a live example: it exists on disk today but appears in NEITHER `test` nor `test:fast`, an
already-dead guard test — tasks.md must not repeat this mistake for any file this epic adds):
`test` (line 16, the broadest list, includes `tests/integration/candidate-generator.test.js`),
`test:fast` (line 17, excludes `tests/integration/candidate-generator.test.js` deliberately —
solver-IPC hangs, per `CLAUDE.md` "Running tests" — and excludes all `tests/dom/*`), and `test:dom`
(line 14, `node --import ./tests/dom/setup.js --test tests/dom/ErrorBoundary.dom.test.jsx ... ` — 13
individually-named files, NOT a glob; `tests/dom/*.dom.test.jsx` was an earlier, incorrect citation
in this doc and has been corrected). This epic's FR-034/SC-010 gate is only meaningful if every new
test file this epic writes is added to the correct list(s) — tasks.md includes an explicit task for
this in each story phase. `server/index.js` exports no `app` (no `export default app`/`module.exports
= app`) — it is not HTTP-harness-testable; per `server/anonBlunderAccess.js:2-3`'s documented
convention, handler branch logic that needs a unit test is extracted into its own pure module,
imported by both `index.js` and a `tests/unit/*.test.js` file (e.g.
`tests/unit/coachQueuePagination.test.js` importing `server/coachQueuePagination.js`). This plan's
FR-005/FR-011/FR-012b test tasks follow that extraction pattern; see Source Code map below for the
named modules.
**Target Platform**: Railway-hosted Node server (`connect-four/railpack.json`
`deploy.startCommand: "node server/migrate.js && node server/index.js"`) + static Vite build;
local dev via `npm run dev`
**Project Type**: Web application — `connect-four/server/` (Express API) + `connect-four/src/`
(React SPA), single repo, no separate frontend/backend package boundary beyond the directory split
**Performance Goals**: N/A — this epic is correctness-only; no new latency-sensitive path (the
anonymous analyze cache-check in US3 *reduces* solver load, it doesn't add a budget)
**Constraints**: `npm run test:fast` AND `npm run test:dom` must both pass after every user story
(FR-034, amended — see Decision 3 in the plan-critique record); the outcome-CHECK migration (063)
must be applied before its writers ship in every environment (FR-023a — a deploy-ordering
constraint, not just a code-ordering one); migration 062's unique index must be preceded by a
live-DB duplicate-row check and dedupe step, mirroring 063's FR-017 discipline (no longer an
asymmetric exception — see D4a in research.md)
**Scale/Scope**: 4 user stories, ~34 functional requirements, 2 new SQL migrations, ~10 server
handler edits, 3 new extracted pure-decision modules (+ their `test:fast` unit tests), 4 named
client-side touch points in one file (`test:dom`), 2 dev-tooling files, 4 ops verifications recorded
in `staging_checks.md`, 12 open issues closed out

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

- **I — Explanation Engine as SSOT**: N/A. This epic touches no move-evaluation, pattern-labeling,
  or LLM-annotation path — `evaluatePredicate` (`server/predicates.js:95`) is a puzzle
  correctness/outcome check, not the Explanation Engine, and US3's normalization only changes what
  string is written to `outcome`, not the evaluation logic itself. PASS.
- **II — Code Quality & Simplicity**: The anonymous analyze cache-check (D6) explicitly factors the
  shared reconstruction logic (`server/index.js:2202-2269`) into one helper reused by both the
  authenticated and anonymous branches, rather than duplicating ~70 lines — required by this
  principle's "no half-finished implementations" / simplicity framing. The device-identifier
  resolution (D1) is one small shared helper (`resolveDeviceUuid`), not copy-pasted at both fix
  sites. PASS, with the helper-extraction called out explicitly in tasks.md.
- **III — Testing Standards**: FR-005, FR-011, FR-012b, FR-023 all mandate new automated tests;
  none of this epic's fixes are solver-dependent (no pattern classification/goal-predicate changes
  requiring the real C++ solver), so the existing `node --test`-based suites are the correct
  vehicle — no new integration-test category needed. Two existing, non-chained npm scripts both
  apply: `test:fast` for every server-side unit test in this epic (FR-005, FR-011, FR-012b, and the
  FR-023 server-writer/constraint tests), extracted into named pure-decision modules per
  `server/anonBlunderAccess.js`'s precedent since `server/index.js` exports no testable `app`
  (`server/deviceIdentity.js` for `resolveDeviceUuid`'s both branches — FR-005;
  `server/gamesSort.js` for the `unified.sort()` comparator's tiebreaker — FR-011; an
  `outcomeVocabulary.js`-style pure map for FR-015/FR-023's normalization); and `test:dom` for the
  four `ChallengeScreen.jsx` outcome-site tests FR-023 also mandates, which need jsdom and cannot
  run under `test:fast`. FR-034's gate is amended accordingly (Constraints above). PASS.
- **IV — UX Consistency**: N/A — no board visualization, terminology, or progressive-disclosure
  surface changes. The `chooseSparringMove` terminal-signal fix (FR-008) changes an API response
  shape, not a UI pattern; the calling UI code path is unaffected by this plan (out of scope per
  spec.md — only the endpoint's signal changes, not client handling of it, since no client
  currently calls `/api/scores` on a definitionally-full board in normal play). PASS.
- **V — Performance**: N/A budget-wise; US3's anonymous cache-check is a net latency *improvement*
  (skips a solver re-run) with no new budget to violate. PASS.
- **VI — Implementation & Debugging Methodology**: Directly followed in this plan — every fix cites
  a concrete `file:line` reproduction of the current behavior (not theorized), FR-017 requires
  querying the live DB before writing the migration rather than assuming zero non-conforming rows,
  and R7/D7's worktree-detection design explicitly maps out the three concrete environments
  (linked worktree / main checkout / Railway build container) before writing any fallback logic.
  PASS.
- **VII — Software Design Philosophy**: The `23505`-as-success / unique-index approach (D4) makes a
  previously-silent failure mode (duplicate insert) explicit and provably safe rather than merely
  less likely; the outcome-normalization fix (FR-015) replaces a silently-dropped insert with an
  explicit, correct one. Consistent with "errors MUST NOT pass silently." PASS.
- **VIII — Documentation**: See checklist below. `docs/architecture/api-conventions.md` (`req.user`
  shape, `:29`), `docs/architecture/data-model.md` (Puzzle Attempts §, `:402-406`),
  `docs/architecture/worktree-conventions.md` (fail-loudly guarantee), and `docs/open_issues.md`
  (12 closeout entries) are all named documentation targets in the FRs themselves (FR-009, FR-021,
  FR-027, FR-033) — tasks.md must include one task per target, not bundle them into code tasks.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (`docs/architecture/api-conventions.md`,
  `server-conventions.md`, `data-model.md`, `db-schema.md`, `worktree-conventions.md`,
  `testing-conventions.md`), the epic (`docs/epics/open-issues-epics.md` §Epic 4), and
  `docs/open_issues.md`'s 12 named issues were read before this plan was drafted (see citations
  throughout `research.md` and this file).
- [x] No undocumented convention was discovered mid-review that blocks planning — the two
  design gaps the spec deliberately left open (cookie mechanics, migration numbering) are resolved
  in `research.md` D1/D8 rather than being undocumented gaps in *existing* conventions.
- [x] tasks.md (Phase 2, not produced by this command) will include explicit documentation tasks:
  `api-conventions.md` `req.user` shape (FR-009), `data-model.md` Puzzle Attempts §(FR-021),
  `worktree-conventions.md` fail-loudly guarantee (FR-027), and 12 `open_issues.md` closeout
  entries (FR-033).

**Result**: No violations. Complexity Tracking table below is empty by design.

## Project Structure

### Documentation (this feature)

```text
specs/054-server-api-data-integrity/
├── plan.md              # This file
├── research.md          # Phase 0 output — D1-D8 design decisions, all code-cited
├── data-model.md         # Phase 1 output — schema deltas (this feature only)
├── quickstart.md         # Phase 1 output — manual verification per user story
├── contracts/
│   └── api-changes.md   # Phase 1 output — request/response shape changes to existing endpoints
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT produced by this command)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js                    # US1: :2514, :1897 device_uuid fixes; :506-531 loadUser
│   │                                #   (thread email); :990-1013 chooseSparringMove terminal
│   │                                #   signal; :64-78 resolveWorktreePortEnv (US4)
│   │                                # US2: :1971-2126 GET /api/games tiebreaker; :2977-3009
│   │                                #   candidate-insert retry; :3123-3172 GET /api/admin/candidates
│   │                                #   tiebreaker
│   │                                # US3: :2461-2552 POST /api/puzzles/:id/check outcome
│   │                                #   normalization; :2131-2270 POST /api/games/analyze
│   │                                #   anon cache-check
│   ├── classifier.js               # US1: :518-549 chooseSparringMove
│   ├── migrations/
│   │   ├── 062_candidates_generation_run_unique.sql   # NEW — US2/FR-012; pre-check for existing
│   │   │                                              #   (generation_run_id, move_string)
│   │   │                                              #   duplicate groups + deterministic dedupe
│   │   │                                              #   ordered by (created_at, ctid) — NOT id (candidates.id is a
│   │   │                                              #   random UUID, 007_puzzle_factory.sql:18) —
│   │   │                                              #   BEFORE the CREATE UNIQUE
│   │   │                                              #   INDEX — same discipline 063 already had,
│   │   │                                              #   the prior asymmetry is fixed (research.md D4a)
│   │   └── 063_puzzle_attempts_outcome_narrow.sql     # NEW — US3/FR-016/FR-017; remap splits
│   │                                                  #   'correct_retry'→'correct_first' and
│   │                                                  #   'revealed'→'abandoned' (Decision 1, no
│   │                                                  #   longer a single NOT IN(...)→'abandoned')
│   ├── deviceIdentity.js           # NEW — US1/FR-005: resolveDeviceUuid(req, res, bodyValue), both
│   │                                #   branches (cookie/body present vs. absent), imported by
│   │                                #   index.js AND its own test.mjs — anonBlunderAccess.js pattern
│   ├── gamesSort.js                # NEW — US2/FR-011: the unified.sort() comparator + id
│   │                                #   tiebreaker, imported by index.js AND its own test.mjs
│   ├── outcomeVocabulary.js        # NEW — US3/FR-015/FR-023: evaluatePredicate-result → stored-enum
│   │                                #   map ('correct'→'correct_first', 'wrong'→'incorrect',
│   │                                #   'tied'→'tied'), imported by index.js AND its own test.mjs
│   ├── userHelpers.js              # US1: USER_PROFILE_SELECT_COLUMNS (email is NOT added here —
│   │                                #   see research.md/data-model.md: email is threaded onto
│   │                                #   req.user directly from the auth object, not a users-table
│   │                                #   column, per FR-006's "no new database column required")
│   ├── .env.staging                # US4/FR-029: local file confirmed on port 6543 (forbidden for
│   │                                #   migrate.js's BEGIN/COMMIT DDL); fix target is whatever
│   │                                #   Railway actually injects for staging migrations, verified
│   │                                #   first (research.md D9) — not necessarily this file
│   └── worktreePorts.js            # NEW — US4/FR-025/FR-026 (research.md D7 amendment, plan-critique
│                                    #   step): shared module holding the GIT_DIR/GIT_COMMON detection
│                                    #   + fatal-vs-fallback decision, imported by BOTH index.js's
│                                    #   resolveWorktreePortEnv() (:64-78) AND vite.config.js's
│                                    #   resolvePorts() — replaces what would otherwise be duplicated
│                                    #   detection logic (T039/T040 in tasks.md's original draft);
│                                    #   does NOT violate the Out-of-Scope boundary, which forbids
│                                    #   rewriting worktree-ports.sh itself, not a Node-side module
│                                    #   consumed by its two self-derive consumers
├── vite.config.js                  # US4: resolvePorts() — stdio suppression + fatal-in-worktree;
│                                    #   imports connect-four/server/worktreePorts.js's shared check
├── src/screens/ChallengeScreen.jsx # US3 only, 4 sites (~:408, ~:584, ~:659 unchanged, ~:668 new
│                                    #   write; tested under the new
│                                    #   tests/dom/challengeScreenOutcome.dom.test.jsx, which must be
│                                    #   individually appended to test:dom's explicit file list
│                                    #   (package.json:14 — 13 named files, no glob) to run at all —
│                                    #   the two US1 request-body touches (~:511, ~:603)
│                                    #   are STRUCK per Decision 2: device_uuid ships server-only,
│                                    #   via the dc4_device_uuid cookie, no client change
├── docs/architecture/
│   ├── api-conventions.md          # FR-009: req.user shape (add email)
│   ├── data-model.md               # FR-021: Puzzle Attempts § rewrite
│   └── worktree-conventions.md     # FR-027: fail-loudly guarantee
├── docs/open_issues.md              # FR-033: 12 closeout entries
├── staging_checks.md (repo root)    # FR-031: new Epic 4 section
└── worktree-ports.sh                # UNCHANGED — out of scope (Out of Scope §); only its two
                                       #   consumers change
```

**Structure Decision**: Existing single-repo layout (`connect-four/server` API + `connect-four/src`
React SPA under one package, root-level dev tooling and epic/ops docs) — no new top-level
directory or package boundary. All work lands inside files that already exist except the two new
migration files, which follow the existing flat `server/migrations/NNN_description.sql` convention
(`research.md` D8).

## Complexity Tracking

*No violations — table intentionally left empty.*
