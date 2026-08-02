---
name: project_repo_worktree_setup
description: Creating a git worktree in this repo — base-ref trap (origin/main is far behind stagging) + .env must be copied in
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ad220ef-6705-44bc-8c78-a29812c83801
  modified: 2026-08-02T01:25:39.832Z
---

Two non-obvious traps when creating a git worktree in this repo (both hit during the
2026-07-02 win-dist work).

**1. Base ref defaults to `origin/main`, which is broken as a base.** The `EnterWorktree`
harness tool (and `superpowers:using-git-worktrees` default) branches from
`origin/<default-branch>` = `origin/main`. But active dev happens on **`stagging`**, which
was ~172 commits ahead of `origin/main` — and files like `connect-four/server/gameSampling.js`
**do not even exist on main**. A fresh worktree from the default base starts from a codebase
that doesn't match anything you're working on.
- **`git config worktree.baseRef head` does NOT fix it** — the harness reads its base ref from
  **Claude Code settings**, not git config, so setting the *git* config is ignored.
- **Cleanest fix (confirmed 2026-07-13):** set `"worktree": { "baseRef": "head" }` in
  `.claude/settings.json` **before** calling `EnterWorktree` — the native tool honors it and
  branches from your current local HEAD (i.e. the branch you're actually on, e.g. `feature/polish`),
  so the worktree already contains your just-committed work. This beats the old `git reset --hard`
  workaround. (Alt fallback if the setting isn't picked up: after creating, `git reset --hard
  <target-HEAD-sha>` from the shared object store, then verify target files are clean at HEAD.)

**2. `server/.env` is gitignored, so a fresh worktree lacks it — and that silently breaks
tests.** The reason-engine tests (and anything importing `reason_engine/lib/boardUtils.mjs`)
call `loadEnv` at **import time** and hard-fail with `ENOENT` on `connect-four/server/.env`.
Result: ~7 reason-engine/test files "fail" for a reason unrelated to your change. Copy
`connect-four/server/.env` from the main checkout into the worktree before running
`npm run test:fast`. (Also run `npm install` — node_modules isn't shared.)

**Nothing copies it for you** (verified at source 2026-07-29): `superpowers:using-git-worktrees`
Step 2 "Project Setup" runs *only* `npm install` / `cargo build` / `pip install` / `go mod download`
— there is no env-copy step anywhere in the skill. `/epics-manager` was amended 2026-07-29 to do it
explicitly (step 4 of its Worktree setup) for **all** of `connect-four/server/.env{,.local,.staging,
.production}` and `connect-four/.env.local*` (the VITE_ side). Any *other* worktree path — the
`EnterWorktree` tool, a hand-run `git worktree add`, another manager command — still leaves you with
zero secrets. **Copy, never symlink** (a symlink makes an edit in one workspace mutate the other),
and never print a value to confirm ([[feedback_never_print_secrets]]) — check the path exists.

**2a. The skill's baseline step suggests the wrong test command here.** Its Step 3 says run
`npm test`; in this repo that pulls in `candidate-generator.test.js` (real c4solver up to 400×/test,
hangs 10+ min — `CLAUDE.md` §Running tests). Always baseline a new worktree with
`cd connect-four && npm run test:fast`.

**2b. `--legacy-peer-deps` is NO LONGER needed (fixed 2026-07-14).** The single peer conflict
was the OI-16 jsdom mismatch (`global-jsdom@^29` peer-wanting `jsdom >=29 <30` while the repo pins
`jsdom@^27`). It was fixed by aligning `global-jsdom` to `^27.0.0` (its major tracks jsdom's), so a
plain strict `npm install`/`npm ci` now resolves cleanly with **no flag and no `.npmrc`** — verified
via `npm ci --dry-run` + `npm run test:dom`. Do NOT re-add `--legacy-peer-deps` or an `.npmrc`
`legacy-peer-deps=true` (it would only mask a future *real* peer conflict). *Historical (pre-fix): a
plain `npm install` aborted with `ERESOLVE`, left `node_modules` empty, and every test died with
`Cannot find package 'react'` — looked like a broken worktree but was a stalled install.* Watch the
real npm exit code, not a piped `tail`'s.

**Why:** worktrees share tracked git objects but not gitignored files (.env, node_modules),
and the tool's base-ref is a harness setting, not something the repo can pin.
**How to apply:** reset the new worktree to stagging HEAD, `npm install`, copy `server/.env`,
then take a `test:fast` baseline before treating any failure as your own.

**2d. That baseline is NOT green, and the 5 reds are NOT a worktree artifact.** As of 2026-08-01 a
clean `npm run test:fast` is **1522 tests / 1517 pass / 5 fail** — `branchInvariance`,
`causalLinksComposers`, `reasonRenderFixes`, `renderCoverageCorpus`, `renderCoverageUniverse`, all
`ENOENT` on `server/scripts/reason_evidence_boards_coverage_*.jsonl`. This is **OI-82**: the tests
build the path at `server/scripts/`, but the corpora live one directory deeper in
`server/scripts/fv_suff/` (`.gitignore:6` is a blanket `*jsonl`, so the tracked ones were
force-added under the other name). It reproduces in the **main checkout too** — do NOT diagnose it as
a missing-gitignored-file worktree gap like §2, and do not "fix" it by copying files in. Record the
number, then judge yourself against **5, not 0**; a *sixth* failure is yours. (Misattributed to the
worktree exactly this way during spec 053.)

**2c. `/speckit-analyze` aborts in a worktree — it is the branch NAME, not the artifacts.**
Its prerequisite script rejects branch names like `worktree-<slug>` (what `EnterWorktree`
generates), so the command fails before reading anything. Confirmed 2026-07-29 while reviewing
spec 051. Do **not** read the failure as a signal about spec/plan/tasks quality — run its
detection passes by hand instead.

**3. Port collisions across concurrent worktrees are now handled — see
`docs/architecture/worktree-conventions.md`.** Always `eval "$(./worktree-ports.sh)"`
from the repo root before starting/killing any server in this or any worktree; it's an
unconditional rule (in `CLAUDE.md`), not gated behind "am I in a worktree."

**4. `res.sendFile()` 500s in a worktree — the `.claude/` path segment.** Worktrees live under
`.claude/worktrees/<branch>/`, so every absolute path built from `__dirname` contains a
**dot-segment**. Express's `res.sendFile` delegates to `send`, whose `dotfiles` option defaults to
`'ignore'` — it refuses any such path with `NotFoundError`, which the global handler surfaces as a
generic **500 `{"error":"Internal server error"}`**. The file exists; an `existsSync()` guard on the
line above passes; the response says nothing useful. It works on the main checkout (no dot-segment),
so it reproduces **only** in a worktree — i.e. only in the normal way feature branches are run here.
Has now bitten **twice**: the legal-page routes (fixed via `LEGAL_PAGE_OPTS`) and
`GET /api/admin/audio/play/:slug` (every coach clip on `/admin/audio` silently unplayable, 2026-07-30).
**Rule: every `res.sendFile()` in this repo passes `{ dotfiles: 'allow' }`.** No traversal risk at
these call sites (hardcoded filename or an already-sanitised token, `requireLocalhost`-gated).
`express.static()` is NOT affected — its dotfiles check applies to the request path relative to
`root`, not to `root` itself. Full write-up: `docs/architecture/worktree-conventions.md`.

Related: [[project_gamesampling_rng_determinism_trap]] (why gameSampling.js edits must be
additive), [[reference_supabase_connection]] (the .env lives at `connect-four/server/.env`),
[[project_lesson_progression_audio_traps]] (the OTHER audio-serving path on the same admin page).
