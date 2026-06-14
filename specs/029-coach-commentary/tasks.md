# Tasks: Coach Commentary — Board-Grounded Phrases

**Input**: Design documents from `/specs/029-coach-commentary/`
**Prerequisites**: spec.md, plan.md, contracts/coachUtils-api.md, contracts/evaluate-move-ai-path.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: A server unit test is included for the AI-move classify path (required by plan P2-T8 / Constitution §III).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on sibling tasks in the same phase)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

No new project initialisation or dependency installation required. This feature modifies existing files only.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Extract the `pickRandomKey` helper so both `ChallengeScreen` (US1) and `useGameBoard` (US2) can import it without duplication.

**⚠️ CRITICAL**: Both US1 and US2 import from `coachUtils.js`. This task MUST complete before any user-story work begins.

- [ ] T001 Extract `pickRandomKey` from `connect-four/src/lib/useGameBoard.js` into the new file `connect-four/src/lib/coachUtils.js`; export it as `export function pickRandomKey(t, prefix)`; update the existing import in `useGameBoard.js` to `import { pickRandomKey } from './coachUtils.js'`. No behaviour change — all existing call sites continue working. Implementation contract: `coachUtils-api.md`.
  **Definition-of-done note**: The `pickRandomKey` JSDoc or inline comment example MUST NOT reference any `coach.sparring.*` key. Use a neutral example key such as `coach.generic.blunder` instead.

**Checkpoint**: `coachUtils.js` exists, `useGameBoard.js` imports from it, all existing tests pass (`npm run test:fast` inside `connect-four/`).

---

## Phase 3: User Story 1 — Lesson-mode practice receives correct coach feedback (Priority: P1) 🎯 MVP

**Goal**: Fix two bugs in `ChallengeScreen.handleColumnClick`: (1) the wrong `category` value being sent to the evaluate-move endpoint in lesson mode, and (2) the quality-blind blunder fallback phrase. Add the `coach.generic.optimal.*` and `coach.generic.suboptimal.*` i18n pools that the fixed fallback needs.

**Independent Test**: Open a lesson, attempt a move. Inspect the `POST /api/evaluate-move` request body: `category` must equal the lesson's `confirmationCategory`, never `undefined`. With `coachPhraseKey: null` and `quality: 'optimal'` mocked in the response, the displayed phrase must come from `coach.generic.optimal.*`, not `coach.generic.blunder.*`.

### Implementation for User Story 1

- [ ] T002 [P] [US1] Add `coach.generic.optimal.{0,1,2}` and `coach.generic.suboptimal.{0,1,2}` to `connect-four/src/i18n/en.json`. Target the **second** (effective) `coach` key block (~line 707). Use the exact strings from FR-003 in `spec.md`. The existing `coach.generic.blunder.*` pool (indices 0–5) must remain unchanged.

- [ ] T003 [P] [US1] Fix `connect-four/src/screens/ChallengeScreen.jsx` `handleColumnClick` (FR-001, FR-002, FR-004):
  1. At the top of the handler compute: `const effectiveCategory = lessonMode ? confirmationCategory : category;`
  2. Replace `category` with `effectiveCategory` in the `fetch` body sent to `POST /api/evaluate-move`.
  3. Replace the hardcoded `coach.generic.blunder.${Math.floor(Math.random() * 6)}` fallback (the branch where `data.coachPhraseKey` is null) with `pickRandomKey(t, \`coach.generic.${data.quality ?? 'blunder'}\`)`.
  4. Add `import { pickRandomKey } from '../lib/coachUtils.js';` at the top of the file.
  Depends on T001 (coachUtils.js must exist). T002 and T003 touch different files and can run in parallel.

- [ ] T004 [US1] Manual verification of User Story 1:
  - Open any lesson → attempt a move → confirm network request body contains `category: <lesson confirmationCategory>`, never `undefined`.
  - Temporarily mock evaluate-move response to `{ coachPhraseKey: null, quality: 'optimal' }` → confirm coach phrase prefix is `coach.generic.optimal`.
  - Play a genuine blunder → confirm phrase prefix is `coach.generic.blunder` (regression check).
  Depends on T002 and T003.

**Checkpoint**: User Story 1 independently functional. Phase 1 (lesson-mode) bugs resolved.

---

## Phase 4: User Story 2 — Sparring AI move commentary reflects board events (Priority: P2)

**Goal**: Add a `POST /api/evaluate-move` classify call after AI column selection in `useGameBoard.makeAiMove`, thread the classification result through a quality-gated algorithm in `commitAiMove`, replace the `isDeliberate`-driven phrase selection with board-event-grounded commentary, remove obsolete sparring pools, and add a server-side `classifyPattern` call for the no-category AI-move path.

