---
name: project_reason_parity_naming_detector_trap
description: "D7/D27 parity naming (namedRule) detector-contract traps — winner-to-move lock-in, cells:[], allen-v4 gap"
metadata: 
  node_type: memory
  type: project
  originSessionId: a8021832-0596-405a-a46a-b6d5fc874ce9
---

The D7 milestone landed as `parityAttribution.namedRule` (`nameParityRule` in `reasonEngine.mjs`,
DECISIONS D27): a parity-register win is named `allen-v3`/`allen-v4` only when the PRODUCTION
`detectZThreat`/`detectOddEvenThreat` confirm the completing cell, else abstain (`namedRule: null`).
Three non-obvious traps for anyone extending it (all I12 "read the detector's full contract"):

**Why:** the reused detectors' real return contract differs sharply from what a name-the-cell caller
expects, and naive use either abstains 100% or fabricates.

**How to apply:**
- **`detectZThreat`/`detectOddEvenThreat` return `cells: []` — ALWAYS.** The confirmable locus is
  `highlightMetadata` (a capsule `{column, fromRow, toRow, badgeCount}` for `detectZThreat`; **`null`**
  for `detectOddEvenThreat`). The z-threat completing cell is `cellStr(toRow, column)`; `badgeCount` =
  the odd inclusive count. Never test against `.cells`.
- **The capsule only appears on the non-recursive branch** (`perspective === board.currentPlayer`).
  When `perspective !== currentPlayer` both detectors take a recurse-over-children branch that returns
  `{matched, cells:[]}` with NO `highlightMetadata`. So you can only confirm when the WINNER is to move.
- **The "first 3-of-4" lock-in node is ALWAYS loser-to-move** (it's the node right after the winner
  places their 3rd window disc) → the detector can't emit a capsule there → literal spec names 0/193
  harvested parity wins. `findLockInNode` therefore requires the winner to be to move (advance past
  the first 3-of-4 node). Precedent: D23 `advanceToEnabledFork`.
- **`allen-v4` (P2/even) currently NEVER confirms — open gap.** `detectZThreat` matches only ODD
  counts; the `detectOddEvenThreat` fallback returns `highlightMetadata: null` (its evidence is a
  parity-CHOICE `categoryEvidence.goodRowCol/goodRow`, not a completing-cell locus), so
  `detectorConfirmsCell` can't confirm through it. P2/even parity wins abstain. Mapping retained for a
  future locus-exposing even-parity detector.

See [[project_reason_denial_always_occupation]], [[project_admin_fv_suff_repurposed]],
[[reference_classify_vs_classifyPattern]], [[project_narrator_vector_no_scores]] (`namedRule.zcount`
must survive the `/^scores?$|Score$/` scrub — nothing may end in `Score`).
