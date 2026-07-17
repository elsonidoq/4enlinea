---
name: feedback_concurrent_agents_clobber
description: The user runs several agents on this repo at once — two agents in one working tree overwrite each other SILENTLY (no conflict markers), and line numbers go stale within the hour; use isolation:'worktree'
metadata:
  node_type: memory
  type: feedback
  originSessionId: e6ae0484-0c2a-40fc-8f58-250ef499d103
---

**The user routinely has a second agent working this repo/branch while you are.** Assume it, don't discover it. Three things follow, all observed on 2026-07-16.

**1. One working tree + two agents = silent lost updates, not merge conflicts.** Git cannot help: both write the same files, last writer wins, no marker. That session's `generate-tts.js` work was built on a Read taken before another agent committed `48fc5d5` to the *same function* — the edits clobbered that agent's implementation outright, and the only reason nothing went red is trap #3 below. Conversely `server/index.js` gained a `/pricing` route mid-task that later vanished, uncommitted, without explanation.
- **How to apply:** for any change that touches a hot file (`server/index.js` above all, plus `src/pages/AdminAudioPage.jsx`, `src/screens/*`), run the implementation agent with `isolation: 'worktree'` and merge after. That is what protected the 446-file `coach.spoken.*` rename. `worktree.baseRef=head` is already set in `.claude/settings.json`, so worktrees branch from your real HEAD (see [[project_repo_worktree_setup]]).
- Before merging back, `git status` the target: **git refuses to merge into a file with uncommitted local changes** — that refusal is a feature, and it's the only automatic protection you get. Never `stash`/`commit` the other agent's in-flight work to get past it; ask the user, whose agent it is.

**2. Line numbers go stale inside a single session.** `ChallengeScreen.jsx:536` became `:549` and `OnboardingMissionScreen.jsx:56` became `:62` within an hour, because commits landed underneath. A subagent's "corrected" line numbers were right and the ones read earlier were wrong. **Cite by symbol or a `grep` command, never by line number**, in plans and prompts especially — CLAUDE.md's rule is not theoretical here, it fires routinely.

**3. Nothing tells you a test stopped running.** The deleted-by-someone test file that would have caught the clobbering was **silently skipped** — `node --test` given a *list* skips a missing path with exit 0 and `fail 0`. Verify a test still runs by grepping the run output for its own case names; see `docs/architecture/testing-conventions.md` §`test:fast`.

**Why:** parallel agents are how the user works; the failure mode is invisible rather than loud, so the mitigation has to be structural (worktree isolation) rather than vigilance.
