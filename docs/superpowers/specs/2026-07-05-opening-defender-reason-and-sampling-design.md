# Opening Defender Reason + Deterministic Opening Sampling — Design

**Date:** 2026-07-05
**Branch:** `opening-theory` (continues the opening-theory work; base builds on commits through `9a9b080`)
**Status:** Design approved (brainstorm complete). Next: `writing-plans` → `subagent-driven-development`.

## Goal

Two connected pieces, plus the end-to-end validation loop that ties them off:

1. **Defender opening reason (engine):** teach the reason engine to explain a **second-player** opening blunder as *deviating from a known first-player-win opening while defending* — the "hold the line and wait for the first player to slip" idea — grounded, never fabricated. Today the engine says **nothing useful** for these boards.
2. **Deterministic opening sampling (`select_boards`):** make one `--strategy coverage` command deterministically emit the opening blunder boards we need (both players), so the eval set reliably exercises every opening reason — instead of relying on random self-play to stumble onto rare opening positions.
3. **Close the loop:** `select_boards --strategy coverage → compute.mjs --llm → grade-fv-sufficiency`, with the grader taught the new reason.

**Sequencing:** Piece 1 (engine) FIRST, then Piece 2 (sampling), then the eval. Reason: the sampled second-player opening boards only carry a meaningful reason once the `defense` mode exists, and Piece 2 must register the new `defense` coverage predicate that Piece 1 introduces.

## Motivating evidence (verified live with `TOOLS/compute_feature_vector.mjs`)

- **`3333344`, player 2 plays col 2** (0-indexed): `matchOpeningPrefix` **uniquely** identifies `allen-5-4-opening` with `bookNextCol: 4`. Position is player 2 to move, **all columns lose** (`[-4,-3,-3,-3,-1,-3,-4]`), best = col 4 (−1). Playing col 2 (−3) is a solver-verified `lose_to_faster_lose` blunder. **Current engine output: `openingContext: undefined`** — total silence, even though it uniquely knows the opening and the book/best defensive move. (7 discs → past `centrality`'s ≤6-disc self-confinement; player 2 → `namedOpening`'s Guard 2 fails.)
- **`333`, player 2 plays col 4:** matches 4 central-column lines (family only, `bookNextCol: null`). Player 2 lost (`[-4,-4,-3,-1,-3,-4,-4]`), best col 3 (−1). Current engine → `openingContext.centrality`, whose text says *"…keeps more ways to build a winning connection open…"* — **mis-framed**: player 2 has no winning connection; they are lost. So `centrality` actively mis-describes the losing side.

The defender reason fixes both: it fires on-book at **all depths** (gated on `matchOpeningPrefix`, not a disc cap), replacing the silence at `3333344` and the mis-framed `centrality` at `333`.

## Global constraints (binding)

- **Reason invariants** (`docs/architecture/reason-INVARIANTS.md`) are non-negotiable: I0 correctness over optimization; I2 every clause solver- or canon-grounded (never fabricate); I8 reuse detectors; I9 one unifying mechanism over special cases; I12 validate a classify/stop rule against its full case-space with a counterexample per case, through the production detector (`computeReason`).
- Read before engine work: `reason-INVARIANTS.md`, `reason-DECISIONS.md` (through **D31**), `reason-case-taxonomy.md`, `blunder-reason-evidence.md`, plus `computeOpeningContext.mjs`, `openingMatch.mjs`, `reasonEngine.mjs`, `centerDominance.js`, `reasonNarratorVector.mjs`.
- **KB is the single source of truth** for strategy; opening lines come only from `openingMatch.mjs` → the `allen-*opening*.md` entries.
- **0-indexed** internally; 1-indexed only at the prompt/frontend boundary.
- **Verify every movestring with tools** — `./visualize_board.sh`, `TOOLS/optimal_line.mjs`, and the new `TOOLS/compute_feature_vector.mjs <movestring> <playedCol>`. Never hand-reason a board.
- Tests with `npm run test:fast` inside `connect-four/`; never concurrent with a solver harvest/dev server (IPC deadlock).
- Commit after each task; branch `opening-theory`.

---

## PART 1 — Defender opening reason (engine)

### Claim boundary (approved: "facts + canon frame")

