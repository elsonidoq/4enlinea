---
name: project_live_envs_have_no_real_users
description: "Staging and production carry no real users yet — their data is disposable, so live-repair safety machinery is wasted work"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e1e8e7c-6f43-4699-a8f4-728afb96ebf6
  modified: 2026-08-03T19:38:55.361Z
---

**Trigger: you are about to plan or build careful live-data machinery** — an idempotent in-place repair script, a retire-vs-repair disposition, attempt-history preservation, a backfill, or a multi-phase deploy choreography — **because rows already exist on staging or production.**

Stop. As of **2026-08-03** the app has **not launched** and nobody uses either environment. Owner, verbatim: *"Forget about production data for now. Nobody is using production or staging, we can drop the entire database and regenerate it if needed. Focus on developing these fixes as simple as possible, and documenting what should be done in production considering that the app is not being used yet."*

**Why:** almost every "this is a live user-facing defect, not a code-quality one" framing in this repo's epics and `docs/open_issues.md` silently assumes a real user is hitting the bad row. That premise is false today, and it is what inflates a one-line fix into a spec with a `--dry-run` repair script, a `docs/deployment_steps.md` runbook, and a deploy-ordering constraint. The rows are regenerable; the *code* still has to be correct, but the choreography around the data does not.

**How to apply:**
1. Prefer **regenerate from scratch** over **surgically repair**, whenever regeneration is simpler. Data loss on staging/production is acceptable and recoverable.
2. Production work becomes **documentation**: write what the owner should do in `docs/deployment_steps.md` and stop. Do not build tooling whose only purpose is making a live repair safe.
3. A pending deploy backlog is not an ordering puzzle. "Deploy current code, then regenerate the content" resolves most of what would otherwise be a per-spec sequencing constraint. (`docs/deployment_steps.md` held four PENDING entries — specs 052/053/054/056 — with live running pre-056 code; under this rule that dissolves rather than gating anything.)
4. This does **not** weaken code correctness. Detectors, guards, tests and grading logic must still be right — see [[feedback_wrong_test_is_part_of_the_bug]]. It is only the live-data choreography that collapses.
5. **This expires at launch.** Owner: *"I will let you know when we release, then we will have to plan how to do these features so we don't break any relevant user data."* Once real users exist, every constraint above inverts. The whole point of Epic 10 (`docs/epics/pre-launch-mvp-epic.md`) is to reach that launch.

This is also written into the project's `CLAUDE.md` §"Staging and production databases are disposable (pre-launch)" at the owner's request — that section is authoritative; this memory is the trigger-first pointer to it.

Distinct from [[feedback_implemented_vs_deployable]], which still holds: per-change prereqs still get written down in `docs/deployment_steps.md`. The difference is that the entry is now a *note to the owner*, not a safety-engineered procedure. Cross-ref [[feedback_generate_puzzles_for_local_qa]] (empty pools are routine work, never a blocker) and [[project_puzzle_grading_reads_stored_metadata]] (the stale-metadata defect whose urgency this downgrades).
