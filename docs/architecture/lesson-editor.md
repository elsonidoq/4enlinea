# Lesson Editor (`/admin/lessons`)

In-app admin tool for authoring lesson JSON files visually. The editor lives at
`/admin/lessons` and produces valid `lesson-NN-slug.json` files in
`connect-four/lessons/`. It hot-reloads lessons on save, so the author can edit
and preview in the real lesson flow without a server restart.

**Design doc:** `docs/superpowers/specs/2026-06-08-lesson-editor-design.md`  
**Implementation plan:** `docs/superpowers/plans/2026-06-08-lesson-editor.md`

---

## Spanish localization (`_es` sibling fields)

Spanish lesson content lives in `_es` **sibling fields** inside the same lesson JSON, not a separate
file: `infoProse_es`, `coachMessages[].text_es`, `coachMessages[].audio_es`, `legendItems[].label_es`,
`windowHighlights[].label_es`, `socratic.goalPrompt_es`, `confirmationChallenges[].goalPrompt_es`. `getLesson(id, locale)` merges them
**per field** with English fallback (`lessonLoader.js#localizeLesson`) and strips all `_es` keys from the
client response — so a partial translation degrades gracefully instead of blanking a slide. `GET
/api/admin/lessons/:id` deliberately reads **raw** (`getLessonsAll()`), keeping `_es` intact for editing.

**Do NOT localize `title`.** The `lesson.<id>.title` i18n key (en/es.json) already owns titles via
`t(..., {defaultValue})` and wins; a `title_es` would be a second, silently-losing source.

The editor has an **en/es language toggle** (`lang` state) that swaps which sibling fields the
translatable inputs show/edit; an absent `_es` field shows **empty** (not the English text) so a missing
translation is visible. Non-translatable fields (`movestring`, `boardSpec`, `overlays`, `correctCol`,
`userPerspective`, `_boardInstructions`) are language-independent and do not change with the toggle.

**Traps:**
- **`goalPrompt` / `goalPrompt_es` are edited and localized here but never reach the learner** — see
  "Fields the learner UI ignores" below. Translating them is harmless but changes nothing on screen.
- `lessonToJsonPayload` (the PUT body builder) rebuilds `slides`/`socratic` from whitelists — it must
  spread the source object *then* override derived fields (`boardSpec`), or it silently drops `_es`
  (and, historically, the un-suffixed `socratic.goalPrompt`) on every save.
- A lesson **translated but not yet voiced** serves Spanish text with the **English** audio clip (the
  per-field fallback backfills `audio` from English) — arguably worse than silence. Translate and run
  generate-audio `{lang:'es'}` together. See `POST /api/admin/lessons/:id/generate-audio` in
  `api-conventions.md` and the `prune-audio` `audio_es` invariant.

---

## Architecture Overview

```
Browser                                  Server                         Disk
───────                                  ──────                         ────
/admin/lessons ──GET/PUT/POST/DELETE──→  /api/admin/lessons/* ──→  lessons/*.json
                ←──── JSON ──────────    ←──── validateLesson         (read/write)
                                              saveLessonFile
                                              reloadLessons()
```

The editor is rendered outside the normal Navigator/SCREENS system — `App.jsx`
routes `/admin/lessons*` to `AdminLessonsPage` before checking the generic
`/admin` prefix. This is the same pattern used for the existing `/admin`
curation page (`AdminCuratePage`).

`AdminLessonsPage` is intentionally wrapped in `.dark-surface`, overriding spec
033 FR-015 (which said light by default) — an explicit owner decision after
visual inspection. Sub-components inherit from the wrapper and use no CSS token
references; do not remove the wrapper to "match the spec."

---

## Files

### New files

| File | Responsibility |
|---|---|
| `server/adminAuth.js` | `requireAdmin` middleware — gates all `/api/admin/*` endpoints |
| `server/lessonAdmin.js` | File helpers: `lessonFilePath`, `findLessonFile`, `saveLessonFile`, `deleteLessonFile` |
| `src/lib/movestring.js` | Movestring utils: `parseMovestring`, `boardToSpec`, `appendMove`, `undoMove`, `isColFull`, `nextPlayer`, `getColHeights` |
| `src/pages/AdminLessonsPage.jsx` | Entry point for `/admin/lessons*` — owns routing between list and editor views |
| `src/screens/AdminLessonListScreen.jsx` | Lists all lessons with new/edit/delete |
| `src/screens/AdminLessonEditorScreen.jsx` | Full editor form — assembles all sub-components, handles save/preview/delete |
| `src/components/admin/BoardEditor.jsx` | Board widget: movestring field + interactive Board + overlay mode toggle |
| `src/components/admin/SlideEditor.jsx` | Single slide card: BoardEditor + coach messages + auto-synced legend + window highlights + infoProse |
| `src/components/admin/SocraticEditor.jsx` | Socratic section: BoardEditor + correctCol picker with solver verification |
| `src/components/admin/LessonMetaForm.jsx` | Top-level fields: title, id/slug, order, free/pro, userPerspective |

