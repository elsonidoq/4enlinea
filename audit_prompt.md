# Coordinator Prompt — Feature-Vector Sufficiency Audit for the `reason` Field

You are the **coordinator** of a systematic, evidence-driven audit. You orchestrate sub-agents; you do **not** analyze cases yourself. Your job is to determine whether the **`reason` field** designed in `docs/epics/blunder-reason-field-epic.md` would let us explain **why a move is a blunder using the feature vector alone** — with **zero reliance on an LLM's reasoning**. Every fact a coach needs to justify "this move is worse than the best move" must be **present in, or algorithmically derivable from, the engineered feature vector**. If understanding a case requires re-reading the raw board or inferring something the fields do not carry, that is an **unaddressed issue** you must surface.

The case pool is `connect-four/server/scripts/eval_set_large_3.json` (66 cases). **You will not analyze all 66** — many are redundant. You will analyze a **representative subset of 20–30 cases**, chosen so that each added case is likely to yield **new evidence**. Both *which case to analyze next* and *each case's deep analysis* are delegated to sub-agents so your own context stays lean.

The deliverable is a report stating, per analyzed case, which `reason` kind it routes to, whether that `reason` is **sufficient and grader-verifiable**, and a consolidated list of **gaps the epic must close to reach 100% coverage**.

---

## 0. Operating principle (read first)

- **The artifact under test is the feature vector + glossary, not a model.** Treat the LLM as a narrator that can only restate fields. A case is **EXPLAINED** only if a privileged checker (you, with the solver/board) can reconstruct the full causal reason from the `reason` payload + the surrounding engineered fields — never from board intuition.
- **"Reason omitted" = FAILURE for this audit.** The epic's ladder has an `else → omit reason` fallback. For the *sufficiency* question, any case that falls through to no kind, or whose `reason` is computable but does **not** capture why the move is a mistake, is an **uncovered case** to report (it likely needs a new kind, a new field, or a new diagnostic).
- **Scientific method per case** (enforce this on every audit sub-agent): state a hypothesis, gather solver/board evidence, attempt to **refute** it, then record a verdict with the evidence that supports it. No verdict without a reproducible command or script behind it.
- **Select for new evidence, not coverage for its own sake.** The goal is to find every *class* of sufficiency problem with the fewest cases. A case earns analysis only if it plausibly exercises a routing branch, payload kind, register band, or failure mode not yet seen.
- **Build diagnostics when reasoning is hard.** A sub-agent may, for a tricky case, implement a **principal-variation extractor**, a **branch player** (play out the blunder line vs the best line move-by-move under solver play), a **decisiveness re-solve checker**, a **same-perspective parity-cell detector**, or any other script that turns intuition into a reproducible check. These tools are durable assets (see §5).

---

## 1. Required reading (do this in the setup phase, before dispatching)

Read and internalize, then pass the distilled facts to sub-agents (do **not** make each sub-agent re-read everything):

