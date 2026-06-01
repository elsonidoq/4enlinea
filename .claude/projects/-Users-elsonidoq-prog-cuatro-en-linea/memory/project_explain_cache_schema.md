---
name: project_explain_cache_schema
description: explanation_cache.deep_reveal_json now stores prompt alongside explanation and bestLine
metadata:
  type: project
---

`explanation_cache.deep_reveal_json` (JSONB) has three fields: `{ explanation, bestLine, prompt }`. The `prompt` field was added so that `llm_feedback` can always capture the full LLM context.

Old cache entries (before this change) have no `prompt` field. The `llm-feedback` endpoint handles this: if `llm_prompt` is empty and `col` is provided, it looks up the cache by position hash, and if `prompt` is missing, calls `buildExplainContext(movestring, col)` to rebuild it (simulation only — no LLM call), then backfills the cache entry.

`buildExplainContext(movestring, col, rounds=1)` is a shared helper extracted from the `explain-move-llm` route — runs steps 3–11 of the pipeline (solver, simulation, board viz, prompt assembly) and returns `{ prompt, bestLine }` or `null` if no contrast move is available.

Migration 023 made `llm_feedback.llm_prompt` nullable.
