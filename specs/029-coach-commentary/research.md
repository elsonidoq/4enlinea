# Research: Coach Commentary — Board-Grounded Phrases

**Feature**: 029-coach-commentary  
**Date**: 2026-06-10  
**Status**: Complete — all unknowns resolved before planning

---

## Decision 1 — `pickRandomKey` extraction location

**Decision**: Extract to `connect-four/src/lib/coachUtils.js` (new file).

**Rationale**:  
`pickRandomKey` is currently defined as a module-local function in `useGameBoard.js` (line 18). `ChallengeScreen.jsx` needs it for the FR-002 fallback fix. A shared `src/lib/coachUtils.js` matches the existing pattern (`board.js`, `categories.js`). The function has zero dependencies on React state or i18n internals beyond the `t` callback, making it trivially extractable with no circular-import risk.

**Alternatives considered**:
- Duplicate in `ChallengeScreen` — rejected; divergence risk if the pool-probe logic changes.
- Export from `useGameBoard.js` — rejected; hooks MUST NOT export non-hook utilities (frontend conventions §State Management).

---

## Decision 2 — Evaluate-move call placement in `makeAiMove`

**Decision**: Initiate the `fetch` call immediately after `aiCol` is determined, store as `classifyPromise`, and pass it as the third argument to `commitAiMove`. Board state mutations inside `commitAiMove` (synchronous: `setMoveHistory`, `setLastDrop`) run first; `await classificationPromise` fires only before the coach phrase update.

**Rationale**:  
This achieves the spec's "runs in parallel with the board commit" requirement without restructuring `makeAiMove`'s sequential control flow. The user sees the disc land immediately; the coach phrase appears once classification resolves (typically <200 ms after disc animation).

**Alternatives considered**:
- `Promise.all([commitAiMove(...), classifyPromise])` — rejected; `commitAiMove` has side-effects that must run before the win/draw check, which must precede any await.
- Await classify before calling `commitAiMove` — rejected; violates commit-first: user would see a visible delay before the disc lands.

---

## Decision 3 — Server: `classifyPattern` vs `classify` in the no-category branch

**Decision**: Replace `classify(movestring, colInt, scores)` with `await classifyPattern(postMoveMovestring, aiPlayerInt, solver)` only when `category` is absent (FR-005a).

**Rationale**:
- `classify()` takes the pre-move board + pre-computed scores; designed for user-move analysis where the pattern is on the board before the disc lands.
- `classifyPattern()` takes the post-move board; designed for post-move analysis where the AI's disc has already landed. This is what FR-005a requires.
- `classifyPattern` returns a `Map` of all matched tags. The `PRIORITY` array (constant, ordered as specified in FR-005a) applied via `Array.find()` selects a single deterministic `patternTag`.
- The handler is already `async`; no `async` promotion needed.
- `classifyPattern` is already imported in `server/index.js` at line 10.

**Confirmed**: `aiPlayerInt = (movestring.length % 2) + 1` where `movestring` is the pre-move string:
- Pre-move length even → next mover is player 1 (Red, 1-indexed)
- Pre-move length odd → next mover is player 2 (Yellow, 1-indexed)
This matches the existing server parity convention (`(movestring.length % 2) + 1` pattern used elsewhere).

**Alternatives considered**:
- Reuse `classify()` with post-move board — rejected; `classify` is designed for pre-move analysis and its tag semantics differ from `classifyPattern`'s full 13-detector sweep.
- Cache the result server-side — deferred to a future optimisation task per spec Out of Scope.

---

## Decision 4 — `en.json` edit targeting

**Decision**: All edits target the second (effective) `mistakes` block and the single `coach` top-level key. The first `mistakes` block (~line 492) is effectively dead; edits there would be silently ignored.

**Reference**: `reference_en_json_duplicate_mistakes.md` memory entry.

**Validation**: Before editing, confirm with `rg -n '"coach"' connect-four/src/i18n/en.json` that the `coach` key's depth/position is correct.

---

## Decision 5 — `commitAiMove` signature

**Decision**: Replace `isDeliberate: boolean` with `classificationPromise: Promise<{quality, patternTag}|null>`.

**Rationale**: The spec mandates that `isDeliberate` has no effect on phrase selection after Phase 2 (FR-010). Removing it from the signature makes the constraint explicit. All three call sites are inside `makeAiMove` and the opening-auto-play guard, all of which can be updated atomically in the same task.

**`isDeliberate` retention**: The flag remains in `makeAiMove` scope for `import.meta.env.DEV` console logging only, matching the existing `console.log('[deliberate_mistake] trigger fired', ...)` pattern at line 210.

---

## Non-decisions (confirmed N/A)

- **No DB migration** — no new tables or columns.
- **No new endpoint** — reuses existing `POST /api/evaluate-move`.
- **No `es.json` changes** — out of scope per spec.
- **No changes to `coach.sparring.hint.generic.*`**, `coach.sparring.explorer.intro.*`, or `coach.sparring.review.*` — explicitly retained per spec Out of Scope.
