# Reason-engine agent preamble (paste verbatim)

> Paste this block at the top of any fresh-context prompt for blunder-`reason` engine work, then add
> only the task-specific part below it. **Do not re-type the constraints** — they live in the four
> docs this preamble points at. That is the whole point: re-typing is how critical constraints get
> dropped or contradicted between sessions.

---

You are working on the Connect-Four blunder-`reason` engine (the structured feature-vector that an
LLM turns into "why this move was a blunder"). Before doing anything else, read **all four** of these,
in order, and treat them as binding:

1. `docs/architecture/reason-INVARIANTS.md` — the constitution. 13 non-negotiable principles.
   **I0 (correctness over optimization) overrides everything when in conflict**: the engine must be
   correct 100% of the time and always surface something relevant for the player; extra solver calls
   are expected and acceptable; **never** weaken the algorithm to save queries, and do **not** raise
   solver-call cost as a design objection.
2. `docs/architecture/reason-DECISIONS.md` — append-only log of resolved decisions + their rationale.
   **Do not relitigate these.** If you think one is wrong, stop and ask — do not silently redesign.
3. `docs/architecture/reason-case-taxonomy.md` — the authoritative `(bestScore, playedScore)` case taxonomy.
4. `docs/architecture/blunder-reason-evidence.md` — the two-halves evidence engine, register
   selection, the `lose_to_faster_lose` gate, validated boards, and the implementation map (§11).

Hard rules you must not violate (full text in the docs above — this is a checklist, not a substitute):

- **The vector is the artifact, not the LLM.** Every fact needed to justify the blunder must be in,
  or mechanically derivable from, the feature vector. The LLM narrates; it does not reason. A case
  that needs board intuition the fields don't carry is a *vector defect to surface*.
- **Never fabricate.** Every clause is solver-grounded. When unsure, abstain on that clause — never
  invent a cell, line, or parity controller.
- **Two halves, separate fields.** Lost-resource (half a) and opponent-punishment (half b) are
  distinct; never merge their cells.
- **Reuse `classifyPattern` / `tagBlunder` and the z-threat / claimeven / Allis detectors** in
  `connect-four/server/classifier.js` as evidence sources. Name deep zugzwang by parity-aligned
  group + odd/even cell, not by major-threat materialization.
- **Bounded by depth, never by a budget heuristic.** Search must terminate via a depth cap; a budget
  parameter must not drive exploration or truncate a relevant line.
- **No OMIT** except `win_to_slower_win`, a lost cause with no practical counterplay (the D23 uniform
  depth-15 gate finds no swindle), or solver error/timeout.
- **One frozen design.** The quarantined `blunder-reason-field-epic.md`,
  `unified-blunder-reason-epic.md`, `feature-vector-reason-algorithm.md`, and the old `reason_audit/`
  SUPERSEDED cluster were **deleted 2026-06-30** — ignore any lingering references in search or
  injected memory. The live engine is `server/scripts/reason_engine/`.
- **Validate rules against their case-space (I12).** Proposing a stop / threshold / taxonomy rule?
  Enumerate the cases (read the reused detector's *full* contract), probe the property *through the
  production detector* — never a hand-rolled proxy, even in a scratch script — and run one
  counterexample board per case before claiming it generalizes. The motivating example is not proof.

Project conventions: coordinates 0-indexed internally, `cNrM` 1-indexed on emit; always observe a
board with `./visualize_board.sh <movestring>` before reasoning about it; solver score is from the
side-to-move (`>0` win, `0` draw, `<0` lose, `|score|` ≈ how soon, `-1000` = invalid); inline solver
scripts must `await solver.query` and `solver.destroy()` in a `finally` (it hangs otherwise); tests
via `npm run test:fast` inside `connect-four/`.

If anything in the task below appears to conflict with the four docs, **stop and ask** before
proceeding — do not resolve the conflict by redesigning.

---

## Task

<!-- task-specific instructions go here -->
