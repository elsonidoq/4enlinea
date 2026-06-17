# Implementation Plan: Board Interaction Feedback

**Branch**: `034-board-interaction-feedback` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/034-board-interaction-feedback/spec.md`

## Summary

Two targeted UI fixes in `ChallengeScreen` and `Board`:

1. **Disc drop animation fix** (FR-001/FR-002/FR-006/FR-007): Change Board.jsx so `animation: 'drop 0.5s ease-out'` fires only when the disc position matches the `lastDrop` prop. Fix `ChallengeScreen.handleSequenceClick` continue branch to animate user disc first, then AI disc after a staged 300 ms delay. Pass `lastDrop={null}` to the Deep Reveal pane Board.
2. **Forced-win double-threat highlight verification** (FR-004/FR-005): Confirm the success branch already maps `data.threatCells` to `win` overlays — no code change required, verification only.

No new props, no new API endpoints, no new state variables, no schema changes.

---

## Technical Context

**Language/Version**: JavaScript (React 18), no new dependencies  
**Primary Dependencies**: React — existing `useState`, `useEffect`, `setTimeout` (standard Web API)  
**Storage**: N/A — no persistence changes  
**Testing**: Manual verification per Constitution §III (UI features require golden path + at least one edge case before reporting complete). No automated test framework needed for animation behavior.  
**Target Platform**: Browser (existing PWA, same as all other frontend features)  
**Project Type**: Web application — frontend-only change  
**Performance Goals**: Drop animation must fire within 500 ms (existing CSS `drop` keyframe). Staged AI disc delay of ~300 ms is 60% of the keyframe duration — disc 1 is visually settling when disc 2 starts.  
**Constraints**:
- Board component API MUST NOT change (FR-003 — cross-epic contract in `specs/010-design-tokens-component-library/contracts/board-api.md`)
- No new state variables beyond existing `lastDrop`, `board`, `heights`
- `isSubmitting` MUST remain `true` for the full 300 ms staged animation window; it is set at step (a) of the staged render and cleared only inside the `setTimeout` callback after `setSeqPosition` fires.

**Scale/Scope**: 3 files changed (Board.jsx ~1 line, ChallengeScreen.jsx ~15 lines across three sites). All five Board callers (GameScreen, ReviewScreen, ExplorerScreen, SocraticScreen, ChallengeScreen) must be audited for `lastDrop` handling after the Board animation gate change; ReviewScreen requires a one-line fix.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Pre-design check

**Principle I — Explanation Engine as Single Source of Truth**: Not applicable. No move evaluation or pattern annotation changes.

**Principle II — Code Quality & Simplicity**:
- [x] Board.jsx fix is a one-line conditional (`lastDrop && col === lastDrop.c && r === lastDrop.r`). Three similar lines beat a premature helper — no abstraction warranted.
- [x] Staged render uses a single `setTimeout` inside `handleSequenceClick`; no new helper functions, no new components.
- [x] No defensive handling for scenarios that cannot occur. `isSubmitting` is held `true` for the full 300 ms staged window and cleared inside the `setTimeout` callback — re-entry is impossible without a new guard variable.

**Principle III — Testing Standards**:
- [x] UI features MUST be manually verified on the golden path and at least one edge case. Verification tasks are enumerated in the task list (see Phase 1 tasks).
- [x] No solver-dependent logic is changed. No automated test additions required.
- [x] FR-004 is explicitly a verification task — the code is already implemented; manual confirmation suffices.

**Principle IV — UX Consistency & Progressive Disclosure**:
- [x] The animation fix makes board behavior consistent across all entry points (puzzle load, challenge advance, lesson entry). No inconsistency introduced.
- [x] Win overlay type (`'win'`) is unchanged. OverlayType enum is a locked cross-epic contract.

**Principle V — Performance Requirements**:
- [x] The Board renders are driven by React state; no additional render cycles introduced. The staged `setTimeout(300)` fires once per continue-branch response.
- [x] No solver calls, no API calls added.

**Principle VI — Implementation & Debugging Methodology**:
- [x] FR-004 applies "reproduce before theorizing": the verifier must observe a live `forced_win` puzzle reaching the success step, not reason about it from code alone.
- [x] FR-006 staged render is mapped explicitly: step (a) — build board with user's move only, `setLastDrop({ c: col, r: heights[col] })`; step (b) — after 300 ms, build board with AI's move appended, `setLastDrop({ c: data.aiCol, r: aiRow })`. No implicit assumptions about move order.

**Principle VII — Software Design Philosophy**:
- [x] Explicit is better than implicit: `animation: lastDrop && col === lastDrop.c && r === lastDrop.r ? 'drop 0.5s ease-out' : 'none'` makes the animation intent visible at the call site.
- [x] Simple is better than complex: the staged render uses the same state variables already in use; no new abstraction layer.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] `docs/architecture/frontend-conventions.md` "Forced Win / sequence branch" section already documents the staged-render behavior (updated during spec drafting). No additional docs work required during implementation.
- [x] Board API contract (`specs/010-design-tokens-component-library/contracts/board-api.md`) is unchanged — no update needed.

**Post-design check**: All principles pass. No violations to justify.

---

## Project Structure

### Documentation (this feature)

```text
specs/034-board-interaction-feedback/
├── plan.md          ← this file
├── research.md      ← Phase 0 output (below)
└── tasks.md         ← Phase 2 output (/speckit-tasks — not yet created)
```

No `data-model.md` or `contracts/` needed — no schema changes and no API surface changes.

### Source Code

```text
connect-four/src/components/Board.jsx              ← FR-001/FR-002: animation conditional
connect-four/src/screens/ChallengeScreen.jsx       ← FR-006: staged continue render (isSubmitting guard restructure)
                                                      FR-007: Deep Reveal lastDrop={null}
