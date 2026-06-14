# Tasks: Lesson Infrastructure & Saga Map (Epic 4)

**Input**: Design documents from `/specs/018-lesson-infrastructure-saga-map/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-lessons.md

**Organization**: Tasks grouped by user story and by the plan's A–F phases. Phases A–E map to user
story delivery order. Tests are included where the spec explicitly calls for them (plan §A2, §A4,
§D1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1 = Saga Map, US2 = Concept, US3 = Socratic, US4 = Confirmation)
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `lessons/` directory, seed i18n keys, and add the `boardSpecToBoard`
utility. These three tasks are independent and unblock all screen work. They MUST be complete and
tested before any screen implementation begins.

- [x] T001 [P] Create `connect-four/lessons/` directory with a `.gitkeep` file (Epic 5 will add content)
- [x] T002 [P] Add `boardSpecToBoard(boardSpec)` to `connect-four/src/lib/board.js` — export the function below the existing exports; conversion rule: `boardSpec[c].charAt(r) === 'g'` → `'red'`, `'d'` → `'yellow'`, missing → `'empty'`; produces `board[row][col]` 6×7 array
- [x] T003 [P] Add i18n seed keys to `connect-four/src/i18n/en.json`: `socratic.ask`, `socratic.wrong1`, `socratic.wrong2`, `socratic.correct`, `socratic.hint`, and `lesson.confirmation.header` — exact values in plan §A3

**Checkpoint**: Run `npm run test:fast` inside `connect-four/` — all existing tests still pass.

---

## Phase 2: Foundational (Blocking Server Prerequisites)

**Purpose**: Lesson file loader + API endpoints. Blocks all four user stories (every screen calls
`GET /api/lessons` or `GET /api/lessons/:id`). Must be complete before ANY screen is implemented.

**⚠️ CRITICAL**: No screen work can begin until this phase is complete.

- [x] T004 Write unit test file `connect-four/tests/boardSpecToBoard.test.js` — test cases: `'g'` → `'red'`, `'d'` → `'yellow'`, empty column string → all `'empty'`, mixed column `"gd"` fills rows 0 and 1 of that column, 7-element boardSpec produces a 6×7 result; run `npm run test:fast` and confirm passing
- [x] T005 Create `connect-four/server/lessonLoader.js` — export `loadLessons(dir)`, `getLessons()`, `getLesson(id)`; `loadLessons` reads all `lesson-NN-*.json` files via `fs.readdirSync` + `JSON.parse(fs.readFileSync(...))`, validates per FR-032 (required fields + `boardSpec` element count must be 7), logs validation failures with `console.error`, attaches `order` from filename numeric prefix, sorts by `order`; `getLessons()` returns `[{ id, title, order, free }]`; `getLesson(id)` returns full object or `null`
- [x] T006 Write unit test file `connect-four/tests/lessonLoader.test.js` — test cases: valid JSON file is loaded and returned, file missing `id` field is excluded with a `console.error` call, directory that does not exist does not crash (returns empty array), `boardSpec` with 6 elements is excluded; run `npm run test:fast` and confirm passing
- [x] T007 Register lesson endpoints in `connect-four/server/index.js`: call `loadLessons(path.join(__dirname, '../lessons'))` at startup alongside other init; add `GET /api/lessons` returning `getLessons()` and `GET /api/lessons/:id` returning full lesson or `404 { error: 'not_found' }`; both routes require no auth (FR-035); follow `api-conventions.md`

**Checkpoint**: Start the dev server and confirm `curl http://localhost:3001/api/lessons` returns `[]` (empty `lessons/` dir) with no crash; `GET /api/lessons/unknown-id` returns 404.

---

## Phase 3: User Story 1 — Saga Map Screen (Priority: P1) — MVP

**Goal**: User can open the Saga Map, see all lessons with correct node states, and launch a lesson in 2 taps.

**Independent Test**: Load `SagaScreen` in the browser with the dev server running (empty `lessons/` dir). Confirm the screen mounts without error and shows an empty list. Then manually add a test lesson JSON to `lessons/` and verify node-state rendering without a DB.

