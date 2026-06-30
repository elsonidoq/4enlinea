---
name: project_reason_denial_always_occupation
description: "The draw forces an occupation — so the committed win_to_draw denial's BFS / no_occupation / exhaustive design is over-built and partly misframed; draw_to_lose redesign pending"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3110d026-3363-4173-8fa4-5a0eac36f17f
---

The denial mechanism (D17 `win_to_draw` `opponentPunishment` fork-denial, and the planned
`draw_to_lose` flip) rests on a theorem the committed docs do NOT state and which contradicts parts
of D17 / `reason-opponentPunishment-spec.md`. Established + verified 2026-06-30; NOT yet implemented.

**Theorem.** A draw is a full board with no four. So for any 4-window W that would win for side S, a
drawn terminal has ≥1 cell of W occupied by the OTHER side (board full → that cell isn't empty).
Therefore in any drawn branch the non-winning side is FORCED to occupy ≥1 cell of W.
- `win_to_draw` (the PLAYED move draws): opponent occupies a cell of the player's fork window
  (e.g. `214444115623` played 4 → opponent takes `c3r3` at ply 1).
- `draw_to_lose` (the BEST move draws): player occupies a cell of the opponent's conceded winning
  window (verified `2444422235255630400333` best col1 → Green takes `c4r6` ply 33, `c5r6` ply 35;
  final top-row window `GREEN GREEN GRAY GRAY` → draw).

**What the committed code/docs get wrong (still unfixed):**
1. The denial is ALWAYS an occupation given enough depth — there is NO genuine "parity / refutation,
   no-touch" denial. The spec's `no_occupation` / refutation "honest-limits" are misframed; the
   parity "why" IS the concrete blocking cell (so D7 Allis naming is NOT needed to *exhibit* it).
2. `exhaustive:true` `no_occupation` is STRUCTURALLY IMPOSSIBLE (a drawn terminal fills W → the
   occupation is found at/before terminal). The committed two-valued `exhaustive` and the sourced
   `no_occupation` test board (`3333302111456114554542`, `exhaustive:false`) are really "occupation
   deeper than `depthCap=8`".
3. The BFS in `denyOpponentPunishment` is OVER-BUILT: a single optimal PRINCIPAL-VARIATION walk
   (`walkOptimal`, O(plies)) to the first node where the denier occupies a window cell (LIVE→DEAD)
   always yields a valid witness. No tree / depth-budget / `no_occupation` needed.

**How to apply.** Before touching the `win_to_draw` denial or implementing `draw_to_lose`, do NOT
trust the `no_occupation` / `exhaustive` / refutation framing in D17 / the spec — the denial is
always occupation; use a PV walk, not a BFS. Generalize the ONE primitive by `(denier, patternOwner)`
rather than adding a redundant function (Occam, I9). For `draw_to_lose`: half b stays the opponent's
conceded winning line; half a becomes "best denies it" (player occupies a cell of that window),
presented as TWO boards (best→draw, played→loss). The forced occupation can be DEEP (ply 33) — fine
for one walk. The `draw_to_lose` `tie` must be WINDOW-aware: it currently reports `independent` on
`2444422235255630400333` even though the lost `parity_group` cell `c6r6` is inside the opponent's
window. A self-contained implementation prompt for a clear-context plan-mode agent was drafted this
session (not saved as a file). See [[project_admin_fv_suff_repurposed]].
