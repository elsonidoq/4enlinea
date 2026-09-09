# Testing Conventions

## Test Runner

**MUST**: Use Node.js built-in `node:test` and `node:assert/strict`. No Jest, Mocha, or other test frameworks.

## Test Suite Layout

```
connect-four/tests/
  predicates/          # evaluatePredicate() unit tests
    fixtures/fixtures.json
    predicates.test.js
    forbidden_columns.test.js
  classifier/          # classify() unit tests
    fixtures/fixtures.json
    classifier.test.js
  hallucination/       # LLM explanation acceptance test (manual)
    run_hallucination_test.js
  integration/         # HTTP-level regression tests
  blunder/             # Blunder + explain context tests (node:test, NOT Jest)
    tagBlunder.test.js
    blunderReasons.test.js
    insertGameBlunder.test.js
    classifyPatternCells.test.js
    tagBlunderPAdaptation.test.js
    buildExplainContext.test.js
  difficulty/
  scores/
  unit/
  lessons/             # Lesson curriculum tests (load by lesson `id`, not filename)
    opening-lessons.test.js
```

**`tests/blunder/` convention**: All files in `tests/blunder/` use `node:test` (NOT Jest). They are included in `test:fast` and `test`. To run a single file: `node --test connect-four/tests/blunder/buildExplainContext.test.js`.

## Fixture Format

**Predicate fixtures** (`tests/predicates/fixtures/fixtures.json`):
```json
{
  "description": "<category>: <scenario>",
  "puzzle": {
    "id": <number>,
    "category": "<slug>",
    "moveString": "<1–7 string>",
    "goalPredicateType": "<slug>"
  },
  "candidateCol": <0-indexed int>,
  "scores": [<7 numbers>],
  "expectedResult": "correct" | "wrong" | "tied"
}
```

**Classifier fixtures** (`tests/classifier/fixtures/fixtures.json`):
```json
{
  "description": "<category>: <scenario>",
  "moves": "<1–7 string>",
  "candidateCol": <0-indexed int>,
  "expectedCategory": <int or null>,
  "expectedTag": "<slug>",
  "scores": [<7 numbers>]
}
```

**MUST**: Fixture files are static JSON checked into the repo — no random generation *at test time*.
**MUST**: Each fixture has a human-readable `description` field.
**MUST**: Solver scores in fixtures are real values obtained from the c4solver binary, not invented.

### Generated-then-committed fixtures (tagBlunder)

`tagBlunder` fixtures are not hand-authored — they come from real game positions via the
canonical simulator (`server/gameSampling.js` → `harvestBlunders`), so movestrings are
never fabricated. The flow:

- `server/scripts/generate_tagblunder_fixtures.mjs [maxGames] [seed]` plays mistake-weighted
  self-play games, runs `tagBlunder` on each non-optimal ply, bins results by
  `tag:direction` (canonical enumeration = `REASON_TEMPLATES` keys in `blunderReasons.js`),
  and writes `tests/blunder/fixtures/tagBlunderFixtures.json`. Deterministic given
  `(maxGames, seed)`: seeded RNG + deterministic solver → reproducible output. Regenerate
  and commit; the test reads the static file.

  ⚠️ **Always pass both arguments (e.g. `500 12345`), and never `--help`.** The script has no flag
  handling: any non-numeric first argument parses as `maxGames = NaN`, generates zero fixtures, and
  **overwrites the committed fixture file with an empty array** — no prompt, no backup. Recovery is
  `git checkout -- tests/blunder/fixtures/tagBlunderFixtures.json`, which discards any *uncommitted*
  reviewed rows. Tracked as OI-91. A full run is ~90s–5min; run it in the background.

- **Changing `tagBlunder`'s emitted tags or `direction` values requires a regeneration pass.** The
  bin enumeration derives from `REASON_TEMPLATES.keys()`, so a newly-unreachable bin (e.g.
  `drawing_move:missed_own` after spec 052) means the generator can never early-exit on it and will
  always burn the full `maxGames`.
- `tests/blunder/tagBlunderFixtures.test.js` checks two layers: (1) **golden/regression** —
  `tagBlunder` reproduces each recorded `tag`+`direction` (shared solver via `before`/`after`);
  (2) **structural invariants** — properties provable from board geometry alone, no solver
  (e.g. `immediate_threat:missed_own` ⇒ the blunderer had an immediate win;
  `forced_block:defensive_miss` ⇒ the opponent had a pre-existing immediate threat). Layer 2
  is the correctness oracle (layer 1 alone would be self-referential).

**Gotcha**: a few `tag:direction` bins are structurally unreachable in random self-play
(`claimeven:*` is Yellow-only and rare; `z_threat:enabled_opponent`). The generator reports
them as "unreached" rather than failing — missing bins are expected, not a bug. (Regenerated
2026-06-25 after the parity-threat refactor: `odd_even_threat:*` bins are gone — that tag is
no longer a blunder tag — and new `major_threat_parity:*`/`major_threat_nonparity:*`/`minor_threat:*`
bins are now covered. The canonical bin enumeration is always `REASON_TEMPLATES.keys()`.)

## What Gets Each Test Type

| Concern | Test type |
|---|---|
| `evaluatePredicate()` per-category logic | Unit test against fixtures |
| `classify()` pattern tagger | Unit test against fixtures |
| HTTP endpoint behavior (interaction_mode guard, error shapes) | Integration test (spins up express in-process) |
| LLM explanation grounding (hallucination rate) | Hallucination acceptance test (manual, against live API) |
| Admin curation flow | Manual golden-path verification |

