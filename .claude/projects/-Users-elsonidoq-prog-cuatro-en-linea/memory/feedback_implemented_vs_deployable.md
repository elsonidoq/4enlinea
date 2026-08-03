---
name: feedback_implemented_vs_deployable
description: "The user asks \"is it implemented?\" as a distinct question from \"can it ship\" — answer both explicitly and never let a deploy prerequisite hide inside a \"done\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-08-03T17:14:47.221Z
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

**CORRECTED 2026-08-02: `docs/deployment_steps.md` now EXISTS and is the right destination.** It was
created by commit `e0b0e39` ("Spec 052 working-tree carryover + OI-94/OI-95") *after* this memory's
2026-08-01 "never existed" verification, which was accurate when written and is now stale. As of
2026-08-02 it is ~23KB, carries per-spec entries for specs 052/053/054/055 plus a "Template for new
entries", and `docs/index.md:33` points to it. **Two runbooks now coexist and they are not
interchangeable**: `docs/deployment_steps.md` holds *per-change prerequisites* (migrations, backfills,
content-pool repairs, cache invalidations) — this is where a new epic's entry goes; `docs/deploy-runbook.md`
holds the *standing deploy procedure* (how to push to staging/production, verification steps) plus
spec 053's "Pending Pre-Staging Checks" section. Still **`ls` both paths before writing** rather than
trusting any single source — that habit is what caught this file's own staleness.

**Ordering is the part that gets written wrong, and it is written confidently.** A runbook entry's
"run the migration before/after the code deploy" is a *claim about what is currently deployed*, and
it is routinely asserted rather than checked. Spec 056's entry said "apply the migration first"
because "User Story 2 already shipped and is running in production" — nothing had shipped (unmerged
branch, absent from every remote, 114 commits ahead of `origin/main`), and the code actually live
`SELECT`ed the column being dropped in 21 places. PostgREST **errors** on selecting a missing column
(unlike UPDATE, which silently drops unknown ones — see [[project_user_column_propagation]]), so the
runbook as written was an instruction to take production down. **Before writing any ordering
sentence, check what is deployed** (`git branch -r --contains <sha>`, `git log origin/main..HEAD`)
and grep the *pre-change* code for reads of what you are removing. Destructive-migration default:
deploy the code first, drop afterwards, and say plainly that the drop closes the revert window.

Related: [[feedback_open_issues_destination]], [[project_puzzle_grading_reads_stored_metadata]],
[[feedback_subagent_reports_are_scoped_claims]].