### Modified files

| File | What changed |
|---|---|
| `server/lessonLoader.js` | Exported `reloadLessons()`, `getLessonsAll()`, `validateLesson()` |
| `server/index.js` | Added `GET/POST/PUT/DELETE /api/admin/lessons` endpoints |
| `src/components/Board.jsx` | Added optional `onCellClick(col, r)` prop for cell-level clicks |
| `src/App.jsx` | Routes `/admin/lessons*` to `AdminLessonsPage` (checked before `/admin`) |

---

## Admin API Endpoints

All gated by `requireAdmin` middleware (bypasses auth in `NODE_ENV !== 'production'`; checks JWT in production).

| Method | Path | Purpose | Response |
|---|---|---|---|
| `GET` | `/api/admin/lessons` | List all lessons (full objects) | `200` JSON array |
| `GET` | `/api/admin/lessons/:id` | Get one lesson | `200` or `404 { error: 'not_found' }` |
| `POST` | `/api/admin/lessons` | Create new lesson | `201 { ok: true }` or `400` validation error |
| `PUT` | `/api/admin/lessons/:id` | Update lesson (handles id rename) | `200 { ok: true }` or `400` |
| `DELETE` | `/api/admin/lessons/:id` | Delete lesson file | `200 { ok: true }` |

All write operations call `reloadLessons()` after touching disk, so the lesson is
immediately available to the public `/api/lessons` endpoints.

---

## Movestring ↔ boardSpec Round-Trip

This is the central data design decision. The editor stores board state as
**movestrings** (0-indexed digit strings) for editability; the lesson JSON stores
**boardSpec** (7-element column-string arrays with `'g'`/`'d'`) for the app to
render. Both are stored in the JSON file so the editor can round-trip cleanly.

**Pipeline on save:**
```
movestring ──parseMovestring()──→ board[][] ──boardToSpec()──→ boardSpec[]  → write to JSON
                                                                            movestring → write to JSON (for editor round-trip)
```

**Pipeline on load:**
```
JSON.movestring → editor state (board renders from parseMovestring)
JSON.boardSpec  → ignored by editor; used by ConceptScreen/SocraticScreen
```

**Key points:**
- Movestring digits are 0-indexed (cols 0–6), consistent with all internal conventions.
- Only `c4solver-wrapper.js` ever translates to 1-indexed.
- `parseMovestring` delegates to the existing `buildBoard(moves)` in `board.js` — no duplicated logic.
- Player assignment: even move index → `'red'`, odd → `'yellow'`.
- Existing lessons that lack a `movestring` field load with an empty board (text fields preserved).

---

## Board Editor Interaction

The `BoardEditor` component has two modes:

**Disc mode (default):**
- Click a column → drops next player's disc (gravity, alternating turns) → appends column digit to movestring
- Undo button removes last digit; Clear empties the movestring
- Direct text editing of the movestring field; board re-renders on change

**Overlay mode:**
- Type selector: `tg`, `td`, `claim`, `win` (colored buttons)
- Click a cell → places the selected overlay at that `(c, r)`; click again → removes it
- Clear overlays button
- Legend items auto-sync: `SlideEditor` watches overlay changes and keeps `legendItems`
  in sync (new types get default labels; removed types drop from legend)

---

## Window highlights (`slides[].windowHighlights`)

Added 2026-07-28. A **concept slide** may draw one translucent capsule (a rounded pill, like a
highlighter stroke) per straight line of board cells, on top of the per-cell `overlays`. Use it when
the slide's text names a line/window as a *unit* ("the window from the second column to the fifth",
"three on a diagonal") and the learner would otherwise reconstruct that grouping by eye.

```json
"windowHighlights": [
  { "type": "tg",
    "cells": [{"c":2,"r":0},{"c":3,"r":0},{"c":4,"r":0},{"c":5,"r":0}],
    "label": "Green's minor-threat window",
    "label_es": "La ventana de la amenaza menor de Verde" }
]
```

