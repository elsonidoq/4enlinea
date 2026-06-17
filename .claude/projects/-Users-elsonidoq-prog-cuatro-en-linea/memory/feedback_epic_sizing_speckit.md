---
name: feedback-epic-sizing-speckit
description: Rules for when to run the speckit pipeline vs. write tasks directly vs. merge epics — learned from Epic 7 (too small) and Epic 10+12 (should have been merged)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b80b6f9e-23c4-49e1-99ce-2db0f84b262b
---

Run the full speckit pipeline only when **all three hold**: (1) 8+ expected tasks, (2) at least one unresolved design decision that changes the implementation shape, (3) multiple subsystems touched (server + frontend + DB, or shared API contract). If any condition is missing, the pipeline overhead exceeds its value.

**Why:** Epic 7 (Google OAuth) ran the full pipeline for 3 mechanically obvious tasks. Design was already resolved in brainstorming. The only things speckit surfaced — `encodeURIComponent` and the infra checklist — could have been caught in a bullet-point task list. Epic 11 (curation category selector, ~3 tasks, single component) has the same problem.

**How to apply:**
- Before starting speckit, estimate task count and check: is there a real unresolved design question? If no on either, write tasks directly and implement.
- **Merge trigger**: if Epic B's plan would need to be rewritten after Epic A resolves a brainstorming question, merge them into one speckit run before starting. Example: Epic 12 (coach narration) depended on Epic 10's TTS choice — running them separately guaranteed Epic 12's plan would need a rewrite.
- **Skip speckit entirely** for: single-component UI changes, internal admin tools, or any feature where the scope is a single bullet and the "NOT included" list is longer than the scope.

See also: `docs/best_practices_spec_driven_development.md` → "Epic Sizing: When the Pipeline Earns Its Overhead" for the full decision table and project examples.
