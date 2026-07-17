# Implementation Plan: Past Games & Mistakes — Server Data Integrity

**Branch**: `feature/polish` | **Date**: 2026-07-07 | **Spec**: `specs/041-past-games-data-integrity/spec.md`
**Input**: Feature specification from `/specs/041-past-games-data-integrity/spec.md`; epic source: `polish_epic.md` § Epic 1

## Summary

Six user stories close three independent defect classes in the existing coach/games/import
surface, all already deployed:

1. **Reachability** — `/api/coach/queue` hard-caps at 50 rows with no pagination, so any user
   with >50 blunders permanently loses access to the rest (and `CategoryListScreen`'s cards,
   which read the same truncated page, silently omit whole categories).
2. **Scale correctness** — `/api/stats`, `/api/games`, and `/api/coach/weakness-map`'s RPC-failure
   fallback all fetch full row sets into Node and aggregate in JS; past ~1000 rows Supabase's
   default PostgREST cap silently truncates the result, corrupting every downstream count.
3. **Cross-user ownership collision** — `papergames_games` has a single global
   `UNIQUE(papergames_room_uid)`. When a second user imports a room a first user already
   imported, the upsert (`onConflict: 'papergames_room_uid'`) reassigns the existing row's
   `user_id`, silently transferring the game (and future blunder linkage) away from user A.

