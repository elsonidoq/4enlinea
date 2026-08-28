# Research: Deep-Reveal Remediation (spec 059 / Epic 12)

This file resolves the two fragile decisions the task handoff flagged as explicitly unmade, records
provisional (not binding) answers for the spec's open `[NEEDS CLARIFICATION]` markers (Q1–Q5, Q7, Q8 —
none resolved here per the hard constraint), and captures the source-verified facts the plan depends on.
Every claim below was re-verified at HEAD in this working tree (not recalled from the epic/spec) —
citations are `file:line` as they exist now.

---

## Decision 1 — FR-013's seam: where does the post-guard `usedSpecs` check run?

**Decision: inside `computeMechanism`, by calling `guardExplainMoveLlmPayload` a second time with its
new opt-in diagnostics flag (FR-004), accepting double invocation per request.**

**Verified facts:**

- `computeMechanism(movestring, col, opts)` (`connect-four/server/mechanismExplainer.mjs:181`) already
  has `movestring` as a direct parameter and builds `renderDecision` locally
  (`mechanismExplainer.mjs:187`, `const renderDecision = renderDecisionForCondition(nv, 'D');`). Both
  inputs `guardExplainMoveLlmPayload` needs (`board = new Board(movestring)`,
  `allowedSet = toAllowedSet(renderDecision.zones.aliases)`) are cheaply constructible in scope — no new
  engine call, matching Settled decision 1's "every input it needs is already present."
- `missingRequiredGroups(requiredSet, attempt)` (`mechanismExplainer.mjs:85-88`) reads
  `attempt.usedSpecs`, a **structured array of specs** — not a string search — produced by
  `postprocessAnswer` → `processAnnotations` (`compute.mjs:306-312`, imported into
  `mechanismExplainer.mjs:24-28`). `processAnnotations` runs at `runLlmAttempt`
  (`mechanismExplainer.mjs:63`) and is **pre-guard**: it validates the model's `[zone:handle]` tags
  against the OFFERED set and expands them to specs; it never calls
  `guardExplainMoveLlmPayload`/`stripFailingZoneSpans`/`validateAnnotation`. So a spec can appear in
  `usedSpecs` (successfully offered-and-resolved) and still have its span **later** stripped by the
  guard for an unrelated reason (a raw-coordinate leak inside the span, a `P5strong` admission failure,
  etc.) — confirmed by reading `guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs:418-443`) and
  `stripFailingZoneSpans` (`:365-380`) in full: the guard runs `promoteRawCoordinates` →
  `humanizeGroundedCoordinates` → `validateAnnotation` (`annotationGate.js:524`, which runs
  `checkP5Strong` when `allowedSet` is non-null) → `stripFailingZoneSpans`, entirely independent of
  whether `processAnnotations` already accepted the tag.
