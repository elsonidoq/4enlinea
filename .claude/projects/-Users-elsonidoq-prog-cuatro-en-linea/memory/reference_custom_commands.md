---
name: reference-custom-commands
description: Location and purpose of project-level custom Claude Code slash commands
metadata: 
  node_type: memory
  type: reference
  originSessionId: aeabe3f5-0c1c-4ec0-af96-ac552a124e88
  modified: 2026-08-05T20:09:44.857Z
---

Project-level custom commands live at `/Users/elsonidoq/prog/cuatro_en_linea/.claude/commands/`.

## Command behavioral rules

- `/coordinate-implementation <spec-dir>` — orchestrates multi-agent spec implementation. Each agent batch produces a `## Handoff context` section passed verbatim to the next batch's prompt. Final QA step (Step 5) requires explicit user confirmation before spawning a browser-driven QA agent.

- `/mvp-manager <epic-id>` — drives an epic through speckit pipeline. Uses **Opus for all critique steps**, **Sonnet for create/fix steps**. Critique stages gate on AskUserQuestion (multiple choice) before advancing; create/fix stages auto-advance. State persisted to `.claude/mvp-workflow-<epic-id>.json` — sessions are resumable.

- `/past-games-manager <A|B>` — same pipeline as mvp-manager, scoped to Past Games epics in `docs/mvp/past_games_epics.md`. Epic A = PastGamesList + GET /api/games; Epic B = category drill-down + two-way blunder↔game link. State at `.claude/past-games-workflow-epic-<A|B>.json`.

- `/fv-grounding-manager` — same pipeline (full mirror of routing-permalinks-manager), single epic at `docs/epics/feature-vector-grounding-epic.md` (feature-vector lookahead grounding fixes from the 2026-06-26 fv-sufficiency grade report). State at `.claude/fv-grounding-workflow.json`. `$ARGUMENTS` ignored (one epic). Enforces invariants: pruning-safe truthy enums, no-PV, mate-distance≠realizedOnPly, no production-prompt regression via the shared collectNovelOpportunities seam.

## Non-obvious traps

- **Gemini model id:** the correct model id for any `mcp__gemini__gemini-query` call is
  `gemini-3.1-pro-preview` — `gemini-3.1-pro` and `gemini-2.0-flash` are wrong fallbacks
  (user-confirmed). Not an env var, so it doesn't belong in an env-var table.
- Critique stages use AskUserQuestion with ≥2 options — do not bypass this gate or auto-advance without user input.
- **`/epics-manager` no longer asks every critique item (changed 2026-07-29, owner-directed).** A `## Blocking issues` item **auto-accepts** — apply the recommendation, don't ask — when the critique gives a recommendation AND no clear alternative exists, i.e. the question would have exactly one real option. `## Decisions required` items are ALWAYS asked (owner choices by construction). Two rules that make it safe: never manufacture a second option to keep a question alive, and report auto-applied items in one line each before advancing. **The trap:** `pending_answers` must still be written (non-null, recording auto-accepted items in the same format) even when *no* question was asked — the Interrupted-critique recovery block treats null `pending_answers` as "the Q&A never completed" and would re-run it forever. The owner explicitly declined the broader "ask by blast radius, not by stage" change for now; only the single-viable-option rule is in.
- **`/code-review` cannot be invoked from the `Skill` tool.** It is marked `disable-model-invocation`; calling it returns *"Skill code-review cannot be used with Skill tool … Ask the user to run /code-review themselves … Do not replicate this skill's workflow by other means."* This matters because **`/coordinate-implementation`'s Step 5 instructs you to invoke it** — that step is unrunnable by the agent, and skipping it silently drops the only static-review pass over the *accumulated* multi-batch diff, which is exactly what browser QA is structurally blind to (correctness bugs on unexercised paths; logic duplicated across batches because each agent saw only a handoff summary, never the prior diffs). When coordinating: **say plainly that Step 5 was skipped and that the user should run `/code-review` themselves.** Same for `/code-review ultra` (user-triggered and billed).
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

Related: [[project_lookahead_shared_seam]], `docs/architecture/feature-vector-sufficiency-experiment.md` §"`feature_vector` content traps".


---

## (merged from `project_speckit_workflow` — SpecKit behavioral traps in this repo)

- **`.specify/feature.json`** is where SpecKit reads the active feature directory from
  (`{ "feature_directory": "specs/001-decodec4-mvp" }`). Update it when switching between feature specs.
- **`check-prerequisites.sh` exits with an error when run on `main`** (it expects a feature branch).
  This is **non-fatal** — proceed, driving off `.specify/feature.json` directly.

- `/create-epic <file-or-prompt>` (added 2026-09-07) — turns raw input (requirements doc, bug report, QA findings, free text) into a `docs/epics/<slug>-epic.md` file that `/epics-manager` can drive. Verifies every input claim at source before it enters the epic, resolves empirically what one command can settle, then **asks the open design decisions via `AskUserQuestion`** (mandatory — not prose), sizes against `docs/best_practices_spec_driven_development.md` §"Epic Sizing" three gates, and carves out chores that individually fail the gates into a "do these directly" list. Stops at the epic file — never writes spec/plan/tasks; `/epics-manager` owns those.
