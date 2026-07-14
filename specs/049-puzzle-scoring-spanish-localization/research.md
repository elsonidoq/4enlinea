# Phase 0 Research: Puzzle Scoring-by-Pattern & Spanish Localization

All open design questions for this epic were resolved during epic authoring (`polish_epic.md`
"Settled decisions") — spec.md's clarify section confirms none remain. This document records the
resolved decisions with rationale/alternatives (per Phase 0's required format) and the current-code
verification performed before planning, since epic decisions can drift from the codebase between
authoring and planning.

## R1 — Metadata delivery mechanism for `/api/evaluate-move`

**Decision**: The client sends puzzle metadata (`correctCol` / `highlightMetadata`) in the
`POST /api/evaluate-move` request body, alongside the existing `movestring`/`col`/`category`
fields, using **camelCase** keys on the wire (`correctCol`, `highlightMetadata`) — see Decision A
below. No server-side DB read is added.

**Critical correction (2026-07-13 critique)**: the client's local puzzle object (`current` in
`ChallengeScreen.jsx`, drawn from `GET /api/puzzles/draw`) is **snake_case**
(`current.correct_col`, `current.highlight_metadata`, `current.move_string` — the draw endpoint
selects snake_case columns at `server/index.js:908`), while `evaluatePredicate` reads **camelCase**
(`puzzle.correctCol` at `predicates.js:298/326/334`; `puzzle.highlightMetadata` at
`predicates.js:290/306/316`). An earlier draft of this research asserted the client "already holds
[the metadata] in the right shape" — that claim is **wrong** and is corrected here. A remap is
mandatory: the request body sent from `ChallengeScreen.jsx` MUST build `correctCol:
current.correct_col` and `highlightMetadata: current.highlight_metadata` explicitly (top-level
field renaming only — do NOT touch the inner `highlight_metadata` JSON shape, i.e. `.column` and
`.cells[].role` stay as-is, since those are read as opaque nested data by `evalZThreat`/
`evalUndercut`/`evalOvercut`). A missed remap is dangerous specifically because FR-007's
fail-closed behavior makes it silent: `evaluatePredicate` would receive `undefined` for both
fields and return `{ result: 'wrong' }`, which is indistinguishable from a genuine wrong answer —
every single-answer puzzle would silently score "wrong" with no error, no 400, no stack trace.
tasks.md MUST include an explicit remap task (see plan.md's added step) and a **positive** test
asserting a taught-correct column returns `accepted: true`, not just negative/absent-metadata
cases, so a regression here fails loudly.

**Rationale**: `POST /api/evaluate-move/inline` (`server/index.js` ~1765) already accepts a full
`puzzle` object and runs `evaluatePredicate` against client-sent `highlightMetadata`/`correctCol`
for all categories, including the six single-answer ones — this establishes the camelCase shape
`evaluatePredicate` expects, but is a **weaker precedent than "validated" implies**: the inline
handler has no `src/` caller (confirmed via `rg` — nothing under `connect-four/src/` fetches
`/api/evaluate-move/inline`), so no working browser flow has ever exercised this shape end-to-end.
It documents the expected wire shape; it does not prove the wiring works. `ChallengeScreen.jsx`
already holds the full puzzle object at its fetch call site (`current.id`, `current.move_string`,
etc. — confirmed at `src/screens/ChallengeScreen.jsx:225-229`), so the *remap* is a small, scoped
change, but it is a **new** piece of wiring, not something the client already does. Verified:
`evalZThreat`/`evalUndercut`/`evalOvercut` read `puzzle.highlightMetadata`;
`evalClaimeven`/`evalFigure7`/`evalJShape` read `puzzle.correctCol` (`server/predicates.js:289-341`,
read directly during planning).

**Alternatives considered**:
- *Server-side DB read of the puzzle row inside `/api/evaluate-move`.* Rejected — larger change
  (new Supabase dependency in a currently-DB-free endpoint), and the client already has the data
  in hand from the puzzle-draw response; refetching it server-side is redundant I/O for no
  correctness benefit (client-trust is already the accepted model for the sibling inline handler).
- *A third endpoint just for the six categories.* Rejected — directly violates Constitution VII
  ("one — and preferably only one — obvious way to do it") and FR-006's explicit convergence
  mandate.
- *Server accepts snake_case field names directly, matching the DB column names.* Rejected —
  would diverge from the inline handler's already-camelCase contract and from
  `evaluatePredicate`'s existing reads; would require touching `predicates.js` itself (which
  FR-001/FR-005 forbid re-deriving). Client-side remap keeps `predicates.js` and the inline
  handler's shape untouched (Decision A).

