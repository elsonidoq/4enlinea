---
name: feedback-spec-review-before-plan
description: After writing a spec, run a critical subagent review before proceeding to plan — catches contract and scope issues cheaply
metadata:
  type: feedback
---

After `/speckit-specify` produces a spec, spawn a Sonnet subagent to review it against the SDD best practices (`docs/best_practices_spec_driven_development.md`) before running `/speckit-plan`. This caught 6 blocking issues in the Epic 1a spec (wrong Board API, missing message field, ambiguous multi-select activation logic, token name mismatch, missing reuse directive) that would have propagated into tasks and implementation.

**Why:** Spec errors are cheapest to fix before the plan phase. A plan built on a broken spec produces broken tasks, which produce broken code. A 2-minute subagent review saves multiple rounds of rework downstream.

**How to apply:** After `/speckit-specify` completes, run a subagent with this prompt structure:
- Read the spec and `docs/best_practices_spec_driven_development.md`
- Check: outcome-oriented goals, explicit I/O contracts, IF-THEN rules, Not Included completeness, testability, scope discipline, completeness vs. the epic doc
- Report findings with severity (blocking / advisory / nitpick) and suggested fix per item
- Use Sonnet (not Opus) — sufficient quality, faster
