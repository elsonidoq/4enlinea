---
name: project_paid_categories_two_files
description: PAID_CATEGORIES lives in two separate files — both must be updated when changing category tier
metadata:
  type: project
---

The paid/free tier gate for puzzle categories is defined in **two separate files**:

- `connect-four/server/categories.js` — gates the `GET /api/puzzles/draw` endpoint (returns 403 if category is in `PAID_CATEGORIES` and user tier ≠ 'paid')
- `connect-four/src/lib/categories.js` — gates the SetPicker lock icon and the Post-Set Summary Pro-lesson check on the frontend

**Why:** Discovered in Epic 2b when the plan only updated the server file for `forced_win` and `forbidden_columns`, leaving the frontend lock icon active and the `/draw` 403 gate half-fixed.

**How to apply:** Any epic that adds a new free category or moves a category from paid→free must update both files atomically in the same commit. If only the server file is fixed, the SetPicker still shows it locked. If only the frontend file is fixed, `/draw` still 403s.
