# Auditor Brief — VERIFY pass (freeze the golden `reason` for one case)

You are an **auditor** in the **pre-implementation verification** of the *unified* `reason` algorithm
(`docs/epics/unified-blunder-reason-epic.md`, iteration 3). The artifact under test is the **algorithm on
paper** (§4 contract, §5 router, §8 gates, §15 grader). For ONE case you hand-derive the `reason` the §5
router prescribes, confirm every clause is solver-grounded, and **freeze it as the golden answer**.

Scientific method per case: state the grain the router should produce → gather solver/PV evidence → try to
**refute** it (find a fact the payload can't carry, a non-canonical cell, a wrong controller) → record the
golden reason + verdict. **No verdict without a reproducible command behind it.** A reason that merely
"reads plausibly" is NOT verified.

## The five grains (§4) — exactly ONE body keyed by `grain`

ALWAYS present: `outcomeDelta{best,played}`, `register{bestPlies,playedPlies,phase,word}`, `grain`,
`winner` (player|opponent|none), `betterMoveDoes` (templated from verified fields ONLY — no mechanism
clause absent from the payload).

- **`line`** — a concrete winning four is nameable on the crux branch (flip-to-loss / flip-to-win /
  both-win conversion / both-lose resistance / forced-terminal zugzwang). Body `line:{ playedLine,
  bestLine }` each `{completingCell,window,completingPly,forced:"yes"|"no"}|"absent"` (≥1 present).
- **`line_parity`** — the completing four is a STANDING threat whose OWNERSHIP flips. Same `line` body PLUS
  `parity:{controller(player|opponent FROM SOLVER FLIP), mechanism(z_threat|claimeven),
  ownerParity(odd|even = ROW parity of controlling cell), surrenderedCell, enabledCell}`.
- **`opening_principle`** — near-empty, no threats, line-participation solver-monotone. Body
  `principle:{name:"line_participation", bestCellFours:<int>, playedCellFours:<int>}` (best strictly more).
- **`zugzwang_class`** — FLIPPING, diffuse, no canonical cell. Body `zugzwang:{noThreatWithinPlies:<int>}`.
- **`not_a_blunder`** — same-floor, no discriminating reachable line. Body = header only; winner:"none";
  betterMoveDoes = "position already decided; this move did not change the result reachably."

Honest-negatives are **truthy enum words** (never false/0/[]). `register.*Plies = 43 − 2·|score| − discs`
(draws → "none"). `phase`: opening if discs≤6 → word "opening"; else word immediate(≤2) /
forced_sequence(≤10) / slow_zugzwang(near fill).

## §5 router (deterministic; reads the dual PV)

```
flip = (outcomeDelta.best != outcomeDelta.played)
1. (not flip) AND no discriminating winning four reachable on either PV → not_a_blunder
2. ELSE a winning four re-solve-confirmed decisive on crux branch (threat alive in one branch & dead in
   other / accelerated opp line on played / forgone player win on best / FORCED terminal board-fill):
     IF standing threat whose ownership flips → line_parity   ELSE → line
3. ELSE near-empty opening AND line-participation solver-monotone → opening_principle
4. ELSE flip → zugzwang_class
```
Sub-rules: flip-to-loss → run OPTIMAL-mode re-solve of the PLAYED branch to populate the opponent line
(mistake-mode lines are phantoms). Earliest-surfacing candidate cell must pass the decisiveness gate
(winningLines>1 OR completes under optimal defense OR forced terminal). Non-forced terminal → do NOT name
→ zugzwang_class (flip) / not_a_blunder (same-floor).

## §8 soundness gates (the never-fabricate heart)
1. Outcome from solver pre-move (fall back when losing_either_way labels null).
2. Name a cell ONLY when re-solve-confirmed decisive OR forced terminal board-fill. Never the earliest
   blockable threat; never a non-canonical diffuse terminal.
3. `line_parity.controller` from the SOLVER FLIP; cell by ROW parity. Never empty-square parity counts.
4. `opening_principle` only when near-empty AND line-participation monotone with solver across candidates
   (it inverts mid-game — never emit there).
5. `zugzwang_class` asserts no-threat only when forward search confirms it, flipping cases only.
6. `not_a_blunder` for same-floor with no discriminating reachable line (never "lasts longer/wins sooner").
7. `betterMoveDoes` templated from verified fields only.

## Domain conventions
- 0-indexed internal (row0=bottom, col0=left). Cell strings `cNrM` are 1-indexed (c1r1 bottom-left,
  c7r6 top-right). Movestring digits + move_played/correct_move are 0-indexed columns.
- perspective 1 = P1 (Green, odd rows); 2 = P2 (Gray, even rows). Mover = even disc count → P1 to move.
- Solver score (player to move): >0 win, 0 draw, <0 loss. Forward distance = 43−2·|score|−discs. −1000 = full-col.
- Case data: read board_state/move_played/correct_move from
  `connect-four/server/scripts/eval_set_large_3.json` (array; find your id).

## Tools (run from `connect-four/`; visualize from repo root)
- `./visualize_board.sh <ms>` — ASCII board, per-col scores, threats, par row. Visualize pre-move, best, played.
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs <ms> <col...>` — register.
- `node server/scripts/reason_audit/TOOLS/optimal_line.mjs <ms>` — dual-PV engine → terminal completing
  cell/window/ply. Run on the BEST branch (ms+correct) and the PLAYED branch (ms+played).
- `node server/scripts/reason_audit/TOOLS/decisive_check.mjs <ms> <cell>` — decisiveness gate.
- `node server/scripts/reason_audit/TOOLS/parity_cells.mjs <ms>` — same-perspective threat cells.
- `node server/scripts/reason_audit/TOOLS/forward_projection.mjs <ms> [maxPlies]` — threat landscape (diffuse check).
- Inline solver: `cd connect-four`; `import {createSolverProcess} from './server/c4solver-wrapper.js'`;
  parse `server/.env` manually; `await solver.query(ms)` → 7 scores; `solver.close()` in finally.
- Build a NEW diagnostic in `TOOLS/` (header comment: purpose/usage/io) if a needed check is missing; record in `tools_created`. Never run full `npm test`.

## Prior evidence
The iteration-2 sufficiency audit (`cases/<id>.md`, `HANDOFF.md`) already solved most boards. READ your
case's `cases/<id>.md` if present — reuse its solver outputs, cells, registers. Map the old kind → new
grain (concrete_line→line/line_parity; parity_control→line_parity; positional→opening_principle or
zugzwang_class; resistance→line if discriminating accelerated opp line else not_a_blunder;
conversion→line if sooner-and-discriminating else not_a_blunder). But CONFIRM cells/plies freshly with a
command — do not copy a number you cannot reproduce.

## Output — return compact + WRITE two files
1. `reason_audit/golden/<id>.json` — the full §4 payload (the golden reason).
2. `reason_audit/verify_cases/<id>.md` — verdict + evidence (commands + key outputs) + player_sentence + defect (if any).

Return to coordinator (lead with verdict + grain):
- `verdict`: SOUND | FABRICATION_RISK | WRONG_GRAIN | MISSING_FIELD | UNGROUNDABLE
- `grain` + the golden `reason` JSON (inline)
- `evidence`: exact commands + key outputs (scores, PV terminal cell + forced/diffuse, decisive_check, register, parity controller source, line-participation counts)
- `player_sentence`: the one-line coach feedback the vector enables (or the honest no-lesson note)
- `defect` (if not SOUND): the clause/field at fault + the minimal GENERAL epic change (new field/router rule/gate) — never a per-case patch
- `tools_used` / `tools_created` + one-line lesson + which not-yet-analyzed cases this makes redundant

UNGROUNDABLE = no grain can soundly handle this board (the 100%-coverage failure — means the epic itself
must change). Report the board + why every applicable grain fails or would fabricate.
