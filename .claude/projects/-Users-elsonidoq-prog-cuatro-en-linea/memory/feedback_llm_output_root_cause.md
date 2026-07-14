---
name: feedback_llm_output_root_cause
description: "When LLM output is poor, start from the goal then root-cause across render/context/generator layers — a missing signal is a question, not a fact"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a287e3be-f401-40ae-aed8-aec68fed5a9a
---

When judging/debugging LLM-generated output quality (deep-reveal coach explanations, but applies generally), do NOT stop at "the response was weak / vague."

**Why:** the user cracked the sparse-look-ahead design flaw by refusing to accept a vague explanation. The chain was: explanation couldn't argue the move (goal not met) → prompt had no look-ahead section (render layer thin) → the context was genuinely absent (grounding gap) → `runSparseLookahead` returned null → its exploration logic was wrong for winning positions (generator layer). Stopping at any earlier layer yields a cosmetic fix.

**How to apply:**
1. **Start from the goal of the artifact**, not the rubric. For a coach explanation: does it teach the player an *actionable, board-findable* reason they can recognise and reuse?
2. **Ask if the output achieves it.** Shape ≠ substance.
3. **If not, run a scientific-method root-cause analysis** (see `scientific-method-debugging`) across three layers, tracing upstream: **render** (the prompt text) → **context** (the data fed into it) → **generator** (the code that produced the data). A ruled-out layer redirects upstream; fix the deepest cause.
4. **Treat a missing/null upstream signal as a question, not a fact** — establish ground truth independently (here: solver scores) and ask "should this signal have fired?" If ground truth says the point is decisively arguable but the signal is absent, the bug is in the generator's *logic*, not "an unavoidable sparse case."
5. **You are an agent — observe with tools, don't infer from text.** Run `./visualize_board.sh`, query the solver, or RUN the generator on the failing input rather than reasoning about code in your head.

This thinking is now baked into the `judge-deep-reveals` SKILL.md. See [[project_lookahead_shared_seam]], the retired old-explain eval (reason eval is now `compute.mjs`, D22), [[feedback_prework_discipline]], [[feedback_deep_reveal_product_mindset]].
