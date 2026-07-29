# Open-Issues Epics — spec-ready backlog for `/epics-manager`

Consolidates every **still-open** entry in [`docs/open_issues.md`](../open_issues.md) into 8 epics sized for
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
The only `##` headings that name an epic are `## Epic 1 …` through `## Epic 8 …`; `## Overview`,
`## Already resolved`, and `## Traceability` are not epics.

---

## Overview

**Epic numbers ARE the execution order, and consecutive numbers belong to the same lane.** Numbering is
lane-major: run 1 → 2 → 3 → 4 in Lane A, 5 → 6 → 7 in Lane B, and 8 alone in Lane C. Lanes A and B may run
**in parallel in separate git worktrees**; within a lane, order is sequential and load-bearing.

| Lane | Epics | Theme | Parallel with |
|---|---|---|---|
| **A** | 1 → 2 → 3 → 4 | Correctness: classifier, grading, payments, handlers | Lane B |
| **B** | 5 → 6 → 7 | Content: audio, lesson surface, QA/UX | Lane A |
| **C** | 8 | Repo-wide gates (lint sweep, CSP, docs) | **nothing** — run before both lanes start or after both merge |

**Hard dependencies inside a lane:** Epic 2 consumes the multi-column detector contract Epic 1 establishes;
Epic 6's lesson-content verification consumes Epic 5's audio (a lesson translated but not voiced is worse
than silent — `lesson-editor.md`). Epic 8 is isolated because its lint sweep (`eslint --fix`) touches the
whole tree and would conflict with every open branch.

**Cross-lane cautions** (worktrees isolate files, not these): one local Supabase DB, one c4solver, and a
**120-req/min per-IP API limit shared with browser QA** ([`project_api_rate_limit_breaks_bulk_scripts`]) —
do not run two bulk/generation passes at once. Both lanes also edit this file (via `/epics-manager`'s
`epic_fix` stage), `staging_checks.md`, `specs/index.md`, and `docs/open_issues.md`; expect to hand-merge
those four. Run `eval "$(./worktree-ports.sh)"` in every worktree before starting or killing any server.

| # | Lane | Epic | Open issues | Primary surface | Stories | Verdict |
|---|---|------|-------------|-----------------|---------|---------|
| **1** | A | Pattern Acceptance: multi-column answers + solver-safety invariant | OI-75, OI-61(1) | `server/predicates.js`, `server/categories.js` + `src/lib/categories.js`, `server/answerSetInvariant.js`, `classifier.js` detectors | 4 | Full speckit |
| **2** | A | Detector Perspective Soundness & Blunder Tag Taxonomy | OI-76, OI-60, OI-48, OI-33, OI-30 | `server/classifier.js`, `server/llmCoachHelpers.js`, blunder fixtures | 5 | Full speckit |
| **3** | A | Entitlement & Payments Consolidation | OI-66, OI-39, OI-55, OI-34, OI-41, OI-25 | lesson routes, tier-gate call sites, `paddleProcessor.js`, `pricing.html` | 5 | Full speckit |
| **4** | A | Server/API Data Integrity & Environment Correctness | OI-40, OI-53, OI-17, OI-47, OI-50, OI-22, OI-49, OI-5, OI-14, OI-31, OI-51, OI-52 | `server/index.js` handlers, `userHelpers.js`, `classifier.js`, `vite.config.js`, migrations/ops | 4 | Full speckit |
| **5** | B | Audio Verification & TTS Management *(rescoped 2026-07-29 — bulk generation already shipped)* | OI-42, OI-45, OI-26, OI-23, OI-28, OI-32; verify-and-close OI-65, OI-27 | `/admin/audio` (`AdminAudioPage.jsx`), `server/lessonAudio.js`, `server/index.js` TTS routes, `lessons/*.json` | 3 | Full speckit |
| **6** | B | Lesson Learning Surface & Authoring Polish | OI-46, OI-44, OI-68, OI-69, OI-63, OI-73, OI-19, OI-38, OI-62 | `SocraticScreen.jsx`, `Board.jsx`, `admin/SlideEditor.jsx`, lesson tooling, i18n, KB | 5 | Full speckit |
| **7** | B | QA Backlog & Product/UX Decisions | OI-35, OI-21, OI-37 | nav stack, onboarding entry, ReviewScreen, `agentic_QA_2026-07-15-1321.md` | 3 | Brainstorm-first, then speckit |
| **8** | C | Dev Infrastructure & Test-Quality Baseline | OI-70, OI-71, OI-16, OI-29, OI-58, OI-6, OI-72 | `eslint.config.js`, `tests/dom/`, `SplitReveal.jsx`, CSP on `main` | 3 | Full speckit |

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

**Intent:** Make "does this move demonstrate the taught pattern?" a *set*-valued, solver-safe question for
**every** category, instead of a per-category mix of exact-column equality and pure solver score. A drill
must accept every column that genuinely creates the pattern, and must reject a column that creates the
pattern while handing the opponent a win or a fork.

**Issues covered**
- **OI-75** — `odd_even_threat` is in neither `MULTI_SOLUTION_CATEGORIES` nor `SINGLE_ANSWER_CATEGORIES`, so
  `ChallengeScreen` grades it on solver score alone and the authored `correctCol` is never consulted.
  Masked today only because lesson 07's two boards happen to have the taught column *be* the unique solver
  optimum.
- **OI-61 item 1** — `evalUndercut` accepts any non-killing column, including ones that lose outright; the
  `answerSetInvariant` LOST-POSITION exemption is exactly where undercut boards live, so nothing catches it.

**Settled decisions** (owner, 2026-07-29)
1. **A pattern condition can be met by more than one column.** This is a project-wide invariant across all
   classifiers, not an `odd_even_threat` special case. `evalDoubleThreat` is the reference implementation:
   sweep every legal column, collect the qualifying set, return `correct` for one and `tied` for alternates.
2. **Solving a drill must be solver-safe.** If playing the pattern column lets the opponent win or build a
   double threat, that board is **not a valid puzzle for the category** — the fix belongs at generation and
   validation time, not only at grading time. `evalDoubleThreat`'s `if (!(scores[col] > 0)) continue`
   ("a structural fork that still loses is not the answer") is the existing precedent for the gate.
