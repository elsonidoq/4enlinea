---
name: feedback_one_command_pipeline_extend_dont_add
description: Prefer extending the existing command/pipeline over adding new scripts or strategy modes; one command should produce everything for the next stage
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4f6802b0-e9e6-4ad7-83f4-13466dbbe726
---

When designing data-generation / pipeline tooling, the user strongly prefers **extending an existing
command over adding a new script or a new CLI mode.** Concrete corrections from the opening-sampling
brainstorm (2026-07-05):
- Rejected a proposed new `TOOLS/` script AND a proposed new `--strategy opening` — "The `--strategy`
  must not change. All boards must be generated with just one command. Why would we have more than one
  command to generate boards?"
- The intended shape: the ONE existing command (`select_boards --strategy coverage`) runs **two internal
  phases** (a deterministic opening step, then the existing harvest) into one output — "one command
  generates everything for the next step."

**Why:** fewer moving parts for the operator; the pipeline stays `select_boards → compute --llm → grade`
with no extra invocations to remember or sequence.

**How to apply:** default to a new internal phase/branch inside the current entry point, reusing its
emit/classify/write plumbing, rather than a sibling script or a new strategy value. When you think a new
`--strategy`/script is warranted, propose it as "extend the existing command" first and justify any new
surface. Related instincts: reuse over special-casing ([[feedback_occam_principled_extrapolation]]),
and don't let it override soundness — the user also insisted sampled cases stay **solver-verified**
blunders and cover **both players**, not just the convenient one.
