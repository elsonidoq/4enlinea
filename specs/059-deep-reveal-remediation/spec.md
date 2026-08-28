# Feature Specification: Deep-Reveal Remediation

**Feature Branch**: `059-deep-reveal-remediation`
**Created**: 2026-08-27
**Status**: Draft
**Input**: User description: "Epic 12 — Deep-Reveal Remediation: measure the served text, then fix the render defects it exposes (docs/epics/deep-reveal-remediation-epic.md)"

> **Source of truth.** This spec is derived from `docs/epics/deep-reveal-remediation-epic.md`
> ("Epic 12"), which is authoritative. Its `## Settled decisions`, `## Non-obvious facts`,
> `## NOT included`, and `## Acceptance criteria (epic-level)` sections are reflected here
> **verbatim in substance** — not relitigated, not re-derived. Where a number is cited below, it
> was already measured for the epic (see the epic's `## The evidence`); this spec harvests it
> rather than recomputing it. `specs/058-deep-reveal-grounding` is a different, earlier, already
>-shipped spec (Epic 11) and is untouched by this one.

## User Scenarios & Testing *(mandatory)*

<!--
  This feature has no end-user-facing UI change (frontend is explicitly out of scope — see
  Out of Scope). Its "users" are: (1) the player, who receives whatever text the render guard
  lets through — unaffected in shape, corrected in content; (2) the team, who run the offline
  eval and must be able to trust its numbers; (3) future engineers/agents extending the render
  layer, who rely on the eval measuring the truth.
-->

### User Story 1 - The eval grades the text production would actually serve (Priority: P1)

Today the offline evaluation harness (`compute.mjs` + the `grade-fv-sufficiency` skill) grades the
model's *pre-guard* answer. Production, however, runs the answer through a three-stage render
guard (`reasonRenderGuard.mjs`) before a player ever sees it. Whole categories of graded "failure"
today describe text that never reaches a player. The single largest example: raw internal `cNrM`
coordinates reach player-visible prose **0 times in 125 runs** once the guard is applied
(`docs/epics/deep-reveal-remediation-epic.md:130`), yet that same defect is charged as the cause of
**49 of the 50** coach-voice (A5) failures in the last graded run
(`docs/epics/deep-reveal-remediation-epic.md:158-160`). Until the harness grades the served string,
no fix to US2 or US3 below can be validated against a real number — a "fix" and a "no-op" produce
the same graded delta.

This story makes the harness call the exact production serving function
(`guardExplainMoveLlmPayload`, `connect-four/server/reasonRenderGuard.mjs:418`) on every recorded
answer, grades that string, freezes a v2 rubric that says explicitly which string each axis grades,
and locks the grading dispatch to a single checked-in rubric file so a future run cannot silently
drift from what was measured.

**Why this priority**: Every other story in this epic is validated by a deterministic corpus test,
not an LLM re-measure (see Out of Scope, "no new LLM eval as an acceptance gate") — but *if* the
team later re-measures with the LLM harness to report progress, that report is meaningless until
this story lands. US1 is also a genuine prerequisite for US2 task 2.6 (OI-177): the required-set
retry today reads the raw, pre-guard mechanism, so it can validate a handle that the guard is about
to strip — task 2.6 cannot be measured without the post-guard string this story produces.
**US1 is a validation prerequisite, not an implementation prerequisite** — US2 and US3 tasks may be
implemented before or interleaved with US1; only *measuring* their real-world effect is gated on
US1.

**Independent Test**: Feed the harness the already-recorded answers from
`fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` and confirm it can now produce, for every row,
the post-guard served string plus a diagnostics record of what the guard did (`failures` and
`strippedSpecs` — see FR-004; coordinate promotion/humanization is not part of this diagnostics
record, per `contracts/guard-diagnostics-contract.md`) — without calling the model again. Confirm the guard call is the
real `guardExplainMoveLlmPayload` import (not a reimplementation) and that the live `/explain`
endpoint's response shape is unchanged when the new opt-in diagnostics flag is not passed.

**Acceptance Scenarios**:

1. **Given** a recorded answers row with its `feature_vector.movestring` and
   `render_decision.zones.aliases`, **When** the harness re-derives the served string, **Then** it
   does so by calling `guardExplainMoveLlmPayload` with `board = new Board(movestring)` and
   `allowedSet = toAllowedSet(render_decision.zones.aliases)` — the same inputs production computes
   at `connect-four/server/index.js:1297` and `:1469` — not a reimplementation of the guard's logic.
2. **Given** the harness re-derives served strings for all 125 rows of the recorded run, **When**
   raw `cNrM` tokens are counted in the served prose (with `[zone:…]` delimiters stripped first, per
   the A5 rubric's own instruction), **Then** the count is **0**, and the count of runs that lost at
   least one `[zone:…]` span to the guard is **5** — both are the harvested regression fixture from
   `docs/epics/deep-reveal-remediation-epic.md:130,176-178`, not a number to re-derive.
3. **Given** the live `/explain` endpoint is called without the new opt-in diagnostics flag, **When**
   its response is compared to today's, **Then** it is byte-identical — the widened
   `guardExplainMoveLlmPayload` return shape must not leak a new key into the default response.
4. **Given** a grading run is dispatched, **When** the dispatch messages are inspected, **Then** they
   are byte-identical except for `id`, `condition`, and output path, they carry no out-of-rubric
   context (open-issue lists, hypotheses), and they point at the checked-in
   `GRADER_INSTRUCTIONS_v2.md` rather than regenerating rubric text into a scratchpad copy each run.

---

### User Story 2 - No rendered artifact describes a board state that is not true (Priority: P1)

Several of the coach's explanations narrate something that is not true of the board they show. A
terminal position (the game is already over after the best move) is narrated with a live future
threat. A tactic overlay claims the opponent has a double threat on a board whose own tactics list
says "Major threats: none." A comparative claim about how many replies the opponent has, read
against the `READING_KEY`'s own rule, asserts the opposite conclusion of what the shown numbers
support. The engine's own required-set retry checks the *pre-guard* mechanism, so a required square
the guard is about to strip can still "pass" the retry — the retry believes a handle survived that
the player never receives.

Each of these is the model faithfully narrating a board-false or self-contradictory prompt — the
feature vector (the underlying evidence) is not wrong (triage: 0 `vector_error`, 0 `missing_info`
across every graded run, `docs/epics/deep-reveal-remediation-epic.md:57-59,93-95`); the render layer
handed the model a false or contradictory premise.

**Why this priority**: A board-false claim is the most damaging class of defect a paid explanation
feature can make — it is not merely unclear, it is wrong, and a player who checks the board against
the claim loses trust in the whole feature. It is independent of US1 (fixed and tested without
needing the harness change) and independent of US3 (wording/vocabulary defects, not truth defects).

**Independent Test**: For each defect, a deterministic, model-free test runs the actual production
render function against a real board from the corpus and asserts the fixed invariant — no LLM call
required. E.g., for `eval-41` (OI-203): assert that once `afterBest` is terminal (`checkWin` true on
the engine's own `finalMovestring`), the rendered board carries no live threat entries, the prompt
states the game is over, and no causal frame uses future tense for that move.

**Acceptance Scenarios**:

1. **Given** `afterBest` is terminal (`checkWin` true on the engine's own `finalMovestring`), **When**
   the board and prompt are rendered, **Then** the rendered board carries no live threat entries, the
   assembled prompt contains an explicit game-over statement, and no causal frame refers to that move
   in the future tense. (**OI-203**, reproduced 5/5 on `eval-41`,
   `docs/epics/deep-reveal-remediation-epic.md:311`.)
2. **Given** any frame or link text asserts a threat at the `immediate_threat` grain ("to make four
   next move") on a named board, **When** that board's own tactics-block grain for the same cell is
   checked, **Then** the two grains agree (`major` ≠ `immediate`) — the frame may not claim a
   gravity-top threat on a cell the same board's tactics list marks as merely `major`. This half is
   **not** gated on terminality: `eval-37` and `pin-branch-invariance-true-2` are both non-terminal
   RED cases (`docs/epics/deep-reveal-remediation-epic.md:315,394-396`). (**OI-188**.)
3. **Given** a tactic overlay is attached to a board, **When** the board's own state is checked,
   **Then** every disc the tactic requires exists on that board — asserted corpus-wide; the current
   `pin-L2-enabled-opponent` and `eval-33` entries are the RED cases. (**OI-204** + OI-195 second
   half, `docs/epics/deep-reveal-remediation-epic.md:312`.)
4. **Given** the `replyHistogram` comparative is emitted, **When** the rendered values are checked
   against the `READING_KEY`'s own stated rule, **Then** the direction the rule asserts is the
   direction the numbers support; otherwise the comparative is not offered at all. (**OI-202**,
   `renderReasonModel.mjs` `READING_KEY` around `:332`, `docs/epics/deep-reveal-remediation-epic.md:313`.)
5. **Given** an L2 ("occupy") causal link is rendered, **When** the named square is checked against
   the engine's own `finalMovestring`, **Then** the square is occupied — not empty — on that line.
   (**OI-195** remaining half a, `causalLinks.mjs` L2 around `:89`,
   `docs/epics/deep-reveal-remediation-epic.md:314`.)
6. **Given** the required-set post-check in `mechanismExplainer.mjs` runs, **When** it decides
   whether a required handle survived, **Then** it treats a required spec whose `[zone:…]` span the
   guard will strip as missing — i.e. `usedSpecs` is recomputed against the **post-guard**
   annotation set (the one US1's guard call produces), not the pre-guard one — so that spec does
   trigger a retry. The retry's BUDGET and TRIGGER SET are unchanged (Settled decision 4); only which
   annotation set the post-check reads changes. (**OI-177**, task 2.6.)

---

### User Story 3 - Every handle, role and template is unambiguous, owned, and obeys the rules the prompt states (Priority: P2)

The prompt tells the model rules about what it may and may not say, and then several render
surfaces violate those same rules or leave the model no way to comply. Raw internal coordinates
(`cNrM`) leak into printed prose the prompt forbids echoing. A "future line" role names no owner, so
the model can hand the player's own winning line to the opponent. A fork's pivot square is only
offered when the fork lives on a tagged evidence half, so some real forks (e.g. `eval-47`) get no
offered pivot at all. The one prompt block the model reliably obeys (the required set) can never ask
for the better column, because `deriveRequiredSet` only derives geometry specs. A fully-transformed
object renders as a literal empty `[{},{},{},{}]` instead of being dropped. An opening frame invites
a centrality explanation and then, in the same prompt, forbids it. A causal frame's own prose can
introduce vocabulary — a term slug — that the record's offer set does not include, which the render
guard then has to repair, auto-failing the G7c axis. Role text sometimes fails to conjugate the
owner ("you's four-in-a-row line"), and sometimes claims a one-cell role text for what the record's
spec is actually a multi-cell set (arity mismatch, OI-180).

**Why this priority**: These are prompt-hygiene and self-consistency defects, not board-truth
defects (US2) or measurement defects (US1) — real, but generally lower severity per-instance than a
board-false claim, and independent of both other stories.

**Independent Test**: Each defect gets its own deterministic, model-free test against a real corpus
record through the production render function (`assembleGroundedPrompt` / `zoneAnnotations.mjs` /
`renderReasonModel.mjs`) — no LLM call required, e.g. sweep the 63-record corpus for `[{},{},{},{}]`
literals, or sweep for `cNrM` tokens inside `link.text` / `zones.aliases[].role`.

**Acceptance Scenarios**:

1. **Given** any prompt surface that the prompt itself forbids the model to echo, **When** the two
   *printed* producers of raw coordinates are swept — `link.text` and `zones.aliases[].role` (of
   which the required block re-prints 10 of 13, since `deriveRequiredSet` copies
   `role: alias.role`, `renderReasonModel.mjs:153`) — **Then** neither producer contains a
   `cNrM`/`colN` token. `alias.spec` / `requiredSet[].spec` are **exempt by design** (never printed
   into the prompt, `renderReasonModel.mjs:604-605`; the `aliasBySpec` match key, D2/D43) and an AC
   demanding no coordinates there must not be written. Baselines to go RED against, measured on the
   25-record subset: **20/25** records for `link.text`, **13/25** for `zones.aliases[].role`
   (`docs/epics/deep-reveal-remediation-epic.md:322,419-428`). The D49 sibling-disambiguation
   property must still hold after the fix — no two aliases sharing a `(role, truthBoard)` pair may
   restate identically (§12d, `docs/architecture/reason-render-grounded-prompt.md:1058`); satisfying
   this AC by re-introducing the OI-191 collision is a regression. (**OI-194**.)
2. **Given** a `future-line` role text, **When** it is rendered, **Then** it names an owner
   (conjugated the way the `line` branch already does), so the model cannot hand the player's own
   winning line to the opponent. (**OI-201**, `zoneAnnotations.mjs:61`.)
3. **Given** a fork whose evidence lives in the board tags rather than a tagged half, **When**
   `forkPivotCell` runs, **Then** a pivot handle is still offered — not only when
   `FORK_TAGS.has(half.tacticTag)`. (**OI-193**, `zoneAnnotations.mjs:93-94`.)
4. **Given** `deriveRequiredSet` runs on any corpus record, **When** the required set is built,
   **Then** the better column is requestable through it (or through a resolved alternative — see
   Open Question Q2), and the result still satisfies `required ⊆ offered` and the 3-slot
   required-set cap (spec 058 FR-005, `renderReasonModel.mjs:172`). (**OI-205** / OI-187.)
5. **Given** a fully-`transformed` value is an array, **When** it is rendered, **Then** it is
   dropped exactly as the object branch already is — never rendered as `[{},{},{},{}]`.
   (**OI-206**, `renderReasonModel.mjs:27,39`.)
6. **Given** no rendered JSON key survives pruning to nothing, **When** `render_decision.fieldPartition.rendered`
   is checked against what the prompt actually renders, **Then** no path it lists as rendered is
   invisible in **both** the JSON residue and the rendered boards — one-directional, not a
   biconditional: a `transformed` path shown only via the board still counts as rendered, per
   `fieldPartition`'s own documented carve-out (`renderReasonModel.mjs:236-249`).
   (**OI-206** (a) + the OI-186-adjacent consistency check (b),
   `docs/epics/deep-reveal-remediation-epic.md:402-409`. The plan resolves this: `lostResource.line`
   stays dropped from the JSON residue (FR-018) and stays classified `rendered` in `fieldPartition`
   (unchanged carve-out) — not promoted. The `eval-33` case, which the check in (b) finds genuinely RED
   (its board is not currently selected, so the geometry reaches neither the JSON nor a board diagram),
   is carried as a documented, named exemption in the FR-019(b) corpus test rather than silently made
   to pass — the board-selection remedy that would make it GREEN is deferred out of this epic (see
   `docs/epics/deep-reveal-remediation-epic.md` "### Deferred" under Epic 12); "make the empty braces
   go away" alone does not satisfy this AC for the other 62 records, which must not be weakened.)
7. **Given** the opening guardrail suppresses the centrality clause for a record, **When** the
   admissible-framings sentence is rendered, **Then** the word "centrality" does not appear in it.
   (**OI-199**, `openingFrame.mjs:72,76`.)
8. **Given** the `major` fallback branch of `roleText`, **When** it renders for any owner, **Then**
   it is grammatical for both second-person and third-person owners — this is a class fix (any
   `roleText` branch with the same possessive/verb defect), not a single-string patch: measured on
   the 25-record subset, `"you's"` appears on 9 and `"you gets"` on 5, and an AC that greps only for
   `"you's"` is satisfied by a fix that leaves `"you gets"` in place.
   (**OI-198**, `zoneAnnotations.mjs:78,59`.)
9. **Given** a `kind === 'double'` role text and its own spec, **When** the two are compared, **Then**
   they agree in arity — a role text describing "the single fork square" must not pair with a spec
   that is a 3-cell set. Fix both sides together, or state explicitly which side is authoritative;
   do not open a new issue id, this is the role-side view of an already-filed issue. (**OI-180**,
   `zoneAnnotations.mjs:59`.)
10. **Given** a causal frame's own prose, **When** it is checked against the record's `zones.terms`
    offer set, **Then** it introduces no vocabulary (e.g. a term slug) that is not in that offer set —
    true population is 2 of 125 rows (both `eval-13`), not 3 (the third, `eval-33`'s
    `unclosed_tag`, belongs to OI-208 and is out of this AC's scope). (**OI-189**, `causalLinks.mjs`.)
11. **Given** `zones.terms[double_threat]`'s description (or any shared-vocabulary term), **When**
    the term names an owner, **Then** the owner is attributed — a shared term's description must not
    let the model hand the opponent's fork to the learner (`eval-13` reproduces this,
    `docs/epics/deep-reveal-remediation-epic.md:331`). (**OI-184**, `zoneAnnotations.mjs` terms map.)
12. **Given** a frame and its own record's `requiredSet`, **When** the frame's guardrail text is
    checked against what the required set mandates, **Then** the frame does not contradict its own
    required set — e.g. it must not say a win is "too far to pin to a single square" while
    `requiredSet` mandates naming two single squares (`eval-9`, all 5 runs fail A5 today). One
    guardrail-vs-requirement consistency check covers this and OI-199's class together.
    (**OI-207**, `causalLinks.mjs` / `renderReasonModel.mjs`.)

---

### Edge Cases

- A record with **fewer than two deep halves** never renders a second `projectedDeepOpp` board
  (D50, `docs/architecture/reason-DECISIONS.md` §D50 rule 1) — US2/US3 fixes must not assume a
  second board always exists.
- A record that offers **zero terms** must not have the prompt demonstrate `[term:]` syntax at all
  (I13, `docs/architecture/reason-INVARIANTS.md:190`) — a US3 fix that adds a worked example must
  respect this.
- A `future:` cell is **expected** to be unplayed on its named board; that is not a board-truth
  violation (D50 §12b, "Empty" is deliberately not a violation) — a US2 truth-check must not flag it.
- A record at the **3-slot required-set cap (spec 058 FR-005)** (15 of 25 subset records,
  `docs/epics/deep-reveal-remediation-epic.md:493`) has no free slot for a new required item — any
  fix touching the required set must handle this case explicitly, not just the 10 records with a
  free slot.
- A defect fix that **adds any new prompt surface or wording** must extend the "never repeat" list
  in the same change (§12g, `docs/architecture/reason-render-grounded-prompt.md:1078-1083` — `:1069`
  is §12f's heading, not §12g) — adding vocabulary the model can echo is itself a new defect if the
  never-repeat list is not grown with it.
- **Rare, unattributed guard-action codes** (OI-140/OI-170/OI-172/OI-208) may appear in US1's
  diagnostics output; task 1.6 requires them to be attributed to their owning issue before being
  read as evidence for OI-194 — do not silently fold them into OI-194's cost (Settled decision /
  `docs/epics/deep-reveal-remediation-epic.md:304`).

## Requirements *(mandatory)*

### Functional Requirements — US1 (measurement)

- **FR-001**: The harness (`compute.mjs`) MUST add a post-guard served-string field to each answers
  row, produced by calling the real `guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs:418`) with
  the same `board`/`allowedSet` inputs production computes — never a reimplementation — while
  retaining the pre-guard `mechanism` field (see Open Question Q1 for what else, if anything, is
  retained alongside it).
- **FR-002**: The harness MUST record, per row, what the guard *did* — `failures` (validation failure
  codes) and `strippedSpecs` (spans stripped) — read via the `diagnostics` field exposed by
  `guardExplainMoveLlmPayload` behind an explicit opt-in flag (FR-004), not recomputed by separately
  calling `validateAnnotation` or reimplementing `stripFailingZoneSpans`. Coordinate
  promotion/humanization is explicitly out of this field's scope (see FR-004) — not threadable
  without new instrumentation inside two production text-rewriting functions.
- **FR-003**: A `GRADER_INSTRUCTIONS_v2.md` file MUST exist as `GRADER_INSTRUCTIONS_v1.md` verbatim
  plus an explicit statement of which string each axis grades (served prose for A5/A7b/G1/G7;
  pre-guard string only where an axis is explicitly about generation). `GRADER_INSTRUCTIONS_v1.md`
  is already a complete, self-sufficient 218-line rubric — it defines A5 (`:115-136`), A6
  (`:137-138`), A7 (`:139-163`), G1–G7 (`:165-178`), the pass rule (`:179`), and triage (`:184`) —
  so v2 MUST NOT fold in any text from `.claude/skills/grade-fv-sufficiency/SKILL.md`. The SKILL.md
  line numbers an earlier epic amendment pointed at (`:179` A5, `:255` A6, `:298` A7, `:464` G1–G7)
  are the orchestrator-side long-form sections, not the per-case `## Your case` template (`:691`
  onward) that graders actually receive, of which v1 is a frozen snapshot; the two bodies have
  since diverged by 452 lines. v2 MUST record this SKILL.md-vs-v1 divergence as a known
  non-comparability rather than resolving it inside this epic — any future adoption of SKILL.md's
  drifted text is a deliberate v3, scheduled only after the first v2-graded run establishes its own
  baseline. `GRADER_INSTRUCTIONS_v1.md` MUST remain byte-identical to its state at commit
  `f6282be`.
- **FR-004**: `guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs:418`, synchronous) MUST gain a
  `diagnostics` field whose mandatory core is `{ failures: string[], strippedSpecs: string[] }`,
  threaded out from its existing `validateAnnotation` (`:428-429`) and `stripFailingZoneSpans`
  (`:365-372`) internals — not recomputed by a second call. `promotedCoordinates`/`humanizedCoordinates`
  are explicitly CUT from this contract: `promoteRawCoordinates` (`:217-241`) and
  `humanizeGroundedCoordinates` (`:156-181`) collect nothing internally today, so exposing them would
  require new instrumentation inside two production text-rewriting functions, which this FR does not
  authorize. `strippedSpecs` — not `failures` alone — is the field FR-013/task 2.6 actually consumes.
  The full before/after contract lives in `contracts/guard-diagnostics-contract.md`. `diagnostics` is
  returned **only** when the caller passes an explicit opt-in flag; when the flag is absent, the
  function's return shape and the live `/explain` endpoint's response (`index.js:1470`) MUST be
  byte-identical to today's (AC 2a).
- **FR-005**: The `grade-fv-sufficiency` skill's dispatch step MUST read the checked-in
  `GRADER_INSTRUCTIONS_v2.md` in full and nothing else, replacing today's "write the rubric fresh
  each run to a scratchpad copy" step (`SKILL.md:656-659`, symbol-located — line numbers have
  drifted in this tree). The skill's already-specified fixed three-line dispatch MUST become
  mandatory, and MUST NOT carry out-of-rubric context (open-issue lists, hypotheses) in any dispatch
  message.
- **FR-006**: `reason_corpus/runs/README.md` MUST record, for every run, the rubric version and the
  dispatch-wrapper identity, and MUST no longer assert the superseded "flat incidence" / "70 passes
  had the same defect" numbers superseded by Settled decision 6.
- **FR-007**: Every guard-action code FR-002 records MUST be attributed to its owning open issue
  (OI-140, OI-172, OI-170, OI-208 are the currently-filed candidates) before being counted as
  OI-194's cost — the output is a code → OI mapping plus a statement of which losses an OI-194 fix
  actually removes.

### Functional Requirements — US2 (board truth)

- **FR-008**: When `afterBest` is terminal (`checkWin` true on the engine's own `finalMovestring`),
  the rendered board MUST carry no live threat entries, the assembled prompt MUST contain an
  explicit game-over statement, and no causal frame MUST refer to that move in future tense.
  (OI-203.)
- **FR-009**: Any frame or link text that asserts a threat at the `immediate_threat` grain on a
  named board MUST match that board's own tactics-block grain for the same cell — independent of
  whether the board is terminal. (OI-188.)
- **FR-010**: A tactic overlay attached to a board MUST require only discs that actually exist on
  that board's own state. (OI-204, OI-195 second half.)
- **FR-011**: The `replyHistogram` comparative, when emitted, MUST support the direction its own
  `READING_KEY` rule states given the rendered values; otherwise it MUST NOT be offered. (OI-202.)
- **FR-012**: An L2 causal link's "occupy" verb MUST name a square that is occupied — not empty —
  on the engine's own `finalMovestring`. (OI-195 remaining half a.)
- **FR-013**: The required-set post-check in `mechanismExplainer.mjs` MUST treat a required spec
  whose `[zone:…]` span the guard will strip as **missing** — i.e. `missingRequiredGroups`
  (`mechanismExplainer.mjs:85-88`) MUST compare `requiredSet[].spec` against a `usedSpecs` array
  recomputed from the **post-guard** annotation set, not the pre-guard one it reads today.
  `missingRequiredGroups` does not compare strings — `usedSpecs` is a structured array
  `processAnnotations` already resolves from the model's `[zone:…]` tags (`:80-83`) — so this is a
  change to which annotation set `usedSpecs` is derived from, not a string swap. This requires the
  guard's failure set to be available **inside** `computeMechanism`: today `guardExplainMoveLlmPayload`
  is called by the endpoint at `index.js:1470`, after `computeMechanism` returns and after the retry
  decision is made, so satisfying this FR means either computing the guard's span-stripping inside
  `computeMechanism` (it has `movestring` and `renderDecision`, so it can build `board` and
  `allowedSet` itself) or restructuring the seam — the plan decides which; this FR states the
  constraint. This makes FR-013 dependent on FR-004's `diagnostics` field. The retry's BUDGET and
  TRIGGER SET are unchanged (Settled decision 4); only which annotation set the post-check reads
  changes. (OI-177.)

### Functional Requirements — US3 (offer/template consistency)

- **FR-014**: Neither `link.text` nor `zones.aliases[].role` MUST contain a raw `cNrM`/`colN` token
  in any record where the prompt forbids the model to echo one, while `alias.spec` /
  `requiredSet[].spec` remain coordinate-bearing (exempt by design, the `aliasBySpec` match key).
  The D49 sibling-disambiguation property (no two aliases sharing `(role, truthBoard)` restate
  identically) MUST continue to hold after the fix. (OI-194.)
- **FR-015**: `future-line` role text MUST name a conjugated owner, matching the `line` branch's
  existing behavior. Together with FR-021 and FR-022, this MUST hold parametrically over the whole
  offer set on all 63 corpus records — owner-naming, conjugation, and arity agreement are not
  single-string patches but properties asserted corpus-wide. (OI-201.)
- **FR-016**: A fork whose evidence lives only in board tags (not a tagged evidence half) MUST still
  get an offered pivot handle. (OI-193.)
- **FR-017**: `deriveRequiredSet` MUST make the better column requestable without breaking
  `required ⊆ offered` or the 3-slot required-set cap (spec 058 FR-005, `renderReasonModel.mjs:172`)
  — the exact mechanism is Open Question Q2. (OI-205, OI-187.)
- **FR-018**: A fully-`transformed` value that is an array MUST be dropped when empty, exactly as
  the object branch already is — never rendered as a literal `[{},{},{},{}]`. (OI-206.)
- **FR-019**: No path listed in `render_decision.fieldPartition.rendered` MUST be invisible to the
  model in **both** the JSON residue and the rendered boards. This is one-directional, not a
  biconditional: `fieldPartition` (`renderReasonModel.mjs:239-249`) is a disposition-table view
  whose own header comment (`:236-238`) states a deliberate carve-out — `transformed` fields are
  shown to the model via the board, so they count as rendered even though they are dropped from the
  JSON residue — and FR-019 MUST NOT be read as requiring that carve-out be reclassified; doing so
  would break the G2 over-removal audit and `renderUniverse.mjs:30`'s coverage predicate. Note FR-018
  (dropping the empty `[{},{},{},{}]` array) makes `fieldPartition` more internally inconsistent, not
  less; the plan must state how the two requirements interact for a given record. (OI-206 /
  OI-186-adjacent.)
- **FR-020**: When the opening guardrail suppresses the centrality clause, "centrality" MUST NOT
  appear in that record's admissible-framings sentence. (OI-199.)
- **FR-021**: Every `roleText` branch MUST conjugate its owner correctly for both second-person and
  third-person owners — this is a class requirement covering every branch with a possessive/verb
  agreement defect, not only the `major` fallback's `"you's"` case; asserted, with FR-015 and
  FR-022, parametrically over the whole offer set on all 63 corpus records. (OI-198.)
- **FR-022**: A `kind === 'double'` role text and its own spec MUST agree in arity (a role text
  describing a single square MUST NOT pair with a multi-cell spec), fixed on whichever side is
  designated authoritative; asserted, with FR-015 and FR-021, parametrically over the whole offer
  set on all 63 corpus records. (OI-180.)
- **FR-023**: A causal frame's own prose MUST NOT introduce vocabulary (e.g. a term slug) outside
  the record's own `zones.terms` offer set. (OI-189.)
- **FR-024**: A shared-vocabulary term's description (e.g. `zones.terms[double_threat]`) MUST
  attribute ownership where ownership is determinable, so the model cannot hand one player's
  pattern to the other. (OI-184.)
- **FR-025**: A causal frame MUST NOT contradict its own record's `requiredSet` (e.g. asserting a
  win is "too far to pin to a single square" while the required set mandates naming single squares).
  (OI-207.)

*(Numbering note: FR-026 is intentionally absent — the jump from FR-025 to FR-027 is a gap left by
earlier renumbering, not a dropped requirement. Nothing in this spec, plan.md, or tasks.md references
FR-026.)*

### Cross-cutting Requirements

- **FR-027**: `cd connect-four && npm run test:fast` MUST pass at or above the branch-point baseline
  with 0 fail and 0 eslint errors after every change in this epic; the baseline MUST be re-measured
  at branch point, not inherited from a recalled figure (the tree carries uncommitted changes to
  `server/index.js` and four `server/tests/*.test.mjs` files — see Assumptions).
- **FR-028**: Every new test file MUST be named explicitly in the implementation plan for a human to
  append to the `test:fast` list — no agent may edit `connect-four/package.json` directly (its
  `test:fast` value is one 7,146-character line; exact-match editing it has killed prior agents).
- **FR-029**: Every change that alters the text a player is served MUST append an entry to
  `docs/deployment_steps.md`. Where an existing entry already covers the same purge/cache-invalidation
  action (e.g. the `PENDING` "Spec 058 render remediation — purge cached deep reveals" entry at
  `docs/deployment_steps.md:1952`, already extended twice for prior commit ranges), "append an entry"
  is satisfied by extending that entry's own list with this epic's commit range — not by filing a
  second, near-duplicate top-level entry for the same purge action. See `plan.md`'s Deploy
  prerequisites section for the exact mechanics and the DONE-flip hazard note.
- **FR-030**: Every non-obvious decision this epic's implementation makes MUST add one D-entry to
  `docs/architecture/reason-DECISIONS.md`; any render-contract change MUST extend (never contradict)
  `docs/architecture/reason-render-grounded-prompt.md` §12.
- **FR-031**: US2 and US3 requirements MUST each be validated by a deterministic, model-free
  corpus test through the actual production render function — not by an LLM re-measure. A post-fix
  LLM re-measure is, at most, an optional reporting step the owner may choose to run afterward (see
  Out of Scope).

### Key Entities

- **Answers row** — one recorded model call for one corpus board, one condition, one run. Carries
  `feature_vector` (incl. `movestring`), `render_decision` (incl. `zones.aliases`,
  `fieldPartition`), the pre-guard `mechanism`, and — after US1 — the post-guard served string plus
  guard diagnostics.
- **`render_decision`** — the per-record offer set the prompt is built from: `zones.aliases` (handle
  → role/spec/truthBoard), `zones.terms` (offered term slugs), `requiredSet`, `fieldPartition`
  (which JSON paths are rendered vs. pruned).
- **Alias** — one offered handle (`zone:<handle>` or `term:<slug>`), with a `role` (prose), a `spec`
  (geometry, coordinate-bearing, never printed), and a `truthBoard` (which projected board the
  geometry is board-true on, per D50).
- **Guard diagnostics** (new, US1) — per-row record of what `guardExplainMoveLlmPayload` did to the
  raw mechanism before serving it: `failures` (validation failure codes) and `strippedSpecs` (specs
  whose `[zone:…]` span was stripped from prose). Coordinate promotion/humanization is explicitly not
  part of this record (cut — see FR-004 and `contracts/guard-diagnostics-contract.md`).
- **Open issue (OI-N)** — an entry in `docs/open_issues.md`; every FR above cites the issue(s) it
  resolves or narrows. Three issues (OI-187, OI-188, OI-204/OI-195, OI-182) are near-duplicates of
  tasks in this epic and must be closed, not left open, once their fix lands
  (`docs/epics/deep-reveal-remediation-epic.md:339-345`).

## Success Criteria *(mandatory)*

<!--
  This is an internal engineering/quality epic — "users" are the eval instrument and the render
  layer's own self-consistency, not an end-user-facing flow. Criteria below are drawn directly from
  the epic's own "Acceptance criteria (epic-level)" section (numbered 1-16,
  docs/epics/deep-reveal-remediation-epic.md:349-445) and restated as outcome-level, technology-
  agnostic checks wherever the epic allows; several are necessarily stated in terms of the specific
  measured corpus, because that corpus IS the acceptance bar this epic sets for itself.
-->

### Measurable Outcomes

- **SC-001**: Replaying the recorded 125-row run through the new harness path shows **0** raw `cNrM`
  tokens in served prose (tags stripped) and exactly **5** runs that lost at least one `[zone:…]`
  span to the guard — both harvested, not re-derived (mirrors epic AC 2).
- **SC-002**: `GRADER_INSTRUCTIONS_v2.md` is the sole text any grading run reads: the skill's
  dispatch step provably points at that checked-in file rather than regenerating rubric text per
  run, and the file itself is v1 verbatim plus the per-axis "which string is graded" statement
  (mirrors epic AC 3, 3a).
- **SC-003**: Calling the live `/explain` endpoint without the new diagnostics flag returns a
  byte-identical response to pre-epic behavior (mirrors epic AC 2a).
- **SC-004**: Every dispatch message in a grading fleet run is identical except `id`/`condition`/
  output path, and contains no out-of-rubric context (mirrors epic AC 4).
- **SC-005**: For every corpus record where `afterBest` is terminal, the rendered board and prompt
  correctly state the game is over with no live threats and no future-tense narration of the
  winning move (mirrors epic AC 6a).
- **SC-006**: For every corpus record where a frame asserts an `immediate_threat`-grain claim, that
  claim's grain matches the named board's own tactics-block grain — independent of terminality, so
  `eval-37` and `pin-branch-invariance-true-2` (both non-terminal) go GREEN (mirrors epic AC 6b).
- **SC-007**: For every corpus record with a tactic overlay, every disc the tactic requires exists
  on that board's own state — `pin-L2-enabled-opponent` and `eval-33` go GREEN (mirrors epic AC 7).
- **SC-008**: No `replyHistogram` comparative in the corpus contradicts its own `READING_KEY` rule
  (mirrors epic AC 8).
- **SC-009**: No rendered JSON in the corpus contains an empty object/array literal, and no
  `fieldPartition.rendered` path is invisible in both the JSON residue and the rendered boards
  (one-directional, `transformed`-aware — see FR-019) (mirrors epic AC 9).
- **SC-010**: Every alias role text in the 63-record corpus names its owner where determinable,
  agrees in arity with its spec, and is grammatical for both second- and third-person owners
  (mirrors epic AC 10).
- **SC-011**: Across the 63-record corpus, no prompt surface the model is told not to echo (the two
  printed producers, `link.text` and `zones.aliases[].role`) contains a raw coordinate, while
  `alias.spec`/`requiredSet[].spec` remain exempt, and the D49 sibling-disambiguation property still
  holds (mirrors epic AC 11).
- **SC-012**: Every corpus record whose opening guardrail suppresses centrality omits the word
  "centrality" from its admissible-framings sentence (mirrors epic AC 12).
- **SC-013**: Every corpus record's `deriveRequiredSet` output makes the better column requestable
  while satisfying `required ⊆ offered` and the 3-slot cap (mirrors epic AC 13).
- **SC-014**: `cd connect-four && npm run test:fast` passes at or above the branch-point baseline
  with 0 fail and 0 eslint errors throughout the epic (mirrors epic AC 14).
- **SC-015**: Every change altering served text has a corresponding entry in
  `docs/deployment_steps.md` (mirrors epic AC 15).
- **SC-016**: `reason-DECISIONS.md` gains one D-entry per non-obvious decision made while
  implementing this epic, and `reason-render-grounded-prompt.md` §12 is extended, never contradicted
  (mirrors epic AC 16).

## Out of Scope

Reflects `docs/epics/deep-reveal-remediation-epic.md` `## NOT included` verbatim in substance:

- **The reason engine itself** — `computeReason`, `reason_engine/reasonEngine.mjs`, the case
  taxonomy, and any feature-vector field change. Triage has returned 0 `vector_error`, 0
  `missing_info` on every graded run to date; the evidence is not the problem.
- **Building a production-path batch harness, or exercising the retry** (OI-183). Owner decided
  2026-08-26 to leave the harness single-attempt and carry the caveat that every US1 number is a
  floor (48 of 125, 38%, of recorded runs would have retried in production —
  `docs/epics/deep-reveal-remediation-epic.md:182-185`).
- **Redesigning enforcement or the retry.** The required-set retry's BUDGET and TRIGGER SET are
  settled (Settled decision 4); FR-013/OI-177 changes only which string the existing post-check
  reads.
- **Frontend.** No `src/` changes; no board-rendering or highlight-display work.
- **TTS/audio, localization, and the Spanish eval-coverage gap** (OI-176).
- **The PENDING `explanation_cache` purge** in `docs/deployment_steps.md` — tracked separately by
  the owner; not a prerequisite, not a blocker, not to be engineered around.
- **A new LLM eval run as an acceptance gate.** Every US2/US3 requirement is validated by a
  deterministic corpus test (FR-031). A re-measure is, at most, an optional reporting step the owner
  may choose to run afterward — it is never how "done" is decided for this epic.
- **OI-197** (intermittent A4 fabrication needing a post-generation verification gate) — a distinct
  design with its own epic-sized surface.
- **OI-200** (`REDACTABLE_TAG_SLUGS` mirror) — accepted tech debt, adjudicated 2026-08-21.
- **OI-178** (`humanizeGroundedCoordinates` expands every cell of a multi-cell window) — a
  guard-layer cosmetic defect US1 will start surfacing but that changes the served string, so fixing
  it mid-epic would move the very baseline US1 exists to establish. Re-evaluate after the first
  v2-graded run.
- **OI-140 / OI-170 / OI-172 / OI-208 as fixes.** FR-007 requires them to be named and attributed so
  their guard-action codes are not misread as OI-194's cost — but repairing the gate's ordering
  (OI-140), its admission rule (OI-172), or the unbalanced-tag repair placement (OI-208) is its own
  design with its own blast radius, not this epic's.
- **OI-186** (`buildRenderDecision` recomputes the offer set) as a refactor. FR-019 only requires
  `fieldPartition.rendered` to stop lying about what is rendered; restructuring the two builders into
  one shared producer is a larger fix not required to satisfy that requirement.

## Assumptions

- **US1-before-US2/US3 is a validation ordering, not an implementation one.** US2/US3 code may be
  written and unit-tested before US1 lands; only *measuring* their real-world effect via the eval
  harness is gated on US1 (Settled decision framing, `docs/epics/deep-reveal-remediation-epic.md:67-68`).
- **The reason engine's evidence has never been the problem.** Triage across every graded run to
  date: 0 `vector_error`, 0 `missing_info` (`docs/epics/deep-reveal-remediation-epic.md:57-59`).
  This epic is a render-and-measurement epic; nothing here changes what the feature vector computes.
- **Baseline `npm run test:fast` count must be re-measured at branch point**, not inherited from the
  epic's recalled `1999 pass / 0 fail` figure — the tree carries uncommitted changes to
  `server/index.js` and four `server/tests/*.test.mjs` files at epic-writing time
  (`docs/epics/deep-reveal-remediation-epic.md:439-441`), so the true baseline for this branch may
  differ. `1999/0` is the figure recorded at `reason-DECISIONS.md:1601,1623` (D50's status), used
  here only as a directional expectation, not as the acceptance number.
- **The epic's `## The evidence` section is authoritative over any older document text** — in
  particular over `reason_corpus/runs/README.md`'s prior "flat incidence" claim, which the epic's
  Settled decision 6 explicitly supersedes. Any plan/implementation work that reads `runs/README.md`
  must treat the epic's corrected numbers as the ground truth.
- **A6's control group is spent** (Settled decision 5) — all nine causal templates already name the
  better column as prose (D49/D50); any future A6 comparison has no internal control group and must
  be made against recorded runs, not a fresh A/B split.
- **Q6 (dispatch-wrapper freezing) is already RESOLVED**, 2026-08-27, per the epic's own amendment:
  the checked-in `GRADER_INSTRUCTIONS_v2.md` is the frozen rubric artifact, and the skill's
  already-specified fixed three-line dispatch is frozen as a rule pointing at that file
  (`docs/epics/deep-reveal-remediation-epic.md:506-514`). FR-005 encodes this as settled, not as an
  open question.
- **Staging and production are disposable pre-launch.** No live-data safety machinery is required
  around any change here; production-facing work is a `docs/deployment_steps.md` entry, not tooling
  (project-wide standing rule, echoed at `docs/epics/deep-reveal-remediation-epic.md:286-287`).
- **Line numbers throughout this spec (and the epic it derives from) drift.** Every citation should
  be treated as approximate and re-located by symbol name at plan/implementation time — several
  files cited here (`SKILL.md`, `index.js`, `server/tests/*.test.mjs`) carry uncommitted changes in
  this working tree as of spec-writing time.

## Clarifications Needed

The epic's `## Open questions` section explicitly defers these to `/clarify`; this spec surfaces
them without resolving them, per the epic's own instruction that none of its settled decisions is
reopenable here.

- **[NEEDS CLARIFICATION: Q1 — harness storage shape]** What does the harness store, and what do
  graders see? Options per the epic: served string only (simplest, but destroys pre-guard evidence
  and makes OI-194 unmeasurable); both strings plus a guard-action log (richer, but risks a grader
  charging the pre-guard string — the exact failure mode this epic exists to fix); or served string
  to graders with the pre-guard string kept entirely out of the grading prompt. This decides the v2
  rubric's shape and directly affects FR-001/FR-003. (`docs/epics/deep-reveal-remediation-epic.md:485-489`)
- **[NEEDS CLARIFICATION: Q2 — better-column requestability mechanism]** How does the better column
  become requestable (OI-205/OI-187) without spending a required-set geometry slot? Measured: 10 of
  25 subset records have a free slot (size-2 required set), 15 of 25 are at the 3-slot cap, so the
  trade binds on 60% of records. Options: a reserved fourth slot; letting `better-col` displace the
  lowest-value geometry group; moving the demand into its own mandatory line outside the required
  block. Directly affects FR-017. (`docs/epics/deep-reveal-remediation-epic.md:490-497`)
- **[NEEDS CLARIFICATION: Q3 — terminal board rendering]** What does a terminal board render as?
  Suppress the tactics list entirely and state "this move ends the game here"; or drop the
  `afterBest` board and state the win in prose? Each option adds or removes vocabulary the model can
  echo (§12g). Affects FR-008/SC-005. (`docs/epics/deep-reveal-remediation-epic.md:498-500`)
- **[NEEDS CLARIFICATION: Q4 — replyHistogram rule vs. comparative]** Fix the `READING_KEY` rule to
  match what the counts actually support (more informative, more prompt surface), or drop the
  comparative when unsupported (safer, loses a real signal on records where it does hold)? Affects
  FR-011/SC-008. (`docs/epics/deep-reveal-remediation-epic.md:501-503`)
- **[NEEDS CLARIFICATION: Q5 — opening-centrality guardrail]** Drop centrality from the framings
  sentence, or relax the guardrail that currently forbids it? The `eval-21` gate exists for a real
  reason (see the D-log) so relaxing it is not obviously safe. Affects FR-020/SC-012.
  (`docs/epics/deep-reveal-remediation-epic.md:504-505`)
- **Q6 is RESOLVED, not open** — see Assumptions above. Do not reopen it.
- **[NEEDS CLARIFICATION: Q7 — is a post-fix LLM re-measure in scope at all]** Given the A6 control
  group is spent (§12f) and every judgment-axis delta of a few points sits inside noise, is a
  post-fix LLM re-measure worth running at all? If yes, against which recorded run, and under which
  rubric version — note a v2-graded run is not comparable to any v1-graded run on the judgment axes,
  so the first v2 run establishes a new baseline rather than demonstrating an improvement. This does
  not gate FR-031 (a re-measure is never an acceptance gate regardless of the answer) but affects
  whether the plan schedules one as a reporting step. (`docs/epics/deep-reveal-remediation-epic.md:515-519`)
- **[NEEDS CLARIFICATION: Q8 — sibling disambiguation without raw coordinates]** How do sibling
  aliases stay individually identifiable (task/FR-014, OI-194) without the raw coordinates that
  `disambiguateSiblingRoles` currently injects to satisfy D49 (which broke the `(role, truthBoard)`
  collision 48/63 → 0/63)? Options: a plain-English locator ("the lower of the two"); an ordinal tied
  to the reading key; or coordinates kept only in role text while forbidden in frame prose. Each
  trades hygiene against ambiguity, and any new vocabulary chosen is vocabulary the model will echo
  (§12g) — the never-repeat list must grow with whichever option is chosen. Directly constrains
  FR-014/SC-011. (`docs/epics/deep-reveal-remediation-epic.md:520-526`)
