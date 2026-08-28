# Implementation Plan: Deep-Reveal Remediation (Epic 12)

**Branch**: `worktree-deep-reveal-grounding` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/059-deep-reveal-remediation/spec.md`, derived from
`docs/epics/deep-reveal-remediation-epic.md` ("Epic 12")

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

Two entangled defects: (1) the offline eval harness grades the model's *pre-guard* answer while
production serves the *post-guard* string (`guardExplainMoveLlmPayload`,
`connect-four/server/reasonRenderGuard.mjs:418`), so whole categories of graded "failure" describe
text no player ever sees; (2) a dozen real render defects — board-false claims (US2) and
prompt-hygiene/vocabulary-consistency defects (US3) — do reach players. This plan sequences US1
(harness fix, a validation prerequisite only) alongside US2/US3 (implementable independently,
validated by deterministic corpus tests, never an LLM re-measure per FR-031), and resolves the
three seams the spec/epic left open for the plan: FR-013's guard-inside-`computeMechanism` seam,
the FR-018/FR-019 `fieldPartition` interaction, and the FR-013 prose re-verification against
`processAnnotations`. All three are resolved below with source citations (not re-derived from the
epic/spec — verified fresh at HEAD in this session).

**Reason engine is untouched.** No change here touches `computeReason`, `reason_engine/reasonEngine.mjs`,
or the case taxonomy (Settled decision 2). Every change is in the render layer
(`renderReasonModel.mjs`, `reason_engine/{zoneAnnotations,causalLinks,openingFrame}.mjs`,
`reasonBoardSelect.mjs`, `reasonBoardTags.mjs`), the retry post-check (`mechanismExplainer.mjs`), the
serving guard (`reasonRenderGuard.mjs`), or the eval harness/rubric/skill.

## Technical Context

**Language/Version**: Node.js (ESM, `.mjs`), matching the rest of `connect-four/server/`.
**Primary Dependencies**: none new. Reuses `Board`/`checkWin` (`server/classifier.js`),
`toAllowedSet`/`guardExplainMoveLlmPayload`/`validateAnnotation`/`stripFailingZoneSpans`
(`server/reasonRenderGuard.mjs`), `processAnnotations` (`server/annotationGate.js` — verify exact
module at implementation time by symbol, not by this plan's memory of it), `node:test` (project's
existing test runner, per every file in `connect-four/server/tests/*.test.mjs`).
**Storage**: N/A — no schema change. `render_decision`/`answers` rows are JSONL files under
`connect-four/server/scripts/reason_corpus/runs/`, not DB tables.
**Testing**: `cd connect-four && npm run test:fast` (node's built-in test runner via a script in
`package.json` — never read/edit that file directly, per hard constraint). Baseline **re-measured at
branch point, this session, commit `5d95fef`: 1999 pass / 0 fail, 278 suites, 0 duration errors**
(matches the recalled `reason-DECISIONS.md:1601` figure exactly, despite the tree's uncommitted
changes to `server/index.js` and four `server/tests/*.test.mjs` files — FR-027's "do not inherit"
instruction is honored by this fresh measurement, not by assuming the recalled number still holds).
**Target Platform**: Node server (Railway) + an offline eval harness run from the CLI. No frontend
surface (Out of Scope).
**Project Type**: Existing web service (`connect-four/server` + `connect-four/src`, only `server/`
and `server/scripts/` touched here).
**Performance Goals**: N/A — no latency budget in this epic; `guardExplainMoveLlmPayload` is pure
string/regex transformation over an already-computed `explanation`/`board`/`allowedSet` (no solver
call, no LLM call — verified at `reasonRenderGuard.mjs:418-436`, see Design Decision 1 below), so a
second in-process call from `computeMechanism` costs microseconds, not I0-relevant solver budget.
**Constraints**: FR-004/AC 2a — the live `/explain` response must stay byte-identical when the new
opt-in diagnostics flag is absent. FR-028 — no agent edits `connect-four/package.json`.
**Scale/Scope**: 25-record eval subset (US1 regression fixture) + 63-record full corpus (US2/US3
corpus-wide assertions, per I12 — validate through the production detector over the full case-space,
never a sample).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**: satisfied. Every fix stays inside
the existing three-layer engine (solver → classifier → LLM annotation over classifier output); no
new independent evaluation path is introduced. The harness change (US1) makes the *eval* consume the
*production* serving function rather than reimplementing it (FR-001's "not a reimplementation"
requirement is itself an instance of this principle).

**Principle II — Code Quality & Simplicity**: satisfied by design. FR-013's chosen seam (Design
Decision 1) explicitly rejects a bigger refactor (moving `guardExplainMoveLlmPayload`'s call site) in
favor of one additional call using already-exported, already-tested functions. FR-019(b)'s fix (Design
Decision 2) is additive — it threads an already-computed board-selection decision into an existing
function, not a merge of `buildRenderDecision`/`buildReasonRenderModel` (which is OI-186, explicitly
Out of Scope).

**Principle III — Testing Standards**: satisfied. Every US2/US3 fix gets a deterministic,
solver/model-free test through the actual production render function on real corpus boards (FR-031;
no test may be authored against a hand-rolled proxy — I12). US1's regression fixture (0 raw `cNrM` in
served prose, 5 runs losing a span) is harvested from the recorded run, not hand-written (house
rule).

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs were read before this plan was drafted: `docs/architecture/reason-INVARIANTS.md`,
  `reason-DECISIONS.md` (D48/D49/D50 + addendum), `reason-case-taxonomy.md`, `blunder-reason-evidence.md`,
  `reason-render-grounded-prompt.md` §12, `docs/open_issues.md` (every in-scope OI), the epic, the
  spec, its checklist, and `docs/best_practices_spec_driven_development.md` §Epic Sizing.
- [x] Undocumented conventions discovered during this review: none new — the epic's own drafting
  process already re-verified every measured claim (its "Revision note" section). The three seams
  this plan resolves are net-new decisions, not conventions that were already documented and missed;
  they are captured as new D-log entries below (FR-030).
- [x] `tasks.md` (via `/speckit-tasks`, out of scope for this command) will include explicit
  documentation tasks: one `reason-DECISIONS.md` D-entry per resolved seam (this plan proposes 3 —
  see Design Decisions), `reason-render-grounded-prompt.md` §12 extensions for any new render-contract
  rule, and a `docs/deployment_steps.md` entry for served-text changes (FR-029/AC 15).

No constitution violation. Complexity Tracking table is empty (no exceptions needed).

---

## Design Decisions (resolve the three fragile seams the spec left open)

**Task dependency for `/speckit-tasks` (real, not sequencing-by-convenience):** FR-013 / task 2.6
(Decision 1 below) has a hard **implementation** dependency on FR-004 / task 1.7 — the guard-aware
check inside `computeMechanism` cannot be written until `guardExplainMoveLlmPayload`'s `diagnostics`
flag (`strippedSpecs`) exists to call. This is the one place in this epic where "US2/US3 code may be
written before US1" does not hold (contrast the epic's general US1-is-a-validation-prerequisite-only
framing, spec.md Assumptions) — task 1.7 must land before task 2.6 can be implemented, even though
neither is part of US1's *harness* work. `/speckit-tasks` must encode `1.7 → 2.6` as a dependency edge,
not merely list both under their respective user stories.

### Decision 1 — FR-013's seam: run the guard, guard-aware, *before* the existing retry check, on `attempt1`

**Reconciled to `research.md`'s Decision 1 verbatim (source of truth — see the plan-critique/answers
review for why this plan's prior draft had the retry position inverted and is being corrected here).**

**Verified at HEAD, this session:**

- `computeMechanism(movestring, col, opts)` (`mechanismExplainer.mjs:181`) already has `movestring` as
  a direct parameter and builds `renderDecision` as a local (`mechanismExplainer.mjs:187`,
  `const renderDecision = renderDecisionForCondition(nv, 'D');`). `Board` is importable from
  `./classifier.js` — the exact same relative path `server/index.js:12` already uses, since
  `mechanismExplainer.mjs` lives in the same `server/` directory. `toAllowedSet` is already exported
  from `reasonRenderGuard.mjs` (`index.js:54` imports it from there today).
- `missingRequiredGroups(requiredSet, attempt)` (`mechanismExplainer.mjs:85-88`) reads
  `attempt.usedSpecs`, a **structured array** produced by `postprocessAnswer` → `processAnnotations`
  (`runLlmAttempt`, `mechanismExplainer.mjs:61-63`) — confirmed: compared by `.includes(g.spec)`,
  never a string search. This is genuinely pre-guard: `processAnnotations` validates the model's
  `[zone:handle]` tags against the offered set and expands them to specs; it never calls
  `guardExplainMoveLlmPayload`/`stripFailingZoneSpans`/`validateAnnotation`. So a spec can appear in
  `usedSpecs` (successfully offered-and-resolved) and still have its span **later** stripped by the
  guard for an unrelated reason — confirmed by reading `guardExplainMoveLlmPayload`
  (`reasonRenderGuard.mjs:418-443`) and `stripFailingZoneSpans` (`:365-380`) in full.
- **`missingRequiredGroups` is called exactly once, at `mechanismExplainer.mjs:221`, on `attempt1`, and
  its result IS the retry trigger** (`missing.length > 0` at `:227`, single amended pass at
  `:227-231`). There is no post-retry call site — a design that computes the guard-aware check after
  `finalAttempt` is produced would be describing a call that does not exist.
- `guardExplainMoveLlmPayload` and everything it calls (`promoteRawCoordinates`,
  `humanizeGroundedCoordinates`, `validateAnnotation`, `stripFailingZoneSpans`, `stripInternalTokens`)
  are all **synchronous, pure string/regex/board-lookup functions** (`reasonRenderGuard.mjs:99,156,217,418`;
  `annotationGate.js:524`) — no I/O, no solver call, no DB call, no network call. `Board` construction
  from an already-known movestring is also pure/local. Calling the guard a second time inside
  `computeMechanism` is therefore not a performance concern — I0 (`reason-INVARIANTS.md:17-33`) is
  about solver calls specifically and does not even apply here, since there are zero solver calls in
  the guard path; the cost is microseconds of string processing against `attempt1.mechanism`, well
  inside the Explanation Engine's <2s budget.
- The live `/explain` endpoint (`server/index.js:1470`) still calls the guard exactly as it does today
  for the **served** text — this second, real invocation is unaffected. The `computeMechanism`-internal
  call is a **new, first** invocation, used only to decide the retry, on `attempt1.mechanism`.

**Decision (concrete change, FR-013 / task 2.6, dependent on FR-004 / task 1.7 — see Dependencies below):**

1. `mechanismExplainer.mjs` imports `Board` (`./classifier.js`) and `guardExplainMoveLlmPayload`,
   `toAllowedSet` (`./reasonRenderGuard.mjs`) — `stripInternalTokens` is already imported from the same
   module (`mechanismExplainer.mjs:30`), so this is an addition to an existing import.
2. **Immediately before** the existing `missing = missingRequiredGroups(requiredSet, attempt1)` call
   (`mechanismExplainer.mjs:221`), build `board = new Board(movestring)` and
   `allowedSet = toAllowedSet(renderDecision?.zones?.aliases ?? [])`, then call
   `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board, allowedSet, diagnostics: true })`
   (the new FR-004 flag) to obtain `diagnostics.strippedSpecs`.
3. Compute `survivedSpecs = attempt1.usedSpecs.filter(s => !diagnostics.strippedSpecs.includes(s))` and
   pass **that** — not the raw `attempt1.usedSpecs` — into the **existing**
   `missingRequiredGroups(requiredSet, { usedSpecs: survivedSpecs })` call at `:221`.
   `missingRequiredGroups` itself is unchanged (`.filter((g) => !usedSpecs.includes(g.spec))`) — this
   is a change to which array is passed in, not to the comparison logic.
4. The retry's BUDGET and TRIGGER SET are untouched (Settled decision 4, narrowed) — this changes which
   specs count as "used" for the existing `missing.length > 0` check (`:227`), which is exactly what
   makes **more records retry**: the 5 runs that lose a `[zone:…]` span become retry candidates that
   did not retry before. **This is the point — OI-177 genuinely closes.** No second retry, second
   budget, or new trigger kind is added; the single existing amended pass at `:227-231` is unchanged.

**Correcting the spec's prose**: FR-013/AC 6's phrase "`usedSpecs` recomputed against the post-guard
annotation set" survives contact with `processAnnotations`, but only with this precision: it is not
re-*derived* from a second `processAnnotations` pass (there is no post-guard annotation-tag text to
re-parse — the guard strips zone spans from prose, it does not re-emit `[zone:…]` tags). It is the
**pre-guard `usedSpecs` array, filtered to remove any spec whose span the guard stripped, fed into the
existing pre-retry `missingRequiredGroups` call.** The task for FR-013 must implement it this way, not
by re-invoking `processAnnotations` on guard output, and not by moving the check after the retry.

**Rejected alternative — restructure the seam so the guard runs once and its result threads through**
(instead of a second invocation). Rejected because: (a) the guard is provably free (no I/O), so there
is no performance case for the restructure; (b) it would couple `index.js`'s three
`guardExplainMoveLlmPayload` call sites (cache-hit, not-a-blunder, fresh-generation — `index.js:1327,1365,1470`)
to a `computeMechanism`-shaped result even on the two paths that never call `computeMechanism` at all —
a larger, riskier diff for zero measured benefit; (c) it would guard `attempt1`'s text against a
request context that has not yet decided whether a retry happens, when the endpoint's real guard call
is on `finalAttempt.mechanism` — conflating the two risks showing retry-decision diagnostics for the
wrong attempt.

**D-log entry required** (FR-030): `reason-DECISIONS.md` gains one entry recording this seam choice
(guard-aware check runs *before* the existing single retry, on `attempt1`, changing which records
retry — not a post-retry diagnostics-only check) and the alternatives rejected (moving the endpoint's
guard call earlier; adding a second retry pass) with the reasoning above.

### Decision 2 — FR-018/FR-019 `fieldPartition` interaction: fix the array-branch bug and make the `transformed`-carve-out check board-selection-aware for `.line`-pattern paths, without touching `buildRenderDecision`/`buildReasonRenderModel`'s split (OI-186 stays out of scope)

**Verified at HEAD, this session:**

- The object branch (`renderReasonModel.mjs` `renderedFields`'s `prune`, ~`:38-40`) already guards
  against emitting an empty object: `else if (val !== null && typeof val === 'object') { const child =
  prune(val, path); if (Object.keys(child).length) copy[key] = child; }` — an object that prunes to
  `{}` is dropped from `copy` entirely.
- The array branch (`pruneArray`, ~`:26-29`) has no equivalent filter:
  `if (val.length && val[0] !== null && typeof val[0] === 'object') { copy[key] = pruneArray(val, path); }`
  — `pruneArray` maps every element through `prune()`, and since every subfield of a fully-`transformed`
  array element gets dropped by `keep()` (`d === 'transformed' → false`), each element becomes `{}`,
  and the mapped array `[{},{},{},{}]` is assigned to `copy[key]` unconditionally. This is exactly the
  OI-206 defect and confirms the object/array asymmetry the epic/spec describe.
- `isTransformed` (`fieldDisposition.mjs`) matches `TRANSFORMED_LEAVES` (`movestring`, `finalMovestring`,
  `bestCol`, `playedCol`) **or** any path matching `/(^|\.)line(\[\]|\.|$)/` — i.e. `lostResource.line`,
  `opponentPunishment.line`, etc. are *all* `transformed` by this regex, not by an explicit leaf name.
  Their comment (`renderReasonModel.mjs:236-238`) states the carve-out generically: "`transformed`
  fields are shown to the model via the board... so here they count as rendered."
- `fieldPartition(pruned, covers)` (`renderReasonModel.mjs:236-249`) is **disposition-based, not
  data-instance-based**: it classifies every leaf path in `leafPaths(pruned)` by
  `dispositionOf(path)` alone — it never inspects whether the actual value at that path is empty. So
  **FR-018 alone (fixing the array-emptying bug) does not change `fieldPartition`'s classification at
  all** for `.line` paths — they were always statically classified "rendered" regardless of what
  `renderedFields` produces. The epic's "makes fieldPartition more inconsistent, not less" is about
  the *gap between the classification and reality*, not about `fieldPartition`'s code changing.
- Where a `.line` array's cells are genuinely shown: `forkPivotCell` (`zoneAnnotations.mjs:90-97`)
  reads `half.line[line.length - 1].cell` to offer a fork-pivot alias/handle for `FORK_TAGS` halves
  (`double_threat`/`figure_7`) — this is a real "shown via an offered zone" path, but it fires only for
  fork-tagged halves. For a `denial`/`neutralization` half (`OPPONENT_OWNED`,
  `zoneAnnotations.mjs:109-114` — the class the epic's "forced denial sequence" language names), no
  code path currently turns `.line` into a highlighted zone or explicit prose; the carve-out's
  justification ("shown via the board") for this class rests entirely on the *board diagram itself*
  reflecting the moves in `.line` (since a board rendered from `finalMovestring` mechanically contains
  every disc `.line` names) — which is only true **if that half's own board is among the boards
  actually selected for this record** (`selectBoards`/`boardSelectionDecisions`, `reasonBoardSelect.mjs`).

**Decision, concretely per-record:**

1. **FR-018 (mechanical fix)**: give `pruneArray`'s caller the same emptiness guard the object branch
   has — after `pruneArray(val, path)` runs, if every element is `{}` (or the mapped array's combined
   `Object.keys` count is 0), drop `key` from `copy` entirely, exactly mirroring the object branch.
   This is a small, local change to `renderedFields`'s `prune` function only.
2. **FR-019(b) (the consistency check)**: `fieldPartition`'s existing disposition-only classification
   is **left alone** for `TRANSFORMED_LEAVES` (`movestring`/`finalMovestring`/`bestCol`/`playedCol`) —
   those are always genuinely shown via the Decision block, so the carve-out holds unconditionally
   there; changing that classification is exactly the over-broad reading FR-019 explicitly forbids
   ("MUST NOT be read as requiring that carve-out be reclassified"). For the **`.line`-pattern** subset
   specifically, add a corpus-wide *test* (not a `fieldPartition` code change) that, for every record,
   checks: if a `.line`-typed path is non-empty in the pruned vector, then either (a) its owning half's
   board is among that record's selected/rendered boards (i.e. the geometry the array names is visible
   in a rendered board diagram), or (b) a fork-pivot/other alias derived from `.line` is present in
   `zones.aliases`. If neither holds, the path is a real FR-019(b) violation and the test goes RED —
   this is the deterministic, model-free, production-function test FR-031 requires.
3. **`eval-33`/`lostResource.line` concretely — DEFERRED, not fixed in this epic.** Per the trace above,
   this record's `lostResource` is the `denial` class (not a fork half), so no alias currently exposes
   it, and if its own board is not among the record's selected boards, the geometry genuinely reaches
   neither the JSON residue (once FR-018 drops the empty array) nor a board diagram — the check in
   step 2 goes RED on it. An earlier draft of this plan proposed fixing this by making `eval-33`'s
   owning board selectable, a `reasonBoardSelect.mjs`-side change — but that step was the plan's only
   explicitly self-labelled unverified change (no mechanism, no citation, one record), no requirement
   asks for it (FR-019(b) requires only that the two-sided check exist and be honest, not that every
   record pass it), and it carries measured regression precedent: the epic's own §12g trap
   (`docs/epics/deep-reveal-remediation-epic.md:296-298`) — *"Adding anything to the prompt adds
   VOCABULARY the model echoes — the second projected board's caption alone moved render-label leakage
   0/125 → 10/125."* **Decision: drop the board-selection remedy from this epic** (see the new
   `### Deferred` subsection under Epic 12 in `docs/epics/deep-reveal-remediation-epic.md`). To keep
   `test:fast` green (AC 14 requires 0 fail) without silently hiding the finding, the FR-019(b) corpus
   test carries `eval-33` as an explicit, named-record, commented exemption — e.g.
   `const KNOWN_EXEMPTIONS = new Set(['eval-33']); // lostResource.line, denial half, no board-selection
   remedy — deferred, see docs/epics/deep-reveal-remediation-epic.md ### Deferred` — while asserting the
   invariant RED-for-real on every other record. Do **not** weaken the assertion itself, and do not
   reclassify `fieldPartition` to make the exemption unnecessary. This does not touch
   `buildRenderDecision`'s independent recomputation of the offer set, so OI-186's full merge stays out
   of scope as the epic requires.

**D-log entry required** (FR-030): one entry recording (a) the array/object asymmetry fix, (b) the
board-selection-aware consistency test added for `.line` paths (with `eval-33` as a named,
commented exemption pending the deferred board-selection remedy — not a silent pass), and (c) that the
`TRANSFORMED_LEAVES` carve-out itself is unchanged and must not be reclassified by a future session
re-reading this FR.

### Decision 3 (re-verification only) — FR-013's prose is now precise; no further design needed

Covered fully by Decision 1's "Correcting the spec's prose" subsection above: the phrase survives with
the precision added there (filtered pre-guard array, not a re-run of `processAnnotations`).

---

## Provisional assumptions for Q1–Q5, Q7, Q8 (NOT resolved here — `/clarify` owns them)

Per the task's hard constraint, none of these are decided by this plan. Stated so `/speckit-tasks` can
see what each currently-provisional choice blocks, labelled **PROVISIONAL**:

- **Q1 (harness storage shape)** — PROVISIONAL: store **both** the pre-guard `mechanism` and the
  post-guard served string plus a `diagnostics` object, but the v2 rubric (FR-003) must instruct
  graders to view **only** the served string for the axes it governs — i.e. Q1's "richer, but risks a
  grader charging the pre-guard string" risk is mitigated at the *dispatch* layer (which field the
  per-case prompt shows), not by destroying the pre-guard data at storage time. This keeps OI-194
  measurable (task 1.2's whole point) while not re-opening the exact failure mode US1 exists to fix.
  If `/clarify` picks the third option (served-only to graders, pre-guard kept out of the grading
  prompt entirely), FR-003's v2 rubric wording changes but FR-001's storage shape does not.
- **Q2 (better-column requestability)** — PROVISIONAL: reserve a **dedicated mandatory line outside
  the required-set block** for the better column (the third option in the epic's list), because it
  does not compete with the FR-005 3-slot geometry cap on the 15/25 at-cap records and does not risk
  displacing a real geometry requirement. `deriveRequiredSet`'s existing 3-slot cap
  (`renderReasonModel.mjs:172`) is left untouched.
- **Q3 (terminal board rendering)** — PROVISIONAL: replace the tactics list with a single explicit
  "this move ends the game here" statement rather than dropping the `afterBest` board outright, so the
  board's disc layout (useful context) stays visible while the live-threat list (the actual defect)
  is suppressed. New vocabulary ("ends the game here") must be added to `READING_KEY`'s never-repeat
  list per §12g if the exact chosen wording could otherwise be echoed verbatim by the model in a
  different sense.
- **Q4 (replyHistogram)** — PROVISIONAL: drop the comparative when the rule and the numbers disagree,
  rather than restating the rule (smaller prompt-surface delta, and OI-202's own text calls the
  "state a rule the numbers support" option "more prompt surface").
- **Q5 (opening-centrality guardrail)** — PROVISIONAL: drop "centrality" from the framings sentence
  when the guardrail suppresses it (do not relax the guardrail — the epic flags relaxing it as "not
  obviously safe" given `eval-21`'s D-log history).
- **Q7 (post-fix LLM re-measure)** — PROVISIONAL: schedule it as an optional, owner-approved reporting
  step **after** all US1–US3 tasks land and `test:fast` is green, run against the same 25-board subset
  under the new v2 rubric, understood as establishing a v2 baseline rather than demonstrating a delta
  against any v1-graded run (Q7's own noted trap). This plan does **not** execute it (hard constraint:
  no LLM eval batch may be run by an agent) — it is listed in tasks.md as a final user-approved step.
- **Q8 (sibling disambiguation without raw coordinates)** — PROVISIONAL: a plain-English ordinal
  locator tied to the reading key (e.g. "the lower of the two", "the one closer to the edge"), because
  it adds the least new vocabulary of the three options and reuses phrasing the reading key already
  establishes (row/column framing). This directly constrains FR-014's implementation and must be
  logged in D49's neighborhood in `reason-DECISIONS.md`, and the chosen locator phrase(s) must be added
  to the never-repeat list per §12g.

Each PROVISIONAL choice is implementable without a `/clarify` answer as an initial pass, but the task
that implements it must flag its `[NEEDS CLARIFICATION: Qn]` marker in a code comment or commit message
so `/clarify` (or the owner) can revisit before this ships, per the task's explicit instruction not to
silently resolve these.

---

## Project Structure

### Documentation (this feature)

```text
specs/059-deep-reveal-remediation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md           # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/
│   └── guard-diagnostics-contract.md   # Phase 1 output — the widened guardExplainMoveLlmPayload shape
├── checklists/
│   └── requirements.md   # already exists (spec quality checklist)
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root)

This is an existing web service; no new project/package is created. All changes land inside
`connect-four/server/` (production + eval harness) and `connect-four/server/scripts/` (render layer +
eval scripts), plus documentation updates at the repo root. No `connect-four/src/` (frontend) change
(Out of Scope).

```text
connect-four/
├── server/
│   ├── index.js                          # US1 task 1.7 call-site note only (no change to /explain
│   │                                       # response shape when flag absent — AC 2a)
│   ├── reasonRenderGuard.mjs              # FR-004: diagnostics field (opt-in), guardExplainMoveLlmPayload
│   ├── mechanismExplainer.mjs             # FR-013/Decision 1: guard-aware usedSpecs (OI-177)
│   ├── annotationGate.js                  # read-only: validateAnnotation/checkP5Strong contract
│   │                                       # (verify exact export names at implementation time)
│   ├── scripts/
│   │   ├── compute.mjs                    # FR-001/002/007: post-guard field, diagnostics, OI mapping
│   │   ├── grade_mechanical.mjs           # read-only: A6 is already post-guard via mentionsBetterColumn
│   │   ├── renderReasonModel.mjs          # FR-011/014/017/018/019/022/025: prompt assembly, fieldPartition,
│   │   │                                   # deriveRequiredSet, roleText arity, READING_KEY never-repeat,
│   │   │                                   # replyHistogram comparative guard (READING_KEY, :332-342)
│   │   ├── reasonBoardSelect.mjs          # FR-008/009/010/012/019(b): board selection + truth checks
│   │   ├── reasonBoardTags.mjs            # FR-009/010: tactic-overlay board-truth
│   │   ├── reason_engine/
│   │   │   ├── zoneAnnotations.mjs        # FR-015/016/021/022/024: role text, fork pivot, terms map
│   │   │   ├── causalLinks.mjs            # FR-008/009/012/023/025: L1-L9 frames, immediate_threat grain
│   │   │   └── openingFrame.mjs           # FR-020: centrality guardrail
│   │   └── reason_corpus/
│   │       ├── boards.jsonl               # read-only: full 63-record corpus (US2/US3 corpus-wide tests)
│   │       ├── boards_subset.jsonl        # read-only: 25-record subset (US1 regression fixture)
│   │       └── runs/
│   │           ├── GRADER_INSTRUCTIONS_v1.md   # read-only, byte-identical to f6282be — never edited
│   │           ├── GRADER_INSTRUCTIONS_v2.md   # FR-003: new, v1 verbatim + per-axis string statement
│   │           └── README.md                    # FR-006: rubric version + dispatch-wrapper identity per run
│   └── tests/
│       ├── mechanismExplainer.test.mjs           # extend: FR-013 guard-aware usedSpecs
│       ├── reasonRenderGuard.test.mjs            # extend: FR-004 diagnostics opt-in + AC 2a byte-identity
│       ├── renderReasonModel.test.mjs            # extend: FR-011 replyHistogram corpus assertion (new,
│       │                                          # sequence against the FR-018/019 extension below —
│       │                                          # same file), FR-018/019 array-branch fix + fieldPartition test
│       ├── renderCoverageCorpus.test.mjs         # extend: FR-014/015/020/021/022/023/024/025 corpus sweeps
│       ├── renderCoverageUniverse.test.mjs       # extend: corpus-wide coverage predicate, if touched
│       ├── reasonBoardSelect.test.mjs            # extend: FR-008/009/010/012/019(b)
│       ├── reasonBoardTags.test.mjs              # extend: FR-009/010
│       ├── zoneAnnotations.test.mjs              # extend: FR-015/016/021/022/024
│       ├── causalLinks.test.mjs                  # extend: FR-008/009/012/023/025
│       ├── openingFrame.test.mjs                 # extend: FR-020
│       └── [NEW FILES — see "Test-file registration" below]
├── .claude/skills/grade-fv-sufficiency/SKILL.md  # FR-005: dispatch step reads checked-in v2 rubric
└── docs/
    ├── deployment_steps.md                # FR-029/AC 15: new entry(ies) for served-text changes
    ├── architecture/
    │   ├── reason-DECISIONS.md            # FR-030: 3 D-entries from this plan's Design Decisions,
    │   │                                   # plus 1 per non-obvious implementation decision (Q2/Q3/Q5/Q8 picks)
    │   └── reason-render-grounded-prompt.md  # FR-030: extend §12 (never contradict) for the READING_KEY
    │                                          # never-repeat additions and any new render-contract rule
    └── open_issues.md                     # per the epic's own rule (`deep-reveal-remediation-epic.md:360-361`,
                                            # "every task's definition of done includes updating the
                                            # status of every issue it resolves"), status updates span
                                            # every OI-N this epic's tasks touch, not only the 3
                                            # near-duplicates: (a) CLOSE — OI-187, OI-188, OI-182;
                                            # (b) NARROW (restate scope, stay open) — OI-140, OI-170,
                                            # OI-172, OI-208, per FR-007's attribution; (c) RESOLVE /
                                            # correct status — OI-177, 180, 184, 189, 193, 194, 195, 198,
                                            # 199, 201, 202, 203, 204, 205, 206, 207. OI-189 in
                                            # particular needs a STALE-STATUS correction, not just a new
                                            # status: `open_issues.md:7042` still reads "open (fix
                                            # specified as Task 9b...; not yet implemented)" while the
                                            # display-path half already shipped as D48/I13 (epic `:346`,
                                            # 49/63 records -> 0/63) — the remaining half is this epic's
                                            # task 3.9/T032.
```

**Structure Decision**: single existing service, no new project. Every touched file already exists
except `GRADER_INSTRUCTIONS_v2.md` (new, checked-in doc) and the new test files listed below. The file
map above is what `/speckit-tasks` reads to generate the task list — every FR's surface is represented
so no task silently drops (per the task-generation house rule cited in the reading contract).

## Deploy prerequisites

Walking the required checklist:

- **Schema migration**: **NO.** No `connect-four/server/migrations/` file. `render_decision`/answers
  rows are JSONL files, not DB tables.
- **Data migration / backfill**: **NO new backfill**, but a **consequence** exists: any US2/US3 fix
  that changes `renderReasonModel.mjs`/`zoneAnnotations.mjs`/`causalLinks.mjs`/`openingFrame.mjs`
  output changes the *generated* prompt/served text for every future `/explain-move-llm` call. Rows
  written under the OLD render layer do not fix themselves — this is exactly the same shape as the
  already-`PENDING` "Spec 058 render remediation — purge cached deep reveals" entry
  (`docs/deployment_steps.md:1952`, status `PENDING`) in `docs/deployment_steps.md`. **Extend that
  existing entry rather than filing a new one** — the file's own precedent: this exact entry was
  already extended **twice**, not once — 2026-08-25 for `0d6f818..2ef3ccb` (`:1966`) and 2026-08-26 for
  `b9be303..086b8ea` (`:1975`) — so a third extension for this epic's commit range, once merged, follows
  the established pattern rather than inventing a new one. Add one explicit line closing the DONE-flip
  hole that has already bitten this exact file once: *"if this entry was already marked DONE before
  Epic 12 merged, it must be run again"* — precedent at `docs/deployment_steps.md:1826`
  ("Staging's 058 TRUNCATE is already marked DONE 2026-08-04 — i.e. it ran BEFORE this code — so on
  staging it must be run again"). Extending is not "engineering around" the owner-tracked purge (Out of
  Scope excludes touching the purge's own execution, not adding a line to its checklist). The
  already-PENDING purge itself stays untouched. **Reconcile FR-029's literal "MUST append an entry"
  wording (`spec.md:392`) with this "extend, don't duplicate" instruction** — FR-029 is satisfied by
  appending a *line* to the existing entry; it does not require a wholly new top-level entry, and
  `/speckit-tasks` must not read it as requiring one.
- **Content pools**: **NO.** No `puzzles`/`candidates` table row was generated under a changed
  predicate here — this epic does not touch puzzle categories.
- **Secrets / env vars**: **NO.** No new env var is read by any change in this plan.
- **Caches**: **YES**, covered by the extended `explanation_cache` purge entry above (served-text
  change). No TTS-specific action needed beyond what the existing addendum entry already documents
  (keyed by position hash, self-heals once `explanation_cache` is purged — verified precedent already
  in the file).
- **Ordering**: served-text changes (US2/US3) and the harness/rubric change (US1) can ship in the same
  release; US1 has no player-facing effect at all (it only changes what the offline harness records —
  FR-001/002 touch `compute.mjs`, an offline script, not the production endpoint). FR-004's widened
  `guardExplainMoveLlmPayload` return shape is opt-in and byte-identical by default (AC 2a) — it needs
  **no** deploy sequencing of its own. Only the render-layer fixes (US2/US3) require the
  `explanation_cache` purge, and only *after* the code deploy (matching the existing entry's own
  `When: after the code deploy` — safe either way, self-heals without it, just doesn't reach any
  already-cached position).

**Because at least one item above is YES** (the purge extension), the Source Code map above lists
`docs/deployment_steps.md` as a file this feature updates (already present in the tree above), so
`/speckit-tasks` generates a task for it rather than losing it in prose.

## Test-file registration (for the human to append to `test:fast`)

No agent may edit `connect-four/package.json`. Every genuinely **new** test file this plan's tasks are
expected to introduce (as opposed to extending an existing file, which needs no registration):

1. `connect-four/server/tests/computePostGuard.test.mjs` — FR-001/FR-002: asserts `compute.mjs`'s new
   post-guard field is produced by importing `guardExplainMoveLlmPayload` (not a reimplementation —
   AC 1's "a test asserts the imported symbol is used"), and that replaying the recorded
   `…2026-08-26T15-47-56Z` run reproduces the harvested **0** raw-`cNrM`-in-prose / **5** spans-lost
   fixture (AC 2/SC-001).
2. `connect-four/server/tests/guardActionAttribution.test.mjs` — FR-007: the code→OI mapping table and
   its assertion that OI-140/OI-170/OI-172/OI-208 codes are attributed, not folded into OI-194's count.
3. `connect-four/server/tests/renderFieldPartitionLineCarveout.test.mjs` — Design Decision 2's
   board-selection-aware corpus sweep for `.line`-pattern transformed paths (FR-019(b)), since this is
   a genuinely new invariant class, not an extension of an existing `fieldPartition` assertion.

Everything else in the Source Code map's `tests/` section is an **extension** of an existing file and
needs no new registration — those files are already in `test:fast`.

## Complexity Tracking

*No constitution violations. Table intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
