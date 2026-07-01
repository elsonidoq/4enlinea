---
name: project_ltfl_gate_admissible_swindle
description: lose_to_faster_lose gate (D19) only counts ADMISSIBLE opponent mistakes; witness is not the shallowest min-oppScore node
metadata: 
  node_type: memory
  type: project
  originSessionId: 7a3bd32e-59c5-4cd4-9236-d3041b3a3e3d
---

D19 (2026-06-30) narrowed the `lose_to_faster_lose` swindle gate in `reason_engine/reasonEngine.mjs`: a node counts as a swindle only if the opponent has an **admissible** non-winning reply, where admissible = after the opponent's move the PLAYER has no immediate win-in-1 (`detectImmediateThreat(node+c, player)` empty). Unblockable player immediate threat (adm empty) → Blunder outright. The branching descent recurses only over `adm ∩ winningCols`.

**Why:** the old rule `min(oppScores) ≤ 0` credited a swindle even when the opponent's non-winning reply just *hung* the player's immediate threat — i.e. it assumed a stupid opponent. That is not counterplay worth teaching (owner directive: "the opponent always blocks immediate threats").

**How to apply / gotcha:** the gate witness is **no longer the shallowest `min-oppScore` node**. When a player immediate threat is present the search descends *through* the forced block, so the witness node is deeper and different. Canonical case `332123` played 4: old witness `3321232` (opponent skips the `c3r4` block); D19 witness `33212322543` (still Blunder, but no swindle move hangs a win-in-1). No pre-existing fixture verdict flipped — the change is conservative (re-sites/removes inadmissible witnesses only).

IMMEDIATE threat (gravity-top group-of-3 completable in one drop) ≠ MAJOR threat (group-of-3 not completable in one move) — the gate consults only `detectImmediateThreat`. See [[project_reason_engine_case_classifier_trap]], [[project_reason_denial_always_occupation]]. Authoritative: `reason-DECISIONS.md` D19 (amends D4), `blunder-reason-evidence.md` §5.
