---
name: feedback_eval_design_methodology
description: "How the user wants LLM eval / context-sufficiency tests designed — floor tests, counterexample hunting, ablation, and keeping exploratory harnesses separate from production regression"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2d2ed0b7-5f2b-4c7e-84f8-a0a4a4ab2406
---

When the user asks to validate an LLM-facing artifact (a prompt, a context/feature vector, an explanation), they want the eval designed a specific way — not a single accuracy number:

- **Floor test with a deliberately MORE capable model.** Use a stronger model than production (and the **same vendor/family** — the coach is OpenAI `gpt-5.4-mini`, so test with a stronger GPT, not Opus) so a failure is unambiguously a *context* blindspot, not a capability gap. The end goal is then to dial the model back *down* to production while evolving the prompt *up*.
- **Hunt counterexamples, not averages.** Success = near-100% across a **stratified** set (every tag/direction/case/sparsity/outcome-flip). The deliverable is a *list of failures each attributed to a missing/ambiguous field*, which feeds the next improvement — a raw percentage "says nothing."
- **Ablation controls** to separate "the model is good" from "the context is good" (e.g. board-only vs full vector vs features-without-movestring). The user explicitly liked this.
- **Grader is the privileged oracle** (full solver/board/ground-truth access); the model under test is sandboxed. Grade the *mechanism/grounding* hardest — the part the given `tag` does not spoon-feed.
- **Keep exploratory harnesses SEPARATE from production regression.** `run_eval` + `judge-deep-reveals` stay the production evaluator; new sufficiency/iteration experiments get their own script + grader skill. Don't bolt experiments onto `run_eval` with flags.

**Why:** the user is iterating toward "a procedure that builds a prompt the weak production model can handle," and these constraints keep each iteration interpretable and comparable.

**How to apply:** when asked to "test/validate" an LLM artifact, propose this shape before writing code. Worked example + full spec: `docs/architecture/feature-vector-sufficiency-experiment.md`. Related: the retired old-explain eval (reason eval is now `compute.mjs`, D22), [[feedback_deep_reveal_product_mindset]].

**A judgment-axis delta is only meaningful between runs graded with the SAME rubric text.** Measured
2026-08-23: an axis appeared to fall 78% → 66% across two gradings and it was *rubric drift*, not code.
Proof: re-rendering every board at both commits showed only 5 of 25 had their prompt structurally
changed — and those 5 *improved* (52→64%) while the 20 untouched boards "fell" (84→66%). The earlier
run had been graded by invoking the skill directly; the later ones used a per-case instructions file
that foregrounded the axis's judgment half. Freeze the rubric as a versioned file next to the runs
(`reason_corpus/runs/GRADER_INSTRUCTIONS_v1.md`) and record the version per run in `runs/README.md`;
never edit a frozen version. Mechanical axes (`grade_mechanical.mjs`) stay comparable regardless.

**Per-board rates at n=5 are far too noisy to attribute.** Two runs differing only by two prompt-wording
changes moved individual boards 0/5→4/5 and 1/5→4/5. Trust a failure that reproduces across independent
runs (same board, often the same run index); treat a single-run per-board delta as noise until
replicated. Aggregate trends across three runs are the defensible unit.

**Freezing the rubric FILE is not enough — the dispatch wrapper is part of the instrument.** Measured
2026-08-26: three runs graded with a byte-identical `GRADER_INSTRUCTIONS_v1.md` charged the same defect
at **14% → 28% → 79%** while the defect's own incidence *halved* (109 → 89 → 62 of 125). The only thing
that changed was the per-case dispatch message wrapping the rubric — the last run's listed the
known-open issues by number, including the one being charged, which primed the fleet. An axis can move
30 points with zero code and zero rubric change. Freeze the dispatch text alongside the rubric (same
three lines for every case, id/condition/output-path only), and record its identity per run. Note also
that `GRADER_INSTRUCTIONS_v1.md` never mentions coordinates at all — graders imported that charge from
outside the frozen file, which is exactly how this is possible.

**The grading fan-out's instruction file lives in the session scratchpad, which is session-scoped** —
copy it into the repo before the session ends or the run becomes ungradeable-again forever.
