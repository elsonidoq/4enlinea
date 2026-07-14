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

Related: [[feedback_prework_discipline]], [[feedback_spec_existing_apis]], [[feedback_explanation_and_question_style]], [[feedback_agent_and_ui_workflow]].


---

## (merged from `feedback_scope_by_diff` — TRIGGER when asked to plan, estimate scope, size a task, or choose process weight (brainstorm/writing-plans/just-do-it) — scope is a diff you MEASURE against the running system, not a whole you imagine)

**TRIGGER: any request to plan, "determine the scope", size/estimate a task, or pick how heavy a process to use (brainstorming vs writing-plans vs just-do-it). Read this BEFORE proposing an approach.**

Estimate scope by **measuring the diff against the running system**, not by enumerating what a complete solution would contain. Empirical-first applies to *scoping*, not just debugging.

Before recommending any process heavier than "just do it":
1. **Name the load-bearing assumption** in one sentence: "This is big *because* ___."
2. **Kill it with an artifact, not an argument** — generate one real output, grep the one call site, diff the new thing against what already exists. Minutes, not a plan.
3. **Count what CHANGES, not what exists.** Existing, unchanged plumbing (auth, cache, retry, tests, endpoints) is evidence *for* simplicity — never list it as work.
4. **Match process to residual unknowns, not surface area.** After looking: 0 open decisions → do it; N known steps → writing-plans; genuine unresolved forks → brainstorm. "I can write a long paragraph about it" is NOT an unknown.
5. **Take "drop-in replacement" / "just swap X" literally.** Such framing is a strong prior that seams already match — confirm it cheaply, don't re-derive the integration from zero.

**Why:** In the explain-move-llm → reason-engine session, the first proposal was "big scope, needs brainstorming," then "writing-plans," and the real work was swapping one function call at a single seam — all the plumbing already existed. The failure: reasoning from the JSON *envelope* instead of a concrete *output value* (the `[zone:]` tags in one real `mechanism` string were the whole answer), estimating additively instead of differentially, and using process weight as a hedge for a scoping decision I hadn't actually done. The user got there by looking at one sample output and asking the falsifiable "am I wrong?" — falsify-simple-first.

**How to apply:** When the user asks to plan or scope, spend the first pass actively hunting for the simplest possible shape ("could this be a one-function swap?") and produce the cheapest artifact that would disprove it, before enumerating anything. Length of description ≠ amount of change. This is [[feedback_occam_principled_extrapolation]] (one small mechanism over many parts) applied to process selection, and the empirical-first / audit-before-acting discipline of [[feedback_prework_discipline]] applied at scoping time. See also [[feedback_llm_output_root_cause]] — a missing/assumed fact is a question to observe with tools, not a fact.
