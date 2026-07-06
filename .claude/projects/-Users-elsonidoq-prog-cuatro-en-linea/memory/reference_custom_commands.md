---
name: reference-custom-commands
description: Location and purpose of project-level custom Claude Code slash commands
metadata: 
  node_type: memory
  type: reference
  originSessionId: aeabe3f5-0c1c-4ec0-af96-ac552a124e88
---

Project-level custom commands live at `/Users/elsonidoq/prog/cuatro_en_linea/.claude/commands/`.

## Command behavioral rules

- `/coordinate-implementation <spec-dir>` — orchestrates multi-agent spec implementation. Each agent batch produces a `## Handoff context` section passed verbatim to the next batch's prompt. Final QA step (Step 5) requires explicit user confirmation before spawning a browser-driven QA agent.

- `/mvp-manager <epic-id>` — drives an epic through speckit pipeline. Uses **Opus for all critique steps**, **Sonnet for create/fix steps**. Critique stages gate on AskUserQuestion (multiple choice) before advancing; create/fix stages auto-advance. State persisted to `.claude/mvp-workflow-<epic-id>.json` — sessions are resumable.

- `/past-games-manager <A|B>` — same pipeline as mvp-manager, scoped to Past Games epics in `docs/mvp/past_games_epics.md`. Epic A = PastGamesList + GET /api/games; Epic B = category drill-down + two-way blunder↔game link. State at `.claude/past-games-workflow-epic-<A|B>.json`.

- `/fv-grounding-manager` — same pipeline (full mirror of routing-permalinks-manager), single epic at `docs/epics/feature-vector-grounding-epic.md` (feature-vector lookahead grounding fixes from the 2026-06-26 fv-sufficiency grade report). State at `.claude/fv-grounding-workflow.json`. `$ARGUMENTS` ignored (one epic). Enforces invariants: pruning-safe truthy enums, no-PV, mate-distance≠realizedOnPly, no production-prompt regression via the shared collectNovelOpportunities seam.

## Non-obvious traps

- Critique stages use AskUserQuestion with ≥2 options — do not bypass this gate or auto-advance without user input.
- Handoff context must be chained verbatim between batches; do not summarize or paraphrase it.
- Model selection is behavioral, not a suggestion: Opus critiques, Sonnet implements — swapping them breaks the quality/cost balance the pipeline was tuned for.


---

## (merged from `project_epics_manager_consolidation` — The 8 per-epic speckit manager commands were deleted and replaced by one generic /epics-manager <epic-file> [epic-id] (2026-06-28))

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
