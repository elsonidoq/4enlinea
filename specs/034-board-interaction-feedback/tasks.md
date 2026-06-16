# Tasks: Board Interaction Feedback

**Input**: Design documents from `/specs/034-board-interaction-feedback/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: The Board.jsx animation gate fix must land before any caller audit or staged-render work. Without it, calling `setLastDrop` anywhere causes ALL discs to re-animate — making it impossible to verify or test any subsequent change in isolation.

**⚠️ CRITICAL**: No US1 implementation can be verified until this phase is complete.

- [x] T001 Apply animation gate conditional to the disc `<div>` in `connect-four/src/components/Board.jsx`: replace the unconditional `animation: 'drop 0.5s ease-out'` with `animation: lastDrop && col === lastDrop.c && r === lastDrop.r ? 'drop 0.5s ease-out' : 'none'` (FR-001, FR-002). Verify: open any challenge puzzle, make a move — only the just-placed disc animates; all others are still.

**Checkpoint**: Board animation gate is live. All five Board-rendering callers now have their `lastDrop` prop gated.

---

## Phase 2: User Story 1 — Only the Placed Disc Animates (Priority: P1) 🎯 MVP

**Goal**: After the Board.jsx fix, audit every Board caller for `lastDrop` intent, fix ReviewScreen and the Deep Reveal pane, then implement the FR-006 staged continue render so sequence-mode advances animate the user's disc first and the AI's disc second.

**Independent Test**: Open a challenge in sequence mode, make a correct move in a `continue` step. Observe: (a) only the user's disc drops, (b) after ~300 ms only the AI's disc drops, (c) the board is non-tappable throughout the 300 ms window. Separately: step backward through a reviewed game in ReviewScreen — no disc animates. Load any new challenge — no disc animates on load.

### Implementation for User Story 1

- [x] T002 [US1] Audit all four non-ChallengeScreen Board callers for `lastDrop` handling in `connect-four/src/screens/GameScreen.jsx`, `connect-four/src/screens/ReviewScreen.jsx`, `connect-four/src/screens/ExplorerScreen.jsx`, and `connect-four/src/screens/SocraticScreen.jsx`. For each file: read the Board render call, note whether a live `lastDrop` is passed and whether animation is intentional. Leave a one-line comment `// lastDrop audit (034): <finding>` beside the Board render call in each file even if no fix is needed. Expected: ReviewScreen requires a fix (passes live `lastDrop`; stepping through a game would animate each disc); others are expected to be safe but must be confirmed. **Positive-case check**: for `GameScreen` specifically, read the code to confirm whether `lastDrop` is set on AI moves (not only on user moves) — sparring AI moves are live gameplay and must animate. For every caller confirmed to pass a live `lastDrop` intentionally (including `GameScreen`), do a live verification that the just-placed disc still animates after the Board gate is applied.

- [x] T003 [US1] Fix `connect-four/src/screens/ReviewScreen.jsx`: change the Board render call to pass `lastDrop={null}` instead of the live `lastDrop` state. The Review board is always a static reference view; it must never trigger drop animations (SC-001). Verify: step backward through any reviewed game — no disc animates at any step.

- [x] T004 [US1] Fix the Deep Reveal pane Board instance in `connect-four/src/screens/ChallengeScreen.jsx` (inside the `boardContent` prop of `<DeepRevealPane>`, around lines 570–594) per FR-007. **Before applying any fix**, read the surrounding code to determine whether `canPlay` is always `false` when Deep Reveal is open (i.e., whether moves can be made while the pane is visible). If `canPlay` is always `false` (non-interactive): change `lastDrop={lastDrop}` to `lastDrop={null}`. If `canPlay` can be `true` when Deep Reveal is open (interactive): pass `lastDrop` normally — do NOT null it, because nulling it would suppress animation for a move made while the pane is open. Document the finding as a one-line comment `// T004 canPlay audit: <finding>` beside the Board render. Verify: open Deep Reveal during a challenge after placing a disc — the Deep Reveal board shows all discs with no animation (non-interactive case); or, if interactive, placed discs animate correctly (interactive case).

- [x] T005 [US1] Read the full body of `handleSequenceClick` in `connect-four/src/screens/ChallengeScreen.jsx` (currently around lines 400–450), paying special attention to: (a) where `isSubmitting` is set to `true` and `false`; (b) the shape of the existing `try/finally` block; (c) whether `isSubmitting = false` is currently in `finally` or in each outcome branch. Document the structure in a code comment block immediately above the `continue` branch before making any edits. This read-first step is mandatory — the FR-006 restructure depends on knowing exactly how `isSubmitting` is cleared.