**Independent Test**: Play a hard/perfect sparring game. Verify AI `double_threat` optimal move → phrase from `coach.ai_move.double_threat.*` and mood `'think'`. Play easy/medium → deliberate suboptimal move → phrase from `coach.ai_move.suboptimal.*` and mood `'oops'`. Kill network mid-game → AI phrase from `coach.ai_move.neutral.*`.

**⚠️ Phase 2 depends on Phase 3 (US1)**: `coach.generic.optimal.*` and `coach.generic.suboptimal.*` pools (added in T002) must exist before T010's fallback references them at runtime.

### Implementation for User Story 2

- [ ] T005 [P] [US2] Add all 30 `coach.ai_move.*` keys to `connect-four/src/i18n/en.json` per FR-014 in `spec.md`. Keys: 12 pattern pools × 2 phrases each + `suboptimal.{0,1,2}` + `neutral.{0,1,2}` = 30 total. Note: there is no `coach.ai_move.forbidden_columns.*` pool — `forbidden_columns` falls through to neutral by design. Target the effective `coach` key block. Use exact strings from FR-014. T005 and T006 touch different files and can run in parallel.

- [ ] T006 [P] [US2] Modify the `POST /api/evaluate-move` handler in `connect-four/server/index.js` for the AI-move path (FR-005a). When `req.body.aiMove === true`, replace the existing `classify()` call with:
  ```js
  const postMoveMovestring = movestring + String(colInt);
  const aiPlayerInt = (movestring.length % 2) + 1;
  const tagMap = await classifyPattern(postMoveMovestring, aiPlayerInt, solver);
  const PRIORITY = [
    'immediate_threat','double_threat','forced_win','forced_block',
    'forbidden_columns','z_threat','odd_even_threat','claimeven',
    'figure_7','j_shape','overcut','undercut','claimodd',
  ];
  const patternTag = PRIORITY.find(tag => tagMap.has(tag)) ?? null;
  ```
  `classifyPattern` is already imported. The user-move path (when `req.body.aiMove` is absent or false) is unchanged — `classify()` continues to run there. Contract: `evaluate-move-ai-path.md`. T006 and T005 can run in parallel.
  **Latency note**: The AI-path evaluate-move call may exceed the 2 s latency guideline on `forced_win` positions due to `classifyPattern`'s solver queries. This is a known, tracked exception. Revisit only if observed in production.

- [ ] T007 [P] [US2] Write a server unit test in `connect-four/server/evaluate-move-ai-path.test.js` using `node --test` (NOT Jest). Source a post-move movestring from the DB or KB knowledge base entries for a `forced_win` or `forced_block` position — do NOT construct a movestring by hand. Extract the no-category classify logic from the handler into a thin helper function (or test the handler directly via a fake `req`/`res`). Assert that `patternTag` equals the expected tag (`'forced_win'` or `'forced_block'`) for the chosen movestring. Run with: `node --test connect-four/server/evaluate-move-ai-path.test.js`. Depends on T006. Can run in parallel with T008 (different files).

- [ ] T008 [P] [US2] Refactor `useGameBoard.makeAiMove` in `connect-four/src/lib/useGameBoard.js` (FR-005, FR-009):
  - After `aiCol` is determined, create `classifyPromise` using the three-tier error-handling pattern from plan Decision 2:
    - Opening auto-play exception (`currentMoves.length === 0 && side === 'second'`) → `Promise.resolve(null)`.
    - Otherwise: fetch `POST /api/evaluate-move` with `{ movestring: currentMoves.join(''), col: aiCol, aiMove: true }`; `.then(async r => { if (!r.ok) return null; const data = await r.json(); return data.quality !== undefined ? data : null; }).catch(() => null)`.
    - The `aiMove: true` flag is what gates the server into the `classifyPattern` path (FR-005a). The `handleColumnClick` user-move path sends `{ movestring, col }` with no `aiMove` field and is unaffected.
  - Pass `classifyPromise` to `commitAiMove` (all three call sites: normal, error-fallback, opening auto-play).
  - Retain `isDeliberate` flag declaration and computation; move it under `if (import.meta.env.DEV)` logging only — it MUST NOT drive any i18n key selection (FR-010).
  Depends on T001. Can run in parallel with T007 (different file).

