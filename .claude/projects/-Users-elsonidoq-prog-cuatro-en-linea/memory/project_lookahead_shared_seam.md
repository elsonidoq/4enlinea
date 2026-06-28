---
name: project_lookahead_shared_seam
description: "sparseLookahead's collectNovelOpportunities/compareOpportunities feed BOTH the feature vector AND the production annotation gate — editing for one regresses the other"
metadata: 
  node_type: memory
  type: project
  originSessionId: 77704dde-f0b6-4568-9a6c-74b59787c427
---

In `connect-four/server/sparseLookahead.js`, `collectNovelOpportunities` and `compareOpportunities`
have **two consumers** that are easy to miss:

1. **The feature vector** — `collectNovelOpportunities` output becomes `lookahead.categoryExamples`
   in `toFeatureVector` (`explainContext.js`).
2. **The production deep-reveal prompt** — `compareOpportunities` → `buildAliasOutput` builds the
   `allowedSet` / `aliasMap` (`resolvedAllowedSet`) that the **annotation gate** validates against.

**Why:** these were written for the prompt's annotation gate first; the feature-vector projection
reused them. So a change made to improve the *vector* (e.g. making the per-category differential
cell-aware/symmetric) silently alters the *production annotation* surface.

**How to apply:** before editing either function, add a **characterization test** snapshotting the
current `lookaheadSection` / `allowedSet` / `aliasMap` output (no tests cover these files today), and
keep that snapshot green. Two more non-obvious facts in the same file: `realizedOnPly` is already
relative to the pre-move board (`1 + depth - pliesLeft`, root=1), and `categoryExamples` is already
diff-only — `perCategory` (from `tallyComparison`) is the only count-based leak.

The staged remediation for the feature-vector grounding gaps (from the 2026-06-26 grade report,
`server/scripts/fv_suff_answers_2026-06-26T18-15-36Z_grade_report.md`) is the epic
`docs/epics/feature-vector-grounding-epic.md`, driven through speckit by the `/fv-grounding-manager`
command. See [[project_sparse_lookahead_unvalidated]] and [[project_feature_vector_content_traps]].
