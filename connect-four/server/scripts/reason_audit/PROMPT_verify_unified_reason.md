> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Coordinator Prompt — Pre-Implementation Verification of the Unified `reason` Algorithm + Golden Fixture

You are the **coordinator** of a systematic, evidence-driven verification. You orchestrate sub-agents;
you do **not** analyze cases yourself. Your job is to verify, **before any code is written**, that the
unified `reason` algorithm specified in `docs/epics/unified-blunder-reason-epic.md` would, for every eval
case, produce a reason that is **sound (never fabricated), concrete where it claims a cell, and honest
where no move-level lesson exists** — and to **record the per-case golden expected reason** that the
eventual implementation will be tested against.

The artifact under test is the **algorithm on paper** (the epic's §4 contract, §5 router, §6 register,
§8 soundness gates, §15 grader). You hand-derive each case's prescribed `reason` using the solver and the
diagnostics already built in `connect-four/server/scripts/reason_audit/TOOLS/`, confirm it against the
epic's gates, and freeze it as the golden answer. **No verdict without a reproducible command behind it.**

The case pool is `connect-four/server/scripts/eval_set_large_3.json` (66 cases). You analyze a
**representative subset of 20–30**, each chosen to exercise a routing branch / grain / soundness gate not
yet covered, and **extrapolate the rest via redundancy** (Occam — memory
`feedback_occam_principled_extrapolation`). The goal is 100% honest coverage of the 66; the overfitting
risk on this fixed set is accepted (project decision).

---

## 0. Operating principle (read first)

- **The bar is 100% SOUND COVERAGE — this is the success criterion, not a nice-to-have.** Every one of
  the 66 boards must receive **exactly one** of the five grains (`line` / `line_parity` /
  `opening_principle` / `zugzwang_class` / `not_a_blunder`) as a **sound, honest** reason. Crucially,
  `not_a_blunder` and `zugzwang_class` **are** valid sound outcomes (no cell required) — so "100%" means
  **a sound reason on every board, not a cell on every board.** A board that (a) falls through all five
  grains, (b) is routed to a grain whose only honest payload would be a fabrication, or (c) needs a fact
  no grain's payload can carry, is a **DESIGN DEFECT** of the epic to surface with the minimal fix —
  **never an acceptable gap.** OMIT is reserved for solver error/timeout only (epic §11). The whole point
  of the verification is to prove the algorithm hits 100% honest coverage *before* implementation, or to
  enumerate exactly the boards it cannot yet cover and what the epic must add.
- **The artifact under test is the algorithm + glossary, not a model.** A reason is **VERIFIED** only if a
  privileged checker (you, with the solver/board/tools) can confirm every clause is solver-grounded and
  the grain is the one the §5 router actually produces. A reason that merely "reads plausibly" is not
  verified.
- **Fabrication is the failure.** Any clause not supported by a solver/search check — a named cell that is
  blockable or non-canonical, a parity controller derived from a count, an `opening_principle` that isn't
  solver-monotone, a `zugzwang_class` that hides a nameable cell, a `not_a_blunder` that hides a
  groundable line — is a **defect to report**, not to wave through.
- **Two bars, both required.** (1) **Soundness:** no fabrication, grain matches the router, payload passes
  §15. (2) **Concreteness / honesty:** where the grain claims a cell (`line`/`line_parity`/
  `opening_principle`) the reason gives the player **actionable** feedback ("the better move makes/keeps/
  blocks four at C", "the center cell sits in more fours"); where it cannot (`zugzwang_class`/
  `not_a_blunder`) it **honestly says so**. A grain that claims a cell but isn't actionable, or admits
  defeat when a cell was available, fails this bar.
