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
file: `infoProse_es`, `infoProseAudio_es`, `coachMessages[].text_es`, `coachMessages[].audio_es`, `legendItems[].label_es`,
`windowHighlights[].label_es`, `socratic.goalPrompt_es`, `confirmationChallenges[].goalPrompt_es`,
`confirmationChallenges[].goalPromptAudio_es`. `getLesson(id, locale)` merges them
**per field** with English fallback (`lessonLoader.js#localizeLesson`) and strips all `_es` keys from the
client response — so a partial translation degrades gracefully instead of blanking a slide. `GET
/api/admin/lessons/:id` deliberately reads **raw** (`getLessonsAll()`), keeping `_es` intact for editing.

**`title` lives in the lesson JSON and IS localized there, via `title_es`.** The lesson JSON is the
sole source of truth for every lesson-title call site (`SagaScreen.jsx`, `ConceptScreen.jsx`,
`SocraticScreen.jsx` all read `lesson.title` directly — no i18n key involved). `title_es` is the
sibling that carries the Spanish title, merged by `lessonLoader.js#localizeLesson` exactly like
every other translatable lesson field.

> **Corrected 2026-07-30 (spec 052 US2).** An earlier draft of this section said "Do NOT localize
> `title`; a `title_es` would be redundant." That rule was inherited from the era when the
> `lesson.<id>.title` i18n key owned titles and a `title_es` really would have lost to it. Spec 052
> deleted that key — which made "no `title_es`" mean "no Spanish titles at all", silently regressing
> 14 of 15 titles to English for Spanish learners. `title_es` is now REQUIRED on every lesson;
> `tests/unit/lessonContent.test.js` gates it. Both `GET /api/lessons/:id` and `GET /api/lessons`
> (the list) are locale-scoped, and every client fetch of either must send `langHeaders()`.

The editor has an **en/es language toggle** (`lang` state) that swaps which sibling fields the
translatable inputs show/edit; an absent `_es` field shows **empty** (not the English text) so a missing
translation is visible. Non-translatable fields (`movestring`, `boardSpec`, `overlays`, `correctCol`,
`userPerspective`, `_boardInstructions`) are language-independent and do not change with the toggle.

**Traps:**
- **`confirmationChallenges[].goalPrompt` / `goalPrompt_es` now DO reach the learner** (spec 052 US2,
  2026-07-30) — they are a per-lesson override of the challenge coach-bubble text; see "Fields the
  learner UI ignores" below for the current, corrected behavior. **`socratic.goalPrompt` /
  `goalPrompt_es` remain dead** — the interactive Socratic phase's prompt is served by
  `socratic.messages.ask` instead, and editing/translating `socratic.goalPrompt` still changes
  nothing on screen.
- `lessonToJsonPayload` (the PUT body builder) rebuilds `slides`/`socratic` from whitelists — it must
  spread the source object *then* override derived fields (`boardSpec`), or it silently drops `_es`
  (and, historically, the un-suffixed `socratic.goalPrompt`) on every save.
- A lesson **translated but not yet voiced** serves Spanish text with the **English** audio clip (the
  per-field fallback backfills `audio` from English) — arguably worse than silence. Translate and run
  generate-audio `{lang:'es'}` together. See `POST /api/admin/lessons/:id/generate-audio` in
  `api-conventions.md` and the `prune-audio` `audio_es` invariant.

---

## Lesson audio audition & management (`/admin/audio` — spec 051 US2)

`/admin/audio` (`src/pages/AdminAudioPage.jsx`, the existing **Coach Audio Manager**) has a second,
independent section — **Lesson Audio Manager** — for auditioning and (re)generating every lesson
message's clip, in either language, without leaving the page. It is a **read/generate** surface only;
lesson *content* editing still happens exclusively at `/admin/lessons`.

- **Lesson picker**: a `<select>` populated from `GET /api/admin/lessons` (id/title only).
- **Message list**: on lesson select (or a `lang` toggle change — it reuses the page's single existing
  language selector, there is no second one), fetches `GET /api/admin/lessons/:id/audio-status?lang=`
  and renders one group per `"Slide N"` / `"Socratic"`, each message showing its text, a `Has
  Audio`/`Missing` badge, an inline `<audio>` player when a clip exists, and a `Generate`/`Regenerate`
  button.
