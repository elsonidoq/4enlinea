# Research: Challenges — Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary

**Feature**: specs/014-challenges-deep-reveal  
**Date**: 2026-05-31

---

## RQ-1: Does `explainSimulate` expose the principal variation (PV) sequence?

**Question**: Can `explainSimulate(movestring, col, solver, ...)` be reused to compute `bestLine`, or does a new function need to be written?

**Finding**: `explainSimulate` does NOT expose the PV sequence. The function:
- Walks optimal-play continuations recursively (`collectLeaves`)
- Aggregates pattern statistics across all leaves
- Returns `{ totalLeaves, patterns, outcomes, timing }` — no move array

The PV walk requires an ordered sequence of moves, not an aggregate over leaves. `explainSimulate` would need fundamental redesign to expose the PV — simpler and cleaner to add a dedicated function.

**Decision**: Add `computeBestLine(movestring, col, solver, maxPlies=5)` as a new exported function in `explainSimulate.js`. It walks the PV by:
1. Starting from `movestring + col` (the user's played position)
2. Querying the solver for scores at each position
3. Picking the highest-scoring legal column (first of ties by index)
4. Stopping when a win is detected (`board.hasWon()`), the board is full, or `maxPlies` moves have been collected

**Alternatives considered**:
- Reuse `explainSimulate` with a mode flag: rejected — would add a code path to a function that already has complex aggregation logic; violates constitution §II (simplicity).
- Walk PV from `collectLeaves` internal state: not possible without refactoring the recursive structure.
- Use book lookup: rejected — per FR-013, book coverage is insufficient for most positions.

**Cost**: ≤ 5 solver queries via the existing persistent process. Well under 500ms budget. No concurrency issue since the solver IPC is already serialized via a promise chain.

---

## RQ-2: Does the `explanation_cache` table need migration?

**Question**: Does adding `bestLine` to the cached blob require a DB migration?

**Finding**: `explanation_cache.deep_reveal_json` is JSONB (PostgreSQL). JSONB columns absorb new fields without a schema change. Existing cached rows lack `bestLine` — they will return `null` for that field. The client spec says: if `bestLine` is absent or empty, omit the "BEST LINE" section (not a crash).

**Decision**: No migration required. Add `bestLine` to the `deep_reveal_json` blob written on cache miss. Read `cached.deep_reveal_json.bestLine ?? []` on cache hit.

---

## RQ-3: Current `POST /api/explain-move-llm` quota ordering

**Question**: Where does quota decrement currently happen, and what must change?

**Finding** (reading `server/index.js` lines 586–594):
```
Current order:
  1. Auth gate (401 if no user)
  2. checkAndDecrementQuota ← BUG: runs before cache check
  3. Validation
  4. LLM call
  5. Response
```
There is no cache check at all in the current `POST /api/explain-move-llm` handler. The `/api/explain-move` (old) endpoint has cache logic, but `/api/explain-move-llm` does not.

**Decision**: Fix the handler order:
```
Correct order:
  1. Auth gate (401)
  2. Input validation
  3. explanation_cache check → return { explanation, bestLine, cached: true } if hit
  4. checkAndDecrementQuota (only on cache miss)
  5. LLM call + computeBestLine (concurrent or sequential)
  6. Cache write (fire-and-forget)
  7. Response { explanation, bestLine }
```

---

## RQ-4: `SetPickerScreen.jsx` and `challengeSets.js` atomic update

**Question**: Can the `displayNameKey`/`descriptionKey` shape change be applied only to new entries, leaving existing entries untouched?

**Finding**: `SetPickerScreen.jsx` line 59 renders `set.displayName ?? set.slug`. If we add new entries with `displayNameKey` only (no `displayName`), the Set Picker would render the raw slug string for those entries. If we update the screen to use `t(set.displayNameKey)` for all entries, existing entries (which have `displayName` not `displayNameKey`) would render `undefined` → fallback to `set.slug`.

**Decision**: Atomically update both files in Task T-04:
1. Add `displayNameKey` (and `descriptionKey`) to ALL entries in `challengeSets.js`, removing `displayName`/`description`.
2. Add corresponding `challengeSet.<slug>.displayName` / `challengeSet.<slug>.description` keys to `en.json` for all existing entries.
3. Update `SetPickerScreen.jsx` to use `t(set.displayNameKey) ?? set.slug`.

This ensures the screen renders correctly for all entries at all times.

---

## RQ-5: SequenceHandler readiness for ChallengeScreen

**Question**: Is `SequenceHandler.jsx` ready to be wired into `ChallengeScreen.jsx`?

**Finding**: `SequenceHandler.jsx` exists at `connect-four/src/components/SequenceHandler.jsx`. It:
- Accepts `{ puzzle, onNext }` props
- Manages its own board state and position locally
- Calls `POST /api/puzzles/:id/sequence/move` to validate moves
- Handles `outcome: 'success'` | `'continue'` | `'fail'`
- Renders its own Board with `interactionMode="sequence"`
- Calls `onNext()` on success (renamed `onNext` in this epic to `onSequenceComplete(passed)`)

The component is functional but has its own styling and does not share `ChallengeScreen`'s CoachDialog. For this epic, the CoachDialog in `ChallengeScreen` is used for pre-puzzle framing; `SequenceHandler` manages its own in-sequence feedback.

**Decision**: Wire `SequenceHandler` inside `ChallengeScreen.jsx` as a conditional branch. Pass `onNext={(passed) => handleSequenceComplete(passed)}`. The `SequenceHandler.onNext` signature currently takes no args — must check if `SequenceHandler` signals pass/fail to the parent, or if the parent infers it from the `success` status.

**Follow-up finding**: `SequenceHandler.onNext` is called only on `status === 'success'`, not on fail. Therefore, the parent receives `onNext` only on success. The `ChallengeScreen` can infer `passed = true` always when `onNext` fires from `SequenceHandler`. For fail, the user either resets (within `SequenceHandler`) or the session must record a blunder.

**Revised decision**: The `onNext` in `SequenceHandler` fires only on sequence success. `ChallengeScreen` needs a way to record a fail when the user gives up (optional: via a "Give up" button, or on reset). For MVP simplicity: treat any `onNext` from `SequenceHandler` as `passed = true`. Add a "Give up" button to `SequenceHandler` (via a new `onGiveUp` prop) that calls `handleSequenceComplete(false)` in `ChallengeScreen`. If `SequenceHandler` has no `onGiveUp`, the session cannot record a forced-win blunder — which is acceptable for MVP (the user can always reset and retry).

**Final decision**: Wire `SequenceHandler` with `onNext={() => handleSequenceComplete(true)}`. If the user wants to advance without completing the sequence, a "Skip" button will not be provided (no skip in MVP). Blunder recording for forced_win requires explicit completion of the forcing line — an incomplete sequence is not recorded. This is acceptable per the spec (the sequence is the scoring unit, not individual moves).

---

## RQ-6: Forbidden Columns scoring completeness

**Question**: Does `POST /api/puzzles/:id/check` return `forbiddenCols` for all selected columns, and is the endpoint stateless?

**Finding** (reading `PuzzlesPage.jsx` lines 355–367):
```js
const results = await Promise.all(cols.map(col =>
  fetch(`${API}/api/puzzles/${puzzle.id}/check`, {
    method: 'POST', headers,
    body: JSON.stringify({ candidateCol: col, moveHistory: [], attemptNumber: 1 }),
  }).then(r => r.json()).then(data => ({ col, data }))
));
const forbiddenCols = results[0]?.data?.forbiddenCols ?? [];
```

The endpoint returns the same `forbiddenCols` array regardless of which `candidateCol` is passed. This means:
- One call per selected column is made (parallel).
- `forbiddenCols` is read from `results[0]` (the first response).
- The check endpoint is stateless per call — it does not record attempts on its own for `forbidden_columns`.

**Confirmed**: The scoring logic uses `results[0].data.forbiddenCols`, not `puzzle.correct_cols`. No client-side `correct_cols` field exists on the puzzle object. The `POST /api/puzzles/:id/check` endpoint is the sole authority for `forbiddenCols`.

**Decision**: Port verbatim. The one difference in `ChallengeScreen`: `store.recordPuzzleAttempt` uses `{ category: 'forbidden_columns', correct: quality === 'optimal' }` shape matching FR-022.

---

## Summary of Decisions

| Decision | Rationale |
|---|---|
| New `computeBestLine` function in `explainSimulate.js` | `explainSimulate` does not expose PV sequences |
| No DB migration for `bestLine` | `deep_reveal_json` is JSONB, backward compatible |
| Cache check before quota in `/api/explain-move-llm` | Fix FR-011: cache hits must not decrement quota |
| Atomic `challengeSets.js` + `SetPickerScreen.jsx` update | Partial migration breaks rendering |
| `SequenceHandler` wired with `onNext → passed: true` only | `SequenceHandler` signals success only; MVP accepts this |
| Forbidden Columns scoring ported verbatim from PuzzlesPage | Already correct implementation; no redesign needed |