- **Occam guards against overfitting the 66 — apply it twice (memory `feedback_occam_principled_extrapolation`).**
  (1) *Selection:* don't analyze all 66; map redundant cases to a representative (§4/§5.1). (2) *Soundness
  of the golden answers and the fixes:* each golden reason must be the output of the **general §5 router
  applied mechanically** to the case — **never** a bespoke answer hand-tuned to make that one board "look
  explained." Likewise, any defect fix you propose must be a **general rule** (a grain / field / gate that
  follows from the §2 principle), **never a per-case patch.** **Red flag:** if a rule would help only one
  board, it is either a general rule stated too narrowly (state it generally) or a sign that board should
  route to `not_a_blunder` / `zugzwang_class`. The golden fixture must test the *general* algorithm, not
  memorized per-case outputs — that is the only thing that keeps "100% on these 66" from being overfit.
- **Scientific method per case:** state the grain the router should produce, gather solver/PV evidence,
  try to **refute** it (find a fact the payload can't carry, a cell that's non-canonical, a wrong
  controller), then record the golden reason + verdict.
- **Reuse the existing tools, and build new ones when they fall short.** `reason_audit/TOOLS/` and
  `reason_audit/cases/` already hold the dual-PV walker, the register computation, the parity pass, the
  decisiveness checker, the forward projection, and prior per-case evidence — **reuse before rebuilding.**
  But when a case needs a check no existing tool performs (a tighter forced-vs-diffuse test, a
  controller-from-flip confirmer, a line-acceleration differ, a canonicality prober, etc.), the auditor is
  **expected to write a new diagnostic** in `reason_audit/TOOLS/`, self-documented with a header comment
  (purpose, usage, inputs/outputs), and to record it in `tools_created`. These are durable assets the next
  agent must reuse. Building a tool to turn intuition into a reproducible check is encouraged, not a last
  resort — never wave a case through for lack of one.

---

## 1. Required reading (setup phase, before dispatching)

Read and distill, then pass the facts to sub-agents (do not make each re-read everything):

1. `docs/epics/unified-blunder-reason-epic.md` — **the algorithm under test.** Focus on §4 (the `reason`
   payload + the five grains), §5 (the IF-THEN router reading off the dual PV), §6 (register), §8 (the
   soundness gates — the never-fabricate heart), §9 (worked examples), §15 (grader checks).
2. `docs/architecture/feature-vector-glossary.md` — §1 (coordinates), §5.3 (lookahead), §6 (pruning).
3. `connect-four/server/scripts/reason_audit/REPORT.md` + `cases/UNIFY_*.md` + `cases/DESIGN_parity_*.md`
   — the prior evidence (why each rung is shaped the way it is; the redundancy maps).
4. `connect-four/server/scripts/reason_audit/TOOLS/` headers — what each diagnostic does.
5. Memories `project_reason_field_unification`, `feedback_occam_principled_extrapolation`,
   `reference_c4solver_scores`.

## 2. Domain conventions (inline — sub-agents need these)

- **Coordinates.** Internal code 0-indexed (row 0 = bottom, col 0 = left). Cell strings `cNrM` are
  1-indexed for display (`c1r1` bottom-left, `c7r6` top-right). Movestring digits and
  `move_played`/`correct_move` are **0-indexed** columns.
- **Players.** `perspective 1` = first player (Green, odd rows); `2` = second (Gray, even rows). Mover =
  even disc count → P1 to move.
- **Solver score** (player to move): `>0` win, `0` draw, `<0` loss. **Forward distance =
  `43 − 2·|score| − discs`** (larger |score| = sooner). `−1000` = full-column sentinel.
- **`./visualize_board.sh <movestring>`** (repo root) — ASCII board, per-column scores, threats, `par`
  parity row. Use on the pre-move, best, and played boards of every case.
- **Tools (from `connect-four/`):** `TOOLS/forward_distance.mjs <ms> <col...>` (register);
  `TOOLS/optimal_line.mjs <ms>` (the optimal PV → terminal completing cell/window — **the dual-PV
  engine**); `TOOLS/decisive_check.mjs <ms> <cell>` (decisiveness gate); `TOOLS/parity_cells.mjs`
  (same-perspective threat cells); `TOOLS/forward_projection.mjs <ms> [maxPlies]` (threat landscape over
  a horizon — for the diffuse / no-threat checks); `print_lookahead.mjs <ms> <playedCol> [depth]`.