- **Per-message generation**: the button `POST`s `/api/admin/lessons/:id/generate-audio` with
  `{ lang, locator }` — only that one `collectMessages()` entry is resynthesized. The frontend refetches
  `audio-status` afterward rather than trusting the POST response's `lesson` field, so the displayed
  state always comes from the same live-computed path FR-009 requires.
- **No second store**: nothing here is cached beyond the current render — every lesson switch, lang
  switch, or generate action re-fetches `audio-status` fresh from the on-disk lesson JSON
  (`reloadLessons()` runs server-side before every read, so an on-disk edit is reflected without a
  server restart — this is what closes OI-42/OI-43 for this surface).
- **Stale-locator no-op**: if the admin clicks Generate on a message that was removed from the lesson
  JSON between page load and the click, the server responds `200 { generated: [], failed: [] }` (not a
  404) — a deliberate no-op. The frontend has no special-case handling for this: the message simply
  disappears from the list on the next `audio-status` refetch.
- Playback is a plain `<audio src="/audio/lessons/<hash>.mp3">` (relative to the Vite dev origin, which
  serves `public/`) — **not** routed through the API port, unlike the pre-existing coach-clip player
  (`/api/admin/audio/play/:slug`), which streams via the API server's registry lookup. Lesson clips have
  no registry to look up; the path is already the full route.
- This section shares no state, fetch, or component logic with the pre-existing coach-audio status
  list / config editor / TTS sandbox above it on the same page — it does not change their behavior.

Server-side, see `api-conventions.md`'s `/api/admin/lessons/:id/audio-status` and the `generate-audio`
`locator` field for the exact contract.

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
| `tests/unit/lessonContent.test.js` | Geometry (contiguous/collinear/ordered/2–4/on-board), known `type`, and `label` ⇒ `label_es`. Unconditional — as is every check in that file since spec 052 deleted its `REMEDIATED` exemption set. |
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

## Confirmation-prompt narration (`goalPromptAudio`)

`confirmationChallenges[].goalPrompt` is narrated, like every other piece of lesson text. Its clip
lives in `goalPromptAudio` / `goalPromptAudio_es`, path-addressed as `/audio/lessons/<sha256[:16]>.mp3`
— the standard lesson-audio scheme, **not** the i18n-keyed `coach.spoken.*` scheme.

That distinction is the whole reason this exists. `ChallengeScreen`'s pooled prompts are addressed by
i18n key and played through `speakCoachMessage`, which is strictly key→slug→manifest→mp3 and cannot
speak arbitrary text. A `goalPrompt` override has no key, so spec 052 (Epic 6) shipped it **silent**
rather than let the stale pool clip play under corrected text. This section is the follow-on that
gave the override text its own clip.

Three consequences worth knowing:

- **`collectMessages` yields it last**, after socratic (`server/lessonAudio.js`). Existing tests assert
  whole-array exact-order equality on `generated`/`failed[].locator`, so it must stay appended.
- **`ChallengeScreen` gates playback itself.** `speakLessonAudio(path)` does *not* check
  `speechEnabled` (its doc comment says the caller owns that); `speakCoachMessage` does. The screen
  keeps two mutually-exclusive refs — `lastCoachKeyRef` for a pooled key, `lastLessonAudioRef` for an
  override path — and only one is ever set.
- **There is no approve step.** Unlike coach audio, lesson audio has no manifest or approval gate:
  generating a clip ships it. The invariants are `tests/lessons/lessonAudioCoverage.test.js` (every
  collected text has an on-disk clip) and its prune-parity companion (no orphans on disk). Adding a
  field to the walker therefore makes the suite immediately demand clips for **every** instance of it.

Generate via `/admin/audio` (Lesson Audio Manager) or:

```
curl -X POST localhost:$API_PORT/api/admin/lessons/<id>/generate-audio \
  -H 'Content-Type: application/json' \
  -d '{"lang":"es","locator":"confirmationChallenges[0].goalPrompt"}'
```

Omitting `locator` regenerates every message in the lesson — identical text hashes to the same
filename, so it is wasteful rather than destructive. Prefer the targeted form.

## Overlay intent (`_overlayIntent`) — opting a cell out of the solver overlay check

