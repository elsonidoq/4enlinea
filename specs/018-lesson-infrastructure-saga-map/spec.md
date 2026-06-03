# Feature Specification: Lesson Infrastructure & Saga Map (Epic 4)

**Feature Branch**: `018-lesson-infrastructure-saga-map`  
**Created**: 2026-06-02  
**Status**: Draft  
**Epic**: Epic 4 — Lesson Infrastructure & Saga Map

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse the Lesson Catalog on the Saga Map (Priority: P1)

A user navigates from the Home Hub to the Saga Map and sees all 11 lessons laid out as a vertical list spine (Variant C). Each lesson shows its completion status, title, and a PRO badge for Lessons 8–11. The user can identify which lesson they are currently on, which they have completed, and which are locked behind Pro.

**Why this priority**: The Saga Map is the entry point to the entire Lessons surface. No lesson can be launched without it.

**Independent Test**: Can be fully tested by loading the `saga` screen with a mocked lessons list and mocked lesson-progress store data. All four node state variants (done, current, unlocked, locked) must render correctly without making any API call beyond `GET /api/lessons`.

**Acceptance Scenarios**:

1. **Given** a user with two completed lessons (Lessons 1 and 2), **When** they open the `saga` screen, **Then** Lessons 1 and 2 show as `done` (filled green circle + check icon), Lesson 3 shows as `current` (white circle + green border + pulse ring), Lessons 4–7 show as `unlocked` (white circle + dashed outline), and Lessons 8–11 show as `locked` (gray circle + padlock + PRO badge) for a free-tier user.
2. **Given** a free-tier user, **When** they tap a locked lesson node (e.g., Lesson 8), **Then** the `UpgradeModal` opens.
3. **Given** a free-tier user, **When** they tap the `current` lesson node, **Then** they navigate to the `concept` screen with `{ lessonId }` in params.
4. **Given** a user who has completed all free lessons (1–7), **When** they open the Saga Map, **Then** Lessons 1–7 show `done` and Lessons 8–11 show `locked`.
5. **Given** a brand-new user with no lesson progress, **When** they open the Saga Map, **Then** Lesson 1 is `current` and Lessons 2–7 are `unlocked`, Lessons 8–11 are `locked`.
6. **Given** any user, **When** the Saga Map screen mounts, **Then** `track('screen_viewed', { screen: 'saga_map' })` is called exactly once.

---

### User Story 2 — Read a Lesson Concept Slide (Priority: P1)

A user taps a lesson node and reads through one or more concept slides. Each slide shows a Coach message, a static annotated board, a legend row, and a prose info card. The user taps Continue to advance through slides.

**Why this priority**: The Concept screen is the primary pedagogical surface. It delivers all lesson content before any interactive challenge.

**Independent Test**: Can be tested by loading the `concept` screen with a single-lesson JSON fixture containing at least two slides. Verify that: the TopBar shows the lesson title and slide counter; CoachDialog renders the correct messages; the Board renders with the correct overlays; the legend row and info card appear; Continue advances slide index; `track('lesson_started', ...)` fires only on slide 0.

**Acceptance Scenarios**:

1. **Given** a lesson with 3 slides, **When** the user opens the `concept` screen, **Then** the TopBar shows "1 / 3" in the meta slot and the first slide's CoachDialog messages, board overlays, legend items, and infoProse are rendered.
2. **Given** the user is on slide 1 of 3, **When** they tap Continue, **Then** the meta slot updates to "2 / 3" and slide 2 content is rendered.
3. **Given** the user is on the last slide of a lesson with `socratic != null`, **When** they tap Continue, **Then** they navigate to the `socratic` screen.
4. **Given** the user is on the last slide of a lesson where `socratic === null` and `confirmationCategory != null`, **When** they tap Continue, **Then** they navigate to the `clchallenge` screen.
5. **Given** the user is on the last slide of a reading-only lesson (`socratic === null`, `confirmationCategory === null`), **When** they tap Continue, **Then** `store.saveLessonProgress(lessonId, 'complete')` is called, `track('lesson_completed', ...)` fires, and navigation goes to `saga`.
6. **Given** the user opens slide 0, **When** the slide renders, **Then** `track('lesson_started', { lessonId })` fires exactly once; subsequent Continue taps do NOT fire it again.

---

