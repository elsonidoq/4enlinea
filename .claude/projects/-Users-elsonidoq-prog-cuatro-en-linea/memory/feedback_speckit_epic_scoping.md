---
name: feedback_speckit_epic_scoping
description: How heavyweight to make a planning effort — plan vs speckit vs epic+manager-command; what belongs in an epic doc vs the pipeline; hard algorithms stay in spec; handoff prompts run one command
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

The user's rules for sizing a planning effort and what to put where. **Why:** pipeline/manager overhead only pays off past a real complexity bar; below it, it's pure cost.

- **Plan vs speckit vs epic+manager.** Default to a **plan first** (`superpowers:writing-plans`), written "thinking in the end-game"; convert to a spec only if scope turns out too big. Run the **full speckit pipeline** only when all three hold: (1) 8+ tasks, (2) ≥1 unresolved design decision that changes the implementation shape, (3) multiple subsystems (server+frontend+DB or a shared API contract). A **bespoke speckit *manager command*** (the `fv-grounding-manager` pattern: stateful orchestrator with Opus-critique → AskUserQuestion → Sonnet-fix gates) is justified **only at ≥2 user stories × ≥7 tasks each**. Below each bar, step down a level. Skip speckit entirely for single-component UI, admin tools, or any feature whose "NOT included" list is longer than its scope. **Merge trigger:** if Epic B's plan would need rewriting after Epic A resolves a brainstorming question, merge them into one run. Full decision table: `docs/best_practices_spec_driven_development.md` → "Epic Sizing".

- **What belongs in an epic doc** (input to per-epic, isolated speckit runs that treat the epic as ground truth) — only three classes: (1) **factual errors in the epic** (a wrong premise propagates silently — e.g. "PaywallModal has two importers" when there are three); (2) **cross-epic contracts** (a decision in Epic A's run is invisible to Epic B's — e.g. i18n key-namespace, a shared move-quality scorer); (3) **mockup-vs-Gap conflicts** (say "don't follow the mockup here" or `specify` faithfully builds the wrong thing). Everything else — behavior bounded by epic+Gap, work behind an already-named interface, single-epic decisions (migration shape, RLS/grants, response field lists) — leave to specify/clarify/plan/tasks; baking it into the epic over-constrains.

- **Hard-to-derive algorithms stay in spec.md**, even though SDD best practice moves "how" to plan.md. When an algorithm is significant research effort (e.g. the claimeven simulation FR-004), its presence in the spec locks the approach; don't flag it as a "how vs what" violation.

- **Handoff prompts run ONE command.** In a prompt targeting a specific slash command, never include "if X, run `/speckit-clarify`" — the agent executes one command and can't branch. Pre-answer likely clarifications inline so the target command doesn't stall.

Related: [[feedback_prework_discipline]], [[feedback_spec_existing_apis]], [[feedback_product_doc_authoring]], [[reference_multiagent_orchestration_patterns]].
