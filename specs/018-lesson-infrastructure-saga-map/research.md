# Research: Lesson Infrastructure & Saga Map (Epic 4)

## Decision 1 — `boardSpec` → Board prop conversion

**Decision**: `boardSpec` (array[7] of `'g'`/`'d'` character strings) must be converted to the
production `Board` component's `board` prop format: a `board[row][col]` 2D array (6 rows × 7
cols) where cells are `'empty'`, `'red'`, or `'yellow'`.

**Rationale**: The production `Board.jsx` (Epic 1a) does NOT expose a `cols` or `mkCols` API.
It accepts `board={board[row][col]}` where `'red'` renders a green disc and `'yellow'` renders a
gray disc (per `reference_board_color_inversion.md`). The `mkCols` helper exists only in the
mockup prototype (`docs/mvp/mockup/project/board.jsx`) and was never ported to the production
component.

**Conversion rule**:
```js
// boardSpec: Array[7] of strings — index = col (0-indexed), char index = row (0 = bottom)
// 'g' → 'red' (green disc), 'd' → 'yellow' (gray disc), missing → 'empty'
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

This utility belongs in `src/lib/board.js` (the canonical board utility module) alongside the
existing `buildBoard` function.

**Alternatives considered**:
- Export `mkCols` from `Board.jsx` — rejected; `Board.jsx` uses a fundamentally different
  internal representation and `mkCols`' column-array format is incompatible with its `board`
  prop.
- Inline the conversion in each screen — rejected; Constitution §II prohibits duplication when a
  single canonical location exists (`src/lib/board.js`).

---

## Decision 2 — Spec FR-014/FR-020 wording vs. production API

**Decision**: All spec references to `cols={mkCols(boardSpec)}` (FR-014, FR-015, FR-020) map to
`board={boardSpecToBoard(boardSpec)}` in production code. The plan and tasks use the production
API name throughout; the spec wording is treated as mockup shorthand.

**Rationale**: The spec was written against the mockup prototype. The production `Board.jsx` has
a different prop API. `boardSpecToBoard` is the canonical translation.

---

## Decision 3 — Lesson JSON loader: `fs.readdirSync` at startup, no dynamic import

**Decision**: The server lesson loader uses `fs.readdirSync` + `JSON.parse(fs.readFileSync(...))`
at startup inside `server/index.js`, not dynamic `import()` with `with { type: 'json' }`.

**Rationale**: Spec Assumption (§ Assumptions) explicitly calls this out: variable-path JSON
files cannot use `import()` with import attributes. `fs.readdirSync` is the correct approach.
The `lessons/` directory is top-level inside `connect-four/` (next to `server/` and `src/`).
Path: `connect-four/lessons/`.

**Loader location**: A new file `connect-four/server/lessonLoader.js` exports:
- `loadLessons()` — called once at startup; returns validated array
- `getLessons()` — returns cached list (for `GET /api/lessons`)
- `getLesson(id)` — returns single lesson or `null` (for `GET /api/lessons/:id`)

---

## Decision 4 — `ChallengeScreen` `lessonMode` prop: additive extension

**Decision**: Add optional props `lessonMode` (bool, default `false`), `lessonId` (string),
`lessonTitle` (string), `confirmationCategory` (string), `confirmationCount` (int) to
`ChallengeScreen`. All new props are guarded with `lessonMode && ...` so non-lesson callers
are unaffected.

**Rationale**: The spec (FR-028, FR-029) requires `ChallengeScreen` reuse. The existing
signature is `ChallengeScreen({ go, goBack, category })`. The `category` param is already used
for the draw endpoint; in lesson mode `confirmationCategory` replaces it as the draw param.
The end-of-set `go('summary', ...)` call becomes `store.saveLessonProgress(lessonId, 'complete');
track('lesson_completed', ...); go('saga')` when `lessonMode`.

**Affected code**: `handleNext()` function (line 239) and `handleBack()` function (line 233)
in `ChallengeScreen.jsx`. The TopBar title render also needs the lesson header.

---

## Decision 5 — `wrong2` overlay row for Socratic screen

**Decision**: The `win` overlay in `wrong2` phase is placed at row `board.colHeights[correctCol]`
where `board` is derived from `lesson.socratic.boardSpec` via `boardSpecToBoard`. This is the
0-indexed next empty row in that column — the topmost occupied row index + 1.

**Rationale**: FR-022 says "add `win` overlay on column `socratic.correctCol` at the
top-of-column row." The top-of-column row for the next move in column `c` is exactly
`colHeights[c]`. `colHeights` can be derived from `boardSpec` as `boardSpec[c].length`.

**Concrete implementation**: `const wrongRevealRow = lesson.socratic.boardSpec[correctCol].length`

---

## Decision 6 — i18n fallback keys: five global `socratic.*` keys

**Decision**: Add five new keys to `en.json` under a new `socratic` namespace before implementing
the Socratic screen:
```json
{
  "socratic": {
    "ask":     "I'm going to make a mistake here. See if you can punish it.",
    "wrong1":  "Not quite — look for the right square. Try again.",
    "wrong2":  "Let me show you.",
    "correct": "Exactly! You saw it.",
    "hint":    "Look for an even square directly above one of my discs."
  }
}
```
Also add `lesson.confirmation.header` under a `lesson` namespace:
```json
{
  "lesson": {
    "confirmation": {
      "header": "{{title}} — Practice"
    }
  }
}
```

**Rationale**: FR-023 and FR-026 use these global fallback keys. They are hard dependencies
of the Socratic screen and must be present before the screen is implemented. Seeding them first
prevents missing-key fallback text from shipping.

---

## Decision 7 — `SagaScreen` navigation params

**Decision**: `go('concept', { lessonId: lesson.id })` — passes the lesson's `id` field (string
slug from JSON, e.g. `'lesson-05-claimeven'`) as the sole navigation param. The `concept` screen
reads `lessonId` as a prop (spread from Navigator params).

**Rationale**: Navigator spreads params as individual props per
`feedback_navigator_params_spread.md` in memory. The `concept` screen destructures `{ go, goBack,
lessonId }`. Same pattern propagates through `socratic` and `clchallenge`.

---

## Decision 8 — `lessonMode` guard for back-navigation in `ChallengeScreen`

**Decision**: When `lessonMode` is true, `handleBack()` calls `go('concept', { lessonId })`
instead of `go('setpicker')`. The lesson flow back-button returns to the concept screen, not
the set picker.

**Rationale**: FR-029 doesn't specify back behavior explicitly, but the natural UX is to return
to the lesson concept screen (last slide). `go('saga')` would lose the lesson context mid-flow.

---

## Decision 9 — `lessons/` directory location

**Decision**: `connect-four/lessons/` — top-level inside the connect-four app directory.

**Rationale**: This is adjacent to `server/` and `src/` per standard project layout. The server
loads files from a path relative to `server/index.js` using `path.join(__dirname, '../lessons/')`.
The directory ships empty in Epic 4; content arrives in Epic 5.

---

## Decision 10 — No `SagaScreen` → `ChallengeScreen` direct link

**Decision**: `SagaScreen` only navigates to `concept`. It never navigates directly to
`clchallenge`. Lesson flow always starts from concept slides, not mid-flow.

**Rationale**: Spec FR-008: tapping any non-locked node navigates to `concept` screen.
Confirmed by Acceptance Scenario 5 (replay of completed lesson still starts from concept slide 0).
