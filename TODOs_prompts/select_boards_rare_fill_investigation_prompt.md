# Investigation prompt — three never-reached coverage predicates in `select_boards.mjs`

> Paste everything below into a fresh, clear-context agent. It is self-contained.

---

You are investigating **why three predicates are never reached** by the Connect Four reason-eval
coverage harvest, and classifying each into one of three root causes. Repo (work in place):
`/Users/elsonidoq/prog/cuatro_en_linea` (branch `stagging`; the `connect-four/` subdir is the Node app).

**FIRST**, load and follow the `scientific-method-debugging` skill (Skill tool): for each predicate,
state hypotheses, design a discriminating experiment, run it, and conclude from evidence — do not guess.

## The three predicates under investigation

The coverage harvest `node server/scripts/select_boards.mjs --strategy coverage` walks self-play blunder
positions, runs each through `computeReason`, derives a set of coverage predicates per board
(`reasonPredicates(r)` in `select_boards.mjs`), and keeps harvesting until every REQUIRED predicate has
appeared `--target` times. In recent full runs these three **never appear** (log tail:
`never-seen(3): opp_neutralization parity_unnameable* opp_parity_unnameable*`; `*` = currently marked
PROVISIONAL/non-blocking, no `*` = REQUIRED and therefore blocks `satisfied()`):

- **`opp_neutralization`** — REQUIRED. Emitted by `reasonPredicates` via
  `if (op.kind) preds.add(\`opp_${op.kind}\`)` where `op = r.opponentPunishment` — i.e. it fires iff the
  engine sets `opponentPunishment.kind === 'neutralization'`.
- **`parity_unnameable`** — PROVISIONAL. Emitted via
  `if (lr.parityAttribution) preds.add(lr.parityAttribution.nameable ? 'parity_nameable' : 'parity_unnameable')`
  where `lr = r.lostResource` — fires iff `lostResource.parityAttribution` exists AND `.nameable === false`.
- **`opp_parity_unnameable`** — PROVISIONAL. Same as above but on `r.opponentPunishment.parityAttribution`.

## Your goal — classify EACH predicate into exactly one of:

1. **Structurally unachievable** — no legal Connect Four position can make the engine emit it. PROVE this
   by either (a) a reachability argument grounded in the engine code / the game rules, or (b) failing to
   construct a witness after a directed search (see method). If unachievable, it should be **removed** from
   `REASON_UNIVERSE` (or the code path that would emit it is dead) — say which, and why.
2. **A bug** — the predicate *should* be reachable but a code defect prevents the engine from ever emitting
   it (or emits the wrong thing). Localize the defect to a file:line and describe the fix. **Precedent to
   keep in mind:** decision **D23** found that `rd_double_threat_enabled_opponent` / `rd_figure_7_enabled_opponent`
   looked "rare / 0-in-60k" but were actually a **router-locus bug** (`realizedPattern` was checked one ply
   before the fork forms, so the route was structurally never taken). "Rare" is a hypothesis, not a
   conclusion — rule out a bug before accepting rarity.
3. **Genuinely rare in self-play** — reachable and correct, but the self-play mistake distribution makes it
   appear so infrequently that the diversity sweep + directed rare-fill don't hit it in a reasonable budget.
   If so, (a) construct/confirm at least one real witness board, and (b) recommend how to reach it reliably
   (e.g. a targeted sampler that probes for the specific engine condition along the game, a higher budget,
   or reclassify REQUIRED→PROVISIONAL with the evidence — matching the D20/D22 PROVISIONAL philosophy).

## Starting leads (VERIFY — do not assume they are correct)

- **`opp_neutralization` may be a DEAD predicate.** The token `neutralization` appears in the reason engine
  **only inside a comment** — `connect-four/server/scripts/reason_engine/reasonEngine.mjs:956`
  ("D26 — supersedes D18's 'non-fork keeps neutralization'"). This suggests decision **D26** may have
  removed the code that ever set `kind: 'neutralization'`. VERIFY by finding every place `opponentPunishment`'s
  `kind` is assigned (grep for `kind:` / `.kind =` in `reason_engine/`, and trace the half-builders) and
  checking whether `'neutralization'` is still a possible value. If it is never assigned, `opp_neutralization`
  is a stale REQUIRED predicate left in `REASON_UNIVERSE` after D26 — a coverage-list bug, not engine rarity.
  Read **D18** and **D26** in `docs/architecture/reason-DECISIONS.md` for the history.
