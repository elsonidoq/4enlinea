> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Auditor Brief — read this fully before analyzing your case

You are an **auditor** in a feature-vector sufficiency audit. You deeply analyze ONE Connect Four
blunder case and decide whether a designed `reason` field could explain WHY the played move is a
blunder **from the engineered feature vector alone** — zero LLM inference, zero human board
re-reading. Scientific method: hypothesize → gather solver/board evidence → try to REFUTE → verdict
backed by reproducible commands. "Reason omitted" or "passes the mechanical check but doesn't actually
explain the mistake" both = FAILURE you must report.

## The `reason` field under test (epic: docs/epics/blunder-reason-field-epic.md)

Discriminated union on the vector. ALWAYS present:
- `register`: immediate | forced_sequence | slow_zugzwang | lost_or_won_opening
- `kind`: concrete_line | parity_control | positional | resistance | conversion
- `outcomeDelta`: { best: win|draw|loss, played: win|draw|loss }
- `betterMoveDoes`: TEMPLATED from verified fields ONLY (names bestCell + payload cell(s) +
  outcome/register words; asserts NO mechanism — parity/fork/etc. — absent from the payload. Any
  extra causal clause = REJECT).

EXACTLY ONE payload by kind:
- `line` (concrete_line, FLIP only): {winner player|opponent, completingCell cNrM, col, winningLines, realizedOnPly}.
  completingCell MUST be re-solve-confirmed decisive: winningLines>1 OR terminal board-fill cell OR
  window completes under optimal defense — NEVER the earliest-surfacing (possibly blockable) immediate_threat.
- `control` (parity_control, FLIP only): {controller, mechanism z_threat|claimeven, keptCells [..] NON-EMPTY, surrenderedCells [..]}.
- `principle` (positional, FLIP): {name e.g. center_control, bestCells [..], playedCells [..]}.
- `resistance` (SAME-floor BOTH-LOSE): {loserSide, speed slower|same, punishable win|draw|none}. punishable = reachability.played.ceiling.
- `conversion` (SAME-floor BOTH-WIN): {winnerSide, speed faster|same, extraLines some|none}.

## Routing ladder (epic §5) — splits on outcome FLIP first
- **FLIP** (outcomeDelta.best ≠ outcomeDelta.played): parity_control → concrete_line → positional → else OMIT.
  - parity_control ONLY if a SAME-PERSPECTIVE detector pass yields NON-EMPTY kept/surrendered cells that
    DIFFER between best & played boards and the controller flips.
  - positional = center control / centerDominance on sparse/opening boards.
- **SAME-floor** (best = played): resistance (both lose) / conversion (both win) → else OMIT.
  - Same-floor reasons are about MISTAKE-CHANCE, not a tactic: resistance = "better move lasts longer →
    more chances for opponent to slip" (punishable from reachability.played.ceiling); conversion = "better
    move wins sooner → fewer chances to throw it away".
  - A concrete cell is attached to a same-floor reason ONLY if a re-solve confirms it is the genuine
    decisive/punishable cell (never the earliest blockable threat).
- else (either branch) → reason OMITTED. On solver error → omitted.

## register from the REPAIRED forward distance
Live `outcomeTiming.pliesToEnd` = Math.abs(score), whose direction is INVERTED (a known bug). The TRUE
forward distance = `43 - 2*|score| - currentDiscs`. Smaller |score| = SLOWER = larger distance.
Use `node server/scripts/reason_audit/TOOLS/forward_distance.mjs <movestring> <col> [col2...]`.
Buckets (cutoffs are an open §13.1 decision): immediate ≤2, forced_sequence ≤10, slow_zugzwang near fill.

