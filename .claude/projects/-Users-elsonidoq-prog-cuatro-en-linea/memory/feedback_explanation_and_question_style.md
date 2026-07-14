---
name: feedback_explanation_and_question_style
description: "How to pitch explanations and clarifying questions — non-internals audience, alternatives carry a recommendation, no vague questions"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 39d6b86e-b328-4b30-bb5a-a0664d538973
---

Consistent guidance the user asserted repeatedly in the last sessions (`39d6b86e` L394, `e7115548` L97/L106, `0e333f7b` L7, `78882183` L85, `380dfcca` L43). The user has a strong technical background ([[user_profile]]) but is often **not** familiar with this codebase's internals, so:

- **Explain for someone who has not read the internals.** Name the concept, then give the plain-language mechanism. Abstract away internal helper names (`P()`-style) when walking through a design ("Make the code more abstract and comprehensible for me that I'm not familiar with the internals").
- **When presenting alternatives, always attach a concrete recommendation per option** — not a neutral menu ("Write the alternatives… make a recommendation: what do you suggest to do for each alternative").
- **Clarifying questions must be self-explanatory.** Vague or jargon-laden questions get bounced ("I don't understand your question" — said twice on the same question). When a question is rejected, rephrase with concrete terms and a worked example rather than repeating it.

**Why:** terse, internals-laden explanations and ambiguous questions cost round-trips and stall the work.

**How to apply:** before sending an explanation or a clarifying question, reread it as someone who has not seen the code. If it leans on internal symbol names or unstated assumptions, rewrite. See [[feedback_prework_discipline]], [[feedback_agent_and_ui_workflow]].


---

## (merged from `feedback_product_doc_authoring` — How the user wants MVP product docs authored — requirements not implementation, defer to planning, anchor to llm_feedback rows, reconcile against authoritative docs)

When writing or refining product docs in `docs/mvp/`, keep them **implementation-free**: state *what must be true* (requirements/principles), and defer *how/where* (component design, client-vs-server enforcement, SDK choice) to a separate planning session. State principles as **requirements, not chosen solutions** (e.g. "invalid output must never reach the user," not "validate server-side before cache"). If implementation detail must be kept, quarantine it as clearly-labeled non-binding prior art.

**Why:** the docs are consumed by a separate planning agent that derives the implementation plan. Baking in solutions pre-empts that agent's job and goes stale as code drifts; the user wants the product file to give context and constraints, not conclusions.

**How to apply:**
- **Anchor each principle to concrete `llm_feedback` rows** (id + movestring + human_note) as regression fixtures the rebuilt system must no longer fail. The user explicitly valued this for grounding.
- **Reconcile against `product_vision.md` and `product_decisions.md` before writing**, and surface conflicts as decisions to ask about. `product_decisions.md` is authoritative and **overrides `product_vision.md`** on conflict (its header says so). Many "open questions" are already answered there — read it first to avoid asking redundant questions.
- **Verify current-state claims against the actual code**, not against older docs — the user flagged a doc that read as a plan but whose Phase 1 was already shipped. Treat older docs as potentially stale.
- Resolve genuine product decisions via AskUserQuestion (multiple choice), then fold answers in and empty the "Open product decisions" section.

Related: [[project_explain_system]], [[feedback_prework_discipline]], [[feedback_prework_discipline]].


---

## (merged from `feedback_heatmap_terminology` — Heatmap" is ambiguous in this codebase — a PoC feature used that name for something unrelated to the Sparring column-score overlay.)

Do not use "heatmap" as a shorthand for the Sparring Hint's column-score overlay (the 7-tile row showing per-column scores). The word is ambiguous: an earlier PoC feature in this codebase was also called "heatmap" but did something different.

**Why:** User had to ask for a precise definition mid-audit because the term was unclear.

**How to apply:** Use "column-score overlay" or "column-score row" when referring to the Hint UI element that shows per-column solver scores above the board.
