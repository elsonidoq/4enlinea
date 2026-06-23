---
name: judge-deep-reveals
description: Score a deep-reveal eval run against the 8-item rubric and produce a structured report
argument-hint: "<path-to-eval_results_*.jsonl>"
user-invocable: true
---

# Deep Reveal Judge

You are evaluating a batch of deep-reveal LLM explanations produced by `run_eval.mjs`.

## Input

The argument is a path to a `.jsonl` file. Each line is a JSON object with this shape:

```json
{
  "id": "eval-0",
  "board_state": "3253...",
  "move_played": 2,        // 0-indexed column played (the blunder)
  "correct_move": 3,       // 0-indexed column that was better
  "pattern_category": "claimeven",
  "predicates": ["P02","P28"],
  "severity": 4,
  "context_outcome": "success | null_returned | trivial | all_moves_equal | error",
  "context_error": null,
  "prompt": "<full LLM prompt>",
  "allowed_set": [...],
  "attempt1_response": "<raw LLM text>",
  "attempt1_passed": true,
  "attempt1_failures": [],
  "attempt2_response": null,
  "attempt2_passed": null,
  "attempt2_failures": [],
  "final_response": "<accepted response text or null>"
}
```

## Your task

1. Read the JSONL file using the Read tool (or Bash `cat`).
2. For each record, classify it into one of three buckets:
   - **Pipeline failure**: `context_outcome` is not `success` — no LLM was called. Record the outcome type and `context_error` if present.
   - **Annotation failure**: `context_outcome` is `success` but `final_response` is `null` — both validation attempts failed. Record the failure codes from `attempt1_failures` and `attempt2_failures`, and capture the full text of `attempt1_response` and `attempt2_response`.
   - **Success**: `final_response` is non-null — apply the 8-item rubric.
3. For each success record, score all 8 rubric items.
4. Write the report to `<same-directory>/<stem>_report.md` where `<stem>` is the filename without `.jsonl`.

## Rubric (apply to success records only)

You have access to `board_state`, `move_played`, `correct_move`, `pattern_category`, `severity`, `predicates`, `prompt`, and `final_response` for each entry.

Score each item **pass / partial / fail** with a one-line rationale. Column numbers in the explanation are 1-indexed (so `correct_move + 1` is the expected column number).

| # | Item | What to check |
|---|---|---|
| 1 | **Correct column named** | Does the explanation explicitly mention column `correct_move + 1`? Does it avoid naming wrong columns as the better move? |
| 2 | **No hallucinated win** | Does it claim an immediate win exists when none does, or deny one when it does? Cross-check against `pattern_category` (`forced_win` = win exists) and `severity` (high severity = large mistake, not necessarily a forced win). |
| 3 | **Pattern match** | Does the described tactical concept match `pattern_category`? Mapping: `claimeven` → zugzwang / even-row control; `forced_win` → forced sequence / forced win; `double_threat` → fork / two threats at once; `z_threat` → Z-shape / odd-row stacking; `figure_7` → figure-7 / diagonal staircase; `j_shape` → J-shape; `undercut` → undercut / lower threat; `overcut` → overcut / upper threat; `immediate_threat` → immediate threat / blocking urgency; `forced_block` → forced block / defensive urgency; `drawing_move` → drawing / balanced outcome; `odd_even_threat` → parity / odd-even row strategy; `suboptimal_move` → generic positional improvement (no specific named pattern required). |
| 4 | **Player perspective correct** | Is the explanation from the blundering player's viewpoint ("you missed…", "your move…")? No confusion about who played vs who benefits. |
| 5 | **Move location accuracy** | Are the played move (column `move_played + 1`) and better move (column `correct_move + 1`) correctly attributed? No transposition between the two. |
| 6 | **No internal terms leaked** | Does the response use any banned words: `solver`, `score`, `leaf`, `leaf position`, `tag`, `direction`, `forced_win` as a noun, `simulation`, `pattern data`, `pattern comparison`? |
| 7 | **Internal consistency** | Does the better move's rationale directly address the specific weakness identified in the blunder? The diagnosis and remedy must be logically connected — not just "the other move was stronger." |
| 8 | **Other issues** | Anything else: vague/boilerplate explanation with no position-specific reasoning, self-contradictory claims, wrong threat direction, misleading framing. |

## Report format

Write the report in this structure:

```
# Deep Reveal Eval Report — <filename>

## Summary

- Total entries: N
- Pipeline failures: N
- Annotation failures: N  
- Successes evaluated: N
- Rubric pass rate: X/Y items passed across all success entries

## Pipeline failures

| id | category | outcome | error |
|----|----------|---------|-------|
...

## Annotation failures

| id | category | attempt1_failures | attempt2_failures |
|----|----------|------------------|------------------|
...

For each annotation failure, add a block immediately below the table:

> **eval-N attempt 1** (`failure_code1, failure_code2`):
> <paste attempt1_response verbatim>
>
> **eval-N attempt 2** (`failure_code1, failure_code2`):
> <paste attempt2_response verbatim>

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|----|----------|-----|---|---|---|---|---|---|---|---|
...

For each row where any item is partial or fail, add a notes block immediately below:
> eval-N: item 3 fail — explanation describes "column pressure" but pattern is claimeven; item 7 partial — better move rationale is generic

## Systematic issues

Group failures by rubric item. For each item with ≥2 failures:
- How many entries affected
- Which pattern_category values are involved
- A one-sentence description of the recurring failure pattern

Order by number of entries affected, descending.

## Raw explanations (success entries)

For each success entry, print:

### eval-N — <pattern_category> (sev <severity>)
**Prompt excerpt (Move context section):**
<paste the ## Move context section from the prompt>

**Final response:**
<paste final_response>
```

## Key column-number rule

`move_played` and `correct_move` are 0-indexed. The LLM prompt and response use 1-indexed columns. When checking rubric items 1 and 5, add 1 to each value before comparing against what the explanation says.
