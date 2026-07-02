---
name: project_reason_tag_realized_denied_router
description: "reason_engine tag-first realized/denied router — traps when touching computeReason's front-end routing or figure_7 naming"
metadata: 
  node_type: memory
  type: project
  originSessionId: 870ffe1a-8f1e-4177-8da8-2800e32adac9
---

The blunder-reason engine (`connect-four/server/scripts/reason_engine/reasonEngine.mjs`) has a **tag-first realized/denied router** in front of the sign-taxonomy engine (added 2026-07-01, on `stagging`, not merged). Authoritative design: `docs/architecture/reason-tag-fastpath-pseudocode.md`. Non-obvious traps not visible from a quick read:

- **The router is two-gated and CONSERVATIVE — it only ever *reduces* to the sign engine.** It fires only when (1) `tagBlunder` names a tag in `REALIZED_DENIED_TAGS = {immediate_threat, forced_block, double_threat, figure_7}` AND (2) `realizedPattern` can confirm that tag as a one-move pattern. If `realizedPattern` returns null, `realizedDeniedReason` returns null and `computeReason` **falls through** to the unchanged sign engine (I2 — don't fabricate what you can't exhibit). So adding a tag to the set is not enough to make it route.

- **Deep forks do NOT divert.** `tagBlunder`'s Phase C looks only **1 ply** past `correctCol`, so a fork that materializes deep (e.g. `214444115623`/4, ~10 plies) is tagged `drawing_move`, NOT `double_threat` → stays on the sign engine and keeps its D18 occupation witness (`c3r3`). This is intended (the realized half must be a *one-move* pattern).

- **`tagBlunder` NEVER emits `figure_7`** — `double_threat` outranks it in `MISSED_OWN_PRIORITY`/`ENABLED_OPP_PRIORITY` and `detectDoubleThreat` also matches Case-B stacked forks. The router recovers the distinction itself: `realizedPattern` returns `forkCase` (from `detectForkAt`) and `realizedDeniedReason` refines the emitted tag to `figure_7` when `forkCase==='B'` (else `double_threat`). The routing gate still keys off `tagBlunder`'s raw tag (both are in the set), so refinement happens post-gate.

- **The denied half is the D18 `findOccupationWitness`, generalized** so `denier`/`root` flip with the tag *direction* (not hard-wired to opponent/playedRoot). `missed_own`: denier=opponent on playedRoot. `enabled_opponent`/`defensive_miss`: denier=player on correctRoot (the ply-0 root pre-check fires for the defensive block, e.g. `3321234543` blocks `c4r5`). Which half is `lostResource` vs `opponentPunishment` is decided by **who owns the pattern** (see [[project_reason_field_unification]]).

- **ENABLED_OPPONENT FORK PLY-ADVANCE TRAP (D23, 2026-07-01).** For an `enabled_opponent` fork, `realizedRoot` is NOT `playedRoot` — the opponent's fork only materializes ONE ply later, after its fork-forming reply. A fork already on `playedRoot` (opponent to move) is impossible: it would be an immediate win caught by tagBlunder Phase B. So `realizedDeniedReason` calls `advanceToEnabledFork` (advance by an optimal opponent reply that `realizedPattern` confirms as a fork) for `direction==='enabled_opponent' && tag∈{double_threat,figure_7}`. WITHOUT this the route ALWAYS fell through → the two `enabled_opponent` fork predicates were永 0 (the old "0/60k rarity" claim was this bug, not rarity). `immediate_threat`/`forced_block` are standing threats already on their root → no advance. Don't "simplify" `realizedRoot` back to `playedRoot`.

- **`rd_double_threat_enabled_opponent` is now REQUIRED and common** (fills in ~48 coverage games post-fix); `rd_figure_7_enabled_opponent` reachable but PROVISIONAL (Case-B). The old harvests counted only *routed* hits, never the raw `tagBlunder` tag — which emits both readily. Follow-up: `/admin/fv-suff` viewer + explain-prompt rendering of `realized_pattern`/`denial` halves is NOT done (tracked in the design doc).

- **`gate` is NOT always `null` on the RD route (D24, 2026-07-02).** The old contract was "realized_denied → `gate:null`". Now, for a **both-losing** routed board (`bestScore<0 && playedScore<0`, ltfl signs), `realizedDeniedReason` RUNS `swindleGate` on `bestRoot` and carries `out.gate = {ran,verdict,witness,nodesVisited}` — the route still emits a Blunder (D20 intent), but the gate verdict is a DIAGNOSTIC counterplay signal (amends D4/I4: routed tags are exempt from D4's OMIT). Non-losing routed boards keep `gate:null`. Don't assume `gate===null` implies the RD route. (Caveat: this masks the [[project_reason_gate_width_cap_bug]] flips on routed boards.)

Related: [[project_reason_engine_reorg]], [[project_admin_fv_suff_repurposed]], [[project_reason_denial_always_occupation]] (D18), [[project_reason_engine_case_classifier_trap]], [[project_reason_gate_width_cap_bug]].
