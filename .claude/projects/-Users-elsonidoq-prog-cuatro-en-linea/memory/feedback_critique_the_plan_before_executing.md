---
name: feedback_critique_the_plan_before_executing
description: Owner asks for a critique-and-fix agent on a written plan BEFORE dispatching executors; it catches tasks that test things which do not exist
metadata:
  type: feedback
---

**Trigger: you have written a multi-task plan and are about to dispatch subagents to execute it.**
Run a **critique-and-fix agent over the plan first**. The owner asked for this explicitly
(2026-09-08, full-app QA): *"before starting the coordinator pattern executing in the tasks each in
it's own subagent, launch a critique & fix agent for the current plan. The agent must make sure all
functionalities are covered."*

**Why**: a plan is a set of claims about the codebase, and the ones you *authored* rather than
*harvested* are wrong by default. On the QA plan the critique found **24 coverage gaps and 21 wrong
factual claims out of ~30 checked**. Two mattered enormously:

- A task instructed the executor to *"use **undo** at least twice"* — **`GameScreen` has no undo
  control.** That task could only have produced a fabricated pass or a bug report about a feature
  that was never built, while the controls that DO exist went untested.
- The plan asserted "four of the five checkout CTAs disappear at paid tier" and built pass criteria
  on it. Only three are tier-gated. The executor would have hit the fourth still locked and
  mis-diagnosed it — when in fact *that* was the real bug (a paying user can never open a paid set;
  `docs/open_issues.md` OI-177).

Both are the same failure: **a wrong plan does not fail loudly, it produces confident wrong
results.** Executors trust the plan and report against its criteria.

**How to brief the critique agent** (this shape worked):
- Give it **write access to the plan file only** — it fixes in place, it does not execute, does not
  run the app, does not fix app bugs it notices (it reports those separately).
- Tell it to derive the app's true surface from the **codebase**, not from the plan: enumerate every
  route/screen from the registry + URL map, every `onClick`/`go()` affordance, every registered API
  route — then diff that against the plan's coverage.
- Make it **spot-check every `file:line` claim** in the plan and correct or mark `UNVERIFIED` in
  place. Line numbers drift; locate by symbol.
- Give it the **explicit out-of-scope list** or it will helpfully widen scope into excluded areas.
- Have it append a coverage-audit section recording old→new for every corrected claim, so the
  corrections are reviewable rather than silently applied.

**Re-verify what it marks `UNVERIFIED` if you can.** It marked three claims unverifiable because it
was forbidden to run anything — two of those were live probes *I* had already run, and one was the
test baseline, which a single command settled. An `UNVERIFIED` from a static auditor is a request
for a measurement, not a dead end. See [[feedback_verify_at_the_source_layer]],
[[feedback_plan_can_contradict_its_own_research]].