## §14 grader checks (differ by branch)
Always: every named cell exists on its snapshot board; outcomeDelta matches solver; register matches the
forward-ply bucket; betterMoveDoes asserts no extra mechanism.
- FLIP/concrete_line: line present on played branch, absent on better branch, outcome flips, completingCell re-solve-confirmed decisive.
- FLIP/parity_control: keptCells/surrenderedCells NON-EMPTY, controller flips (same-perspective pass), outcome flips.
- FLIP/positional: named principle holds on solver and differs between the two boards.
- SAME/resistance: speed matches repaired outcomeTiming (slower ⇒ better move's forward distance strictly larger); punishable matches reachability.played.ceiling; any cell re-solve-confirmed.
- SAME/conversion: speed matches (faster ⇒ better move's distance strictly smaller); extraLines matches a checkWin-geometry comparison (some ⇒ better board opens strictly more winning windows).

## Key traps
- `detectZThreat` returns `cells:[]` when perspective ≠ board.currentPlayer (classifier.js FR-033 path). For real parity cells run a SAME-PERSPECTIVE pass (reuse TOOLS/parity_cells.mjs if present).
- `pickEarliestWay` can surface a BLOCKABLE intermediate threat, not the decisive cell. Always re-solve-confirm a completingCell.
- Mistake-mode opponent lines are PHANTOMS (depend on the loser misplaying). Use OPTIMAL mode for punishing lines.
- bestOutcome/postBlunderOutcome are null for case `losing_either_way` — fall back to solver for outcomeDelta.
- A both-win or both-draw move with severity 0 may barely be a blunder — ask whether the reason honestly explains a mistake at all.

## Domain conventions
- Internal code 0-indexed (row0=bottom, col0=left). Cell strings `cNrM` are 1-indexed for display (c1r1=bottom-left, c7r6=top-right). Movestring digits + playedCol/bestCol are 0-indexed columns.
- perspective 1 = first player (Green, wins odd rows); 2 = second (Gray, even rows). Mover = (disc count even → P1 to move).
- Solver score from the player to move: >0 win, 0 draw, <0 loss; larger |score| = resolves sooner; -1000 = full-column sentinel.

## Tools (paths relative to connect-four/ unless noted)
- Board ASCII + per-col scores + threats + parity: from repo root `/Users/elsonidoq/prog/cuatro_en_linea` run `./visualize_board.sh <movestring>`. ALWAYS visualize pre-move, best, and played boards before reasoning.
- `node server/scripts/print_lookahead.mjs <movestring> <playedCol> [depth] [budget]` — distilled + raw lookahead (case, outcomeTiming, decisiveLine, reachability, categoryExamples, oppCategoryExamples). Default depth 20; raise to 24/26 for deep lines.
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs <movestring> <col> [col2...]` — repaired forward distance + register. REUSE for register checks.
- Inline solver: `cd connect-four`; `import { createSolverProcess } from './server/c4solver-wrapper.js'`; parse `server/.env` manually (dotenv unreliable in node -e); `await solver.query(ms)` → 7 col scores; `solver.destroy()` in a finally.
- Detectors: `connect-four/server/classifier.js` (`detectZThreat`, `detectClaimeven`, `checkWin`, `categorizeThreats`, `detectImmediateThreat`, `Board`).
- Build any new diagnostic under `connect-four/server/scripts/reason_audit/TOOLS/` with a header comment (purpose/usage). CHECK what's there first and REUSE. Never run full `npm test`.
- Case data: read your case's `board_state`/`move_played`/`correct_move` from `connect-four/server/scripts/eval_set_large_3.json` (object with your id).

## Procedure
1. visualize pre-move, best, played boards; record solver scores, each move's outcome, the flip/same-floor branch.
2. Confirm the kind the ladder ACTUALLY produces (don't trust the catalog guess) by running the relevant search/detector at sufficient depth.
3. Hand-build the full `reason` payload from REAL evidence (register via forward_distance; decisive/punishable cell re-solve-confirmed; speed/punishable/extraLines enums from outcomeTiming/reachability/checkWin).
4. Run the §14 checks for that branch. Then the HARDER question: does the payload actually EXPLAIN the mistake to a coach, or merely pass a mechanical check? Find any fact a coach needs that the vector lacks.
5. Build a diagnostic if reasoning is hard (reuse existing first).

## Return (compact, structured) — also WRITE it to `connect-four/server/scripts/reason_audit/cases/<id>.md`
- `verdict`: SUFFICIENT | INSUFFICIENT | ROUTING_GAP | PAYLOAD_UNGROUNDABLE | DECISIVENESS_FAIL
- `routed_kind` (ACTUAL, vs catalog guess) + the hand-built `reason` payload (full JSON)
- `evidence`: exact commands run + key outputs (scores, cells, realizedOnPly, register, ceilings)
- `missing_signal` (if not SUFFICIENT): the specific field/fact the vector lacks + a concrete proposal (new field / new kind / repaired computation)
- `tools_used` / `tools_created`
- one-line lesson for the handoff log, noting which not-yet-analyzed cases this likely makes redundant

Lead with the verdict. Keep the final message tight — it goes into a coordinator's lean context.
