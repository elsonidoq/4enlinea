# Server Conventions

## Error Logging

**MUST**: All catch blocks in server route handlers and helpers call `logError` before responding or returning.

```js
import { logError } from './logger.js';

// Route handler
} catch (err) {
  logError('[endpoint-name]', err);
  res.status(500).json({ error: 'Internal server error' });  // generic body — never err.message
}

// Helper / background job
} catch (e) {
  logError('[job/step]', e, { uid: room.uid });  // extra context is optional
  skipped++;
  continue;
}
```

**Audit heuristic for 500-body leakage:** grepping `err.message` in catch blocks alone misses the
`{ error }`-destructure shape, where the body is built from a destructured result rather than a
caught error — e.g. `res.status(error ? 500 : 404).json({ error: error?.message || 'not found' })`.
When auditing for raw error-text leakage, also grep for `error?.message` / `error.message` inside
`.json(...)` calls, not just `err.message` in `catch` blocks. This shape is still live at
`connect-four/server/index.js` (~:438): `res.status(400).json({ error: error?.message || 'Anonymous sign-in failed' })`.

`logError(tag, err, extra?)` in `server/logger.js`:
- Always calls `console.error` with tag, message, stack, and optional extra object.
- If `SENTRY_DSN` is set, calls `Sentry.captureException(err, { tags: { tag }, extra })`.
- `tag` convention: `'[route-path]'` e.g. `'[auth/callback]'`, `'[puzzles/check/solver]'`

**Global safety net**: A 4-arg Express error middleware is registered at the end of `index.js` (before `app.listen`) and catches any error passed via `next(err)` or thrown in async routes. All route handlers still call `logError` directly — the global handler is a last resort, not a substitute.

**Intentional exception**: Client-input validation errors that respond with 4xx are NOT logged as errors — e.g. a `400 Invalid movestring` catch block is intentionally silent.

## Solver IPC — Persistent Process

**MUST**: The standard scoring solver (`c4solver -a -b 7x6.book`) runs as a single persistent child process spawned at server startup via `createSolverProcess()` in `c4solver-wrapper.js`.
Queries are serialized: one move string written to stdin per request, one line of scores read from stdout. The wrapper serializes concurrent calls via a promise chain — never query the persistent solver from multiple places in parallel.
Rationale: The solver binary takes ~2 seconds to load the opening book; a new process per request would be too slow.

## Solver IPC — One-Shot Processes

Two other invocation modes spawn a fresh child process per call:

1. **Heatmap data** (`/api/explain`): `spawn(c4solver, ['-x'])` — returns 84 integers (two 7×6 grids) representing threat coverage for both players.
2. **Depth-limited search** (`/api/scores` with `depth` param): `spawn(c4solver, ['-nb', '-d', depth, '-a'])` — returns 7 scores, no book lookup.

## Solver Input/Output Format

- **Input**: A move string written to stdin, followed by `\n`. Format: digits `1–7`, one per move, 0–42 characters. `c4solver-wrapper.js` converts from 0-indexed (`0–6`) to `1–7` before writing — callers always pass 0-indexed strings.
- **Output** (standard mode): One line per query. When a move string is non-empty, the first token is the input echoed back; scores are tokens 1–7 (0-indexed). When the input is empty, only 7 tokens are returned.
- **Empty board special case**: The persistent solver hangs on empty input. Use the hardcoded `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` constant instead.

## Move String Convention

**MUST**: Move strings use **0-indexed** columns `0–6`, concatenated, no separator. This applies everywhere: DB storage, API wire format, and all server/frontend logic.
**MUST**: The only conversion from 0-indexed to 1-indexed happens inside `c4solver-wrapper.js` `query()` before writing to the solver's stdin. No other file may perform this conversion.
**MUST**: Player parity derived from move count: even = player 1 (Red), odd = player 2 (Yellow).

## Board Representation (Server)

**MUST**: Boards are `board[row][col]` where row 0 is the bottom row. Values: `0` (empty), `1` (Red/player 1), `2` (Yellow/player 2).
`new Board(movestring)` in `classifier.js` is the standard entry point for board-state access in the classifier and detectors (see **Board Class** below).
`parseBoardState` in `classifier.js` and `completionStrategies.js` is a lower-level primitive used by `Board` internally and by simulation loops that need mutable raw arrays.

## CompletionStrategy Interface

Sequence-mode puzzle validation uses a strategy object with:
```js
validateMove(position, col) → { valid: boolean, reason?: string }
```
- `position`: move string before the learner's move (0-indexed, digits `0–6`).
- `col`: 0-indexed column.
- All logic is bitboard-only — no solver calls.

`ForcedWinStrategy` (in `completionStrategies.js`) is the only current implementation. Validates that:
1. The learner had no immediate win before the move (forces them to play through the sequence).
2. The move creates at least one new immediate threat.

`getAiResponseCol(positionAfterLearnerMove)` returns the column where the learner has an immediate threat (the opponent must block there). Returns `-1` if no such column exists. The AI's response is bitboard-only by design — `ForcedWinStrategy` never calls the solver for it; solver-guided AI response was considered and explicitly deferred.

## Category Registry

**MUST**: All valid category slugs are defined once in `server/categories.js` as `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NAMES`.

Current slugs: `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`, `odd_even_threat`, `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape` (`claimodd` was fully removed 2026-06-17 — see "Retired category slugs" below).

`odd_even_threat` was added in Epic 6 as a free 2-star category. The puzzle *category* is Red-only (the detector itself is perspective-generic — see the Blunder Tag Registry note below), `single_move` interaction mode, and has no `highlight_metadata`. Detection uses `immediateThreats` not `getMajorThreatCells`.
**MUST NOT**: Hard-code category slug lists anywhere else in server code — always import from `categories.js`.

`PAID_CATEGORIES` is duplicated (not cross-imported) in two files that must be kept in sync by hand: `server/categories.js` (gates `GET /api/puzzles/draw` — 403 for a paid category when tier ≠ `'paid'`) and `src/lib/categories.js` (gates the SetPicker lock icon and the Post-Set Summary Pro-lesson check). Updating only one leaves the other gate half-fixed (server 403 with an unlocked UI icon, or vice versa).

### Wiring a new puzzle category

Registering a new category slug touches all of these files; omitting any one causes a **silent** failure (most commonly, `candidate-generator.js` — the generator factory falls through to a generic fallback with no error, and simply never produces candidates for the category):

1. `server/categories.js` — add to `VALID_CATEGORIES`, `CATEGORY_ORDER`, `PAID_CATEGORIES` (or note free)
2. `src/lib/categories.js` — mirror the same arrays (frontend copy; must stay in sync)
3. `server/challengeSets.js` — add the set entry with `stars`, `displayNameKey`, `descriptionKey`
4. `connect-four/src/i18n/en.json` — add `coach.<slug>.prompt.*`, `coach.<slug>.hint.*`, `coach.<slug>.optimal.*`, `coach.<slug>.suboptimal.*`, `coach.<slug>.blunder.*` pooled-key groups
5. `server/classifier.js` — register in the `classify()` switch and add a `detect<Category>` function
6. `server/predicates.js` — add `eval<Category>` in the `evaluatePredicate()` switch
7. `server/candidate-generator.js` — register in `checkPredicateRaw`'s dispatch AND add a `computeHighlightCells` case AND add an `isClean` case (see below)
8. `PATTERN_KB` (`server/llmCoachHelpers.js`) — add a one-line entry (or note reuse of an existing key)

### Why there is no `opening` category (settled 2026-07-04 — do not relitigate)

Opening theory is deliberately **not** a puzzle category, and adding one is not an oversight to fix.
Openings do not fit the recognition-puzzle model on two independent counts:

- The flagship "won position" opening boards — `333334444` (5-4), `3333311115555` (candlesticks),
  `3332222` (3-4) — have the **losing side to move**, so there is no column for the learner to
  recognize.
- There is no generatable one-move opening signal for a classifier to detect. The only clean
  unique-move opening boards are the gambit `3265533353553111` → col 4 and D3-D4 Diagram 231
  `3332223362` → col 1, and both are singletons.

Opening *interaction* is delivered through **Lessons** instead (one client-side Socratic per lesson:
empty→3, imitation, gambit→4, D3-D4→1). The **reason engine** covers openings as a book-deviation
reason — when a blunder's pre-move history is a mirror-normalized prefix of a KB opening line and the
blundering player is the opening's beneficiary, it names the opening and states the book's next move;
off-book openings fall back to centrality (`centerDominance.js`). See `reason-DECISIONS.md` D31–D34
(prefix-match, beneficiary-only, book-move-is-best, name-specific-only-when-unique-else-family).

Do **not** build an `opening` category or its wiring (above). A prior full implementation attempt
(branch `feat/opening-aware-reason-engine`) was declared a FAILED attempt and deleted — do not
resurrect it. If asked to "add openings to challenges/puzzles", push back with the recognition-task
mismatch above.

### Retired category slugs

Never reuse a retired category slug — reintroduce the concept under a new name if needed:
- `fork_setup`, `parity_control` — removed (no puzzles were ever generated).
- `zugzwang` — renamed to `forced_win`; do not reuse `zugzwang` for `forced_win` logic. "Zugzwang" has a specific game-theory meaning that does not match this category's implementation; a correctly-defined `zugzwang` category is expected later and would collide with a reused slug.
- `claimodd` — removed entirely 2026-06-17 (category, detector, blunder tag, challenge-set entry, i18n key). The formal WeakC4 definition treats claimodd as a per-cell annotation across all columns, not center-column-specific; both the KB entry and the old `detectClaimodd` incorrectly assumed center-column specificity, and even a correct implementation yielded ~2 candidates per 400 generation attempts (solver-weighted simulation fills the center column early). Do not re-add without reading the WeakC4 source and building a Steady-State-diagram-aware detector plus a specialized generator.

### Generation-quality guards (`isClean`, forced-win trace floor, stacked double threat)

`isClean(category, ms)` in `candidate-generator.js` enforces per-category acceptance invariants on top of the raw predicate:
- `immediate_threat`: exactly one immediate winning column AND no active double-threat structure (see below).
- `forced_block`: current player has no immediate win AND the opponent has exactly one immediate winning column AND no active double-threat structure for the opponent.
- `forced_win`: current player has no immediate win AND the opponent has zero immediate threats (otherwise the opponent would just win instead of being forced).
- `forbidden_columns`: current player has no immediate win AND the opponent has no active double-threat structure.
- All other categories: current player must have zero immediate winning threats.

When adding a new category, add its guard to `isClean`.

`checkForcedWinPredicate` rejects any forced-win trace shorter than 3 plies (`[I1, O1, I2]` — initiator move, opponent forced block, initiator terminal win/double-threat); a shorter trace means the first move already wins or creates a double threat outright, which belongs to a different category.

**Stacked double threat**: a position with exactly one immediately-playable winning column still counts as an active double threat if the same player also has a major threat directly above that winning cell (same column, row+1) — the opponent cannot stop the win by blocking the lower cell. `hasActiveDoubleThreat(board, colHeights, player)` in `classifier.js` (built on `getImmediateThreats` and `getMajorThreatCells`) returns true for either ≥2 immediate winning columns or exactly one plus a stacked major threat above it. These positions must be excluded from `immediate_threat`, `forced_block`, and `forbidden_columns` puzzles. Regression movestring `03630015223512113` (Yellow stacked double threat at col 5, rows 1+2) must return `true`.

**`z_threat` generation guards** (parity/zugzwang detection — geometry owned by `docs/knowledge-base/`, not repeated here):
- If Count (empty cells from current column height up to and including the threat row, inclusive) is even → 0-threat: neutral, does not shift zugzwang, and is not a valid z-threat.
- The solver must confirm the candidate Z-threat column is actually a winning move — parity alone is not sufficient.
- Exactly one Z-threat column should be winning, for puzzle uniqueness — filter out candidates with more than one during generation.

## Blunder Tag Registry

**MUST**: All valid blunder tags are defined once in `server/blunderTags.js` as the `VALID_BLUNDER_TAGS` Set.

The set contains exactly 16 tags (as of 2026-06-25): `immediate_threat`, `forced_block`, `forced_win`, `double_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`, `z_threat`, `major_threat_parity`, `major_threat_nonparity`, `minor_threat`, `claimeven`, `drawing_move`, `suboptimal_move`, `forbidden_columns`.

`odd_even_threat` was **removed** as a blunder tag 2026-06-25 (it remains a puzzle category and a `classifyPattern` tag; `detectOddEvenThreat` in `classifier.js` supports both players, and D40 excludes the tag from live-coach recognition). The three parity-aware threat tags replaced its blunder role; they are generic (almost any mid-game position carries a latent major threat), so they rank **last** among tactical tags in both `tagBlunder` cascades, just above the score-based fallbacks.

`odd_even_threat` therefore lives a split life, and grepping `classifier.js` will mislead you — `detectOddEvenThreat` is still registered in `classifyPattern`'s detector list, so the tag still appears in pattern Maps, but it is de-listed from the coach and blunder vocabularies. **Still wired (puzzle path — KEEP):** `categories.js` (`VALID_CATEGORIES`/`ORDER`/`NAMES`), `challengeSets.js`, `src/lib/categories.js`, `candidate-generator.js` (`checkOddEvenThreatPredicate`), `predicates.js` (`evalOddEvenThreat`), `classifyAiMove.js` (`AI_PATTERN_PRIORITY`), `shapeDescriptor.js` (`descriptorForPositional`), and `detectOddEvenThreat` + its `classifyPattern` registration. **Removed (coach + blunder — do NOT restore):** `PATTERN_KB` entry (`llmCoachHelpers.js`), `POSITIVE_CASCADE` (`explainContext.js`), `VALID_BLUNDER_TAGS` (`blunderTags.js`), both `tagBlunder` cascades (`MISSED_OWN_PRIORITY`, `ENABLED_OPP_PRIORITY` in `classifier.js`), and its REASON/POSITIVE templates (`blunderReasons.js`); its KB article `docs/knowledge-base/derived-odd-even-threat.md` was deleted, along with its `kbTermLesson.js` entry and the row in `llm-coach-endpoints.md`'s Pattern→KB table.

`detectOddEvenThreat`'s `categoryEvidence` writes perspective-neutral field names — `goodRowCol`/`goodRow` (the majority-threat column/row) and `badMinorCol`/`badMinorRow` (the minor-threat column/row), written at `classifier.js:1615-1618`. These fields are not consumed anywhere downstream (verified: `classifier.js:1615,1617` are the only hits for those names in `connect-four/server` and `connect-four/src`) — safe to rename if needed.

`VALID_BLUNDER_TAGS` is distinct from `VALID_CATEGORIES` in `server/categories.js` (which lists puzzle category slugs). Blunder tags are applied to sparring-game blunders via `tagBlunder()` in `classifier.js`. Any tag not in this set is substituted with `'suboptimal_move'` before INSERT into the `blunders` table.

**MUST** import `VALID_BLUNDER_TAGS` from `server/blunderTags.js` wherever a blunder tag is validated (e.g., the `POST /api/games/analyze` endpoint guard).
**MUST NOT** duplicate the tag set locally — always import from `blunderTags.js`.
**MUST NOT** conflate `VALID_BLUNDER_TAGS` with `VALID_CATEGORIES` — they serve different purposes.

**`VALID_BLUNDER_TAGS` tracks `pattern_category` only, never `direction`** (verified 2026-07, spec 052 T033A): the Set holds `pattern_category` values (e.g. `'drawing_move'`, already a member) — it has no concept of `direction` at all. Decision D39 (the forfeited-forced-win refinement) mints a new `direction` value (`forfeited_win`), not a new `pattern_category`, so `blunderTags.js` required no change. Do not fold a `direction`-only change into this registry.

## Classifier vs Predicate Evaluator — Explicit Separation

**MUST NOT** conflate these two systems — they are independent:

- `classifier.js` → **labeling only**: determines which tactical pattern a position exhibits. Output: a category slug and evidence tags. Used for puzzle curation, candidate generation, and coach explanations.
- `predicates.js` → **correctness scoring only**: determines whether the learner's move satisfies the puzzle goal. Output: `'correct' | 'wrong' | 'tied'`. A classifier tag does NOT imply predicate correctness, and a correct move does not require a matching classifier tag.

A puzzle's `category` field is set by the classifier at generation time. The predicate evaluator reads `category` to dispatch to the right evaluator.

**Separation of responsibility, NOT a ban on reuse.** `predicates.js` may — and for concept-defined categories **must** — call a `classifier.js` detector to decide *what counts as* the taught pattern. What it must never do is re-derive the pattern with its own private logic. `evalForcedWin` has always called `detectForcedWin`/`detectDoubleThreat`; `evalDoubleThreat` now calls `detectDoubleThreat` too. See "Answer sets are derived, never re-implemented" below for why.

**New endpoint modes gate on an explicit request flag, never absence-of-field.** When adding a new mode to an existing endpoint, branch on an explicit boolean (e.g. `aiMove: true`), not on some other field being missing — sibling callers may also omit that field. This is why `evaluate-move` dispatches on `aiMove`, not on a missing `category`.

## Predicate Evaluator

`evaluatePredicate(puzzle, candidateCol, scores)` in `predicates.js` dispatches on `puzzle.category`.
Returns `{ result: 'correct' | 'wrong' | 'tied', correctCol?, tiedWith?, forbiddenCols? }`.

New category evaluators MUST be added as a named function `eval<CategoryCamelCase>(candidateCol, puzzle)` and registered in the `switch` statement.

Categories that store their answer in `highlightMetadata` (z_threat, undercut, overcut) read `puzzle.highlightMetadata`.
Categories whose answer set was widened by spec 051 (Epic 1) — `claimeven`, `figure_7`, `j_shape`,
`odd_even_threat`, `z_threat`, and (set-membership-wise) `overcut` — read `puzzle.correctCols`, an
array, not a single scalar (post-FR-024; the stale `puzzle.correctCol` scalar line this replaces was
only ever true pre-spec-051). See "The tri-state set-membership contract" below for the exact shape
and the threaded-vs-recomputed decision each of these evaluators had to make.

### Answer sets are derived, never re-implemented (2026-07-28)

An evaluator's job is to produce the **set** of columns that satisfy the concept, then map that
set to `correct` (sole member) / `tied` (one of several) / `wrong`. Two rules:

1. **Derive the set from the canonical detector.** For a concept `classifier.js` already defines,
   the evaluator loops over legal columns and asks the detector. It must not re-derive the rule.
   `evalDoubleThreat` used to, with a private helper that only looked at cells at the current
   column height — so it saw only `detectDoubleThreat`'s **Case A** (gravity-top threats in ≥2
   distinct columns) and graded every **Case B** fork (two threats stacked on consecutive rows of
   one column) as wrong. That shipped as a live bug in lesson 6.
2. **No fallback.** An evaluator must never answer "no column satisfies the concept" by grading
   something else instead. `evalDoubleThreat` used to fall back to "highest positive solver
   score", which turned a fork drill into a best-move drill — and because
   `candidate-generator.js` grades through the same function, it admitted fork-less boards into
   the pool: **98 of 100** `double_threat` puzzles contained no fork on any column. An empty set
   means the board is not a puzzle for that category; return `wrong` and let
   `checkPredicate` report `passes: false`.

**The board-quality invariant that makes single-answer categories sound.** Pre-spec-051, the six
`SINGLE_ANSWER_CATEGORIES` detectors were *instance* detectors — they returned their first match and
a single column, so there was no cheap way to enumerate a set, and those evaluators compared against
the stored scalar directly. Spec 051 (Epic 1) removed that ceiling: every one of the six now has a
set-returning path (`checkFigure7Predicate`/`checkJShapePredicate` accumulate every matching column
instead of returning on the first; `detectZThreat`/`detectOvercut` gained an additive `correctCols`
field over their existing per-column sweep; `detectClaimeven` now runs one solver simulation per
odd-height column and enumerates every column whose simulation confirms, rather than picking exactly
one — see "Claimeven: full per-column enumeration" below). The invariant itself is unchanged and
still governs every category, single-answer or not — the board is required to satisfy:

```
optimalCols ⊆ acceptedCols        every winning move is accepted
acceptedCols ∩ optimalCols ≠ ∅    the taught move actually wins
```

A board that violates either is a **content defect** — replace the board, never loosen the grader.
(`claimeven` is exempt from the sibling **uniqueness** rule other single-answer categories carry —
see "Claimeven: full per-column enumeration" below — but is not exempt from this invariant.)

### The tri-state set-membership contract (FR-003, spec 051 Epic 1)

Every pattern-category evaluator returns the same tri-state shape:

