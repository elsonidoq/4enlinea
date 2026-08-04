# Open-Issues Epics — spec-ready backlog for `/epics-manager`

Consolidates every **still-open** entry in [`docs/open_issues.md`](../open_issues.md) into 9 epics sized for
the full speckit pipeline. Each epic carries the sections `/epics-manager`'s Reading contract consumes
verbatim: `Settled decisions`, `Non-obvious facts`, `Authoritative sources of truth`, `Acceptance criteria`,
`NOT included`.

**This file references the open issues; it does not restate them.** `docs/open_issues.md` remains the
authoritative, full-detail description of every `OI-N` (repro, why deferred, "if picked up"). Read the cited
OI entry before working an item — the bullets here are pointers plus the extra decisions taken on 2026-07-29.

**Sizing rule (2026-07-29 owner directive):** every epic maps to **3–5 user stories**, each with **5–15
tasks** — i.e. 15–60 tasks per epic, comfortably inside the speckit sweet spot defined in
[`docs/best_practices_spec_driven_development.md`](../best_practices_spec_driven_development.md)
(8+ tasks, ≥1 unresolved design decision, multiple subsystems).

**Issue closeout convention (MANDATORY for every epic).** An `OI-N` is not done when its code ships — it is
done when [`docs/open_issues.md`](../open_issues.md) says so. Every epic **must** update that file for each
issue it covers, in the same change that ships the work, following the format the file already uses:

- **Fully fixed** → prepend `**Status**: ✅ RESOLVED <YYYY-MM-DD>` and replace the body's "why deferred" /
  "if picked up" text with what actually shipped and where (file/symbol), so the entry reads as history
  rather than as a live task. Keep the original description above it when the reasoning is still useful —
  OI-74 and OI-59 are the worked examples of a good closeout.
- **Partially fixed** → keep the entry open and add a dated `**UPDATE <YYYY-MM-DD>**` block stating exactly
  which half landed and which remains, as OI-61's item-1/item-2 split does. Never mark an entry resolved
  because most of it shipped.
- **Found to be already resolved / obsolete** → say so with the evidence (the symbol or test that proves
  it), not just a status flip. Several entries in the *Already resolved* table below are in this state now.
- **Deliberately not fixed** → leave it open and record the decision and its rationale, so the next reader
  does not re-litigate it.

This is a per-epic obligation, not a final cleanup pass: each epic's `Acceptance criteria` restates it, so
`/speckit-tasks` generates the closeout tasks per story. Epic 8's doc-bookkeeping story is the **audit** of
this convention across the whole backlog, not the only place it happens. New issues discovered while working
an epic get a **new** `OI-N` entry per
[`feedback_open_issues_destination`] (deferred/latent bugs go to `docs/open_issues.md`, never to memory).

**Invocation:** `/epics-manager docs/epics/open-issues-epics.md N` (or a substring of the heading).
The only `##` headings that name an epic are `## Epic 1 …` through `## Epic 9 …`; `## Overview`,
`## Already resolved`, and `## Traceability` are not epics.

> **Launch gating lives elsewhere.** [`docs/epics/pre-launch-mvp-epic.md`](pre-launch-mvp-epic.md)
> (**Epic 10 — MVP Launch Gate**, Lane D, runs alone) carries the 16 `OI-N`s judged blocking for a
> public paid launch, several of which are *not* covered by Epics 1–9 because they were filed after
> this file was written (OI-92, OI-104, OI-126, OI-130, …). Three issues — OI-41, OI-5, OI-31 — were
> reassigned from Epics 3/4 to Epic 10 on 2026-08-03 (Epics 3 and 4 had already shipped, as spec 053
> and spec 054, without doing that work); see the Traceability table below. Apart from those three, the
> two files do not overlap in scope, and neither renumbers the other; the epics here are
> quality/correctness work, not a launch checklist.

---

## Overview

**Epic numbers ARE the execution order, and consecutive numbers belong to the same lane.** Numbering is
lane-major: run 1 → 2 → 3 → 4 in Lane A, 5 → 6 → 7 in Lane B, and 8 → 9 in Lane C. Lanes A and B may run
**in parallel in separate git worktrees**; within a lane, order is sequential and load-bearing.

| Lane | Epics | Theme | Parallel with |
|---|---|---|---|
| **A** | 1 → 2 → 3 → 4 | Correctness: classifier, grading, payments, handlers | Lane B |
| **B** | 5 → 6 → 7 | Content: audio, lesson surface, QA/UX | Lane A |
| **C** | 8, 9 | Repo-wide gates (lint sweep, CSP, docs); legacy `correct_col` retirement | **nothing** — each runs alone; 8 runs before both lanes start or after both merge, 9 runs only after Epic 1/spec 051 has merged |

**Hard dependencies inside a lane:** Epic 2 consumes the multi-column detector contract Epic 1 establishes;
Epic 6's lesson-content verification consumes Epic 5's audio (a lesson translated but not voiced is worse
than silent — `lesson-editor.md`). Epic 8 is isolated because its lint sweep (`eslint --fix`) touches the
whole tree and would conflict with every open branch. Epic 9 is likewise isolated, for a different reason:
its 22-file mechanical sweep across server and frontend overlaps concrete files Lane A is still touching
(`server/predicates.js`, `server/answerSetInvariant.js`, `server/evaluateMoveHandler.js` vs. Epic 2's
`server/classifier.js`/`llmCoachHelpers.js` and Epic 4's `server/index.js` handlers/`classifier.js`) —
running it concurrently with the rest of Lane A means repeatedly hand-merging the same files. Epic 9's
dependency is specifically on **spec 051 having shipped/merged** (not merely on Epic 1 being underway) — a
between-lanes constraint, not a within-Lane-A sequencing one — so it does not slot into the 1→2→3→4 chain;
it does **not** need to wait for the rest of Lane A (2–4) to finish, only for 051.

**Cross-lane cautions** (worktrees isolate files, not these): one local Supabase DB, one c4solver, and a
**120-req/min per-IP API limit shared with browser QA** ([`project_api_rate_limit_breaks_bulk_scripts`]) —
do not run two bulk/generation passes at once. Both lanes also edit this file (via `/epics-manager`'s
`epic_fix` stage), `staging_checks.md`, `specs/index.md`, and `docs/open_issues.md`; expect to hand-merge
those four. Run `eval "$(./worktree-ports.sh)"` in every worktree before starting or killing any server.

| # | Lane | Epic | Open issues | Primary surface | Stories | Verdict |
|---|---|------|-------------|-----------------|---------|---------|
| **1** | A | Pattern Acceptance: multi-column answers + solver-safety invariant | OI-75, OI-61(1) | `server/predicates.js`, `server/candidate-generator.js`, `server/categories.js` + `src/lib/categories.js`, `server/answerSetInvariant.js`, `classifier.js` detectors, `evaluateMoveHandler.js`, `ChallengeScreen.jsx`, a new schema migration | 6 (exceeds the 3–5 bar — see epic note) | Full speckit |
| **2** | A | Detector Perspective Soundness & Blunder Tag Taxonomy | OI-76, OI-60, OI-48, OI-33, OI-30 | `server/classifier.js`, `server/llmCoachHelpers.js`, blunder fixtures | 5 | Full speckit |
| **3** | A | Entitlement & Payments Consolidation | OI-66, OI-39, OI-55, OI-34, OI-41, OI-25 | lesson routes, tier-gate call sites, `paddleProcessor.js`, `pricing.html` | 5 | Full speckit |
| **4** | A | Server/API Data Integrity & Environment Correctness | OI-40, OI-53, OI-17, OI-47, OI-50, OI-22, OI-49, OI-5, OI-14, OI-31, OI-51, OI-52 | `server/index.js` handlers, `userHelpers.js`, `classifier.js`, `vite.config.js`, migrations/ops | 4 | Full speckit |
| **5** | B | Audio Verification & TTS Management *(rescoped 2026-07-29 — bulk generation already shipped)* | OI-42, OI-45, OI-26, OI-23, OI-28, OI-32; verify-and-close OI-65, OI-27 | `/admin/audio` (`AdminAudioPage.jsx`), `server/lessonAudio.js`, `server/index.js` TTS routes, `lessons/*.json` | 3 | Full speckit |
| **6** | B | Lesson Learning Surface & Authoring Polish | OI-46, OI-44, OI-68, OI-69, OI-63, OI-73, OI-19, OI-62; count-only fix for OI-38 (translation deferred) | `SocraticScreen.jsx`, `Board.jsx`, `admin/SlideEditor.jsx`, lesson tooling, i18n, KB | 5 | Full speckit |
| **7** | B | QA Backlog & Product/UX Decisions | OI-35, OI-21, OI-37 | nav stack, onboarding entry, ReviewScreen, `agentic_QA_2026-07-15-1321.md` | 3 | Brainstorm-first, then speckit |
| **8** | C | Dev Infrastructure & Test-Quality Baseline | OI-70, OI-71, OI-16, OI-29, OI-58, OI-6, OI-72 | `eslint.config.js`, `tests/dom/`, `SplitReveal.jsx`, CSP on `main` | 3 | Full speckit |
| **9** | C | Legacy `correct_col` Scalar Retirement *(depends on Epic 1/spec 051 having merged)* | OI-81 | `server/index.js`, `server/candidate-generator.js`, `server/predicates.js`, `server/answerSetInvariant.js`, `server/evaluateMoveHandler.js`, `ChallengeScreen.jsx`, a column-drop migration | 5 | Full speckit |

---

## Already resolved — excluded from every epic

Verified against the working tree on **2026-07-29**; `docs/open_issues.md` still shows several of these as
open and should be updated when the first epic lands.

> ⚠️ **These are point-in-time measurements and this repo has concurrent sessions.** A parallel session
> shipped lesson audio (and an `InfoProsePanel` extraction) *during* the writing of this file — see the
> superseded-measurement warning in Epic 5. Re-verify any row here before acting on it, and re-measure an
> epic's `Non-obvious facts` at the start of its `/epics-manager` run rather than trusting the numbers
> below. [[feedback_concurrent_agents_clobber]]

| Issue | Status in doc | Evidence in code |
|---|---|---|
| OI-1 | 📋 SPEC-READY | `src/screens/ChallengeScreen.jsx` — `usesAcceptedGate = isMultiSolutionCategory \|\| SINGLE_ANSWER_CATEGORIES.has(effectiveCategory)` (spec 049 T012 shipped) |
| OI-15 | 📋 SPEC-READY | `src/i18n/index.js` — `es: { translation: es }` registered, `lng: readStoredLang('en')` |
| OI-12 | deferred | `DeepRevealPane.jsx` imports `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS`; the fixed 6 s timeout is gone |
| OI-24 | deferred | `SettingsScreen.jsx` imports and renders `UpgradeModal` (Subscription section) |
| OI-77 | open | `ConceptScreen.jsx` splits `infoProse` on `/\n\s*\n/` and maps to paragraphs |
| OI-18 / OI-36 / OI-64.2 (text) | open/partial | all 15 `lessons/lesson-*.json` carry `text_es` (8–15 fields each) — only the **audio** half remains (→ Epic 5) |
| OI-19 (`ReviewScreen`) | open | `title="Review"` is gone; **`PlayOnlineScreen.jsx:428,522` still hardcoded** → Epic 6 |
| OI-9, OI-43, OI-64 | open/partial | fully subsumed by OI-65 → Epic 5 |

Already marked resolved in the doc and likewise excluded: OI-2, 3, 4, 7, 8, 10, 11, 13, 20, 54, 56, 57, 59,
67, 74.

---

## Epic 1 — Pattern Acceptance: multi-column answers + solver-safety invariant

> **Sizing note (owner directive, 2026-07-29):** this epic runs **6 user stories**, above the file's 3–5
> story bar, because the owner's architectural directive (below) added a schema-migration+backfill story
> and a request/response-contract story on top of the four originally scoped. Flagged here rather than
> force-compressed — see "Owner architectural directive" for why the extra scope is load-bearing, not
> gold-plating.

**Intent:** Make "does this move demonstrate the taught pattern?" a *set*-valued, solver-safe question for
**every** category, computed **once, at generation time, and stored** — not re-derived independently by the
generator and the grader, and not re-swept at serving time for every request. A drill must accept every
column that genuinely creates the pattern, and must reject a column that creates the pattern while handing
the opponent a win or a fork worse than the board's own optimum. Grading has exactly two branches: read the
stored set for a real puzzle row, or compute it live for a row-less board (lesson inline challenges have no
puzzle row to read from) — both branches share one solver-safety definition, not two.

**Issues covered**
- **OI-75** — `odd_even_threat` is in neither `MULTI_SOLUTION_CATEGORIES` nor `SINGLE_ANSWER_CATEGORIES`, so
  `ChallengeScreen` grades it on solver score alone and the authored `correctCol` is never consulted.
  Masked today only because lesson 07's two boards happen to have the taught column *be* the unique solver
  optimum.
- **OI-61 item 1** — `evalUndercut` (the row-less grading path) accepts any non-killing column, including
  ones that lose outright, AND `checkUndercutPredicate` (the generation path, `candidate-generator.js`)
  builds the same overly-broad set with no score check at all — the defect is duplicated, not singular; the
  `answerSetInvariant` LOST-POSITION exemption is exactly where undercut boards live, so neither copy is
  caught by the existing aggregate invariant check.

**Settled decisions** (owner, 2026-07-29)
1. **A pattern condition can be met by more than one column.** This is a project-wide invariant across all
   classifiers, not an `odd_even_threat` special case. `evalDoubleThreat` is the reference implementation for
   the **return contract only** — `{ result: 'correct'|'wrong'|'tied', correctCol, tiedWith, ... }`. Its
   per-column sweep is **not** copy-pasteable: `evalUndercut`/`evalOvercut` read `highlightMetadata`
   (cells/roles), `evalFigure7`/`evalJShape`/`evalOddEvenThreat` read `puzzle.correctCol`, and `evalZThreat`
   reads `highlightMetadata.column` — three different input shapes, so each evaluator's *set enumeration*
   must be worked per-evaluator even though they all emit the same tri-state contract.
2. **Solving a drill must be solver-safe.** If playing the pattern column concedes more than the board's own
   optimum already concedes, that board is **not a valid puzzle for the category** — the fix belongs at
   generation and validation time, not only at grading time. `evalDoubleThreat`'s
   `if (!(scores[col] > 0)) continue` ("a structural fork that still loses is not the answer") is the
   existing precedent for a gate, generalized below into a floor that also covers lost positions.
3. Acceptance is **pattern membership ∧ solver safety** — never solver score alone. After the owner
   directive (below), every category IS graded against a *stored* value — the invariant is that the stored
   value is a solver-gated **set** computed once by the pattern detector, never a hand-picked scalar and
   never re-derived by a second, independent implementation.
4. `odd_even_threat` becomes a **graded** category under the new set-valued model (it is not dropped, and its
   stored `correctCol` is not deleted — it is widened alongside every other category's answer, per the
   directive).
5. **Solver-safety floor is *relative*, not absolute** (resolves this epic's former Open Question). A column
   `C` is solver-safe iff `C ∈ optimalCols(scores)` — it does not make the position worse than the board's
   own optimum already is. This is one uniform definition for won *and* lost boards, with no per-category
   allowlist: on a won board it means `scores[C] > 0`-and-best; on a lost board (every legal move loses) it
   means C is among the slowest losses, which is exactly what keeps `undercut` (a category that by
   construction only fires on `scores[C] < 0` boards) alive as a category instead of emptying its accepted
   set. The LOST-POSITION passing verdict in `classifyAnswerSet` therefore **survives**, reinterpreted under
   the relative floor rather than exempted from safety checking altogether. Per `answerSetInvariant.js`'s own
   "import it; do not restate it" instruction (added after a real duplication-and-drift incident — see its
   header comment), this floor rule must be added **inside** `answerSetInvariant.js`, not beside it.
6. `claimeven` gets **no uniqueness constraint.** An earlier proposal to force claimeven boards to have
   exactly one correct column is dropped: once every category's answer is a stored, solver-gated set (item 7
   below), the constraint is unnecessary and would discard otherwise-valid multi-column claimeven boards for
   no benefit.
7. **The answer set is computed once, at generation time, and stored — not derived twice.** (Owner
   architectural directive, 2026-07-29 — supersedes an earlier draft's "add a parity test between the
   generator and the grader" recommendation; a parity *test* would leave two implementations that can still
   drift apart the next time either is edited. See "Owner architectural directive" below for the full target
   architecture, which this epic must implement, not just document.)

### Owner architectural directive

Verbatim intent: *"We must ensure the processing time is done at puzzle generation and not at serving time.
In fact, can't we do that for all puzzles? Store a list of correct cols so they are computed once."* — and,
on the two-derivation-paths question: *"it should be computed once."*

This is not a new idea in the codebase — it is the existing design, stopped one step short.
`connect-four/server/migrations/016_correct_col.sql` already adds a **scalar** `correct_col integer` to both
`puzzles` and `candidates`, with the verbatim rationale *"where the correct column is computed at generation
time and stored for play-time evaluation."* Today, however, `ChallengeScreen.jsx:264` reads
`current.correct_col` off the client's local puzzle object and POSTs it back as `correctCol` in the
`/api/evaluate-move` request body; `evaluateMoveHandler.js`'s handler destructures
`{ movestring, col, category, correctCol, highlightMetadata }` straight from `req.body` (no puzzle-id lookup
of any kind happens in this handler today) — so the server currently grades against a value the **client**
supplied, not one it looked up itself.

**Target architecture:**
1. **Generation computes and stores a SET.** Widen the stored answer from a scalar to a column array
   (`correct_cols integer[]`, or equivalent) on both `puzzles` and `candidates`. It is populated at
   generation time by the pattern detector, gated by the relative solver-safety floor (Decision 5). All
   expensive work — including `claimeven`'s async, solver-simulating enumeration (`detectClaimeven` calls
   `solver.query` per candidate odd-column) — is paid here, once, offline.
2. **Grading reads the stored set server-side.** `evaluateMoveHandler` looks the puzzle up by id and grades
   against its stored set; the client-supplied answer is no longer authoritative. This requires a
   request-shape change — the client must send the puzzle id (`ChallengeScreen.jsx` already tracks
   `current.id` for analytics, so it is available locally) — and makes the stored set genuinely authoritative
   rather than authoritative-by-convention.
3. **The live evaluator path REMAINS — it is not deleted.** Lesson inline challenges call
   `/api/evaluate-move` with **no puzzle row at all** (memory `project_lesson_interactivity_evaluation`), so
   there is nothing to precompute from. `evaluatePredicate`/`acceptedCols` stay as the row-less fallback and
   continue to serve the lesson gate and the audit script. Grading therefore has two clearly-specified
   branches — stored-set (puzzle rows) and computed-live (row-less boards) — and the relative-floor safety
   rule must be shared by both, defined once inside `answerSetInvariant.js`.
4. **`claimeven` gets no uniqueness constraint** (Decision 6) — enumerate and store its set like every other
   category, rather than forcing a single answer or exempting it from the stored-set model.

**Non-obvious facts** (verified 2026-07-29, at the named symbol, in this worktree)

*Set-valued seam and duplication*
- The set-valued seam **already exists** on the row-less/computed-live path:
  `server/answerSetInvariant.js#acceptedCols` sweeps `legalCols(scores)` through `evaluatePredicate` and
  treats `'tied'` as acceptance. Generalizing the evaluators is additive at that seam, not a rewrite of it.
- The answer set is derived **twice, by two independent implementations**, today:
  - Generation side: `candidate-generator.js#checkPredicateRaw` routes seven categories to private functions
    — `checkZThreatPredicate`, `checkClaimevenPredicate`, `checkUndercutPredicate`, `checkOvercutPredicate`,
    `checkFigure7Predicate`, `checkJShapePredicate`, `checkOddEvenThreatPredicate` — each with its own
    per-category logic to compute `correctCols`. None of the seven calls `evaluatePredicate`.
  - Grading side: `predicates.js#evaluatePredicate` dispatches to `evalZThreat` / `evalClaimeven` /
    `evalUndercut` / `evalOvercut` / `evalFigure7` / `evalJShape` / `evalOddEvenThreat` — six of these seven
    are pure single-column equality against `puzzle.correctCol` or a `highlightMetadata` cell role, and
    consult no solver score at all; only `evalUndercut` even inspects `highlightMetadata`, and it does so
    without any score check.
  - `checkPredicate` (the exported wrapper, distinct from `checkPredicateRaw`) DOES apply one shared
    cross-cutting guard after calling `checkPredicateRaw`: `answerSetHolds(result.correctCols, scores)` from
    `answerSetInvariant.js`, for every category except `forbidden_columns`. This is a real, already-shared
    generation-time gate — but it only checks the **aggregate** invariant
    (`optimalCols ⊆ correctCols` and `correctCols ∩ optimalCols ≠ ∅`, or the LOST-POSITION exemption); it
    does not verify that *every individual* column in `correctCols` is itself safe. This is precisely why the
    undercut defect survives it: `checkUndercutPredicate` returns every non-killing column as "correct" with
    no per-column score check, the board is typically a losing position for the mover, `classifyAnswerSet`
    returns the passing verdict `LOST-POSITION`, and the aggregate check never inspects the individual unsafe
    columns inside that set.
  - **Net:** the OI-61 item 1 defect is duplicated — fixing `evalUndercut` alone leaves `checkUndercutPredicate`
    admitting the same unsafe boards at generation time.
