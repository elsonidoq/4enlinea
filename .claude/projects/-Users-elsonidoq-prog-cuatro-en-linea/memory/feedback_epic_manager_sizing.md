---
name: feedback_epic_manager_sizing
description: when to use writing-plans vs an epic-file + bespoke speckit manager command (the routing-permalinks-manager pattern)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 77704dde-f0b6-4568-9a6c-74b59787c427
---

The user's decision rule for **how heavyweight** to make a planning effort:

1. **Default to a plan first**, written "thinking in the end-game"; convert to a spec only if scope
   turns out too big.
2. **An epic file + a bespoke speckit *manager command*** (the `routing-permalinks-manager` /
   `fv-grounding-manager` pattern: stateful orchestrator that drives epic→spec→plan→tasks with
   Opus-critique → AskUserQuestion → Sonnet-fix gates) is justified **only when there are ≥2 user
   stories, each with ≥7 tasks.** Below that bar, use `superpowers:writing-plans` with a good prompt.
3. This is stricter than (and stacks on top of) the speckit sweet-spot in
   `docs/best_practices_spec_driven_development.md` (8+ tasks, ≥1 open decision, multiple subsystems):
   that doc decides whether to run speckit at all; this rule decides whether to wrap it in a dedicated
   manager command.

**Why:** the manager command is real overhead to author; it pays off only for multi-story epics that
span sessions and need consistent verification gates (e.g. fragile code + a load-bearing contract doc).

**How to apply:** before proposing a manager command, decompose into candidate user stories and count
tasks; if it doesn't clear ≥2 stories × ≥7 tasks, recommend writing-plans instead. The user also wants
the genuinely-open design decisions surfaced explicitly (as `/clarify` questions) rather than buried as
"settled." See [[feedback_spec_review_before_plan]] and [[feedback_product_doc_authoring]].
