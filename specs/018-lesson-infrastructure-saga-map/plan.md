# Implementation Plan: Lesson Infrastructure & Saga Map (Epic 4)

**Branch**: `101-new-design` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)  
**Input**: `specs/018-lesson-infrastructure-saga-map/spec.md`

---

## Summary

Build the four lesson screens (`saga`, `concept`, `socratic`, `clchallenge`) and two lesson API
endpoints (`GET /api/lessons`, `GET /api/lessons/:id`). The server loads lesson JSON files from
`connect-four/lessons/` at startup via a new `lessonLoader.js` module. The frontend derives node
state client-side, converts `boardSpec` → `board` via a utility in `src/lib/board.js`, and
reuses `ChallengeScreen` with an additive `lessonMode` prop for confirmation challenges.

---

## Technical Context

**Language/Version**: JavaScript (Node 20+, React 18)  
**Primary Dependencies**: React, react-i18next, Vite (frontend); Express (server)  
**Storage**: No new DB tables (lesson progress already in IndexedDB + Supabase from Epic 7); lesson content in JSON files  
**Testing**: `npm run test:fast` inside `connect-four/`; manual golden-path verification  
**Target Platform**: Mobile-first PWA (iOS Safari, Android Chrome)  
**Performance Goals**: `GET /api/lessons` < 50 ms (data loaded at startup; no DB query)  
**Constraints**: Four lesson screen keys already in `screenRegistry.jsx` as `PlaceholderScreen`; `surfaceGroups.js` already maps them to `--bg-lessons`; store methods `saveLessonProgress`/`getLessonProgress` already implemented in both stores  
**Scale/Scope**: 11 lessons (Epic 4 ships infrastructure empty; content in Epic 5)

---

## Constitution Check

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] Lesson screens show static annotated boards; no solver calls, no pattern labels, no LLM
  annotations. The Socratic screen shows a pre-authored board position from JSON — it does not
  generate solver-backed evaluation. No violation.

**Principle II — Code Quality & Simplicity**:
- [x] `boardSpecToBoard` utility added to existing `src/lib/board.js` — no new module.
- [x] `lessonLoader.js` is a focused single-purpose module.
- [x] `lessonMode` is an additive optional prop on `ChallengeScreen`; no branching of existing
  non-lesson flows.
- [x] Storage-agnostic interface honored: all store calls go through `useStore()`.

**Principle III — Testing Standards**:
- [x] `boardSpecToBoard` utility requires a unit test with positive and negative cases.
- [x] Server lesson loader requires a unit test (valid JSON, invalid JSON, missing dir).
- [x] Socratic state machine (4 phases) requires a unit test.
- [x] Manual golden-path verification required before marking screens complete.

**Principle IV — UX Consistency & Progressive Disclosure**:
- [x] Overlay types `tg`/`td`/`claim`/`win` are the locked cross-epic enum from Epic 1a. No new
  overlay types introduced.
- [x] Locked PRO lessons render a preview node with an UpgradeModal prompt — not hidden, not an
  error.

**Principle V — Performance Requirements**:
- [x] `GET /api/lessons` is O(1) memory lookup — no DB query at request time.
- [x] Socratic auto-advance timer (1500 ms) uses `useEffect` cleanup to avoid post-unmount fires.

**Principle VI — Implementation & Debugging Methodology**:
- [x] `boardSpec` → `board` conversion rule is explicit and tested before being used in screens.
- [x] `wrong2` overlay row is derived from `boardSpec[correctCol].length` — no implicit assumption
  about column height.

**Principle VII — Software Design Philosophy**:
- [x] `boardSpecToBoard` is a single canonical function in the canonical board utility file.
- [x] Lesson JSON schema is flat and explicit; no nested config objects beyond `socratic`.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] `data-model.md` documents the Lesson, Slide, SocraticConfig entities and wire shapes.
- [x] `contracts/api-lessons.md` documents both lesson endpoints.
- [x] `research.md` documents the `boardSpecToBoard` decision and all other resolved unknowns.
- [x] `docs/architecture/frontend-conventions.md` update required: add `boardSpecToBoard` to the
  Shared Board Utility section.
