---
name: project_classify_pattern_perspective_trap
description: "classifyPattern's perspective is ROUTINELY not the side to move in production, so a score-consuming detector's non-mover branch is the common path, not the edge case — and _scores means the detector reads nothing"
metadata: 
  node_type: memory
  type: project
  originSessionId: bc83bcfc-d31a-4a85-b465-32eb56b1c65c
  modified: 2026-07-28T21:34:37.985Z
---

**Before changing how any `classifyPattern` detector handles `perspective`, know that
`perspective !== board.currentPlayer` is the COMMON case in production, not an edge case.**

Every one of these classifies a **post-move** board from the perspective of the player who just
moved — so the requested perspective is never the side to move:

- `classifyAiMove.js` — `aiPlayerInt = (movestring.length % 2) + 1` on `movestring + col`.
- `explainContext.js` optimal path — `safeClassifyPattern(movestring + bestCol, perspective)`, whose
  result feeds `POSITIVE_TEMPLATES`.
- `tagBlunder` Phase C — `P(moves + correctCol, blunderer)` for every `missed_own` tag.

So a detector whose score gate is hard-coded to the mover while its threats follow `perspective` is
wrong on the path users actually hit. That was **OI-74** (`detectUndercut`: it emitted the same
column twice with opposite owners) — fixed by deleting the parameter, because victim/beneficiary is
fixed by *who is to move*, not by an argument. `undercut` is now perspective-independent and reads
correctly at both seams: for the mover "the column you must not enter", for the player who just
moved "the undercut you just landed". **`detectOvercut` still has the defect — OI-76**, and it is in
`MISSED_OWN_PRIORITY`, i.e. always evaluated on the unsound branch.

**Do not group detectors by argument count.** `detectFigure7(board, _scores, perspective)` and
`detectJShape(board, _scores, perspective)` take three arguments but the second is `_scores` —
"unused — kept for caller signature compatibility". They are pure kernel convolutions over
`perspective`'s own discs and are sound for **any** perspective. Read the body, not the arity: this
memory exists because that exact mis-grouping put them in an open issue they didn't belong in.

Which detectors genuinely read `scores` in the sync (non-FR-033) branch: `detectUndercutVictim`
(no perspective, resolved), `detectOvercut` (OI-76). `detectForbiddenColumns` / `detectZThreat` /
`detectOddEvenThreat` take a `solver` and recurse into children for the non-mover case (FR-033).

Related: [[project_lesson_answer_set_invariant]], [[feedback_verify_at_the_source_layer]],
[[project_annotation_gate_and_zones]], [[project_missed_own_capitalize_principle]].
