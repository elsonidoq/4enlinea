---
name: feedback-epic-vs-speckit-scope
description: "When auditing an epic doc that feeds speckit, only fix things the per-epic pipeline structurally can't catch; leave the rest"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 57444168-0988-4f85-98d9-67fe50bdff48
---

When an epic doc (e.g. `docs/mvp/epics.md`) is the input to the speckit pipeline (`speckit-specify → plan → tasks`), do **not** push every audit finding back into the epic. Most details are correctly resolved *during* the pipeline.

**Why:** each speckit cycle runs **per-epic and in isolation**, and treats the epic text as ground truth. So the epic only needs to carry what the pipeline cannot recover on its own.

**How to apply** — only three classes of finding belong at the epic level:
1. **Factual errors in the epic** — the spec author trusts the epic and won't re-audit; a wrong premise propagates silently (e.g. "PaywallModal has two importers" when there are three — the third, `DeepRevealButton.jsx`, is reused by Epic 2b and keeps a live Stripe path).
2. **Cross-epic contracts** — a decision made in Epic A's spec run is invisible to Epic B's spec run; shared agreements must live in the epic doc or a Gap doc (e.g. the i18n key-namespace scheme; "one shared move-quality scorer module" feeding both 2a and 3b).
3. **Mockup-vs-Gap conflicts** — when "authoritative" visuals contradict a product decision, `specify` may faithfully build the wrong thing unless the epic says "don't follow the mockup here" (e.g. mockup timeline shows all moves but Gap 12 = user moves only; mockup lock sheets show Stripe "Upgrade to Pro" copy but Gap 19 = waitlist UpgradeModal).

Everything else — behavior bounded by epic + a Gap, implementation behind an already-named interface (store methods, component props, module signatures), single-epic decisions (migration shape, RLS/grants, response field lists) — leave to specify/clarify/plan/tasks. Flagging it in a pre-spec sweep is fine; baking it into the epic over-constrains the specs.

Related: [[project-new-mvp-epics]], [[project-speckit-workflow]], [[feedback-agent-model-selection]].