- [x] `docs/architecture/server-conventions.md` update required: document lesson loader pattern
  (startup file loading, no DB, `lessonLoader.js` as the canonical module).

---

## Project Structure

### Documentation (this feature)

```text
specs/018-lesson-infrastructure-saga-map/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Entities, wire shapes, validation rules
├── contracts/
│   └── api-lessons.md   # GET /api/lessons + GET /api/lessons/:id
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (affected paths)

```text
connect-four/
├── lessons/                          # NEW — empty in Epic 4; content in Epic 5
├── server/
│   ├── lessonLoader.js               # NEW — startup file loader + in-memory cache
│   └── index.js                      # MODIFY — register GET /api/lessons + /:id
├── src/
│   ├── lib/
│   │   ├── board.js                  # MODIFY — add boardSpecToBoard()
│   │   └── socraticReducer.js        # NEW — pure reducer for Socratic phase state machine
│   ├── screens/
│   │   ├── SagaScreen.jsx            # NEW — replaces PlaceholderScreen for 'saga'
│   │   ├── ConceptScreen.jsx         # NEW — replaces PlaceholderScreen for 'concept'
│   │   ├── SocraticScreen.jsx        # NEW — replaces PlaceholderScreen for 'socratic'
│   │   └── ChallengeScreen.jsx       # MODIFY — add lessonMode + lesson props
│   ├── lib/
│   │   └── screenRegistry.jsx        # MODIFY — wire four new screen components
│   └── i18n/
│       └── en.json                   # MODIFY — add socratic.* + lesson.confirmation.* keys
└── tests/
    ├── boardSpecToBoard.test.js       # NEW — unit tests for conversion utility
    ├── lessonLoader.test.js           # NEW — unit tests for server loader
    └── socraticReducer.test.js        # NEW — unit tests for Socratic phase reducer (src/lib/socraticReducer.js)
