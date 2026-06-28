---
name: feedback_fv_grounding_correctness_over_speed
description: FV-grounding epic premise — favor correctness over speed; extra solver passes are acceptable
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 96957e1d-f91f-4042-9b7e-8775bc1e64e5
---

For the Feature-Vector Grounding epic (specs/040-fv-grounding), the owner set an explicit premise: **all design decisions must favor correctness over speed.** If the resulting algorithm is too slow, it can be optimized later — but only once it is proven sound (i.e. provides correct, understandable context to the LLM).

Concrete consequence locked in plan critique: `reachability.ceiling` is computed via a **real mistake-mode (opponent-errs) search pass** of the relevant root, even on paths where the root was originally searched in optimal mode. This deliberately overrides the plan's earlier "no new search pass" guarantee and accepts extra c4solver calls to avoid a fabricated/contradictory ceiling (ceiling must be ≥ floor).

**Why:** A contradictory or absent honest-negative signal is exactly the A4 fabrication the epic exists to eliminate. Soundness of the feature vector is the acceptance bar; latency is not.

**How to apply:** When a correctness-vs-performance tradeoff arises anywhere in this epic (or its follow-ups), choose correctness. Do not prune search depth, skip a search pass, or approximate a signal to save solver calls unless the cheaper path is provably equivalent. Defer optimization to a later iteration. Related: [[project_feature_vector_content_traps]], [[feedback_feature_vector_design]].