```
{ result: 'correct' | 'wrong' | 'tied', correctCol?: number, tiedWith?: number[] }
```

`'correct'` means the played column is the *sole* member of the answer set; `'tied'` means it is one
of 2+ members (`correctCol` is the first member, `tiedWith` the rest); `'wrong'` means it is not a
member at all (`correctCol`, when present, names a member for hint/feedback purposes). Reading this
contract's *shape* from `evalDoubleThreat` is the reference — cite it only for the three-way return
shape, never for its sweep (`evalDoubleThreat` enumerates by calling `detectDoubleThreat` per legal
column, which is specific to double-threat's own board-geometry input; each of the six widened
evaluators below works its own set-enumeration logic against its own input shape, none of them a
copy-paste of that sweep).

**Threaded, not recomputed — a decision every widened evaluator had to make explicitly.** An
evaluator either (a) reads an already-computed answer set off the puzzle object (*threaded*), or (b)
calls the `classifier.js` detector itself, from the evaluator, at grading time (*recomputed*).
`evalFigure7`/`evalJShape`/`evalZThreat`/`evalOvercut`/`evalClaimeven` all chose (a): they read
`puzzle.correctCols ?? []`. (Until spec 056 retired the legacy scalar, this expression carried a
`puzzle.correctCol` fallback; that fallback is gone — `correctCols` is now the only source.)
`evalOddEvenThreat`
chose (b): it calls `detectOddEvenThreat` live from `moveString` + `scores` (mirroring
`evalDoubleThreat`'s *contract shape*, not its sweep — see above). Both choices are legitimate; which
one is correct is a property of the specific detector being widened, decided per evaluator, not a
global rule:

- **Recomputing is wrong when "correct" depends on when the pattern formed, not just whether it
  currently holds.** `evalFigure7`/`evalJShape` were first written to recompute
  `detectFigure7`/`detectJShape` live — mirroring `checkFigure7Predicate`'s generation-time notion of
  "does playing this column COMPLETE the kernel". This broke `lesson-13-figure-7.json`:
  `detectFigure7` matches identically both *before and after* the taught move, because that lesson
  teaches a board where the figure-7 kernel is already fully formed and the correct move exploits the
  resulting threat column from outside the kernel — not a move that completes it. Recomputing live
  conflated "the kernel exists" with "this move built the kernel" and produced `NO-CONCEPT` for a
  legitimate lesson. The fix was to thread the stored/threaded `correctCols` instead. (This
  originally kept a scalar-`correctCol` fallback so pre-spec-051 callers that never populated
  `correctCols` kept working byte-identically; spec 056 retired that fallback once every caller
  had migrated.)
- **`evalClaimeven` inherits the same threaded choice, for a stronger reason.** `detectClaimeven` is
  `async` and solver-simulating — one `runClaimevenSimulation` rollout (~20 solver queries) per
  odd-height column tested (see below). Recomputing it live inside the evaluator would re-run that
  solver cost on every graded request, which is exactly the per-request cost FR-011 forbids on this
  evaluator's row-less/computed-live branch — a strictly worse violation than the figure_7/j_shape
  case (which only risked a stale *notion* of correctness, not a live solver call).
- **`evalOddEvenThreat` recomputes because it is cheap and stateless.** `detectOddEvenThreat` is a
  synchronous, pure board-geometry detector with no async/solver cost and no "did this move build the
  pattern" ambiguity — recomputing it live from `moveString` + `scores` is safe and requires no new
  puzzle-object field.

When widening a **new** evaluator under this contract, decide threaded-vs-recompute explicitly and
justify it in a comment near the evaluator, the way each of the above does — do not default to
recompute just because it looks simpler; verify against `tests/lessons/lessonAnswerSets.test.js` in
full (the only test that has ever caught this class of regression) before shipping either choice.

### Claimeven: full per-column enumeration (FR-011/FR-012, spec 051 Epic 1)

`detectClaimeven` (`classifier.js`) now evaluates **every** odd-height column as an independent
standard-Claimeven candidate — Allis's base rule
(`docs/knowledge-base/allis-claimeven.md`) applies per column with no cap on how many columns may
simultaneously admit it. The pre-spec-051 code's "subtype A" (exactly 1 odd column) / "subtype B"
(exactly 2 odd columns, cross-column pairing) split, and its outright rejection of boards with 0 or
3+ odd columns, was verified to be an **implementation gap**, not a domain constraint — "subtype B"
is Allis's documented **Extended Claimeven** cross-pairing special case, an *additional*
candidate-producing path layered on top of the per-column sweep, not evidence of a column cap. One
solver simulation (`runClaimevenSimulation`, ≤ `MAX_PAIRS = 60` red/yellow move-pairs, ~20 solver
queries in typical practice — it returns as soon as a win/loss is decided) runs per odd-height column
tested; full enumeration costs up to `(number of odd-height columns) × ~20` solver queries per
accepted candidate, entirely at generation/backfill time, never per learner request.

`claimeven` deliberately carries **no uniqueness constraint** (FR-012) — unlike its
`SINGLE_ANSWER_CATEGORIES` siblings (`z_threat`, `overcut`, `undercut`, `figure_7`, `j_shape`), a
board with 2+ independently valid Claimeven response columns is a valid puzzle with every such
column accepted, per `docs/architecture/data-model.md`'s "Correct Column Storage" section.

**The rule lives in exactly one place: `server/answerSetInvariant.js`.** Import
`classifyAnswerSet` / `answerSetHolds`; never restate the comparison. It was briefly written out
twice and the copies drifted within the hour — one grew a lost-position exemption and the other
did not, which retired 7 perfectly good `undercut` puzzles. Three consumers share it:

| consumer | role |
|---|---|
| `candidate-generator.js#checkPredicate` | generation guard — a candidate violating the invariant never enters the pool (`forbidden_columns` exempt: its `correctCols` are the columns to AVOID, so the subset relation is inverted) |
| `server/scripts/audit_answer_ambiguity.mjs` | audits lessons + DB rows; `--source` finds replacement boards; `--repair --yes` retires failing rows (`is_active = false`, because `puzzle_attempts.puzzle_id` is an FK with no cascade) and inserts verified replacements |
| `tests/lessons/lessonAnswerSets.test.js` | blocking gate over lesson JSON, in **both** `test` and `test:fast` |

Two verdicts are **not** defects and must stay non-failing:

- **`LOST-POSITION`** — every legal move loses, so `optimal` only means "loses slowest". `undercut`
  lives here *by definition*: `detectUndercutVictim` only fires when `scores[C] < 0`.
- **`NO-SCORES`** — `immediate_threat` and `forced_block` are board-derived and are legitimately
  checked with `scores = []`; with no scores there is nothing to judge.

### Undercut has two sides

An undercut is **one** situation with **two** roles: the **victim** owns the upper threat that dies,
the **beneficiary** owns the lower threat that kills it. Which role a player holds is fixed by the
position — specifically by **who is to move** — never by a caller-supplied argument. c4solver
`scores` are always the mover's, so a score gate is only meaningful for the mover; that is why both
detectors anchor there and why neither takes a `perspective` parameter (OI-74).

| detector | side to move is… | score gate | used by |
|---|---|---|---|
| `classifier.js#detectUndercutVictim` | the victim (their threat dies) | `scores[C] < 0` — entering C loses | the `undercut` puzzle category (`checkUndercutPredicate` → `evalUndercut`, avoid-the-column) and the `undercut` `classifyPattern` tag |
| `classifier.js#detectUndercutBeneficiary` | the beneficiary (they own the killer) | `scores[C] > 0` — pressing C wins | `scripts/find_lesson_boards.mjs` spec `undercut_t2_adjacent`, which curates boards for `lesson-11-undercut` |

Consequences worth stating outright, because each has been mistaken for a defect:

- **A correct lesson-11 board can never match `detectUndercutVictim`**, and a valid `undercut`
  puzzle can never match `detectUndercutBeneficiary`. The gates are mutually exclusive by
  construction. Validate a board against the side its content teaches.
- **The learner meets both sides on purpose.** The puzzle category is the defensive drill ("never
  enter that column"); lesson 11 teaches the offensive side ("press the column below their threat").
  This split is deliberate — do not "align" one to the other.
- **`classifyPattern`'s `undercut` tag is perspective-independent** — both perspectives get the same
  cells. Read for the side to move it means "the column you must not enter"; read for the player who
  just moved it means "the undercut you just landed", which is exactly how `POSITIVE_TEMPLATES` and
  `tagBlunder`'s Phase D consume it.
- **The killer search scans every lower threat in the column**, not just the lowest. The upper threat
  is dead as soon as *any* lower threat neutralises it under Allen T2/T4/T5, and an adjacent T2
  killer routinely sits above a same-parity T4 pair.

**Overcut follows the same role-split precedent (spec 052 Epic 1 US1, resolving OI-76), with one
structural difference from undercut worth stating explicitly: in overcut, cell ownership does NOT
swap between the two roles.** The mover always owns the upper threat (row R); the opponent always
owns the lower threat. What differs between `detectOvercutBeneficiary` and `detectOvercutVictim` is
only the rescue-boolean and the score gate — not who holds which cell.

| detector | side to move is… | condition | score gate | cell roles | used by |
|---|---|---|---|---|---|
| `classifier.js#detectOvercutBeneficiary` | the beneficiary | rescued (T4/T5/chain-T2 applies) | `scores[C] > 0` | `neutralised_threat` / `major_threat` | `candidate-generator.js#checkOvercutPredicate` (puzzle-pool path — the puzzle's own solver is the mover benefiting) |
| `classifier.js#detectOvercutVictim` | the victim | not rescued (default T2 kill) | `scores[C] < 0` | `killing_threat` / `dead_threat` | `classifyPattern`'s `'overcut'` Phase-C detector-list entry (`classifier.js:1854`) |

The two call sites need *opposite* halves of the split, and mixing them up is the exact wrong-role
wiring bug this precedent exists to prevent (see `reason-DECISIONS.md` D37): `tagBlunder`'s Phase C
calls `classifyPattern` on the board **after** the correct/best move, where the side to move is the
opponent of the blunderer — `detectOvercutVictim` resolves *that* mover's role (the opponent, as
victim) so the killing threat lands on the non-mover, i.e. the blunderer. `checkOvercutPredicate`
evaluates a puzzle candidate where the mover directly benefits from pressing the overcut, so it
needs `detectOvercutBeneficiary` instead. A regression at the `tagBlunder`-pipeline level (not a
bare detector unit test) is required to catch a correct function wired to the wrong call site — see
`tests/integration/undercut_overcut.test.js`'s `tagBlunder Phase C — overcut cells belong to the
blunderer` describe block. (`detectFigure7` / `detectJShape` are *not* affected by any of this:
their second parameter is `_scores` and is unused.)

### Generation-time candidate guards — color casting & stray forced-block (spec 044 US1/US2)

`checkPredicate` in `candidate-generator.js` is an **exported wrapper** around `checkPredicateRaw`
(the raw per-category dispatch). The wrapper applies two cross-cutting generation-time rejection
rules on top of whatever `checkPredicateRaw` returns — a candidate that passes the raw predicate is
still **rejected** (not silently re-cast) if it violates either:

- **Color casting**: the learner-facing player at a puzzle position is
  `new Board(moveString).currentPlayer` (equivalently `moveString.length % 2 === 0 ? 1 : 2`). For
  `immediate_threat` the learner MUST be P1 (green — the side with the winning move); for
  `forced_block` the learner MUST be P2 (gray — the side that must block). Miscast candidates are
  rejected outright. This applies to puzzle generation ONLY — it is never applied to real-game
  (sparring) blunder detection/tagging.
- **No stray forced-block**: for any category OTHER than `forced_block`, if the board contains a
  live (gravity-top / immediately playable) forced-block situation — detected via
  `detectForcedBlock(new Board(moveString), scores)`, reading `.cols` for the blocking column set —
  whose blocking column is NOT among the candidate's own computed answer column(s), the candidate is
  rejected. If the forced-block's blocking column coincides with the answer, it is accepted. A
  forced-block that is not gravity-top is not a live distraction and does not trigger rejection.

All learner-facing puzzle text referencing disc color MUST say "green"/"gray", never "red"/"yellow"
(the `'red'`/`'yellow'` code strings are P1/P2 labels that render green/gray — see CLAUDE.md's color
table).

### Multi-solution acceptance (spec 044 US3)

`immediate_threat`, `forced_block`, and `double_threat` are the only three categories whose
correctness model allows more than one valid answer column (a fork, or multiple independently
winning/blocking columns). For these three categories only:

- **Generation-time** (`checkPredicateRaw` in `candidate-generator.js`, the fallthrough branch for
  these three categories): the acceptance threshold is `correctCols.length >= 1`, not `=== 1`. The
  `correctCols` filter itself must accept `evaluatePredicate(...).result === 'correct' ||
  result === 'tied'` — NOT `'correct'` alone. This is load-bearing: `evalImmediateThreat`/
  `evalForcedBlock`/`evalDoubleThreat` return `'correct'` only when a column is the SOLE satisfying
  column, and `'tied'` when 2+ columns satisfy it — so filtering on `'correct'` alone yields an
  EMPTY `correctCols` for every multi-solution board (all its winning/forking columns individually
  evaluate to `'tied'`, none to `'correct'`), not just a size-1 one.
- **Solve-time**: every production caller of `evaluatePredicate` that gates learner correctness on
  the result MUST treat `'tied'` as accepted, exactly like `'correct'` — e.g.
  `result === 'correct' || result === 'tied'`. As of spec 044 Batch 2, all production callers
  already did this except `checkPredicateRaw`'s own filter (fixed above) — see the caller-sweep
  comment block atop `predicates.js` for the full audited list.
- **`undercut`** (avoid-the-pattern: every legal column except the killing column is correct),
  **`z_threat`/`overcut`** (uniqueness enforced — `detectZThreat` rejects unless exactly one
  candidate; `checkOvercutPredicate` gained the identical guard in spec 051's T032), and
  **`claimeven`** (deliberately **no** uniqueness constraint as of spec 051 FR-012 — see "Claimeven:
  full per-column enumeration" above; a board with 2+ independently valid response columns is a
  valid puzzle) are all explicitly OUT of this rule — none of the four gets the multi-solution
  categories' `correctCols.length >= 1` acceptance threshold, and must never be widened to "any
  generating column" the way `immediate_threat`/`forced_block`/`double_threat` are.
- **Client**: `POST /api/evaluate-move` (`server/evaluateMoveHandler.js`'s
  `createEvaluateMoveHandler`, registered from `server/index.js`) exposes an additive
  `accepted: bool | null` response field, gated to these three categories via the request's
  `category` field (`accepted` is `null` for every other category). It is computed via
  `evaluatePredicate` at solve time — no persistence, no schema change. `ChallengeScreen.jsx`'s
  `handleColumnClick` reads `data.accepted` (not a bare `data.quality === 'optimal'` check) for
  these three categories only; every other category's client-side scoring is unchanged.

### Single-answer categories widen the same gate (spec 049 Epic 9; membership updated by spec 051 Epic 1)

`SINGLE_ANSWER_CATEGORIES` (`server/categories.js`, mirrored — duplicate literal, NOT
cross-imported — in `src/lib/categories.js`) is a sibling list to `MULTI_SOLUTION_CATEGORIES`:
`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape`, and — added by spec 051's
T006/T007 to close OI-75 — `odd_even_threat`, seven categories in total. **This set gates which
categories expose the additive `accepted` field on `POST /api/evaluate-move`, not how many columns
each category's answer set may contain** (reworded per FR-008/T008 — the pre-spec-051 "exactly one
taught answer column" framing is no longer accurate: `claimeven`'s answer set is now a genuine,
solver-gated enumeration of every qualifying odd-height column, with no upper bound, and
`figure_7`/`j_shape`/`z_threat`/`overcut` are all graded by set membership too — see "The tri-state
set-membership contract" above). It is **disjoint** from `MULTI_SOLUTION_CATEGORIES` and MUST NOT be
derived as its complement — a category in neither set (`forced_win`, `forbidden_columns`) would
otherwise be silently miscategorized. The `POST /api/evaluate-move` `accepted` gate is
`MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category)` — one shared
boolean expression (`result === 'correct' || result === 'tied'`) applied uniformly across all ten
categories, not a second category-conditional branch.

For the seven categories in `SINGLE_ANSWER_CATEGORIES`, the predicate-object the handler evaluates
against is built from the request's `correctCols`/`highlightMetadata` fields (client-sent, remapped
from the puzzle's stored snake_case columns — see api-conventions.md) rather than recomputed
server-side metadata, via `buildPredicatePuzzle(category, movestring, { correctCols, highlightMetadata })` in
`server/predicates.js`. This same helper is shared with `POST /api/evaluate-move/inline`'s
`evaluatePredicate` call site (previously a second, divergent construction of the predicate
object) — the two endpoints now converge on one code path for building that object, closing a
maintenance seam where the two handlers could silently drift.

**Handler extraction**: the `/api/evaluate-move` route handler itself is extracted into
`server/evaluateMoveHandler.js`'s `createEvaluateMoveHandler({ solver, i18nTranslations, supabase })`
(the `supabase` parameter added by spec 051 Epic 1 T050, mirroring how `solver` is already
threaded) — a side-effect-free factory parameterized on the values that differ between the live
server and a test. `server/index.js` has no exported `app` and boots a live solver process at
import time, so it cannot be imported directly by tests; this factory is what lets
`tests/integration/singleAnswerCategoriesAccepted.test.js`,
`tests/integration/evaluateMoveMultiSolution.test.js`, and
`tests/integration/evaluateMoveStoredSet.test.js` mount the actual production handler instead
of a hand-copied reimplementation.

**Stored-set grading branch (spec 051 Epic 1, FR-024/FR-024a/FR-025)**: when the request body
carries a `puzzleId`, the handler looks up the row (`is_active = true`) and, if its `correct_cols`
is non-null, grades `accepted = correct_cols.includes(playedCol)` **directly** — `evaluatePredicate`/
`buildPredicatePuzzle` and the seven pattern evaluators above are not consulted at all on this
branch. If `correct_cols` is `NULL` (not yet backfilled), or `puzzleId` is absent entirely, the
handler falls through to exactly the computed-live branch described in this section, unchanged.
See `api-conventions.md`'s "Move Evaluation Endpoint" section for the full two-branch contract and
`data-model.md`'s "`correct_cols` — the stored answer set" section for the column's population and
`NULL`/`{}` semantics.

An unresolvable `puzzleId` (no active row for that id) **warns and falls through** to the
computed-live branch rather than returning an error. This is deliberate: the request body still
carries everything computed-live grading needs, and failing the request instead removed grading
feedback silently, because `ChallengeScreen` commits its phase change before the response lands.
See `api-conventions.md` §"Grading branches" and `docs/open_issues.md` OI-84.

#### Both branches shape their response through one function

`buildEvaluationResponse({ movestring, colInt, category, isAiMove, solver, i18nTranslations })`
(module-private in `evaluateMoveHandler.js`) produces **everything in the response except
`accepted`** — `scoreMove` → `classify`/`classifyAiMove` → `phrasePoolKey` → the two `pickFromPool`
i18n keys → the coach mood map — and returns `{ scores, response }`. Each branch then adds only its
own `accepted` (`correct_cols.includes(...)` for stored-set, `evaluatePredicate` for computed-live)
and spreads: `res.json({ ...response, accepted })`.

**Do not inline this per branch again.** The sequence was previously duplicated verbatim in both,
which meant any change to the coach-key derivation or the mood map applied to one branch only would
make the same move grade differently depending on whether the request carried a `puzzleId` — i.e.
differently for a real puzzle drill than for a lesson inline challenge, with no test catching it.
`scores` is returned for the caller's own `accepted` derivation and is **never** part of the
response body.

### Promoting a candidate to a puzzle — one shared row builder

`server/promotePuzzleRow.js#buildPromotedPuzzleRow(candidate, { goalPrompt, goalPredicateType,
difficulty, cooperativeAiMoves })` builds the `puzzles` row inserted when a curated candidate is
approved. **Both** admin promotion routes (`POST /api/admin/candidates/:id/approve` and
`POST /api/admin/candidates/approve-batch`) call it; neither keeps a field list of its own. They
differ only in `goalPredicateType` (the single route derives it from the request's predicate type,
the batch route uses the candidate's category) and `cooperativeAiMoves` (batch always `[]`).

Extracted because the two routes were independent hand-maintained copies, and `puzzles` has no
NOT NULL constraint on the answer columns — so a column added to one route and forgotten in the
other inserts as NULL and the puzzle simply serves wrong, silently. Adding a column to `puzzles`
means editing this builder plus the other write sites listed in `data-model.md`
§"Where puzzle/candidate answer columns are written". `tests/integration/promoteCorrectCols.test.js`
asserts against this builder, so a regression in either route is a test failure.

## Classifier API — Perspective, classifyPattern, and tagBlunder

`classifier.js` exposes two functions beyond the category-level `classify()`:

### `classify(moves, candidateCol, scores)`

Synchronous. Returns exactly one `{ tag }` from the 10-tag set: `immediate_threat`, `double_threat`, `forced_win`, `forced_block`, `forbidden_columns`, `figure_7`, `j_shape`, `best_move`, `drawing_move`, `suboptimal_move` (the last three are score-based fallbacks when no structural pattern matches). No `perspective` parameter — always evaluates from the mover's own point of view. Used by `POST /api/evaluate-move` (via `evaluateMoveHandler.js`), `POST /api/evaluate-move/inline`, `POST /api/explain-move`, and `candidate-generator.js`.

This is a much narrower scope than `classifyPattern` below (10 tags, sync, one winner) vs. `classifyPattern` (15 detectors, async, all matches).

**The return may carry a second field, `phrasePoolKey`** (spec 052 US3). The `drawing_move` fallback returns `{ tag: 'drawing_move', phrasePoolKey: 'forfeited_win' }` when the position's `bestScore > 0` — i.e. the mover gave up a forced win rather than facing a genuine best-is-a-draw. The `tag` itself is unchanged either way; the extra key exists because the live path never reads the stored `direction` field that the `tagBlunder` path uses for the same distinction. `classify()` deliberately does **not** emit `direction`.

**Category 6 — `figure_7`/`j_shape` live recognition** (spec 052 US5, Decision D40). Of seven offline-only candidates, only these two were admitted to live play; the other five (`z_threat`, `undercut`, `overcut`, `odd_even_threat`, `claimeven`) were excluded — `undercut`/`overcut` because this epic deliberately locked their perspective to the side to move (so they cannot be evaluated for the original mover on `nextBoard`), and the rest because admitting any of them would convert `classify()` from sync/solver-free to async. `detectFigure7`/`detectJShape` keep their explicit `perspective` parameter, so they *can* be evaluated for the original mover on `nextBoard` after `currentPlayer` flips — which is why the standard absent→present transition-gate shape works verbatim here. Category 6 sits after every urgency-bearing category (1–5) and before the generic fallback.

**Creation tags are not score-gated — never map one straight to praise copy.** Categories 1, 3, 4 and 6 read the board only, so a move can earn a creation tag *and* be a game-losing blunder (verified: `060550303021255625` col 3 creates a `double_threat` scoring −12 against a +12 best). `evaluateMoveHandler.js` therefore keys the phrase pool off a derived `poolQuality`, not raw `quality`: for `double_threat`/`forced_win`/`figure_7`/`j_shape` it promotes `suboptimal` → the `optimal` pool (those pools' `suboptimal`/`blunder` tiers were authored for ChallengeScreen's "you did NOT build it" semantics, which is always false once the creation gate has fired), but on `blunder` it drops the pattern pool entirely and falls back to `coach.spoken.generic.blunder`. `quality`/`badge` in the response stay score-based for downstream consumers.

**`double_threat`/`forced_win` are creation-gated, by identity, not just presence** (spec 052 US4). Both tags fire only when the move creates a genuinely new instance of the pattern — a persisting instance that merely survives the move must not re-fire it every subsequent turn. The gate diffs *identity*, not a boolean: `double_threat`'s identity is the **set** of columns holding the fork (private `doubleThreatColumnSet`/`getDoubleThreatIdentity` helpers over `hasDoubleThreat`'s internals — Case A: `>=2` gravity-top columns, identity = those columns; Case B: a stacked pair, identity = the single stacked column); a non-empty `colsAfter \ colsBefore` diff fires. `forced_win`'s identity is `detectForcedWin`'s single `blockCol` field (the anchoring immediate-threat column, `myThreats[0]`) — fires when matched after and `blockCol` differs from before (covering both "no forced win before" and "a different forced win before"). Neither diff threads the full per-branch forcing-column recursion through as identity (research.md Decision D5) — two distinct forced-win lines sharing the same anchoring `blockCol` are not distinguished (see `docs/open_issues.md` OI-90).

### `classifyPattern(ms, perspective, solver)`

```js
classifyPattern(ms, perspective, solver) → Promise<Map<string, { cells: string[] }>>
```

Returns a Map of tactical pattern tags (e.g. `'immediate_threat'`, `'forced_win'`, `'z_threat'`) present for the given `perspective` on the position `ms`. Each value has a `cells` array of wire-format cell coordinates (`"c{col+1}r{row+1}"`, 1-indexed). Tags are drawn from all 15 detectors, run in parallel via `Promise.all`. Never contains `'unknown'`.

The 15 detectors include three **parity-aware threat** detectors added 2026-06-25 — `major_threat_parity`, `major_threat_nonparity`, `minor_threat` (geometry-only, built on `categorizeThreats`; see **Threat categorization** below). `odd_even_threat` is still emitted (puzzle path) but is de-listed from the coach prompt and the blunder vocabulary (D40).

- `ms` — 0-indexed movestring.
- `perspective` — 1 (Red) or 2 (Yellow). The player whose patterns to detect.
- `solver` — c4solver wrapper with `.query(ms)` method.

**Inline detector list**: `classifyPattern` maintains its own inline list of 13 detectors. This list is the sole registry of pattern detectors. `classifyPattern` must NOT import any external registry to avoid circular dependencies.

**Detector perspective parameter**: Every `detect*` function accepts a `perspective` parameter defaulting to `board.currentPlayer`. When `classifyPattern` calls detectors, it passes the explicit `perspective` — never relying on the default.

**Picking one tag from the Map**: `classifyPattern` fills its returned `Map` via `Promise.all`, so insertion order is non-deterministic — `[...tagMap.keys()][0]` is a bug. Always pick with a priority list: `PRIORITY.find(tag => tagMap.has(tag))`. Reference implementation: `classifyAiMove.js`'s `AI_PATTERN_PRIORITY.find(tag => tagMap.has(tag))` (priority order: `double_threat > immediate_threat > forced_win > forced_block > forbidden_columns > z_threat > odd_even_threat > claimeven > figure_7 > j_shape > overcut > undercut`).

**`_scores` signature trap**: `detectFigure7(board, _scores, perspective)` and `detectJShape(board, _scores, perspective)` accept a `_scores` argument and ignore it (both are pure board-geometry convolution detectors) — but `classifyPattern` still passes `scores` at the call site. Do not infer from the parameter that scores are used, and do not remove it — some callers pass `null` there (e.g. `tagBlunder`'s post-correct-move check), which only works because the parameter is genuinely unused.

### `tagBlunder(moves, playedCol, correctCol, solver)`

```js
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{ tag: string, direction: string, reason: string }>
```

Tags a blunder with the tactical pattern involved, from the perspective of the player who moved.

- `moves` — 0-indexed movestring of the position where the blunder was made.
- `playedCol` — 0-indexed column the player actually played.
- `correctCol` — 0-indexed best column (argmax of solver scores).
- `solver` — c4solver wrapper.

**Throwing contract** (changed): `tagBlunder` throws `NotABlunderError` (exported from `classifier.js`) when called on a **terminal** position — already won, or a full board — because there is no move to tag. This is a *precondition violation* (caller error), surfaced loudly and distinct from a solver failure. All OTHER errors (e.g. solver rejects) resolve to the fallback `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`.

> Callers MUST distinguish the two: on `NotABlunderError`, skip the ply / do not record a blunder (never fabricate a `suboptimal_move`); only fall back for genuine solver errors. The "is this a mistake?" gate (`scoreMove`) must never flag a blunder on a terminal position — it can't, since the solver won't score one, but the typed error enforces it. See `index.js` (analysis loop) and `papergamesImporter.js` for the reference handling.

`direction` is one of:
- `'defensive_miss'` — the **opponent already had** an immediate winning threat at `moves` and the blunderer failed to take it off the board (tag is always `forced_block`).
- `'missed_own'` — the blunderer either had an immediate win available, or **playing `correctCol` would have built** pattern X for them while `playedCol` did not.
- `'enabled_opponent'` — the played move let the opponent build a pattern (an immediate threat, or a pattern on the opponent's best continuation that the correct line avoided).
- `'forfeited_win'` (spec 052 Decision D39, 2026-07) — narrower sub-case of Phase E's score-based fallback: `tag === 'drawing_move'` AND `preScore > 0` (the position was a forced win) AND `postScore === 0` (the played move dropped it to a draw). This is a refinement of `direction`, not a new `pattern_category` — no CHECK constraint or `blunderTags.js` change was needed (see `db-schema.md`'s `direction` note and `reason-DECISIONS.md` D39). A genuine draw-to-draw position (`preScore === 0`) is unaffected and still falls through to `{ tag: 'suboptimal_move', direction: 'missed_own' }` — it never reached `drawing_move` even before this change.

**New missed_own semantics** (changed): a pattern tag is `missed_own` when `correctCol` *builds* it and `playedCol` does not — i.e. `patterns(moves+correctCol, blunderer) ∋ X` and `patterns(moves+playedCol, blunderer) ∌ X` — NOT the old "had X at `moves`, lost it". `double_threat`/`figure_7` carry an undercut guard.

**Priority cascade** (phases; first match wins):
1. **Phase A** (pre-move pressure): `immediate_threat:missed_own` (own win available) → `forced_block:defensive_miss` (opponent had an immediate threat).
2. **Phase B**: `immediate_threat:enabled_opponent` (played move hands a *new* opponent win; pre-existing threats are caught by Phase A as `defensive_miss`).
3. **Phase C** (missed_own patterns): `forced_win`, `double_threat`, `figure_7`, `j_shape`, `z_threat`, `overcut`, `claimeven`, then the generic parity-aware threats `major_threat_parity`, `major_threat_nonparity`, `minor_threat` (ranked last).
4. **Phase D** (enabled_opponent continuation): existential/universal over **all** the opponent's optimal replies — `enabled(X)` iff some optimal reply on the blunder line builds X and no optimal reply on the correct line does.
5. **Phase E**: score-based fallback (`drawing_move` or `suboptimal_move`).

Phase A returns before any `moves+correctCol` solver query when the blunderer has an immediate win, so Phase C never queries a terminal position.

### FR-033: Two-step perspective contract

Five score-consuming detectors implement a **recursive two-step** pattern when called with a `perspective` that differs from `board.currentPlayer`:

- `detectForcedBlock`, `detectForcedWin`, `detectZThreat`, `detectOddEvenThreat`, `detectForbiddenColumns`

When `perspective !== board.currentPlayer && solver !== null`, each detector recursively evaluates **all** child positions (one per playable column) from the requested perspective. The pattern matches only if it matches from the requested perspective in **every** child position.

This IIFE (`(async () => { ... })()`) returns a Promise, so these five detectors become async when the perspective changes. The IIFE shields against terminal child positions (where the solver rejects) by returning `{ matched: false }` — a terminal game cannot exhibit tactical patterns.

Detectors that do NOT depend on solver scores (`detectImmediateThreat`, `detectDoubleThreat`, `detectFigure7`, `detectJShape`, `detectClaimodd`) never enter the IIFE — they only use board geometry, which is perspective-independent for threat analysis. `detectFigure7` and `detectJShape` take a second argument but it is `_scores`, unused; do not mistake their three-argument shape for a score dependency. `detectUndercutVictim`/`detectUndercutBeneficiary` and `detectOvercutVictim`/`detectOvercutBeneficiary` genuinely read `scores` while sitting in the sync branch: all four resolve this by taking no `perspective` parameter at all, each resolving its own role from `board.currentPlayer` (see § "Undercut has two sides", extended to overcut; OI-76 resolved by spec 052 Epic 1 US1). `detectClaimeven` uses the solver independently via its simulation, not via the FR-033 IIFE.

### `detectClaimeven` — parity rule and simulation

**Parity rule:** odd columns are identified by `board.colHeights[col] % 2 === 1` — the odd **empty-space count** remaining in the column, NOT `col % 2` (column index parity). Confusing the two is a common bug: a column's index parity has no bearing on claimeven eligibility, only how many empty cells remain above the current stack.

**Simulation (ground truth, no static structural check):** run a full-game simulation from the candidate position: Red (player 1) plays the solver-optimal move; Black (player 2) responds in the same column, one row above (the claimeven response); repeat until game over. **Termination rule:** if Red plays the last cell of a column (Black cannot respond there), the position is NOT claimeven — the pairing was broken. If Black wins the simulated game, the position IS claimeven. This is exact because it tests the actual strategy against optimal opposition; ~20 solver queries for a mid-game position.

## Simulating games

`server/gameSampling.js` is the **canonical game simulator** and the SOLE owner of all
self-play. When you need real game positions — eval sets, test fixtures, blunder
coverage, position sampling, finding a board with a given property — do NOT hand-roll a
game loop. Every consumer now goes through this module: `select_boards.mjs` and
`generate_tagblunder_fixtures.mjs` (via `harvestBlunders`), and `candidate-generator.js`'s
`generateCandidates` (via `playGame`, see below). (`generate_eval_set.mjs`, a former consumer, was
deleted 2026-07-01 — see `docs/architecture/reason-DECISIONS.md` D22.) Use:

- **`playGame(solver, rng = Math.random, { maxMistakeProb = 0.5 } = {})`** — THE
  primitive. Async generator that plays one mistake-weighted self-play game, yielding
  `{ ms, scores, player, movePlayed, plyIndex }` at each ply **before** the move is
  applied. Because it streams, a caller can inspect each position and `break` the moment
  it finds the board it wants — no whole-game cost, no callbacks/inversion of control.
  Each player draws an independent mistake probability in `[0, maxMistakeProb)`.
  `candidate-generator` passes `maxMistakeProb: 0.25`; all other callers use the default.
- **`simulateGame(solver, rng)`** — drains `playGame` into a full game `{ ms,
  scoresCache }` (`scoresCache[i]` = scores before move `i`).
- **`harvestBlunders(solver, { maxGames, rng })`** — async generator yielding **every
  non-optimal ply** with `{ boardState, movePlayed, correctCol, scores, score,
  bestScore, severity, perspective, quality, gameIndex, plyIndex, gameMs }` — exactly
  the inputs `tagBlunder` / blunder recording need.
- **`playPolicyGame(solver, policies, rng = Math.random)`** — policy-driven variant of
  `playGame` for strategy experiments (used by `server/scripts/win_distribution/`).
  `policies` is `[player1Policy, player2Policy]`; each policy is
  `async ({ ms, board, heights, player, legal, getScores, rng }) => 0-indexedCol`.
  `getScores()` lazily queries the solver for the current position and memoizes it per
  ply (returns a copy of `EMPTY_BOARD_SCORES` for the empty board), so solver-free
  policies cost zero solver calls. Yields `{ ms, player, movePlayed, plyIndex, scores }`
  before each move (`scores` is `null` unless a policy fetched it). Unlike `playGame`, it
  imposes no mistake model — the policies decide. Additive-only: it does not touch the
  frozen `playGame`/`sampleColMP` rng contract.

Pass a seeded `rng` for deterministic runs (e.g. in tests). `harvestBlunders` skips
optimal plies, so consumers only see mistakes.

**Candidate generation pattern** (`candidate-generator.js` → `generateCandidates`): each
rollout iterates `playGame`, accumulating yielded plies into `debug_trace.plies`, and
`break`s on the first position satisfying the category predicate. It re-imposes the old
fixed scan cap by `break`-ing when `pos.ms.length >= maxMoves` (abandon this game, try
another). **FR-011**: the per-rollout minimum move count MUST be drawn from `randint(14,
34)` (one `rng()` call: `14 + Math.floor(rng() * 21)`); positions shorter than that are
skipped. The integration test `candidate-generator.test.js` (T017/SC-002) asserts every
`move_string` has length ≥ 14 — this passes deterministically only because of the FR-011
floor, not by luck.

## Board Class

`Board` in `classifier.js` is the standard entry point for board-state access in the
classifier and detectors. Construct it once per position; pass it to all consumers.

**MUST** use `new Board(movestring)` in `classify()` and all `detect*` functions.  
**MUST NOT** call `parseBoardState` inside `classify()` or `detect*` functions; use
`board.board` / `board.colHeights` / board methods instead.

`parseBoardState` remains a free export for callers that need mutable raw arrays
(simulation loops, one-shot predicate checks that do not share state across detectors).

`board.withMove(col)` returns a new immutable `Board` for the position after placing in
`col`. Use it instead of the mutation+undo pattern (`board[r][c] = player; ...; board[r][c] = 0`).  
**The mutation+undo pattern MUST NOT appear in `classify()` or any `detect*` function.**
**`withMove(col)` throws `RangeError` if `col` is out of range (`0–6`) or the column is full.** Always guard with `board.colHeights[col] < 6` before calling if the column's availability is not already guaranteed by the caller.

`getReachableThreats(board, colHeights, player)` is O(42) and mutation-free because
`checkWin` never reads `board[row][col]` itself — only neighbor cells. This means threat
scanning functions can call `checkWin` on an empty cell without placing the piece first.

## Explain Context (`explainContext.js`)

`buildExplainContext(movestring, col, rounds, solver)` in `server/explainContext.js` is the
unified grounding flow for the LLM explain-move endpoint. It replaces the former
`explainSimulate`-based approach (deleted in Epic 3).

```js
buildExplainContext(movestring, col, rounds = 1, solver)
  → Promise<{ prompt: string, allowedSet: Array|null, zoneAliasMap: Object }
           | { prompt: null, allowedSet: null, allMovesEqual: true }
           | null>