### User Story 3 — Complete the Socratic Board Challenge (Priority: P1)

A user reaches the Socratic board for a lesson. The Coach has "made a mistake" on the board. The user must identify and play the correct response. They get two attempts; on the second wrong answer, the correct column is briefly revealed before advancing automatically.

**Why this priority**: The Socratic interaction is the interactive core of lessons that include it. It must be correct before confirmation challenges are wired in.

**Independent Test**: Can be tested by loading the `socratic` screen with a fixture lesson that has `socratic.boardSpec` and `socratic.correctCol`. Verify all four state transitions: `ask → correct`, `ask → wrong1 → correct`, `ask → wrong1 → wrong2 → auto-advance`.

**Acceptance Scenarios**:

1. **Given** the Socratic screen opens (phase = `ask`), **When** the user taps the correct column, **Then** phase transitions to `correct` and the CoachDialog shows an affirming message; a Continue button appears.
2. **Given** phase = `ask`, **When** the user taps a wrong column, **Then** phase transitions to `wrong1`; the CoachDialog shows "Not quite — look for the right square. Try again."; the board remains interactive.
3. **Given** phase = `wrong1`, **When** the user taps the correct column, **Then** phase transitions to `correct`; Continue button appears.
4. **Given** phase = `wrong1`, **When** the user taps another wrong column, **Then** phase transitions to `wrong2`; the correct column receives a `win` overlay; the CoachDialog shows "Let me show you."; the board becomes non-interactive; after approximately 1500 ms the screen auto-advances without any user tap.
5. **Given** phase = `correct` and the lesson has `confirmationCategory != null`, **When** the user taps Continue, **Then** they navigate to the `clchallenge` screen.
6. **Given** phase = `correct` and the lesson is reading-only (`confirmationCategory === null`), **When** the user taps Continue, **Then** `store.saveLessonProgress(lessonId, 'complete')` is called and navigation goes to `saga`.
7. **Given** the Socratic screen, **When** the Hint button is tapped, **Then** a static hint text is shown in the CoachDialog; it does not reveal the correct column.

---

### User Story 4 — Complete the Confirmation Challenges and Finish a Lesson (Priority: P1)

After completing the concept slides (and optional Socratic), the user is presented with N confirmation challenge puzzles from the lesson's designated category. On completing at least one correctly, the lesson is marked as done and the user returns to the Saga Map with the node showing as complete.

**Why this priority**: Confirmation challenges are the final gate for lesson completion. Without this flow, lesson progress can never reach `done`.

**Independent Test**: Can be tested by loading the `clchallenge` screen with `lessonMode={true}`, a `lessonId`, and a drawn set of confirmation puzzles. Verify: the header shows the lesson name with "— Practice"; completing the last puzzle calls `store.saveLessonProgress`; the user is navigated to `saga` (not `summary`).

**Acceptance Scenarios**:

1. **Given** `lessonMode={true}` and a lesson with `confirmationCount: 2`, **When** the `clchallenge` screen loads, **Then** the TopBar shows "← [Lesson Title] — Practice" and the progress bar shows "0 / 2".
2. **Given** the user answers the first puzzle correctly, **When** feedback is shown, **Then** the progress bar updates to "1 / 2".
3. **Given** the user answers the last puzzle (puzzle 2 of 2), **When** they tap "Next →", **Then** `store.saveLessonProgress(lessonId, 'complete')` is called, `track('lesson_completed', { lessonId })` fires, and navigation goes to the `saga` screen (not `summary`).
4. **Given** the completed lesson is now on the Saga Map, **When** the user views the node, **Then** its state is `done`.
5. **Given** the lesson was already complete (`done`), **When** the user taps the node on the Saga Map, **Then** they can still enter the lesson and replay from the first concept slide; the completed state is NOT reset.

---

### Edge Cases