Not to be confused with **Window highlights** above (`slides[].windowHighlights`), which is a
*rendering* feature and is deliberately checked by nothing solver-side. `_overlayIntent` is the
opposite kind of thing: an **authoring escape hatch consumed only by
`server/scripts/verify_lesson_content.mjs`** (`overlayRows()`), never by the app. It renders
nothing and changes no behaviour for the learner.

The verifier asserts that every `tg` / `td` overlay sits on a cell that is a *real* completing cell
for that colour (`board.reachableThreats(player)`). Some slides legitimately place a `tg`/`td`
marker as pure teaching annotation — labelling a square the prose is talking about, on a board where
no such threat exists yet. `_overlayIntent: "annotation"` tells the verifier to skip that check.

**Two levels, added in spec 052 (FR-019):**

| Where | Effect |
|---|---|
| On the **node** (a `slides[i]` object or `socratic`) | The inherited **default** for every overlay on that node. `"annotation"` here skips the check for all of them. This is the original, pre-052 behaviour and the form all 8 shipped usages (`lesson-01`, `lesson-02`, `lesson-07`, `lesson-08` ×4, `lesson-09`) still use — none needed editing. |
| On an **individual overlay** (`{ "c": 3, "r": 0, "type": "tg", "_overlayIntent": "annotation" }`) | **Overrides** the node-level default for that one cell. Both directions work: a per-overlay `"annotation"` exempts one cell on an otherwise-checked slide, and a per-overlay value other than `"annotation"` (e.g. `"threat"`) re-enables the check for one cell on a node whose default is `"annotation"`. |

Resolution is `overlay._overlayIntent ?? node._overlayIntent`, so omitting it everywhere means
"check everything", which is the desired default.

Use the per-overlay form when a single slide mixes real threat markers with annotation markers —
before 052 that slide had to exempt *all* of its overlays, silently losing the check on the real
ones.

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

### Authoring one in the editor

`SlideEditor` renders a **"Window counts"** checkbox (between the board and the Window-highlights
section) wired to `updateField('showWindowCounts', …)`. It is the only control, by design: it sets
the flag and nothing else. The 6×7 array is stamped server-side on save, so

- **the editor's board preview does not show the numbers until you save** — same reason `boardSpec`
  is re-derived on save rather than previewed live. The helper text under the checkbox says so.
- **the editor must never write `windowCounts`.** `tests/dom/SlideEditorWindowCounts.dom.test.jsx`
  pins this: an editor that authored numbers would bypass the recompute and defeat the staleness
  gate. If you add a live preview later, keep the write path one-way.

`SocraticEditor` deliberately has no such control — the field is concept-slide only, and the same
DOM test asserts its absence there.

The colour is the `--red` token (`rgb(232, 57, 46)`) via `windowCountTint()` in
`src/lib/lessonWindows.js`. Note the adjacency: `--threat-red` is `rgb(232, 84, 62)` and means
**danger** on the `tr` overlay, whereas this tint means **opportunity**. They can never share a cell
because the tint is suppressed wherever a per-cell `overlays` entry already colours it — preserve
that suppression if you touch the render.

---

## Text length limits (`coachMessages[].text`, `infoProse`)

Neither field is length-checked anywhere — not by `validateLesson`, not by
`tests/unit/lessonContent.test.js`. Both limits below are enforced only by you.

**Editorial cap: 4 sentences** per coach message and per `infoProse` block. When a slide's content
outgrows that, **split the slide**, don't compress the teaching: reuse the same `movestring` /
`boardSpec` across the split siblings and reveal `overlays` progressively, one idea per slide. Slides
may freely share a board — nothing in the loader, the tests, or `verify_lesson_content.mjs` requires a
slide's position to be unique. (Worked example: `lesson-03-threat-vocabulary.json` covers 4 boards
across 10 slides.)

**Physical cap on coach bubbles: ~205 characters / 5 rendered lines.** `CoachDialog`'s bubble
container is capped at `maxHeight: 120px` on *every* screen (the cap is independent of the `fixed`
prop — see `frontend-conventions.md` §"Coach-message accumulation"). Longer text scrolls and clips
silently, and the container auto-scrolls to its bottom on mount, so the opening words are what
disappears. **Splitting one message into two `coachMessages` makes this worse** — both render stacked
in the same box. Shorten instead.

