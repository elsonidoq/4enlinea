---
name: project_split_reveal_board_fit
description: SplitReveal board sizing — Spec 042 US6 freeze was SUPERSEDED by live-fit; green splitRevealZoom test does NOT mean the board is frozen
metadata: 
  node_type: memory
  type: project
  originSessionId: 127605a6-4544-4332-9d33-721f56e7c935
---

`SplitReveal.jsx` sizes the reveal board by `maxWidth = computeFrozenBoardWidth(containerH, splitPct)` using the **LIVE** `splitPct`, floored at `MIN_BOARD_W=120` so the cap is never dropped. The board now re-fits (zooms) as you drag the divider: shrinks when dragged up, grows when dragged down, always fully visible.

**This SUPERSEDES spec 042 US6 (FR-022, SC-009).** The old code froze `boardW` to the *open-time* split and gated it with `constrain = boardW >= 200`. Root cause of the reported mobile bug: when the SplitReveal container's available height got small, the frozen height-derived cap fell below 200, `constrain` went false, `maxWidth` was dropped, and `width:100%` blew the square board up to **full viewport width** (overflowing/clipping the short top pane). Do NOT "restore" the freeze thinking the zoom-on-drag is a regression — the zoom is the fix.

**Traps:**
- `tests/unit/splitRevealZoom.test.js` STILL PASSES after the fix because it only tests the pure `computeFrozenBoardWidth` (which stays frozen-by-signature). A green test here does NOT mean the rendered board is frozen. There is no regression test yet for "board never full-bleed / never exceeds the pane" (see docs/open_issues.md).
- `specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md §2` describes the old frozen behavior and is now STALE.
- The trigger is the container's **available height** (short device, tall/accumulating coach dialog, or a mobile dvh/address-bar shift) — NOT the drag itself. Dragging alone never changes `containerH`. Related: [[project_coach_board_reflow_flicker]].