- `guardExplainMoveLlmPayload` and everything it calls (`validateAnnotation`,
  `stripFailingZoneSpans`, `promoteRawCoordinates`, `humanizeGroundedCoordinates`,
  `stripInternalTokens`) are all **synchronous, pure string/regex/board-lookup functions** — confirmed
  by reading every one of their signatures (`reasonRenderGuard.mjs:99,156,217,418`;
  `annotationGate.js:524`): none is `async`, none does I/O, no solver call, no DB call, no network
  call. `Board` (`classifier.js`) construction from an already-known movestring is also pure/local.
  **Calling the guard a second time inside `computeMechanism` is therefore not a performance
  concern** — I0 (`reason-INVARIANTS.md:17-33`, "never weaken the algorithm to save solver calls…a
  'this costs N more queries' objection is not a reason") is about solver calls specifically and does
  not even apply here, since there are zero solver calls in the guard path; the actual cost is
  microseconds of string processing against the (already-generated) `attempt1.mechanism` text, well
  inside the Explanation Engine's <2s budget (constitution §V), which is dominated by the LLM/solver
  round-trip already paid for.
- The live `/explain` endpoint (`server/index.js:1470`) still calls the guard exactly as it does today
  for the **served** text — this second, real invocation is unaffected. The `computeMechanism`-internal
  call is a **new, first** invocation, used only to decide the retry, on `attempt1.mechanism` — it does
  **not** replace or short-circuit the endpoint's own guard call on the final served text.

**Rejected alternative — restructure the seam so the guard runs once and its result threads through.**
This would require `computeMechanism` to return the guard's `board`/`allowedSet` (or their diagnostics)
up through `computeMechanism`'s return value, and `index.js` to reuse them instead of recomputing —
saving one guard invocation. Rejected because: (a) the guard is provably free (no I/O), so there is no
performance case for the restructure; (b) it would couple `index.js`'s three
`guardExplainMoveLlmPayload` call sites (cache-hit, not-a-blunder, fresh-generation —
`index.js:1327,1365,1470`) to a computeMechanism-shaped result even on the two paths that never call
`computeMechanism` at all, which is a larger, riskier diff for zero measured benefit; (c) it would also
guard `attempt1`'s text against a request context (`board`) that has not yet decided whether a retry
happens, when the endpoint's real guard call is specifically on `finalAttempt.mechanism` — conflating
the two would risk showing the retry-decision diagnostics for the wrong attempt.

**Concrete change (US2 task 2.6 / FR-013):**

1. `mechanismExplainer.mjs` imports `Board` (`./classifier.js`) and `guardExplainMoveLlmPayload`,
   `toAllowedSet` (`./reasonRenderGuard.mjs`) — `stripInternalTokens` is already imported from the same
   module (`mechanismExplainer.mjs:30`), so this is an addition to an existing import, not a new
   dependency.
2. Immediately before the existing `missing = missingRequiredGroups(requiredSet, attempt1)` call
   (`mechanismExplainer.mjs:221`), build `board = new Board(movestring)` and
   `allowedSet = toAllowedSet(renderDecision?.zones?.aliases ?? [])`, then call
   `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board, allowedSet, diagnostics: true })`
   (the new FR-004 flag) to obtain `diagnostics.strippedSpecs` (see FR-004 shape below).
3. Compute `survivedSpecs = attempt1.usedSpecs.filter(s => !diagnostics.strippedSpecs.includes(s))` and
   pass **that** (not the raw `attempt1.usedSpecs`) to `missingRequiredGroups`. `missingRequiredGroups`
   itself is unchanged — it already compares structured specs (`.filter((g) => !usedSpecs.includes(g.spec))`),
   so this is a change to which array is passed in, not to the comparison logic. This is the literal
   meaning of the spec's "usedSpecs is recomputed against the post-guard annotation set" (FR-013) — it
   survives contact with `processAnnotations`'s actual behavior because `usedSpecs` was always a
   structured array, never a raw string, so "recomputed" here means "filtered by guard survival," not a
   different resolution algorithm.
4. The retry's BUDGET and TRIGGER SET are untouched (Settled decision 4, narrowed) — this only changes
   which specs count as "used" for the existing `missing.length > 0` check
   (`mechanismExplainer.mjs:227`).

**FR-004's diagnostics shape (needed by step 2 above):** add
`diagnostics: { strippedSpecs: string[], failures: string[] }` to `guardExplainMoveLlmPayload`'s return,
populated only when the caller passes `{ ..., diagnostics: true }`. `strippedSpecs` is the same `specs`
set `stripFailingZoneSpans` already builds internally from span-carrying failure codes
(`reasonRenderGuard.mjs:366-372`, `SPAN_CARRYING_CODES = new Set(['P1','P2','P5','P6','P5strong'])`,
`:354`) — threaded out, not recomputed. `failures` is `validateAnnotation`'s own `failures` array
(`reasonRenderGuard.mjs:428`), already computed and currently only `console.warn`'d
(`reasonRenderGuard.mjs:434`). When `board` is `null` (the two call sites with no board in scope) or the
flag is absent, `diagnostics` is omitted entirely — the return shape is `{ ...rest, explanation, prompt,
terms }` exactly as today (`reasonRenderGuard.mjs:437-442`), satisfying AC 2a / FR-004's byte-identical
requirement.

---

## Decision 2 — FR-018 / FR-019 interaction: what happens to `fieldPartition` when the empty array is dropped?

**Decision: `lostResource.line[]` (and every other `transformed`-disposition array) stays classified as
`rendered` in `fieldPartition` after FR-018 drops its empty JSON residue — matching `fieldPartition`'s
own documented carve-out — provided a new corpus-wide test (FR-019(b)) confirms the geometry actually
appears on at least one `shown: true` board. `lostResource.line` is NOT promoted into real JSON
residue.**

**Verified facts:**

- `renderedFields`'s array branch (`renderReasonModel.mjs:37-39`) has no empty-check:
  `if (val.length && val[0] !== null && typeof val[0] === 'object') { copy[key] = pruneArray(val, path); }`
  — unconditional assignment. The object branch two lines below (`:43-45`) DOES guard:
  `const child = prune(val, path); if (Object.keys(child).length) copy[key] = child;`. `pruneArray`
  itself (`:27-31`) maps each element through `prune`, which for an all-`transformed`-disposition
  element (e.g. `lostResource.line[]`'s `ply`/`mover`/`col`/`cell` fields) returns `{}` for every
  element — so the array survives as `[{},{},{},{}]` (OI-206, `docs/open_issues.md:7409-7440`).
- `fieldPartition` (`renderReasonModel.mjs:239-249`) is a **separate, purely-classification** function —
  it does not read the actual pruned/rendered JSON at all. It classifies every leaf path from
  `leafPaths(pruned)` by `dispositionOf(path)` alone: `exclude` → `excluded`; `causal-code` **and**
  covered by the causal link → `covered`; **everything else (including every `transformed` path) →
  `rendered`**. Its own header comment (`:236-238`) states this is deliberate: *"unlike renderedFields'
  keep() (which DROPS transformed from the JSON residue), transformed fields are shown to the model via
  the board, so here they count as rendered (not excluded)."* This means `fieldPartition.rendered`
  already classifies `lostResource.line[].cell` etc. as "rendered" **today, before any FR-018/FR-019
  change** — dropping the empty array (FR-018) does not change `fieldPartition`'s classification at
  all, because `fieldPartition` never inspected the JSON residue to begin with. **FR-018 and FR-019 do
  not actually conflict at the code level** — the epic's caution that FR-018 "makes fieldPartition more
  inconsistent" is about the *semantic* claim ("rendered" via board vs. actually visible in the JSON),
  not a code interaction; FR-018 changes the JSON, FR-019 is a claim about whether that JSON-vs-board
  divergence is still honest once FR-018 removes the misleading empty-braces artifact.
- OI-206's own filed text (`docs/open_issues.md:7409-7440`) already reasons through the `eval-33` case:
  *"lostResource.line is disposition transformed, not render — the board IS supposed to carry it, so no
  information the contract promised is being suppressed… the eval-33 grader reported this as
  information suppression against fieldPartition.rendered; that framing is wrong, the observation is
  right."* This is the open-issue owner's own conclusion that the "rendered via board" framing is
  **correct** for this exact case, not a defect to fix by promotion.
- OI-186 (`docs/open_issues.md:6958-7001`, explicitly OUT OF SCOPE as a refactor per the epic's `NOT
  included`) is the deeper structural issue that `buildRenderDecision` (which computes `fieldPartition`)
  and `buildReasonRenderModel` (which assembles the actual prompt/boards) are two independently-computed
  offer sets that can silently diverge. FR-019(b)'s new consistency check is a **narrow, additive**
  test — it does not restructure the two builders into one producer, so it does not trip over OI-186's
  exclusion.

**Concrete per-record rule (FR-018 + FR-019 composition):**

1. **FR-018**: mirror the object branch's empty-drop guard into the array branch of `renderedFields`
   (`renderReasonModel.mjs:37-39`) — after `pruneArray`, if every element pruned to `{}` (or the array
   is empty), omit the key entirely, exactly as the object branch already does. This removes the
   `[{},{},{},{}]` literal from the JSON residue for every affected path (13/25 subset records,
   `docs/open_issues.md:7429`).
2. **FR-019(a)**: corpus-wide assertion that no rendered JSON contains an empty object/array literal —
   the direct regression test for step 1.
3. **FR-019(b)**: a new, separate corpus-wide test: for every leaf path `fieldPartition` classifies as
   `rendered` whose `dispositionOf(path) === 'transformed'`, assert that the geometry it represents (the
   cells/columns the path encodes) is present on at least one board in that record's
   `boardSelectionDecisions(...)` output with `shown: true` — using the SAME production board-selection
   function the prompt itself uses (`reasonBoardSelect.mjs:boardSelectionDecisions`), not a
   reimplementation. `lostResource.line[]`'s cells are exactly the cells the `decision`/`afterBest`/
   `afterPlayed`/`projectedDeep*` boards' `tags`/`ascii` already carry (they are on the engine's own
   `finalMovestring`, the same line those boards render) — so this test is expected to go GREEN for
   `lostResource.line` without any further code change, confirming OI-206's own conclusion. If a future
   `transformed` field is added whose geometry is NOT actually shown on any board, this test is what
   catches it — that is the "stop lying" FR-019(b) exists for.
4. **No promotion.** `lostResource.line` stays dropped from the JSON residue (step 1) and stays
   classified `rendered` in `fieldPartition` (unchanged, per fact 2 above) — this is the literal
   reading of the spec's own carve-out ("a `transformed` path shown only via the board still counts as
   rendered… FR-019 MUST NOT be read as requiring that carve-out be reclassified").

---

## Provisional answers to open `[NEEDS CLARIFICATION]` markers (NOT resolved — labelled PROVISIONAL)

Per the task's hard constraint, none of Q1–Q5, Q7, Q8 is decided here. What follows is what each one
blocks and a provisional assumption the plan uses so tasks are concrete; `/clarify` is still required
before implementation of the affected task is considered final, and the tasks below are written so the
provisional choice is a single, isolated edit if `/clarify` picks differently.

- **Q1 (harness storage shape, blocks FR-001/FR-003/task 1.1)** — PROVISIONAL: store **both** the
  pre-guard `mechanism` and the new post-guard served string plus the guard `diagnostics` object on
  every answers row (the "both strings plus a guard-action log" option), but the v2 rubric (FR-003)
  explicitly instructs graders which field to read per axis (served prose for A5/A7b/G1/G7) and the
  dispatch template (task 1.4) supplies the grader **only** the served string for those axes — never
  both — so the failure mode Q1 exists to avoid (a grader charging the pre-guard string) cannot occur
  even though both are stored. This keeps OI-194's cost measurable (the pre-guard string stays
  available for `runs/README.md`-level diagnostics reporting) without exposing it to graders.
- **Q2 (better-column requestability, blocks FR-017/task 3.4)** — PROVISIONAL: do not raise the FR-005
  3-slot cap. Instead, when `groups.length < 3` after the existing cell/pivot/line derivation
  (`renderReasonModel.mjs:157-171`), attempt a `better-col` group as a 4th-priority push **only into an
  already-free slot** — i.e. `better-col` is added as one more candidate in the existing priority chain,
  never displacing an already-filled group. This resolves the 10/25 free-slot records
  (`docs/epics/deep-reveal-remediation-epic.md:511`) without changing behavior on the 15/25 at-cap
  records, where `better-col` remains offered-but-not-required exactly as today. **This is a partial
  answer, not a full one** — it does not obligate the better column on the 60% of records where the
  trade genuinely binds, which is exactly the part Q2 is still open about (whether to displace a
  geometry slot there). Flag task 3.4 `PENDING-with-question` for the at-cap case.
- **Q3 (terminal board rendering, blocks FR-008/task 2.1)** — PROVISIONAL: keep the `afterBest` board
  entry (do not drop it — `boardSelectionDecisions` already labels boards by `reason`, and removing the
  board loses the player's ability to see the winning position), but set its `tags: []` and add a
  `terminal: true` field; `assembleGroundedPrompt` renders a single explicit sentence ("this move ends
  the game here — no further threats to track") in place of the tactics list for that board, and L1's
  template (`causalLinks.mjs:66`) gains a terminal-aware branch that does not use `plainTag`'s future-
  tense phrasing. This is the option that adds the least new vocabulary (§12g) — no new board, no new
  concept, one conditional sentence reusing existing "the game is over" framing already used elsewhere
  in the codebase (verify exact existing phrasing before implementing — do not invent new wording
  without extending the never-repeat list per the Edge Cases section).
- **Q4 (replyHistogram rule vs. comparative, blocks FR-011/task 2.3)** — PROVISIONAL: drop the
  comparative when the histogram counts do not support the `READING_KEY`'s stated direction (the safer
  option), rather than rewriting the rule to be count-AND-score-aware — because the correct comparison
  needs the reply **scores**, not just counts (`docs/open_issues.md:7341`, "the count alone does not
  carry resilience — the reply SCORES do"), and computing/rendering scores is new prompt surface (§12g)
  outside this epic's measured scope. `renderReasonModel.mjs` gains a guard: only include the
  `replyHistogram` comparative sentence when `afterBest`'s count is strictly fewer AND (a proxy the plan
  can compute from already-rendered data, e.g. the horizon register) does not contradict it; otherwise
  omit the sentence entirely, never state it wrong.
- **Q5 (opening-centrality guardrail, blocks FR-020/task 3.6)** — PROVISIONAL: drop centrality from the
  admissible-framings sentence when the clause is suppressed (the "drop," not "relax the guardrail,"
  option) — `openingFrame.mjs`'s `mk` (`:88-93`) already computes `clause === ''` when centrality is
  suppressed; gate the choice between `GUARDRAIL_ADMISSIBLE_FRAMINGS_CENTRALITY_ONLY` and a new
  parity-only sentence on that same `clause === ''` condition, symmetric with the existing
  `GUARDRAIL_NO_CENTRALITY` append. Relaxing the guardrail is rejected as the *provisional* choice
  because the guardrail's own comment states it exists for a real, previously-measured reason
  (`docs/open_issues.md:7273-7288` references the D-log); do not touch it without the D-log context
  `/clarify` would surface.
- **Q7 (post-fix LLM re-measure)** — Out of scope for the plan's task list (FR-031, `NOT included`):
  the plan schedules **no** LLM re-measure as any task's Definition of Done. If the owner wants one
  after the fixes land, that is a manual, owner-triggered step outside this plan's tasks — consistent
  with the hard constraint against running any LLM eval batch during this work.
- **Q8 (sibling disambiguation without raw coordinates, blocks FR-014/task 3.1's role-text producer)**
  — PROVISIONAL: replace `specHint`'s coordinate-bearing hint (`zoneAnnotations.mjs:401-409`, "the one
  at c6r5" / "the one through c3r6·c6r5") with an **ordinal locator** tied to a stable, deterministic
  order (e.g. board-then-row-then-column sort of the colliding aliases → "the first"/"the second" or
  "the lower one"/"the higher one" by row) — the plan does NOT resolve which exact wording, and task
  3.1's role-text half is `PENDING-with-question` pending `/clarify`. The `link.text` producer (the
  causal-link templates in `causalLinks.mjs`, 20/25 records) is the OTHER printed producer and is
  **not** blocked by Q8 at all — those templates (L1/L2/L3/L4/L8, `causalLinks.mjs:66,76,88,110,135`)
  interpolate raw `completingCell`/`window` values directly into prose for reasons unrelated to sibling
  disambiguation (OI-194's own filed "Fix direction": *"have the templates carry plain-language
  references… rather than raw cell codes"*, `docs/open_issues.md:7185`) — task 3.1 splits into a
  Q8-independent sub-task (fix `link.text`) and a Q8-dependent sub-task (fix `zones.aliases[].role`'s
  `specHint` producer), so FR-014's `link.text` half can land without waiting on `/clarify`.

---

## Other source-verified facts load-bearing for tasks (harvested at HEAD, not recalled)

- **`npm run test:fast` baseline, re-measured at branch point** (superseding the epic's recalled 1999
  figure, which this re-measure happens to match exactly): **1999 pass, 0 fail, 278 suites, 0 skipped**,
  `cd connect-four && npm run test:fast` run today. Lint ran first with 0 errors (tests executed).
- **`guardExplainMoveLlmPayload` signature** (`reasonRenderGuard.mjs:418`):
  `({ explanation, prompt, terms, locale = 'en', board = null, allowedSet = null, ...rest })`, returns
  `{ ...rest, explanation: stripInternalTokens(...), prompt, terms: sanitizeTermsMap(terms) }`
  (`:437-442`) — confirmed synchronous (no `async` keyword), confirming Decision 1 above.
- **`toAllowedSet`, `Board`, `guardExplainMoveLlmPayload` import paths**: `Board` from
  `./classifier.js` (`index.js:12`); `guardExplainMoveLlmPayload`/`toAllowedSet` from
  `./reasonRenderGuard.mjs` (`index.js:54`) — same paths `mechanismExplainer.mjs` will use, one
  directory-relative hop different (`server/mechanismExplainer.mjs` is a sibling of `server/index.js`,
  so `./classifier.js` and `./reasonRenderGuard.mjs` resolve identically).
- **`compute.mjs` does not yet import `Board`/`guardExplainMoveLlmPayload`/`toAllowedSet`**
  (`compute.mjs:29-38` lists its current imports) — task 1.1 adds these three imports plus a call site
  inside `postprocessAnswer` or its caller (`compute.mjs:306-312`, `:384`).
- **`checkWin(board, row, col, player)`** is exported from `connect-four/server/classifier.js:77` —
  the production terminal-detection function task 2.1/FR-008 must call (not reimplement), exactly as
  the spec's Acceptance Scenario 1 requires ("`checkWin` true on the engine's own `finalMovestring`").
- **`boardSelectionDecisions`** (`reasonBoardSelect.mjs:51-112`) builds the `afterBest` board via
  `applyCol(fv.movestring, fv.bestCol)` then `tagBoard(ms, you)` (`:66-67`) with **no terminal check at
  all** today — `tagBoard`/`getMajorThreatCells` scan for near-threats independent of whether the
  position is already won, which is the direct mechanism behind OI-203 (a won `afterBest` board still
  reports live threat tags).
- **`READING_KEY`'s never-repeat list** is a single template literal at
  `renderReasonModel.mjs:332-342`, not a separate array/file — its last two bullets (`:341-342`) are
  the literal "never repeat" instructions any US2/US3 task that adds new vocabulary (per Edge Cases /
  §12g) must extend in the same change.
- **`GRADER_INSTRUCTIONS_v1.md` is 218 lines**, already contains a parameterized `<ANSWERS_STEM>`
  placeholder (`:32`) and the per-case `## Your case` JSON schema (`:201,217`) — i.e. it is already
  structured as a fillable template, not just prose axis definitions. `SKILL.md`'s dispatch step
  (`SKILL.md:654-661`, located by string search — this file carries uncommitted changes so old line
  numbers do not apply) currently writes "the whole prompt template below" (its own long-form axis
  sections plus the `## Your case` block) to `<scratchpad>/GRADER_INSTRUCTIONS.md`, substituting only
  the answers/vectors file paths — never touching axis text at dispatch time either. Task 1.4's job is
  narrow: point that same substitution step at the checked-in `GRADER_INSTRUCTIONS_v2.md` instead of
  regenerating from `SKILL.md`'s own long-form sections.
- **`deriveRequiredSet`'s cap** (`renderReasonModel.mjs:172`, `return groups.slice(0, 3);`) is fed by
  a fixed priority chain: per-half fork-cells-or-denial-cell (up to 2 groups), then per-half fork-pivot
  (up to 2 more, capped by the `groups.length >= 3` early-exit at `:164`), then one line/window slot
  (`:167-171`). `better-col` is not in this chain at all today — confirmed absent from every `push(...)`
  call in `deriveRequiredSet`.
- **OI numbers already filed and their exact status**, reconfirmed at `docs/open_issues.md` (headings
  read by search, not by number range, per the epic's own revision-note lesson): OI-140 (`:6304` open),
  OI-177 (`:6626` open), OI-180 (`:6719` open), OI-184 (`:6902` open), OI-186 (`:6958` open, excluded as
  refactor), OI-187 (`:7001` open, to be closed by task 3.4), OI-188 (`:7024` open, to be closed by
  tasks 2.2+2.5), OI-189 (`:7040` open), OI-193 (`:7145` open), OI-194 (`:7161` open), OI-195 (`:7189`
  PARTIALLY FIXED, remaining half a/b owned by 2.4/2.2), OI-198 (`:7259` open), OI-199 (`:7273` open),
  OI-201 (`:7305` open), OI-202 (`:7327` open), OI-203 (`:7345` open), OI-204 (`:7365` open), OI-205
  (`:7384` open, to be closed by task 3.4), OI-206 (`:7409` open), OI-207 (`:7451` open, filed already
  for task 3.11), OI-208 (`:7469` open, named-not-fixed only).