**MUST**: Solver-dependent features use the real C++ binary, never a mock. (Constitution §III)
**MUST**: Each predicate category has at least one positive and one negative fixture. (Constitution §III)

## Hallucination Test

`tests/hallucination/run_hallucination_test.js` is run manually:
```
API_BASE=http://localhost:3001 AUTH_TOKEN=<token> node run_hallucination_test.js
```
Tests 100 positions × 5 generations = 500 calls. Pass threshold: < 2% error rate (≤ 10 flagged explanations).
This test is not part of the automated test suite — it requires a running server and a valid auth token.

## Integration Tests

HTTP integration tests spin up an express app in-process using `node:http` + `createServer`. They do not require the external Supabase instance; puzzle data is injected via test fixtures.

### Test the real seam, never a copy of it

`server/index.js` exports no app and gives its route handlers no per-request Supabase seam, which
tempts a test into rebuilding the handler's logic inside its own mini express app. **A test that
asserts against its own reimplementation proves nothing** — the production route can drop a field
and the test stays green forever, because no code path under test ever calls the real route.

When that temptation appears, extract the logic into a module both sides import instead. That is
why `server/promotePuzzleRow.js#buildPromotedPuzzleRow` exists: `tests/integration/
promoteCorrectCols.test.js` originally mirrored the two admin promotion routes' insert objects, so
extracting the builder made the assertion real without needing HTTP-level injection. Verify the
result by breaking the production code on purpose and watching the test go red — a green test you
have never seen fail is not evidence.

### Proving a code path is *not* taken (`mock.module`)

Some contracts are negative: spec 051's stored-set grading branch must never consult the pattern
evaluators. Asserting that by reading the code is not a test. The pattern used is Node's
experimental `mock.module()`:

1. In a `before()` hook, `mock.module(<module url>, { namedExports: { fn: () => { throw ... } } })`.
2. Dynamically import the module under test with a **cache-busting query string** so it re-resolves
   its imports against the mock rather than a cached graph.
3. `.restore()` in `after()`, and build a **fresh, unmocked** app instance for any sibling test that
   needs the real function.

This requires the `--experimental-test-module-mocks` flag, which is set **process-wide** on both the
`test` and `test:fast` scripts (a single `node --test` invocation takes one flag set for the whole
file list, so it cannot be scoped to the few files that use it). Only a handful of files rely on it
— see `docs/open_issues.md` OI-87 for the forward-compatibility risk.

As with any negative assertion, confirm the harness actually fails when the forbidden call happens:
temporarily insert the call, watch it go red, then revert. Used by
`tests/integration/evaluateMoveStoredSet.test.js` and `tests/unit/sharedSolverSafetyFloor.test.js`.

## Testing `index.js`'s inline admin routes (and its limit)

`server/index.js` calls `app.listen()` at module scope, so **a test cannot import it**. There is
consequently no way to assert against the real route registrations. The convention that exists
(`server/userEndpoints.test.mjs`, extended by spec 058) is: build a minimal local Express app,
register handlers mirroring `index.js`'s route bodies, and have them call the **real** imported
module under test (e.g. `createQaAccountTools`) plus a verbatim copy of `requireLocalhost`.

Know what this does and does not buy you. The business logic is genuinely exercised; the
**registration is not**. A wrong path, a dropped `requireLocalhost`, a missing status pre-check, or a
misplaced environment guard on the real route will not turn these suites red — the test re-implements
the wiring it is nominally covering. Treat a green run here as evidence about the module, never about
the endpoint being reachable and gated as intended; verify that part with a real request against a
running server. Tracked as OI-161; closing it needs `app.listen()` moved behind a main-module guard
so the app becomes importable.

**The two shapes an "endpoint test" actually takes here** (neither is an HTTP test of the real route;
`server/index.js` spawns the c4solver at import time, calls `app.listen()`, and exports no `app`):

1. **Source-parse assertion** — read `server/index.js` as text and assert the handler contains the
   guard. Precedent: `tests/unit/scoresValidation.test.js`, and the OI-172/OI-163 additions
   `tests/unit/scoresTerminalGuard.test.js` and `tests/unit/gamesZeroMoveValidation.test.js`. Cheap,
   and it does pin the real production file — but it asserts about *text*, so a semantically
   equivalent rewrite breaks it and a wrong-but-textually-matching guard passes.
2. **Handler factory** — extract the handler into its own module that takes its dependencies as
   arguments, and test the factory. Precedent: `server/evaluateMoveHandler.js`'s
   `createEvaluateMoveHandler({ solver, i18nTranslations, supabase })`, exercised by
   `tests/integration/evaluateMoveTerminalPosition.test.js` with a stub solver. This is the shape to
   prefer for new work: it tests behaviour rather than source text, and the module is the same one
   `index.js` imports.

Both still leave the *registration* (path, middleware order, method) uncovered — see the paragraph
above.

## Running Tests

### There are TWO gates, and `test:fast` is only one of them

This is the single most-missed fact about this repo's test setup, so it is stated before anything
else. `npm run test:fast` does **not** run the React screen tests. They live in a second, entirely
separate script:

