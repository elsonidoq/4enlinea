## Blocking issues

**1. FR-003(b) and SC-002 rest on a premise that is false at source — and the fix they mandate would silently change the rubric.**

FR-003(b) says `GRADER_INSTRUCTIONS_v2.md` must fold in "the axis definitions for A5, A6, A7, G1–G7 that today live only inside `.claude/skills/grade-fv-sufficiency/SKILL.md`". They do not. `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v1.md` is a complete 218-line rubric that already defines every one of them: A5 at `:115-136`, A6 at `:137-138`, A7 at `:139-163`, G1–G7 at `:165-178`, plus the pass rule at `:179` and triage at `:184`. This propagates from the epic's Settled-decision-3 amendment (`docs/epics/deep-reveal-remediation-epic.md:214-220`), which the spec reflected faithfully.

Worse, the SKILL.md line numbers that amendment points at (`:179` A5, `:255` A6, `:298` A7, `:464` G1–G7) are the **orchestrator-side** long-form sections, not the per-case template that graders actually receive. The dispatched text is SKILL.md's `## Your case` block (`:691` onward), and `GRADER_INSTRUCTIONS_v1.md` is a frozen snapshot of exactly that block — the two have since diverged badly (452 changed lines between v1's body and SKILL.md `:691-1000`). So "fold in the axis definitions from SKILL.md" would import a different, longer body of rubric text into v2, changing what graders are told on top of the intended change (decision 1: grade the served string). That defeats the entire purpose of frozen-forward versioning, which is that a v1→v2 delta has exactly one known cause.

Recommended fix: rewrite FR-003 to "v2 = v1 verbatim + an explicit per-axis statement of which string is graded", delete clause (b), and add a requirement that v2 record the SKILL.md-vs-v1 divergence as a known non-comparability rather than resolving it inside this epic. SC-002's "every axis text defined once, in the checked-in file" should be restated as "v2 is the sole text any grading run reads" — which is what task 1.4 already delivers.

**2. FR-013 (OI-177 / task 2.6) mis-describes the defect it is fixing; a test written to its wording would be wrong.**

FR-013 says the required-set post-check "MUST evaluate the post-guard served string, not the raw pre-guard mechanism." The post-check does not read a string at all. `missingRequiredGroups` (`connect-four/server/mechanismExplainer.mjs:85-88`) compares `requiredSet[].spec` against `attempt.usedSpecs` — a structured array of specs that `processAnnotations` already resolved from the model's `[zone:…]` tags (see the comment at `:80-83`). There is no string comparison to redirect.

There is also an ordering problem the spec does not surface: the guard is not inside `computeMechanism`. `guardExplainMoveLlmPayload` is called by the endpoint at `connect-four/server/index.js:1470`, after `computeMechanism` has returned and after any retry decision has been made. Making the post-check post-guard therefore requires computing the guard's span-stripping *inside* `computeMechanism` (it has `movestring` and `renderDecision`, so it can build `board` and `allowedSet` itself) and running the guard twice per request, or restructuring the seam. Neither is a "change which string it reads."

Recommended fix: restate FR-013 as "the post-check MUST treat a required spec whose `[zone:…]` span the guard will strip as *missing* — i.e. `usedSpecs` must be recomputed against the post-guard annotation set, not the pre-guard one", and add an explicit note that this requires the guard's failure set to be available inside `computeMechanism`. That also makes FR-013's dependency on FR-004's `diagnostics` field concrete, which the spec currently only implies.

**3. FR-019 contradicts `fieldPartition`'s documented, deliberate design.**