- **Inline solver:** `cd connect-four`; `import { createSolverProcess } from './server/c4solver-wrapper.js'`;
  parse `server/.env` manually; `await solver.query(ms)` → 7 col scores; `solver.close()`/`destroy()` in
  `finally`. Never run full `npm test`.
- **Never hand-construct movestrings** — every position comes from `eval_set_large_3.json`, the solver, or
  a tool.

## 3. Build the case catalog (setup phase)

Reuse `reason_audit/CATALOG.md` if present and current; else regenerate via
`TOOLS/build_catalog.mjs`. For each of the 66 cases the catalog carries: `id`, `pattern_category`, disc
count, outcome of best vs played (solver), the **flip vs same-floor** split, `is_sparse`, `severity`. Add
one derived column: the **grain the §5 router should produce** (your cheap prediction — the auditor
confirms). This catalog is the only full-66 artifact you hold; it is the selector's input. Do not
deep-read cases yourself.

## 4. Coordinator workflow

Keep your context **lean**: hold only the catalog, the running handoff log, the tool registry, and each
auditor's compact verdict + golden reason.

**Phase A — Catalog & triage (you).** Build/refresh the catalog with the predicted grain per case.

**Phase B — Iterative select-and-verify loop.** Repeat until the selector declares saturation or you have
analyzed **30** (hard cap); do not stop below **20** unless saturated *and* **every Required-coverage class
(below) has ≥1 analyzed representative.** The number is not a target to pad to — the 2026-06-28 audit
reached saturation at ~19 because redundancy is strong (e.g. one both-lose case represented ~25 others).
Select for *distinct behavior*, not count: stop once new cases stop changing conclusions and every
Required-coverage class is hit.

1. **Spawn a `selector` sub-agent** (§5.1) with the catalog + the current handoff. It returns the single
   next case (or ≤3) most likely to exercise an unseen grain / router branch / soundness gate, or
   `SATURATED` with the redundancy mapping for the remaining cases.
2. **Spawn an `auditor` sub-agent** (§5.2) for the selected case(s). It returns a compact structured
   verdict **and the golden reason JSON**.
3. **Update shared state:** append the golden reason to `reason_audit/golden/<id>.json` (and a line to
   `reason_audit/GOLDEN.jsonl`), the verdict to `reason_audit/verify_cases/<id>.md`, the lesson to
   `reason_audit/HANDOFF_verify.md`, any new tool to the registry; mark the case analyzed in the catalog.
4. Loop.

**Required-coverage classes** (each needs ≥1 analyzed representative before saturation — these are the
distinct behaviors the 2026-06-28 audit *proved* exist; covering one per class is what makes the 20–30
sample principled rather than arbitrary. The `eval-N` ids are the audit's representatives; the selector
may pick any case in the same class):

- `line`, flip→loss, opponent four **on-board / fast** (the opponent line surfaces directly) — e.g. eval-32.
- `line`, flip→loss, opponent four **beyond the immediate horizon** (tests the played-branch optimal
  re-solve that fixes `decisiveLine.opponent` null) — e.g. eval-46, eval-51.
- `line`, flip, **forced terminal board-fill** cell (deep but canonical) — e.g. eval-6.
- `line`, **dual** (missed own win **and** enabled opponent, shared pivot cell) — e.g. eval-15.
- `line`, **defensive_miss** block (opponent threat pre-exists) — e.g. eval-27, eval-7.
- `line`, **both-win**, your four completes sooner — e.g. eval-43.
- `line`, **both-lose**, opponent four **accelerated** on the played branch — e.g. eval-42, eval-55.
- `line_parity`, endgame **standing threat whose ownership flips** — e.g. eval-5; include a **P2
  even-distance** threat (the odd-only detector misses it) — e.g. eval-49/58.