For a second-player on-book opening blunder, the reason asserts **only**:
- the **opening name** (or family) — lookup from `matchOpeningPrefix`;
- it is a **known first-player win**, so player 2 is **theoretically lost** — grounded by all legal scores `< 0`;
- the **most resilient defense is column `bestCol`** — the solver's least-bad move;
- the played move **loses faster** — `playedScore < bestScore`;
- a **canon strategic frame**: from a lost position, hold the toughest line and wait for the first player to slip.

**No fabricated punishment line.** (A specific punishment would only be allowed if pulled verbatim from the vector's solver-derived `opponentPunishment` half; out of scope for v1.)

Approved sample text (running example `3333344` + col 2; 1-indexed columns):
> "You're playing the second side of the 5-4 opening, a known first-player win — so this position is already theoretically lost for you. Your most resilient defense is column 5; column 3 gives up ground and loses faster. From a lost position your practical chance is to hold the toughest line and wait for the first player to slip."

### Shape — a third mutually-exclusive `openingContext` mode

`openingContext` becomes exactly one of (or absent):
- `namedOpening` — player 1 threw away a win (unchanged).
- **`defense`** — NEW: player 2 abandoned the defensive hold on a known line.
- `centrality` — off-book geometric fallback.

`defense` payload: `{ id: string|null, family: string|null, matchedPrefixLen: number, bestDefenseCol: number }` where `bestDefenseCol = bestCol` (the solver's least-bad move — cites the solver, so no `bookNextCol`-equality requirement).

Produced by the shared `computeOpeningContext.mjs` (I9) — extend it with the third branch; do not fork logic into `explainContext.js`.

### Guards (mirror `namedOpening`, gated on the defender)

All required for `defense`:
1. `matchOpeningPrefix(movestring)` non-null (on a known line).
2. Blundering player is **player 2** (the non-beneficiary).
3. Theoretical loss **and** the move loses faster: `bestScore < 0 && playedScore < bestScore` (equivalently `case === 'lose_to_faster_lose'`).
4. Specific `id` only when `matchOpeningPrefix` returns a single id; else `family` with `id: null`.

### Precedence (fixes the two bugs)

In `computeOpeningContext`, evaluate: player-1 beneficiary → `namedOpening`; else on-book player-2 lost blunder → `defense`; else off-book opening → `centrality`. Because `defense` is gated on on-book (not a disc cap) it fires at **all depths**.

### Companion fix (approved: include)

`centrality` also mis-frames **off-book** player-2 lost positions (same "build a winning connection" text for a lost mover). Add a guard so `centrality`'s winning-connection framing does not fire when the mover is losing (`bestScore < 0`) — for such off-book positions either suppress `centrality` or use loss-appropriate wording. Keep this minimal and grounded; it shares the root cause with `defense`.

### Grounding + docs (mirror B5/B6)

- **Prompt** (`explainContext.js` + `llmCoachHelpers.js`): a defender section built from the `defense` field. Anti-fabrication (why-it-loses stays with the two-halves engine); name the specific opening only when `id` non-null (else the family string); name the player explicitly; 1-indexed columns. No KB term without its pattern firing.
- **Glossary** (`feature-vector-glossary.md`): define `openingContext.defense` (lookup + theoretical-loss + best-defense provenance, NOT a causal claim).
- **Grader** (`grade-fv-sufficiency/SKILL.md`): add `defense` to the known fields; rubric = three board checks: (1) movestring is a mirror-normalized prefix of the named KB line; (2) player is 2 and `bestScore < 0` with `bestDefenseCol === bestCol` (the least-bad hold); (3) played strictly worse. The opening name is a **lookup fact**, not a fabricated mechanism — do not fail A4 for naming it; family-only with `id:null` is correct.
- **Decisions/evidence:** new `reason-DECISIONS` D-entry (next after D31); `blunder-reason-evidence.md` opening-defense subsection with validated boards (`333` → family, `id:null`, `defense`; `3333344` → `allen-5-4-opening` unique id, `defense`; one off-book player-2 board exercising the companion fix; a `namedOpening` board to confirm it's unchanged).

### I12 case-space (validate through production `computeReason`)

One counterexample per branch: player-2 on-book unique-id (`3333344`), player-2 on-book family-only (`333`), player-1 on-book (still `namedOpening`, unchanged), off-book player-2 losing (companion — no winning-connection `centrality`), off-book early (still `centrality` when the mover is not losing), non-opening (absent).

---

## PART 2 — Deterministic opening sampling in `select_boards`

**No `--strategy` change.** `--strategy coverage` stays one command; internally it runs two phases into the one `boards_coverage_<ts>.jsonl`.

### Phase 1 — deterministic opening step (NEW, runs first)

Stratify opening-phase blunders by **`(opening line) × (player) × (sign-case)`**, target **2 boards per bucket, best-effort**, reusing the existing `classifyByScores`, `push()`/dedup, and `lose_to_faster_lose` gate handling — "same criteria as the rest of the script," plus the player and line dimensions.

Sourcing (deterministic): for each KB line from `loadOpeningLines()`, walk `shuffle(evenAndOddPrefixLengths(line))`:
- even-length prefix ⇒ **player 1** to move (winning side) → deviation is `win_to_draw` or `win_to_lose` → carries `namedOpening`;
- odd-length prefix ⇒ **player 2** to move (losing side) → deviation is `lose_to_faster_lose` → carries `defense`.

Fill each `(line, player, case)` bucket up to 2, then stop. **Best-effort, NOT REQUIRED** (a required-but-unreachable bucket re-triggers the rare-fill trap). On a first-player-win line many `(player, case)` cells are unreachable (player 2 never wins/draws; player 1 never loses on-book) — those stay empty by design.

Every emitted board is **solver-verified** via `classifyByScores` on live solver scores (and `swindleGate` for `lose_to_faster_lose`) — a board ships only if the played column is genuinely worse than best.

Phase-1 boards **count toward** the opening coverage predicates, so Phase 2 sees them already satisfied and never chases them.

The `shuffle` RNG is **local to Phase 1** — it must not touch `gameSampling`'s RNG (determinism trap: `project_gamesampling_rng_determinism_trap`). Add a `--seed` for reproducibility.

### Phase 2 — existing stochastic harvest (UNCHANGED)

Runs exactly as today; now finds the opening predicates already satisfied by Phase 1.

### Coverage predicates — add the third

B4 registered `reason_opening_named_line` and `reason_opening_centrality` (both PROVISIONAL) in `reasonEvalPredicates.mjs` + `REASON_UNIVERSE`. Part 1 introduces `openingContext.defense`, so add a **third PROVISIONAL** predicate `reason_opening_defense` (derived from `vector.openingContext?.defense`), round-tripping through the universe. Unit-test the derivation for all three opening fields.

B4's `fixture` additive band and the coverage self-check are otherwise left as-is.

---

## PART 3 — Close the loop (eval)

Run end-to-end: `node server/scripts/select_boards.mjs --strategy coverage --max-games <bounded>` → `compute.mjs --llm` → `grade-fv-sufficiency`. Confirm opening cases (all three of `named_line` / `defense` / `centrality`) grade **without a false `vector_error`** for a correct name/defense/centrality claim, and that the `defense` boards produce the "hold and wait" framing and fabricate nothing (verify with `compute_feature_vector.mjs` + `visualize_board.sh`).

## Decisions pinned (fresh agent may revisit with reason)

- Field name: **`openingContext.defense`** (`bestDefenseCol` for the hold).
- Centrality companion fix: **included** (guard against a losing mover) — same root cause, cheap.
- Defender cites the **solver `bestCol`** as the hold (no `bookNextCol`-equality requirement).

## Self-review notes (coverage map)

- Motivating evidence → verified live; `compute_feature_vector.mjs` committed (`9a9b080`).
- Part 1 (engine) → `computeOpeningContext.mjs` third branch + precedence + companion; grounding (explainContext/llmCoachHelpers); glossary + grader + decisions/evidence; I12.
- Part 2 (sampling) → `select_boards.mjs` Phase 1; `reasonEvalPredicates.mjs` third predicate; determinism-local RNG; `--seed`.
- Part 3 → end-to-end eval, grader-aware.
- Invariants / KB-source / verify-movestrings / test:fast → Global Constraints + per-part notes.
