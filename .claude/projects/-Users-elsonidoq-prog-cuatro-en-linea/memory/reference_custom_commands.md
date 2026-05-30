---
name: reference-custom-commands
description: Location and purpose of project-level custom Claude Code slash commands
metadata: 
  node_type: memory
  type: reference
  originSessionId: aeabe3f5-0c1c-4ec0-af96-ac552a124e88
---

Project-level custom commands live at `/Users/elsonidoq/prog/cuatro_en_linea/.claude/commands/`.

## Available commands

- `coordinate-implementation.md` → `/coordinate-implementation <spec-dir>` — orchestrates multi-agent spec implementation: reads spec/plan/tasks, proposes a user-story partition to the user, spawns sequential Sonnet sub-agents (one per batch), marks tasks done after each agent, outputs a final summary.

- `mvp-manager.md` → `/mvp-manager <epic-id>` — drives an epic through the full speckit pipeline (epic review → spec → plan → tasks). Persists state to `.claude/mvp-workflow-<epic-id>.json` so sessions are resumable. Uses Opus for all critique steps, Sonnet for create/fix steps. Pauses at each critique stage for user answers; auto-advances through all create/fix stages.
