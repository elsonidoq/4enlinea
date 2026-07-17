# Contract Delta: `POST /api/evaluate-move` and `POST /api/evaluate-move/inline`

This documents the *change* to the existing contracts in `docs/architecture/api-conventions.md`
("Move Evaluation Endpoint" section). It is a delta, not a full re-specification — fields not
mentioned here are unchanged.

## `POST /api/evaluate-move`

### Request body (widened)

```json
{
  "movestring": "string (0-indexed, 0-42 chars, digits 0-6)",
  "col": "number (0-indexed)",
  "category": "string, optional",
  "aiMove": "boolean, optional",
  "correctCol": "number | null, optional — NEW",
  "highlightMetadata": "object | null, optional — NEW"
}
```

- `correctCol` / `highlightMetadata`: sent by the client when `category` is one of
  `SINGLE_ANSWER_CATEGORIES` (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`,
  `j_shape`). These are camelCase wire field names, matching what `evaluatePredicate` reads
  (`puzzle.correctCol`, `puzzle.highlightMetadata`) and what `/api/evaluate-move/inline` already
  accepts. **The client MUST remap from its locally-held snake_case puzzle object** when building
  this request: `correctCol: current.correct_col`, `highlightMetadata:
  current.highlight_metadata` (see research.md R1a, data-model.md). This is a top-level rename
  only — the inner `highlight_metadata` JSON value (`.column`, `.cells[].role`) is unchanged.
  Ignored for every other category (harmless if sent, never read).
  Absent for these six categories is not a 400 — it flows through to `evaluatePredicate`'s
  existing fail-closed `{ result: 'wrong' }` path (see R5 / FR-007), which is why a missed remap
  is silent and MUST be caught by a positive `accepted: true` test (see Testing note below).

### Response body (widened gate, no new fields)

```json
{
  "badge": "good | mid | bad",
  "quality": "optimal | suboptimal | blunder",
  "coachPhraseKey": "string | null",
  "coachMood": "happy | think | oops",
  "summaryLineKey": "string | null",
  "patternTag": "string | null",
  "accepted": "true | false | null"
}
```

- `accepted`: **gate widens** from `category ∈ MULTI_SOLUTION_CATEGORIES` (3 categories) to
  `category ∈ MULTI_SOLUTION_CATEGORIES ∪ SINGLE_ANSWER_CATEGORIES` (9 categories). Computed via
  one shared expression (`server/index.js:1753`, widened per Decision B in research.md R1a):
  `accepted = result === 'correct' || result === 'tied'`, applied uniformly across all 9
  categories — equivalently `=== 'correct'` for the six single-answer categories, since those
  categories' `eval*` functions never return `'tied'` (verified against every one of the six in
  `predicates.js:289-341`; `'tied'` is exclusive to the three multi-solution categories per
  `server-conventions.md`). Do not add a second, category-conditional strict-equality branch — one
  gate expression covers both sets. `null` for every category outside both sets (`forced_win`,
  `forbidden_columns`, `odd_even_threat`) — unchanged.
- All other fields: unchanged in meaning and computation for every category (FR-003).

## `POST /api/evaluate-move/inline`

**No client caller**: `rg` across `connect-four/src/` finds no fetch call targeting this route.
The convergence work below is still correct to do (removes a divergent second
`evaluatePredicate` call site and fixes a live 500), but no browser-driven flow validates this
endpoint's request shape as part of this feature — it is not an end-to-end oracle for Decision A's
remap. The `/api/evaluate-move` plain handler (which `ChallengeScreen.jsx` does call) is the
production path that Testing must cover directly.

### Bug fix (no contract shape change)

`server/index.js:1779`: `!VALID_CATEGORIES.includes(category)` → `!VALID_CATEGORIES.has(category)`.
Before this fix, every request to this endpoint throws a `TypeError` and returns `500`. After the
fix, the existing documented 400 `{ "error": "invalid puzzle category: <category>" }` response
becomes reachable for genuinely invalid categories, and valid categories proceed to the existing
response body (unchanged shape — `badge`, `quality`, `coachPhraseKey`, `coachMood`,
`summaryLineKey`, `patternTag`, `correctCol`, `threatCells`, `forbiddenCols`).

### Handler convergence (implementation detail, not a contract change)

Both handlers MUST call `evaluatePredicate` with the same puzzle-metadata shape for the six
single-answer categories after this feature — no response-shape change to this endpoint, but the
internal code path computing `predicateResult` for these six categories becomes shared with the
plain `/api/evaluate-move` handler's new `accepted` computation, via a small shared
`buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle })` helper
that builds the `predicatePuzzle` object from either request shape and preserves
`goalPredicateType`/`goalPredicateParams` (defaulted from the puzzle object when present) so
`/inline`'s non-single-answer categories (`forced_win`, `forbidden_columns`) keep working
(plan.md Decision D2). Response/request shapes above remain the binding contract; the helper's
exact placement (`server/index.js` vs. `server/predicates.js`) is not.

**Testability (plan.md Decision D1)**: the `/api/evaluate-move` handler itself MUST be extracted
into an importable, side-effect-free factory — `server/evaluateMoveHandler.js`'s
`createEvaluateMoveHandler({ solver, i18nTranslations })` — so integration tests mount the actual
production handler rather than a hand-copied reimplementation. `server/index.js` cannot be
imported directly by tests (it calls `app.listen()` at module load with no exported `app`), so the
handler body lives in its own module; `server/index.js`'s route registration becomes a thin call
to the factory. This is what makes `tests/integration/singleAnswerCategoriesAccepted.test.js` and
`tests/integration/evaluateMoveMultiSolution.test.js` genuine coverage of T004-T007's production
edits (closing critique B1/B2), rather than a test of a separately-maintained mini-handler.

## Errors (unchanged)

`POST /api/evaluate-move`: `400` for invalid `movestring`/`col`, `500` for solver errors — no new
error cases (metadata absence is fail-closed via `accepted: false`, never a `400`).

`POST /api/evaluate-move/inline`: `400` for invalid `movestring`/`col`/missing `puzzle` object/
invalid category (now actually reachable — see bug fix above), `500` for solver errors.

## Testing note (mandatory positive case + real-metadata negative case)

Per research.md R1a, tests MUST include a positive case per single-answer category — a request
with a genuinely taught/correct `col` returning `accepted: true` — not only negative/absent-metadata
cases. A test suite that only asserts `accepted: false` (or the previous `accepted: null`) would
pass even if the client→server remap is silently broken.

Additionally (2026-07-13 critique B1/B3): every negative (`accepted: false`) case MUST send the
real taught `correctCol`/`highlightMetadata` for its board alongside a genuinely non-taught `col`
— not omit the metadata. A negative case built from absent metadata only exercises the FR-007
fail-closed default (`undefined` → `{ result: 'wrong' }`), which is indistinguishable from a case
that never reaches the actual pattern-membership comparison at all; it does not prove
non-membership was correctly evaluated. See
`tests/integration/singleAnswerCategoriesAccepted.test.js` (data-model.md) for the file that
carries this coverage, mounting the real extracted handler per the Testability note above (not a
reimplementation).