| Key | Rule |
|---|---|
| `type` | Optional. Reuses the locked `OverlayType` tokens `tg`/`td`/`claim`/`win`, so a window and a per-cell overlay of the same type read as the same colour. Unknown/absent → fallback colour. |
| `cells` | 2–4 cells, 0-indexed (row 0 = bottom, col 0 = left), contiguous unit steps, collinear, and **ordered along the line**. |
| `label` | Optional. Renders as its own legend row with a **pill** swatch. |
| `label_es` | **Required whenever `label` is present.** |

**Contract details that are easy to get wrong:**

- **Order is load-bearing.** `Board.jsx`'s `zhSvg` takes its `windows` branch and draws one capsule
  from `cells[0]` to `cells[last]`, ignoring everything between. An unordered array renders a
  wrong-length or wrong-angle capsule with no error. The only gate is `isStraightLineWindow()`, run
  by `tests/unit/lessonContent.test.js`.
- **Labels do NOT go through `legendItems`.** The content gate requires every `legendItems[].type`
  to have a matching per-cell **overlay** of that type on the same slide; a window has none, so a
  legend entry for one fails the suite. `ConceptScreen` renders window labels itself from
  `slide.windowHighlights`, and `syncLegend` must never see them.
- **Capsule colours are opaque hex** (`WINDOW_HIGHLIGHT_COLOR` in `src/lib/lessonWindows.js`), a
  deliberately separate map from `ConceptScreen`'s `OVERLAY_SWATCH_COLOR`. Board renders the capsule
  at `opacity="0.4"`, so already-translucent `rgba()` values would compound to ~0.16 and vanish.
- **Concept slides only.** `SocraticScreen` derives its own overlays and reads no authored ones, so
  a `windowHighlights` on the socratic node renders nothing.
- The capsule draws **over** discs (`zIndex: 2`, `pointerEvents: 'none'`), so it tints them.

**Where it is enforced:**

| Layer | What it checks |
|---|---|
| `validateLesson` (`server/lessonLoader.js`) | Structure only — array, objects, ≥2 on-board integer cells. Deliberately permissive: the loader **excludes an invalid file entirely**, so an over-strict rule would silently drop a lesson from the app. |
| `localizeLesson` | Merges `label_es` over `label` per field and strips `_es`, same as `legendItems`. |
| `tests/unit/lessonContent.test.js` | Geometry (contiguous/collinear/ordered/2–4/on-board), known `type`, and `label` ⇒ `label_es`. Unconditional — not gated on `REMEDIATED`. |
| `tests/unit/lessonWindows.test.js` | The pure JSON → `zhCells` mapping and the geometry predicate. |
| `verify_lesson_content.mjs` | **Nothing, by design** — a window asserts no solver-checkable fact the way a `tg`/`td` cell does. |

### Authoring one in the editor

Added 2026-07-28 (closes OI-67). Each slide card has a **Window highlights** section below its
board. It lists the slide's windows (colour swatch, `type` picker, cell span, label field honouring
the `lang` toggle, *Edit cells* / *✕*) and a **+ Add window** button.

- **The control lives entirely in `SlideEditor`.** `BoardEditor` gained four optional,
  inert-by-default props — `zhCells`, `pickCellsActive`, `onPickCell`, `pickCellsNotice` — and
  knows nothing about the `windowHighlights` schema; it only lends its board as a picking surface.
  `SocraticEditor` passes none of them, so the socratic editor shows no window UI at all.
- **Order capture is click-in-sequence**: click order *is* array order. Clicking a picked cell
  removes it; *Undo last* pops the tail. While picking, the disc/overlay toolbar is replaced by a
  notice so a stray click can't drop a disc into the position being annotated.
- **Nothing invalid is ever written.** *Save window* is disabled until
  `describeWindowDraft()` (`src/lib/windowDraft.js`) reports the draft valid per
  `isStraightLineWindow`; the reason is shown instead. The collinear-but-out-of-order case — the one
  failure a rendered capsule *hides* — is called out specifically and offers **Fix order**.
- The live preview draws a **valid** draft as one capsule and an **invalid** one as a dot per cell,
  so a bend stays visible rather than being smoothed into a plausible straight capsule.
- Swatches use `WINDOW_HIGHLIGHT_COLOR` at `opacity 0.4` — what `ConceptScreen` actually renders —
  not `BoardEditor`'s brighter `OVERLAY_COLORS`.
