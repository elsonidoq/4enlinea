---

description: "Task list for Deep-Reveal Remediation (Epic 12) / spec 059"
---

# Tasks: Deep-Reveal Remediation (Epic 12)

**Input**: Design documents from `specs/059-deep-reveal-remediation/` (spec.md, plan.md, research.md,
data-model.md, quickstart.md, contracts/guard-diagnostics-contract.md), and
`docs/epics/deep-reveal-remediation-epic.md` (source of truth for task numbering — this file's tasks
map 1:1 onto the epic's `1.x`/`2.x`/`3.x` tasks, cited in each description below).

**Tests**: Included. FR-031 requires every US2/US3 fix to be validated by a deterministic, model-free
corpus test through the production render function — no task is "done" without one. US1 is likewise
validated only by a harvested regression fixture, never an LLM call.

**Organization**: Tasks are grouped by user story (US1/US2/US3), in the epic's mandated order. Every
line-number citation reused from plan.md/research.md/data-model.md was source-verified at HEAD in
that session; `zoneAnnotations.mjs`, `causalLinks.mjs`, `openingFrame.mjs`, `reasonBoardSelect.mjs`,
`reasonBoardTags.mjs`, `SKILL.md`, `GRADER_INSTRUCTIONS_v1.md`, and `annotationGate.js` export-name
citations are **UNVERIFIED** — locate by symbol name, not by the line number given, before editing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependency)
- **[Story]**: US1 / US2 / US3, or none for Setup/Foundational/Polish
- Every task names its exact file path(s) and, where applicable, the OI-N / FR-NNN it resolves

## Hard constraints (apply to every task below)

- **Never edit `connect-four/package.json`.** New test files are *named* for a human to append to
  `test:fast` (see the dedicated task in Polish).
- **No task executes an LLM eval batch or a deploy action.** The LLM re-measure is owner-approval-gated
  at T045; no task in this spec runs the deploy action at all — T046 is a non-executing note only (the
  deploy agent, a separate role, runs it — `docs/deployment_steps.md:31-33,50-51`).
- **Never `git add -A`/`.`/`-a`, never `git stash`.** Stage exact paths only, and only when the human
  asks for a commit — task completion here means the working tree is edited, not committed.
- Do not resolve `[NEEDS CLARIFICATION: Q1–Q5, Q7, Q8]`. Where a task implements one of research.md's
  **PROVISIONAL** answers to those questions, the task says so explicitly and requires a code comment
  flagging the `Qn` marker, per spec.md's instruction not to silently resolve it.
