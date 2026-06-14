---
name: feedback_audit_all_paths_before_epic
description: "Before writing an epic, audit ALL code paths for the affected feature — not just the primary path"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 872f9e0a-15a7-4e5b-9a05-8ab5ca10ae24
---

When writing an epic touching a feature with multiple entry points or message paths, read every file that participates — not just the obvious primary one. For the coach epic, the primary path (useGameBoard + ChallengeScreen) was fully read, but secondary paths were missed: `handleHintToggle` (hint phrases), `handleSequenceClick` (forced_win sequence), `coach.sparring.review.*` (server-side keys), ExplorerScreen full read. These became open questions the consistency review agent had to flag.

**Why:** Missing secondary paths produces an epic that is accurate for the main flow but silent on edge cases that can still produce wrong UX — which is exactly the category of bug the epic was trying to eliminate.

**How to apply:** Before finalising any epic that touches a message/notification/coach system, grep for all usages of the relevant key prefix (e.g. `rg "coach\."`) and read every call site, not just the ones you expect. Explicitly account for each one in scope or NOT included.