**Spanish is the binding constraint.** `_es` copy runs ~15% longer than English at equal sentence
count, so a slide can pass in `en` and clip in `es`. Measure in Spanish.

**`infoProse` renders as paragraphs, and scrolls in its own panel** (2026-07-29; OI-77 closed).
`ConceptScreen` delegates to `src/components/InfoProsePanel.jsx`, which splits the authored string on
blank lines (`/\n\s*\n/`) into `<p>` elements — so `\n\n` is a real paragraph break, not a collapsed
space. The panel is the only flexible child of the content column: the board and legend above it are
`flexShrink: 0`, so long prose scrolls **inside the panel** and never pushes the board off screen. The
panel's floor is `minHeight: 96` (about 4 lines) and it never grows past its own content
(`flex: '0 1 auto'`), so short prose leaves no empty box; on a 390x740 phone the measured range across
all 15 lessons is 96-194px. There is therefore **no length cap on `infoProse`** beyond the 4-sentence
editorial one — it scrolls rather than clips.

**The board is height-capped so the prose keeps a share.** The board is width-driven (square cells,
`width: 100%`), so `ConceptScreen` caps its **width** at `calc(34dvh * 7 / 6)` to bound its height.
On a tall viewport that exceeds the column width and does nothing; on a short one the board shrinks
instead of squeezing the prose panel to its floor.

**Legend rows must fit one line.** A wrapping legend row costs ~24px of the prose panel's budget, and
four wrapping rows on one slide cost more than the panel's entire floor. Keep `legendItems[].label`
and `windowHighlights[].label` to the identifying noun phrase and put the explanation in `infoProse`
— **ES <= ~40 characters** is the practical limit at 390px. All 147 labels were rewritten to this rule
on 2026-07-29.

Verification: in the browser, read `scrollHeight - clientHeight` off the `maxHeight: 120px` container
for every slide in both locales; non-zero means clipped. Restart the API server first — it caches
lessons at startup, so an un-restarted server serves the pre-edit text and makes a real fix look
like a no-op.

## Fields the learner UI ignores (editor ≠ app)

The editor is a faithful view of the **JSON**, not of the **app**. Two of the three fields below are
genuinely dead; `confirmationChallenges[].goalPrompt` was moved OFF this list 2026-07-30 (spec 052
US2) — it now overrides the challenge prompt. Verified at source 2026-07-30; re-verify by grepping
the screen before trusting any of it.

| Field | Editor | Learner app | What actually drives it |
|---|---|---|---|
| `socratic.goalPrompt` (+ `_es`) | editable | **never rendered** | The interactive Socratic phase's prompt is served by `socratic.messages.ask` instead — that field already carries the per-lesson-prompt role `socratic.goalPrompt` looks like it should play, which is why the latter stays unrendered |
| `socratic.overlays` | **rendered** | **ignored** | `SocraticScreen.jsx:151` derives its own overlays (`win` ring on the dropped cell at `correct`, on the correct cell at `wrong2`) and never reads the authored array. `slides[].overlays` **are** rendered — this is socratic-only |
| `userPerspective` | shown as non-translatable | **not consulted** | `SocraticScreen.jsx:96`: `movestring.length % 2 === 0 ? 'red' : 'yellow'` — **movestring length parity** decides the learner's disc color (even → P1/GREEN, odd → P2/GRAY) |

`confirmationChallenges[].goalPrompt` (+ `_es`), by contrast, now **is** rendered: `ChallengeScreen.jsx`'s
`initPuzzle` uses it as the coach-bubble text for that challenge instead of a random
`coach.spoken.<category>.prompt.{0,1,2}` pool pick, when present (FR-006); when absent, the random
pool pick is unchanged (FR-007). **No pre-generated audio clip exists for override text** — the
pool's `coach.spoken.<category>.prompt.N` clips are keyed to the pool copy they replace, so
`ChallengeScreen.jsx` sets `lastCoachKeyRef.current = null` in the override branch and the coach
bubble goes silent for that message rather than play a clip whose words contradict what's on screen
(FR-029). Generating a matching clip for override text is out of scope until Epic 5 synthesizes it.

Consequences to design around:

