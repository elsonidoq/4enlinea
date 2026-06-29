---
name: project_epics_manager_consolidation
description: "The 8 per-epic speckit manager commands were deleted and replaced by one generic /epics-manager <epic-file> [epic-id] (2026-06-28)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0a1a64d3-7cf6-4961-85b2-330d17a2a5b3
---

On 2026-06-28 the eight near-identical per-epic speckit manager commands
(`fv-grounding-manager`, `routing-permalinks-manager`, `coach-commentary-manager`,
`deep-reveal-manager`, `mvp-manager`, `past-games-manager`, `patterns-blunders-manager`,
`TODOs-epic-manager`) were **deleted** and replaced by a single generic command
`.claude/commands/epics-manager.md`.

**Usage:** `/epics-manager <epic-file> [epic-id]`. `epic-id` selects one epic when a file bundles
several (integer = 1-based heading index, or a case-insensitive heading substring). State lives at
`.claude/epics-workflow/<file-stem>[--<epic-id-slug>].json` (one per epic, so concurrent epics don't
collide). Pipeline is unchanged: epic_critique → … → tasks_fix → done.

**Why it matters / how to apply:**
- Any older reference to `/fv-grounding-manager` (e.g. in injected memory or
  `feature-vector-sufficiency-experiment.md`) is stale — use `/epics-manager <epic-file>` instead.
- The command is **epic-agnostic**: it carries NO baked-in invariants/stories/traceability. It reads
  the epic's own `Settled decisions`, `Non-obvious facts`, and `Authoritative sources of truth`
  sections. **So every epic file must include those named sections** (and ideally `NOT included` /
  `Acceptance criteria`), or the sub-agents lose their constraints. Model new epics on
  `docs/epics/blunder-reason-field-epic.md`.
- All 8 deleted managers' workflows were `done` at deletion; the commands remain in git history.

Related: [[project_lookahead_shared_seam]], [[project_feature_vector_content_traps]].
