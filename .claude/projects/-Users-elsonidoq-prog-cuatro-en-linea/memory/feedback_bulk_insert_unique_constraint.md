---
name: feedback-bulk-insert-unique-constraint
description: Bulk DB inserts silently discard the whole batch on a single unique-constraint violation — never treat that error as benign
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fb8a5d7a-c635-405b-b8e1-2522d4c8b851
---

Never use bulk `insert(rows)` and treat "unique constraint" errors as benign. A single duplicate row causes the entire transaction to roll back — 0 rows written — while the error is swallowed as harmless.

**Why:** The import script inserted all blunders for a game in one batch. One board state existed from a prior game, triggering the unique index. The whole batch failed; the script mis-counted all rows as "inserted." Games showed "no mistakes" despite having 7 blunders.

**How to apply:** For any bulk insert where some rows may already exist, either: (a) drop the unique constraint if duplicates are acceptable, or (b) insert row-by-row and catch `error.code === '23505'` per row. Never do a bulk insert and treat a constraint error on the whole batch as a per-row dedup.