- [x] T006 [US1] Implement the staged continue render in `connect-four/src/screens/ChallengeScreen.jsx` — `handleSequenceClick`, `outcome === 'continue'` branch (FR-006). Follow the design in plan.md Change 2 exactly: (a) build board with only user's disc using `seqPosition + String(col)`, call `setBoard`, `setHeights`, and `setLastDrop({ c: col, r: heights[col] })` — `heights` here is the pre-move React state, still valid at this point; (b) capture `aiRow = hUser[data.aiCol]` from the locally-returned `hUser` (NOT from React `heights` state — stale-closure trap); build `fullPos = userPos + String(data.aiCol)`; (c) in a `setTimeout` of 300 ms, call `buildBoard(fullPos)`, `setSeqPosition(fullPos)`, `setBoard`, `setHeights`, `setLastDrop({ c: data.aiCol, r: aiRow })`, and `setIsSubmitting(false)`. `isSubmitting` MUST NOT be cleared in `finally` for the `continue` branch — use `return` after the `setTimeout` call or a branch flag, depending on the structure confirmed in T005. Verify: in sequence mode, place a correct continue move — user disc animates, then after ~300 ms AI disc animates, and the board is non-tappable throughout.

**Checkpoint**: User Story 1 is fully functional. Only the placed disc animates in all scenarios. ReviewScreen and Deep Reveal are static. Sequence continues animate both discs in staged order.

---

## Phase 3: User Story 2 — Forced-Win Double-Threat Cells Are Highlighted (Priority: P2)

**Goal**: Confirm that the existing code already maps `data.threatCells` to `win` overlays at the `outcome === 'success'` branch. No code change required — verification only.

**Independent Test**: Navigate to a `forced_win` puzzle that reaches a double-threat success step. Both cells in `data.threatCells` must display pulsing green ring overlays. A randomly drawn puzzle may end in an immediate win (zero `threatCells`); source the puzzle per the instructions below.

### Verification for User Story 2

- [x] T006b [US2] Confirm or seed the double-threat puzzle in the DB so T007 can execute unconditionally. Run the following query against the production/staging DB: `SELECT id FROM puzzles WHERE move_string = '1115222555577773663636617' AND category = 'forced_win' AND is_active = true LIMIT 1;`. If the row exists: record its `id` and proceed — T007 can use it directly. If the row is absent: insert it as an `is_active=true forced_win` puzzle (use `correct_col` and any other required columns from the schema — read `docs/architecture/db-schema.md` for the puzzles table shape). Confirm the insert succeeds and record the new `id`. Do not construct or verify a movestring by hand; use the solver-verified string `1115222555577773663636617` verbatim. This task has no implementation side-effects on the frontend.

- [x] T007 [US2] Verify FR-004: inspect `handleSequenceClick` in `connect-four/src/screens/ChallengeScreen.jsx` at the `outcome === 'success'` branch (currently around lines 426–438). Confirm that `data.threatCells` is mapped to `win` overlays (one overlay entry per cell) and that `setLastDrop` is also called at the success step. Then run a live verification: use the puzzle `id` confirmed or seeded in T006b; open that puzzle in the app, play the correct sequence to the final move, and observe that both threat cells show pulsing green ring overlays (SC-003). If `data.threatCells` unexpectedly has fewer than 2 entries, add a temporary `console.log(data.threatCells)` in the success branch to diagnose, then remove it before marking complete.

**Checkpoint**: FR-004 confirmed. Both threat cells show `win` overlays at the double-threat success step.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all success criteria and cleanup.

- [x] T008 [P] Verify SC-004 regression: open a non-`forced_win` challenge that shows existing overlay types (`tg`, `td`, `tr`, `claim`). Confirm that all existing overlay types still render correctly after the Board.jsx animation change. No code change expected — this is a final regression check. **Positive animation check**: also make a move in a live single-move challenge and confirm the just-placed disc still animates (SC-002 positive case not covered by earlier tasks).

- [x] T009 [P] Verify SC-001 end-to-end: advance through a challenge set by clicking "Next →" to load consecutive puzzles. Confirm that all discs on each new board appear instantly with no drop animation (no `lastDrop` set on puzzle load). **Positive animation check**: for each live-gameplay caller confirmed intentional in T002 (at minimum `GameScreen` sparring), open a sparring game and verify that the just-placed disc — including discs placed by the AI — still animates correctly (SC-002 positive case for GameScreen).

