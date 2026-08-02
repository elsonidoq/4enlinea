---
name: project_file_mtime_is_never_evidence
description: "File mtimes in this repo record the checkout, not the write — every generated artifact shares one timestamp; date things from git history or an in-band generated_at field"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ed43e4a-f425-4b94-a1c8-c8ecaef77223
  modified: 2026-07-29T18:26:12.671Z
---

**Never date a tracked artifact by its filesystem timestamp in this repo.** `mtime` records the last
checkout, not when the content was produced. Two forces guarantee it: worktree/branch checkouts rewrite
every file's mtime, and the external auto-backup process ([[project_external_auto_backup_commits]]) touches
files on its own schedule.

Measured 2026-07-29 in a fresh worktree:
```
$ stat -f '%Sm' -t '%Y-%m-%d %H:%M' public/audio/lessons/*.mp3 | sort | uniq -c
 348 2026-07-29 11:25
$ stat -f '%Sm' -t '%Y-%m-%d %H:%M' public/audio/coach/*.mp3 | sort | uniq -c
 217 2026-07-29 11:25
```
Every mp3 in the repo — 565 files — carried one identical timestamp: the moment the worktree was created.

**Why it bites rather than just being useless:** mtime looks like a plausible answer, so it produces a
confident *wrong* one. The 217 coach clips above are the known-stale fleet (215 synthesized 2026-06-19,
weeks before the `gpt-4o-mini-tts` switch on 2026-07-14) — yet their mtime is indistinguishable from clips
generated days ago. A currency check resting on mtime certifies stale artifacts as current, and any
downstream "do we need to regenerate?" decision inherits that false verdict silently.

**How to apply — date content from something in-band or from git:**
- Prefer an explicit field the producer writes: `generated_at` in `server/tts-registry*.json` is what
  actually settled OI-32.
- Otherwise use git, which survives checkout:
  `git log --diff-filter=A --format='%ad' --date=short -- "$f" | tail -1` (first commit introducing that
  file's content). This gave a real discriminating answer for lesson clips: 2 predate the model switch,
  346 postdate it.
- Caveat on that command: a rename resets the add-date. Coach clips were renamed by `fb59ee3` (2026-07-16,
  "split `coach.* `into `coach.spoken.*`"), so git-add-date understates their age — use the registry there.

Generalizes past audio to any generated artifact (jsonl corpora, caches, build output). If a plan, task, or
critique proposes `stat`/`ls -lt`/mtime comparison as evidence of when something was produced, that is a
defect — see [[feedback_verify_at_the_source_layer]]: mtime is a *representation* of the file, and it lies.
