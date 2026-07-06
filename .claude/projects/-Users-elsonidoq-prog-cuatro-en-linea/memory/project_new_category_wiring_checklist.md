---
name: new-category-wiring-checklist
description: Every file that must be touched when adding a new puzzle category slug
metadata: 
  node_type: memory
  type: project
  originSessionId: a06eb14d-fcf2-4f91-9f11-80ddc8bed5f4
---

When adding a new puzzle category (e.g., `odd_even_threat`), the detector/slug must be registered in all of these files. Missing any one causes silent failures:

1. **`server/categories.js`** — add to `VALID_CATEGORIES`, `CATEGORY_ORDER`, `PAID_CATEGORIES` (or note free)
2. **`src/lib/categories.js`** — mirror the same arrays (frontend copy; must stay in sync)
3. **`server/challengeSets.js`** — add the set entry with `stars`, `displayNameKey`, `descriptionKey`
4. **`connect-four/src/i18n/en.json`** — add `coach.<slug>.prompt.*`, `coach.<slug>.hint.*`, `coach.<slug>.optimal.*`, `coach.<slug>.suboptimal.*`, `coach.<slug>.blunder.*` pooled-key groups
5. **`server/classifier.js`** — register in `classify()` switch and add `detect<Category>` function
6. **`server/predicates.js`** — add `eval<Category>` in the `evaluatePredicate()` switch
7. **`server/candidate-generator.js`** — register in `checkPredicate()` switch AND add `computeHighlightCells` case AND add `isClean` case (this file is easily overlooked; the factory silently falls through to a generic fallback without it)
8. **`PATTERN_KB`** — add a one-line entry (or note reuse of an existing key like `derived-parity-formula`)

**Why:** Epic 6 plan review caught that only files 5 and 6 were in the plan — file 7 (`candidate-generator.js`) was completely omitted, which would have caused the factory to generate garbage `odd_even_threat` positions.

**How to apply:** When writing a spec or plan for any new category, include an explicit checklist or task that touches every file in this list.


---

## (merged from `project_paid_categories_two_files` — PAID_CATEGORIES lives in two separate files — both must be updated when changing category tier)

The paid/free tier gate for puzzle categories is defined in **two separate files**:

- `connect-four/server/categories.js` — gates the `GET /api/puzzles/draw` endpoint (returns 403 if category is in `PAID_CATEGORIES` and user tier ≠ 'paid')
- `connect-four/src/lib/categories.js` — gates the SetPicker lock icon and the Post-Set Summary Pro-lesson check on the frontend

**Why:** Discovered in Epic 2b when the plan only updated the server file for `forced_win` and `forbidden_columns`, leaving the frontend lock icon active and the `/draw` 403 gate half-fixed.

**How to apply:** Any epic that adds a new free category or moves a category from paid→free must update both files atomically in the same commit. If only the server file is fixed, the SetPicker still shows it locked. If only the frontend file is fixed, `/draw` still 403s.