```

---

## Complexity Tracking

No constitution violations.

---

## Implementation Phases

### Phase A — Foundation (no screen rendering yet)

These tasks are prerequisites that all screens depend on. They must be done first and tested
before any screen work begins.

**A1 — `lessons/` directory**
Create `connect-four/lessons/` with a `.gitkeep` file. This is where Epic 5 will add JSON files.
No content needed for Epic 4.

**A2 — `boardSpecToBoard` utility in `src/lib/board.js`**
Add and export `boardSpecToBoard(boardSpec)` function. Conversion rule:
```js
// boardSpec: Array[7] of strings; char index = row (0=bottom); 'g'→'red', 'd'→'yellow'
// Returns: board[row][col] 6×7 array with 'empty'/'red'/'yellow' values
function boardSpecToBoard(boardSpec) {
  const result = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  boardSpec.forEach((colStr, c) => {
    for (let r = 0; r < colStr.length; r++) {
      result[r][c] = colStr[r] === 'g' ? 'red' : 'yellow';
    }
  });
  return result;
}
```
Unit test: `boardSpecToBoard.test.js` — verify 'g'→'red', 'd'→'yellow', empty cols→'empty',
mixed col `"gd"` fills rows 0 and 1 of that column.

**A3 — i18n seed: `socratic.*` + `lesson.*` keys**
Add to `en.json`:
```json
{
  "socratic": {
    "ask":     "I'm going to make a mistake here. See if you can punish it.",
    "wrong1":  "Not quite — look for the right square. Try again.",
    "wrong2":  "Let me show you.",
    "correct": "Exactly! You saw it.",
    "hint":    "Look for an even square directly above one of my discs."
  },
  "lesson": {
    "confirmation": {
      "header": "{{title}} — Practice"
    }
  }
}
```
Hard dependency of SocraticScreen — must be present before screen implementation.

**A4 — `lessonLoader.js` (server)**
New file `connect-four/server/lessonLoader.js`:
- `loadLessons(dir)` — reads all `lesson-NN-*.json` files from `dir` using `fs.readdirSync` +
  `JSON.parse(fs.readFileSync(...))`; validates each file per spec FR-032; logs validation
  failures; attaches `order` from filename numeric prefix; sorts by `order`; stores in module-
  level cache.
- `getLessons()` — returns cached sorted array of `{ id, title, order, free }` (summary shape).
- `getLesson(id)` — returns full cached lesson object or `null`.
- Called once at server startup from `server/index.js`.

Unit test: `lessonLoader.test.js` — valid file, invalid file (missing `id`), missing dir,
`boardSpec` with 6 elements (invalid) is excluded.

**A5 — `GET /api/lessons` + `GET /api/lessons/:id` in `server/index.js`**
Register two routes (both public, no auth required per FR-035):
```js
app.get('/api/lessons', (req, res) => res.json(getLessons()));
app.get('/api/lessons/:id', (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});
```
Call `loadLessons(path.join(__dirname, '../lessons'))` at startup (alongside other startup init).

---

### Phase B — Saga Map screen

**B1 — `SagaScreen.jsx`**

New file `connect-four/src/screens/SagaScreen.jsx`. Props: `{ go, goBack }`.

Key behaviors:
1. On mount: `GET /api/lessons` → `setLessons(data)`.
2. On mount: `store.getLessonProgress()` → `setProgress(data)`.
3. On mount: `track('screen_viewed', { screen: 'saga_map' })` — note: the Navigator calls
   `track('screen_viewed', ...)` automatically on every `go()`; the spec FR-010 requires
   `track('screen_viewed', { screen: 'saga_map' })`. Since the Navigator fires
   `track('screen_viewed', { screen: 'saga' })`, the lesson-specific `saga_map` value requires a
   **separate explicit call** in `SagaScreen` on mount (not redundant — different `screen` value).
4. Derive `nodeState(lesson)` per FR-003:
   - `done` if progress has `{ lessonId: lesson.id, status: 'complete' }`.
   - `current` if not done AND (lesson.free OR tier === 'paid') AND is the first such
     lesson by order.
   - `locked` if `!lesson.free && tier !== 'paid'`.
   - `unlocked` otherwise.
   **Tier source**: `tier` does NOT live on the `session` object. Call
   `store.getProfile().then(p => setTier(p.tier))` on mount; initialize `tier` state to `'free'`
   (safe default while loading). Pattern: `PostSetSummaryScreen.jsx:50`. FR-038 forbids direct
   `IndexedDBStore`/`SupabaseStore` imports.
5. Render: TopBar ("Lessons", back to `home`), scrollable list (Variant C from mockup), each
   node calls `onNodeTap(lesson, state)`.
6. `onNodeTap`: if `locked` → open `UpgradeModal`; else `go('concept', { lessonId: lesson.id })`.

Node visual per state:
- `done` — filled green circle (`--disc-green`), check icon, "Completed" label.
- `current` — white circle, `3px solid var(--disc-green)` border, pulse-ring animation, "In
  progress" label.
- `unlocked` — white circle, `3px dashed #c9c3b6` border, "Unlocked" label.
- `locked` — `var(--lock-bg)` circle, lock icon, `opacity: 0.7`, "Locked" label. PRO badge for
  lessons with `free === false`.

**B2 — Wire `SagaScreen` into `screenRegistry.jsx`**
Replace `(props) => <PlaceholderScreen {...props} screenKey="saga" />` with `SagaScreen` import.

---

### Phase C — Concept screen

> **Mockup API divergence (Board)**: The mockup `ConceptScreen` uses `cols={mkCols(boardSpec)}` and an `onColumn` handler. **These do not exist in production `Board.jsx`**. The production API uses `board={boardSpecToBoard(boardSpec)}`, `canPlay`, and `onColumnClick`. All screen implementations in Phases C, D, and E MUST use the production API. `mkCols`, `cols`, and `onColumn` are mockup-only and must NOT appear in production code.

**C1 — `ConceptScreen.jsx`**

New file `connect-four/src/screens/ConceptScreen.jsx`. Props: `{ go, goBack, lessonId }`.

Key behaviors:
1. On mount: `GET /api/lessons/${lessonId}` → `setLesson(data)`. Show loading state; show error
   state with Back button if 404 (edge case from spec).
