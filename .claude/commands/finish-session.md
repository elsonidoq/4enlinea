You are closing out a working session. Your job is to capture anything worth remembering and keep the architecture docs current.

## The two-destination rule

**Memory** = trigger-first gotchas. Things that would bite an agent who only reads the architecture docs. Non-obvious traps, counterintuitive decisions, cross-cutting connections. NOT derivable from the code or git history alone.

**Architecture docs** (`docs/architecture/`) = up-to-date project state. Prescriptive patterns, invariants, contracts, module shapes. These are the authoritative description of *how the system works right now*. They must be kept current as the code evolves.

The test: "If someone reads all the architecture docs and then looks at the code, will they be surprised?" → if yes, it's a memory. "Does the architecture doc no longer describe what the code does?" → if yes, update the doc.

Do NOT put into memory:
- Anything already fully described in an architecture doc
- "We shipped X" records — git has those
- Spec/plan/tasks-done metadata
- Change logs with file + line references (they rot)

Do NOT skip the architecture doc update just because you wrote a memory about it. The two destinations serve different purposes and are both required.

## Step 1 — Scan the conversation for memory-worthy facts

Review the full conversation and identify anything that fits one of these types:

- **user**: new preferences, working style, or knowledge gaps revealed
- **feedback**: corrections or confirmations of non-obvious behavior — record both corrections ("don't do X") AND validations ("yes, exactly that")
- **project**: non-obvious gotchas, cross-system traps, deploy-time requirements, open bugs not yet fixed
- **reference**: new pointers to external systems, file locations, or resources

For each candidate, ask: *Would an agent who read only the architecture docs and the code be surprised by this?* If no → skip it (it belongs in an arch doc, not memory). If yes → it's a memory.

Check `memory/MEMORY.md` first — if a related memory exists, update it rather than creating a duplicate.

Write new memories to `memory/<slug>.md` using this frontmatter:
```
---
name: <kebab-case-slug>
description: <one-line summary>
metadata:
  type: feedback | project | reference | user
---
```

Add a one-line entry to `memory/MEMORY.md` under the most specific applicable trigger section. Entry format: `- [Title](file.md) — hook` (hard cap: 150 chars). The MEMORY.md is trigger-first — place entries under the section whose heading describes WHEN you'd need this information (e.g. "Before writing a DB migration", "When debugging auth"). If no section fits, add the entry under `## General behavioral rules` (for feedback) or `## Reference — project architecture` (for reference/project).

## Step 2 — Scan for architecture doc updates

The architecture docs describe the current state of the system. Update them whenever the session changed what is true about the code.

Check whether any of the following changed during the session:

- New endpoints added or contract changed → `docs/architecture/api-conventions.md`
- Server code patterns changed (new helpers, new middleware, new conventions) → `docs/architecture/server-conventions.md`
- Frontend patterns changed (new hooks, new state patterns, auth flow) → `docs/architecture/frontend-conventions.md`
- Schema or migrations changed → `docs/architecture/db-schema.md`
- Data shapes or query patterns changed → `docs/architecture/data-model.md`
- New test patterns or test files → `docs/architecture/testing-conventions.md`
- New import/module patterns → `docs/architecture/index-conventions.md`

For each affected file: read the current content, then add or update the relevant section. Do not rewrite sections that are still accurate — only touch what changed. The goal is that after this update, an agent reading only the architecture docs would have an accurate picture of the system.

## Step 3 — Report

List:
- Memories written or updated (slug + one-line summary of what was captured)
- Architecture doc sections updated (file + what changed and why)
- Anything skipped and why (e.g. "already in memory/arch doc", "ephemeral", "in git history")
