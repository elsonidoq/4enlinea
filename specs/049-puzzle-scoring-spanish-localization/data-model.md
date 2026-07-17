# Phase 1 Data Model: Puzzle Scoring-by-Pattern & Spanish Localization

No DB schema change (FR-004). This document covers in-memory/request-response shapes only.

## Entities

### `SINGLE_ANSWER_CATEGORIES` (new constant)

A `Set<string>` of exactly six category slugs, mirrored in two files (no cross-import — see
research.md R3):

```js
// server/categories.js and src/lib/categories.js — identical literal
export const SINGLE_ANSWER_CATEGORIES = new Set([
  'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape',
]);
```

Invariants:
- MUST NOT include any of `MULTI_SOLUTION_CATEGORIES` (`immediate_threat`, `forced_block`,
  `double_threat`) — the two sets are disjoint.
- MUST NOT be derived as a complement of `MULTI_SOLUTION_CATEGORIES` against `VALID_CATEGORIES` —
  `forced_win`, `forbidden_columns`, `odd_even_threat` are in `VALID_CATEGORIES` but belong to
  neither set (FR-011: their existing behavior is unaffected by this feature).
- Both copies MUST stay in sync by construction of this task list (mirrors the existing
  `MULTI_SOLUTION_CATEGORIES` maintenance burden — no new tooling introduced for this feature).

### Puzzle metadata (client-sent, request-scoped — not a persisted entity)

The subset of a puzzle row's fields needed by `evaluatePredicate` for the six single-answer
categories, sent by the client in the `POST /api/evaluate-move` request body. **The values are
already available client-side**, but **NOT already in the shape `evaluatePredicate` expects**: the
client's local puzzle object (`current` in `ChallengeScreen.jsx`, from `GET /api/puzzles/draw`) is
**snake_case** (`current.correct_col`, `current.highlight_metadata`) while `evaluatePredicate`
reads **camelCase** (`puzzle.correctCol`, `puzzle.highlightMetadata`). This is a mandatory
top-level field-name remap, performed on the client when building the request body (Decision A —
see research.md R1a): `correctCol: current.correct_col`, `highlightMetadata:
current.highlight_metadata`. Only the top-level key names remap — the inner `highlight_metadata`
JSON value (`.column`, `.cells[].role`) is passed through unmodified in both directions; no new
field is invented.

| Field (top-level, wire/predicate shape) | Client source (snake_case) | Type | Read by |
|---|---|---|---|
| `correctCol` | `current.correct_col` | `number \| null` | `evalClaimeven`, `evalFigure7`, `evalJShape` |
| `highlightMetadata.column` | `current.highlight_metadata.column` | `number \| undefined` | `evalZThreat` |
| `highlightMetadata.cells` | `current.highlight_metadata.cells` | `Array<{ column: number, role: string }> \| undefined` | `evalUndercut` (role `'killing_threat'`), `evalOvercut` (role `'major_threat'`) |

A missed remap is invisible: `evaluatePredicate` receives `undefined` for the unmapped field and
falls into the fail-closed path below, which is indistinguishable from a genuine wrong answer
(no error surfaces). See research.md R1a for why this requires a dedicated positive test.

Absent/malformed metadata for any of these fields is not a client error (no 400) — it flows into
`evaluatePredicate`'s existing per-category `undefined`/`null` guard, which already returns
`{ result: 'wrong' }` (fail-closed, FR-007). This is existing `predicates.js` behavior, unchanged
by this feature — only the fact that these fields now *reach* `evaluatePredicate` from this
particular endpoint is new.

### `POST /api/evaluate-move` response — `accepted` field (widened gate)

No new field. The existing `accepted: true | false | null` field's gating condition widens:

- **Before this feature**: `accepted` is non-null only when `category ∈ MULTI_SOLUTION_CATEGORIES`
  (3 categories).
- **After this feature**: `accepted` is non-null when `category ∈ MULTI_SOLUTION_CATEGORIES ∪
  SINGLE_ANSWER_CATEGORIES` (9 categories total). For every other category (`forced_win`,
  `forbidden_columns`, `odd_even_threat`, and any future addition), `accepted` stays `null` —
  unchanged (FR-011).

`quality`, `badge`, `coachPhraseKey`, `coachMood`, `summaryLineKey`, `patternTag` are computed
identically to today for every category, including the six — FR-003 forbids repurposing them.

## State transitions

None — this is a stateless, solve-time-recomputed verdict (FR-004). No entity's lifecycle changes.

## Six-category production-path coverage test (new test entity)

`tests/integration/singleAnswerCategoriesAccepted.test.js` (named in plan.md's Source Code
structure) mounts the real extracted handler from `server/evaluateMoveHandler.js`'s
`createEvaluateMoveHandler` (plan.md Decision D1 — not a hand-copied reimplementation) and drives
`POST /api/evaluate-move` for all six `SINGLE_ANSWER_CATEGORIES`, asserting both an
`accepted: true` and an `accepted: false` case per category, sourced from the boards in
research.md R7 (including the two OI-1 repro boards for `z_threat`:
`3333302444422222060315555054`, `3333334512266550121166`). Every request body carries the real
camelCase taught-pattern metadata for its category (see the Puzzle metadata table above); every
negative case sends that real metadata alongside a genuinely non-taught column, never absent
metadata (critique B1/B3 — an absent-metadata negative only proves the fail-closed default fires,
not that pattern membership was evaluated). Registered in both `test` and `test:fast` in
`connect-four/package.json` as part of US9.4.2, after US9.1/US9.2.6 land (see research.md R9
ordering constraint) so the suite is never registered red.

### `buildPredicatePuzzle` helper (new entity — shared handler-convergence construction path)

`buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle })`, called by
both `/api/evaluate-move` and `/api/evaluate-move/inline` (FR-006), returns the `predicatePuzzle`
object passed to `evaluatePredicate`. It MUST preserve/pass through `goalPredicateType` /
`goalPredicateParams` (defaulted from `puzzle.goalPredicateType || category` /
`puzzle.goalPredicateParams ?? null` when a `puzzle` object is supplied, matching `/inline`'s
pre-existing construction) — plan.md Decision D2 — so `/inline`'s non-single-answer categories
(`forced_win`, `forbidden_columns`) are unaffected by the convergence.

## Translation key entity (US9.3/US9.4)

### Translation key

A structured key path (e.g. `home.title`, `coach.z_threat.optimal.0`) present in `en.json`. After
this feature, every such path MUST also exist in `es.json` (FR-013), with:
- The same nesting depth and structural placeholders (`{{var}}`) as the English key (FR-014).
- Disc-color terms translated as verde/gris, never rojo/amarillo (FR-015).
- Coach-voice sections preserving the supportive, non-defeatist tone (FR-016).

Value equality is explicitly NOT required — a proper noun may be byte-identical in both files and
still pass the parity check (FR-019's "key presence, not text equality" contract).

### Key-parity check (US9.4 — new test entity, not a runtime entity)

A pure function `getNestedKeyPaths(obj) -> Set<string>` (dotted paths, arrays not expected in this
JSON) applied to both `en.json` and `es.json`; the test asserts the two sets are equal and reports
the symmetric difference (`missingFromEs`, `missingFromEn`) on failure.
