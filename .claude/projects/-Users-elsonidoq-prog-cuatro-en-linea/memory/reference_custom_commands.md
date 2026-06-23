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

## Non-obvious traps

- Critique stages use AskUserQuestion with ≥2 options — do not bypass this gate or auto-advance without user input.
- Handoff context must be chained verbatim between batches; do not summarize or paraphrase it.
- Model selection is behavioral, not a suggestion: Opus critiques, Sonnet implements — swapping them breaks the quality/cost balance the pipeline was tuned for.
