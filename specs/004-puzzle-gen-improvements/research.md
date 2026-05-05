# Research: Puzzle Generator Improvements

## Decision 1 — Opening Book Flag for GeneratorSolver

**Decision**: Spawn the generator's persistent solver process with `['-a', '-b', BOOK_PATH]` where `BOOK_PATH = join(__dirname, '7x6.book')`.

**Rationale**: The `-a` flag puts `c4solver` into 7-column-score analysis mode (the format `GeneratorSolver` already parses). Adding `-b <path>` loads the opening book so that every position covered by the book (approximately the first 8 plies) is answered in O(1) from the hash table rather than by a full tree search. This is confirmed by `test_explain_parity.js` which uses `['-x', '-b', BOOK]` for the heatmap solver — same flag, different output mode.

**Alternatives considered**: Keeping `['-a']` (no book). Rejected: first-ply solver queries are expensive (hundreds of milliseconds each); without the book, a 20-ply game requires ~12 slow solver calls instead of ~4.

**Fail-fast check**: At `GeneratorSolver` construction time, verify `fs.existsSync(BOOK_PATH)` and throw a descriptive error if the book is absent. This satisfies FR-004 without adding runtime complexity.

---

## Decision 2 — Softmax Move Selection with Per-Player Temperature

**Decision**: At each ply, compute the probability distribution `p[c] = exp(scores[c] / T) / Σ exp(scores[i] / T)` over legal columns, then draw from that distribution using the seeded PRNG. Each player gets an **independent temperature** sampled from [1, 5] at the start of the game: `T1 = 1 + rng() * 4` for player 1, `T2 = 1 + rng() * 4` for player 2. At each ply, use `T1` when player 1 is to move and `T2` when player 2 is to move.

**Rationale**: A single shared temperature produces balanced games where neither player accumulates a real advantage. While this fixes the sparseness problem (solver-weighted play avoids accidental early wins), it works against generating the *types* of positions the puzzle categories require:
- Cat 5 (zugzwang) requires every single move to lose — almost never arises in balanced play.
- Cats 3/4 (double threat, fork setup) require one player to have built multiple threats while the opponent played passively.
- Cat 2 (forced block) requires the opponent to have built a specific threat.

With two independent temperatures, sometimes T1≈1 and T2≈5 (player 1 dominates, creates threats, sets up wins), sometimes the reverse, sometimes both are moderate. This naturally covers the full spectrum without conditional logic or move-count thresholds. It costs exactly two RNG calls per game and preserves full determinism.

**Temperature draw order**: T1 is drawn first, T2 second, before any move selection. This order is fixed and must not change (it is the only constraint for determinism).

**Scores are small integers and T ≥ 1**, so `exp(score / T)` stays well within float64 range — no numerical stability precautions needed.

**Alternatives considered**:
- Single shared T ∈ [1,3]: fixes sparseness but not positional diversity. Rejected as insufficient for harder categories.
- Switching one player's temperature after N moves (e.g. after move 15): achieves similar asymmetry but adds arbitrary thresholds and conditional logic. Deferred — see "Not Now" note below.
- Epsilon-greedy: too bimodal. Rejected.
- Rank-based weighting: ignores score magnitude. Rejected.

---

### Not Now — Per-ply Temperature Variation

A more sophisticated approach would vary a player's temperature *during* the rollout — for example, both players open at T=1.5 (realistic opening), then one player's temperature increases after move 15 to simulate late-game mistakes. This could produce even more targeted puzzle conditions.

**This will NOT be implemented now.** It adds arbitrary thresholds (when to switch, by how much), complicates the RNG stream accounting, and is harder to reason about empirically. If the two-independent-temperature approach proves insufficient for specific categories after empirical testing, this is the natural next step to consider.

---

## Decision 3 — Rollout Structure

**Decision**: Replace `randomPosition(targetLen, rng)` entirely with `async function solverWeightedPosition(solver, targetLen, rng)`. The function:
1. Draws `T1 = 1 + rng() * 4` (player 1 temperature).
2. Draws `T2 = 1 + rng() * 4` (player 2 temperature).
3. Loops up to `targetLen` plies.
4. At each ply, queries solver for current `moveString`, picks temperature for the active player (`T1` or `T2`), runs softmax, samples next column.
5. Appends to `moveString`; checks game-over.
6. Returns `moveString` (or `null` if game ended before target length).

The function is `async` because it calls `solver.query()`. `generateCandidates` already `await`s position generation, so no call-site changes beyond swapping the function name.

**Minimum move count**: raise the floor for all categories to 10 moves (`minMoves = 10`) so no trivially sparse boards are accepted even when the predicate passes early.

**Alternatives considered**: Hybrid approach (book-only for first 10 moves, random after). Accepted as a fallback if solver-per-step proves too slow in practice, but the book loading in Decision 1 should keep per-step cost low enough to avoid this.

---

## Decision 4 — Player Perspective Normalisation

**Decision**: In `CurationWorkspace.jsx`, derive `userPlayer` from the candidate's `move_string` length at render time, not from a stored column. Change the color assignment in `buildBoard` from `i % 2 === 0 ? 'red' : 'yellow'` to `(i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow'`.

**Why derived, not stored**: `user_player` is fully determined by `move_string.length % 2`. Storing it in the DB (per spec FR-009) adds a useful denormalised column for future server-side filtering, but the renderer should not depend on the DB value being present — derive it locally for robustness.

**Badge placement**: Render a small pill badge directly below the board header, inline with the move-string display, using `var(--red)` color token. One sentence: "You are RED ●". No additional onboarding flow.

---

## Decision 5 — Migration Strategy for `user_player` Column

**Decision**: Add `user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2))` to both `candidates` and `puzzles` tables in a new migration `008_user_player.sql`. Backfill existing rows with `UPDATE candidates SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END`.

**Rationale**: The column is cheap to add (smallint) and makes server-side perspective-aware filtering possible in future. The backfill is safe — `move_string` is immutable once written, so the computed value is stable.

**Alternatives considered**: Computed/generated column in PostgreSQL. Rejected: Supabase's managed Postgres requires superuser for some generated-column variants; a plain backfill is simpler and avoids that constraint.