| Gate | Command | What it runs | Baseline (2026-09-09) |
|---|---|---|---|
| `test:fast` | `cd connect-four && npm run test:fast` | `eslint .` then plain `node --test` over ~180 explicitly-listed `.js`/`.mjs` files | **1843 pass / 0 fail** |
| `test:dom` | `cd connect-four && npm run test:dom` | `node --import ./tests/dom/setup.js --experimental-test-module-mocks --test tests/dom/*.dom.test.jsx` | **117 pass / 0 fail** |

Verify the separation at source rather than trusting this table — the check is one line:

```
cd connect-four && node -e "console.log(/tests\/dom/.test(require('./package.json').scripts['test:fast']))"
# => false
```

Consequences you must plan around:

- **A screen-level change can ship with `test:fast` fully green.** Every React screen fix is invisible
  to that gate. When you touch anything under `src/screens/`, `src/components/` or a screen-facing
  `src/lib/` module, run **both** and report **both** numbers.
- **A `.jsx` file registered in `test:fast` is a SyntaxError**, not a skipped test — plain `node --test`
  has no JSX capability. New `.dom.test.jsx` files go in `test:dom`; everything else goes in
  `test:fast`. Neither script auto-discovers: an unregistered file simply never runs.
- Which kind of test belongs where: if the assertion is about **what the user sees rendered**, it is a
  `test:dom` test. If it is about a pure function, a handler factory, a source-parse invariant, a
  fixture or a data shape, it is a `test:fast` test.

```
cd connect-four && npm test
```
Tests are **explicitly listed** in the `test` and `test:fast` scripts in `package.json` — there is no automatic discovery.

> **`test:fast` runs lint first and will fail before any test executes.** Since spec 055 (Epic 8) the
> script string is `eslint . && node --test …`, so a lint **error** anywhere in the tree stops the run
> at the lint step — you get ESLint output and no test summary at all. That is the gate working, not a
> broken test suite. The same gate runs on commit: `.githooks/pre-commit` executes
> `npx eslint . --quiet` (errors only, so a clean commit prints nothing) *before* the KB-sync step, so a
> lint error also rejects the commit.
>
> `npm run lint` exits 0 on a clean tree but still reports **~47 warnings** — the deliberately demoted
> `react-hooks/*` / `react-refresh/*` findings tracked in `docs/open_issues.md` OI-119. Warnings do not
> fail either gate. Do not "fix" them as part of unrelated work, and do not read a warning count as a
> red suite.

> **A stale registration fails nothing.** `node --test` given a *list* of files **silently skips** any path that doesn't exist: exit 0, no warning, and the summary still reads `fail 0`. So a deleted/renamed test whose registration is left behind loses coverage with zero signal, and a newly-added file that was never registered simply never runs.
>
> **The exit code and a `Could not find` grep DO NOT catch this** — measured on Node v23.11.0, and this is the whole trap:
>
> | Invocation | exit | `grep -c "Could not find"` | summary |
> |---|---|---|---|
> | `node --test real.js missing.js` (**a list — the real case**) | **0** | **0** | `ℹ fail 0` |
> | `node --test missing.js` (alone — not how `test:fast` runs) | 1 | 1 | — |
>
> Node emits `Could not find '<path>'` **only** when the missing file is the *sole* argument. `test:fast` is always a list, so both of those checks report clean on a silently-skipped file. Do not rely on them.
>
> **The only check that works: confirm the test's own uniquely-named cases appear in the run output** (`npm run test:fast 2>&1 | grep -c "<distinctive test name>"` → non-zero), and assert the path is actually present in `package.json`'s `test:fast` string. Verify registration by *name*, never by absence-of-error.

**`npm test` includes**:
- `server/test_explain_parity.js`
- `server/annotationGate.test.js`
- `tests/predicates/predicates.test.js`
- `tests/predicates/forbidden_columns.test.js`
- `tests/classifier/classifier.test.js`
- `tests/blunder/tagBlunder.test.js`
- `tests/blunder/blunderReasons.test.js`
- `tests/blunder/classifyPatternCells.test.js`
- `tests/blunder/tagBlunderPAdaptation.test.js`
- `tests/blunder/buildExplainContext.test.js`
- `tests/integration/candidate-generator.test.js`
- `tests/integration/forced_win.test.js`
- `tests/integration/sequence_check.test.js`
- `tests/integration/z_threat.test.js`
- `tests/integration/claimeven.test.js`
- `tests/integration/figure7_jshape.test.js`
- `tests/integration/undercut_overcut.test.js`
- `tests/integration/evaluateMoveMultiSolution.test.js` (spec 049 Epic 9 T025 — moved into `npm test` alongside `test:fast`, FR-021)
- `tests/integration/singleAnswerCategoriesAccepted.test.js` (spec 049 Epic 9 T025)
- `tests/unit/i18nKeyParity.test.js` (spec 049 Epic 9 T025 — see "i18n key-parity guard" below)
- `tests/unit/` (aiDifficulty, annotatedText, boardSpecToBoard, detectClaimodd, lessonLoader, socraticReducer, lessonContent, lessonWindows)
- `tests/lessons/opening-lessons.test.js` — see "Lesson content gates" below