- `evaluateMoveHandler.js`'s `req.body` destructure (`{ movestring, col, category, correctCol,
  highlightMetadata }`) and `ChallengeScreen.jsx:264`'s `correctCol: current.correct_col` /
  `highlightMetadata: current.highlight_metadata` POST confirm the client-supplies-the-answer gap the owner
  directive closes.
- `migrations/016_correct_col.sql` adds `correct_col integer DEFAULT NULL` (a **scalar**) to both `puzzles`
  and `candidates` — the existing precedent the directive widens to an array; the latest migration in the
  tree is `060_paddle_rename_and_payment_events.sql`, so the new migration is the next number after that.

*Detector enumerability (resolves the former "one task per evaluator" framing — costs differ by detector)*
- **Tier A — cheap, already sweeps every column, just returns early.** `checkFigure7Predicate` and
  `checkJShapePredicate` already loop `for (let col = 0; col < 7; col++)` trying every column and calling
  `detectFigure7`/`detectJShape` on each, but `return` on the **first** match instead of accumulating all
  matches. Converting these two to a full set is a small, local change to an existing loop.
- **Tier B — the underlying detector must be changed to return all matches, not one.**
  `detectZThreat`/`checkZThreatPredicate` and `detectOvercut`/`checkOvercutPredicate` compute the pattern
  once for the whole board / one column at a time and return a single `column`; there is no existing loop to
  widen — the detector itself needs a set-returning mode.
- **Tier C — async and solver-simulating; do not sweep live.** `export async function
  detectClaimeven(board, solver, perspective = board.currentPlayer)` calls into the solver process
  (indirectly, via its odd/even-column classification which the caller feeds solver-derived `scores`) and is
  `async`; sweeping it per-request at serving time is the exact cost the owner directive's "computed at
  generation, not serving time" principle rules out. Its set must be enumerated once at generation and
  stored — never swept live.
- `odd_even_threat` is **already Tier A-plus**: `checkOddEvenThreatPredicate` already does
  `correctCols: result.correctCols ?? [result.correctCol]`, and `detectOddEvenThreat`'s Step 3 already builds
  a `correctCols` array gated in-loop by `if (!scores || scores[col] <= 0) continue` before pushing a
  candidate column. **Correction to an earlier draft of this epic:** `detectOddEvenThreat` does NOT return
  only `{ matched, cells }` — that shape is only what its FR-033 (`perspective !== currentPlayer`) recursion
  branch returns; the base-case return already carries `correctCols`. The one real gap is narrower than
  previously stated: `evalOddEvenThreat(candidateCol, puzzle)` reads only `puzzle.correctCol` and is never
  handed `scores`, even though `evaluatePredicate(puzzle, candidateCol, scores)` already has `scores` in
  scope to pass through.

*Registry and invariant details*
- `docs/architecture/server-conventions.md` §Predicate Evaluator currently states the now-superseded
  rationale for why `SINGLE_ANSWER_CATEGORIES` compare against a scalar: *"For the six
  `SINGLE_ANSWER_CATEGORIES` the detectors are instance detectors — they return their first match and a
  single column, so there is no cheap way to enumerate a set."* This must be rewritten once the detector-tier
  work above lands, since it stops being true category-by-category.
- `categories.js` (both `connect-four/server/categories.js` and `connect-four/src/lib/categories.js`,
  hand-mirrored) carries an explicit comment that `SINGLE_ANSWER_CATEGORIES` **MUST NOT** be derived by
  negation from `MULTI_SOLUTION_CATEGORIES`. Per the owner directive, both sets are **kept as-is** for this
  epic (no rename, no merge) — `odd_even_threat` is simply added to `SINGLE_ANSWER_CATEGORIES` in both files,
  purely to route it through the `accepted`-field gate in `evaluateMoveHandler.js`
  (`MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category)`). Both files' in-code
  comments must be reworded to say the sets gate the `accepted` field, not that they describe answer
  cardinality (which stops being an accurate distinction once every category has a stored set).
  `tests/integration/evaluateMoveMultiSolution.test.js` asserts on the **literal source text**
  `MULTI_SOLUTION_CATEGORIES.has(effectiveCategory)`, so a rename (not planned, but noted for the next
  reader) would break `test:fast` by regex match, not by behaviour.
- `classifyAnswerSet` (in `answerSetInvariant.js`) returns `LOST-POSITION` (a **passing** verdict) whenever
  `scores[optimal[0]] < 0`, with an in-code rationale naming undercut as the motivating case. Decision 5
  above reconciles this: the exemption survives, reinterpreted as "the relative floor still applies, it's
  just relative to a losing optimum."
- Answer-set enforcement runs at three points today (OI-61 update, 2026-07-28):
  `candidate-generator.js#checkPredicate`, `tests/lessons/lessonAnswerSets.test.js` (blocking, in `test` and
  `test:fast`), and `server/scripts/audit_answer_ambiguity.mjs`. Current state: lessons 39/39, local DB
  295/295. All three must be re-run after the stored-set migration, since the backfill changes what
  "current DB state" means.
- `detectOddEvenThreat(board, scores, perspective = board.currentPlayer, solver = null)` has an FR-033
  recursion branch for `perspective !== currentPlayer` used only when a `solver` is passed; the
  perspective-soundness question for this detector belongs to Epic 2, not here.

**Authoritative sources of truth**
- `docs/open_issues.md` — OI-75, OI-61, OI-1 (the shared modelling question)
- `docs/architecture/server-conventions.md` §Predicate Evaluator, §Category Registry, §"Undercut has two
  sides", §Classifier vs Predicate Evaluator
- `docs/architecture/data-model.md`, `docs/architecture/db-schema.md` — read before writing the migration
- `docs/knowledge-base/README.md` + the entry per category touched (`formal_predicate` is the spec,
  `false_positives` are tests you must not break)
- `connect-four/server/answerSetInvariant.js` (the invariant, in code, with its rationale comments — import
  it, do not restate it)
- `connect-four/server/migrations/016_correct_col.sql` (the scalar precedent this epic widens)
- `connect-four/server/evaluateMoveHandler.js`, `connect-four/src/screens/ChallengeScreen.jsx` (the
  request/response contract this epic changes)
- `docs/architecture/testing-conventions.md`; `CLAUDE.md` §Running tests (`npm run test:fast`)

**User stories & tasks**

**US1.1 — Set-valued acceptance contract & relative solver-safety floor (7 tasks).** Document the
`{ result, correctCol, tiedWith, … }` tri-state contract in `server-conventions.md`, citing `evalDoubleThreat`
as the contract's reference implementation (not its sweep — three different evaluators read three different
input shapes, per Settled decision 1); define the relative solver-safety floor (`C ∈ optimalCols(scores)`,
Decision 5) as code inside `answerSetInvariant.js`, per its own "import it, do not restate it" instruction;
unit-test the floor against a won board (absolute case reduces correctly) and a fully-lost board (relative
case keeps at least the slowest-loss columns safe); unit-test the tri-state contract against a board with 2+
qualifying columns and one with exactly one; assert `'tied'` propagates through `acceptedCols`; add a fixture
proving a pattern-qualifying but unsafe (worse-than-optimum) column is excluded; rewrite
`server-conventions.md` §Predicate Evaluator's "instance detectors, no cheap way to enumerate a set"
paragraph, since it stops being true once US1.4's tiered conversions land.

**US1.2 — Solver-safety gate on the undercut generation path (OI-61 item 1) (6 tasks).** Add a per-column
relative-floor check inside `checkUndercutPredicate` (`candidate-generator.js`) — today it marks every column
except the killing column "correct" with no score check at all, independent of and in addition to
`evalUndercut`'s equivalent gap; fix `evalUndercut` (`predicates.js`) to apply the same floor on the
row-less/computed-live path; add a test confirming the LOST-POSITION exemption survives under the relative
floor rather than silently disappearing (Decision 5); add a red-first fixture — an undercut board where a
non-killing column concedes a fork worse than the board's own optimum — and assert it is excluded on both
paths; re-run `audit_answer_ambiguity.mjs --puzzles undercut` and record the before/after row counts; update
`docs/open_issues.md` OI-61 item 1's closeout.

**US1.3 — `odd_even_threat` becomes graded (5 tasks, narrower than an earlier draft — see Non-obvious
facts).** Thread `scores` through `evaluatePredicate` into `evalOddEvenThreat` so it stops reading only
`puzzle.correctCol` and instead accepts membership in the already-computed `correctCols` set (no detector
change needed — `detectOddEvenThreat`/`checkOddEvenThreatPredicate` already produce it); add `odd_even_threat`
to `SINGLE_ANSWER_CATEGORIES` in **both** `server/categories.js` and `src/lib/categories.js`, rewording both
files' in-code comments to describe gating the `accepted` field rather than answer cardinality; verify lesson
07's two boards (`3553515566110063` cc 3, `3411022114433433` cc 2) still pass `lessonAnswerSets.test.js`; add
a board where 2+ columns create the odd threat and assert both grade correct; add a board where the odd-threat
column concedes a fork and assert it is rejected as an invalid puzzle under the relative floor.

**US1.4 — Roll the model across the remaining evaluators, tiered by enumeration cost (8 tasks).** Tier A
(cheap): convert `checkFigure7Predicate`/`checkJShapePredicate`'s existing per-column loops from "return on
first match" to "accumulate all matches", and generalize `evalFigure7`/`evalJShape` to set membership against
the stored set. Tier B (detector must change): extend `detectZThreat`/`checkZThreatPredicate` and
`detectOvercut`/`checkOvercutPredicate` to return every matching column, not one, and generalize
`evalZThreat`/`evalOvercut` to set membership. Tier C (`claimeven`, async + solver-simulating): do **not**
add a live sweep; fold its set-enumeration entirely into the generation-time stored-set work (US1.5) — no
serving-time cost, no exemption needed. Re-run the three enforcement points
(`checkPredicate`/`lessonAnswerSets.test.js`/`audit_answer_ambiguity.mjs`) after each tier; re-audit the full
DB pool; record any board the new invariant rejects and replace rather than exempt it.

**US1.5 — Schema migration + backfill: store the answer set once (8 tasks, new — owner architectural
directive).** Add a migration (next number after `060_paddle_rename_and_payment_events.sql`) adding
`correct_cols integer[]` to both `puzzles` and `candidates`, alongside the existing scalar `correct_col`;
populate `correct_cols` at generation time from the now-generalized `checkPredicateRaw` branches, gated by the
relative solver-safety floor; write a backfill script that recomputes `correct_cols` for every existing
active puzzle and candidate row using the new solver-gated detectors (including `claimeven`, enumerated once
here rather than swept live); decide and state explicitly the fate of the legacy scalar `correct_col` — keep
it in sync for compatibility, or drop it once all consumers move to the array (pick one; do not leave it
ambiguous); verify the backfilled DB against `audit_answer_ambiguity.mjs` (0 failures); test migration/backfill
idempotency (re-running it twice produces the same `correct_cols`); update
`docs/architecture/data-model.md`/`db-schema.md` with the new column.

**US1.6 — Grading contract: stored-set branch + computed-live branch (8 tasks, new — owner architectural
directive).** Add a stored-set grading branch to `evaluateMoveHandler.js` that looks the puzzle up by id
(the client must now send `puzzleId`; `ChallengeScreen.jsx` already holds `current.id`) and grades against
`puzzle.correct_cols` server-side, no longer trusting the client-supplied `correctCol`/`highlightMetadata` for
that branch; keep the existing `evaluatePredicate`/`acceptedCols` computed-live path unchanged for row-less
boards (lesson inline challenges call `/api/evaluate-move` with no puzzle row — memory
`project_lesson_interactivity_evaluation`); ensure both branches call the **same** relative-floor safety
function from `answerSetInvariant.js` rather than each encoding their own; update `ChallengeScreen.jsx` to
send `puzzleId` in the `/api/evaluate-move` request body; update
`docs/architecture/api-conventions.md` for the `/api/evaluate-move` request-shape change; add a test that the
stored-set branch grades a multi-column DB puzzle correctly and a separate test that a row-less (lesson-style)
call is unaffected; decide and document what happens on an old client request that supplies neither
`puzzleId` nor a row-less shape (hard-reject vs. graceful fallback to the computed-live path) — do not leave
this unspecified; update `docs/open_issues.md` closeouts for OI-75 and OI-61 item 1 reflecting the shipped
shape.

**Acceptance criteria**
- Every category's stored answer is a **solver-gated set produced once by the pattern detector at generation
  time** — never a hand-picked scalar, and never independently re-derived by a second implementation at
  serving time. (Supersedes the earlier "no category graded by stored-column equality alone" wording: after
  this epic every category IS graded against a stored value; the invariant is about how that value is
  computed, not whether it exists.)
- A board whose taught column concedes a win or fork worse than the board's own optimum (the relative floor,
  Decision 5) fails `checkPredicateRaw`/`checkPredicate` at generation and fails the lesson answer-set test.
- Grading has exactly two branches — stored-set (puzzle rows, looked up by id) and computed-live (row-less
  boards) — and both share one relative-floor safety definition living in `answerSetInvariant.js`. No third,
  independent derivation of the answer set exists anywhere in the codebase.
- `npm run test:fast` green; `audit_answer_ambiguity.mjs` reports 0 failures for lessons and the local DB,
  re-run against the post-backfill data.
- `server/categories.js` and `src/lib/categories.js` agree (a test asserts it); their `SINGLE_ANSWER_CATEGORIES`
  / `MULTI_SOLUTION_CATEGORIES` in-code comments describe gating the `accepted` field, not answer cardinality.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Changing which categories exist, or adding a new puzzle category.
- The `perspective`-parameter soundness of any detector (Epic 2) — **except** the narrow, in-scope change of
  converting `detectZThreat`/`detectOvercut` (and the already-column-sweeping
  `checkFigure7Predicate`/`checkJShapePredicate`) from first-match to all-matches returns. That IS detector
  surgery, of a different kind than Epic 2's perspective-soundness work — called out explicitly so the
  boundary between the two epics is unambiguous.
- The serving-pool filter and `puzzle_attempts.outcome` enum question (OI-49, Epic 4).
- Re-designing `highlight_metadata` shapes.
- Removing the row-less `evaluatePredicate`/`acceptedCols` computed-live path — it keeps serving lesson
  inline challenges and the audit script.
- Retiring the legacy `correct_col` scalar (migrating every remaining consumer off it, then dropping the
  column) — split out to its own future epic; see "### Deferred" below.

### Deferred

- **Legacy `correct_col` scalar retirement — split out to `docs/open_issues.md` OI-81 (2026-07-29).**
  US1.5's original plan ("Decision B") was to migrate every `correct_col` consumer and drop the column in
  the same feature as spec 051. The owner reversed that decision once the consumer inventory was actually
  re-derived against the worktree: **105 references across 22 files**, not the 62/11 estimate the decision
  had been made on, sitting on top of an already-large feature (schema migration + backfill + API contract
  change). Spec 051 instead keeps `correct_col` **in sync** as `correct_cols[0]` (a deliberate, temporary
  duplicate) for this epic's scope; the full retirement — including the 22-file inventory, the camelCase
  `correctCol` lesson-content carve-out, and the upstream-only (`gameSampling.js`/`debug-claimeven.js`)
  checks — is preserved verbatim in OI-81 for a future epic to pick up.

**Open questions**
- ~~US1.5 must decide, and state in the spec, whether the legacy scalar `correct_col` is kept in sync
  indefinitely (compatibility) or dropped once all consumers read `correct_cols`~~ — **Resolved 2026-07-29**:
  kept in sync for this feature (spec 051 FR-017); full retirement deferred, see "### Deferred" above and
  OI-81.
- US1.6 must decide, and state in the spec, the behaviour of `/api/evaluate-move` when a request supplies
  neither a `puzzleId` nor a row-less (lesson-style) shape — hard-reject as a malformed request, or fall back
  to the computed-live path. Left open deliberately; not a re-litigation of a settled decision.

---

## Epic 2 — Detector Perspective Soundness & Blunder Tag Taxonomy

**Intent:** Finish the OI-74 cleanup across the remaining detectors and stop the blunder vocabulary from
mislabelling what the player actually did. These tags are stored and user-visible, so every change is a
content migration as much as a code change.

**Issues covered:** OI-76 (`detectOvercut` mixes one player's threats with the other's score sign — literally
the OI-74 defect), OI-60 (the taught gravity-top-adjacent overcut is never tagged), OI-48 (a win-forfeiting
move is tagged `drawing_move`), OI-33 (distinct-second-fork over-suppression + `candidate-generator` classify
path outside `test:fast`), OI-30 (`figure_7` and siblings are unreachable on live user moves).

**Settled decisions**
1. **OI-76 resolves by mirroring undercut: drop `perspective`.** Split `detectOvercut` into two role-named
   functions (victim/beneficiary) that each anchor on the side to move, exactly as the undercut detector was
   already fixed (`docs/architecture/server-conventions.md` §"Undercut has two sides"). Do **not** take the
   FR-033 child-position-recursion route. Blocking constraint: `overcut` sits in `MISSED_OWN_PRIORITY`
   (`classifier.js:1961`), evaluated on `moves + correctCol` where the tagged player is **not** the mover, so
   production always takes the unsound branch today and stored blunder tags **will** change — every fixture
   diff must be read and approved.
2. Epic 1's "a condition can be met by more than one column" invariant applies to detectors too: where a
   detector reports a single cell/column for a pattern that can arise from several, report the set. **This is
   already satisfied for every detector this epic touches** — spec 051 T015 converted `detectOvercut` (and
   undercut, z-threat, claimeven) to accumulate matches and return `correctCols` (`classifier.js:1025–1073`).
   No story in this epic may re-do this conversion; treat it as a precondition, not a task.
3. Blunder-tag changes are validated per `reason-INVARIANTS.md` **I12** — full case space plus a
   counterexample per case, through the production detector, not the motivating example.
4. **OI-60 resolves by extending the detector, not re-scoping the lesson.** Add a branch to `detectOvercut`
   so the gravity-top-adjacent shape lesson 12 teaches becomes a real, first-class match.
   `docs/knowledge-base/community-overcut.md` already documents this "active forcing" sub-case as part of the
   concept, so the detector is incomplete relative to the theory — the lesson is not over-claiming. This is a
   content migration and must be validated per I12: full case space, one counterexample per branch.

**Non-obvious facts**
- OI-76's blast radius: `overcut` is in `MISSED_OWN_PRIORITY` (`tagBlunder` Phase C), evaluated on
  `moves + correctCol` where the blunderer is **not** the mover — i.e. always the unsound branch. Changing it
  changes stored, user-visible tags.
- **Do not "fix" `detectFigure7`/`detectJShape`.** Their second parameter is `_scores` and is genuinely
  unused; they are pure kernel convolutions over `perspective`'s own discs and are sound for any perspective.
  OI-76 says this explicitly after a first draft got it wrong by argument shape.
- OI-30's cost trap: the multi-tag detectors are `async` and several call the solver
  (`detectZThreat`, `detectOddEvenThreat`, `detectClaimeven`), unlike the pure geometry checks `classify()`
  uses on the live per-move path.
- Any creation-pattern added to `classify()` needs the **absent→present transition gate** from day one, or it
  reproduces the repeat bug the gate was built for (memory `project_coach_creation_transition_gate`).
- OI-33 #1 needs a per-column diff, not the boolean `hasDoubleThreat`, to recognise a genuinely new fork
  alongside an existing one.
- `candidate-generator.test.js` is excluded from `test:fast` by design (solver IPC hang, `CLAUDE.md`), so
  `candidate-generator.js`'s `cls.tag` consumer (`if (cls?.tag) tags.push(cls.tag);`, currently line 668 —
  prefer locating it by this line, the number drifts) has no fast-suite coverage.