- [x] T008 [US1] Create `connect-four/src/screens/SagaScreen.jsx` — props: `{ go, goBack }`; on mount: fetch `GET /api/lessons`, call `store.getLessonProgress()`, call `store.getProfile().then(p => setTier(p.tier))` (initialize `tier` state to `'free'`; pattern from `PostSetSummaryScreen.jsx:50`), call `track('screen_viewed', { screen: 'saga_map' })`; derive `nodeState(lesson)` per FR-003 using `tier` state (NOT `session.tier` — `session` has no tier field); render `TopBar` ("Lessons", back to `home`), scrollable Variant-C list; `onNodeTap`: if `locked` → open `UpgradeModal`; else `go('concept', { lessonId: lesson.id })`; node visuals per plan §B1
- [x] T009 [US1] Wire `SagaScreen` into `connect-four/src/lib/screenRegistry.jsx` — replace `(props) => <PlaceholderScreen {...props} screenKey="saga" />` with `import { SagaScreen }` and `<SagaScreen {...props} />`

**Checkpoint**: Navigate to `saga` screen in the running app. Screen renders without crash. With empty `lessons/` dir the list is empty and no error is thrown (edge case from spec).

---

## Phase 4: User Story 2 — Concept Screen (Priority: P1)

**Goal**: User can read through lesson concept slides, see annotated boards, legends, and prose, then advance to the next screen.

**Independent Test**: Load `ConceptScreen` with a `lessonId` pointing to a manually placed test lesson JSON. Verify: TopBar shows title and "1 / N"; CoachDialog renders first slide messages; Board renders with `canPlay={false}`; Continue advances slide index; `track('lesson_started', ...)` fires only on first render.

- [x] T010 [US2] Create `connect-four/src/screens/ConceptScreen.jsx` — props: `{ go, goBack, lessonId }`; on mount: fetch `GET /api/lessons/${lessonId}`, show loading state, show error state with Back button on 404; `slideIndex` state (0-based); fire `track('lesson_started', { lessonId })` exactly once on slide 0 using a `useRef` fired flag; render per slide: `TopBar` with title and `"${slideIndex+1} / ${slides.length}"` meta slot, `CoachDialog` with `messages={slide.coachMessages}`, `Board` with `board={boardSpecToBoard(slide.boardSpec)}` `canPlay={false}` `overlays={slide.overlays}`, legend row (screen-owned markup) when `slide.legendItems.length > 0` with swatch colors per plan §C1, info card when `slide.infoProse` is non-empty; Continue button navigation per FR-018 (next slide → socratic → clchallenge → reading-only completion)
- [x] T011 [US2] Wire `ConceptScreen` into `connect-four/src/lib/screenRegistry.jsx` — replace `PlaceholderScreen` for `concept` key with `import { ConceptScreen }` and `<ConceptScreen {...props} />`

**Checkpoint**: Navigate to `concept` screen via the Saga Map (requires a test lesson JSON in `lessons/`). Verify slide counter, board overlay, and Continue button advance to slide 2.

---

## Phase 5: User Story 3 — Socratic Screen (Priority: P1)

**Goal**: User can complete the Socratic board challenge — two-attempt flow with auto-advance on second wrong answer.

**Independent Test**: Load `SocraticScreen` with a `lessonId` pointing to a lesson that has `socratic != null`. Manually exercise all four phase transitions: ask→correct, ask→wrong1→correct, ask→wrong1→wrong2→auto-advance.

