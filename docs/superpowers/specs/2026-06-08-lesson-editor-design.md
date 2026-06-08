# Lesson Editor — Design Doc

**Date**: 2026-06-08  
**Status**: Approved  
**Topic**: Developer/author-facing lesson authoring tool

---

## Problem

Lesson JSON files (`connect-four/lessons/lesson-NN-*.json`) are complex, interrelated, and error-prone to write by hand. The format requires:
- `boardSpec` — a 7-element column-encoded string array (bottom-to-top, `'g'`/`'d'` characters) that is not humanly readable
- `overlays` — cell coordinates `(c, r)` that must align with the actual boardSpec positions
- `socratic.correctCol` — must be verified as a genuinely winning move
- Multiple interrelated fields (legend items must match overlay types; socratic boardSpec must be a valid position)

All 11 current lessons are placeholders. The real content authoring work is ahead. The goal is a workflow that makes it practical to write, validate, and iterate on lesson JSON.

---

## Solution: In-App `/admin` Lesson Editor with File Hot-Reload

A full lesson editor at `/admin/lessons` inside the existing React app. The editor produces valid lesson JSON, writes it to disk via a server endpoint, and hot-reloads lessons in-memory — so the lesson is immediately previewable in the actual lesson flow without a server restart.

### Authoring loop

1. Open `/admin/lessons/:id` in the running app
2. Edit board (via movestring), overlays, text fields
3. Click **Save** → JSON written to `connect-four/lessons/lesson-NN-slug.json` + lessons reloaded in-memory
4. Click **Preview** → `/lessons/:id` opens in a new tab, showing the live-reloaded content
5. Switch back to editor, adjust, repeat

---

## Architecture

### New React routes

| Route | Screen |
|---|---|
| `/admin` | `AdminLessonListScreen` — list all lessons with edit/new/delete actions |
| `/admin/lessons/new` | `AdminLessonEditorScreen` — blank lesson form |
| `/admin/lessons/:id` | `AdminLessonEditorScreen` — edit existing lesson |

Both admin screens are gated: if `store.getProfile().email` is not in the admin email list, redirect to `/`. In dev, no gate (always accessible).

### New server endpoints