connect-four/src/screens/ReviewScreen.jsx          ← lastDrop={null} caller fix (one line)
```

**Audit-only (no change expected)**:
```text
connect-four/src/screens/GameScreen.jsx            ← verify lastDrop handling
connect-four/src/screens/ExplorerScreen.jsx        ← verify lastDrop handling
connect-four/src/screens/SocraticScreen.jsx        ← verify lastDrop handling
```

**Structure Decision**: Frontend-only change. ReviewScreen fix is a one-liner discovered via the caller audit; no backend files touched.

---

## Phase 0: Research

All implementation decisions were resolved during spec authoring and handoff. No NEEDS CLARIFICATION items remain.

### Decision log

**D1: Animation conditional placement**  
- Decision: Inline ternary on the `animation` CSS property inside the existing disc `<div>` in Board.jsx.
- Rationale: The disc render already reads `value`, `col`, and `r` — `lastDrop` is already a prop. One additional boolean check; no structural change.
- Alternatives considered: Extracting a `Disc` subcomponent — rejected (three similar lines beat a premature helper; Constitution §II).

**D2: Staged render mechanism for FR-006**  
- Decision: `setTimeout` (native Web API) inside `handleSequenceClick`, approximately 300 ms.
- Rationale: No new state variable needed. The existing `board`, `heights`, and `lastDrop` states carry both intermediate states. `isSubmitting` is set to `true` at step (a) of the staged render and cleared only inside the `setTimeout` callback after `setSeqPosition` fires — this is the re-entry guard for the 300 ms window. The `finally` block of the outer `try` must NOT clear `isSubmitting` when a staged render is in progress; restructure so `isSubmitting = false` is called inside the timeout callback for the `continue` branch, and in the normal `finally` path for all other outcomes.
- Delay value: 300 ms ≈ 60% of the 500 ms drop keyframe. User disc is visually in place before AI disc starts. Tunable constant — define as `const STAGED_DELAY_MS = 300` at the top of the file or inline.
- Alternatives considered: `requestAnimationFrame` loop — rejected (overkill; `setTimeout` is sufficient and readable). CSS animation chaining — not applicable (disc renders are React-controlled).

**D3: `heights` usage for AI disc row in staged render**  
- Decision: After step (a), `heights` still holds pre-move heights. After calling `setBoard` / `setHeights` for step (a), the AI row must be derived from the intermediate heights object, NOT from the pre-step-a heights. Concretely: (a) buildBoard on user's move only → capture intermediate `heights_a`; (b) compute `aiRow = heights_a[data.aiCol]`; after delay, buildBoard on full move string → `setLastDrop({ c: data.aiCol, r: aiRow })`.
- Rationale: `heights` in component state lags by one React render cycle. Using the locally-captured `heights_a` from `buildBoard` avoids the stale-closure trap.
- Alternatives considered: Reading `heights` state after the `setHeights` call — rejected (stale closure; React state is not synchronously updated).

**D4: Deep Reveal Board `lastDrop` handling**  
- Decision: Conditional on whether the Deep Reveal board is interactive. If `canPlay` is always `false` when Deep Reveal is open: pass `lastDrop={null}` (static reference view — must never animate). If `canPlay` can be `true` when Deep Reveal is open: pass the live `lastDrop` normally (interactive — suppressing it would hide the animation for a move made while the pane is visible).
- Rationale: The original assumption that the Deep Reveal board is always non-interactive must be verified against production code before applying `lastDrop={null}`. Nulling it unconditionally would suppress animation for moves made while the pane is open if the pane is actually interactive.
- Implementer action: Read the `canPlay` prop wiring in `ChallengeScreen.jsx` around the `DeepRevealPane` render before making any change. Document the finding in a one-line comment.
- Impact: The main-layout Board (the interactive board) always retains `lastDrop={lastDrop}`. The two Board instances are independent; changing one does not affect the other.

**D5: FR-004 verification approach**  
- Decision: Observation-only. The verifier opens a live `forced_win` puzzle, plays through the sequence to the success step, and observes that both threat cells show pulsing green rings.
- Rationale: The code already maps `data.threatCells` to `win` overlays at lines 436–438 of ChallengeScreen.jsx. The success branch also calls `setLastDrop` at line 432. Both are already present and correct.
- Source puzzle: Must be fetched from the database or a known movestring — not constructed by hand (per CLAUDE.md "When you need a concrete movestring" rule).

---

## Phase 1: Design & Contracts

### No new data model

This feature introduces no new DB columns, tables, or server-side state. `data-model.md` is not required.

### No new API contracts

Board API is locked (cross-epic contract). No new endpoints. `contracts/` directory is not required.

### Implementation design

#### Change 1 — Board.jsx: animation conditional (FR-001, FR-002)

**File**: `connect-four/src/components/Board.jsx`  
**Location**: The non-empty disc `<div>` render, currently around line 289–295.

**Current code** (line 294):
```js
animation: 'drop 0.5s ease-out',
```

**New code**:
```js
animation: lastDrop && col === lastDrop.c && r === lastDrop.r
  ? 'drop 0.5s ease-out'
  : 'none',
