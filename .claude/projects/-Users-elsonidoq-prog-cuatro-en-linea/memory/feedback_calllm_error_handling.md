---
name: feedback_calllm_error_handling
description: Batch scripts calling callLLM must wrap each call individually in try/catch — an uncaught error silently drops the entry
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8e6b5cb9-213b-4297-befc-b49b1ce0b6be
---

When writing a batch script that calls `callLLM` in a loop, wrap **each individual call** in try/catch — not just an outer try around the whole loop.

**Why:** An uncaught LLM error (timeout, rate limit, API error) exits the for-loop via exception propagation. The current entry gets no record written and is silently lost. The solver's `finally` cleanup still runs, but the entry is unrecoverable without a resume.

**How to apply:** For each `callLLM` call, catch and write a record with `llm_error: err.message`, then `continue` to the next entry. This matches the crash-safe design (one appendFileSync per entry regardless of outcome).

Note: the production endpoint (`index.js`) uses a single outer try/catch covering both LLM calls — acceptable there because a failed response triggers a fallback cached text. Batch scripts have no fallback and need per-call granularity.
