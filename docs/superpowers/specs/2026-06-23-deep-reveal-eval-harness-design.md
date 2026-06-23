# Deep Reveal Eval Harness Design

**Date:** 2026-06-23

## Goal

Run the deep reveal pipeline over every position in `eval_set.json`, capture all failure modes and LLM outputs, then use a Claude judge agent to score each output against a structured rubric and surface systematic issues.

---

## Phase 1 — Data collection script

### File

`connect-four/server/scripts/run_eval.mjs`

### Usage

```bash
# New run (creates a fresh timestamped output file):
node server/scripts/run_eval.mjs

# Resume an existing run (skips already-processed IDs, appends to the same file):
node server/scripts/run_eval.mjs eval_results_2026-06-23T10-00-00.jsonl
```

### Behavior

- Loads `.env` from `connect-four/server/.env` (same pattern as `verify_prompt_fixes.mjs`)
- Creates a solver process once and reuses it for all entries
- Processes entries from `eval_set.json` sequentially
- Writes one JSON record per line to the output file after each entry (crash-safe)
- On startup with an existing file argument: reads processed IDs, skips them, appends new records

### Production path replicated exactly

For each entry the script runs the same sequence as the `/api/explain-move-llm` endpoint:

1. `buildExplainContext(board_state, move_played, 1, solver)`
2. If context is null / trivial / allMovesEqual → record outcome, skip LLM
3. `callLLM(prompt)` → attempt 1
4. `normalizeZoneTags` + `expandZoneAliases` on raw output
5. `validateAnnotation(explanation, board, allowedSet)` → attempt 1 result
6. If attempt 1 failed → `callLLM(prompt)` → attempt 2, same normalization + validation
7. Record both attempts and final outcome

No Supabase calls. No cache reads or writes. Failures go to JSONL only.

### Per-entry record shape

```json
{
  "id": "eval-0",
  "board_state": "3253...",
  "move_played": 2,
  "correct_move": 3,
  "pattern_category": "claimeven",
  "predicates": ["P02", "P28"],
  "severity": 4,

  "context_outcome": "success | null_returned | trivial | all_moves_equal | error",
  "context_error": null,
  "context_tag": "claimeven",
  "context_direction": "missed_own",
  "prompt": "<full prompt text>",
  "allowed_set": [{ "col": 2, "cells": ["c2r3"] }],

  "attempt1_response": "<raw LLM text>",
  "attempt1_passed": true,
  "attempt1_failures": [],

  "attempt2_response": null,
  "attempt2_passed": null,
  "attempt2_failures": [],

  "final_response": "<accepted response text>"
}
```

`attempt2_*` fields are `null` when attempt 1 passed (no retry needed).
`final_response` is `null` when both attempts failed validation.
`prompt` and `allowed_set` are `null` when `context_outcome != "success"`.

### `context_outcome` values

| Value | Meaning |
|---|---|
| `success` | `buildExplainContext` returned a prompt; LLM was called |
| `null_returned` | `buildExplainContext` returned `null` (contrast move could not be determined) |
| `trivial` | Optimal move with negligible gap; canned response, no LLM call |
| `all_moves_equal` | All scores equal; canned response, no LLM call |
| `error` | `buildExplainContext` threw; `context_error` has the message |

---

## Phase 2 — Judge skill (`/judge-deep-reveals`)

### Invocation

```
/judge-deep-reveals <path-to-eval-results.jsonl>
```

Implemented as a Claude Code skill at `.claude/skills/judge-deep-reveals/SKILL.md`. The rubric lives in the skill file, making it versioned independently of the collection script. After Phase 1 completes, the user runs the command and Claude applies the rubric in-context — no subagent needed.

### What the skill does

1. Reads all records from the JSONL
2. Classifies each entry into one of three buckets:
   - **Pipeline failure** — `context_outcome != success` (null_returned / trivial / all_moves_equal / error): record the outcome type, no rubric applied
   - **Annotation failure** — both attempts failed P5Strong: record failure codes from `attempt1_failures` + `attempt2_failures`, no rubric applied
   - **Success** — `final_response` is non-null: apply 8-item rubric
3. Scores each success entry on the rubric (see below)
4. Writes a structured Markdown report to `eval_results_<same-timestamp>_report.md`

### Rubric (applied to success entries only)

The agent has access to: `board_state`, `move_played`, `correct_move`, `pattern_category`, `severity`, `predicates`, `prompt`, `final_response`.

Each item is scored **pass / partial / fail** with a one-line rationale.

| # | Item | What to check |
|---|---|---|
| 1 | **Correct column named** | Does the explanation explicitly mention the better column (`correct_move + 1` in 1-indexed)? Does it avoid naming wrong columns? |
| 2 | **No hallucinated win** | Does it claim an immediate win when none exists, or deny a win when one does? Cross-check against `pattern_category` and `severity`. |
| 3 | **Pattern match** | Does the described tactical concept match `pattern_category`? E.g. `claimeven` → zugzwang/even-row control; `forced_win` → forced sequence; `double_threat` → fork. |
| 4 | **Player perspective correct** | Is the explanation consistently from the blundering player's perspective? No confusion about who played or who benefits. |
| 5 | **Move location accuracy** | Are the played move and better move referenced at the correct columns? No transposition between the two. |
| 6 | **No internal terms leaked** | Does the response use banned words: `solver`, `score`, `leaf`, `tag`, `direction`, `forced_win` (as noun), `simulation`, `pattern data`? |
| 7 | **Internal consistency** | Does the better move's description directly address the specific weakness identified in the blunder? The remedy must match the diagnosis — not just be generically described as "stronger". |
| 8 | **Other issues** | Anything else: vague/generic explanation, self-contradictory reasoning, wrong threat direction, misleading framing. |

### Report structure

```
# Deep Reveal Eval Report — <timestamp>

## Summary

- Total entries: 25
- Pipeline failures: N (list by context_outcome type)
- Annotation failures: N (list failure codes)
- Successes evaluated: N

## Per-entry rubric table

| id | category | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | notes |
|----|----------|---|---|---|---|---|---|---|---|-------|
| eval-0 | suboptimal_move | pass | pass | fail | pass | pass | pass | partial | — | item 3: ... |
...

## Systematic issues

Groups failures by rubric item, identifies patterns across categories.
Example: "Items 3 and 7 fail together on all claimeven entries — the explanation
describes the blunder correctly but the better move rationale is generic."

Ordered by severity (number of entries affected).

## Annotation failure details

Per-entry breakdown of P5Strong failure codes for entries that never passed validation.
```

---

## What happens after the report

The user reviews the report and identifies the highest-priority issues. Fixes are made to the prompt, `buildExplainContext`, or the classifier. A **new run** (no file argument) is started from scratch to measure improvement. Reports across runs are compared by timestamp.
