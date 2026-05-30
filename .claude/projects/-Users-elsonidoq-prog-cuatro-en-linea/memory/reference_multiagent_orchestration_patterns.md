---
name: reference-multiagent-orchestration-patterns
description: "Design patterns for multi-agent orchestration commands: handoff context, user decision gates, and model selection"
metadata: 
  node_type: memory
  type: reference
  originSessionId: aeabe3f5-0c1c-4ec0-af96-ac552a124e88
---

Patterns established while building `/mvp-manager` and `/coordinate-implementation`.

## Handoff context pattern

Each sub-agent ends its response with a `## Handoff context` section. The orchestrator parses it and pastes it verbatim into the next sub-agent's prompt under `## Context from previous step`.

What to put in handoff context: decisions made and reasoning, trade-offs and deferments, uncertainties the next agent should scrutinize, patterns the next agent must follow, non-obvious constraints that won't be visible from reading the artifact files.

**Why it matters**: cold-start sub-agents only see files on disk. The handoff carries the "why" behind the "what" — without it, critique agents can't distinguish intentional decisions from defects, and implementation agents repeat choices already made or break patterns already established. This replicates what manual `/handoff-prompt` calls did in earlier workflows.

## AskUserQuestion gate pattern

Critique sub-agents (Opus, non-interactive) produce a structured report. The orchestrator then calls `AskUserQuestion` to present each item as multiple choice:
- Blocking issues → "Accept recommendation" + optional alternative + auto-added Other
- Decisions required → options from the critique, recommended one tagged "(Recommended)" + auto-added Other
- Batch into groups of ≤4 per call

If any Other answer signals discussion intent ("not sure", "let's discuss"), engage inline before proceeding. Otherwise auto-advance to the fix stage with collected answers.

**Why it matters**: sub-agents can't be interactive (they run to completion). Separating critique (non-interactive sub-agent) from user decision collection (AskUserQuestion in main context) lets you get fresh-context review quality while keeping user gates interactive and within the same orchestrator turn.

## Model selection rule

- **Opus** for critique/review — independent judgment, catches things Sonnet rationalizes away
- **Sonnet** for create/fix — mechanical execution of well-defined instructions

See also: [[feedback-agent-model-selection]]

## Orchestration state persistence

Long pipelines should persist state to a file (e.g. `.claude/mvp-workflow-<id>.json`) so sessions can be interrupted and resumed. State fields: current stage, pending critique output, pending user answers, pending handoff context, any IDs needed to resume (e.g. spec directory path).
