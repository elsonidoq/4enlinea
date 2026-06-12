---
name: reference_deep_reveal_failures
description: deep_reveal_failures table — logs P5Strong annotation validation failures with full prompt and raw LLM output; primary debugging tool for zone-tag violations
metadata:
  type: reference
---

`deep_reveal_failures` table in Supabase. Logged by the `/api/explain-move-llm` endpoint whenever `validateAnnotation` fails on both the first attempt and the retry.

**Columns:** `id`, `position_hash`, `movestring`, `col`, `endpoint`, `llm_prompt`, `raw_llm_output`, `failure_reason`, `created_at`

**`failure_reason`** is a JSON array of P5Strong failure codes, e.g.:
- `P5strong:col_not_allowed:col2` — LLM zone-tagged a column not in `allowedSet`
- `P5strong:cell_not_allowed:c3r4` — LLM zone-tagged a cell not in `allowedSet`
- `P5strong:tg` — LLM used the `tg` zone spec directly (internal only)

**When to query:** If LLM responses look spatially wrong in production, or you suspect P5Strong is over-rejecting — this table shows exactly what the LLM said and why it was rejected.