**Architecture documentation** (Constitution Principle VIII):

- [x] T010 Confirm that `docs/architecture/frontend-conventions.md` "Forced Win / sequence branch" section accurately describes the staged-render behavior implemented in T006 (per plan.md: this section was already updated during spec drafting). If any detail is now out of date after implementation, update the section. No other architecture docs require changes for this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion — Board.jsx fix must be live first
  - T002, T003, T004 can be done in parallel after T001 (different files)
  - T005 MUST precede T006 (T005 is a mandatory read step for T006)
  - T003 and T004 can be done in parallel with T005 (different files)
- **User Story 2 (Phase 3)**: Independent of Phase 2 — can start after Phase 1; does not depend on FR-006
  - T006b MUST precede T007 (T006b seeds the puzzle that T007 uses)
- **Polish (Phase 4)**: Depends on Phases 2 and 3 completion

### Within Phase 2

```
T001 (Board.jsx fix)
  ↓
T002 (caller audit)  T004 (Deep Reveal fix)  T005 (read handleSequenceClick)
  ↓                                                   ↓
T003 (ReviewScreen fix)                         T006 (staged continue render)
```

T002, T004, and T005 can all run in parallel after T001.  
T003 depends on T002 (audit first, then fix).  
T006 depends on T005 (must read existing structure before editing).

### Parallel Opportunities

- After T001: T002, T004, and T005 can proceed in parallel (different files)
- T003 follows T002 sequentially (same file, same intent)
- T006 follows T005 sequentially (same function, mandatory read-before-edit)
- T006b (US2 seed) can start after T001 — independent of T002–T006
- T007 depends on T006b (puzzle must be confirmed/seeded first)
- T008 and T009 (Polish) can run in parallel after all prior phases complete

---

## Parallel Example: User Story 1 (after T001 is done)

```bash
# These four tasks can launch in parallel:
Task T002: Audit GameScreen, ReviewScreen, ExplorerScreen, SocraticScreen (+ positive-case check)
Task T004: Fix Deep Reveal pane Board (conditional on canPlay audit)
Task T005: Read handleSequenceClick try/finally structure
Task T006b: Confirm or seed double-threat puzzle in DB

# Then sequentially:
Task T003: Fix ReviewScreen lastDrop={null}  (after T002)
Task T006: Implement staged continue render   (after T005)
Task T007: Verify FR-004 forced-win overlays  (after T006b)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) — foundational gate
2. Complete Phase 2 (T002–T006) — US1 fully functional
3. **STOP and VALIDATE**: Run the independent test for US1
4. Proceed to US2 if US1 passes

### Incremental Delivery

1. T001 — Board animation gate → validates in isolation (single disc animates)
2. T002–T004 — Caller audit + static board fixes → ReviewScreen and Deep Reveal confirmed clean; positive-case animation confirmed for GameScreen AI moves
3. T005–T006 — Staged continue render → full sequence-mode animation
4. T006b — Seed/confirm double-threat puzzle in DB
5. T007 — US2 verification → forced-win double-threat confirmed
6. T008–T010 — Polish (including positive-case animation checks) and doc check → ship

---

## Notes

- [P] tasks = different files, no shared state dependencies
- T005 is a mandatory read-before-edit for T006 — do not skip it even if the function looks familiar
- The `aiRow` in T006 MUST be read from the locally-captured `hUser[data.aiCol]`, NOT from the React `heights` state — the latter is stale inside `setTimeout` (stale-closure trap documented in plan.md D3)
- The `isSubmitting` guard in T006 MUST be cleared inside the `setTimeout` callback, not in `finally` — the `return` statement after `setTimeout(...)` is the mechanism that prevents the outer `finally` from running for the `continue` branch
- FR-004 (T007) is verification-only; if the code is already correct no edit is made; if it is incorrect, that is a blocking bug that must be fixed before marking US2 done
- Never construct a movestring by hand for T006b or T007; use the solver-verified string `1115222555577773663636617` verbatim
- T006b must complete before T007 — T007 relies on the puzzle being present in the DB
- T002 must also confirm GameScreen sets `lastDrop` on AI moves and verify a positive-case animation; do not mark T002 complete with only over-animation checks