- After every task that edits `connect-four/server/**`, run `cd connect-four && npm run test:fast` and
  confirm it is still ≥ the branch-point baseline (**1999 pass / 0 fail, 278 suites, 0 eslint errors** —
  re-measure at your own session's start; do not trust an inherited number if time has passed) before
  moving to the next task (FR-027).

---

## Phase 1: Setup

- [x] T001 Re-measure the `test:fast` baseline at your session's start: `cd connect-four && npm run
  test:fast`. Record the pass/fail/suite counts you actually observed (expected ≈1999 pass / 0 fail /
  278 suites per `quickstart.md`, but FR-027 requires a fresh measurement, not an inherited one — the
  tree may carry additional uncommitted changes since plan-writing time). This is the number every
  later task's regression check compares against. No file is edited.

---

## Phase 2: Foundational (blocking prerequisite for T004, T009, T011, and T017 specifically — not all of US3)

**⚠️ CRITICAL**: T017 (US2, FR-013/task 2.6) cannot be implemented until this task lands — this is the
one explicit **implementation** dependency edge in the epic (`plan.md`'s "Task dependency for
/speckit-tasks" note): *FR-004/task 1.7 → FR-013/task 2.6*. T004 and T009 (US1) also consume this
task's output but are validation-ordered, not blocked in the same hard sense.

- [x] T002 **[FR-004, epic task 1.7]** Widen `guardExplainMoveLlmPayload`
  (`connect-four/server/reasonRenderGuard.mjs:418`, synchronous — verify by symbol) to accept a new
  optional input `diagnostics = false` and, only when the caller passes `diagnostics: true`, return an
  additional `diagnostics: { failures: string[], strippedSpecs: string[] }` key threaded out of the
  function's own existing internals — `failures` from `validateAnnotation`'s return
  (`reasonRenderGuard.mjs:428-429`, currently only `console.warn`'d at `:434`) and `strippedSpecs` from
  the `specs` Set `stripFailingZoneSpans` already builds internally from `SPAN_CARRYING_CODES`
  (`:354,366-372`). Do **not** add `promotedCoordinates`/`humanizedCoordinates` — explicitly cut by
  `contracts/guard-diagnostics-contract.md` (no internal collection exists to thread out; adding it
  would require new instrumentation inside two production text-rewriting functions, out of scope).
  When the flag is omitted or `false`, the return shape MUST be byte-identical to today's
  `{ ...rest, explanation, prompt, terms }` — no `diagnostics` key present at all, not even
  `undefined`. Confirm none of the three existing production call sites
  (`connect-four/server/index.js:1327,1365,1470`) pass the new flag — they must keep omitting it
  (AC 2a). File: `connect-four/server/reasonRenderGuard.mjs`.

**Checkpoint**: `guardExplainMoveLlmPayload`'s diagnostics field exists and is opt-in-only. Nothing
downstream is wired to it yet — that happens inside each consuming task below.

---

## Phase 3: User Story 1 — The eval grades the text production would actually serve (Priority: P1)

**Goal**: Every recorded answers row carries the post-guard served string plus guard diagnostics,
`GRADER_INSTRUCTIONS_v2.md` is the sole rubric source any grading run reads, and the harvested
regression fixture (0 raw `cNrM` in served prose, 5 spans lost) reproduces from the already-recorded
`…2026-08-26T15-47-56Z` run without any new LLM call.

**Independent Test**: `node --test connect-four/server/tests/computePostGuard.test.mjs` — replays the
recorded run through the new harness path and asserts SC-001's two harvested figures, no model call.

### Implementation for User Story 1

- [x] T003 **[US1] [FR-001, epic task 1.1]** In `connect-four/server/scripts/compute.mjs`, import
  `Board` (`./classifier.js`, same relative resolution `index.js:12` uses),
  `guardExplainMoveLlmPayload`, `toAllowedSet` (`./reasonRenderGuard.mjs`) — `compute.mjs` does not
  import these today (verify at `compute.mjs`'s current import block). Inside `postprocessAnswer` or
  its caller (`compute.mjs`, symbol-located — old citations `:306-312`/`:384` may have drifted), add a
  `servedExplanation` field to each written answers row: call
  `guardExplainMoveLlmPayload({ explanation: mechanism, board: new Board(feature_vector.movestring),
  allowedSet: toAllowedSet(render_decision.zones.aliases), diagnostics: true, ... })` and store
  `.explanation`. **Never a reimplementation of the guard's logic** — the AC 1 test (T009) asserts the
  imported symbol is actually called. Retain the existing pre-guard `mechanism` field unchanged (Q1
  PROVISIONAL: store both — add a code comment `// Q1 PROVISIONAL: both mechanism and
  servedExplanation stored; see spec.md Q1`). Depends on T002.

- [x] T004 **[US1] [FR-002, epic task 1.2]** In the same `compute.mjs` call site as T003, also read the
  `diagnostics` object from the same `guardExplainMoveLlmPayload` call (do not call it twice) and store
  it verbatim as a new `guardDiagnostics: { failures, strippedSpecs }` field on the answers row —
  **not** recomputed by separately calling `validateAnnotation`/`stripFailingZoneSpans`. File:
  `connect-four/server/scripts/compute.mjs`. Depends on T002, T003.

- [x] T005 **[US1] [P] [FR-003, epic task 1.3]** Create
  `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md`: the full byte content of
  `GRADER_INSTRUCTIONS_v1.md` (already a complete, self-sufficient 218-line rubric defining A5
  `:115-136`, A6 `:137-138`, A7 `:139-163`, G1–G7 `:165-178`, the pass rule `:179`, triage `:184` —
  verify these line numbers are current before citing them further), verbatim, **plus** a new section
  stating, per axis (A5, A6, A7, G1, G7 at minimum), whether it grades `mechanism` (pre-guard) or
  `servedExplanation` (post-guard) — served prose for A5/A7b/G1/G7 per spec.md's Acceptance Scenario 4;
  A6 is a documented special case (`grade_mechanical.mjs` already imports production's
  `mentionsBetterColumn`, effectively post-guard — UNVERIFIED citation `grade_mechanical.mjs:12,42-43`,
  confirm before asserting it in the file). **Do not fold in or relocate any text from `SKILL.md`** —
  record the SKILL.md-vs-v1 divergence as a known non-comparability instead of resolving it.
  `GRADER_INSTRUCTIONS_v1.md` itself is never edited and must remain byte-identical to its state at
  commit `f6282be` (diff against that commit to confirm before finishing this task). No code
  dependency — can start immediately.

- [x] T006 **[US1] [FR-005, epic task 1.4]** In `.claude/skills/grade-fv-sufficiency/SKILL.md`, locate
  by string search (not by line number — this file carries uncommitted changes) the step that writes
  "the whole prompt template" fresh to `<scratchpad>/GRADER_INSTRUCTIONS.md` each run (near the
  previously-cited `:656-661`). Replace it with a dispatch step that reads the checked-in
  `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` in full and nothing else.
  Make the skill's already-specified fixed three-line dispatch **mandatory**, and add an explicit
  prohibition on carrying out-of-rubric context (open-issue lists, hypotheses, "known traps") in any
  dispatch message (AC 4). This resolves Q6, which is already RESOLVED per spec.md — do not treat it as
  open. Depends on T005 (the file it must point at must exist first).

- [x] T006a **[US1] [P] [NEW TEST FILE] [epic AC 3a, AC 4, SC-002, SC-004]** Create
  `connect-four/server/tests/gradeDispatchFreeze.test.mjs`: a grep-level, text-only check (no LLM call,
  no grading fan-out) reading `.claude/skills/grade-fv-sufficiency/SKILL.md` and asserting (a) the
  dispatch step T006 edits names the checked-in path
  `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` verbatim, and (b) the
  dispatch step's own text carries the no-out-of-rubric-context prohibition T006 adds (no open-issue
  lists, no hypotheses, no "known traps" in a dispatch message). This is the automated referent for
  epic AC 3a (`docs/epics/deep-reveal-remediation-epic.md:391`, *"A test or manual check confirms the
  dispatch instruction names the checked-in path"*) and AC 4 (`:394`, byte-identical dispatch messages)
  — currently nothing in this task list verifies either. Locate the dispatch step by string search, not
  by line number — `SKILL.md` carries ~+237/−49 uncommitted lines in this tree. Depends on T006. Also
  named for `test:fast` registration (T044).

- [x] T007 **[US1] [P] [FR-006, epic task 1.5]** In
  `connect-four/server/scripts/reason_corpus/runs/README.md`, add a column/note recording, for every
  run, the rubric version (v1 or v2) and the dispatch-wrapper identity, and remove/correct the
  superseded "flat incidence" / "70 passing runs had the same defect" claims — replace with the
  corrected prose-layer figures from the epic's `## The evidence` (109/89/62 out of 125 prose-only, and
  the 49/50-vs-13/75 split). No code dependency — can start immediately, in parallel with T005/T006.

- [x] T008 **[US1] [FR-007, epic task 1.6]** Build a code → OI mapping table (e.g. in `compute.mjs` or
  a small shared module it imports) attributing every guard-action failure code T004's
  `guardDiagnostics.failures` can surface to its owning open issue: OI-140 (ordering — P6 runs before
  token-stripping), OI-172 (`P5strong:cell_not_allowed`, whole-window-only admission), OI-170
  (`P5strong:tg` rejection spans never stripped), OI-208 (`unclosed_tag` repair placement). Output,
  as a comment or a small report the task's own test (T010) asserts against: which of these losses
  OI-194's fix (US3, T022/T023) would actually remove versus which are a different issue's cost. Add a
  short "attributed, not fixed" note to each of these four issues' entries in `docs/open_issues.md`
  (status stays `open`; do not close them — explicitly excluded from this epic, see spec.md Out of
  Scope). Files: `connect-four/server/scripts/compute.mjs`, `docs/open_issues.md`. Depends on T004.

### Tests for User Story 1

