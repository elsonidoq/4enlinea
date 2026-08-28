## Blocking issues

### 1. AC 11 / task 3.1 rests on a mis-measured number, and one of its three "producers" is not rendered at all

The epic's largest scope expansion (revision note item 2, AC 11, task 3.1) says raw `cNrM` squares appear in three prompt producers, with baselines `link.text` 20/25, `zones.aliases[].role` 13/25, and `requiredSet[].role`+`.spec` **25/25** — the last presented as the decisive one because it is "the block the prompt calls mandatory."

I replayed all 25 stored `render_decision` records from the epic's own run file (`…2026-08-26T15-47-56Z.jsonl`). The first two reproduce exactly. The third does not:

- `requiredSet[].role` → **10/25**, not 25/25.
- `requiredSet[].spec` → 25/25 — but `.spec` is **never printed into the prompt**. The required block is `renderReasonModel.mjs:604-605`: `` `- [zone:${g.handle}] = ${g.role}${g.truthBoard ? ...}` `` — handle, role, board. No spec. The Highlightable-regions block (`:625-660`) is the same shape.
- Worse, `.spec` *must* stay coordinate-bearing: it is the key of `aliasBySpec` (`renderReasonModel.mjs:137`, matched at `:146`), the spec-string-equality contract D2/D43 established. An AC demanding no `cNrM` in `.spec` would break required-set derivation entirely.
- The 10 required-set role hits are also a strict subset of the 13 alias-role hits — `deriveRequiredSet` copies `role: alias.role` (`:153`). There are **two** printed producers, not three.

**Recommended resolution.** Restate AC 11 over the printed surfaces only — `link.text` (20/25) and `zones.aliases[].role` (13/25, of which the required block re-prints 10) — and add an explicit carve-out that `alias.spec` / `requiredSet[].spec` are internal match keys, exempt by design and not to be "fixed". Then re-justify the widening: the honest claim is "the role text the mandatory block re-prints carries raw squares on 10 of 25 records," which is still worth fixing but is not the 25/25 headline the epic used to argue the scope up.

### 2. US1's central measurement (task 1.2) cannot be produced through the seam AC 1 mandates

AC 1 requires the served string to come from importing `guardExplainMoveLlmPayload` — "**not** by a reimplementation of it. A test asserts the imported symbol is used." But that function's signature and body (`reasonRenderGuard.mjs:418-442`) return only `{ ...rest, explanation, prompt, terms }`. The guard-action information task 1.2 must record is thrown away inside it: `validateAnnotation`'s `{ valid, failures }` is consumed locally and only `console.warn`'d (`:428`, `:434`), and `stripFailingZoneSpans` is module-private (`:365`, no `export`).

So there is no way to get the failure codes — the `P6:raw_coordinate` / `P5strong:cell_not_allowed` / `P5strong:tg` codes that AC 2's "5 runs lose a span" fixture and task 1.6's code→OI attribution are both built on — from the mandated call. The only routes are (a) importing `validateAnnotation` from `annotationGate.js:524` separately and re-running the two pre-transforms in the guard's exact order, which is precisely the partial reimplementation AC 1 forbids and which will silently drift from production, or (b) changing the production function. The epic picks neither, and does not flag that a production change is needed for a story it frames as harness-only.

**Recommended resolution.** Add an explicit US1 task: widen `guardExplainMoveLlmPayload` to return a `diagnostics` field (failures, promotions, humanizations) alongside the existing keys. `index.js:1470` spreads the result straight into `res.json`, so this is a visible response-shape change and needs a deliberate decision (return it only when an opt-in flag is passed, or accept the extra key and note it in `docs/deployment_steps.md`). Either way the spec must state it, because AC 1 as written makes the alternative illegal.

### 3. The "frozen rubric" is not the file the graders actually read

Settled decision 3, AC 3 and task 1.3 all treat `runs/GRADER_INSTRUCTIONS_v1.md` as the instrument: never edit it, add a `v2` for a scope change. But the grading skill does not use that file. `.claude/skills/grade-fv-sufficiency/SKILL.md:656-659` instructs the orchestrator to *write the rubric fresh each run* — "Write the per-case instructions ONCE to `<scratchpad>/GRADER_INSTRUCTIONS.md` — the whole prompt template below" — and then dispatch three lines pointing at that scratchpad copy. `SKILL.md` contains **zero** references to `GRADER_INSTRUCTIONS_v1.md` (grepped; the only two hits are the scratchpad path). The axis definitions the graders apply live in `SKILL.md` (A5 at `:179`, A6 at `:255`, A7 at `:298`, G1–G7 at `:464`), and `v1`'s own preamble records that earlier runs "ran the skill directly."

