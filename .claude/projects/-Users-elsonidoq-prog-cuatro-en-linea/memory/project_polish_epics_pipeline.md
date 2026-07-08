---
name: project-polish-epics-pipeline
description: "polish_epic.md 8-epic backlog status; Epic 1 = spec 041 ready; epic \"confirmed facts\" proved stale — critique stages must re-verify against code"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2c6c49b4-a21a-4c79-aaa3-a032ffb34acf
---

`polish_epic.md` (repo root, branch `feature/polish`) holds 8 spec-ready epics covering all of `new_TODOs.md` + agentic_QA round 2; **epic numbers are the execution order (1→8)**. Run each with `/epics-manager ~/prog/cuatro_en_linea/polish_epic.md "epic N"`; state files live at `.claude/epics-workflow/polish_epic--epic-N.json`.

**Status (2026-07-08):** Epic 1 **implemented + browser-QA'd** via `/coordinate-implementation specs/041-past-games-data-integrity` (5 batches, all T001–T040 done, 908/908 tests; QA added the `id ASC` pagination tiebreaker). Work is **uncommitted on `feature/polish`**. Open at deploy: migration 053 prod pre-flight (below); `skipped`-semantics gap accepted as-is (see [[project_papergames_integration]]). Epics 2–8 not yet run — Epic 2 (mistake-count redefinition/quality filter) can now build on 041's counts/queue.

**Why:** Cross-session state — the backlog and its progress aren't derivable from git alone, and each epic run must know its predecessors' order constraints (Epic 2 depends on Epic 1's counts/queue; Epic 6 CTA on Epic 5; Epic 7 on Epic 5 secrets).

**How to apply:**
- **TRAP for epics 2–8:** Epic 1's "Non-obvious facts (confirmed code locations + traps)" had accurate *line numbers* but **3 wrong behavioral claims** (endpoint already fixed; a trap misattributed to the wrong endpoint; card grid in a different screen than named). Treat the epic file's "confirmed" tags as unverified for *behavior* — the epic_critique stage must spot-check load-bearing claims against live code, not trust the epic text.
- Epic 1's QA-blocker root cause turned out one level deeper than the epic said (`papergames_games` global unique → ownership flip on second-user import, not just the blunder index) — expect similar depth surprises; full detail lives in `specs/041-past-games-data-integrity/` (research.md, data-model.md).
- Before migration 053 ships to prod: tasks.md T025 requires re-verifying constraint names against the **production** DB (local match ≠ prod proof; `IF EXISTS` would silently no-op).
- Owner decisions this run: no historical-data backfill (no prod users yet — re-litigate if that changes); counts stay "same WHERE clause, different aggregation" (no quality filter; Epic 2 owns redefinition). See [[project-suboptimal-blunder-unification]], [[project_papergames_integration]].