2. State: `slideIndex` (0-based), initialized to 0.
3. On `slideIndex === 0` first render: call `track('lesson_started', { lessonId })` exactly
   once. Use a `useRef` fired flag to prevent re-fires on re-render.
4. Render per slide:
   - `TopBar`: title = `t('lesson.${lessonId}.title', { defaultValue: lesson.title })`;
     meta = `"${slideIndex + 1} / ${lesson.slides.length}"`.
   - `CoachDialog`: `messages={slide.coachMessages}`.
   - `Board`: `board={boardSpecToBoard(slide.boardSpec)}` `canPlay={false}`
     `overlays={slide.overlays}`.
   - Legend row: render when `slide.legendItems.length > 0` — each item shows a swatch
     (colored span matching the overlay type token) + `item.label`. This is screen-owned markup
     (NOT a Board prop). Overlay type → swatch color map:
     - `tg` → `var(--disc-green)` with 40% opacity
     - `td` → `var(--threat-gray)` with 40% opacity
     - `claim` → `var(--claim)`
     - `win` → `var(--disc-green)` pulsing
   - Info card: render when `slide.infoProse` is non-empty — prose block below legend.
   - `Toolbar`: Continue button only. No hint button.
5. Continue button navigation (FR-018):
   - `slideIndex < slides.length - 1` → `setSlideIndex(i + 1)`
   - `lesson.socratic != null` → `go('socratic', { lessonId })`
   - `lesson.confirmationCategory != null && lesson.confirmationCount > 0` →
     `go('clchallenge', { lessonId, lessonTitle: lesson.title, confirmationCategory: lesson.confirmationCategory, confirmationCount: lesson.confirmationCount })`
   - else (reading-only) → `store.saveLessonProgress(lessonId, 'complete')`;
     `track('lesson_completed', { lessonId })`; `go('saga')`

**C2 — Wire `ConceptScreen` into `screenRegistry.jsx`**

---

### Phase D — Socratic screen

> **Mockup superseded**: The mockup `SocraticScreen` has only 3 phases and mutates the board when the user plays (adds a disc). The production implementation is intentionally different: it has **4 phases** (`ask`, `wrong1`, `wrong2`, `correct`) as specified in FR-022, and the board display is **static throughout** — no disc is added on column tap (identification-only per FR-027/SC-004). The mockup is superseded by the spec's 4-phase model.

**D1 — `SocraticScreen.jsx`**

New file `connect-four/src/screens/SocraticScreen.jsx`. Props: `{ go, goBack, lessonId }`.

Key behaviors:
1. On mount: `GET /api/lessons/${lessonId}` → `setLesson(data)`. (Alternatively receive `lesson`
   as prop if `ConceptScreen` navigates with the full object — but navigation params are kept
   minimal per convention; fetch again.)
2. State: `phase` ∈ `'ask' | 'wrong1' | 'wrong2' | 'correct'` initialized to `'ask'`. The phase transition logic MUST be extracted as a pure reducer function `socraticReducer(phase, action)` → `phase` in `src/lib/socraticReducer.js`, then consumed by `SocraticScreen` via `useReducer`. This keeps the state machine testable in isolation.
3. Board: `board={boardSpecToBoard(lesson.socratic.boardSpec)}` — static; no discs placed by
   the user in the rendered board. The Socratic board is purely for identification, not for
   placing pieces.

   **Important implementation note**: Unlike the mockup `SocraticScreen` which mutates `cols`
   when the user plays, the production screen does NOT add a disc to the board on column tap.
   The interaction is identification-only: tap a column header to guess the correct response
   column. The board display remains unchanged throughout all phases. Only the `win` overlay is
   added in `wrong2` phase.
4. `canPlay` prop: `true` in `ask` and `wrong1`; `false` in `wrong2` and `correct`.
5. `onColumnClick(col)` handler:
   - In `ask`: `col === correctCol` → `setPhase('correct')`;
     else → `setPhase('wrong1')`.
   - In `wrong1`: `col === correctCol` → `setPhase('correct')`;
     else → `setPhase('wrong2')` + start 1500 ms timer.
   - In `wrong2` / `correct`: no-op (canPlay is false).