- [x] T012 Create `connect-four/src/lib/socraticReducer.js` — pure reducer: `socraticReducer(phase, action)` → `phase`; actions: `{ type: 'CORRECT' }`, `{ type: 'WRONG' }`, `{ type: 'ADVANCE' }`; transitions per FR-022; export as named export
- [x] T013 Write unit test file `connect-four/tests/socraticReducer.test.js` — test all four transitions: `ask + CORRECT → correct`, `ask + WRONG → wrong1`, `wrong1 + CORRECT → correct`, `wrong1 + WRONG → wrong2`; also test that unknown actions return current phase unchanged; run `npm run test:fast` and confirm passing
- [x] T014 [US3] Create `connect-four/src/screens/SocraticScreen.jsx` — props: `{ go, goBack, lessonId }`; on mount: fetch `GET /api/lessons/${lessonId}`; use `useReducer(socraticReducer, 'ask')`; `Board` with `board={boardSpecToBoard(lesson.socratic.boardSpec)}` — static throughout (no disc placed on tap); `canPlay` = `true` in `ask`/`wrong1`, `false` in `wrong2`/`correct`; `onColumnClick(col)` dispatches `CORRECT` or `WRONG` per phase; `wrong2` overlay: `{ c: correctCol, r: lesson.socratic.boardSpec[correctCol].length, type: 'win' }`; `useEffect` timer (1500 ms, cleanup on unmount) triggers `advance()` when phase is `wrong2`; CoachDialog messages per FR-023 (all i18n keys); Toolbar: Hint `ToolButton` always visible, Continue visible only in `correct`; hint shows static i18n message, does NOT reveal column; advance target per FR-025
- [x] T015 [US3] Wire `SocraticScreen` into `connect-four/src/lib/screenRegistry.jsx` — replace `PlaceholderScreen` for `socratic` key with `import { SocraticScreen }` and `<SocraticScreen {...props} />`

**Checkpoint**: Navigate through a full Socratic flow. Verify the 1500 ms auto-advance fires and the timer does not fire after navigating away (unmount cleanup).

---

## Phase 6: User Story 4 — Confirmation Challenges / `lessonMode` Extension (Priority: P1)

**Goal**: User completes N confirmation challenge puzzles as the final gate for lesson completion; lesson is marked `done` and user returns to Saga Map.

**Independent Test**: Load `CLChallengeScreen` directly with `lessonMode={true}`, `lessonId`, `lessonTitle`, `confirmationCategory`, and `confirmationCount`. Verify: TopBar shows "← [Title] — Practice"; progress bar shows "0 / N"; completing last puzzle calls `store.saveLessonProgress` and navigates to `saga`; if draw returns empty array, empty-set message appears and `saveLessonProgress` is NOT called.

- [x] T016 [US4] Extend `connect-four/src/screens/ChallengeScreen.jsx` with `lessonMode` props — **E1.1** (prop signature at line 39): add `lessonMode = false`, `lessonId`, `lessonTitle`, `confirmationCategory`, `confirmationCount`; **E1.2** (draw call ~line 124): replace hardcoded `n=8` and `category` with `drawN = lessonMode ? confirmationCount : 8` and `drawCategory = lessonMode ? confirmationCategory : category`; update `useEffect` deps array; **E1.3** (TopBar ~lines 482–505): `TopBar` already supports a `title` prop — pass `title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined}` on both TopBar instances (normal and loading states); **E1.4** (`handleNext` ~line 239): insert `else if (lessonMode)` branch after `advanceSession()` — calls `store.saveLessonProgress`, `track('lesson_completed', { lessonId })`, `go('saga')`; **E1.5** (`handleBack` ~line 233): add early return `if (lessonMode) { go('concept', { lessonId }); return; }` before the session guard; **E1.6** (empty draw guard): when `lessonMode && puzzles.length === 0 && phase !== 'loading'`, render an inline empty-state block (message + Back button) directly in `ChallengeScreen` — no separate component; do NOT call `saveLessonProgress` in this path (see plan §E1.6 for example markup)
- [x] T017 [US4] Create `connect-four/src/screens/CLChallengeScreen.jsx` — thin wrapper that imports `ChallengeScreen` and passes `lessonMode={true}` plus `lessonId`, `lessonTitle`, `confirmationCategory`, `confirmationCount` from navigation props; full code in plan §E2
- [x] T018 [US4] Wire `CLChallengeScreen` into `connect-four/src/lib/screenRegistry.jsx` — replace `PlaceholderScreen` for `clchallenge` key with `import { CLChallengeScreen }` and `<CLChallengeScreen {...props} />`

**Checkpoint**: Run `npm run test:fast` — all passing. Then manually walk the full golden path: Saga Map → Concept slides → Socratic → Confirmation challenges → Saga Map node shows `done`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Architecture documentation updates (Constitution Principle VIII — mandatory).