- **To change a challenge prompt, edit `confirmationChallenges[].goalPrompt` in the lesson JSON, not
  i18n.** Before spec 052 US2, the rendered prompt came only from `coach.spoken.<category>.prompt.*`
  in `en.json`/`es.json` and the lesson's `goalPrompt` was silently ignored — a whole round of
  `goalPrompt` corrections once shipped into that dead field and was reported as fixed. That is now
  reversed for `confirmationChallenges[].goalPrompt` specifically: it is the per-lesson override, and
  editing i18n no longer helps a single lesson's copy. `socratic.goalPrompt` is unaffected — still
  edit `socratic.messages.ask` for the Socratic phase.
- **`coach.spoken.<category>.*` is shared by every puzzle in the category**, including DB-drawn
  practice boards, and remains the fallback when a lesson has no `goalPrompt`. Keep it
  outcome-neutral and mechanism-accurate — never assert a board-specific verdict ("Gray is winning
  here"), and make sure it points the same direction as the **grader** (`evalUndercut` marks the
  *killing* column wrong, so "find the undercut" instructs a Blunder).
- **An authored socratic overlay on the answer cell looks like a spoiler in the editor** and is
  invisible in the app — the two surfaces disagree, so judge spoilers against the app.
- **Copy that names the learner's color must match movestring parity**, not `userPerspective`.

## Hint yields to phase (`SocraticScreen.jsx` — `showHint`, spec 052 US1, FR-001/FR-002)

Added 2026-07-30, closes OI-46. `SocraticScreen`'s coach-message selector picks between the
hint message set and the phase's own message set:

```js
const currentMessages = socratic?.messages?.[showHint ? 'hint' : phase] ?? [];
```

`showHint` (`useState(false)`, set `true` by the Hint toolbar button) **resets on every phase
transition**:

```js
useEffect(() => { setShowHint(false); }, [phase]);
```

So a learner who clicks Hint and then plays the taught correct move sees and hears the
`correct` reward message, not the lingering hint text — and a learner who clicks Hint then
plays a wrong column sees the `wrong1` message, not the hint text. **Hint and phase messages
must never coexist in the coach bubble.** This is a deliberate design decision, not just a
bug fix: the 120px coach-bubble cap that applies on every screen (see "Text length limits"
below) would truncate exactly the `correct` reward text if hint and reward copy were ever
concatenated or stacked — the two message sets are mutually exclusive by construction, never
merged.

The reset is keyed on `phase` alone (not on a drop or a timer), so the edge case of a learner
clicking Hint, phase changing away from it, then navigating back to the same slide later
(e.g. via back/forward) also resets it freshly for that visit — there is no cross-visit
persistence of `showHint` to begin with (component state, not stored).

The Continue button (`phase === 'correct' || phase === 'wrong2'`) keys off `phase` directly,
never `showHint`, so this fix changes nothing about slide-advancement gating.

Regression coverage: `tests/dom/SocraticHintPhase.dom.test.jsx` (three cases: hint-then-correct,
hint-then-wrong, no-hint-then-correct) and `tests/dom/SocraticNarration.dom.test.jsx`'s "run 2"
case (narration side of the same contract). Both registered in `test:dom`.

---

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
- Titles come from the lesson JSON's own `title` field, sourced directly (no i18n key) at every
  screen that displays it, with `title_es` carrying the Spanish title (required on every lesson —
  gated by `tests/unit/lessonContent.test.js`). See §"`title` lives in the lesson JSON" above.

## Socratic Solver Verification

The `SocraticEditor` verifies the `correctCol` selection against the solver:
calls `POST /api/scores` with the current movestring and checks whether the
chosen column's score is > 0 (winning). Shows a green checkmark or a warning
inline. This is advisory, not a hard block — the author can save with an
unverified column.

**The editor's check is weaker than the shipping requirement.** It asks only "is this column
winning?"; the invariant below requires it to be the **unique** best move. A board can show the
green checkmark and still fail `tests/lessons/lessonAnswerSets.test.js`.

---

## The answer-set invariant (what makes a lesson board valid)

Added 2026-07-28. Every socratic node and every confirmation challenge must satisfy:

```
optimalCols ⊆ acceptedCols        every solver-optimal column is accepted
acceptedCols ∩ optimalCols ≠ ∅    the taught answer is itself a best move
```

