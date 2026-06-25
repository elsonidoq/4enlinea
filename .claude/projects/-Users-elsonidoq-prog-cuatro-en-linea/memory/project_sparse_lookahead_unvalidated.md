---
name: project_sparse_lookahead_unvalidated
description: Sparse-board forward look-ahead is built+merged on stagging but NOT yet empirically validated; may silently return null on the lost-position class it targets
metadata: 
  node_type: memory
  type: project
  originSessionId: af7ae640-0a81-4a6c-b3e1-5bf4a296fbfa
---

The sparse-board forward look-ahead engine (`connect-four/server/sparseLookahead.js`, gated into `buildExplainContext`) was implemented and merged on `stagging` (2026-06-25, commits `43de477..4ad4799`). Architecture + invariants live in `docs/architecture/llm-coach-endpoints.md` → "Sparse-board forward look-ahead". Two things that doc does NOT tell you:

**1. It is not empirically validated yet.** The unit + real-solver e2e tests pass, but the e2e deliberately tolerates a `null` (no-section) outcome, so passing tests do NOT prove the feature actually *fires usefully* on the target positions. The go/no-go is the (paid, deferred) eval run:
```
cd connect-four && node server/scripts/run_eval.mjs server/scripts/eval_set_large.json
# then: /judge-deep-reveals <results.jsonl>  — expect items 9/2/8 to improve on eval-8 / eval-41, no baseline regression
```
Until that runs, treat the feature as provisional.

**Why:** an agent seeing green tests + an arch doc would assume it works; it may not yet produce a section on real cases.

**2. Open risk — opponent-indifference dead-ends.** `selectOpponentMistakeCols` needs ≥2 distinct opponent score tiers; it returns `[]` when the solver is indifferent among replies. In *lost/drawn* positions (exactly the eval-8 class this targets) the solver is often indifferent among losing replies, so the search dead-ends and `runSparseLookahead` returns `null` → no section. If the eval shows it rarely fires, the fix frontier is to select opponent/player moves by a **threat-creating heuristic** instead of pure solver score-tier. Documented as a known limitation in `docs/architecture/llm-coach-endpoints.md` → "Sparse-board forward look-ahead" (also lists the tunable constants). See [[feedback_deep_reveal_product_mindset]] (the reason must be a reproducible board feature, never the score).