6. `wrong2` timer: `useEffect` on phase change. When phase becomes `wrong2`:
   ```js
   const tid = setTimeout(() => advance(), 1500);
   return () => clearTimeout(tid);
   ```
   `advance()` navigates per FR-025. The cleanup prevents post-unmount fire (FR-027, SC-004).
7. `wrong2` overlay: add `{ c: correctCol, r: lesson.socratic.boardSpec[correctCol].length, type: 'win' }`
   to overlays when phase is `wrong2`. The row index is `boardSpec[correctCol].length` — the
   next empty row (first unoccupied row) in that column.
8. Coach messages per phase (all from i18n):
   - `ask`: `[{ text: t('lesson.${lessonId}.socratic.ask', { defaultValue: t('socratic.ask') }), lead: t('socratic.ask.lead', { defaultValue: 'Heads up:' }) }]` — mood `think`
   - `wrong1`: `[{ text: t('socratic.wrong1'), mood: 'oops' }]`
   - `wrong2`: `[{ text: t('socratic.wrong2'), mood: 'oops' }]`
   - `correct`: `[{ text: t('lesson.${lessonId}.socratic.correct', { defaultValue: t('socratic.correct') }), mood: 'happy' }]`
9. Toolbar: Hint `ToolButton` (always visible); Continue button (visible only in `correct`).
   Hint tap: show hint message in CoachDialog using
   `t('lesson.${lessonId}.socratic.hint', { defaultValue: t('socratic.hint') })` — does NOT
   reveal the correct column.
10. Continue button advance target (FR-025):
    - `lesson.confirmationCategory != null && lesson.confirmationCount > 0` →
      `go('clchallenge', { lessonId, lessonTitle: lesson.title, confirmationCategory: ..., confirmationCount: ... })`
    - else → `store.saveLessonProgress(lessonId, 'complete')`;
      `track('lesson_completed', { lessonId })`; `go('saga')`

Unit test: `socraticReducer.test.js` (tests `src/lib/socraticReducer.js` directly) — all four phase transitions:
- `ask → correct` (correct col)
- `ask → wrong1` (wrong col)
- `wrong1 → correct` (correct col)
- `wrong1 → wrong2` (wrong col), timer fires → advance

**D2 — Wire `SocraticScreen` into `screenRegistry.jsx`**

---

### Phase E — Confirmation Challenges (`lessonMode` extension)

**E1 — Extend `ChallengeScreen` with `lessonMode` props**

Modify `connect-four/src/screens/ChallengeScreen.jsx`. The diff is surgical — all five edit sites are described against the actual code:

**E1.1 — Prop signature** (line 39):
Replace:
```js
export function ChallengeScreen({ go, goBack, category }) {
```
With:
```js
export function ChallengeScreen({
  go, goBack,
  category,
  // Lesson mode (all optional; default false/undefined preserves all existing flows)
  lessonMode = false,
  lessonId,
  lessonTitle,
  confirmationCategory,
  confirmationCount,
}) {
```

**E1.2 — Draw call `n` and category** (line 124 — `fetch(`${API}/api/puzzles/draw?category=${category}&n=8`)`):
Replace the hardcoded `n=8` and `category` with lesson-mode–aware values:
```js
const drawCategory = lessonMode ? confirmationCategory : category;
const drawN        = lessonMode ? confirmationCount    : 8;
const res = await fetch(`${API}/api/puzzles/draw?category=${drawCategory}&n=${drawN}`, { headers });
```
The `useEffect` dependency array already includes `category`; add `lessonMode`, `confirmationCategory`, `confirmationCount` to that array (or guard with `lessonMode ? confirmationCategory : category` as the effective key if the deps linting is strict).

**E1.3 — TopBar title** (lines 502–505):
`TopBar` already supports a `title` prop. Pass it in lesson mode:
```jsx
<TopBar
  onBack={handleBack}
  title={lessonMode ? t('lesson.confirmation.header', { title: lessonTitle }) : undefined}
  meta={puzzles.length > 0 ? t('challenge.progress', { current: currentIdx + 1, total: puzzles.length }) : undefined}
/>
```
The same `TopBar` instance in the loading state (lines 482–489) should also receive the title in lesson mode.