- **`boardSpec` element count is not 7**: The server-loaded JSON fails schema validation; the server logs an error and that lesson is excluded from `GET /api/lessons` response (does not crash the server).
- **`GET /api/lessons` returns an empty array**: The Saga Map renders an empty list with no crash; the screen shows no lesson nodes.
- **`GET /api/lessons/:id` called for an unknown lessonId**: Server returns 404; the `concept` screen shows a generic error state and a "Back" button to return to `saga`.
- **Confirmation category has 0 approved puzzles**: `GET /api/puzzles/draw` returns an empty array; the `clchallenge` screen shows an empty-set message and a Back button; `store.saveLessonProgress` is NOT called (lesson remains incomplete).
- **User navigates back from `concept` mid-lesson**: They return to the Saga Map; slide progress is NOT persisted between sessions (in-memory only); re-entering the lesson starts from slide 0.
- **User navigates back from `socratic` screen**: They return to `concept` at the last slide; Socratic phase resets to `ask` on re-entry.
- **Auto-advance timer fires while the user has navigated away**: The `setTimeout` callback checks whether the component is still mounted before calling `go()`; it is a no-op if unmounted.
- **Lesson JSON has `confirmationCount: 0` with a non-null `confirmationCategory`**: Treated as reading-only (no confirmation challenges drawn); completion triggers on the last concept slide/Socratic.
- **Pro-gated lesson (Lessons 8–11) tapped by a paid user**: Navigation proceeds normally to the `concept` screen; the UpgradeModal is NOT shown for paid users.
- **`store.getLessonProgress()` returns an empty array (first-time user)**: All lessons show their default state: Lesson 1 = `current`, Lessons 2–7 = `unlocked`, Lessons 8–11 = `locked`.

---

## Requirements *(mandatory)*

### Functional Requirements

**Saga Map screen (`saga`)**

- **FR-001**: The `saga` screen MUST call `GET /api/lessons` on mount and display all returned lessons as a vertical list (Variant C only).
- **FR-002**: The screen MUST derive each lesson's display state (`done`, `current`, `unlocked`, `locked`) entirely client-side by combining the API list with `store.getLessonProgress()` results and the authenticated user's tier. The server MUST NOT return node states.
- **FR-003**: State derivation rules MUST be:
  - `done` — `store.getLessonProgress()` has an entry with `status === 'complete'` for that `lessonId`
  - `current` — the first lesson (by `order`) that is not `done` and is either `free` or the user is paid tier
  - `unlocked` — a free lesson that is not `done` and not `current`; a paid lesson whose tier the user meets
  - `locked` — a lesson with `free === false` AND the user's `tier !== 'paid'`
  - **Tier source**: Tier is read asynchronously via `store.getProfile().then(p => setTier(p.tier))` on mount. The `session` object from `useStore()` is the Supabase auth session and does NOT carry a `tier` field. Canonical pattern: `PostSetSummaryScreen.jsx:50`.
- **FR-004**: A `done` node MUST show a filled green circle with a check icon and a "Completed" status label.
- **FR-005**: A `current` node MUST show a white circle with a green border and an animated pulse ring, and an "In progress" status label.
- **FR-006**: An `unlocked` node MUST show a white circle with a dashed outline and an "Unlocked" status label.
- **FR-007**: A `locked` node MUST show a gray-background circle with a padlock icon, reduced opacity (0.7), and a "Locked" status label. Lessons 8–11 MUST also show a PRO badge.
- **FR-008**: Tapping a `done`, `current`, or `unlocked` node MUST navigate to the `concept` screen with params `{ lessonId }`.
- **FR-009**: Tapping a `locked` node MUST open the `UpgradeModal` (waitlist capture; no Stripe).
- **FR-010**: The screen MUST call `track('screen_viewed', { screen: 'saga_map' })` on mount.

**Concept screen (`concept`)**