- **The `active_forcing` label is contested, not settled.** `classifier.js:1052` currently emits
  `reason: 'active_forcing'` on the `isT5Exception` branch, but `community-overcut.md`'s `statement` block
  defines *active forcing* as its own distinct sub-case ("the current player plays into the column
  voluntarily with odd-column parity, blocking the opponent's lower threat and immediately threatening from
  R") — the exact shape lesson 12 teaches and the subject of Settled decision 4's new branch. The likely
  resolution is to rename the misapplied T5 branch to something T5-specific (e.g. `t5_row3_row6`) and reserve
  `active_forcing` for the new first-class branch, but this is an **open question** (see below), not an
  instruction to execute silently.
- Spec 051 already converted `detectOvercut` (and undercut, z-threat, claimeven) to accumulate matches and
  return `correctCols` (`classifier.js:1025–1073`) — see Settled decision 2.
- OI-60's body text says "lesson 07 (overcut)"; the real file is `lessons/lesson-12-overcut.json`. This epic's
  "lesson 12" references are correct — the OI-60 text itself needs correcting during closeout.

**Authoritative sources of truth**
- `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`,
  `blunder-reason-evidence.md` — **read all four, in order**, before touching anything reason-adjacent
- `docs/architecture/server-conventions.md` §"Undercut has two sides" (the OI-74 worked resolution; also the
  authoritative precedent for the undercut side of US2.1 — there is no separate undercut KB entry)
- `docs/knowledge-base/community-overcut.md`, `allen-t2.md`, `allen-t4.md`, `allen-t5.md` — the T-rule
  arbiters for US2.2 and the overcut side of US2.1
- `docs/open_issues.md` — OI-74 (resolved, as the template), OI-76, OI-60, OI-48, OI-33, OI-30
- `docs/architecture/reason-AGENT-PREAMBLE.md` — reuse verbatim when prompting a fresh-context agent

**User stories & tasks**

**US2.1 — `detectOvercut` perspective (8 tasks).** Per Settled decision 1, implement the mirror-undercut
resolution directly (no re-decision needed): characterize current behavior with a fixture per branch; split
`detectOvercut` into two role-named functions (victim/beneficiary), each anchored on the side to move, dropping
`perspective`; re-run `tests/blunder/tagBlunderFixtures.test.js` and **read every changed fixture** before
preserving it; re-derive `highlight_metadata` for active `overcut` rows and report whether the pool needs
repair — **first re-measure**: per OI-61's 2026-07-29 closeout the local DB had ZERO active `overcut` puzzle
rows at that time, which would make this a no-op locally, but staging/production may differ and must be
checked before planning around a no-op; document in `server-conventions.md`.

**US2.2 — Overcut case taxonomy (7 tasks).** Implement Settled decision 4: add the gravity-top-adjacent branch
to `detectOvercut` per `community-overcut.md`'s active-forcing sub-case. Resolve the **open question** on the
`active_forcing` label (see Open questions) and record the answer in `reason-DECISIONS.md` before touching
`classifier.js:1052`'s existing `isT5Exception` branch name. Validate per I12 with a counterexample per
T-rule; update lesson 12 copy and the deep-reveal shape naming; add KB cross-references to
`community-overcut.md`/`allen-t2.md`/`allen-t4.md`/`allen-t5.md`.

**US2.3 — `drawing_move` outcome-flip (10-14 tasks).** Name both producers explicitly: `classify()` at
`classifier.js:737` (`if (score === 0) return { tag: 'drawing_move' };` — the live sparring path and the actual
OI-48 repro) and `tagBlunder` Phase E at `classifier.js:2063` (`return { tag: 'drawing_move', direction:
'missed_own', ... }`). Both must be fixed; do not treat one as a stand-in for the other. Note
`reason-case-taxonomy.md:38` already names `win_to_draw` as a first-class **case** — the gap is the **tag**,
not the case, so no taxonomy-doc "add the case" task is needed, only a tag-naming/emission task.
Open decision the spec must take and justify: **mint a new tag + migration + backfill** for the
forfeited-a-forced-win outcome, vs. **keep `drawing_move` and refine its sub-reason/direction field** to
distinguish "best available is a draw" from "a forced win was forfeited." Whichever is chosen, task out all
six registry/i18n/schema touchpoints:
1. Postgres CHECK constraint in `server/migrations/052_blunders_parity_threat_tags.sql`
2. `server/blunderTags.js`
3. `docs/architecture/data-model.md`, `docs/architecture/db-schema.md`, `docs/architecture/server-conventions.md:142`
4. `src/i18n/en.json:894` and `es.json` phrase pools (both locales)
5. `blunderReasons.js`
6. `explainContext.js:415` and `docs/architecture/feature-vector-glossary.md:337`

Plus: counterexample per case per I12; regression fixtures on the near-empty-board repro from OI-48; confirm
the downstream grounding-rule text (Fix 4) still reads correctly.

**US2.4 — Creation-gate residuals (6 tasks).** Replace the boolean `hasDoubleThreat` gate with a per-column
threat diff so a distinct second fork counts as creation; same treatment for `detectForcedWin`; add a
`test:fast`-safe regression covering `candidate-generator.js`'s classify consumer without invoking the real
solver.

**US2.5 — Live coach vocabulary (7 tasks).** Decide which multi-tag tactics earn live praise; measure the
per-move latency cost of each solver-calling detector before adding it; extend `classify()`'s priority chain
with transition-gating for every added pattern; verify the `coach.<tag>.*` phrase pools exist in both
locales; add per-tag round-trip tests.

**Acceptance criteria**
- No detector mixes one player's threats with the other player's score sign; `detectOvercut` drops
  `perspective` per Settled decision 1.
- Every changed blunder tag has a read-and-approved fixture diff; the stored pool is re-derived or explicitly
  reported as needing repair.
- `npm run test:fast` green; the reason-engine docs updated in lockstep (`reason-DECISIONS.md` gains an entry).
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.
  OI-60's body text ("lesson 07") must be corrected to "lesson 12" as part of its closeout.

**NOT included**
- `detectFigure7` / `detectJShape` signature changes.
- The acceptance/grading model (Epic 1).
- Re-generating the puzzle pool for categories whose metadata does not change.

**Open questions**
- The `active_forcing` label: does `classifier.js:1052`'s existing `isT5Exception` branch keep the name
  `active_forcing`, or is it renamed to something T5-specific (e.g. `t5_row3_row6`) so `active_forcing` can be
  reserved for the new first-class branch added under Settled decision 4? `community-overcut.md`'s `statement`
  block defines *active forcing* as its own distinct sub-case, so the two candidate label sets are:
  (a) keep `active_forcing` on the T5 branch, give the new branch a different name, or
  (b) rename the T5 branch to `t5_row3_row6` (or similar) and give `active_forcing` to the new branch, which
  matches the KB's usage and the shape lesson 12 teaches. US2.2 must decide and record this in
  `reason-DECISIONS.md`, not silently pick one.
- US2.3's tag-taxonomy decision (mint a new tag vs. refine `drawing_move`'s sub-reason/direction field) is
  open — see US2.3.

---

## Epic 3 — Entitlement & Payments Consolidation