- `opening_principle`, near-empty, line-participation **monotone with the solver** — e.g. eval-0.
- `zugzwang_class`, flip, **diffuse non-canonical terminal** — e.g. eval-1, eval-2, eval-24.
- `not_a_blunder`, **both-win preference / identical cell** — e.g. eval-53, eval-63.
- `not_a_blunder`, **both-lose, no discriminating line / already-lost** — e.g. eval-8, eval-64.
- **Soundness-gate stress cases** (a naive rule *would* fabricate — the golden answer must REFUSE it):
  parity-count → wrong controller, must NOT emit `line_parity` (eval-2/eval-40); center-control mid-game,
  must NOT emit `opening_principle` (eval-1/eval-24); earliest threat blockable, decisiveness gate must
  reject the cell (eval-51).

**Phase C — Synthesis (you).** Aggregate into `reason_audit/REPORT_verify.md` (§6). State plainly whether
the algorithm, as specified, produces a sound + honest reason for **100%** of the represented case
classes; list every defect (fabrication risk, wrong grain, missing field) with the case that proves it and
the minimal epic change; and confirm the golden fixture covers all 66 (analyzed directly or mapped to a
representative).

> Use subagents for selection and per-case work so each starts focused and your context stays clean.

## 5. Sub-agent task specs

### 5.1 `selector` sub-agent

> **Inputs:** the catalog (analyzed-so-far marked) + `HANDOFF_verify.md`.
> **Question:** which not-yet-analyzed case most likely produces **new evidence** — exercises a grain,
> router branch, or soundness gate (forced-vs-diffuse terminal, parity controller-from-flip, opening
> monotonicity, same-floor not-a-blunder vs accelerated-line, dual-line, defensive_miss) not yet covered?
> Which cases are redundant (same grain, same outcome category, structurally similar) and representable by
> an analyzed case?
> **Method:** reason over the catalog + handoff only; you may glance at a board with `visualize_board.sh`
> to judge novelty. Do not deep-solve.
> **Return:** `next` (≤3 ids + a one-paragraph rationale naming the specific new evidence and the redundant
> cases it represents), or `SATURATED` (**every Required-coverage class in Phase B has an analyzed
> representative** and new cases have stopped changing conclusions; remaining cases each mapped to their
> representative). Target 20–30 total but **do not pad** — the audit saturated at ~19; select for distinct
> behavior, declare saturation as soon as the Required-coverage classes are all hit.

### 5.2 `auditor` sub-agent (derive + verify + freeze the golden reason for one case)

