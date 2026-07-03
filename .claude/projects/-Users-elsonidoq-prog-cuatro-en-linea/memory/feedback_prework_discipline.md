---
name: feedback_prework_discipline
description: "Working discipline — answer questions before editing, go empirical early, audit every code path before an epic, review a spec before planning"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

The user's discipline rules for how to approach work before diving in.

- **Answer before editing.** When a user message is phrased as a question, respond with the answer in text FIRST; only then edit files or run tools. (User explicitly requested this.)

- **Empirical first.** When investigating a bug, run code / make API calls / write a test as soon as a reproduction path is plausible, rather than extended theoretical reasoning. **Why:** in the heatmap-bug session, 40+ rounds of mental bitboard/parity analysis were resolved in two bash commands once the real movestring was in hand. Reserve theory for when there's no way to test directly, or to explain *why* after the empirical result.

- **Audit all code paths before an epic.** When an epic touches a feature with multiple entry points (coach messages, notifications), read EVERY participating file, not just the primary path. `rg "coach\."` and read every call site — secondary paths (hint phrases, `handleSequenceClick`, server-side keys) become open questions if missed. Account for each in scope or NOT-included.

- **Spec review before plan.** After `/speckit-specify`, spawn a **Sonnet** subagent to review the spec against `docs/best_practices_spec_driven_development.md` (outcome-oriented goals, explicit I/O contracts, IF-THEN rules, Not-Included completeness, testability, completeness vs the epic) with severity-tagged findings, BEFORE `/speckit-plan`. Caught 6 blocking issues in the Epic 1a spec. Spec errors are cheapest to fix pre-plan.

Related: [[feedback_speckit_epic_scoping]], [[feedback_spec_existing_apis]].
