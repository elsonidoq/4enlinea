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

Related: [[reference_multiagent_orchestration_patterns]], [[feedback_explanation_and_question_style]].
