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

**Then, you MUST end the partition proposal with a summary table** (this is required, not optional):

| Batch | # Tasks | Why grouped together |
|-------|---------|----------------------|
[one row per batch: batch number, number of tasks.md tasks it covers, and a one-line rationale for grouping those stories/tasks into this batch]

**Present the partition to the user for visibility, then proceed immediately to Step 3.** Do not wait for approval — the batches are shown so the user can follow along and interrupt if needed, but implementation begins right away.

---

## Step 3 — Execute sequentially

Implement the batches one at a time, starting immediately after presenting the partition in Step 2.

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
- **Out-of-scope discoveries** — anything you found that is a real bug, latent defect, or
  quality gap but was NOT yours to fix: pre-existing breakage you worked around, something
  broken in a file you touched for another reason, a defect whose fix exceeds this epic's
  scope. Report each as an open-issue candidate with the evidence you actually saw (the
  failing command, the wrong value, the missing column) — not a suspicion. Do NOT fix it;
  scope creep inside a batch is worse than a filed issue. Do NOT stay silent because "it
  wasn't my task" — an unreported finding is a finding lost, and you are the only agent who
  will ever be in this code with this context. Say "None" if genuinely nothing.
- Non-obvious constraints the next agent will hit if it doesn't know about them
- **Deploy prerequisites** — anything that must happen *around* a deploy rather than inside it, or
  "None" if genuinely nothing. Working code is not the same as a shippable change. Ask specifically:
  - **Schema migration** — did you add a file to `server/migrations/`?
  - **Data migration / backfill** — did you change the *meaning* of data already stored? A new enum
    or `direction` value, a renamed tag, a changed detector output, a new non-null column. Rows
    written under the old behavior do not update themselves.
  - **Content pools** — did you change a predicate or detector that puzzle/candidate rows were
    generated under? Existing rows were derived by the old code and may now be stale or invalid.
  - **Secrets / env vars** — does any new code read an env var that does not yet exist in Railway?
  - **Caches** — can `explanation_cache`, TTS/audio artifacts, or any keyed cache serve content
    generated under the old behavior?
  - **Ordering** — must the step run before or after the code deploy?
  Say what you verified versus what you only reasoned about; if you measured, give the numbers.
