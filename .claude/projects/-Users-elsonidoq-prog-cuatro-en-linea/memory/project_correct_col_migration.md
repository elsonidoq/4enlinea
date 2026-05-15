---
name: correct_col migration gap
description: correct_col column was missing from all migrations until 016; added by 016_correct_col.sql
metadata:
  type: project
---

`correct_col integer DEFAULT NULL` was absent from all existing migrations despite plan.md implying it existed. Migration `016_correct_col.sql` (created 2026-05-15) adds it to both `puzzles` and `candidates` tables and re-grants SELECT/INSERT/UPDATE/DELETE to anon and authenticated roles.

**Why:** Needed by claimeven, figure_7, and j_shape evaluators to store the single correct column at candidate/puzzle creation time (it can't be re-derived from highlight_metadata for those categories).

**How to apply:** Before writing any query that SELECTs or INSERTs `correct_col`, confirm migration 016 has been applied to Supabase. If a new environment is set up, migration order matters — 016 must run after 012 (explicit grants).
