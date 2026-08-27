# Epic 12 — Deep-Reveal Remediation: measure the served text, then fix the render defects it exposes

> **Invocation:** `/epics-manager docs/epics/deep-reveal-remediation-epic.md 1`
> (this file holds exactly one epic; the id argument is optional)

**Lane:** `connect-four/server/scripts/reason_engine/{zoneAnnotations,causalLinks,openingFrame}.mjs`,
`connect-four/server/scripts/{renderReasonModel,reasonBoardSelect,reasonBoardTags,compute,grade_mechanical}.mjs`,
`connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` (new), and
`.claude/skills/grade-fv-sufficiency/SKILL.md`. Conflicts with any concurrent branch in the
reason-engine render path.

**Sizing verdict: ONE epic, full speckit, with a hard internal ordering (US1 before US2/US3).**
Applying `docs/best_practices_spec_driven_development.md:202-206`, all three conditions hold:
(1) **23 tasks** — 6 measurement/instrument + 6 board-truth + 11 offer/template, each with its own
detector-level test (revised upward from 12 after an adversarial coverage audit found nine further
filed issues; see the revision note at the foot of this file); (2) **several genuinely unresolved design decisions** — see `## Open questions`,
of which the required-set slot trade (OI-205 vs FR-005's cap of three,
`renderReasonModel.mjs:172` `return groups.slice(0, 3);`) and the v2 rubric's definition of "the
served string" both change implementation shape; (3) **multiple subsystems** — the production render
layer, the offline eval harness, and the grading instrument (a rubric file plus an agent skill),
joined by one shared contract: *the exact string a player is served*.