- **FR-011**: The `concept` screen MUST call `GET /api/lessons/:id` on mount (using `lessonId` from navigation params) and render the first slide.
- **FR-012**: The TopBar MUST show the lesson `title` and a meta slot with "N / M" where N is the 1-based current slide index and M is the total slide count.
- **FR-013**: The `CoachDialog` MUST render all `coachMessages` entries for the current slide, preserving `text`, `lead`, and `faded` properties.
- **FR-014**: The `Board` MUST be rendered as static (non-interactive, `canPlay={false}`) passing `board={boardSpecToBoard(slide.boardSpec)}` and `overlays={slide.overlays}` as props. **Note**: `cols`, `mkCols`, and `onColumn` in the mockup are mockup-only helpers and do NOT exist in the production `Board.jsx`; they are superseded by `boardSpecToBoard` (which produces the `board[row][col]` format), the `board` prop, `onColumnClick`, and `canPlay`.
- **FR-015**: **`boardSpec` → `board` conversion rule**: `boardSpec` is a 7-element array where index = column (0-indexed) and each element is a string of `'g'`/`'d'` characters from bottom to top. Convert it to the production `Board` prop format using `boardSpecToBoard(boardSpec)` from `src/lib/board.js`, which produces a `board[row][col]` 6×7 array with `'empty'`/`'red'`/`'yellow'` values (`'g'`→`'red'`, `'d'`→`'yellow'`). Do NOT pass `cols` or use `mkCols` — those are mockup-only and do not exist in production.
- **FR-016**: A legend row MUST be rendered below the board when `slide.legendItems` is non-empty; each entry shows a colored swatch matching the overlay `type` token and the `label` string.
- **FR-017**: An info card (styled prose block) MUST be rendered below the legend when `slide.infoProse` is non-empty.
- **FR-018**: A Continue button MUST be shown at all times. Its navigation target is resolved as:
  - If `slideIndex < slides.length - 1` → advance to next slide (increment `slideIndex`)
  - Else if `lesson.socratic != null` → navigate to `socratic` screen
  - Else if `lesson.confirmationCategory != null` → navigate to `clchallenge` screen
  - Else (reading-only) → call `store.saveLessonProgress(lessonId, 'complete')`, emit `track('lesson_completed', { lessonId })`, navigate to `saga`
- **FR-019**: `track('lesson_started', { lessonId })` MUST fire exactly once when `slideIndex === 0` is first rendered; it MUST NOT fire on subsequent Continue taps or on re-entry.

**Socratic screen (`socratic`)**

- **FR-020**: The `socratic` screen MUST render an interactive `Board` from `lesson.socratic.boardSpec` using `board={boardSpecToBoard(lesson.socratic.boardSpec)}` and `onColumnClick` / `canPlay` props. **Note**: `cols`, `mkCols`, and `onColumn` are mockup-only and do not exist in production (see FR-015).
- **FR-021**: The `canPlay` prop MUST be `true` in phases `ask` and `wrong1`; MUST be `false` (board locked) in phases `wrong2` and `correct`.
- **FR-022**: The phase state machine MUST implement exactly four states: `ask`, `wrong1`, `wrong2`, `correct`.
  - On column tap in `ask`: if `col === lesson.socratic.correctCol` → transition to `correct`; else → transition to `wrong1`.
  - On column tap in `wrong1`: if `col === lesson.socratic.correctCol` → transition to `correct`; else → transition to `wrong2`.
  - `wrong2`: add `win` overlay on column `socratic.correctCol` at the top-of-column row; start a 1500 ms timer; on timer expiry → advance.
  - `correct`: show Continue button.
- **FR-023**: CoachDialog messages per phase (all sourced from i18n; no lesson JSON fields):
  - `ask`: `t('lesson.<id>.socratic.ask', { defaultValue: t('socratic.ask') })`; mood `think`
  - `wrong1`: `t('socratic.wrong1')` — "Not quite — look for the right square. Try again."; mood `oops`
  - `wrong2`: `t('socratic.wrong2')` — "Let me show you."; mood `oops`
  - `correct`: `t('lesson.<id>.socratic.correct', { defaultValue: t('socratic.correct') })`; mood `happy`
- **FR-024**: The Continue button MUST be visible only in `correct` phase.
- **FR-025**: Advance target from the Socratic screen (tapped Continue or auto-advance from `wrong2`):
  - If `lesson.confirmationCategory != null` → navigate to `clchallenge` screen
  - Else → call `store.saveLessonProgress(lessonId, 'complete')`, emit `track('lesson_completed', { lessonId })`, navigate to `saga`
- **FR-026**: The Toolbar MUST include a Hint button. Tapping it shows a static hint in the CoachDialog using `t('lesson.<id>.socratic.hint', { defaultValue: t('socratic.hint') })`; it MUST NOT reveal the correct column.
- **FR-027**: The auto-advance timer (1500 ms) MUST be cancelled if the component unmounts before it fires (use `useEffect` cleanup).

**Confirmation Challenges screen (`clchallenge`)**

