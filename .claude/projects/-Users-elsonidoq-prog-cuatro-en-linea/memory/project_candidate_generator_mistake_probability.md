---
name: project_candidate_generator_mistake_probability
description: solverWeightedPosition uses mistake-probability sampling (not softmax) in candidate-generator.js
metadata: 
  node_type: memory
  type: project
  originSessionId: 7f3e0be4-f588-42cb-9d09-24ebb8b1c052
---

`solverWeightedPosition` in `candidate-generator.js` uses mistake-probability-based sampling.

**Dead code — `solverWeightedPositionSoftmax`** (preserved but uncalled):
- Drew two random temperatures `T1, T2 ∈ [0.1, 4.1)`.
- Sampled moves via softmax with those temperatures per player.
- Trace recorded `temperature_p1`, `temperature_p2`.

**Active function — `solverWeightedPosition`:**
- Draws two random mistake probabilities `MP1, MP2 ∈ [0, 0.5)`.
- On each move, with probability `mp`: plays the second-best column (deliberate mistake).
- Otherwise: picks uniformly at random among the best columns (argmax with random tie-breaking, no temperature).
- If only 1 legal column or all legal columns tie for max score, the mistake path is skipped.
- Trace records `mistake_prob_p1`, `mistake_prob_p2`, and per-ply `mistake: true/false`.
- Same signature and return type as the softmax original.

**To revert:** swap the call site back to `solverWeightedPositionSoftmax`.