3. Acceptance is **pattern membership ∧ solver safety** — never solver score alone, and never stored-column
   equality alone.
4. `odd_even_threat` becomes a **graded** category under the new set-valued model (it is not dropped, and its
   stored `correctCol` is not deleted).

**Non-obvious facts** (verified 2026-07-29 unless noted)
- The set-valued seam **already exists**: `server/answerSetInvariant.js#acceptedCols` sweeps
  `legalCols(scores)` through `evaluatePredicate` and treats `'tied'` as acceptance. Generalizing the
  evaluators is therefore additive at that seam, not a rewrite of it.
- Six evaluators in `server/predicates.js` are pure single-column equality and are the work item:
  `evalZThreat` (reads `highlightMetadata.column`), `evalClaimeven`, `evalFigure7`, `evalJShape`,
  `evalOddEvenThreat` (all read `puzzle.correctCol`), and `evalOvercut` (reads the `major_threat` cell's
  column). None consults `scores`.
- `evalUndercut` reads `highlightMetadata.cells`, rejects only the `killing_threat` column, and consults no
  solver score at all — the OI-61 item 1 defect verbatim.
- `classifyAnswerSet` returns `LOST-POSITION` (a **passing** verdict) whenever `scores[optimal[0]] < 0`, with
  an in-code rationale naming undercut as the motivating case. Any solver floor added to `evalUndercut` must
  reconcile with that exemption rather than silently contradict it.
- `categories.js` carries an explicit comment that set membership **MUST NOT** be derived by negation, and
  the set is **hand-mirrored** in `src/lib/categories.js` — both files must change together or the client and
  server graders drift.
- `detectOddEvenThreat(board, scores, perspective = board.currentPlayer, solver = null)` already has an
  FR-033 recursion branch for `perspective !== currentPlayer`; it returns `{ matched, cells }`, not a column
  set. The perspective-soundness question for this detector belongs to Epic 2, not here.
- Answer-set enforcement runs at three points today (OI-61 update, 2026-07-28):
  `candidate-generator.js#checkPredicate`, `tests/lessons/lessonAnswerSets.test.js` (blocking, in `test` and
  `test:fast`), and `server/scripts/audit_answer_ambiguity.mjs`. Current state: lessons 39/39, local DB
  295/295.

**Authoritative sources of truth**
- `docs/open_issues.md` — OI-75, OI-61, OI-1 (the shared modelling question)
- `docs/architecture/server-conventions.md` §Predicate Evaluator, §Category Registry, §"Undercut has two sides"
- `docs/knowledge-base/README.md` + the entry per category touched (`formal_predicate` is the spec,
  `false_positives` are tests you must not break)
- `connect-four/server/answerSetInvariant.js` (the invariant, in code, with its rationale comments)
- `docs/architecture/testing-conventions.md`; `CLAUDE.md` §Running tests (`npm run test:fast`)

**User stories & tasks**

**US1.1 — Set-valued acceptance contract (7 tasks).** Define the `{ result, correctCol, tiedWith, … }`
contract for a multi-column evaluator; extract `evalDoubleThreat`'s sweep into a shared helper; document the
contract in `server-conventions.md`; unit-test the helper against a board with 2+ qualifying columns and one
with exactly one; assert `'tied'` propagates through `acceptedCols`; add a fixture proving a qualifying but
losing column is excluded.

**US1.2 — Solver-safety gate (8 tasks).** Define "solver-safe" as an IF-THEN rule (IF playing column C lets
the opponent reach a win or a double threat, THEN C is not accepted **and** the board is not a valid puzzle
for the category); apply it to `evalUndercut` (OI-61 item 1); reconcile with `classifyAnswerSet`'s
LOST-POSITION exemption — decide whether undercut boards keep the exemption or get a narrower one; extend
`candidate-generator.js#checkPredicate`; add red-first tests per branch; re-run
`audit_answer_ambiguity.mjs --puzzles undercut` and record the before/after row counts.

**US1.3 — `odd_even_threat` becomes graded (6 tasks).** Generalize `evalOddEvenThreat` to the US1.1 contract;
add the slug to `SINGLE_ANSWER_CATEGORIES` in **both** `server/categories.js` and `src/lib/categories.js`;
verify lesson 07's two boards (`3553515566110063` cc 3, `3411022114433433` cc 2) still pass
`lessonAnswerSets.test.js`; add a board where 2+ columns create the odd threat and assert both grade correct;
add a board where the odd-threat column concedes a fork and assert it is rejected as an invalid puzzle.

**US1.4 — Roll the model across the remaining single-answer evaluators (9 tasks).** One task per evaluator
(`evalZThreat`, `evalClaimeven`, `evalFigure7`, `evalJShape`, `evalOvercut`), each converting equality to
set membership + solver safety while preserving the stored `correctCol` as the *canonical* answer for
highlight metadata; re-run the three enforcement points; re-audit the full DB pool; record any board the new
invariant rejects and replace rather than exempt it.

**Acceptance criteria**
- No category is graded by solver score alone, and none by stored-column equality alone.
- A board whose taught column concedes a win or a double threat fails `checkPredicate` at generation and
  fails the lesson answer-set test.
- `npm run test:fast` green; `audit_answer_ambiguity.mjs` reports 0 failures for lessons and the local DB.
- `server/categories.js` and `src/lib/categories.js` agree (a test asserts it).
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Changing which categories exist, or adding a new puzzle category.
- The `perspective`-parameter soundness of any detector (Epic 2).
- The serving-pool filter and `puzzle_attempts.outcome` enum question (OI-49, Epic 4).
- Re-designing `highlight_metadata` shapes.

**Open questions**
- Does the LOST-POSITION exemption survive as-is, narrow to "lost **and** the category is defensive", or
  disappear once `evalUndercut` has a floor?

---

## Epic 2 — Detector Perspective Soundness & Blunder Tag Taxonomy

**Intent:** Finish the OI-74 cleanup across the remaining detectors and stop the blunder vocabulary from
mislabelling what the player actually did. These tags are stored and user-visible, so every change is a
content migration as much as a code change.

