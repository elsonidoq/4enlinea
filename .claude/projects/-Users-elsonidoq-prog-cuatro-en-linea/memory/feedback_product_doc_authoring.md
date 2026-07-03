---
name: feedback-product-doc-authoring
description: "How the user wants MVP product docs authored — requirements not implementation, defer to planning, anchor to llm_feedback rows, reconcile against authoritative docs"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 333f715f-3260-440f-abcd-2036f4c28b6f
---

When writing or refining product docs in `docs/mvp/`, keep them **implementation-free**: state *what must be true* (requirements/principles), and defer *how/where* (component design, client-vs-server enforcement, SDK choice) to a separate planning session. State principles as **requirements, not chosen solutions** (e.g. "invalid output must never reach the user," not "validate server-side before cache"). If implementation detail must be kept, quarantine it as clearly-labeled non-binding prior art.

**Why:** the docs are consumed by a separate planning agent that derives the implementation plan. Baking in solutions pre-empts that agent's job and goes stale as code drifts; the user wants the product file to give context and constraints, not conclusions.

**How to apply:**
- **Anchor each principle to concrete `llm_feedback` rows** (id + movestring + human_note) as regression fixtures the rebuilt system must no longer fail. The user explicitly valued this for grounding.
- **Reconcile against `product_vision.md` and `product_decisions.md` before writing**, and surface conflicts as decisions to ask about. `product_decisions.md` is authoritative and **overrides `product_vision.md`** on conflict (its header says so). Many "open questions" are already answered there — read it first to avoid asking redundant questions.
- **Verify current-state claims against the actual code**, not against older docs — the user flagged a doc that read as a plan but whose Phase 1 was already shipped. Treat older docs as potentially stale.
- Resolve genuine product decisions via AskUserQuestion (multiple choice), then fold answers in and empty the "Open product decisions" section.

Related: [[project-coach-deep-reveal-product-docs]], [[feedback-empirical-first]], [[feedback_prework_discipline]].