- Removing the last window **deletes the key** rather than storing `[]`, so untouched slides stay
  `windowHighlights`-free; `emptySlide()` is unchanged for the same reason.
- A `label` with no `label_es` shows an inline warning (that combination fails the content gate).

Covered by `tests/unit/windowDraft.test.js` (order/validity helpers) and
`tests/dom/SlideEditorWindows.dom.test.jsx` (what the admin sees, plus the SocraticEditor guard).

---

## Window counts (slides[].showWindowCounts / windowCounts)

Renders, in every EMPTY cell of a concept slide's board, how many four-in-a-row windows
through that cell still contain no opponent disc — as a red tint plus the integer.

| key | type | meaning |
|---|---|---|
| `showWindowCounts` | boolean | Authored intent. The only field a human writes. |
| `windowCounts` | `(number\|null)[6][7]` | **Derived cache.** `[row][col]`, row 0 = bottom, `null` where a disc sits. Present iff `showWindowCounts` is true. |

- **Never hand-author `windowCounts`.** `saveLessonFile` (`server/lessonAdmin.js`) recomputes
  it from the slide's movestring on every admin write and strips it from slides that do not
  opt in, so editing a board in the editor refreshes it automatically. To repair a file
  edited directly on disk, run `node scripts/backfill-window-counts.mjs [lesson-id...]`.
- **Perspective is `lesson.userPerspective`, not the side to move.** Both opening lessons
  are `userPerspective: "red"` while most of their slides have gray to move; counting for
  the mover would show the opponent's opportunities in a lesson about where *you* should
  play.
- **The tint scale is pinned to a fixed maximum of 13** (`WINDOW_COUNT_MAX` in
  `src/lib/lessonWindows.js`), never to the maximum on the board being drawn. As the
  opponent kills lines the counts fall and the board visibly dims; a per-board maximum
  would re-saturate every board and erase that signal.
- **On an empty board the count is pure geometry** — 13 at the two middle centre cells,
  3 at a corner, 69 windows in total. That is the same formula, not a special case.
- **Concept slides only.** `socratic` ignores both fields; a content test enforces it.
- **The overlay is parity-blind, by design.** Window counts are vertically symmetric, so they
  express the *column* fact (the centre sits on far more lines) and cannot express the *row*
  fact (green completes lines on odd rows, gray on even). That is deliberate scope, not a
  gap: rows belong to `lesson-07-odd-rows-belong-to-red`. Copy must therefore describe the
  number as lines **open through** a square, never as a chance of winning there, and must not
  present the two 13-cells as "the best squares".
- **Enforcement:** `validateLesson` checks shape only (the loader excludes an invalid file
  entirely). Staleness is caught by `tests/unit/lessonContent.test.js`, which recomputes and
  fails loudly.
- The legend row is emitted by `ConceptScreen` from the i18n key
  `lesson.windowCounts.legend` — it does **not** go through `legendItems`, which requires a
  matching per-cell overlay type.

---

## Fields the learner UI ignores (editor ≠ app)

The editor is a faithful view of the **JSON**, not of the **app**. Three fields render in the editor
(or merely look authoritative in the file) but are never read by the learner screens. Verified at
source 2026-07-25; re-verify by grepping the screen before trusting any of it.

| Field | Editor | Learner app | What actually drives it |
|---|---|---|---|
| `socratic.goalPrompt`, `confirmationChallenges[].goalPrompt` (+ `_es`) | editable | **never rendered** | `ChallengeScreen.jsx:116-118` picks a **random** key from `coach.spoken.<category>.prompt.{0,1,2}`; the socratic prompt comes from `socratic.messages.ask` |
| `socratic.overlays` | **rendered** | **ignored** | `SocraticScreen.jsx:151` derives its own overlays (`win` ring on the dropped cell at `correct`, on the correct cell at `wrong2`) and never reads the authored array. `slides[].overlays` **are** rendered — this is socratic-only |
| `userPerspective` | shown as non-translatable | **not consulted** | `SocraticScreen.jsx:96`: `movestring.length % 2 === 0 ? 'red' : 'yellow'` — **movestring length parity** decides the learner's disc color (even → P1/GREEN, odd → P2/GRAY) |

Consequences to design around:

- **To change a challenge prompt, edit i18n, not the lesson.** A whole round of `goalPrompt`
  corrections once shipped into dead fields and was reported as fixed.