**E1.4 — `handleNext()` lesson-mode terminal branch** (lines 239–257):
`handleNext` currently builds `newResults`, calls `advanceSession()`, then decides to advance to the next puzzle or `go('summary', ...)`. The lesson-mode branch must be inserted at the terminal decision point (after `advanceSession()`, replacing only the final `else` branch) while preserving all bookkeeping:
```js
function handleNext() {
  const current = puzzles[currentIdx];
  const newResults = [...results, {
    puzzleId: current?.id,
    quality: evaluation?.quality ?? 'blunder',
    category,
  }];
  setResults(newResults);
  advanceSession();                         // ← preserve: always call

  const nextIdx = currentIdx + 1;
  if (nextIdx < puzzles.length) {
    setCurrentIdx(nextIdx);
    initPuzzle(puzzles[nextIdx]);
    setPhase('pre-move');
  } else if (lessonMode) {                  // ← new lesson-mode terminal
    store.saveLessonProgress(lessonId, 'complete');
    track('lesson_completed', { lessonId });
    go('saga');
  } else {
    go('summary', { results: newResults, category });
  }
}
```

**E1.5 — `handleBack()` lesson-mode early return** (lines 233–237):
The current `handleBack` wraps `go('setpicker')` in a `session || window.confirm(...)` guard. The lesson-mode early return must sit *before* that guard so it bypasses the confirmation dialog entirely:
```js
function handleBack() {
  if (lessonMode) { go('concept', { lessonId }); return; }   // ← new: before guard
  if (session || window.confirm(t('challenge.leave_confirm_body', "Your progress won't be saved."))) {
    go('setpicker');
  }
}
```

**E1.6 — Empty draw result in lesson mode**:
After `setPuzzles(loaded)` / `setPhase('pre-move')`, add a render-time guard: when
`lessonMode && puzzles.length === 0 && phase !== 'loading'`, render an inline empty-state block
directly in `ChallengeScreen` — no separate component. Example:
```jsx
if (lessonMode && puzzles.length === 0 && phase !== 'loading') {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>{t('lesson.confirmation.empty', 'No practice puzzles available yet.')}</p>
      <button onClick={handleBack}>{t('common.back', 'Back')}</button>
    </div>
  );
}
```
Do NOT call `saveLessonProgress` in this path.

**E2 — Create `CLChallengeScreen.jsx` as a thin wrapper**

New file `connect-four/src/screens/CLChallengeScreen.jsx`. This screen is registered under the
`clchallenge` key. It receives navigation params spread as props (`lessonId`, `lessonTitle`,
`confirmationCategory`, `confirmationCount`) and passes them to `ChallengeScreen` with
`lessonMode={true}`:

```jsx
import { ChallengeScreen } from './ChallengeScreen.jsx';

export function CLChallengeScreen({ go, goBack, lessonId, lessonTitle,
                                    confirmationCategory, confirmationCount }) {
  return (
    <ChallengeScreen
      go={go} goBack={goBack}
      lessonMode={true}
      lessonId={lessonId}
      lessonTitle={lessonTitle}
      confirmationCategory={confirmationCategory}
      confirmationCount={confirmationCount}
    />
  );
}
```

**E3 — Wire `CLChallengeScreen` into `screenRegistry.jsx`**

---

### Phase F — Documentation updates

**F1 — Update `docs/architecture/frontend-conventions.md`**
Add to the "Shared Board Utility" section:
```
`boardSpecToBoard(boardSpec)` — converts lesson `boardSpec` (Array[7] of 'g'/'d' strings,
bottom→top) to the `Board` component's `board` prop format (`board[row][col]` with
'empty'/'red'/'yellow'). 'g' → 'red' (green disc), 'd' → 'yellow' (gray disc). Exported from
`src/lib/board.js`. Used by ConceptScreen and SocraticScreen.
```

**F2 — Update `docs/architecture/server-conventions.md`**
Add a "Lesson Loader" section documenting:
- `server/lessonLoader.js` as the canonical module for lesson file loading.
- Startup loading pattern: `fs.readdirSync` + `JSON.parse(fs.readFileSync(...))`.
- In-memory cache (not reloaded on request).
- Validation and exclusion rules (log, not throw).
- `order` derivation from filename numeric prefix.

