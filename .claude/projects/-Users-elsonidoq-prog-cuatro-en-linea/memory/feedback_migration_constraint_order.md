---
name: feedback-migration-constraint-order
description: When migrating constrained columns, drop constraints before updating data or the UPDATE will violate the existing constraint
metadata:
  type: feedback
---

Drop CHECK constraints before running UPDATE statements that change constrained values, then re-add constraints after the data is clean.

**Why:** Migration 013 ran UPDATE before DROP CONSTRAINT. The UPDATE tried to write `forced_win` into a column whose existing CHECK still only allowed `zugzwang` — the UPDATE failed, leaving the DB in a partial state that required manual recovery.

**How to apply:** Migration order must be: (1) DROP old constraints, (2) UPDATE data, (3) ADD new constraints. Never put UPDATEs before DROP CONSTRAINT when the new value isn't in the old allowed set.