**`npm run test:fast` additionally includes** `server/llmCoachHelpers.test.js`, `tests/blunder/insertGameBlunder.test.js`, the reason-engine suite `server/tests/reasonEngine{,.denial,.drawToLose,.enrichment,.witness,.winSamples}.test.mjs` (solver-backed but fast), `server/tests/reasonNarratorVector.test.mjs` (pure), and `server/tests/computeEvidenceIsolation.test.mjs` (the reason-eval `compute.mjs` per-board error-isolation regression, pure — uses a throwing solver stub), and the `server/tests/winDistribution.*.test.mjs` suite (the win_distribution pipeline: `playPolicyGame`, policies, `extractOutcome`, `aggregateRows`, `renderReport` — all pure/solver-free) but **excludes** `tests/integration/candidate-generator.test.js`. (The reason-engine and win_distribution tests are in `test:fast` but **not** in the slower `test` script.)

Files in `tests/difficulty/` and `tests/scores/` exist but are **not included** in either script — add them explicitly when they are ready.

### `test:dom` — JSX/component render tests

`test` and `test:fast` run **plain `node --test` with no JSX capability** — a `.jsx` test registered in
either fails to parse. Component/render tests live in the separate **`test:dom`** script, which loads
the esbuild JSX loader + jsdom via `connect-four/tests/dom/setup.js`. Put any test that renders a
component and asserts what the user sees (`tests/dom/*.dom.test.jsx`) here — see
`tests/dom/SetCard.dom.test.jsx` for the pattern. This is the correct home for the class of bug this
codebase keeps shipping (a producer function tested green while its rendered string is wrong): assert
the **rendered output**, not the function that feeds it. Register new `.dom.test.jsx` files in `test:dom`
(they are NOT auto-discovered, same rule as above), and run `npm run test:dom` alongside `test:fast`
when you touch a component.

### i18n key-parity guard (spec 049, Epic 9, `tests/unit/i18nKeyParity.test.js`)

A future maintainer adding new English UI copy without the matching Spanish key (or vice versa)
would silently reintroduce an English-fallback gap. `tests/unit/i18nKeyParity.test.js` guards
against this: a pure `getNestedKeyPaths(obj) -> Set<string>` helper flattens `src/i18n/en.json`
and `src/i18n/es.json` into dotted leaf-key-path sets (no arrays occur in either file), asserts
the two sets are equal, and on failure reports the symmetric difference (`missingFromEs`,
`missingFromEn`) in the assertion message so the maintainer sees exactly which key(s) are
missing from which file. This is a **key-presence-only** comparison — a proper noun translated
identically in both files still passes; only structural key divergence fails the test. Registered
in both `test` and `test:fast` (FR-020) per the "add to both lists" rule above. To
self-regression-check the guard, temporarily delete a leaf key from `es.json` and run
`node --test tests/unit/i18nKeyParity.test.js` — it should fail with the missing key path named
in the assertion message; restore the key and it passes again (never commit the temporary
deletion).

**Limitation (do not over-trust a green parity test):** this guard only proves `en.json` and
`es.json` have the *same keys*. It is completely blind to user-facing strings that were never wired
to `t()` at all — hardcoded English literals in JSX (`title="Review"`, `aria-label="Mute music"`,
button text). Those render English in every language and the parity test stays green. Spec 049 QA
found a batch of these (Stats logout, Settings→Papergames, Game TopBar, audio aria-labels, Lessons
list) and more remain (`docs/open_issues.md` OI-19). A passing parity test means "no key-level
drift," NOT "the app is fully translated." When adding UI, wire every user-facing string through
`t()` — a hardcoded literal is invisible to this guard.

### Lesson content gates (added 2026-07-24/25)

Lesson JSON is data, not code, so ordinary unit tests don't cover it. Two gates do, and they split by
whether the check needs the solver:

- **`tests/unit/lessonContent.test.js`** — pure **static** invariants over every lesson JSON
  (`node:test`, registered in **both** `test` and `test:fast`). No solver, no network. **Every check in
  it is unconditional** — there is no opt-in list and no exemption mechanism, so a new lesson is
  checked the moment its file lands. (Until 2026-07-30 it held a `REMEDIATED` set of ids opted into
  the strict checks. Spec 052 **deleted** the set and its three guards rather than emptying them:
  an exemption list that exempts nothing today still silently exempts whatever a future author adds.
  Do not reintroduce one — closes `docs/open_issues.md` OI-63 item 4.)
  Two gates added by spec 052 live here: **no `lesson.<id>.title` key may reappear** in `en.json`/`es.json`
  (the migration that moved titles into the lesson JSON), and **every lesson must carry a non-empty
  `title_es`** — that one exists because deleting the i18n keys removed the only thing localizing
  titles, silently shipping 14 of 15 in English to Spanish learners with every other test green.
- **`tests/unit/i18nKeyParity.test.js`** also holds the **lesson-id namespace-collision guard**: no
  lesson `id` may collide with a reserved `lesson.*` sub-key. The reserved set is **derived at run time**
  from `en.json`'s `lesson` object (today `confirmation`, `node`, `notFound`, `windowCounts`), never
  hardcoded, so a newly-added chrome key joins the guard automatically.
- **`tests/lessons/lessonAudioCoverage.test.js`** has **two independent halves** and a run can pass one
  while failing the other: every collected text has an on-disk clip, *and* prune-parity (no orphaned
  clip on disk). Both walk `collectMessages`, so **adding a field to that walker immediately demands
  clips for every instance of it in both languages** — there is no single-lesson version that stays
  green. Editing already-voiced text orphans its old clip (lesson audio is text-hashed, so the filename
  changes); clear it with `POST /api/admin/lessons/prune-audio`.