For a **socratic** the accepted set is the single authored `correctCol` (`SocraticScreen` grades
`col === socratic.correctCol`, client-side, no solver), so the rule reduces to: **the authored
column must be the strict unique solver optimum.** Any tie means a learner who plays the tied
column is told "Not quite" for a move that wins just as fast.

For a **confirmation challenge** the accepted set is whatever `evaluatePredicate` accepts for that
category.

A board that violates either rule is a **content defect — replace the board, never loosen the
grader.** Check with `node server/scripts/audit_answer_ambiguity.mjs`; source replacements with
`--source <category>` (it already filters out lost positions and invariant violations) or
`server/scripts/find_lesson_boards.mjs`. The rule lives in `server/answerSetInvariant.js`; see
`server-conventions.md` §"Answer sets are derived, never re-implemented".

**Traps when replacing a board:**

- **`goalPrompt` / `goalPrompt_es` are usually board-specific prose.** `confirmationChallenges[].goalPrompt`
  is now rendered to the learner as the challenge's coach-bubble text (see "Fields the learner UI
  ignores") — leaving it describing the *old* position ships stale, board-contradicting copy, not
  just a file that lies to its next reader. `socratic.goalPrompt` is still never rendered, but
  rewrite or genericise both with the board regardless, so the file stops lying either way.
- **`highlightMetadata` for `figure_7` / `j_shape` lists only the pattern pieces already on the
  board**, excluding the empty completing cell — the detector's raw output includes it, and copying
  that verbatim spoils the puzzle.
- **`userPlayer` must match movestring parity** (`ms.length % 2 === 0 ? 1 : 2`) or
  `lessonContent.test.js` fails.
- **A lesson board must not be lost for its owner** (`verify_lesson_content.mjs`), which is stricter
  than the invariant — the invariant deliberately exempts lost positions.
- **`boardSpec` must be re-derived**: `boardToSpec(parseMovestring(ms))` from `src/lib/movestring.js`.
- A correct board can legitimately **fail** the matching `classifier.js` detector when the lesson
  teaches the pattern from the opposite side to the detector — see `docs/open_issues.md` OI-74 for
  the undercut case.

---

## Confirmation Challenges

Two fields in the editor: `confirmationCategory` and `confirmationCount`.
These are passed through verbatim to the lesson JSON. At runtime, the lesson
flow draws `confirmationCount` puzzles from the DB for that category and
presents them as the final gate. Setting category to "None" skips confirmation
entirely (reading-only lesson, like Lesson 4).

The editor does NOT verify that puzzles exist for the chosen category. An author can
save a lesson whose confirmation gate has no puzzles to draw from and find out only at
runtime. Tracked as **OI-107** in `docs/open_issues.md` (admin-only authoring-tool scope,
explicitly deferred out of spec 052) — not "Epic 6 scope", which was a stale pointer.

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

9. **Multi-board `aria-label`s repeat, by decision.** The editor renders several
   `Board`s on one page (three concept slides plus the socratic board), and each
   emits the same board-local `"column 1"`..`"column 7"` labels from
   `getColumnA11yProps`, so a screen reader hears the same seven targets several
   times over. This is **left unaddressed on purpose** (OI-69 item 2, closed
   2026-07-30 under spec 052 FR-022): scoping the labels per board would change
   the locked spec-043 a11y contract shared by every game screen, spec 052
   commissioned no broader accessibility pass, and the ambiguity is confined to
   this admin-only surface. The rationale also lives next to the code, in the
   comment above `getColumnA11yProps` in
   `connect-four/src/components/boardA11y.js`. Every `aria-label` `SlideEditor`
   itself emits is already index-scoped (`Slide N …`) and unique.

10. **Admin editor copy is English-only, deliberately.** Nothing in
    `SlideEditor.jsx` / `LessonMetaForm.jsx` / `AdminLesson*Screen.jsx` goes
    through `t()`. That is the owner's recorded scope boundary from spec 052
    (Decision 2, 2026-07-30, closing OI-19): learner-facing strings are
    translated, admin tooling is not. Don't "fix" it as an oversight — but do
    keep new *learner-facing* strings routed through `t()` in both `en.json` and
    `es.json`, since a missing Spanish key ships English silently.
