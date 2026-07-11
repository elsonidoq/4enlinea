# Internal Function Contracts (Epic 4 / Spec 044)

This feature has no new public HTTP endpoint contracts of its own (US1–US3 correct existing
endpoints' internal logic; US4/US5 are internal, non-endpoint pure functions). Documented here as
the contract layer per Constitution Principle VIII.

## Corrected existing contracts (US1–US3)

### `checkPredicate(category, moveString, scores, solver)` — `server/candidate-generator.js`
- **Before**: for `immediate_threat`/`forced_block`/`double_threat`, `passes: correctCols.length
  === 1`.
- **After**: `passes: correctCols.length >= 1` for those three categories only; every category
  outside that set keeps its exact current acceptance rule (`undercut`'s `>= 1` avoid-pattern
  filter; unique-answer categories' implicit single-entry behavior) — unchanged.
- **Callers**: the generation sampling loop (candidate-generator.js ~line 547-566). No signature
  change; only the boolean/array contents differ.

### `evaluatePredicate(puzzle, candidateCol, scores)` — `server/predicates.js`
- **No change to this function's own logic** — it already returns `'tied'` correctly for
  `evalImmediateThreat`/`evalForcedBlock`/`evalDoubleThreat`. The fix is entirely in *callers* that
  currently treat `'tied' !== 'correct'` as a failure.
- **Callers requiring a fix** — the four sites below (`server/index.js` lines ~1646
  (`/api/evaluate-move/inline`), ~2317, ~3101; and `candidate-generator.js` line 452) are a
  **starting point, not a confirmed-exhaustive list**. An exhaustive `rg 'evaluatePredicate'` sweep
  across the codebase is a GATING task (see plan.md) that must close — every hit individually
  classified as needing the `'tied'`-as-correct fix or not — before US3 is considered done. A single
  missed caller reintroduces a "false wrong" verdict for a legitimately tied answer.

### `POST /api/evaluate-move` — `server/index.js` (existing endpoint, extended in place)
- **Before**: `quality` computed solely by `scoreMove(scores, colInt)` (solver-score comparison);
  never consults `evaluatePredicate`.
- **After** (per FR-015a; mechanism resolved — data-model.md's coupled Q1/Q2 decision — extend this
  endpoint in place, do NOT switch to `/inline`): the request body is extended to carry `category`
  and `movestring` (confirm during implementation whether the current body already carries these —
  a gating check per plan.md); for requests where `category` is
  `immediate_threat`/`forced_block`/`double_threat`, the response gains an **additive** field (e.g.
  `accepted: bool`) whose value agrees with `evaluatePredicate`'s `'correct'`/`'tied'` verdict for
  that category, computed at solve time with no persistence and no schema change. MUST NOT remove or
  repurpose any existing field consumed elsewhere (`badge`, `quality`, `coachPhraseKey`,
  `coachMood`, `summaryLineKey`, `patternTag` all have other callers — grep before touching).
  Required empirical check before implementation: verify with a concrete board that a `double_threat`
  fork column need not be the max-score column (score-tie != fork-tie) — do not assume `scoreMove`
  already agrees with `evaluatePredicate`.

### `ChallengeScreen.jsx` `handleColumnClick` — `src/screens/ChallengeScreen.jsx`
- **Before**: trusts `data.quality === 'optimal'` from `/api/evaluate-move` unconditionally.
- **After**: for the three multi-solution categories, the "is this correct" check reads the new
  additive accepted-answer field from the extended `/api/evaluate-move` response (above), not the
  raw score-based `quality` alone. **`SocraticScreen.jsx` is explicitly NOT part of this contract
  change** (research.md R2 finding, ratified in spec.md FR-015a — no `category`/`correctCols`
  concept exists on `lesson.socratic` records).

## New contracts (US4/US5) — pure functions, no HTTP surface

### `t{1..7}_winner(threats) -> (player, col) | None` (or `t4_applies(threats, col) -> bool`,
matching each KB entry's own declared shape — see data-model.md)
- **Location** (proposed): a new module, e.g. `server/allenTransforms.js`, exporting one function
  per rule. Exact filename is a tasks.md decision; place under `server/`, not `src/`, since these
  are content-pipeline utilities, not player-facing runtime code (consistent with `NOT included`:
  no UI change).
- **Contract test**: each function, given its own KB entry's `worked_examples` threat set, MUST
  return that example's documented `(player, col)`/`bool`. Given its KB entry's `false_positives`
  threat set, MUST return `None`/`false`.

### `v{1..5}_evaluator` / `t4_case_a_evaluator` / `t4_case_b_evaluator`
- **Location** (proposed): same new module or a sibling (e.g. `server/allenVRules.js`).
- **Contract test**: each function, given its own (post-FR-020a-backfill) KB `worked_examples`
  movestring, MUST reproduce the documented win/loss/draw outcome — verified by first re-running
  `TOOLS/optimal_line.mjs` against the movestring directly (I12: through the production detector),
  not by trusting the KB prose alone.