The technical approach is: (a) add offset/limit pagination to `/api/coach/queue` — matching the
pagination shape already used by `GET /api/games` and documented for admin list endpoints — and
make every UI/consumer page to completion instead of trusting a single page (User Story 1); (b) add
a new `GET /api/coach/category-counts` endpoint using Postgres `count()` grouped by category —
this ships as part of User Story 2 (it is the mechanism that delivers US2's category cards; it
must exist before `CategoryListScreen` is switched to consume it, so it cannot be deferred to a
later story); (c) separately, convert the three *other* scale-fragile aggregate endpoints
(`/api/stats`, `/api/games` blunder-count enrichment, `/api/coach/weakness-map`'s fallback) from
"select all rows, count in JS" to `count()`/paginated queries (User Story 3) — replicating the
exact current filter set for each (none of which apply a `quality` filter today; see FR-008) and
changing only the aggregation *mechanism*, never adding a filter that isn't there today; (d) a
two-part migration changing `papergames_games` to `UNIQUE(user_id, papergames_room_uid)` and the
blunder dedup index to `UNIQUE(user_id, papergames_game_id, move_index)`, plus the matching
`onConflict` key update in `papergamesImporter.js`; (e) surface the importer's already-computed
error/skip counts to the client and add a Past-Games CTA after import.

**Story ordering note**: because User Story 2 (category cards) consumes the
`/api/coach/category-counts` endpoint, and User Story 3 (scale-correct aggregates) fixes three
*unrelated* endpoints, the category-counts endpoint's creation belongs entirely inside User
Story 2's scope, not User Story 3's — even though both stories touch `count()`-style aggregation,
they are independent pieces of work and must not be bundled into one "aggregates" task group. See
`spec.md` User Story 2 and FR-004/FR-009 (already correctly attributed) and
`contracts/coach-category-counts.md` (titled US1.2, i.e. User Story 2) — this note exists so that
task generation (`/speckit-tasks`) orders US2's endpoint-plus-consumer as one self-contained unit
completed before/without depending on US3.

No new tables. No change to the response *shape* of any endpoint's per-row fields — only
pagination controls and a new endpoint are additive. Historical data (pre-existing
mis-owned games/blunders, pre-existing wrong counts) is explicitly out of scope for repair per
the spec's Out of Scope section — the DB has no real users yet.

## Technical Context

**Language/Version**: Node.js 20.10+ (ESM, `with { type: 'json' }` import attributes already relied on), React 18 (Vite) frontend.
**Primary Dependencies**: Express 5, `@supabase/supabase-js` v2 (service-role client), `node:test` for tests. No new dependencies.
**Storage**: Supabase Postgres (`kxtqwsumojtexokrtlfp`), tables `blunders`, `papergames_games`, `games`, `puzzle_attempts`. Session-pooler (5432) `DATABASE_URL` for migrations via `server/migrate.js`.
**Testing**: `node --test` per `docs/architecture/testing-conventions.md`; run via `npm run test:fast` inside `connect-four/` (excludes `candidate-generator.test.js`). Pure-function-extraction pattern for anything not already testable at the HTTP layer (no supertest harness in this repo).
**Target Platform**: Railway-hosted Node server + Supabase; existing production deploy pipeline (`node server/migrate.js && node server/index.js`).
**Project Type**: Web application — `connect-four/server/` (Express) + `connect-four/src/` (React/Vite frontend), monorepo per `docs/architecture/`.
**Performance Goals**: Aggregate endpoints must stay within the existing 2s Explanation-Engine-adjacent latency norms (constitution §V) even at >1000 rows — achieved by pushing aggregation into Postgres `count()` instead of Node-side JS reduction over a full unbounded select.
**Constraints**: No new RLS policies (service-role key bypasses RLS; existing policies remain defense-in-depth per `data-model.md`/`db-schema.md` security posture). No change to `blunders`/`papergames_games` FK ON DELETE semantics. Migration must follow the DROP-before-ADD ordering convention (`data-model.md` → Migration Naming) since it changes which combination of columns is unique.
**Scale/Scope**: Verified acceptance scale: 137 blunders (US1/US2), >1000 blunder rows and >1000 puzzle-attempt rows (US3), 2-user cross-import collision (US4). 6 user stories, 4 server endpoints touched + 1 new endpoint, 2 migrations, 1 importer function, 3 frontend screens (`CategoryListScreen`, `MistakesListScreen`, `ReviewScreen`'s queue fetch — none of which are the resolve-endpoint caller `MistakeDetailScreen`), 1 new CTA in `SettingsScreen`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — N/A. This feature touches counting/pagination/ownership plumbing, not move evaluation or pattern annotation. No explain-move/coach-prompt path is modified. PASS.
- **II. Code Quality & Simplicity** — Pagination is added additively (new query params, existing response fields unchanged) rather than introducing a new abstraction layer; the category-counts endpoint is a single new route, not a generalized "aggregates" framework. PASS (re-verify at Phase 1 that the DB-side `count()` conversions don't grow into a speculative query-builder).
- **III. Testing Standards** — All four touched endpoints are Supabase-backed (not solver-backed), so the "real C++ binary" requirement doesn't apply; scale correctness (>1000 rows) needs a seeded-data test rather than a solver fixture. Per `testing-conventions.md`, this repo has no HTTP supertest harness — extraction of pure helpers (count-query builders, the ownership-key logic) is required to keep this unit-testable under `node --test`. PASS, with a Phase-1 task to identify the extraction seams.
- **IV. UX Consistency & Progressive Disclosure** — Category cards and queue pagination don't change disclosure model; CTA addition (US1.6) is a straightforward navigation affordance, not a new evaluative surface. PASS.
- **V. Performance Requirements** — Converting JS-side full-table aggregation to `count()` is a performance *improvement*; still must verify each converted endpoint stays under the general 2s response norm at >1000 rows (no per-feature latency budget is defined for these specific endpoints, so the general "operation MUST show a loading indicator within 200ms if it can't meet budget" bar applies to any UI that pages to completion synchronously). PASS, tracked as a Phase-1 task (spot-check timing at 1000+ rows).
- **VI. Implementation & Debugging Methodology** — "Map data dependencies before writing" is directly satisfied by this plan's fragile-area verification (see Research §Fragile-area findings) before any code is touched. "Make load-bearing assumptions explicit" applies to the migration ordering and to the `23505`-as-success convention in `insertGameBlunder` — Phase 1 tasks must document the post-migration collision semantics inline. PASS.
- **VII. Software Design Philosophy** — Preferring the existing offset/limit shape (already used by `GET /api/games`) over introducing a second pagination paradigm (cursor) satisfies "there should be one — and preferably only one — obvious way to do it." PASS.
- **VIII. Documentation as First-Class Deliverable** — This plan updates `docs/architecture/api-conventions.md` (new endpoint + pagination params on `/api/coach/queue`) and `docs/architecture/db-schema.md`/`data-model.md` (both constraint changes) as explicit tasks — see Phase 1 outputs and the tasks.md this plan hands off to. PASS.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (docs/architecture/, data-model.md, contracts/, prior plan.md files, constitution) were read before this plan was drafted — see Research §Sources read.
- [x] Any undocumented conventions discovered during review have been documented before planning continued — see Research §Fragile-area findings (the `/api/coach/queue` `total` field is currently mislabeled as page-size, not a true count; documented here and flagged for correction in FR-004's contract).
- [ ] tasks.md will include explicit documentation tasks for every new architectural decision this feature introduces (DB schema, API shape, cross-cutting conventions) — deferred to `/speckit-tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/041-past-games-data-integrity/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── coach-queue-pagination.md
│   ├── coach-category-counts.md
│   ├── scale-correct-aggregates.md
│   └── papergames-ownership-migration.md
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js                      # /api/coach/queue, /api/stats, /api/games, /api/coach/weakness-map,
│   │                                  # new /api/coach/category-counts route (registered before any
│   │                                  # /api/coach/:param route, per Route Registration Ordering Constraint)
│   ├── papergamesImporter.js         # upsertGame onConflict key change; import result payload surfacing
│   ├── insertGameBlunder.js          # unaffected in logic; collision semantics re-verified against new index
│   ├── migrations/
│   │   └── 0NN_papergames_per_user_ownership.sql   # new migration (DROP-before-ADD ordering)
│   └── (tests) tests/blunder/, tests/integration/  # extraction targets per Constitution III
├── src/
│   ├── screens/
│   │   ├── CategoryListScreen.jsx    # switch cards from /api/coach/queue?status=all to /api/coach/category-counts
│   │   ├── MistakesListScreen.jsx    # page /api/coach/queue?category= to completion
│   │   ├── ReviewScreen.jsx          # page /api/coach/queue to completion for its queue fetch
│   │   └── SettingsScreen.jsx        # import success state: surfaced counts + Past Games CTA
docs/architecture/
├── api-conventions.md                # document pagination params + new endpoint
├── db-schema.md                      # document both constraint changes
└── data-model.md                     # document both constraint changes (migration numbering)
```

**Structure Decision**: Existing web-application layout (`connect-four/server` Express backend +
`connect-four/src` Vite/React frontend), unchanged. No new top-level directories. All work is
modifications to existing files plus one new migration file and one new route handler.

## Post-Design Constitution Re-check

Re-verified after Phase 1 (research.md, data-model.md, contracts/, quickstart.md):

- **II. Code Quality & Simplicity** — Confirmed no speculative abstraction crept in: the
  category-counts endpoint is one route, not a generic aggregates framework; the scale fixes are
  per-endpoint query changes, not a shared "AggregationService" layer (three small,
  independently testable pure functions per `contracts/scale-correct-aggregates.md` § Test
  strategy, not one unified module). PASS.
- **III. Testing Standards** — Extraction seams identified for all three scale-correct
  aggregates; `node --test` stub pattern confirmed reusable from `insertGameBlunder.test.js`.
  PASS.
- **VI. Implementation & Debugging Methodology** — The fragile-area verification in research.md
  satisfies "map data dependencies before writing" for all three defect classes before any code
  is touched; the migration's constraint-name pre-flight check and the `upsertGame`
  shared-function discovery satisfy "make load-bearing assumptions explicit" (both documented
  inline in data-model.md / research.md rather than left implicit). PASS.
- **VIII. Documentation** — `docs/architecture/api-conventions.md` needs an update for the new
  `/api/coach/category-counts` endpoint, the `/api/coach/queue` pagination params, and the
  corrected `total` semantics; `docs/architecture/db-schema.md` and `data-model.md` need the two
  constraint changes recorded. These are captured as explicit documentation tasks for
  `/speckit-tasks`, satisfying the "tasks.md will include explicit documentation tasks" checkbox
  deferred from the pre-Phase-0 gate. PASS (checkbox above resolves to done once tasks.md exists).

No new violations introduced by the Phase 1 design. No Complexity Tracking entries required.

## Complexity Tracking

*No constitution violations requiring justification. Table intentionally omitted.*
