# Contract: Lesson Audio Generation & Pruning Endpoints

Both routes are additive under the existing `/api/admin/lessons/*` family
(`api-conventions.md` route naming: `/api/admin/<resource>`).

## `POST /api/admin/lessons/:id/generate-audio`

**Auth**: `requireLocalhost, requireAdmin` (FR-012a, FR-028) — same double-gate pattern as spec-039's
`/api/admin/audio/generate*`.

**Path param**: `id` — lesson id (string), must exist (`getLesson(id)`); `404 { error: 'not_found' }` if not.

**Request body**: none (the server reads the lesson from disk via `getLesson(id)`, not from the client, to
avoid persisting a client-supplied lesson body that may be stale relative to a concurrent edit).

**Behavior**:
1. Load lesson via `getLesson(id)`.
2. For every *concept* slide's `coachMessages[]` entry with non-empty `text` whose current `audio` (if any)
   does not match `hashMessageText(text) + '.mp3'`: call `synthesize(text)` (`server/ttsProvider.js`), write
   `public/audio/lessons/<hash>.mp3`, set `coachMessages[i].audio = '/audio/lessons/<hash>.mp3'`.
3. Per-message failures are caught individually; that message's `audio` stays whatever it was before this
   run (unset if it never had one) — the rest of the batch still completes (FR-015).
4. Persist the updated lesson via `saveLessonFile(LESSONS_DIR, lesson)` (same mechanism
   `PUT /api/admin/lessons/:id` already uses) and `reloadLessons()`.

**Response** (`200 OK`):
```json
{
  "lesson": { "...": "full updated lesson object, same shape as GET /api/admin/lessons/:id" },
  "generated": ["<messageIndex path or slide/message locator>", "..."],
  "failed": [{ "locator": "...", "error": "<message>" }]
}
```
- `generated`: identifies which messages got a *new* audio file this run (skips already-current ones).
- `failed`: messages whose synthesis failed this run (FR-015 — non-fatal to the batch).

**Errors**: `403` (non-localhost or non-admin), `404` (lesson not found), `500` (unexpected write/solver-
unrelated error; TTS errors are per-message, not batch-fatal per above).

## `POST /api/admin/lessons/prune-audio`

**Auth**: `requireLocalhost, requireAdmin`.

**Request body**: none.

**Behavior**: Scans `public/audio/lessons/*.mp3`; computes the set of `audio` paths referenced by
`getLessonsAll()` across all lessons/slides/messages; deletes any file not in that set (FR-014).

**Response** (`200 OK`): `{ "deleted": ["<hash>.mp3", "..."] }` — empty array if nothing was orphaned.

**Errors**: `403` (guard), `500` (filesystem error).

## Existing routes gaining `requireLocalhost` (FR-028, no behavior change otherwise)

| Route | File:line (pre-change) |
|---|---|
| `GET /api/admin/lessons` | `server/index.js:749` |
| `GET /api/admin/lessons/:id` | `server/index.js:754` |
| `POST /api/admin/lessons` | `server/index.js:761` |
| `PUT /api/admin/lessons/:id` | `server/index.js:772` |
| `DELETE /api/admin/lessons/:id` | `server/index.js:783` |
| `GET /api/admin/puzzles` | `server/index.js:802` |

Each becomes `app.<verb>('<path>', requireLocalhost, requireAdmin, ...)` — a one-line insertion, no other
change to the handler body. Grep-verifiable: `grep -n "app\.\(get\|post\|put\|delete\)('/api/admin" server/index.js`
must show `requireLocalhost` in every match's handler-argument list.