All under `/api/admin/*`. Each requires `req.user.email` to be in `ADMIN_EMAILS` (env var, fallback: `elsonidoq@gmail.com`). Returns 403 otherwise.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/lessons` | Returns full lesson objects for all loaded lessons |
| `GET` | `/api/admin/lessons/:id` | Returns a single full lesson object |
| `PUT` | `/api/admin/lessons/:id` | Validates + writes JSON to disk + calls `reloadLessons()` |
| `POST` | `/api/admin/lessons` | Creates new lesson file (requires `order` field to determine filename) |
| `DELETE` | `/api/admin/lessons/:id` | Deletes the lesson file + reloads |

### `lessonLoader.js` changes

Export a `reloadLessons()` function that re-runs the same load logic as `loadLessons()`. The `PUT`/`POST`/`DELETE` endpoints call this after writing to disk.

---

## Board Widget

The board widget is the core of the editor. It is shared between slide boards and the socratic board. It is bidirectionally synced with a movestring field.

### Movestring field

- Text input, always visible above the board
- Paste or type any movestring → board renders that game position immediately
- The field is the source of truth for disc positions
- The board display uses `boardSpecToBoard` derived from parsing the movestring
- **Column indexing**: movestring digits are 1-indexed (c4solver convention, columns 1–7); overlay `(c, r)` coordinates and `correctCol` are 0-indexed (project internal convention). The board widget handles this translation — the author never sees raw indices.
- **Player assignment**: odd-numbered moves (1st, 3rd, …) are placed as `'g'` (green/player 1); even-numbered moves are placed as `'d'` (gray/player 2). This determines which color disc appears when the author clicks a column.

### Board interaction (disc placement)

- Click anywhere in a column → drops the next player's disc into that column (gravity, alternating turns) → appends that column digit (1-indexed, matching c4solver convention) to the movestring
- The board re-renders from the updated movestring
- All boards are valid game positions at all times — no free arbitrary cell placement

**Controls:**
- **Undo** button → removes last character from movestring → re-renders
- **Clear** button → empties movestring → blank board

### Overlay mode (separate toggle)

Activated by a toolbar button. In overlay mode:
- A type selector shows the 4 overlay types: `tg`, `td`, `claim`, `win` (with colored swatches)
- Click any cell → places the selected overlay on that `(c, r)` coordinate; click again → removes it
- Overlay coordinates are stored separately from the movestring and do not affect it
- Legend items are auto-populated from the overlay list; the author edits only the text label

Disc placement is disabled while overlay mode is active.

### Visual fidelity

The board widget reuses the existing `Board` component, so what the author sees in the editor is exactly what appears in the lesson ConceptScreen.

---

## Lesson Editor Form

A single-page form, top to bottom.

### Top-level metadata

Compact row of fields:
- `title` — text input
- `id` — slug, auto-derived from title (kebab-case), editable
- `order` — number input (determines filename prefix `lesson-NN-`)
- `free` — toggle (Free / Pro)
- `userPerspective` — toggle (Red / Yellow)

### Slides

Ordered list. Each slide is a collapsible card.

Controls: **Add slide**, **Delete slide**, **Move up / Move down** (reorder).

Each slide card contains:
1. **Board widget** (movestring field + interactive board + overlay mode)
2. **Coach messages** — ordered list of (text input + mood selector: `happy` | `think`); Add/remove rows
3. **Legend items** — auto-populated from overlay placements; each row shows overlay swatch + editable label text
4. **infoProse** — textarea

### Socratic section

Toggled on/off with a checkbox (`null` when off).

When on:
1. **Board widget** (same component as slide boards)
2. **correctCol** — a row of 7 column buttons (labeled 1–7 for display, stored as 0-indexed). Selecting a column:
   - Highlights that column on the board
   - Calls `POST /api/scores` with the current movestring to verify it's a winning move
   - Shows a green checkmark if the solver confirms it, or an inline warning if not

### Confirmation section

Two fields:
- `confirmationCategory` — dropdown populated from `VALID_CATEGORIES` in `server/categories.js`, plus a "None" option (sets `null`)
- `confirmationCount` — number input (integer ≥ 0)

### Action bar (sticky bottom)

- **Save** — validates the form, writes file, reloads lessons; shows "Saved ✓" or an inline error message
- **Preview** — opens `/lessons/:id` in a new tab with a `?adminPreview=1` query param; the lesson flow bypasses tier gates when this param is present and the request comes from an admin session; enabled only after at least one successful save
- **Delete** — deletes the lesson file; shows a confirmation dialog first

---

## Validation

The editor validates before every save. Validation mirrors `lessonLoader.validateLesson`:
- Required fields present and correct types
- `boardSpec` has exactly 7 elements (enforced automatically since it's derived from the movestring)
- All overlay `type` values are from the allowed enum (`tg`, `td`, `claim`, `win`)
- `confirmationCount >= 0`
- Socratic `correctCol` is 0–6

Additionally:
- If the socratic section is enabled and `correctCol` has not been solver-verified, show a warning (not a hard block)
- Duplicate `id` or `order` values are flagged

Validation errors appear inline next to the relevant field, not only at submit time.

---

## File Naming

When saving a new lesson, the filename is derived as:
```
lesson-{order:02d}-{id}.json
```
e.g., `lesson-12-zugzwang-basics.json`.

If an existing lesson's `order` or `id` is changed, the old file is deleted and a new file is written. The server hot-reloads after both operations.

---

## Auth Gate

- Server: `ADMIN_EMAILS` env var (comma-separated). Default: `elsonidoq@gmail.com`. All `/api/admin/*` endpoints return 403 if `req.user.email` is not in the list.
- Client: `AdminLessonListScreen` and `AdminLessonEditorScreen` check `store.getProfile().email`. If not in admin list, redirect to `/`. In `NODE_ENV=development` with no logged-in user, show the admin UI directly (dev convenience).

---

## Out of Scope

- Any CMS, WYSIWYG rich text, or multi-user collaboration
- i18n key management (lesson text is authored in English only; i18n wiring is a separate concern)
- Automated lesson testing or solver-based quality scoring beyond `correctCol` verification
- Image or video embeds in lesson slides
- Spanish translation of lesson content