FR-019 demands a biconditional: every path in `render_decision.fieldPartition.rendered` is present in the assembled prompt, and every path absent from the prompt is not listed as rendered. But `fieldPartition` (`connect-four/server/scripts/renderReasonModel.mjs:239-249`) is a *disposition-table* view, and its own header comment states the divergence is intentional: "unlike renderedFields' keep() (which DROPS `transformed` from the JSON residue), `transformed` fields are shown to the model via the board, so here they count as rendered (not excluded) — the distinction that matters for the G2 over-removal audit is shown-anywhere vs. hidden" (`:236-238`). Enforcing FR-019 literally forces you to reclassify every `transformed` path as not-rendered, which breaks the G2 audit semantics and `renderUniverse.mjs:30`'s coverage predicate — a much larger blast radius than the `eval-33` `lostResource.line` case that actually motivates it. Note also that FR-018 (drop the empty `[{},{},{},{}]` array) makes `fieldPartition` *more* inconsistent, not less, so the two requirements interact.

Recommended fix: narrow FR-019 to "no path listed as `rendered` is invisible to the model in **both** the JSON residue and the boards" (one-directional, transformed-aware), and state the `transformed` carve-out explicitly, the way FR-014 already carves out `alias.spec`.

---

## Decisions required

**Decision 1 — What is `GRADER_INSTRUCTIONS_v2.md` authoritative over?**

Two divergent rubric texts exist today: the checked-in `GRADER_INSTRUCTIONS_v1.md` (which `runs/README.md:71-79` records as the rubric for every graded run since 08-21, including the 08-26 run all of this epic's numbers come from) and the SKILL.md per-case template it was forked from, now 452 lines different.

- **(a) v2 = v1 verbatim + the "which string each axis grades" statement.** Preserves comparability with the 08-26 run; the v1→v2 delta has exactly one cause. Leaves SKILL.md's drifted copy as dead text that task 1.4 stops anyone from reaching.
- **(b) v2 = a merge of v1 and SKILL.md's current body.** Gets a single up-to-date rubric, but confounds decision 1's change with an unmeasured rubric rewrite, and no future run is comparable to any recorded one for two reasons instead of one.

**Recommended: (a).** Whatever improvements SKILL.md's drift contains should land as a deliberate v3 after the first v2 run establishes its baseline.

**Decision 2 — What is FR-019's acceptance bar?**

- **(a) Strict biconditional as written.** Forces `fieldPartition` to be redefined; collides with its documented `transformed` rule and with the G2 audit that consumes it.
- **(b) One-directional, transformed-aware:** no path claimed as `rendered` is invisible in *both* the JSON residue and the rendered boards. Catches the `eval-33` `lostResource.line` case the epic's AC 9(b) actually motivates, without touching the disposition table.
- **(c) Case-specific:** assert only on `lostResource.line`, defer the general property to OI-186.

**Recommended: (b).** It satisfies the epic's stated intent ("`fieldPartition.rendered` must stop lying") while honoring the epic's own exclusion of the OI-186 refactor.

---

## Systemic issues (from the reviewer's handoff — treat as additional required fixes)

- **Two different things are called `FR-005` in one document.** This spec's own FR-005 is the grader-dispatch requirement; but FR-017, US3 AC 4, SC-013, and the Edge Cases cite "the FR-005 cap of three", which is *spec 058's* FR-005 (`renderReasonModel.mjs:172`, `return groups.slice(0, 3);` — verified). Any downstream reader or `/speckit-tasks` pass will resolve it to the wrong requirement. Rename the inherited reference to "the 3-slot required-set cap (spec 058 FR-005)" everywhere.
- **FR-026 is a rollup duplicate.** It restates FR-015 (owner), FR-021 (conjugation), and FR-022 (arity) as one parametric requirement. It corresponds to epic AC 10, so it is not wrong — but as a separate FR it will generate a duplicate task. Fold it into FR-015/021/022 as a shared "asserted parametrically over all 63 corpus records" clause.
- **Minor citation error:** the spec's Edge Cases cite "§12g, `reason-render-grounded-prompt.md:1069-1083`". `:1069` is §12f's heading; §12g starts at `:1078`. The substance is right, the range is off.
