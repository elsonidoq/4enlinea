You are a coordinator agent. Your job is to orchestrate the implementation of a feature spec by spawning a sequence of focused sub-agents, each responsible for a coherent group of user stories.

The spec to work on is passed as: $ARGUMENTS

If no argument is given, read CLAUDE.md to find the current plan path and derive the spec directory from it.

---

## Step 1 — Load context

Read the following, in order:

1. The spec directory passed as argument (or derived from CLAUDE.md):
   - `spec.md` — user stories, acceptance scenarios, functional requirements
   - `plan.md` — design decisions and component breakdown (if it exists)
   - `tasks.md` — dependency-ordered task list (if it exists)

2. Architecture docs relevant to what the spec touches:
   - `docs/architecture/frontend-conventions.md` if the spec touches frontend
   - `docs/architecture/api-conventions.md` if the spec touches API endpoints
   - `docs/architecture/server-conventions.md` if the spec touches server code
   - `docs/architecture/data-model.md` if the spec touches data shapes
   - Any other architecture doc that is clearly relevant

3. Product context:
   - `docs/mvp/epics.md` — to understand cross-epic contracts and dependencies

4. Memory index at the path shown in your system context (MEMORY.md) — load any memories that are relevant to the spec's domain.

---

## Step 2 — Propose a partition

Analyze the user stories in the spec. For each story, identify:
- What files it touches
- What shared infrastructure it requires (tokens, base components, DB migrations, etc.)
- Which other stories it depends on
- Whether it shares its primary implementation file with another story

Then group the stories into sequential **implementation batches**. Each batch:
- Is implementable without depending on uncommitted work from a later batch
- Has shared prerequisites included in the earliest batch that needs them
- Groups stories that modify the same primary file (e.g., two stories that both require changes to the same component belong in the same batch)
- Is scoped to a meaningful amount of work — aim for **5–10 tasks per batch**

**Startup cost rule:** Each sub-agent pays a fixed cold-start cost (loading context, reading architecture docs, orienting to the codebase). A batch must justify that cost. As a concrete heuristic: if a batch contains fewer than ~4 tasks, ask yourself whether it can be merged into the adjacent batch without creating a dependency conflict. If it can, merge it.

**Fold pure setup into the first consumer:** If a batch only creates infrastructure (a new module, a migration, a shared utility) that the immediately following batch depends on and extends, merge the two into one batch — unless the setup alone is large enough to fill a substantial agent session. A module + its tests that the next batch immediately imports is not a standalone batch; it's the opening section of the next batch.

**Present your proposed partition to the user.** For each batch, list:
- Which user stories it covers
- What it builds (files created or modified)
- Why those stories are grouped together
- What the batch depends on from prior batches

**Wait for the user to approve, modify, or reject the partition before proceeding.**

---

## Step 3 — Execute sequentially

Once the user approves, implement the batches one at a time.

For each batch, spawn a sub-agent using the Agent tool with:
- `subagent_type`: omit (general-purpose)
- `model`: `"sonnet"`
- `prompt`: a self-contained implementation brief (see format below)

**Wait for the sub-agent to finish before spawning the next one.** Do not run batches in parallel.

After each sub-agent completes:
1. Parse its output for the `## Handoff context` section and save it as a secondary reference.
2. Invoke the `handoff-prompt` skill using the Skill tool (`skill: "handoff-prompt"`). This skill runs tests, reads tasks.md, compares plan vs. reality, and produces a tight, self-contained prompt capturing non-obvious facts the next agent needs. The skill's output becomes the `[handoff from previous batch]` in the next sub-agent prompt (replacing the sub-agent's own `## Handoff context` if the two differ — the skill output is authoritative).
3. Read `tasks.md` and mark completed tasks using TaskUpdate. Base completions on what the sub-agent reports having built.

### Sub-agent prompt format

Each sub-agent prompt must be fully self-contained — the sub-agent has no memory of this conversation. Include:

```
## Context

You are implementing part of the feature described in [spec path].

### Handoff from previous batch
[Paste the ## Handoff context section from the prior sub-agent's output verbatim,
or "This is the first batch — nothing has been built yet." for batch 1]

### Architecture rules to follow
Read the following before writing any code:
- [list the 1-3 architecture docs most relevant to this batch]

### Cross-epic contracts (if any)
[Paste the locked enum/API contract section from the spec verbatim if this batch touches it]

---

## Your task

Implement the following user stories from the spec:

### User Story N — [title]
[Paste the full user story text and acceptance scenarios from spec.md verbatim]

### User Story M — [title]
[Paste the full user story text and acceptance scenarios from spec.md verbatim]

---

## Functional requirements that apply to this batch

[Paste the FR-XXX entries from spec.md that are directly needed by these user stories]

---

## Success criteria for this batch

[Paste the SC-XXX entries from spec.md that apply to this batch]

---

## Done when

- All acceptance scenarios above pass (verify manually or via tests)
- No TypeScript/lint errors on touched files
- Tasks marked complete in tasks.md: [list task IDs from tasks.md that this batch covers]

---

## Handoff context (required)

At the very end of your response, output a section titled "## Handoff context".
Include:
- Every file you created or modified, with a one-line description of what it contains
- Key decisions or patterns you established that the next batch must follow (naming, structure, APIs)
- Anything incomplete, deferred, or left as a stub for the next batch to finish
- Non-obvious constraints the next agent will hit if it doesn't know about them
```