**Issues covered:** OI-76 (`detectOvercut` mixes one player's threats with the other's score sign — literally
the OI-74 defect), OI-60 (the taught gravity-top-adjacent overcut is never tagged; `active_forcing` actually
means T5), OI-48 (a win-forfeiting move is tagged `drawing_move`), OI-33 (distinct-second-fork
over-suppression + `candidate-generator` classify path outside `test:fast`), OI-30 (`figure_7` and siblings
are unreachable on live user moves).

**Settled decisions**
1. Follow the **OI-74 resolution shape**: decide whether the role is fixed by who is to move (then drop
   `perspective`, as undercut did) or whether the non-mover case needs a child-position solver query (then
   follow `detectForbiddenColumns`'s FR-033 recursion). Do **not** flip a gate's sign without deciding which.
2. Epic 1's "a condition can be met by more than one column" invariant applies to detectors too: where a
   detector reports a single cell/column for a pattern that can arise from several, report the set.
3. Blunder-tag changes are validated per `reason-INVARIANTS.md` **I12** — full case space plus a
   counterexample per case, through the production detector, not the motivating example.

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
  `candidate-generator.js:607`'s `cls.tag` consumer has no fast-suite coverage.

**Authoritative sources of truth**
- `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`,
  `blunder-reason-evidence.md` — **read all four, in order**, before touching anything reason-adjacent
- `docs/architecture/server-conventions.md` §"Undercut has two sides" (the OI-74 worked resolution)
- `docs/knowledge-base/community-figure-7.md`, `allen-j-configuration.md`, the overcut/undercut entries
- `docs/open_issues.md` — OI-74 (resolved, as the template), OI-76, OI-60, OI-48, OI-33, OI-30
- `docs/architecture/reason-AGENT-PREAMBLE.md` — reuse verbatim when prompting a fresh-context agent

**User stories & tasks**

**US2.1 — `detectOvercut` perspective (8 tasks).** Characterize current behavior with a fixture per branch;
take the fixed-by-mover vs child-query decision; implement; split victim/beneficiary naming if the decision
mirrors undercut; re-run `tests/blunder/tagBlunderFixtures.test.js` and **read every changed fixture** before
preserving it; re-derive `highlight_metadata` for active `overcut` rows and report whether the pool needs
repair; document in `server-conventions.md`.

**US2.2 — Overcut case taxonomy (7 tasks).** Decide whether the taught gravity-top-adjacent shape becomes a
first-class match or the lesson is re-scoped; rename `active_forcing` to name T5 either way; validate per
I12 with a counterexample per T-rule; update lesson 12 copy and the deep-reveal shape naming; add KB
cross-references.

**US2.3 — `drawing_move` outcome-flip (6 tasks).** Add a "forfeited a forced win" case upstream of
`llmCoachHelpers.js`; wire it into the case taxonomy doc; counterexample per case; regression fixtures on the
near-empty-board repro from OI-48; confirm the downstream grounding-rule text (Fix 4) still reads correctly.

**US2.4 — Creation-gate residuals (6 tasks).** Replace the boolean `hasDoubleThreat` gate with a per-column
threat diff so a distinct second fork counts as creation; same treatment for `detectForcedWin`; add a
`test:fast`-safe regression covering `candidate-generator.js`'s classify consumer without invoking the real
solver.

**US2.5 — Live coach vocabulary (7 tasks).** Decide which multi-tag tactics earn live praise; measure the
per-move latency cost of each solver-calling detector before adding it; extend `classify()`'s priority chain
with transition-gating for every added pattern; verify the `coach.<tag>.*` phrase pools exist in both
locales; add per-tag round-trip tests.

**Acceptance criteria**
- No detector mixes one player's threats with the other player's score sign; each either drops `perspective`
  or does a real child-position query.
- Every changed blunder tag has a read-and-approved fixture diff; the stored pool is re-derived or explicitly
  reported as needing repair.
- `npm run test:fast` green; the reason-engine docs updated in lockstep (`reason-DECISIONS.md` gains an entry).
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- `detectFigure7` / `detectJShape` signature changes.
- The acceptance/grading model (Epic 1).
- Re-generating the puzzle pool for categories whose metadata does not change.

**Open questions**
- Does OI-76 resolve to "drop `perspective`" (undercut's answer) or to an FR-033 recursion? The blast radius
  differs sharply.

---

## Epic 3 — Entitlement & Payments Consolidation

**Intent:** Make "is this user entitled to this?" one answer, computed server-side, and close the funnel's
loose ends — a paid lesson that `curl` returns for free, four independent tier reads, a client-supplied
identity on the money path, and a pricing page whose numbers are hand-maintained.

**Issues covered:** OI-66 (paid lesson JSON served to unauthenticated callers), OI-39 (`getSubscriptionStatus`
has no production call site; four tier-gate sites read the client-cached tier), OI-55 (Paddle tier-grant
identity is client-supplied; the hardening was a unilateral judgment call needing review), OI-34
(fallback-only activations skip the `upgrade_completed` track), OI-41 (bare static pricing page + price
drift), OI-25 (paying from `/summary` loses the summary).

**Settled decisions**
1. **Design the single tier-check interface first, then migrate all four call sites together.** OI-39 is
   explicit: do not refactor the call sites piecemeal to "close the issue".
2. Any replacement pricing surface reads prices from the live config endpoint (`GET /api/paddle/config` /
   Paddle.js `PricePreview`), never from static text.
3. The Merchant-of-Record clause, the 14-day refund statement, and the `/terms` link are **Paddle
   domain-review requirements** and must survive any redesign verbatim.
4. Treat OI-55's shipped hardening as a **proposal to sanity-check**, not settled policy — it was taken
   non-interactively with no human review, and it does not close the first-payment forgery window.

**Non-obvious facts**
- Sandbox vs live is selected from the **key prefix**, not `NODE_ENV`/`MODE` (memory
  `project_paddle_integration`).
- The four tier reads are `sagaLock.js:13`, `PostSetSummaryScreen.jsx:55`, `CheckoutReturnBanner.jsx:72`, and
  `SettingsScreen`'s Subscription section (added later — OI-39 says four, not three).
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

**US3.1 — Server-side lesson entitlement (8 tasks).** Decide the unentitled response shape (404 / 402 /
redacted stub); gate `GET /api/lessons/:id` on the caller's tier reusing the same `free`-flag/tier source
`deriveLockReason` uses so client and server cannot drift; keep metadata (title, `free`, `order`) public so
the saga list renders; add an integration test that a signed-out fetch of a paid id returns no `slides`;
verify the saga screen and `useLessonLockGuard` still behave; document in `api-conventions.md`.

**US3.2 — One tier-check interface (8 tasks).** Design the interface (server-authoritative, with a defined
client caching/refresh story); implement on top of `getSubscriptionStatus`; migrate all four call sites in
one change; delete the "test-only in production wiring" comment; add a test per call site; document the
seam.

**US3.3 — Payment identity & analytics (7 tasks).** Review OI-55's shipped `paddle_customer_id` cross-check
and decide whether the first-payment window is accepted or closed with a server-minted customer id; record
the decision in `server-conventions.md` either way; re-map or close OI-34 against the Paddle fallback; if
kept, add the idempotent `upgrade_completed` write keyed on the transaction id; extend
`paddleProcessor.test.mjs`.

**US3.4 — Designed pricing page (8 tasks).** Build a real pricing surface (plan comparison, annual/monthly
toggle, CTA into the existing checkout, Rioplatense voseo copy); source every number from the live config
endpoint and `FREE_DEEP_REVEAL_WEEKLY_LIMIT`; preserve the MoR clause, refund statement, and `/terms` link
verbatim; re-verify CSP for any new script/style origin; confirm the page is publicly reachable for domain
review.

**US3.5 — Checkout return continuity (6 tasks).** Persist the set `results` to sessionStorage keyed by a
nonce; include the nonce in the return path; rehydrate `/summary` on cold boot; keep the
`returnPathOverride` fallback when the nonce is missing; test the full-page round trip; confirm no stale
outcome leaks into a later modal open (the OI-59 replay-on-subscribe fix must keep holding).

**Acceptance criteria**
- A signed-out `curl` of a paid lesson id returns no `slides`.
- Exactly one code path answers "is this user paid"; all four gates call it.
- Every price and quota figure shown to a user is derived from a live source.
- `npm run test:fast` green; staging-only checks appended to `staging_checks.md` under this epic.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Migrating off Paddle, or changing the plan/price catalog.
- Adding new paywall entry points beyond the pricing page (the Settings CTA already shipped).
- Backfilling historical `upgrade_completed` analytics.

**Open questions**
- Unentitled response shape for `GET /api/lessons/:id`: 404, 402, or a redacted stub?
- Is the first-payment forgery window accepted, or closed with a server-minted Paddle customer id?

---

## Epic 4 — Server/API Data Integrity & Environment Correctness

**Intent:** Close the handler-level defects where an identifier, a sort key, or a retry can silently corrupt
or leak data, and finish the deferred environment/ops verifications that were never runnable in local dev.

**Issues covered:** OI-40 (anonymous puzzle attempts share a literal `device_uuid: 'anonymous'`), OI-53
(`req.user.email` always `undefined`), OI-17 (`chooseSparringMove` returns `col: undefined` on a full board),
OI-47 (`GET /api/games` pagination unaudited for a unique sort key), OI-50 (candidate-insert retry can
double-insert), OI-22 (anon re-analysis re-runs the solver), OI-49 (no solved/revealed filter; partly
aspirational `outcome` enum), OI-5 (refresh-rotation probe, owner-gated), OI-14 (migration 057 carryover
unverified), OI-31 (staging `DATABASE_URL` uses the transaction pooler), OI-51/OI-52 (worktree-ports
self-derive leaks stderr, and silently falls back to legacy ports when the script fails).

**Settled decisions**
1. OI-40 is a **write-path** fix: derive or require a real device_uuid, or reject with 400 — never default to
   a shared bucket.
2. OI-49 needs an explicit modelling answer first: either the serving pool excludes solved/revealed puzzles
   (build the filter) **or** it deliberately never excludes anything (then the unused `outcome` values and
   their CHECK-constraint entries are dead and should be removed). Do not leave it aspirational.
3. Ops verifications (OI-14, OI-31, OI-5) are epic tasks, but their sign-off lives in `staging_checks.md`,
   not in a silent "done".
4. A worktree that cannot derive its own ports **fails loudly** rather than binding the main checkout's
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

**US4.1 — Request-context and identity completeness (11 tasks).** Replace the `'anonymous'` literal with a
real per-device identifier or a 400 (OI-40); audit every caller that could omit `deviceUuid`; ensure the
client generates one before first use; check whether contaminated rows already exist and decide on cleanup;
add tests for both branches; thread `data.user.email` into `req.user` in `loadUser()` (OI-53); confirm the
Paddle checkout overlay pre-fills; verify no handler silently depended on the field being absent; guard
`chooseSparringMove` (or the endpoint) to return an explicit terminal signal instead of `col: undefined`
(OI-17); regression test each; document the `req.user` shape in `api-conventions.md`.

**US4.2 — Pagination and retry integrity (7 tasks).** Audit `GET /api/games`'s in-JS sort key for uniqueness
and add a tiebreaker if needed; prove the two-table merge cannot reorder across pages; add a unique index on
`(generation_run_id, move_string)` and treat `23505` as success (or narrow the retry to pre-commit error
classes); migration + test.

**US4.3 — Anonymous cost and serving pool (7 tasks).** Extend the analyze cache-check to match
`device_uuid` + `user_id IS NULL` for anonymous callers (OI-22); take the OI-49 decision and implement it —
either a solved/revealed exclusion in `GET /api/puzzles/draw` or removal of the dead `outcome` values;
migration if the enum changes; tests.

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
- `npm run test:fast` green; each ops verification signed off in `staging_checks.md`.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Rewriting the analyze pipeline or the solver IPC layer.
- Rewriting `worktree-ports.sh` itself — only its two self-derive consumers change.
- The tier/entitlement model (Epic 3).
- Any change to blunder tagging (Epic 2).

**Open questions**
- OI-49: is the serving pool meant to exclude solved/revealed puzzles, or is "never exclude" the intent?

---

## Epic 5 — Audio Verification & TTS Management

**Intent:** Give the owner one place to generate, audition, and approve **every** clip in the app, and close
the TTS defects that survive the content pass. **Rescoped 2026-07-29** (see Non-obvious facts): the bulk
generation this epic was originally built around has since shipped from a parallel session, so what remains
is verification, the missing admin surface, and four correctness bugs.

**Issues covered:** OI-42 (lesson audio unmanageable from `/admin/audio` — the remaining headline),
OI-45 (regenerating an approved clip publishes it unapproved), OI-26 (cleanup nulls audio cross-locale),
OI-23 (deep-reveal TTS 400s on the opening move), OI-28 (blunder one-liner has no locale context),
OI-32 (stale `tts-1` English coach clips — **status unverified**, see below).
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

**Non-obvious facts**
- **Content state, re-measured 2026-07-29 after the rescope** (the epic's original "12 of 15 lessons have no
  audio" premise is dead — a parallel session shipped the generation mid-authoring):
  - **Lesson narration: complete on disk.** All 15 lessons carry `audio` **and** `audio_es` on every
    message, and **all 282 referenced paths resolve to a file that exists** (checked, not assumed).
  - **Spanish coach fleet: complete.** `public/audio/coach/es/` holds 217 mp3s; `server/tts-registry.es.json`
    has 218 entries, 217 `approved` + 1 `ineligible` — identical counts to English. OI-27 is effectively done.
  - **OI-32 (English clips still on `tts-1`) is UNVERIFIED and must be settled first.** The registry records
    `key/slug/status/reason/generated_at/approved_at` and **no `model` field**, so it cannot answer the
    question. All 217 English clips share an `mtime` of 2026-07-18 12:11 — consistent with a bulk
    regeneration after the model switch, but `mtime` is also what a `git checkout` produces, so it is not
    evidence. Determine it from `generated_at` versus the model-switch commit, or by re-synthesising one key
    and comparing bytes — do not assume either way.
  - **Still genuinely open, confirmed at source:** `/admin/audio` has **zero** occurrences of "lesson"
    (OI-42); the TTS guard is still `if (!moveString || …)` (OI-23); the cleanup still filters
    `.in('position_hash', hashes)` with no locale (OI-26).
  - Re-run before speccing, because this repo has concurrent sessions:
    ```bash
    cd connect-four && for f in lessons/lesson-*.json; do \
      echo "$(basename $f) audio:$(grep -c '"audio"' $f) audio_es:$(grep -c '"audio_es"' $f)"; done
    ```
  - **A resolving path is not a working clip.** Every check above is static; none proves an `es` mp3 contains
    Spanish, plays in the browser, or survives `prune-audio`. That is exactly what US5.1 exists to establish.
- Audio is content-addressed by a **hash of the text**, so changing model/voice/prompt does **not**
  regenerate anything (memory `project_tts_audio_cached_by_text`) — this is why OI-32's ~220 English clips
  are still `tts-1` with no voice styling.
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
  goes live immediately, unreviewed, and the old take is recoverable only via `git checkout` (OI-45).
- OI-23 is a one-character class of bug: `!moveString` rejects the empty-but-valid opening movestring while
  the regex itself allows `{0,42}`.

**Authoritative sources of truth**
- `docs/architecture/lesson-editor.md` §"Window counts", §"Fields the learner UI ignores", the
  translate-and-voice rule
- `docs/architecture/coach-audio-conventions.md` (registry/manifest drift, cache TRUNCATE on deploy)
- `docs/open_issues.md` — OI-65, OI-27, OI-32, OI-42, OI-45, OI-26, OI-23, OI-28
- `docs/architecture/frontend-conventions.md` (Spanish = Argentinian voseo)
- memories: `project_tts_audio_cached_by_text`, `project_lesson_disk_edit_cache_clobber`,
  `project_lesson_progression_audio_traps`, `project_spanish_output_silent_fallback`

**User stories & tasks**

**US5.1 — Prove the shipped audio actually works, then close its issues (8 tasks).** Everything here is
verification of a parallel session's output — assume nothing from the static checks above. Add a test
asserting every `text`/`text_es` has a matching `audio`/`audio_es` **whose file exists** (the static check
becomes a permanent gate); run `prune-audio` and confirm `{deleted: 0}` — the `collectReferencedAudio` /
`generateLessonAudio` walkers are independent, so a partially-wired generation pass shows up here as
orphan deletions; play at least one `es` lesson clip and one `es` coach clip in a real browser on
`$VITE_PORT` (**not** `$API_PORT`, which does not serve `public/`) and confirm they are Spanish, not an
English fallback; run the OI-43 V7 Socratic checks (bubble narrates, stops on navigate-away, mp3 200) in a
hint-free run and a separate hint run; audition a sample for Argentinian-accent quality; settle **OI-32**
(are the 217 English coach clips `tts-1` or `gpt-4o-mini-tts`?) from `generated_at` vs the model-switch
commit, and regenerate + re-approve only if the answer is `tts-1`; close out OI-65/OI-27 — and OI-32 if it
proves already done — per the Issue closeout convention.

**US5.2 — Lesson audio in `/admin/audio` (9 tasks).** Add a Lessons section listing each lesson's messages
per language with status **derived live from the lesson JSON**; inline player resolving the `sha256(text)`
filename; per-message generate; respect the en/es toggle; do not introduce a second registry; document in
`lesson-editor.md`. This is now the epic's headline: it is the only way to audition a lesson clip in-app,
and US5.1 will make its absence felt immediately.

**US5.3 — TTS correctness fixes (8 tasks).** OI-45: decide whether approval gates playback (remove the slug
from the manifest on regenerate) or stays a publishing record, and apply the prompt/warning to the admin UI
path too — with 217 approved clips per language now live, an unreviewed regeneration is no longer
hypothetical; OI-26: scope the cleanup `.update()` by `(position_hash, locale)`; OI-23: accept the empty
movestring; OI-28: thread a locale into `buildBlunderExplainPrompt`'s `LANGUAGE_RULE`; regression-test each.

**Acceptance criteria**
- Every `coachMessages[]` and `socratic.messages[][]` entry in all 15 lessons has both `audio` and
  `audio_es` **and both files exist**; a test asserts it (not a one-off script run).
- `prune-audio` reports `{deleted: 0}`.
- A Spanish learner never hears an English clip under Spanish text — verified by ear in a real browser, not
  by field presence.
- OI-32 is answered with evidence: either the English fleet is confirmed on `gpt-4o-mini-tts`, or it is
  regenerated and re-approved.
- The deep reveal of an opening-move blunder is spoken.
- Every clip in the app — coach *and* lesson, both languages — can be auditioned from `/admin/audio`.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Translating any new text (all 15 lessons are already translated).
- Changing the TTS vendor or the text-hash caching scheme.
- Lesson *content* edits (Epic 6).

**Open questions**
- OI-45: gate playback on approval (a regeneration can silently take a working clip offline) or keep the
  current publish-immediately behavior with an explicit warning?

---

## Epic 6 — Lesson Learning Surface & Authoring Polish

**Intent:** Fix the one lesson behavior bug that makes the coach appear to stop reacting, settle where lesson
content lives, and harden the authoring/verification tooling so the next content pass is machine-checked.

**Issues covered:** OI-46 (sticky `showHint` makes the `correct` message unreachable), OI-44
(`lesson.<id>.title` duplicates the lesson JSON's `title`; `socratic.goalPrompt` is authored dead data),
OI-68 (capsules tint the discs they cover; one sparse window), OI-69 (editor cosmetics + multi-board
`aria-label` ambiguity), OI-63 (six verifier/finder robustness gaps), OI-73 (`lesson.*` namespace collision),
OI-19 (remaining hardcoded English strings), OI-38 (KB `short_summary_es` coverage), OI-62 (two KB edits).

**Settled decisions**
1. **Owner ruling (2026-07-16), still binding:** *lesson content is a thing in itself and must not be
   assembled from i18n keys.* OI-44 is the remaining application of that rule.
2. `lesson.node.*` / `lesson.confirmation.*` are **UI chrome**, not lesson content — leave them in i18n.
3. Verify a negative claim at source before acting on it: OI-44 asserts `goalPrompt` renders nowhere; confirm
   before deleting.

**Non-obvious facts**
- OI-46's one-line likely fix (`useEffect(() => setShowHint(false), [phase])`) has a real question behind it:
  should hint-then-wrong-move drop the hint, or should hint and phase messages coexist in the bubble?
- **Do not "simplify" the OI-43 V7 browser pass back into one run** — a linear pass that clicks Hint can
  never reach `correct`, which is why it is deliberately split in two.
- `windowHighlights` cells must be **ORDERED** (drawn first→last, unchecked), use opaque colours, and must
  **never** be fed into `syncLegend`/`legendItems` (memory `project_lesson_window_highlights_traps`).
- Capsules sit at `zIndex: 2` above the discs. Do **not** lower opacity — 0.4 is already near the visibility
  floor; the real options are dropping below the discs or an outline-only variant.
- `find_lesson_boards.mjs`'s spec matchers are independent re-implementations of `classifier.js` concepts and
  measurably diverge (the z-threat column was solver-optimal in only 25 of 50 `z_threat_socratic`
  candidates). `undercut_t2_adjacent` was fixed 2026-07-28; the rest were not.
- The strict tests' REMEDIATED gate is **inverted-risk**: it exempts nothing today but would silently exempt
  any future lesson added to the list. Flip it to an empty exemption set.
- Every script needs a real `--help` printing purpose + options + defaults and exiting 0 **before**
  required-arg validation (house convention; `find_lesson_boards.mjs` violates it).
- Lesson text clips silently: a 120px coach cap applies on **every** screen, and splitting a long message
  makes it worse (memory `project_lesson_text_overflow_traps`).

**Authoritative sources of truth**
- `docs/architecture/lesson-editor.md` (the authoring contract; §"Fields the learner UI ignores")
- `docs/architecture/frontend-conventions.md` (Board API, voseo, the z-threat badge spec for outline styling)
- `docs/knowledge-base/README.md`, `allen-j-configuration.md`, `community-figure-7.md`
- `docs/open_issues.md` — OI-46, OI-44, OI-68, OI-69, OI-63, OI-73, OI-19, OI-38, OI-62
- memories: `project_lesson_window_highlights_traps`, `project_lesson_json_fields_not_rendered`,
  `project_lesson_text_overflow_traps`, `project_lesson_slide_field_wiring`

**User stories & tasks**

**US6.1 — Socratic phase/hint interaction (6 tasks).** Decide the hint-vs-phase semantics; implement; add a
DOM test (`npm run test:dom`) that the `correct` message renders and narrates after a solve; keep the split
V7 browser procedure; verify the Continue button still keys off `phase`; document the decision.

**US6.2 — One home for lesson content (7 tasks).** Verify `goalPrompt`'s deadness at source; migrate
`lesson.<id>.title` to the lesson JSON as the single authority (or the reverse, with a stated rationale);
remove the superseded i18n keys from both locales; either wire `goalPrompt` or delete it plus its
`localizeLesson` branch; update `lesson-editor.md`; assert key parity still passes.

**US6.3 — Verifier/finder hardening (8 tasks).** Wrap `solver.query` per check so a bad movestring produces a
FAIL row, not a crashed run; add a conventional `--help` to `find_lesson_boards.mjs`; make each spec matcher
validate against the production detector and require the pattern column be solver-optimal; per-overlay
`_overlayIntent`; extend the static scan to i18n lesson titles; flip the REMEDIATED gate to an empty
exemption set.

**US6.4 — Visual + editorial review items (6 tasks).** Decide the capsule/disc tinting fix (below-discs vs
outline-only, per the settled z-threat badge spec); apply and re-check all 48 windows in the browser; take
the editorial call on `opening-centre` slide 1's sparse window; `fontFamily: 'inherit'` on the `infoProse`
textarea (or record that monospace is intentional); leave the multi-board `aria-label` ambiguity unless an
a11y pass is in scope, with the reason recorded.

**US6.5 — String and KB coverage (7 tasks).** Wire `PlayOnlineScreen`'s remaining hardcoded titles to `t()`;
sweep `src/screens`/`src/components` for user-facing literals (`title=`, `aria-label=`, button/label
children) and add keys to both locales; add the two-line guard that no lesson id collides with a reserved
`lesson.*` sub-key (OI-73); audit which of the 45 KB entries lack `short_summary_es` and translate in
reviewed batches; make the two OI-62 KB edits and re-run `npm run sync-kb`.

**Acceptance criteria**
- Solving a Socratic exercise after clicking Hint shows **and speaks** the `correct` message.
- No lesson string is assembled from i18n keys; `lesson-editor.md` states where content lives.
- `verify_lesson_content.mjs` produces a FAIL row (not a crash) for an invalid movestring, and
  `find_lesson_boards.mjs --help` exits 0.
- `npm run test:fast` and `npm run test:dom` green; lesson audit still 39/39.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Generating any audio (Epic 5).
- Writing new lessons or re-tiering the curriculum (resolved 2026-07-25).
- OI-72's stale `windowCounts` round-trip — a recorded decision, not a defect; document only.

**Open questions**
- Capsule tinting: below-the-discs (loses the highlighter feel) or an outline-only variant?

---

## Epic 7 — QA Backlog & Product/UX Decisions

**Intent:** Consume the last un-worked QA run and settle the three product questions that have been sitting
open because they need the owner's judgment, not an implementation.

**Issues covered:** OI-35 (the 2026-07-15 `/app-qa` findings backlog), OI-21 (the coach greeting cannot
autoplay on a cold onboarding load), OI-37 (100% accuracy beside a lost game).

**Settled decisions**
1. **`agentic_QA_2026-07-15-1321.md` at the repo root is the authoritative work-list** for OI-35 — this epic
   is a pointer, not a re-listing. Read the file (per-finding severity, code location, repro) before speccing.
2. **Do not fold resignation into the accuracy calculation** (OI-37). It measures board-move optimality and is
   correct on its own terms; conflating it with "did you finish the game" destroys both answers. The copy fix
   already shipped; what remains is a presentation question.
3. OI-21's runtime bug is **fixed** — the greeting plays on first interaction. What remains is designing an
   entry that elicits a gesture, and it must not reintroduce a flash of the sparring game or break
   `shouldAutoRouteToOnboarding`'s anonymous-only semantics.

**Non-obvious facts**
- Browsers block `audio.play()` until a user gesture; the mission screen is reached by an **auto-route** with
  no prior gesture. This is a hard browser rule, not a code bug.
- OI-35's headline unfixed item is a **cold-load-specific** nav bug: `/mistakes ↔ /stats` infinite-toggles on
  a cold-loaded `/mistakes` (empty nav stack); in-session navigation unwinds correctly.
- OI-35's "lesson content is English-only in Spanish mode" finding is **stale** — all 15 lessons now carry
  `text_es`; only audio remains (Epic 5). Re-triage the file against the current tree before speccing.
- The candidate-generation "fetch failed" finding was **reclassified as an environmental flake**, not a bug
  (memory `project_generate_candidates_fetch_failed_flake`) — do not re-open it.
- The anon free deep reveal being spendable on a *suboptimal* move contradicts the "blunders only" design
  intent and is a **product call**, not a mechanical fix.
- Automation Chrome fakes autoplay permission, so audio can ship silent and pass an agentic QA pass
  (memory `project_app_qa_setup_gotchas`) — verify onboarding audio in a real browser.

**Authoritative sources of truth**
- `agentic_QA_2026-07-15-1321.md` (repo root) — the full findings list
- `docs/open_issues.md` — OI-35, OI-21, OI-37
- `docs/architecture/frontend-conventions.md` (screen registry, URL mapping, `SESSION_ONLY_SCREENS`)
- `staging_checks.md` §Epic 8 ("Coach greeting is actually AUDIBLE") — note that heading is
  `staging_checks.md`'s **own** epic numbering (the onboarding epic), unrelated to this file's Epic 8
- memories: `project_app_qa_setup_gotchas`, `project_generate_candidates_fetch_failed_flake`

**User stories & tasks**

**US7.1 — Re-triage and fix the QA backlog (9 tasks).** Walk `agentic_QA_2026-07-15-1321.md` against the
current tree and mark each finding fixed / stale / open; fix the cold-load `/mistakes ↔ /stats` nav loop and
add a cold-boot nav-stack test; fix `/api/scores`'s 500 on a malformed movestring; confirm the anon
challenge-progress 401 fix still holds; sweep the remaining English-in-Spanish leaks; update the findings
file in place with the triage result.

**US7.2 — Gesture-first onboarding entry (7 tasks).** Brainstorm the entry (splash CTA vs
tap-to-enter auto-route vs speaker affordance vs accepting first-interaction playback); prototype the chosen
one; ensure no flash of the sparring game before the gesture; keep the anonymous-only auto-route semantics;
verify in a **real** browser, not automation Chrome; sign off the `staging_checks.md` item.

**US7.3 — Product calls on the review surface (9 tasks).** Two decisions that share one screen and one
session, taken and shipped together:
- *Deep-reveal spend policy* — decide whether the anonymous free reveal may be spent on a suboptimal move or
  only on a blunder; implement the gate; message the user when it is withheld; test both paths; document in
  `api-conventions.md`.
- *Accuracy vs outcome* — decide whether a 100% accuracy badge is softened, annotated, or paired with an
  explicit "you resigned" note on a lost game; implement the chosen presentation; leave the metric's
  calculation untouched (a Settled decision); add a test for the lost-but-clean case; verify the
  already-shipped `review.cleanButLost` copy still reads correctly alongside it.

**Acceptance criteria**
- Every finding in `agentic_QA_2026-07-15-1321.md` is marked fixed, stale, or explicitly deferred with a
  reason — none silently unaddressed.
- Back navigation from a cold-loaded `/mistakes` reaches Home.
- The onboarding greeting is audible on arrival in a real browser, or the accepted alternative is documented.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Lesson content or audio work (Epics 3 and 4).
- Re-running a full `/app-qa` pass (that is a separate session, not this epic).
- Re-opening the candidate-generation "fetch failed" finding.

**Open questions** — all three are the brainstorm agenda; expect `BRAINSTORM_NEEDED` on this epic.

---

## Epic 8 — Dev Infrastructure & Test-Quality Baseline

**Intent:** Make the repo's own gates trustworthy: a lint that can fail, a DOM suite that fails instead of
hanging, a regression test that actually covers the bug it names, and the production CSP carrying the five
fixes that today exist only on `stagging`.

**Issues covered:** OI-70 (`npm run lint` is red repo-wide, 254 errors — gates nothing), OI-71 (removing a
`Board` guard hangs `test:dom` instead of failing it), OI-16 (dead tested `deepRevealPhase` helper), OI-29
(stale SplitReveal contract + no render-level regression test), OI-58 (five CSP fixes missing from `main`),
OI-6 (superseded de-dup contract wording), OI-72 (documented decision, doc-only).

**Sizing note:** three stories, each 7–8 tasks. The worktree-port items (OI-51/OI-52) moved to Epic 4 US4.4,
where they sit with the other environment/ops verifications rather than padding a fourth story here.

**Settled decisions**
1. **Split the eslint config by environment first** (browser for `src/`, node for `server/`, `scripts/`,
   `tests/`) before touching any individual rule — that alone should clear most of the 254.
2. Only after the baseline is green does `lint` become a gate.
3. OI-58 ships to `main` via a **fresh worktree off `origin/main`** carrying just the CSP diff, per project
   convention — not by merging the divergent branch. The owner previously declined this; re-confirm before
   doing it.
4. OI-72 is recorded as a decision, not fixed: the `...slide` spread is what makes unknown authored fields
   survive a round trip.

**Non-obvious facts**
- Always run `eval "$(./worktree-ports.sh)"` before starting or killing any server — unconditionally, every
  session. Never kill by a bare port number or `pkill node` (`CLAUDE.md`,
  `docs/architecture/worktree-conventions.md`). This applies to running the suites below, even though the
  port *fix* itself lives in Epic 4.
- OI-71's hang is a genuine block (0% CPU, stable RSS across three runs), not a busy loop; root cause
  uninvestigated, suspicion is jsdom/testing-library interaction rather than `Board` itself.
- OI-29's existing test only exercises the pure `computeFrozenBoardWidth`, which is still frozen by
  signature — so it passes unchanged and gives **zero** coverage of the bug that was fixed.
- The jsdom/`global-jsdom` peer mismatch (OI-16's second bullet) is **resolved** — do not reintroduce
  `--legacy-peer-deps`; Railway's `npm ci` is strict and `railpack.json` hides it
  (memory `project_spec031_staging_production_deploy`).
- `main` is ~496 commits diverged from `stagging` (memory `project_paddle_integration`).

**Authoritative sources of truth**
- `docs/architecture/testing-conventions.md` (`test:fast` vs `test` vs `test:dom`), `CLAUDE.md` §Running tests
- `docs/architecture/worktree-conventions.md`
- `docs/architecture/server-conventions.md` §"CSP Directive Rationale"
- `docs/open_issues.md` — OI-70, OI-71, OI-16, OI-29, OI-58, OI-6, OI-72 (OI-51/OI-52 moved to Epic 4), plus
  the whole file for US8.3's closeout audit
- memories: `project_csp_helmet_traps`, `project_repo_worktree_setup`, `project_spec031_staging_production_deploy`

**User stories & tasks**

**US8.1 — A lint that can fail (8 tasks).** Split `eslint.config.js` by environment; re-measure the error
count; run `--fix`; triage the remainder into fix-now vs rule-off with a stated reason; remove the unused
`boardToSpec` import; get to zero; add `lint` to the test scripts and document the gate.

**US8.2 — DOM/test-suite reliability (7 tasks).** Reproduce OI-71's hang by deleting `&& value === 'empty'`;
bisect the non-returning assertion; make the mutant fail cleanly; annotate the SplitReveal contract doc as
superseded; add the render-level SplitReveal regression (board width ≤ pane width, `constrain`/maxWidth stays
applied under a short container); either wire `deepRevealPhase` into the render or delete it plus its test.

**US8.3 — Production CSP + doc bookkeeping (7 tasks).** Diff `server/index.js`'s `helmet(...)` block between
`stagging` and `main`; port the five fixes via a fresh worktree off `origin/main` (owner-confirmed); verify
the deployed build actually enforces them (never under `npm run dev`); add the SUPERSEDED note to
`contracts/api-auth-session.md` (OI-6); record OI-72 as intended behaviour; apply the "Already resolved"
table's verified findings to `docs/open_issues.md` (OI-1, OI-15, OI-12, OI-24, OI-77 and the lesson-text
half of OI-18/36/64); then **audit the closeout convention across the whole backlog** — walk every `OI-N`
this backlog covers and flag any whose code shipped in Epics 1–7 but whose entry still reads as open.
That audit is a backstop, not the primary mechanism: each epic closes its own issues.

**Acceptance criteria**
- `npm run lint` exits 0 on a clean tree and is wired into the test scripts.
- The `windowCounts` guard mutant fails with an assertion, not a hang.
- Production CSP matches the documented directive rationale.
- Every `OI-N` under this epic's **Issues covered** is closed out in `docs/open_issues.md` per the
  Issue closeout convention at the top of this file — resolved-with-date, or still open with a dated
  UPDATE naming exactly what remains. A shipped fix with a stale backlog entry is an incomplete story.

**NOT included**
- Migrating test runners or adding Playwright.
- Merging `stagging` into `main`.
- The worktree-port self-derive fixes (Epic 4 US4.4).

**Open questions**
- Does the owner want the `main` CSP PR done here, or will they continue to port it themselves?

---

## Traceability

Every open `OI-N` maps to exactly one epic.

| Epic | Lane | Open issues |
|---|---|---|
| 1 | A | OI-61(1), OI-75 |
| 2 | A | OI-30, OI-33, OI-48, OI-60, OI-76 |
| 3 | A | OI-25, OI-34, OI-39, OI-41, OI-55, OI-66 |
| 4 | A | OI-5, OI-14, OI-17, OI-22, OI-31, OI-40, OI-47, OI-49, OI-50, OI-51, OI-52, OI-53 |
| 5 | B | OI-9†, OI-23, OI-26, OI-27, OI-28, OI-32, OI-42, OI-43†, OI-45, OI-64†, OI-65 |
| 6 | B | OI-19, OI-38, OI-44, OI-46, OI-62, OI-63, OI-68, OI-69, OI-73 |
| 7 | B | OI-21, OI-35, OI-37 |
| 8 | C | OI-6, OI-16, OI-29, OI-58, OI-70, OI-71, OI-72 |

† subsumed by OI-65 — the remaining work is identical (generate the clips).

**Excluded as resolved:** OI-1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 15, 18, 20, 24, 36, 54, 56, 57, 59, 67, 74, 77.