- **`parity_unnameable` / `opp_parity_unnameable`** come from the parity-attribution `nameable` flag. The
  `nameable: false` paths are in `reasonEngine.mjs:475–485` — reasons `bad_cell`, `loser_disc_in_window`
  ("multi-window board-fill"), `completing_not_in_window`. Also see the gate at `reasonEngine.mjs:563`
  (`pa.nameable && half.register === 'parity' && half.terminal === 'win'`) and
  `reason_engine/TOOLS/forward_projection.mjs:10` ("diffuse board-fill with no single nameable cell"). The
  existing `select_boards.mjs` PROVISIONAL comment calls these "multi-window board-fill only." Determine
  whether an *unnameable* parity win (a diffuse board-fill where the winning 4-window contains a loser disc,
  or the completing cell falls outside the attributed window) is (i) structurally producible at all, and
  (ii) whether the engine actually reaches the `parityAttribution` assignment on such boards or short-circuits
  first. A parity win is already rare; an *unnameable* one is a sub-case — quantify how rare.

## Method / tools

- **Read the reason-engine docs FIRST** (project convention, in order):
  `docs/architecture/reason-INVARIANTS.md` (esp. I0 correctness-over-optimization, I12 validate a rule
  against its full case-space + a counterexample), `docs/architecture/reason-DECISIONS.md` (esp. D18, D20,
  D22, D23, D26), `docs/architecture/reason-case-taxonomy.md`, `docs/architecture/blunder-reason-evidence.md`.
  Also relevant KB: `docs/knowledge-base/` parity/zugzwang entries.
- **Run the engine on a board** — inline Node from `connect-four/`:
  ```js
  // node --input-type=module -e '...'  (from connect-four/)
  import { createSolverProcess } from './server/c4solver-wrapper.js';
  import { computeReason } from './server/scripts/reason_engine/reasonEngine.mjs';
  const solver = createSolverProcess();
  try { const r = await computeReason(movestring, playedCol, { solver });
        console.log(r.opponentPunishment?.kind, r.lostResource?.parityAttribution, r.opponentPunishment?.parityAttribution); }
  finally { solver.destroy(); }   // ALWAYS destroy in finally or the solver hangs
  ```
  Coordinates are **0-indexed internally** (row 0 = bottom, col 0 = left); `movestring` digits are
  **0-indexed columns**; `bestCol`/`playedCol` are 0-indexed. `cNrM` cell strings are 1-indexed.
- **Inspect a board**: `./visualize_board.sh <movestring>` from the repo root (prints an annotated board +
  threat/parity/score rows). Read `CLAUDE.md` "Working with movestrings" first.
- **Self-play sampling** is centralized in `connect-four/server/gameSampling.js`
  (`playGame` / `harvestBlunders`) — reuse it; do NOT hand-roll self-play. See
  `select_boards.mjs` (`--strategy coverage`) for how `reasonPredicates` is computed per board.
- **Constructing a witness is ALLOWED here** — this is diagnosis, not corpus generation. To test structural
  reachability you MAY build a board by directed search (a script that searches move sequences / probes all
  suboptimal columns for the specific engine condition) or, for a quick smoke test, by hand — the usual
  "never hand-build corpus boards" rule (`feedback_no_random_boards`) is about *harvesting eval corpora*, not
  about proving a predicate is reachable. If you hand-build, VERIFY it through `computeReason` +
  `visualize_board.sh`, and prefer a `playGame`/directed-search witness for the final evidence.
- Run tests with `npm run test:fast` inside `connect-four/` if you touch anything (baseline ~795 passing).
  **Do NOT run `test:fast` concurrently with any solver harvest / a second solver job** — they deadlock on
  solver IPC (documented gotcha). Do NOT run the full `npm test` (candidate-generator hangs).

## Scope / constraints

- This is an **investigation** — do NOT change engine soundness. If you find a bug, SURFACE it with a
  file:line + minimal repro and a recommended fix; do not silently patch `computeReason`. A follow-up may
  fix `REASON_UNIVERSE` (removing/reclassifying a dead or genuinely-rare predicate) — propose the exact edit
  but flag it for review rather than assuming.
- Do NOT push, open a PR, or commit engine changes. A docs/finding file + (optionally) a proposed
  `select_boards.mjs` REASON_UNIVERSE/PROVISIONAL edit for review is the expected output.

## Deliverable

Write your findings to `docs/architecture/reason-rare-predicates-investigation.md`:
- One section per predicate (`opp_neutralization`, `parity_unnameable`, `opp_parity_unnameable`) with: the
  hypotheses you tested, the experiment + evidence (engine outputs, witness board(s) or the failed directed
  search), and the **verdict** (structurally-unachievable / bug / genuinely-rare), plus the concrete
  recommendation (remove from universe / fix at file:line / reclassify to PROVISIONAL with the witness on
  record / add a targeted sampler).
- If any is a bug or a stale-universe entry, include the exact proposed edit (as a diff or precise
  instruction) flagged **for review, not yet applied**.
- A one-paragraph summary at the top: which of the three is which root cause.

End by reporting the three verdicts and the deliverable path.