```

**Why this works**:
- When `lastDrop` is null (puzzle load, puzzle advance): all discs get `animation: 'none'` — SC-001 satisfied.
- When `lastDrop` is set: only the matching `(col, r)` disc animates — SC-002 satisfied.
- Other callers that pass `lastDrop={undefined}`: falsy, so all discs get `animation: 'none'` — safe per spec Assumptions.

**No other Board.jsx changes**.

---

#### Change 1b — Audit lastDrop callers (all five Board-rendering screens)

**Files to read**: `GameScreen.jsx`, `ReviewScreen.jsx`, `ExplorerScreen.jsx`, `SocraticScreen.jsx`, `ChallengeScreen.jsx`  
**Purpose**: After the Board animation gate is changed, any caller that passes a live `lastDrop` (non-null, non-undefined) will now trigger drop animations. Verify each caller's intent.

**Expected findings**:
- `GameScreen.jsx` — passes `lastDrop` for the disc the user just placed in a sparring game. This is intentional; no fix needed.
- `ReviewScreen.jsx` — passes `lastDrop` set to the last move of the currently displayed position. Stepping backward through a game would animate every disc at every step. **Fix required**: pass `lastDrop={null}`. The Review board is always a static view.
- `ExplorerScreen.jsx` — verify whether `lastDrop` is passed and whether animation is intentional.
- `SocraticScreen.jsx` — verify whether `lastDrop` is passed and whether animation is intentional.
- `ChallengeScreen.jsx` — already managed by FR-006/FR-007 in this spec.

**Required fix** (ReviewScreen.jsx, one line):
```jsx
// Before:
<Board ... lastDrop={lastDrop} ... />
// After:
<Board ... lastDrop={null} ... />
```

Apply fixes to any other caller where live `lastDrop` would cause unintended animation. Document the audit outcome in the task comment.

---

#### Change 2 — ChallengeScreen.jsx: staged continue render (FR-006)

**File**: `connect-four/src/screens/ChallengeScreen.jsx`  
**Location**: `handleSequenceClick`, the `outcome === 'continue'` branch, currently lines 420–425.

**Current code**:
```js
if (data.outcome === 'continue') {
  const newPos = seqPosition + String(col) + String(data.aiCol);
  setSeqPosition(newPos);
  const { board: b, heights: h } = buildBoard(newPos);
  setBoard(b);
  setHeights(h);
}
```

**New code**:
```js
// NOTE: isSubmitting is set to true at the start of handleSequenceClick.
// For the 'continue' branch, do NOT rely on the finally block to clear it —
// restructure so isSubmitting is cleared only inside the setTimeout callback.

