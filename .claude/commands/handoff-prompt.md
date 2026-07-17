# Handoff Prompt Generator

Write a self-contained handoff prompt for a fresh agent that will continue work you have context on.

## What to produce

A single markdown block the user can copy and paste as a prompt to a fresh agent. The prompt must be **immediately actionable**: the next agent should be able to start without asking clarifying questions.

## The invariant

**Reference what's durable, carry what's ephemeral.** The next agent can read files; it cannot read this conversation. So: never restate what a committed file already says accurately (point at the file instead), and never omit a decision or fact that exists only in the conversation (carry it verbatim — it is about to be lost).

## Step 1 — Identify the handoff type

Answer two questions before writing anything:

1. **Where does the authoritative context live?**
   - **On disk** (spec.md / plan.md / tasks.md / epic file cover the design accurately) → follow the *Artifacts-on-disk* branch.
   - **In this conversation only** (the design, task list, or key decisions were worked out here and never written down) → follow the *Conversation-only* branch.
   - Mixed is common: use the conversation-only branch for the undocumented parts, references for the rest.
2. **What must the next agent produce?**
   - **Implementer** → give a start task ID and acceptance criteria per task.
   - **Planner (plan mode)** → give a goal statement, the settled design, and explicit scope fences; do NOT give a start task.
   - **Reviewer / debugger** → give the claim to verify or symptom to explain, plus how to reproduce.

## Step 2a — Artifacts-on-disk branch

Include only context the next agent **cannot derive by reading the spec, plan, tasks, or source files**:

- **Entry point**: branch name, working directory, test command, and current pass/fail baseline (run the tests now to get the real numbers).
- **Start task**: which task ID to begin at (the first unchecked `[ ]` in tasks.md).
- **Runtime surprises**: things that differ from what the plan says — e.g., a function that was already removed, an import that needs updating, a variable name collision, a null-guard the plan forgot to mention.
- **Cross-task dependencies within the next phase**: if two tasks touch the same call site and doing them in isolation would create a double-construction or a broken intermediate state, say so explicitly.
- **Dead-code traps**: helpers that look unused but aren't, or helpers that look used but are actually dead and safe to delete — only when this is non-obvious from reading the code.
- **Anything the plan's migration table gets wrong or omits**: wrong line references, missing call sites, incorrect replacement patterns — only if you discovered a discrepancy while implementing.

Do NOT repeat anything the next agent will find in tasks.md, plan.md, spec.md, or the source files themselves. If the plan already covers it accurately, do not restate it.

Keep this branch's prompt **under 400 words**. If there is nothing non-obvious beyond the mechanical setup, say so explicitly rather than padding.

## Step 2b — Conversation-only branch

The conversation is the artifact that's about to be lost. The prompt must carry:

- **Mandatory reads first**: if the project has an agent preamble or mandatory-read docs for this area (e.g. `docs/architecture/*-AGENT-PREAMBLE.md`), open the prompt by directing the agent to read them — reference, never re-type their constraints.
- **Goal statement**: what to build/plan and the motivating case, in 2–4 sentences.
- **Settled decisions — do not reopen**: every design judgment made in the conversation, stated as locked, including what was **explicitly deferred or rejected**. The fresh agent's dominant failure mode is not missing context — it is helpfully re-deciding things (adding back the feature you deferred, "improving" the abstention rule). Fence the scope.
- **The task list** (if one was agreed): carry it verbatim, with dependency order.
- **Non-obvious facts**: same categories as the artifacts branch (entry point, baseline, traps), plus any file paths, memory files, or fixture sources the agent could not guess exist.
- **Escalation rule**: for tasks with open-ended cost (sourcing test fixtures, hunting counterexamples), permit the agent to mark an item PENDING-with-question rather than burn time or fabricate.

No hard word cap — length scales with how much context is conversation-only. But the invariant still applies: anything a committed doc covers accurately gets a pointer, not a restatement.

## Shared rules (both branches)

1. **Run the real test baseline now** (project test command; here: `cd connect-four && npm run test:fast`) and state the actual numbers. Never guess or say "tests should pass".
2. **Verify every path you cite exists** (files, docs, memory files, scripts) before putting it in the prompt. A stale path burns the fresh agent's first twenty minutes.
3. **Lead with the goal, close with the mechanical setup** (branch, dir, test command, baseline). Implementer handoffs also state the start task up front.
4. **One target command only**: if the prompt targets a specific slash command (e.g. `/speckit-specify`), never instruct the agent to conditionally run a second command — it can't. Pre-answer the likely clarification questions inline instead.
5. **Gate expensive or judgment-heavy final steps on the user**: eval runs, deploys, and acceptance calls belong to the user unless they explicitly delegated them; plan them as a final user-approved step.
