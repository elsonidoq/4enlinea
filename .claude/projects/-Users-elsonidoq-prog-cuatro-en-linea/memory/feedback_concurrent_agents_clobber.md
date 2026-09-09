---
name: feedback_concurrent_agents_clobber
description: The user runs several agents on this repo at once — two agents in one working tree overwrite each other SILENTLY (no conflict markers), and line numbers go stale within the hour; use isolation:'worktree'
metadata:
  node_type: memory
  type: feedback
  originSessionId: e6ae0484-0c2a-40fc-8f58-250ef499d103
  modified: 2026-07-30T13:44:04.842Z
---

**The user routinely has a second agent working this repo/branch while you are.** Assume it, don't discover it. Three things follow, all observed on 2026-07-16.

**1. One working tree + two agents = silent lost updates, not merge conflicts.** Git cannot help: both write the same files, last writer wins, no marker. That session's `generate-tts.js` work was built on a Read taken before another agent committed `48fc5d5` to the *same function* — the edits clobbered that agent's implementation outright, and the only reason nothing went red is trap #3 below. Conversely `server/index.js` gained a `/pricing` route mid-task that later vanished, uncommitted, without explanation.
- **How to apply:** for any change that touches a hot file (`server/index.js` above all, plus `src/pages/AdminAudioPage.jsx`, `src/screens/*`), run the implementation agent with `isolation: 'worktree'` and merge after. That is what protected the 446-file `coach.spoken.*` rename. `worktree.baseRef=head` is already set in `.claude/settings.json`, so worktrees branch from your real HEAD (see [[project_repo_worktree_setup]]).
- Before merging back, `git status` the target: **git refuses to merge into a file with uncommitted local changes** — that refusal is a feature, and it's the only automatic protection you get. Never `stash`/`commit` the other agent's in-flight work to get past it; ask the user, whose agent it is.

**2. Line numbers go stale inside a single session.** `ChallengeScreen.jsx:536` became `:549` and `OnboardingMissionScreen.jsx:56` became `:62` within an hour, because commits landed underneath. A subagent's "corrected" line numbers were right and the ones read earlier were wrong. **Cite by symbol or a `grep` command, never by line number**, in plans and prompts especially — CLAUDE.md's rule is not theoretical here, it fires routinely.

**3. Nothing tells you a test stopped running.** The deleted-by-someone test file that would have caught the clobbering was **silently skipped** — `node --test` given a *list* skips a missing path with exit 0 and `fail 0`. Verify a test still runs by grepping the run output for its own case names; see `docs/architecture/testing-conventions.md` §`test:fast`.

**4. The coordinator is one of the agents — `git stash` while a subagent works is a clobber you inflict on yourself.** 2026-07-30: to check whether a backfill's rejections predated the feature, the coordinator ran `git stash push -- <4 core files> && node <solver script> && git stash pop` **while a batch subagent was editing the same tree**. The solver hung on shutdown (a documented trap — see [[reference_inline_node_scripts]]), the 2-minute timeout killed the command mid-chain, and `stash pop` never ran: four core files sat reverted while the subagent kept working against them. Caught only by checking `git status` afterwards.
- **How to apply:** never `stash`/`checkout`/`reset` a tree that has a live subagent in it — do the comparison in a scratch clone or a throwaway worktree. Never chain a restore behind something that can hang; run it as its own command and **verify with `git stash list` + `git status`**, since a killed chain leaves no error to notice.

**Why:** parallel agents are how the user works; the failure mode is invisible rather than loud, so the mitigation has to be structural (worktree isolation) rather than vigilance.

**5. A concurrent lane can silently DELETE fields from a frozen record, and a naive diff hides it behind key-order noise.** 2026-08-05 (spec 058 closeout): the page data file `groundingDiffCases.js` held an immutable historical record (`attempts[0]` = what shipped to staging). A concurrent lane's uncommitted edit had quietly reduced it from 8 fields to 3 — `text`, `offeredSpecs`, `emittedSpecs` and the rest simply gone — and the coordinator's own append then rewrote the file, preserving the loss. `JSON.stringify(old) !== JSON.stringify(new)` "detected" it, but flagged **every** attempt equally because a round-trip also reorders keys, so the real deletion was invisible among 16 identical-looking warnings.
- **How to apply:** when a file carries a frozen/append-only record and another lane may have touched it, diff **structurally**: compare sorted **keysets** first, then per-field values. `JSON.stringify` equality on objects is a false negative generator here (key order) *and* a false positive generator (a real loss buried in order noise) — this is the same JSONB key-order drift trap as [[project_lesson_answer_set_invariant]]. Restore the frozen part verbatim from `git show HEAD:<path>` rather than reconstructing it, then re-verify field-by-field.
