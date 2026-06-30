---
name: project_reason_denial_always_occupation
description: "A draw forces an occupation, so the denial witness is ALWAYS an occupation — no_occupation:exhaustive=true is structurally impossible (depth artifact only); the retired BFS / D17 §3 / reason-opponentPunishment-spec describe a superseded design"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3110d026-3363-4173-8fa4-5a0eac36f17f
---

IMPLEMENTED 2026-06-30 as **D18** (`reason-DECISIONS.md`): one unified PV-walk primitive
`findOccupationWitness(solver, root, {denier, windows, depthCap})` in `reasonEngine.mjs` powers BOTH
`win_to_draw` half-b (denier=opponent, root=playedRoot, windows=player fork windows) and the new
`draw_to_lose` half-a (denier=player, root=bestRoot, windows=opponent's conceded window). The old
BFS `denyOpponentPunishment` is DELETED.

**Theorem (now stated in D18).** A draw is a full board with no four, so any 4-window W that would
win for side S has ≥1 cell held by the OTHER side at the drawn terminal. Therefore the non-winning
side is FORCED to occupy a cell of W on the optimal drawn PV — a single argmax walk to terminal
always finds the LIVE→DEAD witness; no tree/BFS needed.

**Trigger-first gotchas an agent reading the code/old docs would be bitten by:**
1. `no_occupation` with `exhaustive:true` is STRUCTURALLY IMPOSSIBLE — the draw fills W before
   terminal. `no_occupation` now fires ONLY on a deliberately small `depthCap` or a non-terminal
   solver error (`exhaustive:false`). Do NOT add a "real no_occupation" fixture board or treat
   `no_occupation` as a meaningful verdict; the witness test uses a tiny `depthCap` to exercise the
   fallback path on purpose.
2. **D18 supersedes the "shallowest-by-BFS" portion of D17 §3.** The win_to_draw witness is now the
   *first* occupation on the canonical optimal PV, NOT the *globally shallowest across all optimal
   lines*. `reason-opponentPunishment-spec.md` and D17 §3 still describe the retired BFS/no_occupation
   framing — they carry a "superseded in part by D18" note; trust D18, not their §3 contract.
3. `draw_to_lose` half a is now `kind:'denial'` (occupation witness), NOT `parity_group`/
   `defensive_hold`; the tie is WINDOW-aware `tied` (the player's blocking cell is inside the
   opponent's window) — it used to falsely report `independent` (e.g. `2444422235255630400333`,
   cell `c4r6`). The tactical sub-case falls out as a ply-0 root pre-check occupation (`line:[]`),
   no special-case. The forced occupation can be DEEP (ply 33) — fine for one O(plies) walk.
4. The root pre-check checks only `cell ∈ window` (it skips the killedWindow LIVE-before test, which
   can't see an already-dead-at-root window); sound because the only firing case (tactical hold) has
   W provably LIVE before the best move.

See [[project_admin_fv_suff_repurposed]] (the 4 canonical docs to read first) and
[[project_reason_field_unification]].
