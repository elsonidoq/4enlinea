---
name: project_reason_immediate_threat_phantom
description: "reason engine — immediate_threat/missed_own must detect on the PRE-move board, not correctRoot (already-won → phantom threat one row up)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0f207141-ad1a-4b24-85c2-71f0cd81ca0e
---

In `realizedDeniedReason` (reasonEngine.mjs), a STANDING win-in-1 tag (`immediate_threat`; `forced_block` is only ever `defensive_miss`) in the `missed_own` direction must have its realized pattern detected on the **pre-move `movestring`**, NOT on `correctRoot = movestring+bestCol`. For these tags the best move COMPLETES the four, so `correctRoot` is already WON, and `detectImmediateThreat` there reports a PHANTOM three-in-a-row one row above the just-completed four.

Symptom (eval-26 `332123542241313` played 5): lostResource emitted `completingCell:c2r5`, window `c2r2-c2r5` instead of the true `c2r4` / `c2r1-c2r4` (a vertical completion). Horizontal/diagonal completions instead report an unrelated threat or spuriously fall through to the sign engine (e.g. `411553444201633334651` — a diagonal — used to fall through and is now correctly routed realized_denied).

Fix (2026-07-02): `realizedRoot = STANDING_THREAT_TAGS.has(tag) ? movestring : correctRoot` for `missed_own`. Forks (`double_threat`/`figure_7`) are BUILT by the best move, so they keep `correctRoot`.

**Why it hid so long:** reasonEngine.test.mjs `return`s early for `realized_denied` rows, BEFORE the "completingCell occupied on finalMovestring" invariant — so the phantom was never geometry-checked. The test now runs a root-geometry invariant on the realized half (owner must NOT already have won on the half's board; completingCell is the sole empty window cell). See [[project_reason_tag_realized_denied_router]].

Doc that encoded the WRONG assumption (now corrected): `reason-tag-fastpath-pseudocode.md` line ~45 claimed such completions "fall through" — they do not for vertical completions.