**Accepted trade-off**: a client could spoof metadata to force `accepted:true`. Explicitly out of
scope (spec.md Assumptions/Out of Scope) — no weaker than the already-shipped inline handler.

## R1a — Decision A/B (2026-07-13 plan-critique resolution)

**Decision A (remap location)**: Client sends camelCase. `ChallengeScreen.jsx`'s request body
maps `correctCol: current.correct_col` and `highlightMetadata: current.highlight_metadata`; the
server handler places them onto the predicate object under the same camelCase keys it already
uses. This matches `contracts/api-evaluate-move.md`'s documented request shape and keeps the plain
handler's predicate-object construction byte-identical to the inline handler's — no branching by
source shape. A defensive server-side fallback that also accepts snake_case keys is optional
(nice-to-have) but not required; if added, it must not become a second code path for building the
predicate object. Only top-level field *names* remap — inner `highlight_metadata` JSON keys
(`.column`, `.cells[].role`) are never touched, in either direction.

**Decision B (accepted rule for the six)**: Unify the branch. Widen the existing accepted gate
(`server/index.js:1753`, currently `result === 'correct' || result === 'tied'`) to also cover
`SINGLE_ANSWER_CATEGORIES`, keeping the `|| 'tied'` term as-is — it is harmless dead weight for the
six (single-answer categories never produce `'tied'`, confirmed against every `eval*` function's
return values in `predicates.js:289-341`), and keeping it avoids a second, category-conditional
gate expression. `contracts/api-evaluate-move.md`'s "must be `=== 'correct'`" language is relaxed
to "equivalently `=== 'correct'`, since single-answer categories never return `'tied'`" — the
implementation is one shared boolean expression, not two.

## R2 — Handler convergence (`/api/evaluate-move` vs `/api/evaluate-move/inline`)

**Decision**: Both handlers converge on one `evaluatePredicate`-driven code path for the six
single-answer categories. The inline handler's `.includes`-on-a-`Set` bug is fixed as part of this
convergence.

**Verification performed** (2026-07-13, current `feature/polish` branch):
- `server/index.js:1779` still reads `if (!category || !VALID_CATEGORIES.includes(category))` —
  confirmed live, unfixed. `VALID_CATEGORIES` is a `Set` (`server/categories.js:3`); `Set` has no
  `.includes` method, so every `/api/evaluate-move/inline` request currently throws inside the
  route handler and 500s (not silently returns false — verified there is no surrounding try/catch
  before this line).
- Grepped all other `VALID_CATEGORIES` call sites in `server/index.js` (lines 902, 1499, 2919,
  2996, 3068, 3120, 3144, 3405, 3453, 3459) — every one of the other 10 already uses
  `.has(category)` correctly. Line 1779 (inline handler) is the sole `.includes` occurrence.
- `MULTI_SOLUTION_CATEGORIES` is duplicated as a literal `Set` at `server/index.js:33` and
  `src/screens/ChallengeScreen.jsx:23` — confirmed still duplicated (no shared module). This
  duplication precedent is what `SINGLE_ANSWER_CATEGORIES` will mirror (R3).

**Rationale**: Two independent `evaluatePredicate` call sites for the same six categories (plain
handler computing `accepted` one way, inline handler another) is the exact "divergent detection
path" I0/I12 forbids for the reason engine and, by the same design principle, for this predicate
seam. Converging removes the duplication and fixes the latent bug in the same change, per FR-006 and
the epic's explicit "in scope, not deferred" framing (superseding the earlier "log as latent bug"
plan).

**Alternatives considered**: Fix the `.includes` bug standalone, defer convergence. Rejected — the
epic's Settled decisions explicitly retired this option ("no longer deferred to `open_issues.md`").

**Caveat**: `/api/evaluate-move/inline` has no `src/` caller (confirmed via `rg` across
`connect-four/src/` — no fetch call targets this route). Convergence is still worth doing — it
removes the divergent second `evaluatePredicate` call site and fixes a live 500 for any caller
(external, future, or manual/curl testing) — but no browser-driven end-to-end flow exercises this
endpoint, so it cannot serve as a live oracle validating the request shape in this feature. The
six-category production-path coverage in Testing (US9.4) exercises `evaluatePredicate` directly
and via `/api/evaluate-move` (which *does* have a `ChallengeScreen.jsx` caller), not via
`/inline`.

## R3 — `SINGLE_ANSWER_CATEGORIES` as an explicit shared set

