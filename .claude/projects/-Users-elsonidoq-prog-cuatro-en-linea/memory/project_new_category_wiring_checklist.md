---
name: project_new_category_wiring_checklist
description: "Pointer — before adding/removing a puzzle category, read docs/architecture/server-conventions.md §Category Registry; the trap is that omitting candidate-generator.js fails SILENTLY (no error, just no candidates)"
metadata:
  node_type: memory
  type: project
---

**Trigger: adding, renaming, or removing a puzzle category slug.**

The full wiring checklist now lives in **`docs/architecture/server-conventions.md` §Category Registry** ("Wiring a new puzzle category", plus "Retired category slugs" and the generation-quality guards). Read it there — this file is only the trigger + the reason you cannot skip it.

**Why this needs a trigger at all:** the failure is **silent**. `candidate-generator.js` dispatches on the category slug through an if/else chain; a slug that isn't wired in falls through with **no error** — generation just yields zero candidates for it, which reads as "the pipeline is broken" or "this category is rare" rather than "I forgot a file". Every other file in the checklist fails loudly; this one doesn't. `PAID_CATEGORIES` has the same shape of trap (defined in **two** files — `server/categories.js` and `src/lib/categories.js` — which must stay in sync).

Also non-obvious: **never reuse a retired slug** (`fork_setup`, `parity_control`, `zugzwang`, `claimodd`). Old rows, attempts, and stats keyed to the old slug silently resurface under the new meaning. The retired list + rationale is in the doc.

Related: [[project_generate_candidates_fetch_failed_flake]] — many categories at 0 can also be an env flake, not a wiring bug; check that before re-wiring anything.