---

## Dependency Order (critical sequencing)

```
A1 (lessons/ dir) ─────────────────────────────── independent
A2 (boardSpecToBoard) ──────────────────────────── independent
A3 (i18n seed) ─────────────────────────────────── independent

A4 (lessonLoader) ──────────────────────────────── after A1
A5 (API endpoints) ─────────────────────────────── after A4

B1+B2 (SagaScreen) ─────────────────────────────── after A5

A2 → C1 (boardSpecToBoard must exist before ConceptScreen)
A3 → D1 (i18n keys must exist before SocraticScreen)
A5 → C1 (fetch lesson in ConceptScreen)
A5 → D1 (fetch lesson in SocraticScreen)

C1+C2 (ConceptScreen) ──────────────────────────── after A2, A5
D1+D2 (SocraticScreen) ─────────────────────────── after A3, A5, C1 wired
E1+E2+E3 (CLChallengeScreen) ───────────────────── after C1, D1 wired

F1+F2 (docs updates) ───────────────────────────── any time before tasks complete
```

**Critical ordering rules**:
1. `boardSpecToBoard` (A2) MUST be unit-tested before being used in screen code.
2. i18n seed (A3) MUST be committed before the Socratic screen is implemented — missing keys
   show raw key strings in the UI and make testing confusing.
3. `socraticReducer.js` in `src/lib/` MUST be written and unit-tested (as part of D1) before
   `SocraticScreen.jsx` wires it via `useReducer`.
4. `CLChallengeScreen` (E2) is a thin wrapper; the `lessonMode` changes to `ChallengeScreen`
   (E1) must be done first.

---

## Key Design Decisions (rationale in research.md)

| Decision | Chosen approach |
|---|---|
| `boardSpec` → `board` | `boardSpecToBoard()` in `src/lib/board.js`; 'g'→'red', 'd'→'yellow' |
| Board API (mockup vs production) | `cols`/`mkCols`/`onColumn` are mockup-only; production uses `board`/`onColumnClick`/`canPlay` |
| Socratic board interaction | Column tap for identification only; no disc added to board display |
| Socratic phase state machine | Pure reducer `socraticReducer(phase, action)` in `src/lib/socraticReducer.js`; `useReducer` in screen |
| `wrong2` overlay row | `boardSpec[correctCol].length` (next empty row by column height) |
| Lesson file loading | `fs.readdirSync` + `JSON.parse` at startup; in-memory cache |
| `lessonMode` on `ChallengeScreen` | Additive optional props; all guarded with `lessonMode &&` |
| `n=8` literal in draw call | Replaced by `confirmationCount` when `lessonMode` (E1.2); verify `useEffect` deps |
| TopBar title in lesson mode | `title` prop added (was absent in non-lesson mode); only set when `lessonMode` |
| `handleNext` lesson-mode branch | Inserted after `advanceSession()` call; preserves results bookkeeping |
| `handleBack` in lesson mode | Early return before `session || window.confirm` guard |
| Back from `clchallenge` | `go('concept', { lessonId })` not `go('setpicker')` |
| Tier source | `store.getProfile().then(p => setTier(p.tier))` on mount; `tier` is NOT on `session` |
| `track('screen_viewed', { screen: 'saga_map' })` | Explicit call in SagaScreen mount (Navigator fires `saga`, spec requires `saga_map`) |
| Navigation params | Individual props spread by Navigator; screens destructure `{ lessonId }` etc. |

---

## Open Questions / Post-Epic 4 Work

- Actual lesson JSON content (slides, boardSpecs, Socratic positions) — Epic 5.
- Puzzle DB population for confirmation categories — Epic 6.
- Per-lesson i18n keys (`lesson.<id>.title`, `lesson.<id>.socratic.ask`) — Epic 5.
- `track('lesson_started')` — fires exactly once per session entry; a `useRef` fired flag is the
  implementation. Does not reset on Saga Map re-visit; would reset only on full component unmount.
  Verify behavior is acceptable with Epic 5 testing.
