---
name: project_opening_defender_reason_gap
description: Opening defender reason (openingContext.defense) SHIPPED on opening-theory; non-obvious — centrality is NOT suppressed for a losing mover
metadata: 
  node_type: memory
  type: project
  originSessionId: 4f6802b0-e9e6-4ad7-83f4-13466dbbe726
---

**IMPLEMENTED (2026-07-05, branch `opening-theory`, Tasks 1–6 of the defender plan).** `openingContext`
now has a THIRD mutually-exclusive mode `defense` for a SECOND-player opening blunder on a known
first-player-win line: on-book real match + `player === 2` + `case === lose_to_faster_lose`;
`bestDefenseCol = bestCol` (solver least-bad hold, NO `bookNextCol`-equality). Precedence
namedOpening→defense→centrality. Authoritative: **reason-DECISIONS D32** + `blunder-reason-evidence.md`
§12 "Opening defense". Was silence at `3333344`/col2 (now `defense`, unique `allen-5-4-opening`) and
mis-framed centrality at `333`/col4 (now `defense`, family-only, `centralityGrounded:true`). Coverage
predicate `reason_opening_defense` (PROVISIONAL) + a deterministic Phase-1 opening step in
`select_boards --strategy coverage` (`--seed`, seed-local mulberry32) source it. Task 7 (the
coverage→compute --llm→grade eval loop) is run by the USER, not yet in the tree.

**Non-obvious owner correction (do NOT "fix" it back):** the original spec's "companion fix" —
*suppress `centrality` when the mover is losing* — was **dropped**. `centrality` is a VALID frame for a
losing second player: central play genuinely helps (more potential fours; even rows 2 & 4 favour the
2nd player, KB `allen-parity.md`). The real gap was the missing *goal*, not the framing. So:
- `centrality` gained `resistAndWait: player===2 && bestScore<0` (a canon "resist and hold, wait for a
  slip" signal for the prompt) and still fires for a losing mover.
- `defense` carries a resist-and-wait canon frame + a **conditional** centrality/even-row clause gated on
  `centralityGrounded` (= `detectCenterDominance(...) != null`: strictly more central AND ≤6 plies). It is
  **false** on the equidistant `3333344`/col2 (best col4 vs played col2, both dist 1 → no "more central"
  claim, I2-honest) and **true** on `333`/col4. Even-row parity is GENERAL canon only, never a per-board
  cell claim (upholds D24-F3).

Verify with `TOOLS/compute_feature_vector.mjs <ms> <playedCol>` (see [[reference_inline_node_scripts]]).
Related: [[project_select_boards_skips_openings]], [[project_reason_render_layer]]. **Render layer NOW
wired (D33, 2026-07-05):** opening boards render via `composeOpeningFrame` and DO carry a condition-D
`render_decision.openingContext` block — the "bypasses condition-D render" gap is CLOSED.
