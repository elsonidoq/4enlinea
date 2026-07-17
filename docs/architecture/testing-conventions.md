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

## Running Tests

```
cd connect-four && npm test
```
Tests are **explicitly listed** in the `test` and `test:fast` scripts in `package.json` — there is no automatic discovery.

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
- `tests/unit/` (aiDifficulty, annotatedText, boardSpecToBoard, detectClaimodd, lessonLoader, socraticReducer)

**`npm run test:fast` additionally includes** `server/llmCoachHelpers.test.js`, `tests/blunder/insertGameBlunder.test.js`, the reason-engine suite `server/tests/reasonEngine{,.denial,.drawToLose,.enrichment,.witness,.winSamples}.test.mjs` (solver-backed but fast), `server/tests/reasonNarratorVector.test.mjs` (pure), and `server/tests/computeEvidenceIsolation.test.mjs` (the reason-eval `compute.mjs` per-board error-isolation regression, pure — uses a throwing solver stub), and the `server/tests/winDistribution.*.test.mjs` suite (the win_distribution pipeline: `playPolicyGame`, policies, `extractOutcome`, `aggregateRows`, `renderReport` — all pure/solver-free) but **excludes** `tests/integration/candidate-generator.test.js`. (The reason-engine and win_distribution tests are in `test:fast` but **not** in the slower `test` script.)

Files in `tests/difficulty/` and `tests/scores/` exist but are **not included** in either script — add them explicitly when they are ready.

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

### DOM / component tests (React Testing Library)

Pure function extraction covers logic, not rendering — assertions like "does this component mount," "does it re-render on retry," or "is this button reachable via role" need a real DOM. For that, this repo uses **React Testing Library** on jsdom, still driven by `node:test` (no Jest/vitest introduced).

- **Location**: `connect-four/tests/dom/*.dom.test.jsx`
- **Run with**: `npm run test:dom` (from `connect-four/`) — a **separate** script from `test`/`test:fast`, because DOM tests need a jsdom global registered via `tests/dom/setup.js` (imported with `node --import`), plus an esbuild-backed JSX loader hook (`tests/dom/jsxLoader.mjs`, also registered in `setup.js`) since Node has no native JSX support. Neither is wanted for the plain `node:test` suites.
- **Tooling**: `@testing-library/react`'s `render`/`screen`, `@testing-library/dom`, `jsdom`, `global-jsdom`.
- **File list convention**: like `test`/`test:fast`, `test:dom` enumerates files explicitly (no globbing) — the directory-recursion mode of `node --test` filters by extension and does not pick up `.jsx`. Add new DOM test files to the `test:dom` script in `connect-four/package.json` by name.
- **First example**: `connect-four/tests/dom/ErrorBoundary.dom.test.jsx` — renders `ErrorBoundary` around a child that throws and asserts the fallback's Retry button mounts.

Use DOM tests for render/remount/interaction assertions the pure-function pattern can't express. Keep pure-function extraction as the default for pure logic — it's cheaper to write and run.

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
