---
name: project_reason_gate_width_cap_bug
description: "ACCEPTED known-gap (D25): swindleGate width caps (branch/tied/score-dedup) cause rare false NotABlunder WITHIN the depth bound — kept on cost grounds, do NOT 'fix' it"
metadata:
  node_type: memory
  type: project
---

**ACCEPTED known-gap — DO NOT reopen or "fix" without owner sign-off (owner decision D25, 2026-07-02).** The `lose_to_faster_lose` swindle gate (`swindleGate` in `connect-four/server/scripts/reason_engine/reasonEngine.mjs`) prunes on solver SCORE, not just depth: `gateBranch=3` (only 3 distinct-score opponent winning replies branched), `gatePlayerTiedCap=2` (only 2 tied-best player replies), and an unconditional **dedup-by-score** (`seenScore`). These **width** caps can drop real admissible swindles that exist *within* `gateMaxPlies=15`, so the gate's `NotABlunder` verdict is incomplete on **both depth AND width**.

**Why an agent would be surprised:** D23 / `blunder-reason-evidence.md` originally framed the gate's incompleteness as depth-only ("no practical swindle within 15 plies"). That's imprecise — a real swindle within 15 plies CAN be missed by the width pruning, producing a false OMIT (`computeReason` returns `notABlunder:true` → the player sees NOTHING on a genuine blunder). Confirmed via `TOOLS/gate_cap_ablation.mjs` (production `swindleGate` vs an uncapped/dedup-free reference at EQUAL depth; admissibility via the real `detectImmediateThreat`):
- User-visible counterexample: **`20312225101223110055056066165433` played 3, best 6** (both losing, SIGN route, no routed tag) → prod gate `found:false` (OMITS), reference `found:true`. Rate ≈ 1 user-visible false-OMIT per ~470 ltfl boards. (Boards that ALSO carry a routed tag are masked — the D24 router emits a reason anyway; the bug only surfaces on both-losing SIGN-route boards.)

**Why it's KEPT (not fixed):** the I0-motivated fix — drop the score-dedup + `gateBranch`/`gatePlayerTiedCap`, keep only `gateMaxPlies` + `gateNodeBudget` — was **considered and declined on cost grounds** (owner, 2026-07-02): the uncapped search visits many× more nodes (≈1k+ vs ≈200 per diff, unbounded worst-case) and that cost isn't worth eliminating a ~0.2%-of-ltfl false OMIT. The width caps ARE the accepted practical-chance policy: `NotABlunder` = "no swindle within depth AND width." D25 scopes this as an owner-accepted exception to I0 for the ltfl gate's `NotABlunder` side only — soundness-for-Blunder (I7: every emitted witness is real) is unaffected. So: if you rediscover this via the ablation tool, it is a DECIDED trade-off, not a regression — leave it.

Related: [[project_reason_eval_set_selector]] (D23 gate uniformization), [[project_reason_tag_realized_denied_router]] (D24 router carries the gate verdict, masking some flips), [[project_ltfl_gate_admissible_swindle]] (D19 admissibility), [[project_reason_field_unification]].