- [x] T009 **[US1] [P] [NEW TEST FILE]** Create
  `connect-four/server/tests/computePostGuard.test.mjs`: (a) asserts `compute.mjs`'s post-guard path
  imports and calls the real `guardExplainMoveLlmPayload` symbol (not a reimplementation — grep the
  module's import list or spy on the import), and (b) replays the recorded
  `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl` run through the new `servedExplanation`
  field and asserts the **harvested** regression fixture: raw `cNrM` tokens in prose (tags stripped)
  = **0** across all 125 rows, and runs losing ≥1 `[zone:…]` span = **exactly 5** (SC-001). Do not
  hand-write this fixture — compute it by actually running the new code path against the real recorded
  file. Depends on T003, T004. This is one of the files that MUST be named for the human to append to
  `test:fast` (see T044).

- [x] T010 **[US1] [P] [NEW TEST FILE]** Create
  `connect-four/server/tests/guardActionAttribution.test.mjs`: asserts the T008 code → OI mapping table
  covers every code that appears in `guardDiagnostics.failures` across the recorded 125-row run, and
  that OI-140/OI-170/OI-172/OI-208 codes are attributed to those issues rather than silently folded
  into an OI-194 count. Depends on T008. Also named for `test:fast` registration (T044).

- [x] T011 **[US1] [FR-004, AC 2a]** Extend `connect-four/server/tests/reasonRenderGuard.test.mjs`
  (existing file — do not create a new one) with: (a) a case asserting `diagnostics` is absent from
  `guardExplainMoveLlmPayload`'s return when the flag is omitted — byte-identical to the pre-epic
  shape; (b) a case asserting `diagnostics.failures`/`diagnostics.strippedSpecs` are present and
  correctly populated when `diagnostics: true` is passed, against a real corpus record known to strip
  a span (one of the 5 from T009's fixture); (c) a negative assertion that no third key
  (`promotedCoordinates`, `humanizedCoordinates`, anything else) appears in `diagnostics` — guards
  against scope creep back into the cut fields; (d) confirms the live `/explain` endpoint
  (`connect-four/server/index.js:1470`) still omits the flag today, so its response is unaffected
  (AC 2a — this can be a static assertion against the call site's source, not a live HTTP call). Depends
  on T002.

**Checkpoint**: US1 is independently complete and testable — `node --test
connect-four/server/tests/computePostGuard.test.mjs connect-four/server/tests/reasonRenderGuard.test.mjs
connect-four/server/tests/gradeDispatchFreeze.test.mjs`
passes with no model call. `GRADER_INSTRUCTIONS_v2.md` exists and the skill points at it.

---

## Phase 4: User Story 2 — No rendered artifact describes a board state that is not true (Priority: P1)

**Goal**: A terminal `afterBest` board never lists live threats; an `immediate_threat`-grain claim
always matches its own board's tactics grain; a tactic overlay only ever names discs that exist on its
board; a `replyHistogram` comparative never contradicts its own reading key; an L2 "occupy" link never
names an empty square; and the required-set retry treats a guard-stripped required spec as missing.

**Independent Test**: For each fix, a deterministic test runs the actual production render function
against a real corpus board and asserts the invariant — no LLM call. E.g. for OI-203/T012: assert that
once `afterBest` is terminal (`checkWin` true, `connect-four/server/classifier.js:77`, on the engine's
own `finalMovestring`), the rendered board carries no live threat entries.

### Implementation for User Story 2

- [x] T012 **[US2] [FR-008, OI-203, epic task 2.1, Q3 PROVISIONAL]** In
  `connect-four/server/scripts/reasonBoardSelect.mjs` (`boardSelectionDecisions`, UNVERIFIED citation
  `:51-112` — locate `applyCol`/`tagBoard` calls by symbol), when the `afterBest` board is terminal
  (`checkWin` true on the engine's own `finalMovestring` — import and call `checkWin`, never
  reimplement it), suppress its live threat tags (`tags: []`) and mark it `terminal: true` rather than
  dropping the board entirely (PROVISIONAL choice — code comment `// Q3 PROVISIONAL: keep the board,
  suppress tags — see spec.md Q3`). In
  `connect-four/server/scripts/reason_engine/causalLinks.mjs`, give L1's template (UNVERIFIED citation
  `:66`, immediate_threat phrase at `:38`) a terminal-aware branch that renders a single explicit
  game-over sentence (reuse existing "the game is over" phrasing already used elsewhere in the codebase
  — grep for it before inventing new wording) instead of future-tense threat language. If the exact
  chosen wording is new, add it to `READING_KEY`'s never-repeat list in the same change (see T042,
  §12g). Reproduces GREEN on `eval-41` (5/5 today RED per the epic).

- [x] T013 **[US2] [FR-010, OI-204 + OI-195 second half, epic task 2.2]** In
  `connect-four/server/scripts/reasonBoardTags.mjs`, ensure a tactic overlay is attached to a board
  only when every disc the tactic requires actually exists on that board's own state — fix the
  `pin-L2-enabled-opponent` case (decision board reports "Major threats: none" while the Tactics list
  asserts the opponent's double threat) and confirm `eval-33`'s mirror case. This closes **OI-188**
  jointly with T016 below (see T040 for the status update).

- [x] T014 **[US2] [FR-011, OI-202, epic task 2.3, Q4 PROVISIONAL]** In
  `connect-four/server/scripts/renderReasonModel.mjs` (`READING_KEY`, UNVERIFIED citation `:332-342`),
  add a guard so the `replyHistogram` comparative sentence is emitted only when the rendered counts
  actually support the direction the key states; otherwise omit the sentence entirely (the safer,
  smaller-surface PROVISIONAL choice — code comment `// Q4 PROVISIONAL: drop rather than restate — see
  spec.md Q4`). Do not attempt to make the rule count-AND-score-aware (that needs reply scores, new
  prompt surface, out of scope). Fixes `eval-37`.

- [x] T015 **[US2] [FR-012, OI-195 remaining half a, epic task 2.4]** In
  `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L2, UNVERIFIED citation `:89`), fix the
  "occupy" verb so it never names a square that is empty on the engine's own `finalMovestring` — the
  four records currently over-claiming this.

- [x] T016 **[US2] [FR-009, OI-188, epic task 2.5]** In `causalLinks.mjs` (L3 template) and
  `reasonBoardTags.mjs`, fix the grain mismatch: any frame/link asserting an `immediate_threat`-grain
  claim ("to make four next move") on a named board must match that board's own tactics-block grain for
  the same cell (`major` ≠ `immediate`) — independent of terminality. Fixes `eval-37` and
  `pin-branch-invariance-true-2` (both non-terminal). This extends **OI-188** (do not open a new issue)
  and is closed jointly with T013.

- [x] T017 **[US2] [FR-013, OI-177, epic task 2.6, Design Decision 1 — depends on T002 (FR-004/task 1.7)]**
  In `connect-four/server/mechanismExplainer.mjs`, import `Board` (`./classifier.js`) and
  `guardExplainMoveLlmPayload`, `toAllowedSet` (`./reasonRenderGuard.mjs`) alongside the existing
  `stripInternalTokens` import (UNVERIFIED citation `:30`). **Immediately before** the existing
  `missing = missingRequiredGroups(requiredSet, attempt1)` call (UNVERIFIED citation `:221`), build
  `board = new Board(movestring)` and `allowedSet = toAllowedSet(renderDecision?.zones?.aliases ?? [])`,
  call `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board, allowedSet,
  diagnostics: true })` (T002's new flag) to get `diagnostics.strippedSpecs`, compute
  `survivedSpecs = attempt1.usedSpecs.filter(s => !diagnostics.strippedSpecs.includes(s))`, and pass
  `{ usedSpecs: survivedSpecs }` — not the raw `attempt1.usedSpecs` — into the existing
  `missingRequiredGroups` call. **Do not** re-invoke `processAnnotations` on guard output, and do
  **not** move this check to after the retry — `missingRequiredGroups` is called exactly once, on
  `attempt1`, and its result IS the retry trigger. The retry's BUDGET and TRIGGER SET stay unchanged
  (Settled decision 4) — this only changes which specs count as "used." Consequence, expected and
  correct: more of the 5 span-losing runs now retry. Add the D-log entry recording this seam choice (see
  T041).

### Tests for User Story 2

- [x] T018 **[US2] [P]** Extend `connect-four/server/tests/reasonBoardSelect.test.mjs` (existing file)
  with a corpus-wide assertion for FR-008 (terminal `afterBest` never carries a live threat entry) and
  contribute the board-visibility half of FR-019(b) (used by T028). Depends on T012.

- [x] T019 **[US2] [P]** Extend `connect-four/server/tests/reasonBoardTags.test.mjs` (existing file)
  with corpus-wide assertions for FR-009 (grain match) and FR-010 (tactic-overlay disc existence),
  covering `pin-L2-enabled-opponent` and `eval-33` going GREEN. Depends on T013, T016.

- [x] T020 **[US2]** Extend `connect-four/server/tests/causalLinks.test.mjs` (existing file) with the
  US2 portion: FR-008 (no future-tense terminal narration), FR-009 (L3 grain), FR-012 (L2 occupy).
  Depends on T012, T015, T016. (US3 extends this same file further in T036 — sequence after this task,
  not in parallel, since both edit the same file.)

- [x] T021 **[US2]** Extend `connect-four/server/tests/mechanismExplainer.test.mjs` (existing file)
  with a case asserting the guard-aware `survivedSpecs` computation: a required spec whose span the
  guard strips is now treated as missing and triggers the retry, using one of the 5 span-losing rows
  from the US1 fixture as the real input. Depends on T017.

- [x] T021a **[US2] [FR-011, OI-202, SC-008]** Extend `connect-four/server/tests/renderReasonModel.test.mjs`
  (existing file) with a corpus-wide assertion for FR-011: for every corpus record where a
  `replyHistogram` comparative sentence is rendered, the direction it states MUST be the direction the
  rendered counts actually support; for every record where the guard added by T014 omits the sentence,
  assert no comparative claim is present at all. This is the test blocking-issue-1 of the tasks-review
  identified as missing — `FR-011` previously appeared exactly once in this file (T014) with no
  corresponding test, breaking FR-031/SC-008. Depends on T014. **File-collision note**: this task and
  T038 both extend `renderReasonModel.test.mjs` (T038 covers FR-017/FR-018) — run T021a **before** T038
  (sequential, not `[P]`) to avoid a same-file collision; do not run them concurrently. This is one of
  the four same-file collisions named in "Parallel Opportunities" below.

**Checkpoint**: US2 is independently complete — every FR-008..FR-013 invariant, **including FR-011**,
has a corpus-wide, model-free test. Run `node --test connect-four/server/tests/reasonBoardSelect.test.mjs
connect-four/server/tests/reasonBoardTags.test.mjs connect-four/server/tests/causalLinks.test.mjs
connect-four/server/tests/mechanismExplainer.test.mjs connect-four/server/tests/renderReasonModel.test.mjs`.

---

## Phase 5: User Story 3 — Every handle, role, and template is unambiguous, owned, and obeys the rules the prompt states (Priority: P2)

**Goal**: No printed prompt surface the model is told not to echo carries a raw coordinate; every
offered role/term names its owner where determinable and agrees in arity with its spec; the required
set can request the better column; nothing renders as `[{},{},{},{}]`; the opening guardrail never
invites what it forbids; and no causal frame introduces vocabulary or contradicts its own record's
required set.

**Independent Test**: Each defect gets its own deterministic test against a real corpus record through
`assembleGroundedPrompt`/`zoneAnnotations.mjs`/`renderReasonModel.mjs` — e.g. sweep the 63-record
corpus for `[{},{},{},{}]` literals, or for `cNrM` tokens inside `link.text`/`zones.aliases[].role`.

### Implementation for User Story 3

- [x] T022 **[US3] [FR-014a, OI-194, epic task 3.1 — Q8-independent half]** In
  `connect-four/server/scripts/reason_engine/causalLinks.mjs`, fix the `link.text` raw-coordinate
  producer: L1/L2/L3/L4/L8 templates (UNVERIFIED citations `:66,76,88,110,135`) interpolate raw
  `completingCell`/`window` values directly — replace with plain-language references per OI-194's own
  filed "Fix direction" (`docs/open_issues.md`). This half does **not** depend on Q8 and can land
  without waiting for `/clarify`. Baseline to go RED against first: 20/25 subset records
  (SC-011/AC 11).

- [x] T023 **[US3] [FR-014b, OI-194, epic task 3.1 — Q8 PROVISIONAL half, PENDING-with-question]** In
  `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`, fix the `zones.aliases[].role`
  raw-coordinate producer: `specHint()` → `disambiguateSiblingRoles()` (UNVERIFIED citation
  `:401-424`) currently injects `"the one at c6r5: …"` to satisfy D49's sibling-disambiguation fix for
  OI-191. Replace the coordinate-bearing hint with a plain-English ordinal locator tied to a stable,
  deterministic sort order (e.g. board-then-row-then-column → "the lower one"/"the higher one") —
  PROVISIONAL per research.md Q8; add a code comment `// Q8 PROVISIONAL: ordinal locator, not raw
  coordinates — see spec.md Q8` and flag the marker for `/clarify`. **The D49 sibling-disambiguation
  property MUST still hold**: no two aliases sharing `(role, truthBoard)` may restate identically
  (§12d) — re-introducing the OI-191 collision is a regression, not a fix. `alias.spec` /
  `requiredSet[].spec` stay coordinate-bearing (exempt by design — the `aliasBySpec` match key,
  UNVERIFIED citation `renderReasonModel.mjs:137,146`) — do not touch those. Baseline: 13/25 subset
  records for `zones.aliases[].role`, of which the required block re-prints 10/13 (`role: alias.role`,
  UNVERIFIED `renderReasonModel.mjs:153`). Log the chosen locator wording in D49's neighborhood in
  `reason-DECISIONS.md` (T041) and add it to the never-repeat list (T042, §12g).

- [x] T024 **[US3] [FR-015, OI-201, epic task 3.2]** In `zoneAnnotations.mjs` (UNVERIFIED citation
  `:61`), make `future-line` role text name a conjugated owner, matching the `line` branch's existing
  behavior — fixes `eval-2` (2/5 runs today hand the player's own line to the opponent).

- [x] T025 **[US3] [FR-016, OI-193, epic task 3.3]** In `zoneAnnotations.mjs`, make `forkPivotCell`
  offer a pivot handle even when the fork's evidence lives only in board tags, not a tagged evidence
  half (`FORK_TAGS.has(half.tacticTag)`, UNVERIFIED citation `:93-94`) — fixes `eval-47`, which
  currently gets no offered pivot.

- [x] T026 **[US3] [FR-017, OI-205/OI-187, epic task 3.4, Q2 PROVISIONAL, PENDING-with-question (at-cap case)]** In
  `connect-four/server/scripts/renderReasonModel.mjs` (`deriveRequiredSet`, cap at UNVERIFIED
  `:172`, `return groups.slice(0, 3);`), when `groups.length < 3` after the existing cell/pivot/line
  derivation, add `better-col` as a lowest-priority candidate that fills only an already-free slot —
  never displacing an existing geometry group (PROVISIONAL, code comment `// Q2 PROVISIONAL: reserved
  4th-priority push into a free slot only; the 15/25 at-cap records are not obligated — see spec.md
  Q2`). Must not break `required ⊆ offered` or the 3-slot cap. This is a **partial** answer per
  research.md — the 15/25 at-cap records remain unresolved by design; flag this explicitly in the code
  comment. Closes **OI-187** as a near-duplicate (see T040).

- [x] T027 **[US3] [FR-018, OI-206, epic task 3.5]** In `renderReasonModel.mjs`'s `renderedFields`
  (`prune`, UNVERIFIED citations `:37-40` array branch vs `:43-45` object branch), mirror the object
  branch's empty-drop guard (`if (Object.keys(child).length) copy[key] = child;`) into the array branch
  after `pruneArray(val, path)` runs: if every element pruned to `{}` (or the array is empty), omit the
  key from `copy` entirely — this removes the `[{},{},{},{}]` literal from the JSON residue (13/25
  subset records affected, `docs/open_issues.md:7429`). This is a small, local change to `prune` only —
  do not touch `fieldPartition` in this task (that is T028).

- [x] T028 **[US3] [FR-019(b), Design Decision 2, epic AC 9(b)]** Create
  `connect-four/server/tests/renderFieldPartitionLineCarveout.test.mjs`: for every corpus record, for
  each leaf path `fieldPartition` classifies `rendered` whose `dispositionOf(path) === 'transformed'`
  and matches `/(^|\.)line(\[\]|\.|$)/` (e.g. `lostResource.line[]`), assert the geometry it represents
  is present on at least one board in that record's `boardSelectionDecisions(...)` output with
  `shown: true` (use the production `reasonBoardSelect.mjs:boardSelectionDecisions` function, never a
  reimplementation), OR a `zones.aliases` entry derived from `.line` exists (e.g. a `forkPivotCell`
  handle). **`eval-33` is a named, commented exemption** — `const KNOWN_EXEMPTIONS = new
  Set(['eval-33']); // lostResource.line, denial half, no board-selection remedy — deferred, see
  docs/epics/deep-reveal-remediation-epic.md ### Deferred` — the test still asserts the invariant
  RED-for-real on every other record; do not weaken the assertion and do not reclassify
  `fieldPartition`'s `TRANSFORMED_LEAVES` carve-out to make the exemption unnecessary. **Do not attempt
  the `eval-33` board-selection remedy in this task or any other — it is explicitly deferred out of
  this epic.** Also add the direct FR-019(a) regression assertion here (no rendered JSON contains an
  empty object/array literal — the direct check for T027). Depends on T027. This is one of the files
  that MUST be named for the human to append to `test:fast` (see T044).