1. `docs/epics/blunder-reason-field-epic.md` — **the design under test.** Focus on §4 (the `reason` shape), §5 (the flip vs same-floor routing ladder + the decisiveness gate), §6 (register), §7 (transition matrix), §10 (settled decisions), §14 (grader acceptance contract). The five kinds are: `concrete_line`, `parity_control`, `positional`, `resistance`, `conversion`.
2. `docs/architecture/feature-vector-glossary.md` — **the contract the narrator reads.** Note §5.3 (`lookahead`: `case`, `outcomeTiming`, `decisiveLine`, `reachability`, `edgeType`, `categoryExamples`), §6 (pruning: falsey/empty values are stripped), and the `pliesToEnd` known-issue (currently `Math.abs(score)`; **smaller magnitude = resolves LATER**; the epic's Story A repairs it to a forward distance).
3. `connect-four/server/sparseLookahead.js` — `runSparseLookahead` (four return paths, the case-1 short-circuit), `searchOpportunities` (opponent `optimal` vs `mistake` mode, `dedupeByScore`), `buildDecisiveLine`/`pickEarliestWay` (the line comes from the **earliest** `immediate_threat` — which can be a *blockable* intermediate, not the decisive cell), `collectNovelOpportunities`/`compareOpportunities` (the **shared production seam** — read, never modify).
4. `connect-four/server/explainContext.js` — `toFeatureVector` (the projection the `reason` attaches to).
5. `connect-four/server/classifier.js` — the detectors the design calls: `detectZThreat`, `detectClaimeven`, `categorizeThreats`, `checkWin`, `detectImmediateThreat`. **Trap:** `detectZThreat` returns `cells:[]` when `perspective ≠ board.currentPlayer` (the FR-033 recursion path).

---

## 2. Domain conventions (inline — sub-agents need these and have clear context)

- **Coordinates.** Internal code is **0-indexed** (row 0 = bottom, col 0 = left). Cell strings in the vector are `cNrM`, **1-indexed for display** (`c1r1` = bottom-left, `c7r6` = top-right). Movestring digits are **0-indexed columns** (0–6). `playedCol`/`bestCol`/`move_played`/`correct_move` are **0-indexed**.
- **Players.** `perspective: 1` = first player (wins on odd rows, "Green"); `perspective: 2` = second player (even rows, "Gray"). The vector's `perspective` is whoever made the move under scrutiny ("you").
- **Solver score** (from the player to move): `>0` win, `0` draw, `<0` loss. **Magnitude = how soon: larger |score| resolves SOONER**; `|score|≈1` resolves at board-fill. `-1000` is the wrapper's INVALID_MOVE sentinel for a full column.
- **`./visualize_board.sh <movestring>`** (from repo root) — ASCII board + per-column scores + threats + parity. **Use it on every position; never reason about a movestring blind.** (Major/minor threats, gravity-top `<X>`, `[GT]`, parity `O/E`, `scr` row are all printed.)
- **`node server/scripts/print_lookahead.mjs <movestring> <playedCol> [depth] [budget]`** (from `connect-four/`) — prints the distilled + raw lookahead (case, outcomeTiming, reachability, decisiveLine, categoryExamples) for one position. Default depth 20, dedupe ON, no budget cap.
- **Inline solver scripts:** `cd connect-four` first; parse `connect-four/server/.env` manually (dotenv is unreliable in `node -e`); `import { createSolverProcess } from './server/c4solver-wrapper.js'`; `solver.query(ms)` is **async — await it**; wrap in try/finally and `solver.close()` (the solver can hang on leak).
- **Tests:** `npm run test:fast` inside `connect-four/`. **Never** run the full `npm test` (it hangs on `candidate-generator.test.js`).
- **Never hand-construct movestrings.** Every position you reason about comes from `eval_set_large_3.json`, the solver, or a script that plays real moves.

---

## 3. Build the case catalog once (setup phase)

The cases in `eval_set_large_3.json` are records `{ id, board_state (movestring), move_played, correct_move, pattern_category, predicates, is_sparse, severity, blunder_severity, ... }`.

Produce the **current** feature vectors for all 66 cases in a single pass — the raw material a `reason` would be computed from:

```bash
cd connect-four
rm -f server/scripts/eval_set_large_3_AUDIT.jsonl   # run_eval RESUMES if the output exists — always rm first
node server/scripts/run_eval.mjs server/scripts/eval_set_large_3.json server/scripts/eval_set_large_3_AUDIT.jsonl --no-llm
```

Each output row carries the built explain context + `prompt_data` (the vector + the distilled `lookahead`). The current vector does **not** contain `reason` (the epic isn't built yet) — the audit determines whether a **correct `reason` is computable and sufficient** from this raw material (plus any deeper search / re-solve / parity pass the epic proposes).

Then compute, for **all 66**, the cheap routing signals and write them to a compact **case catalog** at `connect-four/server/scripts/reason_audit/CATALOG.md` (one row per case): `id`, `pattern_category`, disc count, `outcomeDelta` (best vs played outcome from solver scores on `movestring`), the **flip vs same-floor** branch, the **expected `reason` kind** per the epic's §5 ladder, `is_sparse`, and `severity`. This catalog is the **only** full-66 artifact you hold; it is what the selector sub-agent reads. Do **not** deep-read individual cases yourself.

---

## 4. The coordinator workflow

You keep your own context **lean**: hold only the case **catalog** (§3), the running **handoff log**, the **tool registry**, and each audit sub-agent's compact verdict. Push *both* the next-case decision and the per-case exploration into sub-agents.

**Phase A — Catalog & triage (you).** Build `CATALOG.md` (§3). No deep analysis.

**Phase B — Iterative select-and-audit loop.** Repeat until the **selector** declares saturation or you have analyzed **30** cases (hard cap); do not stop below **20** unless the selector declares saturation *and* every distinct (branch × expected-kind) group in the catalog has at least one analyzed representative:

1. **Spawn a `selector` sub-agent** (§6.1). Give it `CATALOG.md` and the current `HANDOFF.md` (the cases already analyzed and what each taught). It returns the **single next case** (or a small batch of ≤3) that is most likely to yield **new evidence**, with a one-paragraph rationale — or `SATURATED` with justification. The selector exists so *you never have to load all 66 cases' detail to decide what's redundant.*
2. **Spawn an `auditor` sub-agent** (§6.2) for the selected case(s). It returns a compact structured verdict.
3. **Update shared state:** append the verdict to `cases/<id>.md`, the lesson to `HANDOFF.md`, and any new tool to the registry. Mark the case analyzed in `CATALOG.md`.
4. Loop. Each iteration's selector sees the updated handoff, so selection compounds on evidence.

**Phase C — Synthesis (you).** Aggregate verdicts into `REPORT.md` (§7). List every **unaddressed issue** with the case(s) that prove it and a concrete recommendation for the epic. State plainly whether the design, as written, can explain **100%** of the represented case classes from the vector alone — and if not, exactly what is missing.

> **Use subagents for selection and per-case work** so each starts with a focused context and your context stays clean. Dispatch them; collect their final structured messages; relay only what matters into the handoff log and report.

---

## 5. Shared workspace: tools folder + handoff context

Create and maintain, under `connect-four/server/scripts/reason_audit/` (an **isolated** folder we can later choose to incorporate or discard — do not wire it into the project):

- **`reason_audit/CATALOG.md`** — the full-66 routing catalog (§3); the selector's input; mark cases analyzed as you go.
- **`reason_audit/TOOLS/`** — every reusable diagnostic a sub-agent builds goes here, self-documented with a header comment (purpose, usage, inputs/outputs). Candidate tools (build on demand, not upfront):
  - `pv.mjs` — a **principal-variation extractor**: from a position, walk the solver's best line move-by-move to the decisive end, returning the move sequence and the completing window/cell. (Confirm the *actual* decisive cell vs the earliest-surfacing `immediate_threat`.)
  - `branch_play.mjs` — play out the **blunder line** and the **best line** under solver play, printing each board, so an agent can *see* how the game diverges and why one outcome differs.
  - `decisive_check.mjs` — given a `completingCell`, re-solve to confirm it is genuinely decisive (`winningLines>1`, terminal board-fill, or completes under optimal defense) and **not** blockable — the §5 decisiveness gate.
  - `parity_cells.mjs` — a **same-perspective** z_threat/claimeven pass returning the actual kept/surrendered cells (working around the `detectZThreat` `cells:[]` recursion trap).
  - Any other diagnostic a case demands.
  - The **next sub-agent must reuse an existing tool** rather than rebuild it; if it extends one, it updates the header and notes the change in the handoff.
- **`reason_audit/HANDOFF.md`** — the running context log. Each sub-agent appends a short entry: case id (or selection decision), verdict, tools used/created, and a reusable lesson or gotcha (e.g. "for both-lose cases, `reachability.played.ceiling` is the load-bearing signal"; "category X is redundant with case Y — same routing and same failure mode"). You pass the latest `HANDOFF.md` to the next sub-agent so knowledge compounds.
- **`reason_audit/cases/<id>.md`** — one compact verdict file per analyzed case (the §6.2 structured output).
- **`reason_audit/REPORT.md`** — your final synthesis (§7).

---

## 6. Sub-agent task specs

### 6.1 `selector` sub-agent (decide the next case)

> **Inputs:** `reason_audit/CATALOG.md` (all 66, with analyzed-so-far marked) and `reason_audit/HANDOFF.md` (what each analyzed case taught).
>
> **Question:** Which not-yet-analyzed case will most likely produce **new evidence** about the `reason` field's sufficiency — i.e. exercises a routing branch, payload kind, register band, pattern category, or suspected failure mode (deep zugzwang, blockable decisive cell, both-lose with no punish line, empty parity cells, sparse/opening positional, dual-line, defensive-miss) **not yet covered** by an analyzed case? Conversely, which cases are **redundant** (same branch, same expected kind, same category, structurally similar) and can be represented by one already-analyzed case?
>
> **Method:** reason over the catalog + handoff only; do **not** deep-solve cases (that's the auditor's job). You may glance at a candidate's board with `visualize_board.sh` to judge novelty, but keep it light.
>
> **Return (compact):** either
> - `next`: the chosen case id (or ≤3 ids), with a one-paragraph rationale naming the *specific new evidence* you expect and the *redundant cases* it represents; or
> - `SATURATED`: with the argument that every distinct sufficiency-relevant class already has a representative, and a list of the remaining cases each mapped to the analyzed representative that covers it.
>
> Respect the global budget: target **20–30** analyzed cases total. Prefer declaring `SATURATED` once new cases stop changing conclusions; do not pad to 30 for its own sake, and do not stop below 20 while uncovered (branch × expected-kind) groups remain.

### 6.2 `auditor` sub-agent (deep-analyze one case)

> **Case under audit:** `<id>` — movestring `<board_state>`, played `<move_played>`, best `<correct_move>`, category `<pattern_category>`, expected `reason` kind `<from catalog>`.
>
> **Question:** If the `reason` field from `docs/epics/blunder-reason-field-epic.md` were built, would the **feature vector alone** (the `reason` payload + register + outcomeDelta + the surrounding engineered fields) carry **everything needed to explain why the played move is a mistake** — with no reliance on board re-reading or LLM inference? Apply the scientific method; refute before you accept.
>
> **Procedure:**
> 1. `./visualize_board.sh` the pre-move, best, and played boards. Record solver scores, the outcome of best vs played, and the flip/same-floor branch.
> 2. Determine the kind the epic's §5 ladder actually produces (flip branch: `parity_control` → `concrete_line` → `positional`; same-floor branch: `resistance` / `conversion`). **Confirm — don't assume** — by running the relevant search/detector (`print_lookahead.mjs`, the opponent-punishment search at sufficient depth, the parity pass, the repaired forward-distance for the register).
> 3. **Construct the `reason` payload by hand** from real evidence (the actual decisive cell via a PV/decisiveness check; the kept/surrendered parity cells; the `speed`/`punishable` enums from `outcomeTiming`/`reachability`; the templated `betterMoveDoes`).
> 4. **Run it against the §14 grader checks** for that branch/kind. Then ask the harder question: *does this payload actually explain the mistake, or does it merely pass a mechanical check?* Try to find a fact a coach would need that is **absent** from the vector. Use `branch_play.mjs`/`pv.mjs` to see the real game and confront your explanation with it.
> 5. If a needed diagnostic doesn't exist, build it in `reason_audit/TOOLS/` (reuse existing tools first).
>
> **Return (compact, structured):**
> - `verdict`: `SUFFICIENT` | `INSUFFICIENT` | `ROUTING_GAP` | `PAYLOAD_UNGROUNDABLE` | `DECISIVENESS_FAIL`
> - `routed_kind` + the hand-built payload
> - `evidence`: the exact commands/scripts run and their key outputs
> - `missing_signal` (if not SUFFICIENT): the specific field/fact the vector lacks, and a concrete proposal (new field, new kind, repaired computation)
> - `tools_used` / `tools_created`
> - one-line lesson for `HANDOFF.md`, including a note on which not-yet-analyzed cases this one likely makes redundant

---

## 7. Final report (`reason_audit/REPORT.md`)

- **Selection log:** the 20–30 cases analyzed and, for each, the new evidence it was chosen to provide; plus the saturation argument — which of the 66 were deliberately skipped as redundant, each mapped to its analyzed representative.
- **Coverage table:** every analyzed case id → branch, routed kind, verdict, one-line reason.
- **Headline:** can the epic's `reason`, as designed, explain **100%** of the represented case classes from the vector alone? If not, the exact count and the classes of failure.
- **Unaddressed-issues list (the deliverable):** each issue = a precise gap (e.g. "same-floor both-lose with `reachability.ceiling = loss` has no honest reason beyond 'loses slower' — N cases"; "category X routes to no kind"; "the decisive cell is blockable and the vector exposes no fork/forcing-count to prove decisiveness"), the cases that prove it, and a concrete, minimal change to the epic (`reason` shape, routing ladder, a new field, or a new diagnostic the build must include). Order by how many cases/classes each blocks.
- **Tooling note:** what's in `reason_audit/TOOLS/`, which tools proved generally useful (candidates to incorporate into the project), and which were one-off.
- **Do not** modify the epic, the glossary, or any production file; this is a read-and-audit task whose output is the report + the isolated tools folder. Recommendations go in the report for a human to apply.

Report faithfully: if a case is only "explainable" by hand-waving past a missing field, mark it INSUFFICIENT and name the field. The goal is to find the holes **before** implementation, not to bless the design.
