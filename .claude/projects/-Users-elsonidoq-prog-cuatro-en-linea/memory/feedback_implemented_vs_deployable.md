---
name: feedback_implemented_vs_deployable
description: "The user asks \"is it implemented?\" as a distinct question from \"can it ship\" — answer both explicitly and never let a deploy prerequisite hide inside a \"done\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-08-02T01:25:18.369Z
---

The user separates **implemented** (code complete and verified) from **deployable** (no outstanding
steps around the deploy), and will keep re-asking until the distinction is stated cleanly. Observed
across spec 052: the question "can we consider the epic implemented?" was asked four times, each
time probing whether new information had changed the answer.

**Why:** an epic can be fully implemented and still unshippable — a widened detector leaves live rows
stale, a new enum value needs a backfill, a new env var must exist in Railway first. Folding that
into "done" hides work that only surfaces in production. The user would rather hear "yes and no"
with the boundary drawn than a clean "yes" that isn't.

**How to apply:** when reporting completion, answer both questions in the same breath and name what
separates them. Scope answers to what was asked — if the question is "is it done *locally*", answer
that, and keep the deploy discussion separate rather than relitigating it. Don't re-argue caveats
already accepted; state them once, then treat them as settled. Deploy prerequisites belong in the
runbook plus an `OI-N` so they survive the conversation; this is now a required step in
`/coordinate-implementation` (Step 8). Measuring against live environments is fine
and expected; **writing** to staging or production is the user's call, never the agent's.

**The runbook is `docs/deploy-runbook.md`. `docs/deployment_steps.md` DOES NOT EXIST and never has**
— `git log --oneline --diff-filter=A -- docs/deployment_steps.md` returns empty on every branch
(verified 2026-08-01). That phantom path is nonetheless named as a real destination by this memory's
own earlier wording, by `/coordinate-implementation`'s Step 8, and by spec 053's FR-014c + quickstart
+ tasks — so an agent that trusts any of them either writes to a file nobody reads or silently drops
the requirement. It bit spec 053 US2: the pending real-browser audio check was routed to
`docs/deployment_steps.md` by the spec text, and the implementing agent had to notice the file was
absent and redirect it into `docs/deploy-runbook.md` (new "Pending Pre-Staging Checks" section at the
top). **`ls` the runbook path before writing a deploy prerequisite to it, and prefer
`docs/deploy-runbook.md` over whatever path a spec names.**

Related: [[feedback_open_issues_destination]], [[project_puzzle_grading_reads_stored_metadata]].
