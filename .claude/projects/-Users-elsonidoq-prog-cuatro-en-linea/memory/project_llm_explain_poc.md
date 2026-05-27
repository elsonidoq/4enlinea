---
name: project_llm_explain_poc
description: LLM move explanation PoC — design decisions finalised 2026-05-26, agent prompt written, not yet implemented
metadata:
  type: project
---

A CLI script (`explain_move.sh` → `connect-four/server/scripts/explain_move.mjs`) that receives a movestring + user col, then produces a grounded LLM explanation of why the move is good or bad.

**Status**: Design complete, agent prompt written, NOT yet implemented. Agent prompt lives in the conversation history of 2026-05-26.

## Finalised design decisions

**numPlies formula**: `numPlies = 2 * rounds + 1` where `rounds` is a CLI param (default 1).
Always odd → leaves always land on the user's turn regardless of which player the user is. See [[project_explain_simulate]] for the parity proof.

**Contrast move**:
- User played suboptimally (score < max): contrast = best-scoring legal move (center-most if tied)
- User played optimally (score = max): contrast = second-best (highest score strictly below max; center-most if tied)
- All legal scores equal: print error, exit — do not call LLM

**LLM**: OpenAI. Load `OPENAI_API_KEY` and `OPENAI_MODEL` from `connect-four/server/.env`.

**Output** (stdout in order):
1. Board + scores summary (from `visualize_board.mjs` output — fix the broken import first; see [[bug_visualize_board_broken]])
2. Full prompt sent to LLM (clearly delimited)
3. LLM response

**Delta table** (the core of the prompt):
- For each of 11 pattern names, compute `user_ratio` and `contrast_ratio`
- Retain only rows where `max(user_ratio, contrast_ratio) > 0`
- Sort by `|user_ratio - contrast_ratio|` descending
- Include top-2 histogram entries per move per row
- If zero rows retained: set `insufficient_tactical_data = true`; still call LLM but tell it explicitly

**Prompt structure**:
```
## Role
Expert Connect Four coach. Explain why a move is [strong | weak].

## Board position
<visualize_board output>

## Solver scores
Col: 0..6 / scores / best moves / user move label

## Pattern comparison (<rounds> rounds, <N> leaves)
<delta table or "No tactical patterns detected">

## Task
Explain in 2–4 sentences. Ground in pattern data. If none available, say so.
```

**No new API endpoint, no DB changes, no test file** (PoC; manual verification only).
**No new npm packages** unless unavoidable; check `connect-four/package.json` first.

[[project_explain_simulate]]
[[bug_visualize_board_broken]]