**Intent:** Make "is this user entitled to this?" one answer, computed server-side by a new
`GET /api/user/entitlement` endpoint, and close the funnel's loose ends — a paid lesson that `curl` returns
for free, five independent tier reads, and a pricing page whose numbers are hand-maintained. The first-payment
identity-forgery window on the money path is deliberately left open (accepted risk, ratified 2026-07-31 —
see Settled decision #4); this epic's payments work is limited to documenting that ratification and closing
out OI-34.

**Issues covered:** OI-66 (paid lesson JSON served to unauthenticated callers), OI-39 (`getSubscriptionStatus`
has no production call site; five tier-gate sites read the client-cached tier — OI-39's text says four and is
stale, see Non-obvious facts), OI-55 (Paddle tier-grant identity is client-supplied; the hardening was a
unilateral judgment call needing review), OI-34 (fallback-only activations skip the `upgrade_completed`
track), OI-41 (bare static pricing page + price drift), OI-25 (paying from `/summary` loses the summary).

**Settled decisions**
1. **Design the single tier-check interface first, then migrate all five call sites together.** OI-39 is
   explicit: do not refactor the call sites piecemeal to "close the issue". (OI-39's own text says four sites;
   a source-level grep found five — see Non-obvious facts. Treat the grep, not the OI text, as authoritative.)
2. Any replacement pricing surface reads prices from the live config endpoint (`GET /api/paddle/config` /
   Paddle.js `PricePreview`), never from static text.
3. The Merchant-of-Record clause, the 14-day refund statement, and the `/terms` link are **Paddle
   domain-review requirements** and must survive any redesign verbatim.
4. **(2026-07-31 owner ratification)** The first-payment forgery window (OI-55) is **accepted, not closed**.
   The current model — repeat payments cross-checked against the stored `users.paddle_customer_id`, first
   payments trusted — is adequate for this app's risk profile, because an attacker must spend real money to
   upgrade a stranger's account. This replaces the earlier "proposal to sanity-check" disclaimer; the
   accepted residual risks (grief-granting; laundering a chargeback-able payment onto a third-party account)
   must be named explicitly where the decision is recorded. No code change to the identity binding.
5. **(2026-07-31)** The tier-check interface (Settled decision #1) is a **single server module** that computes
   the entitlement answer from `users.tier`. **`GET /api/user/entitlement` is a thin wrapper over that
   module**, and the `GET /api/lessons/:id` handler (US3.1) calls the same module **directly** — there is no
   HTTP hop between the two server handlers, and the endpoint is not itself "the code path the lesson gate
   uses." This supersedes the epic's earlier "implement on top of `getSubscriptionStatus`" framing:
   `getSubscriptionStatus` (`connect-four/server/paymentProcessor.js`) is a pure, synchronous
   `tier === 'paid'` ternary with no I/O, so building on it verbatim would gain no new authority. The
   endpoint is backed by a short-TTL client cache with explicit invalidation on checkout return.
   `docs/architecture/server-conventions.md` §PaymentProcessor Seam must be updated in the same change that
   ships the endpoint.
6. **(2026-07-31, superseded same day by the owner's domain-approval ratification below)** ~~The pricing page
   is rebuilt as an in-app React route at `/pricing`... `connect-four/server/pricing.html` stays in place
   until Paddle domain-review compatibility of a JS-rendered route is verified.~~ **Current decision:** Paddle
   has already verified and approved this domain, and approval is granted per domain, not per page — changing
   what `/pricing` serves does not trigger a new review. The pricing page is rebuilt as an **in-app React
   route that takes over `/pricing`** (the SPA catch-all serves it; the existing `res.sendFile` handler for
   `/pricing` in `connect-four/server/index.js` is removed or re-pointed), reusing `src/lib/usePaddlePrices.js`,
   `src/components/UpgradeModal.jsx`'s toggle/savings-badge treatment, the i18n layer, and
   `src/lib/useUpgradeCheckout.js`. `connect-four/server/pricing.html` is **retained** (not deleted) and moves
   to **`/pricing-legal`**, linked from the footer alongside `/terms`, preserving a server-rendered copy of the
   Merchant-of-Record clause, the 14-day refund statement, and the `/terms` link on the approved domain in case
   a future Paddle spot-check does not execute JavaScript. Its hardcoded price literals (`$2.99` / `$21.99` /
   `39%` / `$1.83`) must still be de-hardcoded or removed on both surfaces (closes OI-41's drift risk). The
   `paddle-docs` MCP verification of SPA-route domain-review compatibility (US3.4) drops from a blocking gate
   to a confirmatory note, since no re-submission is required for a content change on an already-approved
   domain.
7. **(2026-07-31)** An unentitled caller of `GET /api/lessons/:id` gets **200 with a redacted stub**:
   `{ id, title, order, free, locked: true }`, with no `slides`. The lesson list endpoint already publishes
   exactly that metadata to every caller, so the stub leaks nothing new, and it lets a locked-lesson screen
   render a real title plus an upgrade CTA instead of an error. `locked: true` is part of the API contract
   US3.1's integration test asserts; document it in `docs/architecture/api-conventions.md`.

**Non-obvious facts**
- Sandbox vs live is selected from the **key prefix**, not `NODE_ENV`/`MODE` (memory
  `project_paddle_integration`).
- OI-39's "four tier-gate sites" text is **stale** — it predates `SagaScreen`/`DeepRevealPane`/
  `useLessonLockGuard` in their current form. A source-level grep of every `.tier` read in `connect-four/src/`
  gives **five** verified sites: `src/screens/SettingsScreen.jsx` (`setTier(profile.tier === 'paid' ? 'paid' :
  'free')`), `src/screens/PostSetSummaryScreen.jsx` (`setIsFreeUser(!profile || profile.tier === 'free')`),
  `src/screens/SagaScreen.jsx` (`.then(p => setTier(p?.tier ?? 'free'))`), `src/components/DeepRevealPane.jsx`
  (`tier: profile?.tier`, feeds `describeQuota`), and `src/lib/useLessonLockGuard.js`
  (`store.getProfile().then(p => p?.tier ?? 'free')`). Locate by symbol, not line — this repo has concurrent
  sessions. **Verified NOT tier readers** (do not re-add these from OI-39's stale text): `src/screens/
  sagaLock.js` (note: `src/screens/`, NOT `src/lib/`) exports pure functions — `deriveLockReason(lesson,
  lessons, progress, tier)` receives tier as a **parameter**, it does not read it; `src/store/
  CheckoutReturnBanner.jsx` (note: `src/store/`, NOT `src/components/`) contains **zero** `.tier` references.
  **Do not conflate the five-site set above with `UpgradeModal`'s five call sites**
  (`SettingsScreen.jsx`, `SetPickerScreen.jsx`, `SagaScreen.jsx`, `PostSetSummaryScreen.jsx`,
  `DeepRevealPane.jsx`) — same size, different purpose (opening the upgrade modal, not reading the tier).
- This app has **no router library** (`react-router`/`wouter` are absent from `connect-four/package.json`).
  Navigation is hand-rolled: a `URL_MAP` table in `src/lib/urlMapping.js`, a `SCREENS` registry in
  `src/lib/screenRegistry.jsx`, and `window.history.pushState` in `src/App.jsx`. Adding the in-app `/pricing`
  route (Settled decision #6) means touching all three files, not just the hooks/components the epic
  otherwise names.
- `connect-four/server/index.js` registers routes in order and Express matches on registration order.
  Whichever handler is registered first at a given path wins — this is why the static `/pricing`
  `res.sendFile` handler had to be removed/re-pointed for the React route to take over the path (Settled
  decision #6), not merely added alongside it.
- `app.use(loadUser)` is registered **globally** in `connect-four/server/index.js`, well before the lesson
  routes, so `req.user.tier` is **already available** on `GET /api/lessons/:id` despite that route's "no auth
  required" comment — US3.1 needs no new auth wiring.
- `getLessons()` in `connect-four/server/lessonLoader.js` already projects to `{ id, title, order, free }`
  only, so the saga list's "keep metadata public" requirement is **already satisfied** by the list endpoint.
  Only `getLesson(id)` leaks `slides` to unentitled callers — US3.1 is scoped to that function.
- `getSubscriptionStatus` (`connect-four/server/paymentProcessor.js`) is `export function
  getSubscriptionStatus({ tier }) { return { status: tier === 'paid' ? 'paid' : 'free' }; }` — pure,
  synchronous, no DB read, `customerId` ignored. It is not a server-authoritative check; the new entitlement
  module (Settled decision #5) must actually read `users.tier` from the DB.
- `/api/paddle/*` routes — including the public `GET /api/paddle/config` — all return 503 when
  `PADDLE_API_KEY` is unset. Any surface that depends on that endpoint (the pricing route, US3.4) needs a
  defined degraded state for this case.
- `useLessonLockGuard` closed the **UI** hole in PR #19; the endpoint is untouched, so `curl` still returns
  paid content. With the free 1–10 / paid 11–15 split, five lessons are exposed.
- OI-41's drift is **not currently manifesting** (verified 2026-07-18: `pricing.html`, `en.json`'s
  `upgrade.*`, and the live Paddle catalog agree) — but nothing prevents it recurring, and the `20` Deep
  Reveals/week literal duplicates `quotaLimits.js:FREE_DEEP_REVEAL_WEEKLY_LIMIT`, which has already drifted
  once.
- OI-34 was written for the Stripe fallback; the equivalent path today is Paddle's `verifyTransaction`
  sync-activation fallback. Re-map it before speccing, or close it as obsolete.
- `/summary` is in `SESSION_ONLY_SCREENS`; the shipped mitigation is `returnPathOverride='/setpicker'`, so
  the user lands on Challenges rather than home.
- CSP for Paddle took five rounds of discovery; any new checkout surface must re-verify the directives
  (memory `project_paddle_integration`).

**Authoritative sources of truth**
- `docs/architecture/server-conventions.md` §"PaymentProcessor Seam", §"Identity binding on
  `transaction.completed` (OI-55)", §"CSP Directive Rationale"
- `docs/architecture/frontend-conventions.md` (tier source: `store.getProfile()`, never `session.tier`)
- `docs/architecture/api-conventions.md`; `docs/architecture/lesson-editor.md` (the `free` flag)
- `docs/open_issues.md` — OI-66, OI-39, OI-55, OI-34, OI-41, OI-25
- The `paddle-docs` MCP server (per `CLAUDE.md`: check current docs, never rely on training data)
- memory `project_paddle_integration`

**User stories & tasks**

**US3.1 — Server-side lesson entitlement (8 tasks).** Gate `getLesson(id)` in
`connect-four/server/lessonLoader.js` (the only leak — `getLessons()` already projects to public metadata
only) on the caller's tier by calling the shared entitlement module (Settled decision #5) directly — no new
auth wiring needed, since `req.user.tier` is already available via the globally-registered `loadUser`
middleware. Unentitled callers get **200 with a redacted stub**: `{ id, title, order, free, locked: true }`,
no `slides` (Settled decision #7 below). Add an integration test that a signed-out fetch of a paid id returns
this stub with no `slides`; verify the saga screen and `useLessonLockGuard` still behave with `locked: true`;
document the response contract, including `locked: true`, in `api-conventions.md`.

**US3.2 — One tier-check interface (9 tasks).** Implement the shared server entitlement module (Settled
decision #5); add `GET /api/user/entitlement` as a thin wrapper over it; have the `GET /api/lessons/:id`
handler (US3.1) call the module directly, not the HTTP endpoint; define the fail-open vs fail-closed policy
when the endpoint is unreachable; define the client cache TTL and every invalidation trigger (checkout
return, at minimum); migrate all five call sites (`src/screens/SettingsScreen.jsx`,
`src/screens/PostSetSummaryScreen.jsx`, `src/screens/SagaScreen.jsx`, `src/components/DeepRevealPane.jsx`,
`src/lib/useLessonLockGuard.js` — see Non-obvious facts) to the new client helper in one change; update
`docs/architecture/server-conventions.md` §PaymentProcessor Seam in the same change to reflect that
`getSubscriptionStatus` is superseded (for production reads) by the DB-backed module, and to state precisely
what remains of its "test-only" scoping; delete the "test-only in production wiring" comment; add a test per
call site plus a test for the module and the endpoint wrapper; document the seam in `api-conventions.md`.

**US3.3 — Payment identity ratification & analytics (5 tasks).** Record the owner's 2026-07-31 ratification
of OI-55's existing `paddle_customer_id` cross-check as settled policy in `server-conventions.md` §"Identity
binding on `transaction.completed` (OI-55)", replacing the "unilateral judgment call, treat as a proposal"
disclaimer with the dated ratification and explicitly naming the accepted residual risks (grief-granting;
laundering a chargeback-able payment onto a third-party account) — no change to the identity-binding code.
Re-map OI-34 against Paddle's `verifyTransaction` sync-activation fallback and close it if obsolete, or (if
still applicable) keep it and add the idempotent `upgrade_completed` write keyed on the transaction id. Extend
`paddleProcessor.test.mjs` to cover whichever of those lands.

**US3.4 — Designed pricing page (10 tasks).** Build the pricing surface as an in-app React route that **takes
over `/pricing`** (Settled decision #6), reusing `src/lib/usePaddlePrices.js` (live `GET /api/paddle/config`
prices, `formatPrice`, `computeAnnualSavings`), the monthly/annual toggle and savings-badge treatment from
`src/components/UpgradeModal.jsx`, the i18n layer (Rioplatense voseo), and `src/lib/useUpgradeCheckout.js` for
the CTA into the existing checkout. Wiring the route requires touching the three structural navigation files
(no router library exists — see Non-obvious facts): add an entry to the `URL_MAP` table in
`src/lib/urlMapping.js`, register the screen in the `SCREENS` registry in `src/lib/screenRegistry.jsx`, and
wire the nav entry point via `window.history.pushState` in `src/App.jsx`. Remove or re-point the static
`res.sendFile('/pricing', ...)` handler in `connect-four/server/index.js` so the SPA catch-all serves the
React route instead (Express matches on registration order — see Non-obvious facts). Move
`connect-four/server/pricing.html` to serve at `/pricing-legal` instead, linked from the footer alongside
`/terms`; de-hardcode or remove its price literals (`$2.99` / `$21.99` / `39%` / `$1.83`) on both surfaces.
One verification task and one blocking task gate the rest of the story:
- **Note, not a blocker:** confirm via the `paddle-docs` MCP server (per `CLAUDE.md`: never rely on training
  data for Paddle) that no re-submission is required for a content change on an already-approved domain — the
  domain is already Paddle-approved, so this is confirmatory, not gating (Settled decision #6).
- **Blocking:** re-verify CSP for any new script/style origin against the Express-served `dist/` build, never
  `npm run dev` (Vite dev enforces no CSP — memory `project_csp_helmet_traps`; Paddle CSP took five rounds of
  discovery — memory `project_paddle_integration`).

Also: define the page's degraded state when `/api/paddle/*` 503s because `PADDLE_API_KEY` is unset (this
includes the public `GET /api/paddle/config` the page depends on); source every number from the live config
endpoint and `FREE_DEEP_REVEAL_WEEKLY_LIMIT`; preserve the MoR clause, refund statement, and `/terms` link
verbatim on `/pricing-legal`; confirm both `/pricing` and `/pricing-legal` are publicly reachable for domain
review.

**US3.5 — Checkout return continuity (6 tasks).** Persist the set `results` to sessionStorage keyed by a
nonce; include the nonce in the return path; rehydrate `/summary` on cold boot; keep the
`returnPathOverride` fallback when the nonce is missing; test the full-page round trip; confirm no stale
outcome leaks into a later modal open (the OI-59 replay-on-subscribe fix must keep holding).

**Acceptance criteria**
- A signed-out `curl` of a paid lesson id returns `200` with `{ id, title, order, free, locked: true }` and no
  `slides` (Settled decision #7).
- Exactly one server module answers "is this user paid" — `GET /api/user/entitlement` is a thin wrapper over
  it, and `GET /api/lessons/:id` calls the module directly — and it backs both US3.1's lesson gate and all
  five tier-gate call sites (Settled decision #5).
- Every price and quota figure shown to a user on `/pricing` is derived from a live source. `/pricing-legal` is
  exempt: its pre-existing hand-typed price and quota figures are retained unchanged, as a knowingly accepted
  drift risk, because the page stays static and JavaScript-free (the reason it was retained in the first
  place) and the payment provider has already reviewed its current wording.
- The in-app React route serves `/pricing`; `connect-four/server/pricing.html` is retained and serves
  `/pricing-legal`, linked from the footer alongside `/terms` (Settled decision #6). A confirmatory
  `paddle-docs` MCP check records that no domain re-submission is required.
- CSP for the new pricing route is verified against the Express-served `dist/` build, never `npm run dev`.
- The OI-55 ratification and its named residual risks are recorded in `server-conventions.md`.
- `locked: true` on `GET /api/lessons/:id` is documented in `docs/architecture/api-conventions.md`.
- `npm run test:fast` green; staging-only checks appended to `staging_checks.md` under this epic.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Migrating off Paddle, or changing the plan/price catalog.
- Adding new paywall entry points beyond the pricing page (the Settings CTA already shipped).
- Backfilling historical `upgrade_completed` analytics.
- Closing the first-payment forgery window with a server-minted Paddle customer id — accepted as residual
  risk per Settled decision #4.
- Deleting `connect-four/server/pricing.html` — it moves to `/pricing-legal`, it does not disappear
  (Settled decision #6).

**Open questions**

None remaining — the epic's sole open question (unentitled response shape for `GET /api/lessons/:id`) was
resolved 2026-07-31; see Settled decision #7.

---

## Epic 4 — Server/API Data Integrity & Environment Correctness

**Intent:** Close the handler-level defects where an identifier, a sort key, or a retry can silently corrupt
or leak data, and finish the deferred environment/ops verifications that were never runnable in local dev.
The puzzle serving pool never excludes solved/revealed puzzles by design; the `outcome` enum is narrowed to
match the values actually written (keeping the live `'tied'` value), the server writer that inserts raw
`evaluatePredicate` results is normalized to the enum vocabulary, and the client write sites that currently
mislabel a wrong answer as `'abandoned'` — including the sequence-puzzle failure branch, which records
nothing today — are fixed to write an explicit `'incorrect'`.

**Issues covered:** OI-40 (anonymous puzzle attempts and anonymous game inserts share a literal
`device_uuid: 'anonymous'` at two sites), OI-53 (`req.user.email` always `undefined`), OI-17
(`chooseSparringMove` returns `col: undefined` on a full board), OI-47 (`GET /api/games` pagination
unaudited for a unique sort key), OI-50 (candidate-insert retry can double-insert), OI-22 (anon re-analysis
re-runs the solver), OI-49 (serving pool deliberately never excludes solved/revealed puzzles; `outcome`
enum narrowed to match — keeping `'tied'`, which is live — plus a new `'incorrect'` outcome, a server-side
writer fix, and four client writer fixes), OI-5 (refresh-rotation probe, owner-gated), OI-14 (migration 057
carryover unverified), OI-31 (staging `DATABASE_URL` uses the transaction pooler), OI-51/OI-52
(worktree-ports self-derive leaks stderr, and silently falls back to legacy ports when the script fails).

**Settled decisions**
1. OI-40 is a **write-path** fix, at both of its literal sites: derive or require a real device_uuid, or
   reject with 400 — never default to a shared bucket. The server derives or generates a real per-request
   identifier when none reaches the handler, rather than rejecting with 400 — a strict 400 would break
   `SupabaseStore.recordPuzzleAttempt`, which forwards no `deviceUuid` in its request body at all
   (`src/store/SupabaseStore.js:69`). This keeps the fix server-only.
2. OI-49 is resolved: **never exclude.** `GET /api/puzzles/draw` keeps drawing from the full active pool —
   no attempt-history join, no exhaustion policy, no unseen-first ordering. A migration narrows the
   `puzzle_attempts.outcome` CHECK constraint to only the values actually written, removing `'revealed'`
   and `'correct_retry'`. `'tied'` is **kept**, not removed — it is a real value written today by
   `POST /api/puzzles/:id/check` (`evaluatePredicate` returns `result: 'tied'`) and Epic 1's multi-column/
   tied-answer work, which lands immediately before this epic in Lane A, makes it more common, not less.
   This removes the US4.1-before-US4.3 ordering dependency an exclusion design would otherwise create.
3. A wrong answer is currently written as `'abandoned'` at most client sites, and not recorded at all for
   sequence-puzzle failures. Add an explicit `'incorrect'` outcome in the same migration — the narrowed
   CHECK constraint becomes `'correct_first' | 'tied' | 'incorrect' | 'abandoned'` — and fix
   `src/screens/ChallengeScreen.jsx`'s four `outcome:`-relevant sites (approx. lines 408, 584, 659, and the
   sequence failure branch at approx. line 668; read each before editing, line numbers are approximate) to
   write `'incorrect'` when the submitted answer is wrong, reserving `'abandoned'` for the user actually
   leaving without answering. This is a deliberate, narrowly scoped client-side exception in an otherwise
   server-side epic. Separately, the server writer at `server/index.js:2520` (`outcome: evaluation.result`)
   is normalized from `evaluatePredicate`'s raw `'correct'|'wrong'|'tied'` vocabulary to the stored enum
   (`'correct'→'correct_first'`, `'wrong'→'incorrect'`, `'tied'→'tied'`) — today its non-tied inserts
   already fail the *existing* CHECK constraint and are silently dropped by a fire-and-forget
   `.catch(err => console.error(...))`, an in-scope live data-integrity defect, not a new one this epic
   introduces. **"Existing rows are not backfilled" applies only to the unrecoverable `'incorrect'`-vs-
   `'abandoned'` distinction for historical rows** — it does NOT forbid the mechanical value remap
   (`UPDATE` or `NOT VALID`) the migration needs to make any pre-existing non-conforming `outcome` values
   (e.g. stray `'revealed'`/`'correct_retry'` rows, if any) conform before a validating `ADD CONSTRAINT`
   narrows the CHECK — that remap carries no information loss, unlike the incorrect/abandoned distinction.
4. Ops verifications (OI-14, OI-31, OI-5) are epic tasks, but their sign-off lives in `staging_checks.md`,
   not in a silent "done".
5. A worktree that cannot derive its own ports **fails loudly** rather than binding the main checkout's
   `3001`/`5173` — silently defaulting is the exact collision the feature exists to prevent (OI-52).

**Non-obvious facts**
- **PostgREST silently drops an unknown column from an UPDATE** rather than erroring, so
  `POST /api/user/migrate` returns `204` while persisting nothing when migration 057 is unapplied (memory
  `project_user_column_propagation`). There is no server hot-reload — restart after applying.
- Port **6543 is the transaction pooler and is FORBIDDEN for DDL / multi-statement transactions**;
  `migrate.js` wraps each migration in `BEGIN…COMMIT` (memory `reference_supabase_connection`). Verify what
  URL the Railway staging deploy actually uses before editing `.env.staging`.
- `GET /api/games` sorts and paginates **in JS** across two tables (`games` + `papergames_games`), so its
  failure mode differs from the SQL `OFFSET`/`LIMIT` case that motivated the `id ASC` tiebreaker rule — audit
  rather than copy the fix.
- OI-50's retry fires on **any** error, including a post-commit network blip; `candidates` has no unique
  constraint, only the non-unique `idx_candidates_move_string`. `(generation_run_id, move_string)` is an
  available dedupe key.
- OI-53 needs no new column: the email is already on the Supabase auth user object returned by
  `authClient.auth.getUser(token)` and is discarded by `loadUser()`.
- The draw query (`connect-four/server/index.js`, `GET /api/puzzles/draw`) filters only on `category`,
  `is_active`, and non-null `position` — it never joins `puzzle_attempts`, confirming the pool is already
  unfiltered by solved/revealed status today; OI-49 formalizes that as the intended design rather than
  changing behavior.
- **`ChallengeScreen.jsx` is not the sole writer of `puzzle_attempts.outcome`.** `server/index.js:2520`
  (inside `POST /api/puzzles/:id/check`, `app.post` at line 2461) also inserts a row with
  `outcome: evaluation.result`, where `evaluation` comes from `evaluatePredicate` in `server/predicates.js`
  (documented return shape `{ result: 'correct'|'wrong'|'tied' }`, `predicates.js:95`). `'tied'` is
  therefore a **live**, currently-written value, not a dead one — the earlier claim that it was dead (drawn
  from OI-49's own prose rather than re-measured at source) was wrong.
- Of `ChallengeScreen.jsx`'s three pre-existing `outcome:` write sites, only two are conditional and
  currently mislabel a wrong answer as `'abandoned'`: `:408` (`outcome: isCorrect ? 'correct_first' :
  'abandoned'`) and `:584` (`outcome: quality === 'optimal' ? 'correct_first' : 'abandoned'`). The third,
  `:659` (`outcome: 'correct_first'`), is **unconditional** and only reached inside the `data.outcome ===
  'success'` branch of `handleSequenceClick` — it has no wrong-answer expression to fix. The sibling failure
  branch (`} else {` at approx. `:668`) plays the wrong-move sound and pushes a coach message but never
  calls `recordPuzzleAttempt` at all, so sequence-category wrong answers are recorded nowhere today; a
  fourth write call is added there.
- `data-model.md`'s "Puzzle Attempts — `outcome` values and the serving pool" section (around `data-model.md`
  line ~406) currently punts the non-exclusion question to OI-49; it must be updated to state the
  non-exclusion is deliberate, and to document the narrowed enum (`'correct_first'`, `'tied'`, `'incorrect'`,
  `'abandoned'`).
- OI-40's cited handler (`POST /api/user/puzzle-attempts`) is misattributed. That handler lives at
  `server/userRoutes.js:343`, opens with `if (!requireUser(req, res)) return;`, and passes
  `req.user.device_uuid` into `writePuzzleAttempts` — it can never be anonymous and needs no fix. The real
  `'anonymous'`-fallback literal is `server/index.js:2514`: `const deviceUuid = req.user?.device_uuid ||
  req.body.deviceUuid || 'anonymous';`, inside `POST /api/puzzles/:id/check`. A second, previously unnamed
  shared-bucket literal sits at `server/index.js:1897`: `device_uuid: device_uuid || req.user?.id ||
  'anonymous'`, in the games-insert payload — both sites must be fixed for the "no shared-bucket identifier"
  acceptance criterion to actually hold.
- OI-5 is **owner-gated**: the probe harness exists at `scripts/probe-refresh-rotation.mjs` but needs a real
  account's credentials; the anonymous-session result is not conclusive.
- Always run `eval "$(./worktree-ports.sh)"` before starting or killing any server — unconditionally, every
  session; never kill by a bare port number or `pkill node` (`CLAUDE.md`, `worktree-conventions.md`). The
  script detects the main checkout internally and returns the unchanged legacy ports there, so running it is
  always safe.
- OI-52's fallback only trips `strictPort` if the main checkout happens to be bound at that moment; with the
  main checkout stopped, a worktree would silently start on `5173`/`3001` with no error at all.
- Read memory `reference_supabase_connection.md` before writing any inline DB script (`.env` path, `cd
  connect-four` first, `SUPABASE_SERVICE_ROLE_KEY`, parse `.env` manually).

**Authoritative sources of truth**
- `docs/architecture/api-conventions.md` (pagination tiebreaker rule, migrate endpoint, error shape),
  `server-conventions.md`, `data-model.md`, `db-schema.md`
- `docs/open_issues.md` — OI-40, OI-53, OI-17, OI-47, OI-50, OI-22, OI-49, OI-5, OI-14, OI-31
- `staging_checks.md`; memories `reference_supabase_connection`, `project_user_column_propagation`

**User stories & tasks**

**US4.1 — Request-context and identity completeness (11 tasks).** Replace the `'anonymous'` literal at
`server/index.js:2514` (`POST /api/puzzles/:id/check`) with a server-derived or -generated real per-device
identifier (never a shared bucket, never a 400 — `SupabaseStore.recordPuzzleAttempt` forwards no
`deviceUuid`, so a 400 would break that live path) (OI-40); fix the second shared-bucket literal at
`server/index.js:1897` (`device_uuid: device_uuid || req.user?.id || 'anonymous'` in the games-insert
payload) the same way; audit every caller that could omit `deviceUuid`; check whether contaminated rows
already exist and decide on cleanup; add tests for both fixed sites and both branches; thread
`data.user.email` into `req.user` in `loadUser()` (OI-53); confirm the Paddle checkout overlay pre-fills;
verify no handler silently depended on the field being absent; guard `chooseSparringMove` (or the endpoint)
to return an explicit terminal signal instead of `col: undefined` (OI-17); regression test each; document
the `req.user` shape in `api-conventions.md`.

**US4.2 — Pagination and retry integrity (7 tasks).** Audit `GET /api/games`'s in-JS sort key for uniqueness
and add a tiebreaker if needed; prove the two-table merge cannot reorder across pages; add a unique index on
`(generation_run_id, move_string)` and treat `23505` as success (or narrow the retry to pre-commit error
classes); migration + test.

**US4.3 — Anonymous cost, serving pool, and outcome integrity (12 tasks).** Extend the analyze cache-check
to match `device_uuid` + `user_id IS NULL` for anonymous callers (OI-22); confirm `GET /api/puzzles/draw`
needs no code change (it already never filters by attempt history — OI-49 formalizes that as intended);
normalize the server writer at `server/index.js:2520` (`outcome: evaluation.result`) to translate
`evaluatePredicate`'s raw `'correct'|'wrong'|'tied'` into the stored enum (`'correct'→'correct_first'`,
`'wrong'→'incorrect'`, `'tied'→'tied'`), fixing the live defect where its non-tied inserts fail today's
CHECK constraint and are silently dropped by the fire-and-forget `.catch`; write a migration narrowing
`puzzle_attempts.outcome`'s CHECK constraint to `'correct_first' | 'tied' | 'incorrect' | 'abandoned'`,
dropping only `'revealed'` and `'correct_retry'`, and mechanically remapping (via `UPDATE` or `NOT VALID`)
any pre-existing rows outside that set so the validating `ADD CONSTRAINT` does not fail — this remap is not
the forbidden incorrect/abandoned backfill; fix `src/screens/ChallengeScreen.jsx`'s four `outcome:`-relevant
sites (approx. lines 408, 584, 659, and the sequence failure branch at approx. line 668, which today calls
`recordPuzzleAttempt` not at all) to write `'incorrect'` on a wrong submitted answer and reserve
`'abandoned'` for actual abandonment — this is the epic's one deliberate client-side touch, now four sites
instead of three; update `data-model.md`'s Puzzle Attempts `outcome` section to state the non-exclusion is
deliberate and document the narrowed four-value enum; note in the migration/PR that existing rows are not
backfilled for the incorrect/abandoned distinction specifically; tests for the new outcome value, for the
sequence-failure write site, for the server-writer normalization, and for the narrowed constraint accepting
`'tied'` and rejecting the two removed values.

**US4.4 — Environment and ops correctness (10 tasks).** Pass `stdio: ['ignore','pipe','ignore']` to both
self-derive `execSync` calls so only the port values are captured (OI-51); detect a linked worktree in
`vite.config.js`/`server/index.js` with the same `GIT_DIR`/`GIT_COMMON` check `worktree-ports.sh` uses and
make a self-derive failure fatal there (OI-52); verify from both a worktree and the main checkout; document
in `worktree-conventions.md`; apply migration 057 and run the account-carryover quickstart (OI-14); resolve
the staging `DATABASE_URL` port question after checking what Railway actually injects (OI-31); run the
refresh-rotation probe against a real account and either build the de-dup Map or close OI-5; record every
verification in `staging_checks.md` under this epic.

**Acceptance criteria**
- No shared-bucket identifier is written for anonymous users.
- Every paginated endpoint has a provably unique sort key.
- A duplicate candidate batch is impossible (constraint) or provably not retried (narrowed retry).
- A worktree whose `worktree-ports.sh` fails refuses to start instead of binding `3001`/`5173`.
- The narrowed `puzzle_attempts.outcome` CHECK constraint accepts only `'correct_first'`, `'tied'`,
  `'incorrect'`, `'abandoned'` and rejects `'revealed'` and `'correct_retry'`; a wrong Challenge answer
  writes `'incorrect'`, not `'abandoned'`, for every puzzle type — including sequence puzzles, which record
  nothing today; the server writer at `server/index.js:2520` writes the enum vocabulary, not
  `evaluatePredicate`'s raw `'correct'|'wrong'|'tied'` values.
- `data-model.md`'s Puzzle Attempts `outcome` section states the non-exclusion is deliberate, not open.
- `npm run test:fast` green; each ops verification signed off in `staging_checks.md`.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Rewriting the analyze pipeline or the solver IPC layer.
- Rewriting `worktree-ports.sh` itself — only its two self-derive consumers change.
- The tier/entitlement model (Epic 3).
- Any change to blunder tagging (Epic 2).
- Any solved/revealed exclusion, unseen-first ordering, or exhaustion policy for the puzzle serving pool —
  OI-49 is resolved as never-exclude, so this is explicitly out of scope, not deferred.
- Backfilling existing `puzzle_attempts` rows to distinguish historical `'incorrect'` from `'abandoned'` —
  the distinction is unrecoverable for already-written data.
- Any other client-side (`src/`) change beyond the four `ChallengeScreen.jsx` `outcome:`-relevant write
  sites named in US4.3 (approx. lines 408, 584, 659, and the sequence failure branch at approx. line 668) —
  this epic is server-side except for that one deliberate exception.

**Open questions**
- None.

---

## Epic 5 — Audio Verification & TTS Management

**Intent:** Give the owner one place to generate, audition, and approve **every** clip in the app; close
the TTS defects that survive the content pass; and make the stale-model class of drift that produced OI-32
structurally impossible to repeat. **Rescoped 2026-07-29** (see Non-obvious facts): the bulk generation this
epic was originally built around has since shipped from a parallel session, so what remains is verification,
the missing admin surface, three correctness bugs (a fourth, one-liner localization, is its own story —
US5.4), a confirmed-stale English coach fleet that needs regenerating, and a single-synthesis-path
guarantee.

**Issues covered:** OI-42 (lesson audio unmanageable from `/admin/audio` — the remaining headline),
OI-45 (regenerating an approved clip publishes it unapproved — decision settled below),
OI-26 (cleanup nulls audio cross-locale), OI-23 (deep-reveal TTS 400s on the opening move),
OI-28 (blunder one-liner has no locale context — own user story, see below),
OI-32 (stale `tts-1` English coach clips — **CONFIRMED STALE**, see below),
OI-78 (no pacing-aware tooling for corpus-wide **lesson** audio regeneration — the coach fleet already has
a working server-side bulk path, `generate-all scope:'all'`; the real gap is the per-lesson,
per-language admin endpoint, which makes a full lesson-corpus pass 15 × 2 = 30 separate HTTP requests
against the shared rate limiter).
**Verify-and-close only** (content appears shipped, not yet confirmed end-to-end): OI-65 (subsumes OI-9,
OI-43's remaining half, OI-64 item 2), OI-27.

**Settled decisions**
1. **Translate and voice in the same pass.** `pickLocalized` backfills `audio` from English per field, so a
   translated-but-unvoiced lesson serves Spanish text with an English clip — worse than silence
   (`lesson-editor.md`).
2. Lesson audio stays **registry-free** (FR-013): status is derived live from the lesson JSON, never stored
   in a second index. Any admin UI must respect that.
3. Generation runs **locally only** (FR-012a) — `OPENAI_API_KEY` is in `connect-four/server/.env`; remote
   containers have no `.env` at all, which is why OI-65 stalled.
4. **OI-45: keep publish-immediately, add a warning (not an approval gate).** A re-recorded clip at an
   already-approved slug goes live at once, same as today — it does not go silent pending review. The gap
   this leaves (a bad take can go live) is closed by adding an explicit warning to the admin UI's per-clip
   generate button, matching the warning the CLI (`connect-four/scripts/generate-tts.js`) already shows.
   Rejected alternative: gating playback on approval, because it can take a *working* clip offline the
   moment someone clicks regenerate.
5. **Single synthesis path is config-ownership-by-the-shared-path, not a consolidation (owner
   requirement).** `connect-four/server/ttsProvider.js` is **already** the only file in the codebase that
   talks to the TTS provider directly, and all six call sites (`server/index.js:3688,3727,3761,3953`,
   `server/lessonAudio.js:24`, `scripts/generate-tts.js:364`) already import `synthesize()`/
   `buildTtsRequest()` from it — there is no consolidation left to do. Five of the six already pass full
   per-language config (voice, speed, model, `instructions` from `readTtsConfig(lang)` +
   `buildTtsInstructions`). The **sole** defective caller is `scripts/generate-tts.js:363-366`, whose
   `synthesizeAndWrite()` calls `synthesize(value)` with no options at all — hardcoded fallback voice
   `alloy`, no instructions, and its `lang` argument never reaching synthesis. The fix is **not** "wire up
   the last caller" as a one-off — it's making omission **inexpressible**: the shared entry point's
   signature must resolve voice model/voice/speed/instructions internally from the requested language, so a
   caller can supply only text + language and cannot supply or omit the rest. Concretely:
   - Change `ttsProvider.js`'s shared entry point signature so voice configuration is resolved internally
     from the requested language; no caller constructs or supplies its own model/voice/instructions.
   - That entry point must **refuse** a legacy model (`tts-1`, `tts-1-hd`) rather than silently degrade:
     those models ignore `instructions` outright, so a model override is equivalent to shipping an unstyled
     clip — exactly how OI-32 happened. Also remove `tts-1`/`tts-1-hd` from every selectable set
     (`VALID_TTS_MODELS` in `ttsConfig.mjs`, the `TTS_MODELS` dropdown in `AdminAudioPage.jsx`'s config
     editor and preview sandbox) so an unsynthesizable config can't even be saved.
   - Add a regression test at the seam asserting every synthesis request carries the current voice model
     and non-empty, **language-correct** `instructions`; a grep-based lint that no file outside the shared
     module constructs a TTS request directly is an acceptable complement, not a substitute for the test.
   - This is what makes OI-32 closable as "fixed and prevented," not just "fixed once."

**Non-obvious facts**
- **Content state, re-measured 2026-07-29 through the production walkers** (`collectMessages()` /
  `collectReferencedAudio()` in `connect-four/server/lessonAudio.js` — the epic's original "12 of 15 lessons
  have no audio" premise is dead; a parallel session shipped the generation mid-authoring):
  - **Lesson narration: complete on disk, across all three audio field families.** `collectMessages()` yields
    three families, not two — `audio` (coach + socratic messages) **and** `infoProseAudio` (the slide prose
    paragraph, added by commit `65b703b` "info prose audios", 2026-07-29, the same day this epic was
    written). Measured through the real walker: `audio` family n=141 (enText/enAudio/esText/esAudio all 141);
    `infoProseAudio` family n=66 (all 66). **Totals: 207 messages / 414 audio fields / 348 unique mp3s** —
    not "282 referenced paths" as an earlier draft of this epic stated. `missing audio for existing text: 0`;
    `referenced 348, disk 348, ORPHANS 0, refs-missing-on-disk 0` — the fleet is already clean and
    `prune-audio` reporting `{deleted: 0}` is achievable today.
  - **Spanish coach fleet: complete.** `public/audio/coach/es/` holds 217 mp3s; `server/tts-registry.es.json`
    has 218 entries, 217 `approved` + 1 `ineligible` — identical counts to English. OI-27 is effectively done.
  - **OI-32 (English clips still on `tts-1`) is CONFIRMED STALE, not unverified.** The registry has no
    `model` field, but it does have `generated_at`, and that settles it: `server/tts-registry.json`
    `generated_at` histogram `{2026-06-19: 215, 2026-07-13: 1, 2026-07-14: 1}`, max
    `2026-07-14T19:58:29.012Z`; `server/tts-registry.es.json` histogram `{2026-07-17: 217}` (entirely
    post-switch — Spanish is fine). Model-switch commits: `9d0e952` (2026-07-14 16:53:48 -0300) and
    `ff196c9` (2026-07-14 17:16:59 -0300) "default TTS model to gpt-4o-mini-tts (retire tts-1)". **215 of 217
    English coach clips were synthesized ~3.5 weeks before the switch.** The default model lives at
    `connect-four/server/ttsProvider.js:18` (`buildTtsRequest(text, { voice = 'alloy', model =
    'gpt-4o-mini-tts', speed = 1.0, instructions } = {})`); `tts-1`/`tts-1-hd` are legacy, English-accented,
    and **ignore `instructions`** entirely.
  - **OI-32 covers coach *and* lesson clips — do not narrow it to coach-only.** The coach-clip half is
    confirmed stale (above). The lesson mp3s were rewritten 2026-07-28/29 and are plausibly current, but
    that **must be checked, not assumed** — verifying it is a task in US5.1, not an assumption baked into
    this epic.
  - **Still genuinely open, confirmed at source:** `/admin/audio` has **zero** occurrences of "lesson"
    (OI-42); the TTS guard is still `if (!moveString || …)` (OI-23); the cleanup still filters
    `.in('position_hash', hashes)` with no locale (OI-26).
  - Re-run before speccing, because this repo has concurrent sessions — walk the tree the same way the
    generator and pruner do, not with `grep`, which is blind to `infoProseAudio`:
    ```bash
    cd connect-four && node -e "
      const { collectMessages } = require('./server/lessonAudio');
      const fs = require('fs');
      let byKey = {};
      for (const f of fs.readdirSync('lessons').filter(f => f.startsWith('lesson-'))) {
        const lesson = JSON.parse(fs.readFileSync('lessons/' + f));
        for (const m of collectMessages(lesson)) {
          const k = m.audioKey || 'audio';
          byKey[k] = byKey[k] || { n: 0 };
          byKey[k].n++;
        }
      }
      console.log(byKey);
    "
    ```
  - **A resolving path is not a working clip.** Every check above is static; none proves an `es` mp3 contains
    Spanish, plays in the browser, or survives `prune-audio`. That is exactly what US5.1 exists to establish.
- Audio is content-addressed by a **hash of the text**, so changing model/voice/prompt does **not**
  regenerate anything (memory `project_tts_audio_cached_by_text`) — this is why OI-32's ~217 English coach
  clips are still `tts-1` with no voice styling, and exactly the failure mode Settled decision 5 closes off.
- **Server-cache clobber trap (OI-43, memory `project_lesson_disk_edit_cache_clobber`):** nothing watches
  `lessons/`. A server booted before a disk edit holds a stale cache; `generate-audio` reads that cache and
  `saveLessonFile`s it back, **reverting the edit while returning 200**. Restart `$API_PORT` first and
  confirm with a `curl` before trusting any generate run.
- `generateLessonAudio` and `collectReferencedAudio` walk the lesson tree **independently**; add audio to one
  without the other and `pruneOrphanedLessonAudio` deletes the new clips as orphans. Verify `prune-audio`
  reports `{deleted: 0}` after every pass.
- Serve audio from `$VITE_PORT`, never `$API_PORT` — the API does not serve `public/`
  (memory `project_lesson_progression_audio_traps`).
- Approval gates **entry into the manifest**, not playback: a regenerated clip at an already-approved slug
  goes live immediately, unreviewed, and the old take is recoverable only via `git checkout` (OI-45 — kept
  as the intended behaviour per Settled decision 4, now with an admin-UI warning).
- OI-23 is a one-character class of bug: `!moveString` rejects the empty-but-valid opening movestring while
  the regex itself allows `{0,42}`.
- The TTS generator CLI lives at **`connect-four/scripts/generate-tts.js`** (575 lines) — **not**
  `connect-four/server/scripts/`.
- OI-28's actual blocker is upstream of the prompt string: the blunder one-liner is generated in the
  server-side harvest pipeline with **no request/`req.locale` context**, so `Accept-Language` cannot reach
  it. The `LANGUAGE_RULE` edit at `connect-four/server/llmCoachHelpers.js:617` is necessary but not
  sufficient — see US5.4.

**Authoritative sources of truth**
- `docs/architecture/lesson-editor.md` §"Window counts", §"Fields the learner UI ignores", the
  translate-and-voice rule
- `docs/architecture/coach-audio-conventions.md` (registry/manifest drift, cache TRUNCATE on deploy)
- `docs/open_issues.md` — OI-65, OI-27, OI-32, OI-42, OI-45, OI-26, OI-23, OI-28, OI-78
- `docs/architecture/frontend-conventions.md` (Spanish = Argentinian voseo)
- `connect-four/server/lessonAudio.js` — `collectMessages()`/`collectReferencedAudio()`, the shared walkers
- `connect-four/server/ttsProvider.js` — `buildTtsRequest`, the natural home for the single synthesis path
- memories: `project_tts_audio_cached_by_text`, `project_lesson_disk_edit_cache_clobber`,
  `project_lesson_progression_audio_traps`, `project_spanish_output_silent_fallback`

**User stories & tasks**

**US5.1 — Prove the shipped audio actually works, then close its issues (8 tasks).** Everything here is
verification of a parallel session's output — assume nothing from the static checks above, and do not
re-add bulk generation tasks. Add a test asserting every entry `collectMessages()` yields has a populated
`audio`/`audio_es` (and, where applicable, `infoProseAudio`/`infoProseAudio_es`) field per language **whose
file exists** — derived from the production walker, never a hand-listed set of field names, so it stays
correct if a fourth field family is ever added; run `prune-audio` and confirm `{deleted: 0}` — the
`collectReferencedAudio` / `generateLessonAudio` walkers are independent, so a partially-wired generation
pass shows up here as orphan deletions; run the OI-43 V7 Socratic checks (bubble narrates, stops on
navigate-away, mp3 200) in a hint-free run and a separate hint run, as an **automated** test (audio-element
playback state), not owner listening; check whether the lesson mp3s (rewritten 2026-07-28/29) are in fact
current post-model-switch — the lesson-clip half of OI-32 — rather than assuming it from the rewrite date;
close out OI-65/OI-27 per the Issue closeout convention (OI-32 itself does not close here — see US5.5).
**The by-ear checks — one `es` lesson clip and one `es` coach clip confirmed genuinely Spanish, plus an
Argentinian-accent audit — are not performed or gated here.** They are appended to `staging_checks.md`
("Epic 5 — Audio Verification & TTS Management (open-issues-epics.md, spec 051)") as staging sign-off
items and do not block US5.1 or US5.5; the silent-failure risk they guard against (a missing Spanish clip
falling back to English with no error) remains covered by the blocking structural checks above.

**US5.2 — Lesson audio in `/admin/audio` (9 tasks).** Add a Lessons section listing each lesson's messages
per language with status **derived live from the lesson JSON**; inline player resolving the `sha256(text)`
filename; per-message generate; respect the en/es toggle; do not introduce a second registry; document in
`lesson-editor.md`. This is now the epic's headline: it is the only way to audition a lesson clip in-app,
and US5.1 will make its absence felt immediately.

**US5.3 — TTS correctness fixes (6 tasks).** OI-45: apply the regenerate-warning to the admin UI's per-clip
generate button (Settled decision 4 — publish-immediately stays, the CLI's existing warning is the model);
OI-26: scope the cleanup `.update()` by `(position_hash, locale)`; OI-23: accept the empty movestring;
regression-test each.

**US5.4 — Localize the blunder one-liner, OI-28 (6 tasks).** Its own story because the fix is not just the
`LANGUAGE_RULE` string: name where a locale comes from through the server-side harvest pipeline (today it
has no request/`req.locale` context at all, so `Accept-Language` never reaches
`buildBlunderExplainPrompt` at `connect-four/server/llmCoachHelpers.js:586`); thread that locale from the
chosen caller down to the English-only `LANGUAGE_RULE` at `:617`; and decide what happens to one-liners
already cached in English in `explanation_cache` — the same table OI-26 touches, whose primary key became
composite `(position_hash, locale)` in migration 059 — either backfill them or explicitly document them as
not backfilled in `NOT included`.

**US5.5 — Regenerate the stale English coach fleet and lock in a single synthesis path (sequenced after
US5.2, and after the single-synthesis-path fix below — regenerating through today's still-defective CLI
path would just produce 217 fresh but still-unstyled clips) (10 tasks).** OI-32's coach-clip half is
confirmed stale (see Non-obvious facts) — this story fixes it and prevents recurrence. First, implement
Settled decision 5's single synthesis path (resolve voice config internally from the requested language in
`ttsProvider.js`, refuse legacy models, add the seam regression test). Then regenerate all 217 English
coach clips onto `gpt-4o-mini-tts` using the **existing** `POST /api/admin/audio/generate-all`
(`scope: 'all'`) endpoint — this already re-synthesizes every eligible key server-side inside one HTTP
request with no rate-limiter exposure, so it needs **no new tooling**; re-approve all 217 using the US5.2
admin surface, which is what makes re-approving 217 clips tractable. Separately, build the OI-78
pacing-aware `connect-four/scripts/generate-lesson-audio.mjs` tool — the real gap, because the **lesson**
admin path is per-lesson, per-language (`POST /api/admin/lessons/:id/generate-audio`), making a full
corpus pass 15 × 2 = 30 requests against the shared rate limiter — and use it only if US5.1's currency
check finds the lesson fleet is in fact stale; otherwise **confirm** (do not regenerate) that the lesson
clips are current, closing the loop opened in US5.1. Close out **OI-32** and **OI-78** per the Issue
closeout convention once the regeneration, the lesson-tool deliverable, and the single-path guarantee all
land.

**Acceptance criteria**
- Every entry `collectMessages()` yields (across the `audio` and `infoProseAudio` families, in all 15
  lessons) has a populated audio field per language **and both files exist**; a test derived from
  `collectMessages()` asserts it (not a one-off script run, and not a hand-listed set of field names).
- `prune-audio` reports `{deleted: 0}`.
- A Spanish learner never hears an English clip under Spanish text: guarded structurally in-story by the
  two checks above; the by-ear confirmation (one lesson clip, one coach clip, plus an accent audit) is a
  `staging_checks.md` sign-off item, not a blocking in-story gate.
- OI-32 is closed with evidence for **both** halves: the English coach fleet has been regenerated onto
  `gpt-4o-mini-tts` and re-approved, and the lesson clips have been explicitly confirmed current (not
  assumed from their rewrite date).
- Exactly one code path synthesizes any TTS clip; it always applies the current voice model and non-empty
  voice-style `instructions`; it refuses legacy models that ignore `instructions`; a regression test at the
  seam enforces this.
- The deep reveal of an opening-move blunder is spoken.
- Every clip in the app — coach *and* lesson, both languages — can be auditioned from `/admin/audio`.
- The blunder one-liner is generated in the learner's locale, with an explicit, documented decision on
  already-cached English rows in `explanation_cache`.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Translating any new text (all 15 lessons are already translated).
- Changing the TTS vendor or the text-hash caching scheme.
- Lesson *content* edits (Epic 6).
- Gating clip playback behind approval (OI-45 Option A) — rejected, see Settled decision 4.

**Open questions**
- None currently open for this epic. OI-45 (approval-gating vs. publish-immediately) is resolved — see
  Settled decision 4.

---

## Epic 6 — Lesson Learning Surface & Authoring Polish

**Intent:** Fix the one lesson behavior bug that makes the coach appear to stop reacting, settle where lesson
content lives, and harden the authoring/verification tooling so the next content pass is machine-checked.

**Issues covered:** OI-46 (sticky `showHint` makes the `correct` message unreachable), OI-44
(`lesson.<id>.title` duplicates the lesson JSON's `title`; `socratic.goalPrompt` is authored but unrendered —
counts corrected below), OI-69 (editor cosmetics + multi-board `aria-label` ambiguity), OI-63
(six verifier/finder robustness gaps), OI-73 (`lesson.*` namespace collision), OI-19 (remaining hardcoded
English strings), OI-62 (two KB edits). OI-68 (capsules tint the discs they cover) is **removed from Epic 6
scope entirely** (resolved 2026-07-30, owner ruling) — closed as a recorded decision, not fixed; see NOT
included and US6.4. OI-38 (KB `short_summary_es` coverage) is **deferred out of this
epic** — see Deferred, below — and is no longer active Epic 6 scope. Also folds in two undated `[major]`
copy findings from `agentic_QA_2026-07-25-0015.md` (no OI number) that `goalPrompt` wiring fixes as a
side effect.

**Settled decisions**
1. **Owner ruling (2026-07-16), still binding:** *lesson content is a thing in itself and must not be
   assembled from i18n keys.* OI-44 is the remaining application of that rule.
2. `lesson.node.*` / `lesson.confirmation.*` are **UI chrome**, not lesson content — leave them in i18n.
3. Verify a negative claim at source before acting on it: OI-44 asserts `goalPrompt` renders nowhere; confirm
   before deleting.
4. **`goalPrompt` is wired, not deleted** (resolved 2026-07-30, overriding OI-44's own "wire or delete"
   framing and `lesson-editor.md`'s "to change a challenge prompt, edit i18n, not the lesson"). `goalPrompt`
   becomes a per-lesson override of the shared `coach.spoken.<category>.prompt.*` text, falling back to the
   shared random prompt when absent. The shared copy must stay outcome-neutral (it also serves DB-drawn
   practice boards); the per-lesson override is where board-specific, outcome-correct copy belongs. This is
   the fix for both undated `agentic_QA_2026-07-25-0015.md` `[major]` findings: the claimeven confirmation
   prompt currently says "secure a draw" on solver-**won** boards, and the undercut prompt tells the learner
   to play the column the grader rejects — the lesson JSON's `goalPrompt` already states the corrected task
   in both cases and today is never shown.
5. **Spec matchers declare the production detector *and side* they validate against** (resolved 2026-07-30,
   applying OI-74's shape). No epic-wide "just validate against the production detector" — see US6.3.
6. **Hint yields to phase** (OI-46, resolved 2026-07-30): reset `showHint` on every phase transition
   (`useEffect(() => setShowHint(false), [phase])`). Hint and phase messages do **not** coexist in the
   bubble — the 120px coach cap on every screen (`project_lesson_text_overflow_traps`) would truncate
   exactly the reward text this story exists to restore.
7. **Lesson editor puzzle-existence verification is not Epic 6 scope** (resolved 2026-07-30) — see US6.3 and
   Deferred, below.

**Non-obvious facts**
- Counts in OI-44 are stale; re-measured 2026-07-30: **all 15** `connect-four/lessons/lesson-*.json` carry
  `goalPrompt`, and **13 of 15** carry `goalPrompt_es` (not "9 of 13, English only").
- **Do not "simplify" the OI-43 V7 browser pass back into one run** — a linear pass that clicks Hint can
  never reach `correct`, which is why it is deliberately split in two.
- **OI-68's capsule/disc-tinting fix is removed from Epic 6 scope entirely** (resolved 2026-07-30, owner
  ruling): "we are over complicating things — assume slides will not have overlapped overlays; keep the
  overlays as they are." No rendering change ships; OI-68 closes in `docs/open_issues.md` as a recorded
  decision, not a fix. See US6.4 and NOT included.
- `find_lesson_boards.mjs`'s spec matchers are independent re-implementations of `classifier.js` concepts and
  measurably diverge (the z-threat column was solver-optimal in only 25 of 50 `z_threat_socratic`
  candidates). `undercut_t2_adjacent` was fixed 2026-07-28 to validate against
  `detectUndercutBeneficiary` (the opposite-side detector, per OI-74) rather than `detectUndercut`; the
  other matchers (`z_threat_socratic`, claimeven, `figure_7`, `overcut_active`/`overcut_shared_cell`) were
  not. `detectOvercut`'s `perspective` is separately unsound (OI-76), and OI-76 is **Epic 2, Lane A**,
  running concurrently — validating the overcut matcher against today's `detectOvercut` would be
  invalidated by that lane's fix. See US6.3 for the resulting per-matcher policy.
- The strict tests' REMEDIATED gate is **inverted-risk**: it exempts nothing today but would silently exempt
  any future lesson added to the list. Flip it to an empty exemption set.
- Every script needs a real `--help` printing purpose + options + defaults and exiting 0 **before**
  required-arg validation (house convention; `find_lesson_boards.mjs` violates it).
- Lesson text clips silently: a 120px coach cap applies on **every** screen, and splitting a long message
  makes it worse (memory `project_lesson_text_overflow_traps`).
- `lesson.<id>.title` has **three** call sites with **different** fallbacks when the i18n key is removed:
  `SocraticScreen.jsx:201` uses `defaultValue: ''` (blank TopBar title), while `ConceptScreen.jsx:183` and
  `SagaScreen.jsx:114` use `defaultValue: lesson.title`. Migrating `title` into the lesson JSON as sole
  authority must update SocraticScreen's default too, or that screen ships an empty title.

**Authoritative sources of truth**
- `docs/architecture/lesson-editor.md` (the authoring contract; §"Fields the learner UI ignores",
  §"Confirmation Challenges")
- `docs/architecture/frontend-conventions.md` (Board API, voseo, the z-threat badge spec for outline styling
  — §"Z-threat badge visual spec (decided, do not reopen)")
- `docs/knowledge-base/README.md`, `allen-j-configuration.md`, `community-figure-7.md`
- `agentic_QA_2026-07-25-0015.md` — the two undated `[major]` `goalPrompt` copy findings
- `docs/open_issues.md` — OI-46, OI-44, OI-68, OI-69, OI-63, OI-73, OI-19, OI-62, OI-74 (carve-out
  precedent), OI-76 (cross-lane dependency, Epic 2); OI-38 referenced but deferred, see Deferred below
- memories: `project_lesson_window_highlights_traps`, `project_lesson_json_fields_not_rendered`,
  `project_lesson_text_overflow_traps`, `project_lesson_slide_field_wiring`

**User stories & tasks**

**US6.1 — Socratic phase/hint interaction (6 tasks).** Implement the settled hint-vs-phase semantics
(`useEffect(() => setShowHint(false), [phase])`); add a DOM test (`npm run test:dom`) that the `correct`
message renders and narrates after a solve; keep the split V7 browser procedure; verify the Continue button
still keys off `phase`; document the decision in `lesson-editor.md` and close OI-46.

**US6.2 — One home for lesson content (9 tasks).** Verify `goalPrompt`'s deadness at source (confirmed:
still dead in the learner path); migrate `lesson.<id>.title` to the lesson JSON as the single authority,
updating **all three** call sites' fallbacks (`SocraticScreen.jsx:201` currently `defaultValue: ''`,
`ConceptScreen.jsx:183` / `SagaScreen.jsx:114` currently `defaultValue: lesson.title`) so none regresses to
a blank or mismatched title; remove the superseded i18n keys from both locales; wire `goalPrompt` as a
per-lesson override of `coach.spoken.<category>.prompt.*`, falling back to the shared random prompt when
`goalPrompt` is absent, keeping the shared copy outcome-neutral; close the two `agentic_QA_2026-07-25-0015.md`
`[major]` findings (claimeven "secure a draw" on won boards; undercut prompt naming the grader-rejected
column) as acceptance evidence that the override actually renders the corrected copy; rewrite
`lesson-editor.md`'s "To change a challenge prompt, edit i18n, not the lesson" paragraph, which contradicts
Settled decision 1 and is now also factually wrong; correct OI-44's stale counts in this epic (now 15/15
lessons carry `goalPrompt`, 13/15 carry `goalPrompt_es`, measured 2026-07-30); assert key parity still
passes.

**US6.3 — Verifier/finder hardening (10 tasks).** Wrap `solver.query` per check so a bad movestring produces
a FAIL row, not a crashed run; add a conventional `--help` to `find_lesson_boards.mjs`; for each spec
matcher, declare in code/comments which production detector **and side** it validates against — apply the
OI-74 carve-out explicitly (`undercut_t2_adjacent` validates against `detectUndercutBeneficiary`, the
opposite-side detector, not `detectUndercut`) rather than forcing every matcher onto the naive
same-side-as-detector rule; leave the overcut matcher (`overcut_active`/`overcut_shared_cell`) either
deferred until Epic 2 lands OI-76's `detectOvercut` perspective fix, or explicitly re-pointed at whatever
Epic 2 ships, and record that cross-lane dependency in this epic's text (not just in memory); require the
pattern column be solver-optimal for the matchers being hardened, and state the policy for an
already-shipped lesson board that fails the new gate (25 of 50 `z_threat_socratic` candidates fail it
today): flag it as a FAIL row for a human decision, do not auto-replace — replacing a board is a content
edit and must not silently expand into "writing new lessons" (NOT included, below); per-overlay
`_overlayIntent`; extend the static scan to i18n lesson titles; flip the REMEDIATED gate to an empty
exemption set; correct `lesson-editor.md` §"Confirmation Challenges"' stale "that is Epic 6 scope" pointer
(Decision 2, below) and file the retargeted OI entry.

**US6.4 — Editor cosmetics + OI-68 closeout (3 tasks).** **Decision (resolved 2026-07-30, owner ruling):**
the capsule/disc-tinting fix is removed from Epic 6 scope entirely — assume authored slides do not have
overlapping overlays, and keep window-highlight overlays exactly as they render today; no rendering change
ships. `fontFamily: 'inherit'` on the `infoProse` textarea (or record that monospace is intentional); leave
the multi-board `aria-label` ambiguity unless an a11y pass is in scope, with the reason recorded; close OI-68
in `docs/open_issues.md` with a dated note recording this decision — resolved as "overlays kept as-is," not
as a code fix.

**US6.5 — String and KB coverage (6 tasks).** Wire `PlayOnlineScreen`'s remaining hardcoded titles to `t()`;
sweep `src/screens`/`src/components` for user-facing literals (`title=`, `aria-label=`, button/label
children) and add keys to both locales; add the two-line guard that no lesson id collides with a reserved
`lesson.*` sub-key (OI-73); make the two OI-62 KB edits and re-run `npm run sync-kb`; correct OI-38's stale
count in this epic and in `docs/open_issues.md` (measured 2026-07-30: `docs/knowledge-base/` holds 49 `.md`
files, but `README.md` and `_sketches.md` are not entries, leaving 47 entries; 4 carry `short_summary_es`;
43 missing — not "45 of 49"); record the KB-translation deferral (see Deferred, below) instead of doing the
translation here.

**Acceptance criteria**
- Solving a Socratic exercise after clicking Hint shows **and speaks** the `correct` message.
- No lesson string is assembled from i18n keys; `lesson-editor.md` states where content lives, including a
  corrected "goalPrompt is a per-lesson override, edited in the lesson JSON" statement (not "edit i18n").
- Both `agentic_QA_2026-07-25-0015.md` `[major]` `goalPrompt` copy findings render the corrected text in the
  app (claimeven, undercut).
- `verify_lesson_content.mjs` produces a FAIL row (not a crash) for an invalid movestring, and
  `find_lesson_boards.mjs --help` exits 0.
- Each spec matcher's declared detector-and-side is documented in `find_lesson_boards.mjs`; the
  `undercut_t2_adjacent` carve-out is explicit, not implicit.
- `npm run test:fast` and `npm run test:dom` green; lesson audit still 39/39.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.
  OI-38 closes as "deferred to a standalone content spec", not as done.

**NOT included**
- Generating any audio (Epic 5).
- Writing new lessons or re-tiering the curriculum (resolved 2026-07-25). Replacing a lesson board that
  fails the new US6.3 solver-optimal gate is a content edit under this same boundary — flag it, do not
  silently author a replacement board as part of this epic.
- OI-72's stale `windowCounts` round-trip — a recorded decision, not a defect; document only.
- **OI-68's capsule/disc-tinting fix** (resolved 2026-07-30, owner ruling) — removed from scope entirely.
  Assume authored slides do not have overlapping overlays; keep window-highlight overlays exactly as they
  render today. Closed in `docs/open_issues.md` as a recorded decision (see US6.4), not implemented as a
  code fix.
- Bulk translation of the 43 KB entries missing `short_summary_es` — see Deferred, below.
- The lesson editor verifying that puzzles exist for a chosen confirmation category — see Deferred, below.

**Open questions**
- None. Capsule tinting (OI-68) is fully resolved by owner decision — removed from scope entirely, overlays
  kept as-is; there is no remaining scope sub-question to decide (see NOT included and US6.4).

**Deferred**
- **KB `short_summary_es` translation (43 of 47 entries).** Split out of Epic 6 into a standalone content
  spec: this is a bulk reviewed-translation content effort (voseo, verde/gris, no fabrication) with its own
  write target (`npm run sync-kb` mirrors into `connect-four/server/kb/`, parity pinned by
  `tests/unit/kbSync.test.js`), and folding it into an already nine/ten-task-per-story epic would either
  bloat Epic 6 or get silently dropped. OI-38's count is corrected here — `docs/knowledge-base/` holds 49
  `.md` files, but `README.md` and `_sketches.md` are not entries, leaving 47 entries / 43 missing / 4
  present, measured 2026-07-30 — but the translation work itself is out of scope.
- **Lesson editor puzzle-existence check for confirmation categories.** Declared out of Epic 6 scope
  (Decision 2) and retargeted to a new `docs/open_issues.md` entry — admin-only authoring surface with no
  learner-facing impact, so it does not compete with this epic's learner-facing fixes. The doc-pointer
  correction in `lesson-editor.md` §"Confirmation Challenges" and filing the new OI entry stay in US6.3,
  since the stale "that is Epic 6 scope" pointer is how the gap would survive another cycle if left alone.

---

## Epic 7 — QA Backlog & Product/UX Decisions

**Intent:** Consume the last un-worked QA run and settle the three product questions that have been sitting
open because they need the owner's judgment, not an implementation.

**Issues covered:** OI-35 (the 2026-07-15 `/app-qa` findings backlog), OI-21 (the coach greeting cannot
autoplay on a cold onboarding load), OI-37 (100% accuracy beside a lost game).

**Settled decisions**
1. **`agentic_QA_2026-07-15-1321.md` at the repo root is the authoritative work-list** for OI-35 — this epic
   is a pointer, not a re-listing. Read the file (per-finding severity, code location, repro) before speccing.
   Confirmed present (83,360 bytes) but **untracked**: `git status --short` reports `?? agentic_QA_2026-07-15-1321.md`
   and `git log --diff-filter=A -- agentic_QA_2026-07-15-1321.md` returns empty — no commit on any branch has
   ever added it. US7.1 must (a) commit the file so the work-list stops being a single-machine artifact, and
   (b) write the durable triage result into `docs/open_issues.md` under OI-35 — updating the findings file
   in place is not sufficient on its own.
2. **Do not fold game outcome into the accuracy calculation** (OI-37). It measures board-move optimality and
   is correct on its own terms; conflating it with "did you finish the game" destroys both answers. **Scoped
   finding, not a full correction**: in the 342-game Papergames import measured during this brainstorm (see
   Non-obvious facts), every accuracy-100% loss is a `time-up` (clock) loss and real `resignation` losses top
   out at 89%. That is a statement about one imported dataset, not a general refutation of the epic's original
   "resigns after playing perfectly" framing — the findings file (`agentic_QA_2026-07-15-1321.md`, Batch A,
   "[minor] Lost games report 'No mistakes' / 100% accuracy") contains an explicit **in-app** repro of the
   resignation case that this import did not exercise, and the in-app resign path remains unmeasured. The
   rationale for leaving the calculation untouched still holds regardless of which trigger produces the badge.
   The copy fix (`review.cleanButLost`) already shipped; what remains is reproducing the in-app repro (US7.3's
   first accuracy-half task, before any close-as-not-a-bug claim) and then closing OI-37 with evidence covering
   **both** triggers.
3. **OI-21: accept first-interaction playback (status quo).** No new splash screen, no welcome card, no
   routing change, no speaker affordance. The greeting plays on whatever the user first touches; the epic's
   own acceptance criterion already permits this ("... or the accepted alternative is documented"). What
   remains is documenting the alternative and its rationale, verifying the coach's **text bubble** fully
   conveys the greeting in English and Spanish (so a user who never hears the audio loses nothing), signing
   off the `staging_checks.md` item, and closing OI-21. `shouldAutoRouteToOnboarding`'s anonymous-only
   semantics and the no-flash-of-the-sparring-game constraint still apply and are not being touched.
4. **OI-37 short-game half: a minimum-scored-moves threshold was considered and rejected.** All 7 observed
   accuracy-100% losses are very short, 1–6 user-move `time-up` (clock) losses (movestring lengths 2, 5, 5, 8,
   11, 13, 13), and a threshold of 7 user moves would have suppressed the badge on all 7 of them at a cost of
   48 / 342 games (14.0%, see Non-obvious facts for the full trade-off table). The owner rejected building it:
   the change touches multiple render surfaces (in-app Review, Past Games, and — if a Papergames derivation
   were added — the imported-game badge) for a narrow cosmetic case, and carries more regression risk than the
   problem is worth. Nothing is shipped for the short-game half; the measured trade-off data is kept for the
   record, not as a spec-phase pick.
5. **US7.3's deep-reveal spend policy is already decided — record-and-close, ship no gate.** Approved
   2026-07-16 (`docs/superpowers/specs/2026-07-16-qa-remediation-decisions-design.md` §D2): retire the
   "blunders only" constraint from the anon design doc, ship no code. A server-side gate isn't cleanly
   implementable (the anon gate is keyed by position+column, which maps ambiguously to stored rows); a
   client-only gate is theatre (`/api/blunders/:id` is a public no-auth permalink); and blocking a click the
   user deliberately made costs conversion. This also avoids contradicting shipped spec-042's invariant that
   severity is "label + color only, never gates an action." Because `docs/superpowers/` is throwaway by repo
   convention, D2's substance is restated here and must also land in `docs/open_issues.md`, not left as a
   pointer.

**Non-obvious facts**
- Browsers block `audio.play()` until a user gesture; the mission screen is reached by an **auto-route** with
  no prior gesture. This is a hard browser rule, not a code bug.
- OI-35's headline unfixed item is a **cold-load-specific** nav bug: `/mistakes ↔ /stats` infinite-toggles on
  a cold-loaded `/mistakes` (empty nav stack); in-session navigation unwinds correctly. This was **not**
  re-verified during the brainstorm — check it live before sizing US7.1.
- OI-35's "lesson content is English-only in Spanish mode" finding is **stale** — all 15 lessons now carry
  `text_es`; only audio remains (Epic 5). Re-triage the file against the current tree before speccing: much of
  the 23-finding backlog (25 `####` blocks minus 2 `[passes]` entries, which record successes rather than
  findings; plus 4 additional `❌ fail` checklist rows outside any `####` header that must be separately
  swept) has shipped since 2026-07-16 (verified at source: `review.cleanButLost` is live in
  `ReviewScreen.jsx:293` and in both `en.json`/`es.json` at line 1005; `server/index.js:577` now reads
  `FREE_DEEP_REVEAL_WEEKLY_LIMIT` from `quotaLimits.js` rather than the old hardcoded `5`) — **US7.1's first
  task is a re-triage, not a fix sweep.** `docs/superpowers/plans/2026-07-16-qa-2026-07-15-remediation.md`
  (§"Finding Inventory → Workstream Map", lines ~51–83) holds a 25-item workstream map useful as a
  cross-check, but the findings file remains the authority and 23 is the correct disposition count (the map's
  25 counts 2 `[passes]` entries that are not findings). The `/api/scores` 500 on a malformed movestring
  and the remaining English-in-Spanish leaks were also not re-verified — check live before sizing US7.1.
- The candidate-generation "fetch failed" finding was **reclassified as an environmental flake**, not a bug
  (memory `project_generate_candidates_fetch_failed_flake`) — do not re-open it.
- **OI-37 finish-reason evidence (342-game Papergames import, run during this brainstorm):** account
  `69e773d36bf9938bffc1509a` was imported to 342 rows (171 wins / 160 losses / 11 draws;
  `node --env-file=server/.env server/scripts/import_papergames_blunders.mjs --user-id 4b8dac6d-c8db-4c01-9458-cb5781f3df56 --limit 300`,
  292 imported / 8 skipped / 171.6s). Across the 160 losses with a non-null accuracy:

  | loss `finish_reason` | n | max accuracy | losses at exactly 100% |
  |---|---|---|---|
  | `winner` (decided on the board) | 144 | 94% | 0 |
  | `resignation` | 4 | 89% | 0 |
  | `time-up` | 12 | 100% | 7 |

  All 7 accuracy-100% losses are `time-up` (clock) losses; the evidence is Papergames-only, the in-app
  (non-imported) resign path was not measured and US7.3 must verify it separately before closing OI-37. The
  full observed `finish_reason` enum across the 342-row dataset is exactly three values: `winner`, `time-up`,
  `resignation`. Full-board draws also carry `finish_reason = 'winner'` (with `result = 'draw'`, n=11) — a
  "decided on the board" filter, if one were ever needed, is exactly `finish_reason === 'winner'`. This is
  recorded as a measured fact only; no such filter is being built by this epic.
- **`StatsScreen`'s "avg accuracy" card is puzzle accuracy, not game accuracy.** Verified at source:
  `StatsScreen.jsx:37` sets `accuracy` from `store.getStats()`, which aggregates `puzzle_attempts`
  (`server/statsAggregate.js:64,72`; `server/userRoutes.js:57,83`) — `stats.avg_accuracy` is only an i18n
  label key (`grep -rn avg_accuracy src/ server/ server/migrations/` returns exactly that one hit), not a data
  field. There is no average-game-accuracy metric anywhere in the app; `PastGamesListScreen.jsx:91-92,102-103`
  renders per-game badges only, with no aggregate. Do not re-derive an aggregate-accuracy threshold question
  from `StatsScreen` — there is nothing there to threshold.
- **OI-37 threshold trade-off (measured over all 342 games; kept for the record — see Settled decision #4,
  the threshold itself was considered and rejected):**

  | threshold (user moves) | games whose badge is suppressed | of the 7 perfect losses caught |
  |---|---|---|
  | 4 | 22 / 342 (6.4%) | 3 / 7 |
  | 5 | 27 / 342 (7.9%) | 4 / 7 |
  | 6 | 32 / 342 (9.4%) | 5 / 7 |
  | **7** | **48 / 342 (14.0%)** | **7 / 7** |
  | 8 | 65 / 342 (19.0%) | 7 / 7 |
  | 10 | 103 / 342 (30.1%) | 7 / 7 |

  The 7 perfect-loss user-move counts were 1, 2, 2, 4, 5, 6, 6 (movestring lengths 2, 5, 5, 8, 11, 13, 13).
  Genuinely-earned 100% scores exist at 13, 17, and 18 user moves and must **not** be suppressed.
- **Scored-count facts, verified at source (kept for the record; no rule needed now the threshold is
  rejected):** the in-app Review screen has the real scored count client-side —
  `ReviewScreen.jsx:299` reads `analysis && analysis.scored > 0`, and `ReviewScreen.jsx:145` computes accuracy
  from `data.scored`. The Papergames path does **not** store a scored count: `papergamesImporter.js:167`
  computes `const accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : null` and discards
  `scored`; `papergames_games` (migration `038_papergames_games.sql`, accuracy added in
  `039_papergames_accuracy.sql`) has no such column, and `papergamesImporter.js:112`
  (`if (legalCount <= 1) continue`) skips forced moves from scoring, so any moves-string-derived count would
  only ever be an upper bound on the real `scored`. This in-app-exact vs. derived-upper-bound mismatch was
  part of why a cross-surface threshold was rejected as more regression risk than the problem is worth — no
  `scored_moves` column, no migration, no backfill is being built.
- The anon free deep reveal being spendable on a *suboptimal* move contradicts the "blunders only" design
  intent — this is now a **closed** product call (see Settled decision #5), not an open one.
- Automation Chrome fakes autoplay permission, so audio can ship silent and pass an agentic QA pass
  (memory `project_app_qa_setup_gotchas`) — verify onboarding audio in a real browser.
- `agentic_QA_2026-07-25-0015.md` at the repo root is a **lessons-only** run belonging to Epic 6 — do not
  mistake it for the 2026-07-15 general run this epic is scoped to.

**Authoritative sources of truth**
- `agentic_QA_2026-07-15-1321.md` (repo root) — the full findings list
- `docs/open_issues.md` — OI-35, OI-21, OI-37
- `docs/architecture/frontend-conventions.md` (screen registry, URL mapping, `SESSION_ONLY_SCREENS`)
- `staging_checks.md` §Epic 8 ("Coach greeting is actually AUDIBLE") — note that heading is
  `staging_checks.md`'s **own** epic numbering (the onboarding epic), unrelated to this file's Epic 8
- memories: `project_app_qa_setup_gotchas`, `project_generate_candidates_fetch_failed_flake`

**User stories & tasks**

**US7.1 — Re-triage, commit, and route the QA backlog (8 tasks).** This is a **triage-and-route** story, not
a fix sweep: commit `agentic_QA_2026-07-15-1321.md` to the repo (it is currently untracked); re-triage every
finding against the current tree and give each one exactly one of five dispositions — **fixed** (already
shipped, cite the evidence), **stale** (no longer applicable), **fix-here** (in scope for this epic — limited
to the three live-check items below), **owned-by-Epic-N** (record a pointer only, do not edit — see NOT
included for the two known cross-epic findings), or **new `OI-N`** (confirmed still open, not fixed here —
file it in `docs/open_issues.md`); live-check the three items not yet re-verified (`/mistakes ↔ /stats`
cold-load nav loop, `/api/scores`'s 500 on a malformed movestring, and any remaining English-in-Spanish leak
**not** already owned by Epic 6 US6.5) and fix only those three if still confirmed open; confirm the anon
challenge-progress 401 fix still holds; update the findings file in place with the triage result; write the
durable triage outcome (including every owned-by-Epic-N pointer and every new `OI-N`) into `docs/open_issues.md`
under OI-35.

**US7.2 — Document the accepted onboarding alternative (4 tasks).** Write up the accepted alternative
(first-interaction playback, status quo) and its rationale in `docs/open_issues.md` under OI-21; verify the
coach's text bubble fully conveys the onboarding greeting in English and Spanish with no audio; sign off the
`staging_checks.md` item; close OI-21. No prototyping, no routing change — the design question is resolved,
this story only records and verifies it. Four tasks is correct for its scope, not a floor to pad to — this
epic is deliberately mostly record-and-close.

**US7.3 — Verify-and-close on the review surface (5 tasks).** Two independent halves that share one screen,
both landing as record-and-close (no threshold, no gate — see NOT included). Five tasks is correct for its
scope, not a floor to pad to:
- *Deep-reveal spend policy* — record D2's already-approved outcome (retire the "blunders only" constraint,
  ship no gate) in this epic and in `docs/open_issues.md`; delete the stale "blunders only" line from the
  anon design doc, noting the documented reversal trigger (evidence anonymous users routinely spend the
  reveal on suboptimal moves); close the issue. Ship no gate code.
- *Accuracy vs outcome* — **first**, before any close-as-not-a-bug claim, reproduce the findings file's
  in-app repro: play a sparring game with only optimal board moves, then resign — check whether Review still
  shows "Clean game. Nothing to revisit." / Accuracy 100%. If it still reproduces, that is a live bug and this
  story fixes it. Either way, close OI-37's finish-reason question in `docs/open_issues.md` with evidence
  covering **both** triggers — the 342-game Papergames clock-loss breakdown and the in-app verification
  result; verify the already-shipped `review.cleanButLost` copy still reads correctly.

**Acceptance criteria**
- Every finding in `agentic_QA_2026-07-15-1321.md` is marked fixed, stale, or explicitly deferred with a
  reason — none silently unaddressed — and the file itself is committed to the repo.
- Back navigation from a cold-loaded `/mistakes` reaches Home.
- The onboarding greeting text bubble fully conveys the greeting in English and Spanish, and the accepted
  first-interaction-playback alternative is documented in `docs/open_issues.md` and `staging_checks.md`.
- The findings file's in-app resign repro has been reproduced (or found not to reproduce) before OI-37 is
  closed, and the OI-37 closeout text in `docs/open_issues.md` records evidence covering **both** triggers —
  the 342-game Papergames `finish_reason` breakdown and the in-app verification result — before the issue is
  closed.
- No accuracy-badge threshold or suppression logic is added on any surface; the accuracy calculation and its
  display are unchanged from before this epic.
- The deep-reveal spend-policy decision (D2) is recorded in this epic and in `docs/open_issues.md`, and the
  stale "blunders only" line is removed from the anon design doc.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Lesson content or audio work (audio is Epic 5, lessons are Epic 6).
- Re-running a full `/app-qa` pass (that is a separate session, not this epic).
- Re-opening the candidate-generation "fetch failed" finding.
- Implementing any anonymous deep-reveal spend gate — Settled decision #5 rules this out; the story is
  record-and-close only.
- Any onboarding entry redesign (splash, welcome card, routing change, speaker affordance) — Settled
  decision #3 accepts first-interaction playback as-is.
- ~~i18n literal sweeps in `src/screens`/`src/components` — owned by Epic 6 US6.5; US7.1 records a pointer
  for any such finding rather than fixing it here.~~ **Exclusion lifted 2026-08-01.** Original rationale
  (kept for history): this exclusion existed to avoid Epic 7 duplicating or conflicting with Epic 6 US6.5's
  own sweep, which was running concurrently. **Epic 6 has since shipped** (commit `4d78aa2`, "Spec 052
  (Epic 6)") — the conflict the exclusion guarded against no longer exists, so a leak Epic 6's sweep missed
  is cheap to fix in place and US7.1 now fixes it under FR-006 rather than merely pointing at it. Scope
  stays narrow: this authorizes fixing only the specific leaks US7.1's triage actually finds, not a fresh
  repo-wide re-sweep of `src/screens`/`src/components` — that work already happened under Epic 6.
- Upgrade-funnel / payments findings (e.g. OI-35's "upgrade funnel has orphaned ends") — owned by Epic 3,
  Lane A, which runs in a parallel worktree; US7.1 records a pointer, does not edit.
- Any minimum-move / minimum-scored-move threshold on the accuracy badge — considered and rejected, see
  Settled decision #4.

**Open questions** — the three brainstorm items are resolved; see Settled decisions #1–#5. No bounded
spec-phase picks remain: the short-game threshold's exact value and the derive-vs-column choice for the
Papergames scored-move count are both moot now that the threshold itself was rejected (Settled decision #4).

### Deferred
- **Anonymous deep-reveal spend gate.** Not implemented now; the documented reversal trigger is evidence that
  anonymous users routinely spend the free reveal on suboptimal (non-blunder) moves — if that evidence
  appears, the response is to *steer* users toward blunders (e.g. copy/UI nudges), not to *restrict* the
  reveal, per the D2 rationale.

---

## Epic 8 — Dev Infrastructure & Test-Quality Baseline

**Intent:** Make the repo's own gates trustworthy: a lint that can fail — and actually covers the whole
tree, not just `.js` — a DOM suite that fails instead of hanging, a regression test that actually covers the
bug it names, and confirmation that the production CSP already carries the five fixes OI-58 was tracking.

**Issues covered:** OI-70 (`npm run lint` is red repo-wide, 282 errors + 14 warnings across 71 files —
gates nothing, and 141 `.mjs` files get zero rules applied regardless), OI-71 (removing a `Board` guard
hangs `test:dom` instead of failing it), OI-16 (dead tested `deepRevealPhase` helper), OI-29 (stale
SplitReveal contract + no render-level regression test), OI-58 (five CSP fixes — verified already present
on `main`; close out with evidence and confirm the deployed build emits them), OI-6 (superseded de-dup
contract wording), OI-72 (documented decision, doc-only).

**Sizing note:** three stories. The worktree-port items (OI-51/OI-52) moved to Epic 4 US4.4, where they sit
with the other environment/ops verifications rather than padding a fourth story here. US8.3 shrank once
OI-58's port task was replaced by a close-out+verify task; US8.1 grew by one task (widen the eslint `files`
glob to `.mjs`/`.cjs`) — its final task count is unpredictable until that widening is applied and the newly
covered files are triaged.

**Settled decisions**
1. **Split the eslint config by environment first** (browser for `src/`, node for `server/`, `scripts/`,
   `tests/`) before touching any individual rule — that alone should clear most of the errors.
2. Only after the baseline is green does `lint` become a gate.
3. **OI-58's CSP fixes are already on `main`** — verified: the `helmet(...)` block in
   `connect-four/server/index.js` is byte-identical between `main` and `stagging`, and commit `ae3c006`
   ("fix(csp): allow Google Fonts stylesheet and font files", 2026-07-18) is reachable from `main`. The
   owner confirmed: do **not** port anything or touch branch topology. Instead, mark OI-58 ✅ RESOLVED
   citing `ae3c006` and the byte-identical diff as evidence, and perform one real check that a production
   build actually emits the directives (a real `npm run build` + server restart — CSP never lands under
   `npm run dev`; the server reads `dist` at boot). Also disambiguate OI-58's entry: its trailing
   "**Resolved (2026-07-18)**" paragraph is about an unrelated Paddle static import, not the CSP, and reads
   ambiguously as-is.
4. OI-72 is recorded as a decision, not fixed: the `...slide` spread is what makes unknown authored fields
   survive a round trip.
5. Widen `connect-four/eslint.config.js`'s `files` glob to include `.mjs`/`.cjs` as an explicit US8.1 task —
   ESLint 9 walks these files but currently applies **zero rules** to them (`npx eslint --print-config` on a
   `.mjs` test file returns 0 rules vs. 78 for `server/index.js`), so all of `server/tests/*.test.mjs`,
   `server/scripts/*.mjs`, and `server/*.test.mjs` are effectively unlinted today. Prove the widened gate
   works by temporarily inserting a real violation in a `.mjs` file and confirming `npm run lint` goes red
   (per `docs/architecture/testing-conventions.md` §"Grep-as-lint tests must not use bare grep").

**Non-obvious facts**
- **Re-measure this epic's facts before acting on them.** Two of this epic's three headline facts had
  already gone stale by the time of review: OI-58's CSP port was already done by the owner out-of-band, and
  OI-70's error count had drifted from 254 to 282. Re-measure at the start of the `/epics-manager` run
  rather than trusting the numbers below.
- Always run `eval "$(./worktree-ports.sh)"` before starting or killing any server — unconditionally, every
  session. Never kill by a bare port number or `pkill node` (`CLAUDE.md`,
  `docs/architecture/worktree-conventions.md`). This applies to running the suites below, even though the
  port *fix* itself lives in Epic 4.
- `npm run test:fast`'s baseline in a worktree is **5 RED, not 0** — OI-82's ENOENT reason-engine tests fail
  in the main checkout too (memory `project_repo_worktree_setup` §2d). Judge this epic's work against 5
  pre-existing failures, not a clean baseline; wiring `lint` into the test scripts must not be confused with
  making `test:fast` itself green.
- OI-71's hang is a genuine block (0% CPU, stable RSS across three runs), not a busy loop; root cause
  uninvestigated, suspicion is jsdom/testing-library interaction rather than `Board` itself.
- OI-29's existing test only exercises the pure `computeFrozenBoardWidth`, which is still frozen by
  signature — so it passes unchanged and gives **zero** coverage of the bug that was fixed.
- The jsdom/`global-jsdom` peer mismatch (OI-16's second bullet) is **resolved** — do not reintroduce
  `--legacy-peer-deps`; Railway's `npm ci` is strict and `railpack.json` hides it
  (memory `project_spec031_staging_production_deploy`).
- Re-measured lint baseline: **282 errors + 14 warnings across 71 files** (164 `no-undef`, 159 of those
  `process`), point-in-time. 3 of the 282 are `Unused eslint-disable directive` reports
  (`server/index.js:4260`, `server/tests/renderCoverageUniverse.test.mjs:28`,
  `tests/classifier/classifier.test.js:221`) that will shift as rules change.
- `main` is ~496 commits diverged from `stagging` generally, but that is irrelevant to OI-58: the specific
  `helmet(...)` block diverged not at all (memory `project_paddle_integration`).

**Authoritative sources of truth**
- `docs/architecture/testing-conventions.md` (`test:fast` vs `test` vs `test:dom`), `CLAUDE.md` §Running tests
- `docs/architecture/worktree-conventions.md`
- `docs/architecture/server-conventions.md` §"CSP Directive Rationale"
- `docs/open_issues.md` — OI-70, OI-71, OI-16, OI-29, OI-58, OI-6, OI-72 (OI-51/OI-52 moved to Epic 4), plus
  the whole file for US8.3's closeout audit
- memories: `project_csp_helmet_traps`, `project_repo_worktree_setup`, `project_spec031_staging_production_deploy`

**User stories & tasks**

**US8.1 — A lint that can fail (task count TBD, pending the `.mjs`/`.cjs` widening).** Split
`eslint.config.js` by environment; widen the config's `files` glob to include `.mjs`/`.cjs` so the gate
actually covers the tree; re-measure the error count against the widened glob; run `--fix`; triage the
remainder into fix-now vs rule-off with a stated reason; remove the unused `boardToSpec` import
(`src/components/admin/BoardEditor.jsx`); get to zero; prove the gate by temporarily inserting a real
violation in a `.mjs` file and confirming `npm run lint` goes red; add `lint` to the test scripts and
document the gate.

**US8.2 — DOM/test-suite reliability (7 tasks).** Reproduce OI-71's hang by deleting `&& value === 'empty'`;
bisect the non-returning assertion; make the mutant fail cleanly; annotate the SplitReveal contract doc as
superseded; add the render-level SplitReveal regression (board width ≤ pane width, `constrain`/maxWidth stays
applied under a short container) — add it **by name** to the `test:dom` script string in
`connect-four/package.json` (a hand-maintained space-separated file list; there is no auto-discovery) and
confirm it runs; delete the `deepRevealPhase` export and **only** its own test case
(`'phase transitions: loading -> slow -> timedOut…'`) from `tests/unit/deepRevealTimeout.test.js`, keeping
the `'hard cap is well beyond the soft hint…'` test intact (it covers the still-live
`DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS` constants used at `src/components/DeepRevealPane.jsx:12,184-190`)
— update the `test` and `test:fast` script strings only if a whole file's worth of coverage moves, not for
this single-test deletion.

**US8.3 — CSP close-out + doc bookkeeping (task count reduced — no port).** Diff `server/index.js`'s
`helmet(...)` block between `stagging` and `main` to confirm the byte-identical match and cite commit
`ae3c006`; mark OI-58 ✅ RESOLVED with that evidence (no code change, no worktree, no merge); disambiguate
OI-58's trailing "Resolved (2026-07-18)" paragraph as being about the unrelated Paddle static import, not
CSP; verify the deployed build actually emits the directives via a real `npm run build` + server restart
(`eval "$(./worktree-ports.sh)"` first, never a bare port; never under `npm run dev`); confirm the block
matches `docs/architecture/server-conventions.md` §"CSP Directive Rationale"; add the SUPERSEDED note to
`contracts/api-auth-session.md` (OI-6); record OI-72 as intended behaviour; apply the "Already resolved"
table's verified findings to `docs/open_issues.md` (OI-1, OI-15, OI-12, OI-24, OI-77 and the lesson-text
half of OI-18/36/64); then **audit the closeout convention across the whole backlog** — walk every `OI-N`
this backlog covers and flag any whose code shipped in Epics 1–7 but whose entry still reads as open.
That audit is a backstop, not the primary mechanism: each epic closes its own issues, and this story must
not re-close issues owned by other epics.

**Acceptance criteria**
- `npm run lint` exits 0 on a clean tree (including `.mjs`/`.cjs` files) and is wired into the test scripts.
- A deliberately-introduced error in a `.mjs` file makes `npm run lint` fail — proving the widened gate,
  not just the widened glob.
- The `windowCounts` guard mutant fails with an assertion, not a hang.
- The new SplitReveal DOM regression test is present by name in `test:dom` and observed running.
- OI-58 is closed as ✅ RESOLVED citing `ae3c006`, and a real production build's response headers were
  confirmed to carry the CSP directives (not just the source diff).
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Migrating test runners or adding Playwright.
- Merging `stagging` into `main`.
- Porting or touching branch topology for OI-58 — it is already resolved on `main`; this epic only verifies
  and closes it out.
- The worktree-port self-derive fixes (Epic 4 US4.4).

**Open questions**
- None. The prior question ("does the owner want the `main` CSP PR done here, or will they continue to
  port it themselves?") is resolved — see Settled decision #3: the fixes are already on `main`, and the
  owner confirmed US8.3 does close-out + build verification, not a port.

---

## Epic 9 — Legacy `correct_col` Scalar Retirement

> **Lane C, isolated, runs alone.** Epic 9 is Lane C (with Epic 8), not Lane A, even though its subject
> matter is Epic 1's unfinished business. Its 22-file mechanical sweep across server and frontend overlaps
> concrete files Lane A is still touching while it runs (`server/predicates.js`,
> `server/answerSetInvariant.js`, `server/evaluateMoveHandler.js` vs. Epic 2's `server/classifier.js`/
> `llmCoachHelpers.js` and Epic 4's `server/index.js` handlers/`classifier.js`) — the same conflict profile
> that keeps Epic 8's lint sweep isolated. **Dependency note:** this epic requires **spec 051 (Epic 1) to
> have shipped and merged** — `correct_cols` must already exist and be populated (generation + backfill)
> before any consumer can be migrated off the scalar, and the compatibility sync spec 051 ships (FR-017) is
> exactly what keeps `correct_col` safe to read while this epic's migration work is in flight. This is a
> between-lanes dependency on 051 specifically, not a within-Lane-A sequencing rule — Epic 9 does **not**
> need to wait for Epics 2–4 to finish, only for spec 051 to merge. Do not start this epic's `/epics-manager`
> run until spec 051 has merged and its backfill has run.

**Intent:** Finish the retirement spec 051 deliberately left undone. Spec 051 (Epic 1) introduced
`correct_cols integer[]` as the computed-once, solver-gated source of truth and — after a same-day owner
reversal on 2026-07-29 — keeps the legacy scalar `correct_col` **in sync** rather than migrating every
consumer and dropping it, because the re-derived consumer inventory came back at 105 references across 22
files, not the 62/11 estimate the original "migrate and drop in the same feature" decision was made on. This
epic is that migration and drop, done properly and sized on its own: eliminate the last duplicate source of
truth for a puzzle's/candidate's correct column, without touching the unrelated lesson-JSON field of the
same camelCase name.

**Issues covered**
- **OI-81** — Retire the legacy `correct_col` scalar once `correct_cols` is the source of truth. Carries a
  consumer inventory (known-as-of-2026-07-29: 105 references across 22 files) and the rationale for the
  2026-07-29 split; this epic is its spec-ready home. **The inventory is a snapshot, not a task list** —
  re-derive it fresh at pickup time per US9.1; a later re-count already found a materially different total,
  and any count will keep drifting in this concurrently-edited repo (Settled decision 7).

**Settled decisions** (owner, 2026-07-29 unless noted)
1. This epic is **split out of spec 051** by owner decision on 2026-07-29, after the consumer inventory —
   once actually re-derived against the worktree rather than estimated — came back at **105 references
   across 22 files**, not the 62/11 figure the original "migrate and drop in the same feature" decision had
   been made on. The scope was judged too large to bolt onto an already-large feature (schema migration +
   backfill + API contract change).
2. The **snake_case `correct_col`** (the DB column name) is the unambiguous grep form for finding consumers.
   The camelCase API/object mirror `correctCol` is **not** unambiguous — see Non-obvious facts.
3. The authored **lesson-JSON** field `correctCol` (Socratic/confirmation-challenge nodes) is **explicitly
   out of scope** for this epic — it has nothing to do with the `puzzles`/`candidates` table and must not be
   touched by any migration script this epic writes.
4. The column-drop migration **MUST land strictly after every consumer has migrated** to `correct_cols` —
   dropping the column while a consumer still reads it produces a silent runtime failure, not a migration
   error — and its migration number **cannot be reserved in advance** (this is a concurrently-edited repo;
   re-verify the next migration number immediately before writing the drop migration, same as spec 051's own
   numbering caveat).
5. This epic **depends on spec 051 having shipped and merged**: `correct_cols` must exist, be populated at
   generation time, and be backfilled onto every existing row before any consumer migration here can
   proceed. This is a **between-lanes** dependency on 051 specifically, not on the rest of Lane A — Epic 9
   does not need Epics 2–4 to finish, only spec 051 to merge.
6. **Epic 9 is Lane C, not Lane A**, despite depending on Epic 1's output. Lane C is this file's isolated
   lane: Epic 8 runs alone because its repo-wide lint sweep would conflict with every open branch, and Epic
   9's mechanical sweep across server and frontend has the same conflict profile — it touches
   `server/predicates.js`, `server/answerSetInvariant.js`, and `server/evaluateMoveHandler.js` while Epic 2
   (Lane A) is still working in `server/classifier.js`/`llmCoachHelpers.js` and Epic 4 (Lane A) in
   `server/index.js` handlers/`classifier.js` — running Epic 9 concurrently with the rest of Lane A would
   mean repeatedly hand-merging the same files. Epic 9 runs alone, only after spec 051 merges; it does not
   wait for all of Lane A to finish.
7. (owner, 2026-08-03) **The epic's enumerated file lists and reference counts (105/22, and the per-file
   lists in US9.2–9.4) are known-as-of-2026-07-29 snapshots, not an authoritative work breakdown.** US9.1
   must re-derive the inventory fresh against the worktree at pickup time and produce a per-file triage
   table; that triage table — not the lists elsewhere in this epic — is the contract US9.2–9.4 consume. Do
   not treat any count or file list in this epic as current; re-verify before planning tasks against it.
8. (owner, 2026-08-03) **The wire contract for `correctCol` is retired, not preserved as a deprecated
   alias.** Every HTTP-crossing field — the `/api/puzzles/:id` and evaluate-move response fields, the
   evaluate-move request body field, and the `CurationWorkspace.jsx` query-string parameter — becomes the
   array form `correctCols`. The legacy singular `correctCol` wire field is dropped outright in the same
   change, not kept alongside it: keeping it would preserve exactly the duplicate source of truth this epic
   exists to eliminate. This is safe because the frontend and server ship in the same deploy, so there is no
   independently-versioned stale client that would break.
9. (owner, 2026-08-03) **The `undercut`/`overcut` NULL carve-out from spec 051's FR-019 must survive this
   migration unchanged.** Those two categories deliberately have no meaningful single "correct column"
   (`correct_cols[0]` would typically be column 0, a meaningless value), so spec 051 keeps `correct_col =
   NULL` for them. Every single-column display consumer migrated by this epic — the curation board hint
   marker (`CurationWorkspace.jsx`), the puzzle picker's `col {puzzle.correct_col}` label
   (`PuzzlePickerModal.jsx`), and the API response sites in `server/index.js` — must keep rendering "nothing
   to show" for `undercut`/`overcut` after the swap to `correct_cols`, not fall back to displaying
   `correct_cols[0]`.
10. (owner, 2026-08-03) **`correctCol` has a third sense, and it is out of scope.** Beyond (i) the DB scalar
    this epic retires and (ii) the authored lesson-JSON field (Settled decision 3), a computed *result-shape*
    field of the same name is returned by every `server/predicates.js` evaluator and used the same way in
    `classifier.js`/`shapeDescriptor.js` — never read from or written to the database. This sense keeps its
    current name; only camelCase call sites that read/write the DB column or cross the HTTP wire (Settled
    decision 8) are migrated. Renaming the result-shape field is out of scope — it would be a materially
    larger sweep on files Epic 2 is concurrently touching, for naming clarity rather than correctness, and is
    inconsistent with this epic's framing as pure plumbing retirement.
11. (owner, 2026-08-03) **The puzzle↔lesson boundary gets thin adapters on both sides, not a shared type.**
    Lesson JSON keeps its single-column scalar completely unchanged (Settled decision 3 stands).
    `AdminLessonEditorScreen.jsx` takes `correct_cols[0]` when copying a puzzle's answer into a lesson node;
    `ChallengeScreen.jsx` wraps the lesson node's scalar as a one-element set (`correctCols: [ch.correctCol]`)
    when sending it out in a puzzle-shaped grading request. Neither seam touches authored lesson content.

**Non-obvious facts**
- The consumer inventory (known-as-of-2026-07-29: 105 references / 22 files) lives in
  `docs/open_issues.md` **OI-81** — read it there rather than duplicating it here, but treat it as a stale
  snapshot: re-derive it fresh via `grep -rn "correct_col\b" connect-four/server connect-four/src
  connect-four/scripts connect-four/tests` (excluding `node_modules`) at pickup time, and let US9.1's
  resulting triage table be the contract, not this number (Settled decision 7).
- **Three specific files are known "sync writers"** that keep `correct_col` in sync with `correct_cols`
  under spec 051's FR-017, and must be explicitly triaged (not just swept) when this epic lands:
  `server/scripts/backfill-correct-cols.mjs` (writes `correct_col` alongside `correct_cols` on every
  backfilled row — **disposition: remove the `correct_col` write**), `server/promotePuzzleRow.js` (copies
  the scalar candidate→puzzle on promotion — **disposition: remove the copy**), and
  `server/candidate-generator.js`'s central sync point that decides the scalar's value per category
  (**disposition: remove the scalar computation**, keeping only the `correct_cols` computation).
  `tests/unit/checkPredicateSortAndScalarSync.test.js` exists only to assert the scalar stays in sync with
  the set — **disposition: delete it, do not migrate it** — once the scalar is gone there is nothing left
  for it to assert.
- **`correctCol` has three senses, not two — triage every call site against all three before touching it:**
  1. **The DB scalar** (`puzzles.correct_col` / `candidates.correct_col`) — in scope, this epic retires it.
  2. **The authored lesson-JSON field** (Socratic/confirmation-challenge nodes: `server/lessonLoader.js`,
     `server/scripts/verify_lesson_content.mjs`, `SocraticScreen.jsx`'s `col === socratic.correctCol` —
     memory `project_lesson_interactivity_evaluation`) — explicitly out of scope (Settled decision 3); a
     naive find-and-replace across every `correctCol` occurrence would silently corrupt lesson content that
     has nothing to do with the `puzzles`/`candidates` table.
  3. **The computed result-shape field** returned by `server/predicates.js` evaluators and used the same way
     in `classifier.js`/`shapeDescriptor.js` — the answer a function just computed, never a value read from
     the database — also out of scope (Settled decision 10).
  Two call sites sit exactly on the boundary between sense 1 and sense 2 and need the thin adapters from
  Settled decision 11: `AdminLessonEditorScreen.jsx` (`correctCol: puzzleData.correct_col`) and
  `ChallengeScreen.jsx` (`correct_col: ch.correctCol`).
- Three call sites consume the API-level `correctCol` mirror with no `correct_col` substring to grep for
  and must be found by name, not by grep: `server/evaluateMoveHandler.js` (destructures the legacy
  client-supplied `correctCol` from `req.body`), `server/predicates.js` (`buildPredicatePuzzle`'s
  `correctCol` parameter — this parameter IS in scope, unlike the sense-3 result-shape field it feeds, because
  it flows from the DB scalar), and `server/answerSetInvariant.js` (`acceptedCols`'s `correctCol`
  destructure).
- **Upstream-only files, migration-time check only, not must-migrate**: `server/gameSampling.js` and
  `server/debug-claimeven.js` read/produce a `correctCol` value upstream of the DB write; they never
  themselves read or write the stored column, so they need a migration-time smoke check that they still
  work once `correct_col` is gone, not inclusion in the must-migrate call-site list.
- `connect-four/server/migrations/016_correct_col.sql` is the column's origin (`correct_col integer DEFAULT
  NULL` on both `puzzles` and `candidates`) — this epic's drop migration is its removal. Note
  `061_correct_cols.sql` also mentions the scalar (in comments, not code) — the acceptance-criteria grep
  exclusion must name both `016` and `061`, not just `016`. Re-verify the actual latest migration number on
  disk immediately before numbering the drop migration (Settled decision 4) — do not trust any number
  written in this epic, since this is a concurrently-edited repo and migration filenames have already
  collided once (`061_correct_cols.sql` vs. `061_security_lints.sql`).

**Authoritative sources of truth**
- `docs/open_issues.md` OI-81 — the inventory table and issue record this epic is built from; treat its
  counts as a stale snapshot (Settled decision 7).
- `specs/051-pattern-acceptance/spec.md` FR-016a (single-column UI displays *an* accepted answer — already
  settles how such displays render once only the set exists), FR-017 (kept-in-sync requirement this epic
  supersedes), and FR-019 (the `undercut`/`overcut` NULL carve-out this epic must preserve — Settled
  decision 9).
- `docs/architecture/api-conventions.md` — documents the `correctCol` wire contract in three places (the
  `/api/puzzles/:id` camelCase rename, the `/api/puzzles/draw` snake_case-vs-camelCase mismatch, and the
  evaluate-move select list); read before touching any response/request field and update per Settled
  decision 8.
- `connect-four/server/migrations/016_correct_col.sql` — the column's origin.
- `docs/architecture/data-model.md`, `docs/architecture/db-schema.md` — read before writing the drop
  migration; both will need updating to remove the "kept in sync" language spec 051 introduces.
- memory `project_lesson_interactivity_evaluation` — the lesson-JSON `correctCol` carve-out.

**User stories & tasks**

**US9.1 — Fresh inventory + migration plan (5 tasks).** Re-derive the consumer inventory fresh against the
worktree at pickup time via `grep -rn "correct_col\b" connect-four/server connect-four/src
connect-four/scripts connect-four/tests` (excluding `node_modules`) — do not rely on OI-81's or this epic's
counts, both are known-as-of-2026-07-29 snapshots (Settled decision 7); produce a per-file triage table
classifying every hit as migrate/delete/smoke-check-only, and explicitly resolve the three no-substring
camelCase call sites and the three sync-writer files + sync-assertion test named in Non-obvious facts. **This
triage table, not the file lists in US9.2–9.4, is the contract those stories consume.** Triage every camelCase
`correctCol` call site into "DB scalar" / "lesson-JSON field, out of scope" / "computed result-shape field,
out of scope" (Settled decisions 3 and 10); order the migration plan by dependency (server core → server
scripts → frontend → tests, given `evaluateMoveHandler.js` and `predicates.js` are read by nearly everything
else); confirm spec 051's backfill has actually completed against the target DB before starting (Settled
decision 5).

**US9.2 — Migrate server-side consumers (9 tasks).** Using US9.1's triage table (known-as-of-2026-07-29
starting point: `server/index.js`, `candidate-generator.js`, `server/scripts/audit_answer_ambiguity.mjs`,
`server/shapeDescriptor.js`, `server/classifier.js`, and the three no-substring call sites —
`evaluateMoveHandler.js`, `predicates.js`, `answerSetInvariant.js`), migrate every DB-scalar-reading and
wire-crossing site to `correct_cols`/`correctCols` per Settled decision 8 (response/request/query-string
fields become the array form; the legacy singular wire field is dropped, not aliased). Explicitly resolve
the three sync-writer files from Non-obvious facts: remove the `correct_col` write in
`server/scripts/backfill-correct-cols.mjs`, remove the scalar copy in `server/promotePuzzleRow.js`, and
remove the scalar computation in `server/candidate-generator.js`'s central sync point. Re-run
`npm run test:fast` after each file group; smoke-check `gameSampling.js` and `debug-claimeven.js` per
Non-obvious facts (they are not migrated, only verified).

**US9.3 — Migrate frontend + non-test scripts (7 tasks).** Using US9.1's triage table (known-as-of-2026-07-29
starting point: `src/screens/ChallengeScreen.jsx`, `src/components/CurationWorkspace.jsx`,
`src/components/admin/PuzzlePickerModal.jsx`, `src/lib/devFixtures.js`, `src/screens/AdminLessonEditorScreen.jsx`,
`scripts/backfill-confirmation-challenges.mjs`, `scripts/verify-undercut-puzzles.mjs`), migrate frontend
consumers off the scalar, applying the thin adapters at the puzzle↔lesson boundary (Settled decision 11) in
`ChallengeScreen.jsx`/`AdminLessonEditorScreen.jsx`. Preserve the `undercut`/`overcut` "nothing to show"
behavior (Settled decision 9) in `CurationWorkspace.jsx`'s hint marker and `PuzzlePickerModal.jsx`'s
`col {puzzle.correct_col}` label — do not fall back to `correct_cols[0]`. Manual QA pass on the admin
curation/picker screens naming `undercut` and `overcut` specifically, since these screens have no automated
test coverage of their own.

**US9.4 — Migrate the test suite (7 tasks).** Update the test files carrying `correct_col`/`correctCol`
assertions per US9.1's triage table (known-as-of-2026-07-29 starting point: `tests/integration/claimeven.test.js`,
`evaluateMoveMultiSolution.test.js`, `figure7_jshape.test.js`, `undercut_overcut.test.js`,
`tests/unit/devFixtures.test.js`, `tests/classifier/classifier.test.js`,
`tests/unit/multiSolutionAcceptance.test.js`, `tests/unit/shapeDescriptor.test.js`) to assert against
`correct_cols`. **Delete, do not migrate, `tests/unit/checkPredicateSortAndScalarSync.test.js`** — it exists
only to assert the scalar stays in sync with the set, which is meaningless once the scalar is gone. Confirm
`npm run test:fast` is green with zero remaining `correct_col`/`correctCol` references outside the
lesson-JSON carve-out and the computed-result-shape carve-out (Settled decision 10).

**US9.5 — Drop the column (6 tasks).** Verify every consumer from US9.2–9.4 is migrated (a repo-wide grep
for `correct_col\b` outside `migrations/016_correct_col.sql`, the comment mentions in
`migrations/061_correct_cols.sql`, lesson-JSON files, and the computed-result-shape sites should return
nothing); write and land the drop migration, re-verifying the actual latest migration number on disk
immediately before writing it — do not trust a cached or epic-stated number (Settled decision 4; note `061`
already collides between `061_correct_cols.sql` and `061_security_lints.sql`, so "max prefix + 1" is
ambiguous even today). Update `docs/architecture/data-model.md`/`db-schema.md` and
`docs/architecture/api-conventions.md` to remove the "kept in sync" language and document the `correctCols`
wire contract (Settled decision 8). Close out OI-81 in `docs/open_issues.md` per the closeout convention.

**Acceptance criteria**
- Zero remaining references to `correct_col` (DB column) or the DB-scalar/wire-crossing sense of
  `correctCol` in `connect-four/server/`, `connect-four/src/`, `connect-four/scripts/`, or
  `connect-four/tests/` — verified by a repo-wide grep excluding: the lesson-JSON carve-out (sense 2), the
  computed result-shape carve-out (sense 3, Settled decision 10), and the historical migration files
  `016_correct_col.sql` and `061_correct_cols.sql` (both mention the scalar; `061`'s mentions are comments,
  not code). This criterion is intentionally scoped to named exclusions, not a global "zero occurrences of
  the string" grep, because senses 2 and 3 legitimately keep the name.
- Every HTTP wire field (`/api/puzzles/:id` and evaluate-move responses, the evaluate-move request body, the
  curation query string) sends/accepts `correctCols` (array); the legacy singular `correctCol` wire field is
  gone, not present as a deprecated alias (Settled decision 8). `docs/architecture/api-conventions.md`
  reflects the new contract.
- The `undercut`/`overcut` categories still render "nothing to show" (not column 0) on the curation board
  hint marker, the puzzle picker label, and the relevant `server/index.js` response sites, after the
  migration (Settled decision 9) — verified by manual QA naming those two categories specifically.
- `tests/unit/checkPredicateSortAndScalarSync.test.js` is deleted, not migrated.
- The lesson-JSON `correctCol` field (`server/lessonLoader.js`, `verify_lesson_content.mjs`,
  `SocraticScreen.jsx`) is untouched and its tests still pass.
- The column-drop migration lands strictly after every consumer migration and `npm run test:fast` is green
  at every intermediate step, not only at the end.
- `docs/architecture/data-model.md`/`db-schema.md`/`api-conventions.md` document `correct_col` as removed,
  not kept-in-sync.
- **OI-81** is closed out in `docs/open_issues.md` in the same change that ships the drop migration, per the
  Issue closeout convention at the top of this file — resolved-with-date and evidence (the migration file
  and the scoped zero-reference grep), or a dated `UPDATE` naming exactly what remains open. A shipped fix
  with a stale backlog entry is an incomplete story.

**NOT included**
- The authored lesson-JSON `correctCol` field and its consumers (`lessonLoader.js`,
  `verify_lesson_content.mjs`, `SocraticScreen.jsx`) — a structurally unrelated field that happens to share
  a name; never in scope for this epic.
- The computed result-shape `correctCol` field returned by `server/predicates.js` evaluators and used the
  same way in `classifier.js`/`shapeDescriptor.js` — out of scope by Settled decision 10; it is never read
  from or written to the database.
- Anything spec 051 already delivers: the `correct_cols` column itself, its generation-time/backfill
  population, the stored-set/computed-live grading branches, and the FR-017 sync mechanism this epic
  supersedes once retirement completes.
- Re-litigating the relative solver-safety floor, the set-valued acceptance model, or any other Epic 1
  decision — this epic is pure plumbing retirement, not a second pass at Epic 1's grading semantics.
- A deprecated/aliased legacy wire field — Settled decision 8 retires the wire contract outright rather than
  keeping `correctCol` available alongside `correctCols`.
- Widening the lesson-JSON field to a set, or otherwise re-authoring lesson content — Settled decision 11
  keeps lesson JSON untouched via thin boundary adapters instead.

**Open questions**
- **Resolved by owner, 2026-08-03** (previously open — see Settled decisions 10 and 11):
  - Does "zero references" cover the computed result-shape `correctCol`? No — out of scope (Settled
    decision 10).
  - Which side converts at the puzzle↔lesson boundary? Both — thin adapters on each side, lesson JSON stays
    a scalar (Settled decision 11).
- No other open questions at spec time. The only re-verification needed at pickup time is re-deriving the
  inventory fresh (US9.1) and confirming spec 051 has actually shipped.

---

## Traceability

Every open `OI-N` maps to exactly one epic.

| Epic | Lane | Open issues |
|---|---|---|
| 1 | A | OI-61(1), OI-75 |
| 2 | A | OI-30, OI-33, OI-48, OI-60, OI-76 |
| 3 | A | OI-25, OI-34, OI-39, OI-55, OI-66 |
| 4 | A | OI-14, OI-17, OI-22, OI-40, OI-47, OI-49, OI-50, OI-51, OI-52, OI-53 |
| 5 | B | OI-9†, OI-23, OI-26, OI-27, OI-28, OI-32, OI-42, OI-43†, OI-45, OI-64†, OI-65 |
| 6 | B | OI-19, OI-38‡, OI-44, OI-46, OI-62, OI-63, OI-68, OI-69, OI-73 |
| 7 | B | OI-21, OI-35, OI-37 |
| 8 | C | OI-6, OI-16, OI-29, OI-58, OI-70, OI-71, OI-72 |
| 9 | C | OI-81 |

† subsumed by OI-65 — the remaining work is identical (generate the clips).
‡ Epic 6 corrects OI-38's stale count (47 entries / 43 missing `short_summary_es` / 4 present) but defers the
translation itself to a standalone content spec — see Epic 6's Deferred section.

**Reassigned to Epic 10:** OI-41 (was Epic 3), OI-5 and OI-31 (were Epic 4) — moved to
[`docs/epics/pre-launch-mvp-epic.md`](pre-launch-mvp-epic.md) (Epic 10, US3/US5) on 2026-08-03. Epics 3
and 4 had already shipped (specs 053 and 054) without doing that work, so nothing is orphaned.

**Excluded as resolved:** OI-1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 15, 18, 20, 24, 36, 54, 56, 57, 59, 67, 74, 77.