```

- Returns `null` if the contrast move could not be determined.
- Returns `{ prompt: null, allowedSet: null, allMovesEqual: true }` when all legal moves
  have equal solver scores (settled position).
- Otherwise returns `{ prompt, allowedSet, zoneAliasMap }` where:
  - `prompt` — full LLM system prompt string (from `buildBlunderExplainPrompt`)
  - `allowedSet` — `AllowedSetEntry[]` or `null` (null = no Tier 1/2 patterns found)
  - `zoneAliasMap` — `{ 'player-minor-pre': 'windows:...', ... }` — 6 entries mapping alias names to `windows:` specs for minor threat windows at pre/best/played board states. Used by `expandZoneAliases()` after LLM generation.

`expandZoneAliases(text, aliasMap)` (also exported from `explainContext.js`) replaces `[zone:player-minor-pre]` → `[zone:windows:c2r4,c3r4,...|...]` in the raw LLM output **before** `validateAnnotation`. The `windows:` spec encodes per-window cell structure so the frontend can render one capsule per threat window.

**Flow**:
1. Query solver scores; check for settled position.
2. Select contrast move via `selectContrastMove`.
3. On the blunder path: call `tagBlunder` to get `{ tag, direction }` and derive `humanReason`
   from `REASON_TEMPLATES`.
4. On the optimal path: classify patterns at the best-move position and derive `positiveReason`
   from `POSITIVE_TEMPLATES` via the priority cascade.
5. Build `allowedSet` from `classifyPattern` results (three directions contribute pattern maps).
6. Build board visualizations via `getBoardVisualization`.
7. Build and return the prompt via `buildBlunderExplainPrompt`.

## Solver Score Semantics (Critical Invariant)

At forced-win terminal positions, all opponent columns score identically — the solver cannot identify which column blocks. Use direct `checkWin` board detection instead.
Reference: memory `reference_c4solver.md` §"Scores at forced-win terminals are flat" (carries the worked movestring and the `checkWin` recipe).

## Threat-Counting Invariant

Pattern detectors (`detectFigure7`, `detectJShape`) count threats at any reachable empty cell `(col, row)` where `row >= colHeights[col]`. A threat is valid even if pieces must fill below it first — those pieces arrive in the natural course of play. Use `board.reachableThreats(player)` (backed by `getReachableThreats`) for this.

The gravity-top restriction (only `row === colHeights[col]`) applies exclusively to `immediate_threat` and `forced_block` detection, which reason about the current player's single immediate move.

`getImmediateThreats` / `board.immediateThreats(player)` uses the gravity-top restriction and is reserved for immediate-move semantics (`detectClaimeven`, forced-block checks). Do not use it in pattern detectors.

## Threat categorization (`categorizeThreats`)

`categorizeThreats(board, perspective)` in `classifier.js` is the canonical parity-aware threat categorizer. For BOTH `player` (the to-move perspective) and `opponent` it returns `{ majorParityAligned, majorNonParity, minor }`, each `{ count, cells }` (cells are sorted `"cNrM"` 1-indexed strings):

- **Majors** come from `getMajorThreatCells` (`rm`/`ym` flags), **exclude** immediately-playable cells (`row === colHeights[col]`), and are split by parity: aligned ⟺ `row % 2 === (P - 1)` where `P` is that side's perspective.
- **Minors** use `getMinorThreatWindows` + `emptyCellsFromWindows` (NOT the `rn`/`yn` flags), so a 2-disc window shadowed by a major window is excluded.

`categorizeThreats`, `getMinorThreatWindows`, and `emptyCellsFromWindows` live in `classifier.js` (moved there from `explainContext.js` 2026-06-25) **specifically to avoid an import cycle**: `explainContext.js → sparseLookahead.js → classifier.js`, and the new `classifyPattern` threat detectors need the categorizer. `classifier.js` imports neither of the other two, so it is the only cycle-free home. `explainContext.js`'s `summarizeThreats` delegates to `categorizeThreats` (keeping its legacy output shape) and imports `getMinorThreatWindows` from `classifier.js`.

## Allen T/V-rule content-pipeline utilities (`allenTransforms.js`, `allenVRules.js`)

`connect-four/server/allenTransforms.js` and `connect-four/server/allenVRules.js` (spec 044 Epic 4, User Stories 4–5) are standalone, pure threat-set-in/threat-set-out utility modules — **not wired into any production request path** (`candidate-generator.js`, `classifier.js`, `predicates.js`, and `ChallengeScreen.jsx` are all untouched). They exist to give the content pipeline (puzzle authoring / regression tooling) a KB-sourced, unit-tested implementation of Allen (2010)'s threat-simplification and victory-rule framework, callable independently of the runtime classifier.

- `allenTransforms.js` exports the T1–T7 transformation-rule detectors (each a literal port of its own `docs/knowledge-base/allen-t{1..7}.md` `formal_predicate`) plus `simplifyThreats(threats)`, a composition helper that runs the applicable detectors in KB-documented precedence order and returns `{ threats, decidedBy, t3Pairs, t4Cols, t5Cols, t7Cancellations }` for downstream V-rule consumption. It also exports `isAllenOddRow0(row0)`, the 0-indexed ⟷ Allen-1-indexed row-parity translator — required because every KB entry's prose/pseudocode is written in Allen's own 1-indexed row numbering while this project is 0-indexed everywhere (CLAUDE.md); reuse this helper for any absolute-row-parity check rather than porting a KB literal directly.
- `allenVRules.js` exports the V1–V5 victory-rule evaluators and the T4 Case A / Case B evaluators (each a literal port of its own KB entry). The V1–V5 evaluators take the `simplifyThreats()` output shape (not a raw threat array), since V1/V2's odd-threat counting needs the T3 pair metadata.
- Contract: a threat is `{ player: 1 | 2, col: 0-6, row: 0-5 }` (0-indexed), `RED = 1`, `BLACK = 2`. No board-mutation, no gravity/reachability check, no candidate-board generation, no new player-facing category — these are pure functions over an already-extracted threat set.
- Tests: `tests/unit/allenTransforms.test.js` and `tests/unit/allenVRules.test.js`, each fixture sourced from its own KB entry's `worked_examples`/`false_positives` and cross-checked against `./visualize_board.sh`/the production c4solver, not trusted from KB prose alone.

## LLM Coach Helpers (`llmCoachHelpers.js`)

`connect-four/server/llmCoachHelpers.js` is the shared module for all LLM coaching server endpoints. It exports:

### Recommend-move helpers (unchanged from Epic B)

- `buildRecommendPrompt({...})` — assembles the full move-recommendation prompt
- `buildFlatTable(colData, rounds)` — formats the per-column pattern table for the prompt
- `getScoreTier(col, score, immediateWinSet, immediateLossSet)` — classifies a column into IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS
- `TIER_ORDER`, `IMMEDIATE_WIN_OUTCOMES`, `PATTERN_KB` — shared constants

`PATTERN_KB` maps pattern keys to `{ id: '<kb-slug>' }` entries. No `inline` entries exist (all migrated to files 2026-06-20). A KB term is injected into an explain-move prompt **only when its pattern fires** (added to `relevantPatternKeys` in `explainContext.js`); the gate is `if (!relevantPatternKeys.has(patternKey)) continue;`. There is **no** `always_include` glossary path — it was removed 2026-06-25 because injecting a term with no on-board instance (even `parity`/`gravity_top`) caused the LLM to fabricate/misapply it (the 2026-06-25 deep-reveal judge showed even `parity` and `gravity_top` failing this way). Do **not** re-add `always_include: true` to any entry. Special shape:
- Alias entries share a `kbId` with another pattern key (e.g. `fork` → same file as `double_threat`); `explainContext.js` deduplicates by `kbId`. Every entry must have a corresponding `docs/knowledge-base/<id>.md` with `short_summary` and an entry in `src/lib/kbTermLesson.js` for the popup display name.

**Why `short_summary` is required, not optional:** `loadKBShortSummary` (`llmCoachHelpers.js:144`) is what the server calls to build `termsMap`. A missing `short_summary` means the term is **silently dropped** from the map — no error — and the popup never opens for that term. On the client, `KbTermPopup` then falls back to rendering the raw `kbId` (an ugly slug) instead of a summary. Checklist when adding a new KB term:
1. Add `docs/knowledge-base/<id>.md` with a `short_summary` field.
2. Add the `PATTERN_KB` entry (`llmCoachHelpers.js`) mapping the pattern key to `{ id: '<id>' }`.
3. Add a display-name entry in `src/lib/kbTermLesson.js`.
4. Smoke-test: `loadKBShortSummary('<id>')` should return a non-empty string, not `undefined`.

### Shared utilities

- `isMajorThreatForPlayer(board, col, row, player)` — checks whether a cell is a 3+empty major threat; not exported from `classifier.js`, this is the canonical server location
- `getBoardVisualization(movestring)` — shells out to `scripts/visualize_board.mjs` via `spawnSync`, strips the `scr` row
- `buildKBSection(patternNames)` / `loadKBStatement(id)` — loads KB article `statement` field for active patterns; `inline` branch removed 2026-06-20
- `callLLM(prompt)` — thin wrapper around `server/llmChat.js`'s `callOpenAIChat` (see "Unified OpenAI-Chat Call Helper" below); reads `OPENAI_API_KEY` / `OPENAI_MODEL` from env, passes `endpoint: 'run-eval'`, `purpose: 'offline-eval'`, `userId: null`, `maxCompletionTokens: 400`, `useJsonFormat: false`. Callers destructure `{ content }` from the return value — it is no longer a bare string (spec 047 US5; `tests/scripts/run_eval.mjs` was updated accordingly).
- `selectContrastMove(scores, userCol, board)` — pure; returns `{ contrastCol, isOptimal }` or `null` when all legal scores are equal. `isOptimal=true`: user played best, contrast = second-best; `isOptimal=false`: user played suboptimally, contrast = best. Tie-break: closest to col 3.
- `getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver)` — returns the movestring after opponent's best response, or null if the game is over.
- `findMajorThreatWindows(board, perspective)` — scans all 4-windows and returns windows with exactly 3 discs of one color + 1 empty cell. Returns `{ cells: string[], owner: 'player'|'opponent' }[]`. Replaces `getMajorThreatCells` for all group-level operations.

### Explain-move utilities (Epic 3)

- `checkAllMovesEqual(preScores, board)` — returns `{ isSettled, allMovesEqual }`. `isSettled=true` means all legal columns have zero score (genuine draw). Used to short-circuit the LLM call.
- `getGapAndFraming(preScores, col, contrastCol)` — returns `{ gap, inverted, forceBucket, gapBucket }`. The eval gap between user's move and the contrast. `inverted=true` when the user's move is optimal. `gapBucket` is one of `small`/`moderate`/`large`, with sign-change override (`forceBucket`).

### Prompt builder (Epic 3, replaces type-dispatch)

- `buildBlunderExplainPrompt({ tag, direction, humanReason, positiveReason, correctMovePatterns, boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet })` — builds the full LLM system prompt for the explain-move endpoint. Handles both the blunder path (when `tag`/`direction`/`humanReason` are set, `positiveReason` is null) and the optimal path (when `positiveReason` is set, `tag`/`direction`/`humanReason` are null). Used exclusively by `buildExplainContext` in `explainContext.js`.

Parameter shapes:
  - `tag` — string or null (null on optimal-move path). One of the 15 VALID_BLUNDER_TAGS values.
  - `direction` — `'missed_own'|'enabled_opponent'|'defensive_miss'` or null.
  - `humanReason` — string from `REASON_TEMPLATES.get('${tag}:${direction}')` on blunder path, or null.
  - `positiveReason` — string from `POSITIVE_TEMPLATES.get(tag)` on optimal path, or null.
  - `correctMovePatterns` — `Map<string, {cells: string[]}>` from `classifyPattern(ms + bestCol, perspective, solver)`.
  - `boardViz`, `postBoardViz` — board visualization strings from `getBoardVisualization`.
  - `playerName` — `'Green'` or `'Grey'`.
  - `gap`, `gapBucket` — eval gap metrics from `getGapAndFraming`.
  - `allowedSet` — `AllowedSetEntry[]` or null. Never pass `[]` (empty array) — that causes P5strong failures for all `tg` zones.

### Deleted functions (Epic 3)

The following functions were removed to simplify the explain-move path:
- `classifyExplanationType` — type-1/2/3/4 dispatch (replaced by direct blunder/optimal paths in `buildExplainContext`)
- `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt` — type-specific templates (replaced by `buildBlunderExplainPrompt`)
- `buildCommonPromptSections`, `buildGroupContextBlock`, `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet` — simulation-era grounding contract builders (no longer needed)
- `computeDeltaTable`, `buildExplainPrompt`, `buildPatternNarrative`, `PATTERN_NAMES` — earlier versions

**Critical invariant**: solver scores are NEVER passed to the LLM. `getScoreTier` translates scores to tier labels (WINS/DRAWS/LOSES), and `getBoardVisualization` strips the `scr` row from board output. This invariant MUST be preserved by all callers.

The CLI scripts (`scripts/recommend_next_move.mjs`, `scripts/explain_move.mjs`) import from this module. Server endpoints (`/api/recommend-move`, `/api/explain-move-llm`) also import from it and reuse the server-managed solver singleton rather than spawning their own.

## Unified OpenAI-Chat Call Helper (`llmChat.js`, spec 047 US5)

`connect-four/server/llmChat.js` exports one async function, `callOpenAIChat(prompt, ctx)`, that
**every** in-scope OpenAI chat-completion call site is routed through, so token usage and USD cost are
recorded uniformly with zero bespoke per-site logging. Full contract:
`specs/047-platform-hardening-cost-observability/contracts/llm-call-helper.md` (this section
summarizes; that doc is authoritative for exact parameter defaults and edge-case behavior — do not
duplicate it verbatim here on future edits, cross-reference it instead).

**Signature**: `callOpenAIChat(prompt, { model, apiKey, endpoint, userId = null, purpose,
maxCompletionTokens = 4000, useJsonFormat = true, fetchImpl = fetch }) → Promise<{ content, usage:
{ promptTokens, completionTokens, totalTokens } }>`. Throws on any non-2xx OpenAI response or network
failure, same as the three pre-existing implementations it replaced. Retries once without
`response_format` if `useJsonFormat` was requested and the response indicates the model rejected it
(ported verbatim from the prior `defaultCallLLM`/`callExplainLLM` behavior), but the retry flag is now
function-local per call, not module-level shared state — a rejection on one model's call no longer
silently disables `response_format` for a different model sharing the module.

**Call sites** (all three rewired in place):

| Call site | File | `{ endpoint, purpose }` |
|---|---|---|
| Production deep-reveal | `mechanismExplainer.mjs`'s `defaultCallLLM` (thin wrapper) | `{ endpoint: 'explain-move-llm', purpose: 'deep-reveal' }` |
| Offline eval harness | `llmCoachHelpers.js`'s `callLLM` | `{ endpoint: 'run-eval', purpose: 'offline-eval' }` |
| Offline compute/eval script | `scripts/compute.mjs`'s `runLlm` (its former local `callExplainLLM` copy is deleted) | `{ endpoint: 'compute-eval', purpose: 'offline-eval' }` |

**Which function actually serves production deep-reveal.** The table above is the authority; the
pipeline diagrams in `llm-coach-endpoints.md` show `callLLM` and mislead readers into treating it as
the choke-point. It is not, and that wrong premise cost spec 047 a full critique round.

- `POST /api/explain-move-llm` → `computeMechanism` (`mechanismExplainer.mjs`) → its internal
  **`defaultCallLLM`**. This is the OpenAI chat path that actually serves users. `computeMechanism`'s
  `callLLM` option is a **test-injection seam only**.
- After the LLM call and `chooseRetryWinner`, `computeMechanism` applies one more deterministic step
  to the CHOSEN attempt: `ensureBetterColumnMention` (`retryDecision.mjs`, D63/OI-224) appends a
  localized "you should have played column N" sentence when the served mechanism never names the
  better column. This is a pure text repair, not a second LLM call — `betterColRepaired` reports
  whether it fired.
- **`callLLM` in `server/llmCoachHelpers.js` captures no production traffic** — it is used only by the
  offline `run_eval.mjs` harness. Instrumenting it alone records nothing real.
- **`composeExplanation` (`index.js:616`) is dead code.** Its only call site (`index.js:1241`) sits
  inside `POST /api/explain-move` (`index.js:1190`), and that route has **no frontend caller at all** —
  proven 2026-07-30 (spec 051 US4) by driving the real app (Sparring → Resign → Past Games → a
  "Suboptimal" card → "What should I have played?") with the network tab captured in both languages:
  zero requests to `/api/explain-move`, and no `oneLiner`/`one_liner` key in any captured payload.

**`userId` threading is not purely mechanical.** Unlike the static `endpoint`/`purpose` literals above,
`userId` is request-scoped. For the production deep-reveal path this requires two edit points, both
required (skipping either silently leaves `userId` as `null` for every production call):
`computeMechanism` (`mechanismExplainer.mjs`) accepts `userId = null` in its options object and forwards
it into its internal `defaultCallLLM` call closure; and the route (`POST /api/explain-move-llm`,
`index.js`) passes `userId: req.user.id` into `computeMechanism`'s options (safe because the route
already guards `!req.user` earlier). The offline call sites always pass `userId: null` — there is no
request-scoped user in a CLI/script context.

**Fire-and-forget ledger write.** On a successful response, `callOpenAIChat` computes `costUsd` via
`llmPricing.js`'s `estimateCost(model, usage)` and calls `llmUsageLedger.js`'s `recordUsage({ endpoint,
purpose, userId, model, usage, costUsd })` **without awaiting it** — a ledger-write failure or delay
must never affect the caller's response latency or success. On failure (thrown or non-2xx), it logs via
`logError('[llm-chat]', err, { endpoint, purpose, userId, model })` and re-throws; no `recordUsage` call
happens — no partial/fabricated ledger row. See `data-model.md`'s `llm_usage` section for the table
this writes to and its append-only lifecycle (contrasted with `explanation_cache`'s deploy-time
TRUNCATE).

## CSP Directive Rationale (spec 047 US2, FR-003/004/005)

The `helmet` CSP mounted in `index.js` (see the `app.use(helmet({ contentSecurityPolicy: { directives:
{...} } }))` block, right after `app.set('trust proxy', 1)`) is deliberately narrow —
`default-src 'self'` plus explicit, minimal per-directive allowances. One omission looks like a bug to a
future contributor scanning for a missing `form-action` entry; it is not:

- **Sentry now HAS a `connect-src` entry — this bullet previously said the opposite** (corrected
  2026-08-03, spec 055). Sentry is initialized on **both** sides — `connect-four/src/main.jsx:12`
  (frontend) and `connect-four/server/index.js:119` (server) — so the traffic the older text called
  "speculative" is real. `server/index.js:152` defines
  `const SENTRY_INGEST = process.env.SENTRY_INGEST_HOST || 'https://*.ingest.sentry.io'`, which is
  included in `connectSrc` at line 191. Verified live on 2026-08-03: both a local production build and
  `https://decodec4.xyz/` return a `Content-Security-Policy` header carrying
  `https://*.ingest.sentry.io` in `connect-src`. The earlier text ("no `Sentry.init(...)` call exists
  anywhere in `connect-four/src/`… do not add a speculative entry") described a state that has since
  changed; it is preserved here only so a reader who remembers it knows it was superseded rather than
  contradicted by accident.
- **No `form-action`/`frame-src` entry for Google OAuth.** `AuthModal.jsx` performs the OAuth handoff via
  `window.location.href = '${oauthBase}/api/auth/oauth/google'` — a full top-level page navigation, not
  a `fetch`/XHR (governed by `connect-src`), not a popup, and not an iframe (governed by `frame-src`).
  Standard CSP source directives do not restrict top-level navigation via `location.href` assignment,
  so no directive is needed to "permit" the OAuth redirect chain.
- **`media-src` includes the Supabase host** (`'self'`, `` `https://${SUPABASE_HOST}` `` where
  `SUPABASE_HOST = new URL(process.env.SUPABASE_URL).host`, computed once at startup) because signed
  coach-audio URLs from Supabase Storage (the redirect target of `GET /api/user/tts/deep-reveal`) are
  fetched cross-origin by the `<audio>` element. This is the one directive in the set that legitimately
  needs a non-`'self'` origin.
- **`style-src` no longer stays bare `'self'`** (superseded 2026-07-18 by the Paddle checkout migration —
  the claim above was true at spec-047 time, but is not the current state). Paddle.js's overlay checkout
  needed three separate additions, discovered one CSP violation at a time against the deployed (not
  `npm run dev`) build: `'unsafe-inline'` (Paddle sets inline `style="..."` attributes directly on
  elements it injects into the parent page — the loading spinner, before its iframe loads — and these are
  dynamically generated, not a fixed hashable set), `PADDLE_ORIGINS` (`https://*.paddle.com`, for the
  external `paddle.css` it loads from its own CDN), and `GOOGLE_FONTS_STYLESHEET`
  (`https://fonts.googleapis.com`, unrelated to Paddle — `index.html`'s Baloo 2 / Nunito webfont link was
  never actually CSP-clean, just never exercised until someone opened it in a hardened deploy). A new
  `font-src` directive was also added (`'self'` + `https://fonts.gstatic.com`) — there was none before, so
  it fell back to `default-src 'self'` and silently ate the actual `.woff2` files Google Fonts' stylesheet
  references. **Pattern for next time**: integrating any third-party checkout/payment-widget SDK is a
  CSP-directive discovery problem, not a one-shot fix — expect script-src, style-src, connect-src,
  frame-src, img-src, and font-src to each need their own violation before you find them; a passing local
  smoke test proves nothing (CSP is Express-`dist`-only, per the papergames caveat above) — test against a
  deployed build. `PADDLE_ORIGINS`/`GOOGLE_PAY_ORIGINS` (added the same way, for `Paddle.Checkout.open()`
  and the Google Pay payment method respectively) also touch `script-src`, `connect-src`, and `frame-src`
  — see the `PADDLE_CDN`/`PADDLE_ORIGINS`/`GOOGLE_PAY_ORIGINS` constants right above the `helmet(...)` call
  in `index.js` for the full current set and per-directive rationale comments.
- **`connect-src` and `img-src` include `https://papergames.io` (and `wss://papergames.io` for
  `connect-src`).** The Play-Online / Past-Games features talk to papergames.io directly from the browser:
  `PlayOnlineScreen.jsx` opens a `wss://papergames.io/socket.io/...` WebSocket (governed by `connect-src`),
  and `PastGamesListScreen.jsx` renders avatar `<img>` elements from `https://papergames.io/en/assets/...`
  (governed by `img-src`). A bare `'self'` for either directive silently breaks online play and avatars in
  production. **This was missed by the original spec-047 research §2 CSP analysis and caught in code review**
  — these are real, load-bearing external dependencies, not speculative allowances, so unlike the Sentry
  case above they MUST stay. **Caveat:** this only breaks when Express serves the built `dist/` with the CSP
  header; `npm run dev` (Vite, port 5173) serves the SPA itself without Express's CSP, so the local FR-005
  smoke test cannot surface a papergames CSP violation — verify online-play + avatars against a
  **production-like** build (or the deployed staging system) specifically.
- **The service-worker registration is in `src/main.jsx`, not an inline `<script>`.** It was moved out of
  `index.html` precisely so `script-src 'self'` can stay strict (an inline `<script>` would need
  `'unsafe-inline'`, a hash, or a nonce). Do not reintroduce inline scripts into `index.html` without
  updating `script-src` accordingly.

If a future change needs to add a `connect-src`/`form-action`/`frame-src` entry, first check whether it is
a real dependency (like papergames.io above) or a speculative one (like Sentry). For Sentry/OAuth
specifically: adding a directive almost certainly means Sentry has actually been `init()`'d or the OAuth
flow has changed to a `fetch`/popup/iframe — re-verify the premise before adding, rather than restoring it
"to be safe."

## Static Cross-Directory JSON Import

`server/index.js` imports the frontend i18n file directly:
```js
import i18nTranslations from '../src/i18n/en.json' with { type: 'json' };
```
This is acceptable in this monorepo because `en.json` is a build artifact that the server reads at startup (for `pickFromPool` key selection). Requires **Node 20.10+** for the `with { type: 'json' }` import-attributes syntax. If the Node version constraint cannot be met, fall back to `JSON.parse(fs.readFileSync(...))`.

Do not add more server→frontend imports. This single cross-boundary import is intentional and documented here so future maintainers don't generalise the pattern.

## CLI script conventions — a meaningful `--help` is mandatory

Every human-invoked CLI script under `connect-four/scripts/` and `connect-four/server/scripts/`
(plus its shell wrapper, if it has one) MUST provide a **meaningful** `--help` / `-h` toggle: not a
bare usage line, but the script's **purpose**, **each option with its default**, and any **required
env/setup**. Print it and `process.exit(0)`.

These scripts encode non-obvious pipelines (reason-eval, board selection, blunder reprocessing) whose
flags are not otherwise discoverable — the `--help` text is the contract.

- Define a `HELP` string near the arg parser; check `process.argv.includes('--help')` / `'-h'` and exit
  **before** any required-arg validation, so `--help` never errors out on a missing `--input` (and still
  exits 0 when other malformed flags are present).
- If the file is **also imported** (e.g. `scripts/compute.mjs` exports `buildEvidenceRow` for tests), put
  the help-exit **inside** the `process.argv[1] === fileURLToPath(import.meta.url)` entry guard — at
  module scope it would call `process.exit` on import. Pure CLI-only files (e.g. `select_boards.mjs`)
  may check at module scope.
- Reference implementations: `connect-four/server/scripts/compute.mjs` and
  `connect-four/server/scripts/select_boards.mjs`.

## LLM Explanation Scripts

CLI scripts that call an LLM must load `connect-four/server/.env` via Node's built-in
`--env-file` flag (Node 20.6+). The shell wrapper at the project root is the single
call site for this flag (e.g. `explain_move.sh`). Scripts themselves read
`process.env.OPENAI_API_KEY` and `process.env.OPENAI_MODEL` directly — no `dotenv`
package needed.

**Boot-path import discipline.** Some reason-engine CLI modules (`reasonEngine.mjs`,
`scripts/compute.mjs`) also load `.env` at module-import time. Because the production
server transitively imports them (`index.js` → `mechanismExplainer.mjs` → `compute.mjs`
→ `reasonEngine.mjs`), any `.env` read that runs as an import side-effect executes during
server boot — and in prod there is **no `.env` file** (env comes from the platform). Such
reads MUST go through `boardUtils.loadEnv` (`server/scripts/reason_engine/lib/boardUtils.mjs`),
which treats a missing file as a no-op. Never add a bare top-level `readFileSync` of `.env` to a
module reachable from `index.js`; it will crash-loop the server. Fixing one offender is not
sufficient — statically walk the whole boot import graph (`index.js` → `mechanismExplainer.mjs`
→ `compute.mjs` → `reasonEngine.mjs`) for top-level `.env` reads, since fixing only the first one
found just moves the crash to the next module in the chain.

**Batch/offline scripts must wrap each `callLLM` call individually** in its own try/catch, not one
outer try/catch around the loop — an uncaught error (timeout, rate limit, API error) otherwise
propagates out of the loop and silently drops the current entry with no record written (see
`server/scripts/run_eval.mjs` for the reference pattern: each `callLLM` call is caught separately
and the error message is recorded on the entry before continuing). The production endpoint's
single outer try/catch (`mechanismExplainer.mjs`) is fine there only because a failed call falls
back to cached text; batch scripts have no such fallback.

**LLM prompt structure contract** for move explanations (`/api/explain-move-llm`, Epic B):

The prompt is built by one of four type-specific template builders (`buildType4Prompt`, `buildType12Prompt`, `buildType3Prompt`), dispatched by `classifyExplanationType`. All templates share a common skeleton via `buildCommonPromptSections`:

1. `## Role` — type-dependent persona:
   - **Type 1/2/3**: "You are a Connect Four coach explaining why one move was stronger than another."
   - **Type 4**: "You are a Connect Four coach explaining, in the opening, why one move develops better than another."
2. `## Players` — player identity (Green/Grey) with winning parity rows
3. `## Hard grounding rules` — must reference only cells listed in the Winning-line comparison block
4. `## Move context` — player, column played, best alternative, eval gap, stage, major threat count
5. `## Boards` — up to three board visualizations (pre-move, post-move, post-opponent-response) with R→Green, Y→Grey substitution and `scr` row stripped
6. `## Winning-line comparison` — zero or more `GROUP_k` blocks with per-group: cells, occupants, key completing cell, row parity, CONCRETE-ELIGIBLE/ABSTRACT-ONLY flag, A-branch vs B-branch frequency, KB justification
7. `## Tone (driven by Eval gap)` — tone ladder scaled to `gapBucket` (small/moderate/large), with inverted framing when user's move is optimal
8. `## Pattern definitions` (KB section) — loaded via `buildKBSection` for parity-related KB slugs
9. `## Output format` — zone tag instructions
10. `## Task` — type-specific grounding instruction (Type 1: missed immediate threat; Type 2: tactical pattern; Type 3: parity flip sentence; Type 4: developmental framing)

Solver scores are intentionally excluded from the prompt. The LLM reasons from the grounded `allowedSet` cells, winning-line comparison, and KB parity definitions only.

**Contrast move selection**: if the user's move was suboptimal, the contrast is the best legal move; if optimal, the contrast is the second-best. Center column (col 3) breaks ties. If all legal scores are equal, the handler returns the "All moves are roughly equivalent" frozen string without calling the LLM. If `checkAllMovesEqual` detects a genuinely settled position (all scores zero), the shorter "All moves are roughly equivalent" frozen string is returned instead.

### Zone tag normalization (`normalizeZoneTags`)

LLMs frequently malform zone tags in explain-move output. Common errors:
- `[zone:column 2]...[/zone:column]` instead of `[zone:col2]...[/zone:col2]`
- `[zone:col 3]...[/zone:col]` instead of `[zone:col3]...[/zone:col3]`

`normalizeZoneTags()` in `server/index.js` fixes these before validation:
1. Opening tags: `[zone:column N]` or `[zone:col N]` → `[zone:colN]`
2. Closing tags: pairs each opening `[zone:colN]` with the nearest following `[/zone:*]` and rewrites it to `[/zone:colN]`

This function MUST be called on both the first attempt and retry LLM output before `validateAnnotation()`.

### allowedSet construction rules

`buildExplainContext` in `explainContext.js` builds the `allowedSet` for P5Strong validation. Rules:
1. **Pattern-derived cells**: from `classifyPattern` results at the played position, best-move position, and (for blunders) opponent-response position. Tier 1 tags contribute cells; Tier 2 contributes abstract columns; Tier 3 is skipped.
2. **Played column**: always added as `{ col, validationOnly: true }` — the LLM may reference where the move was played.
3. **Contrast column** (blunders only): added as `{ col: contrastCol, validationOnly: true }` — the LLM may reference the better column.
4. **Played cell** (pending): the exact cell where the disc landed should also be whitelisted. Computed by counting discs in `col` within `movestring`.

`validationOnly: true` means the entry is used for P5Strong validation but excluded from the prompt's "Strategic reference cells" list. Columns with this flag are instead listed explicitly in the "Hard grounding rules" section with their exact zone tag format.

**Key files**:
- `connect-four/server/explainContext.js` — `buildExplainContext` (the grounding entry point)
- `connect-four/server/scripts/visualize_board.mjs` — board visualization (called via `spawnSync`)

## Game Blunder Writes (`insertGameBlunder`)

`insertGameBlunder(supabase, row)` in `server/insertGameBlunder.js` is the sole write path for all blunders — post-game analysis, puzzle attempts, and papergames imports. The client no longer writes blunders directly. As of migration 058 (anon free deep reveal) it writes when `row.user_id || row.device_uuid` (was `user_id`-only), so anonymous rows carry `user_id NULL` + `device_uuid`. The **owner decision** (user- vs device-scoped, or skip) is a separate pure, unit-tested module `server/anonBlunderAccess.js#resolveGameBlunderOwner(reqUser, game)` — the analyze handler calls it and passes the result's `user_id`/`device_uuid` into the row. `anonBlunderAccess.js` also exports `resolveQueueOwner` (coach-queue scoping) and `resolveExplainQuota` (whether the free-tier weekly quota runs) — the standard extract-decision-from-`index.js`-so-it's-unit-testable pattern, since `index.js` has no HTTP harness.

The `row` shape:
```js
{
  user_id,          // required — anonymous users are silently skipped
  board_state,      // movestring at the point of the blunder
  move_played,      // 0-indexed column actually played
  correct_move,     // 0-indexed best column
  pattern_category, // blunder tag slug; unrecognized tags are substituted with 'suboptimal_move'
  reason,           // human-readable reason string
  direction,        // 'defensive_miss' | 'enabled_opponent' | 'missed_own'
  severity,         // integer [0,10] score-spread measure
  blunder_severity, // real [0,1] tree-scan fraction, or null
  game_id,          // uuid FK → games(id), nullable — AI sparring game
  papergames_game_id, // uuid FK → papergames_games(id), nullable — papergames imported game
}
```

**Dual game-link columns**: `game_id` links to AI sparring games (`games` table); `papergames_game_id` links to imported papergames games (`papergames_games` table). Exactly one should be non-null for a given blunder row; both can be null for puzzle blunders. `insertGameBlunder` stamps whichever is provided — it does not enforce the "exactly one" constraint (that is left to the caller).

**`move_index` stamping**: `insertGameBlunder` computes `move_index` as `row.board_state?.length ?? null`. This is the 0-indexed global ply number where the blunder occurred. Callers do NOT pass `move_index` — the function derives it from `board_state`. The column and its partial unique indexes (`idx_blunders_papergames_unique` for papergames rows, `idx_blunders_game_unique` for AI-sparring `game_id` rows — migration 054) back the `23505`-as-success dedup for idempotent re-analysis/re-import per `(user_id, <fk>, move_index)`.

**Storage gate — `server/mistakeStorageRule.js`**: `classifyStoredMistake(bestScore, playedScore, movestring)` is the single shared gate that decides only whether a non-optimal ply is ELIGIBLE for storage — it returns a boolean (`true`/`false`), never a `quality`. Grading is NOT its job: per spec 057 FR-019a (owner directive, 2026-08-03), `scoreMove` (`moveQualityScorer.js`) is the sole grader of the game-move `quality` label anywhere in the repo; callers take `quality` from `scoreMove` and pass it through. The two live write paths call `classifyStoredMistake` before `insertGameBlunder`: `POST /api/games/analyze` and `papergamesImporter.extractBlunders`. **`POST /api/blunders` is retired** (spec 057 T035 item 2 option (b) — see `server/index.js` around the "POST /api/blunders — RETIRED" comment; it had no client caller and required the score-pair grading path `classifyStoredMistake` no longer provides). `classifyStoredMistake` returns `false` (do not store) for slower wins (case 1) and dead-position faster losses (case 3's aliveness gate); otherwise `true` (case 2/3). Its `playerHasPotentialWin(board, player)` liveness check (any 4-window free of opponent discs) is deliberately NOT the forbidden `bestScore < 0` skip — solver-lost-but-alive positions are still stored. See `data-model.md` for the full rule and rationale.

- `game_id` and `papergames_game_id` are both nullable. Pass `null` (or omit) when the blunder does not originate from that source.
- Returns `true` on success or a `23505` dedup (already recorded), `false` on any other DB error. Callers that track import quality (e.g. `importForUser`) count `false` returns as `blunderErrors`.
- Never throws or rejects — all errors are logged via `console.error`.
- Deduplication is handled by DB unique indexes; `23505` constraint violations return `true` (treated as success).

## Admin Batch-Generation Modules — Pure-Function Pattern (`lessonAudio.js`)

`server/lessonAudio.js` (spec 046 US3/US4) is the canonical shape for a future admin-triggered
batch-generation module — it mirrors `insertGameBlunder.js`'s extraction pattern (see "Game Blunder
Writes" above): pure, dependency-injected functions with no route-handler logic inline, so they're
directly `node --test`-able without an Express app or a real TTS provider.

- **`hashMessageText(text)`** — deterministic 16-hex-char `sha256(text)` prefix. Identity key for
  generated audio: identical text ⇒ same filename (no redundant re-synth); changed text ⇒ a new,
  distinct file. There is no separate manifest/registry/approval file — the lesson JSON's own `audio`
  field is the sole source of truth (contrast with spec 039's i18n-key-driven, manifest-gated coach TTS
  pipeline, which this module deliberately does NOT reuse or extend).
- **`collectMessages(lesson)`** → `[{ message, locator, textKey, audioKey }]` — **the single walker over
  every narratable text in a lesson.** Yields, per slide, `slides[si].coachMessages[mi]` (locator
  `slides[${si}].coachMessages[${mi}]`) and then that slide's **`infoProse`** (locator
  `slides[${si}].infoProse`), and after all slides `socratic.messages[phase][mi]`
  (locator `socratic.messages.${phase}[${mi}]`) in the fixed
  `SOCRATIC_PHASES` order (`ask`, `wrong1`, `wrong2`, `correct`, `hint`) — never `Object.keys`, so locators
  and logs are deterministic. Tolerates `socratic: null` (lesson 4) and an absent/malformed `messages`.
  **Not every narratable string is coachMessage-shaped**, hence `textKey`/`audioKey` on each entry:
  coach and socratic messages use `text`/`audio`, but a slide's prose lives on the *slide* under
  `infoProse`/`infoProseAudio`. Callers derive the Spanish sibling from those keys
  (`lang === 'es' ? `${key}_es` : key`) rather than hardcoding `text_es`/`audio_es`. A slide is yielded
  if **either** `infoProse` or `infoProse_es` is non-empty, so an es-only slide still gets a clip.
  The prose entry comes **after** its slide's coach messages, matching the order the learner hears
  them (bubble, then prose — see `getSlideNarrationQueue` in `src/lib/lessonNarration.js`).
  **Both `generateLessonAudio` and `collectReferencedAudio` MUST consume it.** This is not a tidiness
  refactor: `collectReferencedAudio` feeds `pruneOrphanedLessonAudio`, which *deletes* unreferenced mp3s,
  so any message the generator can see but the collector cannot has its clip deleted as an orphan on the
  next prune. That divergence shipped **twice** (`audio_es`, then socratic) before the walker existed. Add
  a new message location here and both pipelines get it. The slide locator string is asserted verbatim by
  `tests/unit/lessonAudio.test.js` (whole-array `deepEqual` at several sites) — do not reformat it, and do
  not move socratic before slides.
  **Not covered:** `scripts/translate-lessons.mjs` walks messages *independently* (its locators carry a
  `.text` suffix and it runs on raw pre-localization lessons) and keeps a hand-synced `SOCRATIC_PHASES`
  copy. Adding a message location means editing **both** — see "Lesson translation script" below.
- **`generateLessonAudio(lesson, { lang = 'en', synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR, locator = null } = {})`** —
  dependency-injected `synthesize` and `dir` params are the test seam (a test passes a stub synthesize
  function and a temp dir; production code omits both and gets the real `server/ttsProvider.js`
  `synthesize` + the real `public/audio/lessons/` dir). `locator`, when set, (re)synthesizes only the
  single `collectMessages()` entry whose locator matches exactly. As of spec 051 (FR-026/FR-027),
  `synthesize` is called as `synthesize(text, lang)` — voice/model/speed/instructions resolution moved
  **inside** `server/ttsProvider.js`'s `synthesize`/`resolveSynthesisConfig`, so this function no longer
  calls `readTtsConfig`/`buildTtsInstructions` itself; a stub passed via the `synthesize` seam must accept
  `(text, lang)`, not `(text, opts)`. Walks via `collectMessages`, so it covers concept
  slides (coach messages **and** `infoProse`) **and** `socratic.messages`. `lang='es'` reads the `_es`
  sibling of each entry's `textKey` and writes the `_es` sibling of its `audioKey`. **Regenerates
  unconditionally**: the text hash keys the *filename*, but the voice/prompt/speed/model live in
  `tts-prompt.<lang>.json` and are not in that hash, so a hash match says nothing about whether the clip
  still sounds right. It used to skip on a hash match, which made the admin "Generate audios" button
  unable to re-voice a lesson after a prompt change and left a lesson whose mp3 went missing
  permanently silent (the check never touched the filesystem). Same text → same hash → same path, so
  regeneration overwrites in place and orphans nothing; the cost is one TTS call per message per click.
  Empty/whitespace text is still skipped — that is "nothing to say", not a cache hit. Each message's
  synthesis is isolated in its own try/catch — one failure doesn't abort the batch; that message's
  `audio` is left unset/unchanged and recorded in the `failed` array. Returns `{ lesson, generated,
  failed }`, mutating (and returning) the same lesson object passed in.
- **`collectReferencedAudio(allLessons)`** — walks via `collectMessages` and collects the `path.basename`
  of **both** `message[audioKey]` and `message[`${audioKey}_es`]` across every entry. Reading the key off
  the entry (rather than hardcoding `audio`/`audio_es`) is what keeps the 30 `infoProseAudio` clips from
  being deleted as orphans on the next prune. Feeds `pruneOrphanedLessonAudio`.
- **`pruneOrphanedLessonAudio(allLessons, dir = LESSON_AUDIO_DIR)`** — synchronous; deletes any `.mp3`
  under `dir` not in `collectReferencedAudio`'s set, returns the list of deleted filenames.
- **`SOCRATIC_PHASES`** — exported `['ask','wrong1','wrong2','correct','hint']`. The canonical phase order.
  `scripts/translate-lessons.mjs` keeps its own copy that must stay in this exact order.
- **`LESSON_AUDIO_DIR`** — exported constant (`public/audio/lessons/`), overridable per-call via the
  `dir` param for tests.

### Lesson audio corpus CLI (`scripts/generate-lesson-audio.mjs`)

Spec 051 US5 / FR-031 / OI-78. The admin lesson-audio path is per-lesson, per-language —
`POST /api/admin/lessons/:id/generate-audio` (body `{ lang, locator? }`) regenerates one lesson in one
language per call. A full corpus pass is 15 lessons × 2 languages = 30 separate HTTP requests, all
against the same shared `app.use('/api/', makeLimit(120))` 120-req/min limiter every other `/api/*`
route shares (see "Rate limiting" above). Firing those 30 requests back-to-back (a naive shell loop of
curls) trips the limiter almost immediately and fails most of the run identically — this is the exact
failure mode `scripts/generate-tts.js` avoids for the *coach* pipeline by batching server-side
(`generate-all`), but no such bulk endpoint exists for lesson audio (deliberately — see FR-031: "This
does NOT add a bulk re-synthesize-approved command to the existing CLI").

`scripts/generate-lesson-audio.mjs` closes that gap client-side instead:

- **`--lesson <id>`** — repeatable (`--lesson a --lesson b`) and/or comma-separated (`--lesson a,b,c`).
  Defaults to every lesson id discovered by reading `lessons/*.json`'s own `id` field (not the filename)
  — currently 15.
- **`--lang <en|es|all>`** — defaults to `all` (both `en` and `es`).
- **`--delay-ms <n>`** (default `700`) — pacing between requests, keeping a full 30-request run well
  under the 120/min cap.
- **`--max-retries <n>`** (default `5`) — retries a `429` per (lesson, lang) job before giving up on that
  job and moving to the next (a give-up is reported in the final summary, not silently dropped).
- **`--help` / `-h`** — exits 0 **before** any argument parsing/validation, even with other malformed
  flags present (see §"CLI script conventions — a meaningful `--help` is mandatory" above).

**429 handling — two landmines this script exists to dodge**: (1) the shared limiter's `429` body is
**plain text** ("Too many requests, please try again later."), not JSON — a bare `.json()` call throws an
opaque "Unexpected token" error that hides the real 429, so the script always reads via `.text()` first
and `JSON.parse`s inside a `try`/`catch`. (2) it honors the response's `RateLimit-Reset` header (seconds
until the limiter's window resets, from `standardHeaders: true`'s draft-7 shape) rather than a blind
fixed backoff, so a retry doesn't land back inside the same still-tripped window.

**Resumability (the edge case this task exists for)**: a run interrupted by a network failure or a killed
process never leaves a silent gap — every (lesson, lang) job's outcome is tracked independently, and the
final summary lists exactly which jobs succeeded and which failed (with the reason). Re-running is safe:
`generateLessonAudio` regenerates unconditionally (see above), so re-running the same flags, or narrowing
to just the failed `--lesson`/`--lang` pairs, always produces the current, correct clips — nothing is
skipped as "already done" and nothing is double-charged beyond one TTS call per message per re-run.

Requires the local dev API server running and reads `$API_PORT` (falls back to `3001` for the
un-worktreed main checkout) — see `docs/architecture/worktree-conventions.md`. `requireLocalhost` checks
the request's socket address, not a header, so no auth token is needed; only that the script runs on the
same machine as the server.

This script is **lesson** audio only. It is unrelated to `scripts/generate-tts.js` / the admin
`generate-all` endpoint, which cover the separate i18n-keyed **coach** TTS pipeline (see
`docs/architecture/coach-audio-conventions.md`) — the two pipelines intentionally do not share code,
per the "Admin Batch-Generation Modules — Pure-Function Pattern" note above.

### Lesson translation script (`scripts/translate-lessons.mjs`)

Drafts `_es` sibling fields via the LLM. It is the **third** walk over lesson content and deliberately does
**not** consume `collectMessages` (different locator convention — every path ends in `.text` — and it
operates on raw, pre-`localizeLesson` objects). It translates exactly six field paths:
`slides[].coachMessages[].text`, `slides[].legendItems[].label`, `slides[].infoProse`,
`socratic.goalPrompt`, `socratic.messages[phase][].text`, `confirmationChallenges[].goalPrompt`.

`handleField(obj, key, pathLabel)` skips when `obj[key_es]` already exists unless `--force`, so
pre-seeded translations are preserved. **When you add a narratable field to lesson JSON, update this
script as well as `collectMessages`** — miss it and that copy silently never gets Spanish, which
`pickLocalized`'s English fallback then hides at render time.

**Pattern to reuse for the next admin batch-generation feature**: export pure functions taking their
side-effecting dependencies (an API client, a filesystem root, etc.) as an optional `deps` object with
production defaults, keep all Express/route-handler concerns (auth middleware, request parsing,
response shaping) in `index.js`, and give the module its own `node --test` unit test file completely
independent of the HTTP layer.

## Annotation Gate (`POST /api/explain-move-llm`)

**Updated 2026-08-04 (spec 057 Epic 10 US2, T028, D3) — the rest of this section describes an
earlier, never-shipped design (retry-on-failure + a `deep_reveal_failures`-backed tier-1 fallback
string) that OI-124 found had **zero production callers**: nothing under `server/` imported
`validateAnnotation` outside `server/scripts/run_eval.mjs` and
`server/scripts/corpus_annotation_check.mjs` (both offline). What actually ships as of T028 is
narrower — **strip-and-log**, not retry-and-fallback. Read this paragraph and the one after it as
authoritative; the "Signature"/"Checks"/"Retry"/"Tier-1 fallback" prose below is historical
context for the offline eval path only, not a description of `/api/explain-move-llm`'s live
behavior.

**What's wired in (T028)**: `guardExplainMoveLlmPayload` (`server/reasonRenderGuard.mjs`) — the
single response-boundary seam every player-facing explanation crosses on its way out of
`server/index.js` (documented in `server/reasonRenderGuard.mjs`'s own file header; also see OI-126
below for the `stripInternalTokens` half of the same module) — now accepts an optional `board` and
`allowedSet`, and, when `board` is supplied, runs `validateAnnotation(explanation, board, allowedSet)`
before serving the text. All three `/api/explain-move-llm` call sites (`server/index.js`: the
cache-hit early return, the not-a-blunder early return, the fresh-generation response) pass the
**pre-move** `Board` already constructed at the top of the handler (`new Board(movestring)`) — the
same convention the offline callers use (the played column is passed separately, never baked into
the board). Only the fresh-generation call site threads a real `allowedSet` (spec 058, US3,
OI-143); the cache-hit and not-a-blunder early returns keep `allowedSet: null` on purpose — there
is no `renderDecision`/`zones.aliases` in scope to build one from on those paths.

- **Enforcement is strip, not retry.** The owner explicitly rejected retry (a second LLM call is
  real cost) and serve-and-log (too weak) — see D3 in `specs/057-mvp-launch-gate/spec.md`. On any
  span-carrying failure (`P1:*:SPEC`, `P2:col_mismatch:SPEC`, `P5:*:SPEC`, `P6:*:SPEC`), the
  offending `[zone:SPEC]...[/zone:SPEC]` wrapper is removed but its **inner text is kept** — the
  interactive highlight disappears, the sentence stays readable. The failure codes are logged via
  `console.warn('[annotation gate] stripped failing zone annotation(s)...', failures)` — a
  conditional warn, fired only on an actual failure, deliberately distinct from the unconditional
  debug `console.log`s that used to live inside `validateAnnotation` itself (deleted in T028; see
  "Deleted debug logs" below).
- **P3 policy (span-less failures — disc notation / player names / engine jargon): LOG AND SERVE,
  not stripped.** `checkP3` pushes a bare code (`'P3:disc_notation'`, `'P3:player_name'`,
  `'P3:engine_jargon'`) with no zone spec attached, so there is nothing to strip — a third of the
  failure vocabulary is fundamentally not span-shaped. The text-level floor for this category is
  `stripInternalTokens`'s widened coordinate regex (T026, below) plus the prompt-side instruction
  at `llmCoachHelpers.js:804`; neither is a hard guarantee, so a P3-flagged explanation can still
  reach the player today. This is a deliberate, recorded gap, not an oversight.
- **`allowedSet` IS threaded on the live path since spec 058 (OI-143 closed), so P5Strong runs
  there.** The fresh-generation `POST /api/explain-move-llm` call site builds a real `allowedSet`
  from `buildExplainContext` and passes it straight through:
  `res.json(guardExplainMoveLlmPayload({ explanation, prompt, terms: termsMap, locale, board,
  allowedSet }))` (`index.js:1464-1470`, comment: "allowedSet (spec 058, US3, OI-143): this is the
  ONLY guardExplainMoveLlmPayload call site"). `checkP5Strong` only runs when `allowedSet != null`
  (`annotationGate.js:500`), so of the checks in the table below, **P1, P2, P3, P5, P6, and P5strong**
  all apply to a served, freshly-generated explanation. (The cache-hit and not-a-blunder early
  returns still pass `allowedSet: null` — there is no fresh `buildExplainContext` run on those paths
  to build one from — so P5strong is skipped only there, not on the live path in general.)
- **Deleted debug logs.** `validateAnnotation` (`server/annotationGate.js`) used to
  unconditionally `console.log` its parsed zones and `allowedSet` on every call — which would have
  printed on every served explanation once T028 wired the gate into the request path. Both lines
  are deleted; `server/scripts/corpus_annotation_check.mjs`'s `withSilencedConsole` wrapper (built
  to work around them) is now a no-op for that purpose and left in place, noted as such.
- **Measured latency**: the gate is a synchronous board scan with no I/O (`annotationGate.js`'s own
  header: "No side effects, no DB, no I/O"). Measured 2026-08-04 in-process (Node, warm, 2000
  iterations, a 4-zone explanation string): ~0.0147ms/call with the gate wired in vs. ~0.0009ms/call
  without it — a delta of **~0.014ms per call**, effectively free against the Explanation Engine's
  <2s budget (Constitution V).
- **`guardExplainMovePayload` (`/api/explain-move`, the legacy `composeExplanation` path) is
  deliberately NOT wired to the gate.** That endpoint is dead (see "Which function actually serves
  production deep-reveal" above), and `composeExplanation`'s output never carries `[zone:...]` tags
  in the first place — there is nothing for the gate to validate there.
- **Two rewriters upstream of the guard are still uninstrumented.** `guardExplainMoveLlmPayload`
  accepts `diagnostics: true` and returns `{ failures, strippedSpecs }` (D51), so what
  `stripFailingZoneSpans` removed is now recoverable. `promoteRawCoordinates` and
  `humanizeGroundedCoordinates` are not: the former is a bare `seg.replace(CXRY_RE, …)` with no
  collection, and the latter's only `push` is the zone-tag depth stack, not a record of what it
  rewrote. Measuring what *those two* did to a served answer requires new instrumentation inside
  production text-rewriting code — it is not threadable through the existing return.

### Signature

```js
validateAnnotation(explanation, board, allowedSet = null)
```

The third parameter `allowedSet` is an internal grounding contract array built by `buildExplainContext`, used only by the offline eval scripts today. When provided, an additional check (P5strong) runs.

### Checks

The gate runs up to seven checks:

| Check | Description | Runs on the live `/api/explain-move-llm` path? |
|---|---|---|
| **P1** — spec syntax/bounds | Every `[zone:SPEC]` must be a known format and resolve to ≥1 in-bounds cell. `tg` is always valid. | Yes |
| **P2** — column-reference consistency | For `colN` (and any cell-bearing spec), any explicit column reference in the inner text must match a column the zone actually occupies. | Yes |
| **P3** — forbidden terminology | Explanation must not contain disc notation (`\bR\b`, `\bY\b`), player names (Red/Yellow/Black), or engine jargon (forced win, the solver, forced_win, etc.). | Yes (failures are logged and served, not strippable — no span) |
| **P5** — blocked 4-windows | Each zone must have at least one live 4-window (not blocked by both players) on the actual board. | Yes |
| **P6** — raw coordinates | Zone inner text must not contain raw coordinate strings like `c4r3` or `col5`. **Since D44 the pipeline is rewrite-then-check:** `humanizeGroundedCoordinates` (`reasonRenderGuard.mjs`) runs *before* `validateAnnotation` and rewrites, in place, any coordinate the enclosing zone's own spec covers into localized wording (`serverT(locale, 'cell')` — "column 1, row 3"), so a correct engine-vouched highlight is no longer destroyed by its own prose. A **mismatched** coordinate (one the zone does not cover) is deliberately left raw and still fails here, span and all. | Yes |
| **P5strong** — zone-vs-allowedSet (Epic B) | When `allowedSet` is provided: `tg` always fails; `colN` must match an allowed column; cell-level specs must appear in a CONCRETE-ELIGIBLE entry's `cells` list. ABSTRACT-ONLY entries satisfy `colN` zones but NOT cell-level zones. | **Yes** on fresh-generation (spec 058, OI-143 closed) — `null` only on the cache-hit / not-a-blunder early returns (see above) |

**Backward compatibility**: When the `allowedSet` parameter is `null` or omitted (old callers, and every live call today), P5strong is silently skipped. The Epic A API is fully preserved.

**Historical design notes below (never shipped on the live path — offline-eval-only concepts, superseded on the live path by strip-and-log per D3 above):**

**Retry**: If the first attempt fails validation, the same prompt is sent to the LLM a second time (bypassing cache and quota). If the retry also fails, the fallback path is taken.

**Tier-1 fallback**: On double failure, the server reads the most recent `explanation_cache` row for the same `position_hash` and returns its `deep_reveal_json.fullText`, or the static string `"Detailed explanation unavailable."` if no row exists. The failure is logged to `deep_reveal_failures`. No quota unit is consumed.

**Quota timing (two-phase — gate before compute, decrement after)**: The weekly free-tier quota (5/week; see "Free-tier quota" below) is enforced in **two** steps and both must stay in place:
1. A **read-only gate** (`peekQuota(req.user)`) runs **immediately after the cache-miss, before** the expensive `computeMechanism` LLM call. An over-quota free user gets `429 quota_exceeded` **up front** — without this, the reveal visibly "computes" first and only then 429s. `peekQuota` mirrors the reset logic but performs **no** DB write.
2. The actual **decrement** (`checkAndDecrementQuota`) still runs **after** a valid explanation is confirmed — never before the LLM call, never for fallback/cache-hit/non-blunder responses.
Cache hits (served before the LLM is called) do not consume quota. Note the intended behavioral consequence: an over-quota free user is now paywalled even on a *non-blunder* position (the gate precedes the "not a blunder → no quota consumed" early return). Do not collapse these two phases into a single post-compute check.

**All-or-nothing rejection (offline eval only)**: In `run_eval.mjs`'s usage, if ANY zone fails ANY check, the entire LLM output is rejected (FR-010). On the live path (T028), failures are handled per-annotation (strip-and-log) rather than all-or-nothing.

**Relevant modules**:
- `server/zoneParser.js` — `parseZoneSpecs`, `expandSpec`, `isValidSpec`
- `server/annotationGate.js` — `validateAnnotation`, `checkP1`–`checkP6`, `getWindowsThroughCell`, `isWindowBlocked`
- `server/reasonRenderGuard.mjs` — `guardExplainMoveLlmPayload` (the live wiring point, T028), `stripFailingZoneSpans`
- `server/migrations/031_deep_reveal_failures.sql` — failure log table DDL (offline eval path only; the live strip-and-log path does not write here)

### Deep-reveal text and audio derive from one sanitized string

`GET /api/user/tts/deep-reveal` and `POST /api/explain-move-llm` read the **same**
`explanation_cache` row. Until 2026-08-04 only the HTTP seam ran `stripInternalTokens`
(via `guardExplainMoveLlmPayload`), so the coach *spoke* raw internal coordinates — "c5",
"c1r3" — while the screen rendered "column 5", "column 1".

The audio seam now calls exactly one function, `buildTtsSpeechText(raw, locale)` in
`server/reasonRenderGuard.mjs` — `stripAnnotationsForTTS(stripInternalTokens(raw, locale))`.
**Do not reintroduce a second sanitization path in `server/index.js`.** If a future change needs
different speech text, change `buildTtsSpeechText`, so both surfaces move together.

Two things that follow from this:

- **Order is part of the contract.** `stripInternalTokens` runs first, matching the response seam.
  It skips `[zone:…]` delimiters on purpose: rewriting inside a spec turns
  `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`, which the client's `isValidSpec`
  rejects — the highlight then disappears with no error at any layer.
- **The audio cache key is derived from the text.** `textHash = sha256(cleanText)` →
  `tts/deep-reveal/${textHash}.mp3`, compared against `explanation_cache.audio_path`. Any change
  to what `buildTtsSpeechText` returns invalidates every stored clip; see
  `docs/deployment_steps.md`.

## Deep Reveal Quota

The `/api/explain-move-llm` endpoint enforces a weekly quota for free-tier users.

- **Authentication**: Unauthenticated requests (no valid `Authorization` header) return `401 Unauthorized`. No quota logic is reached.
- **Cap**: 20 Deep Reveals per week for free-tier users (the `FREE_DEEP_REVEAL_WEEKLY_LIMIT` constant, exported from `quotaLimits.js` and imported by both `checkAndDecrementQuota` and `peekQuota` in `index.js`, so the two stay in sync by construction).
- **Reset**: Monday 00:00 UTC. The `deep_reveal_reset_at` column stores the next reset timestamp. A `null` value is treated as "already expired" — the quota resets to next Monday and the request is allowed.
- **Paid-tier**: No quota check; all requests are allowed unconditionally.
- **429 response shape**: `{ error: 'quota_exceeded', resetsAt: <ISO string> }`.
- **Endpoint scope**: Quota is enforced on `/api/explain-move-llm` only. The old `/api/explain-move` endpoint does NOT decrement quota.

## Supabase Two-Client Pattern

**MUST**: `server/index.js` initializes **two** separate supabase client instances from the same service role key:

```js
supabase    = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
authClient  = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
```

- `supabase` — DB operations ONLY: `from()`, `rpc()`. **Never** call `auth.*` on this client.
- `authClient` — auth operations ONLY: `getUser()`, `refreshSession()`, `signInAnonymously()`.

**Why**: supabase-js v2 `auth.getUser(userToken)` stores the user's JWT as the client's active session. If `supabase` is reused for auth calls, subsequent DB inserts run as `authenticated` instead of `service_role`, bypassing BYPASSRLS and triggering RLS 42501 errors. See memory `bug-supabase-js-session-contamination`.

**MUST NOT** add `auth.*` calls on the `supabase` DB client. Both clients are always initialized together — `!supabase` guards are sufficient for both.

## Session Persistence & Silent Refresh (spec 045)

**`REFRESH_TOKEN_MAX_AGE`** (`server/index.js`) is **60 days** (`60 * 24 * 3600_000`), up from 7 days pre-spec-045. `ACCESS_TOKEN_MAX_AGE` is unchanged at 1 hour. All 4 cookie-set sites (`POST /api/auth/callback`, `POST /api/auth/refresh`, `GET /api/auth/session`, `POST /api/auth/anonymous`) read the same module-level constant — never hardcode a duplicate literal.

**`server/authRefresh.js`** exports `createAttemptRefresh({ authClient })`, a factory that binds a testable `attemptRefresh(refreshToken) → Promise<{accessToken, refreshToken} | null>`:
- Calls `authClient.auth.refreshSession({ refresh_token })`; returns `null` on any failure (invalid/expired/revoked token, or thrown error) — the caller decides the HTTP response (typically 401 + clear both cookies).
- `index.js` constructs one shared instance (`const attemptRefresh = createAttemptRefresh({ authClient })`) and both `POST /api/auth/refresh` and `GET /api/auth/session` import/call it.

**`POST /api/auth/refresh` and `GET /api/auth/session` deliberately stay inline in `index.js`.** There is **no `authRoutes.js` module** — unlike the `registerUserRoutes`/`registerPaddleRoutes` extraction pattern (see below), spec 045's plan.md reconciled this explicitly: only `attemptRefresh` (the exchange logic) was extracted to `authRefresh.js`; the two route handlers that call it were left in place in `index.js` alongside the other `/api/auth/*` routes (`callback`, `signout`, `anonymous`). Do not extract these two routes into a new module without re-reading that reconciliation note in `specs/045-account-session-checkout/plan.md`.

**No de-dup Map — documented absence, not a gap.** `specs/045-account-session-checkout/research.md` (R1, 2026-07-11) empirically confirmed this project's Supabase/GoTrue instance does **not** enforce refresh-token rotation-with-reuse-detection: a refresh token that has already been exchanged for a newer one still works, and concurrent calls presenting the same refresh token both succeed independently rather than racing/conflicting. Because of this, `attemptRefresh` has **no** single-flight coordination (no Map keyed by refresh token, no in-flight promise cache) — the original contract draft (`contracts/api-auth-session.md`) called for one, but it was intentionally not built once the empirical finding came back. Coverage is 2 concurrency regression tests instead (`authRefresh.test.mjs`). **Caveat**: this was only tested against anonymous sessions — do not assume it generalizes to every auth provider config without re-verifying. If a future GoTrue upgrade or config change turns out to enforce rotation-with-reuse-detection, a de-dup Map would then become necessary — do not silently "re-add" one without first re-confirming the current behavior has actually changed.

`GET /api/auth/session` falls through to `attemptRefresh` before returning 401 (silent refresh) — see api-conventions.md for the exact processing order. Response shape is unchanged: `{ user: { id, tier } }`.

**FR-007 (in-flight sign-in guard)**: no client-side guard was needed. The OAuth hash-callback branch of `ProfileStore.checkSession` returns early after `POST /api/auth/callback` succeeds, before `GET /api/auth/session` is ever called — the two code paths are mutually exclusive by control flow, not by an added coordination check.

## PaymentProcessor Seam (spec 045, migrated to Paddle by spec 050)

`server/paymentProcessor.js`, `server/paddleProcessor.js`, and `server/paddleRoutes.js` extract the payment-provider integration into a swappable interface, mirroring the `registerUserRoutes(app, supabase)` pattern below:

- **`paymentProcessor.js`** — interface-only module: the `PaymentProcessor` JSDoc typedef (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`), the `PaymentConfigError` class (carries `.status` so route code needn't know processor specifics), the pure `getSubscriptionStatus({ tier, customerId })` function, and a generic `createPaymentProcessor({ createCheckout, handleWebhook, getSubscriptionStatus })` assembly helper.
- **`paddleProcessor.js`** — `createPaddleProcessor({ paddleClient, supabase, monthlyPriceId, annualPriceId, webhookSecret })` implements the interface against the real Paddle Node SDK (`@paddle/paddle-node-sdk`). Also exposes methods beyond the 3-method interface (on the same object for convenience): `createPortalSession` (used by `/api/paddle/portal`), `getPrices()` (retrieves the two configured Paddle price objects via `paddleClient.prices.get(priceId)` → `{ monthly, annual }` display info for `GET /api/paddle/config`; returns `null` for a plan whose price id is unset), and `verifyTransaction({ transactionId, userId })` (the synchronous activation fallback — see "Activation: webhook primary + verify-transaction fallback" below). `createCheckout({ userId, email, plan, returnPath })` sanitizes `returnPath` via the exported `sanitizeReturnPath` (same-origin relative only, else `/`) and returns `{ priceId, customerEmail, successUrl }` — there is no server-built hosted-checkout URL in the Paddle.js overlay model; the client opens the overlay itself, passing these values through verbatim — see api-conventions.md.
- **`paddleRoutes.js`** — `registerPaddleRoutes(app, paymentProcessor)` registers `GET /api/paddle/config`, `POST /api/paddle/create-checkout`, `POST /api/paddle/verify-transaction`, `POST /api/paddle/webhook`, and `POST /api/paddle/portal`. `index.js` constructs `paymentProcessor` once at boot (`PADDLE_API_KEY` present → `createPaddleProcessor(...)`, else `null`) and calls `registerPaddleRoutes(app, paymentProcessor)` once, exactly as it calls `registerUserRoutes(app, supabase)`. Every route 503s ("Payments not configured") when `paymentProcessor` is null — so an unset `PADDLE_API_KEY` on a deploy makes the whole `/api/paddle/*` surface 503, not just checkout.

**Why this seam matters (substitutability)**: because `registerPaddleRoutes` takes `paymentProcessor` as a plain argument rather than closing over a module-scope Paddle-client singleton, a test can call it against a fresh Express app with any object satisfying the `PaymentProcessor` shape and assert route behavior with zero production code changes. See `specs/045-account-session-checkout/contracts/payment-processor-interface.md` and `specs/050-paddle-checkout-migration/contracts/paddle-api.md`.

**Sandbox vs. live environment is derived from the `PADDLE_API_KEY` prefix, not `NODE_ENV`.** `index.js`'s
`paddleClient` construction does `process.env.PADDLE_API_KEY.includes('_sdbx_') ? Environment.sandbox :
Environment.production` (and the frontend's `useUpgradeCheckout.js` mirrors this off
`VITE_PADDLE_CLIENT_TOKEN.startsWith('test_')`). This was previously `NODE_ENV === 'production'`
server-side and `import.meta.env.MODE === 'production'` client-side — both **always** evaluated true in
this project's actual deploys (Railway sets `NODE_ENV=production` on every service including staging; a
plain `vite build` with no `--mode` flag always defaults `MODE` to `'production'` regardless of deploy
target), so a sandbox key/token on staging was silently paired with `Environment.production`, producing a
403 (`forbidden` — "using a sandbox credential against the live API returns forbidden", per Paddle's own
docs) that looked identical to a permissions problem. Deriving from the credential's own prefix instead
means the environment flag can never disagree with the key/token actually in use — there is no second
setting to keep in sync. If a future change ever needs a real staging-vs-production distinction for
something Paddle-unrelated, do not reach for `NODE_ENV` in this codebase — it is not a reliable signal.

**`getSubscriptionStatus` is superseded for production entitlement decisions.** Spec 053 introduced
`server/entitlement.js` (`entitlementForRequest(req)`, the sole production entry point for "is this account
paid") as the one authoritative computation every server- and client-side decision point now sources — see
`docs/architecture/api-conventions.md`'s `GET /api/user/entitlement` section. `getSubscriptionStatus` itself
is still exercised by `paymentProcessor.test.mjs` and the `PaymentProcessor` substitutability tests below —
**do not delete those tests or the function itself**; its role there (proving the `PaymentProcessor`
interface's substitutability) is unaffected by the supersession (FR-015).

### Tier mirror: `payment_events` ledger + tier-mapping table

`paddleProcessor.js`'s `handleWebhook` makes `users.tier` a **live derivation of the Paddle subscription's current status**, not a value set once at purchase:
- `transaction.completed` → `tier: 'paid'` + `paddle_customer_id` write + `tracks` insert (`event: 'upgrade_completed'`), exclusively this event's job — subject to the OI-55 identity cross-check below.
- `subscription.created` → documented no-op (ledger insert only) — the first-payment tier grant belongs exclusively to `transaction.completed`; granting tier here would race with, or duplicate, that write.
- `subscription.updated` with status `active` or `trialing` (no scheduled cancel) → `tier: 'paid'`.
- `subscription.updated` with status `past_due` → **no write** (Paddle's automatic retry window; a single transient card decline must not downgrade a paying user).
- `subscription.updated` with status `paused` → `tier: 'free'`.
- `subscription.updated` with status `active` **and** a non-null `scheduled_change.action: 'cancel'` → no write (service continues until the effective date — not yet terminal).
- `subscription.canceled` (or `subscription.updated` with status `canceled`) → `tier: 'free'` unconditionally (terminal).

**Webhook idempotency (FR-008)**: before any tier write, `handleWebhook` inserts into `payment_events` (`event_id` UNIQUE, `event_type`, `payload`) and checks the result — a `23505` unique-violation means the event was already processed, so the handler returns `{ handled: false, eventType: 'duplicate' }` and skips the tier write and `tracks` insert entirely. This mirrors `insertGameBlunder`'s `23505`-as-success dedup pattern (see Game Blunder Writes above). Unlike a log-and-proceed policy, a NON-`23505` ledger-insert failure, or any downstream tier/`tracks` write failure, THROWS (FR-009) — surfaced by the route as non-2xx so Paddle retries; never weaken this back to fire-and-forget. On any such downstream failure, `handleWebhook` also **deletes the just-inserted `payment_events` row** before rethrowing — otherwise a redelivery would hit the `23505` dedup check and short-circuit forever, permanently stranding whatever effect failed (a lost tier flip or a lost `tracks` row) even though the event was never actually applied.

**Every `users.tier` write in this file goes through one shared helper, `writeTier({ userId, customerId, tier, setPaddleCustomerId })`** (in `paddleProcessor.js`) — `verifyTransaction` and all five `handleWebhook` tier-mapping branches call it rather than hand-rolling `supabase.from('users').update(...)` each time. This exists specifically so the two independent activation paths (sync fallback vs. async webhook) can't drift out of sync — a fix to the write pattern applied to one call site is applied to all six by construction.

### Identity binding on `transaction.completed` (OI-55)

`customData.app_user_id` is plain client-supplied Paddle checkout metadata — `src/lib/useUpgradeCheckout.js` sets it from client-side React store state when opening the Paddle.js overlay, and Paddle echoes it back verbatim on the webhook with **no server-side re-validation of its own**. Taken alone, that means a user could edit `customData.app_user_id` via devtools before opening the overlay and have a real payment grant `tier: 'paid'` to an arbitrary account.

**Resolved trust model (2026-07-18; ratified 2026-07-31 — see below)**: `handleWebhook`'s `transaction.completed` branch cross-checks `data.customerId` against the target user's **already-established** `users.paddle_customer_id`, read via a `supabase.from('users').select('paddle_customer_id').eq('id', userId).maybeSingle()` lookup immediately before the tier write:
- **No `paddle_customer_id` on file yet** (this is the userId's first-ever payment) → trusted as before. There is nothing to cross-check a first payment against — this is the one window OI-55 does **not** close (see below).
- **An established `paddle_customer_id` exists and matches** `data.customerId` (the normal renewal/upgrade case) → tier write proceeds as before.
- **An established `paddle_customer_id` exists and does NOT match** `data.customerId` → the tier write and `tracks` insert are both **skipped**; `logError` records the mismatch (`userId`, `establishedCustomerId`, `claimedCustomerId`, `eventId`); the function returns `{ handled: true, eventType: 'transaction.completed', securityRejected: true }` (an extra key beyond the normal `{ handled, eventType }` shape, present only on this path) rather than throwing — a mismatch is a security rejection, not an infra failure, so Paddle is not asked to retry a request that will keep failing the same way. The `payment_events` ledger insert still lands either way, so redelivery of the *same* event is still deduped by the `23505` guard.
- A DB failure *during the lookup itself* (not a mismatch — the read genuinely erroring) still throws, consistent with FR-009: that is an infra failure, not a security verdict, so Paddle should retry.

**Residual gap, called out explicitly, not fixed**: this closes the forgery window for every `transaction.completed` **after** a user's first payment, but a user's very first payment still has no established `paddle_customer_id` to check against, so a forged `customData.app_user_id` on a **first** payment for the *target* account is still possible in principle (the practical incentive remains unclear — the attacker spends real money to upgrade someone else's account, not their own). Closing that fully would require a different binding mechanism (e.g. minting a Paddle-side `customer_id` server-side at checkout-creation time and looking it up on the webhook, rather than trusting anything client-supplied) — a larger change than this hardening pass, deliberately out of scope here.

**Ratified 2026-07-31 (spec 053, Epic — Entitlement & Payments Consolidation, US3)**: the app owner has reviewed the harden-direction trust model above and explicitly accepted its residual risk as adequate for this product's risk profile. This is now settled policy, not an open question — the two accepted residual risks, named explicitly, are: **an attacker granting paid access to an account they don't control (at their own financial expense)**, and **laundering a chargeback-prone payment onto a third party's account**. The rationale for accepting both: exploiting either costs the attacker real money to benefit an account that isn't theirs, which is a weak incentive in practice. No code change accompanies this ratification — the identity cross-check above is unchanged (FR-017); this paragraph only closes out the "unreviewed judgment call" status the section previously carried (OI-55, closed).

### Activation: webhook primary + `verify-transaction` fallback

Tier activation after a successful checkout has **two independent paths that converge on the same state**:

1. **Primary — the webhook** (`transaction.completed`, above). In production a registered notification destination delivers it (see `staging_checks.md`'s Epic 10 section for the still-pending real-deployment verification); in local dev, use the `paddle:sandbox-testing` skill's webhook simulator or a locally-HMAC-signed synthetic payload posted directly at the dev server (OI-54: the sandbox account has no public tunnel configured, which also blocks the dashboard simulator from reaching localhost). If nothing delivers the event, the tier never flips and the client is left on the "still activating" banner — even though Paddle charged the card.
2. **Fallback — `verifyTransaction`** (`POST /api/paddle/verify-transaction`). The client reads `transaction_id` off the Paddle.js `checkout.completed` event (no return-URL round-trip — the overlay never navigates away) and posts it here; the processor retrieves the transaction from Paddle (source of truth). **If the transaction's `status` isn't yet `'completed'`, it waits ~1.2s and re-fetches once** before proceeding — confirmed live (2026-07-18) that an immediate, zero-delay check reproducibly saw a transaction still short of `completed` right after the client-side `checkout.completed` event fired (Paddle's own docs, `build/checkout/upsell-checkout`, note this settle time as "typically less than a second"); this one bounded retry, not an open-ended poll, covers that window. It then verifies `customData?.app_user_id === userId` and `status === 'completed'`, and applies the **same** `tier: 'paid'` + `paddle_customer_id` write. This is a plain idempotent write (not guarded by the `payment_events` ledger — it has no event id), so it is safe to run alongside the webhook: whichever lands first wins, the other is a no-op. **It also writes the same `upgrade_completed` `tracks` row the webhook writes (OI-34, spec 053 US3, 2026-08-01)** — historically it did not (the analytics record was documented as "exclusively the webhook's to write"), which left the fallback-only-activation edge case (webhook never delivered) analytics-undercounted even though the user was correctly tiered. `recordUpgradeCompletedTrack` (`paddleProcessor.js`) dedupes this per transaction by reusing `payment_events`' existing `UNIQUE(event_id)` constraint — no new table: it inserts a synthetic, transaction-id-derived `event_id` (`upgrade_completed_track:<transactionId>`) as a claim immediately before the `tracks` insert; a `23505` on that claim means the other path (whichever ran first) already wrote the analytics row, so this call is a no-op. Both `verifyTransaction` and `handleWebhook`'s `transaction.completed` branch call this same helper, so exactly one `tracks` row is written per transaction regardless of arrival order. A failure in `verifyTransaction`'s call is caught and logged, never rethrown (Constitution Principle V — must not block/break the client's activation result); a failure in `handleWebhook`'s call still throws, preserving that branch's existing FR-009 durability behavior.

`useUpgradeCheckout.js`'s `checkout.completed` event handler is the **sole caller** of the fallback anywhere in the frontend — it owns `transactionId` and dispatches the resulting `confirming`/`activated`/`failed` state into `checkoutReturnFlow.js`'s shared store; `CheckoutReturnBanner.jsx` only renders that state and never calls the endpoint itself. The same handler also calls `paddle.Checkout.close()` once the fallback resolves (success or failure) — `Paddle.Checkout.open()` is never given a `settings.successUrl`, because passing one makes Paddle.js navigate the parent window there on completion (a real full-page reload, confirmed live 2026-07-18), which both breaks the "never leaves the app" requirement and can race with this very fetch.

### Webhook raw-body middleware ordering

`app.use('/api/paddle/webhook', express.raw({ type: 'application/json' }))` is mounted in `index.js` **before** the global `app.use(express.json())`. This is load-bearing: Paddle signature verification (`paddleClient.webhooks.unmarshal`, keyed on the `Paddle-Signature` header) needs the exact raw request bytes. If the global JSON parser ran first, it would consume and re-serialize the body, and signature verification would fail. Never reorder these two `app.use()` calls, and never add a new global body-parsing middleware ahead of the webhook route's raw parser.

### `loadUser` — `paddle_customer_id` allowlist (R3, renamed by migration 060)

`loadUser` selects `paddle_customer_id` on all three of its code paths (existing row, freshly-inserted row, anonymous-fallback default), via a single shared source of truth in `server/userHelpers.js`:
- `USER_PROFILE_SELECT_COLUMNS` — the `.select()` column list string: `'tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, paddle_customer_id, onboarding_status'`.
- `defaultUserProfile()` — the default object `loadUser` attaches to `req.user` when no `users` row exists yet; field set mirrors `USER_PROFILE_SELECT_COLUMNS` (`paddle_customer_id: null`).

These two allowlists are a trap: any future addition to the `users` profile columns `loadUser` needs must extend `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` together, not one in isolation — PostgREST silently drops unknown columns from an `UPDATE`, so a column present in one but not the other fails silently rather than erroring (see memory `project_user_column_propagation.md`). Before this column existed (as `stripe_customer_id`), `req.user.stripe_customer_id` was always `undefined`, which broke the customer-portal endpoint and made `getSubscriptionStatus`'s customer-id argument meaningless — the same class of bug this allowlist pairing guards against.

## Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server DB access |
| `ANTHROPIC_API_KEY` | LLM annotation (optional; falls back to template text) |
| `PADDLE_API_KEY` | Paddle API (optional; sandbox keys contain `_sdbx`) |
| `PADDLE_MONTHLY_PRICE_ID` / `PADDLE_ANNUAL_PRICE_ID` | Paddle price IDs |
| `PADDLE_NOTIFICATION_WEBHOOK_SECRET` | Paddle webhook (`Paddle-Signature`) verification |
| `VITE_PADDLE_CLIENT_TOKEN` | Frontend Paddle.js client-side token (sandbox tokens are `test_`-prefixed) |
| `OPENAI_API_KEY` | OpenAI API key for LLM coaching endpoints (optional; affected endpoints return 503 if absent) |
| `OPENAI_MODEL` | **Mini** production model (e.g. `gpt-5.4-mini`). Used by ALL production LLM endpoints, including `/api/explain-move-llm` (via `computeMechanism`) and `llmCoachHelpers.callLLM`. Required alongside `OPENAI_API_KEY`. |
| `EXPLAIN_MODEL` | **Full** model (e.g. `gpt-5.4`). Eval-only — read solely by the offline eval CLI `scripts/compute.mjs --llm`. NOT used by any production endpoint despite the name. |
| `SENTRY_DSN` | Error tracking (optional) |
| `FRONTEND_URL` | Used to build the Paddle checkout's `successUrl` (default: `http://localhost:5173`; self-derived from `worktree-ports.sh` when unset inside a git worktree — see `docs/architecture/worktree-conventions.md`) |
| `PORT` | Server port (default: 3001; self-derived from `worktree-ports.sh` when unset inside a git worktree — see `docs/architecture/worktree-conventions.md`) |

All external clients (`supabase`, `anthropic`, the Paddle Node SDK) are initialized conditionally — the server starts and serves requests even when these are absent, returning 503 for affected endpoints.

## SPA Catch-all Route

The server hosts the built SPA (`dist/`) and serves `dist/index.html` for all non-API paths via a catch-all route.

**Registration order** (enforced by Express route order):
1. All `/api/*` routes
2. `app.use(express.static(join(__dirname, '../dist')))` — serves JS/CSS/asset files
3. Catch-all for HTML — registered last

**Express 5 wildcard syntax**: Use `app.get('/{*path}', handler)` — bare `app.get('*', ...)` throws `PathError` at startup in Express 5 (path-to-regexp no longer accepts unparameterized `*`).

**`dist/index.html` caching**: Read once at startup into a module-level `let indexHtml`. If the file is absent (e.g., pre-build), log a warning and return 500 from the catch-all. Never read or write it per-request.

**OG injection**: For `/game/:id` paths, inject `<meta property="og:title">` and `<meta property="og:description">` before `</head>` using a local `patched` variable. Never mutate the cached `indexHtml` string.

**`/blunder/:id` OG + noindex injection**: The blunder permalink is unlisted-but-public (see `api-conventions.md` → `GET /api/blunders/:id`), so the catch-all both advertises it for sharing and keeps it out of search indexes:

- When the id is a valid UUID (`UUID_REGEX`) and the blunder row exists, inject `<meta property="og:title" content="Connect Four blunder — <human category>">`, an `og:description`, **and** `<meta name="robots" content="noindex, nofollow">`. The human category comes from a small `CATEGORY_LABELS` map with a `snake_case → Title Case` fallback.
- The `noindex, nofollow` robots tag is injected for **every** `/blunder/*` request — including malformed/non-UUID ids, 404s (no matching row), DB errors, and when Supabase is unconfigured. A blunder page must never be indexable, even on the fall-through paths.

## `/pricing` vs `/pricing-legal` (spec 053 US4, FR-023/FR-024/FR-025)

`/pricing` used to be a named static route (`app.get('/pricing', (_, res) => res.sendFile(...pricing.html))`)
registered ahead of the SPA catch-all above. Spec 053 US4 took that address over for an in-app, designed
React screen (`src/screens/PricingScreen.jsx`, `SCREENS.pricing` in `src/lib/screenRegistry.jsx`) with live
prices/quota (FR-020) — but the byte-stable static `pricing.html` still exists and is still needed
(merchant-of-record clause, refund statement, `/terms` link — FR-023), so it could not simply be deleted.

**The mechanism is registration order, not two competing handlers for the same path.** The old `/pricing`
static route registration was **renamed** to `/pricing-legal`, with an identical handler body (same
`pricing.html`, same `LEGAL_PAGE_OPTS`):

```js
app.get('/pricing-legal', (_, res) => res.sendFile(join(__dirname, 'pricing.html'), LEGAL_PAGE_OPTS));
```

There is now **no** explicit server-side registration for `/pricing` at all. Because Express dispatches to
whichever handler is registered first at a matching path, and the SPA catch-all (`app.get('/{*path}', ...)`,
registered last — see "SPA Catch-all Route" above) is the only registration left that matches `/pricing`,
that path now falls through to it and serves `dist/index.html`. The React app's own client-side router
(`src/lib/urlMapping.js`'s `URL_MAP`, `src/lib/screenRegistry.jsx`'s `SCREENS`) then takes over and renders
`PricingScreen` for that URL — no further server change was needed once those two client-side registries
gained a `pricing` entry (`docs/architecture/frontend-conventions.md` §Screen Navigation).

**`server/pricing.html` itself is byte-stable — never edited by this change.** Its content, including the
merchant-of-record clause, the 14-day refund statement, and its own `/terms` link, is unchanged; only which
URL routes to it changed. `privacy.html`, `terms.html`, and `refunds.html`'s own `<a href="/pricing">` links
were each re-pointed to `<a href="/pricing-legal">` so a reader following "Pricing" from any of those pages
still lands on the legal page, not the redesigned one (FR-025 — the old page's content "remains reachable...
linked from the app").

**Why this matters for anyone re-registering a route at `/pricing` in the future**: adding a second
`app.get('/pricing', ...)` handler (even meaning to special-case something) would race the SPA takeover
depending on where it's inserted relative to the catch-all, and would silently break either the designed
page (if registered ahead of the catch-all, it wins and the React screen becomes unreachable) or do nothing
(if registered after, since the catch-all already claimed it). The correct place for anything `/pricing`
needs to do server-side is `GET /api/*` (see `GET /api/limits`, `docs/architecture/api-conventions.md`
§Public Config/Limits), not a new page route.

---

## Route Module Organization

**`server/userRoutes.js`** (spec 030): The 15 `/api/user/*` endpoints are extracted into `registerUserRoutes(app, supabase)` — the first route module extracted from `index.js`. This pattern enables endpoint tests to create a clean Express app with a mock supabase client and test HTTP handler logic without the real DB.

**Registration**: `index.js` imports `registerUserRoutes` and calls it once after `app.use(loadUser)`:
```js
import { registerUserRoutes } from './userRoutes.js';
// ... after app.use(loadUser):
registerUserRoutes(app, supabase);
```

**`server/userHelpers.js`** (spec 030): Five per-table write helpers (`writeSessionStats`, `writeLessonProgress`, `writePuzzleAttempts`, `writeSparringRecord`, `writeStreak`) used by both the individual POST endpoints and the migrate endpoint — single write path per table. All return `{ error: string }` on failure, `undefined` on success. Unit-tested independently with `node --test` against stub supabase objects.

**MUST**: When adding a new `/api/user/*` endpoint that writes to one of the 5 covered tables, call the existing helper rather than reimplementing the write inline.

**MUST**: New route groups with >=5 related endpoints SHOULD follow the `register<Feature>Routes(app, supabase)` extraction pattern rather than inlining in `index.js`. The module should be testable without the real DB or solver.

## In-Memory Job Map Pattern (spec 038)

The papergames import endpoints (`POST /api/user/papergames/import` and `GET /api/user/papergames/import/status`) use a **module-level `Map`** for job state:

```js
// Module-level in userRoutes.js — persists for process lifetime
const jobMap = new Map();
```

**Key**: `jobId` (UUID string, generated via `crypto.randomUUID()`).
**Value**: `{ jobId, userId, status, imported, skipped, blunderErrors, capReached, error }` where `status` is one of `pending | running | done | error`. `blunderErrors` counts the number of blunder rows that failed to write (non-dedup errors from `insertGameBlunder`); exposed in the status response so the frontend can warn the user.

**Lifecycle**:
1. **Created** when `POST` spawns a new job (C2d) — status `pending`.
2. **Updated to `running`** immediately before `importForUser` is called in the async path.
3. **Updated to `done` or `error`** when `importForUser` resolves or rejects.
4. **Never deleted** — entries accumulate in the Map for the server process lifetime.

**Persistence**: None. Jobs exist ONLY in memory. A server restart clears all entries, and any in-flight import is lost without recovery. The `last_import_at` timestamp on the `users` table provides a partial recovery mechanism — on next import, the incremental stop (`room.createdAt < lastImportAt`) prevents re-processing already-imported games.

**Concurrency**: The one-in-flight guard (C2c) iterates all Map values looking for an entry with the same `userId` and status `pending` or `running`. This prevents concurrent imports for the same user. The Map is not locked — concurrent modifications are possible in theory but practically impossible because:
- A user cannot issue two `POST` requests before the first returns (single-threaded browser)
- The async path uses `Promise.resolve().then(...)`, not a separate thread

**Ownership verification**: The `GET /api/user/papergames/import/status` handler checks `job.userId !== req.user.id` and returns 404 (not 403) — a privacy-preserving pattern that prevents attackers from probing whether a given jobId exists.

---

## Lesson Loader

`server/lessonLoader.js` is the canonical module for loading lesson content from JSON files at server startup.

**Startup loading pattern**: `fs.readdirSync` + `JSON.parse(fs.readFileSync(..., 'utf8'))` — synchronous, runs once at startup. Results are cached in a module-level array. No I/O occurs at request time.

**In-memory cache**: `getLessons()` and `getLesson(id)` return from the in-memory cache only — no filesystem reads on request.

**Validation and exclusion**: Each file is validated for required fields (`id`, `title`, `free`, `userPerspective`, `slides`, `socratic`, `confirmationCategory`, `confirmationCount`) and `boardSpec` array length (must be 7). Files failing validation are logged via `console.error` and excluded. The server never crashes due to a malformed lesson file.

**`order` derivation**: Extracted from the filename numeric prefix (e.g., `lesson-05-claimeven.json` → `order: 5`). Lessons are sorted ascending by `order` before caching.

**Directory**: `connect-four/lessons/`. Ships empty in Epic 4; content added in Epic 5.

**The cache is boot-once and nothing watches the directory.** `reloadLessons()` is called only from inside the admin create/update/delete/generate-audio handlers. Any out-of-band edit to `lessons/*.json` while a server is running (migration script, hand edit, branch switch) leaves the cache stale — and because those handlers read the cache and then `saveLessonFile` it back, **the next admin write silently overwrites your disk edits with the pre-edit object**. Restart the server after editing lesson files on disk, before touching any admin lesson endpoint.

**`saveLessonFile` is the single write seam, and it STAMPS derived fields.** Every admin write path — `POST /api/admin/lessons`, `PUT /api/admin/lessons/:id`, `generate-audio` — and the maintenance script `scripts/backfill-window-counts.mjs` all funnel through `saveLessonFile(dir, lesson, oldId)` in `server/lessonAdmin.js`. It is therefore the correct home for anything that must be **derived, never authored**: put the recompute here and no caller can forget it.

It currently stamps `slides[].windowCounts` (recomputed from each slide's `movestring` for every slide with `showWindowCounts === true`, stripped from all others — see `lesson-editor.md` §"Window counts") and appends a trailing newline. Two consequences worth knowing:

- **A round-trip is idempotent and refreshes the cache.** `PUT`ting a lesson file's own current content returns 200, runs `reloadLessons()`, and leaves the file byte-identical — a clean way to pick up disk edits without restarting the server. This only holds if the file is already in canonical form; a file with stale or absent derived fields *will* change.
- **A no-arg maintenance script that re-saves every lesson rewrites every lesson file.** Adding a stamped field or a formatting change to `saveLessonFile` therefore shows up as a diff across the whole `lessons/` directory the next time such a script runs, not just on the files you meant to touch.

**Raw vs. localized reads — do not conflate.** `getLessonsAll()` returns the **raw** cached objects, `_es` fields intact. `getLesson(id, locale)` applies `localizeLesson`, which **strips every `_es` key**. Admin write paths (`GET/POST /api/admin/lessons/:id`, `generate-audio`) must use `getLessonsAll()`: `getLesson()` would both starve `generateLessonAudio(lang:'es')` of `text_es` and destroy every translation on save.

### `socratic.messages` — Socratic coach copy is lesson content

`lesson.socratic.messages` is a **phase→array map** (`ask`, `wrong1`, `wrong2`, `correct`, `hint`); each array holds objects with the *same* shape as `slides[].coachMessages` — `text` / `text_es` / `audio` / `audio_es` / `mood`. This copy used to live in i18n under a top-level `socratic.*` namespace; it was moved here deliberately, and those i18n keys were deleted. **Lesson content is a thing in itself and must not be assembled from i18n keys** — do not reintroduce `socratic.*` or `lesson.<id>.socratic.*`. `socratic` itself may be `null` (a lesson with no Socratic board), so 12 of the 13 lessons carry `messages`. `validateLesson` checks the shape but stays permissive about absent phases: an invalid file is `console.error`'d and **excluded**, so an over-strict rule silently removes a lesson from the app rather than failing loudly.

**`localizeLesson` must never mutate its input.** `stripEsKeys` is **shallow**, so `stripEsKeys(lesson.socratic).messages` is the *same reference* as the raw cache entry's. Assigning into it (`s.messages[phase] = …`) deletes `text_es` from the module cache for every later request, which then starves the Spanish generator and persists the loss to disk on the next save. Rebuild nested containers into fresh objects instead. `tests/unit/lessonLoader.test.js` pins this with a non-mutation test; a "no `_es` survives in the response" assertion **cannot** catch it, because the corrupted case satisfies it too.

---

## Migration Runner (`migrate.js`)

`server/migrate.js` is the database migration runner. It reads `.sql` files from `server/migrations/`, compares against a `schema_migrations` ledger table, and applies pending migrations inside transactions. It runs as the first step of the Railway start command (`node server/migrate.js && node server/index.js`); a non-zero exit blocks the server from starting.

### When migrations apply relative to the code deploy — and what that forbids

**Every Railway deploy applies all pending migrations automatically, at container start, before the new server process boots — and while the previous instance is still serving traffic.** Two consequences that are properties of the system, not of any one migration:

- **A migration cannot run "after" its own code deploy.** A `.sql` file present on the deployed branch is applied at the *beginning* of that deploy. Hand-running `migrate.js` afterwards does not change the ordering: if the file is on the branch the deploy already applied it; if it is not, the hand-run desynchronises the branch from the schema and the next deploy re-attempts it.
- **A migration that removes or narrows something the outgoing code still reads is unsafe in a single deploy.** `DROP COLUMN`, `DROP TABLE`, a narrowed `CHECK`/`NOT NULL`, and column renames all fall here. During rollover the old instance queries the new schema; because PostgREST **errors** on a selected column that does not exist rather than omitting it, a single `.select('… <column> …')` string in the outgoing code turns those endpoints into hard failures for the length of the rollover. Worse, if the new build then fails to boot, the environment is left on old code against a schema it cannot query.

  Such a migration must be **split across two deploys**: ship the code with the migration file held off the branch, verify the new instance is healthy, then restore the file in a second deploy. The executable procedure is `docs/deploy-runbook.md` §1a; it was used for `064_drop_correct_col.sql` on staging on 2026-08-04.

**Migrations that only widen or add are safe in one deploy**, including a *narrowing* one whose new values only the incoming code writes — `migrate.js` completes before `index.js` starts, so the new code never runs against the old constraint (this is why `063_puzzle_attempts_outcome_narrow.sql` needed no split). The residual exposure is only what the *outgoing* instance writes during rollover.

**`ADD COLUMN` does not populate.** A migration that adds a column leaves every existing row NULL, so if the deploying code reads that column as its sole source of truth, the deploy is a live functional break on all pre-existing rows until a backfill runs. The backfill is a separate, separately-queued step — see `docs/deployment_steps.md`.

### DATABASE_URL requirement

`DATABASE_URL` **MUST** use the Supabase **session-mode pooler** (port **5432**) with `sslmode=no-verify` appended to the connection string. The connection is still SSL-encrypted; `no-verify` skips certificate chain validation which is necessary because Supabase's pooler uses self-signed certificates. (`sslmode=require` triggers strict certificate verification in the `pg` driver v8.21+, which fails against Supabase poolers.)

The **transaction-mode pooler** (port **6543**) is **not the supported configuration** — converge on 5432. Two corrections to the previous wording here, both measured 2026-08-02:

- The old rationale ("each statement may execute on a different backend connection") describes pgBouncer **statement** mode. In **transaction** mode a backend connection is pinned for the duration of an explicit `BEGIN…COMMIT`, which is exactly what `migrate.js` issues (`server/migrate.js`, the `BEGIN` / `query(sql)` / `INSERT INTO schema_migrations` / `COMMIT` sequence) — so multi-statement DDL transactions do work through 6543.
- Empirically they have: **staging's `DATABASE_URL` is on 6543 and its `schema_migrations` ledger shows five migrations applied through it**, most recently `061_security_lints.sql` on 2026-07-30.

`pg_dump` genuinely does not work over 6543. Treat a 6543 `DATABASE_URL` as **configuration drift to fix on its own schedule, not as a broken deploy** — and never report it as a deploy blocker without checking that environment's ledger first. Tracked for staging as OI-31.

Example correct format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=no-verify
```

### The ledger tracks FILENAMES, and can diverge from what is on disk

`migrate.js` compares `server/migrations/*.sql` against `schema_migrations.filename` — by **name, not by number**. Two consequences, both live as of 2026-08-02:

- **Numbers can collide across environments.** Staging and production both record `061_security_lints.sql` as applied, but that file is not in `server/migrations/`; the on-disk 061 is `061_correct_cols.sql`, which neither environment has. Both are "061".
- **The highest applied number does not mean "up to date through N".** An environment can be missing a lower-numbered on-disk migration while showing a higher number applied. Diff the ledger against `ls server/migrations/` per environment before a deploy — do not compare counts or maxima.

```sql
SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;
```

### schema_migrations ledger table

Self-bootstrapped by `migrate.js` as its first database action:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
```

- `filename` is the `.sql` basename (e.g., `001_initial.sql`), not a full path.
- `PRIMARY KEY` on filename enforces uniqueness; `ON CONFLICT DO NOTHING` in baseline mode is safe.
- No foreign keys, no RLS — this is a server-managed operational table, not a user-data table.

### Normal mode (default)

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. Reads all `filename` values from `schema_migrations`.
4. Computes `pending = disk_files − ledger_set`.
5. For each pending file in alphabetical order:
   - Acquires a client from the pool
   - `BEGIN` transaction
   - Executes the file's SQL
   - `INSERT` filename into `schema_migrations`
   - `COMMIT`
   - On any error: `ROLLBACK`, prints error identifying the failing file to stderr, exits 1
6. Prints summary, exits 0.

### Baseline mode (`--baseline`)

Invoked as `node server/migrate.js --baseline`. Records all `.sql` filenames present on disk without executing any SQL from those files.

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. For each filename: `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`.
4. Prints count of rows recorded, exits 0.

**Idempotency**: `ON CONFLICT DO NOTHING` makes repeated `--baseline` runs safe. After `--baseline`, a normal `migrate.js` run finds all filenames in the ledger and applies 0 new files.

**Runtime**: Must be run from `connect-four/`, or from any directory where `server/migrations/` resolves correctly relative to the script's `__dirname`.

### Transaction rollback behavior

Each migration file runs inside its own `BEGIN/COMMIT` transaction. A failure:
- Rolls back only that file's SQL (prior files remain committed)
- Does NOT insert a row into `schema_migrations` for the failing file
- Prints `ERROR: Migration [filename] failed. Transaction rolled back.` to stderr
- Exits with code 1, which causes `&&` in the Railway start command to skip `node server/index.js`

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Failure — DATABASE_URL absent, connection error, migration SQL error, or file read error |

---

## Repo Hygiene — `.claude/` Tracking Decision (spec 047 US4)

**Decision (2026-07-12): `.claude/` stays tracked in git.**

**Rationale**: The project actively depends on `.claude/projects/.../memory/MEMORY.md` and its linked
memory files as durable, cross-session, checked-in memory — this is a deliberate design choice (see this
file's project CLAUDE.md, "Where information lives: memory vs. docs/architecture"), not an accident.
Untracking `.claude/` would break that workflow: memory would no longer survive a fresh clone or a
teammate's checkout, and the append-only memory-index convention depends on git history for provenance.

The Epic 7 audit (F9) flagged `.claude/` as tracked reconnaissance-useful operational detail (skills
content, memory of past bugs/decisions, internal architecture discussion) but found **no secrets** in it —
the tradeoff is between some recon-useful detail being visible in a public/shared repo versus losing a
working, load-bearing memory system. Given no secrets are present, this feature keeps `.claude/` tracked
and accepts that tradeoff explicitly, rather than leaving the status quo unexamined. If the repo's
visibility model changes (e.g., a public open-source release), this decision should be revisited — the
recon-detail cost is a function of who can read the repo, not a fixed property of `.claude/` itself.

## Security Regression Guards (spec 047 US4, audit F10 positive controls)

The Epic 7 audit found the following properties **sound by design** at the time of the audit. They are
recorded here as an explicit checklist so future work does not silently reintroduce a regression on any
of them. Any PR touching an area below should re-confirm the guard still holds:

1. **Service-role Supabase key stays server-only.** No `createClient`, `SUPABASE_SERVICE_ROLE_KEY`, or
   `sb_secret`-prefixed key literal may appear anywhere under `connect-four/src/` (the frontend bundle).
   The service-role key is read only in `connect-four/server/`.
2. **RLS stays enabled, deny-by-default, on every user-data/backend table** — including the `llm_usage`
   table added by spec 047 US5. A new table with user-scoped rows MUST ship with an RLS policy denying
   anonymous/`authenticated`-role reads by default; server access relies on the `service_role` BYPASSRLS
   grant, never a permissive table-level policy.
3. **Solver invocations stay `spawn`/`spawnSync` with array args, never `shell: true`.** All c4solver
   process invocations (`c4solver-wrapper.js` and any one-shot spawn site) MUST pass argv as an array;
   never construct a shell command string or set `shell: true`.
4. **No CORS middleware is added.** The API and SPA are served same-origin from one Express process by
   design (see "SPA Catch-all Route" above). Do not add `cors` middleware or permissive
   `Access-Control-Allow-Origin` headers without a documented reason re-litigating this.
5. **No `dangerouslySetInnerHTML` / raw `innerHTML` / `eval` / `new Function`** may be introduced under
   `connect-four/src/`. All rendered strings go through normal JSX text interpolation.
6. **`tier` stays writable only by the Paddle webhook (+ its verify-transaction fallback).**
   `users.tier` MUST NOT be set by any client-writable endpoint or user-controlled request field
   — the two write paths are `paddleProcessor.js`'s `handleWebhook` and `verifyTransaction` (see
   "PaymentProcessor Seam" above), both gated on server-verified identity (webhook signature /
   `customData.app_user_id` match), never on a bare client-supplied value.
7. **Paddle webhook signature verification stays on the raw body.** `paddle.webhooks.unmarshal` MUST
   continue to run against the raw (unparsed) request body — see "Webhook raw-body middleware ordering"
   above. Never let a global JSON body-parser run ahead of the webhook route.

## Localhost/IP gating under `trust proxy` (spec 047 US3, FR-009)

`requireLocalhost` (gate on all `/api/admin/*` and `/api/debug/*` routes) MUST derive the peer address from
**`req.socket.remoteAddress`**, never from `req.ip`. Because `app.set('trust proxy', 1)` is set globally
(required so `express-rate-limit` sees real client IPs behind Railway's edge), Express computes `req.ip`
from the client-supplied `X-Forwarded-For` header for one hop — so a direct (non-proxied) caller can send
`X-Forwarded-For: 127.0.0.1` and spoof any `req.ip`-based localhost check. `req.socket.remoteAddress` is the
raw TCP peer and is header-immune. In production this is Railway's proxy IP for all external traffic (→
rejected); only a genuine on-box loopback connection (an operator shell in the same container) passes —
which is exactly the intended "localhost-only" semantics. **Any new IP-based or localhost gate anywhere in
the server must follow this rule**; reaching for `req.ip` reintroduces the spoof. (The original spec-047
planning wrongly assumed `trust proxy` made `req.ip` safe; the bug was reproduced and fixed in QA.)

## Deep-reveal mechanism retry (`mechanismExplainer.mjs`)

`computeMechanism` owns **exactly one retry, shared across every trigger**. Do not add a second
pass; a new trigger must fold into the existing one.

Triggers:
1. **LLM-level failure** — call error or unparseable response → resend the identical prompt once.
2. **Content miss** on an otherwise-successful attempt. Two are computed **together**, before the
   retry, and folded into **one** amended prompt by `buildRetryPrompt(prompt, missing, phrase)`:
   - a **required square/line** the answer failed to tag (`missingRequiredGroups`, matched on the
     attempt's post-`processAnnotations` `usedSpecs` — a raw `[zone:{handle}]` string search is
     wrong, the handles are already rewritten to expanded specs by then);
   - the **better move's column never named in the prose** (`mentionsBetterColumn`).

Spending the single retry on one and leaving the other unenforced just moves the regression, hence
the fold. The retry prompt is a genuinely *amended* prompt (new blocks appended to the same
evidence/instructions), never a bare resend.

`mentionsBetterColumn(attempt, bestCol, locale)` tests the **post-`processAnnotations` `mechanism`**
run through the guard's own `stripInternalTokens` — the closest available prediction of the text the
player is served. Not the raw LLM string (zone handles are already expanded), and not a naive
`/column N/` on `mechanism` (the guard rewrites raw `cN`/`cNrM`/`colN` prose into "column N" before
serving, so a literal search would burn the retry on a false miss). It is locale-aware: under `es`
it requires the Spanish phrase, because that is what the player reads.

**Prompt wording alone does not enforce this class of instruction** — measured inert (0/12 runs)
while the required-set retry moved it (12/12). Reach for a post-check on the shared retry, not more
prompt text.

**Note the module boundary inversion:** `mechanismExplainer.mjs` **imports**
`buildPromptForCondition` and `renderDecisionForCondition` from `server/scripts/compute.mjs` — i.e.
production server code depends on a script under `scripts/`. That coupling is deliberate: it is what
makes `compute.mjs --llm --condition D` a faithful evaluator of the production prompt rather than a
lookalike. Do not "clean it up" by forking the builder.
