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
