---
name: project_puzzle_row_write_sites
description: "Adding a puzzles/candidates column — 5 hand-written insert sites, none shared, and candidate-generator.js never touches the DB"
metadata: 
  node_type: memory
  type: project
  originSessionId: d5d99fb7-a94e-41d3-90ca-ff79ed049969
  modified: 2026-07-29T19:19:46.943Z
---

**Trigger: you are adding a column to `puzzles` or `candidates`, or wondering why a new column
is `NULL` on freshly-created rows.**

There is **no shared row-builder**. Five independent write paths each spell out their own field
list, so a new column silently lands as `NULL` everywhere you forgot. Full table with line
anchors: `docs/architecture/data-model.md` §"Where puzzle/candidate answer columns are written".

The three traps, in order of how much time they cost:

**1. `candidate-generator.js` never touches Supabase.** `generateCandidates` only builds an
in-memory object — grepping there for the insert finds nothing, and it is the first place
everyone looks. The `candidates` write is in `server/index.js`'s `POST /api/admin/generate`.

**2. Promotion (candidate → puzzle) is TWO hand-enumerated lists**, in `POST
/api/admin/candidates/:id/approve` and `POST /api/admin/candidates/approve-batch` — both in
`server/index.js`. Everything a player is served comes through these.

**3. Two more sites live outside the obvious path** and were each missed by a separate review
pass during the spec-051 planning: `server/scripts/audit_answer_ambiguity.mjs#repairPuzzles`
inserts into `puzzles` directly (it is a *script*, so it escapes any sweep of `server/*.js`), and
`POST /api/admin/seed-puzzles` inserts `server/data/placeholder_puzzles.json` **verbatim** (dev
seed only — a new column appears only if the JSON carries it).

**Why this bites so hard when the reader is fail-open.** If the consumer treats a missing value
as "not computed yet, fall back to the old path" — which is exactly what spec 051's
`correct_cols IS NULL` branch does — then a forgotten write site produces behaviour that is
*still correct* and therefore invisible: the feature works, the tests pass, and the stored value
is simply never read. Add a non-null assertion at each write site rather than trusting a test to
notice.

Related: [[project_new_category_wiring_checklist]] (the sibling trap for categories),
[[feedback_verify_at_the_source_layer]] (three review passes each reported a different count of
these sites; only grepping `from('puzzles')` directly got it right).
