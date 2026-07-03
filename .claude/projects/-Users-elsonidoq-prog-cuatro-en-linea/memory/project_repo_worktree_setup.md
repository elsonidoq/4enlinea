---
name: project_repo_worktree_setup
description: Creating a git worktree in this repo — base-ref trap (origin/main is far behind stagging) + .env must be copied in
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ad220ef-6705-44bc-8c78-a29812c83801
---

Two non-obvious traps when creating a git worktree in this repo (both hit during the
2026-07-02 win-dist work).

**1. Base ref defaults to `origin/main`, which is broken as a base.** The `EnterWorktree`
harness tool (and `superpowers:using-git-worktrees` default) branches from
`origin/<default-branch>` = `origin/main`. But active dev happens on **`stagging`**, which
was ~172 commits ahead of `origin/main` — and files like `connect-four/server/gameSampling.js`
**do not even exist on main**. A fresh worktree from the default base starts from a codebase
that doesn't match anything you're working on.
- **`git config worktree.baseRef head` does NOT fix it** — the harness tool reads its base
  ref from Claude Code settings, not git config, so setting the git config is ignored.
- **Fix:** after creating the worktree, `git reset --hard <stagging-HEAD-sha>` (the commit is
  in the shared object store), then verify `gameSampling.js` exists and the target files are
  clean at HEAD before starting.

**2. `server/.env` is gitignored, so a fresh worktree lacks it — and that silently breaks
tests.** The reason-engine tests (and anything importing `reason_engine/lib/boardUtils.mjs`)
call `loadEnv` at **import time** and hard-fail with `ENOENT` on `connect-four/server/.env`.
Result: ~7 reason-engine/test files "fail" for a reason unrelated to your change. Copy
`connect-four/server/.env` from the main checkout into the worktree before running
`npm run test:fast`. (Also run `npm install` — node_modules isn't shared.)

**Why:** worktrees share tracked git objects but not gitignored files (.env, node_modules),
and the tool's base-ref is a harness setting, not something the repo can pin.
**How to apply:** reset the new worktree to stagging HEAD, `npm install`, copy `server/.env`,
then confirm a green `test:fast` baseline before treating any failure as your own.

Related: [[project_gamesampling_rng_determinism_trap]] (why gameSampling.js edits must be
additive), [[reference_supabase_connection]] (the .env lives at `connect-four/server/.env`).