**Why not two epics ("measure it right" vs. "fix the render defects").** The dependency between them
is a **design output**, not a deployed API: the v2 rubric's definition of the graded string decides
what "fixed" means for OI-194, OI-201, OI-203 and OI-204, and several of those fixes cannot be
*validated* at all until the harness grades post-guard text. `best_practices…:220` and `:229` name
exactly this shape ("Epic B's implementation plan would need to be rewritten after Epic A resolves a
brainstorming question" → merge; "two epics share a Depends-on arrow where the dependency is a design
output → merge them"). Splitting guarantees plan rework. The ordering constraint is carried instead
as US1-before-everything, stated in the acceptance criteria.

Red-flag check (`best_practices…:224-229`): scope is 3 stories / 12+ defects (not one bullet);
`Open questions` is non-empty and real; `NOT included` is shorter than the scope. No red flag fires.

---

## Overview

Deep reveal is the flagship paid explanation: after a blunder, a coach voice tells the player what
they lost and why, with the load-bearing squares highlighted on the board. It is graded offline on a
frozen 25-board subset, five runs per board, by a fixed rubric.

Two things are wrong, and they are entangled.

1. **The instrument mis-measures the product.** The eval grades the model's *pre-guard* answer, but
   production runs a three-stage render guard over that string before a player ever sees it. Whole
   categories of graded "failure" describe text that never ships. The single largest one — raw
   internal `cNrM` coordinates — reaches player-visible prose **0 times in 125 runs** once the guard
   is applied, yet it is the charge behind **49 of the 50** coach-voice (A5) failures in this run.
2. **A dozen real render defects remain**, and they are the ones that actually reach players: a
   terminal position narrated as ongoing, a fork asserted on a board where it is not yet true, a
   reading key whose own rule inverts which move was the blunder, a line alias that names no owner so
   the model hands the player's winning line to the opponent, and an empty `[{},{},{},{}]` structure
   advertised in the prompt.

Triage across all 25 cases of the latest run: **12 `render_bug`, 13 `prompt_confusion`, 0
`vector_error`, 0 `missing_info`** — as in every prior run. **The reason engine's evidence has never
been the problem. This is a render and measurement epic, not an engine epic.**

| # | User story | Primary surface | Why it blocks |
|---|---|---|---|
| **US1** | The eval grades the text production would actually serve | `compute.mjs`, `GRADER_INSTRUCTIONS_v2.md`, `grade-fv-sufficiency` skill | Until this lands, A5/A7b/G7 measure a string no player receives, and no render fix below can be validated against a number |
| **US2** | No rendered artifact describes a board state that is not true | `reasonBoardSelect.mjs`, `reasonBoardTags.mjs`, `causalLinks.mjs`, `renderReasonModel.mjs`, `mechanismExplainer.mjs` | These are the board-false ones: the model is handed a contradiction and narrates it faithfully (OI-202, OI-203, OI-204, OI-195b, OI-188, OI-177) |
| **US3** | Every handle, role and template is unambiguous, owned, and obeys the rules the prompt states | `zoneAnnotations.mjs`, `causalLinks.mjs`, `openingFrame.mjs`, `renderReasonModel.mjs` | The prompt tells the model one thing and shows it another (OI-194, OI-199, OI-201, OI-193, OI-205, OI-206, OI-198, OI-180, OI-189, OI-184) |

**Recommended order:** US1 → US2 → US3. US1 is a hard prerequisite for *measuring* US2/US3, not for
implementing them; US2 and US3 are independent of each other and may interleave.

---

## The evidence (do not re-derive)

This section is measured, corrected, and partly conversation-only. **Two consecutive sessions each got
a version of it wrong by measuring at the wrong layer.** Do not re-derive it from the graded run; read
it here and check the cited source if you doubt a line.

### The run

`fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` — condition D, `gpt-5.4-mini`, n=5, the frozen
25-board subset, 125/125 answers, 0 call/parse errors, measuring commit `f6282be`. Graded with the
frozen `GRADER_INSTRUCTIONS_v1.md` by 25 independently dispatched per-case agents
(`connect-four/server/scripts/reason_corpus/runs/README.md`, §"Prose-conversion + caption-fix
re-measure, 2026-08-26").

Axis rollup (per-run, `null` excluded) — **recomputed from
`…_grades.jsonl` while writing this epic and reproduced exactly**:

| A3 | A4 | A5 | A6 | A7 | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G7b |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 70 | 60 | 78 | 66 | 94 | 92 | 100 | 100 | 84 | 100 | 88 | 98 |

**0 of 25 cases fully pass; 8 fail deterministically, all triaged `render_bug`** (`eval-9`, `eval-21`,
`eval-32`, `eval-37`, `eval-41`, `eval-47`, `eval-50`, `pin-L2-enabled-opponent`). Triage across all
25: 12 `render_bug`, 13 `prompt_confusion`, **0 `vector_error`, 0 `missing_info`**.

### The A6 correction that must not be undone

An earlier reading of this run claimed *"~70% of A6 failures are answers that named the better square
as raw `cNrM`, so A6 is capped by OI-194."* **That is false and has been retracted** in both
`runs/README.md` and the plan. It came from regexing the raw LLM string. Production's
`mentionsBetterColumn` runs `stripInternalTokens` **first**
(`connect-four/server/mechanismExplainer.mjs:122` — `const served = stripInternalTokens(mechanism, locale);`),
and that function already rewrites `cNrM`/`cN`/`colN` → "column N"
(`connect-four/server/reasonRenderGuard.mjs:99-116`). Verified at source:

```
stripInternalTokens('you should have played c2r1 next')  →  'you should have played column 2 next'
```

So an answer naming the better column as a raw cell **already passes A6**. Decomposed through
production's own function, the 27 A6 failures are:

| category | n |
|---|---|
| names some **other** column, not the better one | 12 |
| names **no** column at all | 15 |
| raw `cNrM` standing in for the better column | **0** |

(Total 27 re-confirmed for this epic by importing `mentionsBetterColumn` and replaying all 125 rows.)
All 27 fire `mentionsBetterColumn = false`, which is production's own retry trigger.

### Raw `cNrM` does not reach players — confirmed by replaying the production guard

Replaying every one of the 125 answers through the **actual production serving seam** —
`guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs:418`), with `board = new Board(movestring)` and
`allowedSet = toAllowedSet(render_decision.zones.aliases)`, exactly as `index.js:1297` and
`index.js:1469-1470` do it — then dropping `[zone:…]` delimiters (highlight markup, not prose):

**raw `cNrM` in player-visible prose = 0 / 125.**

Production defends this three deep, all in `connect-four/server/reasonRenderGuard.mjs`:
`humanizeGroundedCoordinates` (:156, vouched cells inside a zone) → `promoteRawCoordinates` (:217,
bare prose token → real highlight) → `stripInternalTokens` (:99, final floor).

**Therefore the largest defect this run exposed is in the instrument, not the product.** A5 "fell"
88 → 76 → 60 across three runs on a charge that describes text production never serves.

### CORRECTIONS FOUND WHILE WRITING THIS EPIC — the prior write-up is right in direction, wrong in its numbers

All four were measured for this epic by replaying the recorded answer files; each contradicts a
sentence currently in `runs/README.md`. **They do not change the conclusion (US1 is still the highest-
leverage fix); they change what the epic may claim as its justification.**

1. **"The defect's own incidence is flat (123 → 121 → 120)" is measured at the wrong layer.** That
   count regexes the whole raw string, `[zone:c6r2]` **tags included** — and a tag is markup, not
   prose. A5's own rubric text orders the opposite (`GRADER_INSTRUCTIONS_v1.md:116-117`: *"STRIP all
   `[zone:…]…[/zone:…]` … markup first and grade the cleaned prose"*). Measured on the **prose**, the
   incidence is **not flat — it roughly halved**:

   | run | raw `cNrM`, tags included | raw `cNrM`, **prose only** |
   |---|---|---|
   | 08-25a (D49) | 123 / 125 | **109 / 125** |
   | 08-25b (D50) | 121 / 125 | **89 / 125** |
   | 08-26 (prose conversion) | 120 / 125 | **62 / 125** |

2. **"The graders charged OI-194 inconsistently — 70 passing runs had the same defect" is an artifact
   of that same tag-inclusive count.** At the prose layer the split is **49 of 50 A5 failures** carry
   a raw `cNrM` in prose versus **13 of 75 A5 passes**. The graders were largely *consistent*, not
   inconsistent.

3. **A5 therefore moved opposite to the defect it was supposedly charging** (prose incidence
   89 → 62 while A5 went 76 → 60). The instrument explanation survives — but the surviving mechanism
   is the **dispatch-wrapper priming** recorded in `runs/README.md` (this run's dispatch message
   listed the open issues by number, including "OI-194 (raw cNrM notation)"), **not** a flat-incidence
   argument. Treat A4/A5/A7 deltas for the 08-26 run as unattributable.

4. **`GRADER_INSTRUCTIONS_v1.md` never mentions `cNrM`, coordinates, or notation anywhere** (grepped:
   zero hits). So "A5a charges raw `cNrM`" is **not a rubric rule** — the graders imported the charge
   from outside the frozen file, which is exactly what makes the dispatch wrapper part of the
   instrument. The v2 change is therefore to **add** an explicit rule (grade the post-guard prose),
   not to remove one.

5. **OI-194's player-facing severity is low but not zero.** The guard reaches 0/125 partly by
   *destroying highlights*: replaying the 125 runs, **5 runs lose exactly one `[zone:…]` span each**
   to a `P6:raw_coordinate` failure (5 of 340 emitted spans, 1.5%) — the player loses a highlight they
   were meant to get. Justify OI-194 on *this* measured cost plus prompt hygiene. **Do not justify it
   as raw coordinates reaching players; they do not.**

### OI-183, quantified — and deliberately not being fixed

Replaying 125 runs through production's own trigger functions: **48 of 125 (38%) would have been
retried** — 34 for a missing required handle, 22 for an unnamed better column
(`docs/open_issues.md:6846`+). Every A6/A7c/G7 number in `reason_corpus/runs/` is a **floor**. The
owner's standing decision (2026-08-26) is to leave the harness single-attempt and carry the caveat.

### A methodology defect found the same day

The rubric *file* was v1 unchanged, but the **dispatch message** wrapping it differed from prior runs.
The `grade-fv-sufficiency` skill already specifies a fixed three-line dispatch
(`.claude/skills/grade-fv-sufficiency/SKILL.md:656-661`); the 08-26 run deviated from it. **The
dispatch wrapper is part of the instrument and must be frozen alongside the rubric.**

---

## Settled decisions (reflect verbatim — do not relitigate)

1. **The eval must grade POST-GUARD, PRE-RETRY text.** (Owner decision, 2026-08-26.) The harness keeps
   calling the model **once** — production's retry stays unexercised, per the owner's standing
   decision on OI-183 — but the string handed to the graders must be the text production would
   actually serve, i.e. after the render guard runs. This is the fix that makes A5/A7b/G7 mean
   something. **The seam, verified at source, is `guardExplainMoveLlmPayload`
   (`connect-four/server/reasonRenderGuard.mjs:418`)**, called from `index.js:1470` with
   `board = new Board(movestring)` (`index.js:1297`) and
   `allowedSet = toAllowedSet(result.renderDecision?.zones?.aliases ?? [])` (`index.js:1469`). Every
   input it needs is already present on each answers row (`feature_vector.movestring`,
   `render_decision.zones.aliases`) — no new engine call is required. *(The plan must still confirm
   the call shape at HEAD rather than trusting these line numbers; symbols are stable, lines drift.)*
2. **The reason engine is out of scope.** Render layer, prompt assembly, and eval harness only. Do not
   modify `computeReason` or anything under `reason_engine/reasonEngine.mjs`.
3. **Rubric versioning is frozen-forward.** `GRADER_INSTRUCTIONS_v1.md` is never edited in place. A
   scope change like decision 1 requires a **`GRADER_INSTRUCTIONS_v2.md`**, and judgment axes are only
   comparable within a rubric version. Record the version for the run in `runs/README.md`.
4. **The retry's BUDGET and TRIGGER SET are settled and must not be redesigned.**
   `computeMechanism` has a required-set post-check, a better-column post-check
   (`mechanismExplainer.mjs:115`), both folded into ONE amended retry on a single shared budget, plus
   an admin failure row (`index.js:1400-1418`). Three sessions in a row have concluded from graded
   runs that this layer was missing and needed building. It is not. Do not add a second retry, a
   second budget, or a new trigger. See OI-183.
   **NARROWED 2026-08-26 — this decision does NOT assert the layer is correct.** **OI-177 is open**:
   the required-set retry reads the **raw** mechanism, so a required spec the guard later strips never
   triggers a retry. US1 is precisely the change that makes that visible, and task 2.6 owns it. An
   earlier draft of this decision said "enforcement already exists and must not be redesigned" without
   qualification, which would have told the plan a defective layer was sound.
5. **The A6 control group is spent.** All nine causal templates now name the column as prose
   (D49/D50, `reason-render-grounded-prompt.md` §12f); no untreated template remains, so any future A6
   comparison has no internal control and must be made against the recorded runs.
6. **The correction in `## The evidence` is authoritative over any older text.** In particular:
   raw `cNrM` reaching players is **0/125**; the "~70% of A6 failures are raw cells" claim is
   **retracted**; and the "flat incidence" / "70 passes had the same defect" numbers in
   `runs/README.md` are superseded by the prose-layer measurements above.

---

## Non-obvious facts (verified at source)

- **Verify at the source layer.** Signature over doc comment; the production function over your model
  of it; all N instances over a sample. Both the retracted A6 claim *and* the two corrections in
  §evidence item 1–2 are the same failure — a regex run on the wrong string. **Every factual claim in
  the spec and plan needs a `file:line` or an explicit `UNVERIFIED` label.**
- **A green test is not evidence** if you authored the fixture. It must exercise the production path
  with a real value and fail for the right reason first.
- **Never `git add -A` / `git add .` / `git commit -a`.** The tree carries the owner's WIP across ~15
  files. Stage exact paths.
- **Never read or edit `connect-four/package.json`** — its `test:fast` value is one 7,146-character
  line and exact-match editing it has killed two agents. Every existing test file is already
  registered; a NEW test file must be listed **explicitly in the plan** and appended to that list by
  the human, not by an agent.
- **Tests**: `cd connect-four && npm run test:fast`. Lint runs first; a lint **error** means zero tests
  execute. Baseline is **1999 pass / 0 fail** (`reason-DECISIONS.md:1601,1623` — D50's recorded
  status), 0 eslint errors / 47 warnings.
- **Coordinates are 0-indexed internally; `cNrM` is 1-indexed on emit.** Never reason about a
  movestring without running `./visualize_board.sh <movestring>`.
- **Never ground a named cell on an alternate solver PV** — use the engine's own `finalMovestring`.
- **`grade_mechanical.mjs`'s A6 is already effectively post-guard**: it imports production's
  `mentionsBetterColumn` (`grade_mechanical.mjs:12,42-43`), which strips internally. Decision 1
  therefore moves the **agent-graded judgment axes**, not A6.
- **`compute.mjs` already runs `processAnnotations`** via `postprocessAnswer`
  (`compute.mjs:306-309`, called at `:384`), so the recorded `answer.mechanism` is post-annotation but
  **pre-guard**. That is precisely the gap decision 1 closes.
- **A guard replay can *lose* highlights**, by design: `stripFailingZoneSpans` removes a span whose
  inner text carries an unvouched raw coordinate (`P6:raw_coordinate`). If US1 stores only the served
  string, that information is destroyed — see `## Open questions` Q1.
- **Adding anything to the prompt adds VOCABULARY the model echoes** (§12g): the second projected
  board's caption alone moved render-label leakage 0/125 → 10/125. **Extend the never-repeat list in
  the same change that adds a surface.**
- **New open-issue ids start at OI-207** — OI-206 is the highest in `docs/open_issues.md`. But
  **check for an existing issue before opening one.** An earlier draft of this epic proposed OI-207 for
  the `you-double` role/spec arity mismatch; that artifact is already **OI-180** (`halfForkCellsSpec`
  bundles a fork's disjoint endpoints into one `windows:` group), seen from the spec side rather than
  the role side. Two of three "newly discovered" defects in the intake were likewise already filed
  (OI-198, OI-199). **Assume a defect you just found is already an OI until you have grepped.**
- **Deployability**: `docs/deployment_steps.md` is a work queue; any change in this epic that alters
  served text must append its own entry there (`§6` obligation). The already-`PENDING`
  `explanation_cache` purge is tracked and is **not** this epic's concern — do not build sequencing or
  safety machinery around it.
- **Staging and production are disposable pre-launch** — prefer regenerate-from-scratch over surgical
  repair; production work is documentation, not tooling.

---

## User stories & tasks

### US1 — The eval grades the text production would actually serve

*(Blocks validation of US2/US3. Do this first.)*

| # | Task | Surface |
|---|---|---|
| 1.1 | Add a post-guard field to each answers row, produced by calling `guardExplainMoveLlmPayload` with the same `board` + `allowedSet` production uses. Keep the pre-guard `mechanism` (see Q1). | `connect-four/server/scripts/compute.mjs` |
| 1.2 | Record, per row, what the guard *did*: spans stripped and their failure codes, coordinates promoted/humanized. This is the measurement that makes OI-194's real cost visible. | `compute.mjs` |
| 1.3 | Write `GRADER_INSTRUCTIONS_v2.md`: v1 verbatim plus an explicit statement of **which string each axis grades** (served prose for A5/A7b/G1/G7; the pre-guard string only where an axis is explicitly about generation). Never edit v1. | `reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` |
| 1.4 | Freeze the dispatch wrapper: make the skill's fixed three-line dispatch mandatory and forbid adding out-of-rubric context (open-issue lists, hypotheses) to a dispatch message. | `.claude/skills/grade-fv-sufficiency/SKILL.md` |
| 1.5 | Record the rubric version + dispatch-wrapper hash for every run in the runs README, and correct the superseded prose-layer numbers there (§evidence corrections 1–4). | `reason_corpus/runs/README.md` |
| 1.6 | **Attribute every guard-action code 1.2 records to its owning open issue before any of it is read as an OI-194 cost.** Three guard-layer issues are already filed and each produces codes US1 will now surface: **OI-140** (`deferred` — the gate runs *before* token-stripping, so P6 discards zones the strip would have made valid: this may mean the 5 `P6:raw_coordinate` losses are an ORDERING defect, not an OI-194 defect), **OI-172** (`OPEN`, mitigated — whole-window-only admission rejects correct single-cell highlights; measured 14 `P5strong:cell_not_allowed` on 08-25a, 15 on 08-25b), **OI-170** (`OPEN` — `P5strong:tg` rejection spans never stripped). Output: a code → OI mapping, and a statement of which losses OI-194's fix would actually remove. | `compute.mjs`, `docs/open_issues.md` |

### US2 — No rendered artifact describes a board state that is not true

| # | Task | Open issue | Surface |
|---|---|---|---|
| 2.1 | A terminal `afterBest` board must state the game is over and must not list live threats; the L1 frame must not use future tense for a move that wins on the spot (`causalLinks.mjs:38` — `immediate_threat: 'threat to make four next move'`). Reproduced 5/5 on `eval-41`. | **OI-203** | `reasonBoardSelect.mjs`, `causalLinks.mjs` |
| 2.2 | A tactic overlay may only be attached to a board on which it is board-true. `pin-L2-enabled-opponent`'s decision board `334` reports "Major threats: none" while the rendered Tactics list asserts the opponent's double threat; `eval-33` shows the mirror case. | **OI-204** (+ OI-195 second half) | `reasonBoardTags.mjs` |
| 2.3 | Either state the `replyHistogram` rule in a form the rendered values support, or stop offering the comparative when they do not. On `eval-37` the key's own rule, applied to the shown numbers, says the blunder was the tougher defense. | **OI-202** | `renderReasonModel.mjs` (`READING_KEY`, :332) |
| 2.4 | L2's "occupy" verb over-claims on the four records where the named square is empty on the engine's own `finalMovestring` (the D49 `sharedCells[0]` fix covered only the cell choice). | **OI-195** (remaining half a) | `causalLinks.mjs` (L2, :89) |
| 2.5 | **L3 over-claims the GRAIN of `immediate_threat` relative to the board it names, and its guardrail then forbids the real cause.** On `eval-37` the link asserts the opponent's "threat to make four next move at c1r4" while the prompt's own tactics block for that board says `major at c1r4 (opp)` — column 1 has height 2, so the cell is not gravity-reachable next move; the real cause (playing column 1 fills c1r3 and *makes* it reachable) is exactly what L3's guardrail forbids naming, so all 5 runs restate the outcome and fail A7a. `pin-branch-invariance-true-2` is the same defect on its own board (3/5 runs). **This is the failure family OI-188 already describes** ("the decision board's Tactics list asserts patterns that are not board-true", `open`, deliberately deferred from the 2026-08-11 remediation) — extend that issue rather than opening a new one, and close it with 2.2. | **OI-188** (+ OI-202 adjacency) | `causalLinks.mjs` (L3), `reasonBoardTags.mjs` |
| 2.6 | **The required-set retry reads the RAW mechanism**, so a required spec the guard later strips never triggers a retry — the retry believes a handle survived that the player never receives. Latent today; US1 makes it measurable, and the 5 stripped spans are the population it applies to. Fix the string the post-check reads, NOT the budget or trigger set (settled decision 4). | **OI-177** | `mechanismExplainer.mjs` |

### US3 — Every handle, role and template is unambiguous, owned, and obeys the rules the prompt states

| # | Task | Open issue | Surface |
|---|---|---|---|
| 3.1 | **No prompt surface may embed raw `cNrM` into text the prompt forbids the model to write.** Measured over the 25 subset records via `buildReasonRenderModel`, the templates are a MINORITY of the producers: `link.text` **20/25**, `zones.aliases[].role` **13/25**, `requiredSet[].role`+`.spec` **25/25** (printed verbatim by `requiredLines`, `renderReasonModel.mjs:604-605`). Fixing only the causal templates would declare OI-194 done while every record still shows raw squares in the block the prompt calls **mandatory**. **Tension to resolve, not ignore:** the role-text source is `specHint()` → `disambiguateSiblingRoles()` (`zoneAnnotations.mjs:401-424`) — i.e. **D49's own fix for OI-191 is what injects `"the one at c6r5: …"`**, so a naive strip re-opens the sibling-collision defect D49 closed. The fix must keep siblings distinguishable without raw coordinates (see Q8). Justify the work by the measured 5/340 lost highlights + prompt hygiene — **not** by a player-facing coordinate leak, which is 0/125. | **OI-194** | `causalLinks.mjs`, `zoneAnnotations.mjs`, `renderReasonModel.mjs` |
| 3.2 | `future-line` role text names no owner, so a line alias reads as either player's; on `eval-2` two runs handed the player's own line to the opponent. Conjugate the owner as the `line` branch does. | **OI-201** | `zoneAnnotations.mjs:61` |
| 3.3 | `forkPivotCell` only fires on a tagged half (`FORK_TAGS.has(half.tacticTag)`, `zoneAnnotations.mjs:93-94`); on `eval-47` the fork lives in board tags and no pivot is offered. | **OI-193** | `zoneAnnotations.mjs` |
| 3.4 | `better-col` is offered on every record but `deriveRequiredSet` can never select it (it derives only geometry specs), so the one block the model reliably obeys never asks for the better column. Trades against FR-005's cap of three (`renderReasonModel.mjs:172`) — see Q2. | **OI-205** | `renderReasonModel.mjs` |
| 3.5 | A fully-`transformed` object array renders as `[{},{},{},{}]` instead of being dropped; the object branch guards this and the array branch does not (`renderReasonModel.mjs:27,39`). 13 of 25 subset records. | **OI-206** | `renderReasonModel.mjs` |
| 3.6 | The opening frame invites a centrality explanation (`openingFrame.mjs:72` `GUARDRAIL_ADMISSIBLE_FRAMINGS_CENTRALITY_ONLY`) and then forbids it (`:76` `GUARDRAIL_NO_CENTRALITY`), when the centrality clause is suppressed. Hit independently on `eval-21` (5/5) and `eval-11`; every run took the invitation and rested on a board-false central-grip claim. **Already filed — see the note below.** | **OI-199** | `openingFrame.mjs` |
| 3.7 | `roleText`'s `major` fallback renders "you's four-in-a-row line" (`zoneAnnotations.mjs:78`); the sibling branches conjugate explicitly. Cosmetic, one line. | **OI-198** | `zoneAnnotations.mjs` |
| 3.8 | Role/spec arity mismatch — `kind === 'double'` role text reads *"the single fork square"* (`zoneAnnotations.mjs:59`) while its spec can be a 3-cell set (`eval-47`: `you-double = windows:c3r6,c6r5,c7r2`). **Do NOT open a new id: this is the role-side view of OI-180** (`halfForkCellsSpec` bundles a fork's disjoint endpoints into one `windows:` group, so the spec claims a line that does not exist — `open`). Fix both sides together, or state explicitly which side is authoritative. | **OI-180** | `zoneAnnotations.mjs` |
| 3.9 | **The prompt displays term slugs it does not offer.** On `eval-13`, L7's own prose supplies "the central-column opening" while `zones.terms` offers only `double_threat`; the model emits `[term:central-column opening]`, `annotationRepairs` fires, and `GRADER_INSTRUCTIONS_v1.md:47,176` makes a non-empty `annotationRepairs` a **G7c auto-FAIL** (measured: 3 of 125 rows). Fix already specified as Task 9b of the 2026-08-11 remediation plan and never implemented. | **OI-189** | `renderReasonModel.mjs`, `causalLinks.mjs` |
| 3.10 | **Owner attribution on shared vocabulary.** `zones.terms[double_threat]`'s description is owner-neutral, so the model can hand the opponent's fork to the learner; `eval-13` reproduces it this run (runs 0 and 4). Task 3.2 fixes owner-naming for `future-line` roles only and does not reach the terms map. OI-184 is filed as "the most severe defect found in the 2026-08-06 evaluation" (factual correctness, `open`). | **OI-184** | `zoneAnnotations.mjs` (terms map) |
| 3.11 | **A frame must not contradict its own required set.** On `eval-9` the L5/O1 frame says the win is "too far to pin to a single square" while `requiredSet` **mandates** naming two single squares; all 5 runs fail A5. Same class as OI-199 (3.6), different template pair — one guardrail-vs-requirement consistency check should cover both. | **OI-207** (filed 2026-08-26) | `causalLinks.mjs`, `renderReasonModel.mjs` |

**All three "not yet filed" items in the intake were in fact already filed** — verified in
`docs/open_issues.md`: the opening-centrality contradiction is **OI-199** (`:7273`, open), the
`"you's four-in-a-row line"` cosmetic is **OI-198** (`:7259`), and the role/spec arity mismatch is the
role-side view of **OI-180** (open). **Zero new ids are needed for the intake.** Do not open duplicates.

**Near-duplicate issues this epic must CLOSE, not leave open.** Three filed issues describe defects
tasks here already fix. If they are not closed, `open_issues.md` will keep asserting live defects that
were fixed: **OI-187** (`requiredSet` never obliges the better column) is the same defect as OI-205 /
task 3.4; **OI-188** (decision board asserts non-board-true patterns) is the same family as OI-204 /
tasks 2.2 + 2.5; **OI-182** (required set names both finishing squares but never the fork-creating
square) is the parent of OI-193 / task 3.3. Each task's definition of done includes updating the
status of every issue it resolves.

---

## Acceptance criteria (epic-level)

Machine-checkable wherever possible. `IF/THEN` rules are the contract.

**US1**

1. IF `compute.mjs --llm` writes an answers row, THEN that row carries the post-guard served string,
   produced by importing `guardExplainMoveLlmPayload` from `reasonRenderGuard.mjs` — **not** by a
   reimplementation of it. A test asserts the imported symbol is used.
2. IF the recorded answers of `…2026-08-26T15-47-56Z` are replayed through the new harness path, THEN
   the count of raw `cNrM` tokens in served prose (with `[zone:…]` delimiters removed) is **0**, and
   the count of runs losing at least one `[zone:…]` span is **5**. *(Both figures were measured for
   this epic and are the regression fixture; harvest, never hand-write, any other fixture.)*
3. `GRADER_INSTRUCTIONS_v2.md` exists; `GRADER_INSTRUCTIONS_v1.md` is byte-identical to its state at
   `f6282be`; every axis in v2 names the string it grades.
4. IF a grading fleet is dispatched, THEN every dispatch message is byte-identical except for `id`,
   `condition` and the output path, and carries **no** out-of-rubric context (open-issue lists,
   hypotheses, "known traps"). *(The artifact this is checked against is Q6's output — a template file
   plus hash, or a rule in the skill. Until Q6 resolves, this AC has no checkable referent; the plan
   must not treat it as testable before then.)* Note that
   `.claude/skills/grade-fv-sufficiency/SKILL.md` **already specifies a fixed three-line dispatch** —
   Q6's live half is only how it is frozen and verified, not what it says.
5. `runs/README.md` records the rubric version and the dispatch-wrapper identity for every run, and no
   longer asserts the superseded "flat incidence" / "70 passes had the same defect" numbers.

**US2/US3** — each defect gets a **deterministic, model-free test through the production function**,
not an LLM re-measure:

6. **Board-state truth, in two independent halves — the second is NOT gated on terminality:**
   (a) IF `afterBest` is terminal (`checkWin` true on the engine's own `finalMovestring`), THEN the
   rendered board carries no live threat entries AND the assembled prompt contains an explicit
   game-over statement AND no causal frame refers to that move in the future tense.
   (b) IF any frame or link text asserts a threat at the **`immediate_threat` grain** ("to make four
   next move") on a named board, THEN that cell is gravity-reachable on that board's own state — i.e.
   the frame's grain matches the tactics block's grain for the same cell (`major` ≠ `immediate`).
   `eval-37` and `pin-branch-invariance-true-2` are the RED cases and are **non-terminal**, so an AC
   gated only on `checkWin` cannot catch them. Both halves asserted over the full corpus.
7. IF a tactic overlay is attached to a board, THEN every disc the tactic requires exists on that
   board's own state. Asserted corpus-wide; the current `pin-L2-enabled-opponent` and `eval-33`
   entries are the RED cases.
8. IF the `replyHistogram` comparative is emitted, THEN the rendered values support the direction the
   `READING_KEY` states; otherwise the comparative is not offered.
9. **(a)** No rendered JSON contains an empty object literal, and no key survives pruning to nothing
   (corpus-wide; the array branch matches the object branch). **(b)** `render_decision.fieldPartition.rendered`
   agrees with what the prompt actually renders — a path listed as rendered is present, a path absent
   is not listed. *(b) exists because (a) alone is satisfiable by simply DROPPING the key, which on
   `eval-33` removes the forced denial sequence explaining why column 1 holds the draw while
   `fieldPartition` keeps claiming it was rendered — the inconsistency filed as **OI-186**. The plan
   must decide whether `lostResource.line` should be dropped or PROMOTED to rendered; "make the empty
   braces go away" is not the acceptance bar.*
10. Every alias role text (a) names an owner where ownership is determinable, (b) agrees in arity with
    its own spec (a 1-cell role text never describes a multi-cell spec), and (c) is grammatical for
    **both** second-person and third-person owners across **every** `roleText` branch. *(c) is a class,
    not a token: `"you's four-in-a-row line"` (`zoneAnnotations.mjs:78`, the `major` fallback) and
    `"you gets two winning squares at once"` (`:59`, the `double` branch) are the same defect — a
    possessive/verb form interpolated without conjugating `${who}`. Measured on the 25 subset records:
    `"you's"` on 9, `"you gets"` on 5. An AC that greps only for `"you's"` is passed by a fix that
    leaves `"you gets"` in place.* Parametric over the whole offer set on all 63 corpus records.
11. **No prompt surface that the model is told not to echo contains a `cNrM`/`colN` token** —
    asserted over **all three** producers, not just the templates: `link.text`, `zones.aliases[].role`,
    and `requiredSet[].role`/`.spec`. Baselines to go RED against, measured on the 25 subset records:
    20/25, 13/25, **25/25** respectively. AND the sibling-disambiguation property D49 established still
    holds — no two aliases sharing a `(role, truthBoard)` pair restate identically (§12d). Satisfying
    11 by re-introducing the OI-191 collision is a regression, not a fix.
12. IF the opening guardrail suppresses the centrality clause, THEN "centrality" does not appear in
    the admissible-framings sentence for that record.
13. IF `deriveRequiredSet` runs on any corpus record, THEN the better column is requestable — the
    resolution of Q2 fixes whether that means a required slot, a separate block, or something else,
    and whichever it is, the required set still satisfies `required ⊆ offered` and the FR-005 cap.

**Global**

14. `cd connect-four && npm run test:fast` is at or above the branch-point baseline with **0 fail**
    and 0 eslint errors, and every new test file is named explicitly in the plan for the human to
    append to `test:fast`. **Measure the baseline at branch point; do not inherit the `1999` figure** —
    it is a number recalled from `reason-DECISIONS.md:1601`, and this tree carries uncommitted changes
    in `server/index.js` and four `server/tests/*.test.mjs` files, so the true baseline may differ.
15. Every change altering served text appends an entry to `docs/deployment_steps.md`.
16. `reason-DECISIONS.md` gains one D-entry per non-obvious decision; `reason-render-grounded-prompt.md`
    §12 is extended (never contradicted) for any render-contract change.

---

## NOT included (so scope cannot grow silently)

- **The reason engine.** `computeReason`, `reasonEngine.mjs`, the case taxonomy, and any feature-vector
  field change. Triage has returned `0 vector_error, 0 missing_info` on every run.
- **Building a production-path batch harness / exercising the retry (OI-183).** Owner decided
  2026-08-26 to leave the harness single-attempt and carry the caveat.
- **Redesigning enforcement or the retry** (settled decision 4).
- **Frontend.** No `src/` changes; no board-rendering or highlight-display work.
- **TTS/audio**, localization, and the Spanish eval-coverage gap (OI-176).
- **The PENDING `explanation_cache` purge** in `docs/deployment_steps.md` — tracked separately by the
  owner; not a prerequisite, not a blocker, and not to be engineered around.
- **A new LLM eval run as an acceptance gate.** Every US2/US3 fix is validated by a deterministic
  corpus test. A re-measure is a *reporting* step the owner may choose to run afterwards.
- **OI-197** (intermittent A4 fabrication needing a post-generation verification gate) — a distinct
  design with its own epic-sized surface.
- **OI-200** (`REDACTABLE_TAG_SLUGS` mirror) — accepted tech debt, adjudicated 2026-08-21.
- **OI-178** (`humanizeGroundedCoordinates` expands every cell of a multi-cell window) — a guard-layer
  cosmetic defect that US1 will start surfacing. Excluded deliberately: it changes the served string,
  so fixing it mid-epic would move the very baseline US1 exists to establish. Re-evaluate after the
  first v2-graded run.
- **OI-140 / OI-170 / OI-172** as *fixes*. Task 1.6 requires them to be **named and attributed** so
  their guard-action codes are not misread as OI-194's cost, but repairing the gate's ordering
  (OI-140) or its admission rule (OI-172) is its own design with its own blast radius.
- **OI-186** (`buildRenderDecision` recomputes the offer set) as a *refactor*. AC 9(b) requires
  `fieldPartition.rendered` to stop lying; restructuring the two builders into one shared producer is
  the larger fix and is not required to satisfy it.

---

## Open questions

Genuinely unresolved; `/clarify` should settle them. None of the settled decisions is reopenable here.

1. **What does the harness store, and what do graders see?** Options: served string only (simplest,
   but destroys the pre-guard evidence and makes OI-194 unmeasurable); both strings plus a guard-action
   log (richer, but a grader that can see both may charge the pre-guard one — the exact failure mode
   this epic exists to fix); or served string to graders with the pre-guard string kept out of the
   grading prompt entirely. This decides the v2 rubric's shape.
2. **How does the better column become requestable (OI-205/OI-187) without spending a geometry slot?**
   FR-005 caps the required set at three (`renderReasonModel.mjs:172`). **Measured, so the trade is not
   hypothetical: across the 25 subset records, 10 have a required set of size 2 (a free slot already
   exists) and 15 are at the cap of 3 (the trade binds).** So the question is live for 60% of records,
   not all of them. Options: give `better-col` a reserved fourth slot; let it displace the
   lowest-value geometry group; or move the demand out of the required block into its own mandatory
   line. Note the honest metric: production already re-asks when the column is missing, so the
   question is *does this remove a retry*, not *does it move A6*.
3. **OI-203: what does a terminal board render as?** Suppress the tactics list entirely, replace it
   with a single "this move ends the game here" statement, or drop the `afterBest` board and state the
   win in prose? Each adds or removes vocabulary the model can echo (§12g).
4. **OI-202: fix the rule or drop the comparative?** Restating the rule in terms the counts support
   (fewer replies AND not-faster) is more informative but more prompt surface; dropping the
   comparative when unsupported is safer and loses a real signal on the records where it does hold.
5. **OI-199: drop centrality from the framings sentence, or relax the guardrail?** The `eval-21` gate
   exists for a real reason (see the D-log), so relaxing it is not obviously safe.
6. **How is the dispatch wrapper actually frozen** — a checked-in template file with a recorded hash,
   or a rule in the skill? A rule is cheaper; a file is verifiable. **Half of this is already
   answered: `.claude/skills/grade-fv-sufficiency/SKILL.md` already specifies the fixed three-line
   dispatch verbatim.** Do not re-derive that text; decide only the freezing/verification mechanism,
   and reconcile with AC 4. *(Caution: that file carries ~+237/−49 uncommitted lines in this tree, so
   any line number into it will have drifted by plan time — locate by symbol.)*
7. **Is a post-fix LLM re-measure in scope at all**, given the control group is spent (§12f) and every
   judgment-axis delta of a few points is inside the noise band? If yes, against which recorded run,
   and under which rubric version? *(Note the trap: a v2-graded run is not comparable to any v1-graded
   run on the judgment axes, so the first v2 run establishes a new baseline rather than showing an
   improvement.)*
8. **How do sibling aliases stay distinguishable without raw coordinates (task 3.1 vs D49)?**
   `disambiguateSiblingRoles` front-loads geometry into the role precisely to break `(role, truthBoard)`
   collisions — 48/63 records before D49, 0 after. Stripping `cNrM` from role text re-opens that unless
   something replaces it. Options: a plain-English locator ("the lower of the two", "the one on the left
   edge"); an ordinal tied to the reading key; or keeping coordinates ONLY in the role text while
   forbidding them in the frame prose the model is asked to imitate. Each trades hygiene against
   ambiguity, and §12g warns that any new vocabulary is vocabulary the model will echo.

---

## Authoritative sources of truth

Read in this order. Treat everything in it as binding.

1. `docs/architecture/reason-AGENT-PREAMBLE.md` — paste verbatim into any fresh-context prompt for
   this work; it points at the four binding docs and states the hard rules.
2. `docs/architecture/reason-INVARIANTS.md` (I0, I12, I13), `docs/architecture/reason-DECISIONS.md`
   (**D48 :1488, D49 :1524, D50 :1568 + addendum :1607** are the recent ones),
   `docs/architecture/reason-case-taxonomy.md`, `docs/architecture/blunder-reason-evidence.md`.
3. `docs/architecture/reason-render-grounded-prompt.md` **§12** (:1009-1085) — the current render
   contract: §12a board set, §12b board-truth alias binding, §12c/d/e the D49 rules, §12f the spent
   control group, §12g vocabulary.
4. `connect-four/server/scripts/reason_corpus/runs/README.md` — every recorded run, its rubric
   version, the OI-183 floor caveat, and the 2026-08-26 section. **Its A6 correction stands; its
   prose-layer incidence numbers are superseded by this epic's `## The evidence`.**
5. `docs/open_issues.md` — **in scope**: OI-177, OI-180, OI-182, OI-184, OI-187, OI-188, OI-189,
   OI-193, OI-194, OI-195, OI-198, OI-199, OI-201, OI-202, OI-203, OI-204, OI-205, OI-206.
   **Named but not fixed**: OI-140, OI-170, OI-172, OI-178, OI-186. **Excluded**: OI-176, OI-183,
   OI-197, OI-200. Read each issue's own `Status:` line rather than trusting this summary — statuses
   drift, and an issue marked FIXED must not be worked.
6. Production code, in the order the string flows: `connect-four/server/scripts/renderReasonModel.mjs`
   (prompt assembly) → `reason_engine/zoneAnnotations.mjs` (the offer) →
   `reason_engine/causalLinks.mjs` + `openingFrame.mjs` (the frame) → `scripts/reasonBoardSelect.mjs`
   + `scripts/reasonBoardTags.mjs` (the boards) → `server/mechanismExplainer.mjs` (retry + checks) →
   `server/reasonRenderGuard.mjs` (the serving guard) → `server/index.js:1282-1475` (the endpoint).
7. Eval: `connect-four/server/scripts/compute.mjs`, `connect-four/server/scripts/grade_mechanical.mjs`,
   `.claude/skills/grade-fv-sufficiency/SKILL.md`,
   `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v1.md`.
8. `docs/best_practices_spec_driven_development.md` §"Epic Sizing" (:196) and §"Designing AI-Friendly
   Specifications" (:106).
9. `CLAUDE.md` — coordinate convention, player-colour aliases, movestring rule
   (`./visualize_board.sh`), `npm run test:fast`, pre-launch disposability.


---

## Revision note — 2026-08-26, after an adversarial coverage audit

This epic was revised once before entering the pipeline. An independent reviewer swept all 206 issues
in `docs/open_issues.md` by subject matter (not by number range) and re-measured every claim in
`## The evidence`. **All ten measurable claims reproduced exactly at the correct layer**, including the
previously-unverified `5 of 340 spans lost to P6:raw_coordinate` — so OI-194's stated rationale stands.

What changed, and why it matters to anyone reading the task list:

1. **Nine filed issues were silently absent** and are now in scope or explicitly excluded: OI-177,
   OI-180, OI-184, OI-187, OI-188, OI-189 (in scope); OI-140, OI-170, OI-172, OI-178, OI-186 (named,
   attributed, or excluded with a reason). The first draft's sweep iterated a list of issue numbers
   instead of reading headings — the same failure that had already caused OI-197–200 to be missed once
   in the intake. **If you extend this epic, sweep by subject.**
2. **OI-194's task covered under half its producers.** Measured: raw `cNrM` appears in `link.text` on
   20/25 records, alias roles on 13/25, and the required set on **25/25** — the block the prompt calls
   mandatory. AC 11 now asserts all three, and Q8 owns the D49 tension the widening creates.
3. **Two named deterministic failures had no owning task** — `eval-37` and
   `pin-branch-invariance-true-2` (now task 2.5), and `eval-9` (now 3.11).
4. **Settled decision 4 was over-broad.** It asserted the enforcement layer must not be redesigned;
   OI-177 is open and says that layer reads the wrong string. Narrowed to the budget and trigger set.
5. **Four acceptance criteria were written to a symptom rather than a defect class** — AC 6 was gated
   on terminality and could not fire on the non-terminal boards that fail 5/5; AC 9 was satisfiable by
   deleting evidence; AC 10(c) grepped for `"you's"` while `"you gets"` is the same defect; AC 11
   scoped to templates. All four now assert the class.
6. **No new open-issue ids are needed.** All three "newly discovered" defects in the intake were
   already filed (OI-198, OI-199, OI-180). Three further issues (OI-182, OI-187, OI-188) duplicate work
   tasks here already do and must be **closed** by those tasks, not left open.
