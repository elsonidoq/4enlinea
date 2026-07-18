---
name: project-external-auto-backup-commits
description: "An external \"backup\" process auto-commits whatever is staged in this repo, unpredictably — stage only explicit paths, never git add -A, and git status --short right before every commit"
metadata: 
  node_type: memory
  type: project
  originSessionId: beac6818-214f-4294-b8d7-b0f88677a1a0
---

There is an **external process** in this working copy (the owner's own tooling) that periodically runs a `git commit` with a generic message (seen: `backup`, `bacup`, `generate-candidates`, `pricing page`) and **sweeps whatever is currently staged** into it — authored by the repo owner (`Pablo`), not by you.

**Why it bites:** it fires on its own schedule, mid-task, with no signal. During the 2026-07-16 QA-remediation session it:
- swept a fix agent's uncommitted server changes into a batch agent's commit (`2952bf6`) — file-disjoint work, *shared working tree*;
- swept several tasks' code into generic `backup` commits (`fb7cc76`, `07e6ff9`, `faf76cd`, `f1b5305`) so the code lives in a commit not named for it;
- **once left HEAD broken**: it committed a `git mv tts-prompt.json → tts-prompt.es.json` rename *without* the matching per-lang code (which was still uncommitted), so a clean checkout of HEAD had `readTtsConfig()` pointing at a deleted file → every TTS endpoint would 500. The owner's next `backup` commit fixed it.

**How to apply:**
1. **Stage only explicit paths** — `git add connect-four/src/foo.jsx`. **NEVER `git add -A`, `git add .`, `git add <dir>`, or `git commit -a`.** These are the trigger that lets the sweep (or your own agent) grab the owner's in-flight WIP.
2. **`git status --short` immediately before every `git commit`** and confirm only your files are staged; `git restore --staged <path>` any foreign ones first. Put this instruction in every write-capable subagent's dispatch.
3. **Never run two write-capable agents in one working tree** — file disjointness is not isolation, because they share one index. Serialize, or give one `isolation: "worktree"`. (See [[feedback_verify_at_the_source_layer]] "File-disjoint ≠ isolated".)
4. **Don't rebase/amend to "fix" granularity** once the sweep has happened — those generic commits often also contain the owner's unrelated work; a rewrite would destroy it. Verify the code is correct at HEAD and leave the history alone.
5. When you find uncommitted files you didn't create (`settings.json`, `CLAUDE.md`, `server/index.js`, `privacy.html`, `terms.html`, a pricing page, an OI entry), **leave them** — that's the owner's WIP, and it may collide with your task's files (it did for Task 15, which had to defer until the owner committed a `server/index.js` change).

Related: [[feedback_workflow_hygiene]], [[feedback_verify_at_the_source_layer]].