- [ ] T009 [US2] Refactor `connect-four/src/lib/useGameBoard.js` `commitAiMove` signature and implementation (FR-006, FR-007, FR-008):
  - Change third parameter from `isDeliberate: boolean` to `classificationPromise: Promise<{quality, patternTag}|null>`.
  - Inside the function, `await classificationPromise` before coach phrase selection (board state mutations run first, before `await`).
  - Implement the quality-gated algorithm (from contract `evaluate-move-ai-path.md`):
    1. `!classification` → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`
    2. `classification.quality !== 'optimal'` → `pickRandomKey(t, 'coach.ai_move.suboptimal')`, mood `'oops'`
    3. `quality === 'optimal'` AND `patternTag` non-null AND pool probe passes (`t(\`coach.ai_move.${patternTag}.0\`) !== \`coach.ai_move.${patternTag}.0\``) → `pickRandomKey(t, \`coach.ai_move.${patternTag}\`)`, mood `'think'`
    4. Otherwise → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`
  - Preserve the `replace` flag logic (FR-008) — unchanged.
  Depends on T008 (same file, must be sequential). T005 must complete before runtime testing (i18n keys needed).

- [ ] T010 [US2] Fix `useGameBoard.handleColumnClick` user-move fallback in `connect-four/src/lib/useGameBoard.js` (FR-011):
  - Replace `pickRandomKey(t, 'coach.sparring.user_move.generic')` with `pickRandomKey(t, \`coach.generic.${data.quality ?? 'blunder'}\`)`.
  Depends on T009 (same file, must be sequential).

- [ ] T014 [US3] Fix `connect-four/src/screens/ExplorerScreen.jsx` `timeoutContent` (FR-012):
  1. Change the line referencing `` `coach.categories.${patternTag}` `` to `t(\`mistakes.pattern.${patternTag}\`, patternTag)`.
  2. Change the line referencing `coach.sparring.user_move.generic.0` to `t('coach.generic.suboptimal.0')`.
  Moved here (before T011 gate) because ExplorerScreen.jsx:221 contains a live `coach.sparring.user_move.generic` reference that would cause T011's rg check to fail if this task ran after T011. Depends on T002 (key must exist at runtime). Can run in parallel with T010 (different file) — sequence only required to reach T011.

- [ ] T011 [US2] Regression check — run `rg 'coach\.sparring\.(ai_move|deliberate_mistake|user_move\.generic)' connect-four/src/` and verify output is empty. This is a mandatory gate: T012 MUST NOT proceed if any references remain. Fix any residual references found before continuing. Depends on T010 **and T014** (both must remove their references before the gate can pass).

- [ ] T012 [US2] Remove the following keys from `connect-four/src/i18n/en.json` (FR-013), targeting the effective `coach` key block:
  - `coach.sparring.ai_move.{0,1,2}` (3 keys)
  - `coach.sparring.deliberate_mistake.{0,1}` (2 keys)
  - `coach.sparring.user_move.generic.{0,1,2}` (3 keys)
  Execute only after T011 returns empty output. This is the **final** `en.json` edit in Phase 4.

- [ ] T013 [US2] Manual verification of User Story 2:
  - Hard/perfect sparring: confirm AI move classified as `double_threat` produces phrase from `coach.ai_move.double_threat.*`, mood `'think'`.
  - Easy/medium sparring: confirm deliberate suboptimal AI move produces phrase from `coach.ai_move.suboptimal.*`, mood `'oops'` — never a pattern-specific phrase.
  - Simulate evaluate-move network failure: confirm AI coach phrase comes from `coach.ai_move.neutral.*`, no error shown.
  - `side === 'second'` opening auto-play: confirm existing intro-replacement (`replace=true`) behaviour is unchanged; no classify call is made.
  Depends on T007 (server test must pass) and T012 (all en.json edits complete).

**Checkpoint**: User Story 2 independently functional. Board-grounded AI coach fully shipped.

---

## Phase 5: User Story 3 — ExplorerScreen deep-reveal pane shows readable pattern label (Priority: P3)

**Goal**: Replace the `coach.categories.*` and `coach.sparring.user_move.generic.*` key references in `ExplorerScreen.jsx` `timeoutContent` with correct namespaces: `mistakes.pattern.*` for pattern labels and `coach.generic.suboptimal.0` for the null-tag fallback.

**Independent Test**: In ExplorerScreen with a past-game mistake where `patternTag = 'double_threat'`, open Deep Reveal. The timeout content line must read "double threat" (from `mistakes.pattern.double_threat`), not the raw string `"double_threat"`. With `patternTag = null`, the fallback must display the `coach.generic.suboptimal.0` phrase.

**Note**: T014 has been moved to Phase 4 (before T011) because ExplorerScreen.jsx contains a `coach.sparring.user_move.generic` reference that would cause the T011 rg gate to fail if left in place. T015 (verification) remains here.

### Implementation for User Story 3

- [ ] T015 [US3] Manual verification of User Story 3:
  - Open ExplorerScreen for a past game with a `double_threat` mistake → open Deep Reveal → confirm timeout label reads "double threat" (localised from `mistakes.pattern.double_threat`).
  - Test with a mistake that has no `patternTag` (null) → confirm fallback reads the `coach.generic.suboptimal.0` phrase.
  - Confirm neither `coach.categories.*` nor `coach.sparring.user_move.generic.*` appears anywhere in the rendered DOM.
  Depends on T014 (now in Phase 4).

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 Update `docs/architecture/api-conventions.md` to document the new AI-move path for `POST /api/evaluate-move`: when `req.body.aiMove === true`, the server calls `classifyPattern()` (async, post-move board, aiPlayerInt perspective) and applies the PRIORITY array. Note that `coachPhraseKey` in this response is ignored by the client; the client uses `quality` and `patternTag` to select from `coach.ai_move.*` pools per FR-007. (Required by plan P2-T1 and Constitution Principle VIII.)
  **Latency note to include in docs**: The AI-path evaluate-move call may exceed the 2 s latency guideline on `forced_win` positions due to `classifyPattern`'s solver queries. This is a known, tracked exception. Revisit only if observed in production.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. **Blocks** US1 and US2.
- **US1 (Phase 3)**: Depends on Foundational (T001). Blocks US2 at runtime (en.json pools), not at code-write time.
- **US2 (Phase 4)**: Depends on Foundational (T001). **Must not ship before US1** (coach.generic.* pools needed at runtime). Code tasks can begin after T001; do not manually verify until T002 is done.
- **US3 (Phase 5)**: Depends on T002 (en.json key `coach.generic.suboptimal.0`). Implementation can run in parallel with US2 Phase 4 tasks.
- **Polish (Phase 6)**: After all user stories complete.

### Within Phase 4 (US2) — Sequential Constraints

```
T005 [P] ──────────────────────────────────────────────────┐
T006 [P] → T007 [P] ──────────────────────────────────┐   │
         → T008 [P] → T009 → T010 ──┐                 │   │
                                    ├→ T011 → T012     │   │
T014 [P] (depends T002) ────────────┘                  │   │
                                                       ↓   ↓
                                                      T013
```

- T005 and T006: different files — run in parallel.
- T007 (server test) and T008 (makeAiMove): both depend on T006; different files — run in parallel.
- T009, T010: same file as T008 — must be sequential after their predecessor.
- **T014 must complete before T011**: ExplorerScreen.jsx contains a `coach.sparring.user_move.generic` reference that the T011 rg gate would catch. T014 is parallel with T010 (different file).
- T011 (rg check) gates T012 (key deletion). T012 is the last en.json mutation.
- T013 (manual verification) requires T007 to have passed AND T012 to be done.

### Parallel Opportunities

```bash
# Phase 2 — start immediately after foundational:
Task T002: "Add coach.generic.* keys to en.json"
Task T003: "Fix ChallengeScreen.handleColumnClick"
# (both can start after T001; different files)

# Phase 4 — after Phase 3 complete:
Task T005: "Add coach.ai_move.* keys to en.json"
Task T006: "Server evaluate-move aiMove:true branch"
# (different files)

# After T006 completes:
Task T007: "Server unit test classifyPattern path"
Task T008: "Refactor makeAiMove classifyPromise"
# (different files)

# T014 must run before T011 — can overlap with T010 (different file):
Task T014: "Fix ExplorerScreen timeoutContent"  # ← now in Phase 4, before T011
Task T010: "Fix handleColumnClick user-move fallback"
# (both can run in parallel; T014 depends on T002, T010 depends on T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001)
2. Complete Phase 3: User Story 1 (T002, T003, T004)
3. **STOP and VALIDATE**: Lesson-mode category bug and quality-blind fallback bug are fixed
4. Ship Phase 1 fix independently if needed

### Incremental Delivery

1. Foundational (T001) → US1 (T002–T004) → **Validate**: lesson-mode coach correct
2. US2 (T005–T013) → **Validate**: board-grounded AI commentary
3. US3 (T014–T015) → **Validate**: ExplorerScreen deep-reveal label correct
4. Polish (T016) → Documentation complete

---

## Notes

- `en.json` has two top-level `"mistakes"` keys; only the second (~line 707) is effective. All `en.json` edits MUST target the effective `coach` block — not the first (stale) occurrence. See memory: `reference_en_json_duplicate_mistakes.md`.
- `classifyPattern` returns a `Map` — use `PRIORITY.find(tag => tagMap.has(tag))`, not iteration over Map keys.
- T001 (extraction) is strictly non-behavioural: all existing call sites in `useGameBoard.js` (`commitAiMove`, `handleColumnClick`, `handleHintToggle`) continue working via the updated import.
- T012 (key deletion) is the irreversible step. The T011 rg gate must return empty before touching `en.json`.
- Server unit test (T007): source the movestring from the DB `puzzles` table or the KB (`reference_allis_rule_examples.md`, `reference_t4_example_movestring.md`). Never construct one by hand per project rule.
