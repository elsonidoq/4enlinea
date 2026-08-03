# Spec 056 critique (spec_critique stage)

## Blocking issues

### 1. The story order makes the spec's own "tests green at every story boundary" gate impossible to satisfy — and leaves the app broken between stories

The spec splits the work as: US2 = server production code, US3 = frontend production code, US4 = tests. FR-009, FR-014, FR-017 and FR-024 all require the fast test suite to be green (relative to baseline) at each of those boundaries. That cannot happen, for two independently verified reasons:

**(a) A test asserts the *pre-migration source text* of a file US3 must change.** `connect-four/tests/integration/evaluateMoveMultiSolution.test.js:75` contains:

```js
assert.match(block, /correctCol:\s*current\.correct_col/, 'request body must remap correctCol from current.correct_col');
```

It reads `ChallengeScreen.jsx` as text and asserts the legacy field name is present. `src/screens/ChallengeScreen.jsx:302` is exactly `correctCol: current.correct_col`. So the moment US3 migrates that line, this test goes red — but FR-015 defers test migration to US4. FR-014 and FR-015 are in direct contradiction.

**(b) US2's independence claim is false.** Spec.md line 112-113 says US2 "delivers a fully scalar-free server with no frontend changes required yet." But FR-007 removes the singular `correctCol` field from the wire outright (no alias). The unmigrated frontend still sends it (`ChallengeScreen.jsx:302`) and still reads it (`server/index.js:2550,2602` are the response sites the curation and picker screens consume). After US2 alone, lesson-sourced inline challenge grading — the path that has no `puzzleId` and depends entirely on the client-supplied field (`server/evaluateMoveHandler.js:135,139`) — is broken. That breakage is invisible to the test suite, so the FR-024 gate would report green over a broken app.

**Recommended fix:** Declare US2+US3 (and the tests that cover them) a single deploy-atomic unit rather than three independently shippable stories, and rewrite FR-024 as "green at each *merge*, with each test updated in the same commit as the production code it covers." At minimum, delete the "no frontend changes required yet" independence claim from US2 and add an explicit statement that the intermediate state is not deployable.

### 2. The `undercut`/`overcut` "show nothing" behavior is data-driven today; the spec asks to "preserve" it without requiring the replacement mechanism, and omits the server half

The epic's Settled decision 9 and spec 051's FR-019 carve-out are implemented as follows, verified in code: `candidate-generator.js:527` forces `correct_col = null` for `undercut`/`overcut`, while `correct_cols` stays **fully populated** (`candidate-generator.js:355-361` pushes every legal non-killing solver-safe column). Every display consumer then simply tests the scalar for null:

- `src/components/CurationWorkspace.jsx:262` — `if (candidate.correct_col != null && ...)` draws the board hint marker
- `src/components/admin/PuzzlePickerModal.jsx:111` — `col {puzzle.correct_col}`, no guard at all; it renders blank only because the value is null
- `server/index.js:2550` and `:2602` — `correctCol: puzzle.correct_col ?? null` in the API responses

So "show nothing" is not logic anyone wrote — it falls out of the NULL. The instant the scalar is retired and `correct_cols` becomes the source, that NULL is gone and the array is non-empty for exactly these two categories. Every one of these four sites needs **new**, explicitly authored category-based suppression.

The spec under-specifies this twice. FR-011 says consumers "MUST NOT fall back to displaying the array's first element" — a prohibition, not a requirement to build the replacement, and it names no source for the category check. And FR-011 sits under User Story 3 (frontend), naming only the curation hint marker and the picker label. The epic's acceptance criteria explicitly also name "the relevant `server/index.js` response sites"; spec.md's server-side requirements (FR-006, FR-007) mention the carve-out nowhere. FR-007 as written ("every HTTP field carrying this sense becomes `correctCols`") actively instructs the opposite: it would ship the populated array for `undercut`/`overcut` where the API previously sent null.

**Recommended fix:** Rewrite FR-011 to require an explicit category-based suppression (naming where the category list lives) rather than a prohibition, cover all four sites including the two `server/index.js` response sites, and add a corresponding acceptance scenario under User Story 2 so the server half isn't orphaned in the frontend story.

### 3. SC-001's zero-reference criterion cannot return clean, for two separate reasons

**(a) It excludes only "historical" migration files — but this feature writes a new one.** The drop migration must contain `ALTER TABLE ... DROP COLUMN correct_col`, and it lands in `connect-four/server/migrations/`, inside the searched tree. SC-001 measures "after this feature ships," so the feature's own deliverable fails its own success criterion. (FR-018's pre-write check is fine; SC-001 is not.)

**(b) There is no mechanical way to exclude senses 2 and 3.** I ran the search. `correctCol` (camelCase) currently appears in **66 files**. A file-level exclusion list is the only greppable form of "exclude the lesson-JSON and computed-result-shape senses" — and it cannot work, because `server/predicates.js` contains **both** senses at once: the in-scope DB-fed parameter (`buildPredicatePuzzle(category, movestring, { correctCol, ... })` at line 79, threaded at line 86) *and* the out-of-scope computed result field (lines 130-133, 177-180, 227-231, 312-313, and more). Excluding the file hides a real regression; not excluding it guarantees a non-zero result. Note also `predicates.js:330` carries a live legacy fallback — `puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : [])` — which the spec never mentions.