- **FR-028**: The `clchallenge` screen MUST reuse `ChallengeScreen` from Epic 2a, passing `lessonMode={true}`, `lessonId`, `lessonTitle`, `confirmationCategory`, and `confirmationCount` as props.
- **FR-029**: When `lessonMode={true}`, `ChallengeScreen` MUST:
  - Display the header as "← [lessonTitle] — Practice" (i18n key `lesson.confirmation.header` with `{title}` interpolation)
  - Draw exactly `confirmationCount` puzzles via `GET /api/puzzles/draw?category=<confirmationCategory>&n=<confirmationCount>`
  - Navigate to `saga` (not `summary`) when the last puzzle's "Next →" is tapped
- **FR-030**: On navigating to `saga` in lesson mode, `store.saveLessonProgress(lessonId, 'complete')` MUST be called first, then `track('lesson_completed', { lessonId })`, then `go('saga')`.

**Backend: `GET /api/lessons`**

- **FR-031**: The server MUST load all `lessons/lesson-NN-*.json` files from the `lessons/` directory at startup.
- **FR-032**: Each loaded JSON MUST be validated for required top-level fields: `id` (string), `title` (string), `free` (boolean), `userPerspective` (`"red"` or `"yellow"`), `slides` (non-empty array), `socratic` (object or null), `confirmationCategory` (string or null), `confirmationCount` (integer ≥ 0). Files failing validation MUST be logged and excluded; the server MUST NOT crash.
- **FR-033**: `GET /api/lessons` MUST return `[{ id, title, order, free }]` sorted ascending by `order`. The `order` value is the numeric suffix extracted from the filename (e.g., `lesson-05-claimeven.json` → `order: 5`).
- **FR-034**: `GET /api/lessons/:id` MUST return the full lesson JSON object for the matching `id`. If no lesson has that `id`, the endpoint MUST return `404 { error: 'not_found' }`.
- **FR-035**: Both endpoints MUST be accessible without authentication (lesson catalog is public).

**Cross-cutting**

- **FR-036**: All user-facing strings MUST go through `t()` i18n keys. No hardcoded English strings in component render output.
- **FR-037**: All navigation MUST use `go(screenKey, params)`. No `react-router` API.
- **FR-038**: All store reads and writes MUST go through `useStore()` from `ProfileStore` context. Direct imports of `IndexedDBStore` or `SupabaseStore` are forbidden in lesson screens.
- **FR-039**: The four lesson screen keys (`saga`, `concept`, `socratic`, `clchallenge`) MUST be mapped to the `lessons` surface group with `--bg-lessons` background token in `src/lib/surfaceGroups.js`. These keys are already in the screen registry (`src/lib/screenRegistry.js`) per Epic 1b; this epic wires their components.

---

### Key Entities

- **Lesson**: A JSON file in `lessons/` containing metadata and all content for one lesson. Key fields: `id` (slug), `title`, `free` (boolean), `userPerspective` (`"red"` | `"yellow"`), `slides` (array), `socratic` (object | null), `confirmationCategory` (string | null), `confirmationCount` (int).
- **Slide**: One element of a lesson's `slides` array. Fields: `coachMessages`, `boardSpec`, `overlays`, `legendItems`, `infoProse`.
- **SocraticConfig**: The `lesson.socratic` object. Fields: `boardSpec` (7-element array), `correctCol` (0-indexed int). All coach messages (ask, wrong1, wrong2, correct, hint) are sourced from i18n — no message fields in the JSON schema.
- **LessonProgress**: A store record keyed by `lessonId` with `status: 'complete'`. Written via `store.saveLessonProgress(lessonId, 'complete')`. Read via `store.getLessonProgress()` which returns `Array<{ lessonId, status }>`.
- **NodeState**: Derived client-side display state for a saga map node. Enum: `done` | `current` | `unlocked` | `locked`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the Saga Map, identify their current lesson, and launch it in 2 taps or fewer.
- **SC-002**: All four node state variants (done, current, unlocked, locked) render correctly without errors for any combination of lesson progress and user tier.
- **SC-003**: A user can complete a full lesson flow — concept slides → Socratic board → confirmation challenges → return to Saga Map — with the node state updating to `done` without a page reload.
- **SC-004**: The Socratic 2-strike flow correctly auto-advances after ~1500 ms on the second wrong answer in 100% of tested cases; the timer does not fire after unmount.
- **SC-005**: Tapping Continue on the last concept slide of a reading-only lesson marks the lesson as complete and returns the user to the Saga Map in a single navigation step.
- **SC-006**: The `GET /api/lessons` endpoint returns in under 50 ms (data is loaded at server startup; no DB query at request time).
- **SC-007**: Lesson content screens render the correct board overlays for all lesson-relevant overlay types (`tg`, `td`, `claim`, `win`). The overlay type `tr` ("your move" indicator used in Position Explorer) is NOT used in lesson screens. The legend row is screen-owned markup rendered from `slide.legendItems[].type` and `slide.legendItems[].label`; it is not a Board prop.
- **SC-008**: Replaying a completed lesson from the Saga Map does not reset the `done` state; the checkmark on the node remains after the replay.