```

---

## Step 4 — Summary

After all batches have run, output a summary with:

1. **What was built** — for each batch: files created/modified and which user stories they satisfy
2. **Tasks completed** — list of task IDs marked done
3. **Open items** — anything a sub-agent flagged as incomplete, skipped, deferred, or stubbed, **plus every out-of-scope discovery** any sub-agent reported (both drawn from each batch's `## Handoff context`). An out-of-scope discovery is nobody's next batch, so it reaches the user only if you carry it here — it is the item most likely to be silently dropped.
4. **Verification steps** — the acceptance scenarios the user should spot-check manually
5. **Deploy prerequisites** — every step that must happen around the deploy (collected from each
   batch's `## Handoff context`), or an explicit "none — this ships with the code alone". Do not
   omit this section; "nothing to do" is a finding that should be stated, not an absence.

### Persist open issues to `docs/open_issues.md`

After presenting the summary, record any **genuine deferred/latent issue** from the "Open items" list into `docs/open_issues.md` (create the file if it does not exist). This file is the human-triageable backlog of known-but-deferred bugs and quality gaps — distinct from auto-memory (trigger-first gotchas). 

- **What qualifies**: a real latent bug, quality gap, or consciously scoped-out piece of work that someone might fix later. 
- **What does NOT qualify**: ephemeral notes (test flakes, one-off environment quirks, "re-run X to seed data") — those belong in a memory or nowhere. A finished stub that the next batch already completed is not an open issue.
- **Do not duplicate**: read the existing `docs/open_issues.md` first and skip anything already tracked.
- **Entry format** (append, next sequential `OI-N`):

```
## OI-N — <one-line title>

**Status**: deferred (reason / scoped out of <spec>)
**Area**: <files or subsystem>
**Discovered**: <spec id + date>

<what's wrong, with a concrete repro if one exists>

**Why deferred**: <why we're not fixing it now>
**If picked up**: <concrete first step; cross-ref related memory/docs>
```

If you created or appended entries, add a one-line pointer to `docs/open_issues.md` in `docs/index.md` under "Other" if one is not already present.

---

## Step 5 — Code review

After the summary, run a static code review over the **full accumulated branch diff** (all batches together). This catches a class of defects the browser-driven QA in Step 6 is structurally blind to: correctness bugs on paths QA never exercises, duplicated/reinvented logic across batches (each sub-agent only saw a handoff summary, not the prior diffs), violated `docs/architecture/` conventions, and dead code.

1. **Invoke the `code-review` skill** using the Skill tool (`skill: "code-review"`). Let it review the current working-tree/branch diff. Do **not** pass `--fix` — findings are reported so you can triage them yourself.
   - If the diff is large, use a higher effort level (e.g. `code-review high`); otherwise the default is fine.

2. **Present the findings to the user for visibility**, grouped most-severe first. For each finding include: the file:line, a one-sentence summary of the defect, and the concrete failure scenario. This is informational — do not wait for a response.

3. **Triage and apply fixes yourself.** Fix the genuine, clearly-correct findings directly in the source and note what changed. Findings you consciously decide not to fix (too risky, out of scope, or low-value) become open-issue candidates in Step 7 — carry them forward.

Report a short outcome: which findings were fixed and which were deferred (with a one-line reason). If the review surfaced nothing, say so and proceed.

---

## Step 6 — QA and Bug Fix

After code review, spawn a QA sub-agent to perform a browser-driven review and fix any bugs found. Proceed directly — do not wait for user confirmation.

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

---

## Step 7 — Persist QA- and review-surfaced open issues

After the QA sub-agent returns, collect from **three** sources and append every **genuine deferred/latent issue** (same qualifies / does-not-qualify test as Step 4's "Persist open issues") to `docs/open_issues.md` using the same `OI-N` entry format:

1. The QA sub-agent's `### Remaining issues` section.
2. **Step 5's declined code-review findings** — the ones you consciously chose not to fix. Step 5 says these "become open-issue candidates in Step 7"; this is where they land. If you skip them here, that instruction points nowhere.
3. Any **out-of-scope discovery** from Step 4's Open items that you have not already filed.

Read the file first and skip anything already tracked. Pre-existing issues the QA agent flags as "out of scope / not a regression" still belong here if they're real latent bugs — that is exactly what this backlog is for.

Verify each finding at source before filing it — a sub-agent's report is a claim, not a fact, and a wrong `OI-N` wastes the next person's time more than a missing one does.

Report to the user which `OI-N` entries were added (or "no new open issues" if none qualified).

---

## Step 8 — Capture deployment prerequisites in `docs/deployment_steps.md`

A green test suite means the code works. It does not mean the change can ship. Anything that alters
the *meaning* of already-stored data leaves every existing row wrong until something migrates it,
and that step is invisible to every check performed so far — tests run against fixtures, QA runs
against local. This step exists because that gap is systematically missed.

**Do not skip this step when you believe there is nothing to do.** Reaching "none required" by
actually checking is the point; reaching it by not looking is the failure mode.

**Read `docs/deployment_steps.md` before writing to it** — specifically its "Lifecycle" section. That
file is a work queue consumed by whoever drives the next staging or production deploy, not an archive.
Your role here is **producer**: you append entries and you never run one against staging or
production, never mark an entry `DONE`, and never reset or prune the file. (The reset — clearing all
per-change entries — happens only once every entry is DONE in production, and is a deploy action.)
If the file already contains PENDING entries from earlier work, leave them alone and say so in your
report: a non-empty file means the branch is not fully shipped.

### 1. Collect

Gather the **Deploy prerequisites** section from every batch's `## Handoff context`, plus anything
you or the QA agent found later. Then walk the checklist yourself against the accumulated branch
diff — sub-agents see only their own slice, so a prerequisite created by the *interaction* of two
batches (batch 2 widens a predicate; batch 4 stores rows derived from it) appears in neither handoff:

- **Schema migration** — new files in `server/migrations/`?
- **Data migration / backfill** — new enum/`direction`/tag value, changed detector or predicate
  output, renamed field, new non-null column? Rows written under the old behavior do not fix
  themselves.
- **Content pools** — did a predicate change that `puzzles` / `candidates` rows were generated
  under? Existing rows came from the old code.
- **Secrets / env vars** — new env var read by server code, absent from Railway?
- **Caches** — `explanation_cache`, TTS/audio artifacts, or anything keyed by text or i18n key that
  can serve pre-change content.

### 2. Measure, don't assume

For every candidate prerequisite, **get the number against the real environments** (local, staging,
production) rather than reasoning about it. Use the connection conventions in memory
`reference_supabase_connection.md`.

Two failure modes to avoid, both observed in practice:

- **A count taken mid-epic is stale by the end of it.** If a later batch changes the predicate, an
  earlier "0 rows affected, no-op" measurement is worthless. Re-measure against the **final** code.
- **"Already verified / no repair needed" is the highest-risk claim available here** — it asserts
  something about live data while doing the least checking. Re-run it yourself.

If an environment is unreachable, **record that explicitly** — never assume its count matches
another environment's or is zero.

### 3. Write the runbook

Append an entry to `docs/deployment_steps.md` (create it from the template at the bottom of that
file if it does not exist) for each prerequisite: status, when it runs relative to the code deploy,
what it blocks, the exact command, the verification command **and its success condition**, and
rollback (or an explicit "not reversible — back up first").

If the step needs a script that does not exist, **write it**, and follow the house conventions:
a real `--help` that exits 0 before any required-arg validation; `--dry-run` as the default posture;
an explicit target flag with no default so the environment is always named; a guard that the env
file's project ref matches the environment named; a typed confirmation before writing, twice for
production; and a distinct exit code for "drift found" so it can gate a deploy.

**Never write to staging or production yourself.** Measuring is read-only and yours to do; mutating
live data is the user's call. Dry-run it, report what it would change, and stop.

### 4. Report

Tell the user plainly whether the epic is **implemented** (code complete and verified) and whether
it is **deployable** (no outstanding prerequisites). These are different questions and the honest
answer is often "yes and no". Any prerequisite that will not be run now also gets an `OI-N` entry so
it survives past this conversation.

If you added an entry, ensure `docs/index.md` has a pointer to `docs/deployment_steps.md` under
"Other".
