---
name: User profile
description: Technical background and collaboration style of the user.
type: user
originSessionId: b0f55ba3-5d89-4123-8903-e23bf84def14
---
Strong technical background — comfortable reading C++ bitboard code, React hooks, and low-level solver algorithms. Approaches bugs empirically (uses browser debugger, captures network requests, verifies board states). Asks precise questions and validates hypotheses before accepting them. Prefers concise responses without filler.

**Curates git commits himself, in parallel.** During an agent session he will commit work-in-progress independently, with terse one-word messages (`spanish`, `spec 049 done`, `new ai difficulty`), sometimes reorganizing history. Do NOT auto-commit, rebase, or rewrite branch topology; leave working-tree changes uncommitted for him to fold into his own commits unless he explicitly asks you to commit. When git state looks surprising mid-session (files you thought were uncommitted are now committed under a terse message), it's him, not a bug — verify with `git log` rather than re-doing work.

## Git hygiene (merged from `feedback_workflow_hygiene`)

- **Commit only when asked — this drifts, it isn't ignorance.** Restated 2026-07-16 after three unrequested commits in one session (a behavior change, a test, a logging tweak). It drifts most when a change *feels* finished. Default: make the change, say what it does, leave it in the working tree. "Merge this" / "commit this" is an instruction, never an inference. It matters doubly because a second agent may share the tree ([[feedback_concurrent_agents_clobber]]) — an unasked commit can sweep up their in-flight work.
- **No destructive git for curiosity.** Never `git stash`/`git reset` to answer a question like "were these tests already failing?". On 2026-05-18 a mid-write `git stash -- <files>` left `.git/index.lock` behind and corrupted the index (mass staged deletions, manual recovery). To check whether a failure is pre-existing, read the test and reason from the code; if a real baseline is needed, ask him to run it.
- **Quarantine before delete.** When removing dead code, MOVE files to `src/_quarantine/` (never `git rm`) so he can QA the running site; delete only after he confirms.