- [x] T019 [P] Update `docs/architecture/frontend-conventions.md` — add `boardSpecToBoard` to the "Shared Board Utility" section with description from plan §F1
- [x] T020 [P] Update `docs/architecture/server-conventions.md` — add "Lesson Loader" section documenting `lessonLoader.js` startup pattern, in-memory cache, validation/exclusion rules, and `order` derivation from filename; content from plan §F2
- [x] T021 [P] Verify `connect-four/src/lib/surfaceGroups.js` maps all four lesson screen keys (`saga`, `concept`, `socratic`, `clchallenge`) to `--bg-lessons` (FR-039); add entries if missing (Epic 1b should have done this — confirm only)

**Checkpoint**: `npm run test:fast` all passing. Full golden path verified end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (T001–T003)   No dependencies — all three tasks parallel
Phase 2 (T004–T007)   T004 depends on T002; T005–T006–T007 depend on T001; T007 depends on T005
Phase 3 (T008–T009)   Depends on Phase 2 complete (needs /api/lessons)
Phase 4 (T010–T011)   Depends on Phase 2 (needs /api/lessons/:id) AND T002 (boardSpecToBoard)
Phase 5 (T012–T015)   T012 independent; T013 depends on T012; T014 depends on T012 + T003 + Phase 2; T015 depends on T014
Phase 6 (T016–T018)   T016 depends on Phase 4 wired (T011); T017 depends on T016; T018 depends on T017
Phase 7 (T019–T021)   Can run any time after Phase 1; must complete before feature is marked shipped
```

### Critical Ordering Rules

1. **T002 (boardSpecToBoard) → T004 (its test)**: Write utility first; test validates it immediately.
2. **T005 (lessonLoader) → T006 (its test) → T007 (endpoints)**: Loader must exist and be tested before routes are wired.
3. **T012 (socraticReducer) → T013 (its test) → T014 (SocraticScreen)**: Pure reducer must be committed and tested before the screen wires `useReducer` onto it.
4. **T003 (i18n seed) → T014**: Missing i18n keys cause raw key strings in the UI; seed must be committed before SocraticScreen is implemented.
5. **T016 (ChallengeScreen lessonMode) → T017 (CLChallengeScreen wrapper)**: Wrapper depends on the extended prop API being present.

### Parallel Opportunities

Within Phase 1: T001, T002, T003 all parallel.
Within Phase 2: T005 and T006 can be written together (TDD style) in parallel with T007 only after T005.
Within Phase 7: T019, T020, T021 all parallel.

---

## Parallel Example: Phase 1

```
Task T001: Create connect-four/lessons/.gitkeep
Task T002: Add boardSpecToBoard to src/lib/board.js
Task T003: Seed i18n keys in src/i18n/en.json
  → All three are independent files; launch simultaneously
```

---

## Implementation Strategy

### MVP First (User Story 1 — Saga Map Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundation — required even for US1; Saga Map fetches `/api/lessons`)
3. Complete Phase 3 (Saga Map)
4. **STOP and VALIDATE**: Navigate to `saga`, verify node states render for empty lesson list and with a manually placed test JSON

### Incremental Delivery

1. Setup + Foundation → lesson API live
2. + Saga Map → user can browse lessons (empty list until Epic 5)
3. + Concept → user can read slides
4. + Socratic → interactive board challenge
5. + Confirmation Challenges → full lesson completion flow
6. Each phase adds a complete testable increment

---

## Notes

- No lesson JSON content is authored in this epic — `lessons/` ships empty. Epic 5 adds content.
- `boardSpecToBoard` note: `'red'` renders a **green** disc and `'yellow'` renders a **gray** disc per `reference_board_color_inversion.md`. This is intentional — do not change the mapping.
- `ChallengeScreen` edit in T016 is surgical (6 edit sites). Read the plan §E1 callouts carefully before touching that file — especially the `handleBack` guard ordering (lesson-mode early return must precede the `session || window.confirm` guard).
- Tier source: `session` from `useStore()` is the Supabase auth session and has no `tier` field. Use `store.getProfile().then(p => setTier(p.tier))` on mount (T008). Canonical pattern: `PostSetSummaryScreen.jsx:50`.
- `TopBar` `title` prop: already supported — just pass the prop (T016 E1.3).
- The four lesson screen keys must already be in `screenRegistry.jsx` as `PlaceholderScreen` entries (per Epic 1b). Confirm this before starting T009/T011/T015/T018.