if (data.outcome === 'continue') {
  // Step (a): render user's disc with animation; isSubmitting stays true
  const userPos = seqPosition + String(col);
  const { board: bUser, heights: hUser } = buildBoard(userPos);
  setBoard(bUser);
  setHeights(hUser);
  setLastDrop({ c: col, r: heights[col] }); // heights = pre-move heights (still valid here)

  // Step (b): render AI's disc with animation after drop animation has ~settled
  const aiRow = hUser[data.aiCol]; // capture now; hUser won't be stale inside setTimeout
  const fullPos = userPos + String(data.aiCol);
  setTimeout(() => {
    const { board: bFull, heights: hFull } = buildBoard(fullPos);
    setSeqPosition(fullPos);
    setBoard(bFull);
    setHeights(hFull);
    setLastDrop({ c: data.aiCol, r: aiRow });
    setIsSubmitting(false); // clear re-entry guard HERE, not in finally
  }, 300);
  return; // skip the finally block's isSubmitting=false for this branch
}
```

**Key invariants**:
- `heights[col]` at step (a) is the pre-move heights captured in component state — still valid because `setHeights` is not yet called.
- `hUser[data.aiCol]` at step (b) is the intermediate heights after user's disc — correct row for AI disc (stale-closure trap avoided by using the locally captured `hUser`, not React state).
- `isSubmitting` is `true` from the beginning of `handleSequenceClick` through the entire 300 ms window and is cleared only inside the `setTimeout` callback after `setSeqPosition` fires. This prevents any re-entry tap from submitting the pre-user-move `seqPosition`.
- The `finally` block of the outer `try` must still clear `isSubmitting` for all non-`continue` outcomes (wrong, success, error). The `return` after `setTimeout(...)` prevents `finally` from running for the `continue` branch — or alternatively, use a flag variable to skip the `finally` clear.
- Implementation note: depending on how the outer `try/finally` is structured, the cleanest approach may be to move `isSubmitting = false` out of `finally` entirely and call it explicitly in each outcome branch. Verify the existing structure before choosing an approach.

---

#### Change 3 — ChallengeScreen.jsx: Deep Reveal pane Board `lastDrop` fix (FR-007)

**File**: `connect-four/src/screens/ChallengeScreen.jsx`  
**Location**: The `boardContent` prop of `<DeepRevealPane>`, around lines 570–591.

**Before applying any code change**: read the `canPlay` prop passed to the Deep Reveal Board to determine whether it can receive moves while the pane is open.

**Case A — `canPlay` is always `false` when Deep Reveal is open (non-interactive)**:
```jsx
// Change from:
<Board ... lastDrop={lastDrop} ... />
// Change to:
<Board ... lastDrop={null} ... />
```
*Why*: The Deep Reveal board is a static reference view. It must never trigger drop animations (SC-006).

**Case B — `canPlay` can be `true` when Deep Reveal is open (interactive)**:
No change to `lastDrop`. Pass the live prop normally so that any disc placed while the pane is open still animates. Document the finding with a `// T004 canPlay audit` comment.