- [x] T029 **[US3] [FR-020, OI-199, epic task 3.6, Q5 PROVISIONAL]** In
  `connect-four/server/scripts/reason_engine/openingFrame.mjs`, when the centrality clause is
  suppressed (`mk`'s `clause === ''` condition, UNVERIFIED citation `:88-93`), do not append
  `GUARDRAIL_ADMISSIBLE_FRAMINGS_CENTRALITY_ONLY` — gate that append (and a new parity-only sentence)
  on the same `clause === ''` condition the existing `GUARDRAIL_NO_CENTRALITY` append already uses.
  PROVISIONAL: drop the invitation, do **not** relax the guardrail itself (the `eval-21` gate exists
  for a documented reason — do not touch it without `/clarify` surfacing the D-log context; code
  comment `// Q5 PROVISIONAL: drop centrality clause, guardrail unchanged — see spec.md Q5`). Fixes
  `eval-21` (5/5) and `eval-11`.

- [x] T030 **[US3] [FR-021, OI-198, epic task 3.7]** In `zoneAnnotations.mjs`, fix the possessive/verb
  agreement defect as a **class**, not a single string — the `major` fallback's `"you's four-in-a-row
  line"` (UNVERIFIED `:78`) and the `double` branch's `"you gets two winning squares at once"`
  (UNVERIFIED `:59`) are the same defect (an interpolated `${who}` that is never conjugated). Fix every
  `roleText` branch so it is grammatical for both second- and third-person owners. Baselines to go RED
  against first: `"you's"` on 9/25, `"you gets"` on 5/25 subset records — a fix that only greps for
  `"you's"` fails this task.

- [x] T031 **[US3] [FR-022, OI-180, epic task 3.8]** In `zoneAnnotations.mjs`, fix the arity mismatch
  between `kind === 'double'` role text ("the single fork square", UNVERIFIED `:59`) and its own spec,
  which can be a 3-cell set (`eval-47`: `you-double = windows:c3r6,c6r5,c7r2`). **Do not open a new
  issue id** — this is the role-side view of already-filed OI-180 (`halfForkCellsSpec` bundling a
  fork's disjoint endpoints into one `windows:` group). Fix both sides together, or state explicitly in
  a code comment which side is authoritative.

- [x] T032 **[US3] [FR-023, OI-189, epic task 3.9]** In
  `connect-four/server/scripts/reason_engine/causalLinks.mjs`, fix the causal frame's own prose so it
  never introduces vocabulary (e.g. a term slug) outside the record's own `zones.terms` offer set —
  true population is 2/125 rows (both `eval-13`), **not** 3 (the third, `eval-33`'s `unclosed_tag`,
  belongs to OI-208 — do not fold it into this task's fix or its test). The display-path half of this
  class already shipped as D48/I13 (`RENDER_DISPLAY_PHRASE`, `renderReasonModel.mjs:468`;
  `dropUnoffered`, `zoneAnnotations.mjs:466` — do not re-touch that code); this task fixes the frame's
  own prose generation, a different, narrower producer.

- [x] T033 **[US3] [FR-024, OI-184, epic task 3.10]** In `zoneAnnotations.mjs`'s terms map, attribute
  ownership on shared-vocabulary term descriptions (e.g. `zones.terms[double_threat]`) wherever
  ownership is determinable, so the model cannot hand one player's pattern to the other — `eval-13`
  reproduces this (runs 0 and 4). This is distinct from T024 (`future-line` role owner-naming) — this
  task reaches the terms map, which T024 does not.

- [x] T034 **[US3] [FR-025, OI-207, epic task 3.11]** In `causalLinks.mjs` / `renderReasonModel.mjs`,
  add a guardrail-vs-requirement consistency check: a causal frame must not contradict its own record's
  `requiredSet` (e.g. asserting a win is "too far to pin to a single square" while `requiredSet`
  mandates naming two single squares — `eval-9`, all 5 runs fail A5 today). **One check should cover
  this and OI-199's class together** (both T029 and T034 are "guardrail says X, prompt shows Y") —
  factor them into a shared helper if that keeps the fix small; do not open a new issue id.

### Tests for User Story 3

- [x] T035 **[US3] [P]** Extend `connect-four/server/tests/zoneAnnotations.test.mjs` (existing file)
  with corpus-wide assertions for FR-014b (T023), FR-015 (T024), FR-016 (T025), FR-021 (T030), FR-022
  (T031), FR-024 (T033). Depends on T023, T024, T025, T030, T031, T033.

- [x] T036 **[US3]** Extend `connect-four/server/tests/causalLinks.test.mjs` (existing file) with the
  US3 portion: FR-014a (T022), FR-023 (T032), FR-025 (T034). Depends on T022, T032, T034, and must run
  **after** T020 (US2's edits to the same file) — same file, sequential, not `[P]`.

- [x] T037 **[US3] [P]** Extend `connect-four/server/tests/openingFrame.test.mjs` (existing file) with
  FR-020 (T029) and the shared FR-025 check if it lands here instead of `causalLinks.mjs` (T034).
  Depends on T029, T034.

- [x] T038 **[US3]** Extend `connect-four/server/tests/renderReasonModel.test.mjs` (existing file) with
  FR-017 (T026, `deriveRequiredSet`'s better-col push, `required ⊆ offered` + 3-slot cap still hold)
  and FR-018 (T027, array-branch empty-drop regression). Depends on T026, T027, **and must run after
  T021a** (US2's FR-011 extension of this same file) — same file, sequential, not `[P]`.

- [x] T039 **[US3]** Extend `connect-four/server/tests/renderCoverageCorpus.test.mjs` and
  `connect-four/server/tests/renderCoverageUniverse.test.mjs` (existing files) with the corpus-wide
  (63-record) parametric sweeps FR-014/015/020/021/022/023/024/025 require — owner-naming, arity
  agreement, and grammaticality asserted over the *whole offer set*, not sampled. Depends on T022,
  T023, T024, T025, T029, T030, T031, T032, T033, T034 (i.e. run this last within US3, once every
  producer fix has landed).

**Checkpoint**: US3 is independently complete — every FR-014..FR-025 invariant is asserted corpus-wide
against production render functions, no LLM call. Run `node --test
connect-four/server/tests/zoneAnnotations.test.mjs connect-four/server/tests/causalLinks.test.mjs
connect-four/server/tests/openingFrame.test.mjs connect-four/server/tests/renderReasonModel.test.mjs
connect-four/server/tests/renderCoverageCorpus.test.mjs
connect-four/server/tests/renderCoverageUniverse.test.mjs
connect-four/server/tests/renderFieldPartitionLineCarveout.test.mjs`.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T040 Update `docs/open_issues.md` statuses for **every** issue this epic's tasks resolve, narrow,
  or otherwise materially change — per the epic's own rule (`docs/epics/deep-reveal-remediation-epic.md:
  360-361`, *"Each task's definition of done includes updating the status of every issue it
  resolves"*), not only the three literal near-duplicates. Three groups:
  - **(a) Close** (resolved-by-this-epic, with a link to the commit(s) that fixed them): **OI-187**
    (task 3.4/T026), **OI-188** (tasks 2.2+2.5 / T013+T016), **OI-182** (parent of OI-193, closed by
    task 3.3/T025).
  - **(b) Narrow, do not close** (per T008's attribution — stay `open`, named and attributed only, not
    fixed by this epic): **OI-140**, **OI-170**, **OI-172**, **OI-208**.
  - **(c) Resolve or otherwise update status** (each of these issues is the direct subject of a US2/US3
    task, listed in the epic's own task tables — this is the group blocking-issue-2 review found
    missing): **OI-177** (T017), **OI-180** (T031), **OI-184** (T033), **OI-189** (T032 — see the
    explicit stale-status note below), **OI-193** (T025), **OI-194** (T022/T023), **OI-195** (T015/T013,
    both remaining halves), **OI-198** (T030), **OI-199** (T029), **OI-201** (T024), **OI-202** (T014),
    **OI-203** (T012), **OI-204** (T013), **OI-205** (T026 is a **partial** fix — Q2 PROVISIONAL, the
    15/25 at-cap records stay unresolved by design — so mark it status **PARTIALLY RESOLVED**, not
    closed; OI-187 is the separate near-duplicate report of this same defect and IS closed, in group
    (a) above),
    **OI-206** (T027/T028), **OI-207** (T034).
  - **OI-189 stale-status correction (explicit)**: `docs/open_issues.md:7042` currently reads
    *"open (fix specified as Task 9b of the 2026-08-11 remediation plan; not yet implemented)"* — this
    is already stale before this epic starts: the display-path half shipped as D48/I13
    (`docs/epics/deep-reveal-remediation-epic.md:346`, moving 49/63 records → 0/63). T032 fixes the
    remaining half (the frame's own prose). The status update must say both things: the display-path
    half was already done pre-epic, and T032 closes the remainder.
  - Leave OI-186, OI-176, OI-183, OI-197, OI-200, OI-178 untouched (all explicitly Out of Scope).
  Depends on all of Phase 4 and Phase 5's implementation tasks.

- [x] T041 **[FR-030]** Add D-log entries to `docs/architecture/reason-DECISIONS.md` — one per
  non-obvious decision this epic's implementation actually made: (a) Design Decision 1 (T017/FR-013's
  seam: guard-aware check runs *before* the existing single retry, on `attempt1`, changing which
  records retry, plus the rejected alternatives — restructuring the call site, moving the endpoint's
  guard call earlier); (b) Design Decision 2 (T027/T028: the array/object emptiness-guard asymmetry
  fix, the board-selection-aware `.line`-path consistency test, the `TRANSFORMED_LEAVES` carve-out left
  unchanged and not reclassified, and `eval-33`'s named exemption pending the deferred remedy); (c) the
  Q1 pick (T003: store **both** the pre-guard `mechanism` and the post-guard `servedExplanation` fields
  on the answers row, rather than replacing one with the other); (d) the Q2 pick (T026: reserved
  4th-priority slot, at-cap records left unresolved); (e) the Q3 pick (T012: keep the terminal board,
  suppress tags, single game-over sentence); (f) the Q4 pick (T014: drop the comparative rather than
  restate the rule); (g) the Q5 pick (T029: drop centrality, guardrail untouched); (h) the Q8 pick
  (T023: ordinal locator, logged in D49's neighborhood). Depends on T003, T012, T014, T017, T023, T026,
  T029.

- [x] T042 **[FR-030, epic AC 16]** Extend (never contradict) `docs/architecture/reason-render-grounded-prompt.md`
  §12: add any new wording from T012 (terminal game-over sentence, if novel), T023 (the chosen Q8
  ordinal locator phrase), and T028/T029's outcomes to the `READING_KEY` never-repeat list per §12g —
  "adding anything to the prompt adds vocabulary the model echoes." Depends on T012, T023, T029.

- [x] T043 **[FR-029, epic AC 15 — deploy prerequisite, local-only]** Extend the existing `PENDING`
  entry "Spec 058 render remediation — purge cached deep reveals generated by the OLD render layer" at
  `docs/deployment_steps.md:1952` (already extended twice: `:1966` for `0d6f818..2ef3ccb`, `:1975` for
  `b9be303..086b8ea`) — **do not file a new top-level entry**. Add a third `Updated <date>` paragraph in
  the same shape as the two precedents: name Epic 12's actual commit range (once known — the epic
  changes `renderReasonModel.mjs`, `zoneAnnotations.mjs`, `causalLinks.mjs`, `openingFrame.mjs`,
  `reasonBoardSelect.mjs`, `reasonBoardTags.mjs`, `mechanismExplainer.mjs`, `reasonRenderGuard.mjs` —
  all of which change served text), state what changed and why it invalidates already-cached
  `explanation_cache` rows (same mechanism as the two prior updates — the cache key is
  `sha256(movestring:col)` and contains nothing about the render layer). **Add one explicit new
  sentence this entry has not carried before**: *"If this entry was already marked DONE before Epic 12
  merged, it must be run again"* — the exact failure precedent already on record at
  `docs/deployment_steps.md:1826` ("Staging's 058 TRUNCATE is already marked DONE 2026-08-04 — i.e. it
  ran BEFORE this code — so on staging it must be run again"). Do not change the entry's `Status`,
  `### Run it`, or `### Verify` sections — those are already correct and reusable for this extension
  per precedent (the entry has no `Command` heading; its headings are `### Run it` / `### Verify` /
  `### Roll back`). **This task only edits `docs/deployment_steps.md` — it does not run any SQL or touch
  a database.** No new purge script is needed: the established precedent for this entry is a
  manually-run `DELETE FROM explanation_cache;`/`TRUNCATE` command the owner executes, not a script —
  do not introduce one.

- [x] T044 **[FR-028] Test-file registration for the human** — no agent may edit
  `connect-four/package.json`. List, verbatim, for the human to append to the `test:fast` line:
  1. `connect-four/server/tests/computePostGuard.test.mjs` (T009)
  2. `connect-four/server/tests/guardActionAttribution.test.mjs` (T010)
  3. `connect-four/server/tests/renderFieldPartitionLineCarveout.test.mjs` (T028)
  4. `connect-four/server/tests/gradeDispatchFreeze.test.mjs` (T006a)

  Every other test file touched by this epic (`reasonRenderGuard.test.mjs`, `renderReasonModel.test.mjs`,
  `renderCoverageCorpus.test.mjs`, `renderCoverageUniverse.test.mjs`, `reasonBoardSelect.test.mjs`,
  `reasonBoardTags.test.mjs`, `zoneAnnotations.test.mjs`, `causalLinks.test.mjs`, `openingFrame.test.mjs`,
  `mechanismExplainer.test.mjs`) is an **extension** of a file already registered — no action needed.

- [x] T045 **[OWNER APPROVAL REQUIRED — Q7, not an acceptance gate]** Optional post-fix LLM re-measure.
  **DONE 2026-09-01, owner-directed** — executed far beyond this task's scope: not the 25-board subset
  alone but the full 63-board corpus (n=3, condition D, gpt-5.4-mini) plus BOTH baselines re-graded
  under `GRADER_INSTRUCTIONS_v2.md` (08-26 25 boards, and 08-06 63 boards — 63 agents), a Spanish
  locale run, a grader-variance sample, and a programmatic per-blunder frequency probe. Results:
  `docs/deep-reveal-release-dashboard.html` (regenerate with
  `node server/scripts/reason_corpus/build_release_dashboard.mjs`). The caveat below about v1-vs-v2
  comparability no longer applies: BOTH baselines are now v2-graded, so every axis is scored by one
  instrument. Original task text retained for history:
  **No agent may execute this autonomously.** If, and only if, the owner explicitly approves: run
  `compute.mjs --llm` against the same 25-board subset under `GRADER_INSTRUCTIONS_v2.md`, understood as
  establishing a **new v2 baseline**, not a delta against any v1-graded run (the A6 control group is
  spent — Settled decision 5 — and a v2-graded run is not comparable to a v1 one on judgment axes).
  This is never how "done" is decided for this epic (FR-031) — it is a reporting step only, scheduled
  after every US1–US3 task above is complete and `test:fast` is green.

- [x] T046 **[NON-EXECUTING NOTE — deploy queue entry, not an action any agent or this spec performs]**
  Spec 059 is a **producer**, not a deploy operator — `docs/deployment_steps.md:31-33` defines the three
  roles and states producers *"never run a step against staging or production"*, and `:50-51`: *"Never
  write to staging or production from a producer role. Measuring is read-only and fine; mutating live
  data is the owner's call."* The epic's own scope table already marks this `NOT included` (`docs/epics/
  deep-reveal-remediation-epic.md:471`). **No task in this spec runs T043's extended
  `docs/deployment_steps.md` entry against staging or production, and none may be added to do so.** The
  deploy agent (a separate role, per the deployment_steps.md role definitions) runs that queued entry
  from `docs/deployment_steps.md` at deploy time, strictly after this epic's code is deployed, using the
  entry's own `### Verify` section (row count → 0, then confirm a freshly generated deep reveal reflects
  the epic's fixes) as its success condition. This task exists only so the obligation stays visible in
  this task list, not to execute it.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: no dependencies.
- **Foundational (T002)**: no dependencies — can start immediately, in parallel with T001.
- **US1 (T003–T011, plus T006a)**: T003/T004/T011 depend on T002. T005/T007/T008 have no dependency on
  T002 and can start immediately. T006a depends on T006 only.
- **US2 (T012–T021, plus T021a)**: independent of US1's harness work (validation-ordering only), **except T017,
  which hard-depends on T002** (the one real implementation edge: FR-004/task 1.7 → FR-013/task 2.6).
- **US3 (T022–T039)**: independent of US1 and US2's implementation; T036 must run after T020 (shared
  file `causalLinks.test.mjs`).
- **Polish (T040–T046)**: depends on the relevant US2/US3 implementation tasks per each task's own
  "Depends on" line. T045 depends on every prior task and additionally requires explicit owner approval
  before execution. T046 is a non-executing note (depends on T043 existing) — it is never executed by
  any agent in this spec, owner-approved or not; the deploy agent runs T043's entry separately.

### The one hard implementation edge

**T002 (FR-004/epic task 1.7) → T017 (FR-013/epic task 2.6).** This is the sole place in this epic
where US2 code cannot be written before a piece of US1's harness-adjacent work lands, contradicting the
otherwise-general "US1 is a validation prerequisite only" framing (spec.md Assumptions). Every other
US2/US3 task may be implemented before, after, or interleaved with US1.

### Parallel Opportunities

- T001 and T002 in parallel.
- Within US1: T005 and T007 in parallel with each other and with T003/T004 (different files).
- Within US2: T012, T013, T014, T015 touch different files/functions and can proceed in parallel; T016
  touches files T012/T013 also touch (`causalLinks.mjs`/`reasonBoardTags.mjs`) — sequence with care or
  assign to one contributor. T017 is gated on T002 only.
- Within US3: T022–T034 span three largely-independent files (`causalLinks.mjs`, `zoneAnnotations.mjs`,
  `renderReasonModel.mjs`, `openingFrame.mjs`) — tasks in different files can run in parallel; tasks in
  the same file (e.g. T022/T032/T034 all in `causalLinks.mjs`; T023/T024/T025/T030/T031/T033 all in
  `zoneAnnotations.mjs`) should sequence within that file.
- US1, US2, and US3 test-extension tasks that touch different files are `[P]`; same-file test
  extensions (T020 before T036, T021a before T038) are not.
- **Cross-story SOURCE-file collisions (not just the flagged test-file ones)**: two production files are
  each edited by both a US2 task and a US3 task, and no `[P]` marker on the individual tasks captures
  this — sequence within each file even though the tasks otherwise look independent:
  `connect-four/server/scripts/reason_engine/causalLinks.mjs` is edited by **T012/T015/T016** (US2) and
  **T022/T032/T034** (US3); `connect-four/server/scripts/renderReasonModel.mjs` is edited by **T014**
  (US2) and **T026/T027/T034** (US3). This is execution guidance, not a correction — none of the
  existing `[P]` markers on T005/T007/T009/T010/T018/T019/T035/T037 is wrong, since each of those
  genuinely touches distinct files.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001, T002 (Setup + Foundational).
2. T003–T011, T006a (US1).
3. **STOP and VALIDATE**: `node --test connect-four/server/tests/computePostGuard.test.mjs
   connect-four/server/tests/reasonRenderGuard.test.mjs connect-four/server/tests/gradeDispatchFreeze.test.mjs`
   — confirms the harness measures the served string, the live endpoint is unaffected, and the
   grading-dispatch freeze holds, with zero LLM calls made in this repo session.

### Incremental Delivery

1. Setup + Foundational → T001, T002.
2. US1 → validate independently (harvested fixture, no model call) → this alone makes every later
   US2/US3 fix *measurable* by a future owner-approved re-measure, even though it does not itself
   change served text.
3. US2 → validate independently (deterministic corpus tests) → board-truth defects fixed.
4. US3 → validate independently (deterministic corpus tests) → offer/template hygiene fixed.
5. Polish → doc lockstep (D-log, §12, deployment_steps.md extension, test-file registration list).
6. T045 → owner-approved reporting, strictly last, never autonomous. T046 is a non-executing note only —
   the actual deploy-time purge run is the deploy agent's responsibility, not this spec's.

### Explicitly deferred, do not implement here

- The `eval-33` board-selection remedy (`reasonBoardSelect.mjs`/`selectBoards` change) that would make
  T028's named exemption unnecessary — out of this epic (see `docs/epics/deep-reveal-remediation-epic.md`
  `### Deferred`). If a future session wants `eval-33` GREEN, file it as its own scoped item.
- `[NEEDS CLARIFICATION: Q1–Q5, Q7, Q8]` — every task above that implements a PROVISIONAL answer flags
  it in a code comment; none is resolved by executing these tasks.
- OI-186 (`buildRenderDecision`/`buildReasonRenderModel` merge) as a refactor.
- OI-140/OI-170/OI-172/OI-208 as *fixes* (T008 only names and attributes them).
- Any second retry, budget, or trigger kind (Settled decision 4 stays narrowed, not redesigned).
