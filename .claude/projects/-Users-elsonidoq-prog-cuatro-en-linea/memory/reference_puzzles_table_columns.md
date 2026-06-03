---
name: puzzles-table-columns
description: Actual column names on the puzzles table — is_active not approved
metadata: 
  node_type: memory
  type: reference
  originSessionId: a06eb14d-fcf2-4f91-9f11-80ddc8bed5f4
---

The `puzzles` table does NOT have an `approved` column or a `status` column. Approval is tracked via `is_active` (boolean). Key columns:

```
id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params,
cooperative_ai_moves, difficulty, is_active, user_player, created_at, interaction_mode,
highlight_metadata, correct_col, simulation_trace
```

- **`is_active`**: boolean — `true` = approved/active puzzle. There is no `approved` column and no `status` column on this table.
- The `candidates` table uses a different convention: `status` (text) with values like `"approved"`.
- Queries for approved puzzles should use `.eq('is_active', true)`, not `.eq('approved', true)`.

**Why:** The spec (020-data-pipeline) and plan both used `approved` as a logical concept, but the actual column is `is_active`. The validation script originally queried `.eq('approved', true)` and got a 42703 error (column does not exist).

**How to apply:** When writing any query, script, or spec that references puzzle approval, use `is_active` (boolean). Don't assume `approved` or `status` exists on this table.
