# Optimal-win-line sampling in the reason engine

**Date:** 2026-07-01
**Status:** Approved design, pre-implementation
**Scope:** `connect-four/server/scripts/reason_engine/` (evidence vector only)

## Motivation

The reason engine's `lostResource` half exhibits **one** winning line — the single
deterministic `walkOptimal` continuation from `board + bestCol`. On the eval-5 opening
(`win_to_draw`, played col 2 vs best col 3) that line completes a horizontal four on the
top row, and we described it as an "odd-threat zugzwang" win. But that specific window and
orientation are an **artifact of the one line walked**, not a canonical property of the
position: a different optimal continuation could complete a different four, possibly diagonal.
The engine even defers naming the parity rule (`parityNamingDeferred: true`, `namedRule: null`).

We want to see the **distribution** of optimal winning realizations per case — how often the
win completes on an odd square, and whether the orientation is fixed — both to validate the
odd-threat story and to gather example lines for an intuition-building visualization.

## Decisions (settled during brainstorming)

1. **Add to the evidence vector now; defer the LLM decision.** The new field lands in
   `computeReason`'s output (visible in `/admin/fv-suff`). `toNarratorVector` / `pruneVector`
   stay **untouched**, so nothing reaches the LLM until we deliberately wire it.
2. **Seeded random walks.** N random optimal walks, RNG seeded deterministically from the
   root movestring → byte-identical output across runs (the eval vectors are diffed/frozen).
3. **Sample both sides optimally.** This is free: `walkOptimal` already takes the argmax score
   for the mover at *every* node (opponent included = maximally delaying). The sampler differs
   only in how it breaks ties in that argmax set.
4. **`lostResource` only.** Sample the WIN the best move gave up. Skip the `opponentPunishment`
   half (often a loss / fork / neutralization where a single "terminal winning window" is
   ill-defined). Expandable later.

## Non-negotiables respected

- **I0** — extra solver calls are expected and fine; N walks × ~plies queries per applicable case.
- **I8 / I12** — reuse over reinvention: extract one shared primitive rather than duplicate
  `walkOptimal`'s optimal-move selection.
- **I1 / I2** — the field is evidence-only and does not enter the narrator path; no fabrication
  risk to the LLM output. Every recorded window is solver-realized (it came from a real walk).

## Approach (chosen: C — one shared primitive, separate walks)

Rejected alternatives: (A) a fully parallel sampler walk that duplicates `walkOptimal` and can
drift from its D16 fork/termination logic; (B) refactoring `walkOptimal` into a
strategy-parameterized walk, which adds risk to the production single-line path everything
depends on.

Chosen: extract the argmax-tie set as `optimalCols(scores)`; `walkOptimal` uses
`optimalCols(...)[0]` (behavior-preserving — it currently takes the first argmax in column
order). The sampler reuses `optimalCols` but picks via a seeded RNG. Because the sampler is
scoped to terminal **win windows** (forks excluded), it does not need to mirror D16.

## Components

### New module `reason_engine/sampleWins.mjs`

- `optimalCols(scores)` → array of columns achieving the mover's max score, excluding
  `INVALID_MOVE`. Exported. `walkOptimal` switches its inline argmax to `optimalCols(scores)[0]`.
- `orientationOf(window)` → `'horizontal' | 'vertical' | 'diagonal'` from the four cells.
- `mulberry32(seed)` + a string hash of the root movestring for the seeded RNG.
- `sampleOptimalWins(solver, rootMs, winnerMark, { n })`:
  - Runs `n` optimal walks from `rootMs`; at each node picks uniformly among `optimalCols`.
  - Each walk stops at the first completed 4-window; records
    `{ window, completingCell, orientation, completingParity }`.
  - `completingParity` via the existing zcount convention (`zcount = 1-indexed row − colHeight`
    at `rootMs`) — the same odd/even-threat notion `attributeParityWin` uses. Odd zcount → `"odd"`.
  - Dedups by window; returns the aggregate payload below.

### Payload — `out.lostResource.optimalWinSamples`

Attached **only when `lostResource.terminal === 'win'`** (skips fork/parity-fork and
non-winning halves).

```json
"optimalWinSamples": {
  "n": 20, "distinct": 3,
  "orientation": { "horizontal": 14, "diagonal": 6, "vertical": 0 },
  "oddCompletingFraction": 1.0,
  "lines": [
    { "window": ["c2r5","c3r5","c4r5","c5r5"], "completingCell": "c5r5",
      "orientation": "horizontal", "completingParity": "odd",
      "pliesToEnd": 40, "count": 14 }
  ]
}
```

`orientation` and `oddCompletingFraction` are counted per walk (frequency-weighted). `lines`
lists distinct realizations, most-frequent-first, so the modal window leads.

### Wiring in `computeReason`

- Called in the `win_to_draw` non-fork branch (motivating case) and, because it keys purely on
  `lostResource.terminal === 'win'`, it uniformly also covers `win_to_lose` (I9, one mechanism).
- `n` defaults to 20, overridable via env `REASON_WIN_SAMPLES`.

## Testing (`sampleWins.test.mjs`, in `test:fast`)

1. **Determinism** — same seed → byte-identical payload across two runs.
2. **`orientationOf`** — hand-built horizontal / vertical / diagonal windows classify correctly.
3. **`optimalCols` equivalence** — `walkOptimal` output unchanged for a fixture board
   (behavior-preserving refactor).
4. **eval-5 integration** — run against the opening (best col 3); pin whatever the run actually
   yields for `oddCompletingFraction` / orientation mix (empirical, not assumed).

## Out of scope (YAGNI)

- Feeding the samples to the LLM narrator (deferred decision).
- Sampling the `opponentPunishment` half.
- Resolving `namedRule` from the sampled distribution (possible follow-up if odd-fraction ≈ 1).