> **Case:** `<id>` — movestring, played, best, category (from `eval_set_large_3.json`), predicted grain.
> **Question:** what `reason` does the epic's §5 router produce for this case, is every clause
> solver-grounded (§8 gates), does it pass §15, and is it concrete-where-it-claims-a-cell / honest-where-
> it-cannot? Record the verified payload as the golden answer.
> **Procedure:**
> 1. `visualize_board.sh` the pre-move, best, played boards. Record solver scores, outcomeDelta, register
>    (`forward_distance.mjs`).
> 2. Compute **both optimal PVs** (`optimal_line.mjs` on the best branch and the played branch) → each
>    branch's terminal completing cell/window/ply and whether it is **forced** (unique winning
>    continuation) or diffuse.
> 3. Run the §5 IF-THEN router by hand; determine the grain. Show the evidence for the firing branch:
>    - `not_a_blunder`: same-floor AND confirm (via both PVs + `decisive_check`) no discriminating winning
>      four is reachable (no accelerated opponent line, no forgone player line).
>    - `line` / `line_parity`: name the crux completing cell; `decisive_check.mjs` it (must be
>      `winningLines>1`, complete under optimal defense, or a forced terminal). For `line_parity`, derive
>      `controller` from the **solver flip** and `ownerParity` from the cell's row — confirm a parity-count
>      derivation would have been wrong/ambiguous.
>    - `opening_principle`: compute 4-window counts per landing cell; confirm the ranking is **monotone
>      with the solver** across candidate moves (refute by checking a less-central equal-or-better move).
>    - `zugzwang_class`: `forward_projection.mjs` confirms **no major threat** for either side within the
>      horizon AND the terminal four is **non-canonical** (a different optimal line ends elsewhere); flip
>      only.
> 4. **Hand-build the §4 payload** (the golden reason) from the verified evidence; template
>    `betterMoveDoes` from those fields only.
> 5. Run the §15 grader checks for the grain. Then **try to refute**: is any named cell blockable or
>    non-canonical? Is the controller from a count? Does `opening_principle` survive a less-central
>    counter-move? Does `zugzwang_class` hide a nameable cell? Does `not_a_blunder` hide a groundable
>    line? Is there a fact the player needs that the payload can't carry (→ MISSING_FIELD)?
> 6. **Concreteness/honesty bar:** if the grain claims a cell, state the one-sentence player-facing reason
>    and confirm it is actionable; if `zugzwang_class`/`not_a_blunder`, confirm the honest message is
>    correct.
> 7. **If the existing tools can't perform a check this case needs, build a new diagnostic** in
>    `reason_audit/TOOLS/` (header comment: purpose/usage/inputs/outputs) and report it in `tools_created`
>    — reuse an existing tool first, but do not skip a check for lack of one. Extending a tool: update its
>    header and note the change in the handoff.
>
> **Return (compact, structured) + write `reason_audit/golden/<id>.json` (the §4 payload) and
> `reason_audit/verify_cases/<id>.md`:**
> - `verdict`: `SOUND` | `FABRICATION_RISK` | `WRONG_GRAIN` | `MISSING_FIELD` | `UNGROUNDABLE`
>   (`UNGROUNDABLE` = **no grain can soundly handle this board** — the 100%-coverage failure; this is the
>   one verdict that means the epic itself, not just a payload, must change. Report the board + why every
>   applicable grain fails or would fabricate.)
> - `grain` (the one the router actually produces) + the **golden `reason` JSON**
> - `evidence`: exact commands run + key outputs (scores, PV terminal cells + forced/diffuse, decisive_check
>   results, register, parity controller source, line-participation counts)
> - `player_sentence`: the one-line feedback the vector would let a coach give (or the honest no-lesson note)
> - `defect` (if not SOUND): the specific clause/field at fault + the minimal epic change (new field,
>   router rule, gate)
> - `tools_used` / `tools_created`
> - one-line lesson for `HANDOFF_verify.md` + which not-yet-analyzed cases this makes redundant
>
> Lead with the verdict + grain. Keep the final message tight.

## 6. Final report (`reason_audit/REPORT_verify.md`) + golden fixture

- **Golden fixture:** `reason_audit/golden/*.json` (one §4 payload per analyzed case) + `GOLDEN.jsonl`.
  For each of the 66, the case is either analyzed directly or **mapped to an analyzed representative** with
  the representative's golden reason marked as its template. State the coverage explicitly.
- **Selection log:** the 20–30 analyzed cases and the new evidence each provided; the saturation argument;
  the redundancy map for the skipped cases.
- **Coverage table:** every analyzed case → outcome category, grain, verdict, the one-line player sentence.
- **Headline:** does the algorithm, as specified, produce a **sound + honest** reason for 100% of the
  represented classes? If not, the exact count and the classes of defect.
- **Defect list (ordered by cases blocked):** each = a precise gap (fabrication risk / wrong grain /
  missing field / ungroundable-but-mis-routed), the case(s) that prove it, and the minimal epic change
  (a §4 field, a §5 rule, a §8 gate). These feed back into `unified-blunder-reason-epic.md` before `/specify`.
- **Tooling note:** which `TOOLS/` diagnostics were load-bearing (candidates to promote into the Stories).
- **Do not modify** the epic, glossary, or any production file. Output = the golden fixture + the report +
  the isolated tools. Recommendations go in the report for a human to apply.

Report faithfully: if a case is only "verifiable" by waving past a non-canonical cell or a count-derived
controller, mark it `FABRICATION_RISK` and name the clause. The goal is to freeze a **trustworthy** golden
answer for every case and to catch the design's holes **before** implementation — not to bless it.
