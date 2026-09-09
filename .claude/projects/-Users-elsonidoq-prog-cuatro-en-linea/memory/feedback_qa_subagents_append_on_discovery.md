---
name: feedback_qa_subagents_append_on_discovery
description: A QA/coordinator subagent must append each finding to disk the moment it confirms it — a stalled agent that batched its writes loses everything
metadata:
  type: feedback
---

**Trigger: you are dispatching subagents that produce findings (QA sweeps, audits, review passes).**

Instruct every subagent to **append each finding to the shared output file the MOMENT it confirms
it — never buffer to the end of its run.** Make the agent the writer; do not have it hand findings
back for the coordinator to write.

**Why this is load-bearing, not tidiness**: during the 2026-09-08 full-app QA, one subagent hit the
harness watchdog (`no progress for 600s`) and was killed. It had executed a real state change (a
Paddle rollback) and then **written nothing** — its whole group's work would have been lost if it
had followed a buffer-then-write pattern. The agents that appended incrementally lost nothing when
they ended. Cost of the stall was one re-dispatch, not a re-run of the group.

Corollaries learned in the same run:
- **Re-verify a stalled agent's side effects yourself** before re-dispatching. The rollback *had*
  succeeded; re-running it would have been harmless there, but the general case is not — check the
  DB/filesystem for what actually happened rather than assuming the agent died before or after its
  mutation.
- **Tell the re-dispatched agent what is already done**, precisely, or it redoes destructive steps.
- **Findings land chronologically, not grouped by area.** That is fine — regroup at the end. Do not
  delay a write to keep the file tidy.
- A subagent may **overwrite a shared summary block** with only its own group's view (one rewrote
  the run's Summary to "Blockers: 0, Major: 1" — its own tally). Give agents an *append-only*
  section and have the coordinator own any global summary, or re-derive the summary at the end.
- Shell-only tasks (log sweeps, test-suite runs) are **cheaper and more reliable done by the
  coordinator directly** than dispatched — no browser, no stall risk, and it keeps a concurrent DB
  writer away from the QA account.

See [[feedback_subagent_reports_are_scoped_claims]], [[feedback_concurrent_agents_clobber]].