- **`server/scripts/verify_lesson_content.mjs`** — **solver-gated** content verification: a socratic
  `correctCol` must be the solver's max-scoring column, positions must not be lost for their owner, and
  every `tg`/`td` overlay must be a real threat of that color (opt out with
  `_overlayIntent: "annotation"` on the slide/socratic node, or on an individual `overlays[]` entry to
  override the node-level default — see `docs/architecture/lesson-editor.md` §"Overlay intent").
  Every `solver.query` and `Board` construction is isolated, so a malformed movestring yields one FAIL
  row and the run continues instead of crashing (spec 052 / FR-013). A socratic with no `movestring` **FAILs** rather than being skipped.

  **This is a script, not a `node:test` file — it is in neither `test` nor `test:fast`, and nothing runs
  it for you.** Run it by hand (`node server/scripts/verify_lesson_content.mjs`, from `connect-four/`)
  after any lesson-content change. It needs a working c4solver binary; on Linux see
  `reference_c4solver` re: rebuilding from `solver-src` and the `skip-worktree` bit that makes
  `git status` and `file` misreport which binary is committed.
- **`tests/unit/lessonWindows.test.js`** (added 2026-07-28, registered in **both** `test` and
  `test:fast`) — the pure `windowHighlights` JSON → `Board` `zhCells` mapping and the
  `isStraightLineWindow` geometry predicate (`src/lib/lessonWindows.js`). `lessonContent.test.js`
  applies that same predicate to every authored window, plus known-`type` and `label` ⇒ `label_es`.

  **These window checks are unconditional**, like every other check in that file (the field is
  new, so every use of it is new). They exist because the capsule renderer draws blindly from
  `cells[0]` to `cells[last]`: an unordered, bent, or gapped array produces a plausible-looking
  capsule over the *wrong* squares, which no other layer catches — `verify_lesson_content.mjs` knows
  only about `tg`/`td` overlays, and nobody notices by eye unless they open that exact slide.
  Window geometry is intentionally **not** added to the solver script: a window asserts no
  solver-checkable fact, and keeping the gate pure means content authors can run it for free.
  See `lesson-editor.md` §"Window highlights" for the authoring contract.