- **`coach.spoken.<category>.*` is shared by every puzzle in the category**, including DB-drawn
  practice boards. Keep it outcome-neutral and mechanism-accurate — never assert a board-specific
  verdict ("Gray is winning here"), and make sure it points the same direction as the **grader**
  (`evalUndercut` marks the *killing* column wrong, so "find the undercut" instructs a Blunder).
- **An authored socratic overlay on the answer cell looks like a spoiler in the editor** and is
  invisible in the app — the two surfaces disagree, so judge spoilers against the app.
- **Copy that names the learner's color must match movestring parity**, not `userPerspective`.

## Curriculum ordering and the free/paid boundary

Display order is the **filename numeric prefix** (`lesson-NN-slug.json`), parsed in
`lessonLoader.js:169-176`, which overwrites and ignores the JSON `order` field. Keep the JSON `order`
in sync anyway — it is the field a reader trusts, and the curriculum now asserts the two agree.

- **Reorder by renaming files with `git mv`**, never by editing `order`. Use a **two-phase rename**
  (all → temp prefixes → final) or intermediate renames collide with existing prefixes.
- `id` is independent of the filename, so renames preserve `lesson_progress` rows. **Locate a lesson
  by `id`, never by prefix** — `tests/lessons/opening-lessons.test.js` loads by id for this reason.
- **Tier contiguity is a product requirement**: all `free: true` lessons precede all paid ones, giving
  **exactly one free→paid transition**. As of 2026-07-25 that is 15 lessons, free 1–10 / paid 11–15,
  with the opening lessons early (4–5). An insertion that interleaves tiers is a regression.
- Titles come from the i18n key `lesson.<id>.title` in **both** `en.json` and `es.json`; a new lesson
  needs both or `i18nKeyParity` fails. There is no `title_es`.

## Socratic Solver Verification

The `SocraticEditor` verifies the `correctCol` selection against the solver:
calls `POST /api/scores` with the current movestring and checks whether the
chosen column's score is > 0 (winning). Shows a green checkmark or a warning
inline. This is advisory, not a hard block — the author can save with an
unverified column.

---

## Confirmation Challenges

Two fields in the editor: `confirmationCategory` and `confirmationCount`.
These are passed through verbatim to the lesson JSON. At runtime, the lesson
flow draws `confirmationCount` puzzles from the DB for that category and
presents them as the final gate. Setting category to "None" skips confirmation
entirely (reading-only lesson, like Lesson 4).

The editor does NOT verify that puzzles exist for the chosen category — that is
Epic 6 scope.

---

## Gotchas

1. **Auth headers required on admin fetches.** `AdminLessonEditorScreen` and
   `AdminLessonListScreen` include an `authHeaders()` helper that reads the
   Supabase JWT from `localStorage` and attaches it to every fetch. Without this,
   `requireAdmin` returns 403 in production because `req.user` is null.

2. **`validateLesson` ignores unknown fields.** The `movestring` fields written
   into the JSON by the editor are silently accepted by the validator (it only
   checks required fields). This is intentional — the app ignores them too.

3. **Ordering in `App.jsx` matters.** `/admin/lessons` must be checked before
   `/admin` because `startsWith('/admin')` matches both. See `App.jsx:59`.

4. **File naming convention.** Files are named `lesson-NN-slug.json` where `NN`
   is a 2-digit zero-padded order. The loader regex is `lesson-(\d+)-` — it
   handles any digit count, but `lessonFilePath` uses `padStart(2, '0')`.
   Orders ≥ 100 would still work but the naming convention wasn't designed for
   100+ lessons.

5. **Delete is permanent.** `deleteLessonFile` calls `fs.unlinkSync` — no trash,
   no backup. The file is gone. If the lesson was committed to git, it can be
   recovered from history.

6. **Dev-mode auth bypass.** `requireAdmin` calls `next()` unconditionally when
   `NODE_ENV !== 'production'`. This means admin endpoints are wide open on
   localhost. Don't expose the dev server to a network where you don't trust
   everyone.

7. **No duplicate-id check on POST.** Creating a lesson with an existing `id`
   writes a second file with a different order prefix. The loader picks up both,
   and the one that sorts last alphabetically wins in the in-memory cache.

8. **`Board` component color inversion.** `'red'` renders as a green disc,
   `'yellow'` renders as gray. This is intentional — do not change the mapping
   in `boardSpecToBoard` or `boardToSpec`.
