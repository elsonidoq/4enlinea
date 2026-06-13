You are closing out a working session. Your job is to capture anything worth remembering and keep the architecture docs current.

## Step 1 — Scan the conversation for memory-worthy facts

Review the full conversation and identify anything that fits one of these types:

- **user**: new preferences, working style, or knowledge gaps revealed
- **feedback**: corrections or confirmations of non-obvious behavior
- **project**: decisions made, bugs fixed, state changes, new invariants
- **reference**: new pointers to external systems or locations

Skip anything already in memory, derivable from reading the code, or ephemeral to this session.

For each candidate: check `memory/MEMORY.md` first — if a related memory exists, update it rather than creating a duplicate.

Write new memories to `memory/<slug>.md` and add a one-line entry to `memory/MEMORY.md`.

## Step 2 — Scan for architecture doc updates

Check whether any of the following changed during the session:

- New endpoints added or changed → `docs/architecture/api-conventions.md`
- Server code patterns changed → `docs/architecture/server-conventions.md`
- Frontend patterns changed → `docs/architecture/frontend-conventions.md`
- Schema or migrations changed → `docs/architecture/db-schema.md`
- Data shapes or query patterns changed → `docs/architecture/data-model.md`
- New test patterns → `docs/architecture/testing-conventions.md`
- New import/module patterns → `docs/architecture/index-conventions.md`

For each affected file: read the current content, then add or update the relevant section. Do not rewrite sections that are still accurate — only touch what changed.

## Step 3 — Report

List in one short paragraph:
- Memories written or updated (name + one-line summary)
- Architecture doc sections updated (file + what changed)
- Anything you skipped and why