Consequence: writing `GRADER_INSTRUCTIONS_v2.md` (task 1.3) changes nothing about the next run — the skill will regenerate the old rubric from its own body. And task 1.4, which only forbids adding out-of-rubric context to the dispatch message, does not close this. The epic's own diagnosis (the instrument drifted between runs) has a second, larger cause it did not find.

**Recommended resolution.** Widen task 1.4: the skill's dispatch step must point at a checked-in versioned rubric file as the *sole* rubric source (`Read connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md in full…`), and the axis text that currently lives inside `SKILL.md` must move into v2 or be reconciled with it. Add an AC: no run may be graded from a rubric that is not a checked-in `GRADER_INSTRUCTIONS_v*.md`.

---

## Decisions required

### Decision A — Task 3.9 targets a fix that already shipped. Keep it, re-aim it, or drop it?

**Background.** Task 3.9 says the prompt shows the model tactic names ("term slugs") it has not authorised the model to use, and describes the fix as "specified as Task 9b of the 2026-08-11 remediation plan and never implemented."

That fix *did* land, as D48 (`reason-DECISIONS.md:1488`, status IMPLEMENTED). It is now invariant **I13** — binding constitution text — which records the defect going 49/63 records → **0/63**, and the code is present (`RENDER_DISPLAY_PHRASE` at `renderReasonModel.mjs:468`, `dropUnoffered` at `zoneAnnotations.mjs:466`). `OI-189`'s own `Status:` line still says "not yet implemented," which is stale.

What actually remains is a *different* defect. I pulled the three flagged rows from the run: two are `eval-13` emitting `unoffered_term:central-column opening` — a concept the causal frame's own **prose** introduces, not a slug the prompt displays — and the third is `eval-33`'s unrelated `unclosed_tag`. So the residual population is **2 of 125, not 3 of 125**, and the fix lives in `causalLinks.mjs` (frame prose must not name a concept the record does not offer), not in the display path D48 already closed.

| Option | What it means |
|---|---|
| **Re-aim 3.9 (recommended)** | Keep the task, restate it as "a causal frame's prose must not introduce vocabulary outside the record's offer set", cite population 2/125, and correct OI-189's status to record that its display half is closed by D48. |
| Drop 3.9 | Treat 2/125 as below the bar; close OI-189 as fixed by D48 and file the prose half separately. |
| Leave as written | The spec inherits a false "never implemented" premise and the plan may re-do D48's work. Not recommended. |

### Decision B — `OI-208` is open and unclassified by the epic

**Background.** The epic states "New open-issue ids start at OI-207 — OI-206 is the highest in `docs/open_issues.md`", and elsewhere cites OI-207 as already filed. Both are now stale: `docs/open_issues.md:7469` carries **OI-208**, status `open`, discovered in the same 2026-08-26 re-measure. It says that when the model writes an unbalanced highlight tag, the repair closes it in the wrong place — on `eval-33` a highlighted square landed under text that does not describe it, so the player sees the wrong square lit up. Its area is `reasonRenderGuard.mjs` / `annotationGate.js`, i.e. squarely inside this epic's lane, and its 1/125 row is the third of the three rows task 3.9 currently claims.

The epic's revision note makes exhaustive issue coverage a stated property ("sweep by subject"), so an unclassified open issue in the lane is a gap the spec will inherit.

| Option | Consequence |
|---|---|
| **Named but not fixed (recommended)** | Add OI-208 to the "Named but not fixed" list beside OI-140/170/172, and make task 1.6's code→OI mapping include the `unclosed_tag` repair path. Costs nothing, stops the 3/125 double-count, keeps the epic's coverage claim honest. |
| In scope, new task under US2 | A mis-anchored highlight is a board-falsehood a player actually sees — arguably the most severe of the three. But it is a guard/repair-path design with its own blast radius, and the epic deliberately excluded the sibling guard issues (OI-140/170/172) for exactly that reason. |
| Excluded with a reason | Acceptable, but must be written down; silence is what the revision note exists to prevent. |
