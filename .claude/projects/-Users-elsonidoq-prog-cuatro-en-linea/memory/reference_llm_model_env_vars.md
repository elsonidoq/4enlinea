---
name: reference_llm_model_env_vars
description: OPENAI_MODEL=mini (prod endpoints); EXPLAIN_MODEL=full (eval CLI only) — the names mislead
metadata: 
  node_type: memory
  type: reference
  originSessionId: bd3ce184-7933-4973-9025-21d38c3034f9
---

Two OpenAI model env vars, and the names are misleading:

- `OPENAI_MODEL` = the **mini** model (`gpt-5.4-mini`). This is what ALL production LLM
  endpoints use — including `/api/explain-move-llm` (passed as `model` to `computeMechanism`)
  and `llmCoachHelpers.callLLM`.
- `EXPLAIN_MODEL` = the **full** model (`gpt-5.4`). Despite the name, NO production endpoint
  reads it. It is eval-only: read solely by the offline CLI `scripts/compute.mjs --llm`
  (default `--model`).

Gotcha: `/api/explain-move-llm` originally read `EXPLAIN_MODEL` (the full model); fixed
2026-07-07 to read `OPENAI_MODEL` so the endpoint runs on the mini. If you touch model
selection for a production endpoint, use `OPENAI_MODEL`; only `compute.mjs` should ever
reference `EXPLAIN_MODEL`. Both are in local `server/.env` but NOT shipped — they must be
set in the Railway/staging environment for the deployed endpoint to work.

See [[project_boot_path_env_read_crash]]; arch table in `server-conventions.md`.

**Gemini**: the correct model id for any `mcp__gemini__gemini-query` call is `gemini-3.1-pro-preview` — `gemini-3.1-pro` and `gemini-2.0-flash` are wrong fallbacks (user-confirmed).