---

## Step 4 — Summary

After all batches have run, output a summary with:

1. **What was built** — for each batch: files created/modified and which user stories they satisfy
2. **Tasks completed** — list of task IDs marked done
3. **Open items** — anything a sub-agent flagged as incomplete, skipped, deferred, or stubbed (drawn from each batch's `## Handoff context`)
4. **Verification steps** — the acceptance scenarios the user should spot-check manually

---

## Step 5 — QA and Bug Fix

After the summary, spawn a QA sub-agent to perform a browser-driven review and fix any bugs found.

**Wait for the user to confirm they want to proceed with QA before spawning this agent.**

Spawn a sub-agent using the Agent tool with:
- `subagent_type`: omit (general-purpose)
- `model`: `"sonnet"`
- `prompt`: a self-contained QA brief using the format below

### QA sub-agent prompt format

```
## Context

You are a QA agent performing a final browser-driven review of a newly implemented feature.

### Feature being reviewed
Spec: [spec path]

### Product context
Read the following documents before starting your review:
- [spec path]/spec.md — user stories, acceptance scenarios, functional requirements
- [spec path]/plan.md — design decisions (if it exists)
- [spec path]/tasks.md — task list (if it exists)
- docs/mvp/epics.md — cross-epic contracts and feature dependencies
- docs/mvp/product_decisions.md — product decisions and constraints (if it exists)

Read ALL of these before opening the browser.

### Authentication — skip auth button
In dev mode (`npm run dev`), the AuthModal has a hidden dev-only button labeled **"🛠 Dev: skip auth"** that calls `supabase.auth.signInAnonymously()`.
It only appears when `import.meta.env.DEV` is true (Vite dev server).

**When you encounter an auth wall during review:**
1. Look for the "🛠 Dev: skip auth" button at the bottom of the auth modal — it's styled with a dashed border and may be easy to miss below the "Continue with email" / "Dismiss" buttons.
2. Click it to sign in anonymously and close the modal.
3. If the button isn't visible, verify you're on the Vite dev server (`localhost:5173`) and not the production build.

This is the intended developer bypass. Do NOT try to work around auth by editing code — use this button.

### What was just built
[Paste the full ## What was built section from the Step 4 summary verbatim]

### Open items flagged by implementers
[Paste the ## Open items section from the Step 4 summary verbatim, or "None reported." if empty]

---

## Your task

1. **Open the browser** using the chrome-devtools MCP tools. Navigate to the app's local dev URL (typically http://localhost:5173 or check package.json for the dev port).

2. **Exercise every user story and acceptance scenario** listed in spec.md. For each one:
   - Describe what you tested
   - Record the outcome: PASS / FAIL / PARTIAL
   - If FAIL or PARTIAL, note the exact symptom

3. **Look for regressions** beyond the spec:
   - Broken navigation or layout shifts on pages adjacent to the new feature
   - Console errors or network failures unrelated to the spec
   - Mobile/responsive breakage if the feature has any UI

4. **Fix every bug you find.** For each fix:
   - State the root cause in one sentence
   - Apply the fix directly to the source files
   - Re-test in the browser to confirm the fix resolves the issue

5. **Iterate** — after fixing, re-run the full acceptance scenario checklist once more to make sure fixes didn't introduce new issues. Repeat until all scenarios pass.

---

## Done when

- Every acceptance scenario in spec.md is PASS
- No console errors caused by the new feature
- All fixes have been re-verified in the browser

---

## Report (required)

At the very end of your response, output a section titled "## QA Report".

Structure it as:

### Acceptance scenarios
| Story | Scenario | Result |
|-------|----------|--------|
[one row per acceptance scenario tested]

### Bugs found and fixed
For each bug:
- **Bug**: [one-sentence description of the symptom]
- **Root cause**: [one-sentence explanation]
- **Fix**: [files changed and what was changed]
- **Verified**: yes / no

### Remaining issues
[Any issues that could not be fixed, with a reason. "None." if everything is clean.]
```
