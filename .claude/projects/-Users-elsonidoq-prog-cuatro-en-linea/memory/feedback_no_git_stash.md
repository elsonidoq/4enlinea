---
name: feedback-no-git-stash
description: Never run git stash (or any destructive git command) to check baseline test state — it corrupted the index and staged hundreds of files as deleted
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e8e668e1-a18e-4405-8051-18f4cd326ba0
---

Do not run `git stash`, `git reset`, or any other destructive git command to answer a curiosity question (e.g. "were these tests already failing?"). On 2026-05-18, running `git stash -- <files>` failed mid-write and left `.git/index.lock` behind, corrupting the index and causing nearly every file in the repo to appear staged for deletion. The user had to manually fix git.

**Why:** git stash that fails mid-write can leave the index in a partially-written state. The lock file blocks all subsequent git operations. Even after removing the lock, the corrupted index showed mass staged deletions.

**How to apply:** If you need to know whether a test failure is pre-existing, read the test file and reason from the code — do not run git commands that modify state. If a baseline comparison is truly needed, ask the user to do it themselves.
