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
`socratic.goalPrompt_es`, `confirmationChallenges[].goalPrompt_es`. `getLesson(id, locale)` merges them
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
| `src/components/admin/SlideEditor.jsx` | Single slide card: BoardEditor + coach messages + auto-synced legend + infoProse |
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
