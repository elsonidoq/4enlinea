You are closing out a working session. Your job is to capture anything worth remembering, keep the architecture docs current, and log deferred issues, staging sign-off items, and deploy prerequisites to their backlogs.

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

## Step 3 — Scan for backlog, staging sign-off, and deploy-prerequisite items

Three more destinations exist for facts that are neither a durable gotcha (memory) nor current-state documentation (architecture docs). Check all three:

**`docs/open_issues.md`** = the deferred/latent-bug backlog. Anything the session surfaced but chose NOT to fix now — a known bug, a latent risk, a "should have but didn't", a shortcut with a cost, a missing capability an agent noticed — belongs here, not in memory. Scan the conversation for: bugs deferred, edge cases knowingly left unhandled, tech-debt or missing-infrastructure notes, "we should X someday" observations, and risks flagged by review/critique but not addressed. For each, add an entry in the existing `OI-N` format (read the file first to match its numbering and structure). Do not duplicate an issue already listed.

**`staging_checks.md`** = the single append-only staging sign-off log across all epics. Any acceptance/QA item the session could NOT fully confirm in local dev — because it depends on a real external provider, a real cross-origin redirect round-trip, a genuinely clean signed-out session, deploy-time config/migrations, or production-like data — belongs here rather than being treated as done. Scan for such items produced this session. For each, append it under that epic's `## Epic N — <title>` heading (create the heading if absent), recording **What / Why staging / Expected / Source** and a `- [ ]` sign-off checkbox, per the "How to add checks" instructions at the top of `staging_checks.md`. Do not duplicate a check already logged.

**`docs/deployment_steps.md`** = the deploy work queue: everything that must happen **around** a deploy rather than inside it. Read that file's "Lifecycle" section before writing to it. Working code is not a shippable change, and this is the gap tests and local QA are structurally blind to. Walk this checklist against the session's actual diff — do not conclude "nothing" without looking, and do not skip the step because the session felt small:

- **Schema migration** — any new file under `connect-four/server/migrations/`?
- **Data migration / backfill** — did anything change the *meaning* of already-stored rows? A new enum/tag value, a changed detector or predicate output, a renamed field, a new non-null column. Rows written under the old behavior do not fix themselves.
- **Content pools** — did a predicate/detector change that existing `puzzles` / `candidates` rows were generated under?
- **Secrets / env vars** — does any new code read an env var that does not yet exist in Railway?
- **Caches** — can `explanation_cache`, TTS/audio artifacts, or anything keyed by text or i18n key serve pre-change content?
- **Ordering** — must the step run before or after the code deploy?

For each prerequisite found, append an entry following that file's "Template for new entries": status, when it runs relative to the deploy, what it blocks, which environments it applies to, the exact command, the verification command **and its success condition**, and rollback (or an explicit "not reversible — back up first"). Measure counts against the real environments rather than reasoning about them (see memory `reference_supabase_connection.md`); if an environment is unreachable, record that explicitly instead of assuming its count. **Measuring is read-only and yours to do — never write to staging or production.** Anything that will not be run now also gets an `OI-N` so it survives this conversation. Do not delete or reset `deployment_steps.md` here: the reset is a production-deploy action, not a session-closeout action.

The routing test: is it a trap that would surprise an agent reading the docs? → memory. Does it change what the docs say is true now? → architecture doc. Is it deferred work / a known-but-unfixed issue? → `docs/open_issues.md`. Is it an acceptance item only verifiable in a staging/prod-like environment? → `staging_checks.md`. Must it be *run* around a deploy (migration, backfill, env var, cache purge, dashboard setting) → `docs/deployment_steps.md`.

## Ordering rule for compaction

If `MEMORY.md` needs compacting (size hook fires, or it exceeds 175 lines / 20 KB), run `/compact-memory` only AFTER Steps 1–3 are fully done — first save the session's memories, doc updates, and backlog/staging entries, then compact. Never compact with unsaved memories pending.

## Step 4 — Report

List:
- Memories written or updated (slug + one-line summary of what was captured)
- Architecture doc sections updated (file + what changed and why)
- `docs/open_issues.md` entries added (OI-N + one-line summary)
- `staging_checks.md` checks added (epic heading + what needs staging verification)
- `docs/deployment_steps.md` entries added (title + what must run, when, and in which environments) — or an explicit "none required; checked the migration/backfill/env-var/cache/content-pool checklist against the diff". State plainly whether the session's work is **implemented** and whether it is **deployable**; those are different questions and the honest answer is often "yes and no". If the file already held PENDING entries from earlier work, say so — the branch is not fully shipped while it is non-empty.
- Anything skipped and why (e.g. "already in memory/arch doc/backlog", "ephemeral", "in git history")
