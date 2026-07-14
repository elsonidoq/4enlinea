---
name: feedback_agent_and_ui_workflow
description: "Agent-model selection (Opus critique / Sonnet apply), prepopulate reviewed data in one shot, ASCII diagrams for UI brainstorming, AskUserQuestion needs ≥2 options"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

Rules for spawning agents, brainstorming UI, and asking the user questions.

- **Model selection: Opus for critique, Sonnet for apply.** Use **Opus** when the task needs independent judgment on an unfamiliar document (critiquing a spec, gap analysis, catching what the author would rationalize away — fresh context + Opus). Use **Sonnet** when applying a well-defined list of known decisions to a document the session already wrote (execution, no judgment). Before spawning a review agent, ask: open-ended critique (Opus) or applying known decisions (Sonnet)?

- **Prepopulate reviewed data upfront.** When building a "re-review" flow for already-reviewed records, list EVERY field the UI must pre-populate, trace each to its source table, and add all selects/**joins** in one edit — fields in related tables (e.g. `annotator_note` on `false_positive_records` joined by `candidate_id`) are the ones missed. Also add `Cache-Control: no-store` to admin list endpoints returning mutable data (stale 304s mask changes).

- **ASCII diagrams for UI brainstorming.** When brainstorming screens/layouts, use ASCII diagrams inline; do NOT offer the browser-based visual companion (user declined it explicitly).

- **AskUserQuestion needs ≥2 options.** The tool throws `InputValidationError: expected array to have >=2 items` on a single-option question. Always give ≥2 meaningful options; when only one resolution makes sense, add a distinct alternative ("Keep current behavior") or a broader "Accept all recommendations".

Related: `reference_multiagent_orchestration_patterns` (merged into this file), [[feedback_explanation_and_question_style]].


---

## (merged from `feedback_askuserquestion_preview_format` — Never use AskUserQuestion's preview field for text/code option previews — it renders in a way that suppresses/truncates the option text for this user)

Do not use the `preview` field in AskUserQuestion when options are text/code descriptions (as opposed to genuine visual mockups/diagrams). In this user's terminal rendering, previews get shown in a boxed pane that truncates content ("✂ N lines hidden") and the option `description` text itself gets suppressed/not shown.

**Why:** User explicitly said "Never use this format again. Text is being suppressed" after a 4-option question used `preview` for plain prose/code-snippet previews of an implementation approach.

**How to apply:** Reserve `preview` strictly for genuinely visual content (ASCII UI mockups, side-by-side diagram comparisons) per the tool's own guidance — not for restating an option's approach in more detail. For technical/approach questions, put all necessary detail in `label` + `description` only, no `preview`. When in doubt, skip `preview` entirely and just ask in plain text/AskUserQuestion without previews.


---

## (merged from `reference_multiagent_orchestration_patterns` — Design patterns for multi-agent orchestration commands: handoff context, user decision gates, and model selection)

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

See also: [[feedback_agent_and_ui_workflow]]

## Orchestration state persistence

Long pipelines should persist state to a file (e.g. `.claude/mvp-workflow-<id>.json`) so sessions can be interrupted and resumed. State fields: current stage, pending critique output, pending user answers, pending handoff context, any IDs needed to resume (e.g. spec directory path).
