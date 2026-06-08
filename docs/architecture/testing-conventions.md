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
  blunder/
  difficulty/
  scores/
  unit/
```

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

**MUST**: Fixture files are static JSON checked into the repo — no random generation.
**MUST**: Each fixture has a human-readable `description` field.
**MUST**: Solver scores in fixtures are real values obtained from the c4solver binary, not invented.

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
Tests are **explicitly listed** in the `test` script in `package.json` — there is no automatic discovery. The following files are included:
- `server/test_explain_parity.js`
- `tests/predicates/predicates.test.js`
- `tests/predicates/forbidden_columns.test.js`
- `tests/classifier/classifier.test.js`
- `tests/integration/candidate-generator.test.js`
- `tests/integration/forced_win.test.js`
- `tests/integration/sequence_check.test.js`
- `tests/integration/z_threat.test.js`
- `tests/integration/claimeven.test.js`
- `tests/integration/figure7_jshape.test.js`
- `tests/integration/undercut_overcut.test.js`

Files in `tests/blunder/`, `tests/difficulty/`, `tests/scores/`, and `tests/unit/` exist but are **not run by `npm test`** — add them to the script explicitly when they are ready.

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