---

## Assumptions

- **Epic dependencies are met**: Epic 1a (Board component, overlay types, CoachDialog, Toolbar, TopBar, UpgradeModal), Epic 1b (navigation via `go()`, screen registry with all four lesson screen keys, `--bg-lessons` token, `surfaceGroups.js`), Epic 7 (store interface: `saveLessonProgress`, `getLessonProgress`), and Epic 2a (`ChallengeScreen` with `GET /api/puzzles/draw` endpoint) are all shipped before this epic.
- **`ChallengeScreen` `lessonMode` prop**: This prop does not exist in Epic 2a's deliverables. Epic 4 adds it to `ChallengeScreen` as part of this implementation. The change is additive (optional prop with a default of `false`); no breaking change to existing Challenge flows.
- **`lessons/` directory**: The top-level `lessons/` directory inside `connect-four/` is created as part of this epic. It ships empty (no lesson JSON files); actual content is authored in Epic 5.
- **Server startup validation**: The server already uses Node 20+ (required by the `with { type: 'json' }` import syntax per server conventions). The lesson loader uses `fs.readdirSync` + `JSON.parse` at startup, not dynamic import, to avoid the import-attribute requirement for variable paths.
- **`store.getLessonProgress()` interface**: Already defined and implemented in Epic 7; returns `Array<{ lessonId, status }>`. The `saveLessonProgress(lessonId, status)` method is also already wired.
- **No per-lesson i18n content**: Lesson `title` values are English strings authored in the JSON. The i18n key `lesson.<id>.title` is populated from the JSON value at authoring time (Epic 5). For Epic 4 (infrastructure-only), lesson titles displayed in the Saga Map and TopBar are read directly from the API `title` field and wrapped with `t(lesson.<id>.title, { defaultValue: lesson.title })` to support future localization without blocking the infrastructure build.
- **Socratic coach messages**: All Socratic phase messages are sourced from i18n only — no message fields exist in the lesson JSON schema. Per-lesson overrides use keys `lesson.<id>.socratic.ask|wrong1|wrong2|correct|hint`; global fallbacks are `socratic.ask|wrong1|wrong2|correct|hint`. The fallback `socratic.ask` value is "I'm going to make a mistake here. See if you can punish it."
- **`boardSpec` always has exactly 7 elements** for valid lessons; invalid lessons are excluded by server-side validation and never reach the frontend.
- **`confirmationCount: 0` with non-null `confirmationCategory`** is treated as reading-only (no challenges drawn); completion is triggered at the end of the Socratic phase (or last concept slide if Socratic is also null).
- **Analytics `track()` helper** is already available from `src/lib/track.js` per Epic 1b.
- **`setActiveScreen` ordering**: `setActiveScreen(screenKey)` is called before `track('screen_viewed', ...)` on every navigation, as required by `frontend-conventions.md`. This is handled by the Navigator; lesson screens need not call it explicitly.

---

## Out of Scope

- Actual lesson content (JSON files with slides, boardSpecs, Socratic positions) — Epic 5
- Puzzle DB population for confirmation categories — Epic 6
- `odd_even_threat` category as a lesson confirmation category (it is a free-standing challenge set only)
- Saga Map Variants A (winding path) and B (meadow stones) — post-MVP
- Lesson admin UI or CMS
- Per-lesson i18n content population (Spanish `es.json`) — post-MVP content work
- Lesson content for Lessons 7–11 (Pro-gated patterns; infrastructure supports them; content deferred to Epic 5)
- Deep Reveal or LLM explanations within lesson flows
- Spaced repetition or adaptive lesson ordering
- Lesson progress reset / "redo" from within the lesson (the Saga Map replay button re-plays from slide 0 but does not reset the `done` flag)