**Recommended fix:** Split SC-001 into two claims. A *mechanical* one: `/usr/bin/grep -rn "correct_col\b"` over `server/`, `src/`, `scripts/`, `tests/` returns only `016_correct_col.sql`, `061_correct_cols.sql`, and the new drop migration (name all three). And a *human-adjudicated* one: every remaining camelCase `correctCol` occurrence maps to a triage-table row dispositioned sense-2 or sense-3 — with the triage table checked in as the audit artifact. Also record the project's known trap that a bare `grep` here is `ugrep` and can silently return zero matches, so the verification command must be `/usr/bin/grep`.

---

## Decisions required

### D1. Should the concrete test baseline live in spec.md? (the handoff's flagged judgment call)

The spec deliberately omits the measured numbers (1685 pass / 5 fail, where the 5 are pre-existing unrelated failures present in the main checkout too), placing only "a baseline is established at pickup time" in Assumptions. The reasoning — spec.md is durable, the repo is concurrently edited, the number will drift — is sound.

- **Option A (recommended):** Keep it out of spec.md, but require the plan artifact to record the measured baseline (command, date, pass/fail counts, and the identity of each expected failure) as its first task output. This keeps the durable document stable while making the number a hard prerequisite before any migration begins.
- **Option B:** Put the numbers in spec.md. Concrete, but guarantees the spec is stale within days and invites someone to "fix" tests toward a stale target.

The risk with Option A as currently written is that "no failures beyond the documented baseline" has no *documented baseline* anywhere yet — the phrase is load-bearing but points at nothing. Option A only works if the plan is explicitly obligated to produce it.

### D2. How is FR-013's manual verification of `undercut`/`overcut` actually going to happen?

FR-013 requires a manual pass on the curation workspace and puzzle picker for those two categories. Two obstacles: those admin screens have zero automated test coverage (the epic says so, and it holds), and the local database is empty for most puzzle categories — so an engineer may simply find no `undercut`/`overcut` puzzle to look at and quietly declare the check unverifiable.

- **Option A (recommended):** Require both — (i) generate and promote local `undercut` and `overcut` puzzles as a prerequisite step of the story (this project supports doing that locally), and (ii) add a small DOM test asserting the picker row and the curation hint marker render nothing for these two categories. The DOM test converts the highest-risk silent regression in the whole feature into a permanent guard, at low cost.
- **Option B:** Manual-only, with dated screenshots as evidence. Cheaper now, but leaves Blocking issue #2 protected by nothing but one person's attention on the day.
- **Option C:** Accept the risk and drop FR-013. Not recommended — this is the one behavior in the feature that no existing test covers and that a mechanical swap will break by default.

---

## Handoff context

**Key decisions and reasoning**
- I prioritized defects that I could prove at source over structural/style critique. All three blocking issues are backed by a specific file:line I opened, not by reasoning about the spec's prose.
- I treated the epic's Acceptance criteria as binding: Blocking #2 is partly a defect precisely because the epic names `server/index.js` response sites in the carve-out and spec.md silently narrows it to two frontend sites.
- I did **not** flag the handoff's own two self-identified fragile areas as blocking (FR-025 over-scoping guard, and the intentional absence of concrete file lists). Both are defensible: FR-025 is an adequate guard, and the deferred-enumeration choice directly implements the epic's Settled decision 7 (owner, 2026-08-03). Flagging them would have relitigated a settled decision.

**Trade-offs / intentionally deferred**
- I did not audit spec.md against every one of the epic's 11 Settled decisions individually; I spot-checked 3, 4, 7, 8, 9, 10, 11 (the ones with mechanical consequences) and found only #9 mishandled.
- I did not verify whether spec 051's backfill has actually run against the target DB. The handoff flags this as unverified by anyone; it remains unverified. It is correctly captured in the spec as FR-005 and an edge case, so it is not a spec defect — but it is a live execution risk.
- I did not check `docs/architecture/api-conventions.md` / `data-model.md` / `db-schema.md` for the exact "kept in sync" passages FR-022 must update. FR-022 states the obligation adequately; enumerating the passages is plan-phase work.

**Uncertainties the next agent should scrutinize**
- **My Blocking #1(b) claim that the intermediate state breaks lesson inline challenges** rests on reading `evaluateMoveHandler.js:135-211`: the no-`puzzleId` path uses the client-supplied `correctCol`, the `puzzleId` path re-reads `puzzle.correct_col` at line 211. I did not execute this path. Worth confirming before restructuring stories on it.
- **`predicates.js:330`'s legacy fallback** (`puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : [])`) is a sense-1 hit inside a heavily sense-3 file. Nobody has dispositioned it — not the epic, not the spec. It is the single most likely thing US9.1's triage table will get wrong.
- **`PuzzlePickerRow.jsx` exists alongside `PuzzlePickerModal.jsx`** and contains `correctCol`. Only the Modal is named in the epic and spec. I did not determine whether the Row file's occurrence is sense 1. Someone should.

**Non-obvious things that would be lost if only the artifacts were read**
- The `undercut`/`overcut` "show nothing" behavior is **emergent from a NULL, not implemented**. Both the epic and spec.md use the verb "preserve," which reads as "don't break it" — but there is nothing to preserve; it must be built. This is the single highest-value finding in this review and it is invisible from the spec text.
- The camelCase surface is much wider than the epic's numbers suggest: 66 files contain `correctCol` today, versus the epic's "22 files." Most are senses 2/3 — which is exactly why a count-based completion criterion was always going to fail.
- `undercut` and `overcut` are both members of `SINGLE_ANSWER_CATEGORIES` in `src/lib/categories.js:80` despite structurally admitting many accepted columns. Anyone implementing FR-011's category check should not reach for that set as the discriminator.
