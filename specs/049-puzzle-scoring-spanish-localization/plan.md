# Implementation Plan: Puzzle Scoring-by-Pattern & Spanish Localization

**Branch**: `feature/polish` | **Date**: 2026-07-13 | **Spec**: `specs/049-puzzle-scoring-spanish-localization/spec.md`
**Input**: Feature specification from `/specs/049-puzzle-scoring-spanish-localization/spec.md`

## Summary

Two independent halves sharing one speckit cycle (per the spec's Origin note and
`docs/best_practices_spec_driven_development.md` §Epic Sizing):

1. **Puzzle scoring (US9.1–US9.2, OI-1)**: the six single-answer puzzle categories
   (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape`) are today judged
   "correct" purely by `scoreMove`'s solver-score comparison (`quality === 'optimal'`), which
   can disagree with taught-pattern membership. Fix: extend `POST /api/evaluate-move` to accept
   client-sent puzzle metadata (`correctCol`/`highlightMetadata`, camelCase wire keys) for these
   six categories, compute an additive `accepted` field via the existing `evaluatePredicate` (the
   same mechanism already used for the three multi-solution categories per spec 044), and make
   `ChallengeScreen.jsx` read `data.accepted` instead of `data.quality === 'optimal'` for these
   six. The `/api/evaluate-move` handler is extracted into an importable, side-effect-free
   factory (`server/evaluateMoveHandler.js`'s `createEvaluateMoveHandler`) so integration tests
   mount the actual production handler rather than a hand-copied reimplementation (Decision D1 —
   see Task Sequencing Notes #4); `server/index.js`'s route registration becomes a thin call to
   this factory. **The client's locally-held puzzle object is snake_case** (`current.correct_col`,
   `current.highlight_metadata`) and MUST be remapped to camelCase when building the request body
   — this remap is mandatory and is called out as its own task below (see research.md R1a); a
   missed remap fails closed and silently (FR-007), masking as a false-negative "wrong" on every
   single-answer puzzle. As part of this, converge `/api/evaluate-move` and
   `/api/evaluate-move/inline` onto one `evaluatePredicate`-driven code path for the six
   categories, fixing the inline handler's `.includes`-on-a-`Set` `TypeError` at
   `server/index.js:1779` — note `/inline` has no `src/` caller, so this convergence removes a
   divergent path and a live 500 but is not itself an end-to-end validation of the new wiring.
2. **Spanish localization (US9.3–US9.4, OI-15)**: translate the 22 missing top-level sections of
   `src/i18n/es.json` (currently 3-of-25 sections present: `setcard`, `onboarding`, `settings`) to
   full nested key-parity with `en.json`, then add a `node:test` parity guard registered in both
   `test` and `test:fast`.

No schema change, no persistence, no new project structure — both halves extend the existing
Express server (`connect-four/server/`) and React frontend (`connect-four/src/`) in place.

## Technical Context

**Language/Version**: JavaScript (Node.js ESM on the server, React 19 JSX on the frontend) —
existing stack, no change.
**Primary Dependencies**: Express 5 (server), React 19 + i18next/react-i18next (frontend); reuses
existing `predicates.js` (`evaluatePredicate`), `categories.js` (`VALID_CATEGORIES`), `moveQualityScorer.js`
(`scoreMove`), `src/i18n/{en,es}.json`. No new dependencies.
**Storage**: N/A — solve-time recompute only, no schema change, no persisted `accepted` field
(FR-004). Translation content is a static JSON file, not DB-backed.
**Testing**: `node:test` + `node:assert/strict`, per `docs/architecture/testing-conventions.md`.
Both `test` and `test:fast` scripts in `connect-four/package.json` (explicit file lists, no
auto-discovery).
**Target Platform**: Existing web app (Node/Express API + Vite/React SPA), no platform change.
**Project Type**: Web application — existing monorepo (`connect-four/server/` + `connect-four/src/`),
not a new project structure.
**Performance Goals**: No new performance budget — `evaluatePredicate` is bitboard-only for the
six categories (no solver call beyond the score fetch `/api/evaluate-move` already performs);
adds negligible latency to an existing ≤2s-budget endpoint (Constitution §V).
**Constraints**: No DB schema change (FR-004); no backfill of stored puzzles (Out of Scope);
`accepted` is additive only — MUST NOT change `quality`/`badge`/`coachPhraseKey` semantics for any
caller (FR-003); fail-closed on absent metadata (FR-007); `en.json` stays the fallback language,
never removed (FR-018); parity test compares key presence, not value equality (FR-019).
**Scale/Scope**: US9.1/US9.2 touch 2 server handlers + 1 predicate-metadata wiring + 1 frontend
screen, scoped to exactly 6 category slugs. US9.3 translates 22 top-level `es.json` sections in
lockstep with `en.json`. US9.4 adds 1 new test file + corrects 1 existing test-list registration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as SSOT** — N/A. Neither half touches move evaluation's
  solver/classifier/LLM layers or Deep Reveal. `accepted` is a correctness verdict, not a new
  explanation surface; `coachPhraseKey`/`summaryLineKey` are explicitly untouched (FR-003, FR-009).
- **II. Code Quality & Simplicity** — Satisfied: reuses the existing `evaluatePredicate` dispatch
  (no new predicate logic per category — FR-001/FR-005 explicitly forbid re-deriving pattern
  semantics); converges two divergent handlers into one path instead of adding a third. No
  speculative abstraction — `SINGLE_ANSWER_CATEGORIES` is the minimum new surface needed to avoid
  hardcoding the six-category list twice.
- **III. Testing Standards** — Satisfied by design: FR-012 requires per-category positive +
  negative fixtures sourced from real boards (DB/KB/existing integration fixtures), run through
  the production `evaluatePredicate`, never hand-constructed movestrings (I12 / CLAUDE.md).
- **IV. UX Consistency & Progressive Disclosure** — Satisfied: FR-010 requires the existing
  multi-solution "don't show Suboptimal for an accepted-but-slower move" display override extended
  identically to the six single-answer categories — same visual language, no new pattern.
- **V. Performance** — Satisfied: `evaluatePredicate` for the six categories is bitboard-only
  (reads `highlightMetadata`/`correctCol`, no solver call) and runs inside the same
  `/api/evaluate-move` request that already queries the solver for `scoreMove` — no added
  round-trip, no new latency budget needed.
- **VI. Implementation & Debugging Methodology** — Satisfied: both OI-1 repro boards
  (`3333302444422222060315555054`, `3333334512266550121166`) are concrete, already-reproduced
  artifacts (not theorized); the metadata-delivery *wire shape* (camelCase `correctCol`/
  `highlightMetadata`) follows the existing `/api/evaluate-move/inline` precedent rather than
  inventing a new shape — but note `/inline` has no `src/` caller, so this is precedent for the
  shape only, not a validated end-to-end flow (research.md R1a/R2 caveat). The client→server
  snake_case→camelCase remap itself is new wiring, not already-working code, and is covered by a
  dedicated positive test (see US9.2.6 addition below) rather than assumed correct by analogy.
- **VII. Software Design Philosophy** — Satisfied: "one obvious way to do it" — the plan explicitly
  converges two divergent `evaluatePredicate` call sites into one, per FR-006's mandate.
- **VIII. Documentation** — Gate requires: this plan was drafted after reading
  `docs/architecture/{api-conventions,server-conventions,frontend-conventions,testing-conventions}.md`,
  `docs/open_issues.md` OI-1/OI-15, spec 044/Epic 4 contract (documented in `server-conventions.md`
  "Multi-solution acceptance"), and the six KB pattern entries. Tasks.md MUST include documentation
  tasks: (a) `api-conventions.md`'s `/api/evaluate-move` response-shape section needs the `accepted`
  field's gating widened from "three multi-solution categories" to "nine categories total (three
  multi-solution + six single-answer)"; (b) `server-conventions.md`'s "Multi-solution acceptance"
  section needs a sibling note introducing `SINGLE_ANSWER_CATEGORIES` and the handler-convergence
  decision; (c) `testing-conventions.md` needs the new `es`/`en` key-parity test pattern documented
  briefly (per US9.4.5's spec requirement to "document the lockstep rule").

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (`docs/architecture/api-conventions.md`,
  `server-conventions.md`, `frontend-conventions.md`, `testing-conventions.md`), the constitution,
  and `docs/open_issues.md` OI-1/OI-15 were read before this plan was drafted.
- [x] Undocumented conventions discovered during review: none — the epic's "Settled decisions"
  already resolved metadata delivery, handler convergence, and answer source; this plan documents
  them as tasks rather than re-deciding them.
- [x] tasks.md will include explicit documentation tasks for `api-conventions.md`,
  `server-conventions.md`, and `testing-conventions.md` (see above).

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/049-puzzle-scoring-spanish-localization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-evaluate-move.md   # Phase 1 output — request/response contract delta
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Existing monorepo layout — no new top-level directories. This feature touches:

```text
connect-four/
├── server/
│   ├── index.js                # /api/evaluate-move/inline handler; /api/evaluate-move route
│   │                            # registration becomes a thin call to evaluateMoveHandler.js
│   ├── evaluateMoveHandler.js   # NEW — createEvaluateMoveHandler({ solver, i18nTranslations })
│   │                            # factory; the extracted, side-effect-free /api/evaluate-move
│   │                            # handler body, importable by tests without booting index.js
│   │                            # (Decision D1)
│   ├── categories.js            # VALID_CATEGORIES — add SINGLE_ANSWER_CATEGORIES here
│   ├── predicates.js            # evaluatePredicate — unchanged logic, new callers only
│   └── moveQualityScorer.js     # scoreMove — unchanged (quality/badge stay solver-score-based)
├── src/
│   ├── screens/ChallengeScreen.jsx   # isCorrect / accepted consumption, request body
│   ├── lib/categories.js             # frontend mirror — add SINGLE_ANSWER_CATEGORIES here
│   └── i18n/
│       ├── en.json              # source of truth (unchanged)
│       └── es.json              # 22 missing sections translated here
├── tests/
│   ├── integration/
│   │   ├── evaluateMoveMultiSolution.test.js         # mounts createEvaluateMoveHandler (D1, no
│   │   │                                              # more hand-copied buildEvaluateMoveApp);
│   │   │                                              # flip z_threat accepted:null → true/false
│   │   │                                              # assertion using OI-1 repro boards (US9.2.6);
│   │   │                                              # ALSO fix its test-list placement — currently
│   │   │                                              # test:fast-only, must be in BOTH lists (US9.4.2)
│   │   ├── singleAnswerCategoriesAccepted.test.js    # NEW — mounts createEvaluateMoveHandler (D1);
│   │   │                                              # US9.4 six-category production-path
│   │   │                                              # coverage: accepted:true AND accepted:false
│   │   │                                              # per category, with real camelCase metadata
│   │   │                                              # bodies (per-category positive + negative,
│   │   │                                              # never absent-metadata negatives), via
│   │   │                                              # POST /api/evaluate-move, sourced from OI-1
│   │   │                                              # boards + the four files below
│   │   ├── z_threat.test.js                    # board provenance source
│   │   ├── claimeven.test.js                   # board provenance source
│   │   ├── figure7_jshape.test.js               # board provenance source
│   │   └── undercut_overcut.test.js             # board provenance source
│   └── unit/
│       └── i18nKeyParity.test.js               # NEW — US9.4 parity guard
└── package.json                  # test / test:fast script lists — add BOTH new/corrected files
                                    # to BOTH `test` and `test:fast` (US9.4.2)
```

**Structure Decision**: Existing web-application monorepo (`connect-four/server` = Express API,
`connect-four/src` = React SPA). No new services, no new directories at the project-structure
level — this feature is a scoped extension of two existing endpoint handlers, one existing
frontend screen, one existing frontend registry file, and one existing translation file, plus one
new test file.

## Task Sequencing Notes (mandatory for tasks.md)

Added following 2026-07-13 plan critique. These are binding constraints on how `/speckit-tasks`
must order and shape the US9.1/US9.2/US9.4 task list, not optional suggestions:

1. **Explicit remap step.** `/speckit-tasks` MUST emit a dedicated task (part of US9.2, before
   the frontend consumes `accepted`) that: (a) edits `ChallengeScreen.jsx`'s `POST
   /api/evaluate-move` request-body construction to map `correctCol: current.correct_col` and
   `highlightMetadata: current.highlight_metadata` (top-level rename only — inner
   `highlight_metadata` JSON is untouched); (b) is verified by a **positive** assertion in the
   US9.2.6 test update — a request built from a taught-correct column must return
   `accepted: true`, not just the negative/null cases already in place. A miss here is silent
   (FR-007 fail-closed), so the positive case is the only thing that catches a regression.
2. **Ordering**: US9.1 (widen the `accepted` gate, Decision B — `server/index.js:1753`) →
   US9.2.6 (flip `evaluateMoveMultiSolution.test.js`'s z_threat `accepted: null` assertion to a
   real `true`/`false` assertion using the OI-1 repro boards) → US9.4.2 (register
   `singleAnswerCategoriesAccepted.test.js` AND the corrected
   `evaluateMoveMultiSolution.test.js` placement into both `test` and `test:fast`). Registering
   either new/corrected file into the run lists before US9.1/US9.2.6 land would make `test:fast`
   red mid-cycle for a reason unrelated to the change being landed at that point — tasks.md must
   not interleave these.
3. **`/api/evaluate-move/inline` is not an oracle.** Any task that references the inline handler
   as validation for the remap's wire shape is wrong — cite `/api/evaluate-move` (has a
   `ChallengeScreen.jsx` caller) as the thing actually being tested end-to-end; `/inline`'s value
   here is fixing a live 500 and removing a divergent code path, nothing more.
4. **Decision D1 — tests mount the real handler, not a copy.** Following the 2026-07-13 critique
   (B1/B2): a prior draft's integration tests inlined a hand-copied `buildEvaluateMoveApp`
   mini-handler with its own hardcoded gate, so T004-T007's actual production edits had zero
   automated coverage. `/speckit-tasks` MUST emit a task that extracts `server/index.js`'s
   `/api/evaluate-move` handler into an importable, side-effect-free factory —
   `server/evaluateMoveHandler.js`'s `createEvaluateMoveHandler({ solver, i18nTranslations })` —
   that both `singleAnswerCategoriesAccepted.test.js` and the updated
   `evaluateMoveMultiSolution.test.js` import and mount directly, replacing the mini-handler
   pattern entirely. The factory must NOT be exported from `server/index.js` itself, since
   importing `server/index.js` boots the full production server (`app.listen()` at module load,
   no exported `app` — see memory `project_integration_test_slowness`); `server/index.js`'s route
   registration becomes a thin `app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver,
   i18nTranslations }))` call. This closes B2 fully — the production gate/remap/convergence code
   is what the tests exercise, one gate to maintain, no silent divergence — so no separate
   server-side source-assertion grep task is needed (client-side `ChallengeScreen.jsx`
   source-assertion, T016, is unaffected and stays as-is).
5. **Decision D2 — `buildPredicatePuzzle` preserves `goalPredicateType`/`goalPredicateParams`.**
   The shared predicate-object-building helper (FR-006 single-code-path mandate) MUST pass through
   `goalPredicateType`/`goalPredicateParams` (defaulted from the puzzle object when present,
   matching `/inline`'s pre-existing `puzzle.goalPredicateType || category` /
   `puzzle.goalPredicateParams ?? null` logic), so `/inline`'s non-single-answer categories
   (`forced_win`, `forbidden_columns`) keep working once `/inline` is routed through the shared
   helper. Keeps FR-006 convergence honest — one construction path, no regression.
6. **Test metadata rule.** Every test body in `singleAnswerCategoriesAccepted.test.js` and the
   updated `evaluateMoveMultiSolution.test.js` MUST carry the real camelCase taught-pattern
   metadata for its category (`highlightMetadata.column` for `z_threat`,
   `highlightMetadata.cells[].role` for `undercut`/`overcut`, `correctCol` for
   `claimeven`/`figure_7`/`j_shape`), sourced from an existing test fixture, the DB, or (for the
   OI-1 `z_threat` board without a known taught column) a live `detectZThreat` run — never
   hand-constructed (CLAUDE.md/I12). Every negative (`accepted: false`) case MUST send this real
   metadata alongside a genuinely non-taught column, not omit metadata — an absent-metadata
   negative only proves the FR-007 fail-closed default fires, not that the pattern-membership
   check is correct (critique B1/B3).

## Complexity Tracking

Not applicable — no Constitution Check violations.
