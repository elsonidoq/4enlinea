---
name: feedback_workflow_hygiene
description: "Tooling & workflow hygiene — no destructive git for curiosity, quarantine before delete, mark tasks done promptly, use rg/fd/sg, don't pkill the shared server, background subagents can't write"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

Small always-apply hygiene rules the user has set.

- **No destructive git for curiosity.** Never `git stash`/`git reset` to answer a question like "were these tests already failing?". On 2026-05-18 a mid-write `git stash -- <files>` left `.git/index.lock` behind and corrupted the index (mass staged deletions, manual recovery). To check if a failure is pre-existing, read the test and reason from code; if a real baseline is needed, ask the user to run it.

- **Quarantine before delete.** When removing dead code, MOVE files to `src/_quarantine/` (not `git rm`) so the owner can QA the running site; delete only after owner confirmation. (User explicitly requested this for the 6 SURFACE components in Spec 032.)

- **Mark tasks completed promptly.** Call TaskUpdate → `completed` as soon as each task's work is done (tests passing); don't leave stale `in_progress`/`pending`.

- **Use the right search tool** (all installed): `rg <pattern>` for text/regex (never `grep -r` or `find|xargs grep`); `fd <name>` for files (never `find -name`); `sg` (ast-grep) for structural/AST patterns (call sites, arg shapes — for refactor audits); LSP for type-aware go-to-def/find-refs.

- **Don't `pkill` the backend.** Vite dev server and the Node server share a process group in the user's terminal — `pkill -f "server/index.js"` kills both (blank-page Vite failure). Ask the user to restart manually; if you must, start the new process first, then kill the old, and verify Vite still runs.

- **Background subagents get Edit/Write DENIED.** A spawned background `Agent` can't surface a permission prompt, so its writes are blocked outright — it returns "designed everything, wrote nothing." Implement writes in the main session, or have the subagent return a tight ready-to-apply design (file + exact change) that you apply. Reserve background subagents for read/research/analysis. See [[reference_multiagent_orchestration_patterns]].
