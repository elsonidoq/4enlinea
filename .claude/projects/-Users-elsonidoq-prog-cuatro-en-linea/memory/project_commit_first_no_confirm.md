---
name: project_commit_first_no_confirm
description: "Commit-first mode — clicking a column immediately commits the move, no confirmation step"
metadata: 
  node_type: memory
  type: project
  originSessionId: c2897a24-b810-4c28-b6d0-1b5bbec293b8
---

In commit-first sparring mode, clicking a column **immediately** plays the move and triggers the analysis. There is no two-step "pending move → confirm/cancel" flow.

**What was removed (2026-05-27):**
- `handleColumnClick` no longer calls `setPendingMove(col)` when `commitFirst` is true — it goes straight to `commitMove(col)`.
- The confirm/cancel buttons UI block (`{pendingMove !== null && commitFirst && ...}`) was removed from `HomePage.jsx`.
- `pendingMove` state still exists in code but is effectively unused (never set to non-null).

**Why:** Simpler UX — one click = one action. The confirmation step added friction without benefit.

**Docs updated:** `docs/mvp/technical_roadmap.md` (commit-first description), `docs/architecture/index-conventions.md` (removed stale `pendingMove` code example).