**Verify which case applies before committing**. The implementer must not assume Case A without reading the code.

---

#### Verification task — FR-004 (forced-win double-threat highlight)

No code change. The verifier must:
1. Open the app in a browser.
2. Navigate to a `forced_win` challenge that creates a double-threat (≥2 unstoppable threats) at the success step.
3. Play the correct sequence to the final move (the double-threat step).
4. Observe that both cells from `data.threatCells` show pulsing green ring overlays.
5. Confirm by inspecting the React DevTools or browser console that `overlays` state contains two `{ type: 'win' }` entries.

**Source puzzle**: Use a puzzle where the winning move creates ≥2 threats. Do NOT use a randomly drawn `forced_win` puzzle — some end in an immediate win rather than a double-threat setup, which would leave `data.threatCells` with fewer than two entries and not exercise this path.

**Preferred source**: The project KB contains solver-verified movestring `1115222555577773663636617` (two Red odd-row threats at col4 — see `reference_t4_example_movestring.md`). Task T006b (which runs before T007) confirms this puzzle exists in the DB or inserts it; T007 can use the `id` obtained in T006b directly:
```sql
SELECT id FROM puzzles WHERE move_string = '1115222555577773663636617' AND category = 'forced_win' AND is_active = true LIMIT 1;
```
If T006b seeded a new row, use that row's `id`. The fallback console.log approach is only needed if `data.threatCells` is unexpectedly empty at runtime despite the puzzle being present.

---

### Agent context update

The `CLAUDE.md` plan pointer will be updated to reference this plan file as part of the implementation task that sets up the feature branch.

---

## Complexity Tracking

No Constitution Check violations. This section is intentionally empty.

---

## Task Ordering (for /speckit-tasks)

The following ordering constraint MUST be respected in `tasks.md`:

1. **Board.jsx animation fix** (FR-001/FR-002) — MUST land first.
   - Reason: This is the foundational change. FR-006's staged render produces two `setLastDrop` calls; without this fix, both would re-animate ALL discs twice.
2. **Audit lastDrop callers + ReviewScreen fix** (Change 1b) — MUST land immediately after the Board fix, before FR-006.
   - Reason: The Board animation gate is now active. Any caller that passes a live `lastDrop` will trigger drop animations. The audit confirms intent; ReviewScreen's fix prevents unintended animation on every step-back. This step must complete before FR-006 because FR-006's staged render produces live `lastDrop` values — callers must be confirmed safe first.
3. **Deep Reveal `lastDrop={null}`** (FR-007) — Can land in the same commit as or immediately after the caller audit.
   - Reason: Independent of FR-006. No ordering constraint relative to FR-006 other than being after the Board fix.
4. **Staged continue render** (FR-006) — MUST land after the Board fix and the caller audit.
   - Reason: FR-006 depends on FR-001/FR-002 being correct. Without the Board fix, the staged render's `setLastDrop` calls animate all discs, not just the placed disc. The `isSubmitting` restructure (clearing inside `setTimeout`) is part of this step.
5. **Puzzle seed prerequisite** (T006b) — Can run in parallel with steps 2–4 after step 1 is done. Confirms or inserts the double-threat puzzle so T007 can execute unconditionally.
   - Reason: T007 must have a known puzzle `id` before it can run a live verification. Open-ended DB searching inside T007 is eliminated by moving it to a dedicated prior task.
6. **Forced-win verification** (FR-004) — After T006b. Verification only; confirms existing code is correct.
   - Reason: Can only be verified after all code changes are in place and the double-threat puzzle is confirmed in the DB. Requires the Board animation fix to be working so the success disc animation is visible.