**Decision**: Introduce `SINGLE_ANSWER_CATEGORIES = new Set(['z_threat', 'overcut', 'claimeven',
'undercut', 'figure_7', 'j_shape'])`, mirrored server (`server/categories.js`, alongside
`VALID_CATEGORIES`) and client (`src/lib/categories.js`, alongside the frontend mirror), matching
the existing `MULTI_SOLUTION_CATEGORIES` duplication pattern (R2) rather than introducing a new
sharing mechanism.

**Verification performed**: `rg -n "SINGLE_ANSWER_CATEGORIES"` across `connect-four/` returns no
hits — confirmed this does not exist yet and must be created fresh, not extended.

**Rationale**: FR-008 requires "a single, explicit, shared list (not inferred as 'every category
that isn't a multi-solution category')". Placing it in `categories.js`/`src/lib/categories.js`
(the existing category-registry convention per `server-conventions.md` "Category Registry")
keeps it alongside `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER` rather than inventing a
new file. Server and client copies stay literal-duplicated (not imported cross-boundary) because
`server-conventions.md`'s "Static Cross-Directory JSON Import" section explicitly discourages
adding more server→frontend imports beyond the one documented exception (`en.json`), and the
project's existing `MULTI_SOLUTION_CATEGORIES` / `CATEGORY_ORDER` / `CATEGORY_NAMES` precedent is
already duplicate-and-keep-in-sync, not shared-import.

**Alternatives considered**: Derive the six as "not in `MULTI_SOLUTION_CATEGORIES`". Rejected —
FR-008 explicitly forbids this (a category added later that is neither multi-solution nor
single-answer, e.g. `forced_win`/`forbidden_columns`/`odd_even_threat`, would be silently
miscategorized as single-answer).

## R4 — Answer source: read stored metadata, do not recompute

**Decision**: `evaluatePredicate` continues reading the puzzle's stored `highlightMetadata`/
`correctCol` exactly as it does today for the six categories — no fresh detector re-run over the
board.

**Rationale**: Already the existing behavior of every `eval*` function for these six categories
(verified during planning — `server/predicates.js:289-341`); the fix is purely about *which
callers* invoke `evaluatePredicate` with correct metadata, not about changing what the predicates
do. Recomputing would introduce a second detection path that could diverge from the puzzle's
authored answer (I0/I12 risk), and is explicitly rejected in spec.md's Out of Scope.

## R5 — `accepted` field additivity and fail-closed behavior

**Decision**: `accepted` remains additive (`true | false | null`), gated to
`SINGLE_ANSWER_CATEGORIES ∪ MULTI_SOLUTION_CATEGORIES` (9 categories total after this feature,
up from 3). `quality`/`badge`/`coachPhraseKey`/`summaryLineKey`/`patternTag` are computed exactly
as today (`scoreMove` + `pickFromPool`), unchanged in meaning for every caller. Absent client-sent
metadata for one of the six categories yields `evaluatePredicate`'s existing `{ result: 'wrong' }`
fallback (verified: every one of the six `eval*` functions already returns `wrong` when its
required field is `undefined`/`null` — `server/predicates.js:289-341`), which maps to
`accepted: false` — never a 400, never a silent `true`.

**Rationale**: FR-003/FR-007/FR-009 direct this exact shape; it is also literally free — no new
code path needed for the fail-closed case, since `predicates.js`'s existing absent-metadata
handling already does the right thing. FR-006's convergence work only has to *wire* metadata
through, not add new validation.

## R6 — Display override for pattern-correct-but-slower moves