- **`tests/lessons/lessonAnswerSets.test.js`** (added 2026-07-28, registered in **both** `test` and
  `test:fast`) — **solver-backed**, the blocking gate for the answer-set invariant on lesson
  content: every socratic node and every confirmation challenge must satisfy
  `optimalCols ⊆ acceptedCols` and `acceptedCols ∩ optimalCols ≠ ∅`, so a learner is never told a
  winning move is wrong. It imports the rule from `server/answerSetInvariant.js` rather than
  restating it, and holds one solver process for the file via `before`/`after` (~120 ms for all 39
  boards). See `server-conventions.md` §"Answer sets are derived, never re-implemented".

  It exists because that rule was previously enforced **nowhere** — the two scripts that could have
  caught it are manual — and the originating defect (a fork challenge accepting 1 of its 3 genuine
  double-threat columns) sat in shipped content undetected. Two verdicts are deliberately
  **non-failing**: `LOST-POSITION` (every legal move loses, so "optimal" only means "loses
  slowest" — `undercut` is here by definition) and `NO-SCORES`.

- **`server/scripts/audit_answer_ambiguity.mjs`** — the same invariant as an on-demand tool over
  lessons **and** DB `puzzles` rows, which the test cannot reach. Also a script in neither test
  list. `--source <category>` prints verified replacement boards; `--repair --yes` retires failing
  puzzle rows (`is_active = false`) and inserts verified replacements. Run it after changing a
  detector or a predicate — a grader change can invalidate stored `highlight_metadata`.

`tests/lessons/opening-lessons.test.js` asserts curriculum-level properties and deliberately loads
lessons **by `id`**, not by filename, so renumbering (`lesson-NN-slug.json`) doesn't break it. Follow
that convention in any new curriculum test — prefixes get renumbered whenever a lesson is inserted. The
free/paid contiguity and `order`-vs-prefix agreement rules live in
`docs/architecture/lesson-editor.md` §"Curriculum ordering and the free/paid boundary".

### Pure Function Extraction Pattern

Server code in this repo has no HTTP-level test infrastructure: the Express `app` is not exported, there is no supertest harness, and the Supabase client has no dependency-injection seam at the endpoint level.

The primary testability strategy is therefore **pure function extraction**: factor business logic out of route handlers into standalone functions, then unit-test those functions directly with `node --test`.

**Canonical example**: `server/insertGameBlunder.js` (Epic 2). The analyze endpoint's blunder INSERT block was extracted into:
```js
export async function insertGameBlunder(supabase, row) { ... }
```
This is tested in `tests/blunder/insertGameBlunder.test.js` using a plain stub object (no mocking library required):
```js
const supabase = {
  from: (table) => ({
    insert: async (row) => { capturedRow = row; return { error: null }; },
  }),
};
```
Three tests cover: auth gate (null `user_id` skips insert), tag guard (invalid tag → `'suboptimal_move'`), and 23505-as-success (unique violation does not throw).

### Source-parse assertions — when there is no seam at all

Some properties live in a route handler that cannot be extracted without restructuring it, and cannot be reached at all because `server/index.js` calls `app.listen()` unconditionally at module scope (importing it boots the server and binds a port). For those, assert against the **shipped source text**. Precedent: `tests/blunder/blunderTagConstraint.test.js` parses the newest migration SQL to check code-vs-constraint parity "without requiring a DB connection". Spec 054 added `tests/unit/adminCandidatesPagination.test.js` (query-builder chain shape), `server/candidatesUpsert.test.mjs` (migration + call-site shape) and `tests/blunder/outcomeConstraint.test.js` (CHECK value set).

Two rules, both learned the hard way:

- **Anchor on the distinguishing expression, not on a message string.** A first attempt at the `/api/scores` full-board test matched the error text `'no legal move: board is full'` — which also appears in the handler's `catch` branch and in a comment, so the test stayed **green with the guard deleted**. Re-anchored on `colHeights.every(`, it correctly goes red.
- **Verify the test fails for the right reason** by actually reverting the change and re-running. A source-parse test that never fails is worse than no test: it reads as coverage.

Do **not** reach for a source-parse test when a real seam exists — extract the function instead (above). And do not build a mock-based DB test to stand in for one: that tests your belief about the client library's behavior, not the code (see "Test the real seam, never a copy of it").

### A green unit test does not mean the endpoint works

Spec 054 shipped `NoLegalMoveError` in `chooseSparringMove` with a passing unit test, while `POST /api/scores` still returned a generic 500 for the same input — `solver.query()` runs first and throws its own error, so the new branch was unreachable. The unit test could not see it; a curl against the running server found it immediately.

When you add an error/terminal signal to a function, check what the **calls before it** do with the same input, and assert the endpoint-level property too (extract, or source-parse the ordering).

### DOM / component tests (React Testing Library)

Pure function extraction covers logic, not rendering — assertions like "does this component mount," "does it re-render on retry," or "is this button reachable via role" need a real DOM. For that, this repo uses **React Testing Library** on jsdom, still driven by `node:test` (no Jest/vitest introduced).

- **Location**: `connect-four/tests/dom/*.dom.test.jsx`
- **Run with**: `npm run test:dom` (from `connect-four/`) — a **separate** script from `test`/`test:fast`, because DOM tests need a jsdom global registered via `tests/dom/setup.js` (imported with `node --import`), plus an esbuild-backed JSX loader hook (`tests/dom/jsxLoader.mjs`, also registered in `setup.js`) since Node has no native JSX support. Neither is wanted for the plain `node:test` suites.
- **Tooling**: `@testing-library/react`'s `render`/`screen`, `@testing-library/dom`, `jsdom`, `global-jsdom`.
- **File list convention**: like `test`/`test:fast`, `test:dom` enumerates files explicitly (no globbing) — the directory-recursion mode of `node --test` filters by extension and does not pick up `.jsx`. Add new DOM test files to the `test:dom` script in `connect-four/package.json` by name.
- **First example**: `connect-four/tests/dom/ErrorBoundary.dom.test.jsx` — renders `ErrorBoundary` around a child that throws and asserts the fallback's Retry button mounts.
- **Rendering `Board` (directly or via `SlideEditor`/`BoardEditor`) requires a `ResizeObserver` stub.** jsdom does not implement it, and `Board`'s capsule-measuring effect constructs one **unconditionally** — so the render throws before any assertion runs. Stub it in a `before()` hook and import the component **after** that hook with a dynamic `await import(...)`, since a static import would be hoisted above the stub:

  ```js
  before(() => {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  });
  const { render, screen, cleanup } = await import('@testing-library/react');
  const { Board } = await import('../../src/components/Board.jsx');
  ```

  Established by `tests/dom/SlideEditorWindows.dom.test.jsx`; also used by
  `BoardWindowCounts.dom.test.jsx` and `SlideEditorWindowCounts.dom.test.jsx`.

Use DOM tests for render/remount/interaction assertions the pure-function pattern can't express. Keep pure-function extraction as the default for pure logic — it's cheaper to write and run.

**A DOM test that renders the component but never varies the guard it claims to cover is not coverage.** Before landing one, break the branch under test and confirm the test goes red. This is not hypothetical: the `windowCounts` render guard (`value === 'empty'`) originally had three passing tests, none of which supplied a non-null count on an occupied cell — deleting the guard left the suite green. The same applies to constants: assert a value against whatever *derives* it, never against a restatement of its literal.

#### jsdom does not implement `ResizeObserver` — stub it before rendering `Board`

`Board.jsx` constructs a `ResizeObserver` **unconditionally** in the effect that measures board width
for the `zhCells` capsule SVG. jsdom has no such global, so any DOM test that renders `Board` — or
anything containing it (`BoardEditor`, `SlideEditor`, `SocraticEditor`, every lesson/review screen) —
dies at render with `ResizeObserver is not defined`. Stub it in a `before()` hook:

```js
before(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
```

Because `setup.js` registers jsdom at import time but the stub runs in `before()`, import the
component **lazily** (`const { default: X } = await import('...')`) so the stub is installed first.
Worked example: `tests/dom/SlideEditorWindows.dom.test.jsx`.

#### Simulate interaction with `fireEvent`, not `user-event`

`@testing-library/user-event` is **not installed** — only `@testing-library/dom` and
`@testing-library/react`. Use `fireEvent` from `@testing-library/react`.

Two things this does *not* cost you, both verified rather than assumed:

- **`fireEvent.click` respects a native `disabled` button** — jsdom does not invoke the handler.
  Assertions of the form "this control stays disabled until the input is valid" are honest with
  `fireEvent`. (It does *not* respect CSS `pointer-events: none`, so prefer real `disabled`
  attributes over CSS-only gating in components you intend to test.)
- **`fireEvent.change` works on React controlled inputs** — RTL patches the native value setter, so
  no `Object.getOwnPropertyDescriptor(...).set.call(el, v)` dance is needed inside tests. (That
  dance *is* still needed when driving the app over raw CDP in a browser.) Note `change` replaces
  the whole value rather than appending a keystroke — assert on the full string.

**When to reconsider adding `user-event`** (evaluated and declined 2026-07-28): it is 438 KB with
zero runtime deps and its only peer, `@testing-library/dom >=7.21.4`, is already satisfied — so the
cost is low, but at four DOM-test files the benefit is too. The trigger to add it is the first test
that exercises **keyboard/focus interaction** — e.g. `Board`'s Enter/Space column activation
(spec 043 FR-001..006), currently covered only at the pure-helper layer in
`tests/unit/boardA11y.test.js`. Real focus management and key sequences are where `user-event`
genuinely beats hand-dispatched `keyDown`.

#### Stub `window.confirm`/`window.alert` on `window`, **not** just `globalThis`

In this jsdom harness `window` and `globalThis` are **not** the same object, and React event
handlers resolve `window.confirm` off `window`. Assigning only `globalThis.confirm` leaves the
component calling jsdom's built-in stub ("not implemented"), so a test asserting "a confirmation
appeared" silently records zero calls. Set **both**, and restore them in `after()`:

```js
let confirmCalls = [];
before(() => {
  const fake = (msg) => { confirmCalls.push(msg); return true; };
  globalThis.confirm = fake;
  window.confirm = fake;   // ← the one that actually gets called
});
```

Worked example: `tests/dom/AdminAudioPageWarning.dom.test.jsx` (spec 051 FR-015).

#### A page that fetches on mount needs **every** URL stubbed, not just the one under test

`AdminAudioPage` now issues `GET /api/admin/audio/status`, `GET /api/admin/lessons`, and (on
selection) `GET /api/admin/lessons/:id/audio-status`. A `fetch` stub that only answers the endpoint
a test cares about leaves the others rejecting, producing unhandled rejections that surface as
unrelated noise or a flaky pass. Match on URL and return a minimal valid shape for each.

This cuts the other way too: **adding a section to a shared page changes what every existing DOM
test of that page renders.** After extending such a page, re-run the whole `test:dom` suite, not
just your new file.

#### Prefer an exported pure resolver over module mocking for a static ESM import

This repo has **no** module-mocking precedent (`grep -ran "mock.module" tests/ server/` → zero hits)
and a static ESM binding cannot be patched from outside. When a function's behaviour depends on a
statically imported helper you need to vary (config readers, clock, env), export a **pure resolver**
and give it an optional test-only DI parameter, then assert against that:

```js
// production callers pass nothing; only the test passes readConfig
export function resolveSynthesisConfig(lang, { readConfig = readTtsConfig } = {}) { … }
```

`server/ttsProvider.js`'s `resolveSynthesisConfig` exists solely as this seam — it lets
`server/ttsProvider.test.js` drive a fake legacy-model config through the real refusal logic without
touching the module graph. Keep such a seam **test-only by convention** and say so in its JSDoc, so a
future production caller doesn't start threading config back in through the back door.

#### Grep-as-lint tests must not use bare `grep`

Several guarantees here are enforced by a test that greps the tree for a forbidden pattern (no file
outside `ttsProvider.js` constructing an OpenAI TTS request; no file importing `synthesizeRaw`).
**Bare `grep` silently reports zero matches** in this environment — the non-UTF-8 locale makes
multibyte files read as binary — so such a lint passes vacuously and proves nothing. Either use
`grep -a` or, preferably, do the walk in Node with `fs.readFileSync` + a regex, which sidesteps the
locale entirely. **Prove the lint works by temporarily inserting a real violation and confirming it
goes red** — a lint that has never been seen failing is not known to work. Match on actual import
syntax rather than a bare substring, or a doc comment naming the symbol will trip it.

### `node --test` Conventions

- **Runner**: Node.js built-in `node:test` + `node:assert/strict`. No Jest, Mocha, or other frameworks.
- **Running a single file**: `node --test connect-four/tests/blunder/insertGameBlunder.test.js`
- **File naming**: `*.test.js` inside `connect-four/tests/<category>/`
- **Assertion style**: `import assert from 'node:assert/strict'`; use `assert.equal()`, `assert.ok()`, `assert.throws()`.
- **Fixture format**: Static JSON arrays checked into the repo. No random generation. Solver scores are real values obtained from the c4solver binary.

### `test:fast` vs `npm test`

- **`npm run test:fast`**: Runs all tests EXCEPT `candidate-generator.test.js`. That test calls the real c4solver up to 400 times per run and frequently hangs for 10+ minutes due to solver IPC deadlock. Use this for all regular development and CI.
- **`npm test`**: Full suite including `candidate-generator.test.js`. Only run when explicitly testing candidate generation.

New test files are NOT auto-discovered — add them to the `test` and `test:fast` scripts in `connect-four/package.json` when ready.

### Solver-backed suites: test over pre-computed evidence, not a live solver

A test that needs reason-engine output for many boards must **not** call `computeReason`/the c4solver
inside `test:fast` — that reinherits the solver-IPC hang and slows every run. Instead, materialize the
evidence **once** and read it back:

1. Generate: `node server/scripts/compute.mjs --input <boards>.jsonl` writes
   `reason_evidence_<stem>.jsonl` (rows `{ id, evidence, groundTruth|null }`) via the solver, once.
2. Commit that evidence file (jsonl is globally gitignored — commit with `git add -f`).
3. The test reads the evidence rows and pushes each through the pure render pipeline
   (`toNarratorVector(row.evidence)` → `buildReasonRenderModel`/`buildRenderDecision`) — **no solver call**.

`renderCoverageCorpus.test.mjs` and `renderCoverageUniverse.test.mjs` follow this pattern. The boards
file and its `reason_evidence_*` file are a **matched pair**: regenerate both together (re-running the
sampler alone leaves the evidence — and the test's coverage claim — stale).

**Never run `test:fast` concurrently with a solver harvest** (e.g. `select_boards --strategy coverage`)
or a second solver job — the integration tests deadlock on solver IPC under CPU contention (they pass
in isolation). Run solver-heavy jobs serially.

### ESLint environment-split (`eslint.config.js`)

Spec 055 (Epic 8) replaced a single flat-config block with an environment-scoped split, so that
node-only globals (`process`, `require`) and browser-only globals (`window`, `document`) each apply
only where they are actually valid, and ESLint 9's flat-config MERGE-by-glob semantics can't leak one
environment's globals into the other:

- **`src/**` (browser)** — `globals.browser`; the only block carrying `eslint-plugin-react-hooks` and
  `eslint-plugin-react-refresh` (`reactHooks.configs.flat.recommended`,
  `reactRefresh.configs.vite`). `react-hooks/*` (`set-state-in-effect`, `refs`, `static-components`,
  `immutability`, `preserve-manual-memoization`) and `react-refresh/only-export-components` are
  **demoted from the plugin's default `error` to `warn`** — fixing the 36 findings behind them is
  behavior-affecting UI refactoring (effect timing, ref usage, memo boundaries), out of this epic's
  scope; tracked in `docs/open_issues.md` OI-119 for a future pass. No other rule is silently disabled
  or demoted.
- **`server/**` and `scripts/**` (node)** — `globals.node`.
- **`tests/**` in general (node)** — `globals.node`. Most of `tests/` reaches browser-ish globals only
  via `globalThis.X`, which does not trip `no-undef` under a node-only global set.
- **`tests/dom/**` (node + browser, merged)** — `{ ...globals.node, ...globals.browser }`. This is the
  jsdom DOM suite (run via `npm run test:dom`); it genuinely needs both node globals (the test runner)
  and browser globals (`document`/`window` used directly in the test bodies).
- **Two explicit catch-all blocks**, not a glob-based catch-all: `files: ['vite.config.js',
  'eslint.config.js']` (node) and `files: ['public/sw.js']` (`{ ...globals.browser,
  ...globals.serviceworker }`). A broad `**/*.{js,jsx,mjs,cjs}` catch-all block was deliberately
  avoided — flat-config blocks with overlapping `files` globs both apply and MERGE, so a wide
  catch-all would re-inject node globals into `src/**` (or vice versa) alongside the scoped block.
- Every block's `files` glob is `*.{js,jsx,mjs,cjs}` — `.mjs`/`.cjs` are included, not just
  `.js`/`.jsx`.

### The DOM-assertion trap: never `assert.equal`/`assert.strictEqual` a live DOM/React node

The single most valuable durable finding from this epic. In `tests/dom/*.dom.test.jsx` (the jsdom
suite), **never pass a live DOM node or React element as an operand to `assert.equal()` /
`assert.strictEqual()`** — e.g. `assert.equal(screen.queryByText('13'), null)`. On a legitimate
*failure* (the two operands actually differ), Node's `assert` formats a diff via `util.inspect`, which
walks the DOM node's object graph — including React's Fiber tree, whose `_debugOwner`/`return`/`child`
pointers are circular and whose `_debugStack` fields are full `Error` objects — plus jsdom's
getter-heavy prototype chain. That walk alone takes **30s+ per failing assertion**, instead of the
~18ms a normal assertion failure costs. A test suite with several such assertions can look "hung" long
before it ever prints a failure.

**Fix**: compare a derived primitive instead of the node itself:

```js
// BAD — on failure, util.inspect walks the Fiber tree + jsdom prototypes (30s+)
assert.equal(screen.queryByText('13'), null);

// GOOD — same assertion, but the failure diff is a boolean (~18ms)
assert.equal(screen.queryByText('13') === null, true);
```

All 19 such sites across the DOM suite were converted to this pattern during this epic (see e.g.
`tests/dom/BoardWindowCounts.dom.test.jsx:50,87`, `tests/dom/CoachDialogNarrationControls.dom.test.jsx:66`,
`tests/dom/PricingScreen.dom.test.jsx`, `tests/dom/SetCard.dom.test.jsx`,
`tests/dom/SlideEditorWindowCounts.dom.test.jsx`, `tests/dom/SocraticHintPhase.dom.test.jsx`,
`tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx`). The same trap applies to any live DOM/React
value — not just query results — passed directly as an assertion operand.

**Related trap while auditing for this pattern**: a bare `grep window` (or similar) over the test tree
over-matches heavily on the domain term "window" (Connect Four's own `windowCounts`, "four-cell
window", threat-window terminology, etc.), which are unrelated to the DOM global `window`. Scope any
such search to the actual assertion-operand pattern (e.g. `assert\.(equal|strictEqual)\(\s*\w+\s*,`
followed by a DOM-returning call), not a bare keyword match.
