---
name: project_puzzle_grading_reads_stored_metadata
description: "Puzzle answers are graded against the STORED highlight_metadata, not a recomputed one — so changing a detector silently invalidates every live row generated under the old one"
metadata: 
  node_type: memory
  type: project
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-07-31T01:46:47.564Z
---

`evalOvercut` (and the same shape for other metadata-graded categories) derives the accepted answer
from the row's **stored** `highlight_metadata` — `overcut` rows carry `correct_col: null` precisely
because the column is read back out of the metadata. Nothing recomputes it at serve time.

**Why this is a trap:** it makes every detector/predicate change a **content migration**. Widen a
detector and the live pool does not follow — it keeps grading against cells derived by the old code,
so a player who plays a *newly*-valid column is marked **wrong**. Nothing in `test:fast` or local QA
catches this: tests run on fixtures, and the local pool is usually empty for the category you just
changed (see [[feedback_generate_puzzles_for_local_qa]]).

Measured instance (spec 052, 2026-07-30): adding two overcut branches left **18 of 42** live
staging+production rows stale — 12 with metadata naming the wrong cells, 6 newly *ambiguous*
(two valid columns, tripping `checkOvercutPredicate`'s singleton guard). Freshly generated rows were
40/40 clean, so the damage is always confined to rows built by the **old** detector.

**How to apply:** whenever you touch a `check*Predicate` or the detector behind it, re-derive the
live pool for that category against staging *and* production before shipping, and treat any drift as
a required deploy step. The runbook and the `--dry-run`-first repair script are in
`docs/deployment_steps.md`; the general obligation now lives in `/coordinate-implementation` Step 8.
Related: [[feedback_measurement_expires]], [[project_correct_cols_engine_traps]],
[[project_new_category_wiring_checklist]].