**Decision**: Reuse the existing multi-solution display-override pattern verbatim
(`ChallengeScreen.jsx`'s `displayData` computation, confirmed at lines ~241-250 during planning):
when `accepted === true` but `data.quality !== 'optimal'`, override the *displayed* `quality`/`badge`
to `'optimal'`/`'good'` without touching `coachPhraseKey`/`coachMood`/`summaryLineKey`/`patternTag`.
Extend the `isMultiSolutionCategory` condition to also cover `SINGLE_ANSWER_CATEGORIES`.

**Rationale**: FR-010 requires this exact behavior (OI-1 repro board 2) and the multi-solution
precedent already implements the identical rule — no new UI pattern, per Constitution IV/VII.

## R7 — Test board provenance for the six categories

**Decision**: Use the two confirmed OI-1 repro boards for `z_threat`
(`3333302444422222060315555054` col 0 non-taught-but-tying; `3333334512266550121166` col 0
taught-but-slower), and source `accepted:true`/`accepted:false` fixtures for the other five
categories from the existing per-category integration test files: `tests/integration/z_threat.test.js`,
`claimeven.test.js`, `figure7_jshape.test.js` (`F7_PRE 041015021326` correctCol 2 for figure_7,
`J_PRE 04101502` correctCol 1 for j_shape), `undercut_overcut.test.js` (`evalUndercut`/`evalOvercut`
fixtures ~lines 135-210).

**Rationale**: CLAUDE.md/I12 forbid hand-constructing movestrings; these are the project's existing
DB/KB/simulator-sourced boards, validated through the production predicate already. No new board
generation is needed for this feature.

## R8 — Spanish translation content approach

**Decision**: Direct, section-by-section translation of the 22 missing `en.json` top-level
sections into `es.json`, preserving nested key structure, `{{var}}` interpolation placeholders, and
coach tone (per `feedback_pedagogy_preferences` — no lost-position defeatism). Disc-color terms:
verde (green) / gris (gray), never rojo/amarillo (per CLAUDE.md's player-color table).

**Verification performed**: `en.json` has 25 top-level sections (confirmed via `Object.keys`);
`es.json` has exactly 3 (`setcard`, `onboarding`, `settings`) — confirms spec.md's "3-of-25... 22
missing" framing is accurate against current code (the epic text's "2 of 24" is stale by one
section on each side; spec.md's figures are correct and are the source of truth per its own
framing, consistent with the FRAGILE note to re-verify rather than trust the epic verbatim).

**Rationale**: FR-013 requires full nested key-parity, verified solely by the FR-019 parity test —
no fixed section count is normative, so translating "all keys `en.json` has that `es.json` lacks"
is the correct scope regardless of the exact section count.

**Alternatives considered**: Machine-translate then hand-review. Not selected as a distinct
research decision — translation method is an implementation detail left to task execution, not a
architecturally load-bearing choice; either approach must pass the same tone/terminology/placeholder
checks (FR-014/FR-015/FR-016), which are the actual acceptance gates.

## R9 — Key-parity guard test shape

**Decision**: One new `node:test` file (`tests/unit/i18nKeyParity.test.js`) that recursively walks
both `en.json` and `es.json`, collects fully-qualified nested key paths, and asserts the two sets
are equal — reporting the symmetric difference on failure. Registered in both `test` and `test:fast`
lists in `connect-four/package.json`.

**Verification performed**: confirmed `tests/integration/evaluateMoveMultiSolution.test.js`
currently appears only in the `test:fast` script's file list (not in `test`) — must be added to
`test` as part of this same registration pass (US9.4.2, spec FR-021/FR-020).

**Rationale**: FR-019/FR-020 require exactly this; `tests/unit/` is the existing convention home
for pure, solver-free `node:test` files (`testing-conventions.md`), and this test has no DB/solver
dependency — a pure JSON structural diff.

**Six-category production-path coverage test (new, named here)**: a second new file,
`tests/integration/singleAnswerCategoriesAccepted.test.js`, drives `POST /api/evaluate-move`
end-to-end (not `evaluatePredicate` directly) for all six `SINGLE_ANSWER_CATEGORIES`, asserting
both an `accepted: true` case and an `accepted: false` case per category. Boards: `claimeven`,
`figure_7` (`F7_PRE 041015021326`, correctCol 2), `j_shape` (`J_PRE 04101502`, correctCol 1),
`undercut`/`overcut` (from `undercut_overcut.test.js` fixtures ~lines 135-210) per R7, and
`z_threat` via the two OI-1 repro boards (`3333302444422222060315555054`,
`3333334512266550121166`). This file's registration is folded into US9.4.2's existing
"add to both `test` and `test:fast` lists" step (see plan.md ordering note) rather than treated as
a separate registration task.

**Ordering constraint (mid-cycle red-suite avoidance)**: the plan's task sequence MUST run
US9.1 (widen the `accepted` gate per Decision B) → US9.2.6 (flip the existing z_threat
`accepted: null` assertion in `evaluateMoveMultiSolution.test.js` to a real `true`/`false`
assertion using the OI-1 repro boards, since z_threat moves from the "always null" set to the
"real accepted value" set) → US9.4.2 (register `singleAnswerCategoriesAccepted.test.js` and the
corrected `evaluateMoveMultiSolution.test.js` into the `test`/`test:fast` lists). Registering the
new suite before US9.1/US9.2.6 land would make `test:fast` red mid-cycle, since the new suite's
`accepted: true/false` assertions for z_threat depend on the widened gate existing first.
